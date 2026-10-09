// The 5e system's own tests (D-172): what it takes from the SRD 5.1 and how it says so. They go with the package, and npm does not publish them.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withWorkedOut } from "../../../src/commands/worked-out.ts";
import { listItems } from "../../../src/core/formula.ts";
import { loadWorld, readSection, sectionTitles } from "../../../src/pages/index.ts";
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

    it("gives every creature an icon of game-icons.net, and credits it in its license (D-267)", () => {
        const pages = loadWorld(folder).pages.filter((page) => page.type === "creature");
        expect(pages.filter((page) => !/^\[\[[a-z0-9-]+\.svg\]\]$/.test(String(page.fields.image))).map((page) => page.name)).toEqual([]);
        expect(readFileSync(join(folder, "LICENSE.md"), "utf8")).toMatch(/The icons in `images\/` are from game-icons\.net \(https:\/\/game-icons\.net\), under the Creative Commons Attribution 3\.0 Unported License/);
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
        const equipment = pages.filter((page) => /^((light|medium|heavy) armor|shield|(simple|martial) (melee|ranged) weapon)$/.test(String(page.fields.category)));
        expect(equipment.length).toBe(50);
        expect(fields("Longsword")).toMatchObject({ cost: "15 gp", damage: "1d8 slashing", weight: "3 lb", properties: ["versatile (1d10)"] });
        expect(fields("Healer's Kit")).toMatchObject({ uses: "10/10" });
    });

    it("keeps the SRD 5.1's gear, packs, tools, tack and vehicles, with the columns of their table as fields and their description as text (pp. 66–74)", () => {
        const pages = loadWorld(folder).pages;
        const page = (name: string) => pages.find((other) => other.name === name);
        const items = pages.filter((other) => other.type === "item");
        // Beside the 50 arms and armor, the unarmed strike (D-235) and the 240 magic items, 159 pages of gear: the rest of the Equipment chapter but its mounts,
        // which are creatures at the table, its trade goods, expenses and stabling.
        expect([items.length, items.filter((item) => item.fields.rarity !== undefined).length]).toEqual([450, 240]);
        expect(items.find((item) => item.name === "Riding Horse")).toBeUndefined();
        // SRD 5.1, pp. 68–69 (the Adventuring Gear table and descriptions), p. 70 (packs and tools), p. 71 (tool descriptions), pp. 71–72 (mounts and vehicles).
        expect(page("Bullseye Lantern")?.fields).toEqual({ aliases: ["Lantern, bullseye"], category: "adventuring gear", cost: "10 gp", weight: "2 lb" });
        expect(page("Bullseye Lantern")?.body).toContain("A bullseye lantern casts bright light in a 60-foot cone");
        expect(page("Silk Rope")?.fields).toMatchObject({ aliases: ["Rope, silk (50 feet)"], cost: "10 gp", weight: "5 lb", length: "50 feet" });
        expect(page("Crystal")?.fields).toEqual({ category: "arcane focus", cost: "10 gp", weight: "1 lb" });
        expect(page("Crystal")?.body).toContain("An arcane focus is a special item");
        expect(page("Burglar's Pack")?.fields).toEqual({ category: "equipment pack", cost: "16 gp" });
        expect(page("Burglar's Pack")?.body).toContain("a bag of 1,000 ball bearings");
        expect(page("Alchemist's Supplies")?.fields).toEqual({ category: "artisan's tools", cost: "50 gp", weight: "8 lb" });
        // The PDF indents the disguise kit under Artisan's tools, but its description is its own (p. 71).
        expect(page("Disguise Kit")?.fields).toEqual({ category: "tool", cost: "25 gp", weight: "3 lb" });
        expect(page("Thieves' Tools")?.body).toContain("a set of lock picks");
        expect(page("Exotic Saddle")?.fields).toEqual({ category: "saddle", cost: "60 gp", weight: "40 lb" });
        expect(page("Galley")?.fields).toEqual({ category: "waterborne vehicle", cost: "30,000 gp", speed: "6 km/h" });
    });

    it("keeps the 240 magic items of the SRD 5.1, with their type line as fields and the SRD's text alone, without ours (pp. 206–253, D-170)", () => {
        const pages = loadWorld(folder).pages;
        const page = (name: string) => pages.find((other) => other.name === name);
        // SRD 5.1, p. 225 (Holy Avenger), p. 237 (Ring of Shooting Stars), p. 220 (Dwarven Plate), p. 207 (Ammunition), p. 246 (Stone of Good Luck), p. 252 (the Orb).
        expect(page("Holy Avenger")?.fields).toEqual({ category: "weapon (any sword)", rarity: "legendary", attunement: "by a paladin" });
        expect(page("Ring of Shooting Stars")?.fields).toEqual({ category: "ring", rarity: "very rare", attunement: "outdoors at night" });
        expect(page("Dwarven Plate")?.fields).toEqual({ category: "armor (plate)", rarity: "very rare" });
        expect(page("Dwarven Plate")?.body).toContain("While wearing this armor, you gain a +2 bonus to AC.");
        expect(page("Ammunition, +1, +2, or +3")?.fields.rarity).toBe("uncommon (+1), rare (+2), or very rare (+3)");
        expect(page("Stone of Good Luck")?.fields).toEqual({ aliases: ["Stone of Good Luck (Luckstone)"], category: "wondrous item", rarity: "uncommon", attunement: true });
        expect(page("Orb of Dragonkind")?.fields).toMatchObject({ rarity: "artifact", attunement: true });
        // p. 234, with the price, the weight and the sentence on drinking it of the adventuring gear entry (pp. 68–69), after the magic item's text; the table of
        // p. 208, which runs on in the next column; the stat block of p. 218, a quotation that ends before the next card.
        expect(page("Potion of Healing")?.fields).toEqual({ category: "potion", rarity: "varies", cost: "50 gp (common)", weight: "1/2 lb" });
        expect(page("Potion of Healing")?.body).toContain("glimmers when agitated.\n\n**Potions of Healing**");
        expect(page("Potion of Healing")?.body).toContain("| Supreme healing | Very rare | 10d4 + 20 |\n\nDrinking or administering a potion takes an action.");
        expect(page("Apparatus of the Crab")?.body).toContain("| 10 | The rear hatch unseals and opens. | The rear hatch closes and seals. |");
        expect(page("Deck of Many Things")?.body).toContain("> **Avatar of Death**\n>\n> *Medium undead, neutral evil*\n>\n> **Armor Class** 20");
        expect(page("Deck of Many Things")?.body).toContain("plus 4 (1d8) necrotic damage.\n\n***Star.***");
        // The SRD's text only: no section of ours, such as how a magic weapon of the campaign is written, which the sheet's note on the attacks says.
        const magic = pages.filter((other) => other.fields.rarity !== undefined);
        expect(magic.filter((item) => sectionTitles(item.body).length > 0).map((item) => item.name)).toEqual([]);
    });

    it("keeps the text of the SRD 5.1 in eighteen chapters of rules, as these parts of it show (D-177)", () => {
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
            "Magic Items",
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
        // SRD 5.1, p. 69 (the Adventuring Gear table), p. 72 (the mounts, in the rules alone), p. 70 (the Equipment Packs sidebar), p. 206 (Attunement), p. 252 (Conflict).
        expect(text("Equipment › Adventuring Gear › Adventuring Gear")).toContain("| Spyglass | 1,000 gp | 1 lb. |");
        expect(text("Equipment › Mounts and Vehicles › Mounts and Other Animals")).toContain("| Horse, riding | 75 gp | 60 ft. | 480 lb. |");
        expect(text("Equipment › Adventuring Gear › Equipment Packs")).toContain("***Burglar’s Pack (16 gp).*** Includes a backpack");
        expect(text("Magic Items › Attunement")).toContain("a creature can be attuned to no more than three magic items at a time");
        expect(text("Magic Items › Sentient Magic Items › Conflict")).toContain("with a DC equal to 12 + the item’s Charisma modifier");
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

    it("keeps the 317 stat blocks of the SRD 5.1, their header as fields and each trait and action a section, with the SRD's italics", () => {
        const creatures = loadWorld(folder).pages.filter((page) => page.fields.cr !== undefined);
        const page = (name: string) => creatures.find((creature) => creature.name === name);
        const body = (name: string): string => page(name)?.body ?? "";
        expect(creatures).toHaveLength(317);
        // SRD 5.1, p. 261 (Aboleth), p. 286 (Ancient Red Dragon), p. 326 (Werebear), pp. 395–396 (Archmage).
        expect(page("Aboleth")?.fields).toEqual({
            size: "Large",
            category: "aberration",
            alignment: "lawful evil",
            ac: 17,
            armor: "natural armor",
            hp: "135/135",
            "hp-dice": "18d10 + 36",
            speed: "10 ft",
            swim: "40 ft",
            str: 21,
            dex: 9,
            con: 15,
            int: 18,
            wis: 15,
            cha: 18,
            saves: ["Con +6", "Int +8", "Wis +6"],
            skills: ["History +12", "Perception +10"],
            darkvision: "120 ft",
            "passive-perception": 20,
            languages: ["Deep Speech", "telepathy 120 ft"],
            cr: "10",
            "xp-value": 5900,
            image: "[[fish-monster.svg]]",
        });
        expect(sectionTitles(body("Aboleth"))).toEqual([
            "Traits",
            "Amphibious",
            "Mucous Cloud",
            "Probing Telepathy",
            "Actions",
            "Multiattack",
            "Tentacle",
            "Tail",
            "Enslave (3/Day)",
            "Legendary Actions",
            "Detect",
            "Tail Swipe",
            "Psychic Drain (Costs 2 Actions)",
        ]);
        expect(readSection(body("Aboleth"), "Tentacle")).toContain("*Melee Weapon Attack:* +9 to hit, reach 10 ft., one target. *Hit:* 12 (2d6 + 5) bludgeoning damage.");
        expect(readSection(body("Aboleth"), "Tentacle")).toContain("removed only by *heal* or another disease-curing spell");
        expect(page("Ancient Red Dragon")?.fields).toMatchObject({
            size: "Gargantuan",
            ac: 22,
            hp: "546/546",
            "hp-dice": "28d20 + 252",
            speed: "40 ft",
            climb: "40 ft",
            fly: "80 ft",
            str: 30,
            saves: ["Dex +7", "Con +16", "Wis +9", "Cha +13"],
            blindsight: "60 ft",
            darkvision: "120 ft",
            "passive-perception": 26,
            cr: "24",
            "xp-value": 62000,
        });
        expect(page("Werebear")?.fields).toMatchObject({
            ac: 10,
            armor: "in humanoid form, 11 (natural armor) in bear and hybrid form",
            speed: "30 ft (40 ft, climb 30 ft in bear or hybrid form)",
            "damage-immunities": ["bludgeoning, piercing, and slashing from nonmagical attacks not made with silvered weapons"],
            languages: ["Common (can’t speak in bear form)"],
        });
        expect(page("Archmage")?.fields).toMatchObject({
            armor: "15 with mage armor",
            "damage-resistances": ["damage from spells", "nonmagical bludgeoning, piercing, and slashing (from stoneskin)"],
            "slots-1": "4/4",
            "slots-9": "1/1",
        });
        expect(readSection(body("Archmage"), "Spellcasting")).toContain("- 9th level (1 slot): *time stop*\n\n\\**The archmage casts these spells on itself before combat.*");
        // Names in natural order, and those a page of another kind has or a file cannot hold, with the SRD's as an alias (pp. 307, 315, 398, 349, 351).
        expect(page("Drow Elf")?.fields.aliases).toEqual(["Elf, Drow"]);
        expect(page("Deep Gnome (Svirfneblin)")?.fields.aliases).toEqual(["Gnome, Deep (Svirfneblin)"]);
        expect(page("Druid (creature)")?.fields.aliases).toEqual(["Druid creature"]);
        expect(page("Succubus-Incubus")?.fields.aliases).toEqual(["Succubus/Incubus"]);
        expect(sectionTitles(body("Unicorn"))).toContain("Hooves (legendary action)");
        // A variant is a section of the creature it varies (pp. 378, 391); the Half-Dragon Template (pp. 320–321) is the rules'.
        expect(sectionTitles(body("Giant Rat"))).toContain("Variant: Diseased Giant Rats");
        expect(readSection(body("Swarm of Insects"), "Variant: Insect Swarms")).toContain("***Swarm of Wasps.*** A swarm of wasps has a walking speed of 5 feet");
        expect(sectionTitles(body("Half-Red Dragon Veteran"))).not.toContain("Half-Dragon Template");
        // A skill with a note keeps its total in the field and the note on the page (p. 344); an armor without its parentheses (p. 264).
        expect(page("Shadow")?.fields.skills).toEqual(["Stealth +4"]);
        expect(body("Shadow")).toMatch(/^\*\*Skills\*\* Stealth \+4 \(\+6 in dim light or darkness\)\n/);
        expect(page("Ankheg")?.fields.armor).toBe("natural armor, 11 while prone");
    });

    it("works out each creature's saving throws, skills and passive Perception as the totals of its stat block", () => {
        const system = findSystem(testSystemFolders, "5e")!;
        // A campaign with no pages of its own, which reads the system's pages with its formulas.
        const world = loadWorld(import.meta.dirname, { system });
        const creatures = (world.system?.pages ?? []).filter((page) => page.fields.cr !== undefined);
        const differences = creatures.flatMap((page) => {
            const worked = withWorkedOut(world, page.fields, false);
            const totals: [string, unknown][] = [
                ...listItems(page.fields.saves).map((item): [string, unknown] => [`${item.name.toLowerCase()}-save`, item.number]),
                ...listItems(page.fields.skills).map((item): [string, unknown] => [item.name.toLowerCase().replaceAll(" ", "-"), item.number]),
                ["passive-perception", page.fields["passive-perception"]],
            ];
            return totals.filter(([field, total]) => worked[field] !== total).map(([field, total]) => `${page.name}: ${field} ${String(worked[field])}, the stat block ${String(total)}`);
        });
        expect(creatures).toHaveLength(317);
        expect(differences).toEqual([]);
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
