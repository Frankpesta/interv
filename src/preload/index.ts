import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type AppState, type AnswerState, type CopilotApi, type AudioBridge, type AudioCommand, type SessionState } from '../shared/ipc'

const api: CopilotApi = {
  getSession: () => ipcRenderer.invoke(IPC.sessionGet),
  startSession: () => ipcRenderer.invoke(IPC.sessionStart), stopSession: () => ipcRenderer.invoke(IPC.sessionStop),
  answerNow: () => ipcRenderer.invoke(IPC.answerNow), cycleMode: () => ipcRenderer.invoke(IPC.modeCycle),
  getCredentials: () => ipcRenderer.invoke(IPC.credentialsGet), setCredential: (provider, key) => ipcRenderer.invoke(IPC.credentialsSet, provider, key),
  importContext: () => ipcRenderer.invoke(IPC.contextImport), listSessions: () => ipcRenderer.invoke(IPC.sessionsList), deleteSessions: () => ipcRenderer.invoke(IPC.sessionsDelete),
  onSession: (listener) => {
    const handler = (_event: IpcRendererEvent, state: SessionState): void => listener(state)
    ipcRenderer.on(IPC.sessionState, handler)
    return () => ipcRenderer.removeListener(IPC.sessionState, handler)
  },
  getState: () => ipcRenderer.invoke(IPC.appGetState),
  setOverlayVisible: (visible) => ipcRenderer.invoke(IPC.overlaySetVisible, visible),
  rebindHotkey: (action, accelerator) => ipcRenderer.invoke(IPC.hotkeyRebind, action, accelerator),
  getSettings: () => ipcRenderer.invoke(IPC.configGet),
  saveSettings: (settings) => ipcRenderer.invoke(IPC.configSet, settings),
  getAnswer: () => ipcRenderer.invoke(IPC.answerGet),
  requestScreenshot: () => ipcRenderer.invoke(IPC.answerRequest),
  cancelAnswer: () => ipcRenderer.invoke(IPC.answerCancel),
  onAnswer: (listener) => {
    const handler = (_event: IpcRendererEvent, state: AnswerState): void => listener(state)
    ipcRenderer.on(IPC.answerState, handler)
    return () => ipcRenderer.removeListener(IPC.answerState, handler)
  },
  onScroll: (listener) => {
    const handler = (_event: IpcRendererEvent, direction: 'up' | 'down'): void => listener(direction)
    ipcRenderer.on(IPC.hotkeyAction, handler)
    return () => ipcRenderer.removeListener(IPC.hotkeyAction, handler)
  },
  onState: (listener) => {
    const handler = (_event: IpcRendererEvent, state: AppState): void => listener(state)
    ipcRenderer.on(IPC.appState, handler)
    return () => ipcRenderer.removeListener(IPC.appState, handler)
  }
}
contextBridge.exposeInMainWorld('api', api)
const audio: AudioBridge = {
  onCommand(listener) { const handler = (_event: IpcRendererEvent, command: AudioCommand): void => listener(command); ipcRenderer.on(IPC.audioCommand, handler); return () => ipcRenderer.removeListener(IPC.audioCommand, handler) },
  frame: (frame) => ipcRenderer.send(IPC.audioFrame, frame), vad: (event) => ipcRenderer.send(IPC.audioVad, event), status: (status) => ipcRenderer.send(IPC.audioStatus, status)
}
contextBridge.exposeInMainWorld('audio', audio)
