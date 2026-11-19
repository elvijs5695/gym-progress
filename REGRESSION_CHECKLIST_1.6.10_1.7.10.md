# Gym Progress hotfix 1.6.10 / 1.7.10 — acceptance checklist

- [ ] On the PWA, open as a user already using **Latvian**; reload and switch tabs without any `Could not start` error. Repeat in English.
- [ ] Restart an installed PWA in both languages after updating its service worker. Verify the version is 1.7.10, and programme, workouts, logs and sync remain intact.
- [ ] Check PWA Logs cards: strength-only `Comfortable`, `Challenging`, `Hard`, `Very hard`, `Failure` and `Aborted` all have visibly distinct coloured backgrounds and borders; unknown effort remains neutral.
- [ ] Check PWA timeline dots correspond to the same colours as those cards, including after pan/zoom and when multiple workouts fall on a day.
- [ ] Cardio-only session with RPE **2** is green; **5** yellow; **7** orange; **9** red. Cardio with N/A effort stays grey.
- [ ] Mixed session with strength `Comfortable` and cardio `Hard`: **green** card/dot (strength determines colour), label `Strength: Comfortable · Cardio: Hard`. Mixed session without a valid strength effort uses cardio colour instead.
- [ ] Log Effort captions never show numeric cardio RPE or `(RPE X)`, including cardio-only and mixed sessions. In the detailed cardio metrics, RPE remains visible and correctly recorded.
- [ ] Open cardio-only and mixed session detail views: metrics, activity duration, HR, training load and numeric RPE are still present where recorded.
- [ ] Android: run `:app:assembleDebug`, install in place, verify Logs coloured cards and timeline circles, and inspect compact Effort in strength/cardio/mixed sessions.
- [ ] On both clients, compare historical workout counts and sample weights/RPE values before and after; check no record loss or unexpected sync conflict.

No new SQL or data migration is required. Do not uninstall Android or clear PWA storage. Keep a verified Full backup before deploying.
