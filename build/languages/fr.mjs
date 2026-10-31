// The official French SRD 5.1 (SRD_CC_v5.1_FR.pdf) for translations.mjs: where its parts are, the words it writes them with, and what we add or correct.
const sizes = { TP: "Tiny", P: "Small", M: "Medium", G: "Large", TG: "Huge", Gig: "Gargantuan" };

export default {
    name: "French",
    pdf: "SRD_CC_v5.1_FR.pdf",
    abilities: { Strength: "Force", Dexterity: "Dextérité", Constitution: "Constitution", Intelligence: "Intelligence", Wisdom: "Sagesse", Charisma: "Charisme" },
    // The pages and chapters without a text in this SRD, and why.
    exceptions: {
        "rules/Combat Encounters.md": "from the SRD 5.2.1, which the official French translation of the SRD 5.1 lacks",
    },
    // What the English pages say that the SRD does not: the lines our converters add.
    ourLines: {
        "On a sheet, a pack is what it holds: write each kind with how many, never the pack itself.":
            "Sur une fiche, un paquetage est ce qu’il contient : inscrivez chaque objet qu’il contient avec sa quantité, jamais le paquetage lui-même.",
    },
    // A spell list's first line, when the English page's is not one of ourLines.
    spellListLine: (className) => `Les sorts ${of(className)}, par niveau.`,
    // The sections of a rules chapter the SRD lacks: none, its Annexe MdJ-A has every condition.
    ourSections: {},
    // The errors of the SRD that change a rule, against the English SRD: in a file written, its wrong text, every time, and the right one.
    errata: [],
    // Where each rules chapter is in the PDF: from the heading that opens it, on its page, to the one that opens what follows, and the sections it takes
    // from elsewhere; a chapter title the SRD lacks is ours, from the chapters of the French Player's Handbook.
    chapters: {
        "Races.md": { from: ["Races", 2], to: ["Elfe", 2] },
        "Beyond 1st Level.md": { from: ["Au-delà du niveau 1", 59], to: ["Historiques", 63] },
        "Equipment.md": { from: ["Équipement", 66], to: ["Dons", 82] },
        "Using Ability Scores.md": { from: ["Utiliser les valeurs de caractéristique", 83], to: ["Le passage du temps", 92] },
        "Adventuring.md": { title: "L’aventure", from: ["Le passage du temps", 92], to: ["L’ordre du combat", 97] },
        "Combat.md": { title: "Le combat", from: ["L’ordre du combat", 97], to: ["Sorts", 110] },
        "Spellcasting.md": { from: ["Sorts", 110], to: ["Listes de sorts", 115] },
        "Traps.md": { from: ["Pièges", 214], to: ["Maladies", 218] },
        "Diseases.md": { from: ["Maladies", 218], to: ["Folie", 220] },
        "Madness.md": { from: ["Folie", 220], to: ["Objets", 222] },
        "Objects.md": { from: ["Objets", 222], to: ["Poisons", 223] },
        "Poisons.md": { from: ["Poisons", 223], to: ["Objets magiques", 225] },
        "Magic Items.md": { from: ["Objets magiques", 225], to: ["Monstres", 281], without: "magic items" },
        "Monsters.md": {
            from: ["Monstres", 281],
            to: ["Monstres (A)", 290],
            with: [{ from: ["Demi-dragon (archétype)", 299], to: ["Vétéran demi-dragon rouge", 299] }],
            // The sidebar the SRD sets among the senses is a section after them in English, as its headings' levels follow.
            move: { from: ["Maîtrises d’armure, d’arme et d’outils", 285], before: ["Langues", 285] },
        },
        "Conditions.md": { from: ["Annexe MdJ-A : États", 397], to: ["Annexe MdJ-B : Panthéons historiques et mythologiques", 399] },
        "Fantasy-Historical Pantheons.md": { from: ["Annexe MdJ-B : Panthéons historiques et mythologiques", 399], to: ["Annexe MdJ-C : Les plans d’existence", 402] },
        "The Planes of Existence.md": { from: ["Annexe MdJ-C : Les plans d’existence", 402], to: ["Annexe MdM-A : Créatures diverses", 405] },
        "Nonplayer Characters.md": { from: ["Annexe MdM-B : Personnages non-joueurs", 437], to: ["Acolyte", 437] },
    },
    // The pages of the PDF that hold each kind of section.
    pages: {
        races: { first: 2, last: 7 },
        classes: { first: 9, last: 59 },
        spellLists: { first: 115, last: 123 },
        spells: { first: 124, last: 213 },
        magicItems: { first: 227, last: 280 },
        creatures: [{ first: 290, last: 396 }, { first: 405, last: 446 }],
        equipment: { first: 66, last: 81 },
    },
    // The measures of a text in metric: the French SRD writes 1,50 m for 5 feet and 500 g for a pound.
    measures: [
        [/(\d+(?:[.,]\d+)?)\s*(?:kilomètres|km)\b/g, "km", 1],
        [/(\d+(?:[.,]\d+)?)\s*(?:mètres|mètre|m)(?![\p{L}])/gu, "m", 1],
        [/(\d+(?:[.,]\d+)?)\s*(?:centimètres|cm)\b/g, "cm", 1],
        [/(\d+(?:[.,]\d+)?)\s*(?:kilogrammes|kilos|kg)\b/g, "kg", 1],
        [/(\d+(?:[.,]\d+)?)\s*(?:grammes|g)\b/g, "kg", 0.001],
    ],
    // How a run-in title ends: "***Amphibie.***".
    runInEnd: /\.$/,
    // The dice as the SRD writes them: 2d6.
    dice: /\b(\d*)d(\d+)\b/g,
    // The words between the spells a text names in italics: "boule de feu ou éclair".
    conjunctions: /,|\s+(?:ou|et)\s+/,
    // The PDF breaks words at the end of a line, as emplace- ments.
    softHyphens: true,
    // The headings the SRD sets at another size than their siblings': Épuisement, at a sidebar's 11 pt among the conditions at 12.
    headingSizes: { "Épuisement (p. 397)": 12 },
    // The typos of the SRD that its sections are read through: the text keeps them, as the SRD writes it.
    typos: {},
    // The names of the system's races, classes and subclasses as the SRD's headings write them, where words/fr.yaml does not.
    names: {
        "College of Lore": "Collège du Savoir",
        "Oath of Devotion": "Serment de Dévotion",
        "School of Evocation": "École de l’Évocation",
        "Way of the Open Hand": "Voie de la Paume",
        "Unarmed Strike": "Attaque à mains nues",
    },
    // The races whose heading in the SRD is not their name, which its text and words/fr.yaml give: the subrace heading of its race's section.
    raceHeadings: { "Lightfoot Halfling": "Pied-léger" },
    // The paragraphs the SRD sets away from their section: the gorgon's breath, after the ghoul's actions on the next page.
    movedBlocks: [{ from: ["Souffle pétrifiant (recharge 5–6).", 353], to: ["Gorgone", 352] }],
    // The cells of tables the SRD sets as one span over two columns, with their parts: the multiclass spell slots' header, again on p. 62.
    cellSplits: { "Niveau 1er": ["Niveau", "1er"] },
    // The groups of a table's header the SRD sets off their columns, with the columns they name: the travel pace's, over Heure, Jour and Effet on p. 93.
    headerGroups: { "Distance parcourue par…": ["Minute", "Heure", "Jour"] },
    race: {
        // The heading of a race's traits, which the English page has as one heading of its own.
        traits: /^Traits des /,
        traitsHeading: "Traits",
        abilityScoreIncrease: "Augmentation de caractéristique",
    },
    spell: {
        /** A spell's level, school and ritual, from its italic line: "Évocation du 3e niveau", "Sort mineur d’invocation". */
        header(text)
        {
            const match = /^(?:Sort mineur (?:de |d’)(\p{L}+)|(\p{L}+) du (\d)(?:er|e) niveau)( \(rituel\))?$/u.exec(text);
            return match === null ? undefined : { level: match[3] ?? "0", school: (match[1] ?? match[2]).toLowerCase(), ritual: match[4] !== undefined };
        },
        labels: { time: ["Temps d’incantation"], range: ["Portée"], components: ["Composantes"], duration: ["Durée"] },
        components: { V: "V", S: "S", M: "M" },
        units: [["action bonus", "bonus action"], ["action", "action"], ["réaction", "reaction"], ["round", "round"], ["minute", "minute"], ["heure", "hour"], ["jour", "day"]],
        ranges: [["personnel", "self"], ["contact", "touch"], ["vision", "sight"], ["illimité", "unlimited"], ["spécial", "special"]],
        distance: /^([\d.]+(?:,\d+)?)\s*(mètres|mètre|m|km|kilomètres)(?!\p{L})/u,
        concentration: "concentration",
        durations: [["instantané", "instantaneous"], ["spécial", "special"], ["jusqu’à dissipation ou activation", "until dispelled or triggered"], ["jusqu’à dissipation", "until dispelled"]],
        schools: {
            abjuration: "abjuration",
            conjuration: "invocation",
            divination: "divination",
            enchantment: "enchantement",
            evocation: "évocation",
            illusion: "illusion",
            necromancy: "nécromancie",
            transmutation: "transmutation",
        },
    },
    spellLists: {
        title: (className) => `Sorts ${of(className)}`,
        start: /^Sorts d(?:e |’)/,
        level: (text) => text,
    },
    magicItem: {
        type: /^(.+?), (.+?)(?: \((harmonisation requise[^)]*)\))?$/,
        categories: [["objet merveilleux", "wondrous item"], ["anneau", "ring"], ["baguette", "wand"], ["bâton", "staff"], ["potion", "potion"], ["sceptre", "rod"], ["parchemin", "scroll"], ["armure", "armor"], [
            "arme",
            "weapon",
        ]],
        rarities: [["peu courant", "uncommon"], ["courant", "common"], ["très rare", "very rare"], ["rare", "rare"], ["légendaire", "legendary"], ["artefact", "artifact"], ["rareté variable", "varies"], ["variable", "varies"]],
        // A rarity by its bonus or its kind, as "peu courante (+1), rare (+2) ou très rare (+3)", varies.
        varies: / ou /,
    },
    creature: {
        sizes: [],
        /** A creature's size, from its type: "Aberration de taille G". */
        size: (type) => sizes[/de taille (TP|P|M|G|TG|Gig)(?!\p{L})/u.exec(type)?.[1]],
        armorClass: "Classe d’armure",
        hitPoints: "Points de vie",
        challenge: "Facteur de puissance",
        // The lines of a stat block after its ability scores.
        afterAbilities: /^(Jets de sauvegarde|Compétences|Vulnérabilités|Résistances|Immunités|Sens)/,
        // The labels of a stat block's lines, in bold without a colon.
        labels:
            /^(Classe d’armure|Points de vie|Vitesse|Jets de sauvegarde|Compétences|Vulnérabilités aux dégâts|Résistances aux dégâts|Immunités \(dégâts\)|Immunités \(états\)|Immunités aux dégâts|Immunités aux états|Sens|Langues|Facteur de puissance)$/i,
        // The lines of a stat block's spells, each a paragraph: "Sorts mineurs (à volonté) :", "1er niveau (4 emplacements) :", "À volonté :", "3/jour chacun :".
        spellLines: /^(Sorts mineurs \(à volonté\)\s?:|\d+(?:er|e) niveau \(\d+ emplacements?\)\s?:|À volonté\s?:|\d+\/jour( chacun)?\s?:)/,
        spellItems: /^(Sorts mineurs|À volonté|\d+\/jour|\d+(?:er|e) niveau)/,
        abilities: ["FOR", "DEX", "CON", "INT", "SAG", "CHA"],
        traits: "Traits",
        legendaryActions: "Actions légendaires",
    },
    // A variant of a creature, a sidebar in the SRD, as a section of the page of the creature it varies.
    variants: { "Variante : Nuées d’insectes": "Swarm of Insects", "Variante : Rats géants infectés": "Giant Rat" },
    // The warlock's list of invocations, a section of its own after the class's features, which the English page has under the feature that names it.
    invocations: "Manifestations occultes",
    gear: {
        // The tables of the equipment whose rows are items, by caption: the English category of each group of rows, "" for the rows of none.
        tables: {
            Armures: { "Armures légères": "light armor", "Armures intermédiaires": "medium armor", "Armures lourdes": "heavy armor", Boucliers: "shield" },
            Armes: {
                "Armes courantes de corps à corps": "simple melee weapon",
                "Armes courantes à distance": "simple ranged weapon",
                "Armes de guerre de corps à corps": "martial melee weapon",
                "Armes de guerre à distance": "martial ranged weapon",
            },
            "Équipement d’aventurier": { "": "adventuring gear", Munitions: "ammunition", "Focaliseur arcanique": "arcane focus", "Focaliseur druidique": "druidic focus", "Symbole sacré": "holy symbol" },
            Outils: { "": "tool", "Outils d’artisan": "artisan's tools", "Instrument de musique": "musical instrument", "Boîte de jeux": "gaming set" },
            "Harnachement et véhicules tractés": { "": ["tack and harness", "drawn vehicle"], Selle: "saddle" },
            Bateaux: { "": "waterborne vehicle" },
        },
        columns: { cost: "prix", weight: "poids", damage: "dégâts", armorClass: "classe d’armure" },
        coins: { pc: 1, pa: 10, pe: 50, po: 100, pp: 1000 },
        // The descriptions an item takes from a title other than its own or its group's, as gear.mjs gives them in English.
        describedBy: { Selle: "Selles", Barge: "Bateaux à rames", Barque: "Bateaux à rames", Cuir: "Armure de cuir", "Cuir clouté": "Armure de cuir clouté", Peaux: "Armure de peaux", Écailles: "Armure d’écailles" },
        // The groups whose rows name only a kind of their group, as d’équitation under Selle: their name is the group's and the row's.
        composedGroups: ["Selle"],
        // An equipment pack's run-in title, with its price.
        pack: /^(Paquetage .+) \(([\d.]+ po)\)\.$/,
        // Of the gear's potion of healing, the magic item's page takes its sentence on drinking it.
        healing: { title: "Potion de guérison", sentence: /Boire ou administrer[^.]*\./ },
    },
    // The background, the feat and the unarmed strike, by their place.
    background: { heading: ["Historiques", 63], acolyte: ["Acolyte", 64], end: 66 },
    feats: ["Dons", 82],
    unarmedStrike: { page: 104, text: "attaque à mains nues :" },
};

/** "de barde", "d’ensorceleur": a class's name after de, as the SRD writes it. */
function of(className)
{
    const name = className.toLowerCase();
    return /^[aeiouyéèêh]/.test(name) ? `d’${name}` : `de ${name}`;
}
