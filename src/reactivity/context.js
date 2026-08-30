import { isDevelopment } from '../config.js'
import { warnDevelopment } from '../utils/development.js'
import { captureCallsite } from '../utils/diagnostics.js'

let activeObserver = null
let currentScope = null
let currentRenderState = null

const observerStack = []
const scopeStack = []
const renderStateStack = []
const warnedUntrackedReads = new WeakSet()

export function getActiveObserver() {
  return activeObserver
}

export function runWithObserver(observer, fn) {
  observerStack.push(activeObserver)
  activeObserver = observer

  try {
    return fn()
  } finally {
    activeObserver = observerStack.pop()
  }
}

export function track(source) {
  if (!activeObserver) {
    if (isDevelopment() && !currentRenderState && !warnedUntrackedReads.has(source)) {
      warnedUntrackedReads.add(source)
      warnDevelopment(
        `${source.kind} "${source.name || 'anonymous'}" was read outside an Effect or template. Use .peek() for an intentional non-reactive read.`,
        { type: 'reactivity:untracked-read', kind: source.kind, name: source.name, source, stack: captureCallsite() }
      )
    }
    return
  }

  if (activeObserver === source) {
    return
  }

  source.subscribers.add(activeObserver)
  activeObserver.dependencies.add(source)
}

export function getCurrentScope() {
  return currentScope
}

export function runWithScope(scope, fn) {
  scopeStack.push(currentScope)
  currentScope = scope

  try {
    return fn()
  } finally {
    currentScope = scopeStack.pop()
  }
}

export function getCurrentRenderState() {
  return currentRenderState
}

export function runWithRenderState(state, fn) {
  renderStateStack.push(currentRenderState)
  currentRenderState = state

  try {
    return fn()
  } finally {
    currentRenderState = renderStateStack.pop()
  }
}
