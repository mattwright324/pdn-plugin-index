import {ui} from "dom";
import * as events from "events";
import * as filters from "filters";
import * as listing from "listing";
import * as search from "search";
import * as util from "util";
import {Plugin} from "plugin";

try {
    events.enableDynamicTooltips();

    const response = await fetch("index/plugin-index.json");
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} loading plugin index`);
    }

    const plugins = ((await response.json()).plugin_index ?? []).map(item => new Plugin(item));
    const pluginsByTopic = util.groupBy(plugins, plugin => plugin.topicId);
    plugins.forEach(plugin => plugin.resolveAltPlugin(pluginsByTopic));

    window.index = {plugins, pluginsByTopic};
    console.log(`Loaded ${plugins.length} plugins`, window.index);

    showIssues(plugins);
    search.buildSearchIndex(plugins);
    filters.initFilterOptions(plugins);
    filters.applyUrlParams();

    listing.setPlugins(plugins);
    events.initEventListeners();
    listing.refreshListing(true);
} catch (error) {
    console.error("Failed to initialize:", error);
    ui.pluginCount.textContent = "Error";
    ui.pluginList.insertAdjacentHTML("beforeend",
        `<div class="alert alert-danger mt-3">Failed to load the plugin index.</div>`);
}

/** List data validation issues in the Data Issues dialog. */
function showIssues(plugins) {
    const issues = plugins.flatMap(plugin => plugin.validate());
    console.log(`%cFound ${issues.length} data issues`, `font-weight:700;color:${issues.length ? "red" : "green"}`);

    if (issues.length) {
        ui.issuesList.insertAdjacentHTML("beforeend", issues
            .sort(util.alphaSort)
            .map(issue => `<li>${issue}</li>`)
            .join(""));
        ui.navIssues.hidden = false;
    }
}
