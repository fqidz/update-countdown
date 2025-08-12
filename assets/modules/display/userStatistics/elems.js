// @ts-check
"use strict";

import { assertTagName, unwrapSome } from "../../utils/assert";
import { UserStatisticState } from "./state";

/**
 * @typedef UserStatisticElemIdNameMap
 * @property {HTMLButtonElement} container
 * @property {HTMLSpanElement} statistic-year
 * @property {HTMLSpanElement} statistic-month
 * @property {HTMLSpanElement} statistic-week
 * @property {HTMLSpanElement} statistic-day
 * @property {HTMLSpanElement} statistic-hour
 * @property {HTMLSpanElement} statistic-minute
 * @property {HTMLSpanElement} statistic-click
 */

export const userStatisticElems = {
    /**
     * @template {keyof UserStatisticElemIdNameMap} K
     * @param {K} id
     * @throws {Error}
     * @returns {UserStatisticElemIdNameMap[K] | null}
     */
    tryGet: (id) => {
        switch (id) {
            case "container":
                // @ts-ignore
                return assertTagName(
                    document.getElementById("user-statistic"),
                    "button",
                );
            case "statistic-year":
            case "statistic-month":
            case "statistic-week":
            case "statistic-day":
            case "statistic-hour":
            case "statistic-minute":
            case "statistic-click":
                // @ts-ignore
                return assertTagName(document.getElementById(id), "span");
            default:
                throw new Error("invalid id");
        }
    },

    /**
     * @template {keyof UserStatisticElemIdNameMap} K
     * @param {K} id
     * @throws {Error}
     * @returns {UserStatisticElemIdNameMap[K]}
     */
    get: function (id) {
        return unwrapSome(this.tryGet(id));
    },

    /**
     * @param {number} state
     * @throws {Error}
     * @returns {void}
     **/
    switchState: function (state) {
        const container = this.get("container");
        switch (state) {
            case UserStatisticState.AddedDuration: {
                container.title = "Added duration";
                container.innerHTML = `
                    <span id="statistic-year" class="hidden">0Y</span
                    ><span id="statistic-month" class="hidden">0M</span
                    ><span id="statistic-week" class="hidden">0w</span
                    ><span id="statistic-day" class="hidden">0d</span
                    ><span id="statistic-hour" class="hidden">0h</span
                    ><span id="statistic-minute">0m</span>
                `;
                break;
            }
            case UserStatisticState.ClickCount: {
                container.title = "Refresh click count";
                container.innerHTML = `<span id="statistic-click"></span>`;
                break;
            }
            default:
                throw new Error("invalid state");
        }
    },
};
