// Writes the rest of the SRD 5.1's Equipment chapter, after the weapons (pp. 66–74), from the lines of its PDF: its text into rules/Equipment.md, and its
// gear, equipment packs, tools, tack and vehicles as pages in world/items. node systems/5e/build/gear.mjs <srd51-lines.jsonl>, from lines.py.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pageName, writePages } from "./pages.mjs";
import { markdown, plainText, readBlocks, readLines, runsText } from "./srd-markdown.mjs";

// The tables of items, by caption: the category of their rows, unless a group gives its own (Arcane focus), and the field of each column after the name.
// The Mounts and Other Animals table stays in the rules alone: at the table a mount is a creature, whose stat block the monsters bring.
const tables = {
    "Adventuring Gear": { category: "adventuring gear", fields: ["cost", "weight"] },
    Tools: { category: "tool", fields: ["cost", "weight"] },
    "Tack, Harness, and Drawn Vehicles": { category: "tack and harness", fields: ["cost", "weight"] },
    "Waterborne Vehicles": { category: "waterborne vehicle", fields: ["cost", "speed"] },
};
// The rows that are no item: Potion of Healing, whose page joins the magic item (magic-items.mjs); the line that sends vehicles to their own section; stabling, a service.
const notItems = ["Potion of healing", "Vehicles (land or water)", "Stabling (per day)"];
const drawnVehicles = ["Carriage", "Cart", "Chariot", "Sled", "Wagon"];
// The PDF indents the disguise kit and the forgery kit under Artisan's tools, but they are tools of their own, each with its description (p. 71).
const ownTools = ["Disguise kit", "Forgery kit"];
// Names in natural order that the SRD's do not give by turning them round, as Hammer, sledge; a saddle is named with its group.
const names = { "Hammer, sledge": "Sledgehammer", Exotic: "Exotic Saddle", Military: "Military Saddle", Pack: "Pack Saddle", Riding: "Riding Saddle" };
// The descriptions an item takes from a title other than its own or its group's.
const describedBy = { Saddle: "Saddles", Keelboat: "Rowed Vessels", Rowboat: "Rowed Vessels" };
// What a page counts: the uses of a healer's kit (p. 67).
const counters = { "Healer's Kit": { uses: "10/10" } };
// The words a name keeps in lower case, but at its start.
const smallWords = new Set(["a", "an", "and", "in", "of", "or", "the", "to"]);

const [linesPath] = process.argv.slice(2);

if (linesPath === undefined) {
    console.error("Usage: node systems/5e/build/gear.mjs <srd51-lines.jsonl>");
    process.exit(1);
}

// From Adventuring Gear on, without the end of the Weapons table and its properties, which open p. 66 and which the chapter already holds.
const lines = readLines(linesPath, 66, 74).filter((line) => !(line.page === 66 && line.words[0].size < 9.5));
const blocks = readBlocks(lines);

if (blocks[0].kind !== "heading" || blocks[0].text !== "Adventuring Gear") {
    throw new Error(`The text after the Weapons table should open with Adventuring Gear, not ${blocks[0].text ?? blocks[0].kind}.`);
}

writeChapter(markdown(blocks));
const descriptions = descriptionsOf(blocks);
const pages = [...Object.entries(tables).flatMap(([caption, spec]) => tablePages(tableOf(blocks, caption), spec, descriptions)), ...packPages(blocks)];
const categories = new Set(pages.map((page) => page.fields.category));
const written = writePages("items", pages, (page) => categories.has(page.fields.category));
console.log(`${written.length} pages written: ${written.map((page) => page.name).join(", ")}.`);

/** The chapter's text after the weapons, in place of what an earlier run wrote there. */
function writeChapter(text)
{
    const path = join(import.meta.dirname, "..", "rules", "Equipment.md");
    const chapter = readFileSync(path, "utf8").replaceAll("\r\n", "\n");
    const end = chapter.indexOf("\n## Adventuring Gear\n");
    writeFileSync(path, `${(end === -1 ? chapter : chapter.slice(0, end)).trimEnd()}\n\n${text}\n`);
}

/** The paragraphs under each run-in title, such as "***Acid.***", up to the next title or the next heading or table, by the title's key. */
function descriptionsOf(blocks)
{
    const result = new Map();
    let paragraphs;

    for (const block of blocks) {
        const title = block.kind === "paragraph" && block.runs[0].style === "***" ? block.runs[0].text.replace(/\.$/, "") : undefined;

        if (title !== undefined) {
            paragraphs = [runsText(block.runs.slice(1)).trimStart()];
            result.set(titleKey(title), paragraphs);
        } else if (block.kind === "paragraph" && paragraphs !== undefined) {
            paragraphs.push(runsText(block.runs));
        } else {
            paragraphs = undefined;
        }
    }

    return result;
}

/**
 * The pages of a table's items: the name, the SRD's as an alias when it differs, the category, the fields of the columns, a length the name gives, what
 * the item counts, and its description: the one another title gives it, else its own, the one of the first part of its name (Rope for both ropes), or its group's.
 */
function tablePages(table, spec, descriptions)
{
    return table.rows.filter((row) => !row.heading && !notItems.includes(plainText(row.cells[0]))).map((row) => {
        const [srdName, ...values] = row.cells.map(plainText);
        const group = ownTools.includes(srdName) ? undefined : row.group;
        const name = names[srdName] ?? naturalName(srdName);
        const length = /\((\d+)(?: feet|-foot)\)/.exec(srdName)?.[1];
        const fields = {
            ...(pageName(srdName).toLowerCase() === name.toLowerCase() || group === "Saddle" ? {} : { aliases: [pageName(srdName)] }),
            category: group === undefined ? (drawnVehicles.includes(name) ? "drawn vehicle" : spec.category) : pageName(group).toLowerCase(),
            ...Object.fromEntries(spec.fields.map((field, index) => [field, valueOf(field, values[index].replace(/\.(?= |$)/g, ""))]).filter(([, value]) => value !== "—")),
            ...(length === undefined ? {} : { length: `${length} feet` }),
            ...counters[name],
        };
        const titles = [describedBy[name], describedBy[group], srdName, srdName.split(",")[0], group].filter((title) => title !== undefined).map(titleKey);
        return { name, fields, body: (descriptions.get(titles.find((title) => descriptions.has(title))) ?? []).join("\n\n") };
    });
}

/** A column's value as the page writes it: a speed in metric, with the game's factor of 1.5 km a mile, as every measure the engine reads (D-262): 4 mph is 6 km/h. */
function valueOf(field, value)
{
    const mph = field === "speed" ? /^(\d*)(½)? mph$/.exec(value) : null;
    return mph === null ? value : `${(Number(mph[1] || 0) + (mph[2] === undefined ? 0 : 0.5)) * 1.5} km/h`;
}

function tableOf(blocks, caption)
{
    const table = blocks.find((block) => block.kind === "table" && block.caption === caption);

    if (table === undefined) {
        throw new Error(`No table ${caption} in the chapter: the converter reads its items from it.`);
    }

    return table;
}

/** The equipment packs (p. 70): each run-in title gives a pack's name and price, such as "Burglar’s Pack (16 gp).", and its paragraph what it holds. */
function packPages(blocks)
{
    return blocks.filter((block) => block.kind === "paragraph" && /^.+ Pack \([\d,]+ gp\)\.$/.test(block.runs[0].text) && block.runs[0].style === "***").map((block) => {
        const [, name, cost] = /^(.+) \(([\d,]+ gp)\)\.$/.exec(block.runs[0].text);
        return { name: pageName(name), fields: { category: "equipment pack", cost }, body: runsText(block.runs.slice(1)).trimStart() };
    });
}

/** A title or an item's name as descriptions are found by: without what it measures in parentheses, with a straight apostrophe, in lower case. */
function titleKey(title)
{
    return pageName(title.replace(/ \(.*\)$/, "")).toLowerCase();
}

/** The SRD's name in natural order: without what it measures in parentheses, turned round at its comma, and capitalized, as "Rope, hempen (50 feet)" gives Hempen Rope. */
function naturalName(srdName)
{
    const [noun, kind] = srdName.replace(/ \(.*\)$/, "").split(", ");
    return pageName(kind === undefined ? noun : `${kind} ${noun}`).split(" ").map((word, index) => (index > 0 && smallWords.has(word) ? word : capitalized(word))).join(" ");
}

/** A word with a capital, and each part of it after a hyphen: two-person gives Two-Person. */
function capitalized(word)
{
    return word.replace(/(^|-)(\p{L})/gu, (_, before, letter) => `${before}${letter.toUpperCase()}`);
}
