# What’s new — Gym Progress 2.0.1

## English

- **Account restoration:** on sign-in, restore Programme, Workout log and Tracker from the account’s cloud workspace before offering a starter programme. A failed initial synchronisation shows a retry instead of pretending the account is empty.
- **Friends and Progress:** repair Friends comparison when the exercise list is absent; stop unnecessary comparison-history uploads on screen entry. “All days” includes individual recorded exercise occurrences, while programme-day views remain available. Review chronological cycle numbering.
- **Updates:** a verified new release installs automatically when the app is idle. Active workouts, dialogs, unsaved work and other unconfirmed windows continue to block activation for safety.
- **UI:** exercise count and “next” now have a separated, non-orphaning dot; slightly stronger title within unchanged header height; neutral workout/log/progress/shared cards with bold effort labels; unclipped pastel rhythm dots in green/yellow/red. Restore early-finish X placement and improve cardio forms, sharing animation and decimal-dot display.
- **Finishing and logs:** a longer finish effect, clear Strength/Cardio sections on mixed workouts and improved date/name/effort layout. No changes to existing workout records or Supabase schema.

## Latviski

- **Konta datu ielāde:** pēc pieslēgšanās pirms sākuma programmas piedāvāšanas tiek sinhronizēta programma, treniņu žurnāls un Tracker. Ja ielāde neizdodas, ir redzama atkārtošanas iespēja.
- **Draugi un Progress:** labota draugu salīdzināšanas sadaļa un novērsta nevajadzīga salīdzinājumu pārrakstīšana, atverot ekrānu. “Visas dienas” ietver katru reģistrēto vingrinājuma izpildi.
- **Atjauninājumi:** ja nav nepabeigtu darbību, pārbaudīts atjauninājums tiek lietots automātiski. Aktīvs treniņš vai nesaglabāti dati neļauj to piemērot.
- **Saskarne:** atdalīta atstarpe ap punktu starp vingrinājumu skaitu un nākamo treniņu, izteiksmīgāks virsraksts bez augstāka galvenes laukuma, neitrālas kartītes un treknas piepūles atzīmes. Ritma punkti ir pasteļtoņu zaļi/dzelteni/sarkani, bez kontūras un nogriešanas.
- **Treniņš un žurnāls:** precizēta pabeigšanas poga, kardio ievades lauki, kopīgošanas animācija un garāka finiša animācija; skaitļiem lietots punkts kā decimālatdalītājs. Datubāzes shēmas izmaiņu nav.

**Parity rule:** future PWA and Android packages must match functionally and visually. Android 2.0.1 is not yet built or verified.
