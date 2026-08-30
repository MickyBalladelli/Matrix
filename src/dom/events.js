const delegationCache = new WeakMap()

function readOptions(options) {
  if (typeof options === 'boolean') {
    return { capture: options, passive: false, signal: undefined }
  }

  return {
    capture: Boolean(options?.capture),
    passive: Boolean(options?.passive),
    signal: options?.signal
  }
}

function getDelegationRecord(element, eventName, options) {
  let records = delegationCache.get(element)
  if (!records) {
    records = new Map()
    delegationCache.set(element, records)
  }

  const key = `${eventName}:${options.capture}:${options.passive}`
  let record = records.get(key)
  if (record) {
    return record
  }

  record = {
    eventName,
    options: {
      capture: options.capture,
      passive: options.passive
    },
    entries: new Set(),
    listener: null
  }
  record.listener = event => dispatchDelegatedEvent(element, record, event)
  records.set(key, record)
  element.addEventListener(eventName, record.listener, record.options)
  return record
}

function findDelegatedTarget(element, selector, path) {
  for (const node of path) {
    if (node?.nodeType === 1 && node.matches(selector) && element.contains(node)) {
      return node
    }

    if (node === element) {
      return node.matches?.(selector) ? node : null
    }
  }

  return null
}

function dispatchDelegatedEvent(element, record, event) {
  const path = typeof event.composedPath === 'function'
    ? event.composedPath()
    : [event.target]

  for (const entry of [...record.entries]) {
    const target = findDelegatedTarget(element, entry.selector, path)
    if (!target) {
      continue
    }

    if (entry.once) {
      removeDelegationEntry(element, record, entry)
    }

    entry.handler.call(target, event)
  }
}

function removeDelegationEntry(element, record, entry) {
  if (!record.entries.delete(entry)) {
    return
  }

  entry.signal?.removeEventListener('abort', entry.abort)

  if (record.entries.size === 0) {
    const records = delegationCache.get(element)
    const key = `${record.eventName}:${record.options.capture}:${record.options.passive}`
    element.removeEventListener(record.eventName, record.listener, record.options)
    records?.delete(key)
    if (records?.size === 0) {
      delegationCache.delete(element)
    }
  }
}

export function delegate(element, eventName, selector, handler, options) {
  if (!element || typeof element.addEventListener !== 'function') {
    throw new TypeError('delegate() expects a DOM element')
  }
  if (typeof selector !== 'string' || typeof handler !== 'function') {
    throw new TypeError('delegate() expects a selector and handler function')
  }

  const normalizedOptions = readOptions(options)
  if (normalizedOptions.signal?.aborted) {
    return () => {}
  }

  const record = getDelegationRecord(element, eventName, normalizedOptions)
  const entry = {
    selector,
    handler,
    once: Boolean(options?.once),
    signal: normalizedOptions.signal,
    abort: null
  }
  entry.abort = () => removeDelegationEntry(element, record, entry)
  record.entries.add(entry)
  normalizedOptions.signal?.addEventListener('abort', entry.abort, { once: true })

  return entry.abort
}
