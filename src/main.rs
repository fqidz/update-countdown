mod routes;

use std::fs;
use std::sync::Arc;
use std::sync::atomic::AtomicU32;
use std::time::Duration;

use chrono::{DateTime, Local, Utc};
use hashbrown::HashMap;

use axum::Router;
use axum::response::Redirect;
use axum::routing::{get, get_service};

use tokio::signal;
use tokio::sync::{RwLock, broadcast};
use tokio::time::interval;
use tower_http::{compression::CompressionLayer, services::ServeDir, timeout::TimeoutLayer};

use crate::routes::{battlebit, websocket_handler};


const SAVE_FILE_PATH: &str = "save.json";

// struct PageState {
//     datetime: DateTime<Utc>,
//     user_count: u32,
//     refresh_clicks: u64,
// }

// TODO: Collect statistics (i.e. user count, number of clicks, etc.) every minute or so.
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
        .with_state(state.clone())
        .nest_service("/assets", get_service(ServeDir::new("dist/assets")))
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
