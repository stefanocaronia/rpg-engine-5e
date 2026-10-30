// The Italian text of the 5e (D-539, D-542): every page of world/ and chapter of rules/ has its Italian file under translations/it, from the official
// Italian SRD 5.1 (build/translations.mjs), but those the Italian SRD lacks; a page's file gives only its Italian name and its text.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { repository } from "./support.ts";

const translations = join(repository, "translations", "it");
// The pages and chapters without an Italian text, and why.
const exceptions: Record<string, string> = {
    "rules/Combat Encounters.md": "from the SRD 5.2.1, which has no official Italian translation",
};
const folders = ["world/creatures", "world/items", "world/topics", "rules"];

describe("the Italian text of the 5e (D-542)", () => {
    it("has an Italian file for every page and rules chapter, but the listed exceptions", () => {
        const missing = folders.flatMap((folder) => files(folder).filter((file) => !existsSync(join(translations, folder, file))).map((file) => `${folder}/${file}`));
        expect(missing).toEqual(Object.keys(exceptions));
        const extra = folders.flatMap((folder) => files(folder, translations).filter((file) => !existsSync(join(repository, folder, file))).map((file) => `${folder}/${file}`));
        expect(extra).toEqual([]);
    });

    it("gives each page only its Italian name, and a text when the English page has one", () => {
        const wrong = folders.filter((folder) => folder !== "rules").flatMap((folder) =>
            files(folder, translations).flatMap((file) => {
                const italian = pageOf(join(translations, folder, file));
                const english = pageOf(join(repository, folder, file));
                const problems = [
                    ...(Object.keys(italian.fields).join() === "name" ? [] : ["fields other than name"]),
                    ...(typeof italian.fields.name === "string" && italian.fields.name.trim() !== "" ? [] : ["no name"]),
                    ...((italian.body === "") === (english.body === "") ? [] : [italian.body === "" ? "no text" : "a text the English page lacks"]),
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

    it("gives no two pages of a folder the same Italian name, but twins in English, as Shield and Shield (spell)", () => {
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
