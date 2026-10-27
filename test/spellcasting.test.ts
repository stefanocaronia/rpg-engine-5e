// A character's spellcasting on the 5e (D-227, PRO-5): slots by caster level, a warlock's Pact Magic and Mystic Arcanum, and the save DC, attack and prepared
// spells of each class, worked out from the formulas of its page.
import type { TestCampaign } from "rpg-engine/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fifthEdition } from "./support.ts";

let campaign: TestCampaign;

beforeEach(async () => {
    campaign = await fifthEdition({ play: false });
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

/** A character of the party with these classes: str 10, dex 14, con 14, int 16, wis 16, cha 14 (+0, +2, +2, +3, +3, +2). */
async function caster(name: string, classes: string): Promise<string>
{
    const fields = ["role=pc", "creature=[[Human]]", `classes=${classes}`, "str=10", "dex=14", "con=14", "int=16", "wis=16", "cha=14", "hp-base=30"];
    await ok("write", name, "--type", "character", ...fields.flatMap((field) => ["--set", field]));
    return ok("show", `${name}#Spells`);
}

describe("spell slots by caster level (D-227, p. 57)", () => {
    it("gives a single class the slots of its own table", async () => {
        expect(await caster("Ada", "[[Wizard]] 5")).toContain("slots-1 4/4: the maximum from");
        const wizard = await ok("show", "Ada");
        expect(wizard).toContain("Spells: caster-level 5 · spell-save-dc 14 · spell-attack +6 · slots-1 4/4 · slots-2 3/3 · slots-3 2/2 · max-prepared 8");
    });

    it("gives a paladin or ranger slots from 2nd level, as its own table does", async () => {
        // A paladin's first level gives no spellcasting: a caster level of 0, no save DC, no slots.
        const first = await caster("Pia", "[[Paladin]] 1");
        expect(first).toContain("caster-level 0");
        expect(first).not.toMatch(/spell-save-dc|slots-1/);
        await ok("write", "Pia", "--set", "classes=[[Paladin]] 2");
        expect(await ok("show", "Pia")).toContain("Spells: caster-level 1 · spell-save-dc 12 · spell-attack +4 · slots-1 2/2 · max-prepared 3");
        await ok("write", "Pia", "--set", "classes=[[Paladin]] 5");
        expect(await ok("show", "Pia")).toContain("caster-level 3 · spell-save-dc 13 · spell-attack +5 · slots-1 4/4 · slots-2 2/2");
    });

    it("adds up the levels of two spellcasting classes, half of a paladin's, and gives the save DC and attack of each class", async () => {
        const shown = await caster("Elara", "[[Cleric]] 3, [[Wizard]] 2");
        expect(shown).toContain("caster-level 5: 5 in classes");
        const sheet = await ok("show", "Elara");
        expect(sheet).toContain("spell-save-dc Cleric 14, Wizard 14 · spell-attack Cleric +6, Wizard +6 · slots-1 4/4 · slots-2 3/3 · slots-3 2/2 · max-prepared Cleric 6, Wizard 5");
        await ok("write", "Elara", "--set", "classes=[[Paladin]] 4, [[Wizard]] 1");
        expect(await ok("show", "Elara")).toContain("caster-level 3 · spell-save-dc Paladin 13, Wizard 14 · spell-attack Paladin +5, Wizard +6 · slots-1 4/4 · slots-2 2/2");
    });

    it("gives a fighter no spells, and never writes a spellcasting number by hand", async () => {
        await caster("Gara", "[[Fighter]] 5");
        expect(await ok("show", "Gara")).not.toContain("Spells:");
        await ok("write", "Ada", "--type", "character", "--set", "role=companion", "--set", "creature=[[Human]]", "--set", "classes=[[Wizard]] 1", "--set", "int=16");
        expect(await ok("write", "Ada", "--set", "spell-save-dc=15", "--set", "xp=10")).toContain("Not written, the system 5e works it out: spell-save-dc 13 (you gave 15).");
    });
});

describe("a warlock's Pact Magic and Mystic Arcanum (pp. 47, 49)", () => {
    it("keeps its pact slots apart, of the level its table gives, back with a short rest, and Mystic Arcanum back with a long rest", async () => {
        await caster("Vex", "[[Warlock]] 3");
        const shown = await ok("show", "Vex");
        expect(shown).toContain("slot-level 2nd");
        expect(shown).toContain("spell-slots 2/2");
        expect(shown).not.toContain("slots-1");
        await ok("change", "Vex", "spell-slots", "--by=-2");
        expect(await ok("change", "Vex", "--recipe", "short rest")).toContain("spell-slots 0/2 → 2/2");
        await ok("write", "Vex", "--set", "classes=[[Warlock]] 11");
        expect(await ok("show", "Vex#Spells")).toContain("mystic-arcanum-6 1/1: the maximum from Warlock 11 in classes");
    });
});

describe("the spells a character knows and prepares (D-227)", () => {
    it("lists them as links to the system's spells, which show gives and validate checks", async () => {
        await caster("Ada", "[[Wizard]] 5");
        await ok("write", "Ada", "--set", "spells=[[Fire Bolt]], [[Magic Missile]], [[Shield (spell)]], [[Fireball]]", "--set", "prepared=[[Magic Missile]], [[Fireball]]");
        expect(await ok("show", "Ada#Spells")).toContain("spells Fire Bolt, Magic Missile, Shield (spell), Fireball\nprepared Magic Missile, Fireball");
        expect(await ok("show", "Fireball")).toContain("spell-level: 3");
        expect(await ok("validate")).toBe("No problems.");
        await ok("write", "Ada", "--add", "spells=[[Palla di neve]]");
        expect(await ok("validate")).toContain("Palla di neve");
    });
});

describe("what the master is told when it writes and spends spells (D-216, D-227, DAT-9)", () => {
    it("says when a spell has no page, or shares its name with another page, and gives each class's list by level", async () => {
        await caster("Ada", "[[Wizard]] 5");
        const written = await ok("write", "Ada", "--set", "spells=[[Palla di fuoco]], [[Shield]], [[Magic Missile]]");
        expect(written).toContain("No page for [[Palla di fuoco]] yet: create it with write if it belongs to this world, or link a page that exists.");
        expect(written).toContain("[[Shield]] is an item of the system 5e; there is also Shield (spell).");
        expect(await ok("validate")).toContain("Fix: create Palla di fuoco with write if it belongs to this world, or write Ada, remove spells=[[Palla di fuoco]] if the link is wrong.");
        expect(await ok("show", "Wizard Spells#1st Level")).toContain("- [[Magic Missile]]\n");
        // After the campaign's own pages, the system's by name first: the name itself, then those that begin with it, as Shield (spell) and the magic shields.
        const found = (await ok("find", "shield")).split("\n");
        expect(found[1]).toBe("Shield (item, system 5e)");
        expect(found.slice(2, 5)).toContain("Shield (spell) (topic, system 5e)");
    });

    it("refuses a use the character does not get, by change and by write, without a remedy that would make one up", async () => {
        await caster("Ada", "[[Wizard]] 5");
        expect(await refused("change", "Ada", "spell-slots", "--by=-1")).toContain("Ada has no spell-slots: the system 5e gives it from the tables of its classes, and Ada has none from them. Its counters:");
        expect(await refused("write", "Ada", "--set", "spell-slots=12/12")).toBe("spell-slots is a use the system 5e gives from the tables of its classes, and Ada has none of it: it is not written by hand. Nothing changed.");
        await caster("Vex", "[[Warlock]] 3");
        expect(await refused("write", "Vex", "--set", "slots-1=12/12")).toContain("slots-1 is a use the system 5e gives from caster-level, and Vex has none of it");
    });

    it("adds what an item gives to the save DC and the attack, and says what a new level changes, once", async () => {
        await caster("Ada", "[[Wizard]] 5");
        await ok("effect", "add", "Ada", "Robe of the Archmagi", "--set", "bonus-spell-dc=2", "--set", "bonus-spell-attack=2");
        expect(await ok("show", "Ada")).toContain("spell-save-dc 16 · spell-attack +8");
        const risen = await ok("write", "Ada", "--set", "classes=[[Wizard]] 6", "--set", "hp-base=34");
        expect(risen).toContain("max-prepared 8 → 9");
        expect(risen).not.toContain("Each new level gives hit points");
        expect(await ok("write", "Ada", "--set", "classes=[[Wizard]] 7")).toContain("Each new level gives hit points");
    });
});

describe("the formulas of a class's page (PRO-5)", () => {
    it("has validate report one that does not read", async () => {
        await ok("write", "Arcanista", "--type", "topic", "--set", "category=class", "--set", 'spell-save-dc="8 + proficiency +"', "--text", "| Level | Features |\n|---|---|\n| 1st | — |");
        await caster("Ugo", "[[Arcanista]] 1");
        expect(await ok("validate")).toContain("spell-save-dc on Arcanista does not read, so Ugo has none from it:");
        await ok("write", "Arcanista", "--set", 'spell-save-dc="8 + spell-save-dc"', "--set", 'max-prepared="int-mood + 1"', "--set", 'spell-attack="table(nessuna, level)"');
        const problems = await ok("validate");
        expect(problems).toContain("spell-save-dc on Arcanista reads itself, so Ugo has none from it.");
        expect(problems).toContain("max-prepared on Arcanista reads int-mood, which neither the system nor the character has, so Ugo has none from it.");
        expect(problems).toContain('spell-attack on Arcanista reads the table "nessuna", which the system lacks, so Ugo has none from it.');
    });
});

describe("the spells a subclass keeps prepared (PRO-7, pp. 16, 32)", () => {
    it("adds a domain's spells by the cleric's level, apart and not counted, and says when one is written by hand", async () => {
        await caster("Marta", "[[Cleric]] 1");
        await ok("write", "Marta", "--set", "subclasses=[[Life Domain]]", "--set", "prepared=[[Healing Word]], [[Guiding Bolt]]");
        expect(await ok("show", "Marta#Spells")).toContain("max-prepared 4: wis-mod +3, Cleric in classes\n");
        expect(await ok("show", "Marta")).toContain("prepared Healing Word, Guiding Bolt; always, from Life Domain: Bless, Cure Wounds");
        expect(await ok("write", "Marta", "--add", "prepared=[[Cure Wounds]]")).toContain(
            "Cure Wounds is always in prepared, from Life Domain, and not counted with the rest: write Marta, remove prepared=Cure Wounds, to choose another in its place.",
        );
        expect(await ok("show", "Marta")).toContain("prepared Healing Word, Guiding Bolt; always, from Life Domain: Bless, Cure Wounds");
        await ok("write", "Marta", "--set", "classes=[[Cleric]] 3");
        expect(await ok("show", "Marta#Spells")).toContain("always, from Life Domain: Bless, Cure Wounds, Lesser Restoration, Spiritual Weapon");
    });

    it("gives an oath's spells from the paladin's 3rd level, and none to a class whose subclass lists none", async () => {
        await caster("Paolo", "[[Paladin]] 2");
        await ok("write", "Paolo", "--set", "subclasses=[[Oath of Devotion]]");
        expect(await ok("show", "Paolo")).not.toContain("always, from");
        await ok("write", "Paolo", "--set", "classes=[[Paladin]] 3");
        expect(await ok("show", "Paolo#Spells")).toContain("prepared always, from Oath of Devotion: Protection from Evil and Good, Sanctuary");
        expect(await caster("Ada", "[[Wizard]] 2")).not.toContain("always, from");
    });
});
