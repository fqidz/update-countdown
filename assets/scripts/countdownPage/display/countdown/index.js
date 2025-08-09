// @ts-check
"use strict";

/** @import { Duration } from '../../datetime/index.mjs' */
import { FONT_SIZE_VH_RATIO, FONT_SIZE_VW_RATIO } from "../index";
import { CountdownElem } from './elems.js'
import { CountdownState } from './state'
import { DisplayState } from '../index'
import { getDuration } from '../../datetime/duration'

// Hardcode these here instead of setting it in css, because it's not accurate
// when "extracting" it from the css
const DISPLAY_VW = 80;
const DISPLAY_VH = 50;

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

export class CountdownDisplay {
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

        const font_size_vw = `${String((FONT_SIZE_VW_RATIO * DISPLAY_VW) / text_len)}vw`;
        const font_size_vh = `${String((FONT_SIZE_VH_RATIO * DISPLAY_VH) / text_num_lines)}vh`;
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
