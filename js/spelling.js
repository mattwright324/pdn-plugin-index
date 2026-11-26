/**
 * Word forms for search: British to US spelling, prefixes and suffixes. All take a lowercase word.
 */

/** Replaced anywhere in a word, so compounds work too: "callicolour", "greyscale". */
const SUBSTRINGS = [
    // -our -> -or
    ["colour", "color"], ["behaviour", "behavior"], ["neighbour", "neighbor"], ["favour", "favor"],
    ["flavour", "flavor"], ["harbour", "harbor"], ["honour", "honor"], ["humour", "humor"], ["labour", "labor"],
    ["rumour", "rumor"], ["armour", "armor"], ["vapour", "vapor"], ["odour", "odor"], ["splendour", "splendor"],
    ["savour", "savor"], ["rigour", "rigor"], ["valour", "valor"], ["parlour", "parlor"], ["tumour", "tumor"],
    // -re -> -er
    ["centre", "center"], ["metre", "meter"], ["litre", "liter"], ["lustre", "luster"], ["fibre", "fiber"],
    ["spectre", "specter"], ["theatre", "theater"], ["sabre", "saber"], ["calibre", "caliber"],
    ["sombre", "somber"], ["meagre", "meager"],
    // -ogue -> -og, -ence -> -ense
    ["catalogue", "catalog"], ["dialogue", "dialog"], ["analogue", "analog"],
    ["licence", "license"], ["defence", "defense"], ["offence", "offense"], ["pretence", "pretense"],
    // others
    ["grey", "gray"], ["artefact", "artifact"], ["programme", "program"], ["aluminium", "aluminum"],
    ["ageing", "aging"], ["mould", "mold"], ["plough", "plow"], ["draught", "draft"], ["sceptic", "skeptic"],
    ["manoeuvre", "maneuver"], ["jewellery", "jewelry"], ["judgement", "judgment"],
    ["acknowledgement", "acknowledgment"], ["whilst", "while"], ["amongst", "among"],
];

/** optimise, optimised, optimisation, analyse, ... */
const ISE = /^(\p{L}{2,})(is|ys)(e|es|ed|ing|er|ers|ation|ations|able)$/u;

/** Spelled -ise in US English too, as is every word ending in -wise. */
const US_ISE_WORDS = new Set([
    "advertise", "advise", "anise", "apprise", "arise", "bruise", "chastise", "circumcise", "comprise",
    "compromise", "concise", "cruise", "demise", "denoise", "despise", "devise", "disguise", "enterprise",
    "excise", "exercise", "expertise", "franchise", "guise", "improvise", "incise", "merchandise", "mise",
    "noise", "paradise", "poise", "porpoise", "praise", "precise", "premise", "promise", "raise", "reprise",
    "revise", "rise", "sunrise", "supervise", "surprise", "televise", "tortoise", "treatise", "turquoise", "valise",
]);

/** bevelled, levelling, modeller, ... */
const DOUBLED_L = /^(\p{L}*?(?:bevel|level|model|label|travel|cancel|channel|panel|tunnel|signal|marvel|fuel|total|dial|jewel|pixel|counsel|shovel|funnel|chisel|swivel|quarrel|revel|equal|grovel|ravel|enamel|parcel|pedal|tinsel|barrel|spiral|stencil|pencil))l(ed|ing|er|ers)$/u;

export function toUsSpelling(term) {
    for (const [uk, us] of SUBSTRINGS) {
        term = term.replaceAll(uk, us);
    }

    const [, stem, is, suffix] = ISE.exec(term) ?? [];
    const base = stem + is + "e";
    if (stem && !US_ISE_WORDS.has(base) && !base.endsWith("wise")) {
        return stem + (is === "is" ? "iz" : "yz") + suffix;
    }

    return term.replace(DOUBLED_L, "$1$2");
}

/**
 * Prefixes that keep the meaning of the rest of the word: "misaligned" is about aligning. Longest first.
 * Not tri-, trans-, inter-, out- or photo-: "triangle" isn't an angle, nor "transform" a form.
 */
const PREFIXES = ["counter", "super", "under", "multi", "anti", "auto", "mega", "mono", "over", "semi",
    "duo", "mis", "non", "sub", "bi", "un"];

/** Prefixes removed only before these: "recolor" is about color, but "remove" isn't moving, nor "design" signs. */
const LIMITED_PREFIXES = {
    re: ["color", "siz", "scal", "sampl", "shap", "draw", "focus", "align", "touch"],
    de: ["saturat", "compress", "convol", "nois", "blur", "interlac"],
    in: ["paint"],
    up: ["scal", "sampl"],
};

/** @returns {string|undefined} the word after its prefix: "misaligned" -> "aligned" */
export function removePrefix(term) {
    const prefix = PREFIXES.find(prefix => term.startsWith(prefix))
        ?? Object.keys(LIMITED_PREFIXES).find(prefix =>
            LIMITED_PREFIXES[prefix].some(stem => term.startsWith(prefix + stem)));
    return prefix && term.slice(prefix.length);
}

/** Shorter stems are too likely another word: "string" isn't "str-", "plus" isn't "plu-" (plugin). */
const MIN_STEM_LENGTH = 4;
const isLongEnough = (stem) => stem.length >= MIN_STEM_LENGTH;

/**
 * Suffixes that keep the meaning of the rest of the word, and when a stem can have them. Longest first.
 * Not -er: "better" isn't "bet", nor "letter" "let". Nor -y or -al, but as below: "party" isn't "part".
 */
const SUFFIX_RULES = [
    ...["izations", "ization", "ments", "izing", "ment", "ness", "ions", "ings", "ized", "izes", "able", "ible",
        "less", "ize", "ion", "ing", "ful", "ity", "ive", "ies", "ied", "ed"].map(suffix => [suffix, isLongEnough]),
    ["ly", stem => isLongEnough(stem) && !stem.endsWith("p")],           // not "comply"
    ["es", stem => stem.length >= 3 && /(ch|sh|ss|[xz])$/.test(stem)],  // "boxes"; "lines" is "line" + "s"
    ["en", stem => isLongEnough(stem) && /[^aeiou]$/.test(stem)],      // "darken"; not "screen"
    ["al", stem => /(ion|ic)$/.test(stem)],                            // "directional", "symmetrical"
    ["y", stem => stem.endsWith("if")],                                // "modify"
    ["s", stem => isLongEnough(stem) && !stem.endsWith("s")],          // not "gloss"
    ["e", stem => isLongEnough(stem) && /[^ei]$/.test(stem)],          // "animate" -> "animat-"; not "free"
];
/** A plural is always the last suffix: "canvases" -> "canvas", not "canva". */
const NON_PLURAL_RULES = SUFFIX_RULES.filter(([suffix]) => suffix !== "s" && suffix !== "es");
const UNDOUBLES = new Set(["ed", "ing", "ings", "en"]);

const removeOneSuffix = (term, rules) => {
    const [suffix] = rules.find(([suffix, isStem]) =>
        term.endsWith(suffix) && isStem(term.slice(0, -suffix.length))) ?? [];
    if (!suffix) {
        return term;
    }
    const stem = term.slice(0, -suffix.length);
    return UNDOUBLES.has(suffix) ? stem.replace(/([bdgmnprt])\1$/, "$1") : stem; // "blurring" -> "blur"
};

/** Remove suffixes until none are left: "creates" -> "create" -> "creat-", which also finds "creation". */
export function removeSuffix(term) {
    let rules = SUFFIX_RULES;
    for (let stem; (stem = removeOneSuffix(term, rules)) !== term; rules = NON_PLURAL_RULES) {
        term = stem;
    }
    return term;
}
