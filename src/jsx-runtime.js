import { component } from './components/index.js'
import { html } from './dom/template.js'

export const Fragment = Symbol('matrix.fragment')

const templateCache = new Map()

const ATTRIBUTE_ALIASES = new Map([
  ['className', 'class'],
  ['htmlFor', 'for'],
  ['readOnly', 'readonly'],
  ['autoFocus', 'autofocus'],
  ['autoComplete', 'autocomplete'],
  ['autoPlay', 'autoplay'],
  ['colSpan', 'colspan'],
  ['rowSpan', 'rowspan'],
  ['tabIndex', 'tabindex']
])

const PROPERTY_ATTRIBUTES = new Set([
  'checked',
  'disabled',
  'indeterminate',
  'muted',
  'selected',
  'value'
])

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
])

export function jsx(type, props, key) {
  return createJsxNode(type, props, key)
}

export function jsxs(type, props, key) {
  return createJsxNode(type, props, key)
}

export function jsxDEV(type, props, key) {
  return createJsxNode(type, props, key)
}

export function createElement(type, props, ...children) {
  const nextProps = { ...(props ?? {}) }

  if (children.length > 0) {
    nextProps.children = children.length === 1 ? children[0] : children
  }

  return createJsxNode(type, nextProps, nextProps.key)
}

export const h = createElement

function createJsxNode(type, props, runtimeKey) {
  const nextProps = props ?? {}
  const key = runtimeKey ?? nextProps.key

  if (type === Fragment) {
    return nextProps.children ?? null
  }

  if (typeof type === 'function') {
    const componentProps = { ...nextProps }
    delete componentProps.key
    return component(type, componentProps, key)
  }

  if (typeof type !== 'string' || type.length === 0) {
    throw new TypeError('jsx() expects an element or Matrix component')
  }

  const result = createElementTemplate(type, nextProps)
  if (key !== undefined) {
    Object.defineProperty(result, 'key', { value: key, enumerable: true })
  }
  return result
}

function createElementTemplate(type, props) {
  const attributes = []
  const values = []

  for (const [name, value] of Object.entries(props)) {
    if (name === 'children' || name === 'key') {
      continue
    }

    if (name === 'dangerouslySetInnerHTML') {
      throw new Error('Matrix does not support dangerouslySetInnerHTML')
    }

    attributes.push(toAttributeName(name))
    values.push(value)
  }

  const hasChildren = Object.prototype.hasOwnProperty.call(props, 'children')
  const childValues = hasChildren ? [props.children] : []
  const strings = getTemplateStrings(type, attributes, childValues.length)

  return html(strings, ...values, ...childValues)
}

function toAttributeName(name) {
  const eventMatch = /^on([A-Z].*)$/.exec(name)

  if (eventMatch) {
    let eventName = eventMatch[1]
    const modifiers = []

    let matched = true
    while (matched) {
      matched = false

      for (const [suffix, modifier] of [
        ['Capture', 'capture'],
        ['Once', 'once'],
        ['Passive', 'passive'],
        ['Prevent', 'prevent'],
        ['Stop', 'stop']
      ]) {
        if (eventName.endsWith(suffix)) {
          eventName = eventName.slice(0, -suffix.length)
          modifiers.unshift(modifier)
          matched = true
          break
        }
      }
    }

    return `@${eventName.toLowerCase()}${modifiers.map(modifier => `.${modifier}`).join('')}`
  }

  if (PROPERTY_ATTRIBUTES.has(name)) {
    return `.${name}`
  }

  return ATTRIBUTE_ALIASES.get(name) ?? name
}

function getTemplateStrings(type, attributes, childCount) {
  const cacheKey = `${type}\u0000${attributes.join('\u0001')}\u0000${childCount}`
  const cached = templateCache.get(cacheKey)

  if (cached) {
    return cached
  }

  const strings = [`<${type}`]

  for (const attribute of attributes) {
    strings[strings.length - 1] += ` ${attribute}="`
    strings.push('"')
  }

  strings[strings.length - 1] += '>'

  for (let index = 0; index < childCount; index += 1) {
    strings.push('')
  }

  if (!VOID_ELEMENTS.has(type.toLowerCase())) {
    strings[strings.length - 1] += `</${type}>`
  }
  Object.defineProperty(strings, 'raw', { value: strings.slice() })
  templateCache.set(cacheKey, strings)

  return strings
}
