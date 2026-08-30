import { captureCallsite } from '../utils/diagnostics.js'
import { warnDevelopment } from '../utils/development.js'

const templateCache = new WeakMap()

const ATTRIBUTE_MARKER = /__MATRIX_ATTR_(\d+)__/g
const TEXT_MARKER = /^matrix:text:(\d+)$/
const FORGOTTEN_BRACES = /(?:^|[>\s])\{\s*([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\}(?=\s|<|$)/
const ESCAPED_INTERPOLATION = /\\\$\{\s*([^}]+)\}/

export const TEMPLATE_RESULT = Symbol('matrix.template.result')

export function html(strings, ...values) {
  if (!Array.isArray(strings) || !Array.isArray(strings.raw)) {
    throw new TypeError('html() must be used as a tagged template')
  }

  warnForgottenInterpolation(strings)

  return {
    [TEMPLATE_RESULT]: true,
    strings,
    values
  }
}

function warnForgottenInterpolation(strings) {
  const source = strings.raw.join('')
  const escapedMatch = ESCAPED_INTERPOLATION.exec(source)

  if (escapedMatch) {
    const expression = escapedMatch[1].trim()
    const suggestion = '${' + expression + '}'
    const escaped = '\\${' + expression + '}'
    warnDevelopment(
      `Template contains an escaped interpolation "${escaped}". Did you mean "${suggestion}"?`,
      { type: 'template:forgotten-interpolation', expression, stack: captureCallsite() }
    )
    return
  }

  const bracesMatch = FORGOTTEN_BRACES.exec(source)
  if (!bracesMatch) {
    return
  }

  const expression = bracesMatch[1].replace(/\s*\.\s*/g, '.')
  const suggestion = '${' + expression + '}'
  warnDevelopment(
    `Template contains "{${expression}}". Did you mean "${suggestion}"?`,
    { type: 'template:forgotten-interpolation', expression, stack: captureCallsite() }
  )
}

export function isTemplateResult(value) {
  return Boolean(value && value[TEMPLATE_RESULT])
}

function isAttributePosition(source, literal) {
  const templateSource = source + literal
  const tagStart = templateSource.lastIndexOf('<')
  const tagEnd = templateSource.lastIndexOf('>')

  if (tagStart <= tagEnd) {
    return false
  }

  const tagTail = templateSource.slice(tagStart)
  return /(?:^|\s)([^\s="'<>`]+)\s*=\s*(?:"[^"]*|'[^']*|[^\s"'<>`]*)$/.test(tagTail)
}

function buildTemplateSource(strings) {
  return strings.reduce((source, literal, index) => {
    if (index === strings.length - 1) {
      return source + literal
    }

    const attributePosition = isAttributePosition(source, literal)

    if (!attributePosition && /<\/?[A-Za-z0-9_-]*$/.test(literal)) {
      throw new Error('Expressions cannot be used inside a tag name')
    }

    const marker = attributePosition
      ? `__MATRIX_ATTR_${index}__`
      : `<!--matrix:text:${index}-->`

    return source + literal + marker
  }, '')
}

function collectTextBindings(fragment) {
  const bindings = []
  const document = fragment.ownerDocument
  const walker = document.createTreeWalker(fragment, 128)
  let node = walker.nextNode()

  while (node) {
    const match = TEXT_MARKER.exec(node.data)
    if (match) {
      bindings.push({
        path: getNodePath(node, fragment),
        index: Number(match[1])
      })
    }

    node = walker.nextNode()
  }

  return bindings
}

function collectAttributeBindings(fragment) {
  const bindings = []
  const elements = fragment.querySelectorAll('*')

  for (const element of elements) {
    for (const attribute of [...element.attributes]) {
      const matches = [...attribute.value.matchAll(ATTRIBUTE_MARKER)]
      if (matches.length === 0) {
        continue
      }

      const parts = []
      let cursor = 0

      for (const match of matches) {
        if (match.index > cursor) {
          parts.push(attribute.value.slice(cursor, match.index))
        }

        parts.push({ index: Number(match[1]) })
        cursor = match.index + match[0].length
      }

      if (cursor < attribute.value.length) {
        parts.push(attribute.value.slice(cursor))
      }

      bindings.push({
        path: getNodePath(element, fragment),
        name: attribute.name,
        parts
      })
    }
  }

  return bindings
}

function getNodePath(node, root) {
  const path = []
  let current = node

  while (current !== root) {
    const parent = current.parentNode
    if (!parent) {
      throw new Error('Matrix could not index a compiled template node')
    }

    path.unshift([...parent.childNodes].indexOf(current))
    current = parent
  }

  return path
}

export function getTemplateNode(root, path) {
  let node = root

  for (const index of path) {
    node = node.childNodes[index]
  }

  return node
}

export function getCompiledTemplate(strings, document) {
  let documentCache = templateCache.get(strings)

  if (!documentCache) {
    documentCache = new WeakMap()
    templateCache.set(strings, documentCache)
  }

  let compiled = documentCache.get(document)
  if (compiled) {
    return compiled
  }

  const template = document.createElement('template')
  template.innerHTML = buildTemplateSource(strings)

  compiled = {
    template,
    textBindings: collectTextBindings(template.content),
    attributeBindings: collectAttributeBindings(template.content)
  }

  documentCache.set(document, compiled)
  return compiled
}

export function getAttributeMarkerParts(parts, values) {
  return parts.map(part => {
    if (typeof part === 'string') {
      return part
    }

    return values[part.index]
  })
}
