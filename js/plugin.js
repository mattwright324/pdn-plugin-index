import * as util from "util";

/** Plugin Type dropdown value -> lowercase plugin type. */
const TYPE_FILTERS = {
    "effect": "effect",
    "adjustment": "adjustment",
    "filetype": "filetype",
    "plugin-pack": "plugin pack",
    "external": "external resource",
};

const ACTIVE_STATUSES = new Set(["new", "active", "bundled"]);
const VALID_STATUSES = new Set([...ACTIVE_STATUSES, "deprecated", "obsolete", "incompatible", "unsupported", "integrated"]);
const VALID_TYPES = new Set(Object.values(TYPE_FILTERS));
const DESC_PREVIEW_LENGTH = 450;

let instanceCount = 0;

const isBlank = (value) => value == null || String(value).trim() === "";
const isPositiveNumber = (value) => typeof value === "number" && value > 0;
const plural = (count, unit) => `${count} ${unit}${count === 1 ? "" : "s"}`;

/** A forum topic or profile URL, e.g. https://forums.paint.net/topic/16643-1px-expansion */
const forumUrl = (path, id, name) => `https://forums.paint.net/${path}/${util.escapeHtml(id)}-${util.slugify(name)}`;

/** Descriptions contain <br> tags. Escape everything else. */
const formatDesc = (text) => util.escapeHtml(text).replace(/&lt;br\s*\/?&gt;/gi, "<br>");

/** Where to cut a description for the preview, without splitting a tag or a word. */
function previewCutIndex(desc) {
    let cut = DESC_PREVIEW_LENGTH;
    const lastOpen = desc.lastIndexOf("<", cut - 1);
    if (lastOpen > desc.lastIndexOf(">", cut - 1)) {
        cut = lastOpen;
    }
    const lastSpace = desc.lastIndexOf(" ", cut);
    if (lastSpace > cut - 40) {
        cut = lastSpace;
    }
    return cut;
}

/**
 * @typedef {Object} RawPluginData - a plugin in index/plugin-index.json
 * @property {string} title
 * @property {string} author
 * @property {number} author_id - forum profile ID
 * @property {number} topic_id - forum topic ID
 * @property {string} desc - may contain <br>
 * @property {string} type - e.g. "Effect", "Adjustment"
 * @property {string} release - date
 * @property {string} status - e.g. "Active", "New"
 * @property {string} compatibility - Paint.NET versions
 * @property {string} dlls - comma-separated
 * @property {string} menu
 * @property {number} [alt_topic] - "See also" topic ID
 */

export class Plugin {
    #data;
    #id = ++instanceCount;
    #release;
    #altPlugin;
    #element;

    // Lowercase, for filtering
    #authorKey;
    #menuKey;
    #typeKey;
    #statusKey;

    /** @param {RawPluginData} data */
    constructor(data) {
        this.#data = {...data};
        this.#release = new Date(data.release);
        this.#authorKey = util.lower(data.author);
        this.#menuKey = util.lower(data.menu);
        this.#typeKey = util.lower(data.type);
        this.#statusKey = util.lower(data.status);
    }

    /** Unique, unlike topic IDs: a plugin pack shares its topic with its plugins. */
    get id() {
        return this.#id;
    }

    get topicId() {
        return this.#data.topic_id;
    }

    get title() {
        return this.#data.title;
    }

    get author() {
        return this.#data.author;
    }

    get menu() {
        return this.#data.menu;
    }

    get release() {
        return this.#release;
    }

    get isActive() {
        return ACTIVE_STATUSES.has(this.#statusKey);
    }

    get isNew() {
        return this.#statusKey === "new";
    }

    /** Built on first access. */
    get element() {
        return this.#element ??= util.htmlToElement(this.#toHtml());
    }

    static #timeSince(date, now = new Date()) {
        if (isNaN(date)) {
            return "Release date unknown";
        }

        let months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
        if (now.getDate() < date.getDate()) {
            months--;
        }
        const years = Math.floor(months / 12);
        months %= 12;

        if (years > 0 || months > 0) {
            const parts = [years > 0 && plural(years, "year"), months > 0 && plural(months, "month")].filter(Boolean);
            return `Released ${parts.join(" ")} ago`;
        }

        const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
        return days > 0 ? `Released ${plural(days, "day")} ago` : "Released today";
    }

    /** @param {keyof RawPluginData} name */
    field(name) {
        return String(this.#data[name] ?? "");
    }

    /**
     * Find the "See also" plugin for alt_topic.
     * @param {Object<number, Plugin[]>} pluginsByTopic
     */
    resolveAltPlugin(pluginsByTopic) {
        const candidates = (pluginsByTopic[this.#data.alt_topic] || []).filter(p => p.title !== this.title);
        this.#altPlugin = candidates.find(p => p.#typeKey === "plugin pack") || candidates[0];
    }

    /** @param {string} filterStatus - any | new | active | inactive */
    matchesStatus(filterStatus) {
        switch (filterStatus) {
            case "new":
                return this.isNew;
            case "active":
                return this.isActive;
            case "inactive":
                return !this.isActive;
            default:
                return true;
        }
    }

    /** @param {string} filterType - "any" or a key of TYPE_FILTERS */
    matchesType(filterType) {
        return filterType === "any" || this.#typeKey === TYPE_FILTERS[filterType];
    }

    /** The dropdown filters, from normalizeFilters(). Keywords are matched in search.js. */
    matchesFilters(filters) {
        return this.matchesStatus(filters.status)
            && this.matchesType(filters.type)
            && (filters.author === "any" || this.#authorKey === filters.author)
            && (filters.menu === "any" || this.#menuKey === filters.menu);
    }

    /** @returns {string[]} HTML-safe issue descriptions */
    validate() {
        const data = this.#data;
        const issues = [];

        const logIssue = (value, reason) => {
            issues.push(`Plugin [topic_id=${util.escapeHtml(data.topic_id)} title=${util.escapeHtml(data.title)}]<br>`
                + `Issue ${reason} [value=${util.escapeHtml(value)}]`);
            console.log(`${reason} [value=${value}] - ${JSON.stringify(data)}`);
        };

        if (isNaN(this.#release)) {
            logIssue(data.release, "INVALID DATE");
        }
        if (!isPositiveNumber(data.topic_id)) {
            logIssue(data.topic_id, "INVALID TOPIC_ID");
        }
        if (!isPositiveNumber(data.author_id)) {
            logIssue(data.author_id, "INVALID AUTHOR ID");
        }
        if (data.alt_topic && !isPositiveNumber(data.alt_topic)) {
            logIssue(data.alt_topic, "INVALID ALT_TOPIC");
        }
        if (!VALID_TYPES.has(this.#typeKey)) {
            logIssue(data.type, "INVALID TYPE");
        }
        if (!VALID_STATUSES.has(this.#statusKey)) {
            logIssue(data.status, "INVALID STATUS");
        }
        for (const field of ["title", "author", "desc", "compatibility", "menu", "dlls"]) {
            if (isBlank(data[field])) {
                logIssue(data[field], `EMPTY ${field === "compatibility" ? "COMPAT" : field.toUpperCase()}`);
            }
        }

        return issues;
    }

    #toHtml() {
        const data = this.#data;
        const esc = util.escapeHtml;
        const dlls = this.field("dlls").split(",").map(s => s.trim()).filter(Boolean);
        const statusClass = this.isNew ? "is-new" : this.isActive ? "" : "is-inactive";
        const dot = `<i class="bi bi-dot" aria-hidden="true"></i>`;

        return `<article class="plugin">
            <h2 class="title"><a target="_blank" href="${forumUrl("topic", data.topic_id, data.title)}">${esc(data.title)}</a></h2>
            <p class="desc">${this.#descHtml()}</p>
            ${this.#altHtml()}
            <div class="tags">
                <span class="tag tag-author"><a target="_blank" href="${forumUrl("profile", data.author_id, data.author)}" title="View ${esc(data.author)}'s profile"><i class="bi bi-person-circle"></i> ${esc(data.author)}</a></span>${dot}
                <span class="tag tag-date" title="Published on ${esc(this.#release.toLocaleDateString())}">${Plugin.#timeSince(this.#release)}</span>${dot}
                <span class="tag tag-type" title="Plugin Type">${esc(data.type)}</span>
                <span class="tag tag-status ${statusClass}" title="Plugin Status">${esc(data.status)}</span>
                <span class="tag tag-compat" title="Released under PDN version&hellip;">${esc(data.compatibility)}</span>
                <span class="tag tag-menu" title="Menu Location">${esc(data.menu || "N/A")}</span>
                <span class="tag tag-dll" title="${esc(dlls.join("\n") || "N/A")}">${Plugin.#dllHtml(dlls)}</span>
            </div>
        </article>`;
    }

    /** Long descriptions are cut, with a "Show more" button for the rest. */
    #descHtml() {
        const desc = this.field("desc");
        if (desc.length <= DESC_PREVIEW_LENGTH) {
            return formatDesc(desc);
        }
        const cut = previewCutIndex(desc);
        const moreId = `plugin-more-${this.#id}`;
        return `${formatDesc(desc.substring(0, cut))}<span class="ellipsis">...</span>`
            + `<span id="${moreId}" class="desc-more">${formatDesc(desc.substring(cut))}</span><br>`
            + `<button type="button" class="btn btn-link p-0 desc-toggle" `
            + `aria-expanded="false" aria-controls="${moreId}">Show more</button>`;
    }

    #altHtml() {
        const altTopic = this.#data.alt_topic;
        if (isBlank(altTopic)) {
            return "";
        }
        const title = this.#altPlugin?.title;
        const url = forumUrl("topic", altTopic, title ?? "unknown");
        return `<div class="alt">See also: <a target="_blank" href="${url}">${util.escapeHtml(title ?? "#" + altTopic)}</a></div>`;
    }

    /** The first DLL, and how many more there are. */
    static #dllHtml(dlls) {
        if (!dlls.length || dlls.join().toLowerCase() === "n/a") {
            return "N/A";
        }
        const more = dlls.length > 1 ? ` <span class="dll-more">and ${dlls.length - 1} more</span>` : "";
        return `<span class="dll-name">${util.escapeHtml(dlls[0])}</span>${more}`;
    }
}
