import { emitPlugin } from '../plugins.js'

const INTERNAL_FRAME_PATTERNS = [
  '/src/utils/diagnostics.js',
  '/src/components/index.js',
  '/src/reactivity/context.js',
  '/src/reactivity/source.js',
  '/src/reactivity/signal.js',
  '/src/reactivity/computed.js',
  '/src/dom/template.js',
  '/src/utils/form.js'
]

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
    const output = `[Matrix] ${message}`
    if (details.stack) {
      globalThis.console?.warn?.(`${output}\n${details.stack}`)
    } else {
      globalThis.console?.warn?.(output)
    }
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
    .filter(line => !INTERNAL_FRAME_PATTERNS.some(pattern => line.includes(pattern)))
    .join('\n')
}
