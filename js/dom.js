/**
 * Wait for the DOM to be ready.
 * Alternate to $(document).ready()
 */
export async function doc_ready() {
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

let domReady = false;

/**
 * Extension of doc_ready() to load required DOM elements and controls.
 */
export async function dom_ready() {
    if (domReady) {
        return;
    }
    domReady = true;

    await doc_ready();

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

    console.log("Loaded [controls:", controls, "] [elements:", elements, "]")
}