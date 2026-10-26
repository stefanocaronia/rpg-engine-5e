// The death save on the page (D-461): its outcome read from the card of the 5e's death save before and after the dice, what its code wrote (DIE-4), never
// worked out by the page.
import { describe, expect, it } from "vitest";
import { type SaveData, saveOutcome } from "../src/shown.ts";

/** The card of Ettore's death save, with these counters, still at 0 and alive unless told otherwise. */
function card(successes: number, failures: number, more: Partial<SaveData> = {}): SaveData
{
    return {
        who: "Ettore",
        successes: { value: successes, most: 3 },
        failures: { value: failures, most: 3 },
        down: true,
        dead: failures >= 3,
        sides: 20,
        atLeast: 10,
        lowest: 2,
        highest: { field: "hp", value: 1 },
        ...more,
    };
}

describe("the outcome of a death save (D-461)", () => {
    it("tells a success, a failure and two failures by what the counters gained", () => {
        expect(saveOutcome(card(1, 1), card(2, 1))).toEqual({ kind: "success", successes: 2, failures: 1, count: 0 });
        expect(saveOutcome(card(1, 1), card(1, 2))).toEqual({ kind: "failure", successes: 1, failures: 2, count: 1 });
        expect(saveOutcome(card(1, 0), card(1, 2))).toEqual({ kind: "failures", successes: 1, failures: 2, count: 2 });
    });

    it("is stable at the last success, its failures gone, and dead at the last failure or once the page says dead", () => {
        expect(saveOutcome(card(2, 1), card(3, 0))).toEqual({ kind: "stable", successes: 3, failures: 0, count: 0 });
        expect(saveOutcome(card(1, 1), card(1, 3))).toEqual({ kind: "dead", successes: 1, failures: 3, count: 2 });
        expect(saveOutcome(card(1, 2), card(1, 3))).toMatchObject({ kind: "dead", count: 1 });
        expect(saveOutcome(card(1, 1), card(1, 1, { dead: true }))).toMatchObject({ kind: "dead", failures: 3 });
    });

    it("is back once no longer at 0, and nothing when the roll changed nothing, as when the 5e's code did not run", () => {
        expect(saveOutcome(card(1, 1), card(0, 0, { down: false }))).toEqual({ kind: "back", successes: 0, failures: 0, count: 0 });
        expect(saveOutcome(card(1, 1), card(1, 1))).toBeUndefined();
    });
});
