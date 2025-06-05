// @ts-check
"use strict";

/**
 * @typedef {{
 *     total_days: number,
 *     years: number,
 *     months: number,
 *     days: number,
 *     hours: number,
 *     minutes: number,
 *     seconds: number,
 *     milliseconds: number,
 * }} Duration
 */

/**
 * @typedef {{
 *     year: number,
 *     month: number,
 *     day: number,
 *     hour: number,
 *     minute: number,
 *     second: number,
 *     millisecond: number,
 * }} TimeUnit
 */

/**
 * @typedef {{
 *     year: number,
 *     month: number,
 *     day: number,
 * }} YearMonthDay
 */

/**
 * @typedef {{
 *     countdown_elem: HTMLElement
 *     days_elem: HTMLElement
 *     days_label: HTMLElement
 *     hours_elem: HTMLElement
 *     hours_label: HTMLElement
 *     minutes_elem: HTMLElement
 *     minutes_label: HTMLElement
 *     seconds_elem: HTMLElement
 *     seconds_label: HTMLElement | null
 *     milliseconds_elem: HTMLElement | null
 * }} CountdownElem
 */

// With a 5:3 ratio, a font size of 5vw results in character width of 3vw
// 5:3 or 5/3
const FONT_SIZE_VW_RATIO = 1.6666666666666666;
// 5:4 or 5/4
const FONT_SIZE_VH_RATIO = 1.25;

// Write these down here instead of setting it in css, because
const COUNTDOWN_VW = 80;
const COUNTDOWN_VH = 60;

const DATETIME_VW = 40;

const CountdownState = Object.freeze({
    CompactFull: 0,
    CompactNoMillis: 1,
    Blocky: 2,
});

const DatetimeState = Object.freeze({
    Utc: 0,
    Iso8601: 1,
    LocalTimezone: 2,
});

/**
 * @param {Date} datetime
 * @returns {TimeUnit}
 */
function dateToUnits(datetime) {
    return {
        year: datetime.getUTCFullYear(),
        month: datetime.getUTCMonth(),
        day: datetime.getUTCDate(),
        hour: datetime.getUTCHours(),
        minute: datetime.getUTCMinutes(),
        second: datetime.getUTCSeconds(),
        millisecond: datetime.getUTCMilliseconds(),
    };
}

/**
 * @param {number} year
 * @returns {boolean}
 */
function isLeapYear(year) {
    return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
}

/**
 * Amount of days in the month. 0-11 from Jan-Dec
 * @param {number} month
 * @param {boolean} is_leap_year
 */
function daysInMonth(month, is_leap_year) {
    if (month < 0 || month > 12) {
        throw new Error("`month` should be from 0-11");
    }

    return [
        /* Jan */ 31,
        /* Feb */ is_leap_year === true ? 29 : 28,
        /* Mar */ 31,
        /* Apr */ 30,
        /* May */ 31,
        /* Jun */ 30,
        /* Jul */ 31,
        /* Aug */ 31,
        /* Sep */ 30,
        /* Oct */ 31,
        /* Nov */ 30,
        /* Dec */ 31
    ][month];
}

/**
 * @param {YearMonthDay} ymd_from
 * @param {YearMonthDay} ymd_to
 * @returns {number}
 */
function daysBetween(ymd_from, ymd_to) {
    return ymdToDays(ymd_to) - ymdToDays(ymd_from);
}

/**
 * https://web.archive.org/web/20250601013920/https://stackoverflow.com/questions/54267589/difference-between-two-dates-using-math/54267749#54267749
 * @param {YearMonthDay} ymd
 * @returns {number}
 */
function ymdToDays(ymd) {
    let y = ymd.year;
    let m = ymd.month + 1;
    const d = ymd.day;

    if (m <= 2) {
        y--;
        m += 12;
    }

    return 365 * y +
        Math.floor(y / 4) -
        Math.floor(y / 100) +
        Math.floor(y / 400) +
        Math.floor((153 * m - 457) / 5) +
        d - 306;
}

/**
 * @param {Date} date_from
 * @param {Date} date_to
 * @returns {Duration}
 */
function getDuration(date_from, date_to) {
    const date_from_units = dateToUnits(date_from);
    const date_to_units = dateToUnits(date_to);
    let milliseconds = date_to_units.millisecond - date_from_units.millisecond;
    let seconds = date_to_units.second - date_from_units.second;
    let minutes = date_to_units.minute - date_from_units.minute;
    let hours = date_to_units.hour - date_from_units.hour;
    let days = date_to_units.day - date_from_units.day;
    let months = date_to_units.month - date_from_units.month;
    let years = date_to_units.year - date_from_units.year;
    let total_days = daysBetween(
        {
            year: date_from_units.year,
            month: date_from_units.month,
            day: date_from_units.day,
        },
        {
            year: date_to_units.year,
            month: date_to_units.month,
            day: date_to_units.day,
        },
    )

    if (milliseconds < 0) {
        milliseconds += 1000;
        seconds--;
    }
    if (seconds < 0) {
        seconds += 60;
        minutes--;
    }
    if (minutes < 0) {
        minutes += 60;
        hours--;
    }
    if (hours < 0) {
        hours += 24;
        total_days--;
        days--;
    }
    if (days < 0) {
        // equivalent to `month mod 12`, because '%' in js doesn't work with
        // negative numbers
        const month_before_date_to = ((date_to_units.month - 1 % 12) + 12) % 12;
        days += daysInMonth(month_before_date_to, isLeapYear(date_to_units.year));
        months--;
    }
    if (months < 0) {
        months += 12;
        years--;
    }

    return {
        total_days,
        years,
        months,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
    }
}

class Countdown extends EventTarget {
    /** @type {Date} */
    #datetime_target;
    /** @type {Date} */
    #datetime_now;
    /** @type {Duration} */
    #diff_duration;
    /** @type {number | null} */
    interval_id;

    /** @param {Object} datetime_target */
    constructor(datetime_target) {
        super();
        this.#datetime_target = datetime_target;
        this.#datetime_now = new Date();
        this.#diff_duration = getDuration(
            this.#datetime_now,
            this.#datetime_target,
        );
        this.interval_id = null;
    }

    /** @param {number} val */
    #emitUpdateTotalDays(val) {
        this.dispatchEvent(new CustomEvent("totaldays", { detail: val }));
    }

    /** @param {number} val */
    #emitUpdateDays(val) {
        this.dispatchEvent(new CustomEvent("days", { detail: val }));
    }

    /** @param {number} val */
    #emitUpdateHours(val) {
        this.dispatchEvent(new CustomEvent("hours", { detail: val }));
    }

    /** @param {number} val */
    #emitUpdateMinutes(val) {
        this.dispatchEvent(new CustomEvent("minutes", { detail: val }));
    }

    /** @param {number} val */
    #emitUpdateSeconds(val) {
        this.dispatchEvent(new CustomEvent("seconds", { detail: val }));
    }

    /** @param {number} val */
    #emitUpdateMilliseconds(val) {
        this.dispatchEvent(new CustomEvent("milliseconds", { detail: val }));
    }

    /** @param {Duration} new_diff_duration */
    #innerEmitUpdate(new_diff_duration) {
        this.#emitUpdateMilliseconds(new_diff_duration.milliseconds);

        if (new_diff_duration.seconds !== this.#diff_duration.seconds) {
            this.#emitUpdateSeconds(new_diff_duration.seconds);
        }
        if (new_diff_duration.minutes !== this.#diff_duration.minutes) {
            this.#emitUpdateMinutes(new_diff_duration.minutes);
        }
        if (new_diff_duration.hours !== this.#diff_duration.hours) {
            this.#emitUpdateHours(new_diff_duration.hours);
        }
        if (new_diff_duration.days !== this.#diff_duration.days) {
            this.#emitUpdateDays(new_diff_duration.days);
        }
        if (new_diff_duration.total_days !== this.#diff_duration.total_days) {
            this.#emitUpdateTotalDays(new_diff_duration.total_days);
        }

        this.#diff_duration = new_diff_duration;
    }

    #intervalUpdate() {
        this.#datetime_now = new Date();
        const new_diff_duration = getDuration(
            this.#datetime_now,
            this.#datetime_target,
        );
        this.#innerEmitUpdate(new_diff_duration);
    }

    /** @param {number} timeout */
    #innerStartInterval(timeout) {
        this.#intervalUpdate();
        this.interval_id = setInterval(this.#intervalUpdate.bind(this), timeout);
    }

    /**
     * Set interval timeout to new_timeout then immediately updates countdown.
     * @param {number} new_timeout
     */
    setIntervalTimeout(new_timeout) {
        if (new_timeout === null) {
            console.error("Invalid new_timeout");
        } else {
            if (this.interval_id !== null) {
                clearInterval(this.interval_id);
            }
            this.#innerStartInterval(new_timeout);
        }
    }

    emitAll() {
        this.#emitUpdateMilliseconds(this.#diff_duration.milliseconds);
        this.#emitUpdateSeconds(this.#diff_duration.seconds);
        this.#emitUpdateMinutes(this.#diff_duration.minutes);
        this.#emitUpdateHours(this.#diff_duration.hours);
        this.#emitUpdateDays(this.#diff_duration.days);
        this.#emitUpdateTotalDays(this.#diff_duration.total_days);
    }

    /** @param {number} timeout */
    start(timeout) {
        this.emitAll();
        this.#innerStartInterval(typeof timeout === "number" ? timeout : 500);
    }

    /** @param {Object} new_datetime_target */
    updateDatetimeTarget(new_datetime_target) {
        this.#datetime_target = new_datetime_target;
        const new_diff_duration = getDuration(
            this.#datetime_now,
            this.#datetime_target,
        );
        this.#innerEmitUpdate(new_diff_duration);
    }
}

class DisplayState extends EventTarget {
    state;
    num_states;
    #local_storage_name;

    /**
     * The state of a display.
     * @param {number} state an integer representing the state.
     * @param {number} num_states the max number of states it has.
     * @param {String} local_storage_name where to load and save the state.
     */
    constructor(state, num_states, local_storage_name) {
        super();
        this.state = state;
        this.num_states = num_states;
        this.#local_storage_name = local_storage_name;
    }

    #saveState() {
        localStorage.setItem(this.#local_storage_name, String(this.state));
    }

    cycleState() {
        this.state = (this.state + 1) % this.num_states;
        this.#saveState();
    }
}

class CountdownDisplay {
    /** @type {Countdown} */
    countdown;
    /** @type {DisplayState} */
    state;
    /** @type {CountdownElem} */
    elem;

    /**
     * @param {Date} datetime
     */
    constructor(datetime) {
        this.countdown = new Countdown(datetime);
        this.state = new DisplayState(
            (() => {
                const state = localStorage.getItem("countdown_state");
                if (state !== null) {
                    return Number(state);
                } else {
                    // Default to `CountdownState.Blocky` for phones, and
                    // `CountdownState.CompactFull` for anything else.
                    if (matchMedia("(max-width: 600px)").matches) {
                        return CountdownState.Blocky;
                    } else {
                        return CountdownState.CompactFull;
                    }
                }
            })(),
            Object.keys(CountdownState).length,
            "countdown_state",
        );
        this.elem = getCountdownElem();
    }

    /** @returns {number} */
    #getTimeout() {
        switch (this.state.state) {
            case CountdownState.CompactFull:
                return 51;

            case CountdownState.CompactNoMillis:
            case CountdownState.Blocky:
                return 500;

            default:
                throw new Error("Invalid state");
        }
    }

    #startCountdown() {
        this.countdown.addEventListener("milliseconds", this.#updateMilliseconds.bind(this));
        this.countdown.addEventListener("seconds", this.#updateSeconds.bind(this));
        this.countdown.addEventListener("minutes", this.#updateMinutes.bind(this));
        this.countdown.addEventListener("hours", this.#updateHours.bind(this));
        this.countdown.addEventListener("days", this.#updateDays.bind(this));
        this.countdown.addEventListener("totaldays", this.#updateTotalDays.bind(this));

        this.countdown.start(this.#getTimeout());
    }

    /** @param {CustomEvent} event */
    #updateMilliseconds(event) {
        switch (this.state.state) {
            case CountdownState.CompactFull:
                if (this.elem.milliseconds_elem !== null) {
                    this.elem.milliseconds_elem.textContent = String(event.detail).padStart(
                        3,
                        "0",
                    );
                }
                break;

            case CountdownState.CompactNoMillis:
            case CountdownState.Blocky:
                break;

            default:
                throw new Error("Invalid state");
        }
    }

    /** @param {CustomEvent} event */
    #updateSeconds(event) {
        switch (this.state.state) {
            case CountdownState.CompactFull:
            case CountdownState.CompactNoMillis:
                this.elem.seconds_elem.textContent = String(event.detail).padStart(
                    2,
                    "0",
                );
                break;

            case CountdownState.Blocky:
                this.elem.seconds_elem.textContent = String(event.detail);
                break;

            default:
                throw new Error("Invalid state");
        }
    }

    /** @param {CustomEvent} event */
    #updateMinutes(event) {
        switch (this.state.state) {
            case CountdownState.CompactFull:
            case CountdownState.CompactNoMillis:
                this.elem.minutes_elem.textContent = String(event.detail).padStart(
                    2,
                    "0",
                );
                break;

            case CountdownState.Blocky:
                this.elem.minutes_elem.textContent = String(event.detail);
                break;

            default:
                throw new Error("Invalid state");
        }
    }

    /** @param {CustomEvent} event */
    #updateHours(event) {
        switch (this.state.state) {
            case CountdownState.CompactFull:
            case CountdownState.CompactNoMillis:
                this.elem.hours_elem.textContent = String(event.detail).padStart(
                    2,
                    "0",
                );
                break;

            case CountdownState.Blocky:
                this.elem.hours_elem.textContent = String(event.detail);
                break;

            default:
                throw new Error("Invalid state");
        }
    }

    /** @param {CustomEvent} event */
    #updateDays(event) {
        switch (this.state.state) {
            case CountdownState.CompactFull:
            case CountdownState.CompactNoMillis:
            case CountdownState.Blocky:
                break;

            default:
                throw new Error("Invalid state");
        }
    }

    /** @param {CustomEvent} event */
    #updateTotalDays(event) {
        const previous_len = this.elem.days_elem.textContent?.length;
        switch (this.state.state) {
            case CountdownState.CompactFull:
            case CountdownState.CompactNoMillis:
            case CountdownState.Blocky:
                this.elem.days_elem.textContent = String(event.detail);
                break;

            default:
                throw new Error("Invalid state");
        }
        const new_len = this.elem.days_elem.textContent?.length;
        // TODO: fix this unnecssarily updating when countdown is started
        // because it goes from 0 days to whatever days;
        //
        // Only check days elem for a change in length, because the other elems
        // have the same length all the time.
        if (new_len !== previous_len) {
            this.#updateFontSize();
        }
    }

    /** TODO: fix this steaming pile of garbage */
    #updateDisplayDOM() {
        switch (this.state.state) {
            case CountdownState.CompactFull:
                if (this.elem.seconds_label === null) {
                    const secs_label = document.createElement("label");
                    secs_label.id = "secs-label";
                    secs_label.htmlFor = "countdown-secs";

                    this.elem.countdown_elem.appendChild(secs_label);
                    this.elem.seconds_label = secs_label;
                }

                if (this.elem.milliseconds_elem === null) {
                    const milliseconds_elem = document.createElement("p");
                    milliseconds_elem.id = "countdown-millis";

                    this.elem.countdown_elem.appendChild(milliseconds_elem);
                    this.elem.milliseconds_elem = milliseconds_elem;
                }

                this.elem.days_label.textContent = ":";
                this.elem.hours_label.textContent = ":";
                this.elem.minutes_label.textContent = ":";
                this.elem.seconds_label.textContent = ".";

                this.elem.countdown_elem.classList.replace("blocky", "inline");
                break;

            case CountdownState.CompactNoMillis:
                if (this.elem.seconds_label !== null) {
                    this.elem.seconds_label.remove();
                    this.elem.seconds_label = null;
                }

                if (this.elem.milliseconds_elem !== null) {
                    this.elem.milliseconds_elem.remove();
                    this.elem.milliseconds_elem = null;
                }

                this.elem.countdown_elem.classList.replace("blocky", "inline");
                break;

            case CountdownState.Blocky:
                if (this.elem.seconds_label === null) {
                    const secs_label = document.createElement("label");
                    secs_label.id = "secs-label";
                    secs_label.htmlFor = "countdown-secs";

                    this.elem.countdown_elem.appendChild(secs_label);
                    this.elem.seconds_label = secs_label;
                }

                if (this.elem.milliseconds_elem !== null) {
                    this.elem.milliseconds_elem.remove();
                    this.elem.milliseconds_elem = null;
                }

                this.elem.days_label.textContent = "D";
                this.elem.hours_label.textContent = "H";
                this.elem.minutes_label.textContent = "M";
                this.elem.seconds_label.textContent = "S";

                this.elem.countdown_elem.classList.replace("inline", "blocky");
                break;

            default:
                throw new Error("Invalid state");
        }
        if (this.countdown.interval_id !== null) {
            this.countdown.setIntervalTimeout(this.#getTimeout());
        }
    }

    /** This only works because we're using a mono-spaced font. */
    #updateFontSize() {
        let text_len = null;
        let text_num_lines = null;

        switch (this.state.state) {
            case CountdownState.CompactFull:
            case CountdownState.CompactNoMillis:
                text_len = String(this.elem.countdown_elem.textContent).length;
                text_num_lines = 1;
                break;

            case CountdownState.Blocky:
                text_len =
                    Math.max(
                        String(this.elem.days_elem.textContent).length,
                        String(this.elem.hours_elem.textContent).length,
                        String(this.elem.minutes_elem.textContent).length,
                        String(this.elem.seconds_elem.textContent).length,
                    ) + 1;
                text_num_lines = 4;
                break;

            default:
                throw new Error("Invalid state");
        }

        const font_size_vw = `${String((FONT_SIZE_VW_RATIO * COUNTDOWN_VW) / text_len)}vw`;
        const font_size_vh = `${String((FONT_SIZE_VH_RATIO * COUNTDOWN_VH) / text_num_lines)}vh`;

        this.elem.countdown_elem.style.fontSize = `clamp(1.5rem, min(${font_size_vw}, ${font_size_vh}), 20rem)`;
    }

    /** @param {Object} new_datetime_target */
    updateDatetimeTarget(new_datetime_target) {
        this.countdown.updateDatetimeTarget(new_datetime_target);
    }

    cycleState() {
        this.state.cycleState();
        this.#updateDisplayDOM();
        this.countdown.emitAll();
        this.#updateFontSize();
    }

    start() {
        this.#updateDisplayDOM();
        this.#startCountdown();
        this.#updateFontSize();
    }
}

/** @returns {CountdownElem} */
function getCountdownElem() {
    const countdown_elem = document.getElementById("countdown");
    if (countdown_elem === null) {
        throw new Error("No element with id=\"countdown\"");
    }
    const days_elem = document.getElementById("countdown-days");
    if (days_elem === null) {
        throw new Error("No element with id=\"countdown-days\"");
    }
    const days_label = document.getElementById("days-label");
    if (days_label === null) {
        throw new Error("No element with id=\"days-label\"");
    }
    const hours_elem = document.getElementById("countdown-hours");
    if (hours_elem === null) {
        throw new Error("No element with id=\"countdown-hours\"");
    }
    const hours_label = document.getElementById("hours-label");
    if (hours_label === null) {
        throw new Error("No element with id=\"hours-label\"");
    }
    const minutes_elem = document.getElementById("countdown-mins");
    if (minutes_elem === null) {
        throw new Error("No element with id=\"countdown-mins\"");
    }
    const minutes_label = document.getElementById("mins-label");
    if (minutes_label === null) {
        throw new Error("No element with id=\"mins-label\"");
    }
    const seconds_elem = document.getElementById("countdown-secs");
    if (seconds_elem === null) {
        throw new Error("No element with id=\"countdown-secs\"");
    }
    // Can be null
    const seconds_label = document.getElementById("secs-label");
    // Can be null
    const milliseconds_elem = document.getElementById("countdown-millis");

    return {
        countdown_elem,
        days_elem,
        days_label,
        hours_elem,
        hours_label,
        minutes_elem,
        minutes_label,
        seconds_elem,
        seconds_label,
        milliseconds_elem,
    };
}

class DatetimeDisplay {
    /** @type {Date} */
    datetime
    /** @type {DisplayState} */
    state
    /** @type {HTMLElement} */
    elem

    /** @param {Date} datetime */
    constructor(datetime) {
        this.datetime = datetime;
        this.state = new DisplayState(
            Number(localStorage.getItem("datetime_state")) || DatetimeState.Utc,
            Object.keys(DatetimeState).length,
            "datetime_state",
        );

        const elem = document.getElementById("datetime");
        if (elem === null) {
            throw new Error("No element with id=\"datetime\"");
        }
        this.elem = elem;
    }

    init() {
        this.#updateDisplayDOM();
        this.#updateFontSize();
    }

    cycleState() {
        this.state.cycleState();
        this.#updateDisplayDOM();
        this.#updateFontSize();
    }

    /** @param {Date} new_datetime */
    updateDatetime(new_datetime) {
        this.datetime = new_datetime;
        this.#updateDisplayDOM();
    }

    #updateDisplayDOM() {
        switch (this.state.state) {
            case DatetimeState.Utc:
                this.elem.textContent = this.datetime.toUTCString();
                break;

            case DatetimeState.Iso8601:
                this.elem.textContent = this.datetime.toISOString();
                break;

            case DatetimeState.LocalTimezone:
                // Kind of silly, but don't use `Date.toString()` because it
                // includes timezone name and it might dox people.
                const date = this.datetime.toDateString();
                const date_split = date.split(' ');
                const week_day = date_split[0];
                const month_name = date_split[1];
                const day = date_split[2];
                const year = date_split[3];

                const time = this.datetime.toTimeString();
                const parenthesis_index = time.indexOf('(');
                const time_without_timezone_name = time.slice(0, parenthesis_index - 1);

                this.elem.textContent =
                    week_day + ", " +
                    day + ' ' +
                    month_name + ' ' +
                    year + ' ' +
                    time_without_timezone_name;
                break;
            default:
                throw new Error("Invalid state");
        }
    }

    /** This only works because we're using a mono-spaced font. */
    #updateFontSize() {
        let text_len = String(this.elem.textContent).length;

        const font_size_vw = `${String((FONT_SIZE_VW_RATIO * DATETIME_VW) / text_len)}vw`;

        this.elem.style.fontSize = `clamp(0.9rem, min(${font_size_vw}), 9rem)`;
    }
}

// TODO: deal with websocket not connecting or when server is down. maybe add
// skeleton screen / greeking

/** @type {Object | null} */
let datetime = null;

let is_websocket_open = false;
let is_document_visible = true;

/** @type {WebSocket | null} */
let websocket = connectWebsocket();

/** @returns {WebSocket} */
function connectWebsocket() {
    const websocket = new WebSocket("battlebit/websocket");
    websocket.binaryType = "arraybuffer";
    websocket.addEventListener("message", onWebsocketMessage);
    is_websocket_open = true;

    return websocket;
}

function disconnectWebsocket() {
    if (websocket === null) {
        throw new Error("Tried closing websocket but is null");
    }
    is_websocket_open = false;
    websocket.removeEventListener("message", onWebsocketMessage);
    websocket.close();
    websocket = null;
}

// Disconnect websocket when webpage is not visible, to save on server
// resources.
document.addEventListener("visibilitychange", () => {
    is_document_visible = !document.hidden;
    if (is_document_visible === true) {
        websocket = connectWebsocket();
    } else if (is_document_visible === false) {
        disconnectWebsocket();
    }
});

websocket.addEventListener("open", (_event) => {
    is_websocket_open = true;
});

/** @type {CountdownDisplay | null} */
let countdown_display = null;

/** @type {DatetimeDisplay | null} */
let datetime_display = null;

/** @param {MessageEvent} event */
function onWebsocketMessage(event) {
    if (countdown_display !== null && datetime_display !== null) {
        datetime = new Date(Number(event.data));
        datetime_display.updateDatetime(datetime);
        countdown_display.updateDatetimeTarget(datetime);
    }
}

// main

document.addEventListener("DOMContentLoaded", (_event) => {
    const datetime_elem = document.getElementById("datetime");

    if (datetime_elem === null) {
        throw new Error("No element with id=\"datetime\"");
    }

    const datetime = new Date(Number(datetime_elem.textContent));
    datetime_display = new DatetimeDisplay(datetime)
    countdown_display = new CountdownDisplay(datetime);

    datetime_display.init();
    countdown_display.start();

    const refresh_button_elem = document.getElementById("refresh");
    if (refresh_button_elem === null) {
        throw new Error("No element with id=\"refresh\"");
    }

    refresh_button_elem.addEventListener("pointerdown", (event) => {
        if (is_websocket_open) {
            // Increment datetime
            websocket?.send(new Int8Array(0));
        }
        let child_svg = refresh_button_elem.children[0];
        if (event.pointerType === "mouse") {
            /** @type {HTMLElement} */(child_svg).classList.add("animatejump");
            setTimeout(() => {
                /** @type {HTMLElement} */(child_svg).classList.remove("animatejump");
            }, 200)
        } else {
            /** @type {HTMLElement} */(child_svg).classList.add("animate");
            setTimeout(() => {
                /** @type {HTMLElement} */(child_svg).classList.remove("animate");
            }, 200)
        }
    });

    const countdown_elem = document.getElementById("countdown");
    countdown_elem?.addEventListener("click", () => {
        countdown_display?.cycleState();
    });

    // TODO: fix it repeatedly activating when holding down enter
    countdown_elem?.addEventListener("keyup", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            countdown_display?.cycleState();
        }
    })
    // countdown_elem?.addEventListener("keydown", (event) => {
    //     event.preventDefault();
    // })

    datetime_elem.addEventListener("click", () => {
        datetime_display?.cycleState();
    });

    datetime_elem.addEventListener("keyup", (event) => {
        event.preventDefault();
        if (event.key === "Enter") {
            datetime_display?.cycleState();
        }
    })
});

