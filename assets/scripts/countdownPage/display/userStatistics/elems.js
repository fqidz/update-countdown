// @ts-check
"use strict";

import { unwrapSome } from '../../../utils/assert';

/** @returns {UserStatisticElems} */
export function getUserStatisticElems() {
    const container = unwrapSome(/** @type {HTMLButtonElement} */(document.getElementById("user-statistic")));
    if (container.nodeName !== "BUTTON") {
        throw new Error('id="user-statistic element" found but is not a Button');
    }
    const year = unwrapSome(document.getElementById("statistic-year"));
    const month = unwrapSome(document.getElementById("statistic-month"));
    const week = unwrapSome(document.getElementById("statistic-week"));
    const day = unwrapSome(document.getElementById("statistic-day"));
    const hour = unwrapSome(document.getElementById("statistic-hour"));
    const minute = unwrapSome(document.getElementById("statistic-minute"));
    const click = document.getElementById("statistic-click");

    return {
        container,
        year,
        month,
        week,
        day,
        hour,
        minute,
        click,
    }
}

