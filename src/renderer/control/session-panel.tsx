import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSession } from '../hooks/use-session'
import type { CredentialProvider } from '../../shared/ipc'

export function SessionPanel(): React.JSX.Element {
  const session = useSession()
  const [ready, setReady] = useState<Record<CredentialProvider, boolean>>({ anthropic: false, openai: false, deepgram: false })
  const [status, setStatus] = useState('')
  const [files, setFiles] = useState<Array<{ name: string; bytes: number }>>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { void window.api.getCredentials().then(setReady).catch(() => setStatus('Could not check credentials.')) }, [])
  async function saveKey(provider: CredentialProvider, form: HTMLFormElement): Promise<void> {
    const value = new FormData(form).get('key')
    if (typeof value !== 'string') return
    setBusy(true)
    try { await window.api.setCredential(provider, value); form.reset(); setReady(await window.api.getCredentials()); setStatus(value ? 'Saved in Windows Credential Manager. Listening stopped; start again when ready.' : 'Stored key removed. A development .env key, if present, still applies.') }
    catch { setStatus('Could not update Windows Credential Manager. Try again.') }
    finally { setBusy(false) }
  }
  async function action(run: () => Promise<void>): Promise<void> { try { await run() } catch { setStatus('Action failed. Try again.') } }
  return <>
    <section className="mt-5 rounded-2xl border border-border bg-white p-6">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Interview session</h2><span className="text-xs text-stone-500">Mode: {session.mode}</span></div>
      <p className="mt-2 text-sm text-primary" role="status">{session.status}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => void action(session.active ? window.api.stopSession : window.api.startSession)}>{session.active ? 'Stop listening' : 'Start listening'}</Button>
        <Button variant="outline" onClick={() => void action(window.api.answerNow)}>Answer now</Button>
        <Button variant="outline" onClick={() => void action(window.api.cycleMode)}>Cycle mode</Button>
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-500">System audio goes to Deepgram while listening. Optional microphone capture uses a separate channel to suppress answers while you speak. Close this window to work from the overlay.</p>
      <div className="mt-4 max-h-60 overflow-y-auto rounded-lg bg-background p-3 text-sm" aria-label="Live transcript">
        {session.transcript.length ? session.transcript.map((row, index) => <p key={index} className="mb-2"><span className="mr-2 text-xs text-stone-500">{row.channel === 'user' ? 'You' : 'Interviewer'}</span>{row.text}</p>) : <p className="text-stone-500">Final transcripts will appear here.</p>}
        {session.interim && <p className="text-stone-500">{session.interim}</p>}
      </div>
    </section>
    <section className="mt-5 rounded-2xl border border-border bg-white p-6">
      <h2 className="text-lg font-semibold">Credentials</h2>
      <p className="mt-2 text-xs leading-5 text-stone-500">Use either Anthropic or OpenAI for answers; Deepgram is needed for listening. Keys stay in Windows Credential Manager and are never returned to this window. Saving a key stops the current session.</p>
      <div className="mt-4 space-y-3">{(['anthropic', 'openai', 'deepgram'] as const).map((provider) => <form key={provider} className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); void saveKey(provider, event.currentTarget) }}>
        <label className="min-w-48 flex-1 text-sm capitalize">{provider} · {ready[provider] ? 'configured' : 'missing'}<input className="mt-1 block w-full rounded-lg border border-border p-2" name="key" type="password" autoComplete="new-password" maxLength={4096} placeholder="Enter a key to save; leave blank to remove" aria-label={`${provider} API key`} /></label>
        <Button disabled={busy} variant="outline" type="submit">Save / remove</Button>
      </form>)}</div>
      <p className="mt-3 text-sm text-primary" role="status">{status}</p>
    </section>
    <section className="mt-5 rounded-2xl border border-border bg-white p-6">
      <h2 className="text-lg font-semibold">Saved transcripts</h2>
      <p className="mt-2 text-xs text-stone-500">Saving is off by default. Enable it in context settings before starting a session. Files are plain text on this computer.</p>
      <div className="mt-4 flex gap-2"><Button variant="outline" onClick={() => void window.api.listSessions().then(setFiles).catch(() => setStatus('Could not list sessions.'))}>Refresh list</Button><Button variant="outline" disabled={session.active} onClick={() => setConfirmDelete(true)}>Delete all saved transcripts</Button></div>
      {confirmDelete && <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm"><p>This permanently deletes every saved transcript from this app.</p><div className="mt-2 flex gap-2"><Button disabled={session.active} onClick={() => void action(async () => { await window.api.deleteSessions(); setFiles([]); setConfirmDelete(false) })}>Confirm delete all</Button><Button variant="outline" onClick={() => setConfirmDelete(false)}>Keep files</Button></div></div>}
      <ul className="mt-3 space-y-1 text-xs text-stone-500">{files.map((file) => <li key={file.name}>{file.name} · {(file.bytes / 1024).toFixed(1)} KB</li>)}</ul>
    </section>
  </>
}
