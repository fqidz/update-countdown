// @ts-check
"use strict";

/** @import { UnitDuration } from '../../datetime/index.mjs' */
import {
    TimeUnits,
    formatUnitDuration,
    MINUTES_PER_UNIT,
} from "../../datetime/timeunit";
import { UserStatisticState } from "./state";
import { DisplayState } from "../index";
import { userStatisticElems } from "./elems";

const MINUTES_PER_CLICK = 30;

export class UserStatistic {
    /** @type {DisplayState} */
    #state;
    /** @type {number} */
    #click_count;

    constructor() {
        this.#state = new DisplayState(
            Number(localStorage.getItem("user-statistic-state")) ||
                UserStatisticState.AddedDuration,
            Object.keys(UserStatisticState).length,
            "user-statistic-state",
        );
        this.#click_count =
            Number(localStorage.getItem("battlebit-click-count")) || 0;
    }

    /**
     * @param {number} minutes
     * @returns {UnitDuration[]}
     **/
    #calculateDuration(minutes) {
        const time_units_length = Object.keys(TimeUnits).length;
        const duration = [];

        let remaining_minutes = minutes;

        for (let i = time_units_length - 1; i >= 0; i--) {
            const minutes_per_unit = MINUTES_PER_UNIT[i];
            if (remaining_minutes > minutes_per_unit) {
                duration.push({
                    value: remaining_minutes / minutes_per_unit,
                    time_unit: i,
                });
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
        const random_minutes = Math.random() * 10 + 25;
        if (this.#click_count === 0) {
            return 0;
        } else {
            return (this.#click_count - 1) * MINUTES_PER_CLICK + random_minutes;
        }
    }

    cycleState() {
        this.#state.cycleState();
        userStatisticElems.switchState(this.#state.state);
        this.#updateDisplayDOM();
    }

    incrementClickCount() {
        this.#click_count++;
        localStorage.setItem(
            "battlebit-click-count",
            String(this.#click_count),
        );
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
                return userStatisticElems.get("statistic-year");
            case TimeUnits.Month:
                return userStatisticElems.get("statistic-month");
            case TimeUnits.Week:
                return userStatisticElems.get("statistic-week");
            case TimeUnits.Day:
                return userStatisticElems.get("statistic-day");
            case TimeUnits.Hour:
                return userStatisticElems.get("statistic-hour");
            case TimeUnits.Minute:
                return userStatisticElems.get("statistic-minute");
            default:
                throw new Error("invalid timeunit");
        }
    }

    #updateDisplayDOM() {
        switch (this.#state.state) {
            case UserStatisticState.AddedDuration: {
                const added_duration = this.#calculateDuration(
                    this.#getAddedMinutes(),
                );
                let greatest_present_unit = 0;
                const absent_units = Array.from(
                    Array(Object.keys(TimeUnits).length).keys(),
                );

                for (let i = 0; i < added_duration.length; i++) {
                    const unit_duration = added_duration[i];
                    /** @type {HTMLSpanElement} */
                    if (unit_duration.time_unit > greatest_present_unit) {
                        greatest_present_unit = unit_duration.time_unit;
                    }
                    const elem = this.#getTimeUnitAsElem(
                        unit_duration.time_unit,
                    );
                    const text = formatUnitDuration(
                        unit_duration.time_unit,
                        Math.floor(unit_duration.value),
                    );
                    if (elem.textContent !== text) {
                        elem.textContent = text;
                    }
                    elem.className = "";
                    absent_units.splice(
                        absent_units.indexOf(unit_duration.time_unit),
                        1,
                    );
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
                    elem.className = "very-dim-fg-color ";
                }

                const time_units_length = Object.keys(TimeUnits).length;

                // 'display: none' for all elements greater than the greatest
                // present unit. e.g. greatest present unit is
                // `TimeUnits.Week`, so year and month would be hidden.
                for (
                    let time_unit = Math.min(
                        time_units_length - 1,
                        greatest_present_unit + 1,
                    );
                    time_unit < time_units_length;
                    time_unit++
                ) {
                    const elem = this.#getTimeUnitAsElem(time_unit);
                    elem.className = "hidden";
                    elem.textContent = "";
                }
                break;
            }
            case UserStatisticState.ClickCount: {
                userStatisticElems.get("statistic-click").textContent = String(
                    this.#click_count,
                );
                break;
            }

            default:
                throw new Error("Invalid state");
        }
    }

    build() {
        userStatisticElems.switchState(this.#state.state);
        this.#updateDisplayDOM();
        userStatisticElems
            .get("container")
            .addEventListener("click", (_event) => {
                this.cycleState();
            });
    }
}
