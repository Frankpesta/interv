import { app, BrowserWindow, globalShortcut, powerMonitor, type Tray } from 'electron'
import { join } from 'node:path'
import { APP_NAME, MODELS, OPENAI_MODELS } from '../shared/config'
import { IPC, type AppState } from '../shared/ipc'
import { createControlWindow } from './windows/control'
import { createOverlayWindow } from './windows/overlay'
import { loadRenderer } from './windows/load'
import { registerIpc } from './ipc'
import { createTray } from './tray'
import { createOverlayControls } from './hotkeys'
import { config as loadEnv } from 'dotenv'
import { createSettingsStore } from './store'
import { createAnthropic } from './ai/anthropic'
import { createOpenAI } from './ai/openai'
import { AnswerCoordinator } from './ai/coordinator'
import { screenshotAnswer } from './ai/screenshot-answer'
import { captureScreenshot } from './capture/screenshot'
import { loadCredentials, saveCredential } from './credentials'
import { createSession } from './session'
import { createSessionFiles } from './session-files'
import { importContext } from './context-import'

app.setName(APP_NAME)
let quitting = false
let control: BrowserWindow | undefined
let tray: Tray | undefined
let disposeIpc: (() => void) | undefined
let answers: AnswerCoordinator | undefined
let session: ReturnType<typeof createSession> | undefined
let finishedShutdown = false

if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => {
    if (control && !control.isDestroyed()) { control.restore(); control.show() }
  })
  app.whenReady().then(async () => {
    if (!app.isPackaged) loadEnv({ quiet: true })
    const model = process.env.MODEL_SMART?.trim() || MODELS.smart
    const openaiModel = process.env.OPENAI_MODEL_SMART?.trim() || OPENAI_MODELS.smart
    let credentials = await loadCredentials()
    const providers = {
      anthropic: createAnthropic(credentials.anthropic, model),
      openai: createOpenAI(credentials.openai, openaiModel)
    }
    const settings = createSettingsStore(() => [
      { id: 'anthropic', label: 'Anthropic', ready: providers.anthropic.ready(), model },
      { id: 'openai', label: 'OpenAI', ready: providers.openai.ready(), model: openaiModel }
    ])
    control = createControlWindow(() => quitting)
    const overlay = createOverlayWindow()
    const coordinator = new AnswerCoordinator((state, delta) => {
      for (const window of BrowserWindow.getAllWindows()) {
        if (!window.webContents.isDestroyed()) {
          if (delta) window.webContents.send(IPC.answerDelta, { requestId: state.requestId, text: delta })
          window.webContents.send(IPC.answerState, state)
        }
      }
    })
    answers = coordinator
    const files = createSessionFiles(join(app.getPath('userData'), 'sessions'))
    const listening = createSession(settings.get, () => credentials.deepgram, (state) => {
      for (const window of [control, overlay]) if (window && !window.webContents.isDestroyed()) window.webContents.send(IPC.sessionState, state)
    }, (question, mode, transcript) => {
      if (!overlay.isVisible()) return
      const snapshot = settings.get(), provider = providers[snapshot.provider]
      const textModel = mode === 'coding' ? (snapshot.provider === 'anthropic' ? model : openaiModel) : (snapshot.provider === 'anthropic' ? process.env.MODEL_FAST || MODELS.fast : process.env.OPENAI_MODEL_FAST || OPENAI_MODELS.fast)
      void coordinator.run((signal, delta) => provider.stream('', snapshot.context, signal, delta, { question, mode, transcript, model: textModel }))
    }, files)
    session = listening
    const screenshot = (): void => {
      if (!overlay.isVisible()) return
      const snapshot = settings.get()
      const provider = providers[snapshot.provider]
      void coordinator.run(screenshotAnswer(snapshot, provider, captureScreenshot))
    }
    const getState = (): AppState => ({
      version: app.getVersion(), phase: 6, overlayVisible: overlay.isVisible(), listening: listening.snapshot().active,
      ...overlayControls.getState()
    })
    const broadcast = (): void => {
      for (const window of BrowserWindow.getAllWindows()) {
        if (!window.webContents.isDestroyed()) window.webContents.send(IPC.appState, getState())
      }
    }
    const overlayControls = createOverlayControls(overlay, broadcast, {
      screenshot, cancel: () => { listening.cancel(); coordinator.cancel() },
      toggleListening: listening.toggle, answerNow: listening.answerNow, cycleMode: listening.cycleMode,
      scroll: (direction) => overlay.webContents.send(IPC.hotkeyAction, direction)
    })
    disposeIpc = registerIpc(control, overlay, getState, overlayControls.rebind, {
      settings: settings.view, saveSettings: (value) => { const result = settings.save(value); listening.refresh(); return result }, answer: () => coordinator.snapshot(), screenshot, cancel: () => { listening.cancel(); coordinator.cancel() },
      session: listening.snapshot, start: listening.start, stop: () => { listening.stop(); coordinator.cancel() }, answerNow: listening.answerNow, cycleMode: listening.cycleMode,
      credentials: () => ({ anthropic: !!credentials.anthropic, openai: !!credentials.openai, deepgram: !!credentials.deepgram }),
      async setCredential(provider, key) {
        await saveCredential(provider, key)
        listening.stop(); coordinator.cancel()
        credentials = await loadCredentials()
        providers.anthropic = createAnthropic(credentials.anthropic, model)
        providers.openai = createOpenAI(credentials.openai, openaiModel)
      },
      importContext: () => importContext(control!), listSessions: files.list,
      deleteSessions: async () => { if (listening.snapshot().active) throw new Error('Stop listening before deleting sessions.'); await files.deleteAll() }
    })
    overlay.on('show', broadcast)
    overlay.on('hide', () => { listening.cancel(); coordinator.cancel(); broadcast() })
    powerMonitor.on('suspend', () => { listening.stop('Listening stopped for system sleep. Start again when ready.'); coordinator.cancel() })
    tray = createTray({
      openControl: () => { control?.restore(); control?.show() },
      toggleOverlay: overlayControls.toggleVisible,
      toggleClickThrough: overlayControls.toggleClickThrough,
      toggleListening: listening.toggle,
      quit: () => app.quit()
    })
    await Promise.all([loadRenderer(control, 'control'), loadRenderer(overlay, 'overlay'), loadRenderer(listening.host, 'audio')])
    control.show()
    overlay.showInactive()
    broadcast()
  }).catch(() => {
    console.error('Application startup failed. Check the build and local renderer assets.')
    app.exit(1)
  })
}

app.on('before-quit', (event) => {
  quitting = true; answers?.cancel()
  if (!finishedShutdown && session) {
    event.preventDefault()
    if (finishedShutdown) return
    const pending = session; session = undefined
    void pending.dispose().finally(() => { finishedShutdown = true; app.quit() })
  }
})
app.on('will-quit', () => { disposeIpc?.(); globalShortcut.unregisterAll(); tray?.destroy() })
