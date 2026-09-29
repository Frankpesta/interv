import { useEffect, useState } from 'react'
import type { AnswerState } from '../../shared/ipc'

const initial: AnswerState = { requestId: '', revision: -1, state: 'idle', text: '', message: '', firstTokenMs: null }
export function useAnswer(): AnswerState {
  const [answer, setAnswer] = useState(initial)
  useEffect(() => {
    let active = true
    const apply = (next: AnswerState): void => {
      if (active) setAnswer((previous) => next.revision >= previous.revision ? next : previous)
    }
    const unsubscribe = window.api.onAnswer(apply)
    void window.api.getAnswer().then(apply).catch(() => {
      if (active) setAnswer((previous) => ({ ...previous, state: 'error', message: 'Unable to connect to the desktop process.' }))
    })
    return () => { active = false; unsubscribe() }
  }, [])
  return answer
}
