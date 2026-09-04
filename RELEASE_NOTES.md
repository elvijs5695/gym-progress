# Gym Progress PWA v1.6.1 — 2026-09-05

## Account UX
- Account/login is now app-level rather than owned by Friends.
- A persistent account/login control is available across normal app sections; active-workout full-screen flow stays uncluttered.
- Settings places Account immediately after Language and is the canonical place for login/logout, name, sync and deletion controls.
- Friends no longer contains Edit name or Sign out when authenticated; `+ Add friend` occupies the right-side action position.
- Signed-out Friends shows only a login suggestion because social features require the account.

## Sync onboarding and dialog
- Users who were already signed in before updating are offered the same sync review on first post-update refresh/open; logout/login is not required.
- Cloud/local differences are formatted as vertical bullet lists.
- Programme, Workout history and Tracker selection uses aligned toggle rows rather than loose checkboxes.
- Existing automatic sync triggers remain active after consent.

## Progression and trend explanation
- What’s New and the Manual now explain the principle behind PROGRESS/HOLD/REDUCE: they are immediate next-exposure recommendations, not a rating.
- Trend labels are explicitly presented as a separate longer-term layer compared with the user’s own recent exercise-exposure pattern.
- Calibrating, Rapid progression, On track, Progression approaching, Slower than usual, Stalled and Declining receive plain-language definitions.
- Workout-wide Normal/Watch/Fatigue suspected/Deload candidate is explained as cautious multi-exercise pattern detection, not diagnosis.

## Cloud-aware destructive controls
- Erase exercise log data now removes synced workout-history data and derived shared/progress records before erasing the local history.
- Erase all training data now removes Programme/Workout history/Tracker from cloud and local storage while keeping the account/social identity.
- Delete account is available from Account and uses a two-stage destructive warning. It deletes the authentication account and all database data owned by it, then clears the local training copy.
- Destructive warnings are visually bold.
- If cloud deletion fails, local data is deliberately not erased.

## Database
**Manual Supabase action required.** Run `supabase/SUPABASE_ACCOUNT_DATA_CONTROL_UPDATE_1.5.1_1.6.1.sql` after the previous social/training-sync migrations. PWA IndexedDB requires no manual schema action.
