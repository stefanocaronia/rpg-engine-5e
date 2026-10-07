// The 5e system's own tests (D-172): what it takes from the SRD 5.1 and how it says so. They go with the package, and npm does not publish them.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listItems } from "../../../src/core/formula.ts";
import { loadWorld, sectionTitles } from "../../../src/pages/index.ts";
import { featureParts, gainedFeatures, levelledFeatures, levelTable } from "../../../src/progression/index.ts";
import { readRuleBook, ruleFiles } from "../../../src/rules/index.ts";
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
        // SRD 5.1, p. 393 (Wolf, its challenge and experience points apart), p. 356–357 (Zombie), p. 63–64 and 66 (armor and weapons), p. 67 (Healer's Kit).
        expect(fields("Wolf")).toMatchObject({ ac: 13, hp: "11/11", "hp-dice": "2d8 + 2", speed: "40 ft", str: 12, dex: 15, cr: "1/4", "xp-value": 50 });
        expect(fields("Zombie")).toMatchObject({ ac: 8, hp: "22/22", "hp-dice": "3d8 + 9", speed: "20 ft", saves: ["Wis +0"] });
        expect(fields("Shield")).toMatchObject({ cost: "10 gp", "armor-class-bonus": "2 + bonus", weight: "6 lb" });
        // The Armor table and the Weapons table (pp. 63, 65–66), as formulas on who wears or wields them (D-231).
        expect(fields("Half Plate Armor")).toMatchObject({ aliases: ["Half plate"], category: "medium armor", cost: "750 gp", "armor-class": "15 + min(dex-mod, 2) + bonus", "stealth-disadvantage": true, weight: "40 lb" });
        expect(fields("Plate Armor")).toMatchObject({ "armor-class": "18 + bonus", "strength-required": 15 });
        expect(fields("Studded Leather Armor")?.["armor-class"]).toBe("12 + dex-mod + bonus");
        expect(fields("Light Crossbow")).toMatchObject({ aliases: ["Crossbow, light"], category: "simple ranged weapon", damage: "1d8 piercing", properties: ["ammunition (range 80/320)", "loading", "two-handed"] });
        expect(fields("Rapier")?.attack).toBe("max(str-mod, dex-mod) + proficiency * max(has(weapon-proficiencies, martial weapons), has(weapon-proficiencies, Rapier), has(weapon-proficiencies, rapiers)) + bonus");
        expect(fields("Longbow")?.["damage-roll"]).toBe("1d8 + dex-mod + bonus piercing");
        expect(fields("Net")?.damage).toBeUndefined();
        const equipment = pages.filter((page) => /armor|shield|weapon$/.test(String(page.fields.category)) && page.fields.category !== "weapon (any)");
        expect(equipment.length).toBe(50);
        expect(fields("Longsword")).toMatchObject({ cost: "15 gp", damage: "1d8 slashing", weight: "3 lb", properties: ["versatile (1d10)"] });
        expect(fields("Healer's Kit")).toMatchObject({ uses: "10/10" });
    });

    it("keeps the text of the SRD 5.1 in seventeen chapters of rules, as these parts of it show (D-177)", () => {
        const rules = join(folder, "rules");
        expect(ruleFiles(rules)).toEqual([
            "Adventuring",
            "Beyond 1st Level",
            "Combat",
            "Conditions",
            "Diseases",
            "Equipment",
            "Fantasy-Historical Pantheons",
            "Madness",
            "Monsters",
            "Nonplayer Characters",
            "Objects",
            "Poisons",
            "Races",
            "Spellcasting",
            "The Planes of Existence",
            "Traps",
            "Using Ability Scores",
        ]);
        const book = readRuleBook(rules, "5e");
        const text = (path: string): string => book.find((section) => section.path.join(" › ") === path)?.text ?? "";
        // SRD 5.1, p. 87 (Long Rest), p. 95 (Grappling), p. 358 (Exhaustion), p. 358–359 (the conditions).
        expect(text("Adventuring › Resting › Long Rest")).toContain("A long rest is a period of extended downtime, at least 8 hours long, during which a character sleeps");
        expect(text("Combat › Making an Attack › Melee Attacks › Grappling")).toContain("***Escaping a Grapple.***");
        expect(text("Appendix PH-A: Conditions › Exhaustion")).toContain("| 6 | Death |");
        // SRD 5.1, p. 56 (Character Advancement), p. 57 (Unarmored Defense when multiclassing).
        expect(text("Beyond 1st Level")).toContain("| 355,000 | 20 | +6 |");
        expect(text("Beyond 1st Level › Multiclassing › Class Features › Unarmored Defense")).toContain("If you already have the Unarmored Defense feature, you can’t gain it again from another class.");
        expect(book.filter((section) => section.file === "Conditions" && section.level === 2)).toHaveLength(15);
        // SRD 5.1, p. 3 (Subraces), p. 59 (Exotic Languages), p. 60 (Using Inspiration), pp. 199–200 (Sight Rot), p. 201 (Short-Term Madness), p. 203 (Object
        // Armor Class), p. 205 (Serpent Venom), p. 256 and p. 258 (the tables by challenge rating, printed in two halves), p. 260 (Lair Actions), p. 321 (the
        // Half-Dragon Template), p. 362 (Norse Deities).
        expect(text("Races › Racial Traits › Subraces")).toContain("Members of a subrace have the traits of the parent race in addition to the traits specified for their subrace.");
        expect(text("Beyond 1st Level › Languages › Exotic Languages")).toContain("| Deep Speech | Aboleths, cloakers | — |");
        expect(text("Beyond 1st Level › Inspiration › Using Inspiration")).toContain("Spending your inspiration gives you advantage on that roll.");
        expect(text("Diseases › Sample Diseases › Sight Rot")).toContain("Sight rot can be cured using a rare flower called Eyebright");
        expect(text("Madness › Madness Effects › Short-Term Madness")).toContain("| 81–90 | The character is stunned. |");
        expect(text("Objects › Statistics for Objects › Object Armor Class")).toContain("| Adamantine | 23 |");
        expect(text("Poisons › Sample Poisons › Serpent Venom (Injury)")).toContain("must succeed on a DC 11 Constitution saving throw, taking 10 (3d6) poison damage on a failed save");
        expect(text("Monsters › Saving Throws › Proficiency Bonus by Challenge Rating")).toContain("| 1/8 | +2 |\n| 1/4 | +2 |");
        expect(text("Monsters › Challenge › Experience Points › Experience Points by Challenge Rating")).toContain("| 13 | 10,000 |\n| 14 | 11,500 |");
        expect(text("Monsters › Legendary Creatures › A Legendary Creature’s Lair › Lair Actions")).toContain("On initiative count 20 (losing all initiative ties)");
        expect(text("Monsters › Half-Dragon Template")).toContain("| Huge | As a young dragon | Challenge 7 or higher |");
        expect(text("Appendix PH-B: Fantasy-Historical Pantheons › The Norse Pantheon › Norse Deities")).toContain("| Thor, god of storms and thunder | CG | Tempest, War | Hammer |");
    });

    it("keeps the 319 spells of the SRD 5.1, with their header as fields and the classes whose spell list names them", () => {
        const pages = loadWorld(folder).pages;
        const spells = pages.filter((page) => page.fields.category === "spell");
        const page = (name: string) => spells.find((spell) => spell.name === name);
        const classes = pages.filter((other) => other.fields.category === "class").map((other) => other.name);
        expect(spells).toHaveLength(319);
        // SRD 5.1, p. 144 (Fireball), p. 179 (Shield, the name of an item too), p. 143 (Find Familiar, a ritual), p. 114 (Alter Self), p. 139 (Eldritch Blast), pp. 185–186 (Teleport).
        expect(page("Fireball")?.fields).toEqual({
            category: "spell",
            "spell-level": 3,
            school: "evocation",
            "casting-time": "1 action",
            range: "150 feet",
            components: "V, S, M (a tiny ball of bat guano and sulfur)",
            duration: "Instantaneous",
            "spell-lists": ["Sorcerer", "Wizard"],
        });
        expect(page("Shield (spell)")?.fields).toMatchObject({
            aliases: ["Shield spell"],
            "spell-level": 1,
            school: "abjuration",
            "casting-time": "1 reaction, which you take when you are hit by an attack or targeted by the magic missile spell",
            duration: "1 round",
        });
        expect(page("Find Familiar")?.fields).toMatchObject({ ritual: true, "casting-time": "1 hour", "spell-lists": ["Wizard"] });
        expect(page("Alter Self")?.fields).toMatchObject({ duration: "Concentration, up to 1 hour", concentration: true, "spell-lists": ["Sorcerer", "Wizard"] });
        expect(page("Eldritch Blast")?.fields).toMatchObject({ "spell-level": 0, school: "evocation", "spell-lists": ["Warlock"] });
        expect(page("Teleport")?.body).toContain("| False destination | 01–50 | 51–100 | — | — |");
        expect(spells.filter((spell) => listItems(spell.fields["spell-lists"]).length === 0).map((spell) => spell.name)).toEqual([]);
        expect(spells.flatMap((spell) => listItems(spell.fields["spell-lists"]).map((item) => item.name)).filter((name) => !classes.includes(name))).toEqual([]);
    });

    it("gives each class a table of twenty levels whose features are its sections, and each subclass its class and its features by level (D-219)", () => {
        const pages = loadWorld(folder).pages;
        const classes = pages.filter((page) => page.fields.category === "class");
        const subclasses = pages.filter((page) => page.fields.category === "subclass");
        expect(classes).toHaveLength(12);
        expect(subclasses).toHaveLength(12);

        for (const page of classes) {
            const table = levelTable(page.body, "Features");
            const titles = sectionTitles(page.body).map((title) => title.toLowerCase());
            expect([...(table?.rows.keys() ?? [])], page.name).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
            // Every entry of the column is a feature, or says what the subclass gives or what improves (PRO-3).
            const all = gainedFeatures(table!, "Features", 20, (name) => name).map((feature) => featureParts(feature.name).name);
            const others = all.filter((name) => !titles.includes(name.toLowerCase()) && !titles.includes(`${name.toLowerCase()}s`));
            expect(others.filter((name) => !/ (feature|improvements?)$/.test(name)), page.name).toEqual([]);
        }

        for (const page of subclasses) {
            const owner = listItems(page.fields.class)[0]?.name;
            expect(classes.map((other) => other.name), page.name).toContain(owner);
            const features = levelledFeatures(listItems(page.fields.features).map((item) => `${item.name} ${item.number ?? ""}`.trim()));
            expect(features.every((feature) => feature !== undefined && feature.level >= 1 && feature.level <= 20), page.name).toBe(true);
            expect(features.map((feature) => feature?.name).filter((name) => !sectionTitles(page.body).includes(name ?? "")), page.name).toEqual([]);
        }
    });
});
