import { globalShortcut, screen, type BrowserWindow } from 'electron'
import { DEFAULTS, OVERLAY_HOTKEYS, type OverlayHotkey } from '../shared/config'
import type { AppState } from '../shared/ipc'
import Store from 'electron-store'

export function createOverlayControls(overlay: BrowserWindow, changed: () => void, answers: { screenshot(): void; cancel(): void; toggleListening(): void; answerNow(): void; cycleMode(): void; scroll(direction: 'up' | 'down'): void }) {
  const store = new Store<{ bounds: Electron.Rectangle | null; opacity: number; shortcuts: Partial<Record<OverlayHotkey, string>> }>({ name: 'overlay', defaults: { bounds: null, opacity: DEFAULTS.overlay.opacity, shortcuts: {} } })
  let opacity = store.get('opacity')
  if (!Number.isFinite(opacity)) opacity = DEFAULTS.overlay.opacity
  opacity = Math.max(0.3, Math.min(1, opacity)); overlay.setOpacity(opacity)
  const saved = store.get('bounds')
  if (saved && [saved.x, saved.y, saved.width, saved.height].every(Number.isFinite) && saved.width > 0 && saved.height > 0) overlay.setBounds(saved)
  function clamp(): void {
    const bounds = overlay.getBounds(), area = screen.getDisplayMatching(bounds).workArea
    const width = Math.min(area.width, Math.max(DEFAULTS.overlay.minWidth, bounds.width)), height = Math.min(area.height, Math.max(DEFAULTS.overlay.minHeight, bounds.height))
    overlay.setBounds({ width, height, x: Math.max(area.x, Math.min(bounds.x, area.x + area.width - width)), y: Math.max(area.y, Math.min(bounds.y, area.y + area.height - height)) })
  }
  clamp()
  const remember = (): void => { store.set('bounds', overlay.getBounds()) }
  overlay.on('moved', remember); overlay.on('resized', remember)
  screen.on('display-removed', clamp); screen.on('display-metrics-changed', clamp)
  overlay.on('closed', () => { screen.removeListener('display-removed', clamp); screen.removeListener('display-metrics-changed', clamp) })
  function changeOpacity(delta: number): void { opacity = Math.max(0.3, Math.min(1, opacity + delta)); overlay.setOpacity(opacity); store.set('opacity', opacity) }
  let clickThrough = true
  const shortcuts: AppState['shortcuts'] = []
  const toggleVisible = (): void => {
    if (overlay.isVisible()) overlay.hide()
    else overlay.showInactive()
    // Every hide path aborts capture/generation through the window hide listener.
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
    toggleListening: answers.toggleListening, answerNow: answers.answerNow, cycleMode: answers.cycleMode,
    opacityDown: () => changeOpacity(-DEFAULTS.overlay.opacityStep), opacityUp: () => changeOpacity(DEFAULTS.overlay.opacityStep),
    panic: toggleVisible, clickThrough: toggleClickThrough,
    moveUp: () => move(0, -step), moveDown: () => move(0, step),
    moveLeft: () => move(-step, 0), moveRight: () => move(step, 0),
    smaller: () => resize(-step), larger: () => resize(step),
    screenshot: answers.screenshot, cancel: answers.cancel,
    scrollUp: () => answers.scroll('up'), scrollDown: () => answers.scroll('down')
  }
  function register(action: OverlayHotkey, accelerator: string): boolean {
    try { return globalShortcut.register(accelerator, handlers[action]) }
    catch { return false }
  }
  for (const action of Object.keys(OVERLAY_HOTKEYS) as OverlayHotkey[]) {
    const saved = store.get('shortcuts')?.[action]
    const accelerator = typeof saved === 'string' && saved.length <= 80 ? saved : OVERLAY_HOTKEYS[action]
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
    store.set('shortcuts', Object.fromEntries(shortcuts.map((item) => [item.action, item.accelerator])))
    changed()
  }
  return { toggleVisible, toggleClickThrough, rebind, getState: () => ({ clickThrough, shortcuts: shortcuts.map((item) => ({ ...item })) }) }
}
