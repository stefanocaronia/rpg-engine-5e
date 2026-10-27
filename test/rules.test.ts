// The rules command on the 5e's chapters (MECCANICHE, RUL-2, RUL-6–RUL-8), in a campaign played in Italian: a section by its title or its path, cut when too
// long, the system's own names in Italian, a page or a section of pages by the name searched, the house rules and the precedents beside it.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestCampaign } from "rpg-engine/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fifthEdition, repository } from "./support.ts";

describe("the rules command (RUL-2, RUL-6, RUL-7)", () => {
    let campaign: TestCampaign;
    let folder: string;

    beforeEach(async () => {
        campaign = await fifthEdition({ language: "it", play: false });
        folder = campaign.folder;
    });

    afterEach(() => campaign.close());

    async function ok(...args: string[]): Promise<string>
    {
        const result = await campaign.run(...args);
        expect(result.exitCode, result.output).toBe(0);
        return result.output;
    }

    function sectionOf(file: string, heading: string, next: string): string
    {
        // As the engine reads it, whatever ends its lines.
        const text = readFileSync(join(repository, "rules", `${file}.md`), "utf8").replaceAll("\r\n", "\n");
        return text.slice(text.indexOf(heading), text.indexOf(next)).trimEnd();
    }

    it("searches the system by its own names too, as its words in the campaign's language give them (RUL-8)", async () => {
        const output = await ok("rules", "afferrato");
        expect(output).toMatch(/^5e searched by its own names too: Grappled\.\n\n/);
        expect(output).toContain("Conditions › Grappled (5e)");
        // A word the list lacks finds nothing in the system, which says how to search it.
        expect(await ok("rules", "lotta")).toContain("The system 5e writes its rules in English");
        // Never by a field's id, as cha for Carisma, which finds Chain Shirt; nor a name the search already says.
        expect(await ok("rules", "prova di carisma")).not.toContain("searched by its own names too");
        expect(await ok("rules", "goblin")).not.toContain("searched by its own names too");
        // Nor by the words a foe's hits are heard in, which name no rule: a terra is no down.
        expect(await ok("rules", "a terra")).not.toMatch(/searched by its own names too: .*\bdown\b/);
    });

    it("gives the exact text of the system's rule, with its path, and names the other sections found", async () => {
        const output = await ok("rules", "grappled");
        expect(output).toContain("Appendix PH-A: Conditions › Grappled (5e):\n" + sectionOf("Conditions", "## Grappled", "## Incapacitated"));
        expect(output).toContain("Also: Combat › Making an Attack › Melee Attacks › Grappling");
        expect(output).not.toMatch(/Precedents|House rules|not installed|more\)|Its parts|No rule matches|disagree|also a page/);
    });

    it("cuts a section too long to its own text and names its parts", async () => {
        const output = await ok("rules", "Combat");
        expect(output.startsWith("Combat (5e):\n# Combat\n(Its parts: The Order of Combat; Movement and Position; Actions in Combat;")).toBe(true);
    });

    it("gives the system's rules the words the house rules leave, and always shows the first of them", async () => {
        mkdirSync(join(folder, "rules"));
        writeFileSync(join(folder, "rules", "Lotta.md"), `# Lotta\n\nGrappling al nostro tavolo. ${"parola ".repeat(790)}\n`);
        const output = await ok("rules", "grappling");
        expect(output.startsWith("Lotta (house rule):\n# Lotta")).toBe(true);
        expect(output).toContain("Combat › Making an Attack › Melee Attacks › Grappling (5e):\n#### Grappling");
        expect(output).toContain("(Its parts: Escaping a Grapple; Moving a Grappled Creature. Read one by its heading.)");
    });

    it("says first when a page of the system or of the campaign has the name searched, by its name or an alias, and adds little of the rules (D-195)", async () => {
        const potion = await ok("rules", "Potion of Healing");
        expect(potion.startsWith("Potion of Healing is a page of the system 5e (item): show Potion of Healing reads it. What the rules say of it:")).toBe(true);
        expect(potion.length).toBeLessThan(2500);
        await ok("write", "Lanterna", "--type", "item", "--text", "Fa luce.");
        expect(await ok("rules", "lanterna")).toContain("Lanterna is a page of the campaign (item): show Lanterna reads it.");
        expect(await ok("rules", "Shield spell")).toContain("Shield (spell) is a page of the system 5e (topic): show Shield (spell) reads it.");
        expect(await ok("rules", "grappled")).not.toContain("is a page");
    });

    it("says first where a section of pages is, as a class's features, by its title alone or after its page's name (RUL-6)", async () => {
        const domain = await ok("rules", "Domain Spells");
        expect(domain.startsWith("Domain Spells is a section of Cleric, a page of the system 5e (topic): show Cleric#Domain Spells reads it. What the rules say of it:")).toBe(true);
        expect(domain.length).toBeLessThan(2500);
        expect(await ok("rules", "Cleric › Class Features")).toContain("Class Features is a section of Cleric, a page of the system 5e (topic): show Cleric#Class Features reads it.");
        expect(await ok("rules", "Channel Divinity")).toContain("Channel Divinity is a section of several pages: show Cleric#Channel Divinity; show Oath of Devotion#Channel Divinity; show Paladin#Channel Divinity.");
        await ok("write", "Pozzo", "--type", "place", "--section", "La corda", "--text", "Regge un uomo solo.");
        expect(await ok("rules", "la corda")).toContain("La corda is a section of Pozzo, a page of the campaign (place): show Pozzo#La corda reads it.");
        expect(await ok("rules", "Combat › Grappling")).not.toContain("is a section of");
    });

    it("reads a section named by its headings, with its parts", async () => {
        const output = await ok("rules", "Combat › Grappling");
        expect(output).toContain("***Escaping a Grapple.***");
        expect(output.startsWith("Combat › Making an Attack › Melee Attacks › Grappling (5e):\n#### Grappling")).toBe(true);
    });

    it("says when nothing matches: the language of the book, its chapters and how to record a precedent", async () => {
        const output = await ok("rules", "flanking");
        expect(output).toContain('No rule matches "flanking". The system 5e writes its rules in English');
        expect(output).toContain(
            "The chapters of 5e: Adventuring, Beyond 1st Level, Combat, Conditions, Diseases, Equipment, Fantasy-Historical Pantheons, Madness, Magic Items, Monsters, "
                + "Nonplayer Characters, Objects, Poisons, Races, Spellcasting, The Planes of Existence, Traps, Using Ability Scores.",
        );
        expect(output).toContain('config, setting precedents, add "<the rule\'s name in English>: what you said"');
    });

    it("reads a precedent or an agreement written by hand without quotes as text, and keeps reading when another setting breaks campaign.yaml", async () => {
        const settings = readFileSync(join(folder, "campaign.yaml"), "utf8");
        // An empty item written by hand is left out, never a reason to stop: the master could not fix it.
        writeFileSync(join(folder, "campaign.yaml"), `${settings}precedents:\n  - Poisoned: la benda bagnata dà vantaggio contro il gas.\n  - ""\ntable: [Prima dei tiri: dico la posta]\n`);
        expect(await ok("rules", "poisoned")).toContain("Precedents: Poisoned: la benda bagnata dà vantaggio contro il gas.");
        expect(await ok("status")).toContain("Table: Prima dei tiri: dico la posta");
        await ok("config", "precedents", "--add", "Flanking: due alleati ai lati.");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toContain('- "Poisoned: la benda bagnata dà vantaggio contro il gas."');
        writeFileSync(join(folder, "campaign.yaml"), `${readFileSync(join(folder, "campaign.yaml"), "utf8")}lines: [ragni\n`);
        expect(await ok("rules", "flanking")).toContain("Precedents: Flanking: due alleati ai lati.");
    });

    it("names the house rules by the title each file opens with, reads them in folders, and takes a file named rules for none", async () => {
        mkdirSync(join(folder, "rules", "combattimento"), { recursive: true });
        writeFileSync(join(folder, "rules", "Varianti.MD"), "# Colpi critici\n\nUn 20 naturale raddoppia tutti i dadi.\n");
        writeFileSync(join(folder, "rules", "combattimento", "Lotta.md"), "La lotta si fa con Atletica.\n");
        expect(await ok("status")).toContain("House rules (rules): Colpi critici, Lotta");
        expect(await ok("rules", "Colpi critici")).toContain("Colpi critici (house rule):\n# Colpi critici");
        expect(await ok("rules", "lotta")).toContain("Lotta (house rule):\nLa lotta si fa con Atletica.");
        rmSync(join(folder, "rules"), { recursive: true });
        writeFileSync(join(folder, "rules"), "not a folder");
        expect(await ok("status")).not.toContain("House rules");
        expect(await ok("rules", "grappled")).toContain("Appendix PH-A: Conditions › Grappled (5e)");
    });

    it("finds the tables of the system by their caption, with their rows", async () => {
        const output = await ok("rules", "Weapons");
        expect(output).toContain("Equipment › Weapons › Weapon Properties › Special Weapons › Weapons (5e):\n**Weapons**\n\n| Name | Cost | Damage | Weight | Properties |");
        expect(output).toContain("| Dagger | 2 gp | 1d4 piercing | 1 lb. | Finesse, light, thrown (range 20/60) |");
        expect(await ok("rules", "dagger")).toContain("Dagger is a page of the system 5e (item): show Dagger reads it.");
    });

    it("names no language when the campaign plays in the system's own", async () => {
        writeFileSync(join(folder, "campaign.yaml"), readFileSync(join(folder, "campaign.yaml"), "utf8").replace("language: it", "language: en-GB"));
        expect(await ok("rules", "flanking")).toContain('No rule matches "flanking". Search with the book\'s words, such as a condition, an action or a heading. The chapters of 5e:');
        expect(await ok("rules")).toContain("The rules of the system 5e, by chapter:");
        expect(await ok("find", "zzz")).toContain("find looks for the pages of the system 5e in their names and fields.");
    });

    it("lists the chapters with their sections without a text", async () => {
        const output = await ok("rules");
        expect(output).toContain("The rules of the system 5e, in English, by chapter:");
        expect(output).toContain("Adventuring: Time, Movement, The Environment, Resting, Between Adventures");
    });

    it("finds a precedent written in Italian by the name of its rule, beside that rule, and status shows it at every session (RUL-7)", async () => {
        await ok("config", "precedents", "--add", "Poisoned: la benda bagnata sulla bocca dà vantaggio contro il gas.");
        const beside = await ok("rules", "poisoned");
        expect(beside).toContain("Appendix PH-A: Conditions › Poisoned (5e)");
        expect(beside).toContain("Precedents: Poisoned: la benda bagnata sulla bocca dà vantaggio contro il gas.");
        expect(beside).toContain("When the text and a precedent disagree, tell the player and ask whether to keep the precedent: if so, write it again saying it is a house rule, against the book; if not, remove it. Both with config.");
        expect(await ok("rules", "poison gas")).toContain("Precedents: Poisoned: la benda");
        expect(await ok("rules", "grappled")).not.toContain("Precedents:");
        expect(await ok("status")).toContain("Precedents: Poisoned: la benda bagnata sulla bocca dà vantaggio contro il gas.");
    });

    it("shows a precedent whose rule the search names, or that names a section shown, and holds it when no text matches (RUL-7)", async () => {
        await ok("config", "precedents", "--add", "Flanking: due alleati ai lati danno vantaggio.", "--add", "Grappling: si afferra fino a due taglie in più.", "--add", "Senza nome di regola.");
        const flanking = await ok("rules", "flanking");
        expect(flanking).toContain('No text of the rules matches "flanking": the table\'s precedent below holds.');
        expect(flanking).toContain("Precedents: Flanking: due alleati ai lati danno vantaggio.");
        expect(flanking).not.toContain("config, setting precedents");
        expect(await ok("rules", "flanking rules")).toContain("Precedents: Flanking:");
        expect(await ok("rules", "Combat › Grappling")).toContain("Precedents: Grappling: si afferra fino a due taglie in più.");
        expect(await ok("rules", "senza")).toContain("Precedents: Senza nome di regola.");
    });

    it("reads the campaign's house rules first, and always names them, also in status (RUL-2)", async () => {
        mkdirSync(join(folder, "rules"));
        writeFileSync(join(folder, "rules", "Scasso.md"), "# Scasso\n\nUna serratura semplice si apre con una prova di Destrezza CD 12, come a Grappling.\n");
        const both = await ok("rules", "grappling");
        expect(both.indexOf("Scasso (house rule)")).toBe(0);
        expect(both).toContain("Combat › Making an Attack › Melee Attacks › Grappling (5e)");
        expect(await ok("rules", "lockpicking")).toContain("House rules of the campaign: Scasso.");
        expect(await ok("status")).toContain("House rules (rules): Scasso");
    });
});
