import { BrowserWindow } from 'electron'
import { APP_NAME } from '../../shared/config'
import { preloadPath } from './load'

export function createControlWindow(isQuitting: () => boolean): BrowserWindow {
  const window = new BrowserWindow({
    title: APP_NAME, width: 1000, height: 760, minWidth: 720, minHeight: 580,
    show: false, backgroundColor: '#f5f5f0', autoHideMenuBar: true,
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  window.on('close', (event) => {
    if (!isQuitting()) { event.preventDefault(); window.hide() }
  })
  return window
}
