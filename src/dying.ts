// The dying point of the fifth edition (SRD 5.2.1 p. 98; DIE-1–DIE-6, D-454, D-460, D-463): at 0 hit points a party member falls Unconscious; damage there is
// a failure, two on a critical hit, and damage past 0 as large as the maximum kills at once; the death save at the start of each of its turns, the player's
// for their character, the engine's for the others; three successes, or Stable given, make it stable; hit points regained end it all, never for the dead.
// On the dashboard (D-511, D-516) its widgets: on each of the party at 0, their state and death saves; the cards a death save is asked in and the hit dice
// of a rest are spent in, which its page module draws (page.tsx).
import type { CounterChange, Game, GamePage, GameView, PackageCode, Rolled, Widget } from "rpg-engine";
import type { DyingData, DyingState, SaveData } from "./shown.ts";

// The game's numbers and names (p. 98), constants of its code: the sheet shows the same counters, as the system's data gives them to the dashboard.
const hp = "hp";
const unconscious = "Unconscious";
const stableEffect = "Stable";
const successes = { field: "death-successes", most: 3 };
const failures = { field: "death-failures", most: 3 };
const save = { dice: "1d20", sides: 20, atLeast: 10, highest: { field: hp, value: 1 }, lowest: 2 };
const rules = { instant: "Instant Death", saves: "Death Saving Throws" };
// The counters of the hit dice a rest spends, by the die of each class (p. 56).
const hitDice = "hit-dice-";
// The words of each state on the dashboard, translated by the 5e's words.
const stateWords: Record<DyingState, string> = { dying: "Dying", stable: "Stable", dead: "Dead" };

/** A roll made for someone, as the rolled hook gets it. */
type RollMade = Rolled & { who: string; };

/** The dying point's hooks and its widgets, and how its death saves and hit dice are asked on the dashboard. */
export const dyingCode: PackageCode = {
    counterChanged: (change, game) => afterHitPoints(change, game),
    turnStarted: ({ who }, game) => turnOf(who, game),
    rolled: (roll, game) => playersSave(roll, game),
    effectAdded: ({ page, effect }, game) => (game.sameName(effect, stableEffect) ? stabilized(page, game) : []),
    // A death save is asked in its card, with no button to turn it down (D-460); the hit dice of a rest in theirs (ASK-14).
    asking: ({ who, checks, notations, recipe }, game) =>
        recipe !== undefined
            ? checks.length > 0 && checks.every((field) => field.toLowerCase().startsWith(hitDice)) ? { card: { widget: "hit-dice", key: `${who} ${game.now()?.date ?? ""}` } } : undefined
            : saveAsking(who, notations, game),
    widgets: {
        "dying": (game, asked) => dyingWidget(game, asked?.who),
        "death-save": (game, asked) => (asked?.key === undefined ? undefined : saveWidget(game, asked.who)),
        "hit-dice": (_game, asked) => (asked?.key === undefined ? undefined : { body: "hit-dice", says: "Hit Dice" }),
    },
};

/** Whether a party member is dying now (DIE-4): at 0 hit points, neither stable by its successes nor dead by its failures. */
function isDying(page: GamePage | undefined): page is GamePage
{
    const counter = page?.counter(hp);
    return page !== undefined && page.party && counter !== undefined && counter.value <= 0 && counted(page, successes.field) < successes.most && counted(page, failures.field) < failures.most;
}

function counted(page: GamePage, field: string): number
{
    return page.counter(field)?.value ?? 0;
}

/**
 * What hit points changed on a party member bring (DIE-1–DIE-3, DIE-6): Unconscious at 0; a failure for damage there, all of them when what goes past is as
 * large as the maximum; the counters back to 0 and the conditions ended when they rise, never for the dead.
 */
function afterHitPoints(change: CounterChange, game: Game): string[]
{
    const page = game.page(change.page);

    if (page === undefined || !page.party || !game.sameName(change.field, hp)) {
        return [];
    }

    const name = page.name;
    const failed = counted(page, failures.field);

    // The dead, at their most failures, are not brought back by hit points: they go back to 0, and only what the rules say brings them back (DIE-7).
    if (change.after > 0 && change.before <= 0 && failed >= failures.most) {
        setCounters(game, name, { [hp]: 0 }, "the dead regain nothing");
        return [
            `${name} is dead, with ${failures.field} ${failed}: what this change gave is undone, ${hp} back to 0, as ${hp} regained brings no one back. To bring ${name} back as the rules say, as a spell does: `
            + `first change ${failures.field} to 0, then give the ${hp}.`,
        ];
    }

    // Above 0 again: the counters back to 0, the conditions ended (DIE-3).
    if (change.after > 0 && change.before <= 0) {
        return back(page, game);
    }

    // Nor do the dead take more failures, or die again (review of 17 October).
    if (change.after > 0 || failed >= failures.most) {
        return [];
    }

    const lines: string[] = [];
    const wasStable = counted(page, successes.field) >= successes.most;
    const past = change.lost - Math.max(change.before, 0);

    // Damage past 0 as large as the maximum kills at once (DIE-2), one stable too (DIE-6).
    if (change.lost > 0 && change.max !== undefined && past >= change.max) {
        setCounters(game, name, { [failures.field]: failures.most, ...(wasStable ? { [successes.field]: 0 } : {}) }, "instant death");
        const unstable = wasStable && game.endEffect(name, stableEffect, "instant death");
        lines.push(
            `${name} dies at once: ${past} past 0 is at least the maximum, ${change.max}; ${failures.field} ${failed} → ${failures.most}${unstable ? `, ${stableEffect} ended` : ""}. Read rules ${rules.instant}.`,
        );
    } else if (change.lost > 0 && change.before <= 0) {
        // Damage at 0 counts a failure (DIE-2); a critical hit counts two, which only the master knows. One stable is dying again (DIE-6).
        const after = Math.min(failed + 1, failures.most);
        setCounters(game, name, { [failures.field]: after, ...(wasStable ? { [successes.field]: 0 } : {}) }, `damage at 0 ${hp}`);
        const unstable = wasStable && game.endEffect(name, stableEffect, `damage at 0 ${hp}`);
        const dead = after >= failures.most;
        const again = wasStable
            ? ` ${name} is no longer stable: ${successes.field} ${successes.most} → 0${unstable ? `, ${stableEffect} ended` : ""}${dead ? "" : "; its death saves start again"}.`
            : "";
        const dies = dead ? ` ${name} dies: a moment of its own in the story.` : "";
        lines.push(`${failures.field} ${failed} → ${after}: damage at 0 ${hp}; a critical hit counts two, so add one more with change.${again}${dies}`);
    }

    // Reaching 0 brings Unconscious (DIE-1), and what that breaks of what one keeps.
    if (change.before > 0) {
        const notes = game.addEffect(name, unconscious, `0 ${hp}`);

        if (notes !== undefined) {
            lines.unshift(`${name} is ${unconscious} while ${hp} is 0.`, ...notes);
        }
    }

    return lines;
}

/** One back above 0 (DIE-3): its death saves back to 0, Unconscious and Stable ended. */
function back(page: GamePage, game: Game): string[]
{
    const name = page.name;
    const reset = [successes.field, failures.field].filter((field) => counted(page, field) !== 0);
    const was = Object.fromEntries(reset.map((field) => [field, counted(page, field)]));
    setCounters(game, name, Object.fromEntries(reset.map((field) => [field, 0])), `${hp} above 0`);
    const ended = game.endEffect(name, unconscious, "hit points regained");
    const stable = game.endEffect(name, stableEffect, "hit points regained");
    const parts = [...reset.map((field) => `${field} ${was[field]} → 0`), ...(ended ? [`${unconscious} ended`] : []), ...(stable ? [`${stableEffect} ended`] : [])];
    return parts.length === 0 ? [] : [`${name} is no longer dying: ${parts.join(", ")}.`];
}

/**
 * The start of a dying party member's turn (DIE-5, D-460): the player character's death save is the player's moment, rolled with a button; anyone else's is
 * rolled now and written, for the master to tell as the mentor setting asks.
 */
function turnOf(who: string, game: Game): string[]
{
    const page = game.page(who);

    if (!isDying(page)) {
        return [];
    }

    const read = ` Read rules ${rules.saves}.`;
    // The master set the counters by hand before Stable, which sets them itself (playtest 11).
    const stabilize = ` To stabilize ${page.name}, as Medicine or a spell does: effect add ${stableEffect}, which sets the death saves itself.`;

    if (page.pc) {
        return [`${page.name} is dying: the turn starts with their death save, the player's to roll: ask them, with ask, a check of ${save.dice}; the engine writes its outcome.${stabilize}${read}`];
    }

    const rolled = game.roll(save.dice, { who: page.name, why: "death save" });
    const lines = saved(page, { ...rolled, who: page.name }, game);
    const still = isDying(game.page(page.name)) ? stabilize : "";
    return [`${page.name} is dying: the engine rolled its death save, ${rolled.text}, so never roll it again. ${lines.join(" ")} ${tellingOf(game.setting("mentor"))}${still}${read}`];
}

/** The death save the player rolled for their character, with ask or roll (DIE-4); anyone else's is rolled as its turn starts (DIE-5). */
function playersSave(roll: RollMade, game: Game): string[]
{
    const page = game.page(roll.who);
    return page === undefined || !page.pc ? [] : saved(page, roll, game);
}

/**
 * A death save rolled for one dying (DIE-4, DIE-6): a total of at least 10 is a success, the third making it stable, its failures gone; less is a failure, two
 * on a 1; a 20 brings 1 hit point back, which ends the dying.
 */
function saved(page: GamePage, roll: RollMade, game: Game): string[]
{
    const natural = roll.dice.find((die) => die.sides === save.sides && die.dropped !== true)?.value;

    if (!isDying(page) || natural === undefined || !isSaveRoll(roll.notation)) {
        return [];
    }

    const name = page.name;

    if (natural === save.sides) {
        const own = page.counter(hp);
        setCounters(game, name, { [hp]: save.highest.value }, "death save");
        const shown = (value: number): string => `${value}${own?.max === undefined ? "" : `/${own.max}`}`;
        return [`${name}'s death save: ${natural}, the highest face: ${hp} ${shown(own?.value ?? 0)} → ${shown(save.highest.value)}.`, ...back(page, game)];
    }

    if (roll.total >= save.atLeast) {
        const before = counted(page, successes.field);
        const after = Math.min(before + 1, successes.most);
        const failed = counted(page, failures.field);
        const stable = after >= successes.most;
        setCounters(game, name, { [successes.field]: after, ...(stable && failed > 0 ? { [failures.field]: 0 } : {}) }, "death save");

        if (stable) {
            game.addEffect(name, stableEffect, "death save");
        }

        const cleared = stable && failed > 0 ? `, ${failures.field} ${failed} → 0` : "";
        const said = stable ? ` ${name} is stable: no more death saves, still ${unconscious} until it regains ${hp}.` : "";
        return [`${name}'s death save: ${roll.total}, a success; ${successes.field} ${before} → ${after}${cleared}.${said}`];
    }

    const before = counted(page, failures.field);
    const lost = natural === 1 ? save.lowest : 1;
    const after = Math.min(before + lost, failures.most);
    setCounters(game, name, { [failures.field]: after }, "death save");
    const dead = after >= failures.most ? ` ${name} dies: a moment of its own in the story.` : "";
    return [`${name}'s death save: ${roll.total}, ${lost > 1 ? `the lowest face, ${lost} failures` : "a failure"}; ${failures.field} ${before} → ${after}.${dead}`];
}

/** Stable given, as by a companion's Medicine or a healer's kit (DIE-6): successes full, failures gone, no more death saves. */
function stabilized(name: string, game: Game): string[]
{
    const page = game.page(name);

    if (!isDying(page)) {
        return [];
    }

    const succeeded = counted(page, successes.field);
    const failed = counted(page, failures.field);
    setCounters(game, page.name, { [successes.field]: successes.most, [failures.field]: 0 }, `${stableEffect} given`);
    return [
        `${page.name} is stable: ${successes.field} ${succeeded} → ${successes.most}, ${failures.field} ${failed} → 0; no more death saves, still ${unconscious} until it regains ${hp}.`,
    ];
}

/** The death save a question asks of a dying player character (D-460): every check the save's die, asked in its card, forced. */
function saveAsking(who: string, notations: string[], game: GameView): { card: { widget: string; key: string; }; decline: false; } | undefined
{
    const page = game.page(who);

    if (!isDying(page) || !page.pc || notations.length === 0 || !notations.every(isSaveRoll)) {
        return undefined;
    }

    const marks = `${counted(page, successes.field)}/${counted(page, failures.field)}`;
    return { card: { widget: "death-save", key: `${page.name} ${game.now()?.date ?? ""} ${marks}` }, decline: false };
}

/** Where one of the party at 0 stands: dying, stable at the last success, dead at the last failure; none above 0, or marked dead. */
function stateOf(page: GamePage | undefined): DyingState | undefined
{
    const counter = page?.counter(hp);

    if (page === undefined || !page.party || counter === undefined || counter.value > 0 || page.value("status") === "dead") {
        return undefined;
    }

    return counted(page, failures.field) >= failures.most ? "dead" : counted(page, successes.field) >= successes.most ? "stable" : "dying";
}

/**
 * One of the party at 0 hit points, on them (D-516): the word of their state, red dying, green stable, dead greyed; the successes on one side and the
 * failures on the other, which leave the line of values; the line of the heart over the word.
 */
function dyingWidget(game: GameView, who: string | undefined): Widget | undefined
{
    const page = who === undefined ? undefined : game.page(who);
    const state = stateOf(page);

    if (page === undefined || state === undefined) {
        return undefined;
    }

    const [succeeded, failed] = [counted(page, successes.field), counted(page, failures.field)];
    const data: DyingData = { state };
    return {
        icon: "heartbeat",
        chip: stateWords[state],
        ...(state === "dead" ? { dead: true } : {}),
        says: { text: "{who}: {state}", values: { who: page.name, state: stateWords[state] } },
        data,
        parts: [
            { track: { label: "Successes", value: succeeded, max: successes.most, tone: "good", stage: "start", field: successes.field } },
            { lead: stateWords[state], ...(state === "dead" ? {} : { tone: state === "stable" ? "good" as const : "bad" as const }), figure: "heartbeat" },
            { track: { label: "Failures", value: failed, max: failures.most, tone: "bad", stage: "end", field: failures.field } },
        ],
    };
}

/** The card of a death save, for who rolls it, before and after the dice: their counters, whether still at 0 and whether dead, and what the save's faces do. */
function saveWidget(game: GameView, who: string | undefined): Widget | undefined
{
    const page = who === undefined ? undefined : game.page(who);

    if (page === undefined) {
        return undefined;
    }

    const failed = counted(page, failures.field);
    const data: SaveData = {
        who: page.name,
        successes: { value: counted(page, successes.field), most: successes.most },
        failures: { value: failed, most: failures.most },
        down: (page.counter(hp)?.value ?? 0) <= 0,
        dead: failed >= failures.most || page.value("status") === "dead",
        sides: save.sides,
        atLeast: save.atLeast,
        lowest: save.lowest,
        highest: save.highest,
    };
    // The card in the tint of the moment (D-461, D-517): red while dying, green stable, gold back on their feet, grey dead.
    const tint = data.dead ? "muted" : !data.down ? "gold" : data.successes.value >= successes.most ? "ally" : "low";
    return { body: "death-save", says: "Death Saving Throw", tint, data };
}

/** How the master tells a companion's death save (D-460): with the mentor off, the story alone, never naming it; else the roll in brackets, explained once in the tutorial. */
function tellingOf(mentor: string | undefined): string
{
    return mentor === "off"
        ? "Tell it in the story alone: never name the save or its roll."
        : `Tell it in a sentence, the roll in brackets${mentor === "tutorial" ? ", and the first time what a death save is" : ""}.`;
}

/** Whether a roll is a death save (playtest 08): the d20 and maybe more dice, as a d4 of Bless, never a number added, as initiative or a skill adds. */
function isSaveRoll(notation: string): boolean
{
    // d20 is 1d20, as dice read it.
    const compact = notation.toLowerCase().replace(/\s+/g, "").replace(/(^|[+-])d/g, "$11d");
    return compact.startsWith(save.dice) && compact.slice(save.dice.length).split(/(?=[+-])/).filter((term) => term !== "").every((term) => /^[+-]\d*d\d+$/.test(term));
}

/** Counters changed as the change command changes them, one by one, each to its value: the rules watch them, so they are never just written (D-514). */
function setCounters(game: Game, page: string, values: Record<string, number>, why: string): void
{
    for (const [field, value] of Object.entries(values)) {
        game.change(page, field, { to: value }, why);
    }
}
