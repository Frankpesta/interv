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
  revision: number
  text: string
  message: string
  firstTokenMs: number | null
}
export interface ContextPack { resume: string; highlights: string; jobDescription: string; notes: string; voice: string; language: string }
export type AiProvider = 'anthropic' | 'openai'
export interface ProviderInfo { id: AiProvider; label: string; ready: boolean; model: string }
export interface Settings { context: ContextPack; displayId: string; downscale: boolean; provider: AiProvider; microphone: boolean; saveTranscripts: boolean; showTranscript: boolean }
export type CredentialProvider = AiProvider | 'deepgram'
export interface SessionState { active: boolean; status: string; mode: AnswerMode; interim: string; transcript: TranscriptEvent[]; showTranscript: boolean }
export interface AudioCommand { action: 'start' | 'stop'; microphone: boolean; generation: number }
export interface AudioBridge {
  onCommand(listener: (command: AudioCommand) => void): () => void
  frame(frame: AudioFrame & { generation: number }): void
  vad(event: AudioVad & { generation: number }): void
  status(value: { generation: number; state: 'ready' | 'error' }): void
}
export interface SettingsView {
  settings: Settings
  providerReady: boolean
  model: string
  providers: ProviderInfo[]
  displays: Array<{ id: string; label: string }>
}
export interface CopilotApi {
  getSession(): Promise<SessionState>
  startSession(): Promise<void>
  stopSession(): Promise<void>
  answerNow(): Promise<void>
  cycleMode(): Promise<void>
  onSession(listener: (state: SessionState) => void): () => void
  getCredentials(): Promise<Record<CredentialProvider, boolean>>
  setCredential(provider: CredentialProvider, key: string): Promise<void>
  importContext(): Promise<string | null>
  listSessions(): Promise<Array<{ name: string; bytes: number }>>
  deleteSessions(): Promise<void>
  getState(): Promise<AppState>
  setOverlayVisible(visible: boolean): Promise<AppState>
  rebindHotkey(action: OverlayHotkey, accelerator: string): Promise<AppState>
  onState(listener: (state: AppState) => void): () => void
  getSettings(): Promise<SettingsView>
  saveSettings(settings: Settings): Promise<SettingsView>
  getAnswer(): Promise<AnswerState>
  requestScreenshot(): Promise<void>
  cancelAnswer(): Promise<void>
  onAnswer(listener: (state: AnswerState) => void): () => void
  onScroll(listener: (direction: 'up' | 'down') => void): () => void
}
