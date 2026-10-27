// The examples of the commands' descriptions in the 5e's names (D-518): what the engine's MCP server gives a host in a 5e campaign, through the test kit.
import type { TestCampaign } from "rpg-engine/testing";
import { afterEach, describe, expect, it } from "vitest";
import { fifthEdition } from "./support.ts";

let campaign: TestCampaign | undefined;

afterEach(async () => {
    await campaign?.close();
    campaign = undefined;
});

describe("the examples of the descriptions (D-518)", () => {
    it("names the 5e's counter, checks, coins, uses of a turn, rests, pool of dice and bonus in a 5e campaign", async () => {
        campaign = await fifthEdition({ language: "it" });
        const tools = campaign.descriptions();
        expect(tools.change).toContain('Example: page Bruna, field hp, by -3, why "bitten by the wolf"; or recipe "long rest".');
        expect(tools.change).toContain('such as money: 34 gp 4 sp: spend "5 sp" pays');
        expect(tools.change).toContain("such as field hit-dice-d6, spend 2");
        expect(tools.roll).toContain("Example: notation 1d20+str-save, why");
        expect(tools.ask).toContain('options ["Tiro salvezza su Forza 1d20+str-save", "Tiro salvezza su Destrezza 1d20+dex-save"], who Bruna.');
        expect(tools.scene).toContain("by the game's names, such as action, bonus action, reaction");
        expect(tools.effect).toContain("set bonus-ac=2.");
        expect(tools.trade).toContain('gives "2 gp", gets');
        expect(Object.values(tools).join("\n")).not.toMatch(/\{\{\w+\}\}/);
    });
});
