# Gym Progress 2.0.0 — install the production PWA

This is the complete **ready-built website**. It connects to the original Supabase project and uses email-code login. You do not need Node, a new repository or separate patch files to publish it.

## 1. Upgrade the original database

Close both users' PWA/browser windows and Android v1. Extract the separate **PRIVATE-Database-Upgrade** ZIP into its own folder, open that folder in Terminal and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Run-Database-Upgrade.ps1 -Action Migrate
```

Use the original Supabase database password when prompted. The runner creates a fresh backup, checks the live database against your supplied dump, performs the conversion in one transaction and verifies it. Require **PRODUCTION MIGRATION COMMITTED** and counts **2511 / 1543 / 3 / 1**. If the snapshot check fails, stop and obtain a new dump; do not clear tables to bypass it. Existing Auth accounts are kept.

The supplied dump is dated **21 November 2026, 15:37:18 EET**. It is identical to your earlier dump. Full findings and rollback instructions are inside the private package. Never upload that package, its SQL or its backups to GitHub.

## 2. Publish in the existing gym-progress repository

Extract this PWA ZIP and upload its **contents** into **elvijs5695/gym-progress**, replacing the website files. `index.html`, `app.js`, `sw.js`, `release.json`, `icons/` and `vendor/` must be at the repository root. Upload every file and both asset folders, not just index.html. The original connection is already configured.

Choose **Settings → Pages → Deploy from a branch → main → /(root) → Save**. Use the branch containing the files if its name differs. Disable obsolete custom Pages deployment workflows so they cannot publish a different folder. You do not need another GitHub project.

Wait for Pages deployment to finish, then open:

**https://elvijs5695.github.io/gym-progress/**

For an already-installed old PWA, make one online visit, close every app window/tab and reopen it. On v2 use **Settings → Apply update** if an update is waiting. Do not clear browser storage. Confirm **v2.0.0**.

## 3. Check both original accounts

Sign in by email code. In the first sync review select **Programme, Workout log and Tracker** to retrieve the converted data. Check both users' history, programme, Tracker and friends before recording new workouts. Use the PWA for both accounts until Android v2 is ready; Android v1's old writer is blocked and its new offline entries will not automatically enter v2.

If the original Supabase email template sends a link instead of a code, include `{{ .Token }}` in **Authentication → Email Templates → Magic Link**. No replacement accounts are needed. Code delivery and installed-device behaviour still require your live check.

## Included release documents

- `WHATS_NEW.md`: concise EN/LV changes.
- `RELEASE_CONTRACT.md` and `AGENTS.md`: required future release/development rules.
- `PLATFORM_PARITY_CHECKLIST.md`: PWA and Android must match functions and visual UI; Android is not yet built.
- `TEST_RESULTS.md`: exact automated results and remaining device/live checks.
- `DATABASE_CONVERSION_REPORT.md`: original-data reconciliation and preserved red flags, with no private user records.

For development, use the separate **Source** ZIP and its README. Source deployment uses GitHub Actions to build/publish `dist/`; do not mix that layout with this branch-root option. The source workflow uploads the Pages artifact before its dependent deploy job. It never runs database migrations.

References: [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [Supabase email-code login](https://supabase.com/docs/guides/auth/auth-email-passwordless).
