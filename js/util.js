const collator = new Intl.Collator(undefined, {sensitivity: "base"});

/** Case- and accent-insensitive string comparison, for Array.sort(). */
export const alphaSort = (a, b) => collator.compare(a, b);

export const debounce = (func, wait) => {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

export const slugify = (text) => {
    return String(text)
        .normalize('NFKD') // split accented characters into their base characters and diacritical marks
        .replace(/[\u0300-\u036f]/g, '') // remove all the accents, which happen to be all in the \u03xx UNICODE block.
        .trim() // trim leading or trailing whitespace
        .toLowerCase() // convert to lowercase
        .replace(/[^a-z0-9 -]/g, '') // remove non-alphanumeric characters
        .replace(/\s+/g, '-') // replace spaces with hyphens
        .replace(/-+/g, '-'); // remove consecutive hyphens
}

const HTML_ESCAPES = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"};

/**
 * Escape text for safe use in HTML content and quoted attribute values.
 */
export const escapeHtml = (text) => {
    return String(text ?? "").replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

/**
 * Parse an HTML string containing a single root element.
 */
export const htmlToElement = (html) => {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
}

/**
 * Whether a <select> has an option with exactly this value.
 * Avoids building a CSS selector from untrusted input.
 */
export const hasOption = (select, value) => {
    return Array.from(select.options).some(option => option.value === value);
}
