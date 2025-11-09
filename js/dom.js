/**
 * Wait for the DOM to be ready.
 * Alternate to $(document).ready()
 */
export const doc_ready =  async () => {
    return new Promise(resolve => {
        if (document.readyState !== "loading") {
            resolve();
        } else {
            document.addEventListener("DOMContentLoaded", resolve);
        }
    })
}

/**
 * Store all DOM elements and controls here.
 */
export const controls = {}
export const elements = {}

let readyState;
let readyPromise;

/**
 * Extension of doc_ready() to load required DOM elements and controls.
 */
export const dom_ready = async () => {
    if (readyState === 'ready') {
        return;
    }
    if (readyState === 'loading') {
        return readyPromise;
    }
    readyState = 'loading';

    return readyPromise = dom_load();
}

const dom_load = async () => {
    await doc_ready();

    elements.badgePluginCount = document.querySelector("#count");
    elements.divPluginList = document.querySelector("#plugins-list");
    controls.btnScrollToTop = document.querySelector("#scrollToTop");

    controls.inputKeywords = document.querySelector("#keywords");
    controls.comboAuthors = document.querySelector("#author");
    controls.comboOrder = document.querySelector("#order");
    controls.comboMenu = document.querySelector("#menu-list");
    controls.comboKeywordStyle = document.querySelector("#keywordStyle");
    controls.comboPluginStatus = document.querySelector("#pluginStatus");
    controls.comboPluginType = document.querySelector("#pluginType");

    controls.navIssuesButton = document.querySelector("#nav-issues");
    elements.issuesList = document.querySelector("#issuesList");

    console.log("Loaded [controls:", controls, "] [elements:", elements, "]")
}