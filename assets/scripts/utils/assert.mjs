// @ts-check
"use strict";

/**
 * @param {string} id
 * @throws {Error}
 * @returns {never}
 **/
export function assertElementExists(id) {
    throw new Error(`No element found with id="${id}"`)
}

/**
 * Takes in `{I | null}` and returns `{I}`. Throws an `Error` if it's null.
 * Kind of like `Option::unwrap()` in rust.
 *
 * ## Example
 *
 * ```js
 * // this has type of {HTMLElement | null}
 * const elem = document.getElementById("foo");
 *
 * // this has type of {HTMLElement}
 * const foo = unwrapSome(elem);
 * ```
 * @template {any} I
 * @param {I | null} item
 * @throws {Error}
 * @returns {I}
 **/
export function unwrapSome(item) {
    return item ?? (() => { throw new Error('unwrap on `null` value') })();
}
