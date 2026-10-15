---
category: simple melee weapon
cost: 1 gp
damage: 1d6 piercing
weight: 3 lb
properties: [thrown (range 20/60), versatile (1d8)]
bonus: 0
attack: "best(str-mod, dex-mod / has(features, Martial Arts)) + proficiency * max(has(weapon-proficiencies, simple weapons), has(weapon-proficiencies, Spear), has(weapon-proficiencies, spears)) + bonus"
damage-roll: "dice(1d6, martial-arts) + best(str-mod, dex-mod / has(features, Martial Arts)) + bonus + 2 * has(fighting-styles, Dueling) piercing"
image: "[[barbed-spear.svg]]"
---
