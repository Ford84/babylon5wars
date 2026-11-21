# Stage 1 implementation and validation

Implemented: Cloudflare Worker API, D1 migrations, PBKDF2 password hashing, rate-limited login attempts, bearer sessions, private games, single-use invitations, 23 phase placeholders, basic ship creation, order commitment, event feed, JSON export and a React hex-map UI.

Not yet validated: production deployment, real D1 concurrency, browser integration with two separate users, full game rules, security review and R2 upload/download. The frontend is illustrative and does not enforce tactical movement or weapon rules.

Build and test using GitHub Actions. The deployment workflow is manual. Do not deploy until build succeeds and remote schema compatibility is checked.