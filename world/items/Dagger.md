---
category: simple melee weapon
cost: 2 gp
damage: 1d4 piercing
weight: 1 lb
properties: [finesse, light, thrown (range 20/60)]
attack: "max(str-mod, dex-mod) + proficiency * max(has(weapon-proficiencies, simple weapons), has(weapon-proficiencies, Dagger), has(weapon-proficiencies, daggers)) + bonus"
damage-roll: "1d4 + max(str-mod, dex-mod) + bonus + 2 * has(fighting-styles, Dueling) * max(0, 2 - count(equipped, category = simple melee weapon) - count(equipped, category = martial melee weapon) - count(equipped, category = simple ranged weapon) - count(equipped, category = martial ranged weapon)) piercing"
---
