# Gym Progress PWA v1.4.0 — validation record


## v1.4.0 optional Friends/social layer

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
