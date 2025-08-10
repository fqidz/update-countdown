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

/**
 * ## Example
 * ```js
 * import { unwrapSome, assertTagName } from 'path/to/utils/assert';
 *
 * // this has type of {HTMLElement}
 * const elem = unwrapSome(document.getElementById("button-one"));
 *
 * // this has type of {HTMLButtonElement}
 * const button = assertTagName(elem, 'button');
 * ```
 *
 * @template {keyof HTMLElementTagNameMap} K
 * @param {HTMLElement | null} elem
 * @param {K} tag_name
 * @throws {Error}
 * @returns {HTMLElementTagNameMap[K] | null}
 **/
export function assertTagName(elem, tag_name) {
    if (elem === null || elem === undefined) {
        return null;
    } else if (elem.tagName.toLowerCase() !== tag_name.toLowerCase()) {
        throw new Error(`Expected element tagName='${tag_name}' but element has tagName='${elem.tagName}'`)
    }
    return /** @type {HTMLElementTagNameMap[K]}*/(elem);
}
