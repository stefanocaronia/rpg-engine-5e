// The game system's data for the engine (MECCANICHE, DAT-1–DAT-7): the cases of the table, through the commands, in a campaign played in Italian with the system 5e.
import fc from "fast-check";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestCampaign } from "rpg-engine/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fifthEdition } from "./support.ts";

let campaign: TestCampaign;
let folder: string;

beforeEach(atTheInn);

afterEach(() => campaign.close());

/** A campaign in Italian with the system 5e: Ennio, the player character, and Lena, a companion derived from a Commoner, both wounded at the inn. */
async function atTheInn(): Promise<void>
{
    campaign = await fifthEdition({ language: "it" });
    folder = campaign.folder;
    await ok("advance", "--to", "day 1, 18:00");
    await ok("write", "Locanda", "--type", "place");
    await ok("write", "Ennio", "--type", "character", "--set", "role=pc", "--set", "hp=5/12", "--set", "level=1", "--set", "ac=14");
    await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "creature=[[Commoner]]", "--set", "hp=2/4");
    await ok("write", "Locanda", "--add", "contains=[[Ennio]]", "--add", "contains=[[Lena]]");
}

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

describe("the coins of the system (DAT-1)", () => {
    it("are the campaign's when it writes none, and config says where they come from", async () => {
        expect(await ok("config")).toContain("coins: gp 100, pp 1000 rare, ep 50 rare, sp 10, cp 1 (from the system 5e)");
        await ok("write", "Ennio", "--set", "money=34 gp 4 sp");
        expect(await ok("change", "Ennio", "money", "--spend", "5 sp")).toContain("Ennio: money 34 gp 4 sp → 33 gp 9 sp");
    });

    it("give way, whole, to the campaign's own", async () => {
        await ok("config", "coins", "corona 240, scellino 12, soldo 1");
        const shown = await ok("config");
        expect(shown).toContain("coins: corona 240, scellino 12, soldo 1");
        expect(shown).not.toContain("from the system");
    });
});

describe("the character sheet (DAT-2)", () => {
    it("orders the status line as the system says, with its numbers, hides what is marked at zero, and keeps after it the other counters with a maximum", async () => {
        await ok("write", "Ennio", "--set", "temp-hp=0", "--set", "exhaustion=0/6", "--set", "death-failures=0/3", "--set", "xp=0", "--set", "frecce=18/20", "--set", "anni=30", "--set", "passive-perception=12");
        expect(await ok("status")).toContain("PC: Ennio, in Locanda: level 1 · xp 0 · hp 5/12 · ac 14 · passive-perception 12");
        await ok("change", "Ennio", "exhaustion", "--by", "1");
        expect(await ok("status")).toContain("ac 14 · passive-perception 12 · exhaustion 1/6 · frecce 18/20");
        // A number written without a maximum is not something spent: it stays out of the line (D-430).
        expect(await ok("status")).not.toContain("anni");
    });

    it("shows a value written by hand as it reads, never one written as a map, and a counter the system does not declare even at zero", async () => {
        const path = join(folder, "world", "characters", "Ennio.md");
        writeFileSync(path, readFileSync(path, "utf8").replace("ac: 14\n", "ac:\n  base: 14\n  shield: 2\ntemp-hp: molti\nslots-1: 2\nfrecce: 0\n"));
        expect(await ok("status")).toContain("PC: Ennio, in Locanda: level 1 · hp 5/12 · temp-hp molti · slots-1 2\n");
        expect(await ok("change", "--recipe", "long rest")).toContain("\nEnnio: hp 5/12 → 12/12.\nLena:");
    });

    it("lists the sheet's fields, and the line's, before there is a player character, says which a new one lacks, and keeps saying it in status", async () => {
        // A campaign of its own, its setup still to do.
        const other = await fifthEdition({ play: false });
        const empty = other.folder;
        expect((await other.run("status")).output).toContain(
            "No player character yet. The system 5e keeps on a character sheet, by these names: classes, xp, str, dex, con, int, wis, cha, speed, hp-base, hp, "
                + "save-proficiencies, skill-proficiencies, weapon-proficiencies, languages; and when they apply: creature, size, subclasses, background, feats, alignment, factions, inspiration, personality-traits, ideal, bond, flaw, age, height, weight, eyes, skin, hair, save-notes, fly, swim, climb, burrow, equipped, temp-hp, "
                + "darkvision, damage-resistances, damage-immunities, death-successes, death-failures, exhaustion, days-without-food, expertise, "
                + "armor-proficiencies, tool-proficiencies, fighting-styles, invocations, money, lifestyle, attuned, inventory, spells, prepared. It works out "
                + "level, str-mod, dex-mod, con-mod, int-mod, wis-mod, cha-mod, proficiency, Saving Throws, Skills, ac, initiative, walking, flying, swimming, climbing, burrowing, extra-attacks, passive-perception, passive-insight, passive-investigation, long-jump, high-jump, push-drag, hold-breath, Features, Attacks, "
                + "caster-level, spell-save-dc, spell-attack, max-prepared: never write them. Only its names go in alignment (such as lawful good, neutral good), size (Tiny, Small, Medium, Large, Huge, Gargantuan), save-proficiencies "
                + "(str, dex, con, int, wis, cha), skill-proficiencies (such as Acrobatics, Animal Handling), lifestyle (such as Wretched, Squalid), languages (such as Common, Dwarvish), "
                + "tool-proficiencies (such as alchemist's supplies, brewer's supplies), damage-resistances (such as acid, bludgeoning), damage-immunities (such as acid, bludgeoning), as it writes them: "
                + "write lists them if a name is not one.",
        );
        // How a character is made: the system's part of session zero, after the core's (D-235, MOD-5).
        writeFileSync(join(empty, "state.yaml"), "mode: session zero\n");
        expect((await other.run("instructions")).output).toContain(
            "When the characters are made and the player confirms, mode to play.\n\nAgree first, before any die, and set with config in table: how the ability scores are made, multiclassing, feats,",
        );
        expect((await other.run("write", "Bruna", "--type", "character", "--set", "role=pc", "--set", "hp=8/8")).output).toContain(
            "Bruna's sheet of the system 5e still lacks, by these names: classes, xp, str, dex, con, int, wis, cha, speed, hp-base, save-proficiencies, "
                + "skill-proficiencies, weapon-proficiencies, languages.\nPersonality: a player character's personality traits, ideal, bond and flaw are the player's,",
        );
        expect((await other.run("write", "Bruna", "--set", "classes=[[Fighter]] 1")).output).not.toContain("still lacks");
        // In play status reminds what a sheet lacks (D-190); before, the checklist of session zero says it (MOD-4).
        writeFileSync(join(empty, "state.yaml"), "mode: play\n");
        expect((await other.run("status")).output).toContain("Bruna's sheet still lacks, by these names: xp, str, dex, con, int, wis, cha, speed, hp-base,");
        await other.close();
    });

    it("gives the same line to the player character and the companions in a scene, with their effects, and all their counters to the others", async () => {
        await ok("write", "Ennio", "--set", "temp-hp=0", "--set", "frecce=18");
        await ok("effect", "add", "Ennio", "Poisoned", "--for", "1h");
        await ok("write", "Gaspare", "--type", "character", "--set", "role=npc", "--set", "creature=[[Commoner]]", "--set", "hp=3/4");
        await ok("write", "Rosa", "--type", "character", "--set", "role=npc");
        await ok("effect", "add", "Rosa", "Benedetta", "--for", "1h");
        await ok("write", "Locanda", "--add", "contains=[[Gaspare]]", "--add", "contains=[[Rosa]]");
        expect(await ok("scene", "open", "--title", "Rissa", "--type", "combat", "--with", "Ennio", "--with", "Lena", "--with", "Gaspare", "--with", "Rosa")).toContain(
            "In it: Ennio: level 1 · hp 5/12 · ac 14 · Poisoned until day 1, 19:00; Lena: hp 2/4 · ac 10 · passive-perception 10; Gaspare: hp 3/4; "
                + "Rosa: Benedetta until day 1, 19:00.",
        );
    });

    it("asks no sheet of a companion that derives from a creature, and stops asking for a dead one", async () => {
        expect(await ok("write", "Zanna", "--type", "character", "--set", "role=companion", "--set", "creature=[[Wolf]]")).not.toContain("still lacks");
        expect(await ok("status")).not.toContain("Lena's sheet");
        expect(await ok("write", "Bruno", "--type", "character", "--set", "role=companion")).toContain("Bruno's sheet of the system 5e still lacks");
        expect(await ok("status")).toContain("Bruno's sheet still lacks");
        await ok("write", "Bruno", "--set", "status=dead");
        expect(await ok("status")).not.toContain("Bruno's sheet");
    });
});

describe("thresholds (DAT-3)", () => {
    it("name the rule when a counter of the party reaches the value, takes more at it, or leaves it", async () => {
        expect(await ok("change", "Ennio", "hp", "--by=-9")).toContain('hp is at 0, 4 beyond: read rules "Dropping to 0 Hit Points".');
        expect(await ok("change", "Ennio", "hp", "--by=-2")).toContain('hp is at 0 and took 2 more: read rules "Dropping to 0 Hit Points".');
        expect(await ok("change", "Ennio", "hp", "--by", "3")).toContain('hp is no longer at 0: read rules "Dropping to 0 Hit Points".');
        expect(await ok("change", "Lena", "hp", "--by=-2")).toContain('hp is at 0: read rules "Dropping to 0 Hit Points".');
    });

    it("name the rule when a change goes past the value without stopping on it", async () => {
        expect(await ok("change", "Ennio", "hp", "--to=-3")).toContain('hp went past 0, from 5 to -3: read rules "Dropping to 0 Hit Points".');
        expect(await ok("change", "Ennio", "hp", "--to", "0")).toContain('hp is at 0: read rules "Dropping to 0 Hit Points".');
        expect(await ok("change", "Ennio", "hp", "--to", "0/15")).toBe("Ennio: hp 0/12 → 0/15: at 0.");
        await ok("write", "Ennio", "--set", "death-failures=2");
        expect(await ok("change", "Ennio", "death-failures", "--by", "2")).toContain('death-failures went past 3, from 2 to 4: read rules "Death Saving Throws".');
    });

    it("give the text of the rule at every change of a field without a value, with the precedents on it, and a house rule first", async () => {
        await ok("write", "Ennio", "--set", "exhaustion=0/6");
        expect(await ok("change", "Ennio", "exhaustion", "--by", "1")).not.toContain("Precedents");
        await ok("config", "precedents", "--add", "Exhaustion: chi dorme all'aperto d'inverno ne prende un livello.", "--add", "Exhaustion: anche chi non mangia.", "--add", "Flanking: ai lati.");
        const output = await ok("change", "Ennio", "exhaustion", "--by", "1");
        expect(output).toContain("exhaustion changed: Exhaustion, from the rules of 5e:\n## Exhaustion");
        expect(output).toContain("| 4 | Hit point maximum halved |");
        expect(output).toContain(
            "Precedents of the table: Exhaustion: chi dorme all'aperto d'inverno ne prende un livello. · Exhaustion: anche chi non mangia.\nWhen the text and a precedent disagree, tell the player",
        );
        expect(output).not.toContain("Flanking");
        mkdirSync(join(folder, "rules"));
        writeFileSync(join(folder, "rules", "Fatica.md"), "# Exhaustion\n\nOgni livello toglie 1 ai tiri.\n");
        const house = await ok("change", "Ennio", "exhaustion", "--by", "1");
        expect(house).toContain("exhaustion changed: Exhaustion, from the house rules:\n# Exhaustion\n\nOgni livello toglie 1 ai tiri.\n\nPrecedents of the table: Exhaustion:");
        expect(house).not.toContain("When the text and a precedent disagree");
    });

    it("say nothing for a page outside the party or a copy in a scene", async () => {
        await ok("write", "Lupo", "--type", "creature", "--set", "creature=[[Wolf]]");
        await ok("write", "Gaspare", "--type", "character", "--set", "role=npc", "--set", "hp=4/4");
        expect(await ok("change", "Gaspare", "hp", "--by=-9")).not.toContain("read rules");
        await ok("scene", "open", "--title", "Lupi", "--type", "combat", "--creatures", "Lupo=1");
        expect(await ok("change", "Lupo 1", "hp", "--by=-20")).not.toContain("read rules");
    });

    it("say when the value is an effect's", async () => {
        await ok("effect", "add", "Ennio", "Forma d'orso", "--set", "hp=10/34");
        expect(await ok("change", "Ennio", "hp", "--by=-12")).toContain('hp is at 0 in Forma d\'orso, 2 beyond: read rules "Dropping to 0 Hit Points".');
    });
});

describe("recipes (DAT-4, DAT-5)", () => {
    it("bring back the party where the player character is, end the effects until the rest first, and say which counters are left away from their usual value", async () => {
        await ok("write", "Ennio", "--set", "temp-hp=4", "--set", "slots-1=0/2", "--set", "hit-dice=0/1", "--set", "exhaustion=1/6", "--set", "death-failures=0/3");
        await ok("effect", "add", "Ennio", "Prosciugato", "--for", "long rest", "--set", "hp=5/8");
        await ok("effect", "add", "Ennio", "Ombra", "--for", "short rest");
        await ok("effect", "add", "Ennio", "Benedetto", "--for", "1h");
        const rested = await ok("change", "--recipe", "long rest", "--why", " ");
        // Temporary hit points that go are named with their rule (DAT-3, D-268).
        expect(rested).toContain('temp-hp is at 0: read rules "Temporary Hit Points".');
        // A long rest takes a level of exhaustion, and the rule of exhaustion follows (D-449).
        expect(rested.replace('\ntemp-hp is at 0: read rules "Temporary Hit Points".', "").split("\n\nexhaustion changed")[0]).toBe([
            "Long rest (a recipe of the system 5e):",
            "Ennio: Prosciugato ended; Ombra ended; hp 5/12 → 12/12; temp-hp 4 → 0; slots-1 0/2 → 2/2; exhaustion 1/6 → 0/6. Not brought back: hit-dice 0/1.",
            "Lena: hp 2/4 → 4/4 (again as Commoner).",
            'For the rest, read rules "Long Rest".',
            "The game date did not move: apply a rest once its hours (8h) have passed; if they have not yet, advance them now.",
        ].join("\n"));
        expect(character("Ennio")).toContain("Benedetto until day 1, 19:00");
        expect(character("Lena")).not.toContain("hp:");
        const lines = campaign.log().filter((entry) => entry.data.why === "long rest").map((entry) => [entry.type, entry.data.page, entry.data.field ?? entry.data.effect, entry.visibility]);
        expect(lines).toEqual([
            ["effect-ended", "Ennio", "Prosciugato", "public"],
            ["effect-ended", "Ennio", "Ombra", "public"],
            ["counter-changed", "Ennio", "hp", "public"],
            ["counter-changed", "Ennio", "temp-hp", "public"],
            ["counter-changed", "Ennio", "slots-1", "public"],
            ["counter-changed", "Ennio", "exhaustion", "public"],
            ["counter-changed", "Lena", "hp", "public"],
        ]);
    });

    it("change a value an effect gives on the effect, give the notes of change, and leave the dead out", async () => {
        await ok("effect", "add", "Ennio", "Forma d'orso", "--set", "hp=20/34");
        await ok("change", "Lena", "hp", "--by=-2");
        await ok("write", "Bruno", "--type", "character", "--set", "role=companion", "--set", "hp=0/9", "--set", "status=dead");
        await ok("write", "Locanda", "--add", "contains=[[Bruno]]");
        const output = await ok("change", "--recipe", "long rest", "--why", "una notte alla locanda");
        expect(output).toContain(
            "Ennio: hp 20/34 → 34/34 (in Forma d'orso). Still on Ennio, with no end: Forma d'orso. Read in their text whether a rest asks for something.\n"
                // At 0 hit points when the rest begins, no benefit (p. 87, D-449).
                + "Lena: nothing changed. At 0 hp when it began, Lena gains nothing from it. Still on Lena, with no end: Unconscious. Read in their text whether a rest asks for something.\n",
        );
        expect(output).not.toContain("Bruno");
        expect(character("Ennio")).toContain("hp: 5/12\n");
        expect(character("Ennio")).toContain("Forma d'orso (hp: 34/34)");
        // Only Ennio's hit points change: Lena began the rest at 0.
        expect(campaign.log().filter((entry) => entry.data.why === "una notte alla locanda")).toHaveLength(1);
        await ok("write", "Ennio", "--set", "status=dead");
        expect(await refused("change", "--recipe", "long rest")).toBe("There is no living player character, so a recipe without a page goes to no one: give the page. Nothing changed.");
    });

    it("check every page before writing any", async () => {
        writeFileSync(join(folder, "world", "Lena.md"), "Un'altra Lena.\n");
        expect(await refused("change", "--recipe", "long rest")).toContain("Two pages have the same name");
        expect(character("Ennio")).toContain("hp: 5/12\n");
        rmSync(join(folder, "world", "Lena.md"));
        const path = join(folder, "world", "characters", "Lena.md");
        writeFileSync(path, readFileSync(path, "utf8").replace("---\n", '---\neffects:\n  - "Maledetta until long rest"\n  - "Maledetta until short rest"\n'));
        expect(await refused("change", "--recipe", "long rest")).toContain("Lena's effects do not read");
        expect(character("Ennio")).toContain("hp: 5/12\n");
    });

    it("go to the page given, never to a copy, and are refused when the system has none by that name, with how to quote one", async () => {
        await ok("write", "Ennio", "--set", "temp-hp=4");
        expect(await ok("change", "Ennio", "--recipe", "short rest")).toBe(
            'Short rest (a recipe of the system 5e):\nEnnio: nothing changed. Not brought back: hp 5/12.\nFor the rest, read rules "Short Rest".\nThe game date did not move: apply a rest once its hours have passed; if they have not yet, advance them now.',
        );
        expect(await refused("change", "Ennio", "--recipe", "riposo")).toBe('The system 5e has no recipe "riposo". Its recipes: long rest, short rest. Nothing changed.');

        for (const [parameter, value] of [["--by", "1"], ["--spend", "1"], ["--to", "3"]]) {
            expect(await refused("change", "Ennio", "--recipe", "long rest", parameter, value)).toContain("A recipe changes by itself the fields it names");
        }

        expect(await refused("change", "Ennio", "hp", "--recipe", "long rest")).toContain("A recipe changes by itself the fields it names");
        expect(await refused("change", "--recipe", "long", "rest")).toBe('Put the recipe\'s name in quotes, such as recipe "long rest". Nothing changed.');
        expect(await refused("change", "Ennio", "--recipe", "long", "rest")).toBe('Put the recipe\'s name in quotes, such as recipe "long rest". Nothing changed.');
        expect(await ok("change", " ", "--recipe", "short rest")).toContain("Ennio: nothing changed.");
        await ok("change", "Ennio", "hp", "--to", "0");
        expect(await ok("change", "Ennio", "--recipe", "short rest")).toContain('Ennio: nothing changed. Not brought back: hp 0/12 (rules "Dropping to 0 Hit Points").');
        await ok("write", "Mira", "--type", "character", "--set", "role=pc", "--set", "hp=1/6");
        expect(await ok("change", "--recipe", "long rest")).toContain("Mira: hp 1/6 → 6/6.");
        await ok("write", "Lupo", "--type", "creature", "--set", "creature=[[Wolf]]");
        await ok("scene", "open", "--title", "Lupi", "--type", "combat", "--creatures", "Lupo=1");
        expect(await refused("change", "Lupo 1", "--recipe", "long rest")).toContain("Lupo 1 is a copy in the scene: a recipe goes to pages");
    });

    it("leave an effect until an occasion to the recipe alone, and validate reports one the system does not know", async () => {
        await ok("effect", "add", "Ennio", "Prosciugato", "--for", "long rest");
        await ok("advance", "--by", "2d");
        expect(await ok("status")).toContain("Prosciugato until long rest");
        writeFileSync(join(folder, "world", "characters", "Lena.md"), '---\nrole: companion\ncreature: "[[Commoner]]"\neffects:\n  - "Stanca until dawn"\n---\n');
        const problems = await ok("validate");
        expect(problems).toContain('Stanca on Lena ends "dawn", which is not a game date nor an occasion of the system 5e (long rest, short rest).');
        expect(problems).not.toContain("Prosciugato");
    });
});

describe("a game system that is not installed, or not chosen yet (SYS-1, D-167)", () => {
    it("comes first in the fixes of an occasion and of a link that may be its own, and in the message of a duration that does not read", async () => {
        await ok("effect", "add", "Ennio", "Prosciugato", "--for", "long rest");
        writeFileSync(join(folder, "campaign.yaml"), readFileSync(join(folder, "campaign.yaml"), "utf8").replace("system: 5e", "system: 5ed"));
        expect(await ok("validate")).toContain(
            'Fix: if it is an occasion of the system 5ed, which is not installed, fix the system first, as the problem on campaign.yaml says; otherwise effect end Ennio "Prosciugato"',
        );
        expect(await refused("effect", "add", "Ennio", "Ombra", "--for", "short rest")).toContain("The campaign's system, 5ed, is not installed");
        writeFileSync(join(folder, "campaign.yaml"), readFileSync(join(folder, "campaign.yaml"), "utf8").replace("system: 5ed\n", ""));
        expect(await ok("validate")).toContain("Fix: if it is a page of a game system, choose the campaign's system first, with config; otherwise");
        expect(await refused("show", "Wolf")).toContain("The campaign has no game system yet, so none of its pages can be found: choose it with config.");
        expect(await refused("change", "--recipe", "long rest")).toBe('The campaign has no game system, so it has no recipe "long rest". Nothing changed.');
        expect(await ok("change", "Ennio", "hp", "--by=-5")).toBe("Ennio: hp 5/12 → 0/12: at 0.");
    });
});

describe("conditions and rounds (DAT-6, DAT-7)", () => {
    it("show the text of a condition of the system when an effect bears its name, or its word in the campaign's language, and nothing for another name", async () => {
        expect(await ok("effect", "add", "Ennio", "Poisoned", "--for", "1h")).toBe(
            "Ennio: Poisoned until day 1, 19:00.\n\nPoisoned is a condition of the system 5e:\n## Poisoned\n\n- A poisoned creature has disadvantage on attack rolls and ability checks.",
        );
        expect(await ok("effect", "add", "Ennio", "Avvelenato", "--for", "1h")).toContain("\n\nPoisoned (Avvelenato) is a condition of the system 5e:\n## Poisoned");
        expect(await ok("effect", "add", "Ennio", "Veleno di ragno", "--for", "1h")).not.toContain("condition");
    });

    it("show a house rule on a condition first, with the precedents on it", async () => {
        mkdirSync(join(folder, "rules"));
        writeFileSync(join(folder, "rules", "Veleni.md"), "# Poisoned\n\nIl veleno toglie anche 1 alla velocità.\n");
        await ok("config", "precedents", "--add", "Poisoned: la benda bagnata dà vantaggio contro il gas.");
        expect(await ok("effect", "add", "Ennio", "Poisoned", "--for", "1h")).toBe(
            "Ennio: Poisoned until day 1, 19:00.\n\nPoisoned is a condition of the system 5e, by a house rule of the campaign:\n# Poisoned\n\nIl veleno toglie anche 1 alla velocità."
                + "\n\nPrecedents of the table: Poisoned: la benda bagnata dà vantaggio contro il gas.",
        );
    });

    it("refuse an effect named as a counter of the system", async () => {
        expect(await refused("effect", "add", "Ennio", "Exhaustion")).toBe("exhaustion is a counter of the system 5e, kept on the page: change it, such as page Ennio, field exhaustion, by 1. Nothing changed.");
        // A counter the system declares with no maximum starts at 0 (CNT-8, D-266).
        expect(await ok("change", "Ennio", "exhaustion", "--by", "1")).toMatch(/^Ennio: exhaustion 0 → 1\.\n/);
        expect(await ok("effect", "add", "Ennio", "Speed", "--for", "1h")).toBe("Ennio: Speed until day 1, 19:00.");
    });

    it("turn a duration of up to a minute into rounds for who is in a scene with turns, and leave a longer one, or one elsewhere, in time", async () => {
        await ok("write", "Gaspare", "--type", "character", "--set", "role=npc");
        await ok("scene", "open", "--title", "Scontro", "--type", "combat", "--with", "Ennio", "--with", "Lena");
        expect(await ok("effect", "add", "Lena", "Lampo", "--for", "1m")).toBe("Lena: Lampo until day 1, 18:01.");
        await ok("scene", "order", "--order", "Ennio", "--order", "Lena");
        expect(await ok("effect", "add", "Ennio", "Benedetto", "--for", "1m")).toBe("Ennio: Benedetto until round 11, Ennio. 1m is 10 rounds of 6 seconds.");
        expect(await ok("effect", "add", "Lena", "Veleno", "--for", "1h")).toBe("Lena: Veleno until day 1, 19:00.");
        expect(await ok("effect", "add", "Gaspare", "Benedetto", "--for", "1m")).toBe("Gaspare: Benedetto until day 1, 18:01.");
        const closed = await ok("scene", "close", "--summary", "Finito.");
        expect(closed).toContain("Ended with the scene: Benedetto on Ennio.");
        expect(closed).not.toContain("Veleno");
        expect(await ok("status")).toContain("Veleno until day 1, 19:00");
        expect(await ok("effect", "add", "Lena", "Benedetta", "--for", "1m")).toBe("Lena: Benedetta until day 1, 18:01.");
    });
});

describe("laws on worlds at random", () => {
    it("name the rule of hp 0 exactly when a change touches 0: reaches it, takes more at it, leaves it or goes past it (DAT-3)", async () => {
        const step = fc.oneof(
            fc.integer({ min: -15, max: 15 }).filter((by) => by !== 0).map((by) => `--by=${by}`),
            fc.integer({ min: -5, max: 25 }).map((to) => `--to=${to}`),
        );
        const runs = fc.record({ max: fc.integer({ min: 1, max: 20 }), start: fc.nat(20), steps: fc.array(step, { minLength: 1, maxLength: 6 }) });
        await fc.assert(
            fc.asyncProperty(runs, async ({ max, start, steps }) => {
                await ok("change", "Ennio", "hp", "--to", `${Math.min(start, max)}/${max}`);

                for (const given of steps) {
                    const [summary, ...rest] = (await ok("change", "Ennio", "hp", given)).split("\n");
                    const moved = /hp (-?\d+)\/\d+ → (-?\d+)\//.exec(summary);
                    const kept = /is (-?\d+)\//.exec(summary);
                    const before = Number(moved?.[1] ?? kept?.[1]);
                    const after = Number(moved?.[2] ?? kept?.[1]);
                    const beyond = Number(/(\d+) beyond/.exec(summary)?.[1] ?? 0);
                    // 0 lies between the value before and the one after, and something happened: a change, or what went beyond a limit.
                    const touches = Math.min(before, after) <= 0 && Math.max(before, after) >= 0 && (before !== after || beyond > 0);
                    const notes = rest.filter((line) => line.includes("read rules"));
                    expect(notes, summary).toHaveLength(touches ? 1 : 0);
                    expect(notes.every((note) => note.startsWith("hp ") && note.endsWith('read rules "Dropping to 0 Hit Points".'))).toBe(true);
                }
            }),
            { numRuns: 25 },
        );
    }, 120000);

    it("bring back with a recipe the fields it names, end the effects until its occasions and no other, and find nothing to do a second time (DAT-4, DAT-5)", async () => {
        const runs = fc.record({
            // Above 0 hit points: at 0 a long rest gives nothing (p. 87, D-449).
            hp: fc.integer({ min: 1, max: 12 }),
            tempHp: fc.integer({ min: 0, max: 5 }),
            slots: fc.integer({ min: 0, max: 3 }),
            lenaHp: fc.integer({ min: 1, max: 4 }),
            effects: fc.subarray(["long rest", "short rest", "1h"]),
            recipe: fc.constantFrom("long rest", "short rest"),
        });
        await fc.assert(
            fc.asyncProperty(runs, async ({ hp, tempHp, slots, lenaHp, effects, recipe }) => {
                await campaign.close();
                await atTheInn();
                await ok("change", "Ennio", "hp", "--to", `${hp}/12`);
                await ok("change", "Lena", "hp", "--to", `${lenaHp}/4`);
                await ok("write", "Ennio", "--set", `temp-hp=${tempHp}`, "--set", `slots-1=${slots}/3`);

                for (const duration of effects) {
                    await ok("effect", "add", "Ennio", `Effetto ${duration}`, "--for", duration);
                }

                await ok("change", "--recipe", recipe);
                const ennio = character("Ennio");
                const ended = recipe === "long rest" ? ["long rest", "short rest"] : ["short rest"];
                expect(effects.filter((duration) => ennio.includes(`Effetto ${duration}`))).toEqual(effects.filter((duration) => !ended.includes(duration)));

                if (recipe === "long rest") {
                    expect(ennio).toContain("hp: 12/12\n");
                    expect(ennio).toContain("temp-hp: 0\n");
                    expect(ennio).toContain("slots-1: 3/3\n");
                    expect(character("Lena")).not.toContain("hp:");
                }

                const pages = [ennio, character("Lena")];
                const again = (await ok("change", "--recipe", recipe)).split("\n").slice(1, 3);
                // A second long rest at once gives nothing, and says from when another may (RST-1).
                expect(again.filter((line) => !/^(Ennio|Lena): nothing changed\.( Not brought back: .+\.)?( (Ennio|Lena) had a long rest at .+: one in 24h\.)?$/.test(line))).toEqual([]);
                expect([character("Ennio"), character("Lena")]).toEqual(pages);
            }),
            { numRuns: 20 },
        );
    }, 120000);
});

/** The page of a character, as written. */
function character(name: string): string
{
    return readFileSync(join(folder, "world", "characters", `${name}.md`), "utf8");
}
