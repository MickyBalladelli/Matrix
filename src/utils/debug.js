import { effect, getActiveEffects } from '../reactivity/effect.js'
import { emitPlugin } from '../plugins.js'

let hook

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
    throw new TypeError('watchDebug() attend un signal ou computed')
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
      logger.warn?.(`[Matrix] ${name} se met à jour très souvent`)
      emitDebugEvent({ type: 'signal:hot', name, source, count: updateCount })
    }
  })
}

export function inspect(source) {
  return {
    kind: source?.kind,
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
    name: effectObserver.name,
    dependencies: effectObserver.dependencies.size
  }))
}
