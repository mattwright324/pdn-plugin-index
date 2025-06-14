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

    const format = {
        dataToHtml: function (data) {
            const authorNameUrl = encodeURI(data.author.toLowerCase());

            let altLink = ''
            if (data.hasOwnProperty('alt_topic')) {
                altLink = `<sp class='alt'>See also: <a target="_blank" href="https://forums.getpaint.net/topic/${data.alt_topic}-i">
                                #${data.alt_topic}
                           </a></sp>`
            }

            return `<div class='plugin'>
                        <div class="phead">
                            <sp>
                                <sp class='title'><a target="_blank" href="https://forums.getpaint.net/topic/${data.topic_id}-i">
                                    ${data.title}
                                </a></sp>&nbsp;<sp class="release">${data.release}</sp>
                            </sp>
                            <sp class="author">
                                <a target="_blank" href="https://forums.getpaint.net/profile/${data.author_id}-${authorNameUrl}" title="View ${data.author}&apos;s profile">
                                    ${data.author}
                                </a>
                            </sp>
                        </div>
                        <sp class="desc">${data.desc}</sp>
                        ${altLink}
                        <div class="tags">
                            <sp class="tag t" title="Plugin Type">${data.type}</sp>
                            <sp class="tag s" title="Plugin Status">${data.status}</sp>
                            <sp class="tag c" title="Compatibility">${data.compatibility}</sp>
                            <sp class="tag m" title="Menu Location">${data.menu}</sp>
                            <sp class="tag d" title="DLLs">${data.dlls}</sp>
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
            const upperKeywords = keywords.toUpperCase();
            const searchableFields = ['title', 'desc', 'author', 'type', 'status', 'menu'];
            const searchTexts = searchableFields.map(field => String(data[field]).toUpperCase());
            
            // Exact match
            if (controls.checkExactMatch.checked) {
                if (!searchTexts.some(text => text.includes(upperKeywords))) {
                    return false;
                }
            }
            // Any/All keywords
            else {
                const keywordArray = upperKeywords.split(/\s+/).filter(k => k.length > 0);
                if (keywordArray.length > 0) {
                    const matchFunc = controls.checkAllKeywords.checked ? 'every' : 'some';
                    if (!keywordArray[matchFunc](keyword => 
                        searchTexts.some(text => text.includes(keyword))
                    )) {
                        return false;
                    }
                }
            }
        }

        // Continue with other checks
        const authorIndex = controls.comboAuthors.selectedIndex;
        if (authorIndex > 0) {
            const authorName = controls.comboAuthors.options[authorIndex].text;

            if (data.author !== authorName) {
                return false;
            }
        }

        if (!controls.checkAllTypes.checked) {
            let hide = true;
            if (equalsIgnoreCase(data.type, "Effect") && controls.checkTypeEffect.checked ||
                equalsIgnoreCase(data.type, "Adjustment") && controls.checkTypeAdjustment.checked ||
                equalsIgnoreCase(data.type, "Filetype") && controls.checkTypeFiletype.checked ||
                equalsIgnoreCase(data.type, "External Resource") && controls.checkTypeExternal.checked ||
                equalsIgnoreCase(data.type, "Plugin Pack") && controls.checkTypePluginPack.checked) {

                hide = false;
            }

            if (hide) {
                return false;
            }
        }

        // Check plugin status - case insensitive comparison
        if (controls.checkStatusNew.checked) {
            if (!equalsIgnoreCase(data.status, "New")) {
                return false;
            }
        } else if (controls.checkStatusActive.checked) {
            // Show if New, Active or Bundled 
            const activeStatuses = ["New", "Active", "Bundled"];
            if (!activeStatuses.some(status => equalsIgnoreCase(data.status, status))) {
                return false;
            }
        } else if (controls.checkStatusInactive.checked) {
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

    const parsed = {
        /** Unique list of plugin author names to populate author combo box. */
        authors: [],
        /** Unique list of menu locations to populate menu combo box. */
        menus: []
    };

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
        author: 'author',
        type: 'type', 
        status: 'status',
        order: 'order',
        menu: 'menu'
    };

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
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
                controls.btnScrollToTop = document.querySelector("#scroll");

                // Search controls
                controls.inputKeywords = document.querySelector("#keywords");
                controls.checkExactMatch = document.querySelector("#checkExactMatch");
                controls.checkAnyKeywords = document.querySelector("#checkAnyKeywords");
                controls.checkAllKeywords = document.querySelector("#checkAllKeywords");
                
                // Dropdowns
                controls.comboAuthors = document.querySelector("#author");
                controls.comboOrder = document.querySelector("#order");
                controls.comboMenu = document.querySelector("#menu-list");

                // Plugin type checkboxes
                controls.checkAllTypes = document.querySelector("#checkAll");
                controls.checkTypeEffect = document.querySelector("#checkEffect");
                controls.checkTypeAdjustment = document.querySelector("#checkAdjustment");
                controls.checkTypeFiletype = document.querySelector("#checkFiletype");
                controls.checkTypeExternal = document.querySelector("#checkExternal");
                controls.checkTypePluginPack = document.querySelector("#checkPack");

                // Status radio buttons
                controls.checkStatusNew = document.querySelector("#checkStatusNew");
                controls.checkStatusActive = document.querySelector("#checkStatusActive");
                controls.checkStatusInactive = document.querySelector("#checkStatusInactive");

                // Set default values
                controls.checkAllTypes.checked = true;
                controls.checkStatusActive.checked = true;
                controls.checkAnyKeywords.checked = true;
                controls.checkExactMatch.checked = false;
                
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

                // Default listing : Sort by newest release date
                pluginIndex.sort((a, b) => {
                    const dataA = a.getData();
                    const dataB = b.getData();
                    const dateA = new Date(dataA.release);
                    const dateB = new Date(dataB.release);
                    return (dateA < dateB) ? 1 : (dateA > dateB) ? -1 : 0;
                });

                const authorOptions = parsed.authors
                    .sort(alphaSort)
                    .map((name, index) => `<option value="${index + 1}">${name}</option>`)
                    .join("");

                controls.comboAuthors.insertAdjacentHTML("beforeend", authorOptions);

                const menuOptions = parsed.menus
                    .sort(alphaSort)
                    .map((menu, index) => `<option value="${index + 1}">${menu}</option>`)
                    .join("");

                controls.comboMenu.insertAdjacentHTML("beforeend", menuOptions);

                internal.useSearchParams();
                internal.refreshListing();

            }).catch(function (err) {
                console.error("Failed to load plugin-index.json");
                console.error(err);
            });
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
            [controls.checkExactMatch, controls.checkAnyKeywords, controls.checkAllKeywords]
                .forEach(radio => radio.addEventListener('change', debouncedRefresh));

            // Status radio buttons
            [controls.checkStatusNew, controls.checkStatusActive, controls.checkStatusInactive]
                .forEach(radio => radio.addEventListener('change', () => internal.refreshListing()));

            // Plugin type checkboxes
            checkBehavior(controls.checkAllTypes, [
                controls.checkTypeEffect,
                controls.checkTypeAdjustment,
                controls.checkTypeFiletype,
                controls.checkTypeExternal,
                controls.checkTypePluginPack
            ]);
            controls.checkAllTypes.checked = true;

            // Set default active status
            controls.checkStatusActive.checked = true;

            [controls.comboAuthors, controls.comboMenu].forEach(control => {

                control.addEventListener("change", () => internal.refreshListing());
            });

            controls.comboOrder.addEventListener("change", function () {
                internal.refreshListing('order');
            });

            document.querySelector('#permalink-button').addEventListener('click', () => {
                navigator.clipboard.writeText(internal.buildPermalink()).then(
                    () => {
                        return 'Permalink copied to the clipboard.';
                    },
                    (failure) => {
                        console.error(failure);
                        return 'Error copying Permalink to the clipboard.';
                    }
                )
                    .then(x => {
                        document.querySelector('#copiedToast .toast-body').textContent = x;

                        const toastNode = document.querySelector('#copiedToast');
                        bootstrap.Toast.getOrCreateInstance(toastNode).show();
                    });
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

            if (params.keywords) {
                controls.inputKeywords.value = params.keywords;
            }
            
            if (params.author) {
                const authorIndex = Array.from(controls.comboAuthors.options)
                    .findIndex(x => x.text === params.author);
                if (authorIndex >= 0) {
                    controls.comboAuthors.selectedIndex = authorIndex;
                }
            }

            const foundType = params.type;
            if (foundType) {
                const typeFlags = Number.parseInt(foundType) || 0;
                controls.checkAllTypes.checked = (typeFlags == 0);
                controls.checkTypeEffect.checked = hasFlag(typeFlags, pluginTypes.effect);
                controls.checkTypeAdjustment.checked = hasFlag(typeFlags, pluginTypes.adjustment);
                controls.checkTypeFiletype.checked = hasFlag(typeFlags, pluginTypes.filetype);
                controls.checkTypeExternal.checked = hasFlag(typeFlags, pluginTypes.external);
                controls.checkTypePluginPack.checked = hasFlag(typeFlags, pluginTypes.pluginPack);
            }

            const foundStatus = params.status;
            if (foundStatus) {
                const statusFlags = Number.parseInt(foundStatus) || 0;
                controls.checkAnyStatus.checked = (statusFlags == 0);
                controls.checkStatusActive.checked = hasFlag(statusFlags, pluginStatuses.active);
                controls.checkStatusNew.checked = hasFlag(statusFlags, pluginStatuses.new);
                controls.checkStatusBundled.checked = hasFlag(statusFlags, pluginStatuses.bundled);
                controls.checkStatusDeprecated.checked = hasFlag(statusFlags, pluginStatuses.deprecated);
                controls.checkStatusObsolete.checked = hasFlag(statusFlags, pluginStatuses.obsolete);
                controls.checkStatusIncompatible.checked = hasFlag(statusFlags, pluginStatuses.incompatible);
                controls.checkStatusUnsupported.checked = hasFlag(statusFlags, pluginStatuses.unsupported);
                controls.checkStatusIntegrated.checked = hasFlag(statusFlags, pluginStatuses.integrated);
            }

            if (params.order) {
                const orderIndex = Array.from(controls.comboOrder.options).findIndex(x => x.text == params.order);
                if (orderIndex >= 0) {
                    controls.comboOrder.selectedIndex = orderIndex;
                }
            }

            if (params.menu) {
                const menuIndex = Array.from(controls.comboMenu.options).findIndex(x => x.text == params.menu);
                if (menuIndex >= 0) {
                    controls.comboMenu.selectedIndex = menuIndex;
                }
            }
        },
        buildPermalink: function () {
            const params = new URLSearchParams();

            const currentKeywords = controls.inputKeywords.value.trim();
            if (currentKeywords) {
                params.append(searchParamKeys.keywords, currentKeywords);
            }

            params.append(searchParamKeys.author, controls.comboAuthors.options[controls.comboAuthors.selectedIndex].text);

            let typeFlags = 0;
            if (controls.checkTypeEffect.checked) typeFlags |= pluginTypes.effect;
            if (controls.checkTypeAdjustment.checked) typeFlags |= pluginTypes.adjustment;
            if (controls.checkTypeFiletype.checked) typeFlags |= pluginTypes.filetype;
            if (controls.checkTypeExternal.checked) typeFlags |= pluginTypes.external;
            if (controls.checkTypePluginPack.checked) typeFlags |= pluginTypes.pluginPack;
            params.append(searchParamKeys.type, typeFlags);

            let statusFlags = 0;
            if (controls.checkStatusActive.checked) statusFlags |= pluginStatuses.active;
            if (controls.checkStatusNew.checked) statusFlags |= pluginStatuses.new;
            if (controls.checkStatusBundled.checked) statusFlags |= pluginStatuses.bundled;
            if (controls.checkStatusDeprecated.checked) statusFlags |= pluginStatuses.deprecated;
            if (controls.checkStatusObsolete.checked) statusFlags |= pluginStatuses.obsolete;
            if (controls.checkStatusIncompatible.checked) statusFlags |= pluginStatuses.incompatible;
            if (controls.checkStatusUnsupported.checked) statusFlags |= pluginStatuses.unsupported;
            if (controls.checkStatusIntegrated.checked) statusFlags |= pluginStatuses.integrated;
            params.append(searchParamKeys.status, statusFlags);

            params.append(searchParamKeys.order, controls.comboOrder.value);
            params.append(searchParamKeys.menu, controls.comboMenu.options[controls.comboMenu.selectedIndex].text);

            const hostUrl = window !== window.parent
                ? 'https://forums.getpaint.net/PluginIndex'
                : window.location.origin + window.location.pathname;

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
        }
    };
    internal.init();
    internal.loadIndex();
    internal.setupControls();

    return {
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

            function logIssue(data, value, reason) {
                console.log(reason + " [value=" + value + "] - " + JSON.stringify(data));

                issueCount++;
            }

            pluginIndex.forEach(plugin => {
                const data = plugin.getData();

                if (!is.validDate(new Date(data.release))) {
                    logIssue(data, data.release, "INVALID DATE");
                }
                if (!is.validNumber(Number(data.topic_id))) {
                    logIssue(data, data.topic_id, "INVALID TOPIC_ID");
                }
                if (!is.validNumber(Number(data.author_id))) {
                    logIssue(data, data.author_id, "INVALID AUTHOR ID");
                }
                if (data.alt_topic && !is.validNumber(Number(data.alt_topic))) {
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
        }
    }
}());
