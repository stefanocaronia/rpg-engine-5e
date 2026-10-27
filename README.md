# The 5e system

A game system for [RPG Engine](https://github.com/stefanocaronia/rpg-engine), compatible with fifth edition, from the System Reference Document 5.1: its rules as chapters the master looks up, its creatures, items, spells, classes, races and backgrounds as pages, and the numbers of a character's sheet worked out from them, as the abilities, the proficiency bonus, the saves and skills, the hit points, the spell slots and the uses of features that the rests bring back. The master rules with the exact text at hand; the engine keeps the sheet. On the dashboard it adds the death saves, the panel of a character at 0 hit points and the card of the hit dice in a short rest.

This package works only inside [RPG Engine](https://github.com/stefanocaronia/rpg-engine): it is a game system the engine installs on this computer for a campaign, not a library of its own.

## Install

With RPG Engine 0.6.0 or later: the master offers it when a campaign is set up, or `rpg package install 5e`; then `rpg config system 5e` in the campaign. A campaign keeps its system once its first character is made.

## Versions of the rules

The rules of the SRD 5.1 are the version `srd-5.1`, and for now the only one. Each version is a folder in `versions/`, read over the common part; a campaign plays the one its `ruleset` setting names, which the player chooses.

## Develop and test

You need Node 22.4 or later, and the engine for its test kit, `rpg-engine/testing`:

```sh
npm install
npm test
```

`npm test` builds `dist/` first: the kit runs the system as the engine installs it, and its campaigns play this folder (`systems: ["."]`), not a copy the engine brings. To test against an engine you are changing, link it: `npm link` in the engine's folder, then `npm link rpg-engine` here; or keep the engine beside this repository and run `npm run test:downstream` from it, which builds the engine and runs these tests against it. `npm run lint` checks the types. `build/` holds the scripts that wrote the pages from the SRD's PDF, which is not here; they are not published.

## Publish

Raise `version` in `package.json`, commit, and push a tag `v<version>`: the workflow `publish.yml` checks, builds, tests and publishes to npm with Trusted Publishing, from the environment `release`.

## Licence

The material from the SRD 5.1 and our changes to it, the words in every language included, are under CC BY 4.0; the icons from game-icons.net under CC BY 3.0; the code and the instructions under MIT. See [LICENSE.md](LICENSE.md) for the attribution, what was changed, and the MIT license's text. This package is compatible with fifth edition.
