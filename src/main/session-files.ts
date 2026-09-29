import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { TranscriptEvent } from '../shared/ipc'
export function createSessionFiles(directory: string) {
  let file: string | null = null
  let rows: TranscriptEvent[] = []
  let queue = Promise.resolve()
  let error = false
  const valid = /^session-[0-9a-f-]+\.json$/
  function flush(): Promise<void> {
    if (!file) return queue
    const target = file, data = JSON.stringify({ version: 1, transcript: rows })
    queue = queue.then(async () => { await mkdir(directory, { recursive: true }); await writeFile(target, data, 'utf8') }).catch(() => { error = true })
    return queue
  }
  return {
    start(enabled: boolean) { file = enabled ? join(directory, `session-${randomUUID()}.json`) : null; rows = []; error = false },
    append(event: TranscriptEvent) { if (file) { rows.push(event); if (rows.length > 10000) rows.shift(); void flush() } },
    stop() { const pending = flush(); file = null; rows = []; return pending },
    failed: () => error,
    async list() { await queue; const names = await readdir(directory).catch(() => [] as string[]); return Promise.all(names.filter((name) => valid.test(name)).map(async (name) => ({ name, bytes: (await stat(join(directory, name))).size }))) },
    async deleteAll() { await queue; const names = await readdir(directory).catch(() => [] as string[]); for (const name of names.filter((name) => valid.test(name))) await unlink(join(directory, name)) },
    // Read is kept internal; the renderer is never allowed to supply a filesystem path.
    async read(name: string) { if (!valid.test(name)) throw new Error('Invalid session'); return JSON.parse(await readFile(join(directory, name), 'utf8')) as unknown }
  }
}
