import MiniSearch from "minisearch";
import {toUsSpelling} from "spelling";

/**
 * Keyword search with MiniSearch (https://lucaong.github.io/minisearch/).
 *
 * Words match regardless of case, accents, possessives and British spelling, and also match longer words
 * they start ("grad" -> "gradient"). Typo tolerance only applies to a word that matches nothing as typed,
 * so real words don't match each other ("fire" doesn't find "file").
 */

/** Fields searched, and how much a match in each counts. */
const FIELD_BOOSTS = {title: 4, author: 2, menu: 1.5, desc: 1, dlls: 1};
const FIELDS = Object.keys(FIELD_BOOSTS);

const typoDistance = (length) => length >= 8 ? 2 : length >= 4 ? 1 : 0;

const CAMEL_CASE_BOUNDARY = /(?<=\p{Ll})(?=\p{Lu})|(?<=\p{Lu})(?=\p{Lu}\p{Ll})/u;

/** "Red Ochre's<br>Pack" -> ["Red", "Ochre", "Pack"] */
const splitWords = (text) => text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/['’]s\b/gi, "")
    .replace(/['’]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/** Also index the parts of CamelCase words: "EOEffects" -> ["EOEffects", "EO", "Effects"] */
const splitIndexWords = (text) => splitWords(text).flatMap(word => {
    const parts = word.split(CAMEL_CASE_BOUNDARY);
    return parts.length > 1 ? [word, ...parts] : [word];
});

const normalizeTerm = (word) => toUsSpelling(word.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase());

let miniSearch;
/** @type {Map<number, Plugin>} */
let pluginsById;
/** Each plugin's normalized text, for "exact match". @type {[Plugin, string][]} */
let exactTexts;

/** @param {Plugin[]} plugins */
export function buildSearchIndex(plugins) {
    pluginsById = new Map(plugins.map(plugin => [plugin.id, plugin]));

    miniSearch = new MiniSearch({
        fields: FIELDS,
        extractField: (plugin, field) => field === "id" ? plugin.id : plugin.field(field),
        tokenize: splitIndexWords,
        processTerm: normalizeTerm,
        searchOptions: {
            tokenize: splitWords,
            boost: FIELD_BOOSTS,
            prefix: true,
            fuzzy: term => miniSearch.search(term, {fuzzy: false}).length ? false : typoDistance(term.length),
        },
    });
    miniSearch.addAll(plugins);

    // Fields are joined with a newline, so an exact match can't span two fields.
    exactTexts = plugins.map(plugin => [plugin, FIELDS
        .map(field => splitWords(plugin.field(field)).map(normalizeTerm).join(" "))
        .join("\n")]);
}

/**
 * @param {string} keywords
 * @param {string} keywordStyle - all | any | exact
 * @returns {Map<Plugin, {score: number, match: Object<string, string[]>}>|null} the matching plugins,
 *      with their score and the fields each indexed word matched in; or null if there are no keywords
 */
export function searchKeywords(keywords, keywordStyle) {
    const phrase = splitWords(keywords).map(normalizeTerm).join(" ");
    if (!phrase) {
        return null;
    }

    if (keywordStyle === "exact") {
        // Like a plain text search, it can start or end mid-word. The scores are only for ranking.
        const ranks = new Map(miniSearch.search(keywords, {fuzzy: false}).map(result => [result.id, result]));
        return new Map(exactTexts
            .filter(([, text]) => text.includes(phrase))
            .map(([plugin]) => [plugin, ranks.get(plugin.id) ?? {score: 0, match: {}}]));
    }

    const combineWith = keywordStyle === "any" ? "OR" : "AND";
    return new Map(miniSearch.search(keywords, {combineWith})
        .map(result => [pluginsById.get(result.id), result]));
}
