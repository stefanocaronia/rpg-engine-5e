---
category: martial melee weapon
cost: 15 gp
damage: 1d8 slashing
weight: 3 lb
properties: [versatile (1d10)]
attack: "str-mod + proficiency * max(has(weapon-proficiencies, martial weapons), has(weapon-proficiencies, Longsword), has(weapon-proficiencies, longswords)) + bonus"
damage-roll: "1d8 + str-mod + bonus + 2 * has(fighting-styles, Dueling) * max(0, 2 - count(equipped, category = simple melee weapon) - count(equipped, category = martial melee weapon) - count(equipped, category = simple ranged weapon) - count(equipped, category = martial ranged weapon)) slashing"
---
