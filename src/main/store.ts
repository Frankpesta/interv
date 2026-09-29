import Store from 'electron-store'
import { screen } from 'electron'
import { INITIAL_SETTINGS, validateSettings } from '../shared/settings'
import type { Settings, SettingsView, ProviderInfo } from '../shared/ipc'

export function createSettingsStore(providers: () => ProviderInfo[]) {
  const store = new Store<{ settings: Settings }>({ name: 'settings', defaults: { settings: INITIAL_SETTINGS } })
  const get = (): Settings => validateSettings(store.get('settings'))
  const view = (): SettingsView => ({
    settings: get(), providerReady: providers().find((item) => item.id === get().provider)?.ready ?? false,
    model: providers().find((item) => item.id === get().provider)?.model ?? '', providers: providers(),
    displays: screen.getAllDisplays().map((display) => ({
      id: String(display.id), label: `${display.label || `Display ${display.id}`} · ${display.size.width} × ${display.size.height} · ${Math.round(display.scaleFactor * 100)}%`
    }))
  })
  return { get, view, save: (value: unknown): SettingsView => { store.set('settings', validateSettings(value)); return view() } }
}
