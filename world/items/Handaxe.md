---
category: simple melee weapon
cost: 5 gp
damage: 1d6 slashing
weight: 2 lb
properties: [light, thrown (range 20/60)]
attack: "str-mod + proficiency * max(has(weapon-proficiencies, simple weapons), has(weapon-proficiencies, Handaxe), has(weapon-proficiencies, handaxes)) + bonus"
damage-roll: "1d6 + str-mod + bonus + 2 * has(fighting-styles, Dueling) * max(0, 2 - count(equipped, category = simple melee weapon) - count(equipped, category = martial melee weapon) - count(equipped, category = simple ranged weapon) - count(equipped, category = martial ranged weapon)) slashing"
---
