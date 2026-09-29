import { PcmEncoder } from './pcm'
import { DEFAULTS } from '../../shared/config'
declare const sampleRate: number
declare class AudioWorkletProcessor { port: MessagePort }
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void

class CaptureProcessor extends AudioWorkletProcessor {
  private encoder = new PcmEncoder(sampleRate, DEFAULTS.audio.sampleRate, DEFAULTS.audio.sampleRate * DEFAULTS.audio.chunkMs / 1000)
  private speaking = false
  private quietSamples = 0
  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0]
    if (!input?.length) return true
    const rms = this.encoder.push(input, (pcm) => this.port.postMessage({ pcm }, [pcm]))
    if (rms >= DEFAULTS.audio.vadThreshold) {
      this.quietSamples = 0
      if (!this.speaking) { this.speaking = true; this.port.postMessage({ vad: 'start' }) }
    } else if (this.speaking) {
      this.quietSamples += input[0].length
      if (this.quietSamples >= sampleRate * DEFAULTS.audio.vadReleaseMs / 1000) {
        this.speaking = false; this.port.postMessage({ vad: 'end' })
      }
    }
    return true
  }
}
registerProcessor('copilot-pcm', CaptureProcessor)
