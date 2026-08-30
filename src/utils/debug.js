import { effect, getActiveEffects } from '../reactivity/effect.js'
import { getReactiveSources } from '../reactivity/source.js'
import { getRuntimeConfig } from '../config.js'
import { emitPlugin, usePlugin } from '../plugins.js'
import { getActiveRouters } from './router.js'

let hook
let nextComponentId = 1
const componentInstances = new Map()
const TIMELINE_POINTS = ['renderer', 'scheduler', 'logger', 'style']
const NON_SERIALIZABLE_EVENT_FIELDS = new Set(['source', 'element', 'parent', 'definition'])

export function setDevtoolsHook(nextHook) {
  hook = typeof nextHook === 'function' ? nextHook : undefined
}

export function emitDebugEvent(event) {
  if (event.type?.startsWith('dom:')) {
    emitPlugin('renderer', event)
  }
  emitPlugin('logger', event)
  hook?.(event)
}

export function createLogger(options = {}) {
  const enabled = options.enabled ?? false
  const logger = options.logger ?? console

  return {
    watch(source, name = 'signal') {
      if (!enabled) {
        return () => {}
      }

      return watchDebug(source, name, logger, options)
    },
    inspect
  }
}

export function watchDebug(source, name = 'signal', logger = console, options = {}) {
  if (!source || typeof source.get !== 'function') {
    throw new TypeError('watchDebug() expects a signal or computed value')
  }

  const limit = options.warnAfter ?? 1000
  let startedAt = Date.now()
  let updateCount = 0

  return effect(() => {
    const value = source.value
    const safeValue = options.redact ? '[redacted]' : value
    const event = { type: 'signal:update', name, value: safeValue, source }
    logger.debug?.(`[Matrix] ${name}`, safeValue)
    emitDebugEvent(event)

    const now = Date.now()
    if (now - startedAt > 1000) {
      startedAt = now
      updateCount = 0
    }

    updateCount += 1
    if (updateCount === limit) {
      logger.warn?.(`[Matrix] ${name} updates very often`)
      emitDebugEvent({ type: 'signal:hot', name, source, count: updateCount })
    }
  })
}

export function inspect(source) {
  return {
    id: source?._source?.id,
    kind: source?.kind,
    name: source?.name,
    value: source?.peek?.(),
    subscribers: source?._source?.subscribers?.size ?? 0,
    listeners: source?._source?.listeners?.size ?? 0,
    effectSubscribers: [...(source?._source?.subscribers ?? [])]
      .filter(subscriber => subscriber.kind === 'effect')
      .map(subscriber => subscriber.name)
  }
}

export function inspectEffects() {
  return getActiveEffects().map(effectObserver => ({
    id: effectObserver.id,
    name: effectObserver.name,
    dependencies: effectObserver.dependencies.size,
    dependencyIds: [...effectObserver.dependencies].map(source => source.id),
    dependencyNames: [...effectObserver.dependencies].map(source => source.name || source.kind)
  }))
}

export function registerComponentDebug(instance) {
  const id = `component-${nextComponentId++}`
  instance.devtoolsId = id
  componentInstances.set(id, instance)
  return id
}

export function unregisterComponentDebug(instance) {
  if (instance?.devtoolsId) {
    componentInstances.delete(instance.devtoolsId)
  }
}

export function inspectComponents(options = {}) {
  const nodes = [...componentInstances.values()].map(instance => {
    const result = instance.result
    return {
      id: instance.devtoolsId,
      name: result?.render?.name || 'anonymous',
      parentId: instance.parent?.devtoolsId ?? null,
      mounted: instance.isMounted,
      errorBoundary: instance.isErrorBoundary,
      props: serializeValue(result?.props ?? {}, options),
      sourceLocation: result?._matrixSourceLocation || '',
      children: []
    }
  })
  const byId = new Map(nodes.map(node => [node.id, node]))
  const roots = []

  for (const node of nodes) {
    const parent = byId.get(node.parentId)
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export function inspectSources(options = {}) {
  return getReactiveSources().map(source => ({
    id: source.id,
    kind: source.kind,
    name: source.name,
    value: readSourceValue(source, options),
    subscribers: [...source.subscribers].map(subscriber => ({
      id: subscriber.id,
      kind: subscriber.kind,
      name: subscriber.name || subscriber.kind
    })),
    listeners: source.listeners.size,
    effectSubscribers: [...source.subscribers]
      .filter(subscriber => subscriber.kind === 'effect')
      .map(subscriber => ({ id: subscriber.id, name: subscriber.name }))
  }))
}

export function inspectRouters(options = {}) {
  return getActiveRouters().map(router => ({
    id: router._debugId,
    started: router._debugStarted(),
    path: router.path.peek(),
    search: router.search.peek(),
    hash: router.hash.peek(),
    current: serializeValue(router.current.peek(), options),
    routes: router.routes.map(route => ({
      path: route.path,
      hasView: typeof route.view === 'function',
      redirect: typeof route.redirect === 'function' ? '[function]' : route.redirect ?? null
    }))
  }))
}

export function createPerformanceTimeline(options = {}) {
  const maxEntries = Number.isInteger(options.maxEntries) && options.maxEntries > 0
    ? options.maxEntries
    : 2000
  const redact = options.redact ?? true
  const entries = []
  let recording = false
  let stopPlugin

  function record(point, event) {
    const data = {}
    for (const [key, value] of Object.entries(event ?? {})) {
      if (NON_SERIALIZABLE_EVENT_FIELDS.has(key)) {
        continue
      }
      data[key] = key === 'value' || key === 'error'
        ? serializeValue(value, { redact })
        : serializeValue(value, { redact: false })
    }

    entries.push({
      at: globalThis.performance?.now?.() ?? Date.now(),
      point,
      type: event?.type ?? 'event',
      data
    })
    if (entries.length > maxEntries) {
      entries.splice(0, entries.length - maxEntries)
    }
  }

  function start() {
    if (recording) {
      return
    }

    recording = true
    stopPlugin = usePlugin({
      install(api) {
        const unregister = TIMELINE_POINTS.map(point => api.on(point, event => record(point, event)))
        return () => unregister.forEach(remove => remove())
      }
    })
  }

  function stop() {
    if (!recording) {
      return
    }

    recording = false
    stopPlugin?.()
    stopPlugin = undefined
  }

  return {
    start,
    stop,
    clear() {
      entries.length = 0
    },
    snapshot() {
      return entries.map(entry => ({ ...entry, data: { ...entry.data } }))
    },
    get isRecording() {
      return recording
    },
    dispose: stop
  }
}

export function createDevtools(options = {}) {
  const globalName = options.globalName ?? '__MATRIX_DEVTOOLS__'
  const inspectOptions = {
    ...options,
    redact: options.redact ?? true
  }
  const timeline = createPerformanceTimeline(options.timeline ?? { redact: inspectOptions.redact })
  let disposed = false

  const api = {
    version: 1,
    snapshot() {
      return {
        version: 1,
        capturedAt: new Date().toISOString(),
        config: { ...getRuntimeConfig() },
        components: inspectComponents(inspectOptions),
        sources: inspectSources(inspectOptions),
        effects: inspectEffects(),
        routers: inspectRouters(inspectOptions),
        timeline: timeline.snapshot()
      }
    },
    components: () => inspectComponents(inspectOptions),
    sources: () => inspectSources(inspectOptions),
    effects: inspectEffects,
    routers: () => inspectRouters(inspectOptions),
    timeline,
    dispose() {
      if (disposed) {
        return
      }

      disposed = true
      timeline.dispose()
      if (globalName && globalThis[globalName] === api) {
        delete globalThis[globalName]
      }
    }
  }

  if (globalName) {
    globalThis[globalName] = api
  }

  if (options.recordTimeline) {
    timeline.start()
  }

  return api
}

function readSourceValue(source, options) {
  try {
    return serializeValue(source.read(), options)
  } catch (error) {
    return `[unavailable: ${error.message}]`
  }
}

function serializeValue(value, options = {}, seen = new WeakSet()) {
  if (options.redact) {
    return '[redacted]'
  }

  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'bigint') {
    return `${value}n`
  }

  if (typeof value === 'function') {
    return `[Function: ${value.name || 'anonymous'}]`
  }

  if (typeof value !== 'object') {
    return String(value)
  }

  if (value.nodeType && value.nodeName) {
    return `[DOM ${value.nodeName}]`
  }

  if (seen.has(value)) {
    return '[Circular]'
  }
  seen.add(value)

  if (Array.isArray(value)) {
    return value.slice(0, 20).map(item => serializeValue(item, options, seen))
  }

  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }

  const output = {}
  for (const key of Object.keys(value).slice(0, 20)) {
    try {
      output[key] = serializeValue(value[key], options, seen)
    } catch {
      output[key] = '[unavailable]'
    }
  }
  return output
}
