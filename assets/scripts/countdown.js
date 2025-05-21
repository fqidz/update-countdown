const CountdownState = Object.freeze({
    "CompactFull": 0,
    "CompactNoMillis": 1,
    "VerboseScrollable": 2,
})

const DatetimeState = Object.freeze({
    "Utc": 0,
    "Iso8601": 1,
    "LocalTimezone": 2,
})


class DisplayState {
    /**
     * The state of a display.
     * @param state an integer representing the state. Usually this is an enum value.
     * @param num_states the max number of states it has.
     * @param local_storage_name where to load and save the state.
     */
    constructor(state, num_states, local_storage_name) {
        this.state = state;
        this.num_states = num_states;
        this.cycleState = function() {
            this.state = (this.state + 1) % this.num_states;
            localStorage.setItem(local_storage_name, String(this.state));
        };
    }
}

const countdown_state_from_storage = localStorage.getItem("countdown_state");
const datetime_state_from_storage = localStorage.getItem("datetime_state");

const countdown_state = new DisplayState(
    Number(countdown_state_from_storage) || CountdownState.CompactFull,
    3,
    "countdown_state"
)

const datetime_state = new DisplayState(
    Number(datetime_state_from_storage) || DatetimeState.Utc,
    3,
    "datetime_state"
)
let datetime = null;
let countdown_interval_id = null;
let query_interval_id = null;

document.addEventListener("DOMContentLoaded", function(_evt) {
    formatDatetime(null);
    startCountdownInterval();
    query_interval_id = setQueryInterval();
    document.getElementById("countdown").addEventListener("click", function() {
        countdown_state.cycleState();
        changeCountdownInterval();
        updateCountdownDiffTime();
    });
    document.getElementById("datetime").addEventListener("click", function() {
        datetime_state.cycleState();
        updateDatetimeDisplay();
    });
});

let is_document_visible = true;

document.addEventListener("visibilitychange", () => {
    is_document_visible = !document.hidden;
    if (is_document_visible === true) {
        queryDatetimeAndUpdateDisplays();
    }
})

function changeCountdownInterval() {
    if (countdown_interval_id) {
        clearInterval(countdown_interval_id)
        switch (countdown_state.state) {
            case CountdownState.CompactFull:
                countdown_interval_id = setInterval(updateCountdownDiffTime, 30)
                break;

            case CountdownState.CompactNoMillis:
            case CountdownState.VerboseScrollable:
                countdown_interval_id = setInterval(updateCountdownDiffTime, 500)
                break;

            default:
                break;
        }
    }
}


function updateDatetimeDisplay() {
    const datetime_elem = document.getElementById("datetime");
    switch (datetime_state.state) {
        case DatetimeState.Utc:
            datetime_elem.textContent = datetime.toUTCString();
            break;
        case DatetimeState.Iso8601:
            datetime_elem.textContent = datetime.toISOString();
            break;
        case DatetimeState.LocalTimezone:
            // Kind of silly, but don't use `Date.toString()` because it
            // includes timezone name and it might dox people.
            const date = datetime.toDateString();
            const date_split = date.split(' ');
            const week_day = date_split[0];
            const month_name = date_split[1];
            const day = date_split[2];
            const year = date_split[3];

            const time = datetime.toTimeString();
            const parenthesis_index = time.indexOf('(');
            const time_without_timezone_name = time.slice(0, parenthesis_index - 1);

            datetime_elem.textContent =
                week_day + ", " +
                day + ' ' +
                month_name + ' ' +
                year + ' ' +
                time_without_timezone_name;
            break;
        default:
            break;
    }
}

function formatDatetime(_evt) {
    const datetime_elem = document.getElementById("datetime");
    datetime = new Date(Number(datetime_elem.textContent));
    updateDatetimeDisplay();
    updateCountdownDiffTime();
}

function updateCountdownDisplay(days, hours, minutes, seconds, millis) {
    const countdown_elem = document.getElementById("countdown");
    switch (countdown_state.state) {
        case CountdownState.CompactFull:
            countdown_elem.textContent =
                days + ':' +
                String(hours).padStart(2, '0') + ':' +
                String(minutes).padStart(2, "0") + ':' +
                String(seconds).padStart(2, "0") + '.' +
                String(millis).padStart(3, "0");
            break;

        case CountdownState.CompactNoMillis:
            countdown_elem.textContent =
                days + ':' +
                String(hours).padStart(2, '0') + ':' +
                String(minutes).padStart(2, "0") + ':' +
                String(seconds).padStart(2, "0")
            break;

        case CountdownState.VerboseScrollable:
            countdown_elem.textContent = "testtesttest";
            break;

        default:
            break;
    }
}

function updateCountdownDiffTime() {
    const now = new Date(Date.now());
    const diff_time = datetime.getTime() - now.getTime();
    if (diff_time > 0) {
        const diff_millis = Math.floor((diff_time % 1000));
        const diff_seconds = Math.floor((diff_time / 1000) % 60);
        const diff_minutes = Math.floor((diff_time / (1000 * 60)) % 60);
        const diff_hours = Math.floor((diff_time / (1000 * 60 * 60)) % 24);
        const diff_days = Math.floor(diff_time / (1000 * 60 * 60 * 24));

        updateCountdownDisplay(diff_days, diff_hours, diff_minutes, diff_seconds, diff_millis);
    } else {
        updateCountdownDisplay(0, 0, 0, 0, 0);
    }
}

function startCountdownInterval() {
    updateCountdownDiffTime()
    let timeout;
    switch (countdown_state.state) {
        case CountdownState.CompactFull:
            timeout = 30;
            break;

        case CountdownState.CompactNoMillis:
        case CountdownState.VerboseScrollable:
            timeout = 500;
            break;

        default:
            break;
    }

    console.assert(timeout);
    countdown_interval_id = setInterval(updateCountdownDiffTime, timeout);
}

function restartQueryInterval() {
    console.assert(query_interval_id);
    clearInterval(query_interval_id);
    query_interval_id = setQueryInterval();
}

function setQueryInterval() {
    return setInterval(queryDatetimeAndUpdateDisplays, 1000)
}

async function queryDatetimeAndUpdateDisplays() {
    if (is_document_visible === true) {
        const new_datetime = await queryDatetime();
        if (new_datetime) {
            datetime = new Date(Number(new_datetime));
            updateDatetimeDisplay();
            updateCountdownDiffTime();
        }
    }
}

function queryDatetime() {
    try {
        return fetch("/battlebit/query-datetime", {
            method: "POST",
            mode: "no-cors",
        }).then((response) => response.blob())
            .then((blob) => blob.text())
            .then((text) => {
                return text;
            });
    } catch (error) {
        console.error(error.message);
        return null;
    }
}
