# SPEC.md — Interview Copilot Technical Specification

Authoritative description of *what the app does and how each subsystem behaves*. Read
`CLAUDE.md` first for scope and locked decisions. Build order is in `BUILD_PLAN.md`.

---

## 1. Product summary

A Windows desktop overlay that helps the user during automated ("AI") interviews. It:

- Shows a small, movable, transparent overlay that is **excluded from screen capture**.
- Captures the interviewer's audio (system/loopback) and transcribes it live.
- Detects when a question has been asked and streams a concise answer into the overlay.
- On a hotkey, screenshots the screen and sends it to a vision model for coding/technical
  prompts, returning an approach + code + complexity note.
- Is preloaded with the user's résumé, the job description, and freeform notes so answers
  are tailored and in the user's voice.
- Never steals focus and never appears in the interview platform's screen recording.

Two operating "answer modes": **Behavioral/spoken** (fast, short talking points) and
**Coding/technical** (stronger model, full solution). Mode is chosen automatically by the
question detector and overridable by hotkey.

---

## 2. Process & window architecture

Electron, three logical layers, strict separation:

- **Main process** (`src/main`): window lifecycle, global hotkeys, screenshot capture,
  the STT WebSocket client, the Anthropic client, config/persistence, IPC hub.
- **Preload** (`src/preload`): a single typed `contextBridge` API. No Node in renderer.
- **Renderers** (`src/renderer`):
  - **Control window** — normal window. Settings, context editor (résumé/JD/notes),
    provider keys, hotkey config, transcript viewer, session controls. Can steal focus
    freely; it is not on screen during the interview.
  - **Overlay window** — the on-camera HUD. Transparent, frameless, always-on-top,
    content-protected, **non-focusable**, click-through by default.

Audio is captured in a **hidden helper renderer** (or the control window's hidden
`AudioWorklet`) because `getUserMedia`/`getDisplayMedia`/`AudioWorklet` require a DOM
context. That renderer streams PCM frames to main over IPC; main owns the STT socket.

### 2.1 Overlay window creation (Windows)

Create the overlay `BrowserWindow` with, at minimum:

```
{
  frame: false,
  transparent: true,
  hasShadow: false,
  resizable: true,
  movable: true,
  minimizable: false,
  maximizable: false,
  fullscreenable: false,
  skipTaskbar: true,
  focusable: false,          // critical: cannot take focus
  roundedCorners: false,
  backgroundColor: '#00000000',
  webPreferences: { contextIsolation: true, nodeIntegration: false, preload }
}
```

After creation:

- `overlay.setContentProtection(true)` — excludes from capture (WDA_EXCLUDEFROMCAPTURE).
- `overlay.setAlwaysOnTop(true, 'screen-saver')` — stays above the interview window.
- `overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`.
- `overlay.setIgnoreMouseEvents(true, { forward: true })` — click-through in HUD mode.
- Show with `overlay.showInactive()` — **never** `show()`/`focus()`.

The overlay must **never** call `focus()`, and no code path may focus it. When the user
needs to interact (e.g. scroll a long answer, click a button), that is done via **global
hotkeys** that message the renderer — not by clicking, which would require focus. Provide
an optional "interactive mode" hotkey that flips `setIgnoreMouseEvents(false)` *and*
temporarily allows pointer events, but document that clicking it can cost focus; default
is fully hotkey-driven and click-through.

### 2.2 Control window

Standard `BrowserWindow`, focusable, normal chrome, opened from the tray or on first run.
It is **not** content-protected (the user only uses it before/after the interview). It
must be closable to tray without quitting the app.

### 2.3 Tray

System tray icon with: Show/Hide overlay, Open control window, Start/Stop listening,
Toggle click-through, Quit. Tray is the always-available control if hotkeys are captured
by another app.

---

## 3. Stealth & anti-detection requirements

The app must minimize its detectability, honestly bounded:

1. **Video capture exclusion** — via content protection (Section 2.1). Verify against a
   real Zoom/Meet/OBS recording and against a browser `getDisplayMedia` "share screen"
   and "share this tab" in Phase 1.
2. **No focus theft / no blur events** — overlay is non-focusable and shown inactive.
   Nothing the app does may move focus away from the interview window. This is what
   defeats browser platforms that watch `blur`/`visibilitychange`.
3. **No paste into the editor** — coding platforms commonly log paste and large sudden
   insertions. The app **never** writes to the clipboard automatically and never injects
   keystrokes into other apps. The user reads the answer from the overlay and types it.
   (Do not build any auto-typer.)
4. **Small footprint near the webcam** — the overlay defaults to a compact size and its
   default position is top-center (near a laptop webcam) so the user's gaze stays natural.
   Answers are terse by default to reduce reading time / eye movement.
5. **Neutral process name is optional** — you may set a generic `productName`, but do not
   claim this hides the process. Document that process inspection still sees it.

The README must contain a plain disclaimer: content protection hides the window from
*video capture only*; it does not defeat process-level proctoring or webcam gaze tracking.

---

## 4. Audio capture pipeline

Goal: a clean, low-latency stream of the **interviewer's** speech (system audio), with the
option to also capture the **user's** mic on a separate channel.

### 4.1 System (loopback) audio — the interviewer

On Windows, Electron supports loopback capture through the display-media handler. In main:

```
session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
  desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
    callback({ video: sources[0], audio: 'loopback' }); // WASAPI loopback = system audio
  });
}, { useSystemPicker: false });
```

In the audio renderer, call `navigator.mediaDevices.getDisplayMedia({ video: true,
audio: true })`, then **discard the video track immediately** and keep only the audio
track. (A video track is required to obtain loopback audio; do not render or process it.)

### 4.2 Microphone — the user (optional, off by default)

`getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })` on a
separate `MediaStream`. Keep it a distinct STT channel so the question detector only ever
acts on the *interviewer* channel and never answers the user's own speech.

### 4.3 PCM conversion (AudioWorklet)

- Route each `MediaStream` into an `AudioContext` → `AudioWorkletNode`.
- The worklet downmixes to **mono**, resamples to **16 kHz**, converts float32 → **PCM16
  little-endian**, and posts `ArrayBuffer` chunks (~20–100 ms) to the renderer thread.
- The renderer forwards chunks to main via IPC (transferable `ArrayBuffer`), tagged with
  channel (`interviewer` | `user`).
- Keep chunk size small for latency but large enough to avoid IPC spam (~50 ms is a good
  start; make it a tuning constant).

### 4.4 Voice activity / silence

Track simple RMS energy in the worklet to know when the interviewer is speaking. Emit
`speech-start` / `speech-end` events; the question detector uses these plus STT endpointing.

---

## 5. Speech-to-text (streaming)

Default provider: **Deepgram** streaming. Abstract behind a `SttProvider` interface so
AssemblyAI / OpenAI-realtime / Gemini can be swapped later.

```
interface SttProvider {
  open(channel: 'interviewer' | 'user'): Promise<void>;
  sendAudio(channel, pcm16: ArrayBuffer): void;
  close(channel): void;
  // events: partial(text), final(text, {speechFinal, utteranceEnd}), error
}
```

Main process holds the API key and the WebSocket(s) — one socket per active channel.

Deepgram config to request: 16 kHz, linear16, mono, `interim_results=true`,
`punctuate=true`, `endpointing` on, `utterance_end_ms` set (~1000 ms), and (if using
nova-class model) `smart_format=true`. Use the returned `is_final` + `speech_final` +
`UtteranceEnd` signals to know an utterance is complete. Language: config, default `en`.

Emit to the rest of the app:
- `interviewer.partial` — live interim text (render greyed in overlay).
- `interviewer.final` — finalized utterance (feeds the question detector).

Reconnect with backoff on socket drop; never crash the session on a transcription hiccup.

---

## 6. Question detection & routing

The detector consumes finalized interviewer utterances and decides **whether** and **when**
to trigger an answer, and in **which mode**.

Trigger when any of these hold on a finalized utterance (debounced ~600–900 ms after
`utterance_end`, tunable):

- The utterance ends with `?`, or
- It matches interrogative/imperative patterns (starts with who/what/why/how/when/where/
  which/can you/could you/tell me/describe/explain/walk me through/write/implement/given/
  design/what is the time complexity/etc.), or
- The interviewer has gone silent for `> SILENCE_PROMPT_MS` after a substantive utterance.

Suppress triggers when:

- The utterance is trivial acknowledgement ("okay", "great", "mm-hmm", "thanks").
- The user (mic channel) is currently speaking — do not answer over the user.
- A trigger fired < `COOLDOWN_MS` ago for the same/adjacent utterance (de-dupe).

**Mode selection:**
- **Coding** if the utterance contains coding cues (write/implement/function/algorithm/
  complexity/array/string/tree/return/given an input…) **or** the user pressed the
  screenshot hotkey (screenshots always route to `MODEL_SMART` vision).
- **Behavioral/spoken** otherwise → `MODEL_FAST`, short talking-point answer.

All thresholds live in `config.ts`. The detector must be easy to tune by editing constants.
Provide a manual "answer now" hotkey that forces a call on the current transcript buffer,
and a "stop/cancel" hotkey that aborts an in-flight stream.

---

## 7. Screen capture pipeline

On the screenshot hotkey (default `Ctrl+\``, configurable):

1. Main calls `desktopCapturer.getSources({ types: ['screen'], thumbnailSize })` with
   `thumbnailSize` set to the **primary display's full resolution** (from
   `screen.getPrimaryDisplay().size` × `scaleFactor`).
2. Take the primary screen's `thumbnail` (a `NativeImage`), convert to PNG, base64-encode.
3. Optionally downscale the longest edge to ~1568 px to control tokens/latency while
   staying legible for code (make this a config flag; default on).
4. Route to the AI brain in **coding mode** with the image + current transcript context.

Multi-monitor: default to the display the interview window is on if detectable; otherwise
primary. Keep it a config choice. The captured screenshot is held in memory only and never
written to disk unless the user enables a debug flag.

---

## 8. AI brain (Anthropic Messages API)

Streaming answers via `@anthropic-ai/sdk` in the main process. See `PROMPTS.md` for the
exact templates. Behavior:

- Build a **system prompt** from: role/goal, answer-mode rules, and the user's context
  pack (résumé, JD, notes, preferred voice/length). Cache the context pack where possible.
- Build the **user message** from: recent interviewer transcript window (last N utterances)
  + the current question + (coding mode) the screenshot image block.
- **Stream** tokens (`client.messages.stream`), forwarding deltas to the overlay via IPC so
  text appears as it generates. Target first visible token **< ~2 s** after trigger.
- Support **abort**: a cancel hotkey aborts the stream (`stream.controller.abort()` / the
  SDK's abort signal) and clears the overlay's "thinking" state.
- Enforce **brevity by mode**:
  - Behavioral: 3–6 crisp bullet talking points, first-person, in the user's voice, no
    filler, ready to speak aloud. Hard cap on tokens.
  - Coding: short restated approach (1–3 lines) → complete, correct code in the detected
    language → one line on time/space complexity → 1–2 edge cases. No essays.
- **Model tiers:** behavioral → `MODEL_FAST`; coding/vision → `MODEL_SMART`. Both from
  config. Verify current model IDs from the official model docs at build time.

Errors (rate limit, network) surface as a small non-alarming overlay indicator, never a
modal, and never steal focus.

---

## 9. Context pack (résumé / JD / notes)

Editable in the control window, persisted via `electron-store`:

- **Résumé** — pasted text or imported from a `.txt`/`.md`/`.pdf` (if PDF, extract text).
- **Job description** — pasted text.
- **Company / role notes** — freeform.
- **Voice & length prefs** — e.g. "concise, senior full-stack, first person, no buzzwords";
  default answer length per mode.
- **Language** for coding answers (default: infer from the screenshot/question; fallback
  configurable, e.g. TypeScript or Python).

The context pack is injected into the system prompt for every call. Keep it token-bounded;
if the résumé is long, store a trimmed "highlights" version used at runtime.

---

## 10. Overlay UI/UX

- **Default state:** compact, semi-transparent card, top-center, click-through. Shows a
  small status dot (listening / thinking / idle) and the latest answer.
- **Answer rendering:** streamed text; markdown with syntax-highlighted code blocks for
  coding answers (use a lightweight highlighter). Auto-scroll to newest; hotkeys to scroll
  up/down without focus.
- **Live transcript strip (optional):** a one-line interim transcript of the interviewer,
  toggleable, greyed. Off by default to reduce clutter/eye movement.
- **Opacity / size / position:** adjustable by hotkey and remembered across sessions.
- **Panic/hide:** a single hotkey instantly hides the overlay (and stops streaming). A
  second press restores it. This is the "someone's watching" button.
- **No notifications, no sounds, no taskbar/tray flashing** during a session.

Visual style: minimal, low-contrast until hovered/active, so a glance is enough. Follow
`frontend-design` sensibilities — intentional, not templated — but keep motion minimal.

---

## 11. Global hotkeys (defaults, all configurable)

| Action                          | Default            |
|---------------------------------|--------------------|
| Toggle listening on/off         | `Ctrl+Shift+L`     |
| Screenshot → coding answer      | `` Ctrl+` ``       |
| Force "answer now" (from audio) | `Ctrl+Shift+Enter` |
| Cancel/stop current answer      | `Ctrl+Shift+.`     |
| Panic hide / show overlay       | `Ctrl+Shift+H`     |
| Toggle click-through            | `Ctrl+Shift+M`     |
| Cycle answer mode (auto/beh/code)| `Ctrl+Shift+X`    |
| Scroll answer up / down         | `Ctrl+Up` / `Ctrl+Down` |
| Move overlay (arrow nudge)      | `Ctrl+Alt+Arrows`  |
| Opacity down / up               | `Ctrl+Alt+-` / `=` |

Register via `globalShortcut`. If a shortcut fails to register (taken by another app),
surface it in the control window and let the user rebind. Never let a missing hotkey crash
startup.

---

## 12. Persistence & files

- Config + context pack + hotkeys + tuning overrides → `electron-store` JSON in
  `app.getPath('userData')`.
- API keys → prefer Windows Credential Manager via `keytar`; fall back to `.env` for dev.
- Transcripts (optional, opt-in) → per-session JSON in `userData/sessions/`, plain text,
  user-deletable from the control window. Off by default.
- Nothing else is written to disk. No screenshots persisted unless debug flag on.

---

## 13. IPC contract (define once, in `src/shared/ipc.ts`)

Typed channels, e.g.:

- `audio:frame` (renderer→main): `{ channel, pcm16: ArrayBuffer, ts }`
- `audio:vad` (renderer→main): `{ channel, event: 'start'|'end' }`
- `stt:partial` / `stt:final` (main→overlay/control): `{ channel, text, meta }`
- `answer:delta` (main→overlay): `{ text }`
- `answer:state` (main→overlay): `{ state: 'idle'|'thinking'|'streaming'|'error' }`
- `hotkey:*` (main→overlay/control): scroll/mode/panic/etc.
- `capture:screenshot` (main internal) and `answer:request` (main internal)
- `config:get` / `config:set` (renderer↔main)
- `session:start` / `session:stop`

No ad-hoc `ipcRenderer.send` with stringly-typed channels in feature code — import the
channel constants and payload types from the shared module.

---

## 14. Non-functional targets

- **Latency:** first visible answer token < ~2 s after trigger (spoken); screenshot answer
  first token < ~2.5 s. Streaming throughout.
- **CPU:** overlay renderer near-idle when not streaming; audio worklet is the only steady
  cost. No busy loops.
- **Stability:** a provider/network error never crashes the app or the session; it degrades
  to an indicator and auto-retries.
- **Privacy:** no data leaves the machine except to the configured STT and Anthropic
  endpoints. No logging of transcripts/audio/screens/keys.

---

## 15. Project structure (target)

```
interview-copilot/
├─ CLAUDE.md
├─ DECISIONS.md
├─ README.md
├─ .env.example
├─ .nvmrc
├─ electron.vite.config.ts
├─ electron-builder.yml
├─ package.json
├─ tsconfig.json
├─ tailwind.config.ts
└─ src/
   ├─ main/
   │  ├─ index.ts              # app lifecycle, window creation
   │  ├─ windows/overlay.ts    # overlay window + content protection
   │  ├─ windows/control.ts
   │  ├─ windows/audio-host.ts # hidden renderer for capture (if separate)
   │  ├─ hotkeys.ts
   │  ├─ capture/screenshot.ts
   │  ├─ audio/loopback.ts     # setDisplayMediaRequestHandler wiring
   │  ├─ stt/index.ts          # SttProvider interface
   │  ├─ stt/deepgram.ts
   │  ├─ ai/anthropic.ts       # streaming client
   │  ├─ ai/detector.ts        # question detection & routing
   │  ├─ store.ts              # electron-store + keytar
   │  └─ ipc.ts                # main-side handlers
   ├─ preload/index.ts         # contextBridge API
   ├─ renderer/
   │  ├─ overlay/              # HUD app (React)
   │  ├─ control/              # settings/context app (React)
   │  └─ audio/                # AudioWorklet + capture glue
   └─ shared/
      ├─ ipc.ts                # channel names + payload types
      └─ config.ts             # all tuning constants & defaults
```

Deviate only with a note in `DECISIONS.md`.
