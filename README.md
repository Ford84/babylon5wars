# Babylon 5 Wars — Stage 1

Early multiplayer prototype using React, a Cloudflare Worker, D1 database and private R2 ship-image storage. This is **not yet a complete implementation of the tabletop rules** and is **not yet deployed or end-to-end verified**.

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

The `Deploy to Cloudflare` workflow is **manual only**. Do not run it until the latest build passes and the D1 schema has been checked against the live database. In GitHub repository settings, configure Actions secrets `CLOUDFLARE_API_TOKEN` (scoped for Workers deployment) and `CLOUDFLARE_ACCOUNT_ID`. Do not commit credentials.

The existing Cloudflare Worker is named `babylon5wars`, with D1 `b5w-private` and R2 `b5w-ship-images`. The remote database was provisioned outside Wrangler's migration tracker; **do not blindly reapply migrations**.

## Remaining acceptance checks

Test registration, login, invitations, two independent players submitting secret orders, turn advancement, stale and simultaneous submissions, image upload/download, and logout. Review authentication and privacy before inviting friends.

The GitHub repository is currently public; avoid committing copyrighted rulebooks, proprietary ship data, API tokens or personal information. It can be made private once the build is established.
