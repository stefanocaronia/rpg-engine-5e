// The 5e system's own tests (D-172): what it takes from the SRD 5.1 and how it says so. They go with the package, and npm does not publish them.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadWorld } from "../../../src/pages/index.ts";
import { findSystem } from "../../../src/systems/index.ts";
import { testSystemFolders } from "../../../test/support.ts";

const folder = join(import.meta.dirname, "..");
const srdAttribution = 'This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at '
    + "https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License "
    + "available at https://creativecommons.org/licenses/by/4.0/legalcode.";

describe("the 5e system", () => {
    it("gives the attribution of the SRD 5.1, in system.yaml and in its license, with no other mark of its publisher", () => {
        expect(findSystem(testSystemFolders, "5e")?.attribution).toBe(srdAttribution);
        const license = readFileSync(join(folder, "LICENSE.md"), "utf8");
        expect(license).toContain(srdAttribution);
        expect(license).toContain("compatible with fifth edition");
        expect(license).not.toMatch(/D&D|Dungeons & Dragons/);
    });

    it("keeps the numbers of the SRD 5.1, as these pages of it give them", () => {
        const pages = loadWorld(folder).pages;
        const fields = (name: string): Record<string, unknown> | undefined => pages.find((page) => page.name === name)?.fields;
        // SRD 5.1, p. 393 (Wolf), p. 356–357 (Zombie), p. 63–64 and 66 (armor and weapons), p. 67 (Healer's Kit).
        expect(fields("Wolf")).toMatchObject({ ac: 13, hp: "11/11", "hp-dice": "2d8 + 2", speed: "40 ft", str: 12, dex: 15, cr: "1/4 (50 XP)" });
        expect(fields("Zombie")).toMatchObject({ ac: 8, hp: "22/22", "hp-dice": "3d8 + 9", speed: "20 ft", saves: ["Wis +0"] });
        expect(fields("Shield")).toMatchObject({ cost: "10 gp", "armor-class": "+2", weight: "6 lb" });
        expect(fields("Longsword")).toMatchObject({ cost: "15 gp", damage: "1d8 slashing", weight: "3 lb", properties: ["versatile (1d10)"] });
        expect(fields("Healer's Kit")).toMatchObject({ uses: "10/10" });
    });
});
