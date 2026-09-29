import { test } from 'node:test'
import assert from 'node:assert/strict'
import { screenshotAnswer } from '../src/main/ai/screenshot-answer'
import { AnswerCoordinator } from '../src/main/ai/coordinator'
import { AnswerError } from '../src/main/ai/errors'
import { INITIAL_SETTINGS } from '../src/shared/settings'

test('missing keys prevent screen capture and API calls for either provider', async () => {
  for (const provider of ['anthropic', 'openai'] as const) {
    let captured = false
    let called = false
    const operation = screenshotAnswer({ ...INITIAL_SETTINGS, provider }, {
      ready: () => false, stream: async () => { called = true; return { truncated: false } }
    }, async () => { captured = true; return 'image' })
    await assert.rejects(operation(new AbortController().signal, () => {}), new RegExp(provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'))
    assert.equal(captured, false); assert.equal(called, false)
  }
})

test('canceling while screen capture is pending prevents a provider request', async () => {
  let completeCapture!: (image: string) => void
  let called = false
  const operation = screenshotAnswer(INITIAL_SETTINGS, {
    ready: () => true, stream: async () => { called = true; return { truncated: false } }
  }, () => new Promise<string>((resolve) => { completeCapture = resolve }))
  const coordinator = new AnswerCoordinator(() => {})
  const run = coordinator.run(operation)
  coordinator.cancel()
  completeCapture('captured-after-cancel')
  await run
  assert.equal(called, false)
  assert.equal(coordinator.snapshot().state, 'idle')
})

test('retry preserves the original image and context even if settings change', async () => {
  const settings = structuredClone(INITIAL_SETTINGS)
  settings.context.notes = 'original'
  let captures = 0
  let calls = 0
  const operation = screenshotAnswer(settings, {
    ready: () => true,
    stream: async (image, context, _signal, emit) => {
      assert.equal(image, 'original-image'); assert.equal(context.notes, 'original')
      if (++calls === 1) throw new AnswerError('transient', true)
      emit('answer'); return { truncated: false }
    }
  }, async () => { captures++; return 'original-image' })
  settings.context.notes = 'changed'
  await new AnswerCoordinator(() => {}, 0).run(operation)
  assert.equal(captures, 1); assert.equal(calls, 2)
})
