import {ui} from "dom";
import * as util from "util";

/** Keys are the URL parameter names, in permalink order. */
export const DEFAULTS = Object.freeze({
    keywords: "",
    keywordStyle: "all",
    author: "any",
    type: "any",
    status: "active",
    menu: "any",
    order: "relevance",
});

const CONTROLS = Object.freeze({
    keywords: ui.inputKeywords,
    keywordStyle: ui.comboKeywordStyle,
    author: ui.comboAuthor,
    type: ui.comboType,
    status: ui.comboStatus,
    menu: ui.comboMenu,
    order: ui.comboOrder,
});

const readFilters = () => Object.fromEntries(Object.entries(CONTROLS).map(([key, control]) => [key, control.value.trim()]));

export function resetFilters() {
    for (const [key, control] of Object.entries(CONTROLS)) {
        control.value = DEFAULTS[key];
    }
}

/** The current filters, with everything but the keywords lowercase. */
export function normalizeFilters() {
    const {keywords, ...options} = readFilters();
    return {keywords, ...Object.fromEntries(Object.entries(options).map(([key, value]) => [key, util.lower(value)]))};
}

/** Add the Author and Menu options, and the plugin counts on the Status and Type options. */
export function initFilterOptions(plugins) {
    const addOptions = (select, groups, label) => select.insertAdjacentHTML("beforeend", Object.keys(groups)
        .sort(util.alphaSort)
        .map(name => `<option value="${util.escapeHtml(util.lower(name))}">${util.escapeHtml(label(name))}</option>`)
        .join(""));

    const authors = util.groupBy(plugins, plugin => plugin.author);
    addOptions(ui.comboAuthor, authors, name => `${name} (${authors[name].length})`);
    addOptions(ui.comboMenu, util.groupBy(plugins, plugin => plugin.menu), name => name);

    const appendCounts = (select, matches) => {
        for (const option of select.options) {
            option.text += ` (${plugins.filter(plugin => matches(plugin, option.value)).length})`;
        }
    };
    appendCounts(ui.comboStatus, (plugin, value) => plugin.matchesStatus(value));
    appendCounts(ui.comboType, (plugin, value) => plugin.matchesType(value));
}

/** Apply filters from the URL, ignoring unknown keys and values. Call after initFilterOptions(). */
export function applyUrlParams() {
    for (const [key, value] of new URL(window.location).searchParams) {
        const control = CONTROLS[key];
        if (key === "keywords") {
            control.value = value.trim();
        } else if (control && util.hasOption(control, util.lower(value))) {
            control.value = util.lower(value);
        }
    }
}

/** A link to the current filters: to the forum post when embedded, otherwise to this page. */
export function buildPermalink() {
    const params = new URLSearchParams(Object.entries(readFilters()).filter(([key, value]) => value !== DEFAULTS[key]));
    const hostUrl = window !== window.parent
        ? "https://forums.paint.net/PluginIndex"
        : window.location.origin + window.location.pathname;
    return `${hostUrl}?${params}`;
}
