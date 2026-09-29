import { StrictMode, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import Markdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import { useAnswer } from '../hooks/use-answer'
import { useSession } from '../hooks/use-session'
import '../styles.css'
import './overlay.css'

function Overlay(): React.JSX.Element {
  const answer = useAnswer()
  const session = useSession()
  const content = useRef<HTMLDivElement>(null)
  const follow = useRef(true)
  useEffect(() => { follow.current = true }, [answer.requestId])
  useEffect(() => { if (follow.current && content.current) content.current.scrollTop = content.current.scrollHeight }, [answer.text])
  useEffect(() => window.api.onScroll((direction) => {
    const element = content.current
    if (!element) return
    element.scrollBy({ top: direction === 'up' ? -180 : 180 })
    follow.current = direction === 'down' && element.scrollTop + element.clientHeight >= element.scrollHeight - 8
  }), [])
  return <main className="overlay-card">
    <header className="flex shrink-0 items-center justify-between text-[11px] text-[#b4c7bc]">
      <span className="flex items-center gap-2"><span className={`size-1.5 rounded-full ${answer.state === 'error' ? 'bg-amber-300' : session.active ? 'bg-green-300' : 'bg-[#c0cabb]'}`} />Copilot · {answer.state === 'idle' ? (session.active ? 'listening' : 'idle') : answer.state}</span>
      <span>{session.mode} {answer.firstTokenMs === null ? '' : `· ${(answer.firstTokenMs / 1000).toFixed(1)}s`}</span>
    </header>
    <div ref={content} className="answer-content min-h-0 flex-1 overflow-y-auto">
      {answer.text ? <Markdown skipHtml rehypePlugins={[[rehypeHighlight, { detect: false }]]} components={{ a: ({ children }) => <span>{children}</span>, img: () => null }}>{answer.text}</Markdown> :
        <p>{answer.state === 'thinking' ? 'Preparing an answer…' : 'Start listening or use the screenshot shortcut.'}</p>}
    </div>
    {answer.message && <p className="shrink-0 text-xs text-[#c9d4cb]" role="status">{answer.message}</p>}
    {session.showTranscript && session.interim && <p className="shrink-0 truncate text-xs text-[#a4b4aa]">{session.interim}</p>}
    {session.status !== 'Listening' && session.status !== 'Listening stopped' && <p className="shrink-0 truncate text-xs text-[#c9d4cb]">{session.status}</p>}
  </main>
}
createRoot(document.getElementById('root')!).render(<StrictMode><Overlay /></StrictMode>)
