/** Stateful low-pass resampler. Fractional clock survives render-quantum boundaries. */
export class PcmEncoder {
  private readonly taps: number[]
  private readonly history: Float64Array
  private position = 0
  private phase = 0
  private offset = 0
  private buffer: ArrayBuffer
  private view: DataView
  constructor(private readonly inputRate: number, private readonly outputRate = 16000, private readonly samplesPerChunk = 800) {
    if (inputRate < outputRate) throw new Error('Unsupported audio sample rate')
    const count = 63, cutoff = 0.45 * outputRate / inputRate
    this.taps = Array.from({ length: count }, (_, i) => {
      const x = i - (count - 1) / 2
      return (x === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * x) / (Math.PI * x)) * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (count - 1)))
    })
    const gain = this.taps.reduce((sum, x) => sum + x, 0)
    this.taps = this.taps.map((x) => x / gain)
    this.history = new Float64Array(count)
    this.buffer = new ArrayBuffer(samplesPerChunk * 2)
    this.view = new DataView(this.buffer)
  }
  push(channels: Float32Array[], emit: (pcm: ArrayBuffer) => void): number {
    const length = channels[0]?.length ?? 0
    let energy = 0
    for (let i = 0; i < length; i++) {
      let mono = 0
      for (const channel of channels) mono += channel[i] ?? 0
      mono /= channels.length
      energy += mono * mono
      this.history[this.position] = mono
      this.phase += this.outputRate
      if (this.phase >= this.inputRate) {
        this.phase -= this.inputRate
        let sample = 0
        for (let j = 0; j < this.taps.length; j++) sample += this.taps[j] * this.history[(this.position - j + this.history.length) % this.history.length]
        sample = Math.max(-1, Math.min(1, sample))
        this.view.setInt16(this.offset * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true)
        if (++this.offset === this.samplesPerChunk) {
          emit(this.buffer)
          this.buffer = new ArrayBuffer(this.samplesPerChunk * 2)
          this.view = new DataView(this.buffer)
          this.offset = 0
        }
      }
      this.position = (this.position + 1) % this.history.length
    }
    return length ? Math.sqrt(energy / length) : 0
  }
}
