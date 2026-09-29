import type { CopilotApi } from '../shared/ipc'
declare global { interface Window { api: CopilotApi } }
