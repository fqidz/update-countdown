// @ts-check
"use strict";

// TODO: Figure out a better way to do this. It feels very messy & not safe due to using a `Map`.
export class CountdownElem {
    /** @type {Map<string, HTMLElement | null>} */
    elems;

    constructor() {
        this.elems = new Map();

        this.elems.set(
            "countdown",
            document.getElementById("countdown") ?? assertElementExists("countdown")
        );
        this.elems.set(
            "countdown-days",
            document.getElementById("countdown-days") ?? assertElementExists("countdown-days")
        );
        this.elems.set(
            "days-label",
            document.getElementById("days-label") ?? assertElementExists("days-label")
        );
        this.elems.set(
            "countdown-hours",
            document.getElementById("countdown-hours") ?? assertElementExists("countdown-hours")
        );
        this.elems.set(
            "hours-label",
            document.getElementById("hours-label") ?? assertElementExists("hours-label")
        );
        this.elems.set(
            "countdown-minutes",
            document.getElementById("countdown-minutes") ?? assertElementExists("countdown-minutes")
        );
        this.elems.set(
            "minutes-label",
            document.getElementById("minutes-label") ?? assertElementExists("minutes-label")
        );
        this.elems.set(
            "countdown-seconds",
            document.getElementById("countdown-seconds") ?? assertElementExists("countdown-seconds")
        );

        // The following can all be null
        this.elems.set("countdown-milliseconds", document.getElementById("countdown-milliseconds"));

        this.elems.set("hours-container", document.getElementById("hours-container"));
        this.elems.set("hours-spacer", document.getElementById("hours-spacer"));

        this.elems.set("minutes-container", document.getElementById("minutes-container"));
        this.elems.set("minutes-spacer", document.getElementById("minutes-spacer"));

        this.elems.set("seconds-container", document.getElementById("seconds-container"));
        this.elems.set("seconds-spacer", document.getElementById("seconds-spacer"));

        this.elems.set("seconds-label", document.getElementById("seconds-label"));
    }

    /** @param {HTMLElement} elem */
    #append_to_root_elem(elem) {
        const countdown = this.elems.get("countdown");
        if (countdown !== null && countdown !== undefined) {
            countdown.appendChild(elem);
            this.elems.set(elem.id, elem);
        } else {
            throw new Error("Countdown root element not found: id='countdown'");
        }
    }

    /**
     * @param {string} elem_id
     * @param {string} tag_name
     **/
    #create_and_append_element_if_null(elem_id, tag_name) {
        let elem = this.elems.get(elem_id);
        if (elem === null) {
            elem = document.createElement(tag_name);
            elem.id = elem_id;

            this.#append_to_root_elem(elem);
        } else if (elem === undefined) {
            throw new Error(`Element was not initialized: 'id=${elem_id}'`)
        }
        // no-op if element already exists
    }

    /**
     * @param {string} label_id
     **/
    #create_and_append_label_if_null(label_id) {
        let label = this.elems.get(label_id);
        if (label === null) {
            label = document.createElement("span");
            label.id = label_id;

            this.#append_to_root_elem(label);
        } else if (label === undefined) {
            throw new Error(`Label was not initialized: 'id=${label_id}'`)
        }
        // no-op if element already exists
    }

    /**
     * @param {string} elem_id
     * @throws {Error}
     * @returns {HTMLElement}
     **/
    get_elem_or_throw(elem_id) {
        const elem = this.elems.get(elem_id);
        if (elem === null) {
            throw new Error(`Element does not exist: 'id=${elem_id}'`)
        } else if (elem === undefined) {
            throw new Error(`Element was not initialized: 'id=${elem_id}'`)
        } else {
            return elem;
        }
    }

    /**
    * @param {string} elem_id
    * @throws {Error}
    * */
    #remove_elem(elem_id) {
        const elem = this.elems.get(elem_id);
        if (elem === null) {
            // no-op
        } else if (elem === undefined) {
            throw new Error(`Element was not initialized: 'id=${elem_id}'`)
        } else {
            elem?.remove();
            this.elems.set(elem_id, null);
        }
    }

    /**
     * @param {string} container_id
     * @param {string} spacer_id
     * @param {string} target_replace_id
     **/
    #replace_with_container(container_id, spacer_id, target_replace_id) {
        if (this.elems.get(container_id) === null) {
            const replacement_elem = document.createElement("span");
            replacement_elem.id = target_replace_id;
            replacement_elem.style.display = "inline";

            const spacer = document.createElement("span");
            spacer.id = spacer_id;
            spacer.className = "spacer";
            spacer.style.display = "inline";
            spacer.ariaHidden = "true";

            const container = document.createElement("div");
            container.id = container_id;
            // container.style.display = "inline";

            container.appendChild(spacer);
            container.appendChild(replacement_elem);

            this.get_elem_or_throw(target_replace_id).replaceWith(container);

            this.elems.set(container_id, container);
            this.elems.set(spacer_id, spacer);
            this.elems.set(target_replace_id, replacement_elem);
        } else if (this.elems.get(container_id) === undefined) {
            throw new Error(`Container was not initialized: 'id=${container_id}'`)
        }
        // no-op if container already exists
    }

    /**
     * @param {string} container_id
     * @param {string} spacer_id
     * @param {string} inner_elem_id
     **/
    #restore_container(container_id, spacer_id, inner_elem_id) {
        const container = this.elems.get(container_id);
        if (container === null) {
            // no-op
        } else if (container === undefined) {
            throw new Error(`Container was not initialized: 'id=${container_id}'`)
        } else {
            const inner_elem = this.get_elem_or_throw(inner_elem_id);
            this.elems.set(container_id, null);
            this.elems.set(spacer_id, null);
            this.elems.set(inner_elem_id, inner_elem);

            container.replaceWith(inner_elem);
        }
    }

    /** @param {number} state CountdownState */
    cycle_to_state(state) {
        switch (state) {
            case CountdownState.CompactNoMillis:
                this.#remove_elem("seconds-label");
                this.#remove_elem("countdown-milliseconds");

                this.#restore_container("hours-container", "hours-spacer", "countdown-hours");
                this.#restore_container("minutes-container", "minutes-spacer", "countdown-minutes");
                this.#restore_container("seconds-container", "seconds-spacer", "countdown-seconds");

                this.get_elem_or_throw("days-label").textContent = ":";
                this.get_elem_or_throw("hours-label").textContent = ":";
                this.get_elem_or_throw("minutes-label").textContent = ":";

                this.get_elem_or_throw("countdown").classList.replace("blocky", "inline");
                this.get_elem_or_throw("countdown").role = "time";
                break;

            case CountdownState.Compact:
                this.#create_and_append_label_if_null("seconds-label");
                this.#create_and_append_element_if_null("countdown-milliseconds", "span");

                this.#restore_container("hours-container", "hours-spacer", "countdown-hours");
                this.#restore_container("minutes-container", "minutes-spacer", "countdown-minutes");
                this.#restore_container("seconds-container", "seconds-spacer", "countdown-seconds");

                this.get_elem_or_throw("days-label").textContent = ":";
                this.get_elem_or_throw("hours-label").textContent = ":";
                this.get_elem_or_throw("minutes-label").textContent = ":";
                this.get_elem_or_throw("seconds-label").textContent = ".";

                this.get_elem_or_throw("countdown").classList.replace("blocky", "inline");
                this.get_elem_or_throw("countdown").role = "time";
                break;

            case CountdownState.Blocky:
                this.#create_and_append_label_if_null("seconds-label");
                this.#remove_elem("countdown-milliseconds");

                this.get_elem_or_throw("days-label").textContent = "D";
                this.get_elem_or_throw("hours-label").textContent = "H";
                this.get_elem_or_throw("minutes-label").textContent = "M";
                this.get_elem_or_throw("seconds-label").textContent = "S";

                this.#replace_with_container("hours-container", "hours-spacer", "countdown-hours");
                this.#replace_with_container("minutes-container", "minutes-spacer", "countdown-minutes");
                this.#replace_with_container("seconds-container", "seconds-spacer", "countdown-seconds");

                this.get_elem_or_throw("countdown").classList.replace("inline", "blocky");
                this.get_elem_or_throw("countdown").role = null;
                break;

            default:
                throw new Error("Invalid state");
        }
    }
}
