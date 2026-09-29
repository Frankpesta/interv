import { ipcMain } from 'electron'
import { IPC, type AudioFrame, type AudioVad, type SessionState, type Settings } from '../shared/ipc'
import { createDeepgram } from './stt/deepgram'
import type { SttProvider } from './stt'
import { QuestionDetector, classifyQuestion } from './ai/detector'
import { createAudioHost } from './windows/audio-host'
import type { createSessionFiles } from './session-files'

export function createSession(getSettings: () => Settings, key: () => string, publish: (state: SessionState) => void, answer: (question: string, mode: 'behavioral' | 'coding', transcript: string[]) => void, files: ReturnType<typeof createSessionFiles>) {
  let generation = 0
  let state: SessionState = { active: false, status: 'Listening stopped', mode: 'auto', interim: '', transcript: [], showTranscript: getSettings().showTranscript }
  let stt: SttProvider | undefined
  let startupTimer: ReturnType<typeof setTimeout> | undefined
  const host = createAudioHost(() => state.active)
  const snapshot = (): SessionState => structuredClone({ ...state, showTranscript: getSettings().showTranscript })
  const emit = (): void => publish(snapshot())
  const trigger = (question: string, mode: 'behavioral' | 'coding'): void => answer(question, state.mode === 'auto' ? mode : state.mode, state.transcript.filter((row) => row.channel === 'interviewer').slice(-6).map((row) => row.text))
  const detector = new QuestionDetector(trigger)
  function stop(message = 'Listening stopped'): void {
    generation++; clearTimeout(startupTimer); detector.reset()
    stt?.close('interviewer'); stt?.close('user'); stt = undefined
    state = { ...state, active: false, interim: '', status: message }
    if (!host.isDestroyed()) host.webContents.send(IPC.audioCommand, { action: 'stop', generation, microphone: false })
    void files.stop().then(() => { if (files.failed()) { state.status = 'Transcript could not be saved. Check disk space.'; emit() } })
    emit()
  }
  function start(): void {
    if (state.active) return
    if (!key()) { state.status = 'Add a Deepgram key in Credentials to start listening.'; emit(); return }
    generation++; detector.reset()
    const settings = getSettings()
    state = { ...state, active: true, status: 'Starting audio…', interim: '', transcript: [] }
    files.start(settings.saveTranscripts)
    stt = createDeepgram(key(), (event, final) => {
      if (!state.active) return
      if (final) {
        state.transcript.push(event); state.transcript = state.transcript.slice(-500)
        files.append(event)
        if (event.channel === 'interviewer') { state.interim = ''; detector.final(event.text) }
      } else if (event.channel === 'interviewer') state.interim = event.text
      emit()
    }, (message, fatal) => { if (fatal) stop(message); else if (state.active) { state.status = message; emit() } })
    stt.open('interviewer')
    if (settings.microphone) stt.open('user')
    host.webContents.send(IPC.audioCommand, { action: 'start', generation, microphone: settings.microphone })
    startupTimer = setTimeout(() => stop('Audio did not start. Check Windows audio permissions and start again.'), 15000)
    emit()
  }
  const authorized = (event: Electron.IpcMainEvent, value: unknown): value is Record<string, unknown> => event.sender === host.webContents && event.senderFrame === host.webContents.mainFrame && state.active && !!value && typeof value === 'object' && (value as Record<string, unknown>).generation === generation
  const onFrame = (event: Electron.IpcMainEvent, value: unknown): void => {
    if (!authorized(event, value)) return
    const frame = value as unknown as AudioFrame
    if ((frame.channel !== 'interviewer' && frame.channel !== 'user') || !(frame.pcm16 instanceof ArrayBuffer) || frame.pcm16.byteLength !== 1600) return
    stt?.sendAudio(frame.channel, frame.pcm16)
  }
  const onVad = (event: Electron.IpcMainEvent, value: unknown): void => {
    if (!authorized(event, value)) return
    const vad = value as unknown as AudioVad
    if ((vad.channel === 'interviewer' || vad.channel === 'user') && (vad.event === 'start' || vad.event === 'end')) detector.activity(vad)
  }
  const onStatus = (event: Electron.IpcMainEvent, value: unknown): void => {
    if (!authorized(event, value)) return
    clearTimeout(startupTimer)
    if (value.state === 'error') stop('Audio capture stopped. Check devices and Windows permissions, then start again.')
    else if (value.state === 'ready') { state.status = 'Listening'; emit() }
  }
  ipcMain.on(IPC.audioFrame, onFrame); ipcMain.on(IPC.audioVad, onVad); ipcMain.on(IPC.audioStatus, onStatus)
  host.webContents.on('render-process-gone', () => stop('Audio helper stopped. Restart the app.'))
  return {
    host, snapshot, start, stop, toggle: () => state.active ? stop() : start(), refresh: emit,
    cycleMode() { const modes = ['auto', 'behavioral', 'coding'] as const; state.mode = modes[(modes.indexOf(state.mode) + 1) % modes.length]; emit() },
    answerNow() { detector.cancel(); const text = state.interim || state.transcript.filter((row) => row.channel === 'interviewer').at(-1)?.text; if (text) trigger(text, classifyQuestion(text, true) || 'behavioral'); else { state.status = 'No interviewer transcript yet.'; emit() } },
    cancel: () => detector.cancel(),
    async dispose() { stop(); ipcMain.removeListener(IPC.audioFrame, onFrame); ipcMain.removeListener(IPC.audioVad, onVad); ipcMain.removeListener(IPC.audioStatus, onStatus); await files.stop() }
  }
}
