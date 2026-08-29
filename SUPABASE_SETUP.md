# Current release update — Android 1.4.0 / PWA 1.5.0

For an **existing working Gym Progress social backend**, do **not** begin by rerunning the historical social setup/update scripts below. Follow the release procedure in `DEPLOYMENT_1.4.0.md` / `DEPLOYMENT_1.5.0.md` instead:

1. back up local user JSON data and Supabase;
2. run `supabase/SUPABASE_PRE_MIGRATION_CHECK.sql`;
3. run `supabase/SUPABASE_EXERCISE_CATALOGUE_AND_COMPARISON.sql`;
4. run `supabase/SUPABASE_POST_MIGRATION_VERIFY.sql`;
5. then deploy/update the clients.

The catalogue migration is additive and intentionally preserves the existing social tables because they remain used. It adds the canonical catalogue and e1RM comparison infrastructure, including an atomic derived-history replacement RPC so programme comparison opt-ins and canonical link/unlink changes apply retroactively.

---

# Gym Progress — Supabase social setup

Project ref used by this release: `wnnmhdodaxzeeqlexibo`

The social layer is optional. Gym Progress remains local-first: programme, active workout, logs, progress and training backups stay in Room/IndexedDB. Supabase stores only account/friendship information, friend notifications and cards the user explicitly chooses to share.

## 0. Security first

The database password was pasted into a chat message. Treat it as exposed and rotate it in Supabase **Project Settings → Database → Database password** before using the project with real users.

Do **not** place the database password, a Supabase Secret key, or a legacy `service_role` key in either app. The apps need only the Publishable key (`sb_publishable_...`). Publishable keys are designed for browser/mobile clients; access is enforced by the authenticated user's JWT plus Row Level Security.

This release is already configured for:

```text
Project URL: https://wnnmhdodaxzeeqlexibo.supabase.co
Publishable key: already bundled in Android and PWA
```

You only need to replace the key if you rotate it or move the app to another Supabase project.

## 1. Create/update the social database

1. Open the Supabase dashboard and select project `wnnmhdodaxzeeqlexibo`.
2. Open **SQL Editor → New query**.
3. Open `SUPABASE_SOCIAL_SETUP.sql` from this release.
4. Copy the whole file, paste it into the SQL Editor and press **Run**.
5. In **Table Editor**, confirm these public tables exist:
   - `profiles`
   - `friendships`
   - `activity_events`
   - `social_state`
   - `social_notifications`

The script also creates/replaces:

- automatic profile creation after first OTP login;
- exact-email friend lookup;
- send/accept/reject/remove-friend RPCs;
- friends and incoming-request RPCs;
- social notification generation for new friend requests and accepted requests;
- 20-record cursor-paged feed;
- common friend timeline;
- unseen/red-dot state;
- Row Level Security and least-privilege grants.

### If you ran an earlier Gym Progress social SQL draft

Run the **current complete SQL file again**. It is intentionally written so the current draft can add the new `social_notifications` table, recreate functions/triggers and keep the existing social rows. You do not need to delete your Gym Progress local data, and you should not uninstall/clear either app.

## 2. Configure e-mail one-time codes

Gym Progress uses passwordless e-mail OTP: the user enters an e-mail address, receives a numeric code and enters that code in the app.

1. In Supabase open **Authentication → Providers → Email** and keep Email enabled.
2. Open **Authentication → Email Templates → Magic Link / OTP**.
3. Make the template contain the OTP token (`{{ .Token }}`), for example:

```html
<h2>Gym Progress sign-in code</h2>
<p>Your one-time code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:4px">{{ .Token }}</p>
<p>If you did not request this code, you can ignore this message.</p>
```

4. If you want a numeric-code flow, do not rely only on `{{ .ConfirmationURL }}`.
5. Keep OTP expiry and resend/rate limits enabled.

### SMTP is required for normal friend testing

Supabase's built-in mail service is intended for development and only sends to pre-authorized project/team addresses. To send sign-in codes to arbitrary friends, configure **custom SMTP** under Supabase Authentication SMTP settings.

A provider such as Brevo, Resend, Postmark, SendGrid or SES is fine. The SMTP password/API key belongs in Supabase's server-side SMTP settings only — never in Gym Progress source code.

## 3. Publishable key configuration

The publishable key supplied for this project is already present in both release packages.

### Android

The app has the project URL and publishable key as safe defaults. You may override them with a root-level `social.properties` file:

```properties
SUPABASE_URL=https://wnnmhdodaxzeeqlexibo.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_79Ryw205N61N5_E-8_CLFA_b-ywja0T
```

`social.properties` is intended for project-specific overrides and is ignored by Git.

### PWA

The same values live in `social-config.js`:

```js
export const SUPABASE_URL='https://wnnmhdodaxzeeqlexibo.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY='sb_publishable_...';
```

A Publishable key is not a secret. A Secret/service-role key **is** a secret and must never appear there.

## 4. Test authentication

1. Deploy/open the PWA or build/install Android.
2. Open **Friends**.
3. Enter an e-mail address and press **Send code**.
4. Enter the OTP from the e-mail.
5. On first login, Supabase automatically creates:
   - an `auth.users` account;
   - the matching `profiles` row;
   - the matching `social_state` row.
6. Gym Progress initially uses the e-mail local-part as the display name; the user can change the public display name inside Friends.

The e-mail address is used for exact friend lookup but is not displayed in the activity feed.

## 5. Test friendship, notifications and removal

Use two accounts (A and B) on two devices/browser profiles.

1. A → **Friends → Add friend** → enter B's exact account e-mail.
2. Send the request.
3. Supabase inserts one mutual-pair `friendships` row in `pending` state.
4. Supabase also creates a `friend_request` notification for B.
5. B receives the Friends red dot. While the app/PWA is active and notification permission is granted, Gym Progress also shows a system/browser notification.
6. B opens Friends and accepts the request.
7. The same friendship row becomes `accepted` — there is not a second directional friendship row.
8. Supabase creates a `friend_accepted` notification for A.
9. A receives the red dot and notification/update message.
10. Both users now appear in each other's **Friends** list.
11. Either user can press **Remove**. After confirmation, the one friendship row is deleted, so the friendship disappears for both users at once.
12. Once removed, each person's previously shared cards are no longer available to the former friend through the social feed/timeline. Local workout history is untouched.

### Notification timing

- **Android, app open:** checked approximately once per minute.
- **Android, app closed/background:** WorkManager performs a best-effort network check; Android's minimum periodic interval is 15 minutes, so this is not guaranteed to be instant.
- **PWA open:** checked approximately once per minute and again when the PWA becomes visible.
- **PWA fully closed:** a static GitHub Pages PWA cannot receive a true background push without adding Web Push/VAPID or another push service. The red dot/update appears the next time the PWA opens.

True instant closed-app push can be added later with FCM (Android) and Web Push (PWA) plus a Supabase Edge Function, without changing the friendship schema.

## 6. Test workout sharing

1. Complete a workout while signed in.
2. The workout is saved locally first.
3. Gym Progress then shows a share summary:
   - first card: general workout summary;
   - following cards: newly detected weight/rep records.
4. Every card starts **not shared**.
5. Press **Share** on a card to select it; the control becomes active/green.
6. Only after the card is selected does its optional **Comment** field appear.
7. Type up to 500 characters if desired.
8. Press **Publish selected**.
9. Only selected cards are sent to Supabase.
10. Choosing no cards shares nothing.
11. Deleting your own social card removes only the social event, never the local workout/log.

## 7. What counts as a record

To avoid misleading records from warm-ups or deliberately light work:

- **Weight record:** highest successfully completed working-set weight for that exercise exceeds its previous historical maximum.
- **Rep record:** at a weight previously used for that exercise, completed reps exceed the previous best reps at that same weight.
- Percentage increase compares the new value with the previous record value.
- First-ever performance is not given a percentage increase because there is no meaningful previous value.
- Ramp-up, unload and skipped sets do not create records.

## 8. Feed, timeline and unread indicator

- The feed uses cursor pagination and loads **20 records at a time**.
- The timeline shows workout-summary dots for **you + accepted friends** on the same date axis.
- The red Friends-tab dot appears for:
  - newly published friend activity;
  - a new incoming friend request;
  - confirmation that another user accepted your request.
- Opening Friends marks the currently fetched social notifications/activity as seen.
- Your own shared records are visible in your timeline/feed and can be deleted by you.

## 9. Data boundaries

Supabase does **not** become the main Gym Progress database.

Not uploaded automatically:

- programme/templates;
- private workout logs;
- set-by-set RIR history;
- local Progress data;
- app backups;
- active workout state.

Uploaded only when required for the social feature:

- account/profile identity;
- friendship state;
- friend notifications;
- cards explicitly selected for sharing.

## 10. Before a public launch

For a private friends beta, the current schema/RLS model is enough. Before making the app broadly public, add:

- custom SMTP with a verified sender/domain;
- CAPTCHA/anti-abuse limits around OTP and exact-email lookup;
- account deletion workflow and privacy policy;
- monitoring/backups;
- block/report tools if the social graph becomes public rather than invitation-based;
- true push infrastructure if immediate background notifications become important.

## Updating an existing v1.4.0 / v1.3.0 social backend
If the original social SQL is already installed, run `supabase/SUPABASE_SOCIAL_TIMELINE_UPDATE.sql` once in the SQL Editor. It updates only the timeline RPC so an exercise-record-only share also creates a workout dot. No tables or existing activity rows are deleted.


## Update for the current release

If the social schema was installed before this release, run `supabase/SUPABASE_SOCIAL_UPDATE_1_4_2.sql` once in the Supabase SQL Editor. It is idempotent. It keeps existing data, ensures record-only shares appear on the timeline, and adds one durable friend notification per newly published workout batch.
