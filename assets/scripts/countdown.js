const CountdownState = Object.freeze({
    'CompactFull': 0,
    'CompactNoMillis': 1,
    'VerboseScrollable': 2,
})

const countdownState = {
    state: CountdownState.CompactFull,
    cycleState() {
        this.state = (this.state + 1) % 3
    }
};


document.addEventListener("DOMContentLoaded", function(_evt) {
    formatDateTime(null);
    formatCountdown(null);
    document.getElementById("countdown").addEventListener("click", function() {
        countdownState.cycleState();
    });
});

function formatDateTime(_evt) {
    const date_time_elem = document.getElementById("date-time");
    const date_time = new Date(parseInt(date_time_elem.textContent));
    date_time_elem.textContent = date_time.toString();
}

function updateCountdown(days, hours, minutes, seconds, millis) {
    const countdown_elem = document.getElementById("countdown");
    switch (countdownState.state) {
        case CountdownState.CompactFull:
            countdown_elem.textContent = `\
${days}:\
${String(hours).padStart(2, "0")}:\
${String(minutes).padStart(2, "0")}:\
${String(seconds).padStart(2, "0")}.\
${String(millis).padStart(3, "0")}\
            `;
            break;

        case CountdownState.CompactNoMillis:
            countdown_elem.textContent = `\
${days}:\
${String(hours).padStart(2, "0")}:\
${String(minutes).padStart(2, "0")}:\
${String(seconds).padStart(2, "0")}\
            `;
            break;

        case CountdownState.VerboseScrollable:
            countdown_elem.textContent = "testtesttest";
            break;

        default:
            break;
    }
}

function intervalCountdown(date_time_elem) {
    const now = new Date(Date.now());
    const date_time = new Date(Date.parse(date_time_elem.textContent));
    const diff_time = date_time.getTime() - now.getTime();
    if (diff_time > 0) {
        const diff_millis = Math.floor((diff_time % 1000));
        const diff_seconds = Math.floor((diff_time / 1000) % 60);
        const diff_minutes = Math.floor((diff_time / (1000 * 60)) % 60);
        const diff_hours = Math.floor((diff_time / (1000 * 60 * 60)) % 24);
        const diff_days = Math.floor(diff_time / (1000 * 60 * 60 * 24));

        updateCountdown(diff_days, diff_hours, diff_minutes, diff_seconds, diff_millis);
    } else {
        updateCountdown(0, 0, 0, 0, 0);
    }
}

function formatCountdown(_evt) {
    const date_time_elem = document.getElementById("date-time");

    intervalCountdown(date_time_elem)
    setInterval(function() {
        intervalCountdown(date_time_elem)
    }, 30);
}
