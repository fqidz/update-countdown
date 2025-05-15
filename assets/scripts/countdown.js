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

document.addEventListener("DOMContentLoaded", function(_evt) {
    formatDatetime(null);
    formatCountdown(null);
    document.getElementById("countdown").addEventListener("click", function() {
        countdown_state.cycleState();
    });
    document.getElementById("datetime").addEventListener("click", function() {
        datetime_state.cycleState();
        updateDatetimeDisplay()
    });
});

let datetime = null;

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
            // TODO: this might dox people
            datetime_elem.textContent = datetime.toString();
            break;
        default:
            break;
    }
}

function formatDatetime(_evt) {
    const datetime_elem = document.getElementById("datetime");
    datetime = new Date(Number(datetime_elem.textContent));
    updateDatetimeDisplay();
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

function intervalCountdown(datetime_elem) {
    const now = new Date(Date.now());
    const datetime = new Date(Date.parse(datetime_elem.textContent));
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

function formatCountdown(_evt) {
    const datetime_elem = document.getElementById("datetime");

    intervalCountdown(datetime_elem)
    setInterval(function() {
        intervalCountdown(datetime_elem)
    }, 30);
}
