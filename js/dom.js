/**
 * References to the page's elements.
 *
 * Module scripts are deferred, so the document is fully parsed before any module runs
 * and these can be looked up when this module loads.
 */
const $ = selector => document.querySelector(selector);

export const ui = Object.freeze({
    pluginList: $("#plugins-list"),
    pluginCount: $("#count"),
    issuesList: $("#issuesList"),
    navIssues: $("#nav-issues"),

    btnScrollToTop: $("#scrollToTop"),
    btnPermalink: $("#permalink-button"),
    btnResetFilters: $("#resetFilters"),

    inputKeywords: $("#keywords"),
    comboKeywordStyle: $("#keywordStyle"),
    comboStatus: $("#pluginStatus"),
    comboType: $("#pluginType"),
    comboAuthor: $("#author"),
    comboMenu: $("#menu-list"),
    comboOrder: $("#order"),
});
