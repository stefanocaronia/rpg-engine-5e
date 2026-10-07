---
category: simple melee weapon
cost: 5 sp
damage: 1d6 piercing
weight: 2 lb
properties: [thrown (range 30/120)]
attack: "str-mod + proficiency * max(has(weapon-proficiencies, simple weapons), has(weapon-proficiencies, Javelin), has(weapon-proficiencies, javelins)) + bonus"
damage-roll: "1d6 + str-mod + bonus + 2 * has(fighting-styles, Dueling) * max(0, 2 - count(equipped, category = simple melee weapon) - count(equipped, category = martial melee weapon) - count(equipped, category = simple ranged weapon) - count(equipped, category = martial ranged weapon)) piercing"
---
