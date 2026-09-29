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

- [x] All eight overlay shortcuts register on this machine.
- [x] Hide/show and click-through hotkeys update the running application.
- [x] A colliding shortcut is rejected non-modally and preserves the previous binding.
- [ ] Successful alternate shortcut binding verified.
- [ ] Record Windows build, Electron version, monitor layout/scaling, and recorder/browser versions.
- [x] Overlay stays absent from real full-display recordings while physically visible (user report).
- [x] Browser full-screen sharing and tab sharing checked separately (user report).
- [x] Repeat after moving/resizing/hiding/restoring the overlay (user report).
- [x] With a browser textbox active, all overlay hotkeys preserve typing focus (user report).
- [x] Focus-test page records no blur/visibility changes during those hotkeys (user report).
- [x] Maximized/fullscreen behavior verified (user report).

Open `scripts/focus-test.html` directly in a browser for the typing/focus checks. Hide/show: Ctrl+Shift+H; click-through: Ctrl+Shift+M; move: Ctrl+Alt+arrows; resize: Ctrl+Alt+Shift+Up / Down. Restore click-through to on after testing. Record browser/recorder versions and display scaling with the outcomes. Passing desktop state checks alone does not pass Gate 1.

## Gate 2 — screenshot answers

- [x] Typecheck, lint, build, and 15 offline tests pass.
- [x] Compiled app loads both provider options, the context editor, and screenshot/cancel/scroll shortcuts.
- [x] Missing key shows an inline error before capturing or calling a provider.
- [x] Both SDK adapters tested with fake HTTP/SSE transports; no API key or external call required.
- [x] Capture cancellation prevents the provider call, and retry reuses the original screenshot/context (offline tests).
- [ ] Save provider/context and verify persistence after restarting.
- [ ] With a configured key, open scripts/coding-fixture.html manually in a browser and request an answer. Check correct language, complete runnable code, approach, complexity, and edge cases.
- [ ] First visible output targets under 2.5 seconds from screenshot shortcut; record actual measurements, model, and provider.
- [ ] Cancel midstream; no later chunks appear. Repeated requests replace old output cleanly.
- [ ] Hide during capture/streaming; no hidden request continues or resumes on restore.
- [ ] Test the alternate provider if its key is available; mark untested providers explicitly.
- [ ] Re-run Gate 1 recording/focus checks with streamed markdown and code.

The fixture expects index pairs [0,1], [1,2], and [0,1] respectively. Evaluate the returned function against those inputs; unit tests of the coordinator do not validate generated code or real capture behavior.

Later phases extend this checklist with audio, recovery, long-session, and installed-build checks.
