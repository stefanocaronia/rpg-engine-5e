// How characters gain levels on the 5e (D-205, D-212, D-233, D-234): the setting the setup asks (DAT-10), the experience points and the level they reach (PRO-6),
// and what the creatures overcome in a scene give the party (DAT-11).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestCampaign } from "rpg-engine/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fifthEdition } from "./support.ts";

let campaign: TestCampaign;
let folder: string;

beforeEach(async () => {
    campaign = await fifthEdition();
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

/** A character of the party, with what its sheet needs. */
async function character(name: string, role: string, ...fields: string[]): Promise<void>
{
    const base = [`role=${role}`, "creature=[[Human]]", "str=12", "dex=14", "con=14", "int=10", "wis=12", "cha=10", "hp-base=10"];
    await ok("write", name, "--type", "character", ...[...base, ...fields].flatMap((field) => ["--set", field]));
}

function campaignFile(): string
{
    return readFileSync(join(folder, "campaign.yaml"), "utf8");
}

describe("the setting of advancement (DAT-10, D-212)", () => {
    it("is asked with the campaign's, says what each value means, takes only those, and validate reports one written by hand", async () => {
        expect(await ok("status")).toContain("Still missing: advancement (xp or milestones). Ask the player, then set it with the config command (setting and value).");
        expect(await ok("config", "advancement")).toBe(
            "advancement: (missing; xp: experience points, as the SRD: scene close says those of the creatures overcome, and you give more with change, as you judge, for what the story rewards, "
                + "to one character or to all; milestones: the characters rise when the story reaches a milestone, such as the end of an adventure or a great goal: agree with the player which kind, "
                + "write it in table, and you say when)\n\n"
                + "Still missing: advancement (xp or milestones). Ask the player, then set it with the config command (setting and value).",
        );
        expect(await refused("config", "advancement", "levels")).toContain('"levels" is not a value of advancement, which takes xp (experience points, as the SRD:');
        expect(await ok("config", "advancement", "Milestones")).toContain("advancement: milestones: the characters rise when the story reaches a milestone");
        expect(campaignFile()).toContain("advancement: milestones\n");
        expect(campaign.log().at(-1)).toMatchObject({ type: "config-changed", visibility: "public", data: { setting: "advancement", value: "milestones" } });
        expect(await ok("config")).toContain("\nadvancement: milestones: the characters rise");
        // The campaign's line says it at every session.
        expect(await ok("status")).toContain(
            "Test · en · 5e, the fifth edition from the SRD 5.1, the 2014 rules · difficulty normal · lethality dice · saves checkpoint · rigor smooth · dice digital · units metric · advancement milestones · mode play\n",
        );
        expect(await refused("config", "advancment", "xp")).toContain('There is no setting "advancment". The settings are: name, language, system,');
        writeFileSync(join(folder, "campaign.yaml"), campaignFile().replace("advancement: milestones", "advancement: livelli"));
        expect(await ok("validate")).toContain(
            'advancement is "livelli", which the system 5e does not take: xp or milestones. Fix: ask the player, then config, setting advancement, with value xp or value milestones.',
        );
        writeFileSync(join(folder, "campaign.yaml"), campaignFile().replace("advancement: livelli", "advancement: 5"));
        expect(await ok("validate")).toContain("advancement is 5, which the system 5e does not take: xp or milestones.");
    });

    it("with milestones leaves xp out of the sheet, the line and what the sheet still lacks, and says so when it is written", async () => {
        await ok("config", "advancement", "milestones");
        await character("Ennio", "pc", "classes=[[Fighter]] 1");
        expect(await ok("show", "Ennio")).toContain("Character: creature Human · size Medium · classes Fighter 1 · level 1\n");
        expect(await ok("write", "Ennio", "--set", "xp=500")).toContain("xp is not kept with advancement milestones: config says what it means.");
        expect(await ok("status")).toContain("PC: Ennio: level 1 · hp 12/12");
        expect(await ok("status")).not.toMatch(/ xp |level 2/);
    });
});

describe("the experience points (PRO-6, D-205, D-234)", () => {
    beforeEach(async () => {
        await ok("config", "advancement", "xp");
    });

    it("say how many the next level needs, then the level they reach, with what a new level gives, until the classes rise", async () => {
        await character("Ennio", "pc", "classes=[[Fighter]] 1", "xp=0");
        expect(await ok("status")).toContain("PC: Ennio: level 1 · xp 0 (300 to level 2) · hp 12/12");
        expect(await ok("show", "Ennio")).toContain("classes Fighter 1 · level 1 · xp 0 (300 to level 2)");
        const due = "Ennio has the xp for level 2: level up with the player, out of the story, now or at the next rest as they prefer; they choose what the new level asks: "
            + 'read rules "Beyond 1st Level".';
        expect(await ok("change", "Ennio", "xp", "--by", "200", "--why", "i lupi")).not.toContain("has the xp");
        const reached = await ok("change", "Ennio", "xp", "--by", "150", "--why", "la missione");
        // When the points reach it, the system's note on what a level gives comes with it: where the hit points go.
        expect(reached).toContain(`${due} Each new level gives hit points, but a new character's first, which takes the largest number of its class's hit die: for each, roll the hit die of the class that rose`);
        expect(reached).toContain("add them to hp-base with write, without con-mod, which the system adds by itself.");
        expect(await ok("status")).toContain("PC: Ennio: level 1 · xp 350 (level 2 due) · hp 12/12");
        expect(await ok("status")).toContain(due);
        // Points that reach a level already due say nothing new.
        expect(await ok("change", "Ennio", "xp", "--by", "10")).not.toContain("has the xp");
        expect(await ok("write", "Ennio", "--set", "classes=[[Fighter]] 2")).toContain('A first level in another class follows rules "Multiclassing"');
        expect(await ok("status")).toContain("PC: Ennio: level 2 · xp 360 (540 to level 3)");
        expect(await ok("status")).not.toContain("has the xp");
    });

    it("leave a companion's choices to the master, say the highest level they reach, and nothing at the last level of the table", async () => {
        await character("Lena", "companion", "classes=[[Wizard]] 1", "xp=2800");
        expect(await ok("show", "Lena")).toContain("xp 2800 (level 4 due)");
        expect(await ok("status")).toContain(
            "Lena has the xp for level 4: level up the companion: what the new level asks is yours to choose, as the story has shaped the companion, or the player's if they made it: "
                + 'read rules "Beyond 1st Level".',
        );
        await ok("write", "Lena", "--set", "classes=[[Wizard]] 20");
        await ok("change", "Lena", "xp", "--to", "355000");
        expect(await ok("show", "Lena")).toContain("level 20 · xp 355000\n");
    });

    it("are at least what the level needs: write says it, the line shows it, and validate reports it, as points written with a maximum or as text", async () => {
        await character("Lena", "companion", "classes=[[Wizard]] 5");
        expect(await ok("write", "Lena", "--set", "xp=0")).toContain("Lena is level 5: a character of that level has at least 6500 xp: change Lena, field xp, to 6500.");
        expect(await ok("show", "Lena")).toContain("xp 0 (at least 6500 at level 5)");
        expect(await ok("validate")).toContain("Lena has 0 xp at level 5, which needs at least 6500. Fix: change Lena, field xp, to 6500.");
        const page = join(folder, "world", "characters", "Lena.md");
        writeFileSync(page, readFileSync(page, "utf8").replace("xp: 0", "xp: 7000/14000"));
        expect(await ok("validate")).toContain("Lena has xp written with a maximum, 14000: experience points have none, and change stops at it. Fix: write Lena, set xp=7000.");
        writeFileSync(page, readFileSync(page, "utf8").replace("xp: 7000/14000", "xp: 7000 XP"));
        expect(await ok("validate")).toContain('Lena has xp "7000 XP", which is no number of points. Fix: write Lena, set xp as a whole number, such as xp=0.');
    });

    it("of the creatures overcome in a scene, those that left too, are shared among the party there, said and never given; none with milestones", async () => {
        await character("Ennio", "pc", "classes=[[Fighter]] 1", "xp=0");
        await character("Lena", "companion", "classes=[[Wizard]] 1");
        await ok("write", "Rasco", "--type", "character", "--set", "role=npc", "--set", "creature=[[Bandit]]");
        await ok("write", "Bosco", "--type", "place", "--set", "contains=[[Ennio]], [[Lena]], [[Rasco]]");
        await ok("scene", "open", "--title", "Agguato", "--type", "combat", "--with", "Ennio", "--with", "Lena", "--with", "Rasco", "--creatures", "Wolf=2", "--creatures", "Goblin=2");
        await ok("change", "Wolf 1", "hp", "--to", "0");
        await ok("scene", "leave", "--who", "Wolf 1", "--who", "Goblin 1");
        await ok("change", "Wolf 2", "hp", "--by=-20");
        await ok("change", "Rasco", "hp", "--to", "0");
        const closed = await ok("scene", "close", "--summary", "I lupi cadono.");
        expect(closed).toContain(
            "xp of those overcome: Wolf 2 50, Wolf 1 50, Rasco 25, 125 in all; 62 each to Ennio, Lena: change Ennio, field xp, by 62; change Lena, field xp, by 62. "
                + "Rasco is a character: leave out any who fought on your side, and share again. Fled: Goblin 1 50, to count if the party overcame them. "
                + "Leave out what the party summoned; count those overcome another way and what the story rewards, as you judge, and tell the player only what each gained.",
        );
        expect(readFileSync(join(folder, "world", "characters", "Ennio.md"), "utf8")).toContain("xp: 0\n");
        // A companion without points yet starts from 0, as the system declares them a counter with no maximum (CNT-8).
        expect(await ok("change", "Lena", "xp", "--by", "62")).toBe("Lena: xp 0 → 62.");
        await ok("config", "advancement", "milestones");
        await ok("scene", "open", "--title", "Altro agguato", "--type", "combat", "--creatures", "Wolf=1");
        await ok("change", "Wolf 1", "hp", "--to", "0");
        expect(await ok("scene", "close", "--summary", "Un altro lupo.")).not.toContain("overcome");
    });

    it("of the story come when a quest ends, as the system says", async () => {
        await ok("write", "Il pozzo", "--type", "quest");
        expect(await ok("write", "Il pozzo", "--set", "status=done")).toContain(
            "Il pozzo is done. What the story rewards: with xp, give it with change, as you judge, to one character or to all; with milestones, if this was one, tell the player in brackets what they achieved and that the characters rise, then level them up with the player, now or at the next rest, as they prefer.",
        );
        expect(await ok("write", "Il pozzo", "--set", "status=done", "--set", "goal=trovato")).not.toContain("What the story rewards");
    });

    it("of a quest wait until it ends: write asks once whether it is over, when its last goal is ticked (D-239)", async () => {
        const ticked = "Every goal of Il pozzo is ticked and it is still open: if the story has ended it, write status done.";
        await ok("write", "Il pozzo", "--type", "quest", "--set", "status=open", "--text=- [x] Scendere\n- [ ] Riempire il secchio");
        expect(await ok("write", "Il pozzo", "--text=- [x] Scendere\n- [x] Riempire il secchio")).toContain(ticked);
        expect(await ok("write", "Il pozzo#Note", "--text", "L'acqua è dolce.")).not.toContain(ticked);
        expect(await ok("write", "Il pozzo", "--text=- [x] Scendere\n- [x] Riempire il secchio\n- [ ] Portarla al paese")).not.toContain(ticked);
        expect(await ok("write", "Il pozzo", "--text=- [x] Scendere\n- [x] Riempire il secchio\n- [x] Portarla al paese")).toContain(ticked);
        expect(await ok("write", "Il pozzo", "--set", "status=done")).toContain("Il pozzo is done. What the story rewards:");
    });

    it("of a quest whose goals are all ticked: each scene that closes asks whether it ended its story, until it is done (D-239)", async () => {
        const ticked = "Every goal of Il pozzo is ticked and it is still open: if the story has ended it, write status done.";
        await ok("write", "Il pozzo", "--type", "quest", "--set", "status=open", "--text=- [x] Scendere\n- [ ] Riempire il secchio");
        await ok("scene", "open", "--title", "Al pozzo", "--type", "exploration");
        expect(await ok("scene", "close", "--summary", "Ennio scende nel pozzo.")).not.toContain(ticked);
        await ok("write", "Il pozzo", "--text=- [x] Scendere\n- [x] Riempire il secchio");
        await ok("scene", "open", "--title", "Il ritorno", "--type", "travel");
        expect(await ok("scene", "close", "--summary", "Ennio torna col secchio pieno.")).toContain(
            `Advance any time it took that you have not advanced yet; write on their pages what it changed for good, such as a fire put out or a door broken.\n${ticked}`,
        );
        await ok("write", "Il pozzo", "--set", "status=done");
        await ok("scene", "open", "--title", "La festa", "--type", "social");
        expect(await ok("scene", "close", "--summary", "Il paese beve.")).not.toContain(ticked);
    });
});

describe("what a new level gives, written by the player's choices (PRO-4, FOR-7)", () => {
    it("writes a feature by hand beside those of the rows, which the sheet shows and the formulas count (PRO-3), and says when a section stands in place of a feature's text", async () => {
        await character("Ennio", "pc", "classes=[[Fighter]] 1");
        await ok("write", "Ennio", "--add", "features=Stroke of Luck");
        expect(await ok("show", "Ennio")).toContain("features Fighting Style, Second Wind, Stroke of Luck");
        // Stroke of Luck's use comes with the feature, written or given.
        expect(await ok("show", "Ennio")).toContain("stroke-of-luck 1/1");
        expect(await ok("write", "Ennio#Second Wind", "--text", "Ennio si rialza sempre.")).toContain(
            "show Ennio#Second Wind now gives this section, not the text of the feature Second Wind its classes give.",
        );
    });
});

describe("the rules of advancement", () => {
    it("are the SRD's text: Beyond 1st Level and Multiclassing (pp. 56–58)", async () => {
        expect(await ok("rules", "Multiclassing Prerequisites")).toContain("| Monk | Dexterity 13 and Wisdom 13 |");
        expect(await ok("rules", "Character Advancement")).toContain("| 900 | 3 | +2 |");
    });
});
