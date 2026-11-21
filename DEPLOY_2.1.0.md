# Gym Progress 2.1.0 — PWA deploy instructions

DO NOT DEPLOY THIS PWA UNTIL THE MATCHING 2.1.0 DATABASE MIGRATION PASSES CHECK, THE AUTOMATIC TRANSACTION-ROLLBACK REHEARSAL, MIGRATE AND VERIFY. The old PWA is not compatible with the new comparison publication protocol.

1. Download and extract GymProgress-2.1.0-Database-Upgrade.zip into a new private folder in Downloads. Read START_HERE.md. Stop both accounts' old clients and Android.
2. From the extracted database folder run the Windows PowerShell command in START_HERE.md: -Action Check, then -Action Migrate (which backs up EVERYTHING, rehearses via ROLLBACK and asks for MIGRATE), then -Action Verify. Do not bypass errors.
3. Extract THIS PWA ZIP. Copy its CONTENTS, not its containing folder, to the root of your existing gym-progress GitHub repository. index.html, app.js, sw.js, release.json, icons/ and vendor/ belong at root. Commit and deploy using GitHub Pages Deploy from branch / main / root. Do not switch to the source Actions workflow without consciously changing the publishing mode.
4. Refresh online, confirm v2.1.0 in Settings, verify programme/log/Tracker on both accounts, test one small sync and Friends. Strength comparison starts OFF for both accounts: opt in from Friends for BOTH users to compare. Disable either and verify withdrawal.
5. Do not clear browser site data. Do not upload the database migration ZIP, private Backups folder or any .dump file to GitHub. Do not use old Android builds.

Release source, feature history, limitations and acceptance: README.md, RELEASE_CONTRACT.md, WHATS_NEW.md, docs/TEST_RESULTS.md in the source ZIP. Live SQL execution and real phone visual/audio tests were not possible in the release environment. Stop on any unexpected migration error.
