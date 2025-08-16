// ts-check
"use strict";

import { assertTagName, unwrapSome } from "../utils/assert";

export const modal = {
    /**
     * @param {string} dialog_id
     * @param {string} open_button_id
     * @param {string} close_button_id
     **/
    build: (dialog_id, open_button_id, close_button_id) => {
        const modal = unwrapSome(
            assertTagName(document.getElementById(dialog_id), "dialog"),
        );
        const open_button = unwrapSome(
            assertTagName(document.getElementById(open_button_id), "button"),
        );
        const close_button = unwrapSome(
            assertTagName(document.getElementById(close_button_id), "button"),
        );

        open_button.addEventListener("click", (_event) => {
            history.pushState(null, null, "#info");
            modal.showModal();
        });

        close_button.addEventListener("click", (_event) => {
            history.pushState(null, null, window.location.pathname);
            modal.close();
        });

        modal.addEventListener("click", (event) => {
            if (lightDismiss(event) === true) {
                history.pushState(null, null, window.location.pathname);
            }
        });

        // Pressed 'Esc' key
        modal.addEventListener("cancel", (_event) => {
            history.pushState(null, null, window.location.pathname);
        });
    },

    /** @param {string} dialog_id */
    show: (dialog_id) => {
        const modal = unwrapSome(
            assertTagName(document.getElementById(dialog_id), "dialog"),
        );
        modal.showModal();
    },

    /** @param {string} dialog_id */
    close: (dialog_id) => {
        const modal = unwrapSome(
            assertTagName(document.getElementById(dialog_id), "dialog"),
        );
        modal.close();
    },
};

/**
 * https://web.dev/articles/building/a-dialog-component#adding_light_dismiss
 * @param {MouseEvent} event
 * @returns {boolean}
 */
function lightDismiss(event) {
    const target = /** @type {Node} */ (event.target);
    if (target?.nodeName === "DIALOG") {
        /** @type {HTMLDialogElement} */ (target)?.close();
        return true;
    }
    return false;
}
