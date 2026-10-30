// The dying (D-454, D-460; DIE-1–DIE-5): Unconscious at 0 hit points, a failure for damage there, instant death, the death saves, and all of it ended by hit points
// regained.
import type { Player, Rows, TestCampaign } from "rpg-engine/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fifthEdition, withContext } from "./support.ts";

let campaign: TestCampaign;

beforeEach(async () => {
    campaign = await fifthEdition({ language: "it" });
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "hp=10/20");
});

afterEach(() => campaign.close());

describe("the dying", () => {
    it("falls Unconscious at 0, counts a failure for damage there, and ends it all with hit points regained (DIE-1, DIE-2, DIE-3)", async () => {
        expect(await ok("change", "Ettore", "hp", "--by=-12")).toContain("Ettore is Unconscious while hp is 0.");
        await ok("change", "Ettore", "death-successes", "--by=1");
        expect(await ok("change", "Ettore", "hp", "--by=-3")).toContain("death-failures 0 → 1: damage at 0 hp; a critical hit counts two, so add one more with change.");
        expect(await ok("change", "Ettore", "hp", "--by=4")).toContain("Ettore is no longer dying: death-successes 1 → 0, death-failures 1 → 0, Unconscious ended.");
        expect(await ok("show", "Ettore")).not.toContain("Unconscious");
    });

    it("writes the death save the player rolls with a button: a success at 10, a failure under it, two on a 1, back to 1 hp on a 20 (DIE-4, D-460)", async () => {
        await ok("change", "Ettore", "hp", "--by=-10");
        // The page gets only the check, as no one turns a death save down, in the 5e's card, with what its page module draws of it (D-516).
        let shown: { labels: string[]; rows?: Rows; card?: unknown; } | undefined;
        const page: Player = {
            choose: async (_question, _title, labels, _signal, rows) => {
                shown = { labels, rows, card: await rows?.card?.shows() };
                return undefined;
            },
        };
        await withContext(campaign, { page }, () => campaign.ask({ question: "Ettore è a terra", options: "Tiro contro la morte 1d20", who: "Ettore" }));
        expect(shown).toMatchObject({
            labels: ["Tiro: Tiro contro la morte (1d20)"],
            rows: { who: "Ettore", fields: [null], forced: true, card: { widget: "5e.death-save" } },
            card: {
                body: "death-save",
                data: { who: "Ettore", successes: { value: 0, most: 3 }, failures: { value: 0, most: 3 }, down: true, dead: false, sides: 20, atLeast: 10, lowest: 2, highest: { field: "hp", value: 1 } },
            },
        });

        const save = async (face: number): Promise<string> => {
            const clicking: Player = { choose: async () => 0 };
            return (await withContext(campaign, { player: clicking, random: () => face }, () => campaign.ask({ question: "Ettore è a terra", options: "Tiro contro la morte 1d20", who: "Ettore" }))).output;
        };

        expect(await save(4)).toContain("\nEttore's death save: 4, a failure; death-failures 0 → 1.");
        expect(await save(12)).toContain("\nEttore's death save: 12, a success; death-successes 0 → 1.");
        expect(await save(1)).toContain("\nEttore's death save: 1, the lowest face, 2 failures; death-failures 1 → 3. Ettore dies: a moment of its own in the story.");
        // Dead, no more saves are written; the same at hp 0 again, with a 20 the counter comes back and the dying ends.
        expect(await save(15)).not.toContain("death save");
        await ok("change", "Ettore", "death-failures", "--to", "0");
        await ok("change", "Ettore", "death-successes", "--to", "0");
        expect(await save(20)).toContain("\nEttore's death save: 20, the highest face: hp 0/20 → 1/20.\nEttore is no longer dying: Unconscious ended.");
    });

    it("makes one stable with the system's effect, as a companion's Medicine does; damage there undoes it, hit points end it (DIE-6, playtest 08)", async () => {
        await ok("change", "Ettore", "hp", "--by=-10");
        await ok("change", "Ettore", "death-failures", "--by=1");
        expect(await ok("effect", "add", "Ettore", "Stable")).toContain(
            "Ettore is stable: death-successes 0 → 3, death-failures 1 → 0; no more death saves, still Unconscious until it regains hp.",
        );
        const clicking: Player = { choose: async () => 0 };
        const asked = await withContext(campaign, { player: clicking }, () => campaign.ask({ question: "Ettore", options: "Tiro contro la morte 1d20", who: "Ettore" }));
        expect(asked.output).not.toContain("death save");
        expect(await ok("change", "Ettore", "hp", "--by=-2")).toContain(
            "death-failures 0 → 1: damage at 0 hp; a critical hit counts two, so add one more with change. Ettore is no longer stable: death-successes 3 → 0, Stable ended; its death saves start again.",
        );
        await ok("effect", "add", "Ettore", "Stable");
        expect(await ok("change", "Ettore", "hp", "--by=5")).toContain("Ettore is no longer dying: death-successes 3 → 0, Unconscious ended, Stable ended.");
        // Initiative read from the sheet is no death save, though a d20 (playtest 08); the master is told it was not counted.
        await ok("change", "Ettore", "hp", "--to", "0");
        const initiative = await ok("roll", "1d20+2", "--who", "Ettore", "--why", "iniziativa");
        expect(initiative).not.toContain("Ettore's death save");
        expect(initiative).toContain(
            "Ettore is dying, and 1d20+2 was not counted as a death save, which is 1d20 alone, with dice added but no number: nothing was written. "
                + "If it was one, write its outcome with change death-successes or death-failures.",
        );
    });

    it("clears the failures at the third success, reads d20 as the save, and says death when damage or instant death ends one stable (review of 17 October)", async () => {
        await ok("change", "Ettore", "hp", "--by=-10");
        // d20 alone is the save's die, as 1d20.
        const rolled = async (face: number): Promise<string> => (await withContext(campaign, { random: () => face }, () => campaign.run("roll", "d20", "--who", "Ettore"))).output;
        await rolled(4);
        await rolled(12);
        await rolled(12);
        expect(await rolled(12)).toContain("Ettore's death save: 12, a success; death-successes 2 → 3, death-failures 1 → 0. Ettore is stable");
        // Stable, then killed at once: Stable goes with it.
        expect(await ok("change", "Ettore", "hp", "--by=-25")).toContain("death-failures 0 → 3, Stable ended. Read rules Instant Death.");
        // Damage that brings the failures to their most says the death, not saves starting again.
        await ok("change", "Ettore", "death-failures", "--to", "0");
        await ok("change", "Ettore", "death-successes", "--to", "0");
        await ok("effect", "add", "Ettore", "Stable");
        await ok("change", "Ettore", "death-failures", "--to", "2");
        expect(await ok("change", "Ettore", "hp", "--by=-1")).toContain(
            "death-failures 2 → 3: damage at 0 hp; a critical hit counts two, so add one more with change. Ettore is no longer stable: death-successes 3 → 0, Stable ended. Ettore dies: a moment of its own in the story.",
        );
    });

    it("counts no instant death for what temporary hit points take, brings back no one dead, and writes nothing of a hidden roll (review of 17 October)", async () => {
        await ok("change", "Ettore", "hp", "--to", "5");
        await ok("write", "Ettore", "--set", "temp-hp=10");
        const hit = await ok("change", "Ettore", "hp", "--by=-30");
        expect(hit).not.toContain("dies at once");
        await ok("change", "Ettore", "death-failures", "--to", "3");
        // The dead regain nothing: hp back to 0, and how the rules bring them back (DIE-7).
        expect(await ok("change", "Ettore", "hp", "--by=10")).toContain(
            "Ettore is dead, with death-failures 3: what this change gave is undone, hp back to 0, as hp regained brings no one back. To bring Ettore back as the rules say, as a spell does: "
                + "first change death-failures to 0, then give the hp.",
        );
        expect(await ok("show", "Ettore")).toContain("hp 0/20");
        // Damage on the dead counts no failure and kills no one again.
        const struck = campaign.log().length;
        expect(await ok("change", "Ettore", "hp", "--by=-4")).not.toContain("dies");
        expect(campaign.log().slice(struck).filter((entry) => entry.data.field === "death-failures")).toEqual([]);
        await ok("change", "Ettore", "death-failures", "--to", "0");
        const before = campaign.log().length;
        await ok("roll", "1d20", "--who", "Ettore", "--hidden");
        expect(campaign.log().slice(before).filter((entry) => entry.type === "counter-changed")).toEqual([]);
    });

    it("takes one written dead as dead: no death saves, no card, and hit points bring them back only once written alive (DIE-7, review of 30 October)", async () => {
        await ok("change", "Ettore", "hp", "--to", "0");
        await ok("write", "Ettore", "--set", "status=dead");
        const rolled = await withContext(campaign, { random: () => 20 }, () => campaign.run("roll", "1d20", "--who", "Ettore"));
        expect(rolled.output).not.toContain("death save");
        expect(await ok("change", "Ettore", "hp", "--by=5")).toContain(
            "Ettore is dead, written status=dead: what this change gave is undone, hp back to 0, as hp regained brings no one back. To bring Ettore back as the rules say, as a spell does: "
                + "first write status=alive, then give the hp.",
        );
        expect(await ok("show", "Ettore")).toContain("hp 0/20");
        const struck = campaign.log().length;
        await ok("change", "Ettore", "hp", "--by=-4");
        expect(campaign.log().slice(struck).filter((entry) => entry.data.field === "death-failures")).toEqual([]);
        await ok("write", "Ettore", "--set", "status=alive");
        expect(await ok("change", "Ettore", "hp", "--by=5")).toContain("Ettore is no longer dying");
    });

    it("leaves a party member as they are when a form that gives hit points goes to 0, what goes past for its text to say (DIE-8, D-454)", async () => {
        await ok("effect", "add", "Ettore", "Forma selvatica", "--set", "hp=11/11");
        const hit = await ok("change", "Ettore", "hp", "--by=-15");
        expect(hit).toContain("4 went past 0 in Forma selvatica");
        expect(hit).not.toContain("Unconscious");
        expect(hit).not.toContain("dies at once");
        expect(await ok("show", "Ettore")).not.toContain("Unconscious");
        expect(await ok("effect", "end", "Ettore", "Forma selvatica")).toContain("hp 0/11 → 10/20");
    });

    it("rolls a companion's death save as its turn starts, told as the mentor setting asks; three successes make it stable (DIE-5, D-460)", async () => {
        await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "hp=3/12");
        await ok("change", "Lena", "hp", "--by=-5");
        await ok("scene", "open", "--title", "Il guado", "--type", "combat", "--with", "Ettore", "--with", "Lena");
        await ok("scene", "order", "--order", "Ettore", "--order", "Lena");
        expect(await ok("scene", "next")).toContain(
            "Lena is dying: the engine rolled its death save, 1d20 = 4 [4], so never roll it again. Lena's death save: 4, a failure; death-failures 0 → 1. Tell it in a sentence, the roll in brackets. "
                + "To stabilize Lena, as Medicine or a spell does: effect add Lena Stable, which sets the death saves itself. Read rules Death Saving Throws.",
        );
        await ok("config", "mentor", "off");
        await ok("change", "Lena", "death-successes", "--to", "2");
        await ok("scene", "next");
        const fifteen = await withContext(campaign, { random: () => 15 }, () => campaign.run("scene", "next"));
        expect(fifteen.output).toContain(
            "Lena's death save: 15, a success; death-successes 2 → 3, death-failures 1 → 0. Lena is stable: no more death saves, still Unconscious until it regains hp. "
                + "Tell it in the story alone: never name the save or its roll.",
        );
        expect(fifteen.output).not.toContain("To stabilize");
        await ok("scene", "next");
        expect(await ok("scene", "next")).not.toContain("death save");
    });

    it("leaves the death save of every player character to the player, the second too, on its own card (DIE-4, DIE-5, D-450)", async () => {
        await ok("write", "Mira", "--type", "character", "--set", "role=pc", "--set", "hp=3/12");
        await ok("change", "Mira", "hp", "--by=-5");
        await ok("scene", "open", "--title", "Il guado", "--type", "combat", "--with", "Ettore", "--with", "Mira");
        await ok("scene", "order", "--order", "Ettore", "--order", "Mira");
        const turn = await ok("scene", "next");
        expect(turn).toContain("Mira is dying: the turn starts with their death save, the player's to roll: ask them, with ask, a check of 1d20; the engine writes its outcome.");
        expect(campaign.log().filter((entry) => entry.type === "roll")).toEqual([]);

        let shown: unknown;
        const page: Player = {
            choose: async (_question, _title, _labels, _signal, rows) => {
                shown = { ...rows, card: await rows?.card?.shows() };
                return 0;
            },
        };
        const result = await withContext(campaign, { page, random: () => 13 }, () => campaign.ask({ question: "Mira è a terra", options: "Tiro contro la morte 1d20", who: "Mira" }));
        expect(shown).toMatchObject({ who: "Mira", card: { data: { who: "Mira", successes: { value: 0 } } } });
        expect(result.output).toContain("Mira's death save: 13, a success; death-successes 0 → 1.");
    });

    it("dies at once when what goes past 0 is as large as the maximum (DIE-2)", async () => {
        expect(await ok("change", "Ettore", "hp", "--by=-30", "--damage", "fire")).toContain(
            "Ettore dies at once: 20 past 0 is at least the maximum, 20; death-failures 0 → 3. Read rules Instant Death.",
        );
    });
});

async function ok(...args: string[]): Promise<string>
{
    const result = await campaign.run(...args);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
