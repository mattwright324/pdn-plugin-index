/**
 * British to US spelling, applied to both the indexed words and the search words.
 * Rules only need to be consistent, not correct, but must never merge two different words:
 * a generic "-our" -> "-or" would match "four" to "for", so those rules use word lists.
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
    // -ogue -> -og
    ["catalogue", "catalog"], ["dialogue", "dialog"], ["analogue", "analog"],
    // -ence -> -ense
    ["licence", "license"], ["defence", "defense"], ["offence", "offense"], ["pretence", "pretense"],
    // others
    ["grey", "gray"], ["artefact", "artifact"], ["programme", "program"], ["aluminium", "aluminum"],
    ["ageing", "aging"], ["mould", "mold"], ["plough", "plow"], ["draught", "draft"], ["sceptic", "skeptic"],
    ["manoeuvre", "maneuver"], ["jewellery", "jewelry"], ["judgement", "judgment"],
    ["acknowledgement", "acknowledgment"], ["whilst", "while"], ["amongst", "among"],
];

/** Spelled -ise in US English too, as is every word ending in -wise. */
const US_ISE_WORDS = new Set([
    "advertise", "advise", "anise", "apprise", "arise", "bruise", "chastise", "circumcise", "comprise",
    "compromise", "concise", "cruise", "demise", "denoise", "despise", "devise", "disguise", "enterprise",
    "excise", "exercise", "expertise", "franchise", "guise", "improvise", "incise", "merchandise", "mise",
    "noise", "paradise", "poise", "praise", "precise", "premise", "promise", "raise", "reprise", "revise",
    "rise", "sunrise", "supervise", "surprise", "televise", "tortoise", "treatise", "turquoise", "valise",
    "porpoise",
]);

/** optimise, optimised, optimisation, analyse, ... */
const ISE = /^(\p{L}{2,})(is|ys)(e|es|ed|ing|er|ers|ation|ations|able)$/u;

/** bevelled, levelling, modeller, ... */
const DOUBLED_L = /^(\p{L}*?(?:bevel|level|model|label|travel|cancel|channel|panel|tunnel|signal|marvel|fuel|total|dial|jewel|pixel|counsel|shovel|funnel|chisel|swivel|quarrel|revel|equal|grovel|ravel|enamel|parcel|pedal|tinsel|barrel|spiral|stencil|pencil))l(ed|ing|er|ers)$/u;

/** @param {string} term - a lowercase word */
export function toUsSpelling(term) {
    for (const [uk, us] of SUBSTRINGS) {
        term = term.replaceAll(uk, us);
    }

    const ise = ISE.exec(term);
    if (ise) {
        const [, stem, is, suffix] = ise;
        const base = stem + is + "e";
        if (!US_ISE_WORDS.has(base) && !base.endsWith("wise")) {
            return stem + (is === "is" ? "iz" : "yz") + suffix;
        }
    }

    return term.replace(DOUBLED_L, "$1$2");
}
