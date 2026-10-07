// The text of the SRD 5.1 as markdown, from the lines of its PDF that lines.py writes: headings by their size, paragraphs by their indent, run-in titles in
// bold italics, italics and bold, lists, tables by the columns of their header, the sidebars, and the stat blocks set inside a text.
import { readFileSync } from "node:fs";

// The left edge of each column, in points: positions are read from it. A line that starts 5 pt in or more is indented: a paragraph's first line, the rows
// of a group in a table, and the lines after the first of a list item or of a line that opens with a label.
const margins = [57.6, 328.6];
const indent = 5;
// The headings by the size of their type; a sidebar's title is set smaller, at 10.8 pt.
const headingLevels = new Map([[25.9, 1], [18, 2], [13.9, 3], [12, 4]]);
// Words closer than this are one cell of a table: the SRD sets its words 2 pt apart, its columns 10 pt or more.
const gutter = 4.5;
// The space between two lines of a paragraph, in points: more than this before a line starts a new block, as after the type line of a magic item, or
// after a list.
const paragraphGap = 16;
const listGap = 13.5;
// A line of text runs to about 225 pt: one that ends before this is the last of its block, as the last item of a list at the foot of a column.
const shortLine = 150;

/** The lines of the SRD's pages from first to last, as lines.py writes them, without the footer of each page; positions are from the column's left edge. */
export function readLines(path, first, last)
{
    return readFileSync(path, "utf8").split("\n").filter((text) => text !== "").map((text) => JSON.parse(text))
        .filter((line) => line.page >= first && line.page <= last)
        .map((line) => ({ ...line, words: line.words.map(([text, x0, x1, font, size]) => ({ text: clean(text), x0: x0 - margins[line.column], x1: x1 - margins[line.column], font, size })) }))
        .filter((line) => !/^System Reference Document 5\.1 \d+$/.test(line.words.map((word) => word.text).join(" ")));
}

/**
 * The blocks of a run of lines, in order: headings ({ kind: "heading", level, text }), paragraphs and list items ({ kind: "paragraph" or "item", runs }), and
 * tables ({ kind: "table", caption, header, rows, notes }), each row with its cells as runs, the rows that head a group marked heading, those under one
 * with its title in group. A run is text in one style: "" plain, "*" italic, "**" bold, "***" bold italic. The blocks of a stat block set inside the text
 * are marked quoted.
 */
export function readBlocks(lines)
{
    const reader = new BlockReader();
    lines.forEach((line, index) => reader.read(line, lines[index + 1]));
    return reader.blocks;
}

/**
 * Blocks as markdown: a blank line between blocks, none between the items of a list. The blocks of a stat block are a quotation, with ">" on every line,
 * the blank ones too, so that the text after it does not read as its actions.
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

/** Runs as markdown, with their styles; an asterisk of the text is escaped. */
export function runsText(runs)
{
    return runs.map((run) => `${run.space ? " " : ""}${run.style}${run.text.replaceAll("*", "\\*")}${run.style}`).join("");
}

/** Runs as plain text, without their styles. */
export function plainText(runs)
{
    return runs.map((run) => `${run.space ? " " : ""}${run.text}`).join("");
}

/** Reads the lines one after the other: what each one is depends on its type and on what came before it. */
class BlockReader
{
    blocks = [];
    /** The paragraph or list item that the next line of text may go on, if any. */
    open;
    /** The table that the next rows go into, if any. */
    table;
    /** Whether the lines in small type are a sidebar's text, rather than a table's rows. */
    sidebar = false;
    /** The level of the last heading, below which a sidebar's title goes. */
    level = 1;
    /** Whether the lines are those of a stat block, from its caption on: its blocks are marked quoted. */
    quoting = false;
    previous;

    read(line, next)
    {
        const kind = lineKind(line);
        this.quoting &&= ["abilities", "stat heading", "stat text"].includes(kind);

        if (kind === "heading") {
            this.heading(line);
        } else if (kind === "sidebar title") {
            this.close();
            this.push({ kind: "heading", level: this.level <= 2 ? this.level + 1 : this.level, text: wordsText(line.words) });
            this.sidebar = true;
        } else if (kind === "caption") {
            this.caption(line, next);
        } else if (kind === "table header") {
            this.tableHeader(line);
        } else if (kind === "small" && !this.sidebar) {
            this.tableLine(line);
        } else if (kind === "abilities") {
            this.abilities(line);
        } else if (kind === "stat heading") {
            this.close();
            this.push({ kind: "paragraph", runs: [{ style: "**", text: wordsText(line.words), space: false }] });
        } else {
            this.text(line);
        }

        this.previous = line;
    }

    /** Adds a block, marked quoted when it is part of a stat block. */
    push(block)
    {
        if (this.quoting) {
            block.quoted = true;
        }

        this.blocks.push(block);
    }

    /** A heading; one the PDF breaks over two lines, as Amulet of Proof against Detection and Location, is joined. */
    heading(line)
    {
        const level = headingLevels.get(line.words[0].size);
        const last = this.blocks.at(-1);

        if (level === undefined) {
            throw new Error(`A heading of an unknown size, ${line.words[0].size} pt, p. ${line.page}: ${wordsText(line.words)}`);
        }

        if (last?.kind === "heading" && last.level === level && lineKind(this.previous) === "heading" && line.top - this.previous.top < 20) {
            last.text = `${last.text} ${wordsText(line.words)}`;
            return;
        }

        this.close();
        this.push({ kind: "heading", level, text: wordsText(line.words) });
        this.level = level;
    }

    /** A bold caption: of the table whose header follows, or of a stat block set inside the text, as the Avatar of Death of the Deck of Many Things. */
    caption(line, next)
    {
        this.close();
        const text = wordsText(line.words);

        if (next !== undefined && lineKind(next) === "table header") {
            this.table = { kind: "table", caption: text, headerLines: [], rows: [], notes: [] };
            this.push(this.table);
        } else {
            this.quoting = true;
            this.push({ kind: "paragraph", runs: [{ style: "**", text, space: false }] });
        }
    }

    /** A line of a table's header: the first opens a table without a caption; a header may take two lines, as Carrying over Capacity. */
    tableHeader(line)
    {
        if (this.table === undefined || this.table.rows.length > 0) {
            this.close();
            this.table = { kind: "table", caption: undefined, headerLines: [], rows: [], notes: [] };
            this.push(this.table);
        }

        this.table.headerLines.push(line);
    }

    /**
     * A line of a table: a row, the next line of a row whose first cell is empty, the title of a group, or a note under the table that opens with an
     * asterisk, with the lines that follow it.
     */
    tableLine(line)
    {
        const table = this.table;

        if (table === undefined) {
            throw new Error(`A line in small type outside a table or a sidebar, p. ${line.page}: ${wordsText(line.words)}`);
        }

        if (line.words[0].text.startsWith("*") || table.notes.length > 0) {
            if (line.words[0].text.startsWith("*")) {
                table.notes.push([]);
            }

            appendWords(table.notes.at(-1), line.words);
            return;
        }

        table.columns ??= columnsOf(table.headerLines);
        table.header ??= table.columns.map((column) => column.title);
        const cells = cellsOf(table.columns, line.words);
        const last = table.rows.at(-1);

        if (cells[0].length === 0 && last !== undefined) {
            cells.forEach((words, index) => appendWords(last.cells[index], words));
            return;
        }

        const row = { cells: cells.map((words) => appendWords([], words)) };
        const heading = cells.slice(1).every((words) => words.length === 0) && line.words.every((word) => styleOf(word.font) === "*");

        if (heading) {
            row.heading = true;
            table.group = plainText(row.cells[0]);
        } else if (line.words[0].x0 >= indent && table.group !== undefined) {
            row.group = table.group;
        } else {
            table.group = undefined;
        }

        table.rows.push(row);
    }

    /** The ability scores of a stat block: their names, then their scores, each with its modifier. */
    abilities(line)
    {
        if (line.words[0].text === "STR") {
            this.close();
            this.table = { kind: "table", caption: undefined, header: line.words.map((word) => word.text), rows: [], notes: [] };
            this.push(this.table);
        } else {
            const scores = wordsText(line.words).match(/\d+ \([+−-]\d+\)/g) ?? [];
            this.table.rows.push({ cells: scores.map((score) => [{ style: "", text: score, space: false }]) });
            this.close();
        }
    }

    /**
     * A line of text, of the body, of a sidebar or of a stat block: a new paragraph or list item, or the next line of the open one. A paragraph opens with an
     * indent, a run-in title, a label in bold (a stat block's Armor Class), or after a wider space; a list item with its bullet. The lines after the first
     * of a list item, or of a line with a label, are indented: an indented line goes on with them, and a line at the margin opens a paragraph.
     */
    text(line)
    {
        const bullet = line.words[0].text === "•";
        const words = bullet ? line.words.slice(1) : line.words;
        const style = styleOf(words[0].font);
        const label = style === "**" && line.words[0].x0 < indent;
        const type = `${words[0].font.split("-")[0]} ${words[0].size}`;

        if (bullet || this.opens(line, style, type)) {
            this.close();
            this.sidebar = lineKind(line) === "small";
            this.open = { kind: bullet ? "item" : "paragraph", runs: [], type, ...(label ? { hanging: true } : {}) };
            this.push(this.open);
        }

        appendWords(this.open.runs, words);
    }

    /** Whether a line of text opens a paragraph, rather than going on with the open one. */
    opens(line, style, type)
    {
        const open = this.open;

        if (open === undefined || open.type !== type) {
            return true;
        }

        const indented = line.words[0].x0 >= indent;
        const sameColumn = this.previous.page === line.page && this.previous.column === line.column;
        const gap = sameColumn ? line.top - this.previous.top : 0;
        const hanging = open.kind === "item" || open.hanging === true;
        const title = style === "***" && open.runs.at(-1)?.style !== "***";
        // At the head of a column, where the space between lines says nothing, a list item whose last line was short has ended.
        const itemEnded = open.kind === "item" && (sameColumn ? gap > listGap : this.previous.words.at(-1).x1 < shortLine);
        return title || (style === "**" && !indented) || gap > paragraphGap || itemEnded || (hanging ? !indented : indented);
    }

    /** Ends the open paragraph, table and sidebar. */
    close()
    {
        this.open = undefined;
        this.table = undefined;
        this.sidebar = false;
    }
}

/**
 * What a line is, by the type of its first word: a heading (GillSans, 12 pt or more), a sidebar's title (GillSans, 10.8 pt), a caption (Calibri bold, 12 pt), a
 * table's header (Calibri bold, 8.9 pt) or another line in small type (a table's row, a note, a sidebar's text), the ability scores, the headings and the text of a
 * stat block (Calibri, 9.8 and 10.8 pt), or text (Cambria, and the bullets of a list).
 */
function lineKind(line)
{
    const { font, size, text } = line.words[0];

    if (font.startsWith("GillSans")) {
        return size >= 12 ? "heading" : "sidebar title";
    }

    if (font.startsWith("Cambria") || font === "Symbol") {
        return "text";
    }

    if (size >= 12) {
        return "caption";
    }

    if (size < 9.5) {
        return font === "Calibri-Bold" ? "table header" : "small";
    }

    if (text === "STR" || /^\d+ \([+−-]\d+\)/.test(wordsText(line.words))) {
        return "abilities";
    }

    return size > 10 ? "stat heading" : "stat text";
}

/**
 * The columns of a table from its header: the words of each title closer than a gutter. A header on two lines, as Carrying over Capacity, joins each word of
 * the shorter line to the title it stands over or under.
 */
function columnsOf(headerLines)
{
    const lines = headerLines.map((line) => chunksOf(line.words));
    const main = lines.reduce((best, chunks) => (chunks.length > best.length ? chunks : best));
    const columns = main.map((chunk) => ({ x0: chunk.x0, x1: chunk.x1, title: wordsText(chunk.words) }));

    for (const chunks of lines.filter((chunks) => chunks !== main)) {
        const above = lines.indexOf(chunks) < lines.indexOf(main);

        for (const chunk of chunks) {
            const column = columns[columnOf(columns, chunk)];
            column.title = above ? `${wordsText(chunk.words)} ${column.title}` : `${column.title} ${wordsText(chunk.words)}`;
        }
    }

    return columns;
}

/** The words of a row in each column: the words closer than a gutter go together, into the column their stretch overlaps most, or the nearest. */
function cellsOf(columns, words)
{
    const cells = columns.map(() => []);

    for (const chunk of chunksOf(words)) {
        cells[columnOf(columns, chunk)].push(...chunk.words);
    }

    return cells;
}

function chunksOf(words)
{
    const chunks = [];

    for (const word of words) {
        const last = chunks.at(-1);

        if (last !== undefined && word.x0 - last.x1 < gutter) {
            last.words.push(word);
            last.x1 = word.x1;
        } else {
            chunks.push({ x0: word.x0, x1: word.x1, words: [word] });
        }
    }

    return chunks;
}

function columnOf(columns, chunk)
{
    const overlap = (column) => Math.min(column.x1, chunk.x1) - Math.max(column.x0, chunk.x0);
    return columns.reduce((best, column, index) => (overlap(column) > overlap(columns[best]) ? index : best), 0);
}

/**
 * Adds the words of a line to runs: a word in the style of the last run goes on it, with a space where the PDF sets one, as does punctuation after plain
 * text, as the italic period after "a berserker"; a new line goes on with a space, but for one that follows a hyphen or a dash, since the SRD breaks no word
 * across lines.
 */
function appendWords(runs, words)
{
    words.forEach((word, index) => {
        const last = runs.at(-1);
        const style = last?.style === "" && /^[.,;:]+$/.test(word.text) ? "" : styleOf(word.font);
        const space = last === undefined ? false : index === 0 ? !/[-—]$/.test(last.text) : word.x0 - words[index - 1].x1 > 1;

        if (last !== undefined && last.style === style) {
            last.text += `${space ? " " : ""}${word.text}`;
        } else {
            runs.push({ style, text: word.text, space });
        }
    });

    return runs;
}

/** The words of a line or a heading as text: a space where the PDF sets one, none where it sets another font right after a word, as a period. */
function wordsText(words)
{
    return words.map((word, index) => `${index > 0 && word.x0 - words[index - 1].x1 > 1 ? " " : ""}${word.text}`).join("");
}

/** The style of a font as markdown writes it: bold italic, bold, italic or plain. */
function styleOf(font)
{
    const bold = font.includes("Bold");
    const italic = font.includes("Ita");
    return bold && italic ? "***" : bold ? "**" : italic ? "*" : "";
}

function blockText(block)
{
    if (block.kind === "heading") {
        return `${"#".repeat(block.level)} ${block.text}`;
    }

    if (block.kind === "item") {
        return `- ${runsText(block.runs)}`;
    }

    return block.kind === "table" ? tableText(block) : runsText(block.runs);
}

/** A table as markdown, under its caption in bold, with the rows that head a group in bold, as the Armor and Weapons tables write them, and its notes after it. */
function tableText(table)
{
    const line = (cells) => `|${cells.map((cell) => (cell === "" ? " " : ` ${cell} `)).join("|")}|`;
    const rows = table.rows.map((row) => line(row.cells.map((runs, index) => (row.heading && index === 0 ? `**${plainText(runs)}**` : runsText(runs)))));
    const text = [line(table.header), `|${table.header.map(() => "---").join("|")}|`, ...rows].join("\n");
    const notes = table.notes.map((note) => `\n\n${runsText(note)}`).join("");
    return `${table.caption === undefined ? "" : `**${table.caption}**\n\n`}${text}${notes}`;
}

/** A word of the PDF as markdown takes it: the SRD's hyphen, written as three or four characters, becomes one, and the figure dash of a few ranges an en dash. */
function clean(text)
{
    return text.replace(/-\u00ad\u2010\u2011?/g, "-").replaceAll("\u2012", "–");
}
