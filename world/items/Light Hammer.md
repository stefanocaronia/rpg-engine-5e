---
category: simple melee weapon
cost: 2 gp
damage: 1d4 bludgeoning
weight: 2 lb
properties: [light, thrown (range 20/60)]
bonus: 0
attack: "best(str-mod, dex-mod / has(features, Martial Arts)) + proficiency * max(has(weapon-proficiencies, simple weapons), has(weapon-proficiencies, Light Hammer), has(weapon-proficiencies, light hammers)) + bonus"
damage-roll: "dice(1d4, martial-arts) + best(str-mod, dex-mod / has(features, Martial Arts)) + bonus + 2 * has(fighting-styles, Dueling) bludgeoning"
image: "[[claw-hammer.svg]]"
---
