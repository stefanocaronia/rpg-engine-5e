---
category: martial melee weapon
cost: 10 gp
damage: 1d12 piercing
weight: 6 lb
properties: [reach, special]
attack: "str-mod + proficiency * max(has(weapon-proficiencies, martial weapons), has(weapon-proficiencies, Lance), has(weapon-proficiencies, lances)) + bonus"
damage-roll: "1d12 + str-mod + bonus + 2 * has(fighting-styles, Dueling) * max(0, 2 - count(equipped, category = simple melee weapon) - count(equipped, category = martial melee weapon) - count(equipped, category = simple ranged weapon) - count(equipped, category = martial ranged weapon)) piercing"
---

You have disadvantage when you use a lance to attack a target within 5 feet of you. Also, a lance requires two hands to wield when you aren’t mounted.
