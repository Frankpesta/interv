import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createOpenAI } from '../src/main/ai/openai'
import { INITIAL_SETTINGS } from '../src/shared/settings'

function sse(events: unknown[]): Response {
  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''), { headers: { 'content-type': 'text/event-stream' } })
}
test('OpenAI sends image and context via Responses, disables storage, and streams text', async () => {
  let body: Record<string, unknown> = {}
  const client = createOpenAI('fake-test-key', 'gpt-6-sol', async (_url, options) => {
    body = JSON.parse(String(options?.body)) as Record<string, unknown>
    return sse([{ type: 'response.output_text.delta', delta: 'solution' }, { type: 'response.completed', response: { status: 'completed' } }])
  })
  let output = ''
  const result = await client.stream('synthetic-image', INITIAL_SETTINGS.context, new AbortController().signal, (text) => { output += text })
  assert.equal(output, 'solution'); assert.equal(result.truncated, false)
  assert.equal(body.store, false); assert.equal(body.stream, true)
  assert.match(JSON.stringify(body.input), /data:image\/png;base64,synthetic-image/)
})
test('OpenAI incomplete and prematurely disconnected streams are not marked complete', async () => {
  const truncated = createOpenAI('fake-test-key', 'gpt-6-sol', async () => sse([{ type: 'response.incomplete', response: { incomplete_details: { reason: 'max_output_tokens' } } }]))
  assert.equal((await truncated.stream('image', INITIAL_SETTINGS.context, new AbortController().signal, () => {})).truncated, true)
  const disconnected = createOpenAI('fake-test-key', 'gpt-6-sol', async () => sse([{ type: 'response.output_text.delta', delta: 'partial' }]))
  await assert.rejects(disconnected.stream('image', INITIAL_SETTINGS.context, new AbortController().signal, () => {}), /before completion/)
})
