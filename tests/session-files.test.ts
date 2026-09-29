import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSessionFiles } from '../src/main/session-files'
test('transcript files are opt-in and deletion is restricted to generated session filenames', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'copilot-test-'))
  try {
    const files = createSessionFiles(directory), event = { channel: 'interviewer' as const, text: 'Synthetic question?', meta: { speechFinal: true, utteranceEnd: true } }
    files.start(false); files.append(event); await files.stop(); assert.deepEqual(await readdir(directory), [])
    files.start(true); files.append(event); await files.stop()
    const list = await files.list(); assert.equal(list.length, 1)
    assert.match(await readFile(join(directory, list[0].name), 'utf8'), /Synthetic question/)
    await writeFile(join(directory, 'keep.txt'), 'unrelated')
    await files.deleteAll(); assert.deepEqual(await readdir(directory), ['keep.txt'])
  } finally { await rm(directory, { recursive: true, force: true }) }
})
