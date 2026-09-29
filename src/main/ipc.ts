import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { IPC, type AppState } from '../shared/ipc'
import { OVERLAY_HOTKEYS, type OverlayHotkey } from '../shared/config'

export function registerIpc(control: BrowserWindow, overlay: BrowserWindow, getState: () => AppState, rebind: (action: OverlayHotkey, accelerator: string) => void): () => void {
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
  return () => {
    ipcMain.removeHandler(IPC.appGetState)
    ipcMain.removeHandler(IPC.overlaySetVisible)
    ipcMain.removeHandler(IPC.hotkeyRebind)
  }
}
