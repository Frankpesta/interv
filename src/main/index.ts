import { app, BrowserWindow, globalShortcut, type Tray } from 'electron'
import { APP_NAME } from '../shared/config'
import { IPC, type AppState } from '../shared/ipc'
import { createControlWindow } from './windows/control'
import { createOverlayWindow } from './windows/overlay'
import { loadRenderer } from './windows/load'
import { registerIpc } from './ipc'
import { createTray } from './tray'

app.setName(APP_NAME)
let quitting = false
let control: BrowserWindow | undefined
let tray: Tray | undefined
let disposeIpc: (() => void) | undefined

if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => {
    if (control && !control.isDestroyed()) { control.restore(); control.show() }
  })
  app.whenReady().then(async () => {
    control = createControlWindow(() => quitting)
    const overlay = createOverlayWindow()
    const getState = (): AppState => ({
      version: app.getVersion(), phase: 0, overlayVisible: overlay.isVisible(), listening: false
    })
    const broadcast = (): void => {
      for (const window of BrowserWindow.getAllWindows()) {
        if (!window.webContents.isDestroyed()) window.webContents.send(IPC.appState, getState())
      }
    }
    disposeIpc = registerIpc(control, overlay, getState)
    overlay.on('show', broadcast)
    overlay.on('hide', broadcast)
    tray = createTray({
      openControl: () => { control?.restore(); control?.show() },
      toggleOverlay: () => { if (overlay.isVisible()) overlay.hide(); else overlay.showInactive() },
      quit: () => app.quit()
    })
    await Promise.all([loadRenderer(control, 'control'), loadRenderer(overlay, 'overlay')])
    control.show()
    overlay.showInactive()
    broadcast()
  }).catch(() => {
    console.error('Application startup failed. Check the build and local renderer assets.')
    app.exit(1)
  })
}

app.on('before-quit', () => { quitting = true })
app.on('will-quit', () => { disposeIpc?.(); globalShortcut.unregisterAll(); tray?.destroy() })
