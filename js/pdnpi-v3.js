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
                        "<span class='author'>" +
                            "<a target='_blank' href='https://forums.getpaint.net/profile/" + data.author_id + "-" + authorNameUrl + "' " +
                                "title='View " + data.author + "\\'s profile'>" +
                                data.author +
                            "</a>" +
                        "</span>" +
                    "</div>" +
                    "<span class='desc'>" + data.desc + "</span>" +
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

    function containsIgnoreCase (text, subString) {
        return text.toUpperCase().indexOf(subString.toUpperCase()) !== -1;
    }

    function equalsIgnoreCase (a, b) {
        return String(a).toUpperCase() === String(b).toUpperCase();
    }

    const Plugin = function(data) {
        this.data = data;
        this.html = format.dataToHtml(this.data);
    };
    Plugin.prototype = {
        getData: function() {
            return this.data;
        },
        getHtml: function() {
            return this.html;
        }
    };

    /**
     * Disqualifying pattern, the first option that the plugin doesn't meet
     * returns false without checking the rest.
     */
    function shouldPluginDisplay (plugin) {
        const data = plugin.getData();

        const keywords = controls.inputKeywords.val();
        if (keywords && keywords !== "") {
            let hide = true;
            Object.keys(data).forEach(key => {
                const value = data[key];

                if(value && containsIgnoreCase(String(value), keywords)) {
                    hide = false;
                }
            });

            if (hide) {
                return false;
            }
        }

        const author = controls.comboAuthors.find(":selected").val();
        if (author === "1") {
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

        if(!controls.checkAnyStatus.is(":checked")) {
            let hide = true;
            if (equalsIgnoreCase(data.status, "Active") && controls.checkStatusActive.is(":checked") ||
                equalsIgnoreCase(data.status, "New") && controls.checkStatusNew.is(":checked") ||
                equalsIgnoreCase(data.status, "Deprecated") && controls.checkStatusDeprecated.is(":checked") ||
                equalsIgnoreCase(data.status, "Obsolete") && controls.checkStatusObsolete.is(":checked") ||
                equalsIgnoreCase(data.status, "Unsupported") && controls.checkStatusUnsupported.is(":checked") ||
                equalsIgnoreCase(data.status, "Integrated") && controls.checkStatusIntegrated.is(":checked")) {

                hide = false;
            }

            if (hide) {
                return false;
            }
        }

        const menu = controls.comboMenu.find(":selected").val();
        if(menu === "1") {
            const menuText = controls.comboMenu.find(":selected").text();

            if(!equalsIgnoreCase(data.menu, menuText)) {
                return false;
            }
        }

        const release = controls.comboRelease.find(":selected").val();
        if(release !== "0") {
            const now = new Date();
            const then = new Date(data.release);
            const millisDiff = now - then;

            /** days * hours * minutes * seconds * millis */
            const monthInMillis = 30 * 24 * 60 * 60 * 1000;
            if(release === "1" && millisDiff > (monthInMillis * 6)) {
                return false;
            } else if(release === "2" && millisDiff > (monthInMillis * 12)) {
                return false;
            } else if(release === "3" && millisDiff > (monthInMillis * 12 * 3)) {
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
            controls.checkStatusUnsupported = $("#checkUnsupported");
            controls.checkStatusIntegrated = $("#checkIntegrated");
        },
        loadIndex: function () {
            $.ajax({
                dataType: "json",
                url: "index/plugin-index.json"
            }).then(function (res) {
                console.log("Successfully loaded plugin-index.json");
                console.log(res);

                for(let i=0; i < res["plugin_index"].length; i++) {
                    const plugin = new Plugin(res["plugin_index"][i]);
                    const data = plugin.getData();

                    if(parsed.authors.indexOf(data.author) === -1) {
                        parsed.authors.push(data.author);
                    }

                    if(parsed.menus.indexOf(data.menu) === -1) {
                        parsed.menus.push(data.menu);
                    }

                    pluginIndex.push(plugin);
                }

                parsed.authors.sort(alphaSort);
                parsed.authors.forEach(name =>
                    controls.comboAuthors.append("<option value='1'>" + name + "</option>"));

                parsed.menus.sort(alphaSort);
                parsed.menus.forEach(menu =>
                    controls.comboMenu.append("<option value='1'>" + menu + "</option>"));

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
            function checkBehavior (allCheck, subChecks) {
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
                controls.checkStatusUnsupported,
                controls.checkStatusIntegrated
            ]);
            controls.checkStatusActive.prop("checked", true);
            controls.checkStatusNew.prop("checked", true);

            [controls.comboAuthors, controls.comboMenu, controls.comboRelease].forEach(control => {

                control.change(internal.refreshListing);
            });

            controls.comboOrder.change(function () { internal.refreshListing('order'); })

            let inputTimeout = null;
            controls.inputKeywords.on('input', function () {
                clearTimeout(inputTimeout);

                inputTimeout = setTimeout(internal.refreshListing, 200);
            });

            /**
             * When we scroll down a bit, display the scroll button.
             * Scroll button will take us back to the top.
             */
            $(window).scroll(function () {
                if($(this).scrollTop() > 100) {
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

            if(equalsIgnoreCase(event, "order")) {
                const order = controls.comboOrder.find(":selected").val();

                pluginIndex.sort((a, b) => {
                    const dataA = a.getData();
                    const dataB = b.getData();

                    if(equalsIgnoreCase(order, "title")) {
                        return alphaSort(dataA.title, dataB.title);
                    } else if(equalsIgnoreCase(order, "release")) {
                        a = new Date(dataA.release);
                        b = new Date(dataB.release);

                        return (a < b) ? 1 : (a > b) ? -1 : 0;
                    } else if(equalsIgnoreCase(order, "author")) {
                        return alphaSort(dataA.author, dataB.author);
                    } else if(equalsIgnoreCase(order, "menu")) {
                        return alphaSort(dataA.menu, dataB.menu);
                    } else if(equalsIgnoreCase(order, "topicId")) {
                        a = Number(dataA.topic_id);
                        b = Number(dataB.topic_id);

                        return (a < b) ? -1 : (a > b) ? 1 : 0;
                    }
                });
            }

            let html = "";
            let displayCount = 0;
            for(let i=0; i<pluginIndex.length; i++) {
                const plugin = pluginIndex[i];

                const display = shouldPluginDisplay(plugin);

                if (display) {
                    html += plugin.getHtml();
                    displayCount++;
                }
            }
            elements.divPluginList.html(html);
            elements.badgePluginCount.text(displayCount + " / " + pluginIndex.length);
            elements.divLoadingOverlay.fadeOut(fadeMs);
        }
    };
    internal.init();
    internal.loadIndex();
    internal.setupControls();
}());