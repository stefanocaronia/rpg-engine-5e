// The 5e's instructions for the master (D-514): what it adds to the core's words for a fight, which hold for any game.
import { describe, expect, it } from "vitest";
import { fifthEdition } from "./support.ts";

describe("the 5e's instructions", () => {
    it("give a fight its own words after the core's: armor class, attacks and damage", async () => {
        const campaign = await fifthEdition();

        try {
            const opened = await campaign.ok("scene", "open", "--title", "Agguato", "--type", "combat");
            const core = opened.indexOf("Tell the turns in order, as story");
            expect(core).toBeGreaterThan(-1);
            expect(opened.indexOf("\n\nArmor class too is said in words")).toBeGreaterThan(core);
        } finally {
            await campaign.close();
        }
    });
});
