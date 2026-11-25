import {ui} from "dom";
import * as util from "util";
import {normalizeFilters} from "filters";
import {searchKeywords} from "search";

const SORTS = {
    release_new: (a, b) => b.release - a.release,
    release_old: (a, b) => a.release - b.release,
    title: (a, b) => util.alphaSort(a.title, b.title),
    author: (a, b) => util.alphaSort(a.author, b.author),
    menu: (a, b) => util.alphaSort(a.menu, b.menu),
};

/** "Best match": highest search score first, then newest. */
const relevanceSort = (results) => (a, b) =>
    ((results?.get(b)?.score ?? 0) - (results?.get(a)?.score ?? 0)) || SORTS.release_new(a, b);

/** Add ?debug to the URL to show search scores, and what matched on hover. */
const SHOW_SCORES = new URL(window.location).searchParams.has("debug");

/** @type {Plugin[]} */
let plugins = [];
/** The search the current "Best match" order was sorted for. */
let sortedSearch = null;

/** @param {Plugin[]} list - the plugins to list; sorted in place */
export function setPlugins(list) {
    plugins = list;
}

/**
 * Show/hide each plugin according to the filters.
 * Plugin elements are created once and reused; they are only re-appended when the order changes.
 *
 * @param {boolean} reorder - sort by the selected order and re-append elements
 */
export function refreshListing(reorder = false) {
    try {
        const list = ui.pluginList;
        const filters = normalizeFilters();
        const results = searchKeywords(filters.keywords, filters.keywordStyle);

        let displayCount = 0;
        for (const plugin of plugins) {
            const show = (!results || results.has(plugin)) && plugin.matchesFilters(filters);
            plugin.element.hidden = !show;
            displayCount += show ? 1 : 0;

            if (SHOW_SCORES && show) {
                showScore(plugin, results?.get(plugin));
            }
        }

        const byRelevance = filters.order === "relevance";
        const search = `${filters.keywordStyle}:${filters.keywords}`;
        if (reorder || (byRelevance && search !== sortedSearch) || list.childElementCount !== plugins.length) {
            plugins.sort(byRelevance ? relevanceSort(results) : SORTS[filters.order]);
            sortedSearch = search;

            const fragment = document.createDocumentFragment();
            plugins.forEach(plugin => fragment.appendChild(plugin.element));
            list.replaceChildren(fragment);
        }

        ui.pluginCount.textContent = `${displayCount} / ${plugins.length}`;
    } catch (err) {
        console.error("Refresh failed:", err);
        ui.pluginCount.textContent = "Error";
    }
}

/** @param result - from searchKeywords(); undefined without keywords */
function showScore(plugin, result) {
    let tag = plugin.element.querySelector(".tag-score");
    if (!tag) {
        tag = plugin.element.querySelector(".tags").appendChild(document.createElement("span"));
        tag.className = "tag tag-score";
    }

    const matches = Object.entries(result?.match ?? {}).map(([term, fields]) => `${term}: ${fields.join(", ")}`);
    tag.innerHTML = `<i class="bi bi-dot" aria-hidden="true"></i>${(result?.score ?? 0).toFixed(2)}`;
    tag.title = ["Search score", ...matches].join("\n");
}
