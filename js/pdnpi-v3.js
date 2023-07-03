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

        const keywords = controls.inputKeywords.val();
        if (keywords && keywords !== "") {
            let hide = true;
            Object.keys(data).forEach(key => {
                const value = data[key];

                if (value && containsIgnoreCase(String(value), keywords)) {
                    hide = false;
                }
            });

            if (hide) {
                return false;
            }
        }

        const author = controls.comboAuthors.find(":selected").val();
        if (author !== "0") {
            const authorName = controls.comboAuthors.find(":selected").text();

            if (data.author !== authorName) {
                return false;
            }
        }

        if (!controls.checkAllTypes.is(":checked")) {
            let hide = true;
            if (equalsIgnoreCase(data.type, "Effect") && controls.checkTypeEffect.is(":checked") ||
                equalsIgnoreCase(data.type, "Adjustment") && controls.checkTypeAdjustment.is(":checked") ||
                equalsIgnoreCase(data.type, "Filetype") && controls.checkTypeFiletype.is(":checked") ||
                equalsIgnoreCase(data.type, "External Resource") && controls.checkTypeExternal.is(":checked") ||
                equalsIgnoreCase(data.type, "Plugin Pack") && controls.checkTypePluginPack.is(":checked")) {

                hide = false;
            }

            if (hide) {
                return false;
            }
        }

        if (!controls.checkAnyStatus.is(":checked")) {
            let hide = true;
            if (equalsIgnoreCase(data.status, "Active") && controls.checkStatusActive.is(":checked") ||
                equalsIgnoreCase(data.status, "New") && controls.checkStatusNew.is(":checked") ||
                equalsIgnoreCase(data.status, "Deprecated") && controls.checkStatusDeprecated.is(":checked") ||
                equalsIgnoreCase(data.status, "Obsolete") && controls.checkStatusObsolete.is(":checked") ||
                equalsIgnoreCase(data.status, "Incompatible") && controls.checkStatusIncompatible.is(":checked") ||
                equalsIgnoreCase(data.status, "Unsupported") && controls.checkStatusUnsupported.is(":checked") ||
                equalsIgnoreCase(data.status, "Integrated") && controls.checkStatusIntegrated.is(":checked") ||
                equalsIgnoreCase(data.status, "Bundled") && controls.checkStatusBundled.is(":checked")) {

                hide = false;
            }

            if (hide) {
                return false;
            }
        }

        if (!controls.checkAnyVersion.is(":checked")) {
            let hide = true;
            if (data.compatibility.match(/.*5\..*/) && controls.check5x.is(":checked") ||
                data.compatibility.match(/.*4\..*/) && controls.check4x.is(":checked") ||
                data.compatibility.match(/.*3\.5x*/) && controls.check3x.is(":checked") ||
                equalsIgnoreCase(data.compatibility, "Untested") && controls.checkUntested.is(":checked")) {
                hide = false;
            }

            if (hide) {
                return false;
            }
        }

        const menu = controls.comboMenu.find(":selected").val();
        if (menu !== "0") {
            const menuText = controls.comboMenu.find(":selected").text();

            if (!equalsIgnoreCase(data.menu, menuText)) {
                return false;
            }
        }

        const release = controls.comboRelease.find(":selected").val();
        if (release !== "0") {
            const now = new Date();
            const then = new Date(data.release);
            const millisDiff = now - then;

            /** days * hours * minutes * seconds * millis */
            const monthInMillis = 30 * 24 * 60 * 60 * 1000;
            if (release === "1" && millisDiff > (monthInMillis * 6)) {
                return false;
            } else if (release === "2" && millisDiff > (monthInMillis * 12)) {
                return false;
            } else if (release === "3" && millisDiff > (monthInMillis * 12 * 3)) {
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

            elements.badgePluginCount = $("#count");
            elements.divLoadingOverlay = $("#spinner");
            elements.divPluginList = $("#plugins-list");
            controls.btnScrollToTop = $("#scroll");

            controls.inputKeywords = $("#keywords");
            controls.comboAuthors = $("#author");
            controls.comboOrder = $("#order");
            controls.comboMenu = $("#menu-list");
            controls.comboRelease = $("#release");

            controls.checkAllTypes = $("#checkAll");
            controls.checkTypeEffect = $("#checkEffect");
            controls.checkTypeAdjustment = $("#checkAdjustment");
            controls.checkTypeFiletype = $("#checkFiletype");
            controls.checkTypeExternal = $("#checkExternal");
            controls.checkTypePluginPack = $("#checkPack");

            controls.checkAnyStatus = $("#checkAny");
            controls.checkStatusActive = $("#checkActive");
            controls.checkStatusNew = $("#checkNew");
            controls.checkStatusDeprecated = $("#checkDeprecated");
            controls.checkStatusObsolete = $("#checkObsolete");
            controls.checkStatusIncompatible = $("#checkIncompatible");
            controls.checkStatusUnsupported = $("#checkUnsupported");
            controls.checkStatusIntegrated = $("#checkIntegrated");
            controls.checkStatusBundled = $("#checkBundled");

            controls.checkAnyVersion = $("#checkAnyVersion");
            controls.check5x = $("#check5x");
            controls.check4x = $("#check4x");
            controls.check3x = $("#check3x");
            controls.checkUntested = $("#checkUntested")
        },
        loadIndex: function () {
            $.ajax({
                dataType: "json",
                url: "index/plugin-index.json"
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

                parsed.authors.sort(alphaSort);
                parsed.authors.forEach((name, index) =>
                    controls.comboAuthors.append(`<option value="${index + 1}">${name}</option>`));

                parsed.menus.sort(alphaSort);
                parsed.menus.forEach((menu, index) =>
                    controls.comboMenu.append(`<option value="${index + 1}">${menu}</option>`));

                internal.useSearchParams();
                internal.refreshListing();
            }).fail(function (err) {
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
                allCheck.change(function () {
                    if (allCheck.is(":checked")) {
                        subChecks.forEach(check => check.prop("checked", false));
                    }
                    internal.refreshListing();
                });
                subChecks.forEach(check => check.change(function () {
                    if (check.is(":checked")) {
                        allCheck.prop("checked", false);
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
            controls.checkAllTypes.prop("checked", true);

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
            controls.checkStatusActive.prop("checked", true);
            controls.checkStatusNew.prop("checked", true);
            controls.checkStatusBundled.prop("checked", true);

            checkBehavior(controls.checkAnyVersion, [
                controls.check5x,
                controls.check4x,
                controls.check3x,
                controls.checkUntested
            ]);
            // when 5.0 is released we can set that checkbox as the default.
            controls.check5x.prop("checked", true);
            // include all 4.x plugins for the first few months....
            controls.check4x.prop("checked", true);

            [controls.comboAuthors, controls.comboMenu, controls.comboRelease].forEach(control => {

                control.change(internal.refreshListing);
            });

            controls.comboOrder.change(function () {
                internal.refreshListing('order');
            });

            let inputTimeout = null;
            controls.inputKeywords.on('input', function () {
                clearTimeout(inputTimeout);

                inputTimeout = setTimeout(internal.refreshListing, 200);
            });

            $('#permalink-button').on('click', () => {
                navigator.clipboard.writeText(internal.buildPermalink()).then(
                    () => {
                        $('#copiedToast .toast-body').text('Permalink copied to the clipboard.');
                        $('#copiedToast').toast('show');
                    },
                    () => {
                        $('#copiedToast .toast-body').text('Error copying Permalink to the clipboard.');
                        $('#copiedToast').toast('show');
                    }
                  );
            });

            /**
             * When we scroll down a bit, display the scroll button.
             * Scroll button will take us back to the top.
             */
            $(window).scroll(function () {
                if ($(this).scrollTop() > 100) {
                    controls.btnScrollToTop.fadeIn();
                } else {
                    controls.btnScrollToTop.fadeOut();
                }
            });
            controls.btnScrollToTop.click(function () {
                $("html, body").animate({scrollTop: 0}, 600);
                return false;
            })
        },
        useSearchParams: function () {
            function hasFlag (num, flag) {
                return (num & flag) == flag;
            }

            const allFoundParams = new URL(window.location).searchParams;

            const foundKeywords = allFoundParams.get(searchParamKeys.keywords)?.trim();
            if (foundKeywords) {
                controls.inputKeywords.val(foundKeywords);
            }

            const foundAuthor = allFoundParams.get(searchParamKeys.author)?.trim();
            if (foundAuthor) {
                const authorIndex = controls.comboAuthors.children(`option:contains('${foundAuthor}')`).first().val();
                if (authorIndex) {
                    controls.comboAuthors.val(authorIndex);
                }
            }

            const foundType = allFoundParams.get(searchParamKeys.type)?.trim();
            if (foundType) {
                const typeFlags = Number.parseInt(foundType) || 0;
                controls.checkAllTypes.prop('checked', typeFlags == 0);
                controls.checkTypeEffect.prop('checked', hasFlag(typeFlags, pluginTypes.effect));
                controls.checkTypeAdjustment.prop('checked', hasFlag(typeFlags, pluginTypes.adjustment));
                controls.checkTypeFiletype.prop('checked', hasFlag(typeFlags, pluginTypes.filetype));
                controls.checkTypeExternal.prop('checked', hasFlag(typeFlags, pluginTypes.external));
                controls.checkTypePluginPack.prop('checked', hasFlag(typeFlags, pluginTypes.pluginPack));
            }

            const foundStatus = allFoundParams.get(searchParamKeys.status)?.trim();
            if (foundStatus) {
                const statusFlags = Number.parseInt(foundStatus) || 0;
                controls.checkAnyStatus.prop('checked', statusFlags == 0);
                controls.checkStatusActive.prop('checked', hasFlag(statusFlags, pluginStatuses.active));
                controls.checkStatusNew.prop('checked', hasFlag(statusFlags, pluginStatuses.new));
                controls.checkStatusBundled.prop('checked', hasFlag(statusFlags, pluginStatuses.bundled));
                controls.checkStatusDeprecated.prop('checked', hasFlag(statusFlags, pluginStatuses.deprecated));
                controls.checkStatusObsolete.prop('checked', hasFlag(statusFlags, pluginStatuses.obsolete));
                controls.checkStatusIncompatible.prop('checked', hasFlag(statusFlags, pluginStatuses.incompatible));
                controls.checkStatusUnsupported.prop('checked', hasFlag(statusFlags, pluginStatuses.unsupported));
                controls.checkStatusIntegrated.prop('checked', hasFlag(statusFlags, pluginStatuses.integrated));
            }

            const foundCompat = allFoundParams.get(searchParamKeys.compat)?.trim();
            if (foundCompat) {
                const compatFlags = Number.parseInt(foundCompat) || 0;
                controls.checkAnyVersion.prop('checked', compatFlags == 0);
                controls.check5x.prop('checked', hasFlag(compatFlags, pluginCompatibilities.ver5x));
                controls.check4x.prop('checked', hasFlag(compatFlags, pluginCompatibilities.ver4x));
                controls.check3x.prop('checked', hasFlag(compatFlags, pluginCompatibilities.ver3x));
                controls.checkUntested.prop('checked', hasFlag(compatFlags, pluginCompatibilities.untested));
            }

            const foundOrder = allFoundParams.get(searchParamKeys.order)?.trim();
            if (foundOrder) {
                const orderVal = controls.comboOrder.children(`option[value=${foundOrder}]`).first().val();
                if (orderVal) {
                    controls.comboOrder.val(orderVal);
                }
            }

            const foundMenu = allFoundParams.get(searchParamKeys.menu)?.trim();
            if (foundMenu) {
                const menuIndex = controls.comboMenu.children(`option:contains('${foundMenu}')`).first().val();
                if (menuIndex) {
                    controls.comboMenu.val(menuIndex);
                }
            }

            const foundRelease = allFoundParams.get(searchParamKeys.release)?.trim();
            if (foundRelease) {
                const releaseVal = controls.comboRelease.children(`option[value=${foundRelease}]`).first().val();
                if (releaseVal) {
                    controls.comboRelease.val(releaseVal);
                }
            }
        },
        buildPermalink: function () {
            const params  = new URLSearchParams();

            const currentKeywords = controls.inputKeywords.val().trim();
            if (currentKeywords) {
                params.append(searchParamKeys.keywords, currentKeywords);
            }

            params.append(searchParamKeys.author, controls.comboAuthors.find(":selected").text());

            let typeFlags = 0;
            if (controls.checkTypeEffect.is(":checked")) typeFlags |= pluginTypes.effect;
            if (controls.checkTypeAdjustment.is(":checked")) typeFlags |= pluginTypes.adjustment;
            if (controls.checkTypeFiletype.is(":checked")) typeFlags |= pluginTypes.filetype;
            if (controls.checkTypeExternal.is(":checked")) typeFlags |= pluginTypes.external;
            if (controls.checkTypePluginPack.is(":checked")) typeFlags |= pluginTypes.pluginPack;
            params.append(searchParamKeys.type, typeFlags);

            let statusFlags = 0;
            if (controls.checkStatusActive.is(":checked")) statusFlags |= pluginStatuses.active;
            if (controls.checkStatusNew.is(":checked")) statusFlags |= pluginStatuses.new;
            if (controls.checkStatusBundled.is(":checked")) statusFlags |= pluginStatuses.bundled;
            if (controls.checkStatusDeprecated.is(":checked")) statusFlags |= pluginStatuses.deprecated;
            if (controls.checkStatusObsolete.is(":checked")) statusFlags |= pluginStatuses.obsolete;
            if (controls.checkStatusIncompatible.is(":checked")) statusFlags |= pluginStatuses.incompatible;
            if (controls.checkStatusUnsupported.is(":checked")) statusFlags |= pluginStatuses.unsupported;
            if (controls.checkStatusIntegrated.is(":checked")) statusFlags |= pluginStatuses.integrated;
            params.append(searchParamKeys.status, statusFlags);

            let compatFlags = 0;
            if (controls.check5x.is(":checked")) compatFlags |= pluginCompatibilities.ver5x;
            if (controls.check4x.is(":checked")) compatFlags |= pluginCompatibilities.ver4x;
            if (controls.check3x.is(":checked")) compatFlags |= pluginCompatibilities.ver3x;
            if (controls.checkUntested.is(":checked")) compatFlags |= pluginCompatibilities.untested;
            params.append(searchParamKeys.compat, compatFlags);

            params.append(searchParamKeys.order, controls.comboOrder.val());
            params.append(searchParamKeys.menu, controls.comboMenu.find(":selected").text());
            params.append(searchParamKeys.release, controls.comboRelease.val());

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

            const fadeMs = 150;

            elements.divLoadingOverlay.fadeIn(fadeMs);

            if (equalsIgnoreCase(event, "order")) {
                const order = controls.comboOrder.find(":selected").val();

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
            elements.divPluginList.html(html);
            elements.badgePluginCount.text(displayCount + " / " + pluginIndex.length);
            elements.divLoadingOverlay.fadeOut(fadeMs * 1.75);
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
