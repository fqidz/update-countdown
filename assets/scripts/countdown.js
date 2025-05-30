const CountdownState = Object.freeze({
	CompactFull: 0,
	CompactNoMillis: 1,
	Blocky: 2,
});

const DatetimeState = Object.freeze({
	Utc: 0,
	Iso8601: 1,
	LocalTimezone: 2,
});

// TODO: figure out how to use the dayjs 'index.d.ts' file to work with ts_ls
// to get autocompletion

/**
 * day.js Duration object
 * @typedef {{
 *     years: number,
 *     months: number,
 *     total_days: number,
 *     hours: number,
 *     minutes: number,
 *     seconds: number,
 *     milliseconds: number
 * }} Duration
 */

/** @returns {Duration} */
function getDiffDuration(now_datetime, target_datetime) {
	console.log("test");
	const duration = dayjs.duration(target_datetime.diff(now_datetime));
	return {
		years: duration.years(),
		months: duration.months(),
		total_days: Math.floor(Number(duration.asDays())),
		days: duration.days(),
		hours: duration.hours(),
		minutes: duration.minutes(),
		seconds: duration.seconds(),
		milliseconds: duration.milliseconds(),
	};
}

class Countdown extends EventTarget {
	/** @type {Object} */
	#datetime_target;
	/** @type {number} */
	#datetime_now;
	/** @type {Duration} */
	#diff_duration;
	/** @type {number | null} */
	interval_id;

	/** @param {Object} datetime_target */
	constructor(datetime_target) {
		super();
		this.#datetime_target = datetime_target;
		this.#datetime_now = dayjs();
		this.#diff_duration = getDiffDuration(
			this.#datetime_now,
			this.#datetime_target,
		);
		this.interval_id = null;
	}

	#emitUpdateTotalDays(val) {
		this.dispatchEvent(new CustomEvent("totaldays", { detail: val }));
	}

	/** @param {number} val */
	#emitUpdateDays(val) {
		this.dispatchEvent(new CustomEvent("days", { detail: val }));
	}

	/** @param {number} val */
	#emitUpdateHours(val) {
		this.dispatchEvent(new CustomEvent("hours", { detail: val }));
	}

	/** @param {number} val */
	#emitUpdateMinutes(val) {
		this.dispatchEvent(new CustomEvent("minutes", { detail: val }));
	}

	/** @param {number} val */
	#emitUpdateSeconds(val) {
		this.dispatchEvent(new CustomEvent("seconds", { detail: val }));
	}

	/** @param {number} val */
	#emitUpdateMilliseconds(val) {
		this.dispatchEvent(new CustomEvent("milliseconds", { detail: val }));
	}

	/** @param {Duration} new_diff_duration */
	#innerEmitUpdate(new_diff_duration) {
		this.#emitUpdateMilliseconds(new_diff_duration.milliseconds);

		if (new_diff_duration.seconds !== this.#diff_duration.seconds) {
			this.#emitUpdateSeconds(new_diff_duration.seconds);
		}
		if (new_diff_duration.minutes !== this.#diff_duration.minutes) {
			this.#emitUpdateMinutes(new_diff_duration.minutes);
		}
		if (new_diff_duration.hours !== this.#diff_duration.hours) {
			this.#emitUpdateHours(new_diff_duration.hours);
		}
		if (new_diff_duration.days !== this.#diff_duration.days) {
			this.#emitUpdateDays(new_diff_duration.days);
		}
		if (new_diff_duration.total_days !== this.#diff_duration.total_days) {
			this.#emitUpdateTotalDays(new_diff_duration.total_days);
		}

		this.#diff_duration = new_diff_duration;
	}

	#intervalUpdate() {
		this.#datetime_now = dayjs();
		const new_diff_duration = getDiffDuration(
			this.#datetime_now,
			this.#datetime_target,
		);
		this.#innerEmitUpdate(new_diff_duration);
	}

	/** @param {number} timeout */
	#innerStartInterval(timeout) {
		this.#intervalUpdate();
		this.interval_id = setInterval(this.#intervalUpdate.bind(this), timeout);
	}

	/**
	 * Set interval timeout to new_timeout then immediately updates countdown.
	 * @param {number} new_timeout
	 */
	setIntervalTimeout(new_timeout) {
		if (new_timeout === null) {
			console.error("Invalid new_timeout");
		} else {
			clearInterval(this.interval_id);
			this.#innerStartInterval(new_timeout);
		}
	}

	emitAll() {
		this.#emitUpdateMilliseconds(this.#diff_duration.milliseconds);
		this.#emitUpdateSeconds(this.#diff_duration.seconds);
		this.#emitUpdateMinutes(this.#diff_duration.minutes);
		this.#emitUpdateHours(this.#diff_duration.hours);
		this.#emitUpdateDays(this.#diff_duration.days);
		this.#emitUpdateTotalDays(this.#diff_duration.total_days);
	}

	/** @param {number} timeout */
	start(timeout) {
		this.emitAll();
		this.#innerStartInterval(typeof timeout === "number" ? timeout : 500);
	}

	/** @param {Object} new_datetime_target */
	updateDatetimeTarget(new_datetime_target) {
		this.#datetime_target = new_datetime_target;
		const new_diff_duration = getDiffDuration(
			this.#datetime_now,
			this.#datetime_target,
		);
		this.#innerEmitUpdate(new_diff_duration);
	}
}

class DisplayState extends EventTarget {
	state;
	num_states;
	#local_storage_name;

	/**
	 * The state of a display.
	 * @param {number} state an integer representing the state. Usually this is an enum value.
	 * @param {number} num_states the max number of states it has.
	 * @param {String} local_storage_name where to load and save the state.
	 */
	constructor(state, num_states, local_storage_name) {
		super();
		this.state = state;
		this.num_states = num_states;
		this.#local_storage_name = local_storage_name;
	}

	#saveState() {
		localStorage.setItem(this.#local_storage_name, String(this.state));
	}

	cycleState() {
		this.state = (this.state + 1) % this.num_states;
		this.#saveState();
	}
}

class CountdownElem {
	/** @type {HTMLElement | null} */
	countdown_elem;

	/** @type {HTMLElement | null} */
	days_elem;
	/** @type {HTMLElement | null} */
	days_label;

	/** @type {HTMLElement | null} */
	hours_elem;
	/** @type {HTMLElement | null} */
	hours_label;

	/** @type {HTMLElement | null} */
	mins_elem;
	/** @type {HTMLElement | null} */
	mins_label;

	/** @type {HTMLElement | null} */
	secs_elem;
	/** @type {HTMLElement | null} */
	secs_label;

	/** @type {HTMLElement | null} */
	millis_elem;

	/**
	 * @param {HTMLElement | null} countdown_elem
	 * @param {HTMLElement | null} days_elem
	 * @param {HTMLElement | null} days_label
	 * @param {HTMLElement | null} hours_elem
	 * @param {HTMLElement | null} hours_label
	 * @param {HTMLElement | null} mins_elem
	 * @param {HTMLElement | null} mins_label
	 * @param {HTMLElement | null} secs_elem
	 * @param {HTMLElement | null} secs_label
	 * @param {HTMLElement | null} millis_elem
	 */
	constructor(
		countdown_elem,
		days_elem,
		days_label,
		hours_elem,
		hours_label,
		mins_elem,
		mins_label,
		secs_elem,
		secs_label,
		millis_elem,
	) {
		this.countdown_elem = countdown_elem;
		this.days_elem = days_elem;
		this.days_label = days_label;
		this.hours_elem = hours_elem;
		this.hours_label = hours_label;
		this.mins_elem = mins_elem;
		this.mins_label = mins_label;
		this.secs_elem = secs_elem;
		this.secs_label = secs_label;
		this.millis_elem = millis_elem;
	}
}

class CountdownDisplay {
	/** @type {DisplayState} */
	#inner_state;
	/** @type {CountdownElem | null} */
	#elem;
	/** @type {Countdown} */
	#countdown;

	/**
	 * @param {Countdown} countdown
	 * @param {DisplayState} display_state
	 */
	constructor(countdown, display_state) {
		if (!(countdown instanceof Countdown)) {
			throw new Error(
				'Constructed CountdownDisplay with countdown of "' +
					countdown.constructor.name +
					'" instead of expected class of "Countdown"',
			);
		}

		if (!(display_state instanceof DisplayState)) {
			throw new Error(
				'Constructed CountdownDisplay with display_state of "' +
					display_state.constructor.name +
					'" instead of expected class of "DisplayState"',
			);
		}

		this.#inner_state = display_state;
		this.#elem = null;
		this.#countdown = countdown;
	}

	/** @returns {number} */
	#getTimeout() {
		switch (this.#inner_state.state) {
			case CountdownState.CompactFull:
				return 51;

			case CountdownState.CompactNoMillis:
			case CountdownState.Blocky:
				return 500;

			default:
				throw new Error("Invalid state");
		}
	}

	#startCountdown() {
		this.#countdown.addEventListener(
			"milliseconds",
			this.#updateMilliseconds.bind(this),
		);
		this.#countdown.addEventListener("seconds", this.#updateSeconds.bind(this));
		this.#countdown.addEventListener("minutes", this.#updateMinutes.bind(this));
		this.#countdown.addEventListener("hours", this.#updateHours.bind(this));
		this.#countdown.addEventListener("days", this.#updateDays.bind(this));
		this.#countdown.addEventListener(
			"totaldays",
			this.#updateTotalDays.bind(this),
		);

		this.#countdown.start(this.#getTimeout());
	}

	/** @param {CustomEvent} event */
	#updateMilliseconds(event) {
		switch (this.#inner_state.state) {
			case CountdownState.CompactFull:
				this.#elem.millis_elem.textContent = String(event.detail).padStart(
					3,
					"0",
				);
				break;

			case CountdownState.CompactNoMillis:
			case CountdownState.Blocky:
				break;

			default:
				throw new Error("Invalid state");
		}
	}

	/** @param {CustomEvent} event */
	#updateSeconds(event) {
		switch (this.#inner_state.state) {
			case CountdownState.CompactFull:
			case CountdownState.CompactNoMillis:
				this.#elem.secs_elem.textContent = String(event.detail).padStart(
					2,
					"0",
				);
				break;

			case CountdownState.Blocky:
				this.#elem.secs_elem.textContent = String(event.detail);
				break;

			default:
				throw new Error("Invalid state");
		}
	}

	/** @param {CustomEvent} event */
	#updateMinutes(event) {
		switch (this.#inner_state.state) {
			case CountdownState.CompactFull:
			case CountdownState.CompactNoMillis:
				this.#elem.mins_elem.textContent = String(event.detail).padStart(
					2,
					"0",
				);
				break;

			case CountdownState.Blocky:
				this.#elem.mins_elem.textContent = String(event.detail);
				break;

			default:
				throw new Error("Invalid state");
		}
	}

	/** @param {CustomEvent} event */
	#updateHours(event) {
		switch (this.#inner_state.state) {
			case CountdownState.CompactFull:
			case CountdownState.CompactNoMillis:
				this.#elem.hours_elem.textContent = String(event.detail).padStart(
					2,
					"0",
				);
				break;

			case CountdownState.Blocky:
				this.#elem.hours_elem.textContent = String(event.detail);
				break;

			default:
				throw new Error("Invalid state");
		}
	}

	/** @param {CustomEvent} event */
	#updateDays(event) {
		switch (this.#inner_state.state) {
			case CountdownState.CompactFull:
			case CountdownState.CompactNoMillis:
			case CountdownState.Blocky:
				break;

			default:
				throw new Error("Invalid state");
		}
	}

	/** @param {CustomEvent} event */
	#updateTotalDays(event) {
		switch (this.#inner_state.state) {
			case CountdownState.CompactFull:
			case CountdownState.CompactNoMillis:
			case CountdownState.Blocky:
				this.#elem.days_elem.textContent = String(event.detail);
				break;

			default:
				throw new Error("Invalid state");
		}
	}

	/** TODO: fix this steaming pile of garbage */
	#updateDisplayDOM() {
		switch (this.#inner_state.state) {
			case CountdownState.CompactFull:
				this.#elem.countdown_elem.classList.replace("blocky", "inline");
				this.#elem.days_label.textContent = ":";
				this.#elem.hours_label.textContent = ":";
				this.#elem.mins_label.textContent = ":";
				this.#elem.secs_label.textContent = ".";

				if (this.#elem.secs_label === null) {
					const secs_label = document.createElement("label");
					secs_label.id = "secs-label";
					secs_label.htmlFor = "countdown-secs";

					this.#elem.countdown_elem.appendChild(secs_label);
					this.#elem.secs_label = secs_label;
				}

				if (this.#elem.millis_elem === null) {
					const millis_elem = document.createElement("p");
					millis_elem.id = "countdown-millis";

					this.#elem.countdown_elem.appendChild(millis_elem);
					this.#elem.millis_elem = millis_elem;
				}

				break;

			case CountdownState.CompactNoMillis:
				this.#elem.countdown_elem.classList.replace("blocky", "inline");
				if (this.#elem.millis_elem !== null) {
					this.#elem.millis_elem.remove();
					this.#elem.millis_elem = null;
				}

				if (this.#elem.secs_label !== null) {
					this.#elem.secs_label.remove();
					this.#elem.secs_label = null;
				}

				break;

			case CountdownState.Blocky:
				if (this.#elem.millis_elem !== null) {
					this.#elem.millis_elem.remove();
					this.#elem.millis_elem = null;
				}

				if (this.#elem.secs_label === null) {
					const secs_label = document.createElement("label");
					secs_label.id = "secs-label";
					secs_label.htmlFor = "countdown-secs";

					this.#elem.countdown_elem.appendChild(secs_label);
					this.#elem.secs_label = secs_label;
				}

				this.#elem.days_label.textContent = "D";
				this.#elem.hours_label.textContent = "H";
				this.#elem.mins_label.textContent = "M";
				this.#elem.secs_label.textContent = "S";

				this.#elem.countdown_elem.classList.replace("inline", "blocky");
				break;

			default:
				throw new Error("Invalid state");
		}
		if (this.#countdown.interval_id !== null) {
			this.#countdown.setIntervalTimeout(this.#getTimeout());
		}
	}

	/**
	 * TODO: update font size when text length changes, e.g. 'days' goes from
	 * 999 to 1000
	 * This only works because we're using a mono-spaced font.
	 * */
	#updateFontSize() {
		// With a 5:3 ratio, a font size of 5vw results in character width of 3vw
		const font_size_to_width_ratio = 5 / 3;
		const font_size_to_height_ratio = 5 / 4;

		let text_len = null;
		let text_num_lines = null;

		switch (this.#inner_state.state) {
			case CountdownState.CompactFull:
			case CountdownState.CompactNoMillis:
				text_len = String(this.#elem.countdown_elem.textContent).length;
				text_num_lines = 1;
				break;

			case CountdownState.Blocky:
				text_len =
					Math.max(
						String(this.#elem.days_elem.textContent).length,
						String(this.#elem.hours_elem.textContent).length,
						String(this.#elem.mins_elem.textContent).length,
						String(this.#elem.secs_elem.textContent).length,
					) + 1;
				text_num_lines = 4;
				break;

			default:
				throw new Error("Invalid state");
		}

		/** @type {HTMLElement} */
		const parent_node = this.#elem.countdown_elem.parentNode;

		// use `window.getComputedStyle()` because `parent_node.clientWidth` and
		// `parent_node.offsetWidth` isn't accurate.
		const parent_div_vw = Number.parseFloat(
			window.getComputedStyle(parent_node).maxWidth,
		);
		const parent_div_vh = Number.parseFloat(
			window.getComputedStyle(parent_node).maxHeight,
		);

		const font_size_vw = `${String((font_size_to_width_ratio * parent_div_vw) / text_len)}vw`;
		const font_size_vh = `${String((font_size_to_height_ratio * parent_div_vh) / text_num_lines)}vh`;

		this.#elem.countdown_elem.style.fontSize = `clamp(1.5rem, min(${font_size_vw}, ${font_size_vh}), 20rem)`;
	}

	/** @param {Object} new_datetime_target */
	updateDatetimeTarget(new_datetime_target) {
		this.#countdown.updateDatetimeTarget(new_datetime_target);
	}

	cycleState() {
		this.#inner_state.cycleState();
		this.#updateDisplayDOM();
		this.#countdown.emitAll();
		this.#updateFontSize();
	}

	start() {
		this.#elem = getCountdownElem();
		this.#updateDisplayDOM();
		this.#startCountdown();
		this.#updateFontSize();
	}
}

/** @returns {CountdownElem} */
function getCountdownElem() {
	const countdown_elem = document.getElementById("countdown");
	const days_elem = document.getElementById("countdown-days");
	const days_label = document.getElementById("days-label");
	const hours_elem = document.getElementById("countdown-hours");
	const hours_label = document.getElementById("hours-label");
	const mins_elem = document.getElementById("countdown-mins");
	const mins_label = document.getElementById("mins-label");
	const secs_elem = document.getElementById("countdown-secs");
	const secs_label = document.getElementById("secs-label");
	// Can be null
	const millis_elem = document.getElementById("countdown-millis");

	return new CountdownElem(
		countdown_elem,
		days_elem,
		days_label,
		hours_elem,
		hours_label,
		mins_elem,
		mins_label,
		secs_elem,
		secs_label,
		millis_elem,
	);
}

const countdown_state = new DisplayState(
	Number(localStorage.getItem("countdown_state")) || CountdownState.CompactFull,
	Object.keys(CountdownState).length,
	"countdown_state",
);

const datetime_state = new DisplayState(
	Number(localStorage.getItem("datetime_state")) || DatetimeState.Utc,
	3,
	"datetime_state",
);

/** @type {Object | null} */
let datetime = null;

/** @type {WebSocket | null} */
let websocket = null;
let is_websocket_open = false;
let is_document_visible = true;

function connectWebsocket() {
	websocket = new WebSocket("battlebit/websocket");
	websocket.binaryType = "arraybuffer";
	websocket.addEventListener("message", onWebsocketMessage);
	is_websocket_open = true;
}

function disconnectWebsocket() {
	if (websocket === null) {
		throw new Error("Tried closing websocket but is null");
	}
	is_websocket_open = false;
	websocket.removeEventListener("message", onWebsocketMessage);
	websocket.close();
	websocket = null;
}

connectWebsocket();
// Disconnect websocket when webpage is not visible, to save on server
// resources.
document.addEventListener("visibilitychange", () => {
	is_document_visible = !document.hidden;
	if (is_document_visible === true) {
		connectWebsocket();
	} else if (is_document_visible === false) {
		disconnectWebsocket();
	}
});

websocket.addEventListener("open", (_evt) => {
	is_websocket_open = true;
});

/** @type {CountdownDisplay | null} */
let countdown_display = null;

document.addEventListener("DOMContentLoaded", (_evt) => {
	const datetime_elem = document.getElementById("datetime");
	countdown_display = new CountdownDisplay(
		new Countdown(dayjs(Number(datetime_elem.textContent))),
		countdown_state,
	);

	formatDatetime();
	countdown_display.start();

	document.getElementById("refresh").addEventListener("click", () => {
		if (is_websocket_open) {
			// Increment datetime
			websocket.send(new Int8Array(0));
		}
	});

	document.getElementById("countdown").addEventListener("click", () => {
		countdown_display.cycleState();
	});

	document.getElementById("datetime").addEventListener("click", () => {
		datetime_state.cycleState();
		updateDatetimeDisplay();
	});
});

/** @param {MessageEvent} event */
function onWebsocketMessage(event) {
	if (datetime !== null && countdown_display !== null) {
		datetime = dayjs(Number(event.data));
		updateDatetimeDisplay();
		countdown_display.updateDatetimeTarget(datetime);
	}
}

function updateDatetimeDisplay() {
	const datetime_elem = document.getElementById("datetime");
	switch (datetime_state.state) {
		case DatetimeState.Utc:
			datetime_elem.textContent = datetime.toString();
			break;
		case DatetimeState.Iso8601:
			datetime_elem.textContent = datetime.toISOString();
			break;
		case DatetimeState.LocalTimezone:
			// // Kind of silly, but don't use `Date.toString()` because it
			// // includes timezone name and it might dox people.
			datetime_elem.textContent = datetime.format(
				"ddd, DD MMM YYYY HH:mm:ss [GMT]ZZ",
			);
			break;
		default:
			break;
	}
}

function formatDatetime() {
	const datetime_elem = document.getElementById("datetime");
	datetime = dayjs(Number(datetime_elem.textContent));
	updateDatetimeDisplay();
}
