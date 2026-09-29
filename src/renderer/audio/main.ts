import workletUrl from './worklet.ts?worker&url'
import type { AudioBridge, AudioChannel, AudioCommand } from '../../shared/ipc'

declare global { interface Window { audio: AudioBridge } }
let generation = 0
const streams = new Set<MediaStream>()
const contexts = new Set<AudioContext>()
function stop(): void {
  for (const stream of streams) for (const track of stream.getTracks()) track.stop()
  streams.clear()
  for (const context of contexts) void context.close().catch(() => {})
  contexts.clear()
}
async function attach(stream: MediaStream, channel: AudioChannel, id: number): Promise<void> {
  if (id !== generation) { stream.getTracks().forEach((track) => track.stop()); return }
  streams.add(stream)
  if (!stream.getAudioTracks().length) throw new Error('No audio track')
  stream.getAudioTracks().forEach((track) => { track.onended = () => { if (id === generation) { stop(); window.audio.status({ generation: id, state: 'error' }) } } })
  const context = new AudioContext()
  contexts.add(context)
  await context.audioWorklet.addModule(workletUrl)
  if (id !== generation) return
  const node = new AudioWorkletNode(context, 'copilot-pcm')
  node.onprocessorerror = () => { if (id === generation) { stop(); window.audio.status({ generation: id, state: 'error' }) } }
  node.port.onmessage = (event: MessageEvent<{ pcm?: ArrayBuffer; vad?: 'start' | 'end' }>) => {
    if (id !== generation) return
    if (event.data.pcm) window.audio.frame({ channel, pcm16: event.data.pcm, ts: Date.now(), generation: id })
    if (event.data.vad) window.audio.vad({ channel, event: event.data.vad, generation: id })
  }
  // Worklet output is silence; connecting it keeps processing alive without monitoring audio.
  context.createMediaStreamSource(stream).connect(node).connect(context.destination)
  await context.resume()
}
window.audio.onCommand((command: AudioCommand) => {
  generation = command.generation
  stop()
  if (command.action === 'stop') return
  const id = generation
  void (async () => {
    const loopback = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    loopback.getVideoTracks().forEach((track) => { track.stop(); loopback.removeTrack(track) })
    await attach(loopback, 'interviewer', id)
    if (id !== generation) return
    if (command.microphone) await attach(await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }), 'user', id)
    if (id === generation) window.audio.status({ generation: id, state: 'ready' })
  })().catch(() => { if (id === generation) { stop(); window.audio.status({ generation: id, state: 'error' }) } })
})
