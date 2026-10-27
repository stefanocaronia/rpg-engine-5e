// The rows of their tables that the 5e's classes give a character, and its features (D-201, D-219, PRO-1–PRO-4), through the commands.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TestCampaign } from "rpg-engine/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fifthEdition } from "./support.ts";

describe("what the classes give, through the commands (PRO-1–PRO-4)", () => {
    let campaign: TestCampaign;

    beforeEach(async () => {
        campaign = await fifthEdition({ play: false });
        await ok(
            "write",
            "Brann",
            "--type",
            "character",
            ...["role=pc", "creature=[[Human]]", "classes=[[Barbarian]] 3", "subclasses=[[Path of the Berserker]]", "str=16", "dex=14", "con=15", "int=8", "wis=12", "cha=10"]
                .flatMap((field) => ["--set", field]),
        );
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

    it("gives the row of the class's table and the features up to the level, with the subclass's at the level of its class", async () => {
        const shown = await ok("show", "Brann");
        expect(shown).toContain("Features: features Rage, Unarmored Defense, Reckless Attack, Danger Sense, Primal Path, Frenzy · rages 3/3 · rage-damage +2");
        expect(shown).toContain("show Brann#Rage gives the text of a feature.");
        expect(await ok("show", "Brann#Features")).toContain(
            "features Rage, Unarmored Defense, Reckless Attack, Danger Sense, Primal Path, Frenzy: Barbarian 3 in classes, Path of the Berserker in subclasses\n"
                + "rages 3/3: the maximum from Barbarian 3 in classes\nrage-damage +2: Barbarian 3 in classes",
        );
    });

    it("gives the text of a feature from the page that tells it", async () => {
        const rage = await ok("show", "Brann#rage");
        expect(rage).toContain("A feature of Brann, from Barbarian.");
        expect(rage).toContain("In battle, you fight with primal ferocity.");
        expect(await ok("show", "Brann#Frenzy")).toContain("A feature of Brann, from Path of the Berserker.");
        // A feature of a level not reached yet is not Brann's.
        expect(await refused("show", "Brann#Mindless Rage")).toContain('Brann has no section or secret "Mindless Rage".');
    });

    it("says what a new level gives, and a later value in parentheses replaces the earlier", async () => {
        expect(await ok("write", "Brann", "--set", "classes=[[Barbarian]] 9")).toContain(
            "What Brann's classes give: Ability Score Improvement, Extra Attack, Fast Movement, Mindless Rage, Feral Instinct, Brutal Critical (1 die) are new; "
                + "rage-damage +2 → +3. show Brann#Ability Score Improvement gives a feature's text.",
        );
        await ok("write", "Brann", "--set", "classes=[[Barbarian]] 13");
        expect(await ok("show", "Brann")).toContain("Brutal Critical (2 dice)");
        expect(await ok("write", "Brann", "--set", "classes=[[Barbarian]] 13")).not.toContain("What Brann's classes give");
    });

    it("gives the same column of two classes for each class, and keeps a feature two classes give once (PRO-2)", async () => {
        const written = await ok("write", "Brann", "--set", "classes=[[Bard]] 2, [[Wizard]] 1, [[Cleric]] 6", "--set", "subclasses=[[Life Domain]]");
        expect(written).toContain("cantrips-known none → Bard 2, Wizard 3, Cleric 4");
        const shown = await ok("show", "Brann");
        expect(shown).toContain("Channel Divinity (2/rest)");
        expect(shown).toContain("Jack of All Trades");
        expect(shown).not.toContain("Divine Domain feature");
        expect(shown).not.toContain("Frenzy");
    });

    it("never writes what the rows give, and refuses to change it; a feature written by hand that a row gives counts once (PRO-3)", async () => {
        const written = await ok("write", "Brann", "--set", "rage-damage=+3", "--set", "features=[Rage]", "--set", "xp=900");
        expect(written).toContain("Not written, the system 5e works it out: rage-damage +2 (you gave +3). They come from classes, subclasses.");
        expect(await ok("show", "Brann#Features")).toContain("features Rage, Unarmored Defense");
        expect(await refused("effect", "add", "Brann", "Furia sacra", "--set", "rage-damage=+4")).toBe(
            "rage-damage on Brann is what its classes and subclasses give, from the tables of their pages: an effect cannot change it. Nothing changed.",
        );
    });

    it("works the same with a class and a subclass the campaign writes (D-216)", async () => {
        const table = "| Level | Proficiency Bonus | Features | Blood Maledict |\n|---|---|---|---|\n| 1st | +2 | Hunter's Bane | — |\n| 2nd | +2 | Crimson Rite, Path feature | 1 |";
        await ok("write", "Blood Hunter", "--type", "topic", "--set", "category=class", "--set", "hit-die=d10", "--text", `${table}\n\n### Hunter's Bane\nYou track.\n\n### Crimson Rite\nYou bleed.`);
        await ok("write", "Order of the Lycan", "--type", "topic", "--set", "category=subclass", "--set", "class=[[Blood Hunter]]", "--set", "features=[Heightened Senses 2]", "--text", "### Heightened Senses\nYou smell.");
        await ok("write", "Vex", "--type", "character", "--set", "role=companion", "--set", "classes=[[Blood Hunter]] 2", "--set", "subclasses=[[Order of the Lycan]]");
        const shown = await ok("show", "Vex");
        expect(shown).toContain("Features: features Hunter's Bane, Crimson Rite, Heightened Senses · blood-maledict 1");
        expect(await ok("show", "Vex#Heightened Senses")).toContain("You smell.");
    });

    it("gives the text of a feature two classes give from each, in the order of the classes (D-224)", async () => {
        await ok("write", "Brann", "--set", "classes=[[Cleric]] 3, [[Wizard]] 2", "--unset", "subclasses");
        const spellcasting = await ok("show", "Brann#Spellcasting");
        expect(spellcasting).toContain("A feature of Brann, from Cleric, Wizard.");
        expect(spellcasting.indexOf("From Cleric:")).toBeLessThan(spellcasting.indexOf("From Wizard:"));
        expect(spellcasting).toContain("Wisdom is your spellcasting ability");
        expect(spellcasting).toContain("Intelligence is your spellcasting ability");
    });

    it("says a feature gained again or with a new value, the system's note for a new level, and takes off the uses a lower level no longer gives (D-226, DAT-9)", async () => {
        expect(await ok("write", "Brann", "--set", "classes=[[Barbarian]] 4")).toContain("Ability Score Improvement is new");
        const eighth = await ok("write", "Brann", "--set", "classes=[[Barbarian]] 8");
        expect(eighth).toContain("What Brann's classes give: Extra Attack, Fast Movement, Mindless Rage, Feral Instinct are new; Ability Score Improvement again.");
        expect(eighth).toContain("Each new level gives hit points, but a new character's first, which takes the largest number of its class's hit die: for each, roll the hit die of the class that rose");
        await ok("write", "Lio", "--type", "character", "--set", "role=pc", "--set", "creature=[[Human]]", "--set", "classes=[[Bard]] 4", "--set", "cha=14");
        expect(await ok("write", "Lio", "--set", "classes=[[Bard]] 5")).toContain(
            "Font of Inspiration is new; Bardic Inspiration (d6 → d8); spells-known 7 → 8, spell-save-dc 12 → 13, spell-attack +4 → +5. show Lio#Font of Inspiration gives a feature's text.",
        );
        const lower = await ok("write", "Brann", "--set", "classes=[[Fighter]] 1", "--unset", "subclasses");
        expect(lower).toContain("Brann no longer has hit-dice-d12, rages: the system 5e gives no uses of them now.");
        expect(lower).not.toContain("Each new level gives hit points");
        expect(readFileSync(join(campaign.folder, "world", "characters", "Brann.md"), "utf8")).not.toContain("rages:");
        // A use whose maximum reads a score as well as the features goes too, when the features no longer give it.
        expect(await ok("write", "Lio", "--set", "classes=[[Fighter]] 1")).toContain("Lio no longer has hit-dice-d8, bardic-inspiration, slots-1, slots-2, slots-3");
    });

    it("gives a paladin Channel Divinity from the Sacred Oath, whatever oath (p. 32)", async () => {
        await ok("write", "Brann", "--set", "classes=[[Paladin]] 3", "--unset", "subclasses");
        expect(await ok("show", "Brann")).toContain("channel-divinity 1/1");
    });

    it("has validate report a class without a level or without a page", async () => {
        await ok("write", "Brann", "--set", "classes=[[Barbarian]]", "--unset", "subclasses");
        expect(await ok("validate")).toContain("Barbarian in classes on Brann has no level, so it gives nothing. Fix: write Brann, set classes with each level, such as [[Barbarian]] 1.");
        await ok("write", "Brann", "--set", "classes=Guerriero 3");
        expect(await ok("validate")).toContain("classes on Brann names Guerriero, which has no page, so it gives nothing.");
    });

    it("has validate report a class without a table of levels or a row, and a subclass that gives nothing", async () => {
        await ok("write", "Blood Hunter", "--type", "topic", "--set", "category=class", "--text", "No table here.");
        await ok("write", "Order of the Lycan", "--type", "topic", "--set", "category=subclass", "--set", "features=[Heightened Senses]");
        await ok("write", "Brann", "--set", "classes=[[Barbarian]] 21, [[Blood Hunter]] 1", "--set", "subclasses=[[Path of the Berserker]], [[Order of the Lycan]], [[Champion]]");
        const problems = await ok("validate");
        expect(problems).toContain("Barbarian has no row for level 21 in its table, so classes on Brann gives nothing from it.");
        expect(problems).toContain("Blood Hunter has no table with a Features column whose first column counts levels, so classes on Brann gives nothing from it.");
        expect(problems).toContain("Order of the Lycan names no class, so it adds no features to Brann.");
        expect(problems).toContain("Champion is a part of Fighter, which is not in classes on Brann: it adds nothing.");
    });
});
