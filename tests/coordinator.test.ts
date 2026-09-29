import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AnswerCoordinator } from '../src/main/ai/coordinator'
import { AnswerError } from '../src/main/ai/errors'

function deferred() { let resolve!: () => void; const promise = new Promise<void>((done) => { resolve = done }); return { promise, resolve } }

test('replacement ignores old chunks and old completion', async () => {
  const coordinator = new AnswerCoordinator(() => {}, 0)
  const old = deferred()
  let oldSignal!: AbortSignal
  const first = coordinator.run(async (signal, emit) => { oldSignal = signal; emit('old'); await old.promise; emit('stale'); return { truncated: false } })
  await coordinator.run(async (_signal, emit) => { emit('new'); return { truncated: false } })
  old.resolve(); await first
  assert.equal(oldSignal.aborted, true)
  assert.equal(coordinator.snapshot().text, 'new')
  assert.equal(coordinator.snapshot().message, 'Complete')
})
test('cancel prevents pending capture and late provider output changing state', async () => {
  const coordinator = new AnswerCoordinator(() => {}, 0)
  const pending = deferred()
  const run = coordinator.run(async (_signal, emit) => { await pending.promise; emit('late'); return { truncated: false } })
  coordinator.cancel(); pending.resolve(); await run
  assert.equal(coordinator.snapshot().state, 'idle')
  assert.equal(coordinator.snapshot().text, '')
  assert.equal(coordinator.snapshot().message, 'Canceled')
})
test('retries transient failure once before output, but never duplicates partial output', async () => {
  const coordinator = new AnswerCoordinator(() => {}, 0)
  let attempts = 0
  await coordinator.run(async (_signal, emit) => { if (++attempts === 1) throw new AnswerError('retry', true); emit('ok'); return { truncated: false } })
  assert.equal(attempts, 2); assert.equal(coordinator.snapshot().text, 'ok')
  attempts = 0
  await coordinator.run(async (_signal, emit) => { attempts++; emit('partial'); throw new AnswerError('offline', true) })
  assert.equal(attempts, 1); assert.equal(coordinator.snapshot().state, 'error'); assert.equal(coordinator.snapshot().text, 'partial')
})
test('cancel during retry delay stops additional provider attempts', async () => {
  const coordinator = new AnswerCoordinator(() => {}, 1000)
  let attempts = 0
  const run = coordinator.run(async () => { attempts++; throw new AnswerError('retry', true) })
  await Promise.resolve(); coordinator.cancel(); await run
  assert.equal(attempts, 1); assert.equal(coordinator.snapshot().state, 'idle')
})
test('truncated code is flagged and unknown errors never leak provider payloads', async () => {
  const coordinator = new AnswerCoordinator(() => {}, 0)
  await coordinator.run(async (_signal, emit) => { emit('unfinished'); return { truncated: true } })
  assert.equal(coordinator.snapshot().state, 'error'); assert.match(coordinator.snapshot().message, /incomplete/)
  await coordinator.run(async () => { throw new Error('secret provider payload') })
  assert.doesNotMatch(coordinator.snapshot().message, /secret/)
})
