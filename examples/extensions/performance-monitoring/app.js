import { computed, html, mount, signal, usePlugin } from '../../../src/index.js'

export function createPerformanceMonitoringPlugin(options = {}) {
  const now = options.now ?? (() => globalThis.performance?.now?.() ?? Date.now())
  const ignore = options.ignore ?? (() => false)
  const metrics = signal({
    rendererUpdates: 0,
    scheduledJobs: 0,
    flushes: 0,
    lastFlushMs: 0,
    maxFlushMs: 0
  }, { name: 'performance-metrics' })
  let flushStartedAt

  function update(change) {
    metrics.update(current => ({ ...current, ...change }))
  }

  return {
    metrics,
    snapshot: () => ({ ...metrics.peek() }),
    install(api) {
      const stopRenderer = api.on('renderer', event => {
        if (event.type === 'dom:update' && !ignore(event)) {
          update({ rendererUpdates: metrics.peek().rendererUpdates + 1 })
        }
      })
      const stopScheduler = api.on('scheduler', event => {
        if (event.type === 'job:scheduled') {
          update({ scheduledJobs: metrics.peek().scheduledJobs + 1 })
        }
        if (event.type === 'flush:start') {
          flushStartedAt = now()
        }
        if (event.type === 'flush:end') {
          const duration = flushStartedAt === undefined ? 0 : Math.max(0, now() - flushStartedAt)
          const current = metrics.peek()
          update({
            flushes: current.flushes + 1,
            lastFlushMs: duration,
            maxFlushMs: Math.max(current.maxFlushMs, duration)
          })
          flushStartedAt = undefined
        }
      })
      return () => {
        stopRenderer()
        stopScheduler()
      }
    },
    dispose() {
      metrics.dispose()
    }
  }
}

export function mountPerformanceMonitoringApp(container, options = {}) {
  const monitor = options.monitor ?? createPerformanceMonitoringPlugin({
    now: options.now,
    ignore: event => {
      const target = event.element ?? event.parent
      const metricsRoot = container.querySelector('[data-performance-metrics]')
      return Boolean(target && metricsRoot?.contains(target))
    }
  })
  const stopMonitor = usePlugin(monitor)
  const count = signal(0)
  const doubled = computed(() => count.value * 2)

  const app = mount(() => html`
    <main class="extension-example">
      <p class="eyebrow">Extension pattern</p>
      <h1>Performance monitoring plugin</h1>
      <p>Keep instrumentation cheap: count renderer and scheduler events, then inspect a snapshot.</p>
      <button data-performance-update @click=${() => count.update(value => value + 1)}>Count ${count}</button>
      <p class="muted">Double: ${doubled}</p>
      <ul data-performance-metrics class="metric-grid">
        <li class="metric"><span>Renderer updates</span><strong>${computed(() => monitor.metrics.value.rendererUpdates)}</strong></li>
        <li class="metric"><span>Scheduled jobs</span><strong>${computed(() => monitor.metrics.value.scheduledJobs)}</strong></li>
        <li class="metric"><span>Flushes</span><strong>${computed(() => monitor.metrics.value.flushes)}</strong></li>
        <li class="metric"><span>Last flush</span><strong>${computed(() => `${monitor.metrics.value.lastFlushMs.toFixed(2)} ms`)}</strong></li>
      </ul>
    </main>
  `, container)

  return {
    app,
    monitor,
    count,
    doubled,
    ready: Promise.resolve(),
    dispose() {
      app.unmount()
      stopMonitor()
      doubled.dispose()
      count.dispose()
      if (!options.monitor) monitor.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountPerformanceMonitoringApp(document.querySelector('#app'))
}
