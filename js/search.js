import MiniSearch from "minisearch";
import {removePrefix, removeSuffix, toUsSpelling} from "spelling";

/**
 * Keyword search with MiniSearch (https://lucaong.github.io/minisearch/).
 *
 * Words match regardless of case, accents, possessives and British spelling, and also match longer words
 * they start ("grad" -> "gradient"), or start after a prefix or CamelCase boundary ("align" -> "misaligned").
 * Search words also match without their suffix ("aligned" -> "align"), but count for more as typed.
 * Typo tolerance only applies to a word that matches nothing as typed, so real words don't match each other
 * ("fire" doesn't find "file").
 */

/** Fields searched, and how much a match in each counts. */
const FIELD_BOOSTS = {title: 4, author: 2, menu: 1.5, desc: 1, dlls: 1};
const FIELDS = Object.keys(FIELD_BOOSTS);

/** Word parts from all fields, so they count for less than whole words: see wordParts(). */
const PARTS_FIELD = "parts";
const PARTS_BOOST = 0.5;

const typoDistance = (length) => length >= 8 ? 2 : length >= 4 ? 1 : 0;

const CAMEL_CASE_BOUNDARY = /(?<=\p{Ll})(?=\p{Lu})|(?<=\p{Lu})(?=\p{Lu}\p{Ll})/u;

/** A word without its prefix must start like an indexed word: "unique" -> "ique" would only be a typo match. */
const STEM_LENGTH = 4;
/** @type {Set<string>} */
let stems;

/** "Red Ochre's<br>Pack" -> ["Red", "Ochre", "Pack"] */
const splitWords = (text) => text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/['’]s\b/gi, "")
    .replace(/['’]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const withoutPrefix = (word) => {
    const rest = removePrefix(word.toLowerCase());
    return rest?.length >= STEM_LENGTH && stems.has(normalizeTerm(rest).slice(0, STEM_LENGTH)) ? [rest] : [];
};

/** "EOEffects misaligned UnsharpMask" -> ["EO", "Effects", "aligned", "Unsharp", "Mask", "sharp"] */
const wordParts = (text) => splitWords(text).flatMap(word => {
    const camelParts = word.split(CAMEL_CASE_BOUNDARY);
    const parts = camelParts.length > 1 ? camelParts : [];
    return [...parts, ...[word, ...parts].flatMap(withoutPrefix)];
});

const normalizeTerm = (word) => toUsSpelling(word.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase());

let miniSearch;
const hasMatch = (term) => miniSearch.search(term, {fuzzy: false}).length > 0;
/** @type {Map<number, Plugin>} */
let pluginsById;
/** Each plugin's normalized text, for "exact match". @type {[Plugin, string][]} */
let exactTexts;

/** @param {Plugin[]} plugins */
export function buildSearchIndex(plugins) {
    pluginsById = new Map(plugins.map(plugin => [plugin.id, plugin]));
    stems = new Set(plugins.flatMap(plugin => FIELDS.flatMap(field => splitWords(plugin.field(field))))
        .map(normalizeTerm)
        .filter(term => term.length >= STEM_LENGTH)
        .map(term => term.slice(0, STEM_LENGTH)));

    miniSearch = new MiniSearch({
        fields: [...FIELDS, PARTS_FIELD],
        extractField: (plugin, field) => {
            if (field === "id") {
                return plugin.id;
            }
            return field === PARTS_FIELD ? FIELDS.map(name => plugin.field(name)).join(" ") : plugin.field(field);
        },
        tokenize: (text, field) => field === PARTS_FIELD ? wordParts(text) : splitWords(text),
        processTerm: normalizeTerm,
        searchOptions: {
            tokenize: splitWords,
            boost: {...FIELD_BOOSTS, [PARTS_FIELD]: PARTS_BOOST},
            prefix: true,
            fuzzy: term => hasMatch(term) || hasMatch(removeSuffix(term)) ? false : typoDistance(term.length),
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
    const terms = splitWords(keywords).map(normalizeTerm);
    if (!terms.length) {
        return null;
    }

    if (keywordStyle === "exact") {
        // Like a plain text search, it can start or end mid-word. The scores are only for ranking.
        const phrase = terms.join(" ");
        const ranks = new Map(miniSearch.search(keywords, {fuzzy: false}).map(result => [result.id, result]));
        return new Map(exactTexts
            .filter(([, text]) => text.includes(phrase))
            .map(([plugin]) => [plugin, ranks.get(plugin.id) ?? {score: 0, match: {}}]));
    }

    // Each word, or the word without its suffix. Matching both scores higher.
    const query = {
        combineWith: keywordStyle === "any" ? "OR" : "AND",
        queries: terms.map(term => ({combineWith: "OR", queries: [...new Set([term, removeSuffix(term)])]})),
    };
    return new Map(miniSearch.search(query).map(result => [pluginsById.get(result.id), result]));
}
