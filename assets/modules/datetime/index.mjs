// @ts-check
"use strict";

/**
 * Duration between two datetimes.
 *
 * total_days: years, months, and days combined
 * @typedef {Object} Duration
 * @property {number} total_days
 * @property {number} years
 * @property {number} months
 * @property {number} days
 * @property {number} hours
 * @property {number} minutes
 * @property {number} seconds
 * @property {number} milliseconds
 */

/**
 * `Date` with only its time units. More convenient for calculating `Duration`
 * between dates.
 * @typedef {Object} DateTimeUnits
 * @property {number} year
 * @property {number} month
 * @property {number} day
 * @property {number} hour
 * @property {number} minute
 * @property {number} second
 * @property {number} millisecond
 */

/**
 * `TimeUnit` with only year, month, and day.
 * @typedef {Object} YearMonthDay
 * @property {number} year
 * @property {number} month
 * @property {number} day
 */

/**
 * @typedef {Object} UnitDuration
 * @property {number} time_unit
 * @property {number} value
 **/
