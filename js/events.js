import {controls, elements} from "dom";
import * as util from "util";

let enabledTooltips = false;

export function enableDynamicTooltips() {
    if (enabledTooltips) {
        return
    }
    enabledTooltips = true;

    console.log("Enabling dynamic tooltips");

    document.addEventListener('mouseover', function (e) {
        const target = e.target.closest('[data-bs-toggle="tooltip"]');
        if (target && !target.hasAttribute("bs-tt-added")) {
            target.setAttribute("bs-tt-added", true);
            const tooltip = new bootstrap.Tooltip(target);
            tooltip.show();
        }
    })
}

export function initEventListeners() {
    const debouncedRefresh = util.debounce(() => refreshListing(), 150);
    controls.inputKeywords.addEventListener('input', debouncedRefresh);

    [controls.comboKeywordStyle, controls.comboPluginStatus, controls.comboPluginType,
        controls.comboAuthors, controls.comboMenu].forEach(control => {
        control.addEventListener("change", () => refreshListing());
    });

    controls.comboOrder.addEventListener("change", function () {
        refreshListing(true);
    });

    document.querySelector('#permalink-button').addEventListener('click', async () => {
        const permalinkTooltip = bootstrap.Tooltip.getInstance('#permalink-button');
        const permalinkIcon = document.querySelector('#permalink-icon');

        try {
            await navigator.clipboard.writeText(buildPermalink());
            permalinkTooltip.setContent({'.tooltip-inner': 'Copied!'});
            permalinkIcon.classList.remove('bi-link-45deg', 'bi-check-lg', 'bi-x-circle');
            permalinkIcon.classList.add('bi-check-lg');
        } catch (err) {
            console.error('Failed to copy:', err);
            permalinkTooltip.setContent({'.tooltip-inner': 'Failed to copy'});
            permalinkIcon.classList.remove('bi-link-45deg', 'bi-check-lg', 'bi-x-circle');
            permalinkIcon.classList.add('bi-x-circle');
        }

        // remove focus after 1.9 seconds.
        // this gives the tooltip's fade animation a head start of 100 ms.
        // otherwise the tooltip text will change during the animation.
        setTimeout(() => {
            permalinkIcon.parentElement.blur();
        }, 1900);

        // reset icon and tooltip after 2 seconds
        setTimeout(() => {
            permalinkTooltip.setContent({'.tooltip-inner': 'Copy Permalink'});
            permalinkIcon.classList.remove('bi-link-45deg', 'bi-check-lg', 'bi-x-circle');
            permalinkIcon.classList.add('bi-link-45deg');
        }, 2000);
    });

    document.querySelector('#resetFilters').addEventListener('click', function () {
        resetFilters();
    });

    /**
     * When we scroll down a bit, display the scroll button.
     * Scroll button will take us back to the top.
     */
    window.addEventListener("scroll", () => {
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
    });
}

export async function resetFilters() {
    controls.inputKeywords.value = '';
    controls.comboKeywordStyle.value = 'any';
    controls.comboPluginStatus.value = 'active';
    controls.comboPluginType.value = 'any';
    controls.comboAuthors.value = 'any';
    controls.comboMenu.value = 'any';
    controls.comboOrder.value = 'release_new';

    await refreshListing(true);
}

export async function refreshListing(reorder = false) {
    try {
        console.log("Refreshing the plugin list...");

        if (reorder) {
            const order = controls.comboOrder.options[controls.comboOrder.selectedIndex].value;

            index.plugins.sort((a, b) => {
                if (util.equalsIgnoreCase(order, "release_new")) {
                    return util.numericCompare(a.release, b.release);
                } else if (util.equalsIgnoreCase(order, "release_old")) {
                    return util.numericCompare(b.release, a.release);
                } else if (util.equalsIgnoreCase(order, "title")) {
                    return util.alphaSort(a.title, b.title);
                } else if (util.equalsIgnoreCase(order, "author")) {
                    return util.alphaSort(a.author, b.author);
                } else if (util.equalsIgnoreCase(order, "menu")) {
                    return util.alphaSort(a.menu, b.menu);
                }
            });
        }

        const filters = {
            keywords: controls.inputKeywords.value,
            keywordStyle: controls.comboKeywordStyle.value,
            type: controls.comboPluginType.value,
            status: controls.comboPluginStatus.value,
            author: controls.comboAuthors.value,
            menu: controls.comboMenu.value,
        }

        console.log("Search filters", filters);

        const pluginsToDisplay = index.plugins
            .filter(plugin => plugin.shouldDisplay(filters))
            .map(plugin => plugin.html);

        const html = pluginsToDisplay.join("");
        const displayCount = pluginsToDisplay.length;

        elements.divPluginList.replaceChildren();
        elements.divPluginList.insertAdjacentHTML("afterbegin", html);
        elements.badgePluginCount.textContent = `${displayCount} / ${index.plugins.length}`;
    } catch (err) {
        console.error("Refresh failed:", err);
        elements.badgePluginCount.textContent = "Error";
    }
}

const appUrlParams = {
    keywords: {
        // Build permalink
        value: () => controls.inputKeywords.value.trim(),
        shouldParam: (value) => value,
        // Use value from permalink
        useParam: (value) => {
            controls.inputKeywords.value = value;
        }
    },
    keywordStyle: {
        value: () => controls.comboKeywordStyle.value.trim().toLowerCase(),
        shouldParam: (value) => value !== 'any',
        useParam: (value) => {
            if (controls.comboKeywordStyle.querySelector(`option[value='${value}']`)) {
                controls.comboKeywordStyle.value = value;
            }
        }
    },
    author: {
        value: () => controls.comboAuthors.value.trim().toLowerCase(),
        shouldParam: (value) => value !== 'any',
        useParam: (value) => {
            if (controls.comboAuthors.querySelector(`option[value='${value}']`)) {
                controls.comboAuthors.value = value;
            }
        }
    },
    type: {
        value: () => controls.comboPluginType.value.trim().toLowerCase(),
        shouldParam: (value) => value !== 'any',
        useParam: (value) => {
            if (controls.comboPluginType.querySelector(`option[value='${value}']`)) {
                controls.comboPluginType.value = value;
            }
        }
    },
    status: {
        value: () => controls.comboPluginStatus.value.trim().toLowerCase(),
        shouldParam: (value) => value !== 'active',
        useParam: (value) => {
            if (controls.comboPluginStatus.querySelector(`option[value='${value}']`)) {
                controls.comboPluginStatus.value = value;
            }
        }
    },
    menu: {
        value: () => controls.comboMenu.value.trim().toLowerCase(),
        shouldParam: (value) => value !== 'any',
        useParam: (value) => {
            const menuOption = controls.comboMenu.querySelector(`option[value='${value}']`);
            if (menuOption) {
                controls.comboMenu.value = value;
            }
        }
    },
    order: {
        value: () => controls.comboOrder.value.trim().toLowerCase(),
        shouldParam: (value) => value !== 'release_new',
        useParam: (value) => {
            if (controls.comboOrder.querySelector(`option[value='${value}']`)) {
                controls.comboOrder.value = value;
            }
        }
    }
}

export function buildPermalink() {
    const params = new URLSearchParams();

    Object.keys(appUrlParams).forEach(key => {
        const value = appUrlParams[key].value();
        if (appUrlParams[key].shouldParam(value)) {
            params.append(key, value);
        }
    })

    let hostUrl;
    if (window !== window.parent) {
        hostUrl = 'https://forums.getpaint.net/PluginIndex';
    } else {
        hostUrl = window.location.origin + window.location.pathname;
    }

    return hostUrl + '?' + params.toString();
}

export function useSearchParams() {
    const urlSearchParams = new URL(window.location).searchParams;

    console.log('Search Params', urlSearchParams);

    for (const [key, value] of urlSearchParams) {
        const lowerValue = value.trim().toLowerCase();

        appUrlParams[key]?.useParam(lowerValue);
    }

    // Trigger a refresh if we have any URL parameters
    if (Object.keys(urlSearchParams).length > 0) {
        refreshListing()
    }
}