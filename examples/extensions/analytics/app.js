import { computed, html, mount, signal, usePlugin } from '../../../src/index.js'

function safeMetadata(metadata, allowedKeys) {
  return Object.fromEntries(Object.entries(metadata ?? {})
    .filter(([key]) => !allowedKeys || allowedKeys.includes(key))
    .filter(([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value))
    .slice(0, 12))
}

export function createAnalyticsPlugin(options = {}) {
  const allowedKeys = options.allowedKeys
  const send = options.send ?? (event => globalThis.console?.debug?.('[Matrix analytics]', event))
  const events = signal([], { name: 'analytics-events' })

  function track(name, metadata = {}) {
    const event = {
      name: String(name),
      metadata: safeMetadata(metadata, allowedKeys),
      at: Date.now()
    }
    events.update(items => [...items.slice(-19), event])
    try {
      send(event)
    } catch {
      // Telemetry must never break the application update path.
    }
    return event
  }

  return {
    events,
    track,
    install(api) {
      const stopLogger = api.on('logger', event => {
        if (event.type === 'component:mount') {
          track('matrix_component_mount', { component: event.name })
        }
        if (event.type === 'component:error') {
          track('matrix_component_error', { component: event.name })
        }
      })
      return stopLogger
    },
    dispose() {
      events.dispose()
    }
  }
}

export function mountAnalyticsApp(container, options = {}) {
  const analytics = options.analytics ?? createAnalyticsPlugin({
    allowedKeys: ['button'],
    send: options.send
  })
  const stopAnalytics = usePlugin(analytics)
  const clicks = signal(0)
  const eventRows = computed(() => analytics.events.value.map(event => html`
    <li><code>${event.name}</code> <span class="muted">${JSON.stringify(event.metadata)}</span></li>
  `))

  function trackDemoClick() {
    clicks.update(value => value + 1)
    analytics.track('demo_button_click', { button: 'increment', secret: 'not-collected' })
  }

  const app = mount(() => html`
    <main class="extension-example">
      <p class="eyebrow">Extension pattern</p>
      <h1>Analytics plugin</h1>
      <p>Track explicit product events and safe Matrix lifecycle events. Metadata is allowlisted before transport.</p>
      <button data-analytics-click @click=${trackDemoClick}>Clicked ${clicks} time(s)</button>
      <h2>Local event buffer</h2>
      <ul data-analytics-events class="event-list">${eventRows}</ul>
    </main>
  `, container)

  return {
    app,
    analytics,
    clicks,
    ready: Promise.resolve(),
    dispose() {
      app.unmount()
      stopAnalytics()
      eventRows.dispose()
      clicks.dispose()
      if (!options.analytics) analytics.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountAnalyticsApp(document.querySelector('#app'))
}
