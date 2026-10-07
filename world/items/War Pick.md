---
category: martial melee weapon
cost: 5 gp
damage: 1d8 piercing
weight: 2 lb
attack: "str-mod + proficiency * max(has(weapon-proficiencies, martial weapons), has(weapon-proficiencies, War Pick), has(weapon-proficiencies, war picks)) + bonus"
damage-roll: "1d8 + str-mod + bonus + 2 * has(fighting-styles, Dueling) * max(0, 2 - count(equipped, category = simple melee weapon) - count(equipped, category = martial melee weapon) - count(equipped, category = simple ranged weapon) - count(equipped, category = martial ranged weapon)) piercing"
---
