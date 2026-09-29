import { test } from 'node:test'
import assert from 'node:assert/strict'
import { INITIAL_SETTINGS, validateSettings } from '../src/shared/settings'
import { codingPrompt } from '../src/main/ai/prompts'

test('settings validation rejects malformed and oversized context at IPC boundary', () => {
  assert.throws(() => validateSettings({ context: {}, displayId: 'primary', downscale: true }))
  assert.throws(() => validateSettings({ ...INITIAL_SETTINGS, context: { ...INITIAL_SETTINGS.context, notes: 'x'.repeat(5001) } }))
  assert.deepEqual(validateSettings(INITIAL_SETTINGS), INITIAL_SETTINGS)
  assert.throws(() => validateSettings({ ...INITIAL_SETTINGS, provider: 'unknown' }))
  assert.equal(validateSettings({ ...INITIAL_SETTINGS, provider: 'openai' }).provider, 'openai')
})
test('prompt uses bounded highlights and only the recent transcript window', () => {
  const prompt = codingPrompt({ ...INITIAL_SETTINGS.context, resume: 'R'.repeat(24000), highlights: 'Chosen experience' }, ['old', '1', '2', '3', '4', '5', '6'])
  assert.match(prompt.system, /Chosen experience/); assert.doesNotMatch(prompt.system, /RRRR/)
  assert.doesNotMatch(prompt.user, /old/)
  const fallback = codingPrompt({ ...INITIAL_SETTINGS.context, resume: 'R'.repeat(24000) })
  assert.equal((fallback.system.match(/R{2,}/g) || [])[0].length, 6000)
})
