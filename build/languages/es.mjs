// The official Spanish SRD 5.1 (SRD_CC_v5.1_ES.pdf) for translations.mjs: where its parts are, the words it writes them with, and what we add or correct.
export default {
    name: "Spanish",
    pdf: "SRD_CC_v5.1_ES.pdf",
    abilities: { Strength: "Fuerza", Dexterity: "Destreza", Constitution: "Constitución", Intelligence: "Inteligencia", Wisdom: "Sabiduría", Charisma: "Carisma" },
    // The pages and chapters without a text in this SRD, and why.
    exceptions: {
        "rules/Combat Encounters.md": "from the SRD 5.2.1, which the official Spanish translation of the SRD 5.1 lacks",
    },
    // What the English pages say that the SRD does not: the lines our converters add.
    ourLines: {
        "On a sheet, a pack is what it holds: write each kind with how many, never the pack itself.": "En una hoja de personaje, un paquete es lo que contiene: anota cada objeto que contiene con su cantidad, nunca el paquete en sí.",
    },
    // A spell list's first line, when the English page's is not one of ourLines.
    spellListLine: (className) => `Los conjuros de ${className.toLowerCase()}, por nivel.`,
    // The sections of a rules chapter the SRD lacks: none, its Apéndice MJ-A has every condition.
    ourSections: {},
    // The errors of the SRD that change a rule, against the English SRD: in a file written, its wrong text, every time, and the right one.
    errata: [],
    // Where each rules chapter is in the PDF: from the heading that opens it, on its page, to the one that opens what follows, and the sections it takes
    // from elsewhere; a chapter title the SRD lacks is ours, from the chapters of the Spanish Player's Handbook.
    chapters: {
        "Races.md": { from: ["Razas", 2], to: ["Elfo", 2] },
        "Beyond 1st Level.md": { from: ["Más allá del nivel 1", 56], to: ["Trasfondos", 60] },
        "Equipment.md": { from: ["Equipo", 63], to: ["Dotes", 78] },
        "Using Ability Scores.md": { from: ["Uso de las puntuaciones de característica", 79], to: ["Tiempo", 88] },
        "Adventuring.md": { title: "Aventuras", from: ["Tiempo", 88], to: ["Estructura de un combate", 95] },
        "Combat.md": { title: "Combate", from: ["Estructura de un combate", 95], to: ["Lanzamiento de conjuros", 106] },
        "Spellcasting.md": { from: ["Lanzamiento de conjuros", 106], to: ["Listas de conjuros", 111] },
        "Traps.md": { from: ["Trampas", 209], to: ["Enfermedades", 214] },
        "Diseases.md": { from: ["Enfermedades", 214], to: ["Locura", 216] },
        "Madness.md": { from: ["Locura", 216], to: ["Objetos", 218] },
        "Objects.md": { from: ["Objetos", 218], to: ["Venenos", 219] },
        "Poisons.md": { from: ["Venenos", 219], to: ["Objetos mágicos", 221] },
        "Magic Items.md": { from: ["Objetos mágicos", 221], to: ["Monstruos", 274], without: "magic items" },
        "Monsters.md": {
            from: ["Monstruos", 274],
            to: ["Monstruos (A)", 282],
            with: [{ from: ["Plantilla de semidragón", 380], to: ["Semidragón rojo veterano", 380] }],
            // The sidebar the SRD sets among the senses is a section after them in English, as its headings' levels follow.
            move: { from: ["Competencias con armadura, armas y herramientas", 278], before: ["Idiomas", 278] },
        },
        "Conditions.md": { from: ["Apéndice MJ-A: Estados", 389], to: ["Apéndice MJ-B: Panteones histórico-fantásticos", 391] },
        "Fantasy-Historical Pantheons.md": { from: ["Apéndice MJ-B: Panteones histórico-fantásticos", 391], to: ["Apéndice MJ-C: Los planos de existencia", 394] },
        "The Planes of Existence.md": { from: ["Apéndice MJ-C: Los planos de existencia", 394], to: ["Apéndice MM-A: Criaturas diversas", 397] },
        "Nonplayer Characters.md": { from: ["Apéndice MM-B: Personajes no jugadores", 428], to: ["Acólito", 428] },
    },
    // The pages of the PDF that hold each kind of section.
    pages: {
        races: { first: 2, last: 7 },
        classes: { first: 8, last: 56 },
        spellLists: { first: 111, last: 119 },
        spells: { first: 120, last: 208 },
        magicItems: { first: 222, last: 273 },
        creatures: [{ first: 282, last: 388 }, { first: 397, last: 437 }],
        equipment: { first: 63, last: 77 },
    },
    // The measures of a text in metric: the Spanish SRD writes 1,5 m for 5 feet and half a kilogram for a pound.
    measures: [
        [/(\d+(?:[.,]\d+)?)\s*(?:kilómetros|km)(?!\p{L})/gu, "km", 1],
        [/(\d+(?:[.,]\d+)?)\s*(?:metros|metro|m)(?!\p{L})/gu, "m", 1],
        [/(\d+(?:[.,]\d+)?)\s*(?:centímetros|cm)(?!\p{L})/gu, "cm", 1],
        [/(\d+(?:[.,]\d+)?)\s*(?:kilogramos|kilos|kg)(?!\p{L})/gu, "kg", 1],
        [/(\d+(?:[.,]\d+)?)\s*(?:gramos|g)(?!\p{L})/gu, "kg", 0.001],
    ],
    // How a run-in title ends: "***Anfibio.***".
    runInEnd: /\.$/,
    // The dice as the SRD writes them: 2d6.
    dice: /\b(\d*)d(\d+)\b/g,
    // The words between the spells a text names in italics: "bola de fuego o relámpago".
    conjunctions: /,|\s+[oyeu]\s+/,
    // The PDF breaks words at the end of a line, as independiente- mente.
    softHyphens: true,
    // The headings the SRD sets at another size than their siblings': Cansancio, at a sidebar's 11 pt among the conditions at 12.
    headingSizes: { "Cansancio (p. 389)": 12 },
    // The typos of the SRD that its sections are read through: the text keeps them, as the SRD writes it.
    typos: {},
    // The names of the system's races, classes and subclasses as the SRD's headings write them, where words/es.yaml does not.
    names: {
        "Oath of Devotion": "Juramento de Entrega",
        "Path of the Berserker": "Senda del Berserker",
        "Draconic Bloodline": "Linaje Dracónico",
        "Unarmed Strike": "Ataque sin armas",
    },
    // The pages whose name the SRD gives another page too, with ours: the arcane focuses Bastón and Vara, as the quarterstaff and the pole, with their group.
    renames: {
        "world/items/Staff.md": { name: "Bastón (canalizador arcano)", why: "the SRD names the arcane focus as the quarterstaff, Bastón" },
        "world/items/Rod.md": { name: "Vara (canalizador arcano)", why: "the SRD names the arcane focus as the pole, Vara" },
    },
    // The races whose heading in the SRD is not their name, which its text and words/es.yaml give: the subrace heading of its race's section.
    raceHeadings: { "Lightfoot Halfling": "Piesligeros" },
    // The headers of tables the SRD sets as one cell, with their columns: the draconic ancestry's.
    tableHeaders: { "Dragón Tipo de daño Ataque de Aliento": ["Dragón", "Tipo de daño", "Ataque de Aliento"] },
    // The cells of tables the SRD sets as one span over two columns, with their parts: the class tables' headers.
    cellSplits: { "competencia Rasgos": ["competencia", "Rasgos"], "hechicería Rasgos": ["hechicería", "Rasgos"] },
    race: {
        // The heading of a race's traits, which the English page has as one heading of its own.
        traits: /^Atributos de los /,
        traitsHeading: "Atributos",
        abilityScoreIncrease: "Mejora de Característica",
    },
    spell: {
        /** A spell's level, school and ritual, from its italic line: "Evocación nivel 3", "Conjuración (truco)". */
        header(text)
        {
            const match = /^(\p{L}+) (?:\(truco\)|nivel (\d))( \(ritual\))?$/u.exec(text);
            return match === null ? undefined : { level: match[2] ?? "0", school: match[1].toLowerCase(), ritual: match[3] !== undefined };
        },
        labels: { time: ["Tiempo de lanzamiento"], range: ["Alcance"], components: ["Componentes"], duration: ["Duración"] },
        components: { V: "V", S: "S", M: "M" },
        units: [["acción adicional", "bonus action"], ["acción", "action"], ["reacción", "reaction"], ["asalto", "round"], ["minuto", "minute"], ["hora", "hour"], ["día", "day"]],
        ranges: [["lanzador", "self"], ["toque", "touch"], ["vista", "sight"], ["ilimitad", "unlimited"], ["especial", "special"]],
        distance: /^([\d.]+(?:,\d+)?)\s*(metros|metro|m|km|kilómetros)(?!\p{L})/u,
        concentration: "concentración",
        durations: [["instantáne", "instantaneous"], ["especial", "special"], ["hasta que sea disipado o se active", "until dispelled or triggered"], ["hasta que sea disipado", "until dispelled"]],
        schools: {
            abjuration: "abjuración",
            conjuration: "conjuración",
            divination: "adivinación",
            enchantment: "encantamiento",
            evocation: "evocación",
            illusion: "ilusionismo",
            necromancy: "nigromancia",
            transmutation: "transmutación",
        },
    },
    spellLists: {
        title: (className) => `Conjuros de ${className.toLowerCase()}`,
        start: /^Conjuros de /,
        level: (text) => text,
    },
    magicItem: {
        type: /^(.+?), (.+?)(?: \((requiere sintonización[^)]*)\))?$/,
        categories: [["objeto maravilloso", "wondrous item"], ["anillo", "ring"], ["varita", "wand"], ["bastón", "staff"], ["poción", "potion"], ["vara", "rod"], ["pergamino", "scroll"], ["armadura", "armor"], [
            "arma",
            "weapon",
        ]],
        rarities: [["infrecuente", "uncommon"], ["común", "common"], ["muy rar", "very rare"], ["rar", "rare"], ["legendari", "legendary"], ["artefacto", "artifact"], ["rareza variable", "varies"]],
        // A rarity by its bonus or its kind, as "infrecuente (+1), rara (+2) o muy rara (+3)", varies.
        varies: / o /,
    },
    creature: {
        sizes: [["diminut", "Tiny"], ["pequeñ", "Small"], ["median", "Medium"], ["grande", "Large"], ["enorme", "Huge"], ["gargantuesc", "Gargantuan"]],
        armorClass: "Clase de Armadura",
        hitPoints: "Puntos de golpe",
        challenge: "Desafío",
        // The lines of a stat block after its ability scores.
        afterAbilities: /^(Tiradas de salvación|Habilidades|Vulnerabilidad|Resistencia|Inmunidad|Sentidos)/,
        // The labels of a stat block's lines, in bold with a colon.
        labels: /^(Clase de Armadura|Puntos de golpe|Velocidad|Tiradas de salvación|Habilidades|Vulnerabilidad a daño|Resistencia a daño|Inmunidad a daño|Inmunidad a estados|Sentidos|Idiomas|Desafío):?$/i,
        // The lines of a stat block's spells, each a paragraph: "Trucos (a voluntad):", "Nivel 1 (4 espacios):", "A voluntad:", "3/día cada uno:".
        spellLines: /^(Trucos \(a voluntad\):|Nivel \d+ \(\d+ espacios?\):|A voluntad:|\d+\/día( cada uno)?:)/,
        spellItems: /^(Trucos|A voluntad|\d+\/día|Nivel \d+)/,
        abilities: ["FUE", "DES", "CON", "INT", "SAB", "CAR"],
        traits: "Atributos",
        legendaryActions: "Acciones legendarias",
    },
    // A variant of a creature, a sidebar in the SRD, as a section of the page of the creature it varies.
    variants: { "Variante: enjambres de insectos": "Swarm of Insects", "Variante: ratas gigantes enfermas": "Giant Rat" },
    // The warlock's list of invocations, a section of its own after the class's features, which the English page has under the feature that names it.
    invocations: "Invocaciones Sobrenaturales",
    gear: {
        // The tables of the equipment whose rows are items, by caption: the English category of each group of rows, "" for the rows of none.
        tables: {
            Armaduras: { "Armaduras ligeras": "light armor", "Armaduras medias": "medium armor", "Armaduras pesadas": "heavy armor", Escudos: "shield" },
            Armas: {
                "Armas cuerpo a cuerpo sencillas": "simple melee weapon",
                "Armas a distancia sencillas": "simple ranged weapon",
                "Armas cuerpo a cuerpo marciales": "martial melee weapon",
                "Armas a distancia marciales": "martial ranged weapon",
            },
            "Equipo de aventureros": { "": "adventuring gear", Munición: "ammunition", "Canalizadores arcanos": "arcane focus", "Canalizadores druídicos": "druidic focus", "Símbolos sagrados": "holy symbol" },
            Herramientas: { "": "tool", "Herramientas de artesano": "artisan's tools", "Instrumentos musicales": "musical instrument", Juegos: "gaming set" },
            "Arreos, arneses y vehículos tirados por animales": { "": ["tack and harness", "drawn vehicle"], Silla: "saddle" },
            "Vehículos acuáticos": { "": "waterborne vehicle" },
        },
        columns: { cost: "precio", weight: "peso", damage: "daño", armorClass: "clase de armadura" },
        coins: { pc: 1, pp: 10, pe: 50, po: 100, ppt: 1000 },
        // The descriptions an item takes from a title other than its own or its group's, as gear.mjs gives them in English.
        describedBy: {
            Silla: "Sillas",
            Barcaza: "Barcos de remos",
            "Bote de remos": "Barcos de remos",
            "Canalizadores arcanos": "Canalizador arcano",
            "Canalizadores druídicos": "Canalizador druídico",
            "Símbolos sagrados": "Símbolo sagrado",
            "Estuche para mapa o pergamino": "Estuche para mapas o pergaminos",
        },
        // The groups whose rows name only a kind of their group, as De monta under Silla: their name is the group's and the row's.
        composedGroups: ["Silla"],
        // An equipment pack's run-in title, with its price.
        pack: /^(Paquete .+) \(([\d.]+ po)\)\.$/,
        // Of the gear's potion of healing, the magic item's page takes its sentence on drinking it.
        healing: { title: "Poción de curación", sentence: /Tanto beber como administrar[^.]*\./ },
    },
    // The background, the feat and the unarmed strike, by their place.
    background: { heading: ["Trasfondos", 60], acolyte: ["Acólito", 61], end: 63 },
    feats: ["Dotes", 78],
    unarmedStrike: { page: 101, text: "sin armas, que puede" },
};
