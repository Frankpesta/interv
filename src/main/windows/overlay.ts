import { BrowserWindow, screen } from 'electron'
import { DEFAULTS } from '../../shared/config'
import { preloadPath } from './load'

export function createOverlayWindow(): BrowserWindow {
  const { width, height, topOffset } = DEFAULTS.overlay
  const area = screen.getPrimaryDisplay().workArea
  const window = new BrowserWindow({
    title: 'Copilot overlay', width, height,
    x: area.x + Math.round((area.width - width) / 2), y: area.y + topOffset,
    show: false, frame: false, transparent: true, hasShadow: false,
    resizable: true, movable: true, minimizable: false, maximizable: false,
    fullscreenable: false, skipTaskbar: true, focusable: false, roundedCorners: false,
    backgroundColor: '#00000000',
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  window.setContentProtection(true)
  window.setAlwaysOnTop(true, 'screen-saver')
  window.setIgnoreMouseEvents(true, { forward: true })
  return window
}
