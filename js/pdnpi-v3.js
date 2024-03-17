/**
 * Paint.NET Plugin Index
 *
 * https://github.com/mattwright324/pdn-plugin-index
 *
 * @requires $ jquery for dom manipulation
 * @requires bootstrap uses css style classes
 * @author mattwright324
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

            return "" +
                "<div class='plugin'>" +
                    "<div class='phead'>" +
                        "<sp>" +
                            "<sp class='title'>" +
                                "<a target='_blank' href='https://forums.getpaint.net/topic/" + data.topic_id + "-i'>" +
                                    data.title +
                                "</a>" +
                            "</sp>" +
                            "&nbsp;" +
                            "<sp class='release'>" + data.release + "</sp>" +
                        "</sp>" +
                        "<sp class='author'>" +
                            "<a target='_blank' href='https://forums.getpaint.net/profile/" + data.author_id + "-" + authorNameUrl + "' " +
                                "title='View " + data.author + "&apos;s profile'>" +
                                data.author +
                            "</a>" +
                        "</sp>" +
                    "</div>" +
                    "<sp class='desc'>" + data.desc + "</sp>" +
                    (data.hasOwnProperty("alt_topic") ?
                        "<sp class='alt'>See also: " +
                            "<a target='_blank' href='https://forums.getpaint.net/topic/" + data.alt_topic + "-i' title='Alternative Topic'>" +
                                "#" + data.alt_topic +
                            "</a>" +
                        "</sp>"
                    : "") +
                    "<div class='tags'>" +
                        "<sp class='tag t' title='Plugin Type'>" + data.type + "</sp>" +
                        "<sp class='tag s' title='Plugin Status'>" + data.status + "</sp>" +
                        "<sp class='tag c' title='Compatibility'>" + data.compatibility + "</sp>" +
                        "<sp class='tag m' title='Menu Location'>" + data.menu + "</sp>" +
                        "<sp class='tag d' title='DLLs'>" + data.dlls + "</sp>" +
                    "</div>" +
                "</div>";
        }
    };

    function containsIgnoreCase(text, subString) {
        return text.toUpperCase().indexOf(subString.toUpperCase()) !== -1;
    }

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

        const keywords = controls.inputKeywords.value;
        if (keywords) {
            const hide = !Object.values(data).some(value => value && containsIgnoreCase(String(value), keywords));

            if (hide) {
                return false;
            }
        }

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

        if (!controls.checkAnyStatus.checked) {
            let hide = true;
            if (equalsIgnoreCase(data.status, "Active") && controls.checkStatusActive.checked ||
                equalsIgnoreCase(data.status, "New") && controls.checkStatusNew.checked ||
                equalsIgnoreCase(data.status, "Deprecated") && controls.checkStatusDeprecated.checked ||
                equalsIgnoreCase(data.status, "Obsolete") && controls.checkStatusObsolete.checked ||
                equalsIgnoreCase(data.status, "Incompatible") && controls.checkStatusIncompatible.checked ||
                equalsIgnoreCase(data.status, "Unsupported") && controls.checkStatusUnsupported.checked ||
                equalsIgnoreCase(data.status, "Integrated") && controls.checkStatusIntegrated.checked ||
                equalsIgnoreCase(data.status, "Bundled") && controls.checkStatusBundled.checked) {

                hide = false;
            }

            if (hide) {
                return false;
            }
        }

        if (!controls.checkAnyVersion.checked) {
            let hide = true;
            if (data.compatibility.match(/.*5\..*/) && controls.check5x.checked ||
                data.compatibility.match(/.*4\..*/) && controls.check4x.checked ||
                data.compatibility.match(/.*3\.5x*/) && controls.check3x.checked ||
                equalsIgnoreCase(data.compatibility, "Untested") && controls.checkUntested.checked) {
                hide = false;
            }

            if (hide) {
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

        const releaseIndex = controls.comboRelease.selectedIndex;
        if (releaseIndex > 0) {
            const now = new Date();
            const then = new Date(data.release);
            const millisDiff = now - then;

            /** days * hours * minutes * seconds * millis */
            const monthInMillis = 30 * 24 * 60 * 60 * 1000;
            if (releaseIndex === 1 && millisDiff > (monthInMillis * 6)) {
                return false;
            } else if (releaseIndex === 2 && millisDiff > (monthInMillis * 12)) {
                return false;
            } else if (releaseIndex === 3 && millisDiff > (monthInMillis * 12 * 3)) {
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

    const pluginStatuses = {
        active: 1,
        new: 2,
        bundled: 4,
        deprecated: 8,
        obsolete: 16,
        incompatible: 32,
        unsupported: 64,
        integrated: 128
    };

    const pluginCompatibilities = {
        ver5x: 1,
        ver4x: 2,
        ver3x: 4,
        untested: 8
    };

    const searchParamKeys = {
        keywords: 'keywords',
        author: 'author',
        type: 'type',
        status: 'status',
        compat: 'compat',
        order: 'order',
        menu: 'menu',
        release: 'release'
    }

    const internal = {
        init: function () {
            console.log("Initializing");

            elements.badgePluginCount = document.querySelector("#count");
            //elements.divLoadingOverlay = $("#spinner");
            elements.divPluginList = document.querySelector("#plugins-list");
            controls.btnScrollToTop = document.querySelector("#scroll");

            controls.inputKeywords = document.querySelector("#keywords");
            controls.comboAuthors = document.querySelector("#author");
            controls.comboOrder = document.querySelector("#order");
            controls.comboMenu = document.querySelector("#menu-list");
            controls.comboRelease = document.querySelector("#release");

            controls.checkAllTypes = document.querySelector("#checkAll");
            controls.checkTypeEffect = document.querySelector("#checkEffect");
            controls.checkTypeAdjustment = document.querySelector("#checkAdjustment");
            controls.checkTypeFiletype = document.querySelector("#checkFiletype");
            controls.checkTypeExternal = document.querySelector("#checkExternal");
            controls.checkTypePluginPack = document.querySelector("#checkPack");

            controls.checkAnyStatus = document.querySelector("#checkAny");
            controls.checkStatusActive = document.querySelector("#checkActive");
            controls.checkStatusNew = document.querySelector("#checkNew");
            controls.checkStatusDeprecated = document.querySelector("#checkDeprecated");
            controls.checkStatusObsolete = document.querySelector("#checkObsolete");
            controls.checkStatusIncompatible = document.querySelector("#checkIncompatible");
            controls.checkStatusUnsupported = document.querySelector("#checkUnsupported");
            controls.checkStatusIntegrated = document.querySelector("#checkIntegrated");
            controls.checkStatusBundled = document.querySelector("#checkBundled");

            controls.checkAnyVersion = document.querySelector("#checkAnyVersion");
            controls.check5x = document.querySelector("#check5x");
            controls.check4x = document.querySelector("#check4x");
            controls.check3x = document.querySelector("#check3x");
            controls.checkUntested = document.querySelector("#checkUntested");
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

            /**
             * All/Any checkbox should deselect it's encompassing sub-checkboxes.
             *
             * Sub-checkboxes should deselect it's parent All/Any checkbox.
             */
            function checkBehavior(allCheck, subChecks) {
                allCheck.addEventListener("change", function () {
                    if (allCheck.checked) {
                        subChecks.forEach(check => check.checked = false);
                    }
                    internal.refreshListing();
                });
                subChecks.forEach(check => check.addEventListener("change", function () {
                    if (check.checked) {
                        allCheck.checked = false;
                    }
                    internal.refreshListing();
                }));
            }

            checkBehavior(controls.checkAllTypes, [
                controls.checkTypeEffect,
                controls.checkTypeAdjustment,
                controls.checkTypeFiletype,
                controls.checkTypeExternal,
                controls.checkTypePluginPack
            ]);
            controls.checkAllTypes.checked = true;

            checkBehavior(controls.checkAnyStatus, [
                controls.checkStatusActive,
                controls.checkStatusNew,
                controls.checkStatusDeprecated,
                controls.checkStatusObsolete,
                controls.checkStatusIncompatible,
                controls.checkStatusUnsupported,
                controls.checkStatusIntegrated,
                controls.checkStatusBundled
            ]);
            controls.checkStatusActive.checked = true;
            controls.checkStatusNew.checked = true;
            controls.checkStatusBundled.checked = true;

            checkBehavior(controls.checkAnyVersion, [
                controls.check5x,
                controls.check4x,
                controls.check3x,
                controls.checkUntested
            ]);
            // when 5.0 is released we can set that checkbox as the default.
            controls.check5x.checked = true;
            // include all 4.x plugins for the first few months....
            controls.check4x.checked = true;

            [controls.comboAuthors, controls.comboMenu, controls.comboRelease].forEach(control => {

                control.addEventListener("change", () => internal.refreshListing());
            });

            controls.comboOrder.addEventListener("change", function () {
                internal.refreshListing('order');
            });

            let inputTimeout = null;
            controls.inputKeywords.addEventListener('input', function () {
                clearTimeout(inputTimeout);

                inputTimeout = setTimeout(internal.refreshListing, 200);
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
            function hasFlag (num, flag) {
                return (num & flag) == flag;
            }

            const allFoundParams = new URL(window.location).searchParams;

            const foundKeywords = allFoundParams.get(searchParamKeys.keywords)?.trim();
            if (foundKeywords) {
                controls.inputKeywords.value = foundKeywords;
            }

            const foundAuthor = allFoundParams.get(searchParamKeys.author)?.trim();
            if (foundAuthor) {
                const authorIndex = Array.from(controls.comboAuthors.options).findIndex(x => x.text == foundAuthor);
                if (authorIndex >= 0) {
                    controls.comboAuthors.selectedIndex = authorIndex;
                }
            }

            const foundType = allFoundParams.get(searchParamKeys.type)?.trim();
            if (foundType) {
                const typeFlags = Number.parseInt(foundType) || 0;
                controls.checkAllTypes.checked = (typeFlags == 0);
                controls.checkTypeEffect.checked = hasFlag(typeFlags, pluginTypes.effect);
                controls.checkTypeAdjustment.checked = hasFlag(typeFlags, pluginTypes.adjustment);
                controls.checkTypeFiletype.checked = hasFlag(typeFlags, pluginTypes.filetype);
                controls.checkTypeExternal.checked = hasFlag(typeFlags, pluginTypes.external);
                controls.checkTypePluginPack.checked = hasFlag(typeFlags, pluginTypes.pluginPack);
            }

            const foundStatus = allFoundParams.get(searchParamKeys.status)?.trim();
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

            const foundCompat = allFoundParams.get(searchParamKeys.compat)?.trim();
            if (foundCompat) {
                const compatFlags = Number.parseInt(foundCompat) || 0;
                controls.checkAnyVersion.checked = (compatFlags == 0);
                controls.check5x.checked = hasFlag(compatFlags, pluginCompatibilities.ver5x);
                controls.check4x.checked = hasFlag(compatFlags, pluginCompatibilities.ver4x);
                controls.check3x.checked = hasFlag(compatFlags, pluginCompatibilities.ver3x);
                controls.checkUntested.checked = hasFlag(compatFlags, pluginCompatibilities.untested);
            }

            const foundOrder = allFoundParams.get(searchParamKeys.order)?.trim();
            if (foundOrder) {
                const orderIndex = Array.from(controls.comboOrder.options).findIndex(x => x.text == foundOrder);
                if (orderIndex >= 0) {
                    controls.comboOrder.selectedIndex = orderIndex;
                }
            }

            const foundMenu = allFoundParams.get(searchParamKeys.menu)?.trim();
            if (foundMenu) {
                const menuIndex = Array.from(controls.comboMenu.options).findIndex(x => x.text == foundMenu);
                if (menuIndex >= 0) {
                    controls.comboMenu.selectedIndex = menuIndex;
                }
            }

            const foundRelease = allFoundParams.get(searchParamKeys.release)?.trim();
            if (foundRelease) {
                const releaseIndex = Array.from(controls.comboRelease.options).findIndex(x => x.value == foundRelease);
                if (releaseIndex >= 0) {
                    controls.comboRelease.selectedIndex = releaseIndex;
                }
            }
        },
        buildPermalink: function () {
            const params  = new URLSearchParams();

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

            let compatFlags = 0;
            if (controls.check5x.checked) compatFlags |= pluginCompatibilities.ver5x;
            if (controls.check4x.checked) compatFlags |= pluginCompatibilities.ver4x;
            if (controls.check3x.checked) compatFlags |= pluginCompatibilities.ver3x;
            if (controls.checkUntested.checked) compatFlags |= pluginCompatibilities.untested;
            params.append(searchParamKeys.compat, compatFlags);

            params.append(searchParamKeys.order, controls.comboOrder.value);
            params.append(searchParamKeys.menu, controls.comboMenu.options[controls.comboMenu.selectedIndex].text);
            params.append(searchParamKeys.release, controls.comboRelease.value);

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
            console.log("Refreshing the plugin list...");

            //const fadeMs = 150;

            //elements.divLoadingOverlay.fadeIn(fadeMs);

            if (equalsIgnoreCase(event, "order")) {
                const order = controls.comboOrder.options[controls.comboOrder.selectedIndex].value;

                pluginIndex.sort((a, b) => {
                    const dataA = a.getData();
                    const dataB = b.getData();

                    if (equalsIgnoreCase(order, "title")) {
                        return alphaSort(dataA.title, dataB.title);
                    } else if (equalsIgnoreCase(order, "release")) {
                        a = new Date(dataA.release);
                        b = new Date(dataB.release);

                        return (a < b) ? 1 : (a > b) ? -1 : 0;
                    } else if (equalsIgnoreCase(order, "author")) {
                        return alphaSort(dataA.author, dataB.author);
                    } else if (equalsIgnoreCase(order, "menu")) {
                        return alphaSort(dataA.menu, dataB.menu);
                    } else if (equalsIgnoreCase(order, "topicId")) {
                        a = Number(dataA.topic_id);
                        b = Number(dataB.topic_id);

                        return (a < b) ? -1 : (a > b) ? 1 : 0;
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
            //elements.divLoadingOverlay.fadeOut(fadeMs * 1.75);
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
