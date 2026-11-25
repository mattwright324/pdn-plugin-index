import {ui} from "dom";
import * as util from "util";

/** Default value of each filter. The keys are also the URL parameter names, in permalink order. */
export const DEFAULTS = Object.freeze({
    keywords: "",
    keywordStyle: "any",
    author: "any",
    type: "any",
    status: "active",
    menu: "any",
    order: "release_new",
});

/** The control for each filter, keyed like DEFAULTS. */
const CONTROLS = Object.freeze({
    keywords: ui.inputKeywords,
    keywordStyle: ui.comboKeywordStyle,
    author: ui.comboAuthor,
    type: ui.comboType,
    status: ui.comboStatus,
    menu: ui.comboMenu,
    order: ui.comboOrder,
});

const lower = (value) => String(value ?? "").trim().toLowerCase();

/** Current raw control values, keyed like DEFAULTS. */
export function readFilters() {
    return Object.fromEntries(Object.entries(CONTROLS).map(([key, control]) => [key, control.value]));
}

export function resetFilters() {
    for (const [key, control] of Object.entries(CONTROLS)) {
        control.value = DEFAULTS[key];
    }
}

/**
 * Prepare filter values for Plugin.shouldDisplay(): once per refresh, rather than once per plugin.
 */
export function normalizeFilters(filters = readFilters()) {
    const f = {...DEFAULTS, ...filters};
    const keywordStyle = lower(f.keywordStyle);
    const keywords = String(f.keywords).toUpperCase().trim();

    return {
        keywordStyle,
        terms: keywordStyle === "exact"
            ? (keywords ? [keywords] : [])
            : keywords.split(/\s+/).filter(Boolean),
        status: lower(f.status),
        type: lower(f.type),
        author: lower(f.author) || "any",
        menu: lower(f.menu) || "any",
    };
}

/**
 * Add the Author and Menu options, and the plugin counts on the Status and Type options.
 * @param {Plugin[]} plugins
 */
export function initFilterOptions(plugins) {
    const optionHtml = (name, text) =>
        `<option value="${util.escapeHtml(lower(name))}">${util.escapeHtml(text)}</option>`;

    const authorGroups = Object.groupBy(plugins, ({author}) => author);
    ui.comboAuthor.insertAdjacentHTML("beforeend", Object.keys(authorGroups)
        .sort(util.alphaSort)
        .map(name => optionHtml(name, `${name} (${authorGroups[name].length})`))
        .join(""));

    const menuGroups = Object.groupBy(plugins, ({menu}) => menu);
    ui.comboMenu.insertAdjacentHTML("beforeend", Object.keys(menuGroups)
        .sort(util.alphaSort)
        .map(name => optionHtml(name, name))
        .join(""));

    const appendCounts = (select, matches) => {
        for (const option of select.options) {
            option.text += ` (${plugins.filter(p => matches(p, option.value)).length})`;
        }
    };
    appendCounts(ui.comboStatus, (p, value) => p.matchesStatus(value));
    appendCounts(ui.comboType, (p, value) => p.matchesType(value));
}

/**
 * Apply filter values from the URL. Unknown keys and values are ignored.
 * Call after initFilterOptions(), so the Author and Menu values exist.
 */
export function applyUrlParams() {
    for (const [key, rawValue] of new URL(window.location).searchParams) {
        const control = CONTROLS[key];
        if (!control) {
            continue;
        }

        if (control === ui.inputKeywords) {
            control.value = rawValue.trim();
            continue;
        }

        const value = lower(rawValue);
        if (util.hasOption(control, value)) {
            control.value = value;
        }
    }
}

/** A link to the current filters: to the forum post when embedded, otherwise to this page. */
export function buildPermalink() {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(readFilters())) {
        if (value.trim() !== DEFAULTS[key]) {
            params.append(key, value.trim());
        }
    }

    const hostUrl = (window !== window.parent)
        ? 'https://forums.paint.net/PluginIndex'
        : window.location.origin + window.location.pathname;

    return hostUrl + '?' + params.toString();
}
