import { computed, html, mount, signal } from '../../../src/index.js'

function assertWritableSignal(source, name) {
  if (!source || source.kind !== 'signal' || typeof source.subscribe !== 'function' || typeof source.peek !== 'function' || typeof source.set !== 'function') {
    throw new TypeError(`${name}() expects a writable signal`)
  }
}

export function createDebouncedSignal(source, delay = 250) {
  assertWritableSignal(source, 'createDebouncedSignal')
  const output = signal(source.peek())
  let timer
  const stop = source.subscribe(value => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      output.value = value
    }, Math.max(0, Number(delay) || 0))
  })
  return {
    source: output,
    dispose() {
      clearTimeout(timer)
      stop()
      output.dispose()
    }
  }
}

export function createThrottledSignal(source, interval = 250) {
  assertWritableSignal(source, 'createThrottledSignal')
  const output = signal(source.peek())
  const duration = Math.max(0, Number(interval) || 0)
  let lastEmit = -Infinity
  let pending
  let hasPending = false
  let timer

  const flush = () => {
    timer = undefined
    if (!hasPending) return
    lastEmit = Date.now()
    output.value = pending
    pending = undefined
    hasPending = false
  }

  const stop = source.subscribe(value => {
    const now = Date.now()
    const remaining = duration - (now - lastEmit)
    if (remaining <= 0) {
      lastEmit = now
      output.value = value
      return
    }
    pending = value
    hasPending = true
    if (!timer) timer = setTimeout(flush, remaining)
  })

  return {
    source: output,
    dispose() {
      clearTimeout(timer)
      stop()
      pending = undefined
      hasPending = false
      output.dispose()
    }
  }
}

export function mountDebounceThrottleApp(container, options = {}) {
  const raw = signal(options.initialValue ?? '')
  const debounced = createDebouncedSignal(raw, options.debounce ?? 40)
  const throttled = createThrottledSignal(raw, options.throttle ?? 40)
  const debouncedValue = computed(() => debounced.source.value || '—')
  const throttledValue = computed(() => throttled.source.value || '—')

  const app = mount(() => html`
    <main class="integration-example">
      <p class="eyebrow">Integration pattern</p>
      <h1>Debounce and throttle signals</h1>
      <p>Bind raw input immediately, then feed expensive search or telemetry with delayed signals.</p>
      <label>Raw input <input data-rate-raw placeholder="Type quickly" use:bind=${raw}></label>
      <ul data-rate-values class="item-list">
        <li>Raw: <strong data-rate-raw-value>${raw}</strong></li>
        <li>Debounced: <strong data-rate-debounced>${debouncedValue}</strong></li>
        <li>Throttled: <strong data-rate-throttled>${throttledValue}</strong></li>
      </ul>
    </main>
  `, container)

  return {
    app,
    raw,
    debounced: debounced.source,
    throttled: throttled.source,
    ready: Promise.resolve(),
    dispose() {
      app.unmount()
      debouncedValue.dispose()
      throttledValue.dispose()
      debounced.dispose()
      throttled.dispose()
      raw.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountDebounceThrottleApp(document.querySelector('#app'))
}
