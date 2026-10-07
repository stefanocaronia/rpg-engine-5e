// Writes the armor, shield and weapons of the SRD 5.1 as pages in world/items, from the tables of rules/Equipment.md (pp. 62–66): node systems/5e/build/equipment.mjs
// Each armor gives its Armor Class and each weapon its attack and damage as formulas worked out on who has it equipped (PRO-5, D-231).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";

const system = join(import.meta.dirname, "..");
const items = join(system, "world", "items");
const chapter = readFileSync(join(system, "rules", "Equipment.md"), "utf8").replaceAll("\r\n", "\n");

// The names in natural order, as the tables of play write them; the SRD's stays as an alias when it differs.
const names = {
    "Padded": "Padded Armor",
    "Leather": "Leather Armor",
    "Studded leather": "Studded Leather Armor",
    "Hide": "Hide Armor",
    "Half plate": "Half Plate Armor",
    "Splint": "Splint Armor",
    "Plate": "Plate Armor",
    "Crossbow, light": "Light Crossbow",
    "Crossbow, hand": "Hand Crossbow",
    "Crossbow, heavy": "Heavy Crossbow",
};

// What weapons a character's weapons count, for Dueling: one weapon in one hand and no other (p. 24).
const weapons = ["simple melee weapon", "martial melee weapon", "simple ranged weapon", "martial ranged weapon"].map((category) => `count(equipped, category = ${category})`).join(" - ");

const taken = otherPageNames();
const written = [...readTable("Armor").map(armorPage), ...readTable("Weapons").map(weaponPage)];

for (const page of written) {
    if (taken.has(page.name.toLowerCase())) {
        throw new Error(`${page.name} is already the name of another page of the system: give it another.`);
    }

    writeFileSync(join(items, `${page.name}.md`), page.text);
}

console.log(`${written.length} pages written: ${written.map((page) => page.name).join(", ")}.`);

/** The rows of the table under a bold caption, each with the category its section row gives, such as Light Armor. */
function readTable(caption)
{
    const lines = chapter.slice(chapter.indexOf(`**${caption}**`)).split("\n");
    const start = lines.findIndex((line) => line.startsWith("|"));
    const rows = [];
    let category;

    for (const line of lines.slice(start + 2)) {
        if (!line.startsWith("|")) {
            break;
        }

        const cells = line.slice(1, -1).split("|").map((cell) => cell.trim());
        const section = /^\*\*(.+)\*\*$/.exec(cells[0]);

        if (section !== null) {
            category = section[1].toLowerCase().replace(/s$/, "");
        } else {
            rows.push({ category, cells });
        }
    }

    return rows;
}

/** An armor's page: its Armor Class as a formula, plus the bonus of a magic one; Strength and Stealth as the table gives them (p. 63). */
function armorPage({ category, cells })
{
    const [srdName, cost, armorClass, strength, stealth, weight] = cells;
    const name = names[srdName] ?? titled(srdName);
    const shield = category === "shield";
    const base = /^(\d+)(?: \+ Dex modifier( \(max 2\))?)?$/.exec(armorClass);
    const formula = shield ? undefined : `${base[1]}${base[0].includes("Dex") ? (base[2] === undefined ? " + dex-mod" : " + min(dex-mod, 2)") : ""} + bonus`;
    const fields = {
        ...aliases(srdName, name),
        category: shield ? "shield" : category,
        cost,
        ...(shield ? { "armor-class-bonus": `${armorClass.replace("+", "")} + bonus` } : { "armor-class": formula }),
        ...(strength === "—" ? {} : { "strength-required": Number(strength.replace("Str ", "")) }),
        ...(stealth === "Disadvantage" ? { "stealth-disadvantage": true } : {}),
        weight: weight.replace(/\.$/, ""),
    };
    return { name, text: pageText(fields, description(shield ? "Shields" : srdName)) };
}

/** A weapon's page: its damage as the table gives it, and its attack and damage as formulas (pp. 65–66), with what Archery and Dueling add (p. 24). */
function weaponPage({ category, cells })
{
    const [srdName, cost, damage, weight, properties] = cells;
    const name = names[srdName] ?? titled(srdName);
    const kept = properties === "—" ? [] : properties.split(/,\s*(?![^()]*\))/).map((property) => property.toLowerCase());
    const ranged = category.includes("ranged");
    const ability = ranged ? "dex-mod" : kept.includes("finesse") ? "max(str-mod, dex-mod)" : "str-mod";
    const proficient = `proficiency * max(has(weapon-proficiencies, ${category.split(" ")[0]} weapons), has(weapon-proficiencies, ${name}), has(weapon-proficiencies, ${name.toLowerCase()}s))`;
    const archery = ranged ? " + 2 * has(fighting-styles, Archery)" : "";
    const dueling = !ranged && !kept.includes("two-handed") ? ` + 2 * has(fighting-styles, Dueling) * max(0, 2 - ${weapons})` : "";
    const [, amount, type] = /^(\S+) (.+)$/.exec(damage) ?? [];
    const fields = {
        ...aliases(srdName, name),
        category,
        cost,
        ...(amount === undefined ? {} : { damage }),
        ...(weight === "—" ? {} : { weight: weight.replace(/\.$/, "") }),
        ...(kept.length === 0 ? {} : { properties: kept }),
        attack: `${ability} + ${proficient} + bonus${archery}`,
        ...(amount === undefined ? {} : { "damage-roll": `${amount} + ${ability} + bonus${dueling} ${type}` }),
    };
    return { name, text: pageText(fields, ["Lance", "Net"].includes(srdName) ? description(srdName) : "") };
}

/** The SRD's name as an alias, when it is not the page's name but for case. */
function aliases(srdName, name)
{
    return srdName.toLowerCase() === name.toLowerCase() ? {} : { aliases: [srdName] };
}

/** "Light hammer" as "Light Hammer". */
function titled(text)
{
    return text.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

/** The paragraphs after a run-in title of the chapter, such as "***Padded.***", up to the next title, heading or table. */
function description(title)
{
    const lines = chapter.split("\n");
    const start = lines.findIndex((line) => line.startsWith(`***${title}.***`));

    if (start === -1) {
        return "";
    }

    const paragraphs = [lines[start].slice(`***${title}.*** `.length)];

    for (const line of lines.slice(start + 1)) {
        if (/^(\*\*|#|\|)/.test(line)) {
            break;
        }

        if (line.trim() !== "") {
            paragraphs.push(line);
        }
    }

    return paragraphs.join("\n\n");
}

/** A page: its fields as YAML, each value in quotes only when it would not read back as itself, then its text. */
function pageText(fields, body)
{
    const lines = Object.entries(fields).map(([field, value]) => `${field}: ${Array.isArray(value) ? `[${value.map(scalar).join(", ")}]` : scalar(value)}`);
    return `---\n${lines.join("\n")}\n---\n${body === "" ? "" : `\n${body}\n`}`;
}

function scalar(value)
{
    const text = stringify(value, { lineWidth: 0 }).trimEnd();
    return parse(text) === value && !/[,[\]]/.test(text) ? text : JSON.stringify(value);
}

/** The names of the system's pages that are not armor or weapons, in lower case: an armor or weapon cannot take one. */
function otherPageNames()
{
    const result = new Set();

    for (const folder of readdirSync(join(system, "world"), { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
        for (const file of readdirSync(join(system, "world", folder.name)).filter((name) => name.endsWith(".md"))) {
            const text = readFileSync(join(system, "world", folder.name, file), "utf8").replaceAll("\r\n", "\n");

            if (!/^---\n(?:.*\n)*?category: (light armor|medium armor|heavy armor|shield|(simple|martial) (melee|ranged) weapon)\n/.test(text)) {
                result.add(file.slice(0, -3).toLowerCase());
            }
        }
    }

    return result;
}
