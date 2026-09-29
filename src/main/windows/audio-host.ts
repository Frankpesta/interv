import { BrowserWindow, desktopCapturer, screen } from 'electron'
import { preloadPath } from './load'

export function createAudioHost(enabled: () => boolean): BrowserWindow {
  const host = new BrowserWindow({ show: false, focusable: false, skipTaskbar: true,
    webPreferences: { preload: preloadPath, partition: 'audio-capture', sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' } })
  host.webContents.session.setPermissionRequestHandler((contents, permission, callback) => {
    callback(contents === host.webContents && enabled() && (permission === 'media' || permission === 'display-capture'))
  })
  host.webContents.session.setPermissionCheckHandler((contents, permission) => contents === host.webContents && enabled() && (permission === 'media' || permission === 'display-capture'))
  host.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    if (!enabled() || request.frame !== host.webContents.mainFrame) { callback({}); return }
    void desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } }).then((sources) => {
      if (!enabled() || host.isDestroyed()) { callback({}); return }
      const source = sources.find((item) => item.display_id === String(screen.getPrimaryDisplay().id))
      callback(source ? { video: source, audio: 'loopback' } : {})
    }).catch(() => callback({}))
  }, { useSystemPicker: false })
  return host
}
