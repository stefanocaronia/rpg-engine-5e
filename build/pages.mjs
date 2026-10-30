// The pages of the 5e system that its converters write: a page's file, the system's pages they write again or must not take the name of, and a page's name.
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";

const world = join(import.meta.dirname, "..", "world");

/** A page: its fields as YAML, each value in quotes only when it would not read back as itself, then its text. */
export function pageText(fields, body)
{
    const lines = Object.entries(fields).map(([field, value]) => `${field}: ${Array.isArray(value) ? `[${value.map(scalar).join(", ")}]` : scalar(value)}`);
    return `---\n${lines.join("\n")}\n---\n${body === "" ? "" : `\n${body}\n`}`;
}

/** The system's pages, each with its name, its folder in world/ and its fields. */
export function systemPages()
{
    return readdirSync(world, { withFileTypes: true }).filter((entry) => entry.isDirectory()).flatMap((folder) =>
        readdirSync(join(world, folder.name)).filter((file) => file.endsWith(".md")).map((file) => ({
            name: file.slice(0, -3),
            folder: folder.name,
            fields: fieldsOf(readFileSync(join(world, folder.name, file), "utf8")),
        }))
    );
}

/**
 * Writes the pages a converter makes in a folder of world/, in place of those it made before, which `own` picks among the system's pages; the fields a page
 * had that the converter does not write, given by hand after it ran, stay. A name that another page has, or that two of them share, throws: such a page takes
 * a specification in parentheses, as Shield (spell) beside the item Shield.
 */
export function writePages(folder, pages, own)
{
    const all = systemPages();
    const taken = new Set(all.filter((page) => !own(page)).map((page) => page.name.toLowerCase()));
    const names = pages.map((page) => page.name.toLowerCase());
    const clashing = pages.filter((page, index) => taken.has(names[index]) || names.indexOf(names[index]) !== index);

    if (clashing.length > 0) {
        throw new Error(`${clashing.map((page) => page.name).join(", ")}: the name of another page. Give it a specification in parentheses, as Shield (spell) beside the item Shield.`);
    }

    const before = new Map(all.filter(own).map((page) => [page.name.toLowerCase(), page.fields]));

    for (const page of all.filter(own)) {
        rmSync(join(world, page.folder, `${page.name}.md`));
    }

    for (const page of pages) {
        writeFileSync(join(world, folder, `${page.name}.md`), pageText(keptFields(before.get(page.name.toLowerCase()) ?? {}, page.fields), page.body));
    }

    return pages;
}

/** Writes a page in a folder of world/, keeping the fields its file had that the converter does not write, given by hand after it ran. */
export function writePage(folder, name, fields, body)
{
    const path = join(world, folder, `${name}.md`);
    writeFileSync(path, pageText(keptFields(existsSync(path) ? fieldsOf(readFileSync(path, "utf8")) : {}, fields), body));
}

/** A page name: a straight apostrophe, as every page of the system has. */
export function pageName(title)
{
    return title.replaceAll("’", "'");
}

/** The fields a converter writes, then those the page had that it does not write. */
function keptFields(had, fields)
{
    return { ...fields, ...Object.fromEntries(Object.entries(had).filter(([field]) => !(field in fields))) };
}

/** The fields of a page's text, its frontmatter. */
function fieldsOf(text)
{
    return parse(/^---\n([\s\S]*?)\n---/.exec(text.replaceAll("\r\n", "\n"))?.[1] ?? "") ?? {};
}

function scalar(value)
{
    const text = stringify(value, { lineWidth: 0 }).trimEnd();
    return parse(text) === value && !/[,[\]]/.test(text) ? text : JSON.stringify(value);
}
