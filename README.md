# Gym Progress PWA v1.2.5 – scheduling & progression refinement

- Fixed post-workout next-session dialog persistence.
- Scheduled next session can be rescheduled from the Home calendar button.
- Reminder times are configurable in Settings.
- Suggested next-session UI no longer explains the 72-hour calculation.
- Barbell progression uses +2.5 kg when close to the progression RIR threshold; +5 kg is reserved for clearly comfortable heavy lower-body work.
- Progression −/+ buttons now use physical equipment grading (0.25 kg barbell, 0.5 kg dumbbell) and stay in fixed positions.
- Bodyweight progression increases reps instead of kilograms.
- A single failed set/exercise no longer automatically labels the whole workout as Failure; day-level Failure requires repeated/high-density failure or a large session-level effort deficit.


## v1.2.4 – equipment-aware loading

- Exercise definition now includes Equipment; dumbbell exercises can be Single or Pair.
- Dumbbell weight is entered per dumbbell; Pair volume counts both dumbbells.
- Barbell selectable weights use 0.25 kg total grading; dumbbells use 0.5 kg per dumbbell.
- Progression suggestions are equipment-aware, no longer default to +0.25 kg, and can be manually edited before acceptance.
- Barbell ramp-up remains practical in 5 kg steps; dumbbell ramp-up uses 0.5 kg steps.
- Exercise suggestions/lists are alphabetical.

# Gym Progress PWA

A local-first Progressive Web App port of the Gym Progress Android project, designed to run on iPhone/iPad from Safari and install to the Home Screen.

## What is included

- Workout-day rotation with manual override and unique workout names
- Home keeps the complete workout rotation visible while a session is active
- Persistent live workout banner across Home, Logs, Progress, Settings, Programme and Manual
- Programme editor with ordered workout days and visual reorder feedback
- Exercise library/autocomplete and exercise types for ramp-up logic
- Automatic context-aware ramp-up: similar movements later in the workout receive a shorter suggestion; recognised barbell ramp-up weights snap to practical 5 kg steps
- Warm-up, ramp-up, working-set, rest, unloading and stretching phases
- Large active-set display with a deliberately slower, calmer pulse
- Custom working weight entry plus equipment-aware +/- controls (0.25 kg barbell total, 0.5 kg per dumbbell)
- Flexible RIR input: Compact 3+ or Extended 5+, with configurable target RIR range
- Conservative performance red flags after unexpected failure, rep misses or RIR collapse, with optional next-set adjustments
- Rest countdown, +/- 30 sec and skip, plus in-foreground sound/vibration cues
- Clear set-skip animation and exercise-skip confirmation
- Inline optional workout note on the final Finish & Save screen, plus Finish as partial / Discard workout choices when ending early
- Logs with rounded volume, session detail, difficulty-coloured frequency dots, Aborted partial sessions and full-session deletion
- Interactive workout-frequency timeline: 1-month initial view, drag to pan and pinch/wheel to zoom
- Weight / Volume / e1RM progress charts with fixed-width Current / First / Progress summaries; Aborted sessions are excluded
- Visual English/Latvian Manual under Settings
- Optional Motivation & reminders: exact 72-hour default inactivity threshold, post-workout next-session scheduling, Home due-date/overdue status, and best-effort browser notifications
- IndexedDB local storage and offline shell through a Service Worker
- Android-compatible `gym-progress-backup-v3` full backup import/export
- Detailed JSON and CSV export for analysis
- Erase-all-data flow with strong confirmation

## Important data behaviour

Training data is **not uploaded to GitHub**. GitHub Pages hosts only the app files. Programme and workout history are stored in the browser's local IndexedDB on the device.

Updating the files on GitHub Pages does not intentionally erase this local database. Still, use **Settings -> Data -> Full backup** periodically, especially before changing devices or experimenting with browser/storage settings.

The PWA accepts the current Android full-backup schema `gym-progress-backup-v3`, so an Android backup can be restored into this PWA. The PWA's full backup is also written in that schema for portability back to the Android app.

## iPhone limitation

The PWA can keep the screen awake where the browser supports Screen Wake Lock and it calculates timers from timestamps, so switching screens or a brief suspension does not simply lose elapsed time.

However, iOS does not give a PWA the same guaranteed background execution as the native Android foreground workout service. If the phone is locked or iOS suspends the PWA, exact background beeps cannot be guaranteed. When you return, the timer state is recalculated from its stored timestamps.

## Easiest GitHub Pages deployment

This project deliberately requires **no npm install and no build command**. `index.html` is already the deployable application.

### 1. Extract the ZIP

Unzip the project on your computer. Open the extracted `GymProgress-PWA` folder. You should immediately see files such as:

- `index.html`
- `app.js`
- `styles.css`
- `manifest.webmanifest`
- `sw.js`
- `icons` folder

`index.html` must end up at the root of the GitHub repository, not inside another `GymProgress-PWA` subfolder.

### 2. Create a GitHub repository

1. Sign in to GitHub.
2. Click the **+** menu in the top-right.
3. Choose **New repository**.
4. Name it, for example, `gym-progress-pwa`.
5. For a normal free GitHub Pages setup, choose **Public**.
6. You can leave README, `.gitignore`, and licence creation off because this package already contains a README.
7. Click **Create repository**.

### 3. Upload the project

On the repository page:

1. Choose **Add file -> Upload files** (for a completely empty repository GitHub may instead show an **uploading an existing file** link).
2. On your computer, open the extracted `GymProgress-PWA` folder.
3. Select the **contents inside the folder** — `index.html`, JavaScript files, CSS, manifest, README and the `icons` folder.
4. Drag them onto GitHub's upload page.
5. Confirm that `index.html` appears at repository root.
6. Enter a commit message such as `Initial Gym Progress PWA`.
7. Click **Commit changes**.

### 4. Turn on GitHub Pages

1. Open the repository's **Settings** tab.
2. In the left sidebar, open **Pages** under **Code and automation**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Select branch **main** (or your repository's default branch if it has another name).
5. Select folder **/(root)**.
6. Click **Save**.

GitHub will publish the site. It may take several minutes. The Pages settings screen will show a **Visit site** button once it is available.

For a repository named `gym-progress-pwa`, the usual address is:

`https://YOUR-GITHUB-USERNAME.github.io/gym-progress-pwa/`

### 5. Install it on an iPhone

1. Open the GitHub Pages address in **Safari** on the iPhone.
2. Tap **Share**.
3. Choose **Add to Home Screen**.
4. If shown, enable **Open as Web App**.
5. Tap **Add**.
6. Launch **Gym Progress** using the new icon on the Home Screen.

Use the Home Screen version for normal workouts rather than leaving it as an ordinary Safari tab.

## Publishing later updates

Upload the changed project files to the **same repository** and commit them to the same Pages branch. GitHub Pages republishes the site automatically.

The Service Worker is network-first while online, so a published code update refreshes its cached copy instead of permanently trapping the installed app on the first version. This release uses a new cache version, so after publishing an update, open the PWA once while online and refresh/relaunch it if the old interface is still visible.

Do not rename the repository or deliberately clear Safari website data without first creating a full JSON backup.

## Local desktop test (optional)

Because Service Workers and ES modules expect a web origin, do not test by double-clicking `index.html` as a `file://` URL. If you have Python installed, from inside the project folder run:

```text
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

This is optional; GitHub Pages itself provides the required HTTPS hosting for iPhone installation.


## v1.1.1 interaction refinements

- Workout and phase count-up seconds now step on the same wall-clock second boundary.
- Active-workout title/timer are visually muted behind the current exercise.
- Skipped-set feedback temporarily replaces the set label instead of duplicating it.
- Saving set data animates the compact rest panel into its focused size.
- Final save screen no longer duplicates the workout timer.
- Home workout rows expand to show a short, non-interactive exercise list; the active workout remains lightly blue.
- At the closest (7-day) Logs timeline zoom, workout dots can be tapped/clicked to scroll to and briefly highlight the corresponding log card.


## v1.2.0 parity update

This release brings the PWA in line with the latest Android behaviour: partial vs discarded early endings, Aborted session status, difficulty-coloured frequency timeline dots, fixed Progress summary geometry, singular/plural count fixes, and practical 5 kg ramp-up increments for recognised barbell exercises. Aborted sessions remain in Logs but are excluded from Progress history and future progression comparison baselines.


## v1.2.1 visual refinement

- Active-set pulse now animates only the circular background/halo. Exercise, weight, reps and set text remain completely static.

## v1.2.2 dialog refinement

- **End workout early** actions are now a compact right-aligned vertical stack.
- Action order is **Finish as partial → Discard workout → Cancel**, with Cancel last and visually quieter.



## v1.2.3
- Optional Motivation & reminders.
- Inactivity reminder defaults to 3 days = exactly 72 elapsed hours.
- Completed workouts offer a next-session date exactly 72 hours later.
- Home shows the scheduled date beside `next`; overdue dates turn red.
- Reminder targets are 19:00 the evening before and 08:00 on the scheduled day.
- Browser notification delivery is best effort: a static GitHub Pages PWA cannot reliably wake a fully closed iPhone/desktop browser without a push backend.
