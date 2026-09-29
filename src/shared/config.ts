export const APP_NAME = 'Interview Copilot'

export const IPC = {
  appState: 'app:state', appGetState: 'app:get-state', overlaySetVisible: 'overlay:set-visible',
  audioFrame: 'audio:frame', audioVad: 'audio:vad', sttPartial: 'stt:partial', sttFinal: 'stt:final',
  answerDelta: 'answer:delta', answerState: 'answer:state', answerRequest: 'answer:request',
  captureScreenshot: 'capture:screenshot', configGet: 'config:get', configSet: 'config:set',
  sessionStart: 'session:start', sessionStop: 'session:stop', hotkeyAction: 'hotkey:action', hotkeyRebind: 'hotkey:rebind'
} as const

export const HOTKEYS = {
  toggleListening: 'Ctrl+Shift+L', screenshot: 'Ctrl+`', answerNow: 'Ctrl+Shift+Enter',
  cancel: 'Ctrl+Shift+.', panic: 'Ctrl+Shift+H', clickThrough: 'Ctrl+Shift+M',
  cycleMode: 'Ctrl+Shift+X', scrollUp: 'Ctrl+Up', scrollDown: 'Ctrl+Down',
  moveUp: 'Ctrl+Alt+Up', moveDown: 'Ctrl+Alt+Down', moveLeft: 'Ctrl+Alt+Left', moveRight: 'Ctrl+Alt+Right',
  opacityDown: 'Ctrl+Alt+-', opacityUp: 'Ctrl+Alt+='
} as const

export const OVERLAY_HOTKEYS = {
  panic: HOTKEYS.panic, clickThrough: HOTKEYS.clickThrough,
  moveUp: HOTKEYS.moveUp, moveDown: HOTKEYS.moveDown, moveLeft: HOTKEYS.moveLeft, moveRight: HOTKEYS.moveRight,
  smaller: 'Ctrl+Alt+Shift+Down', larger: 'Ctrl+Alt+Shift+Up'
} as const
export type OverlayHotkey = keyof typeof OVERLAY_HOTKEYS

// Initial tuning values, to be measured and adjusted at the corresponding phase gate.
export const DEFAULTS = {
  overlay: { width: 440, height: 152, minWidth: 360, minHeight: 152, topOffset: 24, opacity: 0.94, nudgePx: 20, opacityStep: 0.05 },
  audio: { sampleRate: 16000, channels: 1, chunkMs: 50, microphone: false },
  stt: { provider: 'deepgram', language: 'en', endpointingMs: 300, utteranceEndMs: 1000 },
  detector: { debounceMs: 700, silencePromptMs: 1800, cooldownMs: 3000 },
  ai: { provider: 'anthropic', transcriptWindow: 6, spokenMaxTokens: 350, codingMaxTokens: 1200 },
  capture: { maxEdge: 1568, downscale: true, saveDebugScreenshots: false },
  saveTranscripts: false, showTranscript: false, fallbackLanguage: 'TypeScript'
} as const
