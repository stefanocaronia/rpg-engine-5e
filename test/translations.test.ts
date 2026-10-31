// The text of the 5e in other languages (D-539, D-542): every page of world/ and chapter of rules/ has its file under translations/<code>, from the official
// translation of the SRD 5.1 in that language (build/translations.mjs), but those the translation lacks; a page's file gives only its name and its text.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { repository } from "./support.ts";

// The pages and chapters without a translated text, and why: the same in every language.
const exceptions: Record<string, string> = {
    "rules/Combat Encounters.md": "from the SRD 5.2.1, which the official translations of the SRD 5.1 lack",
};
const folders = ["world/creatures", "world/items", "world/topics", "rules"];
const languages = readdirSync(join(repository, "translations")).filter((code) => /^[a-z]{2}$/.test(code)).sort();

describe("the translations of the 5e (D-542)", () => {
    it("are in Italian, French, German and Spanish", () => {
        expect(languages).toEqual(["de", "es", "fr", "it"]);
    });
});

describe.each(languages)("the text of the 5e in %s (D-542)", (code) => {
    const translations = join(repository, "translations", code);

    it("has a file for every page and rules chapter, but the listed exceptions", () => {
        const missing = folders.flatMap((folder) => files(folder).filter((file) => !existsSync(join(translations, folder, file))).map((file) => `${folder}/${file}`));
        expect(missing).toEqual(Object.keys(exceptions));
        const extra = folders.flatMap((folder) => files(folder, translations).filter((file) => !existsSync(join(repository, folder, file))).map((file) => `${folder}/${file}`));
        expect(extra).toEqual([]);
    });

    it("gives each page only its name, and a text when the English page has one", () => {
        const wrong = folders.filter((folder) => folder !== "rules").flatMap((folder) =>
            files(folder, translations).flatMap((file) => {
                const translated = pageOf(join(translations, folder, file));
                const english = pageOf(join(repository, folder, file));
                const problems = [
                    ...(Object.keys(translated.fields).join() === "name" ? [] : ["fields other than name"]),
                    ...(typeof translated.fields.name === "string" && translated.fields.name.trim() !== "" ? [] : ["no name"]),
                    ...((translated.body === "") === (english.body === "") ? [] : [translated.body === "" ? "no text" : "a text the English page lacks"]),
                ];
                return problems.map((problem) => `${folder}/${file}: ${problem}`);
            })
        );
        expect(wrong).toEqual([]);
    });

    it("gives each rules chapter a text that opens with its title", () => {
        const wrong = files("rules", translations).filter((file) => !/^# \S/.test(readFileSync(join(translations, "rules", file), "utf8")));
        expect(wrong).toEqual([]);
    });

    it("gives no two pages of a folder the same name, but twins in English, as Shield and Shield (spell)", () => {
        const shared = folders.filter((folder) => folder !== "rules").flatMap((folder) => {
            const byName = new Map<string, string[]>();

            for (const file of files(folder, translations)) {
                const name = String(pageOf(join(translations, folder, file)).fields.name).toLowerCase();
                byName.set(name, [...(byName.get(name) ?? []), file.slice(0, -3)]);
            }

            return [...byName].filter(([, pages]) => pages.length > 1 && new Set(pages.map((page) => page.replace(/ \(.*\)$/, ""))).size > 1).map(([name, pages]) => `${folder}: ${name} (${pages.join(", ")})`);
        });
        expect(shared).toEqual([]);
    });

    it("links every spell list to the spells of its English list", () => {
        const wrong = files("world/topics", translations).filter((file) => file.endsWith(" Spells.md")).filter((file) => {
            const english = links(readFileSync(join(repository, "world", "topics", file), "utf8"));
            const translated = links(readFileSync(join(translations, "world", "topics", file), "utf8"));
            return english.join() !== translated.join();
        });
        expect(wrong).toEqual([]);
    });
});

function files(folder: string, root = repository): string[]
{
    const path = join(root, folder);
    return existsSync(path) ? readdirSync(path).filter((file) => file.endsWith(".md")).sort() : [];
}

/** A page's fields and its text, whatever ends its lines. */
function pageOf(path: string): { fields: Record<string, unknown>; body: string; }
{
    const text = readFileSync(path, "utf8").replaceAll("\r\n", "\n");
    const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
    return { fields: (parse(match?.[1] ?? "") ?? {}) as Record<string, unknown>, body: (match?.[2] ?? text).trim() };
}

/** The pages a text links, sorted. */
function links(text: string): string[]
{
    return [...new Set([...text.matchAll(/\[\[([^\]|]+)/g)].map((match) => match[1]))].sort();
}
