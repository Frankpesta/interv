# CLAUDE.md — Interview Copilot (Personal, Windows)

You are building a **personal desktop AI interview assistant** for a single user on
**Windows**. It runs as an always-on-top, transparent overlay that is **excluded from
screen capture**, listens to the interviewer's audio, can screenshot the screen on
demand, and streams concise AI answers into the overlay. Primary target: **automated
("AI") interviews that sometimes require writing code.**

Read this file first, then read the docs in this order before writing any code:

1. `docs/SPEC.md` — full technical specification (authoritative for behavior).
2. `docs/BUILD_PLAN.md` — the phased execution plan with acceptance gates. Build in
   this exact order. Do not start a phase until the previous phase's gate passes.
3. `docs/PROMPTS.md` — exact system/user prompt templates for the AI brain.

If anything here conflicts with a doc, **this file wins** for process/guardrails and
`SPEC.md` wins for feature behavior. If you hit a genuine ambiguity that changes
architecture, stop and ask; otherwise proceed and note the decision in `DECISIONS.md`.

---

## Scope guardrails (do not exceed)

This is a **single-user local tool**. Deliberately **out of scope** — do not build:

- No backend server, no database of users, no multi-tenant anything.
- No authentication, no accounts, no login.
- No billing, subscriptions, or payment integration.
- No cloud sync, telemetry, analytics, crash reporting, or "phone home" of any kind.
- No macOS or Linux support. **Windows 10 (build 2004 / 20H1) and Windows 11 only.**
- No auto-update server. (A manual `electron-builder` NSIS installer is fine.)

Everything runs on the user's machine. API keys live in a local `.env` / OS keychain,
never committed. Because the whole app is local and personal, **do not over-engineer**
security boundaries that only matter for shipped multi-user software (e.g. you may hold
provider API keys in the main process and call providers directly).

Keep the surface area small. Prefer the simplest thing that passes the phase gate.

---

## Locked technical decisions

Do not relitigate these unless a gate fails because of them.

| Concern              | Decision                                                                 |
|----------------------|--------------------------------------------------------------------------|
| Shell                | **Electron** (latest stable). Two windows: a control window + an overlay. |
| Scaffold / bundler   | **electron-vite** with TypeScript.                                       |
| Renderer UI          | **React + TypeScript + Tailwind CSS + shadcn/ui** (matches user's stack).|
| Overlay animation    | Framer Motion (subtle only; never anything that draws the eye).          |
| State (renderer)     | Zustand (small, fast). No Redux.                                         |
| Local persistence    | `electron-store` for config; plain JSON files for transcripts.           |
| Global hotkeys       | Electron `globalShortcut`.                                               |
| Audio → PCM          | Renderer `AudioWorklet` producing 16 kHz mono PCM16.                     |
| Speech-to-text       | Streaming provider over WebSocket. **Deepgram** is the default target.   |
| LLM                  | **Anthropic Messages API**, streaming, via `@anthropic-ai/sdk`.          |
| Screenshot           | Electron `desktopCapturer` full-res thumbnail → base64 PNG.              |
| Packaging            | `electron-builder`, NSIS target, x64.                                    |
| Node                 | Use the current LTS. Pin the version in `.nvmrc` / `package.json engines`.|

**Model IDs are not hardcoded blindly.** Anthropic model names change often. Before
wiring the LLM, confirm the current model IDs from the official model docs
(`https://docs.claude.com/en/docs/about-claude/models`). Put the chosen IDs in config
(`.env` + a `models` block), not scattered through code. Use **two tiers**:

- `MODEL_FAST` — low-latency, for spoken/behavioral answers (a Haiku-class model).
- `MODEL_SMART` — stronger + vision, for coding screenshots (a Sonnet/Opus-class model).

If you cannot verify current IDs at build time, leave clearly-marked TODOs in config and
proceed; do not invent IDs inside business logic.

---

## The two hard requirements (get these right or nothing else matters)

1. **Invisible to screen capture.** The overlay window must not appear in Zoom/Meet/
   Teams/browser screen shares or in the interview platform's own screen recording.
   On Windows this is `win.setContentProtection(true)` (maps to
   `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)`, Win10 2004+). Verify it in Phase 1
   with a real screen recording before building anything on top of it.

2. **Never steal focus / never trigger a blur or visibility flag.** Browser-based AI
   interview platforms detect tab blur, window focus loss, and `visibilitychange`. The
   overlay must be created `focusable: false`, shown with `showInactive()`, and driven
   **only** by global hotkeys. Interacting with the overlay must **never** cause the
   interview window/tab to lose focus. Treat any focus theft as a P0 bug.

State honestly in the UI and README what stealth does and does not cover: it hides the
window from *video capture only*. It does **not** hide the process from proctoring/
process inspection, and it cannot mask webcam eye-tracking. Do not claim otherwise.

---

## Definition of done (per feature)

A feature is done when:

- It meets the behavior in `SPEC.md`.
- Its phase acceptance criteria in `BUILD_PLAN.md` pass, verified by the manual test
  script listed there (this app is GUI/real-time; automated tests are secondary).
- It introduces no focus theft and no capture leak (re-check both after overlay changes).
- Types are clean (`tsc --noEmit` passes) and lint passes.
- Secrets are not hardcoded and not logged.

---

## Coding conventions

- TypeScript strict mode on. No `any` unless annotated with a `// why:` comment.
- Main/preload/renderer separation is strict. Renderer has **no** Node integration;
  everything crosses via a typed `contextBridge` preload API. Define the IPC contract
  once in `src/shared/ipc.ts` and reuse it on both sides.
- All IPC channel names, hotkey defaults, provider names, and tuning constants live in
  `src/shared/config.ts` — no magic strings/numbers in feature code.
- Keep the overlay renderer lean: no heavy libraries, no blocking work on the UI thread.
  Audio DSP goes in the AudioWorklet; network goes to the main process.
- Log to a local rotating file in dev only (`app.getPath('logs')`); never log audio
  bytes, transcripts, screenshots, or keys. Redact by default.
- Commit in small, working increments with messages tied to the phase (e.g.
  `phase-1: content-protected overlay window`).

## What to produce as you go

- `README.md` — how to install, configure keys, run, package, and the honest stealth
  disclaimer. Include the hotkey cheat-sheet.
- `.env.example` — every key the app reads, with comments, no real values.
- `DECISIONS.md` — an append-only log of any non-trivial choice you made and why.

Start with Phase 0 in `docs/BUILD_PLAN.md`.
