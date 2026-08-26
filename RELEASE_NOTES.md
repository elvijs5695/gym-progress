# Release notes

## PWA v1.4.1 — optional Friends / social layer

- Added an optional **Friends** tab while keeping IndexedDB training data local and independent from the account.
- Passwordless e-mail OTP sign-in through Supabase.
- Exact-email friend lookup, mutual friend requests, incoming-request handling and an unread attention dot. Friend requests and acceptances create durable social notifications; the PWA shows browser notifications while it is open/active when permission is granted.
- Accepted friends are listed explicitly and can be removed for both users with one mutual-friendship action.
- Common 30-day timeline for you and friends plus an activity feed loaded 20 records at a time as you scroll.
- Finish & Save now shows shareable summary/record cards instead of the former portrait congratulations screen. All cards start private; publishing is explicit and per-card, and the optional comment field appears only on selected cards.
- Weight and same-weight rep records are calculated locally from prior completed working sets before any sharing occurs.
- Own social records can be deleted without changing local workout history; own timeline dots can be opened and deleted.
- Social effort values are language-neutral in the backend and rendered in the viewer's selected language.
- Supabase session state is separate from Gym Progress IndexedDB backups.
- Removed the obsolete completion portrait from the PWA application shell.

## PWA v1.3.1

- Future-session reduced-weight advice is editable before applying, with equipment-aware +/- steps.
- Interactive +/- weight controls retain fixed two-decimal values; static weight data removes unnecessary trailing zeroes without hiding meaningful 0.25/0.5 kg values.
- Manual redesigned as a shorter text-only guide. Scheduling, language, and data/backups are separate sections.

## PWA v1.3.0

Architecture-hardening release: reduced duplicated live work, documented cross-platform behaviour contract and executable source validation.

### v1.4.1 social/workout UX refinement
- Compact Friends header/profile controls, highlighted friend-request cards, and a collapsible Friends list.
- Timeline starts at the first shared workout when social history is younger than 30 days; dots are visual-only and no longer inherit button sizing.
- Exercise-record-only shares still create a workout timeline dot; comments remain optional.
- Share selection uses a minimal tick control and share drafts survive background badge refreshes.
- Fixed the deterministic last-set Skip set transition so the next exercise/rest/stretch screen renders immediately.
- PWA buttons are slightly lighter and better spaced; delete actions use a simple × icon.
- Progress chart colour transitions are sharper and concentrated around the midpoint of each segment.
