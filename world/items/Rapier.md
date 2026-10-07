---
category: martial melee weapon
cost: 25 gp
damage: 1d8 piercing
weight: 2 lb
properties: [finesse]
attack: "max(str-mod, dex-mod) + proficiency * max(has(weapon-proficiencies, martial weapons), has(weapon-proficiencies, Rapier), has(weapon-proficiencies, rapiers)) + bonus"
damage-roll: "1d8 + max(str-mod, dex-mod) + bonus + 2 * has(fighting-styles, Dueling) * max(0, 2 - count(equipped, category = simple melee weapon) - count(equipped, category = martial melee weapon) - count(equipped, category = simple ranged weapon) - count(equipped, category = martial ranged weapon)) piercing"
---
