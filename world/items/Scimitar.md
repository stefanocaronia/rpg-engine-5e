---
category: martial melee weapon
cost: 25 gp
damage: 1d6 slashing
weight: 3 lb
properties: [finesse, light]
attack: "max(str-mod, dex-mod) + proficiency * max(has(weapon-proficiencies, martial weapons), has(weapon-proficiencies, Scimitar), has(weapon-proficiencies, scimitars)) + bonus"
damage-roll: "1d6 + max(str-mod, dex-mod) + bonus + 2 * has(fighting-styles, Dueling) * max(0, 2 - count(equipped, category = simple melee weapon) - count(equipped, category = martial melee weapon) - count(equipped, category = simple ranged weapon) - count(equipped, category = martial ranged weapon)) slashing"
---
