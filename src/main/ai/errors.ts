export class AnswerError extends Error {
  constructor(message: string, readonly retryable = false) { super(message) }
}
