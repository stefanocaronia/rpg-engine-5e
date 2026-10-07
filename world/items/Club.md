---
category: simple melee weapon
cost: 1 sp
damage: 1d4 bludgeoning
weight: 2 lb
properties: [light]
attack: "str-mod + proficiency * max(has(weapon-proficiencies, simple weapons), has(weapon-proficiencies, Club), has(weapon-proficiencies, clubs)) + bonus"
damage-roll: "1d4 + str-mod + bonus + 2 * has(fighting-styles, Dueling) * max(0, 2 - count(equipped, category = simple melee weapon) - count(equipped, category = martial melee weapon) - count(equipped, category = simple ranged weapon) - count(equipped, category = martial ranged weapon)) bludgeoning"
---
