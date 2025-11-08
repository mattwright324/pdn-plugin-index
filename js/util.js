export const equalsIgnoreCase = (a, b) => {
    return String(a).toUpperCase() === String(b).toUpperCase();
}

export const alphaSort = (a, b) => {
    return a.toUpperCase().localeCompare(b.toUpperCase());
};

export const numericCompare = (a, b) => {
    return (a < b) ? 1 : (a > b) ? -1 : 0;
};

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

export const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));