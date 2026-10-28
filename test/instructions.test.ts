// The 5e's instructions for the master (D-514, D-531): what it adds to the core's words for any game, in play, in a fight and when an adventure is built.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fifthEdition, repository } from "./support.ts";

describe("the 5e's instructions", () => {
    it("give a fight its own words after the core's: armor class, attacks and damage, the stat block's hit points, the place in the rules' words", async () => {
        const campaign = await fifthEdition();

        try {
            const opened = await campaign.ok("scene", "open", "--title", "Agguato", "--type", "combat");
            const core = opened.indexOf("Tell the turns in order, as story");
            expect(core).toBeGreaterThan(-1);
            expect(opened.indexOf("\n\nArmor class too is said in words")).toBeGreaterThan(core);
            expect(opened).toContain("- A foe has the hit points of its stat block at every difficulty: the difficulty changes which foes come and how they fight, never their hit points.");
            expect(opened).toContain("half or three-quarters cover, difficult terrain, dim light or darkness, water (rules Underwater Combat)");
        } finally {
            await campaign.close();
        }
    });

    it("tell a check of Arcana, History, Medicine, Nature or Religion as knowledge, never as an episode of the character's past; Athletics as itself", async () => {
        const campaign = await fifthEdition();
        const note = "What it reveals is what the world shows or their trade knows, said as knowledge: an episode of their past the player has not told is a question to them.";

        try {
            await campaign.ok("write", "Corrado", "--type", "character", "--set", "role=pc", "--set", "wis=14", "--set", "int=12", "--set", "str=10");

            for (const skill of ["arcana", "history", "medicine", "nature", "religion"]) {
                expect(await campaign.ok("roll", `1d20+${skill}`, "--who", "Corrado", "--why", "la ferita")).toContain(`\n${note}`);
            }

            expect(await campaign.ok("roll", "1d20+athletics", "--who", "Corrado", "--why", "il muro")).not.toContain(note);
        } finally {
            await campaign.close();
        }
    });

    it("keep in play only what every message needs, and give the rest with its situation: a fight, a rest, the setup and session zero (D-532)", async () => {
        const campaign = await fifthEdition();

        try {
            const given = await campaign.ok("instructions");
            expect(given).toContain("- Alignment describes a character, it never limits what the player does.\n");

            for (const gone of ["must recharge", "ammunition", "Lifestyle is", "A long rest is each one's", "work in any world", "A critical hit doubles", "offer a new alignment"]) {
                expect(given).not.toContain(gone);
            }

            const fight = await campaign.ok("scene", "open", "--title", "Agguato", "--type", "combat");
            expect(fight).toContain("For the player's character, the attack first, then the damage only if it hits, each its own ask; saving throws too. A critical hit doubles the damage's dice");
            expect(fight).toContain("- A foe's power that must recharge, once spent, is an effect on its copy without end");
            expect(fight).toContain("- Under the rigor rules or simulation, each attack with ammunition spends a piece with change");
            await campaign.ok("scene", "close", "--summary", "Respinti.");
            expect(await campaign.ok("scene", "open", "--title", "Il bivacco", "--type", "rest")).toContain(
                "A long rest is each one's: six hours of sleep and at most two of light activity, as a watch: whoever keeps a longer watch gains no long rest.",
            );
            await campaign.ok("scene", "close", "--summary", "Riposano.");
            // Session zero's part, which a campaign in play reaches only after its setup's checklist, is read as the engine reads it.
            const zero = readFileSync(join(repository, "instructions", "session-zero.md"), "utf8");
            expect(zero).toContain("When their choices keep going another way, you may say so once in brackets and offer a new alignment");
            expect(zero).toContain("The rules work in any world, not only the SRD's");
            await campaign.ok("mode", "setup");
            expect(await campaign.ok("instructions")).toContain("The rules work in any world, not only the SRD's");
        } finally {
            await campaign.close();
        }
    });

    it("size a fight in play with the SRD 5.2.1's budget, each creature counted once, with no multiplier (D-531 (7))", async () => {
        const campaign = await fifthEdition();

        try {
            const given = await campaign.ok("instructions");
            expect(given).toContain(
                "- Size a fight with the XP budget per character of rules Combat Encounters, at the party's level and as the difficulty says, times the characters: each creature's XP counts once, with no multiplier for their number.",
            );
            expect(given).not.toContain("In the fifth edition:\n");
            // The chapter it names is there, read by its title.
            expect(await campaign.ok("rules", "XP Budget per Character")).toContain("| 8 | 1,000 | 1,700 | 2,100 |");
        } finally {
            await campaign.close();
        }
    });

    it("add to the core's part adventure the long rests and the party counted a level higher as a rule of this table, when the last quest ends (D-531 (7))", async () => {
        const campaign = await fifthEdition();

        try {
            await campaign.ok("write", "Il guado", "--type", "quest", "--set", "status=open");
            const ended = await campaign.ok("write", "Il guado", "--set", "status=done");
            const core = ended.indexOf("An adventure is a quest with its secrets and events");
            expect(core).toBeGreaterThan(-1);
            expect(ended.indexOf("In the fifth edition:\n\n- A full rest is a long rest: at difficulty normal, two to four fights between two long rests.")).toBeGreaterThan(core);
            expect(ended).toContain("count the party a level higher: a rule of this table, not of the SRD, said as ours if the player asks.");
        } finally {
            await campaign.close();
        }
    });
});
