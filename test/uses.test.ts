// What a 5e character holds and spends (DAT-3, DAT-9, LIM-1, TRN-1, TRN-5): the uses its classes, features and abilities give, a legendary creature's turns,
// the most of its sheet, and its exhaustion.
import type { TestCampaign } from "rpg-engine/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fifthEdition } from "./support.ts";

let campaign: TestCampaign;

afterEach(() => campaign.close());

describe("the 5e's uses", () => {
    beforeEach(async () => {
        campaign = await fifthEdition({ play: false });
    });

    /** A character of the party with these classes, its abilities at 14 and its race human unless given. */
    async function character(name: string, ...fields: string[]): Promise<string>
    {
        const given = new Set(fields.map((field) => field.split("=")[0]));
        const base = ["role=pc", "creature=[[Human]]", "str=14", "dex=14", "con=14", "int=14", "wis=14", "cha=14", "hp-base=20"].filter((field) => !given.has(field.split("=")[0]));
        return ok("write", name, "--type", "character", ...[...base, ...fields].flatMap((field) => ["--set", field]));
    }

    it("writes the uses its classes give full, with the hit points and the hit dice, and says so", async () => {
        const written = await character("Gara", "classes=[[Fighter]] 2");
        expect(written).toContain("Gara has hp 24/24, hit-dice-d10 2/2, action-surge 1/1, second-wind 1/1, full: uses of the system 5e that come back with a rest.");
        expect(await ok("show", "Gara")).toContain("Features: features Fighting Style, Second Wind, Action Surge (one use) · action-surge 1/1 · second-wind 1/1");
    });

    it("takes the maximum of a use from the class's row, and from the features and the abilities", async () => {
        await character("Bruk", "classes=[[Barbarian]] 6, [[Cleric]] 6", "cha=16");
        const shown = await ok("show", "Bruk");
        expect(shown).toContain("rages 4/4");
        expect(shown).toContain("channel-divinity 2/2");
        await character("Lirà", "classes=[[Bard]] 1, [[Paladin]] 3", "subclasses=[[Oath of Devotion]]", "cha=16");
        const bard = await ok("show", "Lirà");
        // Paladin's Channel Divinity from its oath, Bardic Inspiration as many as the Charisma modifier, Divine Sense one more, Lay on Hands 5 per level.
        expect(bard).toContain("channel-divinity 1/1");
        expect(bard).toContain("bardic-inspiration 3/3");
        expect(bard).toContain("divine-sense 4/4");
        expect(bard).toContain("lay-on-hands 15/15");
    });

    it("brings back a bard's inspiration with a short rest only from Font of Inspiration, and 4 sorcery points from Sorcerous Restoration", async () => {
        await character("Lirà", "classes=[[Bard]] 4");
        await ok("change", "Lirà", "bardic-inspiration", "--by=-1");
        expect(await ok("change", "--recipe", "short rest")).toContain("Not brought back: bardic-inspiration 1/2.");
        await ok("write", "Lirà", "--set", "classes=[[Bard]] 5");
        expect(await ok("change", "--recipe", "short rest")).toContain("bardic-inspiration 1/2 → 2/2");
        await character("Sef", "classes=[[Sorcerer]] 20");
        await ok("change", "Sef", "sorcery-points", "--by=-10");
        expect(await ok("change", "Sef", "--recipe", "short rest")).toContain("sorcery-points 10/20 → 14/20");
    });

    it("shows the rule of exhaustion when write gives it to the player character (DAT-3)", async () => {
        await character("Gara", "classes=[[Fighter]] 1");
        expect(await ok("write", "Gara", "--set", "exhaustion=1/6")).toContain("exhaustion changed: Exhaustion, from the rules of 5e:");
    });

    it("adds half the proficiency bonus to a check without it: Jack of All Trades rounded down, Remarkable Athlete rounded up on Strength, Dexterity and Constitution (D-222)", async () => {
        await character("Lirà", "classes=[[Bard]] 2", "skill-proficiencies=[Performance]");
        const bard = await ok("show", "Lirà");
        // Proficiency +2: half is +1, on every check without the proficiency, initiative too; none on a skill it is proficient in.
        expect(bard).toContain("athletics +3 · deception +3");
        expect(bard).toContain("performance +4 ●");
        expect(bard).toContain("initiative +3");
        expect(await ok("show", "Lirà#Skills")).toContain("athletics +3: str-mod +2, proficiency +2, Jack of All Trades in features");
        await character("Gara", "classes=[[Fighter]] 7", "subclasses=[[Champion]]");
        const champion = await ok("show", "Gara");
        // Proficiency +3: half rounded up is +2, on Strength and Dexterity checks only.
        expect(champion).toContain("acrobatics +4 · animal-handling +2 · arcana +2 · athletics +4");
        expect(champion).toContain("initiative +4");
    });

    it("adds Aura of Protection to a paladin's own saves, at least 1 (D-222)", async () => {
        await character("Ser", "classes=[[Paladin]] 6", "cha=8", "save-proficiencies=[wis, cha]");
        expect(await ok("show", "Ser")).toContain("Saving Throws: str-save +3 · dex-save +3 · con-save +3 · int-save +3 · wis-save +6 ● · cha-save +3 ●");
    });
});

describe("the 5e's turns", () => {
    beforeEach(async () => {
        campaign = await fifthEdition({ language: "it" });
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "classes=[[Fighter]] 5", "--set", "hp-base=44");
        await ok("scene", "open", "--title", "Cripta", "--type", "combat", "--with", "Ettore", "--creatures", "Adult Green Dragon=1");
        await ok("scene", "order", "--order", "Ettore", "--order", "Adult Green Dragon 1");
    });

    it("counts a dragon's legendary actions in others' turns, back at its own, keeps its Legendary Resistance, and refuses a condition it is immune to (D-454)", async () => {
        expect(await use("Adult Green Dragon 1", "legendary action")).toBe("Adult Green Dragon 1: legendary action used.");
        await use("Adult Green Dragon 1", "legendary action");
        await use("Adult Green Dragon 1", "legendary action");
        expect(await refused("Adult Green Dragon 1", "legendary action")).toContain("Adult Green Dragon 1 has used 3 legendary action until its next turn");
        expect(await refused("Ettore", "legendary action")).toBe("Ettore has no legendary action: it comes from what the sheet has, as a feature. Nothing changed.");
        expect(await ok("change", "Adult Green Dragon 1", "legendary-resistance", "--by=-1")).toBe("Adult Green Dragon 1: legendary-resistance 3/3 → 2/3.");
        await ok("scene", "next");
        expect(await use("Adult Green Dragon 1", "legendary action")).toBe("Adult Green Dragon 1: legendary action used.");
        expect((await campaign.run("effect", "add", "Adult Green Dragon 1", "Poisoned")).output).toBe(
            "Adult Green Dragon 1 is immune to Poisoned, in its condition-immunities: it does not take it. Nothing changed.",
        );
    });

    it("counts Thirsting Blade as Extra Attack, and Action Surge as one more action (TRN-1, TRN-5)", async () => {
        expect(await ok("show", "Ettore")).toContain("extra-attacks 1");
        await use("Ettore", "attack");
        await use("Ettore", "attack");
        expect(await use("Ettore", "attack", "Action Surge")).toBe("Ettore: attack 1 of 2, its action used, by Action Surge; action-surge 1 → 0.");
        await ok("write", "Corvo", "--type", "character", "--set", "role=companion", "--set", "classes=[[Warlock]] 5", "--set", "hp-base=30", "--add", "invocations=Thirsting Blade");
        expect(await ok("show", "Corvo")).toContain("extra-attacks 1");
    });
});

describe("the 5e's most of a sheet", () => {
    beforeEach(async () => {
        campaign = await fifthEdition({ language: "it" });
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "classes=[[Cleric]] 1", "--set", "wis=16", "--set", "hp-base=8");
    });

    it("refuses an ability score above 20, and takes one a manual raises with an effect (LIM-1)", async () => {
        expect((await campaign.run("write", "Ettore", "--set", "wis=21")).output).toContain("Ettore would have wis 21, more than 20, the most 5e allows");
        await ok("effect", "add", "Ettore", "Manual of Quickness of Action", "--set", "bonus-dex-max=2");
        await ok("write", "Ettore", "--set", "dex=22");
        expect((await campaign.run("write", "Ettore", "--set", "dex=23")).output).toContain("more than 22, the most 5e allows");
    });

    it("refuses a spell prepared past the most the class allows (LIM-1)", async () => {
        // A cleric of the first level with Wisdom 16 prepares 1 + 3 = 4.
        await ok("write", "Ettore", "--set", "prepared=[[Bless]], [[Cure Wounds]], [[Guiding Bolt]], [[Shield of Faith]]");
        const fifth = await campaign.run("write", "Ettore", "--add", "prepared=[[Sanctuary]]");
        expect(fifth.output).toBe("Ettore would have 5 in prepared, more than 4, the most 5e allows: remove one first, such as remove prepared=[[Bless]]. Nothing changed.");
        await ok("write", "Ettore", "--remove", "prepared=[[Bless]]", "--add", "prepared=[[Sanctuary]]");
    });
});

describe("the 5e's exhaustion", () => {
    beforeEach(async () => {
        campaign = await fifthEdition({ language: "it" });
        await ok("config", "rigor", "rules");
        await ok("advance", "--to", "day 1, 18:00");
        await ok("write", "Bosco", "--type", "place");
    });

    it("halves the hit point maximum from level 4 (p. 358)", async () => {
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "con=14", "--set", "classes=[[Fighter]] 1", "--set", "hp-base=10", "--set", "hp=12/12");
        await ok("write", "Bosco", "--add", "contains=[[Ettore]]");
        await ok("change", "Ettore", "exhaustion", "--to", "4");
        expect(await ok("show", "Ettore")).toContain("hp 6/6");
    });
});

async function use(who: string, uses: string, by?: string): Promise<string>
{
    return ok("scene", "use", "--who", who, "--uses", uses, ...(by === undefined ? [] : ["--by", by]));
}

async function refused(who: string, uses: string): Promise<string>
{
    const result = await campaign.run("scene", "use", "--who", who, "--uses", uses);
    expect(result.exitCode).toBe(1);
    return result.output;
}

async function ok(...args: string[]): Promise<string>
{
    const result = await campaign.run(...args);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
