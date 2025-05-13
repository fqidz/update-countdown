document.addEventListener("DOMContentLoaded", function (_evt) {
    formatDateTime(null);
    formatCountdown(null);
});

function formatDateTime(_evt) {
    const date_time_elem = document.getElementById("date-time");
    const date_time = new Date(parseInt(date_time_elem.textContent));
    date_time_elem.textContent = date_time.toString();
}

function updateCountdown(days, hours, minutes, seconds, millis) {
    const countdown_elem = document.getElementById("countdown");
    countdown_elem.textContent = `\
${days}:\
${String(hours).padStart(2, "0")}:\
${String(minutes).padStart(2, "0")}:\
${String(seconds).padStart(2, "0")}.\
${String(millis).padStart(3, "0")}\
    `;
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
    }, 150);
}
