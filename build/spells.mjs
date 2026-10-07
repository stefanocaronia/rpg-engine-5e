// Writes the spells of the SRD 5.1 as pages in world/topics, from the text and the outline of its PDF: node systems/5e/build/spells.mjs <srd51-norm.txt> <srd51-outline.tsv>
// Its inputs come from the SRD's PDF with pdfplumber: outline.py writes the headings (srd51-outline.tsv), extract.py the text by columns; srd51-norm.txt
// is that text after a cleanup not kept here yet: the import of the whole SRD will keep it.
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";

const world = join(import.meta.dirname, "..", "world");
const listPages = { first: 105, last: 113 };
const descriptionPages = { first: 114, last: 194 };
// The header's labels, in order: Contagion writes "Component:".
const headerFields = [["casting-time", /^Casting Time:/], ["range", /^Range:/], ["components", /^Components?:/], ["duration", /^Duration:/]];
// A title that opens a paragraph, such as "At Higher Levels." or "1. Red.": its words capitalized, but for a few short ones.
const runInTitle = /^((?:\d+\. )?[A-Z][\w’'–]*(?: (?:[A-Z\d][\w’'–]*|of|the|and|into))*\.) /;
const levelLine = /^(?:(\d)(?:st|nd|rd|th)-level (\w+)( \(ritual\))?|(\w+) cantrip)$/;

// The body text is Cambria at 9.8 pt, a paragraph's first line indented by 9.4 pt, as are list items. The widths of its glyphs in thousandths of an em,
// measured in the PDF, and the width up to which a word still fits on a line, fitted on it, tell a line that ends a paragraph (the next word would have
// fitted) from one the column broke.
const layout = { size: 9.8, column: 225.5, indent: 9.4, space: 2.2, scale: 1.02, fallback: 500 };
const glyphWidths = Object.fromEntries([
    ["abcdefghijklmnopqrstuvwxyz", [488, 547, 441, 555, 488, 303, 494, 552, 278, 266, 524, 271, 832, 558, 531, 556, 547, 414, 430, 338, 552, 504, 774, 483, 504, 455]],
    ["ABCDEFGHILMNOPQRSTUVWY", [623, 611, 563, 662, 575, 537, 611, 687, 324, 537, 815, 681, 653, 568, 653, 621, 496, 593, 648, 604, 921, 570]],
    ["0123456789,.:;()-—’'“”/+×", [554, 554, 554, 554, 554, 554, 554, 554, 554, 554, 205, 205, 264, 264, 382, 382, 332, 1000, 221, 237, 375, 375, 490, 554, 554]],
].flatMap(([glyphs, sizes]) => [...glyphs].map((glyph, index) => [glyph, sizes[index]])));

// Where the measure is wrong, read in the PDF: the lines of a spell that start a paragraph.
const paragraphStarts = {
    "Antilife Shell": ["The barrier prevents an"],
    "Astral Projection": ["If you are returned"],
    "Calm Emotions": ["Alternatively, you can make"],
    Cloudkill: ["When a creature enters"],
    "Color Spray": ["Starting with the creature"],
    Commune: ["Divine beings aren’t necessarily"],
    "Conjure Animals": ["The summoned creatures are"],
    "Conjure Celestial": ["The celestial is friendly"],
    "Conjure Minor Elementals": ["An elemental summoned by", "The summoned creatures are", "The GM has the"],
    "Conjure Woodland Beings": ["The GM has the"],
    "Control Water": ["When a creature enters"],
    "Delayed Blast Fireball": ["The fire damages objects"],
    Disintegrate: ["A disintegrated creature and"],
    Etherealness: ["This spell has no"],
    "Find Familiar": ["When the familiar drops", "While your familiar is"],
    "Find Steed": ["When the steed drops"],
    "Fire Storm": ["The fire damages objects"],
    Haste: ["When the spell ends,"],
    "Heroes' Feast": ["A creature that partakes"],
    "Incendiary Cloud": ["The cloud moves 10"],
    "Locate Creature": ["This spell can’t locate"],
    "Magic Jar": ["You can attempt to"],
    "Major Image": ["Physical interaction with the"],
    Maze: ["The target can use", "When the spell ends,"],
    "Planar Ally": ["After the creature completes"],
    "Prismatic Wall": ["While this layer is"],
    "Private Sanctum": ["When you cast the", "Casting this spell on"],
    "Produce Flame": ["This spell’s damage increases"],
    "Programmed Illusion": ["The triggering condition can"],
    "Raise Dead": ["Coming back from the"],
    "Reverse Gravity": ["If some solid object"],
    Scrying: ["On a failed save,"],
    Sleep: ["Undead and creatures immune"],
    Suggestion: ["If you or any"],
    Sunburst: ["This spell dispels any"],
    Symbol: ["You can further refine"],
    Telekinesis: ["If the object is"],
    "Teleportation Circle": ["Many major temples, guilds,", "You can create a"],
    Thaumaturgy: ["If you cast this"],
    "Wall of Stone": ["If you maintain your"],
    Wish: ["The basic use of", "Alternatively, you can create"],
    "Word of Recall": ["You must designate a"],
};

// The tables, by the spell that holds them: the caption the SRD gives them, the line of their header, how many lines their rows take, the columns,
// how a line that starts a row reads, and the column a line that does not start one goes on.
const tables = {
    "Animate Objects": [
        { caption: "Animated Object Statistics", header: ["Size HP AC Attack Str Dex"], lines: 7, columns: ["Size", "HP", "AC", "Attack", "Str", "Dex"], row: /^(\S+) (\d+) (\d+) (.+?) (\d+) (\d+)$/, wrap: 3 },
    ],
    Confusion: [{ header: ["d10 Behavior"], lines: 11, columns: ["d10", "Behavior"], row: /^(\d+(?:–\d+)?) (.+)$/, wrap: 1 }],
    "Control Weather": [
        { caption: "Precipitation", header: ["Stage Condition"], lines: 5, columns: ["Stage", "Condition"], row: /^(\d) (.+)$/ },
        { caption: "Temperature", header: ["Stage Condition"], lines: 6, columns: ["Stage", "Condition"], row: /^(\d) (.+)$/ },
        { caption: "Wind", header: ["Stage Condition"], lines: 5, columns: ["Stage", "Condition"], row: /^(\d) (.+)$/ },
    ],
    Creation: [{ header: ["Material Duration"], lines: 5, columns: ["Material", "Duration"], row: /^(.+?) (\d+ \w+)$/ }],
    Reincarnate: [{ header: ["d100 Race"], lines: 14, columns: ["d100", "Race"], row: /^(\d\d–\d\d) (.+)$/ }],
    Scrying: [
        { header: ["Knowledge Save Modifier"], lines: 3, columns: ["Knowledge", "Save Modifier"], row: /^(.+) ([+−]\d+)$/ },
        { header: ["Connection Save Modifier"], lines: 3, columns: ["Connection", "Save Modifier"], row: /^(.+) ([+−]\d+)$/ },
    ],
    Teleport: [
        {
            header: ["Similar Off On", "Familiarity Mishap Area Target Target"],
            lines: 10,
            columns: ["Familiarity", "Mishap", "Similar Area", "Off Target", "On Target"],
            row: /^(.+?) (\S+) (\S+) (\S+) (\S+)$/,
            wrap: 0,
        },
    ],
};

const [textPath, outlinePath] = process.argv.slice(2);

if (textPath === undefined || outlinePath === undefined) {
    console.error("Usage: node systems/5e/build/spells.mjs <srd51-norm.txt> <srd51-outline.tsv>");
    process.exit(1);
}

const pages = readPages(readFileSync(textPath, "utf8"));
const headings = readHeadings(readFileSync(outlinePath, "utf8"));
const spells = readSpells(linesOf(pages, descriptionPages), headings);
const lists = readSpellLists(linesOf(pages, listPages), new Set(spells.map((spell) => spell.name)));
const taken = otherPageNames();
removeSpellPages();

// A name another page has takes "(spell)", as Acolyte (background) does, and one a file cannot have keeps the SRD's as an alias.
for (const spell of spells) {
    const shared = taken.has(spell.name.toLowerCase());
    const aliases = shared ? [`${spell.name} spell`] : spell.heading.includes("/") ? [spell.heading] : [];
    writeFileSync(join(world, "topics", `${fileName(spell, taken)}.md`), pageText(spell, lists.get(spell.name) ?? [], aliases));
}

// Each class's list (pp. 105–113) as a page, a section for each level, linking its spells by their pages' names.
for (const [owner, levels] of readClassLists(linesOf(pages, listPages))) {
    writeFileSync(join(world, "topics", `${owner} Spells.md`), listText(owner, levels, (name) => fileName({ name }, taken)));
}

report(spells, lists, taken);

/** The text of the PDF by page number, without the footer of each page. */
function readPages(text)
{
    const result = new Map();
    let page = 0;

    for (const line of text.replaceAll("\r\n", "\n").split("\n")) {
        const marker = /^=== page (\d+)$/.exec(line);

        if (marker !== null) {
            page = Number(marker[1]);
            result.set(page, []);
        } else if (page > 0 && !/^System Reference Document 5\.1 \d+$/.test(line)) {
            result.get(page).push(line);
        }
    }

    return result;
}

/** The spell headings of the descriptions, by page: in the outline, the 12 pt GillSans titles. */
function readHeadings(outline)
{
    const result = new Map();

    for (const row of outline.replaceAll("\r\n", "\n").split("\n")) {
        const [page, size, font, title] = row.split("\t");
        const number = Number(page);

        if (number >= descriptionPages.first && number <= descriptionPages.last && size === "12.0" && font === "GillSans-SemiBold") {
            result.set(number, [...(result.get(number) ?? []), clean(title)]);
        }
    }

    return result;
}

function linesOf(pages, range)
{
    const lines = [];

    for (let page = range.first; page <= range.last; page++) {
        lines.push(...pages.get(page).map((text) => ({ page, text: clean(text) })));
    }

    return lines;
}

/** Each spell: its name, its header, and the lines of its description. A spell starts at a heading of its page followed by a level line. */
function readSpells(lines, headings)
{
    const spells = [];

    for (let index = 0; index < lines.length; index++) {
        const { page, text } = lines[index];

        if ((headings.get(page) ?? []).includes(text) && levelLine.test(lines[index + 1]?.text ?? "")) {
            spells.push({ name: pageName(text), heading: text, level: lines[index + 1].text, lines: [] });
            index++;
        } else if (spells.length > 0) {
            spells.at(-1).lines.push(text);
        }
    }

    return spells.map(readSpell);
}

function readSpell(spell)
{
    const [, level, school, ritual, cantripSchool] = levelLine.exec(spell.level);
    const fields = { "spell-level": level === undefined ? 0 : Number(level), school: (school ?? cantripSchool).toLowerCase() };
    const lines = [...spell.lines];

    if (ritual !== undefined) {
        fields.ritual = true;
    }

    // The header lines come in order, each value going on to the next lines up to the next label, as the components do; the duration takes one line.
    for (const [field, label] of headerFields) {
        if (!label.test(lines[0])) {
            throw new Error(`${spell.name} has no ${field} where its header should give it: ${lines[0]}`);
        }

        let value = lines.shift().replace(label, "").trim();

        while (field !== "duration" && !headerFields.some(([, other]) => other.test(lines[0]))) {
            value = joinLines(value, lines.shift());
        }

        fields[field] = value.replace(/\.$/, "");
    }

    // Protection from Evil and Good writes "Concentration up to 10 minutes", without the comma.
    if (/^Concentration,? up to /.test(fields.duration)) {
        fields.concentration = true;
    }

    return { name: spell.name, heading: spell.heading, fields, body: bodyText(spell.name, lines) };
}

/** The classes whose list names each spell (pp. 105–113), by spell name; a name the lists give that is no spell is reported. */
function readSpellLists(lines, names)
{
    const result = new Map();
    let owner;

    for (const { text } of lines) {
        const heading = /^(\w+) Spells$/.exec(text);

        if (heading !== null) {
            owner = heading[1];
        } else if (owner !== undefined && !/^(Cantrips \(0 Level\)|\d(st|nd|rd|th) Level)$/.test(text)) {
            const name = pageName(text);

            if (!names.has(name)) {
                console.warn(`The ${owner} list names ${name}, which is no spell of the descriptions.`);
            }

            result.set(name, [...(result.get(name) ?? []), owner]);
        }
    }

    return result;
}

/** Each class's spell list as the SRD gives it (pp. 105–113): by class, its levels in order, each with its spells. */
function readClassLists(lines)
{
    const result = new Map();
    let owner;
    let level;

    for (const { text } of lines) {
        const heading = /^(\w+) Spells$/.exec(text);

        if (heading !== null) {
            owner = heading[1];
            level = undefined;
            result.set(owner, []);
        } else if (owner !== undefined && /^(Cantrips \(0 Level\)|\d(st|nd|rd|th) Level)$/.test(text)) {
            level = { title: text, names: [] };
            result.get(owner).push(level);
        } else if (level !== undefined) {
            level.names.push(pageName(text));
        }
    }

    return result;
}

/** The page of a class's spell list: what it is, and a section for each level with a link to each spell. */
function listText(owner, levels, pageOf)
{
    const sections = levels.map((level) => `## ${level.title}\n\n${level.names.map((name) => `- [[${pageOf(name)}]]`).join("\n")}`);
    return `---\ncategory: spell list\n---\n\nThe ${owner.toLowerCase()}'s spells, by level.\n\n${sections.join("\n\n")}\n`;
}

/** The description as markdown: paragraphs rejoined, list items, tables, and run-in headings in bold italics. */
function bodyText(name, lines)
{
    const blocks = [];
    const items = withBullets(lines);
    const pending = [...(tables[name] ?? [])];
    let open;

    for (let index = 0; index < items.length; index++) {
        const table = pending[0];

        if (table !== undefined && items[index].text === (table.caption ?? table.header[0])) {
            pending.shift();
            const start = index + table.header.length + (table.caption === undefined ? 0 : 1);
            const end = start + table.lines;
            blocks.push({ kind: "table", text: tableText(table, items.slice(start, end).map((item) => item.text)) });
            index = end - 1;
            open = undefined;
            continue;
        }

        const { text, bullet } = items[index];
        const starts = bullet || open === undefined || (paragraphStarts[name] ?? []).some((start) => text.startsWith(start));

        if (starts) {
            open = { kind: bullet ? "item" : "paragraph", text, indented: blocks.length > 0 };
            blocks.push(open);
        } else {
            open.text = joinLines(open.text, text);
            open.indented = false;
        }

        const next = items[index + 1];

        if (next !== undefined && !next.bullet && endsBlock(open, text, next.text)) {
            open = undefined;
        }
    }

    if (pending.length > 0) {
        throw new Error(`${name} has no table ${pending[0].caption ?? pending[0].header[0]}.`);
    }

    return blocks.map((block, index) => blockText(block, blocks[index - 1])).join("").trim();
}

/** The lines with their bullets: a bullet the PDF puts on a line of its own belongs to the line before it. */
function withBullets(lines)
{
    const result = [];

    for (const line of lines) {
        if (line === "•") {
            result.at(-1).bullet = true;
        } else {
            result.push({ text: line.replace(/^• /, ""), bullet: line.startsWith("• ") });
        }
    }

    return result;
}

/** Whether a line ends its paragraph or list item: the first word of the next line would have fitted on it. A paragraph also ends its sentence. */
function endsBlock(block, line, next)
{
    const room = layout.column - (block.kind === "item" || block.indented ? layout.indent : 0);
    const fits = width(`${line} ${next.split(" ")[0]}`) <= room;
    const sentenceEnds = /[.!?:”)]$/.test(line);
    return (fits && (block.kind === "item" || sentenceEnds)) || (sentenceEnds && runInTitle.test(next));
}

function width(text)
{
    const glyphs = [...text].filter((glyph) => glyph !== " ").reduce((total, glyph) => total + (glyphWidths[glyph] ?? layout.fallback), 0);
    return (glyphs * layout.size * layout.scale) / 1000 + layout.space * (text.split(" ").length - 1);
}

function blockText(block, previous)
{
    if (block.kind === "item") {
        return `${previous?.kind === "item" ? "\n" : "\n\n"}- ${block.text}`;
    }

    return `\n\n${block.kind === "paragraph" ? runIn(block.text) : block.text}`;
}

/** A paragraph that opens with a title, such as "At Higher Levels.", has it in bold italics, as the rules chapters write run-in headings. */
function runIn(text)
{
    const title = runInTitle.exec(text);
    return title === null ? text : `***${title[1]}*** ${text.slice(title[0].length)}`;
}

function tableText(spec, lines)
{
    const rows = [];

    for (const line of lines) {
        const cells = spec.row.exec(line);

        if (cells !== null && (rows.length === 0 || spec.wrap === undefined || !/^[a-z]/.test(line))) {
            rows.push(cells.slice(1));
        } else if (spec.wrap !== undefined && rows.length > 0) {
            rows.at(-1)[spec.wrap] = joinLines(rows.at(-1)[spec.wrap], line);
        } else {
            throw new Error(`The table ${spec.header.at(-1)} has a line that is no row: ${line}`);
        }
    }

    const table = [`| ${spec.columns.join(" | ")} |`, `|${spec.columns.map(() => "---").join("|")}|`, ...rows.map((cells) => `| ${cells.join(" | ")} |`)].join("\n");
    return spec.caption === undefined ? table : `**${spec.caption}**\n\n${table}`;
}

/** Joins two lines of a paragraph: a line that ends with a hyphen or a dash goes on without a space, since the SRD breaks no word across lines. */
function joinLines(text, line)
{
    return /[-—]$/.test(text) ? `${text}${line}` : `${text} ${line}`;
}

/** The page: its fields in the order of the header, the lists that name it, and its description. */
function pageText(spell, classes, aliases)
{
    const fields = { ...(aliases.length > 0 ? { aliases } : {}), category: "spell", ...spell.fields, "spell-lists": classes };
    const lines = Object.entries(fields).map(([field, value]) => `${field}: ${Array.isArray(value) ? `[${value.join(", ")}]` : scalar(value)}`);
    return `---\n${lines.join("\n")}\n---\n\n${spell.body}\n`;
}

/** A value as YAML writes it, in quotes only when it would not read back as itself. */
function scalar(value)
{
    const text = stringify(value, { lineWidth: 0 }).trimEnd();
    return parse(text) === value ? text : JSON.stringify(value);
}

function fileName(spell, taken)
{
    return taken.has(spell.name.toLowerCase()) ? `${spell.name} (spell)` : spell.name;
}

/** The names of the system's other pages, in lower case: a spell that shares one takes "(spell)". */
function otherPageNames()
{
    const names = new Set();

    for (const folder of readdirSync(world, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
        for (const file of readdirSync(join(world, folder.name)).filter((name) => name.endsWith(".md"))) {
            if (!isSpellPage(join(world, folder.name, file))) {
                names.add(file.slice(0, -3).toLowerCase());
            }
        }
    }

    return names;
}

function removeSpellPages()
{
    for (const file of readdirSync(join(world, "topics")).filter((name) => name.endsWith(".md"))) {
        if (isSpellPage(join(world, "topics", file))) {
            rmSync(join(world, "topics", file));
        }
    }
}

/** A page this script writes: a spell, or a class's spell list. */
function isSpellPage(path)
{
    return /^---\n(?:.*\n)*?category: spell( list)?\n/.test(readFileSync(path, "utf8").replaceAll("\r\n", "\n"));
}

function report(spells, lists, taken)
{
    const unlisted = spells.filter((spell) => !lists.has(spell.name)).map((spell) => spell.name);
    const renamed = spells.filter((spell) => fileName(spell, taken) !== pageName(spell.heading) || spell.heading.includes("/")).map((spell) => `${spell.heading} as ${fileName(spell, taken)}`);
    console.log(`${spells.length} spells written; in no list: ${unlisted.join(", ") || "none"}; renamed: ${renamed.join(", ") || "none"}.`);
}

/** A line of the PDF text as markdown takes it: the SRD's hyphen, written as four characters, becomes one; spaces are single, and none before a comma (Heroes' Feast). */
function clean(text)
{
    return text.replaceAll("-\u00ad\u2010\u2011", "-").replace(/\s+/g, " ").replaceAll(" ,", ",").trim();
}

/** A page name: a straight apostrophe, as every page of the system has, and a hyphen for the slash a file name cannot hold (Blindness/Deafness). */
function pageName(title)
{
    return title.replaceAll("’", "'").replaceAll("/", "-");
}
