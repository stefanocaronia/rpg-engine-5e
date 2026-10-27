// What a 5e character carries and how far it goes (D-262, LOAD-2, LOAD-4, SPD-1, STK-1): the load at the system's pound and by size, the speeds its race,
// armor, load and effects give, its jumps, the goods sold in bundles, and the game's mile on a journey.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestCampaign } from "rpg-engine/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fifthEdition } from "./support.ts";

let campaign: TestCampaign;
let folder: string;

afterEach(() => campaign.close());

describe("the 5e's load", () => {
    beforeEach(async () => {
        campaign = await fifthEdition({ language: "it" });
        await ok("write", "Locanda", "--type", "place");
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "str=14");
        await ok("write", "Locanda", "--add", "contains=[[Ettore]]");
    });

    it("shows the load in kilograms to a player who counts in metric, at the system's pound (LOAD-2)", async () => {
        await ok("write", "Bruna", "--type", "character", "--set", "role=companion", "--set", "level=1", "--set", "str=10", "--set", "money=1,000 gp", "--add", "inventory=[[Waterskin]]");
        expect(await ok("show", "Bruna")).toContain("load 25 / 150 lb");
        const view = JSON.parse(await ok("view", "Bruna", "--json"));
        expect(JSON.stringify(view).match(/"field":"load","text":"([^"]+)"/)?.[1]).toBe("12.5 / 75 kg");
    });

    it("multiplies the limit by the factor of the size, written or from the race, and takes only the system's sizes (LOAD-4)", async () => {
        await ok("write", "Bruna", "--type", "character", "--set", "role=companion", "--set", "level=1", "--set", "str=10", "--add", "inventory=[[Waterskin]]");
        await ok("write", "Bruna", "--set", "size=Large");
        expect(await ok("show", "Bruna")).toContain("load 5 / 300 lb");
        await ok("write", "Bruna", "--set", "size=Tiny");
        expect(await ok("show", "Bruna")).toContain("load 5 / 75 lb");
        await ok("write", "Bruna", "--unset", "size");
        // A race of the campaign, larger than the SRD's: the character takes its size.
        await ok("write", "Mezzogigante", "--type", "creature", "--set", "category=race", "--set", "size=Large");
        await ok("write", "Bruna", "--set", "creature=[[Mezzogigante]]");
        expect(await ok("show", "Bruna")).toContain("load 5 / 300 lb");
        const refused = await campaign.run("write", "Bruna", "--set", "size=Grande");
        expect(refused.exitCode).toBe(1);
        expect(refused.output).toMatch(/^"Grande" is not one of the names size takes in the system 5e: Tiny, Small, Medium, Large, Huge, Gargantuan/);
    });
});

describe("the 5e's speeds", () => {
    beforeEach(async () => {
        campaign = await fifthEdition({ language: "it" });
        await ok("config", "units", "imperial");
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "creature=[[Human]]", "--set", "str=10");
        await ok("write", "Cotta di Ettore", "--type", "item", "--set", "item=[[Chain Mail]]");
    });

    describe("the speed a sheet works out", () => {
        it("starts from the race, and shows the written one beside it (SPD-1)", async () => {
            expect(await walking("Ettore")).toBe("walking 30 ft (30 ft)");
            await ok("write", "Brom", "--type", "character", "--set", "role=companion", "--set", "creature=[[Hill Dwarf]]", "--set", "level=1", "--set", "str=10");
            expect(await walking("Brom")).toBe("walking 25 ft (25 ft)");
        });

        it("takes 10 ft for a heavy armor without its Strength, but not from a dwarf, nor under the rigor «simulation» (SPD-3)", async () => {
            await wear("Ettore");
            expect(await walking("Ettore")).toBe("walking 20 ft (30 ft)");
            await ok("write", "Ettore", "--set", "str=13");
            expect(await walking("Ettore")).toBe("walking 30 ft (30 ft)");
            await ok("write", "Ettore", "--set", "str=10", "--set", "creature=[[Hill Dwarf]]");
            expect(await walking("Ettore")).toBe("walking 25 ft (25 ft)");
        });

        it("weighs the load by rigor: 5 ft past the limit under «rules» and «simulation»; under «simulation» −10 past Str×5, −20 past Str×10 (SPD-3)", async () => {
            await ok("write", "Ettore", "--add", "inventory=[[Iron Pot]] 14");
            await ok("config", "rigor", "rules");
            expect(await walking("Ettore")).toBe("walking 30 ft (30 ft)");
            await ok("config", "rigor", "simulation");
            expect(await walking("Ettore")).toBe("walking 10 ft (30 ft)");
            await ok("change", "Ettore", "Iron Pot", "--by", "2");
            expect(await walking("Ettore")).toBe("walking 5 ft (30 ft)");
            await ok("config", "rigor", "rules");
            expect(await walking("Ettore")).toBe("walking 5 ft (30 ft)");
            await ok("config", "rigor", "smooth");
            expect(await walking("Ettore")).toBe("walking 30 ft (30 ft)");
        });

        it("tells the same speed in an effect's output and on the sheet, for an overloaded character too (SPD-1)", async () => {
            await ok("config", "rigor", "rules");
            await ok("write", "Ettore", "--add", "inventory=[[Iron Pot]] 20");
            expect(await walking("Ettore")).toBe("walking 5 ft (30 ft)");
            expect(await ok("effect", "add", "Ettore", "Passo veloce", "--set", "bonus-speed=10")).not.toContain("walking 5 ft →");
            expect(await walking("Ettore")).toBe("walking 5 ft (30 ft)");
        });

        it("adds what effects add, multiplies their factors, halves with exhaustion 2, and stops at 5 or with a condition that stops one (SPD-2)", async () => {
            await ok("effect", "add", "Ettore", "Longstrider", "--set", "bonus-speed=10");
            expect(await walking("Ettore")).toBe("walking 40 ft (30 ft)");
            await ok("effect", "add", "Ettore", "Haste", "--set", "speed-factor=2");
            expect(await walking("Ettore")).toBe("walking 80 ft (30 ft)");
            await ok("effect", "add", "Ettore", "Slow", "--set", "speed-factor=1/2");
            expect(await walking("Ettore")).toBe("walking 40 ft (30 ft)");
            const half = await campaign.run("effect", "add", "Ettore", "Mezzo", "--set", "speed-factor=half");
            expect(half.output).toBe('speed-factor on Ettore is a factor: give what the effect multiplies by, such as speed-factor=2 or speed-factor=1/2, not "half". Nothing changed.');
            await ok("effect", "end", "Ettore", "Haste");
            await ok("effect", "end", "Ettore", "Slow");
            await ok("write", "Ettore", "--set", "exhaustion=2");
            expect(await walking("Ettore")).toBe("walking 20 ft (30 ft)");
            await ok("change", "Ettore", "exhaustion", "--to", "0");
            await ok("effect", "add", "Ettore", "Grappled");
            expect(await walking("Ettore")).toBe("walking 0 ft (30 ft)");
        });

        it("adds Fast Movement without heavy armor and Unarmored Movement without armor or shield; a thief with Second-Story Work climbs at walking speed (SPD-3)", async () => {
            await ok("write", "Ettore", "--set", "classes=[[Barbarian]] 5");
            expect(await walking("Ettore")).toBe("walking 40 ft (30 ft)");
            await wear("Ettore");
            expect(await walking("Ettore")).toBe("walking 20 ft (30 ft)");
            await ok("write", "Ettore", "--remove", "equipped=[[Cotta di Ettore]]");
            await ok("write", "Ettore", "--set", "classes=[[Monk]] 2");
            expect(await walking("Ettore")).toBe("walking 40 ft (30 ft)");
            await ok("write", "Ettore", "--add", "inventory=[[Shield]]", "--add", "equipped=[[Shield]]");
            expect(await walking("Ettore")).toBe("walking 30 ft (30 ft)");
            await ok("write", "Ettore", "--remove", "equipped=[[Shield]]", "--set", "classes=[[Rogue]] 3", "--set", "subclasses=[[Thief]]");
            expect(await ok("show", "Ettore")).toContain("walking 30 ft (30 ft) · climbing 30 ft");
        });

        it("rolls Stealth from the sheet with two d20, the lower kept, in an armor whose Stealth column says so (D-445)", async () => {
            await ok("write", "Ettore", "--set", "dex=12");

            const stealth = async (): Promise<string | undefined> => {
                const sheet = JSON.parse(await ok("view", "Ettore", "--json")).sheet as { values: { field: string; roll?: { notation: string; }; }[]; }[];
                return sheet.flatMap((group) => group.values).find((value) => value.field === "stealth")?.roll?.notation;
            };

            expect(await stealth()).toBe("1d20+1");
            await wear("Ettore");
            expect(await stealth()).toBe("2d20kl1+1");
        });

        it("tells the speed worked out in metres to a player who counts in metric, the written one beside it too, and leaves that out when it says the same (SPD-1)", async () => {
            await ok("config", "units", "metric");

            const walkingShown = async (): Promise<{ text: string; beside?: string; } | undefined> => {
                const sheet = JSON.parse(await ok("view", "Ettore", "--json")).sheet as { values: { field: string; text: string; beside?: string; }[]; }[];
                const value = sheet.flatMap((group) => group.values).find((one) => one.field === "walking");
                return value === undefined ? undefined : { text: value.text, ...(value.beside === undefined ? {} : { beside: value.beside }) };
            };

            expect(await walkingShown()).toEqual({ text: "9 m" });
            await wear("Ettore");
            expect(await walkingShown()).toEqual({ text: "6 m", beside: "9 m" });
        });

        it("tells a weight worked out in kilograms to a player who counts in metric", async () => {
            await ok("config", "units", "metric");
            await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "str=14", "--set", "hp-base=10");
            const sheet = JSON.parse(await ok("view", "Ettore", "--json")).sheet as { values: { field: string; text: string; }[]; }[];
            expect(sheet.flatMap((group) => group.values).find((value) => value.field === "push-drag")?.text).toBe("210 kg");
        });

        it("works out every mode the page has, the same way (SPD-1, SPD-2)", async () => {
            await ok("effect", "add", "Ettore", "Fly", "--set", "fly=60 ft");
            await ok("effect", "add", "Ettore", "Haste", "--set", "speed-factor=2");
            const shown = await ok("show", "Ettore");
            expect(shown).toContain("walking 60 ft (30 ft) · flying 120 ft");
        });

        it("reads a speed with a note in brackets after it, as a ghost's fly 40 ft (hover) (FOR-2, SPD-1)", async () => {
            await ok("write", "Fantasma", "--type", "character", "--set", "role=npc", "--set", "creature=[[Ghost]]");
            expect(await ok("show", "Fantasma")).toContain("flying 40 ft");
        });
    });

    describe("jumping, pushing and holding one's breath (D-449)", () => {
        it("works them out for a character with classes, from Strength, size and Constitution", async () => {
            await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "str=15", "--set", "con=14");
            const shown = await ok("show", "Ettore");
            expect(shown).toContain("long-jump 15 ft · high-jump 5 ft · push-drag 450 lb · hold-breath 3m");
        });
    });

    /** The walking speed on a character's sheet, with the written one beside it. */
    async function walking(name: string): Promise<string>
    {
        return /walking [^(·\n]*\([^)]*\)/.exec(await ok("show", name))?.[0] ?? "";
    }

    async function wear(name: string): Promise<void>
    {
        await ok("write", name, "--add", "inventory=[[Cotta di Ettore]]");
        await ok("write", name, "--add", "equipped=[[Cotta di Ettore]]");
    }
});

describe("the 5e's goods", () => {
    beforeEach(async () => {
        campaign = await fifthEdition({ language: "it", settings: { coins: "gp 100, sp 10, cp 1" } });
        folder = campaign.folder;
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "money=2 gp 3 cp");
        await ok("write", "Lena", "--type", "character", "--set", "role=companion");
        await ok("write", "Mulino", "--type", "place", "--add", "contains=[[Ettore]]", "--add", "contains=[[Lena]]");
    });

    it("counts a name of a kind sold in bundles in pieces, takes a word of the campaign's language as a label, and names the system's goods with a word", async () => {
        expect(await refused("write", "Lena", "--add", "inventory=[[Arrows (20)]] 1")).toBe(
            'There is no page named Arrows (20), but it is a name of Arrows, counted in pieces, 20 for each bought: write Lena, add inventory="[[Arrows]] 20". Nothing changed.',
        );
        expect(await refused("write", "Lena", "--add", "inventory=[[Torcia]] 3")).toContain('write the one it has with your word as its label, such as write Lena, add inventory="[[Torch|torcia]] 3"');
        // The system's goods whose names hold the word, which saves a find (Code tab game of 17 October).
        expect(await refused("write", "Lena", "--add", "inventory=[[Arrow]] 20")).toBe(
            'There is no page named Arrow, so [[Arrow]] 20 counts nothing. The system has Arrows, Arrow of Slaying, Arrow-Catching Shield: if it is one of them, write Lena, add inventory="[[Arrows]] 20". '
                + 'Only what the system lacks becomes a kind of the campaign, written first: write "Arrow", type item. Nothing changed.',
        );
    });

    it("reports in validate a stack under another name of a kind", async () => {
        writeFileSync(join(folder, "world", "characters", "Ugo.md"), '---\nrole: npc\nmoney: 5 gp\ninventory: ["[[Arrows (20)]] 2"]\n---\n');
        const problems = await ok("validate");
        expect(problems).toContain(
            'Ugo counts [[Arrows (20)]] in inventory, which counts nothing: There is no page named Arrows (20), but it is a name of Arrows, counted in pieces, 20 for each bought: write Ugo, add inventory="[[Arrows]] 40".',
        );
        expect(problems).not.toContain("inventory links to [[Arrows (20)]]");
    });
});

describe("the 5e's journeys", () => {
    // Guadoscuro –12– Bivio –8– Ponte; Bivio –24– Rocca; Ponte –30, difficult– Rocca; Rocca –50– Capitale; Ponte ≈18, river≈ Porto. Ettore and Lena at the Locanda.
    beforeEach(async () => {
        campaign = await fifthEdition({ language: "it" });
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc");
        await ok("write", "Lena", "--type", "character", "--set", "role=companion");
        await ok("write", "Locanda", "--type", "place", "--add", "contains=[[Ettore]]", "--add", "contains=[[Lena]]");
        await ok("write", "Guadoscuro", "--type", "place", "--add", "contains=[[Locanda]]");

        for (const place of ["Bivio", "Ponte", "Rocca", "Capitale", "Porto"]) {
            await ok("write", place, "--type", "place");
        }

        await ok("write", "Strada vecchia", "--type", "place", "--set", "stops=[[Guadoscuro]], 12 km, [[Bivio]], 8 km, [[Ponte]]");
        await ok("write", "Sentiero dei colli", "--type", "place", "--set", "stops=[[Bivio]], 24 km, [[Rocca]]");
        await ok("write", "Mulattiera", "--type", "place", "--set", "stops=[[Ponte]], 30 km, [[Rocca]]", "--add", "environment=terrain: difficult");
        await ok("write", "Via del Re", "--type", "place", "--set", "stops=[[Rocca]], 50 km, [[Capitale]]");
        await ok("advance", "--to", "day 3, 08:00");
    });

    it("counts in imperial with the game's mile of 1.5 km, at the 5e's normal pace (D-262)", async () => {
        await ok("config", "units", "imperial");
        expect(await ok("route", "Rocca")).toBe("Guadoscuro → Bivio → Rocca, 24 miles by Strada vecchia (8 miles) and Sentiero dei colli (16 miles).\nAt a normal pace (3 miles an hour): 8h of travel.");
    });
});

async function ok(...args: string[]): Promise<string>
{
    const result = await campaign.run(...args);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

async function refused(...args: string[]): Promise<string>
{
    const result = await campaign.run(...args);
    expect(result.exitCode, result.output).toBe(1);
    return result.output;
}
