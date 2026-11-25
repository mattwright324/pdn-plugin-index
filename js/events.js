import {ui} from "dom";
import * as util from "util";
import {buildPermalink, resetFilters} from "filters";
import {refreshListing} from "listing";

/** Create Bootstrap tooltips on first hover, so dynamically added elements get them too. */
export function enableDynamicTooltips() {
    document.addEventListener("mouseover", e => {
        const target = e.target.closest('[data-bs-toggle="tooltip"]');
        if (target && !bootstrap.Tooltip.getInstance(target)) {
            bootstrap.Tooltip.getOrCreateInstance(target).show();
        }
    });
}

export function initEventListeners() {
    const debouncedRefresh = util.debounce(() => refreshListing(), 150);
    ui.inputKeywords.addEventListener("input", debouncedRefresh);

    [ui.comboKeywordStyle, ui.comboStatus, ui.comboType, ui.comboAuthor, ui.comboMenu].forEach(control => {
        control.addEventListener("change", () => refreshListing());
    });

    ui.comboOrder.addEventListener("change", () => refreshListing(true));
    ui.btnPermalink.addEventListener("click", copyPermalink);
    ui.btnResetFilters.addEventListener("click", () => {
        resetFilters();
        refreshListing(true);
    });

    // Not Bootstrap collapse: its height animation can't apply to inline text, so it only adds a delay.
    ui.pluginList.addEventListener("click", e => {
        const toggle = e.target.closest(".desc-toggle");
        if (!toggle) {
            return;
        }
        const expanded = toggle.closest(".desc").classList.toggle("expanded");
        toggle.setAttribute("aria-expanded", String(expanded));
        toggle.textContent = expanded ? "Show less" : "Show more";
    });

    window.addEventListener("scroll", () => {
        ui.btnScrollToTop.classList.toggle("show", document.documentElement.scrollTop > 100);
    }, {passive: true});
    ui.btnScrollToTop.addEventListener("click", () => {
        window.scrollTo({top: 0, left: 0, behavior: "smooth"});
    });
}

let permalinkResetTimers = [];

async function copyPermalink() {
    const button = ui.btnPermalink;
    const tooltip = bootstrap.Tooltip.getOrCreateInstance(button);
    const icon = button.querySelector("i");

    const setState = (text, iconClass) => {
        tooltip.setContent({".tooltip-inner": text});
        icon.classList.remove("bi-link-45deg", "bi-check-lg", "bi-x-circle");
        icon.classList.add(iconClass);
    };

    permalinkResetTimers.forEach(clearTimeout);

    try {
        await navigator.clipboard.writeText(buildPermalink());
        setState("Copied!", "bi-check-lg");
    } catch (err) {
        console.error("Failed to copy:", err);
        setState("Failed to copy", "bi-x-circle");
    }

    permalinkResetTimers = [
        // Blur first, so the tooltip fades out before its text changes back.
        setTimeout(() => button.blur(), 1900),
        setTimeout(() => setState("Copy Permalink", "bi-link-45deg"), 2000),
    ];
}
