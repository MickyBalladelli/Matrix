import { effect } from '../reactivity/effect.js'
import { createScope } from '../reactivity/scope.js'
import { getCurrentScope, runWithRenderState } from '../reactivity/context.js'
import {
  getAttributeMarkerParts,
  getCompiledTemplate,
  html,
  isTemplateResult
} from './template.js'
import {
  component,
  isComponentResult,
  runWithComponent
} from '../components/index.js'
import { ERROR_BOUNDARY_RESULT, getCurrentComponent } from '../components/context.js'
import { applyCssVariables, applyStyle } from '../styles/index.js'
import { bindInput } from '../utils/form.js'
import { emitDebugEvent } from '../utils/debug.js'
import { isKeyedList } from './list.js'

const EVENT_PREFIX = '@'
const PROPERTY_PREFIX = '.'
const BOOLEAN_PREFIX = '?'
const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'poster', 'xlink:href'])

function isReactiveValue(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value.kind === 'signal' || value.kind === 'computed') &&
    typeof value.get === 'function'
  )
}

function readValue(value) {
  return isReactiveValue(value) ? value.value : value
}

function removeNode(node) {
  if (node.parentNode) {
    node.parentNode.removeChild(node)
  }
}

function removeRange(start, end) {
  let current = start

  while (current) {
    const next = current.nextSibling
    removeNode(current)
    if (current === end) {
      break
    }
    current = next
  }
}

function assertSafeUrl(name, value) {
  if (!URL_ATTRIBUTES.has(name.toLowerCase()) || typeof value !== 'string') {
    return
  }

  const schemeEnd = value.indexOf(':')
  const scheme = schemeEnd === -1
    ? ''
    : value.slice(0, schemeEnd).replace(/[\u0000-\u0020\u007f]+/g, '').toLowerCase()

  if (scheme === 'javascript' || scheme === 'vbscript' || scheme === 'data') {
    throw new Error(`Unsafe dynamic URL rejected for attribute ${name}`)
  }
}

function emptyState() {
  return {
    firstNode: null,
    get nodes() {
      return []
    },
    dispose() {},
    moveBefore() {}
  }
}

function textState(text, parent, before) {
  const node = parent.ownerDocument.createTextNode(String(text))
  parent.insertBefore(node, before)

  return {
    nodes: [node],
    firstNode: node,
    moveBefore(target) {
      parent.insertBefore(node, target)
    },
    dispose() {
      removeNode(node)
    }
  }
}

function nodeState(node, parent, before) {
  parent.insertBefore(node, before)

  return {
    nodes: [node],
    firstNode: node,
    moveBefore(target) {
      parent.insertBefore(node, target)
    },
    dispose() {
      removeNode(node)
    }
  }
}

function arrayState(values, parent, before, ownerScope) {
  const states = values.map(value => renderDynamicValue(value, parent, before, ownerScope))

  return {
    get firstNode() {
      return states.find(state => state.firstNode)?.firstNode ?? null
    },
    get nodes() {
      return states.flatMap(state => state.nodes)
    },
    moveBefore(target) {
      for (const state of states) {
        state.moveBefore(target)
      }
    },
    dispose() {
      for (const state of states) {
        state.dispose()
      }
    }
  }
}

function renderDynamicValue(value, parent, before, ownerScope) {
  const bindingScope = createScope(ownerScope)
  let childState = emptyState()

  const state = {
    get firstNode() {
      return childState.firstNode
    },
    get nodes() {
      return childState.nodes
    },
    moveBefore(target) {
      childState.moveBefore(target)
    },
    dispose() {
      childState.dispose()
      bindingScope.dispose()
    }
  }

  function replace(nextValue) {
    childState.dispose()
    childState = renderResolvedValue(nextValue, parent, before, bindingScope)
  }

  bindingScope.run(() => {
    if (isReactiveValue(value)) {
      effect(() => {
        const nextValue = value.value
        replace(nextValue)
        emitDebugEvent({ type: 'dom:update', kind: 'content', parent, source: value })
      })
    } else {
      replace(value)
    }
  })

  return state
}

function renderResolvedValue(value, parent, before, ownerScope) {
  if (value === null || value === undefined || value === false || value === true) {
    return emptyState()
  }

  if (isReactiveValue(value)) {
    return renderDynamicValue(value, parent, before, ownerScope)
  }

  if (isTemplateResult(value)) {
    return renderTemplate(value, parent, before, ownerScope)
  }

  if (isKeyedList(value)) {
    return renderKeyedList(value, parent, before, ownerScope)
  }

  if (isComponentResult(value)) {
    return renderComponent(value, parent, before, ownerScope)
  }

  if (typeof value === 'function') {
    return renderComponent(component(value), parent, before, ownerScope)
  }

  if (Array.isArray(value)) {
    return arrayState(value, parent, before, ownerScope)
  }

  if (value && typeof value.nodeType === 'number' && typeof value.nodeName === 'string') {
    return nodeState(value, parent, before)
  }

  return textState(value, parent, before)
}

function renderComponent(result, parent, before, ownerScope) {
  const componentScope = createScope(ownerScope)
  const parentInstance = getCurrentComponent()
  const instance = {
    scope: componentScope,
    mountCallbacks: [],
    parent: parentInstance,
    provides: new Map(),
    isErrorBoundary: Boolean(result[ERROR_BOUNDARY_RESULT]),
    result,
    stateScope: componentScope,
    stateSlots: [],
    stateCursor: 0,
    isRendering: false,
    isMounted: false
  }

  let output
  let outputState
  let renderScope = createScope(componentScope)

  try {
    renderScope.run(() => {
      output = runComponentRender(instance, result)
      outputState = runWithComponent(instance, () => renderResolvedValue(output, parent, before, componentScope))
    })

    const rootNode = outputState.nodes.find(node => node.nodeType === 1) ?? outputState.nodes[0] ?? null

    for (const callback of instance.mountCallbacks) {
      const cleanup = componentScope.run(() => callback(rootNode))
      if (typeof cleanup === 'function') {
        componentScope.add(cleanup)
      }
    }
    instance.mountCallbacks.length = 0
    instance.isMounted = true
  } catch (error) {
    componentScope.dispose()

    let boundary = parentInstance
    while (boundary) {
      if (boundary.isErrorBoundary && !boundary.handling) {
        boundary.handling = true
        try {
          const fallback = typeof boundary.result.fallback === 'function'
            ? boundary.result.fallback(error)
            : boundary.result.fallback
          return renderResolvedValue(fallback, parent, before, ownerScope)
        } finally {
          boundary.handling = false
        }
      }
      boundary = boundary.parent
    }

    if (error instanceof Error && result.render.name) {
      error.message = `[${result.render.name}] ${error.message}`
    }

    throw error
  }

  return {
    get firstNode() {
      return outputState.firstNode
    },
    get nodes() {
      return outputState.nodes
    },
    moveBefore(target) {
      outputState.moveBefore(target)
    },
    canUpdate(nextResult) {
      return result.update?.(nextResult) === true
    },
    update(nextResult) {
      if (!this.canUpdate(nextResult)) {
        return false
      }

      outputState.dispose()
      renderScope.dispose()
      renderScope = createScope(componentScope)
      result = nextResult
      instance.result = nextResult
      instance.mountCallbacks.length = 0

      renderScope.run(() => {
        output = runComponentRender(instance, result)
        outputState = runWithComponent(instance, () => renderResolvedValue(output, parent, before, componentScope))
      })

      instance.mountCallbacks.length = 0
      return true
    },
    dispose() {
      outputState.dispose()
      componentScope.dispose()
    }
  }
}

function runComponentRender(instance, result) {
  const expectedStateSlots = instance.stateSlots.length
  instance.stateCursor = 0
  instance.isRendering = true

  try {
    const output = runWithComponent(instance, () => runWithRenderState(instance, () => result.render(result.props)))

    if (instance.isMounted && instance.stateCursor !== expectedStateSlots) {
      throw new Error(`Component state order changed: expected ${expectedStateSlots} slots, received ${instance.stateCursor}`)
    }

    return output
  } finally {
    instance.isRendering = false
  }
}

function resolveAttributeValue(parts, values) {
  const resolved = getAttributeMarkerParts(parts, values).map(readValue)

  if (resolved.length === 1 && typeof parts[0] !== 'string') {
    return resolved[0]
  }

  return resolved.join('')
}

function resolveAttributeSource(parts, values) {
  const resolved = getAttributeMarkerParts(parts, values)

  if (resolved.length === 1 && typeof parts[0] !== 'string') {
    return resolved[0]
  }

  return resolveAttributeValue(parts, values)
}

function setStyleValue(element, value, appliedProperties) {
  if (value === null || value === undefined || value === false) {
    element.removeAttribute('style')
    return new Set()
  }

  if (typeof value === 'string') {
    element.style.cssText = value
    return new Set()
  }

  if (typeof value !== 'object') {
    element.style.cssText = String(value)
    return new Set()
  }

  const nextProperties = new Set(Object.keys(value))

  for (const property of appliedProperties) {
    if (!nextProperties.has(property)) {
      element.style.removeProperty(property)
    }
  }

  for (const [property, propertyValue] of Object.entries(value)) {
    if (propertyValue === null || propertyValue === undefined || propertyValue === false) {
      element.style.removeProperty(property)
    } else {
      element.style.setProperty(property, propertyValue)
    }
  }

  return nextProperties
}

function bindEvent(element, eventName, parts, values, scope) {
  const [type, ...modifiers] = eventName.split('.')
  const eventOptions = {
    once: modifiers.includes('once'),
    capture: modifiers.includes('capture'),
    passive: modifiers.includes('passive')
  }
  let currentListener

  effect(() => {
    const nextHandler = resolveAttributeValue(parts, values)

    if (currentListener) {
      element.removeEventListener(type, currentListener, eventOptions)
    }

    if (typeof nextHandler === 'function') {
      currentListener = event => {
        if (modifiers.includes('prevent')) {
          event.preventDefault()
        }
        if (modifiers.includes('stop')) {
          event.stopPropagation()
        }
        nextHandler(event)
      }
      element.addEventListener(type, currentListener, eventOptions)
    } else {
      currentListener = undefined
    }
  }, { flush: 'sync' })

  scope.add(() => {
    if (currentListener) {
      element.removeEventListener(type, currentListener, eventOptions)
    }
  })
}

function bindAttribute(element, binding, values, scope) {
  const { name, parts } = binding
  let appliedStyleProperties = new Set()

  if (name === 'use:style') {
    applyStyle(element, resolveAttributeSource(parts, values), scope)
    element.removeAttribute(name)
    return
  }

  if (name === 'use:vars') {
    applyCssVariables(element, resolveAttributeSource(parts, values), scope)
    element.removeAttribute(name)
    return
  }

  if (name === 'use:bind') {
    bindInput(element, resolveAttributeSource(parts, values), scope)
    element.removeAttribute(name)
    return
  }

  if (name.startsWith(EVENT_PREFIX)) {
    const eventName = name.slice(EVENT_PREFIX.length)
    if (!eventName) {
      throw new Error('Empty event name in Matrix template')
    }
    bindEvent(element, eventName, parts, values, scope)
    return
  }

  effect(() => {
    const value = resolveAttributeValue(parts, values)

    if (name.startsWith(PROPERTY_PREFIX)) {
      const property = name.slice(PROPERTY_PREFIX.length)
      if (!property) {
      throw new Error('Empty property name in Matrix template')
      }
      assertSafeUrl(property, String(value ?? ''))
      element[property] = value
      return
    }

    if (name.startsWith(BOOLEAN_PREFIX)) {
      const attributeName = name.slice(BOOLEAN_PREFIX.length)
      if (!attributeName) {
      throw new Error('Empty boolean attribute name in Matrix template')
      }
      element.toggleAttribute(attributeName, Boolean(value))
      return
    }

    if (name === 'style') {
      appliedStyleProperties = setStyleValue(element, value, appliedStyleProperties)
      return
    }

    if (value === null || value === undefined || value === false) {
      element.removeAttribute(name)
    } else {
      assertSafeUrl(name, String(value))
      element.setAttribute(name, String(value))
    }

    emitDebugEvent({ type: 'dom:update', kind: 'attribute', element, name })
  })

  scope.add(() => {
    if (name.startsWith(PROPERTY_PREFIX)) {
      element[name.slice(PROPERTY_PREFIX.length)] = undefined
    } else {
      element.removeAttribute(name)
    }
  })
}

function renderTemplate(result, parent, before, ownerScope) {
  const document = parent.ownerDocument
  const compiled = getCompiledTemplate(result.strings, document)
  const templateScope = createScope(ownerScope)
  const start = document.createComment('matrix:start')
  const end = document.createComment('matrix:end')

  parent.insertBefore(start, before)
  parent.insertBefore(end, before)

  const fragment = compiled.template.content.cloneNode(true)
  const textBindings = []
  const walker = document.createTreeWalker(fragment, 128)
  let node = walker.nextNode()

  while (node) {
    const match = /^matrix:text:(\d+)$/.exec(node.data)
    if (match) {
      textBindings.push({ node, index: Number(match[1]) })
    }
    node = walker.nextNode()
  }

  const attributeBindings = []
  const descendants = fragment.querySelectorAll('*')
  for (const element of descendants) {
    for (const attribute of [...element.attributes]) {
      const matches = [...attribute.value.matchAll(/__MATRIX_ATTR_(\d+)__/g)]
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

      attributeBindings.push({ element, name: attribute.name, parts })
    }
  }

  parent.insertBefore(fragment, end)

  try {
    templateScope.run(() => {
      for (const binding of textBindings) {
        renderDynamicValue(result.values[binding.index], binding.node.parentNode, binding.node, templateScope)
      }

      for (const binding of attributeBindings) {
        bindAttribute(binding.element, binding, result.values, templateScope)
      }
    })
  } catch (error) {
    templateScope.dispose()
    removeRange(start, end)
    throw error
  }

  return {
    firstNode: start,
    get nodes() {
      const nodes = []
      let current = start.nextSibling
      while (current && current !== end) {
        nodes.push(current)
        current = current.nextSibling
      }
      return nodes
    },
    moveBefore(target) {
      let current = start
      while (current) {
        const next = current.nextSibling
        parent.insertBefore(current, target)
        if (current === end) {
          break
        }
        current = next
      }
    },
    dispose() {
      templateScope.dispose()
      removeRange(start, end)
    }
  }
}

function renderKeyedList(result, parent, before, ownerScope) {
  const listScope = createScope(ownerScope)
  const start = parent.ownerDocument.createComment('matrix:keyed:start')
  const end = parent.ownerDocument.createComment('matrix:keyed:end')
  const statesByKey = new Map()
  let orderedStates = []

  parent.insertBefore(start, before)
  parent.insertBefore(end, before)

  function moveRange(target) {
    let current = start
    while (current) {
      const next = current.nextSibling
      parent.insertBefore(current, target)
      if (current === end) {
        break
      }
      current = next
    }
  }

  function reconcile(nextItems) {
    const items = Array.isArray(nextItems) ? nextItems : []
    const previous = new Map(statesByKey)
    const nextStates = []
    const nextByKey = new Map()

    for (const item of items) {
      const key = result.getKey(item)
      if (nextByKey.has(key)) {
        throw new Error(`Duplicate list key: ${String(key)}`)
      }

      const previousState = previous.get(key)
      let state = previousState

      if (state?.canUpdate && !state.canUpdate(item)) {
        state.dispose()
        state = undefined
      }

      if (state?.update) {
        state.update(item)
      } else if (!state) {
        state = renderResolvedValue(item, parent, end, listScope)
      }
      nextByKey.set(key, state)
      nextStates.push(state)
    }

    for (const [key, state] of previous) {
      if (!nextByKey.has(key)) {
        state.dispose()
      }
    }

    let cursor = end
    for (let index = nextStates.length - 1; index >= 0; index -= 1) {
      const state = nextStates[index]
      state.moveBefore(cursor)
      cursor = state.firstNode ?? cursor
    }

    statesByKey.clear()
    for (const [key, state] of nextByKey) {
      statesByKey.set(key, state)
    }
    orderedStates = nextStates
  }

  listScope.run(() => {
    if (isReactiveValue(result.items)) {
      effect(() => reconcile(result.items.value))
    } else {
      reconcile(result.items)
    }
  })

  return {
    firstNode: start,
    get nodes() {
      const nodes = []
      let current = start.nextSibling
      while (current && current !== end) {
        nodes.push(current)
        current = current.nextSibling
      }
      return nodes
    },
    moveBefore(target) {
      moveRange(target)
    },
    dispose() {
      listScope.dispose()

      for (const state of orderedStates) {
        state.dispose()
      }

      let current = start
      while (current) {
        const next = current.nextSibling
        removeNode(current)
        if (current === end) {
          break
        }
        current = next
      }
    }
  }
}

export function mount(view, container, props = {}) {
  if (!container || typeof container.insertBefore !== 'function') {
    throw new TypeError('mount() expects a DOM container')
  }

  const rootScope = createScope()
  let rendered
  let unmounted = false
  const rootView = typeof view === 'function' ? component(view, props) : view

  try {
    rootScope.run(() => {
      rendered = renderResolvedValue(rootView, container, null, rootScope)
    })
  } catch (error) {
    rootScope.dispose()
    throw error
  }

  return {
    get nodes() {
      return rendered.nodes
    },
    unmount() {
      if (unmounted) {
        return
      }

      unmounted = true
      rendered.dispose()
      rootScope.dispose()
    }
  }
}

export function render(value, container, before = null) {
  const ownerScope = getCurrentScope() ?? createScope()
  return renderResolvedValue(value, container, before, ownerScope)
}

export { html }
