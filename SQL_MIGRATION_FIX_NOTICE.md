# SQL migration correction (1.6.5 / 1.7.5)

This package reissues **only** the Supabase exercise-reference migration.
Application Kotlin/JavaScript code is unchanged from the original 1.6.5 / 1.7.5 release.

The previous migration could produce a foreign-key error for the Air Bike translation (`621d5eb7-3a53-5e65-92fb-761830dd3af6`) when its parent exercise was not present. The revised migration:

1. Adds the category/legacy columns as before.
2. Inserts **all 14 cardio parent exercises first**.
3. Verifies that all 14 parents exist.
4. Inserts translations and aliases by resolving the **actual parent UUID from its exercise key**.
5. Seeds the same **50 substitution relations**, verifies their presence, then exposes the snapshot RPC.

## Apply

- Use the new `SUPABASE_EXERCISE_REFERENCE_CARDIO_UPDATE_1.6.5_1.7.5.sql` in Supabase SQL Editor.
- Paste the complete file and run it in **one execution**. Do not select only individual statements.
- Do not re-run the original uncorrected file or manually disable foreign keys.
- The script is transactional (`BEGIN` / `COMMIT`) and designed to be safely re-runnable.
- After successful execution, run the verification queries shown in the instructions or ask the assistant to review your output.

The specific reason the original Air Bike insert was absent in the user's live database has **not been verified**, because the private database cannot be inspected here. If this revised version reports an error, provide its **first** error and stop before attempting manual repairs.
