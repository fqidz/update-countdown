// @ts-check
"use strict";

import { assertTagName, unwrapSome } from "../../utils/assert";
import { isOnPhone } from "../../utils/mediaQuery";

export const navbar = {
    /** @param {string} navbar_toggle_button_id */
    build: function(navbar_toggle_button_id) {
        const button =
            unwrapSome(assertTagName(document.getElementById(navbar_toggle_button_id), 'button'));

        let is_navbar_open = !isOnPhone();
        button.ariaExpanded = is_navbar_open.toString();

        button.addEventListener("click", () => {
            is_navbar_open = !is_navbar_open;
            button.ariaExpanded = is_navbar_open.toString();
        });
    }
}
