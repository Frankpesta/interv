import keytar from 'keytar'
import { app } from 'electron'
import type { CredentialProvider } from '../shared/ipc'
const service = 'InterviewCopilot'
const environment = { anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY', deepgram: 'DEEPGRAM_API_KEY' } as const
export async function loadCredentials(): Promise<Record<CredentialProvider, string>> {
  const result = { anthropic: '', openai: '', deepgram: '' }
  for (const provider of Object.keys(result) as CredentialProvider[]) {
    try { result[provider] = await keytar.getPassword(service, provider) || '' } catch { /* UI can retry credential storage; dev env remains available. */ }
    if (!result[provider] && !app.isPackaged) result[provider] = process.env[environment[provider]]?.trim() || ''
  }
  return result
}
export async function saveCredential(provider: unknown, key: unknown): Promise<CredentialProvider> {
  if (typeof provider !== 'string' || !Object.hasOwn(environment, provider) || typeof key !== 'string' || key.length > 4096) throw new Error('Invalid credential')
  try {
    if (key.trim()) await keytar.setPassword(service, provider, key.trim())
    else await keytar.deletePassword(service, provider)
  } catch { throw new Error('Windows Credential Manager could not save this change.') }
  return provider as CredentialProvider
}
