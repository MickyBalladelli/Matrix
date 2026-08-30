import { effect } from '../reactivity/effect.js'
import { isReactiveValue } from '../utils/reactive.js'
import { emitPlugin } from '../plugins.js'

const styleCache = new WeakMap()
const staticScopedStyles = new WeakMap()
const staticGlobalStyles = new WeakMap()
const STYLE_RESULT = Symbol('matrix.style.result')
const VARIABLES_RESULT = Symbol('matrix.variables.result')

export const defaultTokens = Object.freeze({
  '--matrix-color-primary': '#2563eb',
  '--matrix-color-surface': '#ffffff',
  '--matrix-color-text': '#0f172a',
  '--matrix-space-1': '0.25rem',
  '--matrix-space-2': '0.5rem',
  '--matrix-space-3': '0.75rem',
  '--matrix-radius-sm': '0.375rem',
  '--matrix-radius-md': '0.5rem',
  '--matrix-font-body': 'system-ui, sans-serif'
})

function hash(value) {
  let result = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }

  return Math.abs(result >>> 0).toString(36)
}

function interpolate(strings, values) {
  return strings.reduce((result, string, index) => {
    if (index === strings.length - 1) {
      return result + string
    }

    return result + string + (values[index] ?? '')
  }, '')
}

function findClosingBrace(source, openingIndex) {
  let depth = 1

  for (let index = openingIndex + 1; index < source.length; index += 1) {
    if (source[index] === '{') {
      depth += 1
    } else if (source[index] === '}') {
      depth -= 1
      if (depth === 0) {
        return index
      }
    }
  }

  return source.length - 1
}

function prefixSelector(selector, scopeSelector) {
  const trimmed = selector.trim()
  if (!trimmed) {
    return trimmed
  }

  if (trimmed.startsWith(':global(') && trimmed.endsWith(')')) {
    return trimmed.slice(8, -1).trim()
  }

  if (trimmed.startsWith(':host')) {
    return trimmed.replace(':host', scopeSelector)
  }

  return `${scopeSelector}${trimmed}, ${scopeSelector} ${trimmed}`
}

function prefixSelectors(prelude, scopeSelector) {
  return splitSelectorList(prelude)
    .map(selector => prefixSelector(selector, scopeSelector))
    .join(', ')
}

function splitSelectorList(source) {
  const selectors = []
  let start = 0
  let parentheses = 0
  let brackets = 0
  let quote = ''

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (quote) {
      if (character === quote && source[index - 1] !== '\\') {
        quote = ''
      }
      continue
    }

    if (character === '"' || character === "'") {
      quote = character
    } else if (character === '(') {
      parentheses += 1
    } else if (character === ')') {
      parentheses -= 1
    } else if (character === '[') {
      brackets += 1
    } else if (character === ']') {
      brackets -= 1
    } else if (character === ',' && parentheses === 0 && brackets === 0) {
      selectors.push(source.slice(start, index))
      start = index + 1
    }
  }

  selectors.push(source.slice(start))
  return selectors
}

function scopeRules(source, scopeSelector, insideKeyframes = false) {
  let output = ''
  let cursor = 0

  while (cursor < source.length) {
    const openingIndex = source.indexOf('{', cursor)
    if (openingIndex === -1) {
      output += source.slice(cursor)
      break
    }

    const prelude = source.slice(cursor, openingIndex)
    const closingIndex = findClosingBrace(source, openingIndex)
    const body = source.slice(openingIndex + 1, closingIndex)
    const trimmedPrelude = prelude.trim()

    if (insideKeyframes || trimmedPrelude.startsWith('@keyframes') || trimmedPrelude.startsWith('@-webkit-keyframes')) {
      output += `${prelude}{${body}}`
    } else if (trimmedPrelude.startsWith('@')) {
      output += `${prelude}{${scopeRules(body, scopeSelector)}}`
    } else {
      output += `${prefixSelectors(prelude, scopeSelector)}{${body}}`
    }

    cursor = closingIndex + 1
  }

  return output
}

function createScopedStyle(cssText) {
  const id = `matrix-${hash(cssText)}`
  const scopeSelector = `[data-matrix-scope="${id}"]`

  return {
    [STYLE_RESULT]: true,
    id,
    scopeSelector,
    cssText: scopeRules(cssText, scopeSelector)
  }
}

function createGlobalStyle(cssText) {
  return {
    [STYLE_RESULT]: true,
    id: `matrix-global-${hash(cssText)}`,
    scopeSelector: null,
    cssText
  }
}

function getDocumentStyleCache(document) {
  let cache = styleCache.get(document)
  if (!cache) {
    cache = new Map()
    styleCache.set(document, cache)
  }
  return cache
}

function ensureStyleElement(document, definition) {
  const cache = getDocumentStyleCache(document)
  if (cache.has(definition.id)) {
    return cache.get(definition.id)
  }

  const element = document.createElement('style')
  element.setAttribute('data-matrix-style', definition.id)
  element.textContent = definition.cssText
  document.head?.appendChild(element)

  if (!element.parentNode) {
    document.documentElement.appendChild(element)
  }

  cache.set(definition.id, element)
  return element
}

export function css(strings, ...values) {
  const cssText = typeof strings === 'string' ? strings : interpolate(strings, values)
  if (typeof strings !== 'string' && values.length === 0) {
    const cached = staticScopedStyles.get(strings)
    if (cached) {
      return cached
    }

    const definition = createScopedStyle(cssText)
    staticScopedStyles.set(strings, definition)
    return definition
  }

  return createScopedStyle(cssText)
}

export function globalCss(strings, ...values) {
  const cssText = typeof strings === 'string' ? strings : interpolate(strings, values)
  if (typeof strings !== 'string' && values.length === 0) {
    const cached = staticGlobalStyles.get(strings)
    if (cached) {
      return cached
    }

    const definition = createGlobalStyle(cssText)
    staticGlobalStyles.set(strings, definition)
    return definition
  }

  return createGlobalStyle(cssText)
}

export function cssVariables(values) {
  if (!values || typeof values !== 'object') {
    throw new TypeError('cssVariables() expects an object')
  }

  return {
    [VARIABLES_RESULT]: true,
    values
  }
}

export function tokens(overrides = {}) {
  return cssVariables({ ...defaultTokens, ...overrides })
}

function variableRules(values) {
  return Object.entries(values)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ')
}

export function theme(definition = {}) {
  const light = definition.light ?? definition
  const dark = definition.dark
  const darkRules = dark
    ? `@media (prefers-color-scheme: dark) { :root { ${variableRules(dark)} } }`
    : ''

  return globalCss(`:root { ${variableRules(light)} } ${darkRules}`)
}

export function utilityCss() {
  return globalCss(`
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .stack { display: grid; gap: var(--matrix-space-2); }
    .cluster { display: flex; flex-wrap: wrap; gap: var(--matrix-space-2); }
    .matrix-focus-ring:focus-visible {
      outline: 3px solid var(--matrix-color-primary);
      outline-offset: 3px;
    }
    @media (prefers-reduced-motion: reduce) {
      .matrix-motion-safe {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
      }
    }
  `)
}

export function isStyleResult(value) {
  return Boolean(value && value[STYLE_RESULT])
}

export function isVariablesResult(value) {
  return Boolean(value && value[VARIABLES_RESULT])
}

export function applyStyle(element, definition, scope) {
  if (!isStyleResult(definition)) {
    throw new TypeError('use:style expects a css() result')
  }

  ensureStyleElement(element.ownerDocument, definition)

  if (definition.scopeSelector) {
    element.setAttribute('data-matrix-scope', definition.id)
  }

  emitPlugin('style', { type: 'style:apply', element, definition })

  scope.add(() => {
    if (definition.scopeSelector) {
      element.removeAttribute('data-matrix-scope')
    }
  })
}

export function disposeStyle(definition, document = globalThis.document) {
  if (!isStyleResult(definition)) {
    throw new TypeError('disposeStyle() expects a css() or globalCss() result')
  }

  if (!document) {
    return false
  }

  const cache = styleCache.get(document)
  const element = cache?.get(definition.id)
  if (!element) {
    return false
  }

  element.remove()
  cache.delete(definition.id)
  emitPlugin('style', { type: 'style:dispose', definition })
  return true
}

export function applyCssVariables(element, definition, scope) {
  if (!isVariablesResult(definition)) {
    throw new TypeError('use:vars expects a cssVariables() result')
  }

  const applied = new Set()

  effect(() => {
    const nextKeys = new Set(Object.keys(definition.values))

    for (const key of applied) {
      if (!nextKeys.has(key)) {
        element.style.removeProperty(key)
      }
    }

    for (const [key, source] of Object.entries(definition.values)) {
      const value = isReactiveValue(source) ? source.value : source
      if (value === null || value === undefined || value === false) {
        element.style.removeProperty(key)
      } else {
        element.style.setProperty(key, String(value))
      }
    }

    applied.clear()
    for (const key of nextKeys) {
      applied.add(key)
    }
  })

  scope.add(() => {
    for (const key of applied) {
      element.style.removeProperty(key)
    }
  })
}
