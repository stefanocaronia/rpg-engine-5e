// What the 5e works out of a sheet, through the commands (FOR-3–FOR-8): the sheet of a cleric of the third level, counted as the SRD counts it, and the laws
// of the worked-out sheet against the SRD's own counting.
import fc from "fast-check";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestCampaign } from "rpg-engine/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fifthEdition } from "./support.ts";

let campaign: TestCampaign;
let folder: string;

beforeEach(async () => {
    campaign = await fifthEdition({ language: "it", play: false });
    folder = campaign.folder;
});

afterEach(() => campaign.close());

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

/** The lines of what show says the system works out, each with the values it came from, as its result gives them. */
async function workedLines(page: string): Promise<string[]>
{
    const shown = JSON.parse(await ok("show", page, "--json")) as { worked: { line: string; }[]; };
    return shown.worked.map((worked) => worked.line);
}

/** The values show says the system works out, by field. */
async function worked(page: string): Promise<Record<string, number>>
{
    return Object.fromEntries((await workedLines(page)).map((line) => {
        const [, field, value] = /^(\S+) ([+-]?\d+)/.exec(line) ?? [];
        return [field, Number(value)];
    }));
}

/** The file of a page, a character unless its folder is given. */
function pageText(page: string, type = "characters"): string
{
    return readFileSync(join(folder, "world", type, `${page}.md`), "utf8");
}

describe("the 5e's sheet", () => {
    beforeEach(async () => {
        await ok("write", "Locanda", "--type", "place");
        await ok(...ettore());
        await ok("write", "Locanda", "--add", "contains=[[Ettore]]");
        // His chain mail and shield, which he wears: his armor class, 18 (D-231).
        await ok("write", "Cotta di Ettore", "--type", "item", "--set", "item=[[Chain Mail]]");
        await ok("write", "Scudo di Ettore", "--type", "item", "--set", "item=[[Shield]]");
        await ok("write", "Ettore", "--set", "inventory=[[Cotta di Ettore]], [[Scudo di Ettore]]", "--set", "equipped=[[Cotta di Ettore]], [[Scudo di Ettore]]");
    });

    /** Ettore, a cleric of the third level: proficient in Wisdom and Charisma saves and in four skills, with 18 hit points from the dice. */
    function ettore(): string[]
    {
        return [
            "write",
            "Ettore",
            "--type",
            "character",
            "--set",
            "role=pc",
            "--set",
            "level=3",
            "--set",
            "str=14",
            "--set",
            "dex=8",
            "--set",
            "con=15",
            "--set",
            "int=10",
            "--set",
            "wis=16",
            "--set",
            "cha=12",
            "--set",
            "hp-base=18",
            "--set",
            "hp=24/24",
            "--set",
            "save-proficiencies=[wis, cha]",
            "--set",
            "skill-proficiencies=[Insight, Religion, Medicine, Persuasion]",
        ];
    }

    describe("what show and status give of a sheet (FOR-8)", () => {
        it("works the sheet out, each value with only what changed it", async () => {
            const lines = await workedLines("Ettore");
            expect(lines).toEqual(expect.arrayContaining([
                "wis-mod +3: wis 16",
                "proficiency +2: level 3, proficiency-by-level 2",
                "str-save +2: str-mod +2",
                "wis-save +5: wis-mod +3, proficiency +2, wis in save-proficiencies",
                "insight +5: wis-mod +3, proficiency +2, Insight in skill-proficiencies",
                "arcana +0: int-mod +0",
                "initiative -1: dex-mod -1",
                "passive-perception 13: perception +3",
                "passive-insight 15: insight +5",
            ]));
            // Modifiers, proficiency, saves, skills, initiative and the three passives (D-218); the armor class, from the chain mail and the shield (D-231).
            expect(lines).toEqual(expect.arrayContaining(["ac 18: armor-class 16, armor-class-bonus +2", "armor-class 16", "armor-class-bonus +2"]));
            // The unarmed strike, which every character with a sheet has ready (D-235).
            expect(lines).toEqual(expect.arrayContaining(["attack +4: str-mod +2, proficiency +2", "damage-roll 3 bludgeoning: str-mod +2"]));
            expect(lines).toHaveLength(6 + 1 + 6 + 18 + 1 + 3 + 3 + 2);
            expect(await ok("status")).toContain("PC: Ettore, in Locanda: level 3 · hp 24/24 · ac 18 · passive-perception 13");
        });

        it("works out nothing on a page without what a formula reads, and keeps the values written there (FOR-4)", async () => {
            await ok("write", "Bandito", "--type", "creature", "--set", "passive-perception=11", "--set", "dex=12");
            expect(pageText("Bandito", "creatures")).toContain("passive-perception: 11");
            // A creature's saves and skills come from its stat block, here empty, so from dex-mod alone (D-210).
            expect(await workedLines("Bandito")).toEqual([
                "dex-mod +1: dex 12",
                "dex-save +1: dex-mod +1",
                "acrobatics +1: dex-mod +1",
                "sleight-of-hand +1: dex-mod +1",
                "stealth +1: dex-mod +1",
                "initiative +1: dex-mod +1",
            ]);
        });
    });

    describe("the order of layers (FOR-3) and the bonus fields (FOR-5)", () => {
        it("works out from a score an effect gives, and back when it ends", async () => {
            expect(await ok("effect", "add", "Ettore", "Gauntlets of Ogre Power", "--set", "str=19")).toContain("str 14 → 19");
            expect(await worked("Ettore")).toMatchObject({ "str-mod": 4, "str-save": 4, athletics: 4 });
            await ok("effect", "end", "Ettore", "Gauntlets of Ogre Power");
            expect(await worked("Ettore")).toMatchObject({ "str-mod": 2, "str-save": 2, athletics: 2 });
        });

        it("adds up the bonuses of different effects, never twice the same one", async () => {
            await ok("effect", "add", "Ettore", "Ring of Protection", "--set", "bonus-saves=1");
            expect(await ok("effect", "add", "Ettore", "Cloak of Protection", "--set", "bonus-saves=1")).not.toContain("goes over");
            expect(await worked("Ettore")).toMatchObject({ "wis-save": 7, "str-save": 4 });
            expect(await workedLines("Ettore")).toContain("wis-save +7: wis-mod +3, proficiency +2, wis in save-proficiencies, bonus-saves +2");
            await ok("effect", "add", "Ettore", "Ring of Protection", "--set", "bonus-saves=1");
            expect(await worked("Ettore")).toMatchObject({ "wis-save": 7 });
        });
    });

    describe("the limits of counters (FOR-6)", () => {
        it("keeps the written maximum with what the system works out, and says it", async () => {
            // What hp lost stays lost: the 3 more of the maximum come with it (D-228).
            expect(await ok("write", "Ettore", "--set", "con=16")).toContain("hp 27/27 (max 24 → 27: hp-base 18, level 3, con-mod +3): worked out by the system 5e.");
            expect(pageText("Ettore")).toContain("hp: 27/27");
            expect(await refused("change", "Ettore", "hp", "--to", "20/30")).toBe(
                "The maximum of hp on Ettore is worked out by the game system: 27, from hp-base 18, level 3, con-mod +3. Give the current value alone, such as to 20; to raise the maximum, write hp-base; to change it for a while, as a drain, give an effect that sets hp-base. Nothing changed.",
            );
            expect(await ok("change", "Ettore", "hp", "--to", "20/27")).toBe("Ettore: hp 27/27 → 20/27.");
            expect(await ok("change", "Ettore", "hp", "--by=10")).toBe("Ettore: hp 20/27 → 27/27: at max, 3 beyond.");
            await ok("write", "Ettore", "--set", "con=12");
            expect(pageText("Ettore")).toContain("hp: 21/21");
        });

        it("keeps a current above the written maximum while an effect allows it, and writes it as it reads when the effect ends (D-228)", async () => {
            await ok("effect", "add", "Ettore", "Aid", "--set", "hp-base=23");
            expect(await ok("change", "Ettore", "hp", "--by=5")).toBe("Ettore: hp 24/29 → 29/29: at max.");
            expect(pageText("Ettore")).toContain("hp: 29/24");
            expect(await ok("effect", "end", "Ettore", "Aid")).toContain("hp 29/29 → 24/24");
            expect(pageText("Ettore")).toContain("hp: 24/24");
            expect(campaign.log().at(-2)?.data).toMatchObject({ page: "Ettore", field: "hp", before: "29/24", after: "24/24" });
        });

        it("leaves the page's current to a form that lowers the maximum, and caps a use's current when its maximum falls (D-228)", async () => {
            await ok("change", "Ettore", "hp", "--to", "20");
            await ok("effect", "add", "Ettore", "Polymorph", "--set", "con=9", "--set", "hp=1");
            await ok("effect", "end", "Ettore", "Polymorph");
            expect(pageText("Ettore")).toContain("hp: 20/24");
            // A Constitution that falls for good lowers the maximum by 3: the current stays within it, as the SRD says.
            expect(await ok("write", "Ettore", "--set", "con=12")).toContain("hp 20/21 (max 24 → 21");
            expect(pageText("Ettore")).toContain("hp: 20/21");
        });

        it("never writes a maximum below 0, and raises it again from 0", async () => {
            await ok("write", "Ettore", "--set", "con=3");
            expect(await ok("write", "Ettore", "--set", "level=5")).toContain("hp 0/0 (max 6 → 0: hp-base 18, level 5, con-mod -4)");
            expect(await ok("write", "Ettore", "--set", "level=1")).toContain("hp 14/14 (max 0 → 14");
            expect(pageText("Ettore")).toContain("hp: 14/14");
        });

        it("works out the maximum of a counter the page writes without one", async () => {
            await ok("write", "Mira", "--type", "character", "--set", "role=companion", "--set", "level=1", "--set", "con=14", "--set", "hp-base=8", "--set", "hp=10");
            expect(pageText("Mira")).toContain("hp: 10/10");
        });
    });

    describe("a computed field is never written (FOR-7)", () => {
        it("is left out by write, refused by change and by effect, which say what to change instead", async () => {
            expect(await ok("write", "Ettore", "--set", "insight=9", "--set", "speed=25 ft")).toBe(
                "Updated Ettore (character, world/characters/Ettore.md): set speed.\n"
                    + "Not written, the system 5e works it out: insight +5 (you gave 9). They come from wis, level, bonus-proficiency, skill-proficiencies, expertise, features, bonus-skills. "
                    + "A bonus such as bonus-skills comes from an effect, for what gives one, such as a magic item.",
            );
            expect(await refused("write", "Ettore", "--set", "proficiency=3", "--set", "perception=7")).toBe(
                "Not written, the system 5e works them out: proficiency +2 (you gave 3); perception +3 (you gave 7). They come from level, bonus-proficiency, wis, skill-proficiencies, expertise, features, bonus-skills. "
                    + "A bonus such as bonus-proficiency comes from an effect, for what gives one, such as a magic item. Nothing changed.",
            );
            expect(await refused("change", "Ettore", "insight", "--by=1")).toBe(
                "insight on Ettore is +5, worked out by the system 5e from wis, level, bonus-proficiency, skill-proficiencies, expertise, features, bonus-skills: change one of those, or give bonus-skills with an effect; "
                    + "bonus-skills also changes the other fields that read it, so for insight alone add the number to its roll. Nothing changed.",
            );
            expect(await refused("effect", "add", "Ettore", "Strano", "--set", "insight=9")).toContain(
                "such as bonus-skills; bonus-skills also changes the other fields that read it, so for insight alone add the number to its roll. Nothing changed.",
            );
        });

        it("is said by validate when written by hand, with a maximum that does not match", async () => {
            writeFileSync(join(folder, "world", "characters", "Ettore.md"), pageText("Ettore").replace("hp: 24/24", "hp: 24/30").replace("hp-base: 18", "hp-base: 18\nperception: 7"));
            const output = await ok("validate");
            expect(output).toContain("- world/characters/Ettore.md: perception is worked out by the system 5e (+3): the value written on Ettore is never read. Fix: write Ettore, unset perception.");
            expect(output).toContain("- world/characters/Ettore.md: hp on Ettore has the maximum 30 written, but the system 5e works out 24. Fix: change Ettore, field hp, to 24/24.");
        });
    });

    describe("laws of the worked-out sheet", () => {
        const step = fc.oneof(
            fc.record({ kind: fc.constant("score"), field: fc.constantFrom("str", "dex", "con", "wis", "cha"), value: fc.integer({ min: 3, max: 20 }) }),
            fc.record({ kind: fc.constant("level"), value: fc.integer({ min: 1, max: 20 }) }),
            fc.record({ kind: fc.constant("skill"), skill: fc.constantFrom("Insight", "Athletics", "Perception") }),
            fc.record({ kind: fc.constant("save"), ability: fc.constantFrom("str", "wis") }),
            fc.record({ kind: fc.constant("effect"), name: fc.constantFrom("Ring", "Cloak", "Stone"), bonus: fc.integer({ min: 1, max: 3 }) }),
            fc.record({ kind: fc.constant("strength"), value: fc.option(fc.integer({ min: 15, max: 25 })) }),
        );

        it("works every value out as the SRD counts it, and keeps the written maximum in pair, after any writes and effects (FOR-3–FOR-6)", async () => {
            await fc.assert(
                fc.asyncProperty(fc.array(step, { minLength: 1, maxLength: 6 }), async (steps) => {
                    await campaign.close();
                    campaign = await fifthEdition({ language: "it", play: false });
                    folder = campaign.folder;
                    await ok(...ettore());
                    const scores: Record<string, number> = { str: 14, dex: 8, con: 15, int: 10, wis: 16, cha: 12 };
                    let level = 3;
                    const skills = new Set(["Insight", "Religion", "Medicine", "Persuasion"]);
                    const saves = new Set(["wis", "cha"]);
                    const bonuses = new Map<string, number>();
                    let gauntlets: number | undefined;

                    for (const action of steps) {
                        if (action.kind === "score") {
                            await ok("write", "Ettore", "--set", `${action.field}=${action.value}`);
                            scores[action.field] = action.value;
                        } else if (action.kind === "level") {
                            await ok("write", "Ettore", "--set", `level=${action.value}`);
                            level = action.value;
                        } else if (action.kind === "skill") {
                            // Added when it is not there, removed when it is.
                            const add = !skills.has(action.skill);
                            await ok("write", "Ettore", add ? "--add" : "--remove", `skill-proficiencies=${action.skill}`);
                            add ? skills.add(action.skill) : skills.delete(action.skill);
                        } else if (action.kind === "save") {
                            const add = !saves.has(action.ability);
                            await ok("write", "Ettore", add ? "--add" : "--remove", `save-proficiencies=${action.ability}`);
                            add ? saves.add(action.ability) : saves.delete(action.ability);
                        } else if (action.kind === "effect") {
                            await ok("effect", "add", "Ettore", action.name, "--set", `bonus-saves=${action.bonus}`);
                            bonuses.set(action.name, action.bonus);
                        } else if (action.value === null) {
                            if (gauntlets !== undefined) {
                                await ok("effect", "end", "Ettore", "Gauntlets");
                            }

                            gauntlets = undefined;
                        } else {
                            await ok("effect", "add", "Ettore", "Gauntlets", "--set", `str=${action.value}`);
                            gauntlets = action.value;
                        }

                        // The SRD's own counting: modifiers (p. 76), proficiency (p. 56), saves (p. 83), skills (p. 77), passive Perception (p. 78).
                        const strength = gauntlets ?? scores.str;
                        const mod = (score: number): number => Math.floor((score - 10) / 2);
                        const proficiency = 2 + Math.floor((level - 1) / 4);
                        const bonus = [...bonuses.values()].reduce((total, value) => total + value, 0);
                        const perception = mod(scores.wis) + (skills.has("Perception") ? proficiency : 0);
                        expect(await worked("Ettore")).toMatchObject({
                            "str-mod": mod(strength),
                            proficiency,
                            "str-save": mod(strength) + (saves.has("str") ? proficiency : 0) + bonus,
                            "wis-save": mod(scores.wis) + (saves.has("wis") ? proficiency : 0) + bonus,
                            athletics: mod(strength) + (skills.has("Athletics") ? proficiency : 0),
                            insight: mod(scores.wis) + (skills.has("Insight") ? proficiency : 0),
                            "passive-perception": 10 + perception,
                        });
                        // Written without the effects, which never change the scores here but the strength, and never below 0.
                        expect(pageText("Ettore")).toMatch(new RegExp(`hp: \\d+/${Math.max(0, 18 + level * mod(scores.con))}\\n`));
                    }
                }),
                { numRuns: 12 },
            );
        }, 120000);

        it("adds up the bonuses of effects in any order (FOR-5)", async () => {
            const effects = fc.uniqueArray(fc.record({ name: fc.constantFrom("Ring", "Cloak", "Stone", "Blessing"), bonus: fc.integer({ min: 1, max: 4 }) }), { selector: (effect) => effect.name, minLength: 1 });
            await fc.assert(
                fc.asyncProperty(effects, async (given) => {
                    for (const effect of ["Ring", "Cloak", "Stone", "Blessing"]) {
                        await campaign.run("effect", "end", "Ettore", effect);
                    }

                    for (const effect of given) {
                        await ok("effect", "add", "Ettore", effect.name, "--set", `bonus-saves=${effect.bonus}`);
                    }

                    const total = given.reduce((sum, effect) => sum + effect.bonus, 0);
                    expect((await worked("Ettore"))["wis-save"]).toBe(5 + total);
                }),
                { numRuns: 15 },
            );
        }, 60000);
    });
});
