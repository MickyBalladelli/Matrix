let activeObserver = null
let currentScope = null
let currentRenderState = null

const observerStack = []
const scopeStack = []
const renderStateStack = []

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
  if (!activeObserver || activeObserver === source) {
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
