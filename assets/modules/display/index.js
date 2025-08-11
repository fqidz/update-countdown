// @ts-check
"use strict";

// 5:3 or 5/3
export const FONT_SIZE_VW_RATIO = 1.6666666666666665;
// 5:4 or 5/4
export const FONT_SIZE_VH_RATIO = 1.25;

export class DisplayState {
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
        this.state = state;
        this.num_states = num_states;
        this.#local_storage_name = local_storage_name;
    }

    cycleState() {
        this.state = (this.state + 1) % this.num_states;
        localStorage.setItem(this.#local_storage_name, String(this.state));
    }
}
