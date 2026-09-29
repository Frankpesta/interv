import { useEffect, useState } from 'react'
import type { SessionState } from '../../shared/ipc'
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ active: false, status: 'Connecting…', mode: 'auto', interim: '', transcript: [], showTranscript: false })
  useEffect(() => {
    let active = true, received = false
    const off = window.api.onSession((next) => { received = true; if (active) setState(next) })
    void window.api.getSession().then((next) => { if (active && !received) setState(next) }).catch(() => {})
    return () => { active = false; off() }
  }, [])
  return state
}
