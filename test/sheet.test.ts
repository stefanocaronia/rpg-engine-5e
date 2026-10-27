// The character sheet through the commands (D-204, D-206, D-207; DAT-2, DAT-8, SYS-8): show gives it in groups, write takes only the system's names in its
// lists and says once what it lacks, and roll takes a value from it by name.
import fc from "fast-check";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestCampaign } from "rpg-engine/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fifthEdition } from "./support.ts";

let campaign: TestCampaign;
let folder: string;

beforeEach(async () => {
    campaign = await fifthEdition({ language: "it" });
    folder = campaign.folder;
    await ok("advance", "--to", "day 1, 18:00");
    await ok("write", "Locanda", "--type", "place");
    await ok(...ettore());
    await ok("write", "Locanda", "--add", "contains=[[Ettore]]");
    // His chain mail and shield, which he wears: his armor class, 18 (D-231).
    await ok("write", "Cotta di Ettore", "--type", "item", "--set", "item=[[Chain Mail]]");
    await ok("write", "Scudo di Ettore", "--type", "item", "--set", "item=[[Shield]]");
    await ok("write", "Ettore", "--set", "inventory=[[Cotta di Ettore]], [[Scudo di Ettore]]", "--set", "equipped=[[Cotta di Ettore]], [[Scudo di Ettore]]");
});

afterEach(() => campaign.close());

/** Ettore, a cleric of the third level, as the master writes him: only what the system does not work out. */
function ettore(): string[]
{
    const fields = [
        "role=pc",
        "classes=[[Cleric]] 3",
        "xp=900",
        "str=14",
        "dex=8",
        "con=15",
        "int=10",
        "wis=16",
        "cha=12",
        "hp-base=18",
        "hp=20/24",
        "speed=25 ft.",
        "hit-dice-d8=3/3",
        "save-proficiencies=[wis, cha]",
        "skill-proficiencies=[Insight, Religion]",
        // The cleric's armor and a Life Domain's heavy armor: without them the chain mail and the shield would worsen his rolls.
        "armor-proficiencies=[light armor, medium armor, shields, heavy armor]",
        "languages=[Common, Dwarvish]",
        "personality-traits=Cito le scritture, sempre.",
        "umore=sereno",
    ];
    return ["write", "Ettore", "--type", "character", ...fields.flatMap((field) => ["--set", field])];
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

function pageText(page: string): string
{
    return readFileSync(join(folder, "world", "characters", `${page}.md`), "utf8");
}

function lastLogged(): Record<string, unknown>
{
    return campaign.log().at(-1)?.data ?? {};
}

describe("the experience between two levels (PRO-6)", () => {
    it("gives the experience where it is between the points of the level and those of the next, on the sheet and on the line", async () => {
        const progress = { value: 900, from: 900, to: 2700 };
        const page = JSON.parse(await ok("view", "Ettore", "--json")) as { sheet: { values: { field: string; progress?: unknown; }[]; }[]; };
        expect(page.sheet.flatMap((group) => group.values).find((value) => value.field === "xp")?.progress).toEqual(progress);
        const overview = JSON.parse(await ok("view", "--json")) as { party: { name: string; counters: { field: string; progress?: unknown; }[]; }[]; };
        // On the line too, the points apart from what the next level needs, as on the sheet; the chat reads them together.
        expect(overview.party.find((member) => member.name === "Ettore")?.counters.find((value) => value.field === "xp")).toMatchObject({ text: "900", beside: "1800 to level 4", progress });
        expect(await ok("view")).toContain("xp 900 (1800 to level 4)");
        expect(page.sheet.flatMap((group) => group.values).find((value) => value.field === "level")?.progress).toBeUndefined();
    });
});

describe("the free roll of the sheet (D-280)", () => {
    it("gives each number the system rolls its dice and the number, or the number beside it, for the dashboard; none to the others", async () => {
        const page = JSON.parse(await ok("view", "Ettore", "--json")) as { sheet: { values: { field: string; roll?: unknown; }[]; }[]; };
        const rollOf = (field: string): unknown => page.sheet.flatMap((group) => group.values).find((value) => value.field === field)?.roll;
        expect(rollOf("insight")).toEqual({ notation: "1d20+5", dice: [20], modifier: 5 });
        expect(rollOf("dex-save")).toEqual({ notation: "1d20-1", dice: [20], modifier: -1 });
        // A score rolls the modifier beside it; a modifier of 0 adds nothing.
        expect(rollOf("str")).toEqual({ notation: "1d20+2", dice: [20], modifier: 2 });
        expect(rollOf("int")).toEqual({ notation: "1d20", dice: [20], modifier: 0 });
        expect(rollOf("proficiency")).toBeUndefined();
        expect(rollOf("hp")).toBeUndefined();
    });
});

describe("the sheet in show (DAT-2, D-207)", () => {
    it("gives a player character's sheet in the system's groups, a modifier beside its score, and the fields as written without what the sheet shows", async () => {
        const shown = await ok("show", "Ettore");
        expect(shown).toContain([
            "Character: classes Cleric 3 · level 3 · xp 900 (1800 to level 4)",
            "Personality: personality-traits Cito le scritture, sempre.",
            "Abilities: str 14 (+2) · dex 8 (-1) · con 15 (+2) · int 10 (+0) · wis 16 (+3) · cha 12 (+1) · proficiency +2",
            // A number the character is proficient in has a mark (D-217).
            "Saving Throws: str-save +2 · dex-save -1 · con-save +2 · int-save +0 · wis-save +5 ● · cha-save +3 ●",
            "Skills: acrobatics -1 · animal-handling +3 · arcana +0 · athletics +2 · deception +1 · history +0 · insight +5 ● · intimidation +1 · investigation +0 · "
            + "medicine +3 · nature +0 · perception +3 · performance +1 · persuasion +1 · religion +2 ● · sleight-of-hand -1 · stealth -1 · survival +3",
            // The armor class from the chain mail and the shield he wears (D-231).
            "Combat: ac 18 · initiative -1 · walking 25 ft (25 ft.) · equipped Cotta di Ettore, Scudo di Ettore · hp-base 18 · hp 20/24 · hit-dice-d8 3/3 · passive-perception 13 · passive-insight 15 · passive-investigation 10 · long-jump 14 ft · high-jump 5 ft · push-drag 420 lb · hold-breath 3m",
            "Proficiencies: save-proficiencies wis, cha · skill-proficiencies Insight, Religion · armor-proficiencies light armor, medium armor, shields, heavy armor · languages Common, Dwarvish",
            // The cleric's table gives its features and its other columns (D-219).
            "Features: features Spellcasting, Divine Domain, Channel Divinity (1/rest) · cantrips-known 3 · channel-divinity 1/1",
            // The unarmed strike every character has ready, with no weapon equipped (D-235).
            "Attacks: Unarmed Strike +4, 3 bludgeoning",
            // What he carries, the equipped marked, and its weight against his limit (D-431, D-432).
            "Equipment: load 61 / 210 lb · Cotta di Ettore (equipped) · Scudo di Ettore (equipped)",
            // A cleric's spellcasting, worked out from the cleric's page and the slots of its level (D-227).
            "Spells: caster-level 3 · spell-save-dc 13 · spell-attack +5 · slots-1 4/4 · slots-2 2/2 · max-prepared 6",
            "show Ettore#Spellcasting gives the text of a feature.",
            "",
            "---\nrole: pc\numore: sereno\n---",
        ].join("\n"));
        expect(shown).not.toContain("Worked out by the system");
        // The result keeps every field as written and every value with what it came from, for whoever reads it as data.
        const data = JSON.parse(await ok("show", "Ettore", "--json")) as { fields: Record<string, unknown>; worked: { field: string; line: string; repeats: boolean; }[]; onSheet: string[]; };
        expect(data.fields).toMatchObject({ str: 14, hp: "20/24", umore: "sereno" });
        expect(data.worked).toContainEqual({ field: "insight", line: "insight +5: wis-mod +3, proficiency +2, Insight in skill-proficiencies", repeats: false });
        expect(data.onSheet).toContain("str-mod");
    });

    it("reads the sheet with its effects, and says what they cover", async () => {
        await ok("effect", "add", "Ettore", "Gauntlets of Ogre Power", "--set", "str=19");
        const shown = await ok("show", "Ettore");
        expect(shown).toContain("While they last: str 19 (14 without)");
        expect(shown).toContain("Abilities: str 19 (+4) · dex 8 (-1)");
        expect(shown).toContain("athletics +4");
    });

    it("gives a group with how each value is made, by its name in any case; a section of that name comes first", async () => {
        // A group is its values: no place, links or inherited text.
        expect(await ok("show", "Ettore#combat")).toBe([
            "Ettore#Combat (character) · world/characters/Ettore.md",
            "",
            "ac 18: armor-class 16, armor-class-bonus +2\ninitiative -1: dex-mod -1\nwalking 25 ft: speed 25\nequipped Cotta di Ettore, Scudo di Ettore\nhp-base 18\nhp 20/24: the maximum from hp-base 18, level 3, con-mod +2\nhit-dice-d8 3/3: the maximum from 3 in classes, hit-die d8",
            "passive-perception 13: perception +3\npassive-insight 15: insight +5\npassive-investigation 10: investigation +0\nlong-jump 14 ft: str 14\nhigh-jump 5 ft: str-mod +2\npush-drag 420 lb: str 14\nhold-breath 3m: con-mod +2",
        ].join("\n"));
        expect(await ok("show", "Ettore#Abilities")).toContain("str 14 (+2)\ndex 8 (-1)\ncon 15 (+2)\nint 10 (+0)\nwis 16 (+3)\ncha 12 (+1)\nproficiency +2: level 3, proficiency-by-level 2");
        await ok("write", "Ettore#Combat", "--text", "Combatte con la mazza del padre.");
        expect(await ok("show", "Ettore#Combat")).toContain("Combatte con la mazza del padre.");
    });

    it("says what a group lacks, and names the groups when there is no section or group by that name", async () => {
        await ok("write", "Mira", "--type", "character", "--set", "role=companion");
        expect(await ok("show", "Mira#Skills")).toContain("Mira has nothing in Skills yet.");
        expect(await refused("show", "Ettore#Incantesimi")).toBe(
            'Ettore has no section or secret "Incantesimi". It has no sections or secrets. The groups of its sheet are: Character, Personality, Appearance, Abilities, Saving Throws, Skills, Combat, Proficiencies, Features, Attacks, Equipment, Spells.',
        );
    });

    it("leaves the other characters as they are written, with where each value comes from", async () => {
        await ok("write", "Gaspare", "--type", "character", "--set", "role=npc", "--set", "creature=[[Commoner]]", "--set", "hp=3/4");
        const shown = await ok("show", "Gaspare");
        expect(shown).toContain('---\nrole: npc\ncreature: "[[Commoner]]"\nhp: 3/4\n---');
        expect(shown).toContain("Fields inherited from Commoner (5e):");
        expect(shown).not.toContain("Abilities:");
        expect(await refused("show", "Gaspare#Skills")).toBe('Gaspare has no section or secret "Skills". It shows, from Commoner: Actions, Club.');
    });
});

describe("what is written on the sheet (DAT-2, D-206, SYS-8)", () => {
    it("refuses a map where the system wants a list, as an MCP client may send classes, and says how to write it (D-246)", async () => {
        await ok("write", "Mira", "--type", "character", "--set", "role=pc");
        expect(await refused("write", "Mira", "--set", 'classes={"[[Fighter]]": 1}')).toBe("classes is a list in the system 5e: give it as one, such as classes=[[[Fighter]] 1]. Nothing changed.");
    });

    it("says once, when a character joins the party, what the sheet lacks and the system's notes; what is written only when it applies is never reminded", async () => {
        const joined = await ok("write", "Mira", "--type", "character", "--set", "role=pc", "--set", "level=1");
        expect(joined).toContain("Mira's sheet of the system 5e still lacks, by these names: classes, xp, str, dex, con, int, wis, cha, speed, hp-base, hp, save-proficiencies, skill-proficiencies, weapon-proficiencies, languages.");
        expect(joined).toContain(
            "Personality: a player character's personality traits, ideal, bond and flaw are the player's, in their words, with links to what they name: offer their background's tables, "
                + "rolled or chosen, or propose some; never write one they did not choose. A companion's are yours to write in the companion's voice, from what the story has shown; ask the player only for a "
                + "companion they made.",
        );
        expect(joined).toContain("Combat: hp-base is the hit points the class's hit dice gave at each level, without Constitution:");
        expect(await ok("write", "Mira", "--set", "xp=0")).not.toContain("Personality");
        const status = await ok("status");
        expect(status).toContain("Mira's sheet still lacks, by these names: classes, str, dex,");
        // Beside the system's note on making a character, said until the first scene (DAT-12).
        expect(status.replace(/^Creating the player character.*$/m, "")).not.toMatch(/personality|inspiration|temp-hp|exhaustion|expertise/);
        expect(await ok("write", "Rosa", "--type", "character", "--set", "role=npc")).toBe("Created Rosa (character, world/characters/Rosa.md): set role.");
    });

    it("takes in a list only the names the system gives, in any case and as links, and refuses the others with those names, changing nothing", async () => {
        await ok("write", "Ettore", "--set", "skill-proficiencies=[insight, Medicine]");
        expect(await refused("write", "Ettore", "--add", "skill-proficiencies=[[Religion]]")).toBe("skill-proficiencies takes the system's names, not links: Religion. Nothing changed.");
        await ok("write", "Ettore", "--add", "skill-proficiencies=RELIGION");
        await ok("write", "Ettore", "--add", "expertise=Thieves’ Tools");
        const before = pageText("Ettore");
        const skills = "Acrobatics, Animal Handling, Arcana, Athletics, Deception, History, Insight, Intimidation, Investigation, Medicine, Nature, Perception, Performance, "
            + "Persuasion, Religion, Sleight of Hand, Stealth, Survival";
        expect(await refused("write", "Ettore", "--set", "skill-proficiencies=[Insight, Furtività]", "--set", "umore=teso")).toBe(
            `"Furtività" is not one of the names skill-proficiencies takes in the system 5e: ${skills}. Nothing changed.`,
        );
        expect(await refused("write", "Ettore", "--add", "skill-proficiencies=Stealthh", "--add", "skill-proficiencies=Arcanna")).toBe(
            `"Stealthh", "Arcanna" are not names skill-proficiencies takes in the system 5e: ${skills}. Nothing changed.`,
        );
        expect(await refused("write", "Ettore", "--set", "skill-proficiencies=Insight, Religion")).toContain("A list is written [a, b]. Nothing changed.");
        expect(pageText("Ettore")).toBe(before);
        await ok("write", "Ettore", "--set", "save-proficiencies=wis");
        expect(pageText("Ettore")).toContain("save-proficiencies:\n  - wis\n");
        // A text with closed names is one name whole: an alignment, in the system's words, which the page shows in the campaign's.
        expect(await refused("write", "Ettore", "--set", "alignment=Neutrale Buono")).toMatch(/^"Neutrale Buono" is not one of the names alignment takes in the system 5e: lawful good, /);
        await ok("write", "Ettore", "--set", "alignment=Neutral Good");
        expect(pageText("Ettore")).toContain("alignment: Neutral Good\n");
    });

    it("takes on a sheet only the system's languages, tools and damage types, and those the campaign adds; a stat block keeps its words (D-435)", async () => {
        expect(await refused("write", "Ettore", "--add", "languages=Elfico")).toMatch(
            /^"Elfico" is not one of the names languages takes in the system 5e: Common, .* A name of the campaign's own world joins them with config values "languages: \[Elfico\]"\. Nothing changed\.$/,
        );
        expect(await refused("write", "Ettore", "--add", "damage-resistances=fuoco")).toMatch(/^"fuoco" is not one of the names damage-resistances takes in the system 5e: acid, /);
        await ok("write", "Ettore", "--add", "languages=Elvish", "--add", "damage-resistances=fire", "--add", "tool-proficiencies=vehicles (land)");
        // A language of the campaign's world joins the system's.
        await ok("config", "values", "languages: [Lingua dei Guadi]");
        await ok("write", "Ettore", "--add", "languages=Lingua dei Guadi");
        expect(pageText("Ettore")).toContain("- Lingua dei Guadi\n");
        // A creature's stat block, as the SRD writes them, keeps its own words.
        await ok("write", "Spettro del guado", "--type", "creature", "--set", "languages=[telepathy 60 ft]", "--set", "damage-resistances=[slashing from nonmagical attacks]");
        expect(await ok("validate")).not.toContain("Spettro del guado");
    });

    it("reports in validate a name written by hand that the system does not take, and lets write remove it", async () => {
        writeFileSync(join(folder, "world", "characters", "Nero.md"), "---\nrole: npc\nskill-proficiencies: [Atletica, Stealth]\n---\n");
        expect(await ok("validate")).toContain(
            '- world/characters/Nero.md: On Nero: "Atletica" is not one of the names skill-proficiencies takes in the system 5e: Acrobatics, Animal Handling,',
        );
        expect(await ok("validate")).toContain("Fix: write Nero, remove skill-proficiencies=Atletica, then add the right name.");
        await ok("write", "Nero", "--remove", "skill-proficiencies=Atletica");
        expect(await ok("validate")).not.toContain("Nero");
    });

    it("refuses text with commas for a list of the system, which would read as one name, and validate reports it written by hand", async () => {
        expect(await refused("write", "Ettore", "--set", "weapon-proficiencies=simple weapons, martial weapons")).toBe(
            "weapon-proficiencies is a list in the system 5e: write its names apart, as weapon-proficiencies=[simple weapons, martial weapons]. Nothing changed.",
        );
        await ok("write", "Ettore", "--set", "weapon-proficiencies=[[Weapon, +1, +2, or +3]]");
        writeFileSync(join(folder, "world", "characters", "Nero.md"), "---\nrole: npc\nlanguages: Common, Elvish\n---\n");
        expect(await ok("validate")).toContain(
            "- world/characters/Nero.md: languages on Nero is text with commas, read as one name: a list is written [a, b]. Fix: write Nero, set languages=[Common, Elvish].",
        );
    });
});

describe("rolls from the sheet (DAT-8)", () => {
    it("takes a field's value from the sheet of who rolls, as it reads with effects and formulas, and says it in the output and the log", async () => {
        expect(await ok("roll", "1d20+athletics", "--who", "Ettore", "--why", "scalare il muro")).toMatch(/^\S+ Ettore, scalare il muro: 1d20\+athletics = 6 \[4\] \+ 2 \(athletics \+2\)$/);
        expect(lastLogged()).toEqual({
            notation: "1d20+athletics",
            total: 6,
            result: "1d20+athletics = 6 [4] + 2 (athletics +2)",
            sheet: { athletics: 2 },
            why: "scalare il muro",
            who: "Ettore",
            physical: false,
            dice: [{ sides: 20, value: 4 }],
        });
        await ok("effect", "add", "Ettore", "Gauntlets of Ogre Power", "--set", "str=19");
        expect(await ok("roll", "1d20+athletics", "--who", "ettore")).toContain("1d20+athletics = 8 [4] + 4 (athletics +4)");
        expect(await ok("roll", "1d20 + dex-mod - wis-mod", "--who", "Ettore")).toContain("1d20 + dex-mod - wis-mod = 0 [4] - 1 - 3 (dex-mod -1, wis-mod +3)");
        expect(await ok("roll", "wis-mod+1d4+level", "--who", "Ettore")).toContain("wis-mod+1d4+level = 10 3 + [4] + 3 (wis-mod +3, level 3)");
        expect(await ok("roll", "1d20+insight", "--who", "Ettore", "--values", "17")).toContain("1d20+insight = 22 [17] + 5 (insight +5) (physical dice)");
    });

    it("keeps the values in a hidden roll's proof, and takes them from a copy in the open scene", async () => {
        const hidden = await ok("roll", "1d20+wis-save", "--who", "Ettore", "--hidden");
        const id = /^Hidden roll (\S+), only for the master: 1d20\+wis-save = 9 \[4\] \+ 5 \(wis-save \+5\)$/m.exec(hidden)?.[1];
        expect(id).toBeDefined();
        expect(await ok("roll", "--reveal", id ?? "")).toContain(`Hidden roll ${id} revealed: 1d20+wis-save = 9 [4] + 5 (wis-save +5).`);
        await ok("scene", "open", "--title", "Imboscata", "--type", "combat", "--creatures", "Goblin=1");
        expect(await ok("roll", "1d20+dex-mod", "--who", "Goblin 1")).toContain("only for the master: 1d20+dex-mod = 6 [4] + 2 (dex-mod +2)");
    });

    it("refuses a name without who, with who that is no character, or a field the sheet does not hold as a whole number, logging nothing", async () => {
        const logged = campaign.log().length;
        expect(await refused("roll", "1d20+athletics")).toBe('"athletics" is no die: to take it from a sheet, give who rolls, such as who Bruna; or give the number, such as 1d20+2.');
        expect(await refused("roll", "1d20+athletics", "--who", "Bruno")).toBe(
            "There is no page named Bruno, nor a copy of that name in the open scene, to take athletics from: give who as the name of a character, or the number in the notation.",
        );
        const subtraction = await refused("roll", "1d20+athletics-1", "--who", "Ettore");
        expect(subtraction).toMatch(
            /^Ettore has no athletics-1\. Its numbers: str-mod \+2, dex-mod -1, .*, passive-perception 13, passive-insight 15, passive-investigation 10, long-jump 14 ft, high-jump 5 ft, push-drag 420 lb, hold-breath 3m, walking 25 ft, ac 18, caster-level 3, cantrips-known 3, spell-save-dc 13, spell-attack \+5, max-prepared 6, armor-class 16, armor-class-bonus \+2, attack \+4\. Give one of them, or the number, such as 1d20\+2\./,
        );
        expect(subtraction).toContain("To subtract, put spaces around the minus, such as 1d20+athletics - 1.");
        expect(await refused("roll", "1d20+sleight of hand", "--who", "Ettore")).toContain("A name of several words is written with hyphens, such as sleight-of-hand.");
        expect(await refused("roll", "1d20+str", "--who", "Ettore")).toBe(
            "str 14 is a score: the system 5e works out str-mod +2 from it, which is what a roll adds, such as 1d20+str-mod. Nothing rolled.",
        );
        expect(await refused("roll", "1d20+umore", "--who", "Ettore")).toBe('umore on Ettore is "sereno", not a whole number: give the number in the notation.');
        expect(campaign.log()).toHaveLength(logged);
        expect(await ok("roll", "1d20+3", "--who", "la guardia", "--no-hidden")).toMatch(/^\S+ la guardia: 1d20\+3 = 7 \[4\] \+ 3$/);
        expect(await ok("roll", "d20+2d6", "--who", "Ettore")).toContain("d20+2d6 = 12 [4] + [4, 4]");
    });

    it("reminds the effects on who rolls that are not in their numbers, the conditions, and the fields of their line not at zero", async () => {
        expect(await ok("roll", "1d20", "--who", "Ettore")).not.toContain("complete it");
        await ok("effect", "add", "Ettore", "Gauntlets of Ogre Power", "--set", "str=19");
        expect(await ok("roll", "1d20", "--who", "Ettore")).not.toContain("complete it");
        await ok("effect", "add", "Ettore", "Benedizione", "--for", "1m");
        await ok("effect", "add", "Ettore", "Poisoned", "--for", "1h", "--set", "speed=20 ft.");
        await ok("write", "Ettore", "--set", "exhaustion=1", "--set", "inspiration=0");
        expect(await ok("roll", "1d20", "--who", "Ettore")).toContain(
            "\nEttore has Benedizione, Poisoned, exhaustion 1: if they change this roll, complete it: roll only what they add, such as one more die, and keep this one; never roll it again; a reroll of one die rolls that die alone and keeps the rest.",
        );
    });
});

describe("what the review of 7 October put right", () => {
    it("rolls a creature's skills by name from its stat block, and shows only the values that do not repeat a modifier (D-210)", async () => {
        await ok("write", "Lupo", "--type", "creature", "--set", "creature=[[Wolf]]");
        await ok("write", "Gaspare", "--type", "character", "--set", "role=npc", "--set", "creature=[[Commoner]]");
        expect(await ok("roll", "1d20+perception", "--who", "Lupo")).toContain("1d20+perception = 7 [4] + 3 (perception +3)");
        expect(await ok("roll", "1d20+stealth", "--who", "Lupo")).toContain("1d20+stealth = 8 [4] + 4 (stealth +4)");
        expect(await ok("roll", "1d20+perception", "--who", "Gaspare")).toContain("1d20+perception = 4 [4] + 0 (perception +0)");
        const shown = await ok("show", "Lupo");
        expect(shown).toContain("\nperception +3: ");
        expect(shown).not.toContain("athletics +1: str-mod +1");
    });

    it("follows the 5e: hit points at every level, a hit die for each level, expertise only where proficient, inspiration up to 1", async () => {
        expect(await ok("write", "Ettore", "--set", "hp-per-level=1")).toContain("hp 23/27 (max 24 → 27: hp-base 18, level 3, con-mod +2, hp-per-level +1): worked out by the system 5e.");
        expect(await ok("write", "Ettore", "--set", "classes=[[Cleric]] 4")).toContain("(max 3 → 4: 4 in classes, hit-die d8)");
        await ok("write", "Ettore", "--add", "expertise=Stealth", "--add", "expertise=Insight");
        const shown = await ok("show", "Ettore");
        // Expertise has a second mark, but not where the character is not proficient, since it changes nothing there (D-217).
        expect(shown).toContain("insight +7 ●●");
        expect(shown).toContain("stealth -1 ·");
        await ok("write", "Ettore", "--set", "inspiration=1");
        expect(pageText("Ettore")).toContain("inspiration: 1/1");
    });

    it("adds a bonus an effect gives with its sign, and refuses an effect that gives a maximum the system works out otherwise", async () => {
        await ok("effect", "add", "Ettore", "Ring of Protection", "--set", "bonus-saves=+1");
        await ok("effect", "add", "Ettore", "Cloak of Protection", "--set", "bonus-saves=1");
        expect(await ok("show", "Ettore")).toContain("wis-save +7");
        expect(await refused("effect", "add", "Ettore", "Aid", "--set", "hp=25/31")).toBe(
            "The maximum of hp on Ettore is worked out by the system 5e: 24, from hp-base, classes, con, hp-per-level, subclasses, exhaustion. Give the effect the current value alone, such as hp=25, "
                + "or one of those fields, such as hp-base. Nothing changed.",
        );
    });

    it("leaves out a computed field written on a copy in the scene or on a page that gets its base in the same write (FOR-7)", async () => {
        await ok("scene", "open", "--title", "Imboscata", "--type", "combat", "--creatures", "Goblin=1");
        expect(await refused("write", "Goblin 1", "--set", "dex-mod=5")).toBe(
            "Not written, the system 5e works it out: dex-mod +2 (you gave 5). They come from dex. Nothing changed.",
        );
        expect(await ok("write", "Lupo", "--type", "creature", "--set", "creature=[[Wolf]]", "--set", "str-mod=3")).toContain("Not written, the system 5e works it out: str-mod +1 (you gave 3).");
        expect(readFileSync(join(folder, "world", "creatures", "Lupo.md"), "utf8")).not.toContain("str-mod");
    });

    it("puts right with validate's fix a maximum written by hand, and rolls for a name two pages share when the roll reads no sheet", async () => {
        writeFileSync(join(folder, "world", "characters", "Lena.md"), "---\nrole: companion\nlevel: 1\ncon: 10\nhp-base: 10\nhp: 5/40\n---\n");
        expect(await ok("validate")).toContain("Fix: change Lena, field hp, to 5/10.");
        await ok("change", "Lena", "hp", "--to", "5/10");
        expect(readFileSync(join(folder, "world", "characters", "Lena.md"), "utf8")).toContain("hp: 5/10");
        writeFileSync(join(folder, "world", "Ettore.md"), "Un'altra pagina con lo stesso nome.\n");
        expect(await ok("roll", "1d20", "--who", "Ettore")).toMatch(/Ettore: 1d20 = 4 \[4\]$/);
    });
});

describe("races and subraces of the SRD (D-201, SYS-2)", () => {
    it("gives a character what its subrace and race give, through the subrace, with the traits by name and each one's text on asking", async () => {
        const written = await ok("write", "Bruna", "--type", "character", "--set", "role=pc", "--set", "creature=[[Hill Dwarf]]", "--set", "level=3", "--set", "con=15", "--set", "hp-base=18");
        const shown = await ok("show", "Bruna");
        expect(shown).toContain("Derives from: Hill Dwarf (5e) › Dwarf (5e)");
        expect(shown).toContain("Saving Throws: con-save +2 · save-notes advantage on saving throws against poison");
        expect(shown).toContain("Combat: walking 25 ft (25 ft) · hp-base 18 · hp 27/27 · darkvision 60 ft · damage-resistances poison");
        expect(shown).toContain("From Hill Dwarf (5e): Ability Score Increase (Hill Dwarf), Dwarven Toughness.");
        expect(shown).toContain("From Dwarf (5e): Ability Score Increase, Age,");
        expect(shown).not.toContain("You have advantage on saving throws against poison");
        expect(await ok("show", "Bruna#Dwarven Resilience")).toContain("You have advantage on saving throws against poison, and you have resistance against poison damage.");
        // Dwarven Toughness: a hit point more at every level (p. 4); the hit points come full, as a use that comes back with a rest (DAT-9).
        expect(written).toContain("Bruna has hp 27/27, full: uses of the system 5e that come back with a rest.");
        expect(await ok("show", "Bruna#Combat")).toContain("hp 27/27: the maximum from hp-base 18, level 3, con-mod +2, hp-per-level +1");
    });

    it("says when a list written whole leaves out what the race gave (INH-7)", async () => {
        await ok("write", "Elia", "--type", "character", "--set", "role=pc", "--set", "creature=[[Elf]]");
        const written = await ok("write", "Elia", "--set", "skill-proficiencies=[Insight, Religion]", "--set", "languages=[Common, Elvish, Dwarvish]");
        expect(written).toContain("skill-proficiencies on Elia leaves out Perception, which it read from Elf: if the character keeps it, add it, such as add skill-proficiencies=Perception.");
        expect(written).not.toContain("languages on Elia leaves out");
    });

    it("derives a page of the system from its own, even where the campaign has a page of that name", async () => {
        // Written by hand: write refuses a page that hides one of the system (SYS-6).
        writeFileSync(join(folder, "world", "creatures", "Dwarf.md"), "---\nspeed: 40 ft\n---\n");
        await ok("write", "Bruna", "--type", "character", "--set", "role=npc", "--set", "creature=[[Hill Dwarf]]");
        expect(await ok("show", "Bruna")).toContain("Derives from: Hill Dwarf (5e) › Dwarf (5e)");
    });

    it("keeps the sheet of a companion with a level who derives from her race, not of one with a stat block", async () => {
        expect(await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "creature=[[Human]]", "--set", "level=2")).toContain("Lena's sheet of the system 5e still lacks");
        expect(await ok("write", "Zanna", "--type", "character", "--set", "role=companion", "--set", "creature=[[Wolf]]")).not.toContain("still lacks");
        expect(await ok("show", "Zanna")).not.toContain("Abilities:");
    });
});

describe("classes and subclasses of the SRD (D-201)", () => {
    it("works out the level from the classes and counts hit dice by each class's die, for a character of two classes", async () => {
        await ok("write", "Aria", "--type", "character", "--set", "role=pc", "--set", "creature=[[Human]]", "--set", "con=14", "--set", "hp-base=30", "--set", "hp=40", "--set", "hit-dice-d6=1");
        expect(await ok("write", "Aria", "--set", "classes=[[Fighter]] 3, [[Wizard]] 2", "--set", "subclasses=[[Champion]]", "--set", "hit-dice-d10=3")).toContain(
            "hit-dice-d6 1/2 (max none → 2: 2 in classes, hit-die d6)",
        );
        const shown = await ok("show", "Aria");
        expect(shown).toContain("Character: creature Human · size Medium · classes Fighter 3, Wizard 2 · subclasses Champion · level 5");
        expect(shown).toContain("Abilities: con 14 (+2) · proficiency +3");
        expect(shown).toContain("hp 40/40 · hit-dice-d6 1/2 · hit-dice-d10 3/3");
        expect(await refused("write", "Aria", "--set", "level=6")).toContain("Not written, the system 5e works it out: level 5 (you gave 6). They come from classes.");
        expect(await ok("validate")).not.toContain("Aria");
        // Who the character is comes first on the sheet, the background and the feat as links to the system's pages (D-207).
        await ok("write", "Aria", "--set", "background=[[Acolyte (background)]]", "--set", "feats=[[Grappler]]", "--set", "alignment=neutral good");
        expect(await ok("show", "Aria")).toContain(
            "Character: creature Human · size Medium · classes Fighter 3, Wizard 2 · subclasses Champion · background Acolyte (background) · feats Grappler · alignment neutral good · level 5",
        );
        expect(await ok("validate")).not.toContain("Aria");
    });

    it("counts the hit dice of a class the campaign writes, from the die its page gives (D-215)", async () => {
        await ok("write", "Cacciatore di sangue", "--type", "topic", "--set", "category=class", "--set", "hit-die=d10");
        const written = await ok("write", "Vex", "--type", "character", "--set", "role=pc", "--set", "classes=[[Cacciatore di sangue]] 3, [[Fighter]] 2", "--set", "hit-dice-d10=5");
        expect(written).toContain("hit-dice-d10 5/5 (max none → 5: 5 in classes, hit-die d10)");
    });

    it("adds a hit point at every sorcerer level for the Draconic Bloodline (p. 45)", async () => {
        const written = await ok(
            "write",
            "Sera",
            "--type",
            "character",
            "--set",
            "role=companion",
            "--set",
            "creature=[[Rock Gnome]]",
            "--set",
            "classes=[[Sorcerer]] 3",
            "--set",
            "subclasses=[[Draconic Bloodline]]",
            "--set",
            "con=12",
            "--set",
            "hp-base=14",
            "--set",
            "hp=1",
        );
        expect(written).toContain("hp 1/20 (max none → 20: hp-base 14, level 3, con-mod +1, Draconic Bloodline in subclasses, Sorcerer 3 in classes)");
    });
});

describe("laws of rolls from the sheet", () => {
    it("total what the same roll totals with the numbers the sheet gives (DAT-8)", async () => {
        const skills = ["acrobatics", "athletics", "insight", "religion", "stealth", "survival", "wis-save", "initiative", "passive-perception"];
        const sheet = fc.record({
            scores: fc.array(fc.integer({ min: 3, max: 20 }), { minLength: 6, maxLength: 6 }),
            level: fc.integer({ min: 1, max: 20 }),
            proficient: fc.subarray(["Athletics", "Insight", "Religion", "Stealth"]),
            field: fc.constantFrom(...skills),
            face: fc.integer({ min: 1, max: 20 }),
        });
        await fc.assert(
            fc.asyncProperty(sheet, async ({ scores, level, proficient, field, face }) => {
                const abilities = ["str", "dex", "con", "int", "wis", "cha"].map((ability, index) => `${ability}=${scores[index]}`);
                await ok("write", "Ettore", ...[...abilities, `level=${level}`, `skill-proficiencies=[${proficient.join(", ")}]`].flatMap((assignment) => ["--set", assignment]));
                const shown = JSON.parse(await ok("show", "Ettore", "--json")) as { worked: { field: string; line: string; }[]; };
                const line = shown.worked.find((worked) => worked.field === field)?.line ?? "";
                const value = Number(/^\S+ ([+-]?\d+)/.exec(line)?.[1]);
                const rolled = await ok("roll", `1d20+${field}`, "--who", "Ettore", "--values", String(face));
                expect(rolled).toContain(`1d20+${field} = ${face + value} [${face}]`);
            }),
            { numRuns: 12 },
        );
    }, 120000);
});
