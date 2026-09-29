# Decision and gate log

## 2026-09-29 — Phase 0 scaffold

- Follow the existing ordered phase gates; no providers, audio capture, or global shortcuts are implemented before the foundation gate.
- Registry reports Electron 44.4.5 and electron-vite 5.0.0. electron-vite's peer range supports Vite 7, so use Vite 7 and React plugin 5 rather than incompatible latest Vite 8. All resolved package versions are pinned in package.json and package-lock.json. Node 24.18.0 is the installed LTS-line runtime.
- Tailwind 4 uses its Vite plugin and CSS theme tokens, so no obsolete tailwind.config.ts is added. shadcn/ui uses components.json, the utility helper, and a local Radix/CVA Button component.
- Channel values live in shared/config.ts and are re-exported through shared/ipc.ts, resolving the two documents' location overlap without duplicate values.
- Bundle preload as CommonJS (.cjs) to retain sandboxed renderers while the main process uses ESM. The renderer receives no raw ipcRenderer or Node access.
- Apply non-focusable, click-through, content-protected overlay defaults from creation. These are unverified safeguards, not a passed Phase 1 gate. Do not use setVisibleOnAllWorkspaces as a Windows guarantee; Electron documents it as a no-op on Windows.
- Keep the tray reference for the app lifetime, close control to tray, and run cleanup on actual quit. A single-instance lock prevents duplicate overlays.
- Gate 0 verification is in progress. Gate 1 and later have not started.

## 2026-09-29 — Phase 0 verification results

- Host reports Windows kernel build 10.0.26200. Node 24.18.0, npm 11.16.0, Electron 44.4.5, electron-vite 5.0.0, Vite 7.3.6.
- `npm run build` (including `tsc --noEmit`): PASS. The sandbox initially blocked esbuild child-process creation; the approved build outside the sandbox passed.
- `npm run lint`: PASS, zero warnings from source checks. npm reports ESLint 9 is deprecated; dependency upgrade is being evaluated before finalizing the scaffold.
- `npm ls --depth=0`: PASS, no missing/invalid packages. Dependency installation reported zero vulnerabilities.
- `npm run dev`: PASS. Windows UI inspection verified the styled Hello control page, loaded preload/IPC state, and overlay placeholder text.
- Control Hide/Show: PASS. The observed status switched Hidden/Visible and the overlay returned to the window list.
- Closing control with Alt+F4: PASS. Control disappeared while the overlay process/window remained active. The dev process was subsequently stopped before testing the compiled build.
- `npm run preview`: PASS. The control document loaded from out/renderer/control/index.html with working preload state, without relying on the Vite dev server. This is not a packaged-installer test.
- Outstanding: physical overlay appearance and transparency, tray menu Open/Show-Hide/Quit. The Windows automation window list does not expose the tray. User verification requested; do not mark Gate 0 complete until these checks pass.
- Capture-recording and browser focus tests remain unperformed. Gate 1 and all provider phases remain pending.

## 2026-09-29 — Gate 0 completed

- User confirmed: "Overlay visible; tray Open and Quit both work" after testing the open app. Together with the checks above, this completes Gate 0. Proceed to Phase 1 only.
- ESLint 10 is supported by both installed TypeScript ESLint and React hooks plugin peer ranges. Upgrade from deprecated ESLint 9 before committing the foundation.

## 2026-09-29 — Phase 1 implementation and verification

- Phase 0 committed as 3b8e880. Implemented overlay hide/show, click-through, movement, bounded resizing, tray click-through, and session-only shortcut rebinding. Added Ctrl+Alt+Shift+Up/Down for resizing during the gate checks; permanent configuration persistence remains Phase 5.
- The overlay remains non-focusable in pointer-interactive mode. Position/size changes use native window methods without show/focus calls. Invalid or occupied accelerators preserve the old registration and display an inline control-window error.
- Added scripts/focus-test.html with a typing area and blur/visibility log. It performs no network calls or recording.
- Phase 1 TypeScript/build passed after fixing declaration order in shared/config.ts. Lint passed again during resumed verification.
- Live UI checks: all eight shortcuts Active; Ctrl+Shift+H changed Hidden to Visible; Ctrl+Shift+M changed click-through on to off and back on. Attempting to assign the click-through accelerator to hide/show was rejected with an inline error. Restored the form to Ctrl+Shift+H; registration remained unchanged. Successful alternate rebinding is not yet verified.
- Browser automation refused the local file URL under its protocol policy. No alternative browser surface or bypass was attempted. Requested user-run browser focus and real capture tests, including fullscreen, movement, and resizing, as required by BUILD_PLAN.md.
- Gate 1 remains pending those observations. No Phase 2 provider work has started. The running app is left with overlay visible and click-through on for manual verification.

## 2026-09-29 — Gate 1 user acceptance

- User confirmed: "All checks pass — I’ll provide the setup details" in response to the full browser focus, recording, sharing, fullscreen, move/resize checklist. Gate 1 behavior accepted based on that report; Windows kernel 10.0.26200 and Electron 44.4.5 are known. Browser/recorder versions and monitor scaling remain to be supplied as test metadata.
- Proceed to Phase 2. Successful alternate shortcut rebinding remains an additional smoke check, not a claim covered by this acceptance.

## 2026-09-29 — Phase 2 and user-requested OpenAI support

- Phase 1 committed as 1ae5de0. Implemented selected-display capture, PNG/downscale in memory, bounded context editor and electron-store persistence, screenshot/cancel/scroll hotkeys, streamed markdown with code highlighting, and truncation/error indicators.
- User explicitly requested "Also allow using openAi key as well". This extends the original Anthropic-only decision: select Anthropic or OpenAI in saved settings; never silently fail over across providers. Credentials remain main-process-only environment variables for this development phase. Windows credential storage remains Phase 5.
- Anthropic defaults verified against https://platform.claude.com/docs/en/models/overview: claude-sonnet-5-5 (coding), claude-haiku-4-5-20251001 (reserved spoken tier).
- OpenAI implementation verified against https://developers.openai.com/api/docs/guides/streaming-responses, https://developers.openai.com/api/docs/guides/images-vision, and https://developers.openai.com/api/docs/models/gpt-6-sol. Default gpt-6-sol supports image input, streaming, and reasoning effort none. Use Responses with store=false; this is not a promise about provider-wide retention.
- Cancellation invalidates the request before pending capture or late stream events can publish. Hiding cancels from the native window event, covering tray, hotkey, and control actions. New requests replace old ones. Only pre-output transient failures retry once, using the same image and context snapshot.
- Main sends text deltas plus revisioned answer snapshots. The overlay uses revisioned snapshots to avoid hydration/subscription races. Output is bounded; links are noninteractive, remote images suppressed, raw HTML skipped. No provider errors, keys, transcript contents, or screenshot bytes are logged.
- Verification: TypeScript, lint, and production build PASS. Nine offline tests PASS: replacement/cancel races, retry policy, truncation/error redaction, context limits, and OpenAI SDK request/SSE handling with a fake transport. Compiled UI and all 12 shortcut registrations observed; missing-key request correctly reported an inline error before capture.
- Neither ANTHROPIC_API_KEY nor OPENAI_API_KEY was configured at verification time. No live screenshot was sent to either provider. Gate 2 latency, generated-code correctness, real midstream cancel, persistence smoke test, and capture/focus regressions remain pending. Audio work must wait for Gate 2 acceptance.

## 2026-09-29 — Offline Phase 2 checkpoint

- User will obtain API keys later. No further key request is needed until they indicate readiness.
- Extracted screenshot request orchestration into a testable operation. It clones settings once, checks key readiness before capture, checks cancellation before and after capture, and retains the same image across a retry.
- Added Anthropic SDK transport tests for streamed vision requests, token truncation, and authentication-error redaction. Added screenshot orchestration tests for missing keys, cancellation during capture, and retry snapshot isolation.
- All 15 offline tests, TypeScript, lint, and build pass. This is a code checkpoint, not Gate 2 acceptance. Live provider and recording/focus checks remain deferred until keys are available; Phase 3 has not started.
