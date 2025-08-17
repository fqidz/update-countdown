use chrono::{Datelike, NaiveDateTime, Timelike};

/// Calculates the duration from the datetime to now, returning the difference in seconds, minutes,
/// hours, and days.
pub fn datetime_difference(from: NaiveDateTime, to: NaiveDateTime) -> String {
    let milliseconds = (to.nanosecond() as i32 - from.nanosecond() as i32) / 1_000_000;
    let mut seconds = to.second() as i32 - from.second() as i32;
    let mut minutes = to.minute() as i32 - from.minute() as i32;
    let mut hours = to.hour() as i32 - from.hour() as i32;
    let mut days = to.num_days_from_ce() - from.num_days_from_ce();

    if milliseconds < 0 {
        seconds -= 1;
    }

    if seconds < 0 {
        seconds += 60;
        minutes -= 1;
    }

    if minutes < 0 {
        minutes += 60;
        hours -= 1;
    }

    if hours < 0 {
        hours += 24;
        days -= 1;
    }

    assert!(days >= 0);

    difference_to_string(seconds, minutes, hours, days)
}

fn difference_to_string(seconds: i32, minutes: i32, hours: i32, days: i32) -> String {
    let mut time_units = Vec::with_capacity(4);
    let mut greatest_unit_found = false;

    if days != 0 {
        greatest_unit_found = true;
        time_units.push(format!("{}d", days));
    }

    if hours != 0 || greatest_unit_found {
        greatest_unit_found = true;
        time_units.push(format!("{}h", hours));
    }

    if minutes != 0 || greatest_unit_found {
        time_units.push(format!("{}m", minutes));
    }

    time_units.push(format!("{}s", seconds));

    time_units.join(" ")
}

#[cfg(test)]
mod tests {
    use chrono::{TimeZone, Utc};

    use crate::datetime::datetime_difference;

    #[test]
    fn none() {
        let a = Utc.with_ymd_and_hms(12345, 1, 2, 3, 4, 5).unwrap().naive_utc();
        let b = Utc.with_ymd_and_hms(12345, 1, 2, 3, 4, 5).unwrap().naive_utc();
        assert_eq!(datetime_difference(a, b), "0s");
    }

    #[test]
    fn seconds() {
        let a = Utc.with_ymd_and_hms(2025, 1, 1, 0, 0, 0).unwrap().naive_utc();
        let b = Utc.with_ymd_and_hms(2025, 1, 1, 0, 0, 42).unwrap().naive_utc();
        assert_eq!(datetime_difference(a, b), "42s");
    }

    #[test]
    fn minutes() {
        let a = Utc.with_ymd_and_hms(2023, 4, 3, 0, 0, 0).unwrap().naive_utc();
        let b = Utc.with_ymd_and_hms(2023, 4, 3, 0, 17, 2).unwrap().naive_utc();
        assert_eq!(datetime_difference(a, b), "17m 2s");
    }

    #[test]
    fn hours() {
        let a = Utc.with_ymd_and_hms(6, 7, 8, 2, 0, 0).unwrap().naive_utc();
        let b = Utc.with_ymd_and_hms(6, 7, 8, 23, 55, 33).unwrap().naive_utc();
        assert_eq!(datetime_difference(a, b), "21h 55m 33s");
    }

    #[test]
    fn days() {
        let a = Utc.with_ymd_and_hms(3333, 1, 1, 0, 0, 0).unwrap().naive_utc();
        let b = Utc.with_ymd_and_hms(3333, 1, 12, 0, 0, 0).unwrap().naive_utc();
        assert_eq!(datetime_difference(a, b), "11d 0h 0m 0s");
    }

    #[test]
    fn one_year() {
        let a = Utc.with_ymd_and_hms(2025, 1, 1, 0, 0, 0).unwrap().naive_utc();
        let b = Utc.with_ymd_and_hms(2026, 1, 1, 0, 0, 0).unwrap().naive_utc();
        assert_eq!(datetime_difference(a, b), "365d 0h 0m 0s");
    }

    #[test]
    fn leap_year() {
        let a = Utc.with_ymd_and_hms(2028, 1, 1, 0, 0, 0).unwrap().naive_utc();
        let b = Utc.with_ymd_and_hms(2029, 1, 1, 0, 0, 0).unwrap().naive_utc();
        assert_eq!(datetime_difference(a, b), "366d 0h 0m 0s");
    }

    #[test]
    fn one_thousand_days() {
        let a = Utc.with_ymd_and_hms(2025, 1, 1, 0, 0, 0).unwrap().naive_utc();
        let b = Utc.with_ymd_and_hms(2027, 9, 28, 0, 0, 0).unwrap().naive_utc();
        assert_eq!(datetime_difference(a, b), "1000d 0h 0m 0s");
    }

    #[test]
    fn ten_thousand_days() {
        let a = Utc.with_ymd_and_hms(1930, 4, 3, 1, 1, 1).unwrap().naive_utc();
        let b = Utc.with_ymd_and_hms(1964, 1, 20, 2, 2, 2).unwrap().naive_utc();
        assert_eq!(datetime_difference(a, b), "12345d 1h 1m 1s");
    }

    #[test]
    fn with_borrowing() {
        let a = Utc.with_ymd_and_hms(2006, 11, 6, 20, 33, 15).unwrap().naive_utc();
        let b = Utc.with_ymd_and_hms(2025, 8, 17, 7, 27, 49).unwrap().naive_utc();
        assert_eq!(datetime_difference(a, b), "6858d 10h 54m 34s");
    }
}
