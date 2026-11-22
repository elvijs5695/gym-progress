# Gym Progress 2.2.3 — shared UI polish and safe startup updates

- Tracker amount changes now animate the fill using compositor transforms instead of width/layout recalculation. Rapid +/- taps stay smooth; reduced-motion still disables the effect.
- Completed and skipped statuses in the rest-day exercise list use minimal SVG marks and the same pastel green/red tokens as the active pulsing marker.
- Progress has a searchable, in-app exercise picker with complete movement names and clear programme-day context. Long names truncate only in the collapsed trigger; the list shows them without native system-menu scaling. Short form selectors keep accessible native semantics, with consistent dropdown styling.
- Under the Progress chart, a single compact observational status reuses the existing personalised trend analysis. Low-confidence/insufficient-history results show “Calibrating”, not a fabricated plateau. Cardio does not infer fitness from pace alone.
- Android's “What's new” no longer waits on a browser-only service-worker check. Dialog focus moves to the dialog itself rather than outlining the heading.
- On a PWA refresh, transient account bootstrap/synchronisation no longer consumes the automatic-update intent. A workout, pending upload or unsaved edit still prevents a silent version switch; a safe later update can be accepted via the main-tab notice.
- Log cards do not claim ramp-up was skipped if no ramp-up plan existed. An explicitly skipped planned ramp-up is still labelled.
- No account schema migration or training-data conversion was added by 2.2.3. The 2.2.2 unique-username SQL migration remains required if not yet applied.

**Source-tested, not phone/Firefox certified.** Android still packages the same compiled visual UI with native audio and reminder services; Android APK and device tests are not included.

---

# Gym Progress 2.2.2 — exercise history, privacy, audio and Settings

- Private Friends discovery through unique public usernames instead of email; a Supabase migration is required. Existing display names are preserved.
- Past workout identity and measurements remain unchanged when relinking exercises to catalogue movements for the future.
- Partial volume progress comparison now uses matching, measurable strength exercises after programme changes.
- Settings reorganised into topical cards; new configurable workout cues, distinct warm-up sound, exercise-level minute reminder, foreground iOS audio unlock/test.
- Android workout cues use media audio routing without focus requests; nonworkout notifications stay silent, workout notification shows rest countdown. Hardware/Spotify compatibility requires device tests.
- Rest screen: daily exercise status list; completed/skipped/active/upcoming indicators; superset preview of both exercises and set number; automatic post-rest warm-up.
- Tracker progress transition smoothed; additional LV/EN labels updated.

# Gym Progress 2.2.1 — Android cue and workout UI correction

- Skipping an exercise now offers the standard rest screen before the next exercise or stretching. Rest uses the planned duration, or an optional 60 seconds when none was configured; **Skip rest** and ±30 seconds remain available. Skipping another exercise while already resting does not restart the countdown.

- Removed top-right Home button from active workout (both PWA and Android; bottom navigation unchanged).
- Removed individual native rest/timed completion notifications; Android shows one silent ongoing workout-status card instead.
- Android final rest countdown uses one preloaded native SoundPool with three short tones and one long tone and prevents double completion tones during UI phase changes.
- The current exercise now has one reminder beep per minute during SET and while SET/SUPERSET result entry is unfinished, including via OS alarms when Android is locked.
- Clear Android-specific permission reminder in the active workout if required access is missing.

**Source-tested; native APK compilation and real-phone lock-screen delivery remain acceptance blockers.**

---

# Release 2.2.0 — offline ownership, Android-native alerts and guarded updates

- Keep training as **guest offline**; on account sign-in/creation explicitly offer to attach guest training or keep separate. Existing account data is preserved and source guest data is backed up transactionally.
- Logout **warns** that account-owned programme/history/Tracker becomes inaccessible until re-login. Signed-out training is a different guest profile; switching accounts is prohibited mid-workout.
- Friends opt-out explanation navigates to the **exact Compare exercises Settings card**; social settings are lower priority than workout setup.
- PWA updates only on refresh or explicit Update now, when safe; no version switch mid-workout or while enabled-account uploads are pending. Browser refresh and connectivity changes start sync; cloud dependency issues are preserved for review.
- Android bundles the same PWA UI/logic, but OS-owned alarm receiver, actual WAV sounds, Tracker/motivation alarms, and native permission bridge run independently of the WebView. Settings contains a test-sound action. Obsolete native WebView worker is unregistered without erasing IndexedDB.
- No SQL migration. Android APK native compilation, real device notification/sounds, PWA live deployment and live account reconciliation **remain unverified**.

---

# What’s new — Gym Progress 2.1.4

## English — automatic refresh and recovery

- **Automatic updates:** Normal page load and refresh explicitly check the server for a newer, hash-verified PWA release. Once installed, it activates automatically only if all app windows are idle, no workout/form is active and pending local saves or an in-flight sync have completed. New browser code cannot retroactively change an older cached installation; use the one-time `update-rescue.html` page if v2.1.1 Firefox remains stuck. Never clear browser data to update.
- **Automatic cloud sync:** Each signed-in page load/refresh reconciles all three training domains. The app retries on reconnect, return to the foreground and during periodic checks. User-triggered sync remains available for diagnostics only. Local records, conflicts and unresolved cloud dependencies are preserved.
- **Unresolved related records:** Rechecks earlier cloud changes when a required parent is missing and gives a specific Data review diagnosis; a legitimate orphan is not falsely described as fully synced.
- **Workout priority:** Exercise-comparison sharing moved below Programme, Starter programme and core workout controls, into low-priority Social preferences.

## Latviski — automātiska atjaunināšana un sinhronizācija

- **Automātiski atjauninājumi:** Atverot vai pārlādējot PWA, tiek pārbaudīts jaunāks pārbaudīts laidiens; tas tiek lietots automātiski, ja nav aktīva treniņa, nesaglabātu ievadu vai notiekošas sinhronizācijas. Ja Firefox ar veco 2.1.1 versiju ir iestrēdzis, pēc 2.1.2 izvietošanas vienreiz izmanto `update-rescue.html`; pārlūka datus nedzēst.
- **Automātiska sinhronizācija:** Katru reizi pēc atvēršanas/pārlādēšanas pieslēgtam kontam tiek sinhronizēta programma, treniņu žurnāls un Tracker. Atkārtoti mēģinājumi notiek arī pēc savienojuma atjaunošanas un lietotnes atgriešanās priekšplānā. Konflikti un neatrisinātie ieraksti tiek saglabāti pārskatīšanai.
- **Prioritātes:** Vingrinājumu salīdzināšanas atļauja atrodas zemāk Iestatījumos, aiz galvenajiem treniņa iestatījumiem.

---

# What’s new — Gym Progress 2.1.1

## English

**2.1.1 interface:** In the expanded Friends card, `+ Add friend` is now the final right-aligned item. Manage exercise comparison consent in **Settings**; the Friends comparison card explains the OFF state or offers an exercise/friend when enabled. Workout Log shows average cardio heart rate in column two and RPE in column three.

**Android source candidate:** A native Android host reuses the same PWA frontend and now includes exact, OS-backed workout rest/timed alarm scheduling, locked-screen audio and completion notifications. This is **source implemented, not yet built/device verified**; the user must grant Android notification and exact-alarm permissions. Tracker/motivation reminders are not yet OS scheduled.


**Privacy and reliability.** Strength comparison is now an **explicit account-level opt-in**. It starts OFF, and switching it OFF withdraws currently published comparison points immediately. The server prevents older clients from bypassing this setting. Sharing again rebuilds points using stable cloud workout IDs; both friends must opt in.

**Workout correctness.** A manually entered **0 kg** is not replaced by a planned value. Workout-step Undo/Redo now includes supported ramp-up/rest/working-set transitions, uses bounded session-only history and never rewinds the overall workout timer. Tracker items with history are archived instead of orphaning earlier entries. Server validation and required-parent checks are stricter.

**Performance and presentation.** Repeated metrics-cache scans are reduced. Cardio Log summaries are arranged into four equal-width metrics slots with the same metric typography as Strength. Catalogue updates validate related references before replacing the live catalogue.

**Database.** One controlled, transactional migration introduces consent and integrity rules. It preserves current training data and Supabase authentication; old comparison points go to a private restricted archive rather than being treated as live shared data. **Migration is required before deploying the app.**

## Latviski

**2.1.1 saskarne:** Izvērstajā Draugu kartītē `+ Pievienot draugu` tagad ir pēdējais elements labajā malā. Vingrinājumu salīdzināšanas atļauju pārvalda **Iestatījumos**. Draugu salīdzināšanas kartīte piedāvā paskaidrojumu, ja atļauja ir izslēgta, vai drauga/vingrinājuma izvēli, ja tā ir ieslēgta. Kardio žurnālā vidējais pulss ir otrajā kolonnā, RPE — trešajā.

**Android avota versija:** Android lietotne izmanto šo pašu PWA saskarni; pievienoti Android sistēmas precīzie treniņa signāli, skaņa pie bloķēta ekrāna un paziņojumi. **Kods ir izstrādāts, bet nav apstiprināts ar Android kompilāciju vai ierīces testiem.** Nepieciešamas paziņojumu un precīzo signālu atļaujas.


**Privātums un uzticamība.** Spēka rezultātu salīdzināšana tagad ir **brīvprātīga izvēle konta līmenī**. Sākotnēji tā ir izslēgta; izslēdzot jau kopīgotie salīdzinājuma dati tiek tūlīt atsaukti. Serveris neļauj vecākām lietotnes versijām šo izvēli apiet. Atkārtoti ieslēdzot, dati tiek atjaunoti ar stabilām mākoņa treniņu identitātēm; salīdzināšanai jāpiekrīt abiem draugiem.

**Treniņa datu pareizība.** Manuāli ievadīts **0 kg** netiek aizstāts ar plānoto svaru. Atbalstītajos iesildīšanās, atpūtas un darba piegājienu posmos pieejama darbību atsaukšana/atjaunošana, nemainot kopējo treniņa laiku. Tracker vienumi ar vēsturi tiek arhivēti, nevis atstāti bez sasaistes. Stingrāka datu pārbaude.

**Veiktspēja un saskarne.** Samazināti lieki atkārtoti rādītāju aprēķini. Kardio rādītāji treniņu žurnālā izkārtoti četrās vienāda platuma kolonnās. Kataloga izmaiņas tiek pārbaudītas pirms ievietošanas.

**Datu bāze.** Nepieciešama viena kontrolēta migrācija pirms PWA izvietošanas. Treniņu vēsture un Supabase autentifikācija netiek pārrakstīta; iepriekš kopīgotie salīdzinājuma dati tiek saglabāti ierobežotas piekļuves arhīvā.

## Known boundaries

This is a stabilisation update, **not** a full controller rewrite or legacy-table purge. Ramp/rest Undo history lives only in current session memory. SQL migration, actual Windows installer, real browser geometry and Android parity still require device/project acceptance; see the test report.

### Release 2.1.4 — deployment recovery and build robustness

- Update verification accepts a missing auxiliary deployment-status file if the generated service worker and complete release.json match exactly; mismatched files still fail closed.
- Verified new service workers may activate without manual rescue only when every open app client explicitly confirms that no workout or unsaved activity is in progress.
- Android Studio now assembles from bundled, hash-verified dist/ assets without requiring local Node.js.
- The standalone Android source archive also includes the exact shared frontend build.
- No app UI rescue links and no database migration.

### Release 2.1.3 — update reliability and Android compatibility
- Update checks verify live published `sw.js` bytes against the uncached deployment proof before activating a waiting worker. The normal Settings interface does **not** show a separate update-rescue or verification link.
- The developer-only `repair-213.html` route remains available by direct URL for older Firefox installations; it does not clear workouts or site storage.
- Android Gradle Plugin 9.3.0 supports the developer’s Android Studio 2026.1.3. Android compilation and real-device locked-screen alarms remain unverified.
