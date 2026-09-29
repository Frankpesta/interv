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
