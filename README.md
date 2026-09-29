# Interview Copilot

Personal Windows desktop assistant. **Phase 1 overlay validation:** control window, placeholder overlay, typed IPC, system tray, and overlay shortcuts. Phase 0 is verified. Audio, AI, and context editing are not enabled yet.

## Development

Use Windows 10 version 2004 or newer / Windows 11, Node 24 LTS (24.18.0 pinned in `.nvmrc`), and npm.

```sh
npm ci
npm run dev
```

The control window opens alongside a click-through overlay. Use **Hide overlay / Show overlay** in control, or the tray menu. Closing control leaves the app in the tray. Double-click the tray icon to reopen control, or choose **Quit** to exit fully.

No API keys are needed for this phase. The reserved variables in `.env.example` will be wired when providers are implemented. Do not commit `.env` or credentials.

## Checks

```sh
npm run typecheck
npm run lint
npm run build
npm run preview
```

`build` produces compiled application files in `out/`. `preview` runs those files in Electron. NSIS packaging is planned for Phase 6; there is no installer yet.

Follow [the acceptance checklist](scripts/dry-run.md) and record results in [DECISIONS.md](DECISIONS.md). No automated check proves screen-capture exclusion or absence of focus theft on the target machine.

## Overlay hotkeys available now

Hide/show (Ctrl+Shift+H), click-through (Ctrl+Shift+M), and movement (Ctrl+Alt+arrows) are active. Resize with Ctrl+Alt+Shift+Up / Down. The overlay always remains non-focusable, including when click-through is off. Use the control window to rebind shortcuts; unavailable combinations show an error and preserve the previous binding. Changes last until app exit; persistence is planned for Phase 5.

To verify browser focus, open `scripts/focus-test.html` in your browser, click **Reset and focus**, and keep typing while exercising all overlay shortcuts. The log should remain empty. Separately check real full-display recording, browser display/tab sharing, and maximized/fullscreen behavior. See the acceptance checklist for the complete gate.

## Remaining planned hotkeys

Only overlay actions described above are registered. Listening, screenshots, answers, scrolling, mode, and opacity controls below remain planned.

| Action | Shortcut |
|---|---|
| Listen | Ctrl+Shift+L |
| Screenshot | Ctrl+backtick |
| Answer now | Ctrl+Shift+Enter |
| Cancel | Ctrl+Shift+period |
| Hide/show | Ctrl+Shift+H |
| Click-through | Ctrl+Shift+M |
| Answer mode | Ctrl+Shift+X |
| Scroll | Ctrl+Up / Down |
| Move | Ctrl+Alt+arrows |
| Opacity | Ctrl+Alt+minus / equals |

## Capture protection

The overlay requests Windows content protection, but its behavior is not yet validated on this machine. Content protection hides the window from video capture only; it does not defeat process-level proctoring or webcam gaze tracking. Compatibility must be checked against the actual capture application, Windows build, and installed app.

The scaffold makes no provider requests, captures no audio or screenshots, and writes no transcript or credential files. Electron may create its ordinary runtime cache in the local app-data folder. Later phases send data only to the configured transcription and Anthropic endpoints; transcript saving is opt-in.

## Project docs

- [Scope and locked decisions](docs/CLAUDE.md)
- [Technical specification](docs/SPEC.md)
- [Required phase gates](docs/BUILD_PLAN.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Prompt templates](docs/PROMPTS.md)
