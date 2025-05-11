use std::{
    fs,
    path::PathBuf,
    sync::{Arc, RwLock},
    time::Duration,
};

use askama::Template;
use axum::{
    extract::{Path, State}, http::{StatusCode, Uri}, response::{Html, IntoResponse, Redirect}, routing::{get, get_service, post}, Router
};
use chrono::{DateTime, FixedOffset};
use hashbrown::HashMap;
use tokio::signal;
use tower_http::{services::ServeDir, timeout::TimeoutLayer};

#[derive(Template)]
#[template(
    path = "countdown.html",
)]
struct CountdownTemplate {
    title: String,
    date_time: String,
}

struct AppState {
    date_times: RwLock<HashMap<String, DateTime<FixedOffset>>>,
}

impl AppState {
    fn load(path: impl Into<PathBuf>) -> Self {
        let contents = fs::read_to_string(path.into()).unwrap();
        let contents = contents
            .lines()
            .map(|line| {
                let (name, date_time) = line.split_once('\t').unwrap();
                (
                    name.to_string(),
                    DateTime::parse_from_rfc2822(date_time).unwrap(),
                )
            })
            .collect::<HashMap<_, _>>();
        Self {
            date_times: RwLock::new(contents),
        }
    }

    fn to_string(&self) -> String {
        self.date_times
            .read()
            .unwrap()
            .iter()
            .map(|(name, date_time)| format!("{}\t{}", name, date_time.to_rfc2822()))
            .collect::<Vec<_>>()
            .join("\n")
    }

    fn save(&self, path: impl Into<PathBuf>) {
        let contents = self.to_string();
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
        date_time: date_time.to_rfc2822(),
    };
    let html = template.render().unwrap();
    (StatusCode::OK, Html(html)).into_response()
}

async fn increment(
    uri: Uri,
    Path(game_name): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if game_name != "battlebit" {
        let template = CountdownTemplate {
            title: "404 Page not found".to_string(),
            date_time: format!("\"{}\" page not found", uri),
        };
        let html = template.render().unwrap();
        return (StatusCode::NOT_FOUND, Html(html)).into_response();
    }

    let state_cloned = state.clone();
    let mut date_time_write = state_cloned.date_times.write().unwrap();
    let date_time = date_time_write.get_mut(&game_name).unwrap();

    *date_time += Duration::from_secs(60);
    (StatusCode::OK, Html(format!("<p>{}<p>", date_time.to_rfc2822()))).into_response()
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
