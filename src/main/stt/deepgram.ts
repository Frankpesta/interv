import WebSocket from 'ws'
import { DEFAULTS } from '../../shared/config'
import type { AudioChannel, TranscriptEvent } from '../../shared/ipc'
import type { SttProvider } from './index'

export class TranscriptAssembler {
  private pending = ''
  private lastSegment = ''
  consume(raw: unknown): { text: string; final: boolean; endpoint: boolean } | null {
    if (!raw || typeof raw !== 'object') return null
    const data = raw as { type?: string; start?: number; duration?: number; is_final?: boolean; speech_final?: boolean; channel?: { alternatives?: Array<{ transcript?: string }> } }
    if (data.type === 'UtteranceEnd') {
      const text = this.pending; this.pending = ''
      return text ? { text, final: true, endpoint: true } : null
    }
    if (data.type !== 'Results') return null
    const text = data.channel?.alternatives?.[0]?.transcript?.trim().slice(0, 8000) ?? ''
    if (!data.is_final) return { text: `${this.pending} ${text}`.trim(), final: false, endpoint: false }
    const segment = `${data.start}:${data.duration}:${text}`
    if (text && segment !== this.lastSegment) { this.pending = `${this.pending} ${text}`.trim().slice(-16000); this.lastSegment = segment }
    if (data.speech_final) {
      const result = this.pending; this.pending = ''
      return result ? { text: result, final: true, endpoint: true } : null
    }
    // Final segments are accumulated until an endpoint so a question is never split.
    return { text: this.pending, final: false, endpoint: false }
  }
}

export function createDeepgram(key: string, transcript: (event: TranscriptEvent, final: boolean) => void, status: (message: string, fatal: boolean) => void): SttProvider {
  interface Connection { socket?: WebSocket; retry?: ReturnType<typeof setTimeout>; keepAlive?: ReturnType<typeof setInterval>; attempts: number; closed: boolean }
  const connections = new Map<AudioChannel, Connection>()
  function connect(channel: AudioChannel, state: Connection): void {
    if (state.closed) return
    const query = new URLSearchParams({ model: DEFAULTS.stt.model, language: DEFAULTS.stt.language, encoding: 'linear16', sample_rate: String(DEFAULTS.audio.sampleRate), channels: '1', interim_results: 'true', punctuate: 'true', smart_format: 'true', endpointing: String(DEFAULTS.stt.endpointingMs), utterance_end_ms: String(DEFAULTS.stt.utteranceEndMs) })
    const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?${query}`, { headers: { Authorization: `Token ${key}` }, handshakeTimeout: 10000, maxPayload: 256000 })
    state.socket = socket
    const assembler = new TranscriptAssembler()
    const openedAt = Date.now()
    socket.on('open', () => {
      if (state.closed) { socket.close(); return }
      status('Listening', false)
      state.keepAlive = setInterval(() => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'KeepAlive' })) }, DEFAULTS.stt.keepAliveMs)
    })
    socket.on('message', (bytes) => {
      if (state.closed) return
      try {
        const result = assembler.consume(JSON.parse(bytes.toString()))
        if (result) transcript({ channel, text: result.text, meta: { speechFinal: result.endpoint, utteranceEnd: result.endpoint } }, result.final)
      } catch { /* Malformed provider packets contain no actionable transcript. */ }
    })
    socket.on('unexpected-response', (_request, response) => {
      response.resume()
      if (response.statusCode === 401 || response.statusCode === 403) {
        state.closed = true
        status('Deepgram rejected the key. Update credentials and start again.', true)
      }
      socket.terminate()
    })
    socket.on('error', () => { /* Close handles bounded recovery; never log provider data. */ })
    socket.on('close', () => {
      clearInterval(state.keepAlive)
      if (state.closed) return
      if (Date.now() - openedAt > 30000) state.attempts = 0
      if (++state.attempts > DEFAULTS.stt.maxRetries) { state.closed = true; status('Transcription disconnected. Check the connection and start again.', true); return }
      status('Transcription reconnecting… audio during the gap is discarded.', false)
      state.retry = setTimeout(() => connect(channel, state), Math.min(15000, 500 * 2 ** (state.attempts - 1)))
    })
  }
  function close(channel: AudioChannel): void {
    const state = connections.get(channel)
    if (!state) return
    state.closed = true; clearTimeout(state.retry); clearInterval(state.keepAlive)
    if (state.socket?.readyState === WebSocket.OPEN) { state.socket.send(JSON.stringify({ type: 'CloseStream' })); state.socket.close() }
    else state.socket?.terminate()
    connections.delete(channel)
  }
  return {
    open(channel) { close(channel); const state: Connection = { attempts: 0, closed: false }; connections.set(channel, state); connect(channel, state) },
    sendAudio(channel, pcm16) { const socket = connections.get(channel)?.socket; if (socket?.readyState === WebSocket.OPEN && socket.bufferedAmount < DEFAULTS.stt.maxBufferedBytes) socket.send(Buffer.from(pcm16)) },
    close
  }
}
