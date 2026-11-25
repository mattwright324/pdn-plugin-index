import * as util from "util";

/** Plugin Type dropdown value -> lowercase plugin type. */
export const TYPE_FILTERS = {
    "effect": "effect",
    "adjustment": "adjustment",
    "filetype": "filetype",
    "plugin-pack": "plugin pack",
    "external": "external resource",
};

const ACTIVE_STATUSES = new Set(["new", "active", "bundled"]);
const VALID_STATUSES = new Set([...ACTIVE_STATUSES, "deprecated", "obsolete", "incompatible", "unsupported", "integrated"]);
const VALID_TYPES = new Set(Object.values(TYPE_FILTERS));
const SEARCH_FIELDS = ["title", "desc", "author", "type", "status", "menu", "dlls"];
const DESC_PREVIEW_LENGTH = 450;

let instanceCount = 0;

const isBlank = (value) => value == null || String(value).trim() === "";
const isPositiveNumber = (value) => typeof value === "number" && value > 0;
const plural = (count, unit) => `${count} ${unit}${count === 1 ? "" : "s"}`;
const lower = (value) => String(value ?? "").trim().toLowerCase();

/**
 * Descriptions intentionally contain <br> tags. Escape everything else.
 */
const formatDesc = (text) => util.escapeHtml(text).replace(/&lt;br\s*\/?&gt;/gi, "<br>");

/**
 * Find where to cut a description for the preview without splitting a tag or a word.
 */
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

export class Plugin {
    /**
     * @typedef {Object} RawPluginData - Data as loaded from the JSON file
     * @property {string} title - The plugin title
     * @property {string} author - The author's name
     * @property {number} author_id - The author's forum ID
     * @property {number} topic_id - The forum topic ID
     * @property {string} desc - The plugin description (may contain <br>)
     * @property {string} type - The plugin type (e.g., "Effect", "Adjustment")
     * @property {string} release - The release date as a string
     * @property {string} status - The plugin status (e.g., "Active", "New")
     * @property {string} compatibility - The Paint.NET version compatibility
     * @property {string} dlls - Comma-separated list of DLL files
     * @property {string} menu - The menu location
     * @property {number} [alt_topic] - Optional alternative topic ID
     */
    #data;
    #id;
    #release;
    #searchText;
    #altPlugin;
    #element;

    /** Lowercase keys used for filtering. */
    authorKey;
    menuKey;
    typeKey;
    statusKey;

    /** @param {RawPluginData} data */
    constructor(data) {
        this.#data = Object.assign({}, data);
        this.#id = ++instanceCount;
        this.#release = new Date(this.#data.release);
        this.#searchText = SEARCH_FIELDS
            .map(field => String(this.#data[field] ?? "").replace(/<br\s*\/?>/gi, " "))
            .join("\n")
            .toUpperCase();

        this.authorKey = lower(this.#data.author);
        this.menuKey = lower(this.#data.menu);
        this.typeKey = lower(this.#data.type);
        this.statusKey = lower(this.#data.status);
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
        return ACTIVE_STATUSES.has(this.statusKey);
    }

    get isNew() {
        return this.statusKey === "new";
    }

    /** The plugin's DOM element, built on first access. */
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

    /**
     * Resolve the "See also" plugin for alt_topic. Call once all plugins are loaded.
     * @param {Object<number, Plugin[]>} pluginsByTopic
     */
    resolveAltPlugin(pluginsByTopic) {
        const candidates = (pluginsByTopic[this.#data.alt_topic] || []).filter(p => p.title !== this.title);
        this.#altPlugin = candidates.find(p => p.typeKey === "plugin pack") || candidates[0];
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
        return filterType === "any" || this.typeKey === TYPE_FILTERS[filterType];
    }

    /**
     * @param filters - result of normalizeFilters() in filters.js
     */
    shouldDisplay(filters) {
        if (filters.terms.length) {
            const contains = term => this.#searchText.includes(term);
            const matched = filters.keywordStyle === "all"
                ? filters.terms.every(contains)
                : filters.terms.some(contains);
            if (!matched) {
                return false;
            }
        }

        return this.matchesStatus(filters.status)
            && this.matchesType(filters.type)
            && (filters.author === "any" || this.authorKey === filters.author)
            && (filters.menu === "any" || this.menuKey === filters.menu);
    }

    /**
     * @returns {string[]} HTML-safe issue descriptions
     */
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
        if (!VALID_TYPES.has(this.typeKey)) {
            logIssue(data.type, "INVALID TYPE");
        }
        if (!VALID_STATUSES.has(this.statusKey)) {
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
        const id = this.#id;
        const desc = String(data.desc ?? "");

        let descHtml = formatDesc(desc);
        if (desc.length > DESC_PREVIEW_LENGTH) {
            const cut = previewCutIndex(desc);
            descHtml = `${formatDesc(desc.substring(0, cut))}<span class="ellipsis">...</span>`
                + `<span id="plugin-more-${id}" class="desc-more">${formatDesc(desc.substring(cut))}</span><br>`
                + `<button type="button" class="btn btn-link p-0 desc-toggle" `
                + `aria-expanded="false" aria-controls="plugin-more-${id}">Show more</button>`;
        }

        let altHtml = "";
        if (!isBlank(data.alt_topic)) {
            const alt = this.#altPlugin;
            const altUrl = `https://forums.paint.net/topic/${esc(data.alt_topic)}-${util.slugify(alt ? alt.title : "unknown")}`;
            altHtml = `<div class="alt">See also: <a target="_blank" href="${altUrl}">${esc(alt ? alt.title : "#" + data.alt_topic)}</a></div>`;
        }

        const dllList = String(data.dlls ?? "").split(",").map(s => s.trim()).filter(Boolean);
        let dllHtml = "N/A";
        if (dllList.length && lower(data.dlls) !== "n/a") {
            dllHtml = `<span class="dll-name">${esc(dllList[0])}</span>`
                + (dllList.length > 1 ? ` <span class="dll-more">and ${dllList.length - 1} more</span>` : "");
        }

        const statusClass = this.isNew ? "is-new" : this.isActive ? "" : "is-inactive";
        const dot = `<i class="bi bi-dot" aria-hidden="true"></i>`;
        const authorUrl = `https://forums.paint.net/profile/${esc(data.author_id)}-${util.slugify(data.author)}`;
        const topicUrl = `https://forums.paint.net/topic/${esc(data.topic_id)}-${util.slugify(data.title)}`;

        return `<article class="plugin">
            <h2 class="title"><a target="_blank" href="${topicUrl}">${esc(data.title)}</a></h2>
            <p class="desc">${descHtml}</p>
            ${altHtml}
            <div class="tags">
                <span class="tag tag-author"><a target="_blank" href="${authorUrl}" title="View ${esc(data.author)}'s profile"><i class="bi bi-person-circle"></i> ${esc(data.author)}</a></span>${dot}
                <span class="tag tag-date" title="Published on ${esc(this.#release.toLocaleDateString())}">${Plugin.#timeSince(this.#release)}</span>${dot}
                <span class="tag tag-type" title="Plugin Type">${esc(data.type)}</span>
                <span class="tag tag-status ${statusClass}" title="Plugin Status">${esc(data.status)}</span>
                <span class="tag tag-compat" title="Released under PDN version&hellip;">${esc(data.compatibility)}</span>
                <span class="tag tag-menu" title="Menu Location">${esc(data.menu || "N/A")}</span>
                <span class="tag tag-dll" title="${esc(dllList.join("\n") || "N/A")}">${dllHtml}</span>
            </div>
        </article>`;
    }
}
