import type { ContextPack, Settings } from '../../shared/ipc'
import type { AnswerOperation } from './coordinator'
import { AnswerError } from './errors'

interface VisionProvider {
  ready(): boolean
  stream(image: string, context: ContextPack, signal: AbortSignal, delta: (text: string) => void): Promise<{ truncated: boolean }>
}

export function screenshotAnswer(settings: Settings, provider: VisionProvider, capture: (settings: Settings) => Promise<string>): AnswerOperation {
  const snapshot = structuredClone(settings)
  let image: string | undefined
  return async (signal, delta) => {
    signal.throwIfAborted()
    if (!provider.ready()) throw new AnswerError(`Set ${snapshot.provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'} in your local .env and restart the app.`)
    image ??= await capture(snapshot)
    signal.throwIfAborted()
    return provider.stream(image, snapshot.context, signal, delta)
  }
}
