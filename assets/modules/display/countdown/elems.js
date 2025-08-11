// @ts-check
"use strict";

import { assertTagName, unwrapSome } from '../../utils/assert';
import { CountdownState } from './state';

/**
 * @typedef CountdownElemIdNameMap
 * @property {HTMLButtonElement} container
 * @property {HTMLSpanElement} countdown-days
 * @property {HTMLSpanElement} countdown-hours
 * @property {HTMLSpanElement} countdown-minutes
 * @property {HTMLSpanElement} countdown-seconds
 * @property {HTMLSpanElement} countdown-milliseconds
 * @property {HTMLSpanElement} days-label
 * @property {HTMLSpanElement} hours-label
 * @property {HTMLSpanElement} minutes-label
 * @property {HTMLSpanElement} seconds-label
 * @property {HTMLSpanElement} hours-spacer
 * @property {HTMLSpanElement} minutes-spacer
 * @property {HTMLSpanElement} seconds-spacer
 * @property {HTMLDivElement} hours-container
 * @property {HTMLDivElement} minutes-container
 * @property {HTMLDivElement} seconds-container
 */

export const countdownElems = {
    /**
     * @template {keyof CountdownElemIdNameMap} K
     * @param {K} id
     * @throws {Error}
     * @returns {CountdownElemIdNameMap[K] | null}
     */
    tryGet: function(id) {
        switch (id) {
            case "container":
                // @ts-ignore
                return assertTagName(document.getElementById("countdown"), "button");
            case "countdown-days":
            case "countdown-hours":
            case "countdown-minutes":
            case "countdown-seconds":
            case "countdown-milliseconds":
            case "days-label":
            case "hours-label":
            case "minutes-label":
            case "seconds-label":
            case "hours-spacer":
            case "minutes-spacer":
            case "seconds-spacer":
                // @ts-ignore
                return assertTagName(document.getElementById(id), "span");
            case "hours-container":
            case "minutes-container":
            case "seconds-container":
                // @ts-ignore
                return assertTagName(document.getElementById(id), "div");
            default:
                throw new Error("invalid id");
        }
    },

    /**
     * @template {keyof CountdownElemIdNameMap} K
     * @param {K} id
     * @throws {Error}
     * @returns {CountdownElemIdNameMap[K]}
     */
    get: function(id) {
        return unwrapSome(this.tryGet(id));
    },

    /**
     * @param {number} state
     * @throws {Error}
     * @returns {void}
     **/
    switchState: function(state) {
        const container = this.get("container");
        switch (state) {
            case CountdownState.CompactNoMillis: {
                container.classList.replace("blocky", "inline")
                container.innerHTML = `
                    <span id="countdown-days"></span
                    ><span id="days-label">:</span
                    ><span id="countdown-hours"></span
                    ><span id="hours-label">:</span
                    ><span id="countdown-minutes"></span
                    ><span id="minutes-label">:</span
                    ><span id="countdown-seconds"></span>
                `;
                break;
            }
            case CountdownState.Compact: {
                container.classList.replace("blocky", "inline")
                container.innerHTML = `
                    <span id="countdown-days"></span
                    ><span id="days-label">:</span
                    ><span id="countdown-hours"></span
                    ><span id="hours-label">:</span
                    ><span id="countdown-minutes"></span
                    ><span id="minutes-label">:</span
                    ><span id="countdown-seconds"></span
                    ><span id="seconds-label">.</span
                    ><span id="countdown-milliseconds"></span>
                `;
                break;
            }
            case CountdownState.Blocky: {
                container.classList.replace("inline", "blocky")
                container.innerHTML = `
                    <span id="countdown-days"></span
                    ><span id="days-label">D</span
                    ><div id="hours-container"
                        ><span id="hours-spacer" class="spacer" ariaHidden="true"></span
                        ><span id="countdown-hours"></span
                    ></div
                    ><span id="hours-label">H</span
                    ><div id="minutes-container"
                        ><span id="minutes-spacer" class="spacer" ariaHidden="true"></span
                        ><span id="countdown-minutes"></span
                    ></div
                    ><span id="minutes-label">M</span
                    ><div id="seconds-container"
                        ><span id="seconds-spacer" class="spacer" ariaHidden="true"></span
                        ><span id="countdown-seconds"></span
                    ></div
                    ><span id="seconds-label">S</span>
                `;
                break;
            }
            default:
                throw new Error("invalid state")
        }
    }
}
