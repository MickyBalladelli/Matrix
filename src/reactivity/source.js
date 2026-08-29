import { track } from './context.js'

export function createSource(kind) {
  return {
    kind,
    subscribers: new Set(),
    listeners: new Set()
  }
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
    throw new TypeError('signal.subscribe() attend une fonction')
  }

  source.listeners.add(listener)

  return () => {
    source.listeners.delete(listener)
  }
}
