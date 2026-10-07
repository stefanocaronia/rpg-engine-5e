---
category: simple melee weapon
cost: 1 gp
damage: 1d6 piercing
weight: 3 lb
properties: [thrown (range 20/60), versatile (1d8)]
attack: "str-mod + proficiency * max(has(weapon-proficiencies, simple weapons), has(weapon-proficiencies, Spear), has(weapon-proficiencies, spears)) + bonus"
damage-roll: "1d6 + str-mod + bonus + 2 * has(fighting-styles, Dueling) * max(0, 2 - count(equipped, category = simple melee weapon) - count(equipped, category = martial melee weapon) - count(equipped, category = simple ranged weapon) - count(equipped, category = martial ranged weapon)) piercing"
---
