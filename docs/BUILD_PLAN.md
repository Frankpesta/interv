# BUILD_PLAN.md — Phased Execution

Build in this exact order. **Do not start a phase until the previous phase's gate passes.**
Each gate has a manual test because this is a real-time GUI app. Commit at each gate.

Verify the two hard requirements (capture exclusion, no focus theft) at every phase that
touches the overlay — they regress easily.

---

## Phase 0 — Scaffold & skeleton

**Goal:** an Electron + electron-vite + React + TS + Tailwind + shadcn app that launches a
control window and a placeholder overlay window, with the IPC/preload wiring in place.

Do:
- Scaffold with electron-vite (TS). Add Tailwind + shadcn/ui. Configure strict tsconfig.
- Create `src/shared/ipc.ts` and `src/shared/config.ts` with the channel names, hotkey
  defaults, and tuning constants from `SPEC.md` (even if unused yet).
- Preload exposes a typed `window.api` via `contextBridge`. Renderer has no Node.
- Main creates the control window (normal) and a placeholder overlay window (transparent,
  frameless). Add a tray icon with Quit.
- Add `.env.example`, `.nvmrc`, `README.md` skeleton, `DECISIONS.md`.

**Gate 0:** `npm run dev` launches; control window renders a "Hello" React page styled with
Tailwind; a transparent overlay window is visible on top; tray Quit works; `tsc --noEmit`
and lint pass.

---

## Phase 1 — The stealth overlay (HIGHEST RISK — do this before anything else real)

**Goal:** prove capture exclusion and no-focus-theft on the actual machine.

Do:
- Build the overlay window exactly per `SPEC.md §2.1`: `focusable:false`, `transparent`,
  `alwaysOnTop('screen-saver')`, `skipTaskbar`, `setContentProtection(true)`,
  `showInactive()`, `setIgnoreMouseEvents(true, { forward:true })`.
- Render a simple always-on-top card (a status dot + some dummy text) in the overlay.
- Wire the **panic hide/show** and **toggle click-through** global hotkeys.

**Gate 1 (must pass all):**
1. **Capture test:** Start a Zoom/Meet/Teams meeting or OBS, share the full screen and
   also "share this tab" in a browser, and record. The overlay is **absent** from the
   recording while visible on the physical screen. Repeat after moving/resizing it.
2. **Focus test:** With a browser window focused and a text box active (typing cursor
   blinking), show the overlay, move it via hotkey, toggle click-through, panic hide/show.
   The browser text box **keeps focus the entire time** (cursor keeps blinking, no `blur`).
   Confirm with a tiny test page that logs `window.onblur` / `visibilitychange` — it must
   log **nothing** during overlay interaction.
3. Overlay stays above a maximized/fullscreen browser.

If any part of Gate 1 fails, stop and resolve it before building features on top. Record
the exact Windows build number tested in `DECISIONS.md`.

---

## Phase 2 — Screenshot → AI coding answer (first end-to-end value)

**Goal:** press a hotkey, capture the screen, get a streamed coding answer in the overlay.

Do:
- Implement `capture/screenshot.ts` per `SPEC.md §7` (full-res `desktopCapturer`,
  optional downscale to ~1568px, base64 PNG).
- Implement `ai/anthropic.ts` streaming client. Wire the coding-mode system+user prompt
  from `PROMPTS.md`, with the screenshot as an image block. Verify current model IDs from
  the official model docs; put them in config as `MODEL_SMART`.
- Stream `answer:delta` to the overlay; render markdown + highlighted code; auto-scroll.
- Wire the screenshot hotkey, the cancel hotkey (abort stream), and the "thinking" state.
- Build the minimal context editor in the control window (résumé/JD/notes) and inject it.

**Gate 2:** Open a LeetCode/HackerRank-style page (or any code prompt on screen), press the
screenshot hotkey; within ~2.5 s the overlay begins streaming a correct approach + code +
complexity, in the right language, terse. Cancel hotkey stops mid-stream. No focus theft.
Re-run Gate 1's capture + focus checks — still pass.

---

## Phase 3 — Audio capture → live transcript

**Goal:** the interviewer's system audio is transcribed live into the overlay/control.

Do:
- Wire `setDisplayMediaRequestHandler` for `audio: 'loopback'` (`SPEC.md §4.1`).
- In the audio renderer, get the loopback stream, drop video, feed the `AudioWorklet`
  (`§4.3`) → PCM16 16 kHz mono → IPC `audio:frame` to main.
- Implement `stt/deepgram.ts` behind the `SttProvider` interface (`§5`). Main opens the
  interviewer socket, streams frames, emits `stt:partial`/`stt:final`.
- Show interim transcript (greyed) in a toggleable overlay strip; log finals to the
  control window transcript view.

**Gate 3:** Play interviewer-like audio (a talk/video, or a real AI-interview dry run). The
overlay shows accurate live interim text and finalized utterances within ~1 s of speech.
Socket auto-reconnects if dropped. No audio bytes are logged. Focus/capture checks pass.

---

## Phase 4 — Question detection → auto spoken answers

**Goal:** the app decides when a question was asked and auto-streams a short spoken answer.

Do:
- Implement `ai/detector.ts` per `SPEC.md §6`: trigger on finalized interrogative
  utterances / endpointing / silence; suppress acks and user-is-speaking; de-dupe;
  choose behavioral vs coding mode.
- Behavioral answers use `MODEL_FAST` and the behavioral prompt (`PROMPTS.md`): 3–6 first
  person talking points, capped length, in the user's voice.
- Wire "answer now" (force) and "cycle mode" hotkeys. Add the mic channel (optional, off by
  default) purely to suppress answering over the user.

**Gate 4:** In a dry-run AI interview, spoken questions produce a relevant, concise talking
point answer within ~2 s of the question finishing, without firing on acknowledgements or
mid-sentence, and without answering the user's own speech. Coding-style spoken prompts route
to the smart model. All prior gates still pass.

---

## Phase 5 — Polish, tuning & hardening

Do:
- Overlay UX: opacity/size/position hotkeys persisted; scroll hotkeys; clean streaming
  render; status dot states; error indicator (non-modal, no focus).
- Detector tuning pass: adjust `config.ts` thresholds against real runs (cooldown,
  endpointing, silence, brevity caps). Document final values in `DECISIONS.md`.
- Keys → Windows Credential Manager via `keytar`; `.env` only for dev.
- Optional opt-in session transcript saving + a delete-all button.
- Reconnect/backoff on both STT and Anthropic; graceful "listening stopped" recovery.
- `README.md` complete: setup, keys, hotkey cheat-sheet, packaging, and the honest stealth
  disclaimer.

**Gate 5:** A full 20–30 min dry-run AI interview (mix of behavioral + coding) runs start to
finish with no crashes, no focus theft, no capture leak, latency within targets, and the
overlay usable entirely by hotkey.

---

## Phase 6 — Package

Do:
- `electron-builder` NSIS installer, x64. App icon, product name, version.
- Verify content protection and hotkeys work in the **packaged** build (not just dev) —
  some behaviors differ once packaged. Re-run Gate 1 and Gate 5 on the installed app.

**Gate 6:** Installed app passes Gate 1 and Gate 5. Ship to yourself.

---

## Testing notes

- Prioritize the manual gate scripts above; they are the real acceptance tests.
- Add unit tests only where they pay off: the question detector's trigger/suppress logic
  (feed it canned transcripts) and the PCM conversion (feed known samples, assert format).
- Keep a `scripts/dry-run.md` checklist you can run before each real interview.
