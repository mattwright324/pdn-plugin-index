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
            "alt_topic" : (this.element.has(".alt") ? this.element.find(".alt").data("id") : ""),
            "author"    : this.element.find(".author").text(),
            "author_id" : this.element.find(".author").data("id"),
            "compat"    : this.element.find(".tag.c").text(),
            "desc"      : this.element.find(".desc").text(),
            "dlls"      : this.element.find(".tag.d").text(),
            "release"   : this.element.find(".release").text(),
            "status"    : this.element.find(".tag.s").text(),
            "title"     : this.element.find(".title").text(),
            "topic_id"  : this.element.data("id"),
            "type"      : this.element.find(".tag.t").text(),
            "menu"      : this.element.find(".tag.m").text(),
        };
    };
    Plugin.prototype = {
        show: ()=>{this.element.show()},
        hide: ()=>{this.element.attr("style", "display:none!important;")},
        shouldDisplay: ()=>{

        }
    };

    function shouldDisplay(plugin) {
        let data = plugin.data;
        let k = keywords.val();
        if(k !== "") {
            let hide = true;
            Object.keys(data).forEach(key => {
                if(data[key].toString().toLowerCase().indexOf(k) !== -1) {
                    hide = false;
                }
            });
            if(hide) return false;
        }
        return true;
    }

    function updateListing() {
        plugins.forEach(plugin => {
            if(shouldDisplay(plugin)) {
                console.log("SHOW " + plugin.title);
                plugin.show();
            } else {
                console.log("HIDE " + plugin.title);
                plugin.hide();
            }
        });
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
    let allTypes, effect, adjustment, filetype, external, pluginPack;
    let anyStatus, active, activeNew, depreciated, obsolete, unsupported, integrated;

    module.init = function() {
        scroll      = $("#scroll");
        sideMenu    = $("#search-menu *");
        pluginBox   = $("#plugin-box");
        count       = $("#count");
        loading     = $("#loading");
        loading.hide();
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
        sideMenu.change(updateListing);

        keywords    = $("#keywords");
        author      = $("#author");
        order       = $("#order");
        menu        = $("#menu-list");
        release     = $("#release");
        keywords.on('keyup', updateListing);

        allTypes    = new CheckBox("#all-types");
        effect      = new CheckBox("#effect");
        adjustment  = new CheckBox("#adjustment");
        filetype    = new CheckBox("#filetype");
        external    = new CheckBox("#external");
        pluginPack  = new CheckBox("#plugin-pack");
        allTypes.setSelected(true);
        cb(allTypes, [effect, adjustment, filetype, external, pluginPack]);

        anyStatus   = new CheckBox("#any-status");
        active      = new CheckBox("#active");
        activeNew   = new CheckBox("#active-new");
        depreciated = new CheckBox("#depreciated");
        obsolete    = new CheckBox("#obsolete");
        unsupported = new CheckBox("#unsupported");
        integrated  = new CheckBox("#integrated");
        active.setSelected(true);
        activeNew.setSelected(true);
        depreciated.setSelected(true);
        cb(anyStatus, [active, activeNew, depreciated, obsolete, unsupported, integrated]);

        /* Load plugins in page to Plugin objects */
        $.each($(".plugin"), (index, value) => {
            plugins.push(new Plugin($(value)));
            count.text(plugins.length);
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

        loading.fadeOut(500);
    };
    module.updateListing = function() {
        loading.show();
        setTimeout(()=>{

            updateListing();
        }, 5);
    };

    return module;
}());

$(document).ready(function() {
   pdnpi.init();
});