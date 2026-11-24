# Babylon 5 Wars

Multiplayer Vorchan ship duels using React, a Cloudflare Worker and D1. The current playable scenario is **two corrected Vorchans in clear space**. It automates condition, movement, EW, ship weapons, interception, damage, criticals and end-of-turn upkeep; it does not claim to implement every tabletop scenario or unit type.

## Play

Create a battle, invite a second player, choose starting hexes and facings, assign the two ships and start. The six phases show decisions the engine can apply: ship power, initiative, electronic warfare, movement, weapon orders, defence and damage. Dice and results come from the server. Empty defence steps and actions unavailable because of damage advance automatically.

Open either ship’s live SCS to inspect recorded damage. EW and weapon commitments stay private until both players lock. Reloading preserves dice, damage choices and criticals. Start a **new battle** for these rules: earlier battles retain their existing records and are not silently converted.

Scenario limits and the explicit interpretation of the printed weapon-critical chart’s missing result 13 are documented in [Automated Vorchan Battle](docs/AUTOMATED_VORCHAN_BATTLE.md).

## Build and test

```sh
npm install
npm test
npm run build
```

Node 22.13 or newer is required for the SQLite-backed API integration tests and local preview. `npm run dev` serves the real Worker API and frontend using an ignored, local SQLite database. No Cloudflare credentials are required for preview.

## Deployment

GitHub Actions runs tests and builds on pull requests. The `Deploy to Cloudflare` workflow applies pending D1 migrations and deploys on application changes merged into `main`. Repository Actions secrets provide `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; never commit credentials.

The Worker is `babylon5wars`, D1 is `b5w-private`, and R2 is `b5w-ship-images`. The authoritative snapshot and its revision, ship mirrors and event journal are committed in one database transaction.

## Public ship model and presentation

The selected Attack Cruiser RC2 STL is credited to Tyrel Lohr with its original [Cults3D listing](https://cults3d.com/en/3d-model/game/centauri-vorchan-attack-cruiser). Public assets are in `public/models/vorchan/`. The shared board size and model are saved at setup; 2D/3D preference and optional local STL overrides remain browser preferences.

City is the interface font and Babylon 5 supplies headings. The SCS uses the original, non-inverted component diagram and a live overlay for the 281 verified damage boxes. Weapon mounts and a collapsible condition register remain available without exposing manual ruling forms.

Older milestone documents describe historical implementations. The automated-battle document above is the current source of truth for gameplay scope.
