import { dialog, type BrowserWindow } from 'electron'
import { readFile, stat } from 'node:fs/promises'
import { extname } from 'node:path'
import { CONTEXT_LIMITS } from '../shared/config'
export async function importContext(parent: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(parent, { title: 'Import résumé', properties: ['openFile'], filters: [{ name: 'Résumé text or PDF', extensions: ['txt', 'md', 'pdf'] }] })
  if (result.canceled || !result.filePaths[0]) return null
  const path = result.filePaths[0]
  try {
    if ((await stat(path)).size > 10 * 1024 * 1024) throw new Error('File too large')
    const data = await readFile(path)
    let text: string
    if (extname(path).toLowerCase() === '.pdf') {
      const { PDFParse } = await import('pdf-parse')
      const parser = new PDFParse({ data })
      try { text = (await parser.getText()).text } finally { await parser.destroy() }
    } else if (['.txt', '.md'].includes(extname(path).toLowerCase())) text = data.toString('utf8')
    else throw new Error('Unsupported file')
    if (!text.trim()) throw new Error('No text')
    return text.slice(0, CONTEXT_LIMITS.resume)
  } catch { throw new Error('Unable to import. Use a text-based PDF, TXT or MD file under 10 MB. Scanned PDFs need text extraction first.') }
}
