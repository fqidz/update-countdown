// @ts-check
"use strict";

/** @returns {boolean} */
export function isOnPhone() {
    return matchMedia("only screen and (max-width: 600px)").matches;
}
