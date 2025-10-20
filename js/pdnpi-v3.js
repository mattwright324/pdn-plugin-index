/**
 * Paint.NET Plugin Index
 * https://github.com/mattwright324/pdn-plugin-index
 */
const pdnpi = (function () {
    'use strict';

    /** Form controls */
    const controls = {};
    /** Non-control elements */
    const elements = {};

    class Plugin {
        constructor(data) {
            this.#data = data;
            this.#html = this.#dataToHtml();
        }

        #data;
        #html;

        get html() { return this.#html; }

        // a few of these have 0 references, but do get called through bracket notation. i.e. plugin['fieldName']
        get author() { return this.#data.author; }
        get desc() { return this.#data.desc; }
        get dlls() { return this.#data.dlls; }
        get menu() { return this.#data.menu; }
        get status() { return this.#data.status; }
        get type() { return this.#data.type; }
        get release() { return new Date(this.#data.release); }
        get title() { return this.#data.title; }

        get isNew() { return equalsIgnoreCase(this.#data.status, "New"); }
        get isActive() { return ["New", "Active", "Bundled"].some(x => equalsIgnoreCase(this.#data.status, x)); }

        validate() {
            const types = new Set(["effect", "adjustment", "filetype", "external resource", "plugin pack"]);
            const statuses = new Set(["active", "new", "deprecated", "obsolete", "incompatible", "unsupported", "integrated", "bundled"]);
            const is = {
                validNumber(value) {
                    return typeof value === "number" && !isNaN(value) && value > 0;
                },
                validDate(value) {
                    return value instanceof Date && !isNaN(value);
                },
                validType(value) {
                    return typeof value === "string" && types.has(value.toLowerCase());
                },
                validStatus(value) {
                    return typeof value === "string" && statuses.has(value.toLowerCase());
                },
                emptyString(value) {
                    // Source: https://stackoverflow.com/a/36328062/2650847
                    return typeof value === 'undefined' || !value ||
                        value.length === 0 || value === "" || !/[^\s]/.test(value) ||
                        /^\s*$/.test(value) || value.replace(/\s/g, "") === "";
                }
            };

            const issues = []

            const logIssue = (data, value, reason) => {
                issues.push(`Plugin [topic_id=${data.topic_id} title=${data.title}]<br>Issue ${reason} [value=${value}]`);
                console.log(`${reason} [value=${value}] - ${JSON.stringify(data)}`);
            }

            const data = this.#data;

            if (!is.validDate(new Date(data.release))) {
                logIssue(data, data.release, "INVALID DATE");
            }
            if (!is.validNumber(data.topic_id)) {
                logIssue(data, data.topic_id, "INVALID TOPIC_ID");
            }
            if (!is.validNumber(data.author_id)) {
                logIssue(data, data.author_id, "INVALID AUTHOR ID");
            }
            if (data.alt_topic && !is.validNumber(data.alt_topic)) {
                logIssue(data, data.alt_topic, "INVALID ALT_TOPIC");
            }
            if (!is.validType(String(data.type))) {
                logIssue(data, data.type, "INVALID TYPE");
            }
            if (!is.validStatus(String(data.status))) {
                logIssue(data, data.status, "INVALID STATUS");
            }
            if (is.emptyString(String(data.title))) {
                logIssue(data, data.title, "EMPTY TITLE");
            }
            if (is.emptyString(String(data.author))) {
                logIssue(data, data.author, "EMPTY AUTHOR");
            }
            if (is.emptyString(String(data.desc))) {
                logIssue(data, data.author, "EMPTY DESC");
            }
            if (is.emptyString(String(data.compatibility))) {
                logIssue(data, data.compatibility, "EMPTY COMPAT");
            }
            if (is.emptyString(String(data.menu))) {
                logIssue(data, data.menu, "EMPTY MENU");
            }
            if (is.emptyString(String(data.dlls))) {
                logIssue(data, data.dlls, "EMPTY DLLS");
            }

            return issues;
        }

        static #timeSince(date) {
            let seconds = Math.floor((new Date() - date) / 1000);

            const intervals = [
                { label: "year", seconds: 31536000 },
                { label: "month", seconds: 2592000 },
                { label: "day", seconds: 86400 },
                { label: "hour", seconds: 3600 },
                { label: "minute", seconds: 60 },
                { label: "second", seconds: 1 }
            ];

            const years = Math.floor(seconds / intervals[0].seconds);
            seconds -= years * intervals[0].seconds;

            const months = Math.floor(seconds / intervals[1].seconds);

            if (years > 0) {
                let result = "Released " + years + " year" + (years > 1 ? "s" : "");
                if (months > 0) {
                    result += " " + months + " month" + (months > 1 ? "s" : "");
                }
                return result + " ago";
            }

            // Fallback: normal largest unit logic
            for (let i = 1; i < intervals.length; i++) {
                const count = Math.floor(seconds / intervals[i].seconds);
                if (count >= 1) {
                    return "Released " + count + " " + intervals[i].label + (count > 1 ? "s" : "") + " ago";
                }
            }

            return "just now";
        }

        #dataToHtml() {
            const data = this.#data;
            const authorNameUrl = encodeURI(data.author.toLowerCase());

            let altLink = ''
            if (data.hasOwnProperty('alt_topic') && data.alt_topic !== '') {
                altLink = `<sp class='alt'>See also: <a target="_blank" href="https://forums.getpaint.net/topic/${data.alt_topic}-i">
                                #${data.alt_topic}
                           </a></sp>`
            }

            const dot = `<i class="bi bi-dot"></i>`
            const release = new Date(data.release);
            const since = Plugin.#timeSince(new Date(release));
            const dlls = (data.dlls || "").split(",");
            const hoverdlls = (data.dlls || "").replace(/, /g, "\n").trim() || "N/A"; // replace comma-space with newline for dll tooltip
            let dllText = `<sp class='dll-1'>${dlls[0] || 'N/A'}</sp>`;
            if (dlls.length > 1) {
                dllText = dllText + " <sp class='dll-2'>and " + (dlls.length - 1) + " more</sp>";
            }
            if (data.dlls.toLowerCase() === 'n/a') {
                dllText = data.dlls.trim();
            }
            return `<div class='plugin'>
                    <div class="phead">
                        <sp class='title'><a target="_blank" href="https://forums.getpaint.net/topic/${data.topic_id.toString()}-i">
                            ${data.title}
                        </a></sp>
                    </div>
                    <sp class="desc">
${data.desc.substring(0, 450)}
<span class="ellipsis" id="ellipsis-${data.topic_id.toString()}">${data.desc.length > 450 ? '...' : ''}</span>
<sp ${data.desc.length > 450 ? '' : 'hidden'}>
    <sp id="more-${data.topic_id.toString()}" class="collapse">${data.desc.substring(450)}</sp>
    <br>
    <a data-bs-toggle="collapse" href="#more-${data.topic_id.toString()}" role="button" 
 
    onclick="this.textContent = this.textContent === 'Show more' ? 'Show less' : 'Show more';
                document.getElementById('ellipsis-${data.topic_id}').style.display = 
                this.textContent === 'Show more' ? '' : 'none';">Show more</a>
</sp>
                    </sp>
                    ${altLink}
                    <div class="tags">
                        <sp class="tag author">
                                <a target="_blank" href="https://forums.getpaint.net/profile/${data.author_id.toString()}-${authorNameUrl}" title="View ${data.author}&apos;s profile">
                                    <i class="bi bi-person-circle"></i> ${data.author}
                                </a>
                            </sp>${dot}
                        <sp class="tag" title="Published on ${data.release}">${since}</sp>${dot}
                        <sp class="tag t" title="Plugin Type">${data.type}</sp>&nbsp;
                        <sp class="tag s" title="Plugin Status">${data.status}</sp>&nbsp;
                        <sp class="tag c" title="Released under PDN version&hellip;">${data.compatibility}</sp>&nbsp;
                        <sp class="tag m" title="Menu Location">${data.menu || 'N/A'}</sp>&nbsp;
                        <sp class="tag d" title="${hoverdlls}">${dllText}</sp>
                    </div>
                </div>`.split("\n").map(s => s.trim()).join("\n");
        }
    }

    function equalsIgnoreCase(a, b) {
        return String(a).toUpperCase() === String(b).toUpperCase();
    }

    /**
     * Disqualifying pattern, the first option that the plugin doesn't meet
     * returns false without checking the rest.
     * @param {Plugin} plugin
     */
    function shouldPluginDisplay(plugin) {
        // Check keywords if entered
        const keywords = controls.inputKeywords.value.trim();
        if (keywords) {
            const keywordStyle = (controls.comboKeywordStyle.value).trim().toLowerCase() || 'any';

            const upperKeywords = keywords.toUpperCase();
            const searchableFields = ['title', 'desc', 'author', 'type', 'status', 'menu', 'dlls'];
            const searchTexts = searchableFields.map(field => String(plugin[field]).toUpperCase());

            if (keywordStyle === 'any' || keywordStyle === 'all') {
                const keywordArray = upperKeywords.split(/\s+/).filter(k => k.length > 0);
                if (keywordArray.length > 0) {
                    const matchFunc = keywordStyle === 'all' ? 'every' : 'some';
                    if (!keywordArray[matchFunc](keyword =>
                        searchTexts.some(text => text.includes(keyword))
                    )) {
                        return false;
                    }
                }
            } else if (keywordStyle === 'exact') {
                const exactUpper = controls.inputKeywords.value.toUpperCase();
                if (!searchTexts.some(text => text.includes(exactUpper))) {
                    return false;
                }
            }
        }

        // Continue with other checks
        const authorIndex = controls.comboAuthors.selectedIndex;
        if (authorIndex > 0) {
            const authorName = controls.comboAuthors.options[authorIndex].value;

            if (!equalsIgnoreCase(plugin.author, authorName)) {
                return false;
            }
        }

        const pluginType = controls.comboPluginType.value.trim().toLowerCase();
        if (pluginType !== 'any') {
            let hide = true;
            if (equalsIgnoreCase(plugin.type, "Effect") && pluginType === 'effect' ||
                equalsIgnoreCase(plugin.type, "Adjustment") && pluginType === 'adjustment' ||
                equalsIgnoreCase(plugin.type, "Filetype") && pluginType === 'filetype' ||
                equalsIgnoreCase(plugin.type, "External Resource") && pluginType === 'external' ||
                equalsIgnoreCase(plugin.type, "Plugin Pack") && pluginType === 'plugin-pack') {

                hide = false;
            }

            if (hide) {
                return false;
            }
        }

        const pluginStatus = controls.comboPluginStatus.value.trim().toLowerCase();
        if (pluginStatus === 'new') {
            if (!plugin.isNew) {
                return false;
            }
        } else if (pluginStatus === 'active') {
            // Show if New, Active or Bundled 
            if (!plugin.isActive) {
                return false;
            }
        } else if (pluginStatus === 'inactive') {
            // Show if status is anything except New, Active or Bundled
            if (plugin.isActive) {
                return false;
            }
        }

        const menuIndex = controls.comboMenu.selectedIndex;
        if (menuIndex > 0) {
            const menuText = controls.comboMenu.options[menuIndex].text;

            if (!equalsIgnoreCase(plugin.menu, menuText)) {
                return false;
            }
        }
        return true;
    }

    /**
     * List of plugin objects
     * @type {Array.<Plugin>}
     */
    const pluginIndex = [];

    const alphaSort = function (a, b) {
        return a.toUpperCase().localeCompare(b.toUpperCase());
    };

    const pluginTypes = {
        effect: 1,
        adjustment: 2,
        filetype: 4,
        external: 8,
        pluginPack: 16
    };

    const searchParamKeys = {
        keywords: 'keywords',
        keywordStyle: 'keywordStyle',
        author: 'author',
        type: 'type',
        status: 'status',
        order: 'order',
        menu: 'menu'
    };

    // Update status constants to match radio buttons
    const pluginStatuses = {
        new: 'new',
        active: 'active',
        inactive: 'inactive'
    };

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function hasFlag(num, flag) {
        return (num & flag) === flag;
    }

    const internal = {
        init: function () {
            try {
                console.log("Initializing");
                // Core elements
                elements.badgePluginCount = document.querySelector("#count");
                elements.divPluginList = document.querySelector("#plugins-list");
                controls.btnScrollToTop = document.querySelector("#scrollToTop");

                // Search controls
                controls.inputKeywords = document.querySelector("#keywords");
                controls.comboAuthors = document.querySelector("#author");
                controls.comboOrder = document.querySelector("#order");
                controls.comboMenu = document.querySelector("#menu-list");
                controls.comboKeywordStyle = document.querySelector("#keywordStyle");
                controls.comboPluginStatus = document.querySelector("#pluginStatus");
                controls.comboPluginType = document.querySelector("#pluginType");

                controls.navIssuesButton = document.querySelector("#nav-issues");
                elements.issuesList = document.querySelector("#issuesList");
            } catch (err) {
                console.error("Initialization failed:", err);
                throw err;
            }
        },

        loadIndex: function () {
            fetch(
                "index/plugin-index.json"
            ).then(response => {
                return response.json();
            }).then(function (res) {
                console.log("Successfully loaded plugin-index.json");
                console.log(res);

                let authorOptions;
                let menuOptions;

                if ("groupBy" in Object) {
                    res["plugin_index"].forEach(item => pluginIndex.push(new Plugin(item)));

                    const authorGroups = Object.groupBy(pluginIndex, ({ author }) => author);
                    authorOptions = Object.keys(authorGroups)
                        .sort(alphaSort)
                        .map((name, index) => `<option value="${name.trim().toLowerCase()}">${name} (${authorGroups[name].length})</option>`)
                        .join("");

                    const menuGroups = Object.groupBy(pluginIndex, ({ menu }) => menu);
                    menuOptions = Object.keys(menuGroups)
                        .sort(alphaSort)
                        .map((name, index) => `<option value="${name.trim().toLowerCase()}">${name}</option>`)
                        .join("");
                } else {
                    // for old browsers without Object.groupBy()

                    const parsed = {
                        /** Unique list of plugin author names to populate author combo box. */
                        authors: [],
                        /** Unique list of menu locations to populate menu combo box. */
                        menus: []
                    };

                    for (let i = 0; i < res["plugin_index"].length; i++) {
                        const plugin = new Plugin(res["plugin_index"][i]);

                        if (parsed.authors.indexOf(plugin.author) === -1) {
                            parsed.authors.push(plugin.author);
                        }

                        if (parsed.menus.indexOf(plugin.menu) === -1) {
                            parsed.menus.push(plugin.menu);
                        }

                        pluginIndex.push(plugin);
                    }

                    authorOptions = parsed.authors
                        .sort(alphaSort)
                        .map((name, index) => `<option value="${name.trim().toLowerCase()}">${name}</option>`)
                        .join("");

                    menuOptions = parsed.menus
                        .sort(alphaSort)
                        .map((menu, index) => `<option value="${menu.trim().toLowerCase()}">${menu}</option>`)
                        .join("");
                }

                controls.comboAuthors.insertAdjacentHTML("beforeend", authorOptions);
                controls.comboMenu.insertAdjacentHTML("beforeend", menuOptions);

                // Default listing : Sort by newest release date
                pluginIndex.sort((a, b) => {
                    return (a.release < b.release) ? 1 : (a.release > b.release) ? -1 : 0;
                });

                // Update the counts on Status and Type dropdowns
                const anyCount = pluginIndex.length;

                const newCount = pluginIndex.filter(plugin => plugin.isNew).length;
                const activeCount = pluginIndex.filter(plugin => plugin.isActive).length;
                const inactiveCount = anyCount - activeCount;

                controls.comboPluginStatus.options[0].text += ` (${anyCount})`;
                controls.comboPluginStatus.options[1].text += ` (${newCount})`;
                controls.comboPluginStatus.options[2].text += ` (${activeCount})`;
                controls.comboPluginStatus.options[3].text += ` (${inactiveCount})`;

                const effectCount = pluginIndex.filter(plugin => equalsIgnoreCase(plugin.type, "Effect")).length;
                const adjustmentCount = pluginIndex.filter(plugin => equalsIgnoreCase(plugin.type, "Adjustment")).length;
                const filetypeCount = pluginIndex.filter(plugin => equalsIgnoreCase(plugin.type, "Filetype")).length;
                const packCount = pluginIndex.filter(plugin => equalsIgnoreCase(plugin.type, "Plugin Pack")).length;
                const externalCount = pluginIndex.filter(plugin => equalsIgnoreCase(plugin.type, "External Resource")).length;

                controls.comboPluginType.options[0].text += ` (${anyCount})`;
                controls.comboPluginType.options[1].text += ` (${effectCount})`;
                controls.comboPluginType.options[2].text += ` (${adjustmentCount})`;
                controls.comboPluginType.options[3].text += ` (${filetypeCount})`;
                controls.comboPluginType.options[4].text += ` (${packCount})`;
                controls.comboPluginType.options[5].text += ` (${externalCount})`;

                internal.useSearchParams();
                internal.refreshListing();

                const issues = internal.dataIntegrity();
                if (issues.length) {
                    const issuesHtml = issues.sort(alphaSort).map((issue, index) => `<li>${issue}</li>`).join("");
                    elements.issuesList.insertAdjacentHTML("beforeend", issuesHtml);
                    controls.navIssuesButton.style.display = "";
                }
            }).catch(function (err) {
                console.error("Failed to load plugin-index.json");
                console.error(err);
            });
        },
        resetFilters: function() {
            // Reset all filters to their default values
            controls.inputKeywords.value = '';
            controls.comboKeywordStyle.value = 'any';
            controls.comboPluginStatus.value = 'active';
            controls.comboPluginType.value = 'any';
            controls.comboAuthors.value = 'any';
            controls.comboMenu.value = 'any';
            controls.comboOrder.value = 'release_new';

            // Force a new sorted listing
            internal.refreshListing('order');
        },
        setupControls: function () {
            console.log("Setting up controls...");

            // Initialize Bootstrap tooltips
            const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
            [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

            // Add missing checkBehavior function
            function checkBehavior(allCheck, subChecks) {
                allCheck.addEventListener("change", function () {
                    subChecks.forEach(check => {
                        check.checked = !allCheck.checked;
                    });
                    internal.refreshListing();
                });
                subChecks.forEach(check => check.addEventListener("change", function () {
                    if (check.checked) {
                        allCheck.checked = false;
                    } else if (subChecks.every(c => !c.checked)) {
                        allCheck.checked = true;
                    }
                    internal.refreshListing();
                }));
            }

            // Keyword search controls
            const debouncedRefresh = debounce(() => internal.refreshListing(), 150);
            controls.inputKeywords.addEventListener('input', debouncedRefresh);

            [controls.comboKeywordStyle, controls.comboPluginStatus, controls.comboPluginType,
            controls.comboAuthors, controls.comboMenu].forEach(control => {
                control.addEventListener("change", () => internal.refreshListing());
            });

            controls.comboOrder.addEventListener("change", function () {
                internal.refreshListing('order');
            });

            document.querySelector('#permalink-button').addEventListener('click', async () => {
                const permalinkTooltip = bootstrap.Tooltip.getInstance('#permalink-button');
                const permalinkIcon = document.querySelector('#permalink-icon');

                try {
                    await navigator.clipboard.writeText(internal.buildPermalink());
                    permalinkTooltip.setContent({ '.tooltip-inner': 'Copied!' });
                    permalinkIcon.classList.remove('bi-link-45deg', 'bi-check-lg', 'bi-x-circle');
                    permalinkIcon.classList.add('bi-check-lg');
                } catch (err) {
                    console.error('Failed to copy:', err);
                    permalinkTooltip.setContent({ '.tooltip-inner': 'Failed to copy' });
                    permalinkIcon.classList.remove('bi-link-45deg', 'bi-check-lg', 'bi-x-circle');
                    permalinkIcon.classList.add('bi-x-circle');
                }

                // remove focus after 1.9 seconds.
                // this gives the tooltip's fade animation a head start of 100 ms.
                // otherwise the tooltip text will change during the animation.
                setTimeout(() => {
                    permalinkIcon.parentElement.blur();
                }, 1900);
                
                // reset icon and tooltip after 2 seconds
                setTimeout(() => {
                    permalinkTooltip.setContent({ '.tooltip-inner': 'Copy Permalink' });
                    permalinkIcon.classList.remove('bi-link-45deg', 'bi-check-lg', 'bi-x-circle');
                    permalinkIcon.classList.add('bi-link-45deg');
                }, 2000);
            });

            document.querySelector('#resetFilters').addEventListener('click', function() {
                internal.resetFilters();
            });

            /**
             * When we scroll down a bit, display the scroll button.
             * Scroll button will take us back to the top.
             */
            window.addEventListener("scroll", function () {
                if (document.documentElement.scrollTop > 100) {
                    controls.btnScrollToTop.classList.add("show");
                } else {
                    controls.btnScrollToTop.classList.remove("show");
                }
            });
            controls.btnScrollToTop.addEventListener("click", (e) => {
                e.preventDefault();
                document.documentElement.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: "smooth",
                });
            })
        },
        useSearchParams: function () {
            const allFoundParams = new URL(window.location).searchParams;
            const params = Object.entries(searchParamKeys)
                .filter(([_, key]) => allFoundParams.has(key))
                .reduce((acc, [name, key]) => {
                    acc[name] = allFoundParams.get(key)?.trim();
                    return acc;
                }, {});
            console.log('Search Params', params)

            // Load all URL parameters into controls
            if (params.keywords) {
                controls.inputKeywords.value = params.keywords;
            }

            if (params.keywordStyle && document.querySelector(`#keywordStyle option[value='${params.keywordStyle.trim().toLowerCase()}']`)) {
                controls.comboKeywordStyle.value = params.keywordStyle.trim().toLowerCase();
            }

            if (params.status && document.querySelector(`#pluginStatus option[value='${params.status.trim().toLowerCase()}']`)) {
                controls.comboPluginStatus.value = params.status.trim().toLowerCase();
            }

            if (params.type && document.querySelector(`#pluginType option[value='${params.type.trim().toLowerCase()}']`)) {
                controls.comboPluginType.value = params.type.trim().toLowerCase();
            }

            if (params.author && document.querySelector(`#author option[value='${params.author.trim().toLowerCase()}']`)) {
                controls.comboAuthors.value = params.author.trim().toLowerCase();
            }

            if (params.menu && document.querySelector(`#menu-list option[value='${params.menu.trim().toLowerCase()}']`)) {
                controls.comboMenu.value = params.menu.trim().toLowerCase();
            }

            if (params.order) {
                const orderIndex = Array.from(controls.comboOrder.options).findIndex(x => x.text == params.order);
                if (orderIndex >= 0) {
                    controls.comboOrder.selectedIndex = orderIndex;
                }
            }

            // Trigger a refresh if we have any URL parameters
            if (Object.keys(params).length > 0) {
                internal.refreshListing();
            }
        },
        buildPermalink: function () {
            const params = new URLSearchParams();

            const currentKeywords = controls.inputKeywords.value.trim();
            if (currentKeywords) {
                params.append(searchParamKeys.keywords, currentKeywords);
            }

            const keywordStyle = controls.comboKeywordStyle.value.trim().toLowerCase();
            if (keywordStyle !== 'any') {
                params.append(searchParamKeys.keywordStyle, keywordStyle);
            }

            const author = controls.comboAuthors.value.trim().toLowerCase();
            if (author !== 'any') {
                params.append(searchParamKeys.author, controls.comboAuthors.value);
            }

            const type = controls.comboPluginType.value.trim().toLowerCase();
            if (type !== 'any') {
                params.append(searchParamKeys.type, type);
            }

            const status = controls.comboPluginStatus.value.trim().toLowerCase();
            if (status !== 'active') {
                params.append(searchParamKeys.status, status);
            }

            const order = controls.comboOrder.value.trim().toLowerCase();
            if (order !== 'release_new') {
                params.append(searchParamKeys.order, order);
            }

            const selectedMenu = controls.comboMenu.options[controls.comboMenu.selectedIndex].text;
            if (selectedMenu !== 'Any Menu') {
                params.append(searchParamKeys.menu, selectedMenu);
            }

            let hostUrl;
            if (window !== window.parent) {
                hostUrl = 'https://forums.getpaint.net/PluginIndex';
            } else if (window.location.hostname === 'localhost') {
                hostUrl = window.location.origin + window.location.pathname;
            } else {
                hostUrl = window.location.origin + window.location.pathname;
            }

            return hostUrl + '?' + params.toString();
        },
        /**
         * Update's what is displayed in the listing based on search criteria.
         *
         * Builds the html and replaces it, much faster than previous methods:
         * - Formatting and appending each html plugin in the list
         * - Hiding & showing each individual plugin
         */
        refreshListing: function (event) {
            try {
                console.log("Refreshing the plugin list...");

                if (equalsIgnoreCase(event, "order")) {
                    const order = controls.comboOrder.options[controls.comboOrder.selectedIndex].value;

                    pluginIndex.sort((a, b) => {
                        if (equalsIgnoreCase(order, "release_new")) {
                            // order by newest first
                            return (a.release < b.release) ? 1 : (a.release > b.release) ? -1 : 0;
                        } else if (equalsIgnoreCase(order, "release_old")) {
                            // order by oldest first
                            return (a.release > b.release) ? 1 : (a.release < b.release) ? -1 : 0;
                        } else if (equalsIgnoreCase(order, "title")) {
                            return alphaSort(a.title, b.title);
                        } else if (equalsIgnoreCase(order, "author")) {
                            return alphaSort(a.author, b.author);
                        } else if (equalsIgnoreCase(order, "menu")) {
                            return alphaSort(a.menu, b.menu);
                        }
                    });
                }

                let html = "";
                let displayCount = 0;
                for (let i = 0; i < pluginIndex.length; i++) {
                    const plugin = pluginIndex[i];

                    const display = shouldPluginDisplay(plugin);

                    if (display) {
                        html += plugin.html;
                        displayCount++;
                    }
                }
                elements.divPluginList.replaceChildren();
                elements.divPluginList.insertAdjacentHTML("afterbegin", html);
                elements.badgePluginCount.textContent = `${displayCount} / ${pluginIndex.length}`;
            } catch (err) {
                console.error("Refresh failed:", err);
                elements.badgePluginCount.textContent = "Error";
            }
        },

        dataIntegrity: function () {
            const issues = pluginIndex
                .map(plugin => plugin.validate())
                .flat();

            console.log("%cFound " + issues.length + " data issues", "font-weight:700;" +
                (issues.length > 0 ? "color:red;" : "color:green"));

            return issues;
        }
    };
    internal.init();
    internal.loadIndex();
    internal.setupControls();

    return {
        dataIntegrity: internal.dataIntegrity,
    };
}());


