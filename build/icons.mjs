// Gives each creature and each item its icon (D-267, D-431): node systems/5e/build/icons.mjs <game-icons.net's svg folder, ffffff/transparent/1x1>
// creature-icons.json and item-icons.json name an icon, author/slug, for every page in world/creatures and world/items; the icons used are copied to images/<slug>.svg (<slug>-<author>.svg when two
// share a name), each page links its own in image, and LICENSE.md credits their authors. Run it again after monsters.mjs, gear.mjs, equipment.mjs or magic-items.mjs, which write the pages anew.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const system = join(import.meta.dirname, "..");
const images = join(system, "images");
const licensePath = join(system, "LICENSE.md");
const creditStart = "The icons in `images/` are from game-icons.net";

const [source] = process.argv.slice(2);

if (source === undefined || !existsSync(source)) {
    console.error("Usage: node systems/5e/build/icons.mjs <the folder of game-icons.net's svg icons, ffffff/transparent/1x1, with a folder for each author>");
    process.exit(1);
}

// Each kind of page with its folder and its icons.
const kinds = ["creatures", "items"].map((folder) => {
    const icons = JSON.parse(readFileSync(join(import.meta.dirname, `${folder.slice(0, -1)}-icons.json`), "utf8"));
    const pages = readdirSync(join(system, "world", folder)).filter((name) => name.endsWith(".md")).map((name) => name.slice(0, -3));
    checkMapping(folder, pages, icons);
    return { folder, icons, pages };
});

rmSync(images, { recursive: true, force: true });
mkdirSync(images);
const used = [...new Set(kinds.flatMap((kind) => Object.values(kind.icons)))];
const fileOf = new Map(used.map((icon) => [icon, fileName(icon, used)]));
const authors = [...new Set(used.map((icon) => icon.split("/")[0]))];

for (const icon of used) {
    copyFileSync(join(source, `${icon}.svg`), join(images, fileOf.get(icon)));
}

for (const { folder, icons, pages } of kinds) {
    for (const page of pages) {
        const path = join(system, "world", folder, `${page}.md`);
        writeFileSync(path, withImage(readFileSync(path, "utf8"), fileOf.get(icons[page])));
    }
}

const names = authorNames(join(source, "..", "..", "..", "license.txt"));
const unnamed = authors.filter((folder) => !names.has(folderKey(folder)));

if (unnamed.length > 0) {
    throw new Error(`license.txt does not name the author of ${unnamed.join(", ")}: choose icons by authors it credits.`);
}

writeFileSync(licensePath, withCredit(readFileSync(licensePath, "utf8"), authors.map((folder) => names.get(folderKey(folder)))));
console.log(`${kinds.map((kind) => `${kind.pages.length} ${kind.folder}`).join(", ")}, ${used.length} icons by ${authors.length} authors.`);

/** Every page of a kind has an icon, and every icon names a page and a file. */
function checkMapping(folder, pages, icons)
{
    const missing = pages.filter((page) => icons[page] === undefined);
    const unknown = Object.keys(icons).filter((name) => !pages.includes(name));
    const absent = Object.values(icons).filter((icon) => !existsSync(join(source, `${icon}.svg`)));

    if (missing.length + unknown.length + absent.length > 0) {
        throw new Error(`${folder.slice(0, -1)}-icons.json: without an icon ${missing.join(", ") || "none"}; no such page ${unknown.join(", ") || "none"}; no such icon ${absent.join(", ") || "none"}.`);
    }
}

/** The file an icon gets in images/: its name, such as wolf-head.svg, or with its author's after it when two authors' icons share the name, as cultist-lorc.svg. */
function fileName(icon, used)
{
    const [author, slug] = icon.split("/");
    const shared = used.some((other) => other !== icon && other.endsWith(`/${slug}`));
    return shared ? `${slug}-${author}.svg` : `${slug}.svg`;
}

/** The page with its image field set to the icon, the last field of its frontmatter. */
function withImage(text, fileName)
{
    const match = /^---\n([\s\S]*?\n)---\n/.exec(text);

    if (match === null) {
        throw new Error("A page has no frontmatter.");
    }

    const fields = match[1].replace(/^image:.*\n/m, "");
    return `---\n${fields}image: "[[${fileName}]]"\n---\n${text.slice(match[0].length)}`;
}

/** The license with the paragraph that credits the icons' authors, before its last line. */
function withCredit(text, authors)
{
    const credit = `${creditStart} (https://game-icons.net), under the Creative Commons Attribution 3.0 Unported License (CC-BY-3.0, `
        + `https://creativecommons.org/licenses/by/3.0/): icons made by ${list(authors.sort())}, available on https://game-icons.net. `
        + "Changes: none; they are the white icons on a transparent background, named as on game-icons.net, with the author's name after it when two have the same.";
    const paragraphs = text.trimEnd().split("\n\n").filter((paragraph) => !paragraph.startsWith(creditStart));
    return [...paragraphs.slice(0, -1), credit, paragraphs.at(-1)].join("\n\n") + "\n";
}

/** The authors' names as license.txt writes them, by folderKey. */
function authorNames(path)
{
    const lines = existsSync(path) ? readFileSync(path, "utf8").split("\n") : [];
    const names = lines.map((line) => /^- ([^,]+?)(?:,| -|$)/.exec(line.trim())?.[1]).filter((name) => name !== undefined);
    return new Map(names.map((name) => [folderKey(name), name]));
}

/** An author's name or folder as the two are compared: andymeneely for Andy Meneely and for andymeneely, heavenlydog for HeavenlyDog and heavenly-dog. */
function folderKey(name)
{
    return name.toLowerCase().replace(/[\s-]/g, "");
}

function list(names)
{
    return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
