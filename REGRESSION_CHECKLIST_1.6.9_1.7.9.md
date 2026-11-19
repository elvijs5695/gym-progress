# Gym Progress 1.6.9 / 1.7.9 — regression checklist

Mark items after checking both Latvian and English where applicable.

- [ ] Android Studio: run `:app:assembleDebug` successfully; install as an in-place upgrade over 1.6.8 without clearing storage.
- [ ] Verify historical strength/cardio logs and Room/IndexedDB backups are unchanged after upgrade; sync with PWA (both directions), compare counts and values.
- [ ] Start cardio on both clients; timer increases until Finish, then freezes *immediately* while dialogue is open; Back resumes at correct elapsed time.
- [ ] Cardio N/A for distance, average HR, power and RPE shows disabled `-`, highlighted N/A without tick; toggling off returns empty field.
- [ ] RPE selector includes only 1–10 and N/A; 1 and 10 save correctly; reopening old records retains original numeric RPE.
- [ ] For invalid HR above 240 bpm or power above 2500 W, error names the exact field. Save a valid partial cardio record with other optional fields blank.
- [ ] Explanation under RPE uses entire dialogue width, no artificial cardio progress note.
- [ ] Cardio exercise has no set counter, no Skip set; only activity start/finish/skip. Strength/time-only set flows unaffected.
- [ ] Choose replacements for cardio: every candidate is cardio; for strength, none is cardio. Programme and past completed records unchanged.
- [ ] Log strength-only, cardio-only, and mixed sessions: explicit Effort; cardio-only timeline colour reflects RPE (test 3, 6 and 9), mixed is neutral.
- [ ] Mixed Logs show original strength duration/volume first, cardio time/HR/RPE/load in a separate section beneath; tap each session to verify detailed metrics.
- [ ] Detailed cardio log fills card width on mobile screen, including distance, pace, power, HR, RPE and load; legible wrapping.
- [ ] PWA Progress: scroll cardio metrics right to RPE/Load, select and ensure horizontal position does not jump to Duration.
- [ ] PWA Rest button reads Skip rest; normal rest transition and rest recording still work.
- [ ] After recording 2 strength sets, tap Back; confirmation warns about losing weight/reps/RIR; Cancel preserves data; Confirm removes only the latest set.
- [ ] Complete multiple workouts in the PWA, including when offline: different celebration photographs appear; summary/share dialogue still opens after the image.
- [ ] Switch EN/LV on all touched screens and modals; no mixed-language progress comparison or errors; exercise names remain user-defined.
