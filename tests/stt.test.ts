import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TranscriptAssembler } from '../src/main/stt/deepgram'
test('STT final segments accumulate until one endpoint and never duplicate utterance-end', () => {
  const assembler = new TranscriptAssembler()
  const packet = (text: string, start: number, final = true, endpoint = false) => ({ type: 'Results', start, duration: 1, is_final: final, speech_final: endpoint, channel: { alternatives: [{ transcript: text }] } })
  assert.deepEqual(assembler.consume(packet('Tell me', 0)), { text: 'Tell me', final: false, endpoint: false })
  assembler.consume(packet('Tell me', 0))
  assert.equal(assembler.consume(packet('about your work', 1, false))?.text, 'Tell me about your work')
  assert.deepEqual(assembler.consume(packet('about your work.', 1, true, true)), { text: 'Tell me about your work.', final: true, endpoint: true })
  assert.equal(assembler.consume({ type: 'UtteranceEnd' }), null)
  assembler.consume(packet('Another question?', 4))
  assert.deepEqual(assembler.consume({ type: 'UtteranceEnd' }), { text: 'Another question?', final: true, endpoint: true })
})
