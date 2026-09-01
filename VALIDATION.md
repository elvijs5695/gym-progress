# PWA v1.5.15 validation

- JavaScript syntax: PASS (`node --check`).
- Static source validator: PASS (56 PWA files).
- Version/cache markers: 1.5.15.
- Active header: fixed time/stage + overflow-only `Now / Next` marquee present.
- Finish image: HTML preload + startup fetch/decode + service-worker app-shell cache present.
- Expand/collapse UI: shared Friends-style SVG chevron present.
- Runtime/device verification remains recommended after deployment.

### 1.5.15 visual correction checks
- Circular outline Play/Calendar controls: static CSS check.
- Tracker contrast: SVG settings icon + explicit dark-green icon/control palette.
- Friends heading/chevron alignment: static CSS check.
- Ramp target alignment and progression-field spacing: static CSS check.
- Notice/dialog collision strategy: CSS `:has()` top relocation while a dialog is present.
