import * as polyfills from "polyfills";
import * as dom from "dom";
import {controls, dom_ready, elements} from "dom";
import * as events from "events";
import * as util from "util";
import {Plugin} from "plugin";

(async function () {
    'use strict';

    window.index = {
        plugins: [],
        pluginMap: {},
    }

    try {
        await polyfills.load();
        await dom_ready();
        events.enableDynamicTooltips();

        const response = await fetch("index/plugin-index.json");
        const json = Object.assign({plugin_index: []}, await response.json());

        json.plugin_index.forEach(item => {
            const plugin = new Plugin(item);

            index.plugins.push(plugin);
            index.pluginMap[plugin.topicId] = plugin;
        });

        console.log(`Loaded ${index.plugins.length} plugins from index/plugin-index.json`, index);

        const authorGroups = Object.groupBy(index.plugins, ({author}) => author);
        const authorOptions = Object.keys(authorGroups)
            .sort(util.alphaSort)
            .map((name, index) => `<option value="${name.trim().toLowerCase()}">${name} (${authorGroups[name].length})</option>`)
            .join("");

        const menuGroups = Object.groupBy(index.plugins, ({menu}) => menu);
        const menuOptions = Object.keys(menuGroups)
            .sort(util.alphaSort)
            .map((name, index) => `<option value="${name.trim().toLowerCase()}">${name}</option>`)
            .join("");

        controls.comboAuthors.insertAdjacentHTML("beforeend", authorOptions);
        controls.comboMenu.insertAdjacentHTML("beforeend", menuOptions);

        const issues = validatePlugins();
        if (issues.length) {
            const issuesHtml = issues
                .sort(util.alphaSort)
                .map(issue => `<li>${issue}</li>`)
                .join("");
            elements.issuesList.insertAdjacentHTML("beforeend", issuesHtml);
            controls.navIssuesButton.style.display = "";
        }

        index.plugins.sort((a, b) => util.numericCompare(a.release, b.release));

        updateDropdownCounts();

        events.initEventListeners();
        events.useSearchParams();
        events.refreshListing();
    } catch (error) {
        console.error("Failed to initialize:", error);
    }

    function validatePlugins() {
        const issues = index.plugins.map(plugin => plugin.validate()).flat();

        console.log("%cFound " + issues.length + " data issues",
            "font-weight:700;" + (issues.length > 0 ? "color:red;" : "color:green"));

        return issues;
    }

    function updateDropdownCounts() {
        const plugins = index.plugins;
        const anyCount = plugins.length;

        const newCount = plugins.filter(p => p.isNew).length;
        const activeCount = plugins.filter(p => p.isActive).length;
        const inactiveCount = anyCount - activeCount;

        controls.comboPluginStatus.options[0].text += ` (${anyCount})`;
        controls.comboPluginStatus.options[1].text += ` (${newCount})`;
        controls.comboPluginStatus.options[2].text += ` (${activeCount})`;
        controls.comboPluginStatus.options[3].text += ` (${inactiveCount})`;

        const effectCount = plugins.filter(p => util.equalsIgnoreCase(p.type, "Effect")).length;
        const adjustmentCount = plugins.filter(p => util.equalsIgnoreCase(p.type, "Adjustment")).length;
        const filetypeCount = plugins.filter(p => util.equalsIgnoreCase(p.type, "Filetype")).length;
        const packCount = plugins.filter(p => util.equalsIgnoreCase(p.type, "Plugin Pack")).length;
        const externalCount = plugins.filter(p => util.equalsIgnoreCase(p.type, "External Resource")).length;

        controls.comboPluginType.options[0].text += ` (${anyCount})`;
        controls.comboPluginType.options[1].text += ` (${effectCount})`;
        controls.comboPluginType.options[2].text += ` (${adjustmentCount})`;
        controls.comboPluginType.options[3].text += ` (${filetypeCount})`;
        controls.comboPluginType.options[4].text += ` (${packCount})`;
        controls.comboPluginType.options[5].text += ` (${externalCount})`;
    }
}());