# Working on Gym Progress

## Read before changing the app

Read `RELEASE_CONTRACT.md`, `docs/USER_FEEDBACK_HISTORY.md`, `docs/WISHLIST.md`, `docs/PLATFORM_PARITY_CHECKLIST.md` and the relevant architecture/calculation/security documentation. The release contract records user requirements; explicit later user instructions govern scope. Do not introduce extra approval steps for work already authorised.

## Shared implementation

- Treat `pwa/` as the common application implementation. The future Android app must reuse its behaviour and visual UI, with isolated OS adapters where necessary. Do not create separate copies of calculations, screen markup, style tokens or translations for Android.
- Change domain behaviour in the owning module, then exercise the shared cases in `shared-contracts/` and relevant workflow tests. Keep exact manual values, cardio/strength distinctions and stable exercise/account identities.
- Use the shared components, typography roles and design tokens. Audit light/dark, EN/LV, narrow screens, disabled/selected/error states and reduced motion for changed UI. Preserve user-authored text.
- Keep Home/section navigation, timers, draft capture and Undo/Redo safe across asynchronous work and account changes. Do not fix a presentation problem by discarding state or weakening ownership checks.

## Data and production boundaries

Never put private training/Auth dumps, converted personal SQL, passwords, service-role keys or tokens in this repository or `dist/`. Client publishable configuration belongs in the documented production configuration path. Do not reintroduce beta project controls or authentication bypasses.

Use disposable local test databases for development. A production migration must satisfy the release contract's backup, freshness, identity, transaction, verification and rollback requirements. Preserve Auth/platform schemas and unresolved records. Never use a schema reset, local-storage wipe or force overwrite to hide a migration/sync conflict.

## Verification and delivery

Use the Node version required by `package.json` (currently Node 24+). Run focused tests while implementing; use `npm run check` for the final application gate. Run the applicable private conversion/database checks when changing migration behaviour, keeping private fixtures outside the repository. Build the web artifact with the provided build script; publish its output, not unbuilt source files or private migration folders.

Update release notes, conversion findings and the parity checklist with actual evidence. State what changed, why, which build was tested and what remains pending. Do not claim live Supabase, browser, phone or Android verification from static inspection or synthetic DOM tests. Android remains unbuilt and uncertified until its matching-source package and real-device parity checks are completed.
