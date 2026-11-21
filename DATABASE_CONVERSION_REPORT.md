# Gym Progress 2.0.0 — production data conversion and cutover review

## Result

The supplied original database dump was reconverted without dropping or rewriting original source values. All **2,511 rows across 14 app tables**, **21,059 source-column values**, **1,543 canonical training records**, and **25,048 training-payload leaves** reconcile with zero payload mismatches. The production SQL also rechecks the complete imported values inside the transaction before commit.

The uploaded `GymProgress_backup(1).dump` is byte-for-byte identical to the earlier original dump. Its snapshot is **21 November 2026, 15:37:18 EET**. Source SHA-256: `ef7b1e3f7240c67e342e067543e8772ab99ba41114480125be4d297b0e78e9c9`.

The migration does not assume this is still the current live dataset. It checks every live row against this snapshot under table locks. New, missing or modified data stops the replacement before anything commits. A newly generated source dump is required if that check fails.

## What survives

The converted current view contains 59 workout sessions, 265 session-exercise records, 785 performed sets, 15 programme days, 62 programme exercise occurrences, 53 user exercises, 13 current Tracker items and 13 current Tracker states. Original tombstones, duplicate-source variants and unresolved records also remain in canonical data and the exact source archive.

The catalogue retains all 205 exercises, 410 EN/LV translation rows, 90 aliases, 50 substitution relationships and 34 families. **All 347 explicit canonical exercise links resolve to the original catalogue.** No exercise names were used to invent an identity or rewrite a relationship. User exercise names and original workout snapshots survive as entered; translated display names are a presentation choice for linked catalogue records.

The import also retains 57 shared activity records, 16 comparison points, two friendship rows, 98 social notifications and all three profile/social-state rows. The third, currently inactive profile is retained alongside the two active users.

## Items requiring attention

| Source finding | User-visible implication | Handling |
|---|---|---|
| One live session-exercise record belongs to a deleted workout; three performed sets depend on that exercise. | Four records cannot safely appear as a normal complete workout. | All four are preserved and flagged for data review; the migration does not recreate a deleted workout or assign the exercise elsewhere. |
| Five current Tracker item IDs each have several older cloud UUID variants. | An unreconciled import would display duplicate Tracker items. | 35 older item variants become explicit view aliases, with their original payloads retained. |
| Three identical Tracker-state pairs use different source UUIDs. | Duplicate current-state entries would be redundant. | Three additional view aliases retain both originals; 38 total aliases are preserved. |
| Device preferences and unsynchronised runtime are not present in the public database dump. | A fresh production installation can use default local display/sound preferences. | No unavailable device state is invented. This release relies on the stated synchronised original data; any newer local-only or beta-only work needs a separate export. |
| The supplied dump predates the final cutover. | Work done later could otherwise be overwritten by the old snapshot. | Exact live-data preflight refuses to continue if anything differs. |

## Existing accounts and new email-code accounts

The cutover preserves live `auth.users`, `auth.identities`, account credentials and all Supabase-managed schemas. It verifies that every original profile UUID exists in Auth and binds the v2 workspace to that **same UUID**. Auth rows and identities are fingerprinted before and after migration to verify that the transaction did not change them.

The normal production app uses the original email-code login. After verification, `gp_v2_ensure_workspace()` returns an existing workspace or creates one for only the authenticated caller's own UUID. It accepts no account/owner arguments, uses a transaction advisory lock for simultaneous first logins, and rejects conflicting ownership. It does not match users by name or email, claim guest records, or carry beta accounts into production.

## Replacement and recovery design

The user-facing upgrade is one Windows command in the private package. It creates a fresh verified backup of `public` and `auth`, then checks, replaces, imports and verifies. The private SQL uses one transaction. It moves known original app tables/functions into `gp_v1_backup_20261121`, installs the same schema shipped in the source package, imports the converted records and binds the original accounts.

It never drops `public` or Supabase-managed schemas. Source function bodies are not executed from the dump during production promotion; existing app functions are retained privately and replaced by reviewed definitions. Unexpected application objects, changed function bodies, external foreign keys or dependent views stop the migration. Extension-owned public objects are left untouched.

The archive schema is inaccessible to app roles. Original app grants are saved for a permitted rollback, old-client table grants are revoked, and an archive write trigger blocks stale table writes. Private RPCs require the protocol-2 client marker in addition to verified authentication and RLS. The marker is a version compatibility check, not a secret or an authorisation mechanism.

A rollback is permitted only before new app data has changed. It restores the original tables, grants and trigger bindings, while preserving the converted generation in separate private retired schemas. Once v2 data changes, automatic rollback refuses instead of hiding that data. Downloaded backups remain private and are never deployed with the app.

A subsequent explicit history/account erasure also removes the same owner's matching records from the app-managed rollback snapshot, in addition to current/history/source data. Independent downloaded backups are controlled by the holder's retention policy.

## Executed verification

- **40 standard SQL checks** for schema installation, RLS, conditional updates, replay idempotency, pagination, epoch barriers, social sharing, friend removal and explicit erasure.
- **51 checks in the expanded source-data run**, including those standard checks plus reconciliation of all original source fields, raw COPY hashes, canonical payloads/timestamps/revisions, relational set values, all aliases, owner isolation and multi-page history retrieval.
- **41 separate production-cutover checks**, covering changed-source rejection, unknown schema/function rejection, external dependency rejection, failure after import with full transaction rollback, successful migration, unchanged Auth accounts, extension-owned objects, immediate rollback, repeat-run rejection, existing/new account bootstrap, public EN/LV catalogue refresh, all 347 catalogue links, stale-client fencing, inaccessible private archives, cardio effort sharing, erasure and cross-owner preservation.

These tests ran in isolated PostgreSQL through PGlite, using the actual supplied training snapshot and synthetic Auth accounts. They do not claim a live Supabase deployment, actual code-email delivery, real concurrent HTTP sessions or a Windows PowerShell execution. The release's live acceptance check must still cover the original users signing in and viewing their histories after the guarded cutover.

## Required deployment order

1. Close all installed clients and stop recording new data during the cutover.
2. Run the private database upgrade; require the commit receipt and verified counts **2511 / 1543 / 3 / 1**.
3. Deploy the production PWA to the existing production repository and apply its update.
4. Verify email-code login, histories, programme, Tracker and sharing for both active accounts.
5. Keep Android v1 closed until the matching Android v2 is installed. Future builds must preserve the same functional and visual release contract.

Primary references: [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html), [Supabase backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Supabase migration deployment](https://supabase.com/docs/guides/deployment/database-migrations).
