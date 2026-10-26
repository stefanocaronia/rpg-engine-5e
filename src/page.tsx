// The 5e's code in the dashboard's page (D-510, D-511, D-516): the line of the heart over the word of one at 0 hit points; the inside of the card of a death
// save (D-460, D-461), the portrait greyed in a ring that beats between the successes and the failures, the one button, the outcome once the dice land; the
// inside of the card of the hit dice of a rest (D-492), who rests and the points the dice give, a row for each die with its button, the dice rolled. Drawn
// with the dashboard's kit and tokens; its own layout and motion in its style sheet (page-style.ts).
import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { type BodyProps, Dice, type FigureProps, Icon, type PageModule, Portrait } from "rpg-engine/page";
import { pageStyle } from "./page-style.ts";
import { type DyingData, type DyingState, type SaveData, type SaveOutcome, saveOutcome } from "./shown.ts";

const page: PageModule = {
    figures: { heartbeat: HeartbeatFigure },
    bodies: { "death-save": DeathSaveBody, "hit-dice": HitDiceBody },
    style: pageStyle,
};

export default page;

/** The kinds of the line of the heart. */
type HeartLineKind = keyof typeof heartLines;

// The line of the heart, on a strip 420 wide and 60 high: a faint beat while dying, a stronger one at a success, weaker at a failure, flat at the last.
const heartLines = {
    faint: "M0 30H130l6-6 5 10 4-4H170l5-16 7 28 5-12H260l5-5 4 8 4-3H420",
    beat: "M0 30H120l8-4 6 4H170l6-26 8 50 6-24H240l8-4 6 4H330l6-22 8 42 6-20H420",
    weak: "M0 30H140l6-8 6 14 4-6H300l4-6 4 8H420",
    flat: "M0 30H420",
    strong: "M0 30H120l8-6 6 6H160l8-34 10 60 8-30H250l8-6 6 6H320l8-30 10 54 8-24H420",
};

// The line of each state that stays.
const stateLines: Record<DyingState, HeartLineKind> = { dying: "faint", stable: "beat", dead: "flat" };

// The drawing of the skull of the dead, as the dashboard's own.
const skull = "M12 2.5C7 2.5 3.5 6 3.5 10.6c0 2.7 1.2 4.8 3.2 6.1V19.5c0 1.1.9 2 2 2h6.6c1.1 0 2-.9 2-2v-2.8c2-1.3 3.2-3.4 3.2-6.1C20.5 6 17 2.5 12 2.5Z "
    + "M8.6 8.8a2.3 2.4 0 1 0 0 4.8a2.3 2.4 0 1 0 0-4.8Z M15.4 8.8a2.3 2.4 0 1 0 0 4.8a2.3 2.4 0 1 0 0-4.8Z M12 13.8l-1.4 2.5h2.8Z M10.1 18.4h1.1v3.4h-1.1Z M12.8 18.4h1.1v3.4h-1.1Z";

/** The line of the heart over the word of one at 0, in the tint of their panel: faint dying, a beat stable, flat dead. */
function HeartbeatFigure({ data }: FigureProps)
{
    const state = (data as DyingData | undefined)?.state ?? "dying";
    return <HeartLine line={stateLines[state]} kind="dying-line in-panel" />;
}

function HeartLine({ line, kind = "dying-line" }: { line: HeartLineKind; kind?: string; })
{
    return (
        <svg class={kind} viewBox="0 0 420 60" preserveAspectRatio="none" aria-hidden="true">
            <path d={heartLines[line]} />
        </svg>
    );
}

/** The inside of the card of a death save, from the question to its outcome, which the player closes once read. */
function DeathSaveBody({ data, before, rolled, buttons, sent, answer, words, field }: BodyProps)
{
    const save = data as SaveData;
    const was = before as SaveData | undefined;
    const button = buttons[0];
    const rolling = sent !== undefined;
    // The outcome once the dice landed and what the server's code wrote of them came: from the card before the roll to the card after.
    const outcome = rolled === undefined || was === undefined ? undefined : saveOutcome(was, save);
    const shown = was ?? save;
    const successes = outcome?.successes ?? (rolled === undefined ? save : shown).successes.value;
    const failures = outcome?.failures ?? (rolled === undefined ? save : shown).failures.value;
    const highest = `${save.highest.value} ${field(save.highest.field)}`;
    const told = rolled === undefined ? (rolling ? "rolling" : "asking") : outcome === undefined ? "told" : `told ${outcome.kind}`;
    const said = outcome === undefined ? "" : outcomeWords(outcome, highest, words);
    const label = (side: "successes" | "failures"): string => words(side === "successes" ? "Successes" : "Failures");
    const of = (value: number, max: number): string => words("{value} of {max}", { value, max });
    return (
        <div class={`death-save ${told}`}>
            <div class="dying-life">
                <HeartLine line={heartLine(outcome?.kind)} />
                <Marks kind="successes" label={label("successes")} value={successes} most={save.successes.most} lit={outcome?.kind === "success" || outcome?.kind === "stable" ? 1 : 0} of={of} />
                <span class="dying-token">
                    <Portrait name={save.who} large />
                </span>
                <Marks kind="failures" label={label("failures")} value={failures} most={save.failures.most} lit={outcome?.count ?? 0} of={of} />
            </div>
            <div class="dying-foot">
                {rolled === undefined && button !== undefined && (
                    <button type="button" class={rolling ? "dying-roll sent" : "dying-roll"} disabled={rolling} aria-describedby="dying-stakes" onClick={() => answer(0)}>
                        {button.dice !== undefined && <Dice notation={button.dice} />}
                        <span class="asked-check-name">{button.name}</span>
                        {button.dice !== undefined && <span class="visually-hidden">{button.dice}</span>}
                    </button>
                )}
                {/* The outcome in words where the button was, as tall, so that the card does not move; a screen reader hears it as it comes. */}
                <p class="dying-word" role="status">
                    {rolled !== undefined && (
                        <>
                            <span aria-hidden="true">
                                {outcome === undefined ? rolled.total : `${rolled.total} · `}
                                {outcome?.kind === "dead" && (
                                    <svg class="person-skull" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d={skull} />
                                    </svg>
                                )}
                                {said}
                            </span>
                            <span class="visually-hidden">
                                {outcome === undefined
                                    ? String(rolled.total)
                                    : `${rolled.total}: ${said}. ${label("successes")}: ${of(successes, save.successes.most)}; ${label("failures")}: ${of(failures, save.failures.most)}.`}
                            </span>
                        </>
                    )}
                </p>
                <p id="dying-stakes" class="dying-stakes">
                    {[
                        words("{value} or more: a success", { value: save.atLeast }),
                        save.lowest === 2 ? words("{face}: two failures", { face: 1 }) : words("{face}: {count} failures", { face: 1, count: save.lowest }),
                        words("{face}: back up with {value}", { face: save.sides, value: highest }),
                    ].join(" · ")}
                </p>
            </div>
        </div>
    );
}

/** A side's marks, successes as circles, failures as squares; the last `lit` of those marked are new, lit as they come. */
function Marks({ kind, label, value, most, lit, of }: { kind: "successes" | "failures"; label: string; value: number; most: number; lit: number; of(value: number, max: number): string; })
{
    return (
        <div class={kind === "failures" ? "person-side bad" : "person-side good"}>
            <span class="eyebrow person-label" aria-hidden="true">{label}</span>
            <span class="person-marks">
                {Array.from({ length: most }, (_, index) => (
                    <span
                        key={index}
                        class={["person-mark", index < value ? "marked" : "", index < value && index >= value - lit ? "new" : ""].filter((name) => name !== "").join(" ")}
                        aria-hidden="true"
                    />
                ))}
                <span class="visually-hidden">{`${label}: ${of(value, most)}`}</span>
            </span>
        </div>
    );
}

/** The outcome in the 5e's words. */
function outcomeWords(outcome: SaveOutcome, highest: string, words: BodyProps["words"]): string
{
    switch (outcome.kind) {
        case "success":
            return words("Success");
        case "stable":
            return words("Stable");
        case "failure":
            return words("Failure");
        case "failures":
            return outcome.count === 2 ? words("Two failures") : words("{count} failures", { count: outcome.count });
        case "dead":
            return words("Dead");
        case "back":
            return words("Back up with {value}", { value: highest });
    }
}

/** The line of the heart for an outcome: faint while it is to roll, a beat at a success, weaker at a failure, strong back on their feet, flat at the last. */
function heartLine(kind: SaveOutcome["kind"] | undefined): HeartLineKind
{
    return kind === undefined ? "faint" : kind === "back" ? "strong" : kind === "dead" ? "flat" : kind === "success" || kind === "stable" ? "beat" : "weak";
}

// How long the points take to climb to what a die gave.
const climbTime = 400;
// The kit's check, drawn on a grid of 24.
const checkPath = "M5 12.5l4.5 4.5L19 7.5";

/**
 * The inside of the card of the hit dice of a rest (ASK-14): who rests and the points the dice give, as a bar that keeps where the rest began; a row for each
 * die with its pips and its button; the dice rolled as chips; the one button that ends it. What a roll changes shows once its dice land.
 */
function HitDiceBody({ rest, buttons, sent, answer, words, field, number, reducedMotion }: BodyProps)
{
    const element = useRef<HTMLDivElement>(null);
    const done = useRef<HTMLButtonElement>(null);
    const [leaving, setLeaving] = useState(false);
    const value = useClimb(rest?.gives.value ?? 0, reducedMotion);

    // The last die spent, the focus that was on a button to roll goes to the one that ends it.
    const left = rest?.dice.some((dice) => dice.value > 0) === true;

    useEffect(() => {
        const active = (element.current?.getRootNode() as Document | ShadowRoot | undefined)?.activeElement ?? null;

        if (!left && active !== null && element.current?.contains(active) === true) {
            done.current?.focus();
        }
    }, [left]);

    if (rest === undefined) {
        return null;
    }

    const { gives } = rest;
    const gained = gives.value - gives.from;
    const full = gives.max !== undefined && gives.value >= gives.max;
    const last = rest.rolls.at(-1);
    const busy = sent !== undefined || leaving;

    const end = (): void => {
        if (!busy) {
            setLeaving(true);
            answer(buttons.length - 1);
        }
    };

    return (
        <div ref={element} class={leaving ? "hit-dice leaving" : "hit-dice"}>
            <div class="spend-play">
                <div class="spend-life">
                    <span class="spend-token">
                        <Portrait name={rest.who} />
                    </span>
                    <div class="spend-points">
                        <span class="spend-points-head">
                            <span class="eyebrow spend-points-name">{field(gives.field)}</span>
                            <span class="spend-points-number">
                                <b>{number(value)}</b>
                                {gives.max !== undefined && <span class="spend-points-max">/{number(gives.max)}</span>}
                            </span>
                            {gained > 0 && <span class="spend-gain">+{number(gained)}</span>}
                            {full && (
                                <span class="spend-full">
                                    <Icon path={checkPath} />
                                    {words("at the maximum")}
                                </span>
                            )}
                        </span>
                        {gives.max !== undefined && gives.max > 0 && (
                            <span
                                class="bar spend-bar"
                                role="meter"
                                aria-label={field(gives.field)}
                                aria-valuemin={0}
                                aria-valuemax={gives.max}
                                aria-valuenow={gives.value}
                                aria-valuetext={words("{value} of {max}", { value: gives.value, max: gives.max })}
                            >
                                <span class="fill spend-now" style={{ "--fill": String(share(gives.value, gives.max)) } as JSX.CSSProperties} />
                                {gives.from > 0 && <span class="fill spend-before" style={{ "--fill": String(share(gives.from, gives.max)) } as JSX.CSSProperties} />}
                            </span>
                        )}
                    </div>
                </div>
                <ul class="spend-rows">
                    {rest.dice.map((dice, index) => {
                        const out = dice.value <= 0;
                        const label = field(dice.field);
                        return (
                            <li key={dice.field} class={out ? "spend-row out" : "spend-row"}>
                                <span class="spend-row-name">{label}</span>
                                {dice.max <= 10
                                    ? (
                                        <span class="pips spend-pips" role="img" aria-label={`${label}: ${words("{value} of {max}", { value: dice.value, max: dice.max })}`}>
                                            {Array.from({ length: dice.max }, (_, pip) => (
                                                <span key={pip} class={["pip", pip < dice.value ? "on" : "", last?.field === dice.field && pip === dice.value ? "fresh" : ""].filter((name) => name !== "").join(" ")} />
                                            ))}
                                        </span>
                                    )
                                    : <span class="spend-count">{words("{value} of {max}", { value: dice.value, max: dice.max })}</span>}
                                <button
                                    type="button"
                                    class={sent === index ? "spend-roll sent" : "spend-roll"}
                                    aria-disabled={out || busy ? "true" : undefined}
                                    onClick={() => !out && !busy && answer(index)}
                                >
                                    <Dice notation={`1d${dice.sides}`} />
                                    <span class="asked-check-name">{out ? words("None left") : words("Roll")}</span>
                                    {!out && dice.adds !== 0 && <span class="asked-dice">{signed(dice.adds)}</span>}
                                    <span class="visually-hidden">{label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
            <div class="spend-foot">
                {rest.rolls.length === 0
                    ? <p class="spend-hint">{words("One die at a time: stop when you like.")}</p>
                    : (
                        <ol class="spend-chips" aria-label={words("Dice rolled")}>
                            {rest.rolls.map((roll) => (
                                <li key={roll.id} class={roll.id === last?.id ? "spend-chip fresh" : "spend-chip"}>
                                    <span class="die-chip">
                                        <Dice notation={`1d${rest.dice.find((dice) => dice.field === roll.field)?.sides ?? 6}`} />
                                        {roll.face}
                                    </span>
                                    {roll.adds !== 0 && <span class="spend-chip-adds">{signed(roll.adds)}</span>}
                                    <span class="spend-chip-total">= {roll.total}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                <button ref={done} type="button" class={left ? "spend-done" : "spend-done last"} aria-disabled={busy ? "true" : undefined} onClick={end}>
                    {rest.rolls.length === 0 ? words("I spend none") : words("Done")}
                </button>
            </div>
            {/* Each die as it lands, for a screen reader: what it gave and what is left. */}
            <p class="visually-hidden" role="status">{last === undefined ? "" : landedText(rest, last, words, field)}</p>
        </div>
    );
}

/** "Hit dice d8: 6 +2 = 8. HP: 22 of 27. Left: 1.": a die as it landed, for a screen reader. */
function landedText(rest: NonNullable<BodyProps["rest"]>, roll: NonNullable<BodyProps["rest"]>["rolls"][number], words: BodyProps["words"], field: BodyProps["field"]): string
{
    const dice = rest.dice.find((counter) => counter.field === roll.field);
    const points = rest.gives.max === undefined ? String(rest.gives.value) : words("{value} of {max}", { value: rest.gives.value, max: rest.gives.max });
    const rolled = `${roll.face}${roll.adds === 0 ? "" : ` ${signed(roll.adds)}`} = ${roll.total}`;
    return `${field(roll.field)}: ${rolled}. ${field(rest.gives.field)}: ${points}.${dice === undefined ? "" : ` ${words("Left: {count}", { count: dice.value })}`}`;
}

/** What a die adds, with its sign: +2, −1. */
function signed(value: number): string
{
    return value < 0 ? `−${Math.abs(value)}` : `+${value}`;
}

/** A value's share of its maximum, from 0 to 1. */
function share(value: number, max: number): number
{
    return Math.min(1, Math.max(0, value / max));
}

/** A number that climbs to its new value in a moment, at once for a player who asked for less motion. */
function useClimb(target: number, still: boolean): number
{
    const [value, setValue] = useState(target);
    const from = useRef(target);

    useEffect(() => {
        const start = from.current;
        from.current = target;

        if (start === target || still) {
            setValue(target);
            return;
        }

        const began = performance.now();
        let frame = 0;

        const step = (now: number): void => {
            const part = Math.min(1, (now - began) / climbTime);
            setValue(Math.round(start + (target - start) * part));

            if (part < 1) {
                frame = requestAnimationFrame(step);
            }
        };

        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [target]);

    return value;
}
