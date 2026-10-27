// The 5e's free rolls of the sheet with advantage or disadvantage (D-445): what exhaustion, the conditions as effects, a heavy load and armor without
// proficiency make worse; the engine's own odds are tested in its repository.
import type { TestCampaign } from "rpg-engine/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fifthEdition } from "./support.ts";

let campaign: TestCampaign;

beforeEach(async () => {
    campaign = await fifthEdition({ language: "it" });
    const fields = ["role=pc", "creature=[[Human]]", "classes=[[Fighter]] 1", "str=14", "dex=12", "con=12", "int=10", "wis=10", "cha=10", "hp-base=10"];
    await ok("write", "Ettore", "--type", "character", ...fields.flatMap((field) => ["--set", field]));
});

afterEach(() => campaign.close());

describe("advantage and disadvantage on the sheet's rolls", () => {
    it("worsens checks from exhaustion 1, and saves from 3", async () => {
        expect(await dice("athletics")).toBe("1d20");
        await ok("change", "Ettore", "exhaustion", "--to", "1");
        expect(await dice("athletics")).toBe("2d20kl1");
        expect(await dice("wis-save")).toBe("1d20");
        await ok("change", "Ettore", "exhaustion", "--to", "3");
        expect(await dice("wis-save")).toBe("2d20kl1");
    });

    it("reads the conditions on the character: Poisoned worsens checks, Restrained Dexterity saves", async () => {
        await ok("effect", "add", "Ettore", "Poisoned");
        expect(await dice("perception")).toBe("2d20kl1");
        await ok("effect", "end", "Ettore", "Poisoned");
        expect(await dice("perception")).toBe("1d20");
        await ok("effect", "add", "Ettore", "Restrained");
        expect(await dice("dex-save")).toBe("2d20kl1");
        expect(await dice("str-save")).toBe("1d20");
    });

    it("worsens what Str, Dex and Con roll when heavily encumbered, only under the rigor «simulation»", async () => {
        // Strength 14: past 140 lb one is heavily encumbered.
        await ok("write", "Ettore", "--add", "inventory=[[Iron Pot]] 15");
        expect(await dice("athletics")).toBe("1d20");
        await ok("config", "rigor", "simulation");
        expect(await dice("athletics")).toBe("2d20kl1");
        expect(await dice("dex-save")).toBe("2d20kl1");
        expect(await dice("wis-save")).toBe("1d20");
        expect(await dice("insight")).toBe("1d20");
    });
});

/** The dice of a value's free roll on the sheet, without its number. */
async function dice(field: string): Promise<string | undefined>
{
    const sheet = JSON.parse(await ok("view", "Ettore", "--json")).sheet as { values: { field: string; roll?: { notation: string; }; }[]; }[];
    return sheet.flatMap((group) => group.values).find((value) => value.field === field)?.roll?.notation.replace(/[+-]\d+$/, "");
}

async function ok(...args: string[]): Promise<string>
{
    const result = await campaign.run(...args);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

describe("armor without proficiency, and the passives (D-449)", () => {
    it("worsens what Str and Dex roll in armor or with a shield one lacks proficiency with, and lowers a passive by 5 with disadvantage", async () => {
        await ok("write", "Ettore", "--add", "inventory=[[Chain Mail]]", "--add", "equipped=[[Chain Mail]]");
        expect(await dice("athletics")).toBe("2d20kl1");
        expect(await dice("insight")).toBe("1d20");
        await ok("write", "Ettore", "--add", "armor-proficiencies=heavy armor");
        expect(await dice("athletics")).toBe("1d20");
        await ok("write", "Ettore", "--add", "inventory=[[Shield]]", "--add", "equipped=[[Shield]]");
        expect(await dice("dex-save")).toBe("2d20kl1");
        const passive = async (): Promise<string> => /passive-perception \d+/.exec(await ok("show", "Ettore"))?.[0] ?? "";
        expect(await passive()).toBe("passive-perception 10");
        await ok("effect", "add", "Ettore", "Poisoned");
        expect(await passive()).toBe("passive-perception 5");
    });
});

describe("mithral armor (D-449)", () => {
    it("drops its kind's stealth disadvantage when the campaign's item writes it false", async () => {
        await ok("write", "Ettore", "--add", "armor-proficiencies=heavy armor");
        await ok("write", "Piastre di mithral", "--type", "item", "--set", "item=[[Plate Armor]]", "--set", "magic=[[Mithral Armor]]", "--set", "strength-required=0", "--set", "stealth-disadvantage=false");
        await ok("write", "Ettore", "--add", "inventory=[[Piastre di mithral]]", "--add", "equipped=[[Piastre di mithral]]");
        expect(await dice("stealth")).toBe("1d20");
    });
});
