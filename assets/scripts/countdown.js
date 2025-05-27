const CountdownState = Object.freeze({
    "CompactFull": 0,
    "CompactNoMillis": 1,
    "Blocky": 2,
})

const DatetimeState = Object.freeze({
    "Utc": 0,
    "Iso8601": 1,
    "LocalTimezone": 2,
})

class TimeUnits {
    /** @type {number} */
    days;
    /** @type {number} */
    hours;
    /** @type {number} */
    mins;
    /** @type {number} */
    secs;
    /** @type {number} */
    millis;

    /**
     * @param {number} days
     * @param {number} hours
     * @param {number} mins
     * @param {number} secs
     * @param {number} millis
     */
    constructor(days, hours, mins, secs, millis) {
        this.days = days;
        this.hours = hours;
        this.mins = mins;
        this.secs = secs;
        this.millis = millis;
    }

    /** @param {number} datetime_millis */
    static fromMillis(datetime_millis) {
        const days = Math.floor(datetime_millis / (1000 * 60 * 60 * 24));
        const hours = Math.floor((datetime_millis / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((datetime_millis / (1000 * 60)) % 60);
        const secs = Math.floor((datetime_millis / 1000) % 60);
        const millis = Math.floor((datetime_millis % 1000));

        return new this(days, hours, mins, secs, millis);
    }
}

class Countdown extends EventTarget {
    /** @type {number} */
    #datetime_target;
    /** @type {number} */
    #datetime_now;
    /** @type {number} */
    #datetime_diff;
    /** @type {TimeUnits} */
    diff_time_units;
    /** @type {number | null} */
    interval_id;

    /** @param {number} datetime_target */
    constructor(datetime_target) {
        super();
        this.#datetime_target = datetime_target;
        this.#datetime_now = Date.now();
        this.#datetime_diff = this.#datetime_target - this.#datetime_now;
        this.diff_time_units = TimeUnits.fromMillis(this.#datetime_diff);
        this.interval_id = null;
    }

    /** @param {number} days */
    #emitUpdateDays(days) {
        this.dispatchEvent(new CustomEvent("days", { detail: { days: days } }));
    }

    /** @param {number} hours */
    #emitUpdateHours(hours) {
        this.dispatchEvent(new CustomEvent("hours", { detail: { hours: hours } }));
    }

    /** @param {number} mins */
    #emitUpdateMins(mins) {
        this.dispatchEvent(new CustomEvent("mins", { detail: { mins: mins } }));
    }

    /** @param {number} secs */
    #emitUpdateSecs(secs) {
        this.dispatchEvent(new CustomEvent("secs", { detail: { secs: secs } }));
    }

    /** @param {number} millis */
    #emitUpdateMillis(millis) {
        this.dispatchEvent(new CustomEvent("millis", { detail: { millis: millis } }));
    }

    /** @param {number} new_diff_time_units */
    #innerEmitUpdate(new_diff_time_units) {
        this.#emitUpdateMillis(new_diff_time_units.millis);

        if (new_diff_time_units.secs != this.diff_time_units.secs) {
            this.#emitUpdateSecs(new_diff_time_units.secs);
        }
        if (new_diff_time_units.mins != this.diff_time_units.mins) {
            this.#emitUpdateMins(new_diff_time_units.mins)
        }
        if (new_diff_time_units.hours != this.diff_time_units.hours) {
            this.#emitUpdateHours(new_diff_time_units.hours)
        }
        if (new_diff_time_units.days != this.diff_time_units.days) {
            this.#emitUpdateDays(new_diff_time_units.days)
        }

        this.diff_time_units = new_diff_time_units;
    }

    #intervalUpdate() {
        this.#datetime_now = Date.now();
        this.#datetime_diff = this.#datetime_target - this.#datetime_now;
        const new_diff_time_units = TimeUnits.fromMillis(this.#datetime_diff);
        this.#innerEmitUpdate(new_diff_time_units);
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
            clearInterval(this.interval_id);
            this.#innerStartInterval(new_timeout);
        } else {
            console.error("Invalid new_timeout");
        }
    }

    /** @param {number} new_timeout */
    start(timeout) {
        this.#emitUpdateSecs(this.diff_time_units.secs);
        this.#emitUpdateMins(this.diff_time_units.mins);
        this.#emitUpdateHours(this.diff_time_units.hours);
        this.#emitUpdateDays(this.diff_time_units.days);
        this.#innerStartInterval(typeof timeout === "number" ? timeout : 500);
    }

    /** @param {number} new_datetime_target */
    updateDatetimeTarget(new_datetime_target) {
        this.#datetime_target = new_datetime_target;
        this.#datetime_diff = this.#datetime_target - this.#datetime_now;
        const new_diff_time_units = TimeUnits.fromMillis(this.#datetime_diff);
        this.#innerEmitUpdate(new_diff_time_units);
    }
}

class DisplayState extends EventTarget {
    state;
    num_states;
    #local_storage_name;

    /**
     * The state of a display.
     * @param {number} state an integer representing the state. Usually this is an enum value.
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

class CountdownElem {
    /** @type {HTMLElement} */
    days_elem;
    /** @type {HTMLElement} */
    hours_elem;
    /** @type {HTMLElement} */
    mins_elem;
    /** @type {HTMLElement} */
    secs_elem;
    /** @type {HTMLElement} */
    millis_elem;

    /**
     * @param {HTMLElement} days_elem
     * @param {HTMLElement} hours_elem
     * @param {HTMLElement} mins_elem
     * @param {HTMLElement} secs_elem
     * @param {HTMLElement} millis_elem
     */
    constructor(days_elem, hours_elem, mins_elem, secs_elem, millis_elem) {
        this.days_elem = days_elem;
        this.hours_elem = hours_elem;
        this.mins_elem = mins_elem;
        this.secs_elem = secs_elem;
        this.millis_elem = millis_elem;
    }
}

class CountdownDisplay {
    /** @type {DisplayState} */
    #inner_state;
    /** @type {CountdownElem | null} */
    #elem;
    /** @type {Countdown} */
    #countdown;

    /**
     * @param {Countdown} countdown
     * @param {DisplayState} display_state
     */
    constructor(countdown, display_state) {
        if (!countdown instanceof Countdown) {
            throw new Error(
                "Constructed CountdownDisplay with countdown of \"" +
                countdown.constructor.name +
                "\" instead of expected class of \"Countdown\""
            );
        }

        if (!display_state instanceof DisplayState) {
            throw new Error(
                "Constructed CountdownDisplay with display_state of \"" +
                display_state.constructor.name +
                "\" instead of expected class of \"DisplayState\""
            );
        }

        this.#inner_state = display_state;
        this.#elem = null;
        this.#countdown = countdown;
    }

    #startCountdown() {
        this.#countdown.addEventListener("millis", this.#updateMillis.bind(this));
        this.#countdown.addEventListener("secs", this.#updateSecs.bind(this));
        this.#countdown.addEventListener("mins", this.#updateMins.bind(this));
        this.#countdown.addEventListener("hours", this.#updateHours.bind(this));
        this.#countdown.addEventListener("days", this.#updateDays.bind(this));

        this.#countdown.start(35);
    }

    /** @param {CustomEvent} event */
    #updateMillis(event) {
        this.#elem.millis_elem.textContent = String(event.detail.millis).padStart(3, '0');
    }

    /** @param {CustomEvent} event */
    #updateSecs(event) {
        this.#elem.secs_elem.textContent = String(event.detail.secs).padStart(2, '0');
    }

    /** @param {CustomEvent} event */
    #updateMins(event) {
        this.#elem.mins_elem.textContent = String(event.detail.mins).padStart(2, '0');
    }

    /** @param {CustomEvent} event */
    #updateHours(event) {
        this.#elem.hours_elem.textContent = String(event.detail.hours).padStart(2, '0');
    }

    /** @param {CustomEvent} event */
    #updateDays(event) {
        this.#elem.days_elem.textContent = String(event.detail.days);
    }

    #updateDisplayDOM() {
        switch (this.#inner_state.state) {
            case CountdownState.CompactFull:
                break;

            case CountdownState.CompactNoMillis:
                break;

            case CountdownState.Blocky:
                break;

            default:
                throw new Error("Invalid state");
        }
    }

    /** @param {number} new_datetime_target */
    updateDatetimeTarget(new_datetime_target) {
        this.#countdown.updateDatetimeTarget(new_datetime_target);
    }

    cycleDisplay() {
        this.#inner_state.cycleState();
        this.#updateDisplayDOM();
        this.#elem = getCountdownElem();
    }

    start() {
        this.#updateDisplayDOM();
        this.#elem = getCountdownElem();
        this.#startCountdown();
    }
}

/** @returns {CountdownElem} */
function getCountdownElem() {
    const days_elem = document.getElementById("countdown-days");
    const hours_elem = document.getElementById("countdown-hours");
    const mins_elem = document.getElementById("countdown-mins");
    const secs_elem = document.getElementById("countdown-secs");
    // Can be null
    const millis_elem = document.getElementById("countdown-millis");

    return new CountdownElem(days_elem, hours_elem, mins_elem, secs_elem, millis_elem);
}

const countdown_state = new DisplayState(
    Number(localStorage.getItem("countdown_state")) || CountdownState.CompactFull,
    Object.keys(CountdownState).length,
    "countdown_state"
)

const datetime_state = new DisplayState(
    Number(localStorage.getItem("datetime_state")) || DatetimeState.Utc,
    3,
    "datetime_state"
)
let datetime = null;
let countdown_interval_id = null;

const websocket = new WebSocket(`battlebit/websocket`);
websocket.binaryType = "arraybuffer";

let is_websocket_open = false;
websocket.addEventListener("open", (_evt) => {
    is_websocket_open = true;
})


document.addEventListener("DOMContentLoaded", function(_evt) {
    const datetime_elem = document.getElementById("datetime");
    const countdown_display = new CountdownDisplay(
        new Countdown(new Date(Number(datetime_elem.textContent)).getTime()),
        countdown_state
    );

    formatDatetime();
    countdown_display.start();

    document.getElementById("refresh").addEventListener("click", () => {
        if (is_websocket_open) {
            // Increment datetime
            websocket.send(new Int8Array(0));
        }
    });

    websocket.addEventListener("message", (event) => {
        datetime = new Date(Number(event.data));
        updateDatetimeDisplay();
        countdown_display.updateDatetimeTarget(datetime.getTime());
    })

    document.getElementById("countdown").addEventListener("click", () => {
        countdown_state.cycleState();
    });

    document.getElementById("datetime").addEventListener("click", () => {
        datetime_state.cycleState();
        updateDatetimeDisplay();
    });
});

function setCountdownDisplayToBlocky() {
    const countdown_elem = document.getElementById("countdown");

    const countdown_div = document.createElement("div");
    countdown_div.setAttribute("id", "countdown");
    countdown_div.style.display = "grid";
    countdown_div.style.gridTemplateColumns = "1fr auto";
    countdown_div.style.gap = "0.05em 0.25em";
    countdown_div.className = "font-roboto font-bold main-fg-color";

    const days_elem = document.createElement("p");
    const days_label = document.createElement("label");
    days_elem.setAttribute("id", "countdown-days");
    days_elem.style.justifySelf = "end";
    days_label.textContent = "D";
    days_label.htmlFor = "countdown-days";

    const hours_elem = document.createElement("p");
    const hours_label = document.createElement("label");
    hours_elem.setAttribute("id", "countdown-hours");
    hours_elem.style.justifySelf = "end";
    hours_label.textContent = "H";
    hours_label.htmlFor = "countdown-hours";

    const mins_elem = document.createElement("p");
    const mins_label = document.createElement("label");
    mins_elem.setAttribute("id", "countdown-mins");
    mins_elem.style.justifySelf = "end";
    mins_label.textContent = "M";
    mins_label.htmlFor = "countdown-mins";

    const secs_elem = document.createElement("p");
    const secs_label = document.createElement("label");
    secs_elem.setAttribute("id", "countdown-secs");
    secs_elem.style.justifySelf = "end";
    secs_label.htmlFor = "countdown-secs";
    secs_label.textContent = "S";

    countdown_div.appendChild(days_elem);
    countdown_div.appendChild(days_label);
    countdown_div.appendChild(hours_elem);
    countdown_div.appendChild(hours_label);
    countdown_div.appendChild(mins_elem);
    countdown_div.appendChild(mins_label);
    countdown_div.appendChild(secs_elem);
    countdown_div.appendChild(secs_label);

    countdown_elem.replaceWith(countdown_div);

    countdown_div.addEventListener("click", function() {
        countdown_state.cycleState();
    });
}

let is_document_visible = true;

document.addEventListener("visibilitychange", () => {
    is_document_visible = !document.hidden;
    // if (is_document_visible === true) {
    //     queryDatetimeAndUpdateDisplays();
    // }
})

function updateDatetimeDisplay() {
    const datetime_elem = document.getElementById("datetime");
    switch (datetime_state.state) {
        case DatetimeState.Utc:
            datetime_elem.textContent = datetime.toUTCString();
            break;
        case DatetimeState.Iso8601:
            datetime_elem.textContent = datetime.toISOString();
            break;
        case DatetimeState.LocalTimezone:
            // Kind of silly, but don't use `Date.toString()` because it
            // includes timezone name and it might dox people.
            const date = datetime.toDateString();
            const date_split = date.split(' ');
            const week_day = date_split[0];
            const month_name = date_split[1];
            const day = date_split[2];
            const year = date_split[3];

            const time = datetime.toTimeString();
            const parenthesis_index = time.indexOf('(');
            const time_without_timezone_name = time.slice(0, parenthesis_index - 1);

            datetime_elem.textContent =
                week_day + ", " +
                day + ' ' +
                month_name + ' ' +
                year + ' ' +
                time_without_timezone_name;
            break;
        default:
            break;
    }
}

function formatDatetime() {
    const datetime_elem = document.getElementById("datetime");
    datetime = new Date(Number(datetime_elem.textContent));
    updateDatetimeDisplay();
}
