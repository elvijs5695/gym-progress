# What’s new — Gym Progress 2.0.3

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

**Parity rule:** future PWA and Android packages must match functionally and visually. Android 2.0.3 is not yet built or verified.

## v2.0.2 UI and reliability corrections

- More compact fixed-height section header. **Add friend** now sits next to the account button in the Friends header; on narrow screens it becomes an accessible `+` control.
- Literal spaces surrounding the Home metadata separator (`6 exercises · next`); reduced space before Workout rotation.
- One shared light/dark effort palette, neutral cards, pastel green/amber/coral/red dots and text. Mixed strength/cardio ratings share **one horizontal line**, with separate colour per modality and no dot separator.
- Compact log metrics and a horizontally accessible single-row cardio metrics/entry layout. Log cards use a normal-weight date, bold workout name and right-aligned effort; bottom padding is reduced without collapsing the card edge.
- Browser notifications use service-worker `showNotification()` with best-effort failure handling; no illegal direct constructor in the Tracker reminder path.
- Added persistent `docs/USER_FEEDBACK_HISTORY.md` and `docs/WISHLIST.md` to protect user-driven features and capture future needs.
- **App-only update:** no SQL migration; production Auth and training records remain unchanged.

**Verification note:** actual browser layout and device notification/update behaviour require user acceptance; Android remains pending.

- **Compact names:** limit new/renamed workout days to 30 characters and custom exercise names to 60. Preserve historical/catalogue names intact; single-line header and list labels ellipsize rather than increase height.

- **Active header:** workout day and elapsed time in row one beside Undo/Redo/Home/Exit; second row displays `1/x · Current exercise`; labels truncate instead of changing header height.
- **Known verification gap:** restoring intermediate ramp-up/rest phases via Undo/Redo still requires separate transition-history tests. Ordinary completed-set Undo/Redo remains present.

- Focused form fields and selection controls now use a quiet existing-border focus state instead of an extra exterior outline; keyboard navigation and error cues remain available.

## v2.0.3 — layout precision (client only)

- Active workout toolbar has its own taller fixed header: left-aligned day and live timer, four complete action icons, and a separately truncated one-line exercise name.
- Removed the decorative heavy top border from the active exercise card.
- Log card heading is `Date · Day name` on row one; modality-labelled effort with **coloured grades only** on row two. Metric section labels are neutral.
- Cardio metrics appear in equal columns, with **Training load** as the shorter label.
- Add friend is in the Friends list card header, including for an empty list, not next to the global account button.
- No database migration. The PWA and Android visual/functionality parity contract remains binding; Android is not yet updated.
