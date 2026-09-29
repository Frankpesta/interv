import { create } from 'zustand'
import type { AppState } from '../../shared/ipc'
interface ControlState { app: AppState | null; error: string | null; setApp(app: AppState): void; setError(error: string | null): void }
export const useControlStore = create<ControlState>((set) => ({
  app: null, error: null, setApp: (app) => set({ app }), setError: (error) => set({ error })
}))
