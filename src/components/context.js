let currentComponent = null
const componentStack = []

export const ERROR_BOUNDARY_RESULT = Symbol('matrix.error.boundary')

export function runWithComponent(instance, fn) {
  componentStack.push(currentComponent)
  currentComponent = instance

  try {
    return fn()
  } finally {
    currentComponent = componentStack.pop()
  }
}

export function getCurrentComponent() {
  return currentComponent
}

export function provide(key, value) {
  if (!currentComponent) {
    throw new Error('provide() must be called inside a component')
  }

  currentComponent.provides.set(key, value)
  return value
}

export function inject(key, fallback) {
  let instance = currentComponent

  while (instance) {
    if (instance.provides.has(key)) {
      return instance.provides.get(key)
    }
    instance = instance.parent
  }

  return fallback
}
