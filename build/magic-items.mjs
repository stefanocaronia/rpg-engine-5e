// Writes the SRD 5.1's Magic Items chapter (pp. 206–253) from the lines of its PDF: its rules into rules/Magic Items.md, and each magic item as a page in
// world/items, with the category, rarity and attunement of its type line. node systems/5e/build/magic-items.mjs <srd51-lines.jsonl>, from lines.py.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pageName, writePages } from "./pages.mjs";
import { markdown, plainText, readBlocks, readLines } from "./srd-markdown.mjs";

// A name in natural order, where the SRD's gives another in parentheses.
const names = { "Stone of Good Luck (Luckstone)": "Stone of Good Luck" };
// Potion of Healing joins the adventuring gear entry (pp. 68–69): the price and weight of the common potion, and its sentence on drinking it, a paragraph after
// the magic item's text.
// Items whose charges the text gives each figurine of its own, not the item.
const withoutCharges = ["Figurine of Wondrous Power"];
const joined = { "Potion of Healing": { fields: { cost: "50 gp (common)", weight: "1/2 lb" }, text: "Drinking or administering a potion takes an action." } };

const [linesPath] = process.argv.slice(2);

if (linesPath === undefined) {
    console.error("Usage: node systems/5e/build/magic-items.mjs <srd51-lines.jsonl>");
    process.exit(1);
}

const blocks = readBlocks(readLines(linesPath, 206, 253));
const items = itemsOf(blocks);
const inItems = new Set(items.flatMap((item) => item.blocks));
writeFileSync(join(import.meta.dirname, "..", "rules", "Magic Items.md"), `${markdown(withoutEmptyHeadings(blocks.filter((block) => !inItems.has(block))))}\n`);
const written = writePages("items", items.map(itemPage), (page) => page.fields.rarity !== undefined);
console.log(`${written.length} magic items written: ${written.map((page) => page.name).join(", ")}.`);

/**
 * The magic items, from Magic Items A-Z and Artifacts: a heading followed by a type line in italics, such as "Wondrous item, rare (requires attunement)",
 * up to the next heading; every heading there is one.
 */
function itemsOf(blocks)
{
    const items = [];
    let section;

    for (const [index, block] of blocks.entries()) {
        if (block.kind === "heading" && block.level <= 2) {
            section = block.text;
        } else if (block.kind === "heading" && ["Magic Items A-Z", "Artifacts"].includes(section)) {
            const type = blocks[index + 1];

            if (type?.kind !== "paragraph" || type.runs.some((run) => run.style !== "*")) {
                throw new Error(`${block.text} has no type line in italics after its heading.`);
            }

            const end = blocks.findIndex((other, at) => at > index && other.kind === "heading");
            items.push({ heading: block.text, type: plainText(type.runs), blocks: blocks.slice(index, end === -1 ? blocks.length : end) });
        }
    }

    return items;
}

/** A heading with no text under it, before the next heading of its level or above, goes: Artifacts, whose only text is the Orb of Dragonkind's page. */
function withoutEmptyHeadings(blocks)
{
    return blocks.filter((block, index) => block.kind !== "heading" || (blocks[index + 1] !== undefined && (blocks[index + 1].kind !== "heading" || blocks[index + 1].level > block.level)));
}

/** A magic item's page: its fields from its type line, and its text after it, the SRD's alone (D-170). */
function itemPage(item)
{
    const name = pageName(names[item.heading] ?? item.heading);
    const gear = joined[name];
    const body = [...item.blocks.slice(2), ...(gear === undefined ? [] : [{ kind: "paragraph", runs: [{ style: "", text: gear.text, space: false }] }])];
    const fields = { ...(name === pageName(item.heading) ? {} : { aliases: [pageName(item.heading)] }), ...typeFields(name, item.type), ...gear?.fields };
    const text = markdown(body);
    // A fixed number of charges is a counter of one thing (STK-1); charges by dice, or a figurine's of its own, stay text.
    const charges = withoutCharges.includes(name) ? undefined : /\b(?:has|with) (\d+) charges\b/.exec(text)?.[1];
    return { name, fields: { ...fields, ...(charges === undefined ? {} : { charges: `${charges}/${charges}` }) }, body: text };
}

/**
 * The fields of a type line: the category before its first comma outside parentheses, in lower case; the rarity after it, "varies" for "rarity varies";
 * and attunement, true or what it requires, as "by a paladin" or "outdoors at night".
 */
function typeFields(name, line)
{
    const [, category, rest] = /^((?:[^,(]|\([^)]*\))+), (.+)$/.exec(line) ?? [];
    const [, rarity, by] = /^(.+?)(?: \(requires attunement(?: ([^)]+))?\))?$/.exec(rest ?? "") ?? [];

    if (category === undefined || rarity === undefined || rarity.includes("attunement")) {
        throw new Error(`${name} has a type line that cannot be read: ${line}`);
    }

    const attunement = rest.endsWith("(requires attunement)") ? true : by;
    return { category: category.toLowerCase(), rarity: rarity.replace(/^rarity /, ""), ...(attunement === undefined ? {} : { attunement }) };
}
