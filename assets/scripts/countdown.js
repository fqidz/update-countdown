// @ts-check
"use strict";

/**
 * Duration between two datetimes.
 *
 * total_days: years, months, and days combined
 * @typedef {Object} Duration
 * @property {number} total_days
 * @property {number} years
 * @property {number} months
 * @property {number} days
 * @property {number} hours
 * @property {number} minutes
 * @property {number} seconds
 * @property {number} milliseconds
 */


/**
 * `Date` with only its time units. More convenient for calculating `Duration`
 * between dates.
 * @typedef {Object} TimeUnit
 * @property {number} year
 * @property {number} month
 * @property {number} day
 * @property {number} hour
 * @property {number} minute
 * @property {number} second
 * @property {number} millisecond
 */

/**
 * `TimeUnit` with only year, month, and day.
 * @typedef {Object} YearMonthDay
 * @property {number} year
 * @property {number} month
 * @property {number} day
 */

// With a 5:3 ratio, a font size of 5vw results in character width of 3vw
// 5:3 or 5/3
const FONT_SIZE_VW_RATIO = 1.6666666666666665;
// 5:4 or 5/4
const FONT_SIZE_VH_RATIO = 1.25;

// Hardcode these here instead of setting it in css, because it's not accurate
// when "extracting" it from the css
const COUNTDOWN_VW = 80;
const COUNTDOWN_VH = 50;

const DATETIME_VW = 35;

const REFRESH_BUTTON_TIMEOUT_DURATION = 300;

/** Enums for different countdown display states */
const CountdownState = Object.freeze({
    CompactNoMillis: 0,
    Compact: 1,
    Blocky: 2,
});

/** Enums for different datetime display states */
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
 * Amount of days in the month.
 * 0 -> 11 == Jan -> Dec.
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
 * Total days between dates.
 * @param {YearMonthDay} ymd_from
 * @param {YearMonthDay} ymd_to
 * @returns {number}
 */
function daysBetween(ymd_from, ymd_to) {
    return ymdToDays(ymd_to) - ymdToDays(ymd_from);
}

/**
 * Convert year, month, and day into something similar to Julian days.
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
 * Get the duration between two dates in total days, years, months, days,
 * hours, minutes, seconds, and milliseconds
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

    // Borrow from the next time unit if the current one is negative.
    // TODO: I feel like theres a better way to do this.
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

// TODO: Figure out a better way to do this. It feels very messy & not safe due to using a `Map`.
class CountdownElem {
    /** @type {Map<string, HTMLElement | null>} */
    elems;

    constructor() {
        this.elems = new Map();

        this.elems.set("countdown", document.getElementById("countdown"));
        this.elems.set("countdown-days", document.getElementById("countdown-days"));
        this.elems.set("days-label", document.getElementById("days-label"));
        this.elems.set("countdown-hours", document.getElementById("countdown-hours"));
        this.elems.set("hours-label", document.getElementById("hours-label"));
        this.elems.set("countdown-minutes", document.getElementById("countdown-minutes"));
        this.elems.set("minutes-label", document.getElementById("minutes-label"));
        this.elems.set("countdown-seconds", document.getElementById("countdown-seconds"));

        // The following can all be null
        this.elems.set("countdown-milliseconds", document.getElementById("countdown-milliseconds"));

        this.elems.set("hours-container", document.getElementById("hours-container"));
        this.elems.set("hours-spacer", document.getElementById("hours-spacer"));

        this.elems.set("minutes-container", document.getElementById("minutes-container"));
        this.elems.set("minutes-spacer", document.getElementById("minutes-spacer"));

        this.elems.set("seconds-container", document.getElementById("seconds-container"));
        this.elems.set("seconds-spacer", document.getElementById("seconds-spacer"));

        this.elems.set("seconds-label", document.getElementById("seconds-label"));
    }

    /** @param {HTMLElement} elem */
    #append_to_root_elem(elem) {
        const countdown = this.elems.get("countdown");
        if (countdown !== null && countdown !== undefined) {
            countdown.appendChild(elem);
            this.elems.set(elem.id, elem);
        } else {
            throw new Error("Countdown root element not found: id='countdown'");
        }
    }

    /**
     * @param {string} elem_id
     * @param {string} tag_name
     **/
    #create_and_append_element_if_null(elem_id, tag_name) {
        let elem = this.elems.get(elem_id);
        if (elem === null) {
            elem = document.createElement(tag_name);
            elem.id = elem_id;

            this.#append_to_root_elem(elem);
        } else if (elem === undefined) {
            throw new Error(`Element was not initialized: 'id=${elem_id}'`)
        }
        // no-op if element already exists
    }

    /**
     * @param {string} label_id
     **/
    #create_and_append_label_if_null(label_id) {
        let label = this.elems.get(label_id);
        if (label === null) {
            label = document.createElement("span");
            label.id = label_id;

            this.#append_to_root_elem(label);
        } else if (label === undefined) {
            throw new Error(`Label was not initialized: 'id=${label_id}'`)
        }
        // no-op if element already exists
    }

    /**
     * @param {string} elem_id
     * @returns {HTMLElement}
     **/
    get_elem_or_throw(elem_id) {
        const elem = this.elems.get(elem_id);
        if (elem === null) {
            throw new Error(`Element does not exist: 'id=${elem_id}'`)
        } else if (elem === undefined) {
            throw new Error(`Element was not initialized: 'id=${elem_id}'`)
        } else {
            return elem;
        }
    }

    /** @param {string} elem_id */
    #remove_elem(elem_id) {
        const elem = this.elems.get(elem_id);
        if (elem === null) {
            // no-op
        } else if (elem === undefined) {
            throw new Error(`Element was not initialized: 'id=${elem_id}'`)
        } else {
            elem?.remove();
            this.elems.set(elem_id, null);
        }
    }

    /**
     * @param {string} container_id
     * @param {string} spacer_id
     * @param {string} target_replace_id
     **/
    #replace_with_container(container_id, spacer_id, target_replace_id) {
        if (this.elems.get(container_id) === null) {
            const replacement_elem = document.createElement("p");
            replacement_elem.id = target_replace_id;
            replacement_elem.style.display = "inline";

            const spacer = document.createElement("p");
            spacer.id = spacer_id;
            spacer.className = "spacer";
            spacer.style.display = "inline";
            spacer.ariaHidden = "true";

            const container = document.createElement("div");
            container.id = container_id;
            // container.style.display = "inline";

            container.appendChild(spacer);
            container.appendChild(replacement_elem);

            this.get_elem_or_throw(target_replace_id).replaceWith(container);

            this.elems.set(container_id, container);
            this.elems.set(spacer_id, spacer);
            this.elems.set(target_replace_id, replacement_elem);
        } else if (this.elems.get(container_id) === undefined) {
            throw new Error(`Container was not initialized: 'id=${container_id}'`)
        }
        // no-op if container already exists
    }

    /**
     * @param {string} container_id
     * @param {string} spacer_id
     * @param {string} inner_elem_id
     **/
    #restore_container(container_id, spacer_id, inner_elem_id) {
        const container = this.elems.get(container_id);
        if (container === null) {
            // no-op
        } else if (container === undefined) {
            throw new Error(`Container was not initialized: 'id=${container_id}'`)
        } else {
            const inner_elem = this.get_elem_or_throw(inner_elem_id);
            this.elems.set(container_id, null);
            this.elems.set(spacer_id, null);
            this.elems.set(inner_elem_id, inner_elem);

            container.replaceWith(inner_elem);
        }
    }

    /** @param {number} state CountdownState */
    cycle_to_state(state) {
        switch (state) {
            case CountdownState.CompactNoMillis:
                this.#remove_elem("seconds-label");
                this.#remove_elem("countdown-milliseconds");

                this.#restore_container("hours-container", "hours-spacer", "countdown-hours");
                this.#restore_container("minutes-container", "minutes-spacer", "countdown-minutes");
                this.#restore_container("seconds-container", "seconds-spacer", "countdown-seconds");

                this.get_elem_or_throw("days-label").textContent = ":";
                this.get_elem_or_throw("hours-label").textContent = ":";
                this.get_elem_or_throw("minutes-label").textContent = ":";

                this.get_elem_or_throw("countdown").classList.replace("blocky", "inline");
                break;

            case CountdownState.Compact:
                this.#create_and_append_label_if_null("seconds-label");
                this.#create_and_append_element_if_null("countdown-milliseconds", "p");

                this.#restore_container("hours-container", "hours-spacer", "countdown-hours");
                this.#restore_container("minutes-container", "minutes-spacer", "countdown-minutes");
                this.#restore_container("seconds-container", "seconds-spacer", "countdown-seconds");

                this.get_elem_or_throw("days-label").textContent = ":";
                this.get_elem_or_throw("hours-label").textContent = ":";
                this.get_elem_or_throw("minutes-label").textContent = ":";
                this.get_elem_or_throw("seconds-label").textContent = ".";

                this.get_elem_or_throw("countdown").classList.replace("blocky", "inline");
                break;

            case CountdownState.Blocky:
                this.#create_and_append_label_if_null("seconds-label");
                this.#remove_elem("countdown-milliseconds");

                this.get_elem_or_throw("days-label").textContent = "D";
                this.get_elem_or_throw("hours-label").textContent = "H";
                this.get_elem_or_throw("minutes-label").textContent = "M";
                this.get_elem_or_throw("seconds-label").textContent = "S";

                this.#replace_with_container("hours-container", "hours-spacer", "countdown-hours");
                this.#replace_with_container("minutes-container", "minutes-spacer", "countdown-minutes");
                this.#replace_with_container("seconds-container", "seconds-spacer", "countdown-seconds");

                this.get_elem_or_throw("countdown").classList.replace("inline", "blocky");
                break;

            default:
                throw new Error("Invalid state");
        }
    }
}

class DisplayState extends EventTarget {
    /** @type {number} */
    state;
    /** @type {number} */
    num_states;
    /** @type {String} */
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

    cycleState() {
        this.state = (this.state + 1) % this.num_states;
        localStorage.setItem(this.#local_storage_name, String(this.state));
    }
}


/** Logic for `CountdownDisplay` */
class Countdown extends EventTarget {
    /** @type {Date} */
    #datetime_target;
    /** @type {Date} */
    #datetime_now;
    /** @type {Duration} */
    #diff_duration;
    /** @type {number} */
    #timeout;
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
            throw new Error("Invalid new_timeout");
        } else {
            if (this.interval_id !== null) {
                clearInterval(this.interval_id);
            }
            this.#innerStartInterval(new_timeout);
            this.#timeout = new_timeout;
        }
    }

    emitAll() {
        this.#emitUpdateDays(this.#diff_duration.days);
        this.#emitUpdateHours(this.#diff_duration.hours);
        this.#emitUpdateMinutes(this.#diff_duration.minutes);
        this.#emitUpdateSeconds(this.#diff_duration.seconds);
        this.#emitUpdateMilliseconds(this.#diff_duration.milliseconds);
        this.#emitUpdateTotalDays(this.#diff_duration.total_days);
    }

    pause() {
        if (this.interval_id !== null) {
            clearInterval(this.interval_id);
            this.interval_id = null
        }
    }

    play() {
        if (this.interval_id === null) {
            this.#innerStartInterval(this.#timeout)
        }
    }

    /** @param {number} timeout */
    start(timeout) {
        this.emitAll();
        this.#innerStartInterval(typeof timeout === "number" ? timeout : 500);
        this.#timeout = timeout;
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

class CountdownDisplay {
    /** @type {Countdown} */
    countdown;
    /** @type {DisplayState} */
    state;
    /** @type {CountdownElem} */
    elem;
    /** @type {number} */
    days_text_len

    /** @param {Date} datetime */
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
                    if (isOnPhone()) {
                        return CountdownState.Blocky;
                    } else {
                        return CountdownState.CompactNoMillis;
                    }
                }
            })(),
            Object.keys(CountdownState).length,
            "countdown_state",
        );
        this.elem = new CountdownElem();
        this.days_text_len = 0;
        this.is_first_update = true;
    }

    /** @returns {number} */
    #getTimeout() {
        switch (this.state.state) {
            case CountdownState.Compact:
                return 51;

            case CountdownState.CompactNoMillis:
            case CountdownState.Blocky:
                return 500;

            default:
                throw new Error("Invalid state");
        }
    }

    /**
     * @param {string} elem_id
     * @param {string} spacer_id
     **/
    #updateSpacer(elem_id, spacer_id) {
        const len =
            Math.max(this.days_text_len - (this.elem.get_elem_or_throw(elem_id).textContent?.length ?? 0), 0);
        this.elem.get_elem_or_throw(spacer_id).textContent =
            "0".repeat(len);
    }

    #updateAllSpacers() {
        this.#updateSpacer("countdown-hours", "hours-spacer");
        this.#updateSpacer("countdown-minutes", "minutes-spacer");
        this.#updateSpacer("countdown-seconds", "seconds-spacer");
    }

    /**
     * @param {string} elem_id
     * @param {string} spacer_id
     * @param {string} new_text
     **/
    #setBlockyText(elem_id, spacer_id, new_text) {
        const elem = this.elem.get_elem_or_throw(elem_id);
        const previous_spacer_len = Math.max(this.days_text_len - (elem.textContent?.length ?? 0), 0);
        elem.textContent = new_text;
        const new_spacer_len = Math.max(this.days_text_len - (elem.textContent?.length ?? 0), 0);

        if (new_spacer_len !== previous_spacer_len) {
            this.elem.get_elem_or_throw(spacer_id).textContent =
                "0".repeat(new_spacer_len);
        }
    }

    /** @param {CustomEvent} event */
    #updateMilliseconds(event) {
        switch (this.state.state) {
            case CountdownState.Compact:
                this.elem.get_elem_or_throw("countdown-milliseconds").textContent =
                    String(event.detail).padStart(3, "0",);
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
            case CountdownState.CompactNoMillis:
            case CountdownState.Compact:
                this.elem.get_elem_or_throw("countdown-seconds").textContent =
                    String(event.detail).padStart(2, "0",);
                break;

            case CountdownState.Blocky:
                this.#setBlockyText("countdown-seconds", "seconds-spacer", String(event.detail));
                break;

            default:
                throw new Error("Invalid state");
        }
    }

    /** @param {CustomEvent} event */
    #updateMinutes(event) {
        switch (this.state.state) {
            case CountdownState.CompactNoMillis:
            case CountdownState.Compact:
                this.elem.get_elem_or_throw("countdown-minutes").textContent =
                    String(event.detail).padStart(2, "0",);
                break;

            case CountdownState.Blocky:
                this.#setBlockyText("countdown-minutes", "minutes-spacer", String(event.detail));
                break;

            default:
                throw new Error("Invalid state");
        }
    }

    /** @param {CustomEvent} event */
    #updateHours(event) {
        switch (this.state.state) {
            case CountdownState.CompactNoMillis:
            case CountdownState.Compact:
                this.elem.get_elem_or_throw("countdown-hours").textContent =
                    String(event.detail).padStart(2, "0",);
                break;

            case CountdownState.Blocky:
                this.#setBlockyText("countdown-hours", "hours-spacer", String(event.detail));
                break;

            default:
                throw new Error("Invalid state");
        }
    }

    /** @param {CustomEvent} _event */
    #updateDays(_event) {
        switch (this.state.state) {
            case CountdownState.CompactNoMillis:
            case CountdownState.Compact:
                break;

            case CountdownState.Blocky:
                break;

            default:
                throw new Error("Invalid state");
        }
    }

    /** @param {CustomEvent} event */
    #updateTotalDays(event) {
        const days_elem = this.elem.get_elem_or_throw("countdown-days");
        const previous_len = days_elem.textContent?.length;
        switch (this.state.state) {
            case CountdownState.CompactNoMillis:
            case CountdownState.Compact:
            case CountdownState.Blocky:
                days_elem.textContent = String(event.detail);
                break;

            default:
                throw new Error("Invalid state");
        }
        const new_len = days_elem.textContent?.length;
        if (new_len !== previous_len) {
            this.days_text_len = new_len;
            // Only check days elem for a change in length, because the other elems
            // have the same length all the time. BUT, it could also be that all of
            // them have one digit, though that seems to happen too rarely to really
            // care about.
            this.#updateFontSize();
            if (this.state.state === CountdownState.Blocky) {
                this.#updateAllSpacers();
            }
        }
    }

    #updateDisplayDOM() {
        this.elem.cycle_to_state(this.state.state);
        if (this.countdown.interval_id !== null) {
            this.countdown.setIntervalTimeout(this.#getTimeout());
        }
    }

    /** This only works because we're using a mono-spaced font. */
    #updateFontSize() {
        let text_len = null;
        let text_num_lines = null;

        switch (this.state.state) {
            case CountdownState.CompactNoMillis:
            case CountdownState.Compact:
                text_len = String(this.elem.get_elem_or_throw("countdown").textContent).length;
                text_num_lines = 1;
                break;

            case CountdownState.Blocky:
                text_len =
                    // add one because of the label (i.e. D, H, M, S)
                    Math.max(
                        String(this.elem.get_elem_or_throw("countdown-days").textContent).length,
                        String(this.elem.get_elem_or_throw("countdown-hours").textContent).length,
                        String(this.elem.get_elem_or_throw("countdown-minutes").textContent).length,
                        String(this.elem.get_elem_or_throw("countdown-seconds").textContent).length,
                    ) + 1;
                text_num_lines = 4;
                break;

            default:
                throw new Error("Invalid state");
        }

        const font_size_vw = `${String((FONT_SIZE_VW_RATIO * COUNTDOWN_VW) / text_len)}vw`;
        const font_size_vh = `${String((FONT_SIZE_VH_RATIO * COUNTDOWN_VH) / text_num_lines)}vh`;
        const countdown_elem = this.elem.get_elem_or_throw("countdown");

        switch (this.state.state) {
            case CountdownState.CompactNoMillis:
            case CountdownState.Compact:
                countdown_elem.style.fontSize =
                    `clamp(1.5rem, min(${font_size_vw}, ${font_size_vh}), 8rem)`;
                break;

            case CountdownState.Blocky:
                countdown_elem.style.fontSize =
                    `clamp(1.5rem, min(${font_size_vw}, ${font_size_vh}), 11rem)`;
                break;

            default:
                throw new Error("Invalid state");
        }
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

    pause() {
        this.countdown.pause();
    }

    play() {
        this.countdown.play();
    }

    start() {
        this.#updateDisplayDOM();

        this.countdown.addEventListener("milliseconds", this.#updateMilliseconds.bind(this));
        this.countdown.addEventListener("seconds", this.#updateSeconds.bind(this));
        this.countdown.addEventListener("minutes", this.#updateMinutes.bind(this));
        this.countdown.addEventListener("hours", this.#updateHours.bind(this));
        this.countdown.addEventListener("days", this.#updateDays.bind(this));
        this.countdown.addEventListener("totaldays", this.#updateTotalDays.bind(this));
        this.countdown.start(this.#getTimeout());

        this.#updateFontSize();
    }
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
            Number(localStorage.getItem("datetime_state")) || DatetimeState.LocalTimezone,
            Object.keys(DatetimeState).length,
            "datetime_state",
        );

        const elem = document.getElementById("datetime");
        if (elem === null) {
            throw new Error("No element with id=\"datetime\"");
        }
        this.elem = elem;
    }

    #updateDisplayDOM() {
        // No need to update font size because it only changes length at year
        // 10000
        switch (this.state.state) {
            case DatetimeState.Utc:
                this.elem.textContent = this.datetime.toUTCString();
                break;

            case DatetimeState.Iso8601:
                this.elem.textContent = this.datetime.toISOString();
                break;

            case DatetimeState.LocalTimezone: {
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
            }

            default:
                throw new Error("Invalid state");
        }
    }

    /** This only works because we're using a mono-spaced font. */
    #updateFontSize() {
        const text_len = String(this.elem.textContent).length;
        const font_size_vw = `${String((FONT_SIZE_VW_RATIO * DATETIME_VW) / text_len)}vw`;

        this.elem.style.fontSize = `clamp(0.9rem, ${font_size_vw}, 2rem)`;
    }

    /** @param {Date} new_datetime */
    updateDatetime(new_datetime) {
        this.datetime = new_datetime;
        this.#updateDisplayDOM();
    }

    cycleState() {
        this.state.cycleState();
        this.#updateDisplayDOM();
        this.#updateFontSize();
    }

    init() {
        this.#updateDisplayDOM();
        this.#updateFontSize();
    }
}

class CustomWebSocket {
    /** @type {WebSocket} */
    #websocket;
    /** @type {number | null} */
    #disconnect_timeout_id;
    /** @type {string} */
    url

    /** @param {string} url */
    constructor(url) {
        this.url = url;
        this.#disconnect_timeout_id = null;
        this.connect();
    }

    connect() {
        if (this.isOpen()) {
            return;
        }
        this.#websocket = new WebSocket(this.url);
        this.#websocket.binaryType = "arraybuffer";

        this.#websocket.addEventListener("open", this.#onOpen.bind(this));
        this.#websocket.addEventListener("message", this.#onMessage.bind(this));
        this.#websocket.addEventListener("close", this.#onClose.bind(this));
        this.#websocket.addEventListener("error", this.#onError.bind(this));
    }

    /** @param {Event} _event */
    #onOpen(_event) {
        const refresh_button_elem = document.getElementById("refresh");
        if (refresh_button_elem === null) {
            return;
        }
        /** @type {HTMLButtonElement} */(refresh_button_elem).disabled = false;
    }

    /** @param {MessageEvent<any>} event */
    #onMessage(event) {
        const msg = new DataView(event.data).getBigInt64(0, false);

        if (msg > Number.MAX_SAFE_INTEGER) {
            throw new Error(`Timestamp exceeds 'Number.MAX_SAFE_INTEGER': ${msg}`)
        } else if (msg < Number.MIN_SAFE_INTEGER) {
            throw new Error(`Timestamp exceeds 'Number.MIN_SAFE_INTEGER': ${msg}`)
        }

        const msg_as_number = Number(msg);

        if (Number.isNaN(msg_as_number)) {
            throw Error("Unexpected WebSocket message recieved");
        } else if (msg_as_number < 0) {
            user_count = msg_as_number * -1;
            const user_count_elem = document.getElementById("user-count");
            if (user_count_elem !== null) {
                user_count_elem.textContent = String(user_count);
            }
        } else {
            datetime = new Date(msg_as_number * 1000);
            datetime_display.updateDatetime(datetime);
            countdown_display.updateDatetimeTarget(datetime);
        }
    }

    /** @param {CloseEvent} _event */
    #onClose(_event) {
        this.#websocket.removeEventListener("message", this.#onMessage);
        this.#websocket.removeEventListener("open", this.#onOpen);
        this.#websocket.removeEventListener("close", this.#onClose);
        this.#websocket.removeEventListener("error", this.#onError);
    }

    // TODO: Add popup notif to inform that websocket had error
    /** @param {Event} _event */
    #onError(_event) {
        this.disconnect();
        console.log("Error connecting to websocket. Reconnecting in 2 seconds.");
        setTimeout(this.connect.bind(this), 2000);

        const refresh_button_elem = document.getElementById("refresh");

        if (refresh_button_elem === null) {
            return;
        }
        /** @type {HTMLButtonElement} */(refresh_button_elem).disabled = true;
    }

    disconnect() {
        if (!this.isOpen()) {
            return;
        }
        // Cleanup event listeners on this.#onClose()
        this.#websocket.close();
    }

    /** @param {number} milliseconds */
    delayedDisconnect(milliseconds) {
        if (this.#disconnect_timeout_id !== null) {
            clearTimeout(this.#disconnect_timeout_id);
        }
        this.#disconnect_timeout_id = setTimeout(() => {
            this.disconnect();

            // Reset timer if it's still going on
            if (this.#disconnect_timeout_id !== null) {
                clearTimeout(this.#disconnect_timeout_id);
            }
            this.#disconnect_timeout_id = null;
        }, milliseconds);
    }

    reconnect() {
        if (this.#disconnect_timeout_id !== null) {
            // Cancel disconnecting
            clearTimeout(this.#disconnect_timeout_id);
            return;
        }
        this.connect();
    }

    incrementDatetime() {
        this.#websocket?.send(new Int8Array(0));
    }

    /** @returns {boolean} */
    isOpen() {
        return this.#websocket?.readyState === WebSocket.OPEN;
    }
}

class RefreshButton {
    /** @type {HTMLElement} */
    elem;
    /** @type {SVGElement} */
    svg_elem;
    /** @type {number} */
    rotation;
    /** @type {number | null} */
    #reset_timeout_id;

    /**
     * @param {HTMLElement} elem
     * @param {SVGElement} svg_elem
     */
    constructor(elem, svg_elem) {
        this.elem = elem;
        this.svg_elem = svg_elem;
        this.rotation = 0;
    }

    #onClick() {
        if (websocket.isOpen()) {
            websocket.incrementDatetime();
            this.#animateClickRotation();
            /** @type {HTMLButtonElement} */(this.elem).disabled = false;
        } else {
            websocket.connect();
            // /** @type {HTMLButtonElement} */(this.elem).disabled = true;
        }
        // TODO: disable button & make it red if websocket is closed
    }

    #animateClickRotation() {
        // This allows us to continue from the current rotation when it's in
        // the middle of animating back to 0 rotation.
        if (this.rotation === 0) {
            const rotation_deg = Number(
                window.getComputedStyle(this.svg_elem).rotate.slice(0, -3)
            ) || 0;
            if (rotation_deg !== 0) {
                this.rotation = rotation_deg * Math.PI / 180;
            }
        }

        // 55deg = 0.9599310885968813rad
        this.rotation = Math.max(0, this.rotation + 0.9599310885968813);

        const keyframe = rotationKeyframe(this.rotation);
        const keyframe_timing = {
            duration: REFRESH_BUTTON_TIMEOUT_DURATION,
            easing: "linear(0, 0.679 18%, 0.895 27.6%, 1.037 37.8%, 1.104 47.4%, 1.12 58%, 1)",
            fill: /** @type {FillMode} */ ("forwards"),
        }
        this.svg_elem.animate(keyframe, keyframe_timing);

        if (this.#reset_timeout_id !== null) {
            clearTimeout(this.#reset_timeout_id)
        }
        this.#reset_timeout_id = setInterval(this.#resetRotation.bind(this), REFRESH_BUTTON_TIMEOUT_DURATION);
    }

    #resetRotation() {
        if (this.rotation === 0) {
            return;
        }
        const duration = Math.ceil(Math.pow(this.rotation, 0.75) * 100 + 50);

        this.rotation = 0;
        const keyframe = rotationKeyframe(0);
        const keyframe_timing = {
            duration,
            easing: "cubic-bezier(.9,-0.01,.42,1.58)",
            fill: /** @type {FillMode} */ ("forwards"),
        }
        this.svg_elem.animate(keyframe, keyframe_timing);

        if (this.#reset_timeout_id === null) {
            throw Error("timeout id is null");
        }
        clearTimeout(this.#reset_timeout_id);
        this.#reset_timeout_id = null;
    }

    build() {
        this.elem.addEventListener("click", this.#onClick.bind(this));

        // Prevent 'Enter' key from repeatedly pressing button when held down
        this.elem.addEventListener("keyup", (event) => {
            if (event.key === "Enter") {
                this.#onClick();
            }
        })
        this.elem.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
            }
        })
    }
}

/**
 * @param {number} rad
 * @returns {[{rotate: string}]}
 */
function rotationKeyframe(rad) {
    return [{ rotate: `${rad}rad` }];
}

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
            websocket.disconnect();
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

// main
document.addEventListener("DOMContentLoaded", (_event) => {
    // theme
    let theme = localStorage.getItem("theme");
    if (theme === null) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ?
            "dark" : "light";
    }
    setTheme(theme);

    const theme_toggle_button_elem = document.getElementById("theme-toggle");
    if (theme_toggle_button_elem === null) {
        throw new Error("No theme toggle button with id=\"theme-toggle\"")
    }

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
    const navbar_toggle_button_elem = document.getElementById("navbar-toggle-button");
    if (navbar_toggle_button_elem === null) {
        throw new Error("No navbar toggle button with id=\"navbar-toggle-button\"")
    }

    let is_navbar_open = !isOnPhone();
    navbar_toggle_button_elem.ariaExpanded = is_navbar_open.toString();

    navbar_toggle_button_elem.addEventListener("click", () => {
        is_navbar_open = !is_navbar_open;
        navbar_toggle_button_elem.ariaExpanded = is_navbar_open.toString();
    })

    // info modal
    const info_button_elem = document.getElementById("info-button");
    if (info_button_elem === null) {
        throw new Error("No info button with id=\"info-button\"")
    }

    const info_modal_elem = /** @type {HTMLDialogElement | null} */(document.getElementById("info-modal"));
    if (info_modal_elem === null) {
        throw new Error("No info modal with id=\"info-modal\"")
    }

    const info_modal_close_button_elem = (document.getElementById("info-modal-close-button"));
    if (info_modal_close_button_elem === null) {
        throw new Error("No info modal close button found with id=\"info-modal-close-button\"")
    }

    info_button_elem.addEventListener("click", () => {
        info_modal_elem.showModal();
    })

    info_modal_close_button_elem.addEventListener("click", () => {
        info_modal_elem.close();
    })


    // countdown
    const datetime_elem = document.getElementById("datetime");

    if (datetime_elem === null) {
        throw new Error("No element with id=\"datetime\"");
    }

    const datetime = new Date(Number(datetime_elem.textContent) * 1000);
    datetime_display = new DatetimeDisplay(datetime)
    countdown_display = new CountdownDisplay(datetime);

    datetime_display.init();
    countdown_display.start();

    const refresh_button_elem = document.getElementById("refresh");
    if (refresh_button_elem === null) {
        throw new Error("No element with id=\"refresh\"");
    }

    const refresh_svg_elem = /** @type {SVGElement} */(document.querySelector("#refresh>svg"));
    if (refresh_svg_elem === null) {
        throw new Error("No svg element inside id=\"refresh\"");
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
