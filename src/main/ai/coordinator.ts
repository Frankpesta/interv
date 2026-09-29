import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { DEFAULTS } from '../../shared/config'
import type { AnswerState } from '../../shared/ipc'
import { AnswerError } from './errors'

export type AnswerOperation = (signal: AbortSignal, delta: (text: string) => void) => Promise<{ truncated: boolean }>
export class AnswerCoordinator {
  private controller: AbortController | null = null
  private current: AnswerState = { requestId: '', revision: 0, state: 'idle', text: '', message: '', firstTokenMs: null }
  constructor(private readonly publish: (state: AnswerState, delta?: string) => void, private readonly retryMs: number = DEFAULTS.ai.retryMs) {}
  snapshot(): AnswerState { return { ...this.current } }
  private update(patch: Partial<AnswerState>, delta?: string): void {
    this.current = { ...this.current, ...patch, revision: this.current.revision + 1 }
    this.publish(this.snapshot(), delta)
  }
  cancel(): void {
    this.controller?.abort()
    this.controller = null
    this.update({ state: 'idle', message: this.current.state === 'thinking' || this.current.state === 'streaming' ? 'Canceled' : this.current.message })
  }
  async run(operation: AnswerOperation): Promise<void> {
    this.controller?.abort()
    const controller = new AbortController()
    this.controller = controller
    const started = performance.now()
    const active = (): boolean => this.controller === controller && !controller.signal.aborted
    this.update({ requestId: randomUUID(), state: 'thinking', text: '', message: '', firstTokenMs: null })
    const emit = (text: string): void => {
      if (!active()) return
      if (this.current.text.length + text.length > DEFAULTS.ai.maxAnswerChars) throw new AnswerError('Answer exceeded the display limit. Try a smaller problem.')
      this.update({ state: 'streaming', text: this.current.text + text, firstTokenMs: this.current.firstTokenMs ?? Math.round(performance.now() - started) }, text)
    }
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await operation(controller.signal, emit)
          if (!active()) return
          if (!this.current.text) throw new AnswerError('The model returned no answer. Try again.')
          this.update({ state: result.truncated ? 'error' : 'idle', message: result.truncated ? 'Answer hit the token limit; the code may be incomplete.' : 'Complete' })
          return
        } catch (error) {
          if (!active()) return
          if (attempt === 0 && !this.current.text && error instanceof AnswerError && error.retryable) {
            await delay(this.retryMs, undefined, { signal: controller.signal })
            if (!active()) return
            continue
          }
          throw error
        }
      }
    } catch (error) {
      if (active()) this.update({ state: 'error', message: error instanceof AnswerError ? error.message : 'Unable to generate an answer. Check your connection and try again.' })
    } finally {
      if (this.controller === controller) this.controller = null
    }
  }
}
