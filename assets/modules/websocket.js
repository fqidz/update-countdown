// @ts-check
"use strict";

import { Timeout } from "./utils/timeout";

export class CustomWebSocket extends EventTarget {
    /** @type {WebSocket | null} */
    #websocket;
    /** @type {Timeout} */
    #disconnect_timeout;
    /** @type {Timeout} */
    #reconnect_timeout;
    /** @type {number} */
    #reconnect_retries;
    /** @type {string} */
    url;

    /** @param {string} url */
    constructor(url) {
        super();
        this.url = url;
        this.#disconnect_timeout = new Timeout(null);
        this.#reconnect_timeout = new Timeout(this.tryConnect.bind(this));
        this.#reconnect_retries = 0;
        this.#websocket = null;
        this.#connect();
    }

    #connect() {
        this.#websocket = new WebSocket(this.url);
        this.#websocket.binaryType = "arraybuffer";

        this.#websocket.addEventListener("open", this.#onOpen.bind(this));
        this.#websocket.addEventListener("message", this.#onMessage.bind(this));
        this.#websocket.addEventListener("close", this.#onClose.bind(this));
        this.#websocket.addEventListener("error", this.#onError.bind(this));
    }

    /** @param {Event} _event */
    #onOpen(_event) {
        this.dispatchEvent(new CustomEvent("open"));
        this.#reconnect_retries = 0;
    }

    /** @param {MessageEvent<any>} event */
    #onMessage(event) {
        const msg = new DataView(event.data).getBigInt64(0, false);

        if (msg > Number.MAX_SAFE_INTEGER) {
            throw new Error(
                `Timestamp exceeds 'Number.MAX_SAFE_INTEGER': ${msg}`,
            );
        } else if (msg < Number.MIN_SAFE_INTEGER) {
            throw new Error(
                `Timestamp exceeds 'Number.MIN_SAFE_INTEGER': ${msg}`,
            );
        }

        const msg_as_number = Number(msg);

        if (Number.isNaN(msg_as_number)) {
            throw Error("Unexpected WebSocket message recieved");
        } else if (msg_as_number < 0) {
            this.dispatchEvent(
                new CustomEvent("updateusercount", {
                    detail: msg_as_number * -1,
                }),
            );
        } else {
            this.dispatchEvent(
                new CustomEvent("updatedatetime", {
                    detail: new Date(msg_as_number * 1000),
                }),
            );
        }
    }

    /** @param {CloseEvent} _event */
    #onClose(_event) {
        if (this.#websocket === null) {
            throw new Error("Tried closing null websocket");
        }
        this.#websocket.removeEventListener("message", this.#onMessage);
        this.#websocket.removeEventListener("open", this.#onOpen);
        this.#websocket.removeEventListener("close", this.#onClose);
        this.#websocket.removeEventListener("error", this.#onError);

        this.dispatchEvent(new CustomEvent("close"));
    }

    // TODO: Add popup notif to inform that websocket had error
    /** @param {Event} _event */
    #onError(_event) {
        this.tryDisconnect();
        const reconnect_seconds = Math.round(Math.min(120, Math.pow(++this.#reconnect_retries, 1.5)));
        if (this.#reconnect_timeout.finished) {
            console.log(
                `Error connecting to websocket. Reconnecting in ${reconnect_seconds} seconds.`,
            );
            this.#reconnect_timeout.setTimeout(reconnect_seconds * 1000);
            this.#reconnect_timeout.start();
        }
    }

    tryConnect() {
        if (
            this.#websocket === null ||
            (this.state() !== null && this.state() !== WebSocket.CLOSED)
        ) {
            return;
        }
        this.#connect();
    }

    tryDisconnect() {
        if (
            this.#websocket === null ||
            (this.state() !== null && this.state() !== WebSocket.OPEN)
        ) {
            return;
        }
        // Cleanup event listeners on this.#onClose()
        this.#websocket.close();
    }

    /** @param {number} milliseconds */
    delayedDisconnect(milliseconds) {
        this.#disconnect_timeout.cancel();
        this.#disconnect_timeout.set(
            this.tryDisconnect.bind(this),
            milliseconds,
        );
        this.#disconnect_timeout.start();
    }

    reconnect() {
        this.#disconnect_timeout.cancel();
        this.tryConnect();
    }

    incrementDatetime() {
        this.#websocket?.send(new Int8Array(0));
    }

    /** @returns {number | null} */
    state() {
        return this.#websocket?.readyState || null;
    }
}
