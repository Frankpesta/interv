import type { AudioChannel } from '../../shared/ipc'
export interface SttProvider {
  open(channel: AudioChannel): void
  sendAudio(channel: AudioChannel, pcm16: ArrayBuffer): void
  close(channel: AudioChannel): void
}
