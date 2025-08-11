// ts-check
"use strict";

import { assertTagName, unwrapSome } from "../utils/assert";

export const modal = {
    /**
     * @param {string} dialog_id
     * @param {string} open_button_id
     * @param {string} close_button_id
     **/
    build: function(dialog_id, open_button_id, close_button_id) {
        const modal =
            unwrapSome(assertTagName(document.getElementById(dialog_id), 'dialog'));
        const open_button =
            unwrapSome(assertTagName(document.getElementById(open_button_id), 'button'));
        const close_button =
            unwrapSome(assertTagName(document.getElementById(close_button_id), 'button'));

        modal.addEventListener("click", lightDismiss)
        open_button.addEventListener("click", () => { modal.showModal() })
        close_button.addEventListener("click", () => { modal.close() })
    }
}

/**
 * https://web.dev/articles/building/a-dialog-component#adding_light_dismiss
 * @param {MouseEvent} event
 */
function lightDismiss(event) {
    let target = /** @type {Node} */(event.target);
    if (target?.nodeName === "DIALOG") {
        /** @type {HTMLDialogElement} */(target)?.close();
    }
}
