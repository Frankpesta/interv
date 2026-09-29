# Manual acceptance checklist

Record actual observations in DECISIONS.md. Unchecked means unverified, not passed.

## Gate 0 — foundation

- [x] `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- [x] `npm run dev` opens a styled control window with the Hello heading and no startup error.
- [x] A transparent, compact overlay is visible at the top of the primary display (user confirmed).
- [x] Control Hide/Show toggles overlay and its status correctly.
- [x] Closing control keeps the app running (overlay remains; tray interaction awaiting manual check).
- [x] Tray Open control window restores it (user confirmed).
- [ ] Tray Show/hide works (additional check, not required for Gate 0).
- [x] Tray Quit removes both windows and exits the application process (user confirmed).
- [x] `npm run preview` loads the compiled renderer and preload successfully.

## Gate 1 — required before provider features

- [ ] Record Windows build, Electron version, monitor layout/scaling, and recorder/browser versions.
- [ ] Overlay stays absent from real full-display recordings while physically visible.
- [ ] Browser full-screen sharing and tab sharing checked separately.
- [ ] Repeat after moving/resizing/hiding/restoring the overlay.
- [ ] With a browser textbox active, all overlay hotkeys preserve typing focus.
- [ ] Focus-test page records no blur/visibility changes during those hotkeys.
- [ ] Maximized/fullscreen behavior verified.

Later phases extend this checklist with provider, audio, recovery, long-session, and installed-build checks.
