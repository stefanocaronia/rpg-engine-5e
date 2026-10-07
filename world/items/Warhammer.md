---
category: martial melee weapon
cost: 15 gp
damage: 1d8 bludgeoning
weight: 2 lb
properties: [versatile (1d10)]
attack: "str-mod + proficiency * max(has(weapon-proficiencies, martial weapons), has(weapon-proficiencies, Warhammer), has(weapon-proficiencies, warhammers)) + bonus"
damage-roll: "1d8 + str-mod + bonus + 2 * has(fighting-styles, Dueling) * max(0, 2 - count(equipped, category = simple melee weapon) - count(equipped, category = martial melee weapon) - count(equipped, category = simple ranged weapon) - count(equipped, category = martial ranged weapon)) bludgeoning"
---
