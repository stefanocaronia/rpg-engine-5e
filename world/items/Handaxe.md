---
category: simple melee weapon
cost: 5 gp
damage: 1d6 slashing
weight: 2 lb
properties: [light, thrown (range 20/60)]
bonus: 0
attack: "best(str-mod, dex-mod / has(features, Martial Arts)) + proficiency * max(has(weapon-proficiencies, simple weapons), has(weapon-proficiencies, Handaxe), has(weapon-proficiencies, handaxes)) + bonus"
damage-roll: "1d6 + best(str-mod, dex-mod / has(features, Martial Arts)) + bonus + 2 * has(fighting-styles, Dueling) slashing"
---
