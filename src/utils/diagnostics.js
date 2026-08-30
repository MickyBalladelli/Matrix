import { emitPlugin } from '../plugins.js'

export function describeValue(value) {
  if (value === null) {
    return 'null'
  }

  if (value === undefined) {
    return 'undefined'
  }

  if (typeof value === 'function') {
    return value.name ? `function ${value.name}` : 'an anonymous function'
  }

  if (typeof value === 'object') {
    try {
      const constructorName = value.constructor?.name
      return constructorName ? `an object (${constructorName})` : 'an object'
    } catch {
      return 'an object'
    }
  }

  try {
    return `${typeof value} (${String(value)})`
  } catch {
    return typeof value
  }
}

export function warnDiagnostic(message, details = {}) {
  try {
    globalThis.console?.warn?.(`[Matrix] ${message}`)
  } catch {
    // Diagnostics must never break the application update path.
  }

  try {
    emitPlugin('logger', {
      ...details,
      type: details.type ?? 'warning',
      message
    })
  } catch {
    // Diagnostics must never break the application update path.
  }
}

export function captureCallsite() {
  const stack = new Error().stack
  if (!stack) {
    return ''
  }

  return stack
    .split('\n')
    .slice(2)
    .filter(line => !line.includes('/src/utils/diagnostics.js'))
    .filter(line => !line.includes('/src/components/index.js'))
    .join('\n')
}
