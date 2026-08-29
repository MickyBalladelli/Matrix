const templateCache = new WeakMap()

const ATTRIBUTE_MARKER = /__MATRIX_ATTR_(\d+)__/g
const TEXT_MARKER = /^matrix:text:(\d+)$/

export const TEMPLATE_RESULT = Symbol('matrix.template.result')

export function html(strings, ...values) {
  if (!Array.isArray(strings) || !Array.isArray(strings.raw)) {
    throw new TypeError('html() doit être utilisé comme template tagué')
  }

  return {
    [TEMPLATE_RESULT]: true,
    strings,
    values
  }
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
      throw new Error('Les expressions ne peuvent pas être placées dans un nom de balise')
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
        node,
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
        element,
        name: attribute.name,
        parts
      })
    }
  }

  return bindings
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
