import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PcmEncoder } from '../src/renderer/audio/pcm'

for (const rate of [44100, 48000]) test(`PCM at ${rate} Hz keeps its clock across 128-sample blocks`, () => {
  const encoder = new PcmEncoder(rate)
  const chunks: ArrayBuffer[] = []
  for (let offset = 0; offset < rate; offset += 128) {
    const signal = new Float32Array(Math.min(128, rate - offset)).fill(0.5)
    encoder.push([signal, signal], (chunk) => chunks.push(chunk))
  }
  assert.equal(chunks.length, 20)
  assert.equal(chunks.every((chunk) => chunk.byteLength === 1600), true)
  assert.ok(Math.abs(new DataView(chunks[19]).getInt16(100, true) - 16384) < 2)
})
test('PCM downmix cancels opposite channels and attenuates above Nyquist', () => {
  const cancelled: number[] = [], high: number[] = []
  const cancel = new PcmEncoder(48000), filter = new PcmEncoder(48000)
  const collect = (target: number[]) => (pcm: ArrayBuffer): void => { const view = new DataView(pcm); for (let i = 0; i < pcm.byteLength; i += 2) target.push(view.getInt16(i, true)) }
  for (let offset = 0; offset < 48000; offset += 128) {
    const wave = Float32Array.from({ length: Math.min(128, 48000 - offset) }, (_, i) => Math.sin(2 * Math.PI * 12000 * (offset + i) / 48000))
    cancel.push([wave, wave.map((value) => -value)], collect(cancelled))
    filter.push([wave], collect(high))
  }
  assert.equal(cancelled.every((value) => value === 0), true)
  assert.ok(Math.max(...high.slice(100)) < 200)
})
