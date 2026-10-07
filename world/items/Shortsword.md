---
category: martial melee weapon
cost: 10 gp
damage: 1d6 piercing
weight: 2 lb
properties: [finesse, light]
bonus: 0
attack: "max(str-mod, dex-mod) + proficiency * max(has(weapon-proficiencies, martial weapons), has(weapon-proficiencies, Shortsword), has(weapon-proficiencies, shortswords)) + bonus"
damage-roll: "dice(1d6, martial-arts) + max(str-mod, dex-mod) + bonus + 2 * has(fighting-styles, Dueling) piercing"
---
