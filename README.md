# Interview Copilot

Personal Windows desktop assistant. **Phase 2:** screenshot-to-coding answers with Anthropic or OpenAI, a local context editor, streamed markdown/code, cancellation, overlay controls, and a system tray. Gates 0 and 1 passed, including user-reported recording/focus checks. Live Phase 2 acceptance is pending. Audio is not implemented yet.

## Development

Use Windows 10 version 2004 or newer / Windows 11, Node 24 LTS (24.18.0 pinned in `.nvmrc`), and npm.

```sh
npm ci
npm run dev
```

The control window opens alongside a click-through overlay. Use **Hide overlay / Show overlay** in control, or the tray menu. Closing control leaves the app in the tray. Double-click the tray icon to reopen control, or choose **Quit** to exit fully.

Copy `.env.example` to `.env` locally and set either `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`. Restart the app after changing keys. Do not commit `.env` or paste credentials into chat. The app exposes key readiness, never key values, to its renderers.

In **Your context**, choose Anthropic or OpenAI, enter résumé/highlights, job description, notes, and language, choose a display, then **Save context**. The choice persists locally. Close control to tray, open the coding problem, and press Ctrl+backtick. Cancel with Ctrl+Shift+period; hide/show with Ctrl+Shift+H. Hidden overlays suppress requests, and hiding cancels pending capture/generation. Increase overlay size with Ctrl+Alt+Shift+Up if needed; scroll using Ctrl+Up/Down.

Only the saved provider receives the screenshot and context. Failed calls never fall back to the other provider. An in-flight request retains its provider/context snapshot even if settings change. Requests can retry once before output on transient failures; streamed partial answers are never automatically replayed. Screenshots and answers are not written to disk. Context/settings are stored in Electron's local user-data folder by electron-store.

Defaults verified on 2026-09-29: Anthropic `claude-sonnet-5-5` ([model docs](https://platform.claude.com/docs/en/models/overview)); OpenAI `gpt-6-sol` ([model docs](https://developers.openai.com/api/docs/models/gpt-6-sol)). Override with `MODEL_SMART` or `OPENAI_MODEL_SMART`; model access depends on your API account. OpenAI uses the [Responses API](https://developers.openai.com/api/docs/guides/streaming-responses) with `store: false` and reasoning effort `none` for the initial latency target. Overrides must support vision and the corresponding request options. Anthropic uses streamed Messages with thinking disabled. The first-token indicator measures receipt in main, not a verified end-to-end display latency.

## Checks

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
```

`build` produces compiled application files in `out/`. `preview` runs those files in Electron. NSIS packaging is planned for Phase 6; there is no installer yet.

Follow [the acceptance checklist](scripts/dry-run.md) and record results in [DECISIONS.md](DECISIONS.md). No automated check proves screen-capture exclusion or absence of focus theft on the target machine.

## Overlay hotkeys available now

Hide/show (Ctrl+Shift+H), click-through (Ctrl+Shift+M), movement (Ctrl+Alt+arrows), screenshot (Ctrl+backtick), cancel (Ctrl+Shift+period), and scroll (Ctrl+Up/Down) are active. Resize with Ctrl+Alt+Shift+Up / Down. The overlay always remains non-focusable, including when click-through is off. Use the control window to rebind shortcuts; unavailable combinations show an error and preserve the previous binding. Shortcut changes last until app exit; shortcut persistence is planned for Phase 5.

To verify browser focus, open `scripts/focus-test.html` in your browser, click **Reset and focus**, and keep typing while exercising all overlay shortcuts. The log should remain empty. Separately check real full-display recording, browser display/tab sharing, and maximized/fullscreen behavior. See the acceptance checklist for the complete gate.

## Remaining planned hotkeys

Listening, manual audio answers, mode cycling, and opacity controls below remain planned. The table includes the active defaults for reference.

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

The app sends screenshots and bounded context only to the selected Anthropic or OpenAI provider on request. OpenAI response storage is disabled, but this does not replace the provider's account data policies. No audio capture, transcript saving, automatic clipboard writes, or typing injection is implemented. Electron may create its ordinary runtime cache in the local app-data folder. OS credential storage is planned for Phase 5; current development credentials use local environment variables.

## Project docs

- [Scope and locked decisions](docs/CLAUDE.md)
- [Technical specification](docs/SPEC.md)
- [Required phase gates](docs/BUILD_PLAN.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Prompt templates](docs/PROMPTS.md)
