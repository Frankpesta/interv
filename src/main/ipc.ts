import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { IPC, type AppState, type AnswerState, type SettingsView, type SessionState, type CredentialProvider } from '../shared/ipc'
import { OVERLAY_HOTKEYS, type OverlayHotkey } from '../shared/config'

interface Services {
  session(): SessionState
  start(): void
  stop(): void
  answerNow(): void
  cycleMode(): void
  credentials(): Record<CredentialProvider, boolean>
  setCredential(provider: unknown, key: unknown): Promise<void>
  importContext(): Promise<string | null>
  listSessions(): Promise<Array<{ name: string; bytes: number }>>
  deleteSessions(): Promise<void>
  settings(): SettingsView
  saveSettings(value: unknown): SettingsView
  answer(): AnswerState
  screenshot(): void
  cancel(): void
}
export function registerIpc(control: BrowserWindow, overlay: BrowserWindow, getState: () => AppState, rebind: (action: OverlayHotkey, accelerator: string) => void, services: Services): () => void {
  function assertSender(event: IpcMainInvokeEvent, controlOnly = false): void {
    const allowed = event.sender === control.webContents || (!controlOnly && event.sender === overlay.webContents)
    if (!allowed || event.senderFrame !== event.sender.mainFrame) throw new Error('Unauthorized IPC sender')
  }
  ipcMain.handle(IPC.appGetState, (event): AppState => {
    assertSender(event)
    return getState()
  })
  ipcMain.handle(IPC.overlaySetVisible, (event, visible: unknown): AppState => {
    assertSender(event, true)
    if (typeof visible !== 'boolean') throw new Error('Expected a visibility boolean')
    if (visible) overlay.showInactive()
    else overlay.hide()
    return getState()
  })
  ipcMain.handle(IPC.hotkeyRebind, (event, action: unknown, accelerator: unknown): AppState => {
    assertSender(event, true)
    if (typeof action !== 'string' || !Object.hasOwn(OVERLAY_HOTKEYS, action) || typeof accelerator !== 'string') throw new Error('Invalid shortcut')
    rebind(action as OverlayHotkey, accelerator.trim())
    return getState()
  })
  ipcMain.handle(IPC.configGet, (event) => { assertSender(event, true); return services.settings() })
  ipcMain.handle(IPC.configSet, (event, value: unknown) => { assertSender(event, true); return services.saveSettings(value) })
  ipcMain.handle(IPC.answerGet, (event) => { assertSender(event); return services.answer() })
  ipcMain.handle(IPC.answerRequest, (event) => { assertSender(event, true); services.screenshot() })
  ipcMain.handle(IPC.answerCancel, (event) => { assertSender(event, true); services.cancel() })
  ipcMain.handle(IPC.sessionGet, (event) => { assertSender(event); return services.session() })
  ipcMain.handle(IPC.sessionStart, (event) => { assertSender(event, true); services.start() })
  ipcMain.handle(IPC.sessionStop, (event) => { assertSender(event, true); services.stop() })
  ipcMain.handle(IPC.answerNow, (event) => { assertSender(event, true); services.answerNow() })
  ipcMain.handle(IPC.modeCycle, (event) => { assertSender(event, true); services.cycleMode() })
  ipcMain.handle(IPC.credentialsGet, (event) => { assertSender(event, true); return services.credentials() })
  ipcMain.handle(IPC.credentialsSet, (event, provider: unknown, key: unknown) => { assertSender(event, true); return services.setCredential(provider, key) })
  ipcMain.handle(IPC.contextImport, (event) => { assertSender(event, true); return services.importContext() })
  ipcMain.handle(IPC.sessionsList, (event) => { assertSender(event, true); return services.listSessions() })
  ipcMain.handle(IPC.sessionsDelete, (event) => { assertSender(event, true); return services.deleteSessions() })
  return () => {
    ipcMain.removeHandler(IPC.appGetState)
    ipcMain.removeHandler(IPC.overlaySetVisible)
    ipcMain.removeHandler(IPC.hotkeyRebind)
    for (const channel of [IPC.configGet, IPC.configSet, IPC.answerGet, IPC.answerRequest, IPC.answerCancel, IPC.sessionGet, IPC.sessionStart, IPC.sessionStop, IPC.answerNow, IPC.modeCycle, IPC.credentialsGet, IPC.credentialsSet, IPC.contextImport, IPC.sessionsList, IPC.sessionsDelete]) ipcMain.removeHandler(channel)
  }
}
