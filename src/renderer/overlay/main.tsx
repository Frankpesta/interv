import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles.css'

function Overlay(): React.JSX.Element {
  return <main className="m-2 rounded-xl border border-white/15 bg-[#24352e]/95 px-5 py-4 text-[#eef2ed]">
    <header className="flex items-center justify-between text-[11px] text-[#b4c7bc]"><span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#c0cabb]" />Copilot · Idle</span><span>Preview</span></header>
    <p className="mt-3 text-sm font-medium">Your answers will appear here.</p>
    <p className="mt-1.5 text-xs text-[#b4c7bc]">Audio and AI are not connected yet.</p>
  </main>
}
createRoot(document.getElementById('root')!).render(<StrictMode><Overlay /></StrictMode>)
