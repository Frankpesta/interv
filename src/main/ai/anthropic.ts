import Anthropic from '@anthropic-ai/sdk'
import { DEFAULTS } from '../../shared/config'
import { AnswerError } from './errors'
import { codingPrompt, spokenPrompt, type TextRequest } from './prompts'
import type { ContextPack } from '../../shared/ipc'

export function createAnthropic(apiKey: string | undefined, model: string, transport?: typeof fetch) {
  const client = apiKey ? new Anthropic({ apiKey, maxRetries: 0, timeout: DEFAULTS.ai.timeoutMs, ...(transport ? { fetch: transport } : {}) }) : null
  return {
    ready: (): boolean => client !== null,
    async stream(image: string, context: ContextPack, signal: AbortSignal, delta: (text: string) => void, request?: TextRequest): Promise<{ truncated: boolean }> {
      if (!client) throw new AnswerError('Set ANTHROPIC_API_KEY in your local .env and restart the app.')
      const spoken = request?.mode === 'behavioral'
      const prompt = spoken ? spokenPrompt(context, request.transcript, request.question) : codingPrompt(context, request?.transcript, request?.question)
      try {
        const stream = client.messages.stream({
          model: request?.model || model, max_tokens: spoken ? DEFAULTS.ai.spokenMaxTokens : DEFAULTS.ai.codingMaxTokens, thinking: { type: 'disabled' },
          system: [{ type: 'text', text: prompt.system, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: [
            ...(image ? [{ type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/png' as const, data: image } }] : []),
            { type: 'text', text: prompt.user }
          ] }]
        }, { signal })
        // Iterate rather than an EventEmitter callback so exceptions reach the coordinator.
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') delta(event.delta.text)
        }
        const message = await stream.finalMessage()
        return { truncated: message.stop_reason === 'max_tokens' }
      } catch (error) {
        if (signal.aborted) throw error
        if (error instanceof AnswerError) throw error
        if (error instanceof Anthropic.AuthenticationError) throw new AnswerError('Anthropic rejected the API key. Update .env and restart.')
        if (error instanceof Anthropic.APIError) {
          const retryable = error.status === 429 || (error.status !== undefined && error.status >= 500)
          throw new AnswerError(retryable ? 'Anthropic is temporarily unavailable. Try again shortly.' : 'Anthropic rejected the request. Check model access and account configuration.', retryable)
        }
        throw new AnswerError('Could not reach Anthropic. Check your connection.', true)
      }
    }
  }
}
