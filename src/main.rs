mod db;
mod routes;

use std::fs;
use std::sync::Arc;
use std::time::Duration;

use chrono::{DateTime, Local, Utc};

use axum::Router;
use axum::response::Redirect;
use axum::routing::{get, get_service};

use hashbrown::HashMap;
use serde::{Deserialize, Serialize};
use tokio::signal;
use tokio::sync::{RwLock, broadcast};
use tokio::time::interval;
use tower_http::{compression::CompressionLayer, services::ServeDir, timeout::TimeoutLayer};

use crate::db::{init_db, insert_time_series_page_data};
use crate::routes::{battlebit, websocket_handler};

const SAVE_FILE_PATH: &str = "save.json";

// TODO: use naivedatetime
pub struct TimeSeriesDataEntry {
    pub page_name: String,
    pub datetime: DateTime<Utc>,
    pub timestamp: DateTime<Utc>,
    pub user_count: i32,
    pub click_count: i64,
}

#[derive(Deserialize, Serialize)]
struct PageState {
    datetime: DateTime<Utc>,
    #[serde(skip)]
    user_count: i32,
    click_count: i64,
}

// TODO: Fix this? Is it good to split them up to different hashmaps?
struct AppState {
    page_states: RwLock<HashMap<String, PageState>>,
    tx: broadcast::Sender<i64>,
}

impl AppState {
    fn load(path: impl AsRef<std::path::Path>, tx: broadcast::Sender<i64>) -> Self {
        let file_contents = fs::read_to_string(path).unwrap();
        let page_states: HashMap<String, PageState> = serde_json::from_str(&file_contents).unwrap();

        Self {
            page_states: RwLock::new(page_states),
            tx,
        }
    }

    async fn save(&self, path: impl AsRef<std::path::Path>) {
        let contents_serialized =
            serde_json::to_string_pretty(&*self.page_states.read().await).unwrap();
        fs::write(path, contents_serialized).unwrap();
    }

    async fn get_time_series_data_entry(&self) -> Vec<TimeSeriesDataEntry> {
        self.page_states
            .read()
            .await
            .iter()
            .map(|(name, state)| TimeSeriesDataEntry {
                page_name: name.to_string(),
                datetime: state.datetime,
                timestamp: Utc::now(),
                user_count: state.user_count,
                click_count: state.click_count,
            })
            .collect::<Vec<_>>()
    }
}

#[tokio::main]
async fn main() {
    // console_subscriber::init();
    let (tx, _rx) = broadcast::channel::<i64>(20000);
    let state = Arc::new(AppState::load(SAVE_FILE_PATH, tx));

    let db_pool = init_db().await.unwrap();

    let compression_layer = CompressionLayer::new()
        .br(true)
        .gzip(true)
        .deflate(true)
        .zstd(true);

    let app = Router::new()
        .route("/", get(root))
        .route("/battlebit", get(battlebit))
        .route("/{game_name}/websocket", get(websocket_handler))
        .with_state(state.clone())
        .nest_service("/assets", get_service(ServeDir::new("dist/assets")))
        .layer(compression_layer)
        .layer(TimeoutLayer::new(Duration::from_secs(10)));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:7171").await.unwrap();

    let mut save_interval_task = tokio::spawn({
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

    let mut insert_time_series_data_task = tokio::spawn({
        let mut interval = interval(Duration::from_secs(3));
        // Do this because first tick completes immediately
        interval.tick().await;
        let state_cloned = state.clone();
        async move {
            loop {
                interval.tick().await;
                let data = state_cloned.get_time_series_data_entry().await;
                insert_time_series_page_data(&db_pool, data).await.unwrap();
            }
        }
    });

    eprintln!("Listening on {}", &listener.local_addr().unwrap());
    let serve_task = axum::serve(listener, app).with_graceful_shutdown(shutdown_signal());

    tokio::select! {
        _ = serve_task => {
            save_interval_task.abort();
            insert_time_series_data_task.abort();
        }
        _ = &mut save_interval_task => insert_time_series_data_task.abort(),
        _ = &mut insert_time_series_data_task => save_interval_task.abort(),
    }

    eprintln!("\nShutting down");
    eprintln!("Saving state to `{}`", SAVE_FILE_PATH);
    state.save(SAVE_FILE_PATH).await;
    eprintln!("State saved successfully");
}

async fn root() -> Redirect {
    Redirect::temporary("/battlebit")
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
