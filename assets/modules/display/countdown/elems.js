// @ts-check
"use strict";

import { assertElementExists, assertTagName, unwrapSome } from '../../utils/assert';
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

// class State {
//     constructor() { }
//     /**
//      * Creates & adds the necessary elements to the DOM
//      * @returns {void}
//      */
//     #build() {
//         throw new Error("not implemented");
//     }
//
//     /**
//      * Returns the display into its original state
//      * @returns {void}
//      */
//     #cleanup() {
//         throw new Error("not implemented");
//     }
//
//     /** @param {State} state */
//     toState(state) {
//         this.#cleanup();
//         state.#build();
//         return state;
//     }
// }
//
// export class StateCompactNoMillis extends State {
//     constructor() { super() }
//     #build() {
//         CountdownElems.get("container").classList.add("inline");
//     }
//
//     #cleanup() {
//         CountdownElems.get("container").classList.remove("inline");
//     }
// }
//
// export class StateCompactMillis extends State {
//     constructor() { super() }
//     #build() {
//         const container = CountdownElems.get("container");
//         container.classList.add("inline");
//
//         container.append(CountdownElems.create("seconds-label"));
//
//         CountdownElems.get("days-label").textContent = 'D';
//         CountdownElems.get("hours-label").textContent = 'H';
//         CountdownElems.get("minutes-label").textContent = 'M';
//         CountdownElems.get("seconds-label").textContent = 'S';
//     }
//
//     #cleanup() {
//         const container = CountdownElems.get("container");
//         container.classList.remove("inline")
//
//         CountdownElems.remove("seconds-label");
//     }
// }
//
// export class StateBlocky extends State {
//     constructor() { super() }
//     #build() {
//         const container = CountdownElems.get("container");
//         container.classList.add("blocky");
//         container.role = null;
//
//         const hours_container = CountdownElems.create("hours-container");
//         const minutes_container = CountdownElems.create("minutes-container");
//         const seconds_container = CountdownElems.create("seconds-container");
//         CountdownElems.get("countdown-hours").replaceWith(hours_container);
//         CountdownElems.get("countdown-minutes").replaceWith(minutes_container);
//         CountdownElems.get("countdown-seconds").replaceWith(seconds_container);
//
//         hours_container.append(
//             CountdownElems.create("hours-spacer"),
//             CountdownElems.create("countdown-hours")
//         );
//         minutes_container.append(
//             CountdownElems.create("minutes-spacer"),
//             CountdownElems.create("countdown-minutes")
//         );
//         seconds_container.append(
//             CountdownElems.create("seconds-spacer"),
//             CountdownElems.create("countdown-seconds")
//         );
//
//         container.append(CountdownElems.create("seconds-label"));
//
//         CountdownElems.get("days-label").textContent = 'D';
//         CountdownElems.get("hours-label").textContent = 'H';
//         CountdownElems.get("minutes-label").textContent = 'M';
//         CountdownElems.get("seconds-label").textContent = 'S';
//     }
//
//     #cleanup() {
//         const container = CountdownElems.get("container");
//         container.classList.remove("blocky")
//         container.role = "time";
//         CountdownElems.get("hours-container").replaceWith(CountdownElems.get("countdown-hours"));
//         CountdownElems.get("minutes-container").replaceWith(CountdownElems.get("countdown-minutes"));
//         CountdownElems.get("seconds-container").replaceWith(CountdownElems.get("countdown-seconds"));
//
//         CountdownElems.get("days-label").textContent = ':';
//         CountdownElems.get("hours-label").textContent = ':';
//         CountdownElems.get("minutes-label").textContent = ':';
//
//         CountdownElems.remove("seconds-label");
//     }
// }

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

    // /**
    //  * @template {keyof CountdownElemIdNameMap} K
    //  * @param {K} id
    //  * @throws {Error}
    //  * @returns {void}
    //  */
    // remove: function(id) {
    //     switch (id) {
    //         case "container":
    //         case "countdown-days":
    //         case "countdown-hours":
    //         case "countdown-minutes":
    //         case "countdown-seconds":
    //         case "countdown-milliseconds":
    //         case "days-label":
    //         case "hours-label":
    //         case "minutes-label":
    //         case "seconds-label":
    //         case "hours-spacer":
    //         case "minutes-spacer":
    //         case "seconds-spacer":
    //         case "hours-container":
    //         case "minutes-container":
    //         case "seconds-container":
    //             this.tryGet(id)?.remove();
    //         default:
    //             throw new Error("invalid id");
    //     }
    // },
    // /**
    //  * @template {keyof CountdownElemIdNameMap} K
    //  * @param {K} id
    //  * @throws {Error}
    //  * @returns {CountdownElemIdNameMap[K]}
    //  */
    // create: function(id) {
    //     /** @type {HTMLElement} */
    //     let elem;
    //
    //     switch (id) {
    //         case "container":
    //             throw new Error("not allowed to create root container");
    //         case "countdown-days":
    //         case "countdown-hours":
    //         case "countdown-minutes":
    //         case "countdown-seconds":
    //         case "countdown-milliseconds":
    //         case "days-label":
    //         case "hours-label":
    //         case "minutes-label":
    //         case "seconds-label":
    //         case "hours-spacer":
    //         case "minutes-spacer":
    //         case "seconds-spacer":
    //             elem = document.createElement("span");
    //             break;
    //         case "hours-container":
    //         case "minutes-container":
    //         case "seconds-container":
    //             elem = document.createElement("div");
    //             elem.className = "spacer";
    //             elem.ariaHidden = "true";
    //             break;
    //         default:
    //             throw new Error("invalid id");
    //     }
    //     elem.id = id;
    //
    //     return /** @type {CountdownElemIdNameMap[K]} */(elem);
    // },

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
//     cycle_to_state(state) {
//         switch (state) {
//             case CountdownState.CompactNoMillis:
//                 this.#remove_elem("seconds-label");
//                 this.#remove_elem("countdown-milliseconds");
//
//                 this.#restore_container("hours-container", "hours-spacer", "countdown-hours");
//                 this.#restore_container("minutes-container", "minutes-spacer", "countdown-minutes");
//                 this.#restore_container("seconds-container", "seconds-spacer", "countdown-seconds");
//
//                 this.get_elem_or_throw("days-label").textContent = ":";
//                 this.get_elem_or_throw("hours-label").textContent = ":";
//                 this.get_elem_or_throw("minutes-label").textContent = ":";
//
//                 this.get_elem_or_throw("countdown").classList.replace("blocky", "inline");
//                 this.get_elem_or_throw("countdown").role = "time";
//                 break;
//
//             case CountdownState.Compact:
//                 this.#create_and_append_label_if_null("seconds-label");
//                 this.#create_and_append_element_if_null("countdown-milliseconds", "span");
//
//                 this.#restore_container("hours-container", "hours-spacer", "countdown-hours");
//                 this.#restore_container("minutes-container", "minutes-spacer", "countdown-minutes");
//                 this.#restore_container("seconds-container", "seconds-spacer", "countdown-seconds");
//
//                 this.get_elem_or_throw("days-label").textContent = ":";
//                 this.get_elem_or_throw("hours-label").textContent = ":";
//                 this.get_elem_or_throw("minutes-label").textContent = ":";
//                 this.get_elem_or_throw("seconds-label").textContent = ".";
//
//                 this.get_elem_or_throw("countdown").classList.replace("blocky", "inline");
//                 this.get_elem_or_throw("countdown").role = "time";
//                 break;
//
//             case CountdownState.Blocky:
//                 this.#create_and_append_label_if_null("seconds-label");
//                 this.#remove_elem("countdown-milliseconds");
//
//                 this.get_elem_or_throw("days-label").textContent = "D";
//                 this.get_elem_or_throw("hours-label").textContent = "H";
//                 this.get_elem_or_throw("minutes-label").textContent = "M";
//                 this.get_elem_or_throw("seconds-label").textContent = "S";
//
//                 this.#replace_with_container("hours-container", "hours-spacer", "countdown-hours");
//                 this.#replace_with_container("minutes-container", "minutes-spacer", "countdown-minutes");
//                 this.#replace_with_container("seconds-container", "seconds-spacer", "countdown-seconds");
//
//                 this.get_elem_or_throw("countdown").classList.replace("inline", "blocky");
//                 this.get_elem_or_throw("countdown").role = null;
//                 break;
//
//             default:
//                 throw new Error("Invalid state");

// }

// TODO: Figure out a better way to do this. It feels very messy & not safe due to using a `Map`.
// export class CountdownElem {
//     /** @type {Map<string, HTMLElement | null>} */
//     elems;
//
//     constructor() {
//         this.elems = new Map();
//
//         this.elems.set(
//             "countdown",
//             document.getElementById("countdown") ?? assertElementExists("countdown")
//         );
//         this.elems.set(
//             "countdown-days",
//             document.getElementById("countdown-days") ?? assertElementExists("countdown-days")
//         );
//         this.elems.set(
//             "days-label",
//             document.getElementById("days-label") ?? assertElementExists("days-label")
//         );
//         this.elems.set(
//             "countdown-hours",
//             document.getElementById("countdown-hours") ?? assertElementExists("countdown-hours")
//         );
//         this.elems.set(
//             "hours-label",
//             document.getElementById("hours-label") ?? assertElementExists("hours-label")
//         );
//         this.elems.set(
//             "countdown-minutes",
//             document.getElementById("countdown-minutes") ?? assertElementExists("countdown-minutes")
//         );
//         this.elems.set(
//             "minutes-label",
//             document.getElementById("minutes-label") ?? assertElementExists("minutes-label")
//         );
//         this.elems.set(
//             "countdown-seconds",
//             document.getElementById("countdown-seconds") ?? assertElementExists("countdown-seconds")
//         );
//
//         // The following can all be null
//         this.elems.set("countdown-milliseconds", document.getElementById("countdown-milliseconds"));
//
//         this.elems.set("hours-container", document.getElementById("hours-container"));
//         this.elems.set("hours-spacer", document.getElementById("hours-spacer"));
//
//         this.elems.set("minutes-container", document.getElementById("minutes-container"));
//         this.elems.set("minutes-spacer", document.getElementById("minutes-spacer"));
//
//         this.elems.set("seconds-container", document.getElementById("seconds-container"));
//         this.elems.set("seconds-spacer", document.getElementById("seconds-spacer"));
//
//         this.elems.set("seconds-label", document.getElementById("seconds-label"));
//     }
//
//     /** @param {HTMLElement} elem */
//     #append_to_root_elem(elem) {
//         const countdown = this.elems.get("countdown");
//         if (countdown !== null && countdown !== undefined) {
//             countdown.appendChild(elem);
//             this.elems.set(elem.id, elem);
//         } else {
//             throw new Error("Countdown root element not found: id='countdown'");
//         }
//     }
//
//     /**
//      * @param {string} elem_id
//      * @param {string} tag_name
//      **/
//     #create_and_append_element_if_null(elem_id, tag_name) {
//         let elem = this.elems.get(elem_id);
//         if (elem === null) {
//             elem = document.createElement(tag_name);
//             elem.id = elem_id;
//
//             this.#append_to_root_elem(elem);
//         } else if (elem === undefined) {
//             throw new Error(`Element was not initialized: 'id=${elem_id}'`)
//         }
//         // no-op if element already exists
//     }
//
//     /**
//      * @param {string} label_id
//      **/
//     #create_and_append_label_if_null(label_id) {
//         let label = this.elems.get(label_id);
//         if (label === null) {
//             label = document.createElement("span");
//             label.id = label_id;
//
//             this.#append_to_root_elem(label);
//         } else if (label === undefined) {
//             throw new Error(`Label was not initialized: 'id=${label_id}'`)
//         }
//         // no-op if element already exists
//     }
//
//     /**
//      * @param {string} elem_id
//      * @throws {Error}
//      * @returns {HTMLElement}
//      **/
//     get_elem_or_throw(elem_id) {
//         const elem = this.elems.get(elem_id);
//         if (elem === null) {
//             throw new Error(`Element does not exist: 'id=${elem_id}'`)
//         } else if (elem === undefined) {
//             throw new Error(`Element was not initialized: 'id=${elem_id}'`)
//         } else {
//             return elem;
//         }
//     }
//
//     /**
//     * @param {string} elem_id
//     * @throws {Error}
//     * */
//     #remove_elem(elem_id) {
//         const elem = this.elems.get(elem_id);
//         if (elem === null) {
//             // no-op
//         } else if (elem === undefined) {
//             throw new Error(`Element was not initialized: 'id=${elem_id}'`)
//         } else {
//             elem?.remove();
//             this.elems.set(elem_id, null);
//         }
//     }
//
//     /**
//      * @param {string} container_id
//      * @param {string} spacer_id
//      * @param {string} target_replace_id
//      **/
//     #replace_with_container(container_id, spacer_id, target_replace_id) {
//         if (this.elems.get(container_id) === null) {
//             const replacement_elem = document.createElement("span");
//             replacement_elem.id = target_replace_id;
//             replacement_elem.style.display = "inline";
//
//             const spacer = document.createElement("span");
//             spacer.id = spacer_id;
//             spacer.className = "spacer";
//             spacer.style.display = "inline";
//             spacer.ariaHidden = "true";
//
//             const container = document.createElement("div");
//             container.id = container_id;
//             // container.style.display = "inline";
//
//             container.appendChild(spacer);
//             container.appendChild(replacement_elem);
//
//             this.get_elem_or_throw(target_replace_id).replaceWith(container);
//
//             this.elems.set(container_id, container);
//             this.elems.set(spacer_id, spacer);
//             this.elems.set(target_replace_id, replacement_elem);
//         } else if (this.elems.get(container_id) === undefined) {
//             throw new Error(`Container was not initialized: 'id=${container_id}'`)
//         }
//         // no-op if container already exists
//     }
//
//     /**
//      * @param {string} container_id
//      * @param {string} spacer_id
//      * @param {string} inner_elem_id
//      **/
//     #restore_container(container_id, spacer_id, inner_elem_id) {
//         const container = this.elems.get(container_id);
//         if (container === null) {
//             // no-op
//         } else if (container === undefined) {
//             throw new Error(`Container was not initialized: 'id=${container_id}'`)
//         } else {
//             const inner_elem = this.get_elem_or_throw(inner_elem_id);
//             this.elems.set(container_id, null);
//             this.elems.set(spacer_id, null);
//             this.elems.set(inner_elem_id, inner_elem);
//
//             container.replaceWith(inner_elem);
//         }
//     }
//
//     /** @param {number} state CountdownState */
//     cycle_to_state(state) {
//         switch (state) {
//             case CountdownState.CompactNoMillis:
//                 this.#remove_elem("seconds-label");
//                 this.#remove_elem("countdown-milliseconds");
//
//                 this.#restore_container("hours-container", "hours-spacer", "countdown-hours");
//                 this.#restore_container("minutes-container", "minutes-spacer", "countdown-minutes");
//                 this.#restore_container("seconds-container", "seconds-spacer", "countdown-seconds");
//
//                 this.get_elem_or_throw("days-label").textContent = ":";
//                 this.get_elem_or_throw("hours-label").textContent = ":";
//                 this.get_elem_or_throw("minutes-label").textContent = ":";
//
//                 this.get_elem_or_throw("countdown").classList.replace("blocky", "inline");
//                 this.get_elem_or_throw("countdown").role = "time";
//                 break;
//
//             case CountdownState.Compact:
//                 this.#create_and_append_label_if_null("seconds-label");
//                 this.#create_and_append_element_if_null("countdown-milliseconds", "span");
//
//                 this.#restore_container("hours-container", "hours-spacer", "countdown-hours");
//                 this.#restore_container("minutes-container", "minutes-spacer", "countdown-minutes");
//                 this.#restore_container("seconds-container", "seconds-spacer", "countdown-seconds");
//
//                 this.get_elem_or_throw("days-label").textContent = ":";
//                 this.get_elem_or_throw("hours-label").textContent = ":";
//                 this.get_elem_or_throw("minutes-label").textContent = ":";
//                 this.get_elem_or_throw("seconds-label").textContent = ".";
//
//                 this.get_elem_or_throw("countdown").classList.replace("blocky", "inline");
//                 this.get_elem_or_throw("countdown").role = "time";
//                 break;
//
//             case CountdownState.Blocky:
//                 this.#create_and_append_label_if_null("seconds-label");
//                 this.#remove_elem("countdown-milliseconds");
//
//                 this.get_elem_or_throw("days-label").textContent = "D";
//                 this.get_elem_or_throw("hours-label").textContent = "H";
//                 this.get_elem_or_throw("minutes-label").textContent = "M";
//                 this.get_elem_or_throw("seconds-label").textContent = "S";
//
//                 this.#replace_with_container("hours-container", "hours-spacer", "countdown-hours");
//                 this.#replace_with_container("minutes-container", "minutes-spacer", "countdown-minutes");
//                 this.#replace_with_container("seconds-container", "seconds-spacer", "countdown-seconds");
//
//                 this.get_elem_or_throw("countdown").classList.replace("inline", "blocky");
//                 this.get_elem_or_throw("countdown").role = null;
//                 break;
//
//             default:
//                 throw new Error("Invalid state");
//         }
//     }
// }
