// The items a 5e character attunes to (D-435, D-449, D-456; BND-1–BND-4): at most three, each one that asks for it, what one asks said, and what the
// attuned ones give while worn or held, the SRD's pages that give bonuses among them.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestCampaign } from "rpg-engine/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fifthEdition } from "./support.ts";

let campaign: TestCampaign;
let folder: string;

beforeEach(async () => {
    campaign = await fifthEdition({ language: "it" });
    folder = campaign.folder;
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "str=14");
    // A sword of the campaign, whose magic is the SRD's Holy Avenger: it asks what that item asks.
    await ok("write", "Spada di Ettore", "--type", "item", "--set", "item=[[Longsword]]", "--set", "magic=[[Holy Avenger]]");
});

afterEach(() => campaign.close());

describe("attunement", () => {
    it("binds up to three items that ask for it, says how many and what one asks, and refuses a fourth before writing (BND-1, BND-3)", async () => {
        expect(await ok("write", "Ettore", "--add", "attuned=[[Ring of Protection]]")).toContain("Ettore: attuned Ring of Protection, 1 of 3. Read Attunement.");
        expect(await ok("write", "Ettore", "--add", "attuned=[[Spada di Ettore]]")).toContain(
            "Ettore: attuned Spada di Ettore, 2 of 3; it asks: by a paladin, which you check. Read Attunement.",
        );
        await ok("write", "Ettore", "--add", "attuned=[[Cloak of Protection]]");
        const fourth = await campaign.run("write", "Ettore", "--add", "attuned=[[Amulet of Health]]");
        expect(fourth.exitCode).toBe(1);
        expect(fourth.output).toBe(
            "Ettore would have 4 items in attuned, more than 3, the most (read Attunement): remove one first, such as remove attuned=[[Ring of Protection]]. Nothing changed.",
        );
        // One removed and another added in the same write is three again.
        await ok("write", "Ettore", "--remove", "attuned=[[Ring of Protection]]", "--add", "attuned=[[Amulet of Health]]");
        expect(await ok("show", "Ettore")).toContain("attuned Spada di Ettore, Cloak of Protection, Amulet of Health");
    });

    it("refuses an item that asks for no attunement, with how to write one that does (BND-2)", async () => {
        const bag = await campaign.run("write", "Ettore", "--add", "attuned=[[Bag of Holding]]");
        expect(bag.output).toBe("Bag of Holding asks for no attunement, so it goes in no attuned: if it does, write Bag of Holding, set attunement=true. Nothing changed.");
        const text = await campaign.run("write", "Ettore", "--add", "attuned=anello strano");
        expect(text.output).toBe(`attuned takes links to items, not "anello strano": write the item's page first, then add attuned=[[anello strano]]. Nothing changed.`);
        await ok("write", "Anello del guado", "--type", "item", "--set", "attunement=true");
        await ok("write", "Ettore", "--add", "attuned=[[Anello del guado]]");
    });

    it("reports in validate a list written by hand over the most (BND-1)", async () => {
        writeFileSync(
            join(folder, "world", "characters", "Nero.md"),
            '---\nrole: npc\nattuned: ["[[Ring of Protection]]", "[[Cloak of Protection]]", "[[Amulet of Health]]", "[[Flame Tongue]]"]\n---\n',
        );
        expect(await ok("validate")).toContain("Nero has 4 items in attuned, more than 3, the most.");
    });
});

describe("what attuned items and feats give (D-449)", () => {
    it("adds up the bonuses of every item one is attuned to and every feat, with the effects", async () => {
        await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "dex=10", "--set", "wis=10", "--set", "hp-base=10");
        const ac = async (): Promise<string> => /(?<![-\w])ac \d+/.exec(await ok("show", "Ettore"))?.[0] ?? "";
        expect(await ac()).toBe("ac 10");
        await ok("write", "Ettore", "--add", "inventory=[[Ring of Protection]]", "--add", "equipped=[[Ring of Protection]]", "--add", "inventory=[[Cloak of Protection]]", "--add", "equipped=[[Cloak of Protection]]");
        await ok("write", "Ettore", "--add", "attuned=[[Ring of Protection]]", "--add", "attuned=[[Cloak of Protection]]");
        expect(await ac()).toBe("ac 12");
        await ok("write", "Fortunato", "--type", "topic", "--set", "category=feat", "--set", "bonus-ac=1");
        await ok("write", "Ettore", "--add", "feats=[[Fortunato]]");
        expect(await ac()).toBe("ac 13");
        await ok("effect", "add", "Ettore", "Shield of Faith", "--set", "bonus-ac=2");
        expect(await ac()).toBe("ac 15");
        expect(await ok("show", "Ettore")).toContain("wis-save +2");
    });

    it("adds the proficiency bonus of an item of the campaign one is attuned to, as an Ioun Stone of Mastery (D-449)", async () => {
        await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "hp-base=10");
        expect(await ok("show", "Ettore")).toContain("proficiency +2");
        await ok("write", "Pietra della maestria", "--type", "item", "--set", "attunement=true", "--set", "bonus-proficiency=1");
        await ok("write", "Ettore", "--add", "inventory=[[Pietra della maestria]]", "--add", "equipped=[[Pietra della maestria]]", "--add", "attuned=[[Pietra della maestria]]");
        expect(await ok("show", "Ettore")).toContain("proficiency +3");
    });

    it("raises an ability score to what an attuned item sets, and keeps it when higher (FOR-5)", async () => {
        await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "str=8", "--set", "hp-base=10");
        await ok("write", "Ettore", "--add", "inventory=[[Gauntlets of Ogre Power]]", "--add", "equipped=[[Gauntlets of Ogre Power]]", "--add", "attuned=[[Gauntlets of Ogre Power]]");
        expect(await ok("show", "Ettore")).toContain("str 19 (+4)");
        await ok("write", "Ettore", "--set", "str=20");
        expect(await ok("show", "Ettore")).toContain("str 20 (+5)");
        // An effect sets the score, whatever the gauntlets give.
        await ok("effect", "add", "Ettore", "Feeblemind", "--set", "str=1");
        expect(await ok("show", "Ettore")).toContain("str 1 (-5)");
    });
});

describe("the SRD pages that give bonuses when attuned (D-449)", () => {
    it("adds the Stone of Good Luck's 1 to saves, skills and initiative, and a Remarkable Athlete's Strength modifier to the long jump", async () => {
        await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "dex=10", "--set", "wis=10", "--set", "hp-base=10");
        const read = async (name: string): Promise<string> => new RegExp(`(?<![-\\w])${name} [+-]?\\d+`).exec(await ok("show", "Ettore"))?.[0] ?? "";
        expect(await read("wis-save")).toBe("wis-save +0");
        await ok("write", "Ettore", "--add", "inventory=[[Stone of Good Luck]]", "--add", "equipped=[[Stone of Good Luck]]", "--add", "attuned=[[Stone of Good Luck]]");
        expect(await read("wis-save")).toBe("wis-save +1");
        expect(await read("initiative")).toBe("initiative +1");
        expect(await read("passive-perception")).toBe("passive-perception 11");
        expect(await ok("show", "Ettore")).toContain("long-jump 14 ft");
        await ok("write", "Ettore", "--set", "classes=[[Fighter]] 7", "--set", "subclasses=[[Champion]]", "--set", "hp-base=58");
        expect(await ok("show", "Ettore")).toContain("long-jump 16 ft");
    });
});

describe("an attuned item worn or held (D-456, BND-4)", () => {
    it("gives its bonuses only while in equipped too, and says so when bound", async () => {
        await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "dex=10", "--set", "hp-base=10", "--add", "inventory=[[Ring of Protection]]");
        const ac = async (): Promise<string> => /(?<![-\w])ac \d+/.exec(await ok("show", "Ettore"))?.[0] ?? "";
        expect(await ok("write", "Ettore", "--add", "attuned=[[Ring of Protection]]")).toContain(
            "Its bonuses count while it is in equipped too: add equipped=[[Ring of Protection]] when worn or held.",
        );
        expect(await ac()).toBe("ac 10");
        await ok("write", "Ettore", "--add", "equipped=[[Ring of Protection]]");
        expect(await ac()).toBe("ac 11");
    });
});

async function ok(...args: string[]): Promise<string>
{
    const result = await campaign.run(...args);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
