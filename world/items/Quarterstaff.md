---
category: simple melee weapon
cost: 2 sp
damage: 1d6 bludgeoning
weight: 4 lb
properties: [versatile (1d8)]
bonus: 0
attack: "best(str-mod, dex-mod / has(features, Martial Arts)) + proficiency * max(has(weapon-proficiencies, simple weapons), has(weapon-proficiencies, Quarterstaff), has(weapon-proficiencies, quarterstaffs)) + bonus"
damage-roll: "dice(1d6, martial-arts) + best(str-mod, dex-mod / has(features, Martial Arts)) + bonus + 2 * has(fighting-styles, Dueling) bludgeoning"
---
