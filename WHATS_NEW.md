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
