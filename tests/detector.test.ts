import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as wait } from 'node:timers/promises'
import { classifyQuestion, QuestionDetector } from '../src/main/ai/detector'

test('question classification distinguishes acknowledgements, spoken and coding prompts', () => {
  for (const text of ['Okay.', 'great', 'Thank you!', 'mm-hmm']) assert.equal(classifyQuestion(text, true), null)
  assert.equal(classifyQuestion('Tell me about a difficult project.'), 'behavioral')
  assert.equal(classifyQuestion('Implement a function that reverses an array.'), 'coding')
  assert.equal(classifyQuestion('Our company has been working on this problem for years.'), null)
  assert.equal(classifyQuestion('Our company has been working on this problem for years.', true), 'behavioral')
})
test('detector waits for speech end, merges segments, suppresses mic speech and duplicates', async () => {
  const fired: string[] = []
  const detector = new QuestionDetector((text) => fired.push(text), { debounceMs: 10, silencePromptMs: 20, cooldownMs: 5 })
  detector.activity({ channel: 'interviewer', event: 'start' })
  detector.final('How would you')
  await wait(25); assert.equal(fired.length, 0)
  detector.final('solve this problem?')
  detector.activity({ channel: 'interviewer', event: 'end' })
  await wait(25); assert.deepEqual(fired, ['How would you solve this problem?'])
  detector.final('How would you solve this problem?'); await wait(25); assert.equal(fired.length, 1)
  detector.final('Tell me about your role.'); detector.activity({ channel: 'user', event: 'start' })
  await wait(25); detector.activity({ channel: 'user', event: 'end' }); await wait(25); assert.equal(fired.length, 1)
  detector.final('Describe your experience.'); detector.cancel(); await wait(25); assert.equal(fired.length, 1)
  detector.reset()
})
