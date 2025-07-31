use std::fs;
use std::ops::Range;
use std::sync::Arc;
use std::sync::atomic::{AtomicI64, AtomicU8, AtomicU32, Ordering};
use std::time::Duration;

use chrono::{DateTime, Local, Utc};
use hashbrown::HashMap;

use askama::Template;
use axum::Router;
use axum::body::Bytes;
use axum::extract::ws::{Message, WebSocket};
use axum::extract::{Path, State, WebSocketUpgrade};
use axum::http::StatusCode;
use axum::response::{Html, IntoResponse, Redirect};
use axum::routing::{get, get_service, post};

use rand::distr::{Distribution, Uniform};
use rand::rngs::SmallRng;
use rand::{Rng, SeedableRng};

use futures::{SinkExt, stream::StreamExt};
use tokio::signal;
use tokio::sync::{RwLock, broadcast};
use tokio::time::interval;
use tower_http::{compression::CompressionLayer, services::ServeDir, timeout::TimeoutLayer};

#[derive(Template)]
#[template(path = "countdown.html")]
struct CountdownTemplate {
    title: String,
    datetime: i64,
}

// TODO: Collect statistics (i.e. user count, number of clicks, etc.) every minute or so. Also
// switch to sqlite if I do that
struct AppState {
    datetimes: RwLock<HashMap<String, DateTime<Utc>>>,
    user_count: Arc<HashMap<String, AtomicU32>>,
    tx: broadcast::Sender<i64>,
}

impl AppState {
    fn load(path: impl AsRef<std::path::Path>, tx: broadcast::Sender<i64>) -> Self {
        let file_contents = fs::read_to_string(path).unwrap();
        let datetimes: HashMap<String, DateTime<Utc>> =
            serde_json::from_str(&file_contents).unwrap();

        let mut names = Vec::new();
        for k in datetimes.clone().into_keys() {
            names.push(k);
        }
        Self {
            datetimes: RwLock::new(datetimes),
            user_count: Arc::new(
                names
                    .iter()
                    .map(|name| (name.to_string(), AtomicU32::new(0)))
                    .collect::<HashMap<_, _>>(),
            ),
            tx,
        }
    }

    async fn save(&self, path: impl AsRef<std::path::Path>) {
        let contents = serde_json::to_string_pretty(&*self.datetimes.read().await).unwrap();
        fs::write(path, contents).unwrap();
    }
}

const SECS_INCREMENT_RANGE: Range<u64> = (25 * 60)..(35 * 60);
const SAVE_FILE_PATH: &str = "save.json";
const MAX_MESSAGES_PER_INTERVAL: u8 = 10;

#[tokio::main]
async fn main() {
    let (tx, _rx) = broadcast::channel::<i64>(20000);
    let state = Arc::new(AppState::load(SAVE_FILE_PATH, tx));

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

    let save_interval_task = tokio::spawn({
        let mut save_interval = interval(Duration::from_secs(60 * 5));
        // Do this because first tick completes immediately
        save_interval.tick().await;
        let state_cloned = state.clone();
        async move {
            loop {
                save_interval.tick().await;
                state_cloned.save(SAVE_FILE_PATH).await;
                // TODO: use proper logging with a library
                eprintln!("[{}] Saved state", Local::now().time().format("%H:%M:%S"));
            }
        }
    });

    let serve_task = axum::serve(listener, app).with_graceful_shutdown(shutdown_signal());

    eprintln!("Server on");

    tokio::select! {
        _ = serve_task => {}
        _ = save_interval_task => {}
    }

    eprintln!("\nServer shutting down...");
    eprintln!("Saving state to `{}`", SAVE_FILE_PATH);
    state.save(SAVE_FILE_PATH).await;
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

    let num_messages_recieved = Arc::new(AtomicU8::new(0));

    let datetime_read = state.datetimes.read().await;
    let last_timestamp_recieved = Arc::new(AtomicI64::new(
        datetime_read.get("battlebit").unwrap().timestamp(),
    ));

    drop(datetime_read);

    let mut recieve_task = tokio::spawn({
        let tx = state.tx.clone();
        let user_count = state
            .user_count
            .get("battlebit")
            .unwrap()
            .fetch_add(1, Ordering::Relaxed)
            .saturating_add(1);
        let state_cloned = state.clone();
        let mut rng = SmallRng::from_os_rng();
        let secs_range = Uniform::try_from(SECS_INCREMENT_RANGE).unwrap();
        async move {
            // Send incremented user count
            tx.send(user_count as i64 * -1).unwrap();

            while let Some(Ok(Message::Binary(msg))) = reciever.next().await {
                if !msg.is_empty() {
                    break;
                }
                let mut datetime_write = state_cloned.datetimes.write().await;
                let datetime = datetime_write.get_mut("battlebit").unwrap();

                let secs = secs_range.sample(&mut rng);
                *datetime += Duration::from_secs(secs);
                tx.send(datetime.timestamp()).unwrap();
            }
        }
    });

    let mut rx = state.tx.subscribe();

    let mut send_task = tokio::spawn({
        // For each user, limit the amount of messages per interval to a specified amount. If the
        // user has sent more messages than the specified amount, it would still increment the
        // timestamp, but it waits until the interval finishes to send only the lastest timestamp.
        // The goal is to prevent users from recieving too many websocket messages, as this would
        // cause tons of DOM updates (due to the countdown updating each time a message is
        // recieved), which could possibly crash their browser.
        //
        // NOTE: This is not guaranteed that each user will only have this amount of messages
        // recieved per interval. This means that with a decent amount of users, each user will
        // recieve much a lot more messages than what the limit specifies.
        //
        // TODO: It would be better if, instead, we would control how many messages will be
        // recieved by each user per interval.
        let mut interval = interval(Duration::from_millis(500));
        async move {
            // TODO: would stream merging be a better choice instead of `select!` inside `loop`?
            // (as recommened by the tokio docs)
            loop {
                tokio::select! {
                    Ok(timestamp_msg) = rx.recv() => {
                        // Fetch, then increment, then also increment fetched value so that it
                        // matches the incremented value. Basically `add_fetch()`.
                        let num_messages = num_messages_recieved
                            .fetch_add(1, Ordering::Relaxed)
                            .saturating_add(1);

                        if num_messages <= MAX_MESSAGES_PER_INTERVAL {
                            if sender
                                .send(Message::Binary(Bytes::from_iter(timestamp_msg.to_be_bytes())))
                                .await
                                .is_err()
                            {
                                break;
                            }
                        } else {
                            last_timestamp_recieved.store(timestamp_msg, Ordering::Relaxed);
                        }
                    },
                    // Interval finishes
                    _ = interval.tick() => {
                        if num_messages_recieved.fetch_and(0, Ordering::Relaxed)
                            <= MAX_MESSAGES_PER_INTERVAL
                        {
                            continue;
                        }
                        if sender
                            .send(Message::Binary(
                                Bytes::from_iter(last_timestamp_recieved.load(Ordering::Relaxed).to_be_bytes()),
                            ))
                            .await
                            .is_err()
                        {
                            break;
                        }
                    }
                }
            }
        }
    });

    // Abort the other task if one of them ends.
    tokio::select! {
        _ = &mut send_task => recieve_task.abort(),
        _ = &mut recieve_task => send_task.abort(),
    };

    // Decrement & broadcast/send updated user_count
    let tx = state.tx.clone();
    let user_count = state
        .user_count
        .get("battlebit")
        .unwrap()
        .fetch_sub(1, Ordering::Relaxed)
        .checked_sub(1)
        .expect("underflow");

    let user_count = (user_count as i64) * -1;

    // Send user count as a negative number
    tx.send(user_count).unwrap();
}

// Increment datetime directly when getting this page, so that the datetime is displayed
// immediately on the page.
//
// Incrementing the datetime with the websocket after the user loads the page causes flickering,
// because it first displays the previous datetime, increments the datetime through the websocket,
// then after a few milliseconds it gets replaced by the new datetime.
async fn battlebit(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let mut datetime_write = state.datetimes.write().await;
    let datetime = datetime_write.get_mut("battlebit").unwrap();

    let mut rng = rand::rng();
    let secs = rng.random_range(SECS_INCREMENT_RANGE);
    *datetime += Duration::from_secs(secs);

    // Send the new datetime to all clients connected to websocket
    let tx = state.tx.clone();
    tx.send(datetime.timestamp()).unwrap();

    let template = CountdownTemplate {
        title: "BattleBit Remastered".to_string(),
        datetime: datetime.timestamp(),
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

    let mut datetime_write = state.datetimes.write().await;
    let datetime = datetime_write.get_mut(&game_name).unwrap();

    let mut rng = rand::rng();
    let secs = rng.random_range(SECS_INCREMENT_RANGE);

    *datetime += Duration::from_secs(secs);
    (StatusCode::OK, datetime.timestamp().to_string()).into_response()
}

async fn query_datetime(
    Path(game_name): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if game_name != "battlebit" {
        return (StatusCode::UNAUTHORIZED).into_response();
    }
    let datetime_read = state.datetimes.read().await;
    let datetime = datetime_read.get(&game_name).unwrap();

    (StatusCode::OK, datetime.timestamp().to_string()).into_response()
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
