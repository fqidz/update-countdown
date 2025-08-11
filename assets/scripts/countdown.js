// @ts-check
"use strict";

import { CountdownDisplay } from '../modules/display/countdown';
import { DatetimeDisplay } from '../modules/display/datetime';
import { RefreshButton } from '../modules/display/refresh';

import { CustomWebSocket } from '../modules/websocket';
import { assertElementExists } from '../modules/utils/assert';
import { theme } from '../modules/display/theme';
import { navbar } from '../modules/display/navbar';
import { modal } from '../modules/display/modal';

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
        const actual_time_difference = time_finished.getTime() - time_start.getTime();
        if (document.hidden) {
            if (actual_time_difference >= 900 && actual_time_difference <= 1700) {
                browser_supports_inactive_tab_timeout = true;
            } else {
                browser_supports_inactive_tab_timeout = false;
            }
        }
    }, 1000);
}

document.addEventListener("visibilitychange", () => {
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
}, false);

/** @type {Date | null} */
let datetime = null;
/** @type {CountdownDisplay} */
let countdown_display;
/** @type {DatetimeDisplay} */
let datetime_display;

/** @type {number | null} */
let user_count = null;

let is_document_visible = false;
const websocket = new CustomWebSocket("battlebit/websocket");

// main
document.addEventListener("DOMContentLoaded", (_event) => {
    theme.build("theme-toggle");
    navbar.build("navbar-toggle-button");
    modal.build("info-modal", "info-button", "info-modal-close-button");

    // countdown
    const datetime_elem = document.getElementById("datetime") ?? assertElementExists("datetime");

    const datetime = new Date(Number(datetime_elem.textContent) * 1000);
    datetime_display = new DatetimeDisplay(datetime)
    countdown_display = new CountdownDisplay(datetime);

    datetime_display.init();
    countdown_display.start();

    const refresh_button_elem = /** @type {HTMLButtonElement} */(document.getElementById("refresh")) ?? assertElementExists("refresh");
    const refresh_svg_elem = /** @type {SVGElement | null} */(document.querySelector("#refresh>svg"));
    if (refresh_svg_elem === null) {
        throw new Error("No svg inside id=\"refresh\"");
    }

    const refresh_button = new RefreshButton(refresh_button_elem, refresh_svg_elem);
    refresh_button.build();

    const countdown_elem = document.getElementById("countdown");
    countdown_elem?.addEventListener("click", () => {
        countdown_display.cycleState();
    });

    datetime_elem.addEventListener("click", () => {
        datetime_display.cycleState();
    });

});
