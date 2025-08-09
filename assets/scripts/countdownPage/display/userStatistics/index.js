// @ts-check
"use strict";

/** @import { UserStatisticElems } from './types.mjs' */
/** @import { UnitDuration } from '../../datetime/index.mjs' */
import { TimeUnits, formatUnitDuration, MINUTES_PER_UNIT } from '../../datetime/timeunit';
import { unwrapSome } from '../../../utils/assert';
import { UserStatisticState } from './state'
import { DisplayState } from '../index'

const MINUTES_PER_CLICK = 30;

export class UserStatistic {
    /** @type {DisplayState} */
    #state;
    /** @type {number} */
    #click_count;
    /** @type {UserStatisticElems} */
    #elems;

    /** @param {UserStatisticElems} elems*/
    constructor(elems) {
        this.#state = new DisplayState(
            Number(localStorage.getItem("user-statistic-state")) || UserStatisticState.AddedDuration,
            Object.keys(UserStatisticState).length,
            "user-statistic-state"
        );
        this.#click_count = Number(localStorage.getItem("battlebit-click-count")) || 0;
        this.#elems = elems;
    }

    /**
     * @param {number} minutes
     * @returns {UnitDuration[]}
     **/
    #calculateDuration(minutes) {
        const time_units_length = Object.keys(TimeUnits).length;
        let duration = [];

        let remaining_minutes = minutes;

        for (let i = time_units_length - 1; i >= 0; i--) {
            const minutes_per_unit = MINUTES_PER_UNIT[i];
            if (remaining_minutes > minutes_per_unit) {
                duration.push({ value: remaining_minutes / minutes_per_unit, time_unit: i });
                remaining_minutes = remaining_minutes % minutes_per_unit;
            }
        }

        return duration;
    }

    /**
     * Although each click randomly adds 25-35 minutes to the datetime, it
     * eventually converges to 30 minutes per click because we know it's
     * uniformly distributed
     *
     * @returns {number}
     **/
    #getAddedMinutes() {
        // Add 25-35 minutes at the end to fake some randomness
        const random_minutes = (Math.random() * 10) + 25;
        return ((this.#click_count - 1) * MINUTES_PER_CLICK) + random_minutes;
    }

    /**
     * @param {string} id
     * @returns {HTMLSpanElement}
     **/
    #createAndAppendStatisticElement(id) {
        const elem = document.createElement("span");
        elem.id = id;
        this.#elems.container.appendChild(elem);
        return elem;
    }

    #tryCreateDurationElems() {
        this.#elems.year = this.#elems.year ?? this.#createAndAppendStatisticElement("statistic-year");
        this.#elems.month = this.#elems.month ?? this.#createAndAppendStatisticElement("statistic-month");
        this.#elems.week = this.#elems.week ?? this.#createAndAppendStatisticElement("statistic-week");
        this.#elems.day = this.#elems.day ?? this.#createAndAppendStatisticElement("statistic-day");
        this.#elems.hour = this.#elems.hour ?? this.#createAndAppendStatisticElement("statistic-hour");
        this.#elems.minute = this.#elems.minute ?? this.#createAndAppendStatisticElement("statistic-minute");
    }

    #createDisplayElems() {
        switch (this.#state.state) {
            case UserStatisticState.AddedDuration: {
                this.#elems.click?.remove();
                this.#elems.click = null;
                this.#tryCreateDurationElems();
                break;
            }
            case UserStatisticState.ClickCount: {
                const click_count_elem = document.createElement("span");
                click_count_elem.id = "statistic-click";
                click_count_elem.className = "dim-fg-color";
                this.#elems.container.replaceChildren(click_count_elem);

                this.#elems.year = null;
                this.#elems.month = null;
                this.#elems.week = null;
                this.#elems.day = null;
                this.#elems.hour = null;
                this.#elems.minute = null;

                this.#elems.click = click_count_elem;
                break;
            }
            default:
                throw new Error("Invalid state");
        }
    }

    cycleState() {
        this.#state.cycleState();
        this.#createDisplayElems();
        this.#updateDisplayDOM();
    }

    incrementClickCount() {
        this.#click_count++;
        localStorage.setItem("battlebit-click-count", String(this.#click_count));
        this.#updateDisplayDOM();
    }

    /**
     * @param {number} time_unit
     * @throws {Error}
     * @returns {HTMLSpanElement}
     **/
    #getTimeUnitAsElem(time_unit) {
        switch (time_unit) {
            case TimeUnits.Year:
                return unwrapSome(this.#elems.year);
            case TimeUnits.Month:
                return unwrapSome(this.#elems.month);
            case TimeUnits.Week:
                return unwrapSome(this.#elems.week);
            case TimeUnits.Day:
                return unwrapSome(this.#elems.day);
            case TimeUnits.Hour:
                return unwrapSome(this.#elems.hour);
            case TimeUnits.Minute:
                return unwrapSome(this.#elems.minute);
            default:
                throw new Error("invalid timeunit")
        }
    }

    #updateDisplayDOM() {
        switch (this.#state.state) {
            case UserStatisticState.AddedDuration: {
                const added_duration = this.#calculateDuration(this.#getAddedMinutes());
                let greatest_present_unit = 0;
                const absent_units = Array.from(Array(Object.keys(TimeUnits).length).keys());

                for (let i = 0; i < added_duration.length; i++) {
                    const unit_duration = added_duration[i];
                    /** @type {HTMLSpanElement} */
                    if (unit_duration.time_unit > greatest_present_unit) {
                        greatest_present_unit = unit_duration.time_unit;
                    }
                    const elem = this.#getTimeUnitAsElem(unit_duration.time_unit);
                    const text = formatUnitDuration(unit_duration.time_unit, Math.floor(unit_duration.value));
                    if (elem.textContent !== text) {
                        elem.textContent = text;
                    }
                    elem.style.display = "block";
                    elem.className = "dim-fg-color";
                    absent_units.splice(absent_units.indexOf(unit_duration.time_unit), 1);
                }

                // Set absent units to be a darker color instead of putting
                // `display: none` so that they don't cause a DOM reflow & make it
                // hard to watch the number. e.g. added duration of '3w 4d 20m' results in display of '3w 4d 00h 20m'
                for (let i = 0; i < absent_units.length; i++) {
                    const absent_time_unit = absent_units[i];
                    const elem = this.#getTimeUnitAsElem(absent_time_unit);
                    const text = formatUnitDuration(absent_time_unit, 0);
                    if (elem.textContent !== text) {
                        elem.textContent = text;
                    }
                    elem.style.display = "block";
                    elem.className = "very-dim-fg-color ";
                }

                const time_units_length = Object.keys(TimeUnits).length;

                // 'display: none' for all elements greater than the greatest
                // present unit. e.g. greatest present unit is
                // `TimeUnits.Week`, so year and month would be hidden.
                for (let time_unit = Math.min(time_units_length - 1, greatest_present_unit + 1); time_unit < time_units_length ; time_unit++) {
                    let elem = this.#getTimeUnitAsElem(time_unit);
                    elem.style.display = "none";
                    elem.textContent = "";
                }
                break;
            }
            case UserStatisticState.ClickCount: {
                const click_count_elem = unwrapSome(this.#elems.click);
                click_count_elem.textContent = String(this.#click_count);
                break;
            }

            default:
                throw new Error("Invalid state");
        }
    }

    build() {
        this.#createDisplayElems();
        this.#updateDisplayDOM();
        this.#elems.container.addEventListener("click", (_event) => {
            this.cycleState();
        });
    }
}

