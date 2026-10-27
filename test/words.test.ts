// The 5e's words in the campaign's language (D-403, D-495): the verbs of its sheet as the dashboard is given them, cast and prepare, in every language of its
// words, and its conditions in Italian, which count as their English names.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { TestCampaign } from "rpg-engine/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fifthEdition, repository } from "./support.ts";

let campaign: TestCampaign;

afterEach(() => campaign.close());

/** A verb's sentence of the 5e, as the dashboard gives it its names: {item}, {target}, {square}. */
interface Verb
{
    label: string;
    title: string;
    says: string;
    on?: string;
    at?: string;
    self?: string;
}

/** The verbs of the sheet and the 5e's words in the campaign's language, as the dashboard's view gives them to the page. */
async function given(): Promise<{ verbs: Record<string, Verb>; words: Record<string, string>; }>
{
    const view = JSON.parse(await ok("view", "--json")) as { verbs?: Record<string, Verb>; words?: { words?: Record<string, string>; }; };
    return { verbs: view.verbs ?? {}, words: view.words?.words ?? {} };
}

/** A sentence with its names filled, in the campaign's language when its words have it, as the page writes it. */
function sentence(words: Record<string, string>, model: string | undefined, names: Record<string, string>): string
{
    return Object.entries(names).reduce((text, [name, value]) => text.replace(`{${name}}`, value), words[model ?? ""] ?? model ?? "");
}

/** The names a sentence fills, in order: "{item} on {target}" fills item and target. */
function namesOf(text: string): string[]
{
    return [...text.matchAll(/\{(\w+)\}/g)].map((found) => found[1]).sort();
}

describe("the 5e's verbs", () => {
    beforeEach(async () => {
        campaign = await fifthEdition();
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc");
    });

    it("casts on someone, at a square or on oneself, and prepares, in English and in Italian through the 5e's words", async () => {
        const english = await given();
        const cast = english.verbs.cast;
        expect([
            sentence({}, cast?.on, { item: "Healing Word", target: "Lupa" }),
            sentence({}, cast?.at, { item: "Guiding Bolt", square: "G7" }),
            sentence({}, cast?.self, { item: "Bless" }),
            sentence({}, english.verbs.prepare?.says, { item: "Bless" }),
        ]).toEqual(["I cast Healing Word on Lupa.", "I cast Guiding Bolt at G7.", "I cast Bless on myself.", "I prepare Bless."]);

        await ok("config", "language", "it");
        const { verbs, words } = await given();
        expect([
            sentence(words, verbs.cast?.on, { item: "Parola guaritrice", target: "Lupa" }),
            sentence(words, verbs.cast?.at, { item: "Dardo guida", square: "G7" }),
            sentence(words, verbs.prepare?.says, { item: "Benedizione" }),
            sentence(words, verbs.cast?.label, {}),
        ]).toEqual(["Lancio Parola guaritrice su Lupa.", "Lancio Dardo guida verso G7.", "Preparo Benedizione.", "Lancia"]);
    });

    it("has its verbs' sentences in every language of its words, each with the names it fills", async () => {
        const { verbs } = await given();
        const sentences = Object.values(verbs).flatMap((verb) => [verb.label, verb.title, verb.says, verb.on, verb.at, verb.self]).filter((sentence) => sentence !== undefined);
        const languages = readdirSync(join(repository, "words")).map((file) => file.replace(/\.yaml$/, "")).filter((language) => language !== "en");
        const lacking: string[] = [];

        for (const language of languages) {
            await ok("config", "language", language);
            const own = (await given()).words;
            lacking.push(...sentences.filter((sentence) => own[sentence] === undefined || namesOf(own[sentence]).join() !== namesOf(sentence).join()).map((sentence) => `${language}: ${sentence}`));
        }

        expect(sentences).toHaveLength(9);
        expect(languages.length).toBe(25);
        expect(lacking).toEqual([]);
    });
});

describe("the 5e in Italian", () => {
    beforeEach(async () => {
        campaign = await fifthEdition({ language: "it" });
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc");
        await ok("write", "Lena", "--type", "character", "--set", "role=companion");
        await ok("advance", "--to", "day 1, 10:00");
    });

    it("worsens the rolls of the sheet and the passives for Avvelenato, and stops the walk for Afferrato (D-445, FOR-2)", async () => {
        const fields = ["creature=[[Human]]", "classes=[[Fighter]] 1", "str=14", "dex=12", "con=12", "int=10", "wis=10", "cha=10", "hp-base=10"];
        await ok("write", "Ettore", ...fields.flatMap((field) => ["--set", field]));
        const before = await ok("show", "Ettore");
        expect(before).toMatch(/walking 30 ft .*passive-perception 10 /);
        await ok("effect", "add", "Ettore", "Avvelenato");
        await ok("effect", "add", "Ettore", "Afferrato");
        expect(await ok("show", "Ettore")).toMatch(/walking 0 ft .*passive-perception 5 /);
        const sheet = JSON.parse(await ok("view", "Ettore", "--json")).sheet as { values: { field: string; roll?: { notation: string; }; }[]; }[];
        expect(sheet.flatMap((group) => group.values).find((value) => value.field === "perception")?.roll?.notation).toMatch(/^2d20kl1/);
    });

    it("refuses Avvelenato on a creature immune to Poisoned (D-454, EFF-17)", async () => {
        await ok("scene", "open", "--title", "Cripta", "--type", "combat", "--with", "Ettore", "--creatures", "Zombie=1");
        expect((await campaign.run("effect", "add", "Zombie 1", "Avvelenato")).output).toBe("Zombie 1 is immune to Poisoned, in its condition-immunities: it does not take it. Nothing changed.");
    });
});

async function ok(...args: string[]): Promise<string>
{
    const result = await campaign.run(...args);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
