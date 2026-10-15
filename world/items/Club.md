---
category: simple melee weapon
cost: 1 sp
damage: 1d4 bludgeoning
weight: 2 lb
properties: [light]
bonus: 0
attack: "best(str-mod, dex-mod / has(features, Martial Arts)) + proficiency * max(has(weapon-proficiencies, simple weapons), has(weapon-proficiencies, Club), has(weapon-proficiencies, clubs)) + bonus"
damage-roll: "dice(1d4, martial-arts) + best(str-mod, dex-mod / has(features, Martial Arts)) + bonus + 2 * has(fighting-styles, Dueling) bludgeoning"
image: "[[wood-club.svg]]"
---
