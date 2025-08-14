use std::ops::Range;
use std::sync::atomic::{AtomicI64, AtomicU8, Ordering};
use std::{sync::Arc, time::Duration};

use askama::Template;
use axum::extract::ws::{Message, WebSocket};
use axum::extract::{State, WebSocketUpgrade};
use axum::response::{Html, IntoResponse};
use axum::{body::Bytes, http::StatusCode};

use chrono::TimeDelta;
use futures::{SinkExt, stream::StreamExt};
use rand::distr::Distribution;
use rand::{SeedableRng, distr::Uniform, rngs::SmallRng};
use tokio::time::interval;

use crate::AppState;

const SECS_INCREMENT_RANGE: Range<i64> = (25 * 60)..(35 * 60);
const MAX_MESSAGES_PER_INTERVAL: u8 = 10;

#[derive(Template)]
#[template(path = "countdown.html")]
struct CountdownTemplate {
    title: String,
    datetime: i64,
}

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.max_message_size((i64::BITS * 2).try_into().unwrap())
        .on_upgrade(|socket| websocket(socket, state))
}

async fn websocket(stream: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut reciever) = stream.split();

    let num_messages_recieved = Arc::new(AtomicU8::new(0));

    let read_lock = state.page_states.read().await;
    let page_state = read_lock.get("battlebit").unwrap();
    let last_timestamp_recieved = Arc::new(AtomicI64::new(page_state.datetime.timestamp()));
    drop(read_lock);

    let mut recieve_task = tokio::spawn({
        let state_cloned = state.clone();
        let tx = state_cloned.tx.clone();
        let mut rng = SmallRng::from_os_rng();
        let secs_range = Uniform::try_from(SECS_INCREMENT_RANGE).unwrap();
        async move {
            let mut write_lock = state_cloned.page_states.write().await;
            let page_state = write_lock.get_mut("battlebit").unwrap();
            page_state.user_count += 1;

            // Send incremented user count
            tx.send(page_state.user_count as i64 * -1).unwrap();
            drop(write_lock);

            while let Some(Ok(Message::Binary(msg))) = reciever.next().await {
                let mut write_lock = state_cloned.page_states.write().await;
                let page_state = write_lock.get_mut("battlebit").unwrap();
                if !msg.is_empty() {
                    break;
                }

                let secs = secs_range.sample(&mut rng);
                page_state.datetime = page_state.datetime
                    .checked_add_signed(TimeDelta::seconds(secs))
                    .unwrap();
                tx.send(page_state.datetime.timestamp()).unwrap();
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
        // recieve a lot more messages than what the limit specifies.
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
    let mut write_lock = state.page_states.write().await;
    let page_state = write_lock.get_mut("battlebit").unwrap();
    // let mut user_count = page_state.user_count;

    page_state.user_count -= 1;
    // *user_count.value_mut() -= 1;

    // Send user count as a negative number
    // let user_count = *user_count.value() as i64 * -1;
    tx.send(page_state.user_count as i64 * -1).unwrap();
}

pub async fn battlebit(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let mut write_lock = state.page_states.write().await;
    let page_state = write_lock.get_mut("battlebit").unwrap();
    let datetime = page_state.datetime;

    let template = CountdownTemplate {
        title: "BattleBit Remastered".to_string(),
        datetime: datetime.timestamp(),
    };

    let html = template.render().unwrap();
    (StatusCode::OK, Html(html)).into_response()
}
