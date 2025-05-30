// @ts-check

/**
 * @typedef {{
 *     years: number,
 *     months: number,
 *     total_days: number,
 *     days: number,
 *     hours: number,
 *     minutes: number,
 *     seconds: number,
 *     milliseconds: number
 * }} Duration
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

/** @import dayjs from 'dayjs' */
/** @import duration from 'dayjs/plugin/duration' */

// @ts-ignore
dayjs.extend(window.dayjs_plugin_duration);

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
 * @param {dayjs.Dayjs} now_datetime
 * @param {dayjs.Dayjs} target_datetime
 * @returns {Duration}
 */
function getDiffDuration(now_datetime, target_datetime) {
    // @ts-ignore
    const duration = dayjs.duration(target_datetime.diff(now_datetime));
    return {
        years: duration.years(),
        months: duration.months(),
        total_days: Math.floor(Number(duration.asDays())),
        days: duration.days(),
        hours: duration.hours(),
        minutes: duration.minutes(),
        seconds: duration.seconds(),
        milliseconds: duration.milliseconds(),
    };
}

class Countdown extends EventTarget {
    /** @type {dayjs.Dayjs} */
    #datetime_target;
    /** @type {dayjs.Dayjs} */
    #datetime_now;
    /** @type {Duration} */
    #diff_duration;
    /** @type {number | null} */
    interval_id;

    /** @param {Object} datetime_target */
    constructor(datetime_target) {
        super();
        this.#datetime_target = datetime_target;
        // @ts-ignore
        this.#datetime_now = dayjs();
        this.#diff_duration = getDiffDuration(
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
        // @ts-ignore
        this.#datetime_now = dayjs();
        const new_diff_duration = getDiffDuration(
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
        const new_diff_duration = getDiffDuration(
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
    /** @type {DisplayState} */
    #inner_state;
    /** @type {CountdownElem} */
    #elem;
    /** @type {Countdown} */
    #countdown;

    /**
     * @param {Countdown} countdown
     * @param {DisplayState} display_state
     */
    constructor(countdown, display_state) {
        this.#countdown = countdown;
        this.#inner_state = display_state;
        this.#elem = getCountdownElem();
    }

    /** @returns {number} */
    #getTimeout() {
        switch (this.#inner_state.state) {
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
        this.#countdown.addEventListener("milliseconds", this.#updateMilliseconds.bind(this));
        this.#countdown.addEventListener("seconds", this.#updateSeconds.bind(this));
        this.#countdown.addEventListener("minutes", this.#updateMinutes.bind(this));
        this.#countdown.addEventListener("hours", this.#updateHours.bind(this));
        this.#countdown.addEventListener("days", this.#updateDays.bind(this));
        this.#countdown.addEventListener("totaldays", this.#updateTotalDays.bind(this));

        this.#countdown.start(this.#getTimeout());
    }

    /** @param {CustomEvent} event */
    #updateMilliseconds(event) {
        switch (this.#inner_state.state) {
            case CountdownState.CompactFull:
                if (this.#elem.milliseconds_elem !== null) {
                    this.#elem.milliseconds_elem.textContent = String(event.detail).padStart(
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
        switch (this.#inner_state.state) {
            case CountdownState.CompactFull:
            case CountdownState.CompactNoMillis:
                this.#elem.seconds_elem.textContent = String(event.detail).padStart(
                    2,
                    "0",
                );
                break;

            case CountdownState.Blocky:
                this.#elem.seconds_elem.textContent = String(event.detail);
                break;

            default:
                throw new Error("Invalid state");
        }
    }

    /** @param {CustomEvent} event */
    #updateMinutes(event) {
        switch (this.#inner_state.state) {
            case CountdownState.CompactFull:
            case CountdownState.CompactNoMillis:
                this.#elem.minutes_elem.textContent = String(event.detail).padStart(
                    2,
                    "0",
                );
                break;

            case CountdownState.Blocky:
                this.#elem.minutes_elem.textContent = String(event.detail);
                break;

            default:
                throw new Error("Invalid state");
        }
    }

    /** @param {CustomEvent} event */
    #updateHours(event) {
        switch (this.#inner_state.state) {
            case CountdownState.CompactFull:
            case CountdownState.CompactNoMillis:
                this.#elem.hours_elem.textContent = String(event.detail).padStart(
                    2,
                    "0",
                );
                break;

            case CountdownState.Blocky:
                this.#elem.hours_elem.textContent = String(event.detail);
                break;

            default:
                throw new Error("Invalid state");
        }
    }

    /** @param {CustomEvent} event */
    #updateDays(event) {
        switch (this.#inner_state.state) {
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
        switch (this.#inner_state.state) {
            case CountdownState.CompactFull:
            case CountdownState.CompactNoMillis:
            case CountdownState.Blocky:
                this.#elem.days_elem.textContent = String(event.detail);
                break;

            default:
                throw new Error("Invalid state");
        }
    }

    /** TODO: fix this steaming pile of garbage */
    #updateDisplayDOM() {
        switch (this.#inner_state.state) {
            case CountdownState.CompactFull:
                if (this.#elem.seconds_label === null) {
                    const secs_label = document.createElement("label");
                    secs_label.id = "secs-label";
                    secs_label.htmlFor = "countdown-secs";

                    this.#elem.countdown_elem.appendChild(secs_label);
                    this.#elem.seconds_label = secs_label;
                }

                if (this.#elem.milliseconds_elem === null) {
                    const milliseconds_elem = document.createElement("p");
                    milliseconds_elem.id = "countdown-millis";

                    this.#elem.countdown_elem.appendChild(milliseconds_elem);
                    this.#elem.milliseconds_elem = milliseconds_elem;
                }

                this.#elem.days_label.textContent = ":";
                this.#elem.hours_label.textContent = ":";
                this.#elem.minutes_label.textContent = ":";
                this.#elem.seconds_label.textContent = ".";

                this.#elem.countdown_elem.classList.replace("blocky", "inline");
                break;

            case CountdownState.CompactNoMillis:
                if (this.#elem.seconds_label !== null) {
                    this.#elem.seconds_label.remove();
                    this.#elem.seconds_label = null;
                }

                if (this.#elem.milliseconds_elem !== null) {
                    this.#elem.milliseconds_elem.remove();
                    this.#elem.milliseconds_elem = null;
                }

                this.#elem.countdown_elem.classList.replace("blocky", "inline");
                break;

            case CountdownState.Blocky:
                if (this.#elem.seconds_label === null) {
                    const secs_label = document.createElement("label");
                    secs_label.id = "secs-label";
                    secs_label.htmlFor = "countdown-secs";

                    this.#elem.countdown_elem.appendChild(secs_label);
                    this.#elem.seconds_label = secs_label;
                }

                if (this.#elem.milliseconds_elem !== null) {
                    this.#elem.milliseconds_elem.remove();
                    this.#elem.milliseconds_elem = null;
                }

                this.#elem.days_label.textContent = "D";
                this.#elem.hours_label.textContent = "H";
                this.#elem.minutes_label.textContent = "M";
                this.#elem.seconds_label.textContent = "S";

                this.#elem.countdown_elem.classList.replace("inline", "blocky");
                break;

            default:
                throw new Error("Invalid state");
        }
        if (this.#countdown.interval_id !== null) {
            this.#countdown.setIntervalTimeout(this.#getTimeout());
        }
    }


    // TODO: update font size when text length changes, e.g. 'days' goes from
    // 999 to 1000
    /** This only works because we're using a mono-spaced font. */
    #updateFontSize() {
        // With a 5:3 ratio, a font size of 5vw results in character width of 3vw
        const font_size_to_width_ratio = 5 / 3;
        const font_size_to_height_ratio = 5 / 4;

        let text_len = null;
        let text_num_lines = null;

        switch (this.#inner_state.state) {
            case CountdownState.CompactFull:
            case CountdownState.CompactNoMillis:
                text_len = String(this.#elem.countdown_elem.textContent).length;
                text_num_lines = 1;
                break;

            case CountdownState.Blocky:
                text_len =
                    Math.max(
                        String(this.#elem.days_elem.textContent).length,
                        String(this.#elem.hours_elem.textContent).length,
                        String(this.#elem.minutes_elem.textContent).length,
                        String(this.#elem.seconds_elem.textContent).length,
                    ) + 1;
                text_num_lines = 4;
                break;

            default:
                throw new Error("Invalid state");
        }

        const parent_node = this.#elem.countdown_elem.parentNode;
        if (parent_node === null) {
            throw new Error("Countdown element has no parent");
        }
        if (parent_node.nodeType !== Node.ELEMENT_NODE) {
            throw new Error("Parent node of countdown element is not an Element");
        }

        // use `window.getComputedStyle()` because `parent_node.clientWidth` and
        // `parent_node.offsetWidth` isn't accurate.
        const parent_div_vw = Number.parseFloat(
            window.getComputedStyle(/** @type {Element} */(parent_node)).maxWidth,
        );
        const parent_div_vh = Number.parseFloat(
            window.getComputedStyle(/** @type {Element} */(parent_node)).maxHeight,
        );

        const font_size_vw = `${String((font_size_to_width_ratio * parent_div_vw) / text_len)}vw`;
        const font_size_vh = `${String((font_size_to_height_ratio * parent_div_vh) / text_num_lines)}vh`;

        this.#elem.countdown_elem.style.fontSize = `clamp(1.5rem, min(${font_size_vw}, ${font_size_vh}), 20rem)`;
    }

    /** @param {Object} new_datetime_target */
    updateDatetimeTarget(new_datetime_target) {
        this.#countdown.updateDatetimeTarget(new_datetime_target);
    }

    cycleState() {
        this.#inner_state.cycleState();
        this.#updateDisplayDOM();
        this.#countdown.emitAll();
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

const countdown_state = new DisplayState(
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

const datetime_state = new DisplayState(
    Number(localStorage.getItem("datetime_state")) || DatetimeState.Utc,
    Object.keys(DatetimeState).length,
    "datetime_state",
);

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

websocket.addEventListener("open", (_evt) => {
    is_websocket_open = true;
});

/** @type {CountdownDisplay | null} */
let countdown_display = null;

document.addEventListener("DOMContentLoaded", (_evt) => {
    const datetime_elem = document.getElementById("datetime");
    countdown_display = new CountdownDisplay(
        // @ts-ignore
        new Countdown(dayjs(Number(datetime_elem?.textContent))),
        countdown_state,
    );

    formatDatetime();
    countdown_display.start();

    document.getElementById("refresh")?.addEventListener("click", () => {
        if (is_websocket_open) {
            // Increment datetime
            websocket?.send(new Int8Array(0));
        }
    });

    document.getElementById("countdown")?.addEventListener("click", () => {
        countdown_display?.cycleState();
    });

    document.getElementById("datetime")?.addEventListener("click", () => {
        datetime_state.cycleState();
        updateDatetimeDisplay();
    });
});

/** @param {MessageEvent} event */
function onWebsocketMessage(event) {
    if (datetime !== null && countdown_display !== null) {
        // @ts-ignore
        datetime = dayjs(Number(event.data));
        updateDatetimeDisplay();
        countdown_display.updateDatetimeTarget(datetime);
    }
}

function updateDatetimeDisplay() {
    const datetime_elem = document.getElementById("datetime");
    if (datetime_elem === null) {
        throw new Error("No element with id=\"datetime\"")
    }
    switch (datetime_state.state) {
        case DatetimeState.Utc:
            datetime_elem.textContent = datetime.toString();
            break;
        case DatetimeState.Iso8601:
            datetime_elem.textContent = datetime.toISOString();
            break;
        case DatetimeState.LocalTimezone:
            datetime_elem.textContent = datetime.format(
                "ddd, DD MMM YYYY HH:mm:ss [GMT]ZZ",
            );
            break;
        default:
            break;
    }
}

function formatDatetime() {
    const datetime_elem = document.getElementById("datetime");
    // @ts-ignore
    datetime = dayjs(Number(datetime_elem?.textContent));
    updateDatetimeDisplay();
}
