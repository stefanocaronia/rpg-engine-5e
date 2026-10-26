// The 5e page module's own style sheet (D-510): the layout and motion of the insides of its cards and of its line of the heart, which each of its drawings
// takes after the dashboard's, with the dashboard's tokens. The parts it shares with the dashboard (marks, pips, bars, buttons) are the dashboard's.
export const pageStyle = `
/* The inside of the card of a death save (D-460, D-461), in the tint of danger until the outcome is told: the portrait greyed in a ring that beats, the line
   of the heart behind it, the successes on one side and the failures on the other, the one button under them. The outcome sets its tint: gold back on
   their feet, green stable, grey at the last failure, the line flat. */
.death-save {
    --tint: var(--low);
    display: grid;
    gap: 12px;
}

.death-save.back {
    --tint: var(--gold);
}

.death-save.stable {
    --tint: var(--ally);
}

.death-save.dead {
    --tint: var(--muted);
}

.dying-life {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    min-height: 112px;
}

/* The line runs between the two sides, behind the portrait. */
.dying-line {
    position: absolute;
    top: calc(50% - 30px);
    inset-inline-start: 120px;
    width: calc(100% - 240px);
    height: 60px;
    overflow: visible;
    color: var(--tint);
    opacity: 0.6;
    pointer-events: none;
}

.dying-line path {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
}

.person-mark.new {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--mark) 30%, transparent);
}

.person-mark::after {
    content: "";
    position: absolute;
    inset: -7px;
    border: 2px solid var(--mark);
    border-radius: inherit;
    opacity: 0;
}

/* The portrait in its ring, greyed while dying: in colour again on the highest face, darker at the last failure. */
.dying-token {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 102px;
    height: 102px;
    border: 3px solid var(--tint);
    border-radius: 50%;
    background: var(--float);
    transition: border-color var(--long) var(--ease);
}

.dying-token .token {
    --size: 90px;
}

.dying-token .token > :is(img, .initials) {
    filter: grayscale(0.85) brightness(0.8);
    transition: filter var(--long) var(--ease);
}

.death-save.back .dying-token .token > :is(img, .initials) {
    filter: none;
}

.death-save.dead .dying-token .token > :is(img, .initials) {
    filter: grayscale(1) brightness(0.5);
}

.dying-token::after {
    content: "";
    position: absolute;
    inset: -3px;
    border: 3px solid var(--tint);
    border-radius: 50%;
    opacity: 0;
    pointer-events: none;
}

.dying-foot {
    display: grid;
    justify-items: center;
    gap: 8px;
    text-align: center;
}

.dying-roll {
    /* The die in front hides the lines of the one behind it with the button's gold, as a check's button. */
    --die-ground: var(--gold);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: min(320px, 100%);
    min-height: 48px;
    padding: 8px 20px;
    border: 0;
    border-radius: var(--radius-m);
    background: var(--gold);
    color: var(--on-gold);
    font: inherit;
    font-weight: 600;
    box-shadow: var(--raise);
    cursor: pointer;
}

.dying-roll:disabled {
    cursor: default;
    opacity: 0.55;
}

.dying-roll.sent {
    opacity: 1;
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}

.dying-stakes {
    margin: 0;
    color: var(--muted);
    font-size: 0.85rem;
}

/* The outcome, large where the button was and as tall: the total, then the word, green for a success, red for a failure, gold on its feet. */
.dying-word {
    display: grid;
    place-items: center;
    min-height: 48px;
    margin: 0;
    color: var(--low);
    font-size: 1.6rem;
    font-weight: 800;
    line-height: 1.2;
}

.dying-word:empty {
    display: none;
}

.death-save:is(.success, .stable) .dying-word {
    color: var(--ally);
}

/* A total the system's code wrote nothing of: no outcome, so no colour of one. */
.death-save.told:not(.success, .stable, .failure, .failures, .dead, .back) .dying-word {
    color: var(--ink);
}

.death-save.back .dying-word {
    color: var(--gold-ink);
}

/* Motion only for who wants it: the ring beats while dying, slower once stable, bursts on the highest face; the new mark pops. Reduced, the states alone. */
@media (prefers-reduced-motion: no-preference) {
    .death-save:is(.asking, .rolling, .success, .failure, .failures) .dying-token::after {
        animation: dying-beat 1.6s var(--ease-out) infinite;
    }

    .death-save.stable .dying-token::after {
        animation: dying-beat 2.6s var(--ease-out) infinite;
    }

    .death-save.back .dying-token::after {
        animation: dying-burst var(--linger) var(--ease-out) both;
    }

    .person-mark.new {
        animation: mark-pop var(--flight) var(--ease-bounce) both;
    }

    .person-mark.new::after {
        animation: mark-ring var(--long) var(--ease-out) var(--quick) both;
    }

    .death-save.told .dying-word {
        animation: word-rise var(--medium) var(--ease-out) both;
    }
}

@keyframes dying-beat {
    0%,
    30% {
        opacity: 0.8;
        transform: scale(1);
    }

    60%,
    100% {
        opacity: 0;
        transform: scale(1.35);
    }
}

@keyframes dying-burst {
    from {
        opacity: 1;
        transform: scale(1);
    }

    to {
        opacity: 0;
        transform: scale(1.9);
    }
}

/* The death save's card on a phone (D-461): the portrait over the two sides, the line left out, the button the whole width. */
@media (max-width: 600px) {
    .death-save {
        gap: 10px;
    }

    .death-save .dying-life {
        grid-template-columns: 1fr 1fr;
        min-height: 0;
    }

    .death-save .dying-line {
        display: none;
    }

    .death-save .dying-token {
        grid-column: 1 / -1;
        grid-row: 1;
        justify-self: center;
        width: 84px;
        height: 84px;
    }

    .death-save .dying-token .token {
        --size: 74px;
    }

    .death-save .person-side {
        grid-row: 2;
    }

    .death-save .dying-roll {
        width: 100%;
    }

    .death-save .dying-word {
        font-size: 1.35rem;
    }
}

/* The dice of a rest the master asks the player to spend (D-492, ASK-14): a card in the frame of the master's question, which stays while they roll. Who rests
   and the points the dice give, as a bar that keeps where the rest began; a row for each kind of die with its pips and its button; the dice rolled as chips;
   the one button that ends it. Wide, the points and the dice side by side; narrow, one under the other. */
.spend-play {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
    gap: 12px 24px;
    max-width: 880px;
    margin-bottom: 12px;
}

.spend-life {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 14px;
}

.spend-token .token {
    --size: 56px;
}

.spend-points {
    display: grid;
    gap: 6px;
    min-width: 0;
}

.spend-points-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
}

.spend-points-number {
    font-variant-numeric: tabular-nums;
}

.spend-points-number b {
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1;
}

.spend-points-max {
    color: var(--muted);
    font-weight: 700;
}

.spend-gain {
    color: var(--ally);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.spend-full {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 600;
}

.spend-full svg.icon {
    width: 16px;
    height: 16px;
    color: var(--ally);
    stroke-width: 2.5;
}

/* Where the rest began, solid; what it gave, the same green lighter in both themes, a notch between them on the side the bar grows to. */
.bar.spend-bar {
    width: 100%;
    height: 12px;
    border-radius: var(--radius-s);
}

.spend-bar .spend-now {
    background: light-dark(color-mix(in srgb, var(--ally) 50%, var(--float)), color-mix(in srgb, var(--ally) 55%, white));
}

.spend-bar .spend-before {
    border-inline-end: 2px solid var(--float);
    background: var(--ally);
}

.spend-rows {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.spend-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 4px 12px;
    padding-block: 6px;
    padding-inline: 12px 6px;
    border-radius: var(--radius-m);
    background: var(--panel-2);
}

.spend-row-name {
    font-weight: 700;
}

.spend-row.out .spend-row-name {
    color: var(--muted);
}

.spend-pips {
    gap: 6px;
}

.spend-pips .pip {
    width: 16px;
    height: 16px;
    border-width: 2px;
}

/* The die just spent: a ring around its pip. */
.spend-pips .pip.fresh {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent);
}

.spend-count {
    color: var(--muted);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.spend-roll {
    /* The die in front hides its lines with the button's gold. */
    --die-ground: var(--gold);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 116px;
    min-height: 44px;
    padding-block: 6px;
    padding-inline: 12px 16px;
    border: 0;
    border-radius: var(--radius-m);
    background: var(--gold);
    color: var(--on-gold);
    font: inherit;
    font-weight: 600;
    box-shadow: var(--raise);
    cursor: pointer;
}

.spend-roll[aria-disabled="true"] {
    cursor: default;
    opacity: 0.55;
}

.spend-roll.sent {
    opacity: 1;
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}

.spend-row.out .spend-roll {
    --die-ground: transparent;
    background: transparent;
    color: var(--muted);
    box-shadow: inset 0 0 0 1px var(--rule);
    opacity: 1;
}

.spend-foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px 16px;
    max-width: 880px;
}

.spend-hint {
    margin: 0;
    color: var(--muted);
    font-size: 0.85rem;
}

.spend-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.spend-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-variant-numeric: tabular-nums;
}

.spend-chip .die-chip {
    box-shadow: inset 0 0 0 1px var(--rule);
}

.spend-chip.fresh .die-chip {
    box-shadow: inset 0 0 0 2px var(--accent);
}

.spend-chip-adds {
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 600;
}

.spend-chip-total {
    font-weight: 700;
}

.spend-done {
    min-height: 44px;
    margin-inline-start: auto;
    padding: 8px 18px;
    border: 1px solid var(--rule);
    border-radius: var(--radius-m);
    background: var(--panel-2);
    color: var(--ink);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
}

.spend-done[aria-disabled="true"] {
    cursor: default;
    opacity: 0.55;
}

/* Wide, the button keeps its width as its words change at the first die. */
@media (min-width: 601px) {
    .spend-done {
        min-width: 8.5em;
    }
}

/* With no die left, ending it is all there is to do. */
.spend-done.last {
    border-color: transparent;
    background: var(--gold);
    color: var(--on-gold);
    box-shadow: var(--raise);
}

@media (prefers-reduced-motion: no-preference) {
    .spend-chip.fresh {
        animation: spend-pop var(--medium) var(--ease-bounce) both;
    }

    .spend-pips .pip {
        transition: background-color var(--short) var(--ease), box-shadow var(--short) var(--ease);
    }
}

@keyframes spend-pop {
    from {
        opacity: 0;
        transform: scale(0.6);
    }
}

@media (max-width: 600px) {
    .spend-play {
        grid-template-columns: minmax(0, 1fr);
        gap: 10px;
        margin-bottom: 10px;
    }

    .spend-life {
        gap: 10px;
    }

    .spend-token .token {
        --size: 44px;
    }

    .spend-points-number b {
        font-size: 1.35rem;
    }

    .spend-row {
        grid-template-columns: minmax(0, 1fr) auto;
        padding-inline: 10px 6px;
    }

    .spend-row-name {
        grid-column: 1;
        grid-row: 1;
        font-size: 0.85rem;
    }

    .spend-pips,
    .spend-count {
        grid-column: 1;
        grid-row: 2;
    }

    .spend-pips .pip {
        width: 14px;
        height: 14px;
    }

    .spend-roll {
        grid-column: 2;
        grid-row: 1 / span 2;
        min-width: 104px;
    }

    .spend-foot {
        gap: 8px;
    }

    .spend-done {
        flex: 1 1 100%;
    }

    .spend-hint {
        font-size: 0.85rem;
    }
}

/* Right to left, the numbers with their signs stay in their order, as the dashboard keeps its own. */
:is(.asked-dice, .spend-gain, .spend-chip-adds):dir(rtl) {
    direction: ltr;
    unicode-bidi: isolate;
}

/* The hit dice under the question, as far from it as the card always had them. */
.hit-dice {
    margin-top: 12px;
}

/* The portraits without the pip of their side, as the card always drew them. */
:is(.dying-token, .spend-token) .side-pip {
    display: none;
}

/* The line of the heart over the word of one at 0, in their panel's tint. */
.dying-line.in-panel {
    position: static;
    display: block;
    width: 100%;
    height: 100%;
}
`;
