# Gym Progress PWA v1.4.9

## v1.4.9 chart correction

- Fixed the Progress SVG sizing model so its logical viewBox follows the actual responsive card width while keeping the intended 250 px height; this removes the vertical letterboxing that made the plotted chart appear much shorter than its card on phones.
- Volume Y-axis labels now include `kg`, including compact thousands such as `13.9k kg`.
- No IndexedDB schema or Supabase SQL change.

---

# Gym Progress PWA v1.4.7

## v1.4.7 focused fixes

- Fixed the Progress exercise selector losing its backing exercise identity after localisation/rerenders: option values are now explicit and stale selections are revalidated.
- Reworked the last-set 0 RIR setting into a compact right-side toggle with the explanatory copy kept on the left.
- Progress summary labels are larger and sit closer to their values; the chart uses more of the card width with a smaller axis gutter and larger axis text.
- No IndexedDB schema or Supabase SQL change.


- Unified PWA performance evaluation with Android v1.3.7 through matching `performance-rules.json` and `performance-rule-cases.json` files.
- Failure now contributes 0 RIR, remains separately flagged, and affects reductions/failure labels only when the programmed rep/load/RIR capacity was actually missed.
- Added the optional “0 RIR acceptable on the last set” setting, conservative progression parity, bodyweight rep-first Progress, and primary-metric-only failure colouring.
- Fully completed, unskipped exercises from aborted workouts can appear in Progress.
- Kept the OTP dialog outside normal app rerenders, added persistent in-flow notices, exposed Home scheduling even when no date exists, and removed redundant Progress selector labels.
- Added supplied trophy/dumbbell social icons, moved own-post delete to the lower-right, and suppresses blank/`null` comments.
- Smoothed Progress paths, protected SVG stroke thickness, improved chart labels, and tightened equal-height/equal-width control behaviour.
- Service-worker cache updated for v1.4.7 and includes the shared rules files and social artwork.
- No IndexedDB schema or Supabase SQL change. Existing state is normalised with the new setting defaulting to off.

---

# Gym Progress PWA v1.4.5

- Brought PWA social deletion up to Android v1.3.6 behaviour: deleting your own shared card is optimistic, so it disappears from the feed immediately while Supabase deletion continues asynchronously.
- Shared rhythm updates immediately with an optimistic delete and performs a lightweight timeline-only reconciliation after server success; failed deletes restore the card/timeline state and show the existing compact error notice.
- Repeated deletion of the same pending row is guarded, and a pending delete is filtered out if Friends is refreshed before the server request completes.
- Progress chart transitions now match the Android v1.3.6 treatment more closely: 18% bounded colour blends, neutral midpoint colours at trend changes, rounded strokes, and softened breakpoint joins.
- Replaced the PWA bottom-navigation text/Unicode glyphs with a coherent inline vector icon set corresponding to Android's Home, History, Bar chart, Group and Settings navigation language. Icons remain fully offline; no icon font or network dependency was added.
- No IndexedDB schema or Supabase SQL change.

---

# Gym Progress PWA v1.4.4

- Expanded Friends now stay inside one compact card instead of becoming separate friend cards.
- Expanded state gets a subtle background shift so opening/closing the Friends card is visually obvious.
- Friend rows use only a few pixels of vertical spacing, with a small inline Remove action.
- Shared rhythm now supports one-finger horizontal panning and pinch-to-zoom from 1 day out to a practical 100-year window.
- The social timeline loads the complete available shared-history set, so zooming out is no longer capped at 30 days.
- Initial timeline framing remains first shared record to today when history is under 30 days, otherwise 30 days.

- Friends header aligned to card edges: name upper-right, Add friend left, Edit name/Sign out right.
- Friend list count and rendering now use the same de-duplicated accepted-friend set.
- Disclosure chevron is fixed in place and only flips vertically.
- Added a small gap between Friends and Shared rhythm.

# Gym Progress PWA v1.4.2

- Fixed social bulk publishing error `All object keys must match` by normalising every activity row to one complete schema before the Supabase insert.
- Friends header is reduced to the page title plus name, subtle Edit name / Sign out controls, and a compact + Add friend action.
- Friends list expander has a larger touch target and sits tightly against the timeline.
- Share selection uses a clean stroked check icon; comments remain optional and appear only for selected cards.
- Progress chart segment colours now follow geometric trend: rising segments are green and falling segments are red, with a short endpoint transition.
- Shared workout batches create durable `activity_shared` notifications for current friends; multiple cards from one workout produce one notification per friend.

---

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