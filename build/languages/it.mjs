// The official Italian SRD 5.1 (SRD_CC_v5.1_IT.pdf) for translations.mjs: where its parts are, the words it writes them with, and what we add or correct.
export default {
    name: "Italian",
    pdf: "SRD_CC_v5.1_IT.pdf",
    abilities: { Strength: "Forza", Dexterity: "Destrezza", Constitution: "Costituzione", Intelligence: "Intelligenza", Wisdom: "Saggezza", Charisma: "Carisma" },
    // The pages and chapters without a text in this SRD, and why.
    exceptions: {
        "rules/Combat Encounters.md": "from the SRD 5.2.1, which has no official Italian translation",
    },
    // What the English pages say that the SRD does not: the lines our converters add.
    ourLines: {
        "On a sheet, a pack is what it holds: write each kind with how many, never the pack itself.": "Su una scheda, una dotazione è ciò che contiene: scrivi ogni oggetto che contiene, con la sua quantità, mai la dotazione stessa.",
    },
    // A spell list's first line, when the English page's is not one of ourLines.
    spellListLine: (className) => `Gli incantesimi da ${className.toLowerCase()}, per livello.`,
    // The sections of a rules chapter the SRD lacks, in our Italian from the English SRD's text, with its terms: its Appendix A ends with Privo di sensi
    // (p. 407), without Prone, Frightened, Stunned and Restrained. Each goes among its chapter's sections of the same type, in alphabetical order.
    ourSections: {
        "Conditions.md": [
            {
                title: "Prono",
                items: [
                    "L'unica opzione di movimento di una creatura prona è strisciare, a meno che non si rialzi, ponendo così fine alla condizione.",
                    "La creatura subisce svantaggio ai tiri per colpire.",
                    "Un tiro per colpire contro la creatura ottiene vantaggio se l'attaccante si trova entro 1,5 metri dalla creatura. Altrimenti, il tiro per colpire subisce svantaggio.",
                ],
            },
            {
                title: "Spaventato",
                items: [
                    "Una creatura spaventata subisce svantaggio alle prove di caratteristica e ai tiri per colpire finché la fonte della sua paura si trova nel suo campo visivo.",
                    "La creatura non può avvicinarsi volontariamente alla fonte della sua paura.",
                ],
            },
            {
                title: "Stordito",
                items: [
                    "Una creatura stordita è incapacitata (vedi la relativa condizione), non può muoversi e riesce a parlare solo in modo incerto.",
                    "La creatura fallisce automaticamente i tiri salvezza su Forza e Destrezza.",
                    "I tiri per colpire contro la creatura ottengono vantaggio.",
                ],
            },
            {
                title: "Trattenuto",
                items: [
                    "La velocità di una creatura trattenuta diventa 0 e la creatura non può beneficiare di alcun bonus alla velocità.",
                    "I tiri per colpire contro la creatura ottengono vantaggio, mentre i tiri per colpire della creatura subiscono svantaggio.",
                    "La creatura subisce svantaggio ai tiri salvezza su Destrezza.",
                ],
            },
        ],
    },
    // The errors of the SRD that change a rule, against the English SRD: in a file written, its wrong text, every time, and the right one.
    errata: [
        {
            file: "world/creatures/Dragonborn.md",
            wrong: "(TS Conoscenza)",
            right: "(TS Costituzione)",
            why: "the breath of the silver, white and green ancestries: a Constitution saving throw (Con. save) in English; Conoscenza is no ability",
        },
        {
            file: "world/items/Orb of Dragonkind.md",
            wrong: "tiro salvezza su Carisma con CD 15",
            right: "prova di Carisma con CD 15",
            why: "to control the orb: a DC 15 Charisma check in English, as the Italian's next sentence says (Se la prova viene superata)",
        },
    ],
    // Where each rules chapter is in the PDF: from the heading that opens it, on its page, to the one that opens what follows, and the sections it takes
    // from elsewhere; a chapter title the SRD lacks is ours.
    chapters: {
        "Races.md": { from: ["Razze", 2], to: ["Elfo", 2] },
        "Beyond 1st Level.md": { from: ["Oltre il 1° livello", 60], to: ["Background", 65] },
        "Equipment.md": { from: ["Equipaggiamento", 68], to: ["Talenti", 84] },
        "Using Ability Scores.md": { from: ["Usare i punteggi di caratteristica", 85], to: ["Tempo", 95] },
        "Adventuring.md": { title: "Avventura", from: ["Tempo", 95], to: ["L'ordine di combattimento", 102] },
        "Combat.md": { title: "Combattimento", from: ["L'ordine di combattimento", 102], to: ["Incantesimi", 114] },
        "Spellcasting.md": { from: ["Incantesimi", 114], to: ["Liste degli incantesimi", 120] },
        "Traps.md": { from: ["Trappole", 223], to: ["Malattie", 228] },
        "Diseases.md": { from: ["Malattie", 228], to: ["Follia", 230] },
        "Madness.md": { from: ["Follia", 230], to: ["Oggetti", 232] },
        "Objects.md": { from: ["Oggetti", 232], to: ["Veleni", 233] },
        "Poisons.md": { from: ["Veleni", 233], to: ["Oggetti magici", 235] },
        "Magic Items.md": { from: ["Oggetti magici", 235], to: ["Mostri", 292], without: "magic items" },
        "Monsters.md": {
            from: ["Mostri", 292],
            to: ["Mostri (A)", 300],
            with: [{ from: ["Archetipo del Mezzodrago", 303], to: ["Mezzodrago rosso veterano", 303] }],
            // The sidebar the SRD sets among the senses is a section after them in English, as its headings' levels follow.
            move: { from: ["Competenze in armi, armature e strumenti", 295], before: ["Linguaggi", 296] },
        },
        "Conditions.md": { from: ["Appendice A del Manuale del Giocatore: Condizioni", 406], to: ["Appendice B del Manuale del Giocatore: Pantheon fantasy-storici", 408] },
        "Fantasy-Historical Pantheons.md": { from: ["Appendice B del Manuale del Giocatore: Pantheon fantasy-storici", 408], to: ["Appendice C del Manuale del Giocatore: I piani di esistenza", 411] },
        "The Planes of Existence.md": { from: ["Appendice C del Manuale del Giocatore: I piani di esistenza", 411], to: ["Appendice MM-A: Creature varie", 414] },
        "Nonplayer Characters.md": { from: ["Appendice MM-B: Personaggi non giocanti", 444], to: ["Accolito", 444] },
    },
    // The pages of the PDF that hold each kind of section.
    pages: {
        races: { first: 2, last: 7 },
        classes: { first: 8, last: 60 },
        spellLists: { first: 120, last: 128 },
        spells: { first: 129, last: 222 },
        magicItems: { first: 237, last: 291 },
        creatures: [{ first: 300, last: 405 }, { first: 414, last: 453 }],
        equipment: { first: 68, last: 83 },
    },
    // The measures of a text in metric: the Italian SRD writes 1,5 m for 5 feet and half a kilogram for a pound.
    measures: [
        [/(\d+(?:[.,]\d+)?)\s*(?:chilometri|km)\b/g, "km", 1],
        [/(\d+(?:[.,]\d+)?)\s*(?:metri|metro|m)\b/g, "m", 1],
        [/(\d+(?:[.,]\d+)?)\s*(?:centimetri|cm)\b/g, "cm", 1],
        [/(\d+(?:[.,]\d+)?)\s*(?:chilogrammi|chili|kg)\b/g, "kg", 1],
    ],
    // How a run-in title ends: "***Anfibio.***".
    runInEnd: /\.$/,
    // The dice as the SRD writes them: 2d6.
    dice: /\b(\d*)d(\d+)\b/g,
    // The words between the spells a text names in italics: "palla di fuoco o fulmine".
    conjunctions: /,|\s+[oe]\s+/,
    // The headings the SRD sets at another size than their siblings': Indebolimento, at a sidebar's 11 pt among the conditions at 12.
    headingSizes: { "Indebolimento (p. 406)": 12 },
    // The typos of the SRD that its sections are read through: the text keeps them, as the SRD writes it.
    typos: { "Ammaliamento di 5° li Eroismoello": "Ammaliamento di 5° livello" },
    // The names of the system's races, classes and subclasses as the SRD's headings write them, where words/it.yaml does not.
    names: {},
    // The races whose heading in the SRD is not their name, which its text and words/it.yaml give: the subrace heading of its race's section.
    raceHeadings: { "Lightfoot Halfling": "Piedelesto" },
    race: {
        // The heading of a race's traits, which the English page has as one heading of its own.
        traits: /^Tratti /,
        traitsHeading: "Tratti",
        abilityScoreIncrease: "Incremento dei punteggi di caratteristica",
    },
    spell: {
        /** A spell's level, school and ritual, from its italic line: "Invocazione di 3° livello", "Trucchetto di Evocazione". */
        header(text)
        {
            const match = /^(?:Trucchetto di (\p{L}+)|(\p{L}+) di (\d)° livello)( \(rituale\))?$/u.exec(text);
            return match === null ? undefined : { level: match[3] ?? "0", school: (match[1] ?? match[2]).toLowerCase(), ritual: match[4] !== undefined };
        },
        labels: { time: ["Tempo di lancio"], range: ["Gittata"], components: ["Componenti", "Componente"], duration: ["Durata"] },
        components: { V: "V", S: "S", M: "M" },
        units: [["azione bonus", "bonus action"], ["azion", "action"], ["reazion", "reaction"], ["round", "round"], ["minut", "minute"], ["or", "hour"], ["giorn", "day"]],
        ranges: [["incantatore", "self"], ["contatto", "touch"], ["vista", "sight"], ["illimitat", "unlimited"], ["speciale", "special"]],
        distance: /^([\d.]+(?:,\d+)?)\s*(metri|metro|m|km|chilometri)\b/,
        concentration: "concentrazione",
        durations: [["istantane", "instantaneous"], ["speciale", "special"], ["finché non viene dissolto o innescato", "until dispelled or triggered"], ["finché non viene dissolto", "until dispelled"]],
        schools: {
            abjuration: "abiurazione",
            conjuration: "evocazione",
            divination: "divinazione",
            enchantment: "ammaliamento",
            evocation: "invocazione",
            illusion: "illusione",
            necromancy: "necromanzia",
            transmutation: "trasmutazione",
        },
    },
    spellLists: {
        title: (className) => `Incantesimi da ${className.toLowerCase()}`,
        start: /^Incantesimi da /,
        level: (text) => text.replace(/^(\d)\s+livello$/, "$1° livello"),
    },
    magicItem: {
        type: /^(.+?), (.+?)(?: \((richiede sintonia[^)]*)\))?$/,
        categories: [["oggetto meraviglioso", "wondrous item"], ["anello", "ring"], ["bacchetta", "wand"], ["bastone", "staff"], ["pozione", "potion"], ["verga", "rod"], ["pergamena", "scroll"], ["armatura", "armor"], [
            "arma",
            "weapon",
        ]],
        rarities: [["non comun", "uncommon"], ["comun", "common"], ["molto rar", "very rare"], ["rar", "rare"], ["leggendari", "legendary"], ["manufatto", "artifact"], ["variabile", "varies"]],
        // A rarity by its bonus or its kind, as "non comune (+1), raro (+2) o molto raro (+3)", varies.
        varies: / o /,
    },
    creature: {
        sizes: [["minuscol", "Tiny"], ["piccol", "Small"], ["medi", "Medium"], ["grande", "Large"], ["enorme", "Huge"], ["mastodontic", "Gargantuan"]],
        armorClass: "Classe Armatura",
        hitPoints: "Punti Ferita",
        challenge: "Sfida",
        // The lines of a stat block after its ability scores.
        afterAbilities: /^(Tiri Salvezza|Abilità|Vulnerabilità|Resistenz|Immunità|Sensi)/,
        // The labels of a stat block's lines, in bold without a colon.
        labels: /^(Classe Armatura|Punti Ferita|Velocità|Tiri Salvezza|Abilità|Vulnerabilità ai Danni|Resistenz[ae] ai Danni|Immunità ai Danni|Immunità alle Condizioni|Sensi|Linguaggi|Sfida)$/i,
        // The lines of a stat block's spells, each a paragraph: "Trucchetti (a volontà):", "1° livello (4 slot):", "A volontà:", "3/giorno ciascuno:".
        spellLines: /^(Trucchetti \(a volontà\):|\d+° livello \(\d+ slot\):|A volontà:|\d+\/giorno( ciascuno)?:)/,
        spellItems: /^(Trucchetti|A volontà|\d+\/giorno|\d+° livello)/,
        abilities: ["FOR", "DES", "COS", "INT", "SAG", "CAR"],
        traits: "Tratti",
        legendaryActions: "Azioni leggendarie",
    },
    // A variant of a creature, a sidebar in the SRD, as a section of the page of the creature it varies.
    variants: { "Variante: sciami di insetti": "Swarm of Insects", "Variante: topi giganti contagiosi": "Giant Rat" },
    // The warlock's list of invocations, a section of its own after the class's features, which the English page has under the feature that names it.
    invocations: "Suppliche Occulte",
    gear: {
        // The tables of the equipment whose rows are items, by caption: the English category of each group of rows, "" for the rows of none.
        tables: {
            Armature: { "Armature leggere": "light armor", "Armature medie": "medium armor", "Armature pesanti": "heavy armor", Scudi: "shield" },
            Armi: { "Armi da mischia semplici": "simple melee weapon", "Armi a distanza semplici": "simple ranged weapon", "Armi da mischia da guerra": "martial melee weapon", "Armi a distanza da guerra": "martial ranged weapon" },
            "Equipaggiamento d'avventura": { "": "adventuring gear", Munizioni: "ammunition", "Focus arcano": "arcane focus", "Focus druidico": "druidic focus", "Simbolo sacro": "holy symbol" },
            Strumenti: { "": "tool", "Strumenti da artigiano": "artisan's tools", "Strumenti musicali": "musical instrument", Giochi: "gaming set" },
            "Finimenti e veicoli da tiro": { "": ["tack and harness", "drawn vehicle"], Sella: "saddle" },
            Imbarcazioni: { "": "waterborne vehicle" },
        },
        columns: { cost: "costo", weight: "peso", damage: "danni", armorClass: "classe armatura" },
        coins: { mr: 1, ma: 10, me: 50, mo: 100, mp: 1000 },
        // The descriptions an item takes from a title other than its own or its group's, as gear.mjs gives them in English.
        describedBy: { Sella: "Selle", Barcone: "Imbarcazioni a remi", "Barca a remi": "Imbarcazioni a remi" },
        // The groups whose rows name only a kind of their group, as Da carico under Sella: their name is the group's and the row's.
        composedGroups: ["Sella"],
        // An equipment pack's run-in title, with its price.
        pack: /^(Dotazione .+) \(([\d.]+ mo)\)\.$/,
        // Of the gear's potion of healing, the magic item's page takes its sentence on drinking it.
        healing: { title: "Pozione di guarigione", sentence: /Per bere o somministrare[^.]*\./ },
    },
    // The background, the feat and the unarmed strike, by their place.
    background: { heading: ["Background", 65], acolyte: ["Accolito", 66], end: 68 },
    feats: ["Talenti", 84],
    unarmedStrike: { page: 108, text: "colpo senz'armi:" },
};
