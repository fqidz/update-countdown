// @ts-check
"use strict";

import { CountdownDisplay } from "../modules/display/countdown";
import { DatetimeDisplay } from "../modules/display/datetime";
import { RefreshButton } from "../modules/display/refresh";
import { UserStatistic } from "../modules/display/userStatistics";
import { CustomWebSocket } from "../modules/websocket";

import { unwrapSome } from "../modules/utils/assert";

import { theme } from "../modules/display/theme";
import { navbar } from "../modules/display/navbar";
import { modal } from "../modules/display/modal";

// TODO: use IndexedDB instead of local storage

let browser_supports_inactive_tab_timeout = false;

/**
 * Check if the browser allows timeouts to work after tab becomes inactive,
 * because different browsers have different behaviour and there is no easy
 * way to check if a browser supports it. This is not that accurate.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#reasons_for_delays_longer_than_specified
 * */
function checkBrowserSupportsInactiveTabTimeout() {
    const time_start = new Date();
    setTimeout(() => {
        const time_finished = new Date();
        const actual_time_difference =
            time_finished.getTime() - time_start.getTime();
        if (document.hidden) {
            if (
                actual_time_difference >= 900 &&
                actual_time_difference <= 1700
            ) {
                browser_supports_inactive_tab_timeout = true;
            } else {
                browser_supports_inactive_tab_timeout = false;
            }
        }
    }, 1000);
}

let is_document_visible = false;
const websocket = new CustomWebSocket("battlebit/websocket");

// main
document.addEventListener("DOMContentLoaded", (_event) => {
    theme.build("theme-toggle");
    navbar.build("navbar-toggle-button");
    modal.build("info-modal", "info-button", "info-modal-close-button");

    const datetime_elem = unwrapSome(document.getElementById("datetime"));
    const datetime = new Date(Number(datetime_elem.textContent) * 1000);

    const datetime_display = new DatetimeDisplay(datetime);
    const countdown_display = new CountdownDisplay(datetime);
    const refresh_button = new RefreshButton("refresh");
    const user_statistic = new UserStatistic();

    datetime_display.init();
    countdown_display.start();
    refresh_button.build();
    user_statistic.build();

    refresh_button.addEventListener("click", () => {
        if (websocket.state() === WebSocket.OPEN) {
            websocket.incrementDatetime();
            user_statistic.incrementClickCount();
        } else if (websocket.state() === WebSocket.CLOSED) {
            websocket.tryConnect();
        }
    });

    websocket.addEventListener("open", () => {
        refresh_button.enable();
    });

    websocket.addEventListener("close", () => {
        refresh_button.disable();
    });

    websocket.addEventListener("updatedatetime", (event) => {
        const datetime = /** @type {Date} */ (
            /** @type {CustomEvent} */ (event).detail
        );
        datetime_display.updateDatetime(datetime);
        countdown_display.updateDatetimeTarget(datetime);
    });

    const user_count_elem = unwrapSome(document.getElementById("user-count"));
    websocket.addEventListener("updateusercount", (event) => {
        const user_count = /** @type {CustomEvent} */ (event).detail;
        user_count_elem.textContent = String(user_count);
    });

    const countdown_elem = unwrapSome(document.getElementById("countdown"));

    countdown_elem.addEventListener("click", () => {
        countdown_display.cycleState();
    });
    datetime_elem.addEventListener("click", () => {
        datetime_display.cycleState();
    });

    document.addEventListener(
        "visibilitychange",
        () => {
            // When webpage isn't visible, disconnect websocket to save on server
            // resources, and also pause countdown from ticking down.
            is_document_visible = !document.hidden;
            if (is_document_visible) {
                websocket.reconnect();
                countdown_display.play();
            } else {
                // Check everytime because there's a decent chance it's a false
                // positive.
                checkBrowserSupportsInactiveTabTimeout();
                if (browser_supports_inactive_tab_timeout) {
                    websocket.delayedDisconnect(3000);
                } else {
                    websocket.tryDisconnect();
                }
                countdown_display.pause();
            }
        },
        false,
    );
});
