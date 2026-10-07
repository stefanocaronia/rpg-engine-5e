// Writes the creatures of the SRD 5.1 as pages in world/creatures, from the stat blocks of its Monsters chapter (pp. 261–357) and of its appendices MM-A,
// Miscellaneous Creatures (pp. 366–394), and MM-B, Nonplayer Characters (pp. 395–403): node systems/5e/build/monsters.mjs <srd51-layout.tsv>
// Its input comes from the SRD's PDF with pdfplumber: layout.py writes each line of its text with its place, size and font, and the style of each
// character, which keeps the SRD's italics.
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";

const world = join(import.meta.dirname, "..", "world");
const creatures = join(world, "creatures");
// The pages of the stat blocks: the Monsters chapter after its own rules (pp. 254–260), and the two appendices.
const chapters = [{ first: 261, last: 357 }, { first: 366, last: 403 }];

// The names another page of the system has: the creature takes "(creature)", as the background is Acolyte (background) beside the creature Acolyte.
const shared = ["Druid"];
// The text under a heading that is no stat block: a variant is a section of the creature it varies; the rules, as the chapters' own text (pp. 254–260,
// the openings of the appendices), are the rules chapter Monsters'. A family's heading, such as Demons, has no text in the SRD 5.1.
const elsewhere = { "Variant: Diseased Giant Rats": "Giant Rat", "Variant: Insect Swarms": "Swarm of Insects" };
const leftOut = ["Half-Dragon Template", "Customizing NPCs"];

// The labels of a stat block's header, in bold; the Archmage writes "Damage Resistance".
const labels = [
    "Armor Class",
    "Hit Points",
    "Speed",
    "STR DEX CON INT WIS CHA",
    "Saving Throws",
    "Skills",
    "Damage Vulnerabilities",
    "Damage Resistances",
    "Damage Resistance",
    "Damage Immunities",
    "Condition Immunities",
    "Senses",
    "Languages",
    "Challenge",
];
const abilities = ["str", "dex", "con", "int", "wis", "cha"];
// A line of a spell list, such as "At will:" or "1st level (4 slots):", and the slots it gives.
const spellListLine = /^(At will|\d+\/day(?: each)?|Cantrips \(at will\)|\d+(?:st|nd|rd|th) level \(\d+ slots?\)):/;
const slotsLine = /^(\d)(?:st|nd|rd|th) level \((\d+) slots?\):/;

const [layoutPath] = process.argv.slice(2);

if (layoutPath === undefined) {
    console.error("Usage: node systems/5e/build/monsters.mjs <srd51-layout.tsv>");
    process.exit(1);
}

const { blocks, texts } = readSource(readLines(readFileSync(layoutPath, "utf8")));
const pages = blocks.map((block) => readCreature(block, texts));
const taken = otherPageNames();
const written = new Set();

for (const [heading, owner] of Object.entries(elsewhere)) {
    if (!texts.has(heading) || !pages.some((page) => page.name === owner)) {
        throw new Error(`${heading} should go in ${owner}, but the SRD has no text under it or no such creature.`);
    }
}

removeCreaturePages();

for (const page of pages) {
    const name = fileName(page.name, taken);

    if (written.has(name.toLowerCase())) {
        throw new Error(`Two stat blocks are named ${name}: give one of them another name.`);
    }

    written.add(name.toLowerCase());
    writeFileSync(join(creatures, `${name}.md`), pageText(page, aliasesOf(page, name)));
}

report(pages, taken);

/** The lines of the stat blocks' pages, a column after the other, without the pages' footers; each indented or not from the margin of its column. */
function readLines(layout)
{
    const lines = [];

    for (const row of layout.replaceAll("\r\n", "\n").split("\n")) {
        const [page, column, x, size, font, text, styles] = row.split("\t");

        if (row !== "" && chapters.some((range) => Number(page) >= range.first && Number(page) <= range.last) && !/^System Reference Document 5\.1 \d+$/.test(text)) {
            lines.push({ page: Number(page), column: Number(column), x: Number(x), size: Number(size), font, ...cleaned(text, styles) });
        }
    }

    const margins = new Map();

    for (const line of lines) {
        const key = `${line.page} ${line.column}`;
        margins.set(key, Math.min(margins.get(key) ?? line.x, line.x));
    }

    return lines.map((line) => ({ ...line, indented: line.x - margins.get(`${line.page} ${line.column}`) > 4 }));
}

/** A line's text with the SRD's hyphen, written as three or four characters, as one, and the style of each character beside it. */
function cleaned(text, styles)
{
    if (text.length !== styles.length) {
        throw new Error(`The styles of a line do not match its text: ${text}`);
    }

    let result = { text: "", styles: "" };

    for (let index = 0; index < text.length; index++) {
        result = { text: result.text + text[index], styles: result.styles + styles[index] };
        index += (/^-\u00ad\u2010\u2011?/.exec(text.slice(index))?.[0].length ?? 1) - 1;
    }

    return result;
}

/**
 * The stat blocks in the SRD's order, each with its lines, and the lines under each heading whose text goes to a creature's page. A stat block's name is
 * in Calibri Bold at 12 pt, the other headings in Gill Sans; the text under a chapter's title, as an appendix's opening, is left out.
 */
function readSource(lines)
{
    const blocks = [];
    const texts = new Map();
    let target = { heading: "a chapter's title", left: true };

    for (const line of lines) {
        if (line.size >= 18) {
            target = { heading: line.text, left: true };
        } else if (line.size === 12 && line.font === "Calibri-Bold") {
            blocks.push({ name: line.text, page: line.page, lines: [] });
            target = { lines: blocks.at(-1).lines };
        } else if (line.font.startsWith("GillSans")) {
            target = headingTarget(line.text, texts);
        } else if (target.lines !== undefined) {
            target.lines.push(line);
        } else if (!target.left) {
            throw new Error(`The SRD gives text under ${target.heading} (p. ${line.page}): say whose page it goes in, in elsewhere, or leave it out.`);
        }
    }

    return { blocks, texts };
}

/** Where the lines under a heading that is no stat block go: to a creature's page, nowhere as decided, or nowhere expected. */
function headingTarget(heading, texts)
{
    if (elsewhere[heading] !== undefined) {
        texts.set(heading, []);
        return { lines: texts.get(heading), heading };
    }

    return { heading, left: leftOut.includes(heading) };
}

/** A creature from its stat block: the fields of its header, its description, and its sections, with the text of other headings that is about it. */
function readCreature(block, texts)
{
    const own = block.lines.filter((line) => !line.font.startsWith("Cambria"));
    const start = own.findIndex((line) => line.text.startsWith("Armor Class "));

    if (start === -1) {
        throw new Error(`${block.name} (p. ${block.page}) has no Armor Class.`);
    }

    const name = pageName(block.name);
    const { entries, end } = readHeader(block.name, own.slice(start));
    const sections = readSections(block.name, own.slice(start + end));
    const type = own.slice(0, start).map((line) => line.text).join(" ");
    const extra = Object.entries(elsewhere).filter(([, owner]) => owner === name).map(([heading]) => ({ title: heading, blocks: readText(texts.get(heading)) }));
    // A save or skill with a note keeps only its total in the field, which a formula reads: the stat block's line, with the note, opens the page.
    const notes = ["Saving Throws", "Skills"].filter((label) => entries.get(label)?.includes("(")).map((label) => `**${label}** ${entries.get(label)}`);
    // The bold of a description marks the creature's own name, as an index would: the pages written before leave it out.
    const description = block.lines.filter((line) => line.font.startsWith("Cambria")).map((line) => ({ ...line, styles: line.styles.replaceAll("b", "r") }));
    const fields = fieldsOf(block.name, type, entries, sections);
    return { name, heading: block.name, fields, notes, description: readText(description), sections: [...sections, ...extra] };
}

/** The entries of the header, from Armor Class to Challenge, each label with its value joined from its lines; and the number of lines they take. */
function readHeader(name, lines)
{
    const entries = new Map();
    let label;

    for (const [index, line] of lines.entries()) {
        for (const part of splitAtLabels(line)) {
            const opening = labels.find((candidate) => part.text === candidate || part.text.startsWith(`${candidate} `));

            if (opening !== undefined) {
                label = opening;
                entries.set(label, part.text.slice(opening.length).trim());
            } else if (label !== undefined) {
                entries.set(label, joinText(entries.get(label), part.text));
            }
        }

        if (label === "Challenge") {
            return { entries, end: index + 1 };
        }
    }

    throw new Error(`${name} has no Challenge.`);
}

/** A line of the header as the entries it holds: once the PDF puts a label in bold at the end of the line before (the Wereboar's Senses). */
function splitAtLabels(line)
{
    const inside = labels.map((label) => line.text.indexOf(` ${label} `)).filter((index) => index > 0 && line.styles[index + 1] === "b");
    const at = Math.min(...inside);
    return inside.length === 0 ? [line] : [{ text: line.text.slice(0, at) }, { text: line.text.slice(at + 1) }];
}

/** The sections of a stat block after its header: its traits, then those its bold headings open, such as Actions, each with its items. */
function readSections(name, lines)
{
    const sections = [{ title: "Traits", lines: [] }];

    for (const line of lines) {
        if (line.size === 10.8) {
            sections.push({ title: line.text, lines: [] });
        } else {
            sections.at(-1).lines.push(line);
        }
    }

    return distinctNames(name, sections.filter((section) => section.lines.length > 0).map((section) => readItems(name, section)));
}

/** The sections with a name each, as a page needs: an item named as one before it takes its section's, as the Unicorn's Hooves (legendary action). */
function distinctNames(name, sections)
{
    const names = new Set(sections.map((section) => comparable(section.title)));

    for (const section of sections) {
        for (const item of section.items) {
            if (names.has(comparable(item.name))) {
                item.name = `${item.name} (${section.title.replace(/s$/, "").toLowerCase()})`;
            }

            if (names.has(comparable(item.name))) {
                throw new Error(`${name} has two sections named ${item.name}: give one another name.`);
            }

            names.add(comparable(item.name));
        }
    }

    return sections;
}

/** A name as the engine compares them: ignoring case, with a straight apostrophe. */
function comparable(text)
{
    return text.toLowerCase().replaceAll("’", "'");
}

/**
 * A section's items, each opened by its name in bold italics, or in bold among the legendary actions, and made of paragraphs and the lines of a spell list.
 * A paragraph goes on at the margin and a new one is indented; a list's line, a legendary action and a title in bold within an item, as a dragon's Fire
 * Breath, start at the margin and go on indented. A name in bold whose line goes on at the margin opens an item, as the Basilisk's Petrifying Gaze.
 */
function readItems(name, section)
{
    const style = section.title === "Legendary Actions" ? "b" : "x";
    const result = { title: section.title, intro: [], items: [] };
    let blocks = result.intro;
    let open;
    let hanging = false;

    for (const [index, line] of section.lines.entries()) {
        const titled = !line.indented && style === "x" && line.styles.startsWith("b") && section.lines[index + 1]?.indented === true;
        const item = line.indented || titled ? undefined : (itemName(line, style) ?? (style === "x" ? itemName(line, "b") : undefined));

        if (item !== undefined) {
            result.items.push({ name: item.name, blocks: [] });
            blocks = result.items.at(-1).blocks;
            open = { kind: "paragraph", ...item.rest };
            blocks.push(open);
            hanging = style === "b";
            continue;
        }

        const listed = !line.indented && spellListLine.test(line.text);

        if (open === undefined || listed || titled || (hanging ? !line.indented : line.indented)) {
            open = { kind: listed ? "item" : "paragraph", text: line.text, styles: line.styles };
            blocks.push(open);
            hanging = listed || titled || (hanging && !line.indented);
        } else {
            Object.assign(open, joinStyled(open, line));
        }
    }

    if (result.intro.length > 0 && style === "x") {
        throw new Error(`${name}'s ${section.title} opens with text that is no item: ${result.intro[0].text}`);
    }

    return result;
}

/** The name that opens a line, in the style of its section, without its period, and the rest of the line; undefined when the line opens no item. */
function itemName(line, style)
{
    const run = new RegExp(`^${style}+(?: ${style}+)*`).exec(line.styles)?.[0] ?? "";
    const name = line.text.slice(0, run.length).replace(/\.$/, "").trim();

    if (name === "") {
        return undefined;
    }

    // The period after a name is sometimes in roman, as after Acid Absorption.
    const period = line.text[run.length] === "." ? 1 : 0;
    const start = run.length + period + /^ */.exec(line.text.slice(run.length + period))[0].length;
    return { name, rest: { text: line.text.slice(start), styles: line.styles.slice(start) } };
}

/** The paragraphs of a text that is no stat block's: a description, a variant. A paragraph's first line is indented. */
function readText(lines)
{
    const blocks = [];

    for (const line of lines) {
        if (blocks.length === 0 || line.indented) {
            blocks.push({ kind: "paragraph", text: line.text, styles: line.styles });
        } else {
            Object.assign(blocks.at(-1), joinStyled(blocks.at(-1), line));
        }
    }

    return blocks;
}

/** Joins two lines of a paragraph: a line that ends with a hyphen goes on without a space, since the SRD breaks no word across lines. */
function joinText(text, line)
{
    return text === "" ? line : /[-—]$/.test(text) ? `${text}${line}` : `${text} ${line}`;
}

function joinStyled(block, line)
{
    const joined = joinText(block.text, line.text);
    return { text: joined, styles: `${block.styles}${joined.length - block.text.length > line.text.length ? " " : ""}${line.styles}` };
}

/** The fields of a stat block's header, in the order of the existing pages; a challenge as text, in quotes as "1/4" and "2" are. */
function fieldsOf(name, type, entries, sections)
{
    // "Medium humanoid (human, shapechanger), neutral evil": the alignment after the last comma outside parentheses.
    const typeParts = topLevel(type, ", ");
    const [, size, category] = /^(Tiny|Small|Medium|Large|Huge|Gargantuan) (.+)$/.exec(typeParts.slice(0, -1).join(", ")) ?? [];
    const alignment = typeParts.at(-1);

    if (size === undefined) {
        throw new Error(`${name} has a line of type that does not read: ${type}`);
    }

    const [, ac, armor] = /^(\d+)(?: (.+))?$/.exec(entries.get("Armor Class")) ?? [];
    const [, hp, dice] = /^(\d+) \((.+)\)$/.exec(entries.get("Hit Points")) ?? [];
    const scores = [...(entries.get("STR DEX CON INT WIS CHA") ?? "").matchAll(/(\d+) \([+−-]\d+\)/g)].map((match) => Number(match[1]));
    const [, cr, xp] = /^(\S+) \(([\d,]+) XP\)$/.exec(entries.get("Challenge")) ?? [];

    if (ac === undefined || hp === undefined || scores.length !== 6 || cr === undefined) {
        throw new Error(`${name} has a header that does not read: ${[...entries].map(([label, value]) => `${label} ${value}`).join("; ")}`);
    }

    return {
        size,
        category,
        alignment,
        ac: Number(ac),
        // "(natural armor)" as natural armor, and the Ankheg's "(natural armor), 11 while prone" as natural armor, 11 while prone.
        ...(armor === undefined ? {} : { armor: units(armor.replace(/^\(([^()]*)\)/, "$1")) }),
        hp: `${hp}/${hp}`,
        "hp-dice": minus(dice),
        ...speeds(name, entries.get("Speed")),
        ...Object.fromEntries(abilities.map((ability, index) => [ability, scores[index]])),
        ...listField("saves", entries.get("Saving Throws"), totals),
        ...listField("skills", entries.get("Skills"), totals),
        ...listField("damage-vulnerabilities", entries.get("Damage Vulnerabilities"), damageList),
        ...listField("damage-resistances", entries.get("Damage Resistances") ?? entries.get("Damage Resistance"), damageList),
        ...listField("damage-immunities", entries.get("Damage Immunities"), damageList),
        ...listField("condition-immunities", entries.get("Condition Immunities"), (text) => topLevel(text, ", ")),
        ...senses(name, entries.get("Senses")),
        ...listField("languages", entries.get("Languages"), languageList),
        ...slots(sections),
        cr,
        "xp-value": Number(xp.replaceAll(",", "")),
    };
}

/** The walking speed and the others, each a field: "30 ft., fly 60 ft. (hover)" as speed 30 ft and fly 60 ft (hover). */
function speeds(name, text)
{
    const result = {};

    for (const part of topLevel(text ?? "", ", ")) {
        const mode = /^(burrow|climb|fly|swim) (.+)$/.exec(part);

        if (mode !== null) {
            result[mode[1]] = units(mode[2]);
        } else if (/^\d/.test(part) && result.speed === undefined) {
            result.speed = units(part);
        } else {
            throw new Error(`${name} has a speed that does not read: ${part}`);
        }
    }

    return result;
}

/** The senses, each a field, and the passive Perception. */
function senses(name, text)
{
    const result = {};

    for (const part of topLevel(text ?? "", ", ")) {
        const sense = /^(blindsight|darkvision|tremorsense|truesight) (.+)$/.exec(part);
        const passive = /^passive Perception (\d+)$/.exec(part);

        if (sense !== null) {
            result[sense[1]] = units(sense[2]);
        } else if (passive !== null) {
            result["passive-perception"] = Number(passive[1]);
        } else {
            throw new Error(`${name} has a sense that does not read: ${part}`);
        }
    }

    return result;
}

/** The saves or skills of a line as the formulas read them, a name and its total: the Shadow's "Stealth +4 (+6 in dim light or darkness)" as Stealth +4. */
function totals(text)
{
    return topLevel(text, ", ").map((entry) => minus(entry.replace(/ \([^()]*\)$/, "")));
}

/** The damage types of a line: a group of single words, such as "acid, cold, fire", one by one; a phrase, such as those from nonmagical attacks, whole. */
function damageList(text)
{
    return text.split("; ").flatMap((group) => {
        const parts = topLevel(group, ", ");
        return parts.every((part) => !part.includes(" ")) ? parts : [group];
    });
}

/** The languages, each an item, and what a creature understands but cannot speak as one: "understands Common and Giant but can’t speak". */
function languageList(text)
{
    const result = [];

    for (const part of topLevel(text, ", ")) {
        const open = result.at(-1)?.startsWith("understands") && !/ but (?:can’t|doesn’t) speak/.test(result.at(-1));

        if (open) {
            result[result.length - 1] += `, ${part}`;
        } else {
            result.push(part);
        }
    }

    return result.filter((language) => language !== "—").map(units);
}

/** The spell slots a Spellcasting trait's list gives, as counters such as slots-1: 4/4. */
function slots(sections)
{
    const result = {};

    for (const item of sections.flatMap((section) => section.items).filter((trait) => /^Spellcasting\b/.test(trait.name))) {
        for (const line of item.blocks.filter((block) => block.kind === "item")) {
            const [, level, count] = slotsLine.exec(line.text) ?? [];

            if (level !== undefined) {
                result[`slots-${level}`] = `${count}/${count}`;
            }
        }
    }

    return result;
}

function listField(field, text, read)
{
    const items = text === undefined ? [] : read(text);
    return items.length === 0 ? {} : { [field]: items };
}

/** The parts of a text between separators outside parentheses: "30 ft. (40 ft., climb 30 ft. in bear form)" is one. */
function topLevel(text, separator)
{
    const parts = [""];
    let depth = 0;

    for (let index = 0; index < text.length; index++) {
        depth += text[index] === "(" ? 1 : text[index] === ")" ? -1 : 0;

        if (depth === 0 && text.startsWith(separator, index)) {
            parts.push("");
            index += separator.length - 1;
        } else {
            parts[parts.length - 1] += text[index];
        }
    }

    return parts.map((part) => part.trim()).filter((part) => part !== "");
}

/** A unit without its final period, as the system writes them: 30 ft. as 30 ft. */
function units(text)
{
    return text.replace(/\bft\./g, "ft");
}

/** The SRD's minus sign as the one a formula and a roll read: Wis −1 as Wis -1. */
function minus(text)
{
    return text.replaceAll("−", "-");
}

/** The page: its fields, its description, its sections, each item a heading of its own with its paragraphs and lists. */
function pageText(page, aliases)
{
    const fields = { ...(aliases.length > 0 ? { aliases } : {}), ...page.fields };
    const lines = Object.entries(fields).map(([field, value]) => `${field}: ${field === "cr" ? JSON.stringify(value) : Array.isArray(value) ? `[${value.map(flowItem).join(", ")}]` : scalar(value)}`);
    const parts = [...page.notes, blocksText(page.description), ...page.sections.map(sectionText)].filter((part) => part !== "");
    return `---\n${lines.join("\n")}\n---\n\n${parts.join("\n\n")}\n`;
}

function sectionText(section)
{
    const items = (section.items ?? []).map((item) => `### ${item.name}\n${blocksText(item.blocks)}`);
    return [`## ${section.title}`, blocksText(section.intro ?? section.blocks), ...items].filter((part) => part !== "").join("\n\n");
}

/** Paragraphs apart, the lines of a list one under the other. */
function blocksText(blocks)
{
    return blocks.map((block, index) => {
        const text = `${block.kind === "item" ? "- " : ""}${markdown(block.text, block.styles)}`;
        return index === 0 ? text : `${block.kind === "item" && blocks[index - 1].kind === "item" ? "\n" : "\n\n"}${text}`;
    }).join("");
}

/**
 * A text as markdown with the SRD's italics, and its bold, as of a dragon's Fire Breath, and bold italics where they open a paragraph. A space takes the
 * style of the words on both sides of it, and punctuation alone none: a period in bold italics after a word in roman stays in roman.
 */
function markdown(text, styles)
{
    const kinds = [...styles];

    for (const [index, kind] of kinds.entries()) {
        if (kind === " ") {
            const before = kinds.slice(0, index).findLast((other) => other !== " ");
            const after = kinds.slice(index + 1).find((other) => other !== " ");
            kinds[index] = before === after ? before : "r";
        }
    }

    const runs = [];

    for (const [index, kind] of kinds.entries()) {
        if (runs.at(-1)?.kind === kind) {
            runs.at(-1).text += text[index];
        } else {
            runs.push({ kind, text: text[index] });
        }
    }

    return runs.map((run) => {
        const escaped = run.text.replace(/([*_\\])/g, "\\$1");
        const marks = { i: "*", x: "***", b: "**" }[run.kind];
        return marks === undefined || !/[\p{L}\p{N}]/u.test(run.text) ? escaped : `${marks}${escaped}${marks}`;
    }).join("");
}

/** A value as YAML writes it, in quotes only when it would not read back as itself. */
function scalar(value)
{
    const text = stringify(value, { lineWidth: 0 }).trimEnd();
    return parse(text) === value ? text : JSON.stringify(value);
}

/** An item of a list in brackets, in quotes only when the list would not read it back as itself, as one with commas. */
function flowItem(value)
{
    try {
        const back = parse(`[${value}]`);

        if (Array.isArray(back) && back.length === 1 && back[0] === value) {
            return value;
        }
    } catch {
        // A value YAML cannot read in brackets goes in quotes.
    }

    return JSON.stringify(value);
}

/**
 * A page name: in natural order, as the system writes names (LICENSE.md), with a straight apostrophe, as every page of the system has, and a hyphen for the
 * slash a file name cannot hold: "Elf, Drow" as Drow Elf, "Gnome, Deep (Svirfneblin)" as Deep Gnome (Svirfneblin), Succubus/Incubus as Succubus-Incubus.
 */
function pageName(title)
{
    const [, noun, modifier, rest] = /^([^,(]+), ([^(]+?)( \(.+\))?$/.exec(title) ?? [];
    const natural = noun === undefined ? title : `${modifier} ${noun}${rest ?? ""}`;
    return natural.replaceAll("’", "'").replaceAll("/", "-");
}

/** The file of a creature: its name, or with "(creature)" when another page has it, as expected; another name taken stops the script. */
function fileName(name, taken)
{
    if (!taken.has(name.toLowerCase())) {
        return name;
    }

    if (!shared.includes(name)) {
        throw new Error(`${name} is already the name of another page of the system: add it to shared, or give the creature another name.`);
    }

    return `${name} (creature)`;
}

/** The names a page is found by beside its own: the SRD's, when the page's name differs from it, or the name with "creature" when it takes "(creature)". */
function aliasesOf(page, file)
{
    if (file !== page.name) {
        return [`${page.name} creature`];
    }

    return comparable(page.heading) === comparable(page.name) ? [] : [page.heading];
}

/** The names of the system's other pages, in lower case: a creature cannot take one. */
function otherPageNames()
{
    const names = new Set();

    for (const folder of readdirSync(world, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
        for (const file of readdirSync(join(world, folder.name)).filter((name) => name.endsWith(".md"))) {
            if (!isCreaturePage(join(world, folder.name, file))) {
                names.add(file.slice(0, -3).toLowerCase());
            }
        }
    }

    return names;
}

function removeCreaturePages()
{
    for (const file of readdirSync(creatures).filter((name) => name.endsWith(".md"))) {
        if (isCreaturePage(join(creatures, file))) {
            rmSync(join(creatures, file));
        }
    }
}

/** A page this script writes: a creature with a challenge, unlike a race. */
function isCreaturePage(path)
{
    return /^---\n(?:.*\n)*?cr: /.test(readFileSync(path, "utf8").replaceAll("\r\n", "\n"));
}

function report(pages, taken)
{
    const renamed = pages.filter((page) => fileName(page.name, taken) !== page.heading.replaceAll("’", "'")).map((page) => `${page.heading} as ${fileName(page.name, taken)}`);
    const placed = Object.entries(elsewhere).map(([heading, owner]) => `${heading} in ${owner}`);
    console.log(`${pages.length} creatures written; renamed: ${renamed.join(", ") || "none"}; sections from other headings: ${placed.join(", ")}; left out: ${leftOut.join(", ")}.`);
}
