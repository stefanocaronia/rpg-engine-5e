// The text of a translated SRD 5.1 as blocks and markdown, from the lines translation-lines.py writes: headings by their type, paragraphs by their indent or the space
// before them, run-in titles in bold italics, italics and bold, lists, and tables by the columns of their header and the shading of their rows.
import { readFileSync } from "node:fs";

// The left edge of each column, in points.
const margins = [57.6, 328.6];
// The type of the tables, smaller than the text's 10 pt.
const tableSize = 9.6;
// Lines farther apart than this, in sizes of their type, are two paragraphs: the stat blocks set paragraphs 15 pt apart, their lines 12.2.
const paragraphGap = 1.3;
// A table's line above the one before is in the next column: in another column of the page, or this far above, more than the tallest row.
const columnJump = 200;
// A word broken at the end of a line, as Illimi- tata: a hyphen after a letter, then a space and a lowercase letter; but the hyphen of a word left for the
// next, as the German Nah- und Fernkampf.
const brokenWord = /(\p{L}+)- (?=(\p{Ll}\p{L}*))(?!(?:und|oder|bzw|sowie|bis)\b)/gu;
// A compound's hyphen at the end of a line, before a capital or after a number: the German Nicht-Spieler- Charaktere, SG-14- Konstitutionsrettungswurf.
const brokenCompound = /([\p{L}\d]-) (?=\p{Lu})/gu;
// How the PDF read last breaks its words: its words, when a hyphen at the end of a line may break a word, as the German Übungs- bonus; and whether a
// hyphen before a capital is a compound's.
const breaks = { words: undefined, always: false, capitals: false, splits: {}, groups: {}, nounCapitals: false };
// A list item's lines after the first are indented: 9.4 pt in, as a bullet's text.
const indent = 5;

/** A translated PDF's lines, without the blank ones, its shaded rectangles by page and its outline: what translation-lines.py writes. */
export function readTranslation(path)
{
    const items = readFileSync(path, "utf8").split("\n").filter((text) => text !== "").map((text) => JSON.parse(text));
    // A letter and its accent as one character, as the German PDF writes some: u and its diaeresis.
    const lines = items.filter((item) => item.spans !== undefined).map((item) => ({
        ...item,
        spans: item.spans.map(([text, font, size, x0, x1]) => ({ text: text.normalize("NFC"), font, size, x0, x1 })),
    }));
    const fills = new Map(items.filter((item) => item.fills !== undefined).map((item) => [item.page, item.fills]));
    const outline = items.find((item) => item.outline !== undefined).outline.map(([level, title, page]) => ({ level, title, page }));
    return { lines, fills, outline };
}

/**
 * The blocks of a run of lines, in order: headings ({ kind: "heading", size, bold, text }), paragraphs and list items ({ kind: "paragraph" or "item", runs }),
 * and tables ({ kind: "table", header, rows }), each cell as runs. Every block has the page, column and top of its first line. A run is text in one style:
 * "" plain, "*" italic, "**" bold, "***" bold italic. The language gives the labels of the stat blocks' lines.
 */
export function readBlocks(lines, fills, language)
{
    breaks.words = language.softHyphens ? wordsOf(lines) : undefined;
    breaks.always = language.softHyphens === "always";
    breaks.capitals = language.compoundCapitals === true;
    breaks.splits = language.cellSplits ?? {};
    breaks.groups = language.headerGroups ?? {};
    breaks.nounCapitals = language.nounCapitals === true;
    const reader = new BlockReader(fills, language.creature, language.tableHeaders ?? {});

    for (const line of lines) {
        reader.read(line);
    }

    reader.close();
    return reader.blocks;
}

/**
 * Blocks as markdown: a blank line between blocks, none between the items of a list; a heading at the level the block was given. The blocks marked quoted,
 * a stat block set inside a text, are a quotation, with ">" on every line, the blank ones too.
 */
export function markdown(blocks)
{
    return blocks.map((block, index) => {
        const previous = blocks[index - 1];
        const separator = previous === undefined ? "" : block.kind === "item" && previous.kind === "item" ? "\n" : block.quoted && previous.quoted ? "\n>\n" : "\n\n";
        const text = blockText(block);
        return `${separator}${block.quoted ? text.split("\n").map((line) => (line === "" ? ">" : `> ${line}`)).join("\n") : text}`;
    }).join("").trim();
}

/** A block as markdown. */
export function blockText(block)
{
    if (block.kind === "heading") {
        return `${"#".repeat(block.level)} ${block.text}`;
    }

    if (block.kind === "item") {
        return `- ${runsText(block.runs)}`;
    }

    if (block.kind === "table") {
        return tableText(block);
    }

    // A step with its number in its bold title, "**1. Determinare la sorpresa.**", is an item of a numbered list, as the English text has it.
    const text = runsText(block.runs);
    const step = /^(\*\*\*?)(\d+)\.\s+/.exec(text);
    return step === null ? text : `${step[2]}. ${step[1]}${text.slice(step[0].length)}`;
}

/** Runs as markdown, with their styles; spaces stay outside the marks, and an asterisk of the text is escaped. */
export function runsText(runs)
{
    return joinRuns(runs).map((run) => {
        const text = run.text.replaceAll("*", "\\*");

        if (run.style === "" || text.trim() === "") {
            return text;
        }

        const [, before, inner, after] = /^(\s*)(.*?)(\s*)$/s.exec(text);
        return `${before}${run.style}${inner}${run.style}${after}`;
    }).join("").replace(/ {2,}/g, " ").replace(brokenWord, joined).replace(brokenCompound, (match, start) => (breaks.capitals ? start : match)).trim();
}

/** Runs as plain text, without their styles. */
export function plainText(runs)
{
    return runs.map((run) => run.text).join("").replace(/\s+/g, " ").replace(brokenWord, joined).replace(brokenCompound, (match, start) => (breaks.capitals ? start : match)).trim();
}

/**
 * A word broken at the end of a line, joined: with its hyphen, as Illimi-tata; without it, where the PDF breaks words, when the PDF writes the word whole
 * elsewhere and never with the hyphen, as Übungsbonus, or always, where its words take a hyphen before a capital only, as in German.
 */
function joined(match, first, second)
{
    const whole = `${first}${second}`.toLowerCase();
    return breaks.always || (breaks.words?.has(whole) && !breaks.words.has(`${first}-${second}`.toLowerCase())) ? first : `${first}-`;
}

/** The words of a PDF's lines, in lower case, those with a hyphen too, but at the end of a line. */
function wordsOf(lines)
{
    const words = new Set();

    for (const line of lines) {
        for (const match of line.spans.map((span) => span.text).join("").matchAll(/[\p{L}\d]+(?:-[\p{L}\d]+)*/gu)) {
            words.add(match[0].toLowerCase());
            match[0].split("-").forEach((part) => words.add(part.toLowerCase()));
        }
    }

    return words;
}

/** The style of a span, by its font. */
export function spanStyle(span)
{
    const bold = /Bold/.test(span.font);
    const italic = /Italic|Oblique/.test(span.font);
    return bold && italic ? "***" : bold ? "**" : italic ? "*" : "";
}

/** What a line is, by the type of its first span with text: blank, heading, table, item or text. */
export function lineKind(line)
{
    const first = line.spans.find((span) => span.text.trim() !== "");

    if (first === undefined) {
        return "blank";
    }

    if (first.text.trim() === "•") {
        return "item";
    }

    if (first.size <= tableSize && first.size > 2) {
        return "table";
    }

    // A heading in Calibri, or in Arial where the Spanish PDF sets one so: Objetos mágicos conscientes.
    return (first.font.startsWith("Calibri") || first.font.startsWith("Arial")) && !/Italic/.test(first.font) && first.size >= 11 ? "heading" : "text";
}

/** Reads the lines one after the other: what each one is depends on its type and on what came before it. */
class BlockReader
{
    blocks = [];
    /** The paragraph or list item that the next line of text may go on, if any. */
    open;
    /** The table that the next rows go into, if any. */
    table;
    /** Whether the last heading is a sidebar's title. */
    sidebar = false;
    previous;

    constructor(fills, creature, headers)
    {
        this.fills = fills;
        this.creature = creature;
        this.headers = headers;
    }

    read(line)
    {
        const kind = lineKind(line);

        if (kind === "blank") {
            this.open = undefined;
        } else if (kind === "heading") {
            this.heading(line);
        } else if (kind === "table" && !(this.sidebar && !isBoldLine(line) && (this.table === undefined || isSidebarText(line, this.table))) && !isTableNote(line) && !(this.open?.note && !isBoldLine(line))) {
            this.tableLine(line);
        } else {
            this.text(line, kind);
        }

        if (kind !== "blank") {
            this.previous = line;
        }
    }

    close()
    {
        this.open = undefined;

        if (this.table !== undefined) {
            this.blocks.push(finishedTable(this.table, this.fills, this.headers));
            this.table = undefined;
        }
    }

    /** A heading, or the next line of the one before, set at the same size just below it. */
    heading(line)
    {
        const first = line.spans.find((span) => span.text.trim() !== "");
        const text = line.spans.map((span) => span.text).join("").replace(/\s+/g, " ").trim();
        const last = this.blocks.at(-1);

        if (
            this.table === undefined && last?.kind === "heading" && this.previous === last.line && last.size === first.size && last.bold === /Bold/.test(first.font)
            && line.page === last.page && line.column === this.previous.column && line.top - this.previous.top > 0 && line.top - this.previous.top < first.size * 1.6
        ) {
            last.text = `${last.text} ${text}`.replace(brokenWord, joined).replace(brokenCompound, (match, start) => (breaks.capitals ? start : match));
            last.line = line;
            return;
        }

        this.close();
        this.blocks.push({ kind: "heading", size: first.size, bold: /Bold/.test(first.font), text, page: line.page, column: line.column, top: line.top, line });
        // A sidebar's title, in Calibri at 11 pt: the small lines after it are its text, not a table's, until a table's header in bold.
        this.sidebar = first.size === 11 && !/Bold/.test(first.font);
    }

    /** A line of text: it goes on the open paragraph or list item, unless something in it or before it starts a new one. */
    text(line, kind)
    {
        if (this.table !== undefined) {
            this.close();
        }

        const runs = line.spans.map((span) => ({ text: span.text, style: spanStyle(span) }));
        const first = line.spans.find((span) => span.text.trim() !== "");

        if (kind === "item") {
            const bullet = line.spans.indexOf(first);
            const itemRuns = trimStart(runs.slice(bullet + 1));
            const last = this.blocks.at(-1);

            // A bullet the PDF sets again at the top of the next column, before the rest of an item, as the French goat of terror's "ou jusqu'à ce que".
            // The item's last line runs to the end of its column, cut by the column's end.
            const full = this.previous !== undefined && Math.max(...this.previous.spans.map((span) => span.x1)) - margins[this.previous.column] > 200;

            if (
                last?.kind === "item" && full && (last.page !== line.page || last.column !== line.column) && /^\p{Ll}/u.test(itemRuns[0]?.text ?? "")
                && !/[.:;!?]\s*$/.test(plainText(last.runs))
            ) {
                last.runs.push({ text: " ", style: "" }, ...itemRuns);
                this.open = last;
                return;
            }

            this.open = { kind: "item", runs: itemRuns, page: line.page, column: line.column, top: line.top, x0: line.x0, size: first.size, font: family(line) };
            this.blocks.push(this.open);
            return;
        }

        if (this.continues(line, first)) {
            this.open.runs.push({ text: " ", style: "" }, ...runs);
            return;
        }

        this.open = { kind: "paragraph", runs: trimStart(runs), page: line.page, column: line.column, top: line.top, x0: line.x0, size: first.size, font: family(line), note: isTableNote(line) };
        this.blocks.push(this.open);
    }

    /** Whether a line of text goes on the open block. */
    continues(line, first)
    {
        const open = this.open;
        const previous = this.previous;

        if (open === undefined || previous === undefined || open !== this.blocks.at(-1)) {
            return false;
        }

        // A title in bold that the line broke goes on: "Catene animate (ricarica dopo un riposo lungo", then "o breve).".
        if (open.runs.every((run) => /Bold|\*\*/.test(run.style) || run.text.trim() === "") && !/[.:]\s*$/.test(open.runs.map((run) => run.text).join("")) && /Bold/.test(first.font)) {
            return true;
        }

        // An indent or a label opens a paragraph: the PDF indents with a space, and starts a run-in title or a label in bold.
        if (/^\s/.test(line.spans[0].text) || isLabel(line, this.creature)) {
            return false;
        }

        // A sidebar's text is set smaller than the text around it.
        if (first.size !== open.size) {
            return false;
        }

        // The lines of a list item, or of a paragraph that opens with a label and a colon, as Durata:, after the first are indented; a stat block's label
        // with a colon, as the German Versteinernder Blick:, is not a spell's.
        const label = open.runs.find((run) => run.text.trim() !== "");
        const spellLabel = label?.style === "**" && /:\s*$/.test(label.text) && open.size === 10 && open.font !== "Calibri";

        if ((open.kind === "item" || spellLabel) && line.x0 - margins[line.column] < open.x0 - margins[open.column] + indent) {
            return false;
        }

        if (line.page === previous.page && line.column === previous.column) {
            const gap = line.top - previous.top;
            // A line set a paragraph's space below the one before, which its sentence goes on into, as the French bulette's "ou de Force", goes on it.
            const sentence = gap <= first.size * 2 && /^\p{Ll}/u.test(first.text.trim()) && !/[.:!?]\s*$/.test(open.runs.map((run) => run.text).join(""));
            return gap > 0 && (gap <= first.size * paragraphGap || sentence);
        }

        return true;
    }

    /** A line of a table: a cell, or a row's cells. A table goes on across a column or a page, where its header may come again. */
    tableLine(line)
    {
        this.open = undefined;
        const cells = cellsOf(line);

        if (cells.length === 0) {
            return;
        }

        const header = cells.every((cell) => cell.runs.every((run) => run.style === "**" || run.text.trim() === ""));
        let table = this.table;
        const jump = table !== undefined && (line.page !== table.last.page || (line.column !== table.last.column && line.top < table.last.top - 100) || line.top < table.last.top - columnJump);
        // After a column or a page break, a header is the table's again only with the same words; another one starts a table, as Ideale after Tratti.
        const repeated = jump && cells.every((cell) => table.header.some((other) => plainText(other.runs) === plainText(cell.runs)));
        // The header again below a row the next column opens with, as the French barbarian's level 7 before it, is the table's own; a line of it with other
        // words, as Bindung after the W6 of Ideal, makes it another table's header, which starts with the lines set aside.
        const own = cells.every((cell) => table?.header.some((other) => plainText(other.runs) === plainText(cell.runs)));
        const again = table !== undefined && header && !jump && table.fragments.length > 1 && table.fragments.at(-1).started;

        if (again && own) {
            table.again = [...(table.again ?? []), line];
            table.last = line;
            return;
        }

        if (again && table.again?.length > 0) {
            const lines = [...table.again, line];
            this.close();

            for (const one of lines) {
                this.tableLine(one);
            }

            return;
        }

        if (table !== undefined && !header) {
            table.again = [];
        }

        const fresh = table !== undefined && header && table.body.length > 0 && (jump ? !repeated : line.top - table.last.top > 15);

        if (fresh) {
            this.close();
            table = undefined;
        }

        if (table === undefined) {
            table = { header: [], body: [], fragments: [], last: line };
            this.table = table;
            table.fragments.push({ page: line.page, offset: 0, column: line.column, started: false });
        } else if (jump) {
            table.fragments.push({ page: line.page, offset: margins[line.column] - margins[table.fragments[0].column], column: line.column, started: false, skipped: [] });
        }

        const fragment = table.fragments.at(-1);
        table.last = line;
        const previous = table.fragments.at(-2);
        const left = Math.min(...table.body.filter((cell) => !cell.carried).map((cell) => cell.x0));

        // A row's last lines at the top of the next column, before the header comes again, as the French madness's "rire ou pleurer.", go on the row.
        if (!header && !fragment.started && previous !== undefined && table.header.length > 0 && table.body.length > 0 && cells.every((cell) => cell.x0 - fragment.offset > left + 5)) {
            for (const cell of cells) {
                table.body.push({ ...cell, page: line.page, top: 10000 + line.top, ax0: cell.x0, x0: cell.x0 - fragment.offset, x1: cell.x1 - fragment.offset, fragment: previous, carried: true });
            }

            return;
        }

        if (header && !fragment.started && table.body.length > 0) {
            // A header's next line, as Competenza under Bonus di, belongs to the header that came again; a line with other words, as Difetto after the
            // d6 of Legame, is another table's header, which starts with the lines skipped.
            if (cells.every((cell) => table.header.some((other) => plainText(other.runs) === plainText(cell.runs)))) {
                fragment.skipped.push(line);
                return;
            }

            table.fragments.pop();
            this.close();

            for (const skipped of [...fragment.skipped, line]) {
                this.tableLine(skipped);
            }

            return;
        }

        for (const cell of cells) {
            const entry = { ...cell, page: line.page, top: line.top, ax0: cell.x0, x0: cell.x0 - fragment.offset, x1: cell.x1 - fragment.offset, fragment };
            (header && table.body.length === 0 ? table.header : table.body).push(entry);
        }

        if (!header || table.header.length === 0) {
            fragment.started = true;
        }
    }
}

/** Whether a small line of a sidebar after a table is its text again: one cell, as wide as the column or opening a paragraph with a space. */
function isSidebarText(line, table)
{
    const cells = cellsOf(line);
    const left = Math.min(...table.header.map((cell) => cell.ax0));
    return cells.length === 1 && table.header.length > 1 && (/^\s/.test(line.spans[0].text) || (cells[0].x0 - left < 3 && cells[0].x1 - cells[0].x0 > 150));
}

/** Whether a small line is a table's note, after it: "* Presente solo in mazzi con 22 carte", or the French "*Voir la section". */
function isTableNote(line)
{
    return /^\*\s?\p{L}/u.test(line.spans.map((span) => span.text).join("").trim());
}

/** Whether every span with text of a line is in bold, as a table's header. */
function isBoldLine(line)
{
    return line.spans.every((span) => span.text.trim() === "" || /Bold/.test(span.font));
}

/**
 * Whether a line opens with a label in bold: a run-in title or a label ending in a full stop or a colon, or a label of a stat block; or with a line of a
 * stat block's spells, as "1° livello (4 slot):".
 */
function isLabel(line, creature)
{
    const spans = line.spans.filter((span, index) => index > 0 || span.text.trim() !== "");
    const bold = [];

    for (const span of spans) {
        if (!/Bold/.test(span.font) && span.text.trim() !== "") {
            break;
        }

        bold.push(span.text);
    }

    const text = bold.join("").trim();
    // A formula's name in bold, then its equals sign: "CD del tiro salvezza del Ki =".
    const formula = text !== "" && /^\s*=/.test(spans.slice(bold.length).map((span) => span.text).join(""));
    // A title in italics opens a paragraph too, as the options of the rock gnome's Inventore: *Accendino.*
    const italic = /Italic/.test(spans[0]?.font ?? "") && !/Bold/.test(spans[0].font) && /^\p{Lu}[^.]{0,40}\.$/u.test(spans[0].text.trim());
    return (text !== "" && (/[.:=]$/.test(text) || creature.labels.test(text))) || formula || italic || creature.spellLines.test(line.spans.map((span) => span.text).join("").trim());
}

/** The family of a line's type, by its first span with text: Cambria for the text, Calibri for the stat blocks and the sidebars. */
function family(line)
{
    return line.spans.find((span) => span.text.trim() !== "" && span.text.trim() !== "•")?.font.split("-")[0] ?? "";
}

/** The cells of a line of a table: its spans, those closer than a word space joined. */
function cellsOf(line)
{
    const cells = [];

    for (const span of line.spans) {
        if (span.text.trim() === "") {
            continue;
        }

        const last = cells.at(-1);
        const run = { text: span.text, style: spanStyle(span) };

        if (last !== undefined && span.x0 - last.x1 < 3) {
            last.runs.push(run);
            last.x1 = span.x1;
        } else {
            cells.push({ runs: [run], x0: span.x0, x1: span.x1, size: span.size });
        }
    }

    return cells.flatMap(splitCell);
}

/**
 * A cell the PDF sets as one span over two columns, among the language's splits, as the Spanish header's "competencia Rasgos": a cell for each part, as wide
 * as its share of the letters.
 */
function splitCell(cell)
{
    const text = plainText(cell.runs);
    const parts = breaks.splits[text];

    if (parts === undefined) {
        return [cell];
    }

    const width = (cell.x1 - cell.x0) / text.length;
    let at = 0;
    return parts.map((part) => {
        const start = text.indexOf(part, at);
        at = start + part.length;
        return { runs: [{ text: part, style: cell.runs[0].style }], x0: cell.x0 + start * width, x1: cell.x0 + at * width, size: cell.size };
    });
}

/**
 * A table's cells as its header and rows: the columns by the header's cells, the rows by the shading of every other row, or by a first cell. A header the
 * PDF sets as one cell, among the language's headers, has the columns of the rows, with its names.
 */
function finishedTable(table, fills, headers = {})
{
    const groups = table.header.filter((cell) => isGroupHeader(cell, table.header));
    const headerCells = table.header.filter((cell) => !groups.includes(cell));
    const names = headerCells.length === 1 ? headers[plainText(headerCells[0].runs)] : undefined;

    if (names !== undefined) {
        const columns = columnsOf(table.body);
        const rows = table.fragments.flatMap((fragment) => rowsOf(table.body.filter((cell) => cell.fragment === fragment), fills.get(fragment.page) ?? []));
        return { kind: "table", header: names.map((name) => [{ text: name, style: "" }]), rows: rows.map((row) => columnTexts(columns, row)), page: table.header[0].page, columns };
    }

    const columns = widened(columnsOf(headerCells.length > 0 ? headerCells : table.body), table.body);
    const header = headerCells.length > 0 ? columnTexts(columns, headerCells).map((cell, index) => groupedHeader(cell, columns[index], groups)) : undefined;
    const rows = table.fragments.flatMap((fragment) => fragmentRows(table.body.filter((cell) => cell.fragment === fragment), fills.get(fragment.page) ?? []));
    return { kind: "table", header, rows: rows.map((row) => columnTexts(columns, row)), page: (table.header[0] ?? table.body[0]).page, columns };
}

/** The rows of a fragment of a table, the lines of its last row carried to the next column on that row. */
function fragmentRows(cells, fills)
{
    const rows = rowsOf(cells.filter((cell) => !cell.carried), fills);
    rows.at(-1)?.push(...cells.filter((cell) => cell.carried));
    return rows;
}

/**
 * Whether a header's cell names a group of columns, over two or more of the cells below it, as "—Slot incantesimo per livello di incantesimo—" over 1°…9°: the
 * columns are those below it, as the English tables have them.
 */
function isGroupHeader(cell, header)
{
    return header.filter((other) => other.top > cell.top + 5 && overlap(other, cell) > 0).length >= 2;
}

/**
 * A column's header under a group's: the group's words before its own, as "Distanza percorsa ogni minuto" under "Distanza percorsa ogni..."; a group between
 * dashes, as "—Slot incantesimo per livello di incantesimo—", names its columns no further, as the English tables have it.
 */
function groupedHeader(cell, column, groups)
{
    // A group's lines, one over the other, are one group: "—Slot incantesimo per livello" over "di incantesimo—". A group the PDF sets off its columns, as the
    // French "Distance parcourue par…", names its columns in the language's groups.
    const lines = groups.filter((one) => {
        const names = breaks.groups[plainText(one.runs)];
        return names === undefined ? overlap(one, column) > 0 : names.includes(plainText(cell));
    });
    const stacked = groups.filter((one) => lines.some((line) => overlap(one, line) > 0));
    const group = plainText(stacked.sort((a, b) => a.top - b.top).flatMap((one) => [{ text: " ", style: "" }, ...one.runs]));

    if (group === "" || /^—.*—$/.test(group)) {
        return cell;
    }

    // The column's name in lower case after its group's, but where the language writes its nouns in capitals, as the German Minute.
    const name = breaks.nounCapitals ? plainText(cell) : plainText(cell).toLowerCase();
    return [{ text: `${group.replace(/(?:\.{3}|…)$/, "")} ${name}`, style: "" }];
}

/**
 * The columns as wide as the cells under them, where a header is narrower than its column, as Effetto set in the middle of its text: a cell under one column
 * only widens it, so that a short line of a cell, as "essa svanisce.", finds its column.
 */
function widened(columns, cells)
{
    const result = columns.map((column) => ({ ...column }));

    for (const cell of cells) {
        const under = columns.filter((column) => overlap(column, cell) > 0);

        if (under.length === 1) {
            const column = result[columns.indexOf(under[0])];
            column.x0 = Math.min(column.x0, cell.x0);
            column.x1 = Math.max(column.x1, cell.x1);
        }
    }

    return result;
}

/** The columns of a table, by its header's cells: those one above the other, as "Bonus di" over "Competenza", are one column. */
function columnsOf(cells)
{
    const columns = [];

    for (const cell of [...cells].sort((a, b) => a.x0 - b.x0)) {
        const column = columns.find((other) => overlap(other, cell) > 0);

        if (column === undefined) {
            columns.push({ x0: cell.x0, x1: cell.x1 });
        } else {
            column.x0 = Math.min(column.x0, cell.x0);
            column.x1 = Math.max(column.x1, cell.x1);
        }
    }

    return columns.sort((a, b) => a.x0 - b.x0);
}

/** The rows of a fragment of a table: a shaded rectangle holds a row, and the lines between two of them are the row between; without shading, by its cells. */
function rowsOf(cells, fills)
{
    const shades = fills.filter((fill) => fill[3] - fill[1] < 300);
    // A shaded cell has a rectangle for its row's height and one for each of its lines: the tallest is the row's.
    const shadeOf = (cell) => shades.filter((fill) => middleOf(cell) >= fill[1] && middleOf(cell) <= fill[3] && cell.ax0 >= fill[0] - 1 && cell.ax0 <= fill[2]).sort((a, b) => b[3] - b[1] - (a[3] - a[1]))[0];
    // Rectangles one under the other, a line each, as the French exhaustion's, are a sidebar's background, not the shading of every other row.
    const used = [...new Set(cells.map(shadeOf).filter((fill) => fill !== undefined))].sort((a, b) => a[1] - b[1]);
    const background = used.length > 2 && used.every((fill, index) => index === 0 || Math.abs(fill[1] - used[index - 1][3]) < 1);
    const shaded = used.length > 0 && !background;
    const rows = [];
    let row;
    let key;

    for (const cell of cells) {
        const shade = shaded ? shadeOf(cell) : undefined;
        const band = !shaded ? undefined : shade !== undefined ? `shade ${shade[1]}` : `after ${Math.max(0, ...shades.filter((fill) => fill[3] <= middleOf(cell) && cell.ax0 >= fill[0] - 1 && cell.ax0 <= fill[2]).map((fill) => fill[3]))}`;

        if (row === undefined || (shaded ? band !== key : startsRow(row, cell))) {
            row = [];
            rows.push(row);
        }

        key = band;
        row.push(cell);
    }

    return rows;
}

function middleOf(cell)
{
    return cell.top + cell.size * 0.6;
}

/** Without shading, a cell lower than the row's first starts a row when it is at the row's left edge. */
function startsRow(row, cell)
{
    return cell.top > row[0].top + 1 && cell.x0 <= Math.min(...row.map((other) => other.x0)) + 2;
}

/** The text of each column of a row: its cells, by the column they overlap most or lie nearest to. */
function columnTexts(columns, cells)
{
    const texts = columns.map(() => []);

    for (const cell of [...cells].sort((a, b) => a.top - b.top || a.x0 - b.x0)) {
        let best = 0;

        for (const [index, column] of columns.entries()) {
            const score = overlap(column, cell) - Math.abs(center(column) - center(cell)) / 1000;
            const bestScore = overlap(columns[best], cell) - Math.abs(center(columns[best]) - center(cell)) / 1000;

            if (score > bestScore) {
                best = index;
            }
        }

        const last = texts[best].at(-1);

        if (last !== undefined && /\p{L}-\s*$/u.test(last.text) && /^\p{Ll}/u.test(cell.runs[0]?.text ?? "") && !/^(?:und|oder|bzw|sowie|bis)\b/.test(cell.runs[0].text)) {
            // A hyphen at the end of a line of a narrow cell, as Illimi- before tata, is the break of the line: the word goes on.
            last.text = last.text.replace(/-\s*$/, "");
        } else if (last !== undefined) {
            texts[best].push({ text: " ", style: "" });
        }

        texts[best].push(...cell.runs);
    }

    return texts;
}

function overlap(a, b)
{
    return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
}

function center(a)
{
    return (a.x0 + a.x1) / 2;
}

function tableText(block)
{
    const width = block.columns.length;
    const row = (cells) => `| ${cells.map((cell) => runsText(cell).replaceAll("|", "\\|")).join(" | ")} |`.replace(/ {2,}/g, " ");
    // A header in plain type, as its row says it is one; the PDF sets it in bold.
    const header = (block.header ?? Array.from({ length: width }, () => [])).map((cell) => cell.map((run) => ({ ...run, style: run.style === "**" ? "" : run.style })));
    return [row(header), `|${"---|".repeat(width)}`, ...block.rows.map(row)].join("\n");
}

/** Runs of the same style one after the other, as one. */
export function joinRuns(runs)
{
    const joined = [];

    for (const run of runs) {
        const last = joined.at(-1);

        if (last !== undefined && (last.style === run.style || run.text.trim() === "")) {
            last.text += run.text;
        } else if (last !== undefined && last.text.trim() === "") {
            joined.pop();
            joined.push({ text: last.text + run.text, style: run.style });
        } else {
            joined.push({ ...run });
        }
    }

    return joined;
}

function trimStart(runs)
{
    const trimmed = runs.map((run) => ({ ...run }));

    while (trimmed.length > 0 && trimmed[0].text.trim() === "") {
        trimmed.shift();
    }

    if (trimmed.length > 0) {
        trimmed[0].text = trimmed[0].text.trimStart();
    }

    return trimmed;
}
