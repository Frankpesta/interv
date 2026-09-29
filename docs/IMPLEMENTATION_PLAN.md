# Interview Copilot implementation plan

Planning baseline: 2026-09-29. Reviewed CLAUDE.md, SPEC.md, BUILD_PLAN.md, and PROMPTS.md. The workspace contains documentation only; no application, dependency manifest, tests, or Git repository exists yet. No implementation gates have passed.

This plan expands the existing build plan without replacing its requirements or changing its phase order. CLAUDE.md governs process and scope; SPEC.md governs behavior. Any proposed deviation below must be recorded in DECISIONS.md when adopted.

## Scope and architecture

Build the single-user Windows desktop application using the locked Electron, electron-vite, React, TypeScript, Tailwind, shadcn/ui, Zustand, and Framer Motion stack. Use Deepgram for streaming transcription, Anthropic for answers, electron-store for settings, and electron-builder for an x64 NSIS installer. No server, accounts, billing, telemetry, sync, automatic typing, or automatic clipboard writes.

- Main owns windows, tray, shortcuts, session lifecycle, credentials, capture, provider connections, question detection, and answer orchestration.
- Preload exposes a narrow typed API with subscription cleanup. Renderers have no Node integration. Validate IPC payloads and senders in main.
- Control renders context editing, settings, session controls, transcript history, and shortcut errors.
- Overlay renders status, streamed markdown/code, and optional interim text. It remains non-focusable.
- A dedicated hidden audio renderer owns capture and AudioWorklets, so closing control to tray does not interrupt listening. Prove hidden capture startup, permissions, and background operation in Phase 3.
- Follow SPEC.md's directory layout. Add a small main-process session/answer coordinator rather than distributing cancellation and provider state across windows.

Data paths: audio renderer -> main -> STT -> finalized utterance buffer -> detector -> answer coordinator -> Anthropic -> overlay; screenshot hotkey -> capture -> the same answer coordinator.

Define separate listening, answer, and visibility states. Give every session and answer a generation/request ID; include the answer ID in deltas and state events. Ignore late events from aborted or replaced requests. A new explicit answer replaces the active answer; automatic duplicate triggers are suppressed. Session stop releases tracks, sockets, timers, and requests. Panic hides and aborts immediately; while hidden, suppress new answer generation, retain the listening setting, and never resurrect the canceled request on restore.

## Sequential delivery

### Phase 0: runnable foundation

1. Initialize Git and ignore dependencies, build output, local secrets, and recordings.
2. Verify and pin current stable Electron and compatible Node LTS/tooling; commit the lockfile. Record versions in DECISIONS.md.
3. Scaffold separate main, preload, control, and overlay entry points with strict TypeScript, lint, and build commands.
4. Define shared payloads, settings defaults, hotkey mappings, and the typed preload API. To reconcile the docs' channel-location overlap, define channel values in shared/config.ts and re-export them through shared/ipc.ts alongside payload types.
5. Create control and placeholder overlay windows, tray Quit, close-to-tray behavior, and teardown. Add README, .env.example, .nvmrc, and DECISIONS.md.

Exit: dev startup, styled React control, transparent overlay, and tray Quit work; typecheck, lint, and build pass. No provider keys required.

### Phase 1: validate Windows window behavior

1. Implement protected, always-on-top, non-focusable overlay creation and inactive showing.
2. Implement panic, click-through toggle, and movement/resize test controls now; Gate 1 needs movement before the later polish phase.
3. Add a local focus-test page and a manual capture checklist with Windows build, Electron version, display scaling, browser/recorder versions, and test outcomes.
4. Verify full-display recording, browser screen sharing, and tab sharing, including after moving/resizing, hiding/restoring, and maximizing/fullscreening the browser. Tab sharing alone is not proof of display-capture exclusion.
5. Test keyboard input and blur/visibility events during all overlay hotkeys. Report registration collisions in control without modal errors.

Exit: all Gate 1 checks pass on the actual machine. Stop implementation here if capture exclusion or focus behavior fails; never substitute API flags for observed results.

### Phase 2: screenshot to streamed answer

1. Implement configured display selection and full-resolution screenshot acquisition; inspect actual image dimensions, reject empty captures, optionally downscale, and retain images only in memory by default.
2. Add persisted context editing, bounded runtime highlights, fallback language, and .env credentials for development.
3. Verify current Anthropic model IDs against the official model documentation when wiring the client. Keep both tiers in configuration; do not invent model names.
4. Implement PROMPTS.md templates and a streaming adapter behind the answer coordinator. Support abort, replacement, stale-event rejection, and one bounded transient retry. Do not retry canceled calls or duplicate already-rendered output.
5. Render markdown/code without raw HTML, plus thinking/error states and hotkey scrolling. Add screenshot and cancel shortcuts.

Exit: a known coding fixture produces the requested approach, runnable solution, complexity, and edge cases; check solution correctness against sample cases. First visible token targets <2.5 seconds from hotkey. Midstream cancellation and repeated requests behave correctly. Re-run capture/focus checks.

This is the first useful end-to-end milestone, not the finished product.

### Phase 3: loopback to transcript

1. Implement loopback request handling restricted to the audio renderer. Verify permissions and startup without showing or focusing that renderer.
2. Verify stopping the unused video track leaves audio functioning. Keep all captured video out of rendering and storage.
3. Implement mono downmix, stateful resampling to 16 kHz, PCM16 little-endian encoding, approximately 50 ms framing, and RMS activity events. Do not reset resampling state between chunks.
4. Implement Deepgram sockets per active channel behind SttProvider. Separate interim updates, final segments, and utterance-end signals so repeated endpoint events cannot duplicate text.
5. Bound outbound buffering; reconnect with backoff, discard stale queued audio, show degraded status, and cleanly stop/restart listening.

Exit: live partials and finals meet Gate 3's approximate one-second target on test audio; disconnect/recovery and repeated start/stop work. Test 44.1/48 kHz inputs, PCM clipping/byte order, frame boundaries, and sample counts. No audio or transcript content in diagnostic logs.

### Phase 4: question detection and spoken answers

1. Add endpoint-aware utterance assembly, configurable debounce, silence fallback, acknowledgment suppression, and deduplication.
2. Route coding cues to MODEL_SMART and spoken questions to MODEL_FAST. Add manual answer-now and mode cycling.
3. Add the optional separate microphone channel and speech suppression; microphone transcripts never trigger answers.
4. Run transcript fixtures for multipart questions, pauses, acknowledgments, repeated final events, mode overrides, user speech, and manual triggering. Keep the optional classifier disabled unless measured rule quality justifies it.

Exit: Gate 4 dry run passes for relevance, routing, and duplicate suppression. Measure question-end-to-first-token as well as trigger-to-first-token; record any target miss. Repeat prior regression checks.

### Phase 5: complete settings and harden sessions

1. Finish persisted size/position/opacity, scroll and mode controls, shortcut rebinding, display selection, and recovery of off-screen bounds after monitor changes.
2. Complete TXT/MD/PDF resume import. Use local PDF text extraction; provide a clear fallback to pasted text when no extractable text exists. Add no OCR service implicitly.
3. Implement and verify Windows credential storage, key replacement/removal, and missing-key errors. Credentials are never included in general config IPC responses.
4. Add opt-in transcript saving and deletion; disabled means memory-only history. Keep screenshots off disk unless the explicit debug option is enabled.
5. Tune thresholds and prompt/token limits using dry runs. Complete provider recovery, shutdown, dev-only redacted diagnostics, README, and scripts/dry-run.md.

Exit: a mixed 20-30 minute session passes Gate 5, including network interruption and cancellation. Record latency measurements and any untested capture configurations.

### Phase 6: package and verify installation

1. Produce the x64 NSIS installer with version, product name, and icon.
2. Check preload/renderer/worklet assets, native credential module loading, paths, and settings persistence in the installed build.
3. Re-run Gates 1 and 5 on the installed application, including startup without a development .env file.

Exit: installed build passes the required manual checks. Claim support only for Windows/capture combinations actually tested; testing one Windows version does not verify both Windows 10 and 11.

## Issues to resolve within their phases

| Issue | Planned treatment |
|---|---|
| Interactive mode conflicts with the absolute no-focus rule | Keep focusable=false permanently. Pointer-event toggling must pass Gate 1; do not introduce a focusable overlay to make editing easier. Settings remain in control. |
| Windows workspace API | setVisibleOnAllWorkspaces is a Windows no-op. Test actual fullscreen behavior instead of treating this call as a guarantee. See [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window). |
| Audio transport says transferable ArrayBuffer | Electron ipcRenderer.postMessage documents MessagePort transfer, not arbitrary buffer transfer. Start with structured-cloned small audio frames through typed IPC, measure overhead, and record this transport clarification; do not promise zero-copy. See [Electron IPC](https://www.electronjs.org/docs/latest/api/ipc-renderer). |
| System audio is called the interviewer channel | Loopback captures system audio, not an isolated speaker. Validate with other apps silent and test headphones/mic feedback. Mic-off cannot provide user-speaking suppression. See [Electron session](https://www.electronjs.org/docs/latest/api/session). |
| Screenshot source selection | Match display_id to the configured display; never assume sources[0] is primary. Check returned image size because requested thumbnail dimensions are not guaranteed. See [DesktopCapturerSource](https://www.electronjs.org/docs/latest/api/structures/desktop-capturer-source). |
| Latency criteria differ | SPEC measures from trigger; Gate 4 measures from speech end. A roughly 1 s endpoint wait plus 600-900 ms debounce can consume almost the entire spoken budget. Instrument both and tune without stacking redundant waits; do not quietly redefine acceptance. |
| Credential dependency | The [keytar repository](https://github.com/atom/node-keytar) is archived. Retain the documented preference initially, verify installation/rebuild compatibility when selected, and require a documented alternative before shipping if it fails. No plaintext production fallback. |
| Context and solution length | Keep highlights bounded and editable, prohibit invented resume facts, and detect token-truncated code instead of presenting it as complete. |

These are implementation risks and proposed clarifications, not completed validations. None blocks planning or starting Phase 0. A failure requiring an architectural change should be raised with concrete evidence before changing the locked design.

## Verification and execution discipline

Keep the prescribed phase order. At every gate, record date, exact versions, commands/checks run, observed results, and outstanding failures. Commit each passing phase once Git exists. Do not mark an unperformed GUI or live-provider check as passed.

Use focused automated tests for DSP, detector behavior, and the cancellation/replacement races that could mix answers. Use fake providers to verify errors and late events without consuming API credits. Manual Windows recording/focus tests remain essential and cannot be replaced by unit tests.

Provider keys are needed from Phase 2 for Anthropic and Phase 3 for Deepgram. Real capture/recording access is needed at Gate 1. Credentials belong in local configuration, never in chat or tracked files.

Next executable task: complete Phase 0 only, verify Gate 0, then proceed to the Windows overlay proof. No application code or dependencies were added during this planning pass.
