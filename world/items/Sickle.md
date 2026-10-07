---
category: simple melee weapon
cost: 1 gp
damage: 1d4 slashing
weight: 2 lb
properties: [light]
bonus: 0
attack: "best(str-mod, dex-mod / has(features, Martial Arts)) + proficiency * max(has(weapon-proficiencies, simple weapons), has(weapon-proficiencies, Sickle), has(weapon-proficiencies, sickles)) + bonus"
damage-roll: "1d4 + best(str-mod, dex-mod / has(features, Martial Arts)) + bonus + 2 * has(fighting-styles, Dueling) slashing"
---
