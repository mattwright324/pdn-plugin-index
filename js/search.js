import MiniSearch from "minisearch";
import {removePrefix, removeSuffix, toUsSpelling} from "spelling";

/**
 * Keyword search with MiniSearch (https://lucaong.github.io/minisearch/).
 *
 * Words match regardless of case, accents, possessives and British spelling, and also match longer words
 * they start ("grad" -> "gradient"), or start after a prefix or CamelCase boundary ("align" -> "misaligned").
 * Search words also match without their suffix ("aligned" -> "align"), but count for more as typed.
 * Typo tolerance only applies to a word that matches nothing as typed, so real words don't match each other
 * ("fire" doesn't find "file"). Newer plugins, and ones for newer Paint.NET versions, score higher.
 */

/** Fields searched, and how much a match in each counts. */
const FIELD_BOOSTS = {title: 4, author: 2, menu: 1.5, desc: 1, dlls: 1};
const FIELDS = Object.keys(FIELD_BOOSTS);

/** Parts of words from all fields, which count for less than whole words: see wordParts(). */
const PARTS_FIELD = "parts";
const PARTS_BOOST = 0.5;

/** How much more the newest plugin, and the one for the newest Paint.NET version, score than the oldest. */
const RECENCY_BOOST = 2;
const COMPATIBILITY_BOOST = 10;

/** A word without its prefix must start like an indexed word: "unique" -> "ique" would only be a typo match. */
const STEM_LENGTH = 4;

const CAMEL_CASE_BOUNDARY = /(?<=\p{Ll})(?=\p{Lu})|(?<=\p{Lu})(?=\p{Lu}\p{Ll})/u;

const typoDistance = (length) => length >= 8 ? 2 : length >= 4 ? 1 : 0;

let miniSearch;
/** @type {Map<number, Plugin>} */
let pluginsById;
/** First STEM_LENGTH letters of every indexed word. @type {Set<string>} */
let stems;
/** Score multiplier per plugin ID. @type {Map<number, number>} */
let boosts;
/** Each plugin's text for "exact match". @type {[Plugin, string][]} */
let exactTexts;

/** "Red Ochre's<br>Pack" -> ["Red", "Ochre", "Pack"] */
const splitWords = (text) => text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/['’]s\b/gi, "")
    .replace(/['’]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const normalizeTerm = (word) => toUsSpelling(word.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase());

/** As written, ignoring case and spacing. */
const literalText = (text) => text.replace(/<br\s*\/?>/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();

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

const hasMatch = (term) => miniSearch.search(term, {fuzzy: false}).length > 0;

/** The newest Paint.NET version in the compatibility field: "3.5x, 4.0x" -> 4, "5.2+" -> 5.2, "Untested" -> NaN */
const newestVersion = (compatibility) => {
    const versions = Array.from(compatibility.matchAll(/\d+(?:\.\d+)?/g), match => Number(match[0]));
    return versions.length ? Math.max(...versions) : NaN;
};

/** Each value scaled from 0 (lowest) to 1 (highest); 0 if unknown. */
const scale = (values) => {
    const known = values.filter(Number.isFinite);
    const min = Math.min(...known);
    const range = Math.max(...known) - min;
    return values.map(value => Number.isFinite(value) && range > 0 ? (value - min) / range : 0);
};

/** @returns {Map<number, number>} the score multiplier for each plugin ID */
function newerPluginBoosts(plugins) {
    const recency = scale(plugins.map(plugin => plugin.release.getTime()));
    const compatibility = scale(plugins.map(plugin => newestVersion(plugin.field("compatibility"))));
    return new Map(plugins.map((plugin, i) =>
        [plugin.id, 1 + RECENCY_BOOST * recency[i] + COMPATIBILITY_BOOST * compatibility[i]]));
}

/** @returns {number} the plugin's score multiplier, for being newer */
export const searchBoost = (plugin) => boosts.get(plugin.id);

/** @param {Plugin[]} plugins */
export function buildSearchIndex(plugins) {
    pluginsById = new Map(plugins.map(plugin => [plugin.id, plugin]));
    stems = new Set(plugins
        .flatMap(plugin => FIELDS.flatMap(field => splitWords(plugin.field(field))))
        .map(normalizeTerm)
        .filter(term => term.length >= STEM_LENGTH)
        .map(term => term.slice(0, STEM_LENGTH)));
    boosts = newerPluginBoosts(plugins);

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
            boostDocument: id => boosts.get(id),
            prefix: true,
            fuzzy: term => hasMatch(term) || hasMatch(removeSuffix(term)) ? false : typoDistance(term.length),
        },
    });
    miniSearch.addAll(plugins);

    // Fields are joined with a newline, so an exact match can't span two fields.
    exactTexts = plugins.map(plugin => [plugin, FIELDS.map(field => literalText(plugin.field(field))).join("\n")]);
}

/**
 * @param {string} keywords
 * @param {string} keywordStyle - all | any | exact
 * @returns {Map<Plugin, {score: number, match: Object<string, string[]>}>|null} the matching plugins,
 *      with their score and the fields each indexed word matched in; or null if there are no keywords
 */
export function searchKeywords(keywords, keywordStyle) {
    return keywordStyle === "exact" ? searchExact(keywords) : searchWords(keywords, keywordStyle);
}

/** A plain text search: it can start or end mid-word. The scores are only for ranking. */
function searchExact(keywords) {
    const phrase = literalText(keywords);
    if (!phrase) {
        return null;
    }
    const ranks = new Map(miniSearch.search(keywords, {fuzzy: false}).map(result => [result.id, result]));
    return new Map(exactTexts
        .filter(([, text]) => text.includes(phrase))
        .map(([plugin]) => [plugin, ranks.get(plugin.id) ?? {score: 0, match: {}}]));
}

/** Each word as typed, or without its suffix. Matching both scores higher. */
function searchWords(keywords, keywordStyle) {
    const terms = splitWords(keywords).map(normalizeTerm);
    if (!terms.length) {
        return null;
    }
    const query = {
        combineWith: keywordStyle === "any" ? "OR" : "AND",
        queries: terms.map(term => ({combineWith: "OR", queries: [...new Set([term, removeSuffix(term)])]})),
    };
    return new Map(miniSearch.search(query).map(result => [pluginsById.get(result.id), result]));
}
