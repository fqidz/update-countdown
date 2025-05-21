const CountdownState = Object.freeze({
    "CompactFull": 0,
    "CompactNoMillis": 1,
    "Blocky": 2,
})

const DatetimeState = Object.freeze({
    "Utc": 0,
    "Iso8601": 1,
    "LocalTimezone": 2,
})


class DisplayState extends EventTarget {
    state;
    num_states;
    #local_storage_name;

    /**
     * The state of a display.
     * @param state an integer representing the state. Usually this is an enum value.
     * @param num_states the max number of states it has.
     * @param local_storage_name where to load and save the state.
     */
    constructor(state, num_states, local_storage_name) {
        super();
        this.state = state;
        this.num_states = num_states;
        this.#local_storage_name = local_storage_name;
    }

    #emitEnterState(state) {
        this.dispatchEvent(new CustomEvent("enterstate", { detail: { state: state } }));
    }

    #emitExitState(state) {
        this.dispatchEvent(new CustomEvent("existate", { detail: { state: state } }));
    }

    #saveState() {
        localStorage.setItem(this.#local_storage_name, String(this.state));
    }

    cycleState() {
        const next_state = (this.state + 1) % this.num_states;
        this.switchToState(next_state);
    }

    switchToState(state) {
        if (state >= this.num_states) {
            console.log("Invalid display state.");
        } else {
            this.#emitExitState(this.state);
            this.state = state;
            this.#emitEnterState(this.state);
            this.#saveState();
        }
    }
}

const countdown_state = new DisplayState(
    Number(localStorage.getItem("countdown_state")) || CountdownState.CompactFull,
    3,
    "countdown_state"
)

const datetime_state = new DisplayState(
    Number(localStorage.getItem("datetime_state")) || DatetimeState.Utc,
    3,
    "datetime_state"
)
let datetime = null;
let countdown_interval_id = null;
let query_interval_id = null;
let original_countdown_elem = null;

document.addEventListener("DOMContentLoaded", function(_evt) {
    const countdown_elem = document.getElementById("countdown");
    original_countdown_elem = countdown_elem.cloneNode();
    original_countdown_elem.textContent = "";

    if (countdown_state.state == CountdownState.Blocky) {
        setCountdownDisplayToScrollable();
    }

    formatDatetime();
    startCountdownInterval();
    query_interval_id = setQueryInterval();

    countdown_elem.addEventListener("click", function() {
        countdown_state.cycleState();
    });
    document.getElementById("datetime").addEventListener("click", function() {
        datetime_state.cycleState();
        updateDatetimeDisplay();
    });
});

function setCountdownDisplayToScrollable() {
    const countdown_elem = document.getElementById("countdown");

    const countdown_div = document.createElement("div");
    countdown_div.setAttribute("id", "countdown");
    countdown_div.style.display = "grid";
    countdown_div.style.gridTemplateColumns = "1fr auto";
    countdown_div.style.gap = "0.05em 0.25em";
    countdown_div.className = "font-roboto font-bold main-fg-color";

    const days_elem = document.createElement("p");
    const days_label = document.createElement("label");
    days_elem.setAttribute("id", "countdown-days");
    days_elem.style.justifySelf = "end";
    days_label.textContent = "D";
    days_label.htmlFor = "countdown-days";

    const hours_elem = document.createElement("p");
    const hours_label = document.createElement("label");
    hours_elem.setAttribute("id", "countdown-hours");
    hours_elem.style.justifySelf = "end";
    hours_label.textContent = "H";
    hours_label.htmlFor = "countdown-hours";

    const mins_elem = document.createElement("p");
    const mins_label = document.createElement("label");
    mins_elem.setAttribute("id", "countdown-mins");
    mins_elem.style.justifySelf = "end";
    mins_label.textContent = "M";
    mins_label.htmlFor = "countdown-mins";

    const secs_elem = document.createElement("p");
    const secs_label = document.createElement("label");
    secs_elem.setAttribute("id", "countdown-secs");
    secs_elem.style.justifySelf = "end";
    secs_label.htmlFor = "countdown-secs";
    secs_label.textContent = "S";

    countdown_div.appendChild(days_elem);
    countdown_div.appendChild(days_label);
    countdown_div.appendChild(hours_elem);
    countdown_div.appendChild(hours_label);
    countdown_div.appendChild(mins_elem);
    countdown_div.appendChild(mins_label);
    countdown_div.appendChild(secs_elem);
    countdown_div.appendChild(secs_label);

    countdown_elem.replaceWith(countdown_div);

    countdown_div.addEventListener("click", function() {
        countdown_state.cycleState();
    });
}

countdown_state.addEventListener("enterstate", (evt) => {
    if (evt.detail.state == CountdownState.Blocky) {
        setCountdownDisplayToScrollable();
    }
    changeCountdownInterval();
    updateCountdownDiffTime();
})

countdown_state.addEventListener("exit", (state) => {
    if (state == CountdownState.Blocky) {

    }
})

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
            case CountdownState.Blocky:
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

function formatDatetime() {
    const datetime_elem = document.getElementById("datetime");
    datetime = new Date(Number(datetime_elem.textContent));
    updateDatetimeDisplay();
    updateCountdownDiffTime();
}

// TODO: update only units that are relevant, ie. only seconds per second, minute per minute, etc.
function updateCountdownDisplay(days, hours, minutes, seconds, millis) {
    const countdown_elem = document.getElementById("countdown");
    switch (countdown_state.state) {
        case CountdownState.CompactFull:
            countdown_elem.textContent =
                days + ':' +
                String(hours).padStart(2, '0') + ':' +
                String(minutes).padStart(2, '0') + ':' +
                String(seconds).padStart(2, '0') + '.' +
                String(millis).padStart(3, '0');
            break;

        case CountdownState.CompactNoMillis:
            countdown_elem.textContent =
                days + ':' +
                String(hours).padStart(2, '0') + ':' +
                String(minutes).padStart(2, '0') + ':' +
                String(seconds).padStart(2, '0')
            break;

        case CountdownState.Blocky:
            const days_elem = document.getElementById("countdown-days");
            const hours_elem = document.getElementById("countdown-hours");
            const mins_elem = document.getElementById("countdown-mins");
            const secs_elem = document.getElementById("countdown-secs");

            days_elem.textContent = days;
            hours_elem.textContent = hours;
            mins_elem.textContent = minutes;
            secs_elem.textContent = seconds;
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
        case CountdownState.Blocky:
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
