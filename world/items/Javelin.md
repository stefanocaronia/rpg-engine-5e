---
category: simple melee weapon
cost: 5 sp
damage: 1d6 piercing
weight: 2 lb
properties: [thrown (range 30/120)]
bonus: 0
attack: "best(str-mod, dex-mod / has(features, Martial Arts)) + proficiency * max(has(weapon-proficiencies, simple weapons), has(weapon-proficiencies, Javelin), has(weapon-proficiencies, javelins)) + bonus"
damage-roll: "dice(1d6, martial-arts) + best(str-mod, dex-mod / has(features, Martial Arts)) + bonus + 2 * has(fighting-styles, Dueling) piercing"
image: "[[thrown-spear.svg]]"
---
