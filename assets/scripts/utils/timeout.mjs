// @ts-check
"use strict";

export class Timeout {
    /** @type {number} */
    #inner_timeout_id
    /** @type {Function | null} */
    #handler
    /** @type {number} */
    timeout
    /** @type {boolean} */
    finished

    /**
     * @param {Function | null} handler
     * @param {number} timeout
     */
    constructor(handler, timeout = 1000) {
        this.set(handler, timeout);
        this.finished = true;
    }

    /**
     * @param {Function | null} handler
     * @param {number} timeout
     */
    set(handler, timeout) {
        this.#handler = handler;
        this.timeout = timeout;
    }

    /** @param {Function | null} handler */
    setHandler(handler) {
        this.#handler = handler;
    }

    /** @param {number} timeout */
    setTimeout(timeout) {
        this.timeout = timeout;
    }

    start() {
        if (this.#handler === null) {
            this.finished = true;
            return;
        }
        this.finished = false;
        this.#inner_timeout_id = setTimeout(() => {
            if (this.#handler !== null) {
                this.#handler()
            }
            this.finished = true;
        }, this.timeout);
    }

    cancel() {
        if (!this.finished) {
            clearTimeout(this.#inner_timeout_id);
            this.finished = true;
        }
    }

    restart() {
        if (this.#handler === null) {
            this.finished = true;
            return;
        }
        this.cancel();
        this.start();
    }
}
