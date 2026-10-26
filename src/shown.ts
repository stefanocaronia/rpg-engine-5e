// What the 5e's widgets give its page module (D-510, D-516), and what a death save did, read from its card before and after the dice (DIE-4, D-461): the rule
// itself is the server code's, which writes the counters; the page only tells them.

/** Where one of the party at 0 hit points stands: dying, stable at the last success, dead at the last failure. */
export type DyingState = "dying" | "stable" | "dead";

/** What the widget on one at 0 gives its figure, the line of the heart. */
export interface DyingData
{
    state: DyingState;
}

/** What the card of a death save shows of who rolls it: their counters, whether still at 0 and whether dead, and what the save's faces do. */
export interface SaveData
{
    who: string;
    successes: { value: number; most: number; };
    failures: { value: number; most: number; };
    down: boolean;
    dead: boolean;
    sides: number;
    atLeast: number;
    lowest: number;
    highest: { field: string; value: number; };
}

/** What a death save did: a success, the last of them, one failure or more, the last of them, or the highest face that ends it all; the counters after it. */
export interface SaveOutcome
{
    kind: "success" | "stable" | "failure" | "failures" | "dead" | "back";
    successes: number;
    failures: number;
    /** How many failures it counts, two on the lowest face. */
    count: number;
}

/**
 * The outcome of a death save from its card before and after the dice (DIE-4): dead, back above 0, failures added, the last of them dead, or a success, the
 * last of them stable; none when it changed nothing, as when the server's code did not run.
 */
export function saveOutcome(before: SaveData, after: SaveData): SaveOutcome | undefined
{
    const [successes, failures] = [after.successes.value, after.failures.value];

    if (after.dead) {
        return { kind: "dead", successes, failures: after.failures.most, count: Math.max(after.failures.most - before.failures.value, 1) };
    }

    if (!after.down) {
        return { kind: "back", successes: 0, failures: 0, count: 0 };
    }

    if (failures > before.failures.value) {
        const count = failures - before.failures.value;
        return { kind: count > 1 ? "failures" : "failure", successes, failures, count };
    }

    if (successes > before.successes.value) {
        return { kind: successes >= after.successes.most ? "stable" : "success", successes, failures, count: 0 };
    }

    return undefined;
}
