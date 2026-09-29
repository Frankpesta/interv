import { CONTEXT_LIMITS, DEFAULTS } from './config'
import type { Settings, ContextPack } from './ipc'

export const INITIAL_SETTINGS: Settings = {
  context: { resume: '', highlights: '', jobDescription: '', notes: '', voice: 'Concise, first person, plain language, no buzzwords', language: DEFAULTS.fallbackLanguage },
  displayId: 'primary', downscale: true, provider: 'anthropic', microphone: false, saveTranscripts: false, showTranscript: false
}
export function validateSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object') throw new Error('Invalid settings')
  const candidate = value as Record<string, unknown>
  // Migrate settings saved before provider selection was introduced.
  const provider = candidate.provider ?? 'anthropic'
  if (provider !== 'anthropic' && provider !== 'openai') throw new Error('Invalid provider')
  if (!candidate.context || typeof candidate.context !== 'object' || typeof candidate.displayId !== 'string' || candidate.displayId.length > 80 || typeof candidate.downscale !== 'boolean') throw new Error('Invalid settings')
  const source = candidate.context as Record<string, unknown>
  const context = {} as ContextPack
  for (const field of Object.keys(CONTEXT_LIMITS) as Array<keyof ContextPack>) {
    const text = source[field]
    if (typeof text !== 'string' || text.length > CONTEXT_LIMITS[field]) throw new Error('Context exceeds field limits')
    context[field] = text
  }
  const flags = { microphone: false, saveTranscripts: false, showTranscript: false }
  for (const key of Object.keys(flags) as Array<keyof typeof flags>) {
    if (candidate[key] !== undefined && typeof candidate[key] !== 'boolean') throw new Error('Invalid preference')
    flags[key] = candidate[key] === true
  }
  return { context, displayId: candidate.displayId, downscale: candidate.downscale, provider, ...flags }
}
