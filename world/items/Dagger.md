---
category: simple melee weapon
cost: 2 gp
damage: 1d4 piercing
weight: 1 lb
properties: [finesse, light, thrown (range 20/60)]
bonus: 0
attack: "max(str-mod, dex-mod) + proficiency * max(has(weapon-proficiencies, simple weapons), has(weapon-proficiencies, Dagger), has(weapon-proficiencies, daggers)) + bonus"
damage-roll: "1d4 + max(str-mod, dex-mod) + bonus + 2 * has(fighting-styles, Dueling) piercing"
---
