import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CONTEXT_LIMITS } from '../../shared/config'
import type { ContextPack, Settings, SettingsView, AiProvider } from '../../shared/ipc'

const labels: Record<keyof ContextPack, string> = { resume: 'Résumé', highlights: 'Résumé highlights used for answers', jobDescription: 'Job description', notes: 'Company / role notes', voice: 'Voice and style', language: 'Fallback coding language' }
export function ContextEditor(): React.JSX.Element {
  const [view, setView] = useState<SettingsView | null>(null)
  const [draft, setDraft] = useState<Settings | null>(null)
  const [status, setStatus] = useState('Loading saved context…')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let active = true
    void window.api.getSettings().then((next) => { if (active) { setView(next); setDraft(next.settings); setStatus('') } }).catch(() => { if (active) setStatus('Could not load settings. Restart the app and try again.') })
    return () => { active = false }
  }, [])
  async function save(): Promise<void> {
    if (!draft) return
    setSaving(true)
    try { const next = await window.api.saveSettings(draft); setView(next); setStatus('Saved on this computer.') }
    catch { setStatus('Could not save settings. Check field lengths and try again.') }
    finally { setSaving(false) }
  }
  return <section className="mt-5 rounded-2xl border border-border bg-white p-6">
    <h2 className="text-lg font-semibold">Your context</h2>
    <p className="mt-2 text-xs leading-5 text-stone-500">Saved context and the selected screen are sent only to your selected provider when you request an answer. Screenshots are never saved locally. Use highlights to choose the résumé details sent; if blank, the first 6,000 résumé characters are used.</p>
    {draft && <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); void save() }}>
      <fieldset disabled={saving} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm md:col-span-2">AI provider<select value={draft.provider} onChange={(event) => { setDraft({ ...draft, provider: event.target.value as AiProvider }); setStatus('Unsaved changes') }} className="mt-1 block w-full rounded-lg border border-border p-2">
          {view?.providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.label} · {provider.model} · {provider.ready ? 'Key configured' : 'Key missing'}</option>)}
        </select><span className="mt-2 block text-xs text-stone-500">Add keys in Credentials below. Save to apply your provider choice; key status refreshes when you save.</span></label>
        <div className="md:col-span-2"><Button variant="outline" type="button" onClick={() => void window.api.importContext().then((text) => { if (text !== null) { setDraft((current) => current ? { ...current, context: { ...current.context, resume: text } } : current); setStatus('Résumé imported (up to 24,000 characters). Review and save to apply.') } }).catch(() => setStatus('Import failed. Use a text-based PDF, TXT or MD file under 10 MB.'))}>Import résumé · TXT / MD / PDF</Button></div>
        {(Object.keys(labels) as Array<keyof ContextPack>).map((field) => <label key={field} className="text-sm font-medium">{labels[field]}
          <textarea rows={field === 'language' || field === 'voice' ? 2 : 4} maxLength={CONTEXT_LIMITS[field]} value={draft.context[field]} onChange={(event) => { setDraft({ ...draft, context: { ...draft.context, [field]: event.target.value } }); setStatus('Unsaved changes') }} className="mt-1 block w-full resize-y rounded-lg border border-border p-3 text-sm font-normal" />
          <span className="text-xs font-normal text-stone-500">{draft.context[field].length.toLocaleString()} / {CONTEXT_LIMITS[field].toLocaleString()} characters</span>
        </label>)}
        <label className="text-sm">Screenshot display<select value={draft.displayId} onChange={(event) => { setDraft({ ...draft, displayId: event.target.value }); setStatus('Unsaved changes') }} className="mt-1 block w-full rounded-lg border border-border p-2">
          <option value="primary">Primary display</option>{view?.displays.map((display) => <option key={display.id} value={display.id}>{display.label}</option>)}
          {draft.displayId !== 'primary' && !view?.displays.some((display) => display.id === draft.displayId) && <option value={draft.displayId}>Disconnected display — choose another</option>}
        </select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.downscale} onChange={(event) => { setDraft({ ...draft, downscale: event.target.checked }); setStatus('Unsaved changes') }} />Resize screenshots to 1,568 px maximum edge</label>
        {([['microphone', 'Capture microphone separately (next session)'], ['saveTranscripts', 'Save transcript files (next session)'], ['showTranscript', 'Show live transcript in overlay']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft[key]} onChange={(event) => { setDraft({ ...draft, [key]: event.target.checked }); setStatus('Unsaved changes') }} />{label}</label>)}
      </fieldset>
      <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save context'}</Button>
    </form>}
    <p className="mt-3 text-sm text-primary" role="status">{status}</p>
  </section>
}
