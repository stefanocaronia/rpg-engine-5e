// Writes the text of the 5e's pages and rules chapters in a language into translations/<code>, from the official translation of the SRD 5.1 in it (CC BY
// 4.0): node build/translations.mjs <code> <srd51-code.jsonl>, from translation-lines.py; build/languages/<code>.mjs says where the parts of that PDF are and
// the words it writes them with. Each page of world/ gets translations/<code>/world/<folder>/<its file>: its name, the SRD's, and its text, as the English
// page has it; each chapter of rules/ gets translations/<code>/rules/<its file>. A translated SRD sorts its lists by its own names, so a page is matched to
// its section by what it holds (D-542): a spell by its header, a creature by its stat block, an item by its table row or type line; races, classes and
// chapters by their place. translations-<code>.json keeps every match, with those fixed by hand ("by": "hand"), which a run keeps, and those a run is not
// sure of ("uncertain"), which it prints.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { pageText } from "./pages.mjs";
import { blockText, joinRuns, markdown, plainText, readBlocks, readTranslation, runsText } from "./translation-markdown.mjs";

const system = join(import.meta.dirname, "..");
const [code, linesPath] = process.argv.slice(2);

if (code === undefined || linesPath === undefined || !existsSync(join(import.meta.dirname, "languages", `${code}.mjs`))) {
    console.error("Usage: node build/translations.mjs <it|fr|de|es> <srd51-code.jsonl>, from python build/translation-lines.py <SRD_CC_v5.1_CODE.pdf> <srd51-code.jsonl>");
    process.exit(1);
}

const language = (await import(`./languages/${code}.mjs`)).default;
const target = join(system, "translations", code);
const tablePath = join(import.meta.dirname, `translations-${code}.json`);
const localWords = parse(readFileSync(join(system, "words", `${code}.yaml`), "utf8")).words;
// The game's terms in both languages, from words/<code>.yaml and the abilities' names, as a text holds them: Stealth and Furtività, poison and veleno. A
// term in capitals is matched as it is written, as Forza (Strength) apart from forza (force).
const terms = Object.entries({ ...localWords, ...language.abilities })
    .filter(([english, local]) => typeof local === "string" && !/[{}]/.test(english + local) && english.split(" ").length <= 3 && english.length >= 4)
    .map(([english, local]) => [termPattern(english), termPattern(local.split(" (")[0])]);
const { exceptions, ourLines, ourSections, errata, chapters, headingSizes, typos, raceHeadings, variants } = language;
const englishMeasures = [
    [/(\d+(?:,\d{3})*(?:\.\d+)?)(?:\s+|-)(?:miles?)\b/g, "km", 1.5],
    [/(\d+(?:,\d{3})*(?:\.\d+)?)(?:\s+|-)(?:feet|foot|ft\.?)(?=\W|$)/g, "m", 0.3],
    [/(\d+(?:,\d{3})*(?:\.\d+)?)(?:\s+|-)(?:inch|inches)\b/g, "cm", 2.5],
    [/(\d+(?:,\d{3})*(?:\.\d+)?)(?:\s+|-)(?:pounds?|lb\.?)(?=\W|$)/g, "kg", 0.5],
];

const { lines, fills } = readTranslation(linesPath);
const blocks = readBlocks(lines, fills, language);

movedBlocks(language.movedBlocks ?? []);

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

/**
 * Moves the paragraphs a PDF sets away from their section to its end, as the gorgon's breath the French SRD sets after the ghoul: each the paragraph that
 * opens with a text on a page, to the end of the section of a heading on a page.
 */
function movedBlocks(moves)
{
    for (const move of moves) {
        const from = blocks.findIndex((block) => block.kind === "paragraph" && block.page === move.from[1] && plainText(block.runs).startsWith(move.from[0]));
        const heading = blocks.findIndex((block) => block.kind === "heading" && block.text === move.to[0] && block.page === move.to[1]);

        if (from === -1 || heading === -1) {
            throw new Error(`No paragraph "${move.from[0]}" on p. ${move.from[1]}, or no heading "${move.to[0]}" on p. ${move.to[1]}, in the ${language.name} SRD: fix movedBlocks in languages/${code}.mjs.`);
        }

        const [block] = blocks.splice(from, 1);
        const end = blocks.findIndex((one, index) => index > heading && one.kind === "heading" && one.size >= 12);
        blocks.splice(end, 0, block);
    }
}

/** The name of a race, class or subclass as the SRD's headings write it. */
function localName(englishName)
{
    return language.names[englishName] ?? localWords[englishName];
}

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
    const spell = language.spell;
    const durationLine = new RegExp(`^(?:${spell.labels.duration.join("|")})\\s*:`);
    return startsOf(language.pages.spells, (block, next) => block.kind === "heading" && !block.bold && isItalicLine(next) && levelOf(plainText(next.runs)) !== undefined).map(({ start, body }) => {
        const header = levelOf(plainText(body[0].runs));
        // The header ends with its duration; a line of it the PDF does not indent, as the end of a reaction's casting time, is a paragraph of its own.
        const end = body.findIndex((block) => block.kind === "paragraph" && durationLine.test(plainText(block.runs))) + 1;
        const labels = {};
        let last;

        for (const block of body.slice(1, end)) {
            const first = joinRuns(block.runs)[0];
            const label = first?.style === "**" ? first.text.trim() : "";

            if (label === "" && last !== undefined) {
                labels[last] = `${labels[last]} ${plainText(block.runs)}`;
            } else {
                last = label.replace(/\s*:$/, "");
                labels[last] = plainText(block.runs).slice(label.length).trim();
            }
        }

        const labelled = (names) => names.map((name) => labels[name]).find((text) => text !== undefined) ?? "";
        const features = new Map([
            [`level ${header.level}`, 3],
            [`school ${header.school}`, 3],
            ...(header.ritual ? [["ritual", 2]] : []),
            [`time ${castingTime(labelled(spell.labels.time))}`, 2],
            [`range ${spellRange(labelled(spell.labels.range))}`, 2],
            [`components ${components(labelled(spell.labels.components), spell.components)}`, 2],
            [`duration ${spellDuration(labelled(spell.labels.duration))}`, 2],
        ]);
        return section("spell", start, body.slice(end), features);
    });
}

// The magic items (pp. 237–291): a heading, then its kind and rarity in italics.
function magicItemSections()
{
    return startsOf(language.pages.magicItems, (block, next) => block.kind === "heading" && !block.bold && block.size >= 12 && isItalicLine(next) && itemType(plainText(next.runs)) !== undefined)
        .map(({ start, body }) => {
            const type = itemType(plainText(body[0].runs));
            const features = new Map([[`category ${type.category}`, 3], [`rarity ${type.rarity}`, 3], ...(type.attunement ? [["attunement", 2]] : [])]);
            return { ...section("magic item", start, body.slice(1), features), header: [start, body[0]] };
        });
}

// The stat blocks (the bestiary and the appendices MM-A and MM-B): a name in bold, then size, type and alignment in italics, then Armor Class.
function creatureSections()
{
    return language.pages.creatures.flatMap((pages) =>
        // A stat block ends at the next heading but its own actions and reactions, at 11 pt in bold: a family's, as the red dragon, or a variant's sidebar.
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

// The races: a race's heading, then its traits; a subrace's heading, smaller, after them.
function raceSections()
{
    const races = english.filter((page) => page.kind === "race");
    const pages = language.pages.races;
    return races.map((page) => {
        const name = localName(page.name);
        const heading = raceHeadings[page.name] ?? name;
        const start = blocks.findIndex((block) => block.kind === "heading" && block.page >= pages.first && block.page <= pages.last && block.text === heading && block.size >= 12);

        if (start === -1) {
            throw new Error(`No race ${heading} (${page.name}) in pp. ${pages.first}–${pages.last} of the ${language.name} SRD: give its name in the names of languages/${code}.mjs as the SRD writes it, or its heading in raceHeadings.`);
        }

        // A race ends at its subrace, a subrace at the next race; a table's caption in bold, as the draconic ancestry's, is part of it.
        const end = blocks.findIndex((block, index) => index > start && block.kind === "heading" && block.size >= 12 && !block.bold && !language.race.traits.test(block.text));
        return { ...section("race", { ...blocks[start], text: name }, blocks.slice(start + 1, end), new Map()), fixed: page.path };
    });
}

// The classes: a class's chapter, from its title to its subclass's heading, then the subclass to the next chapter.
function classSections()
{
    const pages = language.pages.classes;
    const titles = blocks.flatMap((block, index) => (block.kind === "heading" && block.size === 26 && block.page >= pages.first && block.page <= pages.last ? [index] : []));
    return english.filter((page) => page.kind === "class").flatMap((page) => {
        const start = titles.find((index) => blocks[index].text === localName(page.name));

        if (start === undefined) {
            throw new Error(`No class ${localName(page.name)} (${page.name}) in pp. ${pages.first}–${pages.last} of the ${language.name} SRD: give its name in the names of languages/${code}.mjs.`);
        }

        const end = titles.find((index) => index > start) ?? blocks.findIndex((block) => block.kind === "heading" && block.size === 26 && block.page >= pages.last);
        const subclassPage = english.find((other) => other.kind === "subclass" && blocks.slice(start, end).some((block) => block.kind === "heading" && block.text === localName(other.name)));

        if (subclassPage === undefined) {
            throw new Error(`No subclass of ${page.name} in the ${language.name} SRD's chapter ${localName(page.name)}: give its name in the names of languages/${code}.mjs.`);
        }

        const middle = blocks.findIndex((block, index) => index > start && index < end && block.kind === "heading" && block.text === localName(subclassPage.name));
        const sidebars = sidebarsOf(blocks.slice(middle + 1, end));
        // The SRD sets a class's sidebars after its subclass; the English pages keep in the subclass only those it has, as its last sections.
        const kept = sidebars.slice(sidebars.length - headingLevels(subclassPage.body).filter((level) => level === 2).length);
        const moved = sidebars.filter((sidebar) => !kept.includes(sidebar)).flat();
        return [
            { ...section("class", blocks[start], movedSection([...blocks.slice(start + 1, middle), ...moved]), new Map()), fixed: page.path },
            { ...section("subclass", blocks[middle], blocks.slice(middle + 1, end).filter((block) => !moved.includes(block)), new Map()), fixed: subclassPage.path },
        ];
    });
}

/**
 * A class's blocks with the list of a feature under the feature, as the English page has it: the warlock's Eldritch Invocations, a section of its own after
 * the features in the SRD, goes on under the feature that names it.
 */
function movedSection(body)
{
    const start = body.findIndex((block) => block.kind === "heading" && block.size === 18 && block.text === language.invocations);

    if (start === -1) {
        return body;
    }

    const end = body.findIndex((block, index) => index > start && block.kind === "heading" && block.size >= 18);
    const list = body.slice(start + 1, end === -1 ? undefined : end);
    const rest = body.filter((block, index) => index < start || (end !== -1 && index >= end));
    const feature = rest.findIndex((block) => block.kind === "heading" && block.text === language.invocations);
    const next = rest.findIndex((block, index) => index > feature && block.kind === "heading" && block.size >= rest[feature].size);
    return [...rest.slice(0, next), ...list, ...rest.slice(next)];
}

/** A background's label, as "**Linguaggi:** due a scelta", as the English page's heading with its text: ### Linguaggi, then "due a scelta". */
function labelHeading(block)
{
    const label = block.kind === "paragraph" && block.runs[0]?.style === "**" && /:\s*$/.test(block.runs[0].text) ? block.runs[0].text.trim().replace(/\s*:$/, "") : undefined;
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

// The equipment: every row of its tables, with its description, the run-in title of its name, of the first part of its name or of its group.
function gearSections()
{
    const { pages, gear } = language;
    const chapter = blocks.filter((block) => block.page >= pages.equipment.first && block.page <= pages.equipment.last);
    const descriptions = descriptionsOf(chapter);
    const rows = chapter.filter((block) => block.kind === "table" && block.header !== undefined).flatMap((table) => tableItems(table, chapter));
    const packs = chapter.filter((block) => block.kind === "paragraph" && block.runs[0]?.style === "***" && gear.pack.test(block.runs[0].text.trim()));
    const healing = descriptions.get(titleKey(gear.healing.title));

    if (healing === undefined) {
        throw new Error(`No description "${gear.healing.title}" in the ${language.name} SRD's equipment: fix gear.healing in languages/${code}.mjs.`);
    }

    return [
        ...rows.map((row) => {
            const key = [gear.describedBy[row.name], gear.describedBy[row.group], ...namePrefixes(row.name), row.group].filter((title) => title !== undefined).map(titleKey).find((title) => descriptions.has(title));
            return { ...section("gear", { text: row.name, page: row.page }, descriptions.get(key) ?? [], row.features), name: language.gear.name?.(row.name) ?? itemName(row.name), describedBy: key };
        }),
        ...packs.map((block) => {
            const [, name, cost] = gear.pack.exec(block.runs[0].text.trim());
            const body = [{ ...block, runs: trimmedRuns(block.runs.slice(1)) }];
            return section("gear", { text: name, page: block.page }, body, new Map([[`cost ${coins(cost)}`, 3], ["category equipment pack", 3]]));
        }),
        // Of the gear's potion of healing, the magic item's page takes its sentence on drinking it, as the English page (magic-items.mjs).
        {
            ...section("joined", { text: gear.healing.title, page: healing[0].page }, [{ ...healing[0], runs: [{ text: gear.healing.sentence.exec(plainText(healing[0].runs))[0], style: "" }] }], new Map()),
            joins: "world/items/Potion of Healing.md",
        },
    ];
}

// The background, the feat, the spell lists and the unarmed strike, the paragraph of Combat that tells it: by their place in the SRD.
function otherTopicSections()
{
    const at = ([text, page]) => {
        const index = blocks.findIndex((block) => block.kind === "heading" && block.text === text && block.page === page);

        if (index === -1) {
            throw new Error(`No heading "${text}" on p. ${page} of the ${language.name} SRD: fix its place in languages/${code}.mjs.`);
        }

        return index;
    };

    const background = at(language.background.heading);
    const acolyte = at(language.background.acolyte);
    const backgroundEnd = blocks.findIndex((block) => block.kind === "heading" && block.size === 26 && block.page >= language.background.end);
    const feats = at(language.feats);
    const featsEnd = blocks.findIndex((block, index) => index > feats && block.kind === "heading" && block.size === 26);
    const unarmed = blocks.find((block) => block.kind === "paragraph" && block.page === language.unarmedStrike.page && plainText(block.runs).includes(language.unarmedStrike.text));

    if (unarmed === undefined) {
        throw new Error(`No paragraph with "${language.unarmedStrike.text}" on p. ${language.unarmedStrike.page} of the ${language.name} SRD: fix unarmedStrike in languages/${code}.mjs.`);
    }

    const generalPart = blocks.slice(background + 1, acolyte);
    const acolytePart = blocks.slice(acolyte + 1, backgroundEnd);
    return [
        { ...section("topic", blocks[acolyte], [...acolytePart.flatMap(labelHeading), { ...blocks[background], kind: "heading" }, ...generalPart.map(boldHeading)], new Map()), fixed: "world/topics/Acolyte (background).md" },
        { ...section("topic", blocks.find((block, index) => index > feats && block.kind === "heading"), blocks.slice(feats + 1, featsEnd), new Map()), fixed: "world/topics/Grappler.md" },
        { ...section("gear", { text: language.names["Unarmed Strike"] ?? localWords["Unarmed Strike"], page: unarmed.page }, [unarmed], new Map()), fixed: "world/items/Unarmed Strike.md" },
        ...spellListSections(),
    ];
}

// The spell lists: a class's heading, its levels, a spell a line.
function spellListSections()
{
    const lists = english.filter((page) => page.kind === "spell list");
    const pages = language.pages.spellLists;
    const listLines = lines.filter((line) => line.page >= pages.first && line.page <= pages.last);
    return lists.map((page) => {
        const title = language.spellLists.title(localName(page.name.replace(/ Spells$/, "")));
        const start = listLines.findIndex((line) => lineText(line) === title);

        if (start === -1) {
            throw new Error(`No list "${title}" in pp. ${pages.first}–${pages.last} of the ${language.name} SRD.`);
        }

        const end = listLines.findIndex((line, index) => index > start && language.spellLists.start.test(lineText(line)));
        const levels = [];

        for (const line of listLines.slice(start + 1, end === -1 ? undefined : end)) {
            const text = lineText(line);

            if (line.spans.some((span) => span.size >= 11 && span.text.trim() !== "")) {
                levels.push({ title: language.spellLists.level(text), names: [] });
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
    // A comma in bold italics between italic words, as the German SRD sets some, is italic too.
    return block?.kind === "paragraph" && block.runs.every((run) => run.style === "*" || /^[\s,]*$/.test(run.text));
}

/** A spell's level, school and ritual, from its italic line: "Invocazione di 3° livello", "Trucchetto di Evocazione". */
function levelOf(text)
{
    return language.spell.header(typos[text.trim()] ?? text.trim());
}

function castingTime(text)
{
    const [amount] = text.split(/[ ,]/);
    return `${amount} ${unitOf(text.slice(amount.length))}`;
}

function unitOf(text)
{
    return language.spell.units.find(([local]) => text.trim().toLowerCase().startsWith(local))?.[1] ?? text.trim().toLowerCase();
}

function spellRange(text)
{
    const lower = text.toLowerCase();
    const word = language.spell.ranges.find(([local]) => lower.startsWith(local));
    return word?.[1] ?? measure(lower);
}

/** A distance in metres, as the translated SRDs write them: "45 metri", "1,5 km". */
function measure(text)
{
    const match = language.spell.distance.exec(text);
    return match === null ? text : `${Number(match[1].replaceAll(".", "").replace(",", ".")) * (/^k|^c/.test(match[2]) ? 1000 : 1)}`;
}

/** A spell's components in English letters, from the local ones: V, S, M, as the German V, G, M. */
function components(text, letters = { V: "V", S: "S", M: "M" })
{
    const pattern = new RegExp(`\\b([${Object.keys(letters).join("")}])\\b`, "g");
    return [...text.replace(/\(.*$/, "").matchAll(pattern)].map((match) => letters[match[1]]).join("");
}

function spellDuration(text)
{
    const lower = text.toLowerCase();
    const concentration = lower.startsWith(language.spell.concentration) ? "concentration " : "";
    const amount = /(\d+)\s+(\p{L}+)/u.exec(lower);

    if (amount !== null) {
        return `${concentration}${amount[1]} ${unitOf(amount[2])}`;
    }

    return `${concentration}${language.spell.durations.find(([local]) => lower.startsWith(local))?.[1] ?? lower}`;
}

/**
 * What a text holds that a translation keeps, as weighted features: its dice, its measures in metric (the translations' 1,5 m for 5 feet, half a kilogram a
 * pound), its other numbers, the spells it names in italics, by their English names, and how many paragraphs, list items and table rows it has.
 */
function textFeatures(text, italics, counts, local)
{
    const features = new Map();

    const add = (key, weight) => {
        let index = 1;

        while (features.has(`${key} #${index}`)) {
            index++;
        }

        features.set(`${key} #${index}`, weight);
    };

    const measures = local ? language.measures : englishMeasures;
    let rest = text.replace(local ? language.dice : /\b(\d*)d(\d+)\b/g, (_, count, faces) => {
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

    for (const [english, translated] of terms) {
        if (local ? translated.test(text) : english.test(text)) {
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

/** The text features of a translated section's blocks, its italics read as the English names of the spells they name. */
function localTextFeatures(body, spellNames)
{
    const runs = body.flatMap((block) => (block.kind === "table" ? block.rows.flat().flat() : joinRuns(block.runs ?? [])));
    const text = runs.map((run) => run.text).join(" ");
    const italics = runs.filter((run) => run.style === "*").flatMap((run) => run.text.split(language.conjunctions)).map((name) => spellNames.get(name.trim().toLowerCase())).filter((name) => name !== undefined);
    const counts = {
        paragraphs: body.filter((block) => block.kind === "paragraph").length,
        captions: body.filter((block) => block.kind === "heading" && block.bold).length,
        items: body.filter((block) => block.kind === "item").length,
        rows: body.filter((block) => block.kind === "table").reduce((sum, table) => sum + table.rows.length, 0),
    };
    return textFeatures(text, italics, counts, true);
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
        // A caption in bold is a heading in the translated PDF.
        captions: lines.filter((line) => /^\*\*[^*]+\*\*$/.test(line)).length,
    };
    return textFeatures(body.replace(/[*#|]/g, " "), italics, counts, false);
}

/** A magic item's kind, rarity and attunement, from its italic line: "Anello, raro (richiede sintonia)". */
function itemType(text)
{
    const { type, categories, rarities, varies } = language.magicItem;
    const match = type.exec(text.trim());

    if (match === null) {
        return undefined;
    }

    const category = categories.find(([local]) => match[1].toLowerCase().startsWith(local))?.[1];
    // A rarity by its bonus or its kind, as "non comune (+1), raro (+2) o molto raro (+3)", varies.
    const rarity = varies.test(match[2]) ? "varies" : rarities.find(([local]) => match[2].toLowerCase().startsWith(local))?.[1];
    return category === undefined ? undefined : { category, rarity: rarity ?? match[2], attunement: match[3] !== undefined };
}

/** A creature's size, from its italic line: "Aberrazione Grande, legale malvagio". */
function creatureType(text)
{
    const words = text.split(",")[0].toLowerCase().split(/[\s(]+/);
    const size = language.creature.size?.(text) ?? words.map((word) => language.creature.sizes.find(([local]) => word.startsWith(local))?.[1]).find((found) => found !== undefined);
    return size === undefined || !text.includes(",") ? undefined : { size };
}

/** A stat block's Armor Class, hit points, challenge and ability scores. */
function statsOf(body)
{
    const labelled = (label) => {
        const block = body.find((one) => one.kind === "paragraph" && plainText(one.runs).startsWith(label));
        return block === undefined ? "" : plainText(block.runs).slice(label.length).replace(/^\s*:/, "").trim();
    };

    const { creature } = language;
    const end = body.findIndex((block) => block.kind === "paragraph" && creature.afterAbilities.test(plainText(block.runs)));
    const scores = body.slice(0, end).map((block) => (block.kind === "paragraph" ? plainText(block.runs) : "")).join(" ");
    return {
        ac: /^\d+/.exec(labelled(creature.armorClass))?.[0],
        hp: labelled(creature.hitPoints).replace(/\s+/g, "").replace(language.dice, (_, count, faces) => `${count}d${faces}`),
        cr: /^[\d/]+/.exec(labelled(creature.challenge))?.[0],
        abilities: [...scores.matchAll(/(\d+) \([+\-–−]\d+\)/g)].map((match) => match[1]),
    };
}

/** The paragraphs under each run-in title of the equipment, up to the next title or heading or table, by the title's key. */
function descriptionsOf(chapter)
{
    const result = new Map();
    let paragraphs;

    for (const block of chapter) {
        const title = block.kind === "paragraph" && block.runs[0]?.style === "***" ? block.runs[0].text.trim().replace(language.runInEnd, "") : undefined;

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
    const categories = language.gear.tables[caption?.kind === "heading" ? caption.text : ""];

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

        const names = language.gear.columns;
        const value = (name) => cells[columns.findIndex((column) => column.startsWith(name))] ?? "";
        // A price without coins, as the French Barde's 4, is a multiple of another's: ×4.
        const cost = coins(value(names.cost)) ?? value(names.cost).replace(/^[x×]?\s*(\d+)$/, "×$1");

        // A row without a price, as Veicoli (terrestri o acquatici), sends to another table; Bardatura costs ×4.
        if (typeof cost === "string" && !cost.startsWith("×")) {
            return [];
        }

        const category = [categories[group] ?? categories[""]].flat();
        const bundle = /\((\d+)\)$/.exec(cells[0])?.[1];
        const features = new Map([...(bundle === undefined ? [] : [[`bundle ${bundle}`, 2]]), [`cost ${cost}`, 3], [`weight ${kilograms(value(names.weight))}`, 2], ...category.map((one) => [`category ${one}`, 2])]);
        const damage = /^(\d+d\d+|\d+)/.exec(value(names.damage).replace(language.dice, (_, count, faces) => `${count}d${faces}`))?.[1];

        if (damage !== undefined) {
            features.set(`damage ${damage}`, 2);
        }

        const armorClass = /^[+]?\d+/.exec(value(names.armorClass))?.[0];

        if (armorClass !== undefined) {
            features.set(`ac ${armorClass}`, 2);
        }

        return [{ name: language.gear.composedGroups.includes(group) ? `${group} ${cells[0].toLowerCase()}` : cells[0], group, page: table.page, features }];
    });
}

/** A row's name and its shorter beginnings, by words, as its description may be under one: Corda di Canapa (15 metri) is described under Corda. */
function namePrefixes(name)
{
    const words = name.replace(/ \(.*\)$/, "").split(",")[0].split(" ");
    const prefixes = words.map((_, index) => words.slice(0, words.length - index).join(" "));
    // Where the parentheses name a kind, as the German Laterne (abdeckbar), the whole name first.
    return language.gear.kindsInParentheses ? [name, ...prefixes] : prefixes;
}

/**
 * An item's name as the SRD's text writes it, from its table row: without what it measures in parentheses, its kind after the comma joined to it, and
 * in lower case but its first letter, as the tables capitalize their words: "Corda di Canapa (15 metri)" is Corda di canapa, "Abito, Comune" Abito comune.
 */
function itemName(row)
{
    const name = row.replace(/ \([^)]*\)$/, "").replace(/, /g, " ");
    return `${name.charAt(0).toUpperCase()}${name.slice(1).toLowerCase()}`;
}

/** A price in copper pieces, in the SRD's coins or in English ones: "5 mo" is 500, as "5 gp". */
function coins(text, local = true)
{
    const values = local ? language.gear.coins : { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };
    // A thousand as 1,000, 1.000 or 1 000.
    const match = new RegExp(`^([\\d.]+)\\s*(${Object.keys(values).join("|")})(?!\\p{L})`, "u").exec(text.trim().replace(/,(?=\d{3})/g, ".").replace(/(\d)[\s  ](?=\d{3}(?!\d))/gu, "$1."));
    return match === null ? undefined : Number(match[1].replaceAll(".", "")) * values[match[2]];
}

/** A weight in kilograms, as the translated SRDs give half a kilogram a pound: "1,5 kg", or "3 lb" in English. */
function kilograms(text)
{
    const match = /^(?:(\d+) )?(\d+(?:[,.]\d+)?|\d+\/\d+)\s*(kg|lb|g)\b/.exec(text.trim());

    if (match === null) {
        return "none";
    }

    const [numerator, denominator] = match[2].replace(",", ".").split("/").map(Number);
    const value = Number(match[1] ?? 0) + (denominator === undefined ? numerator : numerator / denominator);
    return `${match[3] === "lb" ? value / 2 : match[3] === "g" ? value / 1000 : value}`;
}

function titleKey(title)
{
    return (language.gear.kindsInParentheses ? title : title.replace(/ \(.*\)$/, "")).replaceAll("’", "'").toLowerCase().trim();
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

/** The English page's fingerprint, as its translated section's: the fields of its kind. */
function englishFeatures(page)
{
    const fields = page.fields;

    if (page.kind === "spell") {
        return new Map([
            [`level ${fields["spell-level"] ?? 0}`, 3],
            [`school ${language.spell.schools[fields.school]}`, 3],
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
        const features = new Map([[`cost ${coins(String(fields.cost ?? ""), false) ?? fields.cost}`, 3], [`weight ${kilograms(String(fields.weight ?? "—"))}`, 2], [`category ${fields.category}`, 2]]);
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
 * Each English page matched to its translated section: by hand, as the table kept it; by place, as races, classes and lists are found; else by fingerprint,
 * the most alike first, each section to one page. A match is uncertain when another section is almost as alike.
 */
function matched(pages, all, kept)
{
    const result = new Map();
    const taken = new Set();

    for (const page of pages) {
        const hand = kept[page.path];

        if (hand?.by === "hand") {
            const found = hand.none === undefined ? all.find((one) => one.kind === page.kind && one.page === hand.page && (one.name === hand[code] || one.id === `${hand[code]} (p. ${hand.page})`)) : undefined;

            if (hand.none === undefined && found === undefined) {
                throw new Error(`translations-${code}.json matches ${page.path} by hand to ${hand[code]} on p. ${hand.page}, which is no ${page.kind} of the ${language.name} SRD: fix the entry.`);
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
    const localSpells = new Map();

    for (const kind of ["spell", "magic item", "creature", "gear"]) {
        const open = pages.filter((page) => page.kind === kind && !result.has(page.path));
        const candidates = all.filter((one) => one.kind === kind && !taken.has(one));
        const withText = kind !== "creature";
        const english = (page) => (withText ? merged(englishFeatures(page), englishTextFeatures(page.body, spellNames)) : englishFeatures(page));
        const local = (one) => merged(one.features, withText ? localTextFeatures(one.body, localSpells) : new Map(), kind === "spell" ? lists.get(one.name.toLowerCase()) : new Map());
        matchByFingerprint(open, candidates, result, english, local);

        if (kind === "spell") {
            for (const [path, match] of result) {
                if (match.section?.kind === "spell") {
                    localSpells.set(match.section.name.toLowerCase(), path.slice("world/topics/".length, -3).toLowerCase());
                }
            }
        }
    }

    return result;
}

/** Each spell's lists, by its translated name, as the lists of the SRD give them: "list Wizard". */
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
function matchByFingerprint(open, candidates, result, englishOf, localOf)
{
    const names = new Map(open.map((page) => [page.path, (language.names[page.name] ?? localWords[page.name])?.toLowerCase()]));
    const local = new Map(candidates.map((candidate) => [candidate, localOf(candidate)]));
    const scores = open.map((page) => {
        const features = englishOf(page);
        return candidates.map((candidate) => ({ page, candidate, score: similarity(features, local.get(candidate)) + (names.get(page.path) === candidate.name.toLowerCase() ? 1 : 0) }));
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
        // A name the SRD gives two pages, as the German Anhänger der Gesundheit, is ours for one of them, as its text names it.
        const renamed = language.renames?.[page.path]?.name ?? name;
        writeFileSync(path, name === undefined ? `${body}\n` : pageText({ name: renamed }, body));
        written.push(page.path);
    }

    return written;
}

/** A file's text with the errata of the SRD corrected; an erratum whose wrong text is not there throws, as the PDF or the build changed. */
function corrected(path, text)
{
    let result = text;

    for (const erratum of errata.filter((one) => one.file === path)) {
        if (!result.includes(erratum.wrong)) {
            throw new Error(`The erratum of ${path} finds no "${erratum.wrong}": fix it in the errata of languages/${code}.mjs.`);
        }

        result = result.replaceAll(erratum.wrong, erratum.right);
    }

    // A part of a page the SRD lacks, in our words, after the part it follows in English: the German erinyes' longbow.
    for (const feature of (language.ourFeatures ?? []).filter((one) => one.file === path)) {
        const at = result.indexOf(`${feature.after}\n`);

        if (at === -1) {
            throw new Error(`The page ${path} has no "${feature.after}" for our part to follow: fix ourFeatures in languages/${code}.mjs.`);
        }

        const end = result.indexOf("\n\n#", at);
        result = end === -1 ? `${result}\n\n${feature.text}` : `${result.slice(0, end)}\n\n${feature.text}${result.slice(end)}`;
    }

    return result;
}

/** A page's translated name and text, from its section. */
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

    // Only the text the English page has: an item of a table without one, as a weapon, has none in translation either.
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
    const names = language.creature.abilities.join("|");
    const abilityLine = new RegExp(`^(${names})( (${names}))*$`);
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

        if (block.kind === "paragraph" && abilityLine.test(text)) {
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
    const { creature } = language;
    const challenge = section.body.findIndex((block) => block.kind === "paragraph" && plainText(block.runs).startsWith(creature.challenge));
    const after = captioned(section.body.slice(challenge + 1));
    const description = after.filter((block) => block.kind === "paragraph" && block.font === "Cambria");
    const parts = [{ title: creature.traits, blocks: [] }];

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
        lines.push(...featureLines(part.blocks, [creature.legendaryActions, creature.traits].includes(part.title) ? ["***", "**"] : ["***"]));
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
        const runIn = block.kind === "paragraph" && styles.includes(first?.style) && (first.style === "***" || language.runInEnd.test(first.text.trim())) && runs.length > 1;

        if (runIn) {
            const title = first.text.trim().replace(language.runInEnd, "").replace(/\s+/g, " ");
            const text = runsText(trimmedRuns(runs.slice(1)));
            open = { heading: `### ${title}`, text: [text] };
            lines.push(open);
        } else if (block.kind === "paragraph" && language.creature.spellItems.test(plainText(block.runs))) {
            (open?.text ?? lines).push(`- ${spellItem(runsText(block.runs))}`);
        } else if (open !== undefined) {
            open.text.push(blockText(block));
        } else {
            lines.push(blockText(block));
        }
    }

    return lines.map((line) => (typeof line === "string" ? line : `${line.heading}\n${joinedText(line.text)}`));
}

/** A stat block's line of spells, each spell in italics of its own where the SRD sets two in one, as the German *Einflüsterung, Nebelschritt*. */
function spellItem(text)
{
    const split = (match, inner) => inner.split(/,\s*/).filter((name) => name.trim() !== "").map((name) => `*${name.trim()}*`).join(", ");
    return language.creature.splitItalics ? text.replace(/(?<!\\)\*([^*]+?)(?<!\\)\*/g, split) : text;
}

/** Paragraphs a blank line apart, list items one after the other. */
function joinedText(texts)
{
    return texts.reduce((all, text, index) => (index === 0 ? text : `${all}${text.startsWith("- ") && texts[index - 1].startsWith("- ") ? "\n" : "\n\n"}${text}`), "");
}

/** A race's text: what it says before its traits, then each trait as a heading, as the English page. */
function raceText(page, section)
{
    const body = captioned(section.body).filter((block) => !(block.kind === "heading" && language.race.traits.test(block.text)));
    const first = body.findIndex((block) => block.kind === "paragraph" && block.runs[0]?.style === "***");
    const intro = body.slice(0, first);
    const traits = featureLines(body.slice(first)).map((line) => {
        const english = /\(([^)]+)\)$/.exec(page.body.split("\n").find((one) => one.startsWith("### ") && one.includes("(")) ?? "")?.[1];
        return english === page.name && line.startsWith(`### ${language.race.abilityScoreIncrease}\n`) ? line.replace("\n", ` (${section.name})\n`) : line;
    });
    return [...intro.map(blockText), `## ${language.race.traitsHeading}`, ...traits].join("\n\n");
}

/** A spell list: its levels, each spell linked to its page by its English name and shown by its translated one. */
function spellListText(page, section)
{
    const spells = new Map([...matches].filter(([, match]) => match.section?.kind === "spell").map(([path, match]) => [match.section.name.toLowerCase(), path.slice("world/topics/".length, -3)]));
    const parts = [ourLines[page.body.split("\n")[0]] ?? language.spellListLine(localName(page.name.replace(/ Spells$/, "")))];

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

/** A rules chapter's translated text: its blocks from its first heading to the next chapter's, its headings at the English chapter's levels. */
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
            throw new Error(`The chapter ${file} should run from "${part.from[0]}" (p. ${part.from[1]}) to "${part.to[0]}" (p. ${part.to[1]}) in the ${language.name} SRD: fix its place in languages/${code}.mjs.`);
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

/** The table of matches as translations-<code>.json keeps it, by English path: the translated heading and its page, how it was matched, and why it is uncertain. */
function tableOf(matches)
{
    const entries = [...matches].sort(([first], [second]) => ordered(first, second)).map(([path, match]) => [
        path,
        match.none !== undefined
            ? { none: match.none, by: match.by }
            : { [code]: match.section.name, page: match.section.page, by: match.by, ...(match.uncertain === undefined ? {} : { uncertain: match.uncertain }) },
    ]);
    const chapterEntries = english.filter((page) => page.kind === "chapter").map((page) => {
        const match = chapterMatch(page);
        return [
            page.path,
            match?.none !== undefined
                ? { none: match.none, by: "place" }
                : {
                    [code]: match.section.name,
                    page: match.section.page,
                    by: "place",
                    ...(match.aligned ? {} : { uncertain: "its headings are not as many as the English chapter's" }),
                    ...(match.ours === undefined ? {} : { title: `ours: the ${language.name} SRD has no title for this chapter` }),
                },
        ];
    });
    const exceptionEntries = Object.entries(exceptions).filter(([path]) => !path.startsWith("rules/")).map(([path, reason]) => [path, { none: reason, by: "hand" }]);
    return Object.fromEntries([...entries, ...chapterEntries, ...exceptionEntries].sort(([first], [second]) => ordered(first, second)));
}

/**
 * What a run wrote, the pages without a translated text, and what it is not sure of: the matches and chapters translations-<code>.json marks, and the pages
 * whose English text has no translated one.
 */
function report(pages, written)
{
    const missing = pages.filter((page) => !written.includes(page.path) && exceptions[page.path] === undefined);
    const table = JSON.parse(readFileSync(tablePath, "utf8"));
    const uncertain = Object.entries(table).filter(([, entry]) => entry.uncertain !== undefined || entry.title !== undefined).map((
        [path, entry],
    ) => [path, { section: { id: `${entry[code]} (p. ${entry.page})` }, uncertain: entry.uncertain ?? entry.title }]);
    const empty = written.filter((path) => path.startsWith("world/") && pages.find((page) => page.path === path).body !== "" && /^---\n[\s\S]*?\n---\n?\s*$/.test(readFileSync(join(target, path), "utf8")));
    const folders = ["world/creatures", "world/items", "world/topics", "rules"].map((folder) => `${folder} ${written.filter((path) => path.startsWith(`${folder}/`)).length}`);
    console.log(`${written.length} translations written: ${folders.join(", ")}.`);
    console.log(`${uncertain.length} to check${uncertain.length === 0 ? "." : ":"}`);

    for (const [path, match] of uncertain) {
        console.log(`  ${path} → ${match.section.id}: ${match.uncertain}`);
    }

    if (missing.length > 0) {
        console.log(`${missing.length} pages without a ${language.name} text: ${missing.map((page) => page.path).join(", ")}`);
    }

    if (empty.length > 0) {
        console.log(`${empty.length} pages with an English text but no ${language.name} one: ${empty.join(", ")}`);
    }
}
