# v1.4.5 validation additions

- Static validation checks the v1.4.5 marker.
- Checks optimistic deletion structure: pending-delete guard, immediate local feed removal, asynchronous Supabase delete, and no full `enterFriends()` reload in the delete path.
- Checks the new inline vector main-navigation icon helper.
- Checks the Android-parity chart blend fraction and breakpoint join output.

# v1.4.4 validation additions

- Friends are de-duplicated by user_id before rendering/counting.
- Header uses a two-row aligned layout.
- Disclosure chevron uses a fixed-size SVG and only rotates.
- Shared rhythm keeps an 8px visual gap after the Friends control/list.

# Gym Progress PWA v1.4.1 — validation record


## v1.4.1 optional Friends/social layer

- JavaScript syntax validation passed for all `.js`/`.mjs` files.
- PWA shell validation passed with `social-api.js` and `social-config.js` included in the service-worker application shell.
- Social authentication/session state is kept separate from IndexedDB workout backups.
- Only the Supabase project URL + publishable client key are bundled; no secret/service-role credential is present.
- Exact-email lookup, mutual friendship, incoming requests, remove-for-both, 20-record cursor feed, common timeline, own-post deletion and unseen badge paths were source-checked.
- Durable request/acceptance notifications are polled about once per minute while the PWA is open/visible; browser notifications are shown when permission is available.
- A fully closed static GitHub Pages PWA cannot receive true background Web Push in this release. Durable unread state is shown on next open.
- Share comments are rendered only for cards whose Share toggle is selected.
- `SUPABASE_SOCIAL_SETUP.sql` in the PWA package was byte-compared with the root release SQL.

### Remaining browser/backend validation

Real OTP/SMTP delivery, two-account friendship, notification-permission behaviour and deployed GitHub Pages service-worker update behaviour require the user's live Supabase/browser environment.

## v1.4.4 timeline/friends checks
- Full shared history is requested from the social timeline RPC.
- Shared rhythm binds pointer pan + pinch zoom and keeps a 1-day to 100-year practical viewport.
- Friend names expand inside one Friends panel with 2 px row spacing and a distinct expanded surface.
