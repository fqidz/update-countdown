// @ts-check
"use strict";

import { FONT_SIZE_VW_RATIO } from "../index";
import { DisplayState } from "../index";
import { DatetimeState } from "./state";

// Hardcode these here instead of setting it in css, because it's not accurate
// when "extracting" it from the css
const DISPLAY_VW = 35;

export class DatetimeDisplay {
    /** @type {Date} */
    datetime;
    /** @type {DisplayState} */
    state;
    /** @type {HTMLElement} */
    elem;

    /** @param {Date} datetime */
    constructor(datetime) {
        this.datetime = datetime;
        this.state = new DisplayState(
            Number(localStorage.getItem("datetime_state")) ||
                DatetimeState.LocalTimezone,
            Object.keys(DatetimeState).length,
            "datetime_state",
        );

        const elem = document.getElementById("datetime");
        if (elem === null) {
            throw new Error('No element with id="datetime"');
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
                const date_split = date.split(" ");
                const week_day = date_split[0];
                const month_name = date_split[1];
                const day = date_split[2];
                const year = date_split[3];

                const time = this.datetime.toTimeString();
                const parenthesis_index = time.indexOf("(");
                const time_without_timezone_name = time.slice(
                    0,
                    parenthesis_index - 1,
                );

                this.elem.textContent =
                    week_day +
                    ", " +
                    day +
                    " " +
                    month_name +
                    " " +
                    year +
                    " " +
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
        const font_size_vw = `${String((FONT_SIZE_VW_RATIO * DISPLAY_VW) / text_len)}vw`;

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
