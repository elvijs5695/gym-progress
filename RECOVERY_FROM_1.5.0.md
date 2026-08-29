# Gym Progress PWA v1.5.2 recovery

v1.5.2 fixes the first-load blank-screen failure caused by a mixed service-worker module cache during the 1.5.1 hotfix deployment.

## Do not
- do not clear site data;
- do not uninstall the PWA;
- do not overwrite the good pre-update JSON backup with an empty export.

## Recovery
1. Deploy all files from v1.5.2 to the same site path.
2. Open the normal site once. v1.5.2 version-busts its entry dependencies so the previous service worker cannot pair the new app with an old db.js module.
3. If the normal app still does not render, open `recovery.html?v=1.5.2` on the same site.
4. Select the user's pre-update Gym Progress JSON backup and press **Restore local training data**.
5. After the success message, press **Open Gym Progress**.
6. Verify Programme, Logs, Progress and Friends.
7. Export a new full backup only after the restored data is visible.
