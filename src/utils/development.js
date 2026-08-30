import { isDevelopment } from '../config.js'
import { warnDiagnostic } from './diagnostics.js'

export function warnDevelopment(message, details = {}) {
  if (!isDevelopment()) {
    return
  }

  warnDiagnostic(message, details)
}
