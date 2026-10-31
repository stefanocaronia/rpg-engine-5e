// The official German SRD 5.1 (SRD_CC_v5.1_DE.pdf) for translations.mjs: where its parts are, the words it writes them with, and what we add or correct.
export default {
    name: "German",
    pdf: "SRD_CC_v5.1_DE.pdf",
    abilities: { Strength: "Stärke", Dexterity: "Geschicklichkeit", Constitution: "Konstitution", Intelligence: "Intelligenz", Wisdom: "Weisheit", Charisma: "Charisma" },
    // The pages and chapters without a text in this SRD, and why.
    exceptions: {
        "rules/Combat Encounters.md": "from the SRD 5.2.1, which the official German translation of the SRD 5.1 lacks",
    },
    // What the English pages say that the SRD does not: the lines our converters add.
    ourLines: {
        "On a sheet, a pack is what it holds: write each kind with how many, never the pack itself.":
            "Auf einem Charakterbogen ist eine Ausrüstung das, was sie enthält: Schreibe jeden Gegenstand darin mit seiner Anzahl auf, nie die Ausrüstung selbst.",
    },
    // A spell list's first line, when the English page's is not one of ourLines.
    spellListLine: (className) => `Die ${listTitle(className)}, nach Grad.`,
    // The sections of a rules chapter the SRD lacks: none, its Anhang PH-A has every condition.
    ourSections: {},
    // The parts of a page the SRD lacks, in our German from the English SRD's text, with its terms: the erinyes' longbow, an action of the English stat block.
    ourFeatures: [
        {
            file: "world/creatures/Erinyes.md",
            after: "### Langschwert",
            text:
                "### Langbogen\n*Fernkampfwaffenangriff:* +7 auf Treffer, Reichweite 45/180 m, ein Ziel. *Treffer:* 7 (1W8+3) Stichschaden plus 13 (3W8) Giftschaden, und das Ziel muss einen SG-14-Konstitutionsrettungswurf bestehen, oder es ist vergiftet. Die Vergiftung hält an, bis sie durch den Zauber *Schwache Genesung* oder ähnliche Magie entfernt wird.",
        },
    ],
    // The errors of the SRD that change a rule, against the English SRD: in a file written, its wrong text, every time, and the right one.
    errata: [
        {
            file: "world/creatures/Sea Hag.md",
            wrong: "SG-20-Intelligenzwurf (Nachforschungen)",
            right: "SG-16-Intelligenzwurf (Nachforschungen)",
            why: "to see through the sea hag's illusory appearance: a DC 16 Intelligence (Investigation) check in English; DC 20 is the green hag's",
        },
        {
            file: "rules/Conditions.md",
            wrong: "Die Kreatur ist bei Stärke- und Geschicklichkeitsrettungswürfen im Nachteil.",
            right: "Die Kreatur ist bei Geschicklichkeitsrettungswürfen im Nachteil.",
            why: "restrained: disadvantage on Dexterity saving throws only in English, as in the French and Spanish SRDs; Strength is the paralyzed creature's",
        },
    ],
    // Where each rules chapter is in the PDF: from the heading that opens it, on its page, to the one that opens what follows, and the sections it takes
    // from elsewhere; a chapter title the SRD lacks is ours, from the chapters of the German Player's Handbook.
    chapters: {
        "Races.md": { from: ["Völker", 2], to: ["Elf", 2] },
        "Beyond 1st Level.md": { from: ["Nach der 1. Stufe", 58], to: ["Hintergründe", 62] },
        "Equipment.md": { from: ["Ausrüstung", 65], to: ["Talente", 80] },
        "Using Ability Scores.md": { from: ["Attributswerte verwenden", 81], to: ["Zeit", 90] },
        "Adventuring.md": { title: "Abenteuer", from: ["Zeit", 90], to: ["Der Kampfablauf", 97] },
        "Combat.md": { title: "Kampf", from: ["Der Kampfablauf", 97], to: ["Zauberwirken", 109] },
        "Spellcasting.md": { from: ["Zauberwirken", 109], to: ["Zauberlisten", 114] },
        "Traps.md": { from: ["Fallen", 214], to: ["Krankheiten", 219] },
        "Diseases.md": { from: ["Krankheiten", 219], to: ["Wahnsinn", 221] },
        "Madness.md": { from: ["Wahnsinn", 221], to: ["Gegenstände", 223] },
        "Objects.md": { from: ["Gegenstände", 223], to: ["Gifte", 224] },
        "Poisons.md": { from: ["Gifte", 224], to: ["Magische Gegenstände", 226] },
        "Magic Items.md": { from: ["Magische Gegenstände", 226], to: ["Monster", 284], without: "magic items" },
        "Monsters.md": {
            from: ["Monster", 284],
            to: ["Monster (A)", 292],
            with: [{ from: ["Halbdrachen-Vorlage", 350], to: ["Halbroter Drachenveteran", 350] }],
            // The sidebar the SRD sets among the senses is a section after them in English, as its headings' levels follow.
            move: { from: ["Übung mit Rüstungen, Waffen und Werkzeugen", 287], before: ["Sprachen", 288] },
        },
        "Conditions.md": { from: ["Anhang PH-A: Zustände", 402], to: ["Anhang PH-B: Pantheons in Geschichte und Fantasy-Welten", 404] },
        "Fantasy-Historical Pantheons.md": { from: ["Anhang PH-B: Pantheons in Geschichte und Fantasy-Welten", 404], to: ["Anhang PH-C: Die Ebenen der Existenz", 407] },
        "The Planes of Existence.md": { from: ["Anhang PH-C: Die Ebenen der Existenz", 407], to: ["Anhang MM-A: Sonstige Kreaturen", 410] },
        "Nonplayer Characters.md": { from: ["Anhang MM-B: Nicht-Spieler-Charaktere", 441], to: ["Adeliger", 441] },
    },
    // The pages of the PDF that hold each kind of section.
    pages: {
        races: { first: 2, last: 7 },
        classes: { first: 8, last: 58 },
        spellLists: { first: 114, last: 122 },
        spells: { first: 123, last: 213 },
        magicItems: { first: 228, last: 283 },
        creatures: [{ first: 292, last: 401 }, { first: 410, last: 450 }],
        equipment: { first: 65, last: 79 },
    },
    // The measures of a text in metric: the German SRD writes 1,5 m for 5 feet and half a kilogram for a pound.
    measures: [
        [/(\d+(?:[.,]\d+)?)\s*(?:Kilometern|Kilometer|km)\b/g, "km", 1],
        [/(\d+(?:[.,]\d+)?)\s*(?:Metern|Meter|m)\b/g, "m", 1],
        [/(\d+(?:[.,]\d+)?)\s*(?:Zentimetern|Zentimeter|cm)\b/g, "cm", 1],
        [/(\d+(?:[.,]\d+)?)\s*(?:Kilogramm|kg)\b/g, "kg", 1],
        [/(\d+(?:[.,]\d+)?)\s*(?:Gramm|g)\b/g, "kg", 0.001],
    ],
    // How a run-in title ends: "***Amphibisch:***".
    runInEnd: /[.:]$/,
    // The dice as the SRD writes them: 2W6.
    dice: /\b(\d*)W(\d+)\b/g,
    // The words between the spells a text names in italics: "Feuerball oder Blitz".
    conjunctions: /,|\s+(?:oder|und)\s+/,
    // The PDF breaks words at the end of a line, as wiederher- gestellten, always before a lowercase letter but und, oder and the like; and joins compounds
    // with a hyphen before a capital, as Nicht-Spieler-Charaktere.
    softHyphens: "always",
    compoundCapitals: true,
    // Nouns keep their capital after a group's words in a table's header: Zurückgelegte Strecke pro Minute.
    nounCapitals: true,
    // The headings the SRD sets at another size than their siblings': Erschöpfung, at a sidebar's 11 pt among the conditions at 12.
    headingSizes: { "Erschöpfung (p. 403)": 12 },
    // The typos of the SRD that its sections are read through: the text keeps them, as the SRD writes it.
    typos: {},
    // The names of the system's races, classes and subclasses as the SRD's headings write them, where words/de.yaml does not.
    names: {
        "College of Lore": "Schule des Wissens",
        "Oath of Devotion": "Schwur der Hingabe",
        "School of Evocation": "Schule der Hervorrufungsmagie",
        "Way of the Open Hand": "Weg der Offenen Hand",
        "Unarmed Strike": "Waffenloser Angriff",
    },
    // The pages whose name the SRD gives another page too, with ours: the German SRD names the amulet and the periapt of health Anhänger der
    // Gesundheit, while the amulet's text calls it Amulett.
    renames: {
        "world/items/Amulet of Health.md": { name: "Amulett der Gesundheit", why: "the SRD names it as the Periapt of Health, Anhänger der Gesundheit; its text says Amulett" },
    },
    // The races whose heading in the SRD is not their name, which its text and words/de.yaml give: a plural, as Hochelfen.
    raceHeadings: { Dragonborn: "Drachenblütige", "High Elf": "Hochelfen", "Lightfoot Halfling": "Leichtfuß-Halblinge" },
    race: {
        // The heading of a race's traits, which the English page has as one heading of its own.
        traits: /^Merkmale der /,
        traitsHeading: "Merkmale",
        abilityScoreIncrease: "Attributswerterhöhung",
    },
    spell: {
        /** A spell's level, school and ritual, from its italic line: "Hervorrufungszauber 3. Grades", "Zaubertrick der Beschwörung". */
        header(text)
        {
            const match = /^(?:Zaubertrick de[rs] (\p{L}+)|(\p{L}+)zauber (\d)\. Grades)( \(Ritual\))?$/u.exec(text);
            const word = (match?.[1] ?? match?.[2] ?? "").toLowerCase();
            const school = Object.values(this.schools).find((one) => word.startsWith(one));
            return school === undefined ? undefined : { level: match[3] ?? "0", school, ritual: match[4] !== undefined };
        },
        labels: { time: ["Zeitaufwand"], range: ["Reichweite"], components: ["Komponenten"], duration: ["Wirkungsdauer"] },
        components: { V: "V", G: "S", M: "M" },
        units: [["bonusaktion", "bonus action"], ["aktion", "action"], ["reaktion", "reaction"], ["runde", "round"], ["minute", "minute"], ["stunde", "hour"], ["tag", "day"]],
        ranges: [["selbst", "self"], ["berührung", "touch"], ["sicht", "sight"], ["unbegrenzt", "unlimited"], ["speziell", "special"]],
        distance: /^([\d.]+(?:,\d+)?)\s*(metern|meter|m|km|kilometer)\b/,
        concentration: "konzentration",
        durations: [["unmittelbar", "instantaneous"], ["speziell", "special"], ["bis der zauber gebannt oder", "until dispelled or triggered"], ["bis der zauber gebannt", "until dispelled"]],
        schools: {
            abjuration: "bann",
            conjuration: "beschwörung",
            divination: "erkenntnis",
            enchantment: "verzauberung",
            evocation: "hervorrufung",
            illusion: "illusion",
            necromancy: "nekromantie",
            transmutation: "verwandlung",
        },
    },
    spellLists: {
        title: (className) => listTitle(className),
        start: /^Zauber des /,
        level: (text) => text,
    },
    magicItem: {
        type: /^(.+?), (.+?)(?: \((erfordert Einstimmung[^)]*)\))?$/,
        categories: [["wundersamer gegenstand", "wondrous item"], ["ring", "ring"], ["zauberstab", "wand"], ["stab", "staff"], ["trank", "potion"], ["zepter", "rod"], ["schriftrolle", "scroll"], ["rüstung", "armor"], [
            "waffe",
            "weapon",
        ]],
        rarities: [["ungewöhnlich", "uncommon"], ["gewöhnlich", "common"], ["sehr selten", "very rare"], ["selten", "rare"], ["legendär", "legendary"], ["artefakt", "artifact"], ["seltenheit variiert", "varies"]],
        // A rarity by its bonus or its kind, as "ungewöhnlich (+1), selten (+2) oder sehr selten (+3)", varies.
        varies: / oder /,
    },
    creature: {
        sizes: [["winzig", "Tiny"], ["klein", "Small"], ["mittelgroß", "Medium"], ["groß", "Large"], ["riesig", "Huge"], ["gigantisch", "Gargantuan"]],
        armorClass: "Rüstungsklasse",
        hitPoints: "Trefferpunkte",
        challenge: "Herausforderungsgrad",
        // The lines of a stat block after its ability scores.
        afterAbilities: /^(Rettungswürfe|Fertigkeiten|Schadens|Zustands|Sinne)/,
        // The labels of a stat block's lines, in bold without a colon.
        labels: /^(Rüstungsklasse|Trefferpunkte|Bewegungsrate|Rettungswürfe|Fertigkeiten|Schadensanfälligkeiten|Schadensresistenzen|Schadensimmunitäten|Zustandsimmunitäten|Sinne|Sprachen|Herausforderungsgrad)$/i,
        // The lines of a stat block's spells, each a paragraph: "Zaubertricks (beliebig oft):", "1. Grad (4 Plätze):", "Beliebig oft:", "Je 3-mal täglich:".
        spellLines: /^(Zaubertricks \(beliebig oft\):|\d+\. Grad \(\d+ Pl(?:ätze|atz)\):|Beliebig oft:|(Je )?\d+-mal täglich:)/,
        spellItems: /^(Zaubertricks|Beliebig oft|(Je )?\d+-mal täglich|\d+\. Grad)/,
        abilities: ["STR", "GES", "KON", "INT", "WEI", "CHA"],
        // The SRD sets some spells of a line in one italic, as *Einflüsterung, Nebelschritt*: each in its own.
        splitItalics: true,
        traits: "Merkmale",
        legendaryActions: "Legendäre Aktionen",
    },
    // A variant of a creature, a sidebar in the SRD, as a section of the page of the creature it varies.
    variants: { "Variante: Insektenschwarm": "Swarm of Insects", "Variante: Kranke Riesenratte": "Giant Rat" },
    // The warlock's list of invocations, a section of its own after the class's features, which the English page has under the feature that names it.
    invocations: "Schauerliche Anrufungen",
    gear: {
        // The tables of the equipment whose rows are items, by caption: the English category of each group of rows, "" for the rows of none.
        tables: {
            Rüstung: { "Leichte Rüstung": "light armor", "Mittelschwere Rüstung": "medium armor", "Schwere Rüstung": "heavy armor", Schild: "shield" },
            Waffen: {
                "Einfache Nahkampfwaffen": "simple melee weapon",
                "Einfache Fernkampfwaffen": "simple ranged weapon",
                "Nahkampf-Kriegswaffen": "martial melee weapon",
                "Fernkampf-Kriegswaffen": "martial ranged weapon",
            },
            Abenteurerausrüstung: { "": "adventuring gear", Munition: "ammunition", "Arkaner Fokus": "arcane focus", "Druidischer Fokus": "druidic focus", "Heiliges Symbol": "holy symbol" },
            Werkzeuge: { "": "tool", Handwerkszeug: "artisan's tools", Musikinstrument: "musical instrument", Spiel: "gaming set" },
            "Sattel und Zaumzeug, Geschirr und Fuhrwerke": { "": ["tack and harness", "drawn vehicle"], Sattel: "saddle" },
            Wasserfahrzeuge: { "": "waterborne vehicle" },
        },
        columns: { cost: "kosten", weight: "gewicht", damage: "schaden", armorClass: "rüstungsklasse" },
        coins: { KM: 1, SM: 10, EM: 50, GM: 100, PM: 1000 },
        // The descriptions an item takes from a title other than its own or its group's, as gear.mjs gives them in English.
        describedBy: { Sattel: "Sättel", Kielboot: "Ruderfahrzeuge", Ruderboot: "Ruderfahrzeuge", Schild: "Schilde", "Gift (einfach, Phiole)": "Gift (einfach)" },
        // The parentheses of a row and of a description's title name a kind, as Laterne (abdeckbar) and Laterne (Blendlaterne).
        kindsInParentheses: true,
        /** An item's name as the SRD's table writes it, in its capitals, without how much of it a row sells: Kette (3 Meter) is Kette. */
        name: (row) => row.replace(/ \((?:\d[^)]*|Beutel mit [^)]*|ein Blatt|pro Tag|Flasche|Phiole)\)$/, ""),
        // The groups whose rows name only a kind of their group: none, the German rows name the whole saddle.
        composedGroups: [],
        // An equipment pack's run-in title, with its price.
        pack: /^(.+) \(([\d.]+ GM)\):$/,
        // Of the gear's potion of healing, the magic item's page takes its sentence on drinking it.
        healing: { title: "Heiltrank", sentence: /Das Trinken oder Verabreichen[^.]*\./ },
    },
    // The background, the feat and the unarmed strike, by their place.
    background: { heading: ["Hintergründe", 62], acolyte: ["Tempeldiener", 63], end: 65 },
    feats: ["Talente", 80],
    unarmedStrike: { page: 103, text: "waffenlosen Angriff" },
};

/** "Zauber des Barden", "Zauber des Magiers": a class's spell list, as the SRD names it. */
function listTitle(className)
{
    return `Zauber des ${className}${className.endsWith("e") ? "n" : "s"}`;
}
