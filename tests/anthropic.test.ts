import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createAnthropic } from '../src/main/ai/anthropic'
import { INITIAL_SETTINGS } from '../src/shared/settings'

function events(stopReason: string): Response {
  const sequence = [
    { type: 'message_start', message: { id: 'test', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'solution' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 1 } },
    { type: 'message_stop' }
  ]
  return new Response(sequence.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(''), { headers: { 'content-type': 'text/event-stream' } })
}

test('Anthropic adapter sends vision input and streams Messages text', async () => {
  let body: Record<string, unknown> = {}
  const provider = createAnthropic('fake-test-key', 'claude-sonnet-5-5', async (_url, options) => {
    body = JSON.parse(String(options?.body)) as Record<string, unknown>
    return events('end_turn')
  })
  let text = ''
  const result = await provider.stream('synthetic-image', INITIAL_SETTINGS.context, new AbortController().signal, (chunk) => { text += chunk })
  assert.equal(text, 'solution'); assert.equal(result.truncated, false)
  assert.equal(body.stream, true); assert.equal(body.max_tokens, 1200)
  assert.match(JSON.stringify(body.messages), /synthetic-image/)
})

test('Anthropic adapter surfaces token truncation', async () => {
  const provider = createAnthropic('fake-test-key', 'claude-sonnet-5-5', async () => events('max_tokens'))
  assert.equal((await provider.stream('image', INITIAL_SETTINGS.context, new AbortController().signal, () => {})).truncated, true)
})

test('Anthropic authentication errors do not expose response contents', async () => {
  const provider = createAnthropic('fake-test-key', 'claude-sonnet-5-5', async () => new Response(JSON.stringify({ error: { type: 'authentication_error', message: 'sensitive response content' } }), { status: 401, headers: { 'content-type': 'application/json' } }))
  await assert.rejects(provider.stream('image', INITIAL_SETTINGS.context, new AbortController().signal, () => {}), (error: unknown) => {
    assert.ok(error instanceof Error)
    assert.match(error.message, /rejected the API key/)
    assert.doesNotMatch(error.message, /sensitive/)
    return true
  })
})
