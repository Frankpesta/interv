import { DEFAULTS } from '../../shared/config'
import type { AnswerMode, AudioVad } from '../../shared/ipc'

const ack = /^(ok(ay)?|great|thanks?( you)?|thank you|right|yes|no|sure|mm[ -]?hmm|uh[ -]?huh|alright|got it|sounds good)[.!\s]*$/i
export function classifyQuestion(text: string, silence = false): 'behavioral' | 'coding' | null {
  const clean = text.trim()
  if (!clean || ack.test(clean)) return null
  if (!clean.endsWith('?') && !/^(who|what|why|how|when|where|which|can you|could you|tell me|describe|explain|walk me through|write|implement|given|design)\b/i.test(clean) && !(silence && clean.split(/\s+/).length >= 7)) return null
  return /\b(code|coding|implement|function|algorithm|complexity|array|string|tree|return|given an input|write a program)\b/i.test(clean) ? 'coding' : 'behavioral'
}
export class QuestionDetector {
  private timer?: ReturnType<typeof setTimeout>
  private pending = ''
  private userSpeaking = false
  private interviewerSpeaking = false
  private last = ''
  private firedAt = -Infinity
  constructor(private readonly fire: (text: string, mode: Exclude<AnswerMode, 'auto'>) => void, private readonly timing: { debounceMs: number; silencePromptMs: number; cooldownMs: number } = DEFAULTS.detector) {}
  final(text: string): void { this.pending = `${this.pending} ${text}`.trim().slice(-16000); this.schedule() }
  activity(event: AudioVad): void {
    if (event.channel === 'user') {
      this.userSpeaking = event.event === 'start'
      if (this.userSpeaking) { clearTimeout(this.timer); this.pending = '' }
    } else {
      this.interviewerSpeaking = event.event === 'start'
      clearTimeout(this.timer)
      if (!this.interviewerSpeaking) this.schedule()
    }
  }
  private schedule(): void {
    clearTimeout(this.timer)
    if (!this.pending || this.userSpeaking || this.interviewerSpeaking) return
    const direct = classifyQuestion(this.pending)
    this.timer = setTimeout(() => {
      const text = this.pending; this.pending = ''
      const mode = classifyQuestion(text, true), normalized = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
      if (!mode || this.userSpeaking || this.interviewerSpeaking || normalized === this.last || Date.now() - this.firedAt < this.timing.cooldownMs) return
      this.last = normalized; this.firedAt = Date.now(); this.fire(text, mode)
    }, direct ? this.timing.debounceMs : this.timing.silencePromptMs)
  }
  reset(): void { clearTimeout(this.timer); this.pending = ''; this.userSpeaking = false; this.interviewerSpeaking = false; this.last = ''; this.firedAt = -Infinity }
  cancel(): void { clearTimeout(this.timer); this.pending = '' }
}
