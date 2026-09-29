import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type AppState, type CopilotApi } from '../shared/ipc'

const api: CopilotApi = {
  getState: () => ipcRenderer.invoke(IPC.appGetState),
  setOverlayVisible: (visible) => ipcRenderer.invoke(IPC.overlaySetVisible, visible),
  onState: (listener) => {
    const handler = (_event: IpcRendererEvent, state: AppState): void => listener(state)
    ipcRenderer.on(IPC.appState, handler)
    return () => ipcRenderer.removeListener(IPC.appState, handler)
  }
}
contextBridge.exposeInMainWorld('api', api)
