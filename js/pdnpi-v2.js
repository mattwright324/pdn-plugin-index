/**
 * Paint.NET Plugin Index
 * A searchable web interface for the index.
 *
 * https://github.com/mattwright324/pdn-plugin-index
 *
 * @requires jquery
 * @requires bootstrap
 * @author mattwright324
 */
let pdnpi = (function() {
    'use strict';
    let module = {};

    let CheckBox = function(id) { this.element = $(id + " *"); };
    CheckBox.prototype = {
        setSelected: function(select) { this.element.prop("checked", select); },
        isSelected: function() { return this.element.is(":checked"); }
    };

    /* Setup functionality for checkboxes 'all' and children */
    function cb(allCb, cbs) {
        allCb.element.change(function(){
            if(allCb.isSelected()) {
                cbs.forEach(checkBox => checkBox.setSelected(false));
            }
        });
        cbs.forEach(checkBox => checkBox.element.change(function() {
            if(checkBox.isSelected()) {
                allCb.setSelected(false);
            }
        }));
    }

    /* Plugin object to manipulate  */
    let Plugin = function(element) {
        this.element = element;
        this.data = {
            "alt_topic" :(this.element.has(".alt") ? this.element.find(".alt").data("id") : ""),
            "author"    : this.element.find(".author").text(),
            "author_id" : this.element.find(".author").data("id"),
            "compat"    : this.element.find(".tag.c").text(),
            "desc"      : this.element.find(".desc").text(),
            "dlls"      : this.element.find(".tag.d").text(),
            "release"   : this.element.find(".release").text(),
            "status"    : this.element.find(".tag.s").text().trim(),
            "title"     : this.element.find(".title").text(),
            "topic_id"  : this.element.data("id"),
            "type"      : this.element.find(".tag.t").text().trim(),
            "menu"      : this.element.find(".tag.m").text(),
        };
        this.show = ()=>{this.element.show()};
        this.hide = ()=>{this.element.attr("style", "display:none!important;")};
    };

    function shouldDisplay(plugin) {
        let data = plugin.data;
        let k = keywords.val();
        if(k !== "") {
            let hide = true;
            Object.keys(data).forEach(key => {
                if (data[key] && data[key].toString().toLowerCase().indexOf(k.toLowerCase()) !== -1) {
                    hide = false;
                }
            });
            if (hide) {
                console.log("FAIL K");
                return false;
            }
        }

        let a = author.find(":selected").val();
        if(a === '1') {
            let a_text = author.find(":selected").text();
            if(data.author !== a_text) {
                return false;
            }
        }

        if(!allTypes.isSelected()) {
            let hide = true;
            if (data.type === "Effect" && effect.isSelected() ||
                data.type === "Adjustment" && adjustment.isSelected() ||
                data.type === "Filetype" && filetype.isSelected() ||
                data.type === "External Resource" && external.isSelected() ||
                data.type === "Plugin Pack" && pluginPack.isSelected()){
                hide = false;
            }
            if(hide) {
                return false;
            }
        }

        if(!anyStatus.isSelected()) {
            let hide = true;
            if ((data.status === "Active" || data.status === "New") && active.isSelected() ||
                data.status === "New" && activeNew.isSelected() ||
                data.status === "deprecated" && deprecated.isSelected() ||
                data.status === "Obsolete" && obsolete.isSelected() ||
                data.status === "Unsupported" && unsupported.isSelected() ||
                data.status === "Integrated" && integrated.isSelected()) {
                hide = false;
            }
            if(hide) {
                return false;
            }
        }

        let m = menu.find(":selected").val();
        if(m === '1') {
            let m_text = menu.find(":selected").text();
            if(data.menu !== m_text) {
                return false;
            }
        }

        let r = release.find(":selected").val();
        if(r !== '0') {
            let now = new Date();
            let date = new Date(plugin.data.release);
            let monthMillis = 1000*60*60*24*30;
            let diff = now - date;
            if(r === '1' && diff > (monthMillis * 6)) {
                return false;
            } else if(r === '2' && diff > (monthMillis * 12)) {
                return false;
            } else if(r === '3' && diff > (monthMillis * 12 * 3)) {
                return false;
            }
        }
        return true;
    }

    function updateListing() {
        loading.show();
        plugins.forEach(plugin => {
            if(shouldDisplay(plugin)) {
                plugin.show();
            } else {
                plugin.hide();
            }
        });

        sortOrder = order.find(":selected").val();
        if(sortOrder !== lastOrder) {
            pluginBox.find(".plugin").sort(function(a, b){
                let ca, cb;
                if(sortOrder === '0') {
                    ca = $(a).find(".title").text();
                    cb = $(b).find(".title").text();
                } else if(sortOrder === '1') {
                    ca = new Date($(a).find(".release").text());
                    cb = new Date($(b).find(".release").text());
                    return (ca < cb) ? 1 : (ca > cb) ? -1 : 0;
                } else if(sortOrder === '2') {
                    ca = $(a).find(".author").text();
                    cb = $(b).find(".author").text();
                } else if(sortOrder === '3') {
                    ca = $(a).find(".menu").text();
                    cb = $(b).find(".menu").text();
                } else if(sortOrder === '4') {
                    ca = new Number($(a).data("id"));
                    cb = new Number($(b).data("id"));
                }
                return (ca < cb) ? -1 : (ca > cb) ? 1 : 0;
            }).appendTo("#plugin-box");

            lastOrder = sortOrder;
        }

        count.text(pluginBox.find(".plugin:visible").length + " / " + plugins.length);

        loading.fadeOut(500);
    }

    let sortAlpha = function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); };

    let plugins = [];
    let authors = [];
    let menus   = [];

    let scroll;
    let sideMenu;
    let pluginBox;
    let count;
    let loading;
    let keywords, author, order, menu, release;
    let sortOrder = -1, lastOrder = -1;
    let allTypes, effect, adjustment, filetype, external, pluginPack;
    let anyStatus, active, activeNew, deprecated, obsolete, unsupported, integrated;

    module.init = function() {
        scroll      = $("#scroll");
        sideMenu    = $("#search-menu *");
        pluginBox   = $("#plugin-box");
        count       = $("#count");
        loading     = $("#loading");

        $(window).scroll(function(){
            if ($(this).scrollTop() > 100) {
                scroll.fadeIn();
            } else {
                scroll.fadeOut();
            }
        });
        scroll.click(function(){
            $("html, body").animate({ scrollTop: 0 }, 600);
            return false;
        });
        sideMenu.change(module.updateListing);

        keywords    = $("#keywords");
        author      = $("#author");
        order       = $("#order");
        menu        = $("#menu-list");
        release     = $("#release");
        keywords.on('keyup', module.updateListing);

        allTypes    = new CheckBox("#all-types");
        effect      = new CheckBox("#effect");
        adjustment  = new CheckBox("#adjustment");
        filetype    = new CheckBox("#filetype");
        external    = new CheckBox("#external");
        pluginPack  = new CheckBox("#plugin-pack");
        allTypes.setSelected(true);
        effect.setSelected(false);
        adjustment.setSelected(false);
        filetype.setSelected(false);
        external.setSelected(false);
        pluginPack.setSelected(false);
        cb(allTypes, [effect, adjustment, filetype, external, pluginPack]);

        anyStatus   = new CheckBox("#any-status");
        active      = new CheckBox("#active");
        activeNew   = new CheckBox("#active-new");
        deprecated = new CheckBox("#deprecated");
        obsolete    = new CheckBox("#obsolete");
        unsupported = new CheckBox("#unsupported");
        integrated  = new CheckBox("#integrated");
        active.setSelected(true);
        activeNew.setSelected(true);
        
        cb(anyStatus, [active, activeNew, deprecated, obsolete, unsupported, integrated]);

        /* Load plugins in page to Plugin objects */
        $.each($(".plugin"), (index, value) => {
            plugins.push(new Plugin($(value)));
        });

        plugins.forEach(plugin => {
            if(authors.indexOf(plugin.data.author) === -1) {
                authors.push(plugin.data.author);
            }
            if(menus.indexOf(plugin.data.menu) === -1) {
                menus.push(plugin.data.menu);
            }
        });

        authors.sort(sortAlpha);
        authors.forEach(a => {
            author.append('<option value="1">'+a+'</option>');
        });

        menus.sort(sortAlpha);
        menus.forEach(m => {
            menu.append('<option value="1">'+m+'</option>');
        });

        updateListing();
    };
    module.updateListing = function() {
        setTimeout(updateListing, 25);
    };
    module.dataIntegrity = function() {
        /* Run this method in console to detect plugins with potential data issues.
         * - Invalid dates (data.release)
         * - Invalid id's (data.topic_id, data.author_id, data.alt_topic)
         * - Invalid type (data.type)
         * - Invalid status (data.status)
         * - Empty strings (data.title, data.author, data.desc, data.compat, data.menu, data.dlls)
         */

        let failures = 0;
        function invalid(data, value, reason) {
            console.log(`${reason} [value=${value}] - ${JSON.stringify(data)}`);
            failures++;
        }
        let is = {
            validNumber(value) {
                // While less than 0 is a valid number, the id values we are checking should not be.
                return value instanceof Number && !isNaN(value) && value > 0;
            },
            validDate(value) {
                return value instanceof Date && !isNaN(value);
            },
            validType(value) {
                let types = new Set(["effect", "adjustment", "filetype", "external resource", "plugin pack"]);
                return value instanceof String && types.has(value.toLowerCase());
            },
            validStatus(value) {
                let status = new Set(["active", "new", "deprecated", "obsolete", "unsupported", "integrated"]);
                return value instanceof String && status.has(value.toLowerCase());
            },
            emptyString(value) {
                // Source: https://stackoverflow.com/a/36328062/2650847
                return typeof value === 'undefined' || !value ||
                    value.length === 0 || value === "" || !/[^\s]/.test(value) ||
                    /^\s*$/.test(value) || value.replace(/\s/g,"") === "";
            }
        };

        plugins.forEach(plugin => {
            let data = plugin.data;
            if(!is.validDate(new Date(data.release))) {
                invalid(data, data.release, "INVALID DATE");
            }
            if(!is.validNumber(new Number(data.topic_id))) {
                invalid(data, data.topic_id, "INVALID TOPIC_ID");
            }
            if(!is.validNumber(new Number(data.author_id))) {
                invalid(data, data.author_id, "INVALID AUTHOR_ID");
            }
            if(data.alt_topic && !is.validNumber(new Number(data.alt_topic))) {
                invalid(data, data.alt_topic, "INVALID ALT_TOPIC");
            }
            if(!is.validType(new String(data.type))) {
                invalid(data, data.type, "INVALID TYPE");
            }
            if(!is.validStatus(new String(data.status))) {
                invalid(data, data.status, "INVALID STATUS");
            }
            if(is.emptyString(new String(data.title))) {
                invalid(data, data.title, "INVALID TITLE");
            }
            if(is.emptyString(new String(data.author))) {
                invalid(data, data.author, "INVALID AUTHOR");
            }
            if(is.emptyString(new String(data.desc))) {
                invalid(data, data.desc, "INVALID DESC");
            }
            if(is.emptyString(new String(data.compat))) {
                invalid(data, data.compat, "INVALID COMPAT");
            }
            if(is.emptyString(new String(data.menu))) {
                invalid(data, data.menu, "INVALID MENU");
            }
            if(is.emptyString(new String(data.dlls))) {
                invalid(data, data.dlls, "INVALID DLLS");
            }
        });

        console.log(`%cFound ${failures} data issues`, failures > 0 ? "color:red;font-weight:700" : "color:green");
    };

    return module;
}());

$(document).ready(function() {
    pdnpi.init();
});