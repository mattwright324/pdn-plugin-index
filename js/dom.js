// Module scripts are deferred, so the document is already parsed when this runs.
const selector = selector => document.querySelector(selector);

export const ui = Object.freeze({
    pluginList: selector("#plugins-list"),
    pluginCount: selector("#count"),
    issuesList: selector("#issuesList"),
    navIssues: selector("#nav-issues"),

    btnScrollToTop: selector("#scrollToTop"),
    btnPermalink: selector("#permalink-button"),
    btnResetFilters: selector("#resetFilters"),

    inputKeywords: selector("#keywords"),
    comboKeywordStyle: selector("#keywordStyle"),
    comboStatus: selector("#pluginStatus"),
    comboType: selector("#pluginType"),
    comboAuthor: selector("#author"),
    comboMenu: selector("#menu-list"),
    comboOrder: selector("#order"),
});
