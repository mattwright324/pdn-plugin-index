import {ui} from "dom";
import * as util from "util";
import {DEFAULTS, normalizeFilters} from "filters";

const SORTS = {
    release_new: (a, b) => b.release - a.release,
    release_old: (a, b) => a.release - b.release,
    title: (a, b) => util.alphaSort(a.title, b.title),
    author: (a, b) => util.alphaSort(a.author, b.author),
    menu: (a, b) => util.alphaSort(a.menu, b.menu),
};

/** @type {Plugin[]} */
let plugins = [];

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

        let displayCount = 0;
        for (const plugin of plugins) {
            const show = plugin.shouldDisplay(filters);
            plugin.element.hidden = !show;
            displayCount += show ? 1 : 0;
        }

        if (reorder || list.childElementCount !== plugins.length) {
            plugins.sort(SORTS[ui.comboOrder.value] ?? SORTS[DEFAULTS.order]);
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
