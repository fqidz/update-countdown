document.addEventListener("DOMContentLoaded", function (event) {
    formatDateTime(null);
    formatCountdown(null);
});

function formatDateTime(_evt) {
    const date_time_elem = document.getElementById("date-time");
    const date_time = new Date(parseInt(date_time_elem.textContent));
    date_time_elem.textContent = date_time.toString();
}

function formatCountdown(_evt) {
    const countdown_elem = document.getElementById("countdown");
    const date_time_elem = document.getElementById("date-time");

    setInterval(function() {
        const now = new Date(Date.now());
        const date_time = new Date(Date.parse(date_time_elem.textContent));
        const diff_time = date_time.getTime() - now.getTime();
        if (diff_time > 0) {
            const diff_millis = Math.floor((diff_time % 1000));
            const diff_seconds = Math.floor((diff_time / 1000) % 60);
            const diff_minutes = Math.floor((diff_time / (1000 * 60)) % 60);
            const diff_hours = Math.floor((diff_time / (1000 * 60 * 60)) % 24);
            const diff_days = Math.floor(diff_time / (1000 * 60 * 60 * 24));

            countdown_elem.textContent = `\
${diff_days}:\
${String(diff_hours).padStart(2, "0")}:\
${String(diff_minutes).padStart(2, "0")}:\
${String(diff_seconds).padStart(2, "0")}.\
${String(diff_millis).padStart(3, "0")}\
            `;
        } else {
            countdown_elem.textContent = "0:00:00:00.000";
        }
    }, 1);
}
