// @ts-check
"use strict";

import { assertTagName, unwrapSome } from '../../utils/assert';
import { Timeout } from '../../utils/timeout';

const REFRESH_BUTTON_TIMEOUT_DURATION = 300;

export class RefreshButton extends EventTarget {
    /** @type {HTMLButtonElement} */
    #button;
    /** @type {SVGElement} */
    #svg_elem;

    /** @type {Timeout} */
    #reset_rotation_timeout;
    /** @type {number} */
    #rotation;

    /** @param {string} refresh_button_id */
    constructor(refresh_button_id) {
        super();
        this.#button = unwrapSome(assertTagName(document.getElementById(refresh_button_id), 'button'));
        this.#svg_elem = unwrapSome(document.querySelector(`#${refresh_button_id}>svg`));
        this.#rotation = 0;
        this.#reset_rotation_timeout = new Timeout(this.#resetRotation.bind(this), REFRESH_BUTTON_TIMEOUT_DURATION);
    }

    #onRefresh() {
        this.dispatchEvent(new CustomEvent("click"));

        this.#animateClickRotation();
        this.enable();
    }

    disable() {
        if (!this.#button.disabled) {
            this.#button.disabled = true;
        }
    }

    enable() {
        if (this.#button.disabled) {
            this.#button.disabled = false;
        }
    }

    #animateClickRotation() {
        // This allows us to continue from the current rotation when it's in
        // the middle of animating back to 0 rotation.
        if (this.#rotation === 0) {
            const rotation_deg = Number(
                window.getComputedStyle(this.#svg_elem).rotate.slice(0, -3)
            ) || 0;
            if (rotation_deg !== 0) {
                this.#rotation = rotation_deg * Math.PI / 180;
            }
        }

        // 55deg = 0.9599310885968813rad
        this.#rotation = Math.max(0, this.#rotation + 0.9599310885968813);

        const keyframe = rotationKeyframe(this.#rotation);
        const keyframe_timing = {
            duration: REFRESH_BUTTON_TIMEOUT_DURATION,
            easing: "linear(0, 0.679 18%, 0.895 27.6%, 1.037 37.8%, 1.104 47.4%, 1.12 58%, 1)",
            fill: /** @type {FillMode} */ ("forwards"),
        }
        this.#svg_elem.animate(keyframe, keyframe_timing);

        this.#reset_rotation_timeout.restart()
    }

    #resetRotation() {
        if (this.#rotation === 0) {
            return;
        }
        const duration = Math.ceil(Math.pow(this.#rotation, 0.75) * 100 + 50);

        this.#rotation = 0;
        const keyframe = rotationKeyframe(0);
        const keyframe_timing = {
            duration,
            easing: "cubic-bezier(.9,-0.01,.42,1.58)",
            fill: /** @type {FillMode} */ ("forwards"),
        }
        this.#svg_elem.animate(keyframe, keyframe_timing);

        this.#reset_rotation_timeout.cancel();
    }

    build() {
        // /** @type {HTMLButtonElement} */(this.#elem).disabled = true;
        this.#button.addEventListener("click", this.#onRefresh.bind(this));

        // Prevent 'Enter' key from repeatedly pressing button when held down
        this.#button.addEventListener("keyup", (event) => {
            if (event.key === "Enter") {
                this.#onRefresh();
            }
        })
        this.#button.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
            }
        })

        this.enable();
    }
}

/**
 * @param {number} rad
 * @returns {[{rotate: string}]}
 */
function rotationKeyframe(rad) {
    return [{ rotate: `${rad}rad` }];
}
