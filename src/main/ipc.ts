import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { IPC, type AppState } from '../shared/ipc'

export function registerIpc(control: BrowserWindow, overlay: BrowserWindow, getState: () => AppState): () => void {
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
  return () => {
    ipcMain.removeHandler(IPC.appGetState)
    ipcMain.removeHandler(IPC.overlaySetVisible)
  }
}
