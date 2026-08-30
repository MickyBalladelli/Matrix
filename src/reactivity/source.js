import { track } from './context.js'

let nextSourceId = 1
const reactiveSources = new Set()

export function createSource(kind, name = '') {
  const source = {
    id: `source-${nextSourceId++}`,
    kind,
    name,
    subscribers: new Set(),
    listeners: new Set()
  }

  reactiveSources.add(source)
  return source
}

export function disposeSource(source) {
  reactiveSources.delete(source)
}

export function getReactiveSources() {
  return [...reactiveSources]
}

export function trackSource(source) {
  track(source)
}

export function notifySource(source, value, previousValue) {
  let firstError

  for (const subscriber of [...source.subscribers]) {
    try {
      subscriber._notify()
    } catch (error) {
      firstError ??= error
    }
  }

  for (const listener of [...source.listeners]) {
    try {
      listener(value, previousValue)
    } catch (error) {
      firstError ??= error
    }
  }

  if (firstError) {
    throw firstError
  }
}

export function subscribeSource(source, listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('signal.subscribe() expects a function')
  }

  source.listeners.add(listener)

  return () => {
    source.listeners.delete(listener)
  }
}
