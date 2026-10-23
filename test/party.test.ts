// The written test of a party (D-454, PLAN): four characters of different classes through a whole stretch of play, with no AI, under the rigor rules: made at
// the first level, on the road and at the inn, in a fight to the dying point, resting, rising to the fifth level, binding items and carrying too much.
// Each number is the one the SRD 5.1 gives, with its page; the steps run in order on the same campaign.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCommandLine } from "../../../src/command-line.ts";
import type { Context } from "../../../src/core/context.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "../../../test/support.ts";

let folder: string;
let context: Context;

beforeAll(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("config", "rigor", "rules");
    await ok("config", "units", "imperial");
    await ok("advance", "--to", "day 1, 08:00");
    await ok("write", "Guadoscuro", "--type", "place", "--set", "kind=village");
    await ok("write", "Locanda", "--type", "place");
    await ok("write", "Guadoscuro", "--add", "contains=[[Locanda]]");
    await ok("write", "Strada", "--type", "place");
    // A human fighter (pp. 24–25), a high elf wizard (pp. 52–55), a hill dwarf cleric of Life (pp. 15–18) and a lightfoot halfling rogue (pp. 39–40).
    await character("Bruna", "pc", ["creature=[[Human]]", "classes=[[Fighter]] 1", "str=16", "dex=12", "con=14", "int=10", "wis=12", "cha=8", "hp-base=10"], [
        "save-proficiencies=[str, con]",
        "armor-proficiencies=[all armor, shields]",
        "weapon-proficiencies=[simple weapons, martial weapons]",
        "fighting-styles=[Defense]",
    ]);
    await character("Ilaria", "companion", ["creature=[[High Elf]]", "classes=[[Wizard]] 1", "str=8", "dex=14", "con=12", "int=16", "wis=12", "cha=10", "hp-base=6"], [
        "save-proficiencies=[int, wis]",
        "weapon-proficiencies=[dagger, dart, sling, quarterstaff, light crossbow]",
    ]);
    await character("Ugo", "companion", ["creature=[[Hill Dwarf]]", "classes=[[Cleric]] 1", "subclasses=[[Life Domain]]", "str=14", "dex=10", "con=14", "int=10", "wis=16", "cha=12", "hp-base=8"], [
        "save-proficiencies=[wis, cha]",
        "armor-proficiencies=[light armor, medium armor, shields, heavy armor]",
        "weapon-proficiencies=[simple weapons]",
    ]);
    await character("Vespa", "companion", ["creature=[[Lightfoot]]", "classes=[[Rogue]] 1", "str=10", "dex=16", "con=12", "int=12", "wis=10", "cha=14", "hp-base=8"], [
        "save-proficiencies=[dex, int]",
        "armor-proficiencies=[light armor]",
        "weapon-proficiencies=[simple weapons, hand crossbow, longsword, rapier, shortsword]",
        "skill-proficiencies=[Stealth, Acrobatics, Perception, Sleight of Hand]",
        "expertise=[Stealth, Perception]",
    ]);
    await gear("Bruna", ["Chain Mail", "Shield", "Longsword"], ["Rations 2"]);
    await gear("Ugo", ["Scale Mail", "Shield", "Mace"], ["Rations 2"]);
    await gear("Vespa", ["Leather Armor", "Shortsword"], ["Rations 2"]);
    await gear("Ilaria", ["Quarterstaff"], []);
    await ok("write", "Strada", "--add", "contains=[[Bruna]]", "--add", "contains=[[Ilaria]]", "--add", "contains=[[Ugo]]", "--add", "contains=[[Vespa]]");
});

afterAll(() => removeFolder(folder));

describe("a party of four, from the first level to the fifth", () => {
    it("makes each sheet at the first level as the SRD gives it", async () => {
        // Chain mail 16, a shield 2, Defense 1 (pp. 24, 64); 10 + Con 2 hit points (p. 24); a longsword with Str and proficiency (pp. 66, 94).
        const bruna = await ok("show", "Bruna");
        expect(bruna).toContain("ac 19");
        expect(bruna).toContain("hp 12/12");
        expect(bruna).toContain("Longsword +5, 1d8+3 slashing");
        // 6 + Con 1; 10 + Dex 2; save DC 8 + 2 + Int 3, attack +5; two slots of the first level; Int 3 + level 1 prepared (pp. 52–53).
        const ilaria = await ok("show", "Ilaria");
        expect(ilaria).toContain("hp 7/7");
        expect(ilaria).toContain("ac 12");
        expect(ilaria).toContain("spell-save-dc 13");
        expect(ilaria).toContain("spell-attack +5");
        expect(ilaria).toContain("slots-1 2/2");
        expect(ilaria).toContain("max-prepared 4");
        // 8 + Con 2 + the hill dwarf's 1 (p. 4); scale mail 14 + Dex 0 + shield 2 (p. 64); a dwarf's 25 feet (p. 3).
        const ugo = await ok("show", "Ugo");
        expect(ugo).toContain("hp 11/11");
        expect(ugo).toContain("ac 16");
        expect(ugo).toContain("walking 25 ft");
        // Leather 11 + Dex 3; expertise doubles the proficiency on Stealth (p. 39): 3 + 4; Sneak Attack 1d6 (p. 39).
        const vespa = await ok("show", "Vespa");
        expect(vespa).toContain("ac 14");
        expect(vespa).toContain("stealth +7");
        expect(vespa).toContain("Sneak Attack");
    });

    it("eats a ration a day on the road, and counts the days of who has none (pp. 86–87; UPK-1, UPK-2)", async () => {
        const first = await ok("advance", "--by", "1d");
        expect(first).toContain("Bruna eats a day's food:");
        // Ilaria carries none: Con 12 gives her 3 + 1 days before exhaustion.
        expect(first).toContain("Ilaria has no Rations: days-without-food 1, of 4 before exhaustion.");
        expect(first).toContain("Water: a gallon each, two if the weather is hot.");
        expect(await ok("advance", "--by", "1d")).toContain("Ilaria has no Rations: days-without-food 2, of 4 before exhaustion.");
        expect(await ok("show", "Bruna")).not.toContain("Rations");
    });

    it("pays a modest day at the inn, and feeds who went hungry (pp. 72–73; UPK-1, UPK-4)", async () => {
        await ok("move", "Bruna", "--to", "Locanda");
        await ok("move", "Ilaria", "--to", "Locanda");
        await ok("move", "Ugo", "--to", "Locanda");
        await ok("move", "Vespa", "--to", "Locanda");

        for (const name of ["Bruna", "Ilaria", "Ugo", "Vespa"]) {
            await ok("write", name, "--set", "lifestyle=Modest", "--set", "money=5 gp");
        }

        const day = await ok("advance", "--by", "1d");
        expect(day).toContain("Bruna pays a Modest day: money 5 gp → 4 gp.");
        expect(day).toContain("Ilaria ate: days-without-food back to 0.");
        expect(day).not.toContain("Water:");
    });

    it("fights by turns, counts the uses of each, the damage by type, and the dying point (pp. 90–98; TRN, DMG, DIE)", async () => {
        await ok("scene", "open", "--title", "La cantina", "--type", "combat", "--creatures", "Skeleton=2");
        const order = await ok("scene", "order", "--order", "Bruna", "--order", "Skeleton 1", "--order", "Vespa", "--order", "Ilaria", "--order", "Ugo", "--order", "Skeleton 2");
        expect(order).toContain("Mark with scene use what Bruna uses of the turn");
        // One attack at the first level: a second is refused (p. 93).
        expect(await use("Bruna", "attack")).toBe("Bruna: attack 1 of 1, its action used.");
        expect(await refused("Bruna", "attack")).toContain("Bruna has used its action until its next turn, with 1 attack of 1");
        // A skeleton takes slashing whole (p. 346).
        expect(await ok("change", "Skeleton 1", "hp", "--by=-7", "--damage", "slashing")).toBe("Skeleton 1: hp 13/13 → 6/13.");
        await ok("scene", "next");
        // The skeleton's shortsword, 1d6 + 2 (p. 346), drops Ilaria: unconscious at 0 (p. 98).
        expect(await ok("change", "Ilaria", "hp", "--by=-7", "--damage", "piercing")).toContain("Ilaria is Unconscious while hp is 0.");
        await ok("scene", "next");
        expect(await use("Vespa", "attack")).toBe("Vespa: attack 1 of 1, its action used.");
        expect(await use("Vespa", "sneak attack")).toBe("Vespa: sneak attack used.");
        expect(await ok("change", "Skeleton 1", "hp", "--by=-9", "--damage", "piercing")).toContain("Skeleton 1: hp 6/13 → 0/13");
        // On her turn the dying Ilaria makes a death save (p. 98), which the engine rolls for a companion: 4, a failure (DIE-5).
        expect(await ok("scene", "next")).toContain("Ilaria is dying: the engine rolled its death save, 1d20 = 4 [4], so never roll it again. Ilaria's death save: 4, a failure; death-failures 0 → 1.");
        await ok("scene", "next");
        // Cure Wounds from a first-level slot, 1d8 + Wis 3 + Disciple of Life's 2 + 1, at least 7 (pp. 17, 133): the saves are reset, and she wakes (p. 98).
        await ok("change", "Ugo", "slots-1", "--by=-1");
        expect(await ok("change", "Ilaria", "hp", "--by=7")).toContain("Ilaria is no longer dying: death-failures 1 → 0, Unconscious ended.");
        await ok("scene", "next");
        await ok("change", "Bruna", "hp", "--by=-5", "--damage", "piercing");

        // Round 2, to Ugo's turn: Bruna, Skeleton 1 (fallen, its turn passed), Vespa, Ilaria, Ugo.
        for (let turn = 0; turn < 5; turn++) {
            await ok("scene", "next");
        }

        // A mace's bludgeoning is doubled on a skeleton (p. 346); it takes no poison, nor the poisoned condition.
        expect(await ok("change", "Skeleton 2", "hp", "--by=-5", "--damage", "bludgeoning")).toBe("Skeleton 2: hp 13/13 → 3/13: bludgeoning 5 doubled, in damage-vulnerabilities: 10.");
        expect(await ok("change", "Skeleton 2", "hp", "--by=-5", "--damage", "poison")).toBe("Nothing changed: hp on Skeleton 2 is 3/13: poison ignored, in damage-immunities.");
        expect((await runCommandLine(["effect", "add", "Skeleton 2", "Poisoned"], context)).output).toContain("Skeleton 2 is immune to Poisoned");
        await ok("change", "Skeleton 2", "hp", "--by=-3", "--damage", "bludgeoning");
        // Two skeletons of 50 xp each, shared by the four (p. 258).
        expect(await ok("scene", "close", "--summary", "Gli scheletri della cantina cadono.")).toContain("100 in all; 25 each");
    });

    it("spends a hit die in a short rest, with the Constitution modifier (p. 87)", async () => {
        await ok("advance", "--by", "1h");
        expect(await ok("change", "Bruna", "hit-dice-d10", "--spend", "1", "--recipe", "short rest")).toMatch(/^Bruna spends 1 hit-dice-d10: 1d10\+2 = \[\d+\] \+ 2, \d+; hp 7\/12 → \d+\/12; hit-dice-d10 1\/1 → 0\/1\.$/);
    });

    it("rises to the fifth level with what each class gives there (pp. 15, 24, 39, 52, 56)", async () => {
        // Hit points as the average of each die after the first, rounded up: 6 for a d10, 5 for a d8, 4 for a d6 (p. 56).
        await ok("write", "Bruna", "--set", "classes=[[Fighter]] 5", "--set", "hp-base=34", "--set", "xp=6500");
        await ok("write", "Ilaria", "--set", "classes=[[Wizard]] 5", "--set", "hp-base=22", "--set", "xp=6500");
        await ok("write", "Ugo", "--set", "classes=[[Cleric]] 5", "--set", "hp-base=28", "--set", "xp=6500");
        await ok("write", "Vespa", "--set", "classes=[[Rogue]] 5", "--set", "hp-base=28", "--set", "xp=6500");
        // 34 + 5 × Con 2; proficiency +3; Extra Attack: two attacks (p. 25).
        const bruna = await ok("show", "Bruna");
        expect(bruna).toContain("/44");
        expect(bruna).toContain("proficiency +3");
        expect(bruna).toContain("extra-attacks 1");
        expect(bruna).toContain("Longsword +6, 1d8+3 slashing");
        // 22 + 5 × Con 1; slots 4, 3, 2; save DC 8 + 3 + 3; Int 3 + 5 prepared (pp. 52–53).
        const ilaria = await ok("show", "Ilaria");
        expect(ilaria).toContain("/27");
        expect(ilaria).toContain("slots-3 2/2");
        expect(ilaria).toContain("spell-save-dc 14");
        expect(ilaria).toContain("max-prepared 8");
        // 28 + 5 × (Con 2 + the hill dwarf's 1).
        expect(await ok("show", "Ugo")).toContain("/43");
        // Sneak Attack 3d6 at the fifth level, and Uncanny Dodge (p. 39).
        const vespa = await ok("show", "Vespa");
        expect(vespa).toContain("3d6");
        expect(vespa).toContain("Uncanny Dodge");
    });

    it("attacks twice with Extra Attack, again with Action Surge, and has it and Second Wind back after a short rest (pp. 25, 87; TRN-3, TRN-5)", async () => {
        await ok("scene", "open", "--title", "Il ponte", "--type", "combat", "--creatures", "Bandit=1");
        await ok("scene", "order", "--order", "Bruna", "--order", "Bandit 1");
        expect(await use("Bruna", "attack")).toBe("Bruna: attack 1 of 2, its action used.");
        expect(await use("Bruna", "attack")).toBe("Bruna: attack 2 of 2.");
        expect(await refused("Bruna", "attack")).toContain("with 2 attack of 2");
        expect(await ok("scene", "use", "--who", "Bruna", "--uses", "attack", "--by", "Action Surge")).toBe("Bruna: attack 1 of 2, its action used, by Action Surge; action-surge 1 → 0.");
        // Second Wind takes the bonus action (p. 25).
        expect(await use("Bruna", "bonus action")).toContain("Bruna: bonus action used.");
        await ok("change", "Bruna", "second-wind", "--by=-1");
        await ok("change", "Bandit 1", "hp", "--by=-11", "--damage", "slashing");
        await ok("scene", "close", "--summary", "Il brigante del ponte cade.");
        await ok("advance", "--by", "1h");
        const rested = await ok("change", "Bruna", "--recipe", "short rest");
        expect(rested).toContain("action-surge 0/1 → 1/1");
        expect(rested).toContain("second-wind 0/1 → 1/1");
    });

    it("binds three items at most, which give their bonuses and resistances (pp. 97, 206, 212, 214, 237; BND, DMG-4)", async () => {
        await ok("write", "Bruna", "--add", "inventory=[[Ring of Protection]]", "--add", "inventory=[[Cloak of Protection]]", "--add", "inventory=[[Boots of the Winterlands]]");
        await ok("write", "Bruna", "--add", "equipped=[[Ring of Protection]]", "--add", "equipped=[[Cloak of Protection]]", "--add", "equipped=[[Boots of the Winterlands]]");
        await ok("write", "Bruna", "--add", "attuned=[[Ring of Protection]]", "--add", "attuned=[[Cloak of Protection]]", "--add", "attuned=[[Boots of the Winterlands]]");
        expect(await ok("show", "Bruna")).toContain("ac 21");
        expect(await ok("change", "Bruna", "hp", "--by=-10", "--damage", "cold")).toContain("cold 10 halved, in damage-resistances: 5");
        expect((await runCommandLine(["write", "Bruna", "--add", "attuned=[[Amulet of Health]]"], context)).output).toContain("more than 3, the most");
    });

    it("slows who carries past the limit under the rigor rules (p. 80; D-445, LOAD-3, SPD)", async () => {
        // 10,000 gold pieces weigh 200 pounds, fifty to the pound (p. 62), past Strength 16 × 15 = 240 with what she carries.
        await ok("change", "Bruna", "money", "--to", "10000 gp");
        expect(await ok("show", "Bruna")).toContain("walking 5 ft");
        await ok("change", "Bruna", "money", "--to", "4 gp");
        expect(await ok("show", "Bruna")).toContain("walking 30 ft");
    });

    it("gives a long rest once in 24 hours, with half the hit dice back (p. 87; RST-1)", async () => {
        await ok("advance", "--by", "8h");
        // Up to half the hit dice back, at least one (p. 87): Bruna had spent one; Ugo's spent slot comes back.
        const rested = await ok("change", "--recipe", "long rest");
        expect(rested).toContain("Bruna: hp 39/44 → 44/44; hit-dice-d10 4/5 → 5/5.");
        expect(rested).toContain("Ugo: slots-1 3/4 → 4/4.");
        expect(await ok("show", "Bruna")).toContain("hp 44/44");
        expect(await ok("change", "--recipe", "long rest")).toContain("gains nothing from another before");
    });

    it("keeps the sheet within its most: a score of 20, the spells prepared (pp. 53, 76; LIM-1)", async () => {
        expect((await runCommandLine(["write", "Ilaria", "--set", "int=21"], context)).output).toContain("Ilaria would have int 21, more than 20");
        const spells = ["Magic Missile", "Shield (spell)", "Sleep", "Mage Armor", "Burning Hands", "Detect Magic", "Misty Step", "Fireball", "Fly"];
        expect((await runCommandLine(["write", "Ilaria", "--set", `prepared=${spells.map((spell) => `[[${spell}]]`).join(", ")}`], context)).output).toContain(
            "Ilaria would have 9 in prepared, more than 8",
        );
    });
});

/** A character of the party, as the master writes it: its fields, then its lists one by one. */
async function character(name: string, role: string, fields: string[], lists: string[]): Promise<void>
{
    await ok("write", name, "--type", "character", "--set", `role=${role}`, ...fields.flatMap((field) => ["--set", field]));
    await ok("write", name, ...lists.flatMap((list) => ["--set", list]));
}

/** What a character carries and has equipped, with stacks such as two rations. */
async function gear(name: string, equipped: string[], stacks: string[]): Promise<void>
{
    const items = equipped.flatMap((item) => ["--add", `inventory=[[${item}]]`, "--add", `equipped=[[${item}]]`]);
    const piles = stacks.flatMap((stack) => ["--add", `inventory=[[${stack.replace(/ \d+$/, "")}]] ${/\d+$/.exec(stack)?.[0] ?? 1}`]);
    await ok("write", name, ...items, ...piles);
}

async function use(who: string, uses: string): Promise<string>
{
    return ok("scene", "use", "--who", who, "--uses", uses);
}

async function refused(who: string, uses: string): Promise<string>
{
    const result = await runCommandLine(["scene", "use", "--who", who, "--uses", uses], context);
    expect(result.exitCode).toBe(1);
    return result.output;
}

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, `${args.join(" ")}: ${result.output}`).toBe(0);
    return result.output;
}
