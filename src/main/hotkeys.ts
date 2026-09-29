import { globalShortcut, screen, type BrowserWindow } from 'electron'
import { DEFAULTS, OVERLAY_HOTKEYS, type OverlayHotkey } from '../shared/config'
import type { AppState } from '../shared/ipc'

export function createOverlayControls(overlay: BrowserWindow, changed: () => void) {
  let clickThrough = true
  const shortcuts: AppState['shortcuts'] = []
  const toggleVisible = (): void => {
    if (overlay.isVisible()) overlay.hide()
    else overlay.showInactive()
    // Phase 2 will also abort the active answer here. There are no streams yet.
  }
  const toggleClickThrough = (): void => {
    clickThrough = !clickThrough
    overlay.setIgnoreMouseEvents(clickThrough, { forward: true })
    changed()
  }
  function move(dx: number, dy: number): void {
    const bounds = overlay.getBounds()
    const desired = { ...bounds, x: bounds.x + dx, y: bounds.y + dy }
    const area = screen.getDisplayMatching(desired).workArea
    overlay.setPosition(
      Math.max(area.x, Math.min(desired.x, area.x + area.width - bounds.width)),
      Math.max(area.y, Math.min(desired.y, area.y + area.height - bounds.height))
    )
  }
  function resize(delta: number): void {
    const bounds = overlay.getBounds()
    const area = screen.getDisplayMatching(bounds).workArea
    const width = Math.min(area.width, Math.max(DEFAULTS.overlay.minWidth, bounds.width + delta))
    const height = Math.min(area.height, Math.max(DEFAULTS.overlay.minHeight, bounds.height + delta))
    overlay.setBounds({
      x: Math.max(area.x, Math.min(bounds.x, area.x + area.width - width)),
      y: Math.max(area.y, Math.min(bounds.y, area.y + area.height - height)), width, height
    })
  }
  const step = DEFAULTS.overlay.nudgePx
  const handlers: Record<OverlayHotkey, () => void> = {
    panic: toggleVisible, clickThrough: toggleClickThrough,
    moveUp: () => move(0, -step), moveDown: () => move(0, step),
    moveLeft: () => move(-step, 0), moveRight: () => move(step, 0),
    smaller: () => resize(-step), larger: () => resize(step)
  }
  function register(action: OverlayHotkey, accelerator: string): boolean {
    try { return globalShortcut.register(accelerator, handlers[action]) }
    catch { return false }
  }
  for (const action of Object.keys(OVERLAY_HOTKEYS) as OverlayHotkey[]) {
    const accelerator = OVERLAY_HOTKEYS[action]
    shortcuts.push({ action, accelerator, registered: register(action, accelerator) })
  }
  function rebind(action: OverlayHotkey, accelerator: string): void {
    const entry = shortcuts.find((item) => item.action === action)
    if (!entry || accelerator.length > 80 || !accelerator.trim()) throw new Error('Invalid shortcut')
    if (entry.accelerator === accelerator && entry.registered) return
    if (!register(action, accelerator)) throw new Error('Shortcut unavailable. Try a different combination.')
    if (entry.registered) globalShortcut.unregister(entry.accelerator)
    entry.accelerator = accelerator
    entry.registered = true
    changed()
  }
  return { toggleVisible, toggleClickThrough, rebind, getState: () => ({ clickThrough, shortcuts: shortcuts.map((item) => ({ ...item })) }) }
}
