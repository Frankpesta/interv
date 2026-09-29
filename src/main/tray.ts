import { Menu, nativeImage, Tray } from 'electron'
import { APP_NAME } from '../shared/config'

export function createTray(actions: { openControl(): void; toggleOverlay(): void; toggleClickThrough(): void; quit(): void }): Tray {
  // Locally generated 24px BGRA icon; no remote assets or icon font dependency.
  const pixels = Buffer.alloc(24 * 24 * 4)
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const offset = (y * 24 + x) * 4
    const inside = (x - 11.5) ** 2 + (y - 11.5) ** 2 < 115
    if (inside) {
      const mark = x >= 10 && x <= 13 && y >= 6 && y <= 17
      pixels.set(mark ? [245, 245, 245, 255] : [93, 104, 50, 255], offset)
    }
  }
  const tray = new Tray(nativeImage.createFromBitmap(pixels, { width: 24, height: 24 }))
  tray.setToolTip(APP_NAME)
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open control window', click: actions.openControl },
    { label: 'Show / hide overlay', click: actions.toggleOverlay },
    { label: 'Toggle click-through', click: actions.toggleClickThrough },
    { type: 'separator' },
    { label: 'Quit', click: actions.quit }
  ]))
  tray.on('double-click', actions.openControl)
  return tray
}
