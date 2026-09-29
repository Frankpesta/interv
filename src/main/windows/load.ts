import { app, type BrowserWindow } from 'electron'
import { join } from 'node:path'

export async function loadRenderer(window: BrowserWindow, page: 'control' | 'overlay'): Promise<void> {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (!app.isPackaged && devUrl) {
    await window.loadURL(`${devUrl}/${page}/index.html`)
  } else {
    await window.loadFile(join(import.meta.dirname, `../renderer/${page}/index.html`))
  }
}

export const preloadPath = join(import.meta.dirname, '../preload/index.cjs')
