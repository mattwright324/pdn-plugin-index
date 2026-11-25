const collator = new Intl.Collator(undefined, {sensitivity: "base"});

/** Case- and accent-insensitive comparison, for Array.sort(). */
export const alphaSort = (a, b) => collator.compare(a, b);

export const lower = (value) => String(value ?? "").trim().toLowerCase();

/** Like Object.groupBy(), which older browsers lack. */
export const groupBy = (items, keyOf) => {
    const groups = {};
    for (const item of items) {
        (groups[keyOf(item)] ??= []).push(item);
    }
    return groups;
};

export const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

export const slugify = (text) => String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const HTML_ESCAPES = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"};

/** Escape text for HTML content and quoted attribute values. */
export const escapeHtml = (text) => String(text ?? "").replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);

/** Parse HTML with a single root element. */
export const htmlToElement = (html) => {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
};

/** Whether a <select> has an option with this value, without building a selector from untrusted input. */
export const hasOption = (select, value) => Array.from(select.options).some(option => option.value === value);
