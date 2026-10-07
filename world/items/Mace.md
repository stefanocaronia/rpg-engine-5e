---
category: simple melee weapon
cost: 5 gp
damage: 1d6 bludgeoning
weight: 4 lb
bonus: 0
attack: "best(str-mod, dex-mod / has(features, Martial Arts)) + proficiency * max(has(weapon-proficiencies, simple weapons), has(weapon-proficiencies, Mace), has(weapon-proficiencies, maces)) + bonus"
damage-roll: "dice(1d6, martial-arts) + best(str-mod, dex-mod / has(features, Martial Arts)) + bonus + 2 * has(fighting-styles, Dueling) bludgeoning"
---
