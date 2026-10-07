---
category: martial melee weapon
cost: 5 gp
damage: 1d6 piercing
weight: 4 lb
properties: [thrown (range 20/60), versatile (1d8)]
attack: "str-mod + proficiency * max(has(weapon-proficiencies, martial weapons), has(weapon-proficiencies, Trident), has(weapon-proficiencies, tridents)) + bonus"
damage-roll: "1d6 + str-mod + bonus + 2 * has(fighting-styles, Dueling) * max(0, 2 - count(equipped, category = simple melee weapon) - count(equipped, category = martial melee weapon) - count(equipped, category = simple ranged weapon) - count(equipped, category = martial ranged weapon)) piercing"
---
