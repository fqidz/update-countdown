// @ts-check
"use strict";

import { Timeout } from '../../utils/timeout';
import { UserStatistic } from '../userStatistics';

const REFRESH_BUTTON_TIMEOUT_DURATION = 300;

export class RefreshButton {
    /** @type {HTMLButtonElement} */
    #elem;
    /** @type {SVGElement} */
    #svg_elem;

    /** @type {UserStatistic} */
    #user_statistic

    /** @type {Timeout} */
    #reset_rotation_timeout;
    /** @type {number} */
    #rotation;
    // /** @type {number} */
    // #num_clicks;

    /**
     * @param {HTMLButtonElement} elem
     * @param {SVGElement} svg_elem
     */
    constructor(elem, svg_elem) {
        this.#elem = elem;
        this.#svg_elem = svg_elem;
        this.#user_statistic = new UserStatistic();
        this.#rotation = 0;
        this.#reset_rotation_timeout = new Timeout(this.#resetRotation.bind(this), REFRESH_BUTTON_TIMEOUT_DURATION);
    }

    #onClick() {
        if (websocket.state() === WebSocket.OPEN) {
            websocket.incrementDatetime();
            this.#animateClickRotation();
            if (this.#elem.disabled) {
                this.#elem.disabled = false;
            }

            this.#user_statistic.incrementClickCount();

        } else if (websocket.state() === WebSocket.CLOSED) {
            websocket.tryConnect();
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
        /** @type {HTMLButtonElement} */(this.#elem).disabled = true;

        this.#elem.addEventListener("click", this.#onClick.bind(this));

        // Prevent 'Enter' key from repeatedly pressing button when held down
        this.#elem.addEventListener("keyup", (event) => {
            if (event.key === "Enter") {
                this.#onClick();
            }
        })
        this.#elem.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
            }
        })

        this.#user_statistic.build();
    }
}

/**
 * @param {number} rad
 * @returns {[{rotate: string}]}
 */
function rotationKeyframe(rad) {
    return [{ rotate: `${rad}rad` }];
}
