export const APP_NAME = 'Interview Copilot'

export const IPC = {
  appState: 'app:state', appGetState: 'app:get-state', overlaySetVisible: 'overlay:set-visible',
  audioCommand: 'audio:command', audioStatus: 'audio:status', sessionGet: 'session:get', sessionState: 'session:state',
  answerNow: 'answer:now', modeCycle: 'mode:cycle', credentialsGet: 'credentials:get', credentialsSet: 'credentials:set',
  contextImport: 'context:import', sessionsDelete: 'sessions:delete', sessionsList: 'sessions:list',
  audioFrame: 'audio:frame', audioVad: 'audio:vad', sttPartial: 'stt:partial', sttFinal: 'stt:final',
  answerDelta: 'answer:delta', answerState: 'answer:state', answerRequest: 'answer:request', answerGet: 'answer:get', answerCancel: 'answer:cancel',
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
  toggleListening: HOTKEYS.toggleListening, answerNow: HOTKEYS.answerNow, cycleMode: HOTKEYS.cycleMode,
  opacityDown: HOTKEYS.opacityDown, opacityUp: HOTKEYS.opacityUp,
  panic: HOTKEYS.panic, clickThrough: HOTKEYS.clickThrough,
  moveUp: HOTKEYS.moveUp, moveDown: HOTKEYS.moveDown, moveLeft: HOTKEYS.moveLeft, moveRight: HOTKEYS.moveRight,
  smaller: 'Ctrl+Alt+Shift+Down', larger: 'Ctrl+Alt+Shift+Up',
  screenshot: HOTKEYS.screenshot, cancel: HOTKEYS.cancel, scrollUp: HOTKEYS.scrollUp, scrollDown: HOTKEYS.scrollDown
} as const
export type OverlayHotkey = keyof typeof OVERLAY_HOTKEYS

// Initial tuning values, to be measured and adjusted at the corresponding phase gate.
export const DEFAULTS = {
  overlay: { width: 440, height: 152, minWidth: 360, minHeight: 152, topOffset: 24, opacity: 0.94, nudgePx: 20, opacityStep: 0.05 },
  audio: { sampleRate: 16000, channels: 1, chunkMs: 50, microphone: false, vadThreshold: 0.015, vadReleaseMs: 400 },
  stt: { provider: 'deepgram', model: 'nova-3', language: 'en', endpointingMs: 300, utteranceEndMs: 1000, keepAliveMs: 4000, maxRetries: 6, maxBufferedBytes: 64000 },
  detector: { debounceMs: 700, silencePromptMs: 1800, cooldownMs: 3000 },
  ai: { provider: 'anthropic', transcriptWindow: 6, spokenMaxTokens: 350, codingMaxTokens: 1200, retryMs: 700, timeoutMs: 60000, maxAnswerChars: 32000 },
  capture: { maxEdge: 1568, downscale: true, saveDebugScreenshots: false },
  saveTranscripts: false, showTranscript: false, fallbackLanguage: 'TypeScript'
} as const

// Verified against https://platform.claude.com/docs/en/models/overview on 2026-09-29.
export const MODELS = { fast: 'claude-haiku-4-5-20251001', smart: 'claude-sonnet-5-5' } as const
export const OPENAI_MODELS = { fast: 'gpt-6-sol', smart: 'gpt-6-sol' } as const
export const CONTEXT_LIMITS = { resume: 24000, highlights: 6000, jobDescription: 10000, notes: 5000, voice: 500, language: 80 } as const
