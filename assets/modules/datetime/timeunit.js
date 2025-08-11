// @ts-check
"use strict";

export const TimeUnits = Object.freeze({
    Minute: 0,
    Hour: 1,
    Day: 2,
    Week: 3,
    Month: 4,
    Year: 5,
});

export const MINUTES_PER_UNIT = Object.freeze([
    // Number of minutes in a...
    1, // minute,
    60, // hour,
    1440, // day,
    10080, // week,
    43800, // month,
    525960, // year
]);

/**
 * @param {number} time_unit
 * @returns {string}
 **/
function timeUnitToString(time_unit) {
    switch (time_unit) {
        case TimeUnits.Minute:
            return "m";
        case TimeUnits.Hour:
            return "h";
        case TimeUnits.Day:
            return "d";
        case TimeUnits.Week:
            return "w";
        case TimeUnits.Month:
            return "M";
        case TimeUnits.Year:
            return "Y";
        default:
            throw new Error("Invalid TimeUnit");
    }
}

/**
 * @param {number} time_unit
 * @param {number} value
 * @returns {string}
 **/
export function formatUnitDuration(time_unit, value) {
    if (time_unit === TimeUnits.Hour || time_unit === TimeUnits.Minute) {
        return `${String(value).padStart(2, "0")}${timeUnitToString(time_unit)}`;
    }
    return `${value}${timeUnitToString(time_unit)}`;
}
