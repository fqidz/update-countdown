// @ts-check
"use strict";

import { assertTagName, unwrapSome } from "../../utils/assert";

export const theme = {
    /** @param {string} theme_toggle_button_id */
    build: function(theme_toggle_button_id) {
        let theme = localStorage.getItem("theme");
        if (theme === null) {
            theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light";
        }
        setTheme(theme);

        const button =
            unwrapSome(assertTagName(document.getElementById(theme_toggle_button_id), 'button'));

        button.addEventListener("click", () => {
            if (theme === "dark") {
                theme = "light";
            } else if (theme === "light") {
                theme = "dark";
            } else {
                throw new Error("assert can only be \"light\" or \"dark\"");
            }
            setTheme(theme);
        });
    }
}

/** @param {string} theme */
function setTheme(theme) {
    if (theme === "dark") {
        document.body.dataset.theme = "dark";
    } else if (theme === "light") {
        document.body.dataset.theme = "light";
    } else {
        throw new Error("Invalid theme");
    }
    localStorage.setItem("theme", theme);
}

