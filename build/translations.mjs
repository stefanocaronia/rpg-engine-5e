// Writes the Italian text of the 5e's pages and rules chapters into translations/it, from the official Italian SRD 5.1 (CC BY 4.0, SRD_CC_v5.1_IT.pdf):
// node build/translations.mjs <srd51-it.jsonl>, from lines-it.py. Each page of world/ gets translations/it/world/<folder>/<its file>: its Italian name, the
// SRD's, and its text, as the English page has it; each chapter of rules/ gets translations/it/rules/<its file>. The Italian SRD sorts its lists by the
// Italian names, so a page is matched to its Italian section by what it holds (D-542): a spell by its header, a creature by its stat block, an item by its
// table row or type line; races, classes and chapters by their place. translations-it.json keeps every match, with those fixed by hand ("by": "hand"),
// which a run keeps, and those a run is not sure of ("uncertain"), which it prints.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { blockText, joinRuns, markdown, plainText, readBlocks, readItalian, runsText } from "./italian-markdown.mjs";
import { pageText } from "./pages.mjs";

const system = join(import.meta.dirname, "..");
const target = join(system, "translations", "it");
const tablePath = join(import.meta.dirname, "translations-it.json");
const italianWords = parse(readFileSync(join(system, "words", "it.yaml"), "utf8")).words;
// The game's terms in both languages, from words/it.yaml and the abilities' names, as a text holds them: Stealth and Furtività, poison and veleno. A term in
// capitals is matched as it is written, as Forza (Strength) apart from forza (force).
const abilities = { Strength: "Forza", Dexterity: "Destrezza", Constitution: "Costituzione", Intelligence: "Intelligenza", Wisdom: "Saggezza", Charisma: "Carisma" };
const terms = Object.entries({ ...italianWords, ...abilities })
    .filter(([english, italian]) => typeof italian === "string" && !/[{}]/.test(english + italian) && english.split(" ").length <= 3 && english.length >= 4)
    .map(([english, italian]) => [termPattern(english), termPattern(italian.split(" (")[0])]);

// The pages and chapters without an Italian SRD text, and why.
const exceptions = {
    "rules/Combat Encounters.md": "from the SRD 5.2.1, which has no official Italian translation",
};
// What the English pages say that the SRD does not, in Italian: the lines our converters add.
const ourLines = {
    "On a sheet, a pack is what it holds: write each kind with how many, never the pack itself.": "Su una scheda, una dotazione è ciò che contiene: scrivi ogni oggetto che contiene, con la sua quantità, mai la dotazione stessa.",
};
// The sections of a rules chapter the Italian SRD lacks, in our Italian from the English SRD's text, with its terms: its Appendix A ends with Privo di sensi
// (p. 407), without Prone, Frightened, Stunned and Restrained. Each goes among its chapter's sections of the same type, in alphabetical order.
const ourSections = {
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
};
// The errors of the Italian SRD that change a rule, against the English SRD: in a file written, its wrong text, every time, and the right one.
const errata = [
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
];
// Where each rules chapter is in the Italian PDF: from the heading that opens it, on its page, to the one that opens what follows, and the sections it takes
// from elsewhere; a chapter title the Italian SRD lacks is ours.
const chapters = {
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
        // The sidebar the Italian SRD sets among the senses is a section after them in English, as its headings' levels follow.
        move: { from: ["Competenze in armi, armature e strumenti", 295], before: ["Linguaggi", 296] },
    },
    "Conditions.md": { from: ["Appendice A del Manuale del Giocatore: Condizioni", 406], to: ["Appendice B del Manuale del Giocatore: Pantheon fantasy-storici", 408] },
    "Fantasy-Historical Pantheons.md": { from: ["Appendice B del Manuale del Giocatore: Pantheon fantasy-storici", 408], to: ["Appendice C del Manuale del Giocatore: I piani di esistenza", 411] },
    "The Planes of Existence.md": { from: ["Appendice C del Manuale del Giocatore: I piani di esistenza", 411], to: ["Appendice MM-A: Creature varie", 414] },
    "Nonplayer Characters.md": { from: ["Appendice MM-B: Personaggi non giocanti", 444], to: ["Accolito", 444] },
};
// The pages of the PDF that hold each kind of section.
const spellPages = { first: 129, last: 222 };
const magicItemPages = { first: 237, last: 291 };
const creaturePages = [{ first: 300, last: 405 }, { first: 414, last: 453 }];
const equipmentPages = { first: 68, last: 83 };
// The measures of a text in metric, by language: the Italian SRD writes 1,5 m for 5 feet and half a kilogram for a pound.
const italianMeasures = [
    [/(\d+(?:[.,]\d+)?)\s*(?:chilometri|km)\b/g, "km", 1],
    [/(\d+(?:[.,]\d+)?)\s*(?:metri|metro|m)\b/g, "m", 1],
    [/(\d+(?:[.,]\d+)?)\s*(?:centimetri|cm)\b/g, "cm", 1],
    [/(\d+(?:[.,]\d+)?)\s*(?:chilogrammi|chili|kg)\b/g, "kg", 1],
];
const englishMeasures = [
    [/(\d+(?:,\d{3})*(?:\.\d+)?)(?:\s+|-)(?:miles?)\b/g, "km", 1.5],
    [/(\d+(?:,\d{3})*(?:\.\d+)?)(?:\s+|-)(?:feet|foot|ft\.?)(?=\W|$)/g, "m", 0.3],
    [/(\d+(?:,\d{3})*(?:\.\d+)?)(?:\s+|-)(?:inch|inches)\b/g, "cm", 2.5],
    [/(\d+(?:,\d{3})*(?:\.\d+)?)(?:\s+|-)(?:pounds?|lb\.?)(?=\W|$)/g, "kg", 0.5],
];
// The headings the Italian SRD sets at another size than their siblings': Indebolimento, at a sidebar's 11 pt among the conditions at 12.
const headingSizes = { "Indebolimento (p. 406)": 12 };
// The typos of the Italian SRD that its sections are read through: the text keeps them, as the SRD writes it.
const typos = { "Ammaliamento di 5° li Eroismoello": "Ammaliamento di 5° livello" };
// The races whose heading in the Italian SRD is not their name, which its text and words/it.yaml give: the subrace heading of its race's section.
const raceHeadings = { "Lightfoot Halfling": "Piedelesto" };
// The tables of the equipment whose rows are items, by caption: the English category of each group of rows, "" for the rows of none.
const itemTables = {
    Armature: { "Armature leggere": "light armor", "Armature medie": "medium armor", "Armature pesanti": "heavy armor", Scudi: "shield" },
    Armi: { "Armi da mischia semplici": "simple melee weapon", "Armi a distanza semplici": "simple ranged weapon", "Armi da mischia da guerra": "martial melee weapon", "Armi a distanza da guerra": "martial ranged weapon" },
    "Equipaggiamento d'avventura": { "": "adventuring gear", Munizioni: "ammunition", "Focus arcano": "arcane focus", "Focus druidico": "druidic focus", "Simbolo sacro": "holy symbol" },
    Strumenti: { "": "tool", "Strumenti da artigiano": "artisan's tools", "Strumenti musicali": "musical instrument", Giochi: "gaming set" },
    "Finimenti e veicoli da tiro": { "": ["tack and harness", "drawn vehicle"], Sella: "saddle" },
    Imbarcazioni: { "": "waterborne vehicle" },
};
// The descriptions an item takes from a title other than its own or its group's, as gear.mjs gives them in English.
const describedBy = { Sella: "Selle", Barcone: "Imbarcazioni a remi", "Barca a remi": "Imbarcazioni a remi" };
// The groups whose rows name only a kind of their group, as Da carico under Sella: their name is the group's and the row's.
const composedGroups = ["Sella"];
// A variant of a creature, a sidebar in the Italian SRD, as a section of the page of the creature it varies.
const variants = { "Variante: sciami di insetti": "Swarm of Insects", "Variante: topi giganti contagiosi": "Giant Rat" };

const [linesPath] = process.argv.slice(2);

if (linesPath === undefined) {
    console.error("Usage: node build/translations.mjs <srd51-it.jsonl>, from python build/lines-it.py <SRD_CC_v5.1_IT.pdf> <srd51-it.jsonl>");
    process.exit(1);
}

const { lines, fills } = readItalian(linesPath);
const blocks = readBlocks(lines, fills);

for (const block of blocks.filter((one) => one.kind === "heading")) {
    block.size = headingSizes[`${block.text} (p. ${block.page})`] ?? block.size;
}

const english = englishPages();
const before = existsSync(tablePath) ? JSON.parse(readFileSync(tablePath, "utf8")) : {};
const sections = [...spellSections(), ...magicItemSections(), ...creatureSections(), ...raceSections(), ...classSections(), ...gearSections(), ...otherTopicSections()];
const matches = matched(english, sections, before);
const written = writeTranslations(english, matches);
writeFileSync(tablePath, `${JSON.stringify(tableOf(matches), undefined, 2)}\n`);
report(english, written);

/** The system's pages and rules chapters, each with its path, kind, fields and text. */
function englishPages()
{
    const pages = ["creatures", "items", "topics"].flatMap((folder) =>
        readdirSync(join(system, "world", folder)).filter((file) => file.endsWith(".md")).sort().map((file) => {
            const text = readFileSync(join(system, "world", folder, file), "utf8").replaceAll("\r\n", "\n");
            const [, front, body] = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
            const fields = parse(front) ?? {};
            return { path: `world/${folder}/${file}`, folder, name: file.slice(0, -3), fields, body: body.trim(), kind: kindOf(folder, fields) };
        })
    );
    const rules = readdirSync(join(system, "rules")).filter((file) => file.endsWith(".md")).sort().map((file) => ({
        path: `rules/${file}`,
        folder: "rules",
        name: file.slice(0, -3),
        fields: {},
        body: readFileSync(join(system, "rules", file), "utf8").replaceAll("\r\n", "\n").trim(),
        kind: "chapter",
    }));
    return [...pages, ...rules];
}

function kindOf(folder, fields)
{
    if (folder === "creatures") {
        return fields.category === "race" ? "race" : "creature";
    }

    if (folder === "items") {
        return fields.rarity !== undefined ? "magic item" : "gear";
    }

    return { spell: "spell", class: "class", subclass: "subclass", "spell list": "spell list" }[fields.category] ?? "topic";
}

// The spells (pp. 129–222): a heading, then its level and school in italics, then Casting Time, Range, Components and Duration in bold.
function spellSections()
{
    return startsOf(spellPages, (block, next) => block.kind === "heading" && !block.bold && isItalicLine(next) && levelOf(plainText(next.runs)) !== undefined).map(({ start, body }) => {
        const header = levelOf(plainText(body[0].runs));
        // The header ends with Durata; a line of it the PDF does not indent, as the end of a reaction's casting time, is a paragraph of its own.
        const end = body.findIndex((block) => block.kind === "paragraph" && /^Durata:/.test(plainText(block.runs))) + 1;
        const labels = {};
        let last;

        for (const block of body.slice(1, end)) {
            const label = block.runs[0]?.style === "**" ? block.runs[0].text.trim() : "";

            if (label === "" && last !== undefined) {
                labels[last] = `${labels[last]} ${plainText(block.runs)}`;
            } else {
                last = label.replace(/:$/, "");
                labels[last] = plainText(block.runs).slice(label.length).trim();
            }
        }

        const features = new Map([
            [`level ${header.level}`, 3],
            [`school ${header.school}`, 3],
            ...(header.ritual ? [["ritual", 2]] : []),
            [`time ${castingTime(labels["Tempo di lancio"] ?? "")}`, 2],
            [`range ${spellRange(labels.Gittata ?? "")}`, 2],
            [`components ${components(labels.Componenti ?? labels.Componente ?? "")}`, 2],
            [`duration ${spellDuration(labels.Durata ?? "")}`, 2],
        ]);
        return section("spell", start, body.slice(end), features);
    });
}

// The magic items (pp. 237–291): a heading, then its kind and rarity in italics.
function magicItemSections()
{
    return startsOf(magicItemPages, (block, next) => block.kind === "heading" && !block.bold && block.size >= 12 && isItalicLine(next) && itemType(plainText(next.runs)) !== undefined)
        .map(({ start, body }) => {
            const type = itemType(plainText(body[0].runs));
            const features = new Map([[`category ${type.category}`, 3], [`rarity ${type.rarity}`, 3], ...(type.attunement ? [["attunement", 2]] : [])]);
            return { ...section("magic item", start, body.slice(1), features), header: [start, body[0]] };
        });
}

// The stat blocks (pp. 300–405 and the appendices MM-A and MM-B): a name in bold, then size, type and alignment in italics, then Armor Class.
function creatureSections()
{
    return creaturePages.flatMap((pages) =>
        // A stat block ends at the next heading but its own Azioni and Reazioni, at 11 pt in bold: a family's, as Drago rosso, or a variant's sidebar.
        startsOf(pages, (block, next) =>
            block.kind === "heading" && block.bold && block.size === 12 && isItalicLine(next) && creatureType(plainText(next.runs)) !== undefined, (block) =>
            block.kind === "heading" && !(block.bold && block.size === 11)).map(({ start, body }) => {
                const type = creatureType(plainText(body[0].runs));
                const stats = statsOf(body);
                const features = new Map([[`size ${type.size}`, 2], [`ac ${stats.ac}`, 2], [`hp ${stats.hp}`, 3], [`cr ${stats.cr}`, 2], ...stats.abilities.map((score, index) => [`ability ${index} ${score}`, 1])]);
                return section("creature", start, body, features);
            })
    ).concat(variantSections());
}

/** The variants of a creature, each a section the page of its creature takes after its own text. */
function variantSections()
{
    return Object.entries(variants).map(([title, creature]) => {
        const index = blocks.findIndex((block) => block.kind === "heading" && block.text === title);
        const end = blocks.findIndex((block, at) => at > index && block.kind === "heading" && block.size >= 12);
        return { ...section("variant", blocks[index], blocks.slice(index + 1, end), new Map()), of: creature };
    });
}

// The races (pp. 2–7): a race's heading, then its traits; a subrace's heading, smaller, after them.
function raceSections()
{
    const races = english.filter((page) => page.kind === "race");
    return races.map((page) => {
        const name = italianWords[page.name];
        const heading = raceHeadings[page.name] ?? name;
        const start = blocks.findIndex((block) => block.kind === "heading" && block.page <= 7 && block.text === heading && block.size >= 12);

        if (start === -1) {
            throw new Error(`No race ${heading} (${page.name}) in pp. 2–7 of the Italian SRD: give its Italian name in words/it.yaml as the SRD writes it, or its heading in raceHeadings.`);
        }

        // A race ends at its subrace, a subrace at the next race; a table's caption in bold, as Discendenza draconica, is part of it.
        const end = blocks.findIndex((block, index) => index > start && block.kind === "heading" && block.size >= 12 && !block.bold && !/^Tratti /.test(block.text));
        return { ...section("race", { ...blocks[start], text: name }, blocks.slice(start + 1, end), new Map()), fixed: page.path };
    });
}

// The classes (pp. 8–59): a class's chapter, from its title to its subclass's heading, then the subclass to the next chapter.
function classSections()
{
    const titles = blocks.flatMap((block, index) => (block.kind === "heading" && block.size === 26 && block.page >= 8 && block.page <= 60 ? [index] : []));
    return english.filter((page) => page.kind === "class").flatMap((page) => {
        const start = titles.find((index) => blocks[index].text === italianWords[page.name]);

        if (start === undefined) {
            throw new Error(`No class ${italianWords[page.name]} (${page.name}) in pp. 8–59 of the Italian SRD.`);
        }

        const end = titles.find((index) => index > start) ?? blocks.findIndex((block) => block.kind === "heading" && block.size === 26 && block.page >= 60);
        const subclassPage = english.find((other) => other.kind === "subclass" && blocks.slice(start, end).some((block) => block.kind === "heading" && block.text === italianWords[other.name]));
        const middle = blocks.findIndex((block, index) => index > start && index < end && block.kind === "heading" && block.text === italianWords[subclassPage.name]);
        const sidebars = sidebarsOf(blocks.slice(middle + 1, end));
        // The Italian SRD sets a class's sidebars after its subclass; the English pages keep in the subclass only those it has, as its last sections.
        const kept = sidebars.slice(sidebars.length - headingLevels(subclassPage.body).filter((level) => level === 2).length);
        const moved = sidebars.filter((sidebar) => !kept.includes(sidebar)).flat();
        return [
            { ...section("class", blocks[start], movedSection([...blocks.slice(start + 1, middle), ...moved]), new Map()), fixed: page.path },
            { ...section("subclass", blocks[middle], blocks.slice(middle + 1, end).filter((block) => !moved.includes(block)), new Map()), fixed: subclassPage.path },
        ];
    });
}

/**
 * A class's blocks with the list of a feature under the feature, as the English page has it: the warlock's Suppliche Occulte, a section of its own after the
 * features in the Italian SRD, goes on under the feature that names it.
 */
function movedSection(body)
{
    const start = body.findIndex((block) => block.kind === "heading" && block.size === 18 && block.text === "Suppliche Occulte");

    if (start === -1) {
        return body;
    }

    const end = body.findIndex((block, index) => index > start && block.kind === "heading" && block.size >= 18);
    const list = body.slice(start + 1, end === -1 ? undefined : end);
    const rest = body.filter((block, index) => index < start || (end !== -1 && index >= end));
    const feature = rest.findIndex((block) => block.kind === "heading" && block.text === "Suppliche Occulte");
    const next = rest.findIndex((block, index) => index > feature && block.kind === "heading" && block.size >= rest[feature].size);
    return [...rest.slice(0, next), ...list, ...rest.slice(next)];
}

/** A background's label, as "**Linguaggi:** due a scelta", as the English page's heading with its text: ### Linguaggi, then "due a scelta". */
function labelHeading(block)
{
    const label = block.kind === "paragraph" && block.runs[0]?.style === "**" && /:\s*$/.test(block.runs[0].text) ? block.runs[0].text.trim().replace(/:$/, "") : undefined;
    return label === undefined ? [block] : [{ kind: "heading", size: 12, bold: false, text: label, page: block.page }, { ...block, runs: trimmedRuns(block.runs.slice(1)) }];
}

/** A heading as a paragraph in bold, as the English page writes the parts of the backgrounds' rules. */
function boldHeading(block)
{
    return block.kind === "heading" ? { kind: "paragraph", runs: [{ text: block.text, style: "**" }], page: block.page } : block;
}

/** The sidebars of a run of blocks, each its title, at 11 pt, with the blocks up to the next heading. */
function sidebarsOf(body)
{
    return body.flatMap((block, index) => {
        if (block.kind !== "heading" || block.size !== 11 || block.bold) {
            return [];
        }

        const end = body.findIndex((other, at) => at > index && other.kind === "heading" && other.size >= 11);
        return [body.slice(index, end === -1 ? undefined : end)];
    });
}

// The equipment (pp. 68–83): every row of its tables, with its description, the run-in title of its name, of the first part of its name or of its group.
function gearSections()
{
    const chapter = blocks.filter((block) => block.page >= equipmentPages.first && block.page <= equipmentPages.last);
    const descriptions = descriptionsOf(chapter);
    const rows = chapter.filter((block) => block.kind === "table" && block.header !== undefined).flatMap((table) => tableItems(table, chapter));
    const packs = chapter.filter((block) => block.kind === "paragraph" && block.runs[0]?.style === "***" && /^Dotazione .+ \([\d.]+ mo\)\.$/.test(block.runs[0].text.trim()));
    const healing = descriptions.get("pozione di guarigione");
    return [
        ...rows.map((row) => {
            const key = [describedBy[row.name], describedBy[row.group], ...namePrefixes(row.name), row.group].filter((title) => title !== undefined).map(titleKey).find((title) => descriptions.has(title));
            return { ...section("gear", { text: row.name, page: row.page }, descriptions.get(key) ?? [], row.features), name: itemName(row.name), describedBy: key };
        }),
        ...packs.map((block) => {
            const [, name, cost] = /^(.+) \(([\d.]+ mo)\)\.$/.exec(block.runs[0].text.trim());
            const body = [{ ...block, runs: trimmedRuns(block.runs.slice(1)) }];
            return section("gear", { text: name, page: block.page }, body, new Map([[`cost ${coins(cost)}`, 3], ["category equipment pack", 3]]));
        }),
        // Of the gear's Pozione di guarigione, the magic item's page takes its sentence on drinking it, as the English page (magic-items.mjs).
        {
            ...section("joined", { text: "Pozione di guarigione", page: healing[0].page }, [{ ...healing[0], runs: [{ text: /Per bere o somministrare[^.]*\./.exec(plainText(healing[0].runs))[0], style: "" }] }], new Map()),
            joins: "world/items/Potion of Healing.md",
        },
    ];
}

// The background, the feat, the spell lists and the unarmed strike, the paragraph of Combat that tells it: by their place in the Italian SRD.
function otherTopicSections()
{
    const background = blocks.findIndex((block) => block.kind === "heading" && block.text === "Background" && block.page === 65);
    const acolyte = blocks.findIndex((block) => block.kind === "heading" && block.text === "Accolito" && block.page === 66);
    const backgroundEnd = blocks.findIndex((block) => block.kind === "heading" && block.size === 26 && block.page >= 68);
    const feats = blocks.findIndex((block) => block.kind === "heading" && block.text === "Talenti" && block.page === 84);
    const featsEnd = blocks.findIndex((block, index) => index > feats && block.kind === "heading" && block.size === 26);
    const unarmed = blocks.find((block) => block.kind === "paragraph" && block.page === 108 && plainText(block.runs).includes("colpo senz'armi:"));
    const generalPart = blocks.slice(background + 1, acolyte);
    const acolytePart = blocks.slice(acolyte + 1, backgroundEnd);
    return [
        { ...section("topic", blocks[acolyte], [...acolytePart.flatMap(labelHeading), { ...blocks[background], kind: "heading" }, ...generalPart.map(boldHeading)], new Map()), fixed: "world/topics/Acolyte (background).md" },
        { ...section("topic", blocks.find((block, index) => index > feats && block.kind === "heading"), blocks.slice(feats + 1, featsEnd), new Map()), fixed: "world/topics/Grappler.md" },
        { ...section("gear", { text: italianWords["Unarmed Strike"], page: unarmed.page }, [unarmed], new Map()), fixed: "world/items/Unarmed Strike.md" },
        ...spellListSections(),
    ];
}

// The spell lists (pp. 120–128): a class's heading, its levels, a spell a line.
function spellListSections()
{
    const lists = english.filter((page) => page.kind === "spell list");
    const listLines = lines.filter((line) => line.page >= 120 && line.page <= 128);
    return lists.map((page) => {
        const className = italianWords[page.name.replace(/ Spells$/, "")].toLowerCase();
        const title = `Incantesimi da ${className}`;
        const start = listLines.findIndex((line) => lineText(line) === title);

        if (start === -1) {
            throw new Error(`No list "${title}" in pp. 120–128 of the Italian SRD.`);
        }

        const end = listLines.findIndex((line, index) => index > start && /^Incantesimi da /.test(lineText(line)));
        const levels = [];

        for (const line of listLines.slice(start + 1, end === -1 ? undefined : end)) {
            const text = lineText(line);

            if (line.spans.some((span) => span.size >= 11 && span.text.trim() !== "")) {
                levels.push({ title: text.replace(/^(\d)\s+livello$/, "$1° livello"), names: [] });
            } else if (text !== "") {
                levels.at(-1).names.push(text);
            }
        }

        return { ...section("spell list", { text: title, page: listLines[start].page }, [], new Map()), fixed: page.path, levels };
    });
}

/** Each section of a kind on its pages: from a block that starts one, to the next that does, or one that ends it, by default a heading of a section above it. */
function startsOf(pages, starts, ends = (block, start) => block.kind === "heading" && !block.bold && block.size >= 14 && block.size > start.size)
{
    const indexes = [];

    for (const [index, block] of blocks.entries()) {
        if (block.page >= pages.first && block.page <= pages.last && starts(block, blocks[index + 1])) {
            indexes.push(index);
        }
    }

    return indexes.map((index, at) => {
        const limit = indexes[at + 1] ?? blocks.findIndex((block, other) => other > index && block.page > pages.last);
        const end = blocks.findIndex((block, other) => other > index && other < limit && ends(block, blocks[index]));
        return { start: blocks[index], body: blocks.slice(index + 1, end === -1 ? limit : end) };
    });
}

function section(kind, heading, body, features)
{
    return { kind, name: heading.text, page: heading.page, id: `${heading.text} (p. ${heading.page})`, body, features };
}

function isItalicLine(block)
{
    return block?.kind === "paragraph" && block.runs.every((run) => run.style === "*" || run.text.trim() === "");
}

/** A spell's level, school and ritual, from its italic line: "Invocazione di 3° livello", "Trucchetto di Evocazione". */
function levelOf(text)
{
    const match = /^(?:Trucchetto di (\p{L}+)|(\p{L}+) di (\d)° livello)( \(rituale\))?$/u.exec(typos[text.trim()] ?? text.trim());
    return match === null ? undefined : { level: match[3] ?? "0", school: (match[1] ?? match[2]).toLowerCase(), ritual: match[4] !== undefined };
}

function castingTime(text)
{
    const [amount] = text.split(/[ ,]/);
    return `${amount} ${unitOf(text.slice(amount.length))}`;
}

function unitOf(text)
{
    const words = [["azione bonus", "bonus action"], ["azion", "action"], ["reazion", "reaction"], ["round", "round"], ["minut", "minute"], ["or", "hour"], ["giorn", "day"]];
    return words.find(([italian]) => text.trim().toLowerCase().startsWith(italian))?.[1] ?? text.trim().toLowerCase();
}

function spellRange(text)
{
    const lower = text.toLowerCase();
    const words = [["incantatore", "self"], ["contatto", "touch"], ["vista", "sight"], ["illimitat", "unlimited"], ["speciale", "special"]];
    const word = words.find(([italian]) => lower.startsWith(italian));
    return word?.[1] ?? measure(lower);
}

/** A distance in metres, as the Italian SRD writes them: "45 metri", "1,5 km". */
function measure(text)
{
    const match = /^([\d.]+(?:,\d+)?)\s*(metri|metro|m|km|chilometri)\b/.exec(text);
    return match === null ? text : `${Number(match[1].replaceAll(".", "").replace(",", ".")) * (/^k|^c/.test(match[2]) ? 1000 : 1)}`;
}

function components(text)
{
    return [...text.replace(/\(.*$/, "").matchAll(/\b([VSM])\b/g)].map((match) => match[1]).join("");
}

function spellDuration(text)
{
    const lower = text.toLowerCase();
    const concentration = lower.startsWith("concentrazione") ? "concentration " : "";
    const amount = /(\d+)\s+(\p{L}+)/u.exec(lower);

    if (amount !== null) {
        return `${concentration}${amount[1]} ${unitOf(amount[2])}`;
    }

    const words = [["istantane", "instantaneous"], ["speciale", "special"], ["finché non viene dissolto o innescato", "until dispelled or triggered"], ["finché non viene dissolto", "until dispelled"]];
    return `${concentration}${words.find(([italian]) => lower.startsWith(italian))?.[1] ?? lower}`;
}

/**
 * What a text holds that a translation keeps, as weighted features: its dice, its measures in metric (the Italian SRD's 1,5 m for 5 feet, half a kilogram a
 * pound), its other numbers, the spells it names in italics, by their English names, and how many paragraphs, list items and table rows it has.
 */
function textFeatures(text, italics, counts, language)
{
    const features = new Map();

    const add = (key, weight) => {
        let index = 1;

        while (features.has(`${key} #${index}`)) {
            index++;
        }

        features.set(`${key} #${index}`, weight);
    };

    const measures = language === "it" ? italianMeasures : englishMeasures;
    let rest = text.replace(/\b(\d*)d(\d+)\b/g, (_, count, faces) => {
        add(`dice ${count || "1"}d${faces}`, 1);
        return " ";
    });

    for (const [pattern, unit, factor] of measures) {
        rest = rest.replace(pattern, (_, number) => {
            add(`measure ${unit} ${Math.round(parsedNumber(number) * factor * 100) / 100}`, 1);
            return " ";
        });
    }

    for (const match of rest.matchAll(/(?<![\d,.])\+?\d+(?![\d,.])/g)) {
        add(`number ${match[0]}`, 0.5);
    }

    for (const [english, italian] of terms) {
        if (language === "it" ? italian.test(text) : english.test(text)) {
            features.set(`term ${english.source}`, 1);
        }
    }

    for (const spell of new Set(italics)) {
        features.set(`spell ${spell}`, 2);
    }

    for (const [kind, count] of Object.entries(counts)) {
        features.set(`${kind} ${count}`, 1);
    }

    return features;
}

function parsedNumber(text)
{
    return Number(/,\d{3}\b/.test(text) ? text.replaceAll(",", "") : text.replaceAll(".", "").replace(",", "."));
}

/** A term as a pattern of whole words: as it is written when it opens with a capital, else in any case. */
function termPattern(term)
{
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, /^\p{Lu}/u.test(term) ? "u" : "iu");
}

/** The text features of an Italian section's blocks, its italics read as the English names of the spells they name. */
function italianTextFeatures(body, spellNames)
{
    const runs = body.flatMap((block) => (block.kind === "table" ? block.rows.flat().flat() : joinRuns(block.runs ?? [])));
    const text = runs.map((run) => run.text).join(" ");
    const italics = runs.filter((run) => run.style === "*").flatMap((run) => run.text.split(/,|\s+[oe]\s+/)).map((name) => spellNames.get(name.trim().toLowerCase())).filter((name) => name !== undefined);
    const counts = {
        paragraphs: body.filter((block) => block.kind === "paragraph").length,
        captions: body.filter((block) => block.kind === "heading" && block.bold).length,
        items: body.filter((block) => block.kind === "item").length,
        rows: body.filter((block) => block.kind === "table").reduce((sum, table) => sum + table.rows.length, 0),
    };
    return textFeatures(text, italics, counts, "it");
}

/** The text features of an English page's text. */
function englishTextFeatures(body, spellNames)
{
    const lines = body.split("\n");
    const italics = [...body.matchAll(/(?<![*\w])\*([^*]+)\*(?![*\w])/g)].map((match) => match[1].trim().toLowerCase()).filter((name) => spellNames.has(name));
    const counts = {
        paragraphs: lines.filter((line) => line.trim() !== "" && !/^(#|- |\||\d+\. |\*\*[^*]+\*\*$)/.test(line)).length,
        items: lines.filter((line) => line.startsWith("- ")).length,
        rows: lines.filter((line) => line.startsWith("|")).length - 2 * lines.filter((line) => /^\|(-+\|)+$/.test(line)).length,
        // A caption in bold is a heading in the Italian PDF.
        captions: lines.filter((line) => /^\*\*[^*]+\*\*$/.test(line)).length,
    };
    return textFeatures(body.replace(/[*#|]/g, " "), italics, counts, "en");
}

/** A magic item's kind, rarity and attunement, from its italic line: "Anello, raro (richiede sintonia)". */
function itemType(text)
{
    const match = /^(.+?), (.+?)(?: \((richiede sintonia[^)]*)\))?$/.exec(text.trim());

    if (match === null) {
        return undefined;
    }

    const categories = [["oggetto meraviglioso", "wondrous item"], ["anello", "ring"], ["bacchetta", "wand"], ["bastone", "staff"], ["pozione", "potion"], ["verga", "rod"], ["pergamena", "scroll"], ["armatura", "armor"], [
        "arma",
        "weapon",
    ]];
    const rarities = [["non comun", "uncommon"], ["comun", "common"], ["molto rar", "very rare"], ["rar", "rare"], ["leggendari", "legendary"], ["manufatto", "artifact"], ["variabile", "varies"]];
    const category = categories.find(([italian]) => match[1].toLowerCase().startsWith(italian))?.[1];
    // A rarity by its bonus or its kind, as "non comune (+1), raro (+2) o molto raro (+3)", varies.
    const rarity = / o /.test(match[2]) ? "varies" : rarities.find(([italian]) => match[2].toLowerCase().startsWith(italian))?.[1];
    return category === undefined ? undefined : { category, rarity: rarity ?? match[2], attunement: match[3] !== undefined };
}

/** A creature's size, from its italic line: "Aberrazione Grande, legale malvagio". */
function creatureType(text)
{
    const sizes = [["minuscol", "Tiny"], ["piccol", "Small"], ["medi", "Medium"], ["grande", "Large"], ["enorme", "Huge"], ["mastodontic", "Gargantuan"]];
    const words = text.split(",")[0].toLowerCase().split(/[\s(]+/);
    const size = words.map((word) => sizes.find(([italian]) => word.startsWith(italian))?.[1]).find((found) => found !== undefined);
    return size === undefined || !text.includes(",") ? undefined : { size };
}

/** A stat block's Armor Class, hit points, challenge and ability scores. */
function statsOf(body)
{
    const labelled = (label) => {
        const block = body.find((one) => one.kind === "paragraph" && plainText(one.runs).startsWith(label));
        return block === undefined ? "" : plainText(block.runs).slice(label.length).trim();
    };

    const end = body.findIndex((block) => block.kind === "paragraph" && /^(Tiri Salvezza|Abilità|Vulnerabilità|Resistenz|Immunità|Sensi)/.test(plainText(block.runs)));
    const scores = body.slice(0, end).map((block) => (block.kind === "paragraph" ? plainText(block.runs) : "")).join(" ");
    return {
        ac: /^\d+/.exec(labelled("Classe Armatura"))?.[0],
        hp: labelled("Punti Ferita").replace(/\s+/g, ""),
        cr: /^[\d/]+/.exec(labelled("Sfida"))?.[0],
        abilities: [...scores.matchAll(/(\d+) \([+\-–−]\d+\)/g)].map((match) => match[1]),
    };
}

/** The paragraphs under each run-in title of the equipment, up to the next title or heading or table, by the title's key. */
function descriptionsOf(chapter)
{
    const result = new Map();
    let paragraphs;

    for (const block of chapter) {
        const title = block.kind === "paragraph" && block.runs[0]?.style === "***" ? block.runs[0].text.trim().replace(/\.$/, "") : undefined;

        if (title !== undefined) {
            paragraphs = [{ ...block, runs: trimmedRuns(block.runs.slice(1)) }];
            result.set(titleKey(title), paragraphs);
        } else if (block.kind === "paragraph" && paragraphs !== undefined) {
            paragraphs.push(block);
        } else {
            paragraphs = undefined;
        }
    }

    return result;
}

/** The items of a table of the equipment: each row with a cost, its name, the group above it and its fingerprint (cost, weight, damage, Armor Class). */
function tableItems(table, chapter)
{
    const columns = table.header.map((cell) => plainText(cell).toLowerCase());
    const caption = chapter[chapter.indexOf(table) - 1];
    const categories = itemTables[caption?.kind === "heading" ? caption.text : ""];

    if (categories === undefined) {
        return [];
    }

    let group;
    return table.rows.flatMap((row) => {
        const cells = row.map(plainText);

        if (cells.slice(1).every((cell) => cell === "")) {
            group = cells[0];
            return [];
        }

        // The rows of a group are indented, with a space before their name; the first row without it ends the group.
        if (!/^\s/.test(row[0][0]?.text ?? "")) {
            group = undefined;
        }

        const value = (name) => cells[columns.findIndex((column) => column.startsWith(name))] ?? "";
        const cost = coins(value("costo")) ?? value("costo");

        // A row without a price, as Veicoli (terrestri o acquatici), sends to another table; Bardatura costs ×4.
        if (typeof cost === "string" && !cost.startsWith("×")) {
            return [];
        }

        const category = [categories[group] ?? categories[""]].flat();
        const bundle = /\((\d+)\)$/.exec(cells[0])?.[1];
        const features = new Map([...(bundle === undefined ? [] : [[`bundle ${bundle}`, 2]]), [`cost ${cost}`, 3], [`weight ${kilograms(value("peso"))}`, 2], ...category.map((one) => [`category ${one}`, 2])]);
        const damage = /^(\d+d\d+|\d+)/.exec(value("danni"))?.[1];

        if (damage !== undefined) {
            features.set(`damage ${damage}`, 2);
        }

        const armorClass = /^[+]?\d+/.exec(value("classe armatura"))?.[0];

        if (armorClass !== undefined) {
            features.set(`ac ${armorClass}`, 2);
        }

        return [{ name: composedGroups.includes(group) ? `${group} ${cells[0].toLowerCase()}` : cells[0], group, page: table.page, features }];
    });
}

/** A row's name and its shorter beginnings, by words, as its description may be under one: Corda di Canapa (15 metri) is described under Corda. */
function namePrefixes(name)
{
    const words = name.replace(/ \(.*\)$/, "").split(",")[0].split(" ");
    return words.map((_, index) => words.slice(0, words.length - index).join(" "));
}

/**
 * An item's name as the Italian SRD's text writes it, from its table row: without what it measures in parentheses, its kind after the comma joined to it, and
 * in lower case but its first letter, as the tables capitalize their words: "Corda di Canapa (15 metri)" is Corda di canapa, "Abito, Comune" Abito comune.
 */
function itemName(row)
{
    const name = row.replace(/ \([^)]*\)$/, "").replace(/, /g, " ");
    return `${name.charAt(0).toUpperCase()}${name.slice(1).toLowerCase()}`;
}

/** A price in copper pieces: "5 mo" is 500. */
function coins(text)
{
    const match = /^([\d.]+)\s*(mr|ma|me|mo|mp|cp|sp|ep|gp|pp)\b/.exec(text.trim().replace(/,(?=\d{3})/g, "."));
    const values = { mr: 1, cp: 1, ma: 10, sp: 10, me: 50, ep: 50, mo: 100, gp: 100, mp: 1000, pp: 1000 };
    return match === null ? undefined : Number(match[1].replaceAll(".", "")) * values[match[2]];
}

/** A weight in kilograms, as the Italian SRD gives half a kilogram a pound: "1,5 kg", or "3 lb" in English. */
function kilograms(text)
{
    const match = /^(?:(\d+) )?(\d+(?:[,.]\d+)?|\d+\/\d+)\s*(kg|lb)/.exec(text.trim());

    if (match === null) {
        return "none";
    }

    const [numerator, denominator] = match[2].replace(",", ".").split("/").map(Number);
    const value = Number(match[1] ?? 0) + (denominator === undefined ? numerator : numerator / denominator);
    return `${match[3] === "lb" ? value / 2 : value}`;
}

function titleKey(title)
{
    return title.replace(/ \(.*\)$/, "").replaceAll("’", "'").toLowerCase().trim();
}

function trimmedRuns(runs)
{
    const trimmed = runs.map((run) => ({ ...run }));

    if (trimmed.length > 0) {
        trimmed[0].text = trimmed[0].text.trimStart();
    }

    return trimmed;
}

function lineText(line)
{
    return line.spans.map((span) => span.text).join("").replace(/\s+/g, " ").trim();
}

/** The English page's fingerprint, as its Italian section's: the fields of its kind. */
function englishFeatures(page)
{
    const fields = page.fields;

    if (page.kind === "spell") {
        const schools = {
            abjuration: "abiurazione",
            conjuration: "evocazione",
            divination: "divinazione",
            enchantment: "ammaliamento",
            evocation: "invocazione",
            illusion: "illusione",
            necromancy: "necromanzia",
            transmutation: "trasmutazione",
        };
        return new Map([
            [`level ${fields["spell-level"] ?? 0}`, 3],
            [`school ${schools[fields.school]}`, 3],
            ...(fields.ritual === true ? [["ritual", 2]] : []),
            [`time ${englishTime(fields["casting-time"])}`, 2],
            [`range ${englishRange(fields.range)}`, 2],
            [`components ${components(fields.components ?? "")}`, 2],
            [`duration ${englishDuration(fields.duration)}`, 2],
            ...(fields["spell-lists"] ?? []).map((list) => [`list ${list}`, 1]),
        ]);
    }

    if (page.kind === "magic item") {
        const category = /^(armor|weapon)/.exec(fields.category)?.[1] ?? fields.category;
        const rarity = /^(uncommon|common|very rare|rare|legendary|artifact|varies)$/.test(fields.rarity) ? fields.rarity : "varies";
        return new Map([
            [`category ${category}`, 3],
            [`rarity ${rarity}`, 3],
            ...(fields.attunement !== undefined && fields.attunement !== false ? [["attunement", 2]] : []),
        ]);
    }

    if (page.kind === "creature") {
        return new Map([
            [`size ${fields.size}`, 2],
            [`ac ${fields.ac}`, 2],
            [`hp ${String(fields.hp).split("/")[0]}(${String(fields["hp-dice"] ?? "").replace(/\s+/g, "")})`, 3],
            [`cr ${fields.cr}`, 2],
            ...["str", "dex", "con", "int", "wis", "cha"].map((ability, index) => [`ability ${index} ${fields[ability]}`, 1]),
        ]);
    }

    if (page.kind === "gear") {
        const features = new Map([[`cost ${coins(String(fields.cost ?? "")) ?? fields.cost}`, 3], [`weight ${kilograms(String(fields.weight ?? "—"))}`, 2], [`category ${fields.category}`, 2]]);
        const damage = /^(\d+d\d+|\d+)/.exec(String(fields.damage ?? ""))?.[1];

        if (damage !== undefined) {
            features.set(`damage ${damage}`, 2);
        }

        if (fields.bundle !== undefined) {
            features.set(`bundle ${fields.bundle}`, 2);
        }

        if (fields.category === "equipment pack") {
            features.set("category equipment pack", 3);
            features.delete("weight none");
        }

        const armorClass = /^[+]?\d+/.exec(String(fields["armor-class"] ?? ""))?.[0];

        if (armorClass !== undefined) {
            features.set(`ac ${armorClass}`, 2);
        }

        return features;
    }

    return new Map();
}

function englishTime(text = "")
{
    const [amount, ...rest] = text.split(/[ ,]/);
    const unit = rest.join(" ").toLowerCase();
    const units = [["bonus action", "bonus action"], ["action", "action"], ["reaction", "reaction"], ["round", "round"], ["minute", "minute"], ["hour", "hour"], ["day", "day"]];
    return `${amount} ${units.find(([english]) => unit.startsWith(english))?.[1] ?? unit}`;
}

function englishRange(text = "")
{
    const lower = text.toLowerCase();
    const words = ["self", "touch", "sight", "unlimited", "special"];
    const word = words.find((one) => lower.startsWith(one));

    if (word !== undefined) {
        return word;
    }

    const match = /^([\d,]+)\s*(feet|foot|mile|miles)/.exec(lower);
    return match === null ? lower : `${(Number(match[1].replaceAll(",", "")) * (match[2].startsWith("mile") ? 1500 : 0.3)).toFixed(1).replace(/\.0$/, "")}`;
}

function englishDuration(text = "")
{
    const lower = text.toLowerCase();
    const concentration = lower.startsWith("concentration") ? "concentration " : "";
    const amount = /(\d+)\s+(\w+)/.exec(lower);

    if (amount !== null) {
        return `${concentration}${amount[1]} ${["round", "minute", "hour", "day"].find((unit) => amount[2].startsWith(unit)) ?? amount[2]}`;
    }

    return `${concentration}${["instantaneous", "special", "until dispelled or triggered", "until dispelled"].find((word) => lower.startsWith(word)) ?? lower}`;
}

/**
 * Each English page matched to its Italian section: by hand, as the table kept it; by place, as races, classes and lists are found; else by fingerprint,
 * the most alike first, each section to one page. A match is uncertain when another section is almost as alike.
 */
function matched(pages, all, kept)
{
    const result = new Map();
    const taken = new Set();

    for (const page of pages) {
        const hand = kept[page.path];

        if (hand?.by === "hand") {
            const found = hand.none === undefined ? all.find((one) => one.kind === page.kind && one.page === hand.page && (one.name === hand.it || one.id === `${hand.it} (p. ${hand.page})`)) : undefined;

            if (hand.none === undefined && found === undefined) {
                throw new Error(`translations-it.json matches ${page.path} by hand to ${hand.it} on p. ${hand.page}, which is no ${page.kind} of the Italian SRD: fix the entry.`);
            }

            result.set(page.path, { section: found, by: "hand", none: hand.none });
            taken.add(found);
        }
    }

    for (const one of all.filter((candidate) => candidate.fixed !== undefined || candidate.joins !== undefined || candidate.kind === "variant")) {
        if (one.fixed !== undefined && !result.has(one.fixed)) {
            result.set(one.fixed, { section: one, by: "place" });
        }

        taken.add(one);
    }

    const lists = spellListMembers(all);
    const spellNames = new Map(pages.filter((page) => page.kind === "spell").map((page) => [page.name.toLowerCase(), page.name.toLowerCase()]));
    const italianSpells = new Map();

    for (const kind of ["spell", "magic item", "creature", "gear"]) {
        const open = pages.filter((page) => page.kind === kind && !result.has(page.path));
        const candidates = all.filter((one) => one.kind === kind && !taken.has(one));
        const withText = kind !== "creature";
        const english = (page) => (withText ? merged(englishFeatures(page), englishTextFeatures(page.body, spellNames)) : englishFeatures(page));
        const italian = (one) => merged(one.features, withText ? italianTextFeatures(one.body, italianSpells) : new Map(), kind === "spell" ? lists.get(one.name.toLowerCase()) : new Map());
        matchByFingerprint(open, candidates, result, english, italian);

        if (kind === "spell") {
            for (const [path, match] of result) {
                if (match.section?.kind === "spell") {
                    italianSpells.set(match.section.name.toLowerCase(), path.slice("world/topics/".length, -3).toLowerCase());
                }
            }
        }
    }

    return result;
}

/** Each spell's lists, by its Italian name, as the lists of the Italian SRD give them: "list Wizard". */
function spellListMembers(all)
{
    const members = new Map();

    for (const list of all.filter((one) => one.kind === "spell list")) {
        const className = english.find((page) => page.path === list.fixed).name.replace(/ Spells$/, "");

        for (const name of list.levels.flatMap((level) => level.names)) {
            const features = members.get(name.toLowerCase()) ?? new Map();
            features.set(`list ${className}`, 1);
            members.set(name.toLowerCase(), features);
        }
    }

    return members;
}

function merged(...maps)
{
    return new Map(maps.flatMap((map) => [...(map ?? new Map())]));
}

/**
 * Matches the open pages of a kind to its sections, the most alike pair first, each once; a name words/it.yaml gives counts as much as a whole fingerprint.
 * A match is uncertain when it is little alike, or when a page or a section still free is almost as alike to it.
 */
function matchByFingerprint(open, candidates, result, englishOf, italianOf)
{
    const names = new Map(open.map((page) => [page.path, italianWords[page.name]?.toLowerCase()]));
    const italian = new Map(candidates.map((candidate) => [candidate, italianOf(candidate)]));
    const scores = open.map((page) => {
        const features = englishOf(page);
        return candidates.map((candidate) => ({ page, candidate, score: similarity(features, italian.get(candidate)) + (names.get(page.path) === candidate.name.toLowerCase() ? 1 : 0) }));
    });
    const pairs = scores.flat().sort((first, second) => second.score - first.score || ordered(first.page.path, second.page.path) || ordered(first.candidate.id, second.candidate.id));
    const usedPages = new Set();
    const usedCandidates = new Set();

    for (const pair of pairs) {
        if (usedPages.has(pair.page) || usedCandidates.has(pair.candidate)) {
            continue;
        }

        usedPages.add(pair.page);
        usedCandidates.add(pair.candidate);
        const rivals = pairs.filter((other) => other !== pair && ((other.page === pair.page && !usedCandidates.has(other.candidate)) || (other.candidate === pair.candidate && !usedPages.has(other.page))));
        const rival = Math.max(0, ...rivals.map((other) => other.score));
        const uncertain = pair.score < 0.6
            ? `little alike (${pair.score.toFixed(2)})`
            : pair.score - rival < 0.08
            ? `another is almost as alike (${pair.score.toFixed(2)} against ${rival.toFixed(2)})`
            : undefined;
        result.set(pair.page.path, { section: pair.candidate, by: "fingerprint", score: pair.score, ...(uncertain === undefined ? {} : { uncertain }) });
    }
}

/** Two texts in the order of their code units, the same on every machine. */
function ordered(first, second)
{
    return first < second ? -1 : first > second ? 1 : 0;
}

/** How alike two fingerprints are, from 0 to 1: the weight of what they share over the weight of what either has. */
function similarity(first, second)
{
    let shared = 0;
    let all = 0;
    const keys = new Set([...first.keys(), ...second.keys()]);

    for (const key of keys) {
        const weight = Math.max(first.get(key) ?? 0, second.get(key) ?? 0);
        all += weight;

        if (first.has(key) && second.has(key)) {
            shared += weight;
        }
    }

    return all === 0 ? 0 : shared / all;
}

/** Writes translations/it anew: a file for each page and chapter matched; the paths written. */
function writeTranslations(pages, matches)
{
    rmSync(target, { recursive: true, force: true });
    const written = [];

    for (const page of pages) {
        const match = page.kind === "chapter" ? chapterMatch(page) : matches.get(page.path);

        if (match === undefined || match.none !== undefined || match.section === undefined) {
            continue;
        }

        const { name, body: text } = page.kind === "chapter" ? { name: undefined, body: match.body } : pageTranslation(page, match.section);
        const body = corrected(page.path, text);
        const path = join(target, page.path);
        mkdirSync(join(path, ".."), { recursive: true });
        writeFileSync(path, name === undefined ? `${body}\n` : pageText({ name }, body));
        written.push(page.path);
    }

    return written;
}

/** A file's text with the errata of the Italian SRD corrected; an erratum whose wrong text is not there throws, as the PDF or the build changed. */
function corrected(path, text)
{
    let result = text;

    for (const erratum of errata.filter((one) => one.file === path)) {
        if (!result.includes(erratum.wrong)) {
            throw new Error(`The erratum of ${path} finds no "${erratum.wrong}": fix it in the errata of translations.mjs.`);
        }

        result = result.replaceAll(erratum.wrong, erratum.right);
    }

    return result;
}

/** A page's Italian name and text, from its section. */
function pageTranslation(page, section)
{
    if (page.kind === "creature") {
        return { name: section.name, body: creatureText(page, section) };
    }

    if (page.kind === "race") {
        return { name: section.name, body: raceText(page, section) };
    }

    if (page.kind === "spell list") {
        return { name: section.name, body: spellListText(page, section) };
    }

    // Only the text the English page has: an item of a table without one, as a weapon, has none in Italian either.
    if (page.body === "") {
        return { name: section.name, body: "" };
    }

    const joined = sections.filter((one) => one.joins === page.path).flatMap((one) => one.body);
    const extra = Object.entries(ourLines).filter(([line]) => page.body.includes(line)).map(([, line]) => ({ kind: "paragraph", runs: [{ text: line, style: "" }] }));
    return { name: section.name, body: bodyText([...section.body, ...joined, ...extra], page.body) };
}

/** A text's blocks as markdown, with its captions in bold and its headings at the levels of the English text's, in order. */
function bodyText(body, englishBody)
{
    const shaped = quotedStatBlocks(captioned(body));
    leveled(shaped.filter((block) => block.kind === "heading"), headingLevels(englishBody), 3);
    return markdown(shaped);
}

/**
 * A stat block set inside a text, as the giant fly of a figurine, as the English pages write it: a quotation of its name in bold, its lines, its abilities as a
 * table and its Azioni in bold, up to the text again, in Cambria where the stat block is in Calibri.
 */
function quotedStatBlocks(body)
{
    const result = [];
    let quoting = false;
    let abilities;

    for (const [index, block] of body.entries()) {
        const next = body[index + 1];
        const starts = block.kind === "heading" && block.bold && block.size === 12 && isItalicLine(next) && creatureType(plainText(next.runs)) !== undefined;
        quoting = starts || (quoting && (block.font === "Calibri" || (block.kind === "heading" && block.bold && block.size === 11)));

        if (starts) {
            abilities = undefined;
        }

        if (!quoting) {
            result.push(block);
            continue;
        }

        const text = block.kind === "heading" ? block.text : plainText(block.runs ?? []);

        if (block.kind === "paragraph" && /^(FOR|DES|COS|INT|SAG|CAR)( (FOR|DES|COS|INT|SAG|CAR))*$/.test(text)) {
            abilities ??= { kind: "table", quoted: true, header: [], rows: [[]], columns: [] };

            if (abilities.header.length === 0) {
                result.push(abilities);
            }

            for (const ability of text.split(" ")) {
                abilities.header.push([{ text: ability, style: "" }]);
                abilities.columns.push({});
            }
        } else if (abilities !== undefined && abilities.rows[0].length < 6 && block.kind === "paragraph" && /^(\d+ \([+\-–−]\d+\)\s*)+$/.test(text)) {
            abilities.rows[0].push(...[...text.matchAll(/\d+ \([+\-–−]\d+\)/g)].map((match) => [{ text: match[0], style: "" }]));
        } else {
            result.push(block.kind === "heading" ? { kind: "paragraph", quoted: true, runs: [{ text: block.text, style: "**" }] } : { ...block, quoted: true });
        }
    }

    return result;
}

/** A heading in bold just before a table is its caption, a paragraph in bold, as the English pages write it. */
function captioned(body)
{
    return body.map((block, index) => block.kind === "heading" && block.bold && body[index + 1]?.kind === "table" ? { kind: "paragraph", runs: [{ text: block.text, style: "**" }], page: block.page } : { ...block });
}

function headingLevels(text)
{
    return text.split("\n").flatMap((line) => {
        const match = /^(#{1,6}) /.exec(line);
        return match === null ? [] : [match[1].length];
    });
}

/**
 * Gives each heading a level: the English text's, in order, when it has as many; else by the type of the heading, the largest at the first level the
 * English text has.
 */
function leveled(headings, levels, fallback)
{
    if (headings.length === levels.length) {
        headings.forEach((heading, index) => (heading.level = levels[index]));
        return true;
    }

    const sizes = [...new Set(headings.map(headingRank))].sort((first, second) => first - second);
    const top = levels.length === 0 ? fallback : Math.min(...levels);
    headings.forEach((heading) => (heading.level = Math.min(6, top + sizes.indexOf(headingRank(heading)))));
    return false;
}

/** A heading's rank by its type: the larger, the lower. */
function headingRank(heading)
{
    return -(heading.size + (heading.bold ? 0.5 : 0));
}

/** A creature's text: its description, then its traits, actions, reactions and legendary actions, each with a heading of its own, as the English page. */
function creatureText(page, section)
{
    const sfida = section.body.findIndex((block) => block.kind === "paragraph" && plainText(block.runs).startsWith("Sfida"));
    const after = captioned(section.body.slice(sfida + 1));
    const description = after.filter((block) => block.kind === "paragraph" && block.font === "Cambria");
    const parts = [{ title: "Tratti", blocks: [] }];

    for (const block of after.filter((one) => !description.includes(one))) {
        if (block.kind === "heading" && block.bold && block.size === 11) {
            parts.push({ title: block.text, blocks: [] });
        } else {
            parts.at(-1).blocks.push(block);
        }
    }

    const lines = [...description.map(blockText)];

    for (const part of parts.filter((one) => one.blocks.length > 0)) {
        lines.push(`## ${part.title}`);
        // The options of the legendary actions are in bold, the features in bold italics: a breath's kinds, in bold, stay paragraphs of their action.
        lines.push(...featureLines(part.blocks, ["Azioni leggendarie", "Tratti"].includes(part.title) ? ["***", "**"] : ["***"]));
    }

    const variant = sections.find((one) => one.kind === "variant" && one.of === page.name);

    if (variant !== undefined) {
        lines.push(`## ${variant.name}`, markdown(variant.body));
    }

    return lines.join("\n\n").replace(/\n\n(?=- )/g, (match, offset, text) => (text.slice(0, offset).split("\n").at(-1).startsWith("- ") ? "\n" : match));
}

/** Run-in features as headings with their text: "***Anfibio.*** L'aboleth…" becomes ### Anfibio, then its text; a spell list's lines are list items. */
function featureLines(body, styles = ["***"])
{
    const lines = [];
    let open;

    for (const block of body) {
        const runs = joinRuns(block.runs ?? []);
        const first = runs[0];
        // A title in bold italics, with its full stop or without, as Nube fetida (1/giorno); one in bold only with it.
        const runIn = block.kind === "paragraph" && styles.includes(first?.style) && (first.style === "***" || /\.\s*$/.test(first.text)) && runs.length > 1;

        if (runIn) {
            const title = first.text.trim().replace(/\.$/, "").replace(/\s+/g, " ");
            const text = runsText(trimmedRuns(runs.slice(1)));
            open = { heading: `### ${title}`, text: [text] };
            lines.push(open);
        } else if (block.kind === "paragraph" && /^(Trucchetti|A volontà|\d+\/giorno|\d+° livello)/.test(plainText(block.runs))) {
            (open?.text ?? lines).push(`- ${runsText(block.runs)}`);
        } else if (open !== undefined) {
            open.text.push(blockText(block));
        } else {
            lines.push(blockText(block));
        }
    }

    return lines.map((line) => (typeof line === "string" ? line : `${line.heading}\n${joinedText(line.text)}`));
}

/** Paragraphs a blank line apart, list items one after the other. */
function joinedText(texts)
{
    return texts.reduce((all, text, index) => (index === 0 ? text : `${all}${text.startsWith("- ") && texts[index - 1].startsWith("- ") ? "\n" : "\n\n"}${text}`), "");
}

/** A race's text: what it says before its traits, then each trait as a heading, as the English page. */
function raceText(page, section)
{
    const body = captioned(section.body).filter((block) => !(block.kind === "heading" && /^Tratti /.test(block.text)));
    const first = body.findIndex((block) => block.kind === "paragraph" && block.runs[0]?.style === "***");
    const intro = body.slice(0, first);
    const traits = featureLines(body.slice(first)).map((line) => {
        const english = /\(([^)]+)\)$/.exec(page.body.split("\n").find((one) => one.startsWith("### ") && one.includes("(")) ?? "")?.[1];
        return english === page.name && line.startsWith("### Incremento dei punteggi di caratteristica\n") ? line.replace("\n", ` (${section.name})\n`) : line;
    });
    return [...intro.map(blockText), "## Tratti", ...traits].join("\n\n");
}

/** A spell list: its levels, each spell linked to its page by its English name and shown by its Italian one. */
function spellListText(page, section)
{
    const spells = new Map([...matches].filter(([, match]) => match.section?.kind === "spell").map(([path, match]) => [match.section.name.toLowerCase(), path.slice("world/topics/".length, -3)]));
    const parts = [ourLines[page.body.split("\n")[0]] ?? `Gli incantesimi da ${italianWords[page.name.replace(/ Spells$/, "")].toLowerCase()}, per livello.`];

    for (const level of section.levels) {
        parts.push(`## ${level.title}`);
        const names = joinedNames(level.names, spells);
        parts.push(names.map((name) => `- [[${spells.get(name.toLowerCase()) ?? name}|${name}]]`).join("\n"));
    }

    return parts.join("\n\n");
}

/** The names of a list, a line each, but a name the column broke onto two lines. */
function joinedNames(names, spells)
{
    const result = [];

    for (const name of names) {
        const joined = result.length > 0 ? `${result.at(-1)} ${name}` : undefined;

        if (!spells.has(name.toLowerCase()) && joined !== undefined && spells.has(joined.toLowerCase())) {
            result[result.length - 1] = joined;
        } else {
            result.push(name);
        }
    }

    return result;
}

/** A rules chapter's Italian text: its blocks from its first heading to the next chapter's, its headings at the English chapter's levels. */
function chapterMatch(page)
{
    const file = `${page.name}.md`;
    const spec = chapters[file];

    if (spec === undefined) {
        return exceptions[page.path] === undefined ? undefined : { none: exceptions[page.path] };
    }

    const range = (part) => {
        const start = blocks.findIndex((block) => block.kind === "heading" && block.text === part.from[0] && block.page === part.from[1]);
        const end = blocks.findIndex((block, index) => index > start && block.kind === "heading" && block.text === part.to[0] && block.page === part.to[1]);

        if (start === -1 || end === -1) {
            throw new Error(`The chapter ${file} should run from "${part.from[0]}" (p. ${part.from[1]}) to "${part.to[0]}" (p. ${part.to[1]}) in the Italian SRD: fix its place.`);
        }

        return blocks.slice(start, end);
    };

    let body = withOurSections(moved([...range(spec), ...(spec.with ?? []).flatMap(range)], spec.move), ourSections[file] ?? []);

    if (spec.without === "magic items") {
        const inItems = new Set(sections.filter((one) => one.kind === "magic item").flatMap((one) => [...one.header, ...one.body]));
        body = body.filter((block) => !inItems.has(block));
    }

    if (spec.title !== undefined) {
        body = [{ kind: "heading", size: 26, bold: false, text: spec.title, page: body[0].page }, ...body];
    }

    // A heading left without text at the end, as Manufatti once its only artifact is a page.
    while (body.at(-1)?.kind === "heading") {
        body = body.slice(0, -1);
    }

    const shaped = captioned(body);
    const headings = shaped.filter((block) => block.kind === "heading");
    const aligned = leveled(headings, headingLevels(page.body), 1);
    headings[0].level = 1;
    return { section: { name: headings[0].text, page: body[0].page, id: `${headings[0].text} (p. ${body[0].page})` }, by: "place", body: markdown(shaped), aligned, ours: spec.title };
}

/**
 * A chapter's blocks with our sections, each a heading and its list: before the first section of the same type whose title comes after it in alphabetical
 * order, or after the last one, up to the next heading of a larger type.
 */
function withOurSections(body, ours)
{
    let result = body;

    for (const our of ours) {
        const siblings = result.filter((block) => block.kind === "heading" && block.size === 12 && !block.bold);
        const key = (text) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
        const after = siblings.find((block) => key(block.text) > key(our.title));
        const last = result.indexOf(siblings.at(-1));
        const end = result.findIndex((block, index) => index > last && block.kind === "heading" && block.size > 12);
        const at = after === undefined ? (end === -1 ? result.length : end) : result.indexOf(after);
        const blocks = [{ kind: "heading", size: 12, bold: false, text: our.title, page: siblings.at(-1).page }, ...our.items.map((item) => ({ kind: "item", runs: [{ text: item, style: "" }] }))];
        result = [...result.slice(0, at), ...blocks, ...result.slice(at)];
    }

    return result;
}

/** A chapter's blocks with a section moved, from its heading to the next heading, before another heading; as they are without one. */
function moved(body, move)
{
    if (move === undefined) {
        return body;
    }

    const at = (heading) => body.findIndex((block) => block.kind === "heading" && block.text === heading[0] && block.page === heading[1]);
    const start = at(move.from);
    const end = body.findIndex((block, index) => index > start && block.kind === "heading");
    const part = body.slice(start, end);
    const rest = body.filter((block) => !part.includes(block));
    const before = rest.indexOf(body[at(move.before)]);
    return [...rest.slice(0, before), ...part, ...rest.slice(before)];
}

/** The table of matches as translations-it.json keeps it, by English path: the Italian heading and its page, how it was matched, and why it is uncertain. */
function tableOf(matches)
{
    const entries = [...matches].sort(([first], [second]) => ordered(first, second)).map(([path, match]) => [
        path,
        match.none !== undefined
            ? { none: match.none, by: match.by }
            : { it: match.section.name, page: match.section.page, by: match.by, ...(match.uncertain === undefined ? {} : { uncertain: match.uncertain }) },
    ]);
    const chapterEntries = english.filter((page) => page.kind === "chapter").map((page) => {
        const match = chapterMatch(page);
        return [
            page.path,
            match?.none !== undefined
                ? { none: match.none, by: "place" }
                : {
                    it: match.section.name,
                    page: match.section.page,
                    by: "place",
                    ...(match.aligned ? {} : { uncertain: "its headings are not as many as the English chapter's" }),
                    ...(match.ours === undefined ? {} : { title: "ours: the Italian SRD has no title for this chapter" }),
                },
        ];
    });
    const exceptionEntries = Object.entries(exceptions).filter(([path]) => !path.startsWith("rules/")).map(([path, reason]) => [path, { none: reason, by: "hand" }]);
    return Object.fromEntries([...entries, ...chapterEntries, ...exceptionEntries].sort(([first], [second]) => ordered(first, second)));
}

/**
 * What a run wrote, the pages without an Italian text, and what it is not sure of: the matches and chapters translations-it.json marks, and the pages whose
 * English text has no Italian one.
 */
function report(pages, written)
{
    const missing = pages.filter((page) => !written.includes(page.path) && exceptions[page.path] === undefined);
    const table = JSON.parse(readFileSync(tablePath, "utf8"));
    const uncertain = Object.entries(table).filter(([, entry]) => entry.uncertain !== undefined || entry.title !== undefined).map((
        [path, entry],
    ) => [path, { section: { id: `${entry.it} (p. ${entry.page})` }, uncertain: entry.uncertain ?? entry.title }]);
    const empty = written.filter((path) => path.startsWith("world/") && pages.find((page) => page.path === path).body !== "" && /^---\n[\s\S]*?\n---\n?\s*$/.test(readFileSync(join(target, path), "utf8")));
    const folders = ["world/creatures", "world/items", "world/topics", "rules"].map((folder) => `${folder} ${written.filter((path) => path.startsWith(`${folder}/`)).length}`);
    console.log(`${written.length} translations written: ${folders.join(", ")}.`);
    console.log(`${uncertain.length} to check${uncertain.length === 0 ? "." : ":"}`);

    for (const [path, match] of uncertain) {
        console.log(`  ${path} → ${match.section.id}: ${match.uncertain}`);
    }

    if (missing.length > 0) {
        console.log(`${missing.length} pages without an Italian text: ${missing.map((page) => page.path).join(", ")}`);
    }

    if (empty.length > 0) {
        console.log(`${empty.length} pages with an English text but no Italian one: ${empty.join(", ")}`);
    }
}
