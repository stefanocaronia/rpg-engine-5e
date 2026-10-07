---
category: simple melee weapon
cost: 2 sp
damage: 1d6 bludgeoning
weight: 4 lb
properties: [versatile (1d8)]
attack: "str-mod + proficiency * max(has(weapon-proficiencies, simple weapons), has(weapon-proficiencies, Quarterstaff), has(weapon-proficiencies, quarterstaffs)) + bonus"
damage-roll: "1d6 + str-mod + bonus + 2 * has(fighting-styles, Dueling) * max(0, 2 - count(equipped, category = simple melee weapon) - count(equipped, category = martial melee weapon) - count(equipped, category = simple ranged weapon) - count(equipped, category = martial ranged weapon)) bludgeoning"
---
