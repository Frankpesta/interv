import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Button } from '@/components/ui/button'
import { useControlStore } from './store'
import '../styles.css'
import type { OverlayHotkey } from '../../shared/config'

const shortcutLabels: Record<OverlayHotkey, string> = {
  panic: 'Hide / show', clickThrough: 'Click-through', moveUp: 'Move up', moveDown: 'Move down',
  moveLeft: 'Move left', moveRight: 'Move right', smaller: 'Make smaller', larger: 'Make larger'
}

function Control(): React.JSX.Element {
  const { app, error, setApp, setError } = useControlStore()
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    const unsubscribe = window.api.onState(setApp)
    void window.api.getState().then((state) => { if (active) setApp(state) }).catch(() => {
      if (active) setError('Unable to connect to the desktop process. Restart the app.')
    })
    return () => { active = false; unsubscribe() }
  }, [setApp, setError])
  async function toggleOverlay(): Promise<void> {
    if (!app) return
    setBusy(true)
    setError(null)
    try { setApp(await window.api.setOverlayVisible(!app.overlayVisible)) }
    catch { setError('The overlay could not be updated. Please try again.') }
    finally { setBusy(false) }
  }
  async function rebind(action: OverlayHotkey, form: HTMLFormElement): Promise<void> {
    const accelerator = new FormData(form).get('accelerator')
    if (typeof accelerator !== 'string') return
    setError(null)
    try { setApp(await window.api.rebindHotkey(action, accelerator)) }
    catch { setError('That shortcut is unavailable or invalid. Try a different key combination; the previous binding is unchanged.') }
  }
  return <main className="mx-auto max-w-5xl px-10 py-9">
    <header className="flex items-center justify-between border-b border-border pb-6">
      <div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-white">i</div><span className="font-semibold tracking-tight">Interview Copilot</span></div>
      <span className="rounded-full border border-border px-3 py-1 text-xs text-stone-600">Windows · Personal workspace</span>
    </header>
    <section className="pt-10">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Getting started</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Hello. Your workspace is ready.</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-stone-600">The desktop foundation is in place. Preview the overlay while the next build stages bring context, transcription, and answers to your workspace.</p>
    </section>
    <div className="mt-8 grid grid-cols-[1.25fr_1fr] gap-5">
      <section className="rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Your overlay</h2><span className="text-xs text-stone-500">{app ? (app.overlayVisible ? 'Visible' : 'Hidden') : 'Connecting…'}</span></div>
        <div className="my-5 rounded-xl bg-[#edf0ea] px-5 py-6"><div className="rounded-xl bg-[#24352e] p-4 text-white"><p className="flex items-center gap-2 text-xs text-[#b4c7bc]"><span className="size-1.5 rounded-full bg-[#c0cabb]" />Idle · Preview</p><p className="mt-3 text-sm">Your answers will appear here.</p></div></div>
        <Button onClick={() => void toggleOverlay()} disabled={!app || busy}>{app?.overlayVisible ? 'Hide overlay' : 'Show overlay'}</Button>
        <p className="mt-3 text-xs leading-5 text-stone-500">The overlay is click-through. You can also show or hide it from the system tray.</p>
      </section>
      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-lg font-semibold">Build progress</h2>
        <ol className="mt-5 space-y-5 text-sm">
          <li className="flex gap-3"><span className="text-primary">01</span><div><p className="font-medium">Desktop foundation</p><p className="mt-1 text-xs text-stone-500">Verified</p></div></li>
          <li className="flex gap-3 text-stone-500"><span>02</span><div><p>Overlay validation</p><p className="mt-1 text-xs">Current stage · capture and focus checks pending</p></div></li>
          <li className="flex gap-3 text-stone-500"><span>03</span><div><p>Context & answers</p><p className="mt-1 text-xs">Screenshot responses, then live audio</p></div></li>
        </ol>
      </section>
    </div>
    <section className="mt-5 rounded-2xl border border-border bg-white p-6">
      <h2 className="text-lg font-semibold">Overlay shortcuts</h2>
      <p className="mt-2 text-xs text-stone-500">Click-through is {app?.clickThrough ? 'on' : 'off'}. Shortcut changes last until you quit the app.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {app?.shortcuts.map((shortcut) => <form key={`${shortcut.action}-${shortcut.accelerator}`} className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); void rebind(shortcut.action, event.currentTarget) }}>
          <label className="min-w-0 flex-1 text-xs"><span className={shortcut.registered ? 'text-stone-600' : 'text-red-700'}>{shortcutLabels[shortcut.action]} · {shortcut.registered ? 'Active' : 'Unavailable'}</span><input name="accelerator" aria-label={`${shortcutLabels[shortcut.action]} shortcut`} defaultValue={shortcut.accelerator} maxLength={80} required className="mt-1 block h-9 w-full rounded-lg border border-border bg-background px-2 text-sm focus-visible:outline-primary" /></label>
          <Button type="submit" variant="outline" size="sm">Set</Button>
        </form>)}
      </div>
    </section>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <footer className="mt-7 space-y-2 text-xs leading-5 text-stone-500">
      <p>No audio is being captured. AI providers are not connected. Close this window to keep the app in the tray; use tray Quit to exit.</p>
      <p>Capture protection requires validation on this machine. It applies to video capture only and does not hide the process or mask webcam gaze tracking.</p>
      <p className="pt-2 text-stone-400">{app ? `v${app.version} · Phase ${app.phase}` : 'Connecting to desktop…'}</p>
    </footer>
  </main>
}
createRoot(document.getElementById('root')!).render(<StrictMode><Control /></StrictMode>)
