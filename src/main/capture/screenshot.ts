import { desktopCapturer, screen } from 'electron'
import { DEFAULTS } from '../../shared/config'
import { AnswerError } from '../ai/errors'
import type { Settings } from '../../shared/ipc'

export async function captureScreenshot(settings: Settings): Promise<string> {
  const display = settings.displayId === 'primary' ? screen.getPrimaryDisplay() : screen.getAllDisplays().find((item) => String(item.id) === settings.displayId)
  if (!display) throw new AnswerError('Selected display is disconnected. Choose a display in control.')
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: {
    width: Math.round(display.size.width * display.scaleFactor), height: Math.round(display.size.height * display.scaleFactor)
  } })
  const source = sources.find((item) => item.display_id === String(display.id))
  if (!source || source.thumbnail.isEmpty()) throw new AnswerError('Screen capture unavailable. Check the selected display.')
  let image = source.thumbnail
  const { width, height } = image.getSize()
  if (!width || !height) throw new AnswerError('Screen capture returned an empty image.')
  if (settings.downscale && Math.max(width, height) > DEFAULTS.capture.maxEdge) {
    image = image.resize(width >= height ? { width: DEFAULTS.capture.maxEdge, quality: 'best' } : { height: DEFAULTS.capture.maxEdge, quality: 'best' })
  }
  const png = image.toPNG()
  if (!png.length) throw new AnswerError('Unable to encode the screenshot.')
  // Never persist image bytes or send them to a renderer.
  return png.toString('base64')
}
