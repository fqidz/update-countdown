use std::{
    fs,
    path::PathBuf,
    sync::{Arc, RwLock},
    time::Duration,
};

use askama::Template;
use axum::{
    Router,
    extract::{Path, State},
    http::StatusCode,
    response::{Html, IntoResponse, Redirect},
    routing::{get, get_service, post},
};
use chrono::{DateTime, Datelike, TimeZone, Timelike, Utc};
use hashbrown::HashMap;
use rand::Rng;
use tokio::signal;
use tower_http::{compression::CompressionLayer, services::ServeDir, timeout::TimeoutLayer};

#[derive(Template)]
#[template(path = "countdown.html")]
struct CountdownTemplate {
    title: String,
    date_time: String,
}

struct AppState {
    date_times: RwLock<HashMap<String, DateTime<Utc>>>,
}

impl AppState {
    // TODO: use serde
    fn load(path: impl Into<PathBuf>) -> Self {
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
                    let date_time: DateTime<Utc> = Utc
                        .with_ymd_and_hms(year, month, day, hour, minute, second)
                        .unwrap();
                    return (name.to_string(), date_time);
                } else {
                    panic!("Save cannot be parsed.");
                }
            })
            .collect::<HashMap<_, _>>();
        Self {
            date_times: RwLock::new(contents),
        }
    }

    fn to_ymd_and_hms(&self) -> String {
        self.date_times
            .read()
            .unwrap()
            .iter()
            .map(|(name, date_time)| {
                let year = date_time.year();
                let month = date_time.month();
                let day = date_time.day();
                let hour = date_time.hour();
                let minute = date_time.minute();
                let seconds = date_time.second();
                format!(
                    "{}\t{}\t{}\t{}\t{}\t{}\t{}",
                    name, year, month, day, hour, minute, seconds
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    }

    fn save(&self, path: impl Into<PathBuf>) {
        let header = "name\tyear\tmonth\tday\thour\tminute\tsecond";
        let contents = self.to_ymd_and_hms();
        fs::write(path.into(), format!("{}\n{}", header, contents)).expect(&format!(
            "Could not save state. Printing contents instead:\n{}",
            &contents
        ));
    }
}

#[tokio::main]
async fn main() {
    let state = Arc::new(AppState::load("save.txt"));

    let compression_layer = CompressionLayer::new()
        .br(true)
        .gzip(true)
        .deflate(true)
        .zstd(true);

    let app = Router::new()
        .route("/", get(root))
        .route("/battlebit", get(battlebit))
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
    state.clone().save("save.txt");
    eprintln!("State saved successfully");
}

async fn root() -> Redirect {
    Redirect::temporary("/battlebit")
}

async fn battlebit(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let state_cloned = state.clone();
    let mut date_time_write = state_cloned.date_times.write().unwrap();
    let date_time = date_time_write.get_mut("battlebit").unwrap();

    let mut rng = rand::rng();
    let secs = rng.random_range((25 * 60)..(35 * 60));

    *date_time += Duration::from_secs(secs);
    let template = CountdownTemplate {
        title: "BattleBit Remastered".to_string(),
        date_time: date_time.timestamp_millis().to_string(),
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
    let mut date_time_write = state_cloned.date_times.write().unwrap();
    let date_time = date_time_write.get_mut(&game_name).unwrap();

    let mut rng = rand::rng();
    let secs = rng.random_range((25 * 60)..(35 * 60));

    *date_time += Duration::from_secs(secs);
    (StatusCode::OK, date_time.timestamp_millis().to_string()).into_response()
}

async fn query_datetime(
    Path(game_name): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if game_name != "battlebit" {
        return (StatusCode::UNAUTHORIZED).into_response();
    }
    let state_cloned = state.clone();
    let date_time_read = state_cloned.date_times.read().unwrap();
    let date_time = date_time_read.get(&game_name).unwrap();

    (StatusCode::OK, date_time.timestamp_millis().to_string()).into_response()
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
