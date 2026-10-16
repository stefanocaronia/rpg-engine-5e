// Situations of the 5e (D-449): characters built as the master writes them, and the numbers their sheet works out, against the rules. Each case in
// situations.yaml names its source; a case that fails is a gap of the engine or of the system's data.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { runCommandLine } from "../../../src/command-line.ts";
import type { Context } from "../../../src/core/context.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "../../../test/support.ts";

interface Situation
{
    id: string;
    title: string;
    source: string;
    rigor?: string;
    write: Record<string, string | number>;
    add?: Record<string, string[]>;
    effects?: { name: string; set?: Record<string, string | number>; }[];
    change?: Record<string, number>;
    expect: Record<string, string>;
}

const situations = parse(readFileSync(join(import.meta.dirname, "situations.yaml"), "utf8")) as Situation[];
let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Prova", "--language", "en", "--system", "5e", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("config", "units", "imperial");
});

afterEach(() => removeFolder(folder));

describe("situations of the 5e, against the rules", () => {
    it.each(situations.map((situation) => [`${situation.id}: ${situation.title} (${situation.source})`, situation] as const))("%s", async (_name, situation) => {
        if (situation.rigor !== undefined) {
            await ok("config", "rigor", situation.rigor);
        }

        const written = Object.entries({ role: "pc", ...situation.write }).flatMap(([field, value]) => ["--set", `${field}=${String(value)}`]);
        await ok("write", "Hero", "--type", "character", ...written);

        for (const [field, items] of Object.entries(situation.add ?? {})) {
            for (const item of items) {
                await ok("write", "Hero", "--add", `${field}=${item}`);
            }
        }

        for (const [field, to] of Object.entries(situation.change ?? {})) {
            await ok("change", "Hero", field, "--to", String(to));
        }

        for (const effect of situation.effects ?? []) {
            await ok("effect", "add", "Hero", effect.name, ...Object.entries(effect.set ?? {}).flatMap(([field, value]) => ["--set", `${field}=${String(value)}`]));
        }

        // Only what differs, as "field: shown, expected": a failure reads at a glance.
        const shown = await sheetValues();
        const wrong = Object.entries(situation.expect).filter(([field, value]) => shown.get(field) !== String(value)).map(([field, value]) => `${field}: ${shown.get(field) ?? "none"}, expected ${String(value)}`);
        expect(wrong).toEqual([]);
    });
});

/** Every value of the hero's sheet by its field, as the dashboard's data gives it, and what show works out besides. */
async function sheetValues(): Promise<Map<string, string>>
{
    const values = new Map<string, string>();
    type Value = { field: string; text: string; beside?: string; besideField?: string; };
    const sheet = JSON.parse(await ok("view", "Hero", "--json")).sheet as { values: Value[]; items?: { name: string; values: Value[]; }[]; }[] | undefined;

    // The rows of a list, as the attacks: by the item's name, "Unarmed Strike#attack", and by the field alone for the first row that has it.
    for (const item of (sheet ?? []).flatMap((group) => group.items ?? [])) {
        for (const value of item.values) {
            values.set(`${item.name}#${value.field}`, value.text);

            if (!values.has(value.field)) {
                values.set(value.field, value.text);
            }
        }
    }

    for (const value of (sheet ?? []).flatMap((group) => group.values)) {
        values.set(value.field, value.text);

        // What the sheet shows beside a value, as str-mod +4 by str 19.
        if (value.besideField !== undefined && value.beside !== undefined) {
            values.set(value.besideField, value.beside);
        }
    }

    // What the sheet does not show by itself, as the uses of a class, from show's lines: "rages 3/3", "slots-1 4/4".
    for (const match of (await ok("show", "Hero")).matchAll(/(?:^|[\s·:])([a-z][a-z0-9-]*) ([+-]?\d+(?:\.\d+)?(?:\/\d+)?(?: ft)?)(?=[\s·,(]|$)/gm)) {
        if (!values.has(match[1])) {
            values.set(match[1], match[2]);
        }
    }

    return values;
}

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
