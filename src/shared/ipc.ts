import { IPC, HOTKEYS, type OverlayHotkey } from './config'
export { IPC }

export type AudioChannel = 'interviewer' | 'user'
export type AnswerMode = 'auto' | 'behavioral' | 'coding'
export type HotkeyAction = keyof typeof HOTKEYS
export interface AppState {
  version: string
  phase: number
  overlayVisible: boolean
  listening: boolean
  clickThrough: boolean
  shortcuts: Array<{ action: OverlayHotkey; accelerator: string; registered: boolean }>
}
export interface AudioFrame { channel: AudioChannel; pcm16: ArrayBuffer; ts: number }
export interface AudioVad { channel: AudioChannel; event: 'start' | 'end' }
export interface TranscriptEvent {
  channel: AudioChannel
  text: string
  meta: { speechFinal: boolean; utteranceEnd: boolean }
}
export interface AnswerDelta { requestId: string; text: string }
export interface AnswerState {
  requestId: string
  state: 'idle' | 'thinking' | 'streaming' | 'error'
}
export interface CopilotApi {
  getState(): Promise<AppState>
  setOverlayVisible(visible: boolean): Promise<AppState>
  rebindHotkey(action: OverlayHotkey, accelerator: string): Promise<AppState>
  onState(listener: (state: AppState) => void): () => void
}
