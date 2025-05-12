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
    http::{StatusCode, Uri},
    response::{Html, IntoResponse, Redirect},
    routing::{get, get_service, post},
};
use chrono::{DateTime, TimeZone, Utc};
use hashbrown::HashMap;
use tokio::signal;
use tower_http::{services::ServeDir, timeout::TimeoutLayer};

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
            .map(|(name, date_time)| format!("{}\t{}", name, date_time.to_rfc3339()))
            .collect::<Vec<_>>()
            .join("\n")
    }

    fn save(&self, path: impl Into<PathBuf>) {
        let contents = self.to_ymd_and_hms();
        fs::write(path.into(), &contents).expect(&format!(
            "Could not save state. Printing contents instead:\n{}",
            &contents
        ));
    }
}

#[tokio::main]
async fn main() {
    let state = AppState::load("save.txt");
    let app = Router::new()
        .route("/", get(root))
        .route("/battlebit", get(battlebit))
        .route("/{game_name}/increment", post(increment))
        .with_state(state.into())
        .nest_service("/assets", get_service(ServeDir::new("assets")))
        .layer(TimeoutLayer::new(Duration::from_secs(10)));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:7171").await.unwrap();
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();
    // state.save("save.txt");
    println!("\nServer shutting down.");
}

async fn root() -> Redirect {
    Redirect::temporary("/battlebit")
}

async fn battlebit(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let state_cloned = state.clone();
    let mut date_time_write = state_cloned.date_times.write().unwrap();
    let date_time = date_time_write.get_mut("battlebit").unwrap();

    *date_time += Duration::from_secs(60);
    let template = CountdownTemplate {
        title: "BattleBit Remastered".to_string(),
        date_time: date_time.timestamp_millis().to_string(),
    };
    let html = template.render().unwrap();
    (StatusCode::OK, Html(html)).into_response()
}

async fn increment(
    Path(game_name): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if game_name != "battlebit" {
        return (StatusCode::NOT_FOUND).into_response();
    }

    let state_cloned = state.clone();
    let mut date_time_write = state_cloned.date_times.write().unwrap();
    let date_time = date_time_write.get_mut(&game_name).unwrap();

    *date_time += Duration::from_secs(60);
    (
        StatusCode::OK,
        Html(date_time.timestamp_millis().to_string()),
    )
        .into_response()
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

    // #[cfg(not(unix))]
    // let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
