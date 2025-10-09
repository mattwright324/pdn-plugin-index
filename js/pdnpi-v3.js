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

function timeSince(date) {
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

    var aDay = 24 * 60 * 60 * 1000;

    const format = {
        dataToHtml: function (data) {
            const authorNameUrl = encodeURI(data.author.toLowerCase());

            let altLink = ''
            if (data.hasOwnProperty('alt_topic') && data.alt_topic !== '') {
                altLink = `<sp class='alt'>See also: <a target="_blank" href="https://forums.getpaint.net/topic/${data.alt_topic}-i">
                                #${data.alt_topic}
                           </a></sp>`
            }

            const dot = `<i class="bi bi-dot"></i>`
            const release = new Date(data.release);
            const since = timeSince(new Date(release));
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
    };

    function equalsIgnoreCase(a, b) {
        return String(a).toUpperCase() === String(b).toUpperCase();
    }

    const Plugin = function (data) {
        this.data = data;
        this.html = format.dataToHtml(this.data);
    };
    Plugin.prototype = {
        getData: function () {
            return this.data;
        },
        getHtml: function () {
            return this.html;
        }
    };

    /**
     * Disqualifying pattern, the first option that the plugin doesn't meet
     * returns false without checking the rest.
     */
    function shouldPluginDisplay(plugin) {
        const data = plugin.getData();

        // Check keywords if entered
        const keywords = controls.inputKeywords.value.trim();
        if (keywords) {
            const keywordStyle = (controls.comboKeywordStyle.value).trim().toLowerCase() || 'any';

            const upperKeywords = keywords.toUpperCase();
            const searchableFields = ['title', 'desc', 'author', 'type', 'status', 'menu', 'dlls'];
            const searchTexts = searchableFields.map(field => String(data[field]).toUpperCase());

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

            if (!equalsIgnoreCase(data.author, authorName)) {
                return false;
            }
        }

        const pluginType = controls.comboPluginType.value.trim().toLowerCase();
        if (pluginType !== 'any') {
            let hide = true;
            if (equalsIgnoreCase(data.type, "Effect") && pluginType === 'effect' ||
                equalsIgnoreCase(data.type, "Adjustment") && pluginType === 'adjustment' ||
                equalsIgnoreCase(data.type, "Filetype") && pluginType === 'filetype' ||
                equalsIgnoreCase(data.type, "External Resource") && pluginType === 'external' ||
                equalsIgnoreCase(data.type, "Plugin Pack") && pluginType === 'plugin-pack') {

                hide = false;
            }

            if (hide) {
                return false;
            }
        }

        const pluginStatus = controls.comboPluginStatus.value.trim().toLowerCase();
        // Check plugin status - case insensitive comparison
        if (pluginStatus === 'new') {
            if (!equalsIgnoreCase(data.status, "New")) {
                return false;
            }
        } else if (pluginStatus === 'active') {
            // Show if New, Active or Bundled 
            const activeStatuses = ["New", "Active", "Bundled"];
            if (!activeStatuses.some(status => equalsIgnoreCase(data.status, status))) {
                return false;
            }
        } else if (pluginStatus === 'inactive') {
            // Show if status is anything except New, Active or Bundled
            const activeStatuses = ["New", "Active", "Bundled"];
            if (activeStatuses.some(status => equalsIgnoreCase(data.status, status))) {
                return false;
            }
        }

        const menuIndex = controls.comboMenu.selectedIndex;
        if (menuIndex > 0) {
            const menuText = controls.comboMenu.options[menuIndex].text;

            if (!equalsIgnoreCase(data.menu, menuText)) {
                return false;
            }
        }
        return true;
    }

    /** List of plugin objects */
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

                    const pluginData = pluginIndex.map(plugin => plugin.getData());

                    const authorGroups = Object.groupBy(pluginData, ({ author }) => author);
                    authorOptions = Object.keys(authorGroups)
                        .sort(alphaSort)
                        .map((name, index) => `<option value="${name.trim().toLowerCase()}">${name} (${authorGroups[name].length})</option>`)
                        .join("");

                    const menuGroups = Object.groupBy(pluginData, ({ menu }) => menu);
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
                        const data = plugin.getData();

                        if (parsed.authors.indexOf(data.author) === -1) {
                            parsed.authors.push(data.author);
                        }

                        if (parsed.menus.indexOf(data.menu) === -1) {
                            parsed.menus.push(data.menu);
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
                    const dataA = a.getData();
                    const dataB = b.getData();
                    const dateA = new Date(dataA.release);
                    const dateB = new Date(dataB.release);
                    return (dateA < dateB) ? 1 : (dateA > dateB) ? -1 : 0;
                });

                // Update the counts on Status and Type dropdowns
                const pluginStatuses = pluginIndex.map(plugin => plugin.getData().status);
                const anyStatusCount = pluginStatuses.length;
                const newCount = pluginStatuses.filter(status => equalsIgnoreCase(status, "New")).length;
                const activeCount = pluginStatuses.filter(status => ["New", "Active", "Bundled"].some(x => equalsIgnoreCase(status, x))).length;
                const inactiveCount = anyStatusCount - activeCount;

                controls.comboPluginStatus.options[0].text += ` (${anyStatusCount})`;
                controls.comboPluginStatus.options[1].text += ` (${newCount})`;
                controls.comboPluginStatus.options[2].text += ` (${activeCount})`;
                controls.comboPluginStatus.options[3].text += ` (${inactiveCount})`;

                const pluginTypes = pluginIndex.map(plugin => plugin.getData().type);
                const anyTypeCount = pluginTypes.length;
                const effectCount = pluginTypes.filter(type => equalsIgnoreCase(type, "Effect")).length;
                const adjustmentCount = pluginTypes.filter(type => equalsIgnoreCase(type, "Adjustment")).length;
                const filetypeCount = pluginTypes.filter(type => equalsIgnoreCase(type, "Filetype")).length;
                const packCount = pluginTypes.filter(type => equalsIgnoreCase(type, "Plugin Pack")).length;
                const externalCount = pluginTypes.filter(type => equalsIgnoreCase(type, "External Resource")).length;

                controls.comboPluginType.options[0].text += ` (${anyTypeCount})`;
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
                        const dataA = a.getData();
                        const dataB = b.getData();

                        if (equalsIgnoreCase(order, "release_new")) {
                            // order by newest first
                            a = new Date(dataA.release);
                            b = new Date(dataB.release);
                            return (a < b) ? 1 : (a > b) ? -1 : 0;
                        } else if (equalsIgnoreCase(order, "release_old")) {
                            // order by oldest first
                            a = new Date(dataA.release);
                            b = new Date(dataB.release);
                            return (a > b) ? 1 : (a < b) ? -1 : 0;
                        } else if (equalsIgnoreCase(order, "title")) {
                            return alphaSort(dataA.title, dataB.title);
                        } else if (equalsIgnoreCase(order, "author")) {
                            return alphaSort(dataA.author, dataB.author);
                        } else if (equalsIgnoreCase(order, "menu")) {
                            return alphaSort(dataA.menu, dataB.menu);
                        }
                    });
                }

                let html = "";
                let displayCount = 0;
                for (let i = 0; i < pluginIndex.length; i++) {
                    const plugin = pluginIndex[i];

                    const display = shouldPluginDisplay(plugin);

                    if (display) {
                        html += plugin.getHtml();
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

            let issueCount = 0;
            const issues = []

            function logIssue(data, value, reason) {
                issues.push(`Plugin [topic_id=${data.topic_id} title=${data.title}]<br>Issue ${reason} [value=${value}]`);
                console.log(`${reason} [value=${value}] - ${JSON.stringify(data)}`);
                issueCount++;
            }

            pluginIndex.forEach(plugin => {
                const data = plugin.getData();

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
            });

            console.log("%cFound " + issueCount + " data issues", "font-weight:700;" +
                (issueCount > 0 ? "color:red;" : "color:green"));

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


