// The hooks of a game system's code (D-448): called after the engine's own writes, the roll that made a change first in the log; one that fails, or code that
// is not loaded, is a line for the master and the change stands; the 5e's widgets give the dashboard its death saves (D-516).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CardAsked, Context, Player, TestCampaign } from "rpg-engine/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type SaveData, saveOutcome } from "../src/shown.ts";
import { fifthEdition, repository, withContext } from "./support.ts";

let campaign: TestCampaign;

beforeEach(async () => {
    campaign = await fifthEdition({ language: "it" });
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "hp=10/20");
});

afterEach(() => campaign.close());

describe("the hooks of a system's code (D-448)", () => {
    it("are this repository's code, built, which the engine loads for a campaign of the 5e", () => {
        const version = (JSON.parse(readFileSync(join(repository, "package.json"), "utf8")) as { version: string; }).version;
        expect(campaign.context.systemCode?.["5e"]).toMatchObject({ version });
        expect(campaign.context.systemCode?.["5e"]).toHaveProperty("code");
    });

    it("say a hook that fails, or code not loaded, in a line, the change made all the same", async () => {
        const failing: Partial<Context> = {
            systemCode: {
                "5e": {
                    code: {
                        counterChanged: () => {
                            throw new Error("broken: on purpose");
                        },
                    },
                },
            },
        };
        expect(await ok("change", "Ettore", "hp", "--by=-3", failing)).toContain(
            "Ettore: hp 10/20 → 7/20.\nThe game system 5e failed after this change: broken: on purpose. It is done all the same; meanwhile apply its rules yourself, as its pages say.",
        );
        expect(await ok("change", "Ettore", "hp", "--by=-1", { systemCode: {} })).toContain("The game system 5e's code is not loaded: start the MCP server again (/mcp in Claude Code)");
        expect(await ok("show", "Ettore")).toContain("hp 6/20");
    });

    it("keep the engine's own notes when the code is not loaded: the marks of the turn, what a roll's effects ask (review of 17 October)", async () => {
        const unloaded: Partial<Context> = { systemCode: {} };
        await ok("effect", "add", "Ettore", "Poisoned");
        expect(await ok("roll", "1d20+2", "--who", "Ettore", "--why", "Atletica", unloaded)).toMatch(/Ettore has Poisoned: if they change this roll[^\n]*\nThe game system 5e's code is not loaded/);
        await ok("scene", "open", "--title", "Al guado", "--type", "combat", "--with", "Ettore", "--creatures", "Wolf=1");
        await ok("scene", "order", "--order", "Wolf 1", "--order", "Ettore");
        const turn = await ok("scene", "next", unloaded);
        expect(turn).toContain("Mark with scene use what Ettore uses of the turn");
        expect(turn).toContain("The game system 5e's code is not loaded");
    });

    it("come after the roll that made a change, in the log (D-459)", async () => {
        await ok("change", "Ettore", "hp", "--to", "0");
        // At 0 the damage changes no hit points: the roll, then the failure the 5e's code writes.
        await ok("change", "Ettore", "hp", "--by=-(1d4)");
        const last = campaign.log().slice(-2).map((entry) => `${entry.type} ${String(entry.data.field ?? "")}`.trim());
        expect(last).toEqual(["roll", "counter-changed death-failures"]);
    });

    it("ask the death save in its card, forced, whose look before and after the dice tells its outcome, for every face and every count (D-460, D-461)", async () => {
        await ok("change", "Ettore", "hp", "--to", "0");

        for (const [successes, failures] of [[0, 0], [2, 0], [0, 2], [2, 2]]) {
            for (const face of [1, 9, 10, 19, 20]) {
                await ok("change", "Ettore", "hp", "--to", "0");
                await ok("change", "Ettore", "death-successes", "--to", String(successes));
                await ok("change", "Ettore", "death-failures", "--to", String(failures));
                await ok("effect", "end", "Ettore", "Stable").catch(() => "");
                const asking: { card?: CardAsked; forced?: true; labels?: string[]; before?: unknown; } = {};
                const page: Player = {
                    choose: async (_question, _title, labels, _signal, rows) => {
                        Object.assign(asking, { card: rows?.card, forced: rows?.forced, labels, before: await rows?.card?.shows() });
                        return 0;
                    },
                };
                await withContext(campaign, { page, random: () => face }, () => campaign.ask({ question: "Ettore", options: "Tiro contro la morte 1d20", who: "Ettore" }));
                const after = await asking.card?.shows() as { body: string; data: SaveData; };
                // The 5e's card, with no button to turn it down.
                expect([asking.card?.widget, after.body, asking.forced, asking.labels?.length]).toEqual(["5e.death-save", "death-save", true, 1]);
                const outcome = saveOutcome((asking.before as { data: SaveData; }).data, after.data);
                const lost = failures + (face === 1 ? 2 : 1);
                const expected = face === 20 ? "back" : face >= 10 ? (successes === 2 ? "stable" : "success") : lost >= 3 ? "dead" : face === 1 ? "failures" : "failure";
                expect(outcome?.kind, `${successes}/${failures}, face ${face}`).toBe(expected);
                // In the tint of the moment, before the dice and after (D-517).
                const tint = expected === "back" ? "gold" : expected === "stable" ? "ally" : expected === "dead" ? "muted" : "low";
                expect([(asking.before as { tint?: string; }).tint, (after as { tint?: string; }).tint], `${successes}/${failures}, face ${face}`).toEqual(["low", tint]);
            }
        }
    });

    it("give each of the party at 0 the word of their state and their death saves, as the dashboard draws them, dead at the last failure (D-516)", async () => {
        const dying = async () => (await campaign.widgets("5e")).find((widget) => widget.id === "5e.dying")?.people?.Ettore;
        expect(await dying()).toBeUndefined();
        await ok("change", "Ettore", "hp", "--to", "0");
        await ok("change", "Ettore", "death-successes", "--to", "1");
        expect(await dying()).toMatchObject({
            chip: "Morente",
            parts: [
                { track: { label: "Successi", value: 1, max: 3, tone: "good", stage: "start", field: "death-successes" } },
                { lead: "Morente", tone: "bad", figure: "heartbeat" },
                { track: { label: "Fallimenti", value: 0, max: 3, tone: "bad", stage: "end", field: "death-failures" } },
            ],
            data: { state: "dying" },
        });
        await ok("effect", "add", "Ettore", "Stable");
        expect(await dying()).toMatchObject({ chip: "Stabile", data: { state: "stable" } });
        await ok("change", "Ettore", "hp", "--by=-1");
        await ok("change", "Ettore", "death-failures", "--to", "3");
        expect(await dying()).toMatchObject({ chip: "Morte", dead: true, data: { state: "dead" } });
        // Marked dead, or back above 0, nothing.
        await ok("write", "Ettore", "--set", "status=dead");
        expect(await dying()).toBeUndefined();
    });

    it("ask the hit dice of a short rest in the 5e's card (ASK-14)", async () => {
        await ok("write", "Ettore", "--set", "classes=[[Cleric]] 3", "--set", "hit-dice-d8=2");
        let card: CardAsked | undefined;
        const page: Player = {
            choose: async () => undefined,
            spendDice: async (_question, _title, _done, _spending, _signal, given) => {
                card = given;
                return 0;
            },
        };
        await withContext(campaign, { page }, () => campaign.ask({ question: "Riposo breve", recipe: "short rest", who: "Ettore" }));
        expect(card?.widget).toBe("5e.hit-dice");
        expect(await card?.shows()).toMatchObject({ body: "hit-dice" });
    });

    it("keep the widgets of its cards to its cards: never read for the column, and no place for the campaign to give them (D-507)", async () => {
        expect((await campaign.widgets("5e")).find((widget) => widget.id === "5e.death-save")).toMatchObject({ place: "card" });
        expect((await campaign.widgets("5e")).find((widget) => widget.id === "5e.death-save")?.shows).toBeUndefined();
        const moved = await campaign.run("config", "widgets", "5e.death-save: side");
        expect(moved.output).toContain("5e.death-save shows only in the card its package asks a roll in, so it has no place to choose");
    });
});

async function ok(...args: (string | Partial<Context>)[]): Promise<string>
{
    const given = args.at(-1);
    const words = args.filter((arg): arg is string => typeof arg === "string");
    const result = await withContext(campaign, typeof given === "object" ? given : {}, () => campaign.run(...words));
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
