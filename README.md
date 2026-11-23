# Babylon 5 Wars — Stage 1

Early multiplayer prototype using React, a Cloudflare Worker, D1 database and private R2 ship-image storage. This is **not yet a complete implementation of the tabletop rules**. The live prototype is hosted on Cloudflare; end-to-end multiplayer acceptance checks remain outstanding.

## Build and test

GitHub Actions runs automatically on pushes to main. See the **Build and test** workflow. It installs dependencies, runs the unit tests and builds the Vite frontend.

Local commands:

```sh
npm install
npm test
npm run build
```

The initial repository does not include a lockfile; once generated, commit `package-lock.json` and switch CI from `npm install` to `npm ci`.

## Deployment

The `Deploy to Cloudflare` workflow runs on pushes to `main` that touch application, migration, test or deployment files, and can also be started manually. It builds and runs the test suite, applies pending D1 migrations, then deploys the Worker. In GitHub repository settings, configure Actions secrets `CLOUDFLARE_API_TOKEN` (scoped for Workers deployment) and `CLOUDFLARE_ACCOUNT_ID`. Do not commit credentials.

The Cloudflare Worker is named `babylon5wars`, with D1 `b5w-private` and R2 `b5w-ship-images`. Check the live migration tracker before any manual schema changes.

## Public ship model

The app includes the selected Attack Cruiser RC2 Vorchan STL model supplied by the project owner. The gallery and tactical board credit Tyrel Lohr and link to the original [Cults3D model listing](https://cults3d.com/en/3d-model/game/centauri-vorchan-attack-cruiser). Public model assets are in `public/models/vorchan/`. The viewer uses a restrained, geometry-aligned hull palette instead of projecting a reference image onto the STL. Battle setup saves the shared board size and public model choice; the 2D/3D view preference and optional STL override are local to each browser. Battle hosts can delete their battles from the lobby.

## Interface and SCS reference

City is the primary interface font; Babylon 5 is used for headings. The Vorchan systems view pairs the SCS component diagram with weapon-mount records and a text component register. It is a static reference, not a live damage display. Forward external thruster damage tracks remain unverified and must not be treated as combat-ready.

## Remaining acceptance checks

Test registration, login, invitations, two independent players submitting secret orders, turn advancement, stale and simultaneous submissions, image upload/download, and logout. Review authentication and privacy before inviting friends.

The GitHub repository is currently public; avoid committing copyrighted rulebooks, proprietary ship data, API tokens or personal information. It can be made private once the build is established.
