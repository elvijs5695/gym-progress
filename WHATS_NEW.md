# What’s new — Gym Progress 2.1.0

## English

**Privacy and reliability.** Strength comparison is now an **explicit account-level opt-in**. It starts OFF, and switching it OFF withdraws currently published comparison points immediately. The server prevents older clients from bypassing this setting. Sharing again rebuilds points using stable cloud workout IDs; both friends must opt in.

**Workout correctness.** A manually entered **0 kg** is not replaced by a planned value. Workout-step Undo/Redo now includes supported ramp-up/rest/working-set transitions, uses bounded session-only history and never rewinds the overall workout timer. Tracker items with history are archived instead of orphaning earlier entries. Server validation and required-parent checks are stricter.

**Performance and presentation.** Repeated metrics-cache scans are reduced. Cardio Log summaries are arranged into four equal-width metrics slots with the same metric typography as Strength. Catalogue updates validate related references before replacing the live catalogue.

**Database.** One controlled, transactional migration introduces consent and integrity rules. It preserves current training data and Supabase authentication; old comparison points go to a private restricted archive rather than being treated as live shared data. **Migration is required before deploying the app.**

## Latviski

**Privātums un uzticamība.** Spēka rezultātu salīdzināšana tagad ir **brīvprātīga izvēle konta līmenī**. Sākotnēji tā ir izslēgta; izslēdzot jau kopīgotie salīdzinājuma dati tiek tūlīt atsaukti. Serveris neļauj vecākām lietotnes versijām šo izvēli apiet. Atkārtoti ieslēdzot, dati tiek atjaunoti ar stabilām mākoņa treniņu identitātēm; salīdzināšanai jāpiekrīt abiem draugiem.

**Treniņa datu pareizība.** Manuāli ievadīts **0 kg** netiek aizstāts ar plānoto svaru. Atbalstītajos iesildīšanās, atpūtas un darba piegājienu posmos pieejama darbību atsaukšana/atjaunošana, nemainot kopējo treniņa laiku. Tracker vienumi ar vēsturi tiek arhivēti, nevis atstāti bez sasaistes. Stingrāka datu pārbaude.

**Veiktspēja un saskarne.** Samazināti lieki atkārtoti rādītāju aprēķini. Kardio rādītāji treniņu žurnālā izkārtoti četrās vienāda platuma kolonnās. Kataloga izmaiņas tiek pārbaudītas pirms ievietošanas.

**Datu bāze.** Nepieciešama viena kontrolēta migrācija pirms PWA izvietošanas. Treniņu vēsture un Supabase autentifikācija netiek pārrakstīta; iepriekš kopīgotie salīdzinājuma dati tiek saglabāti ierobežotas piekļuves arhīvā.

## Known boundaries

This is a stabilisation update, **not** a full controller rewrite or legacy-table purge. Ramp/rest Undo history lives only in current session memory. SQL migration, actual Windows installer, real browser geometry and Android parity still require device/project acceptance; see the test report.
