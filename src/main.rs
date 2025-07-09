use std::{
    fs,
    ops::Range,
    path::PathBuf,
    sync::{
        Arc,
        atomic::{AtomicI64, AtomicU8, Ordering},
    },
    time::Duration,
};

use askama::Template;
use axum::{
    Router,
    extract::{
        Path, State, WebSocketUpgrade,
        ws::{Message, Utf8Bytes, WebSocket},
    },
    http::StatusCode,
    response::{Html, IntoResponse, Redirect},
    routing::{get, get_service, post},
};
use chrono::{DateTime, Datelike, TimeZone, Timelike, Utc};
use futures::{SinkExt, stream::StreamExt};
use hashbrown::HashMap;
use rand::{
    Rng, SeedableRng,
    distr::{Distribution, Uniform},
    rngs::SmallRng,
};
use tokio::{
    signal,
    sync::{RwLock, broadcast},
    time::interval,
};
use tower_http::{compression::CompressionLayer, services::ServeDir, timeout::TimeoutLayer};

#[derive(Template)]
#[template(path = "countdown.html")]
struct CountdownTemplate {
    title: String,
    datetime: i64,
}

struct AppState {
    datetimes: RwLock<HashMap<String, DateTime<Utc>>>,
    tx: broadcast::Sender<i64>,
}

impl AppState {
    // TODO: use serde
    fn load(path: impl Into<PathBuf>, tx: broadcast::Sender<i64>) -> Self {
        let contents = fs::read_to_string(path.into()).unwrap();
        let contents = contents
            .lines()
            .skip(1)
            .map(|line| {
                let mut data = line.split('\t');
                let name = data.next().unwrap();
                let year = data.next().unwrap().parse::<i32>().unwrap();
                if let [month, day, hour, minute, second] =
                    data.map(|v| v.parse::<u32>().unwrap()).collect::<Vec<_>>()[..]
                {
                    let datetime: DateTime<Utc> = Utc
                        .with_ymd_and_hms(year, month, day, hour, minute, second)
                        .unwrap();
                    return (name.to_string(), datetime);
                } else {
                    panic!("Save cannot be parsed.");
                }
            })
            .collect::<HashMap<_, _>>();
        Self {
            datetimes: RwLock::new(contents),
            tx,
        }
    }

    async fn to_ymd_and_hms(&self) -> String {
        self.datetimes
            .read()
            .await
            .iter()
            .map(|(name, datetime)| {
                let year = datetime.year();
                let month = datetime.month();
                let day = datetime.day();
                let hour = datetime.hour();
                let minute = datetime.minute();
                let seconds = datetime.second();
                format!(
                    "{}\t{}\t{}\t{}\t{}\t{}\t{}",
                    name, year, month, day, hour, minute, seconds
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    }

    async fn save(&self, path: impl Into<PathBuf>) {
        let header = "name\tyear\tmonth\tday\thour\tminute\tsecond";
        let contents = self.to_ymd_and_hms().await;
        fs::write(path.into(), format!("{}\n{}", header, contents)).expect(&format!(
            "Could not save state. Printing contents instead:\n{}",
            &contents
        ));
    }
}

const SECS_INCREMENT_RANGE: Range<u64> = (25 * 60)..(35 * 60);

#[tokio::main]
async fn main() {
    let (tx, _rx) = broadcast::channel::<i64>(20000);
    let state = Arc::new(AppState::load("save.txt", tx));

    let compression_layer = CompressionLayer::new()
        .br(true)
        .gzip(true)
        .deflate(true)
        .zstd(true);

    let app = Router::new()
        .route("/", get(root))
        .route("/battlebit", get(battlebit))
        .route("/{game_name}/websocket", get(websocket_handler))
        .route("/{game_name}/increment-datetime", post(increment_datetime))
        .route("/{game_name}/query-datetime", post(query_datetime))
        .with_state(state.clone())
        .nest_service("/assets", get_service(ServeDir::new("minified/assets")))
        .layer(compression_layer)
        .layer(TimeoutLayer::new(Duration::from_secs(10)));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:7171").await.unwrap();
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();

    eprintln!();
    eprintln!("Server shutting down...");
    eprintln!("Saving state to `save.txt`");
    state.clone().save("save.txt").await;
    eprintln!("State saved successfully");
}

async fn root() -> Redirect {
    Redirect::temporary("/battlebit")
}

async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| websocket(socket, state))
}

async fn websocket(stream: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut reciever) = stream.split();

    let tx = state.tx.clone();
    let num_recieved_in_interval = Arc::new(AtomicU8::new(0));

    let datetime_read = state.datetimes.read().await;
    let last_timestamp_recieved = Arc::new(AtomicI64::new(
        datetime_read.get("battlebit").unwrap().timestamp_millis(),
    ));

    drop(datetime_read);

    let mut recieve_task = tokio::spawn({
        let state_cloned = state.clone();
        let mut rng = SmallRng::from_os_rng();
        let secs_range = Uniform::try_from(SECS_INCREMENT_RANGE).unwrap();
        async move {
            while let Some(Ok(Message::Binary(_msg))) = reciever.next().await {
                let mut datetime_write = state_cloned.datetimes.write().await;
                let datetime = datetime_write.get_mut("battlebit").unwrap();

                let secs = secs_range.sample(&mut rng);
                *datetime += Duration::from_secs(secs);

                tx.send(datetime.timestamp_millis()).unwrap();
            }
        }
    });

    let mut rx = state.tx.subscribe();

    let mut send_task = tokio::spawn({
        let state_cloned = state.clone();
        let mut interval = interval(Duration::from_millis(500));
        async move {
            loop {
                tokio::select! {
                    Ok(timestamp_msg) = rx.recv() => {
                        // Fetch, then increment, then also increment fetch'ed value so that it
                        // matches the incremented value. Basically `add_fetch()`.
                        let num_messages = num_recieved_in_interval
                            .fetch_add(1, Ordering::Relaxed)
                            .saturating_add(1);

                        last_timestamp_recieved.store(timestamp_msg, Ordering::Relaxed);

                        if num_messages <= 10 {
                            if sender
                                .send(Message::Text(Utf8Bytes::from(timestamp_msg.to_string())))
                                .await
                                .is_err()
                            {
                                // TODO: also update `state.datetimes`
                                break;
                            }
                        }
                    },
                    _ = interval.tick() => {
                        let datetime_read = state_cloned.datetimes.read().await;
                        let datetime = datetime_read.get("battlebit").unwrap();
                        let current_timestamp = datetime.timestamp_millis();

                        let last_timestamp = last_timestamp_recieved.load(Ordering::Relaxed);

                        if last_timestamp == current_timestamp {
                            continue;
                        }

                        if sender
                            .send(Message::Text(Utf8Bytes::from(last_timestamp.to_string())))
                            .await
                            .is_err()
                        {
                            break;
                        }

                        num_recieved_in_interval.store(0, Ordering::Relaxed)
                    }
                }
            }
        }
    });

    tokio::select! {
        _ = &mut send_task => recieve_task.abort(),
        _ = &mut recieve_task => send_task.abort(),
    };
}

// Increment datetime directly when getting this page, so that the datetime is displayed
// immediately on the page.
//
// Incrementing the datetime with the websocket after the user loads the page causes flickering,
// because it first displays the previous datetime, increments the datetime through the websocket,
// then after a few milliseconds it gets replaced by the new datetime.
async fn battlebit(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let state_cloned = state.clone();
    let mut datetime_write = state_cloned.datetimes.write().await;
    let datetime = datetime_write.get_mut("battlebit").unwrap();

    let mut rng = rand::rng();
    let secs = rng.random_range(SECS_INCREMENT_RANGE);
    *datetime += Duration::from_secs(secs);

    // Send the new datetime to all clients connected to websocket
    let tx = state.tx.clone();
    tx.send(datetime.timestamp_millis()).unwrap();

    let template = CountdownTemplate {
        title: "BattleBit Remastered".to_string(),
        datetime: datetime.timestamp_millis(),
    };
    let html = template.render().unwrap();
    (StatusCode::OK, Html(html)).into_response()
}

async fn increment_datetime(
    Path(game_name): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if game_name != "battlebit" {
        return (StatusCode::UNAUTHORIZED).into_response();
    }

    let state_cloned = state.clone();
    let mut datetime_write = state_cloned.datetimes.write().await;
    let datetime = datetime_write.get_mut(&game_name).unwrap();

    let mut rng = rand::rng();
    let secs = rng.random_range(SECS_INCREMENT_RANGE);

    *datetime += Duration::from_secs(secs);
    (StatusCode::OK, datetime.timestamp_millis().to_string()).into_response()
}

async fn query_datetime(
    Path(game_name): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if game_name != "battlebit" {
        return (StatusCode::UNAUTHORIZED).into_response();
    }
    let state_cloned = state.clone();
    let datetime_read = state_cloned.datetimes.read().await;
    let datetime = datetime_read.get(&game_name).unwrap();

    (StatusCode::OK, datetime.timestamp_millis().to_string()).into_response()
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
