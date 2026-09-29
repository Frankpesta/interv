import OpenAI from 'openai'
import { DEFAULTS } from '../../shared/config'
import { AnswerError } from './errors'
import { codingPrompt, spokenPrompt, type TextRequest } from './prompts'
import type { ContextPack } from '../../shared/ipc'

export function createOpenAI(apiKey: string | undefined, model: string, transport?: typeof fetch) {
  const client = apiKey ? new OpenAI({ apiKey, maxRetries: 0, timeout: DEFAULTS.ai.timeoutMs, ...(transport ? { fetch: transport } : {}) }) : null
  return {
    ready: (): boolean => client !== null,
    async stream(image: string, context: ContextPack, signal: AbortSignal, delta: (text: string) => void, request?: TextRequest): Promise<{ truncated: boolean }> {
      if (!client) throw new AnswerError('Set OPENAI_API_KEY in your local .env and restart the app.')
      const spoken = request?.mode === 'behavioral'
      const prompt = spoken ? spokenPrompt(context, request.transcript, request.question) : codingPrompt(context, request?.transcript, request?.question)
      try {
        const stream = await client.responses.create({
          model: request?.model || model, instructions: prompt.system, max_output_tokens: spoken ? DEFAULTS.ai.spokenMaxTokens : DEFAULTS.ai.codingMaxTokens,
          reasoning: { effort: 'none' }, store: false, stream: true,
          input: [{ role: 'user', content: [
            ...(image ? [{ type: 'input_image' as const, image_url: `data:image/png;base64,${image}`, detail: 'high' as const }] : []),
            { type: 'input_text', text: prompt.user }
          ] }]
        }, { signal })
        for await (const event of stream) {
          if (event.type === 'response.output_text.delta' || event.type === 'response.refusal.delta') delta(event.delta)
          if (event.type === 'response.completed') return { truncated: false }
          if (event.type === 'response.incomplete') {
            if (event.response.incomplete_details?.reason === 'max_output_tokens') return { truncated: true }
            throw new AnswerError('OpenAI could not complete this response. Try a different problem.')
          }
          if (event.type === 'response.failed' || event.type === 'error') throw new AnswerError('OpenAI reported a response error. Try again.', true)
        }
        throw new AnswerError('OpenAI ended the stream before completion. Try again.', true)
      } catch (error) {
        if (signal.aborted || error instanceof AnswerError) throw error
        if (error instanceof OpenAI.AuthenticationError) throw new AnswerError('OpenAI rejected the API key. Update .env and restart.')
        if (error instanceof OpenAI.APIError) {
          const retryable = error.status === 429 || (error.status !== undefined && error.status >= 500)
          throw new AnswerError(retryable ? 'OpenAI is temporarily unavailable. Try again shortly.' : 'OpenAI rejected the request. Check model access and account configuration.', retryable)
        }
        throw new AnswerError('Could not reach OpenAI. Check your connection.', true)
      }
    }
  }
}
