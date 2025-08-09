// @ts-check
"use strict";

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

/** @param {string} theme */
function setTheme(theme) {
    if (theme === "dark") {
        document.body.dataset.theme = "dark";
    } else if (theme === "light") {
        document.body.dataset.theme = "light";
    } else {
        throw new Error("Invalid theme");
    }
    localStorage.setItem("theme", theme);
}

/** @returns {boolean} */
function isOnPhone() {
    return matchMedia("only screen and (max-width: 600px)").matches;
}

/**
 * https://web.dev/articles/building/a-dialog-component#adding_light_dismiss
 * @param {MouseEvent} event
 */
function lightDismiss(event) {
    let target = /** @type {HTMLElement} */(event.target);
    if (target?.nodeName === "DIALOG") {
        /** @type {HTMLDialogElement} */(target)?.close();
    }
}

// main
document.addEventListener("DOMContentLoaded", (_event) => {
    // theme
    let theme = localStorage.getItem("theme");
    if (theme === null) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ?
            "dark" : "light";
    }
    setTheme(theme);

    const theme_toggle_button_elem = document.getElementById("theme-toggle") ?? assertElementExists("theme-toggle");

    theme_toggle_button_elem.addEventListener("click", () => {
        if (theme === "dark") {
            theme = "light";
        } else if (theme === "light") {
            theme = "dark";
        } else {
            throw new Error("assert can only be \"light\" or \"dark\"");
        }
        setTheme(theme);
    });

    // navbar
    const navbar_toggle_button_elem = document.getElementById("navbar-toggle-button") ?? assertElementExists("navbar-toggle-button");

    let is_navbar_open = !isOnPhone();
    navbar_toggle_button_elem.ariaExpanded = is_navbar_open.toString();

    navbar_toggle_button_elem.addEventListener("click", () => {
        is_navbar_open = !is_navbar_open;
        navbar_toggle_button_elem.ariaExpanded = is_navbar_open.toString();
    })

    // info modal
    const info_button_elem = document.getElementById("info-button") ?? assertElementExists("info-button");
    const info_modal_elem = /** @type {HTMLDialogElement} */(document.getElementById("info-modal")) ?? assertElementExists("info-modal");
    const info_modal_close_button_elem = (document.getElementById("info-modal-close-button")) ?? assertElementExists("info-modal-close-button");

    info_modal_elem.addEventListener("click", lightDismiss)

    info_button_elem.addEventListener("click", () => {
        info_modal_elem.showModal();
    })

    info_modal_close_button_elem.addEventListener("click", () => {
        info_modal_elem.close();
    })


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

    const user_statistic = new UserStatistic(getUserStatisticElems());

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
