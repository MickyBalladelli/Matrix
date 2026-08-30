import {
  component,
  computed,
  createPerformanceTimeline,
  css,
  html,
  keyed,
  mount,
  resource,
  signal
} from '../../src/index.js'

const DEFAULT_DASHBOARD = {
  metrics: [
    { id: 'revenue', label: 'Revenue', value: '$24,680', change: '+12.4%', tone: 'positive' },
    { id: 'users', label: 'Active users', value: '8,421', change: '+8.1%', tone: 'positive' },
    { id: 'latency', label: 'API latency', value: '142 ms', change: '-18.2%', tone: 'positive' },
    { id: 'errors', label: 'Error rate', value: '0.18%', change: '+0.02%', tone: 'warning' }
  ],
  trend: [38, 52, 48, 64, 58, 76, 70],
  activity: [
    { id: 'a-1', actor: 'Ada', action: 'deployed checkout', status: 'success' },
    { id: 'a-2', actor: 'Boudica', action: 'updated billing settings', status: 'success' },
    { id: 'a-3', actor: 'Cato', action: 'reported an API timeout', status: 'error' },
    { id: 'a-4', actor: 'Dido', action: 'invited a teammate', status: 'success' },
    { id: 'a-5', actor: 'Enki', action: 'rotated a service key', status: 'success' }
  ]
}

const appStyle = css`
  .dashboard { max-width: 76rem; margin: 2rem auto; padding: 1rem; font-family: system-ui, sans-serif; color: #172033; }
  .dashboard-header, .dashboard-controls { display: flex; gap: 1rem; justify-content: space-between; align-items: center; }
  .dashboard-controls { margin: 1rem 0; }
  .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 1rem; padding: 0; list-style: none; }
  .metric, .chart, .activity { padding: 1rem; border: 1px solid #dbe3ef; border-radius: .75rem; background: white; }
  .metric-label { color: #64748b; }
  .metric-value { display: block; margin: .4rem 0; font-size: 1.7rem; }
  .positive { color: #047857; }
  .warning, .error { color: #b91c1c; }
  .dashboard-main { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .bars { display: flex; align-items: end; gap: .5rem; min-height: 10rem; }
  .bar { flex: 1; min-width: 1rem; border-radius: .3rem .3rem 0 0; background: #2563eb; }
  .activity-list { display: grid; gap: .5rem; padding: 0; list-style: none; }
  .activity-row { display: flex; justify-content: space-between; gap: .75rem; padding: .55rem 0; border-bottom: 1px solid #eef2f7; }
  select, button { padding: .5rem .7rem; border: 1px solid #aebbd0; border-radius: .4rem; background: white; font: inherit; }
  button { color: white; border-color: #2563eb; background: #2563eb; cursor: pointer; }
  button[disabled] { opacity: .55; cursor: wait; }
  @media (max-width: 750px) { .dashboard-main { grid-template-columns: 1fr; } .dashboard-header, .dashboard-controls { align-items: flex-start; flex-direction: column; } }
`

const wait = (milliseconds, abortSignal) => new Promise((resolve, reject) => {
  if (abortSignal?.aborted) {
    reject(new DOMException('Aborted', 'AbortError'))
    return
  }

  const timer = setTimeout(() => resolve(), milliseconds)
  const cancel = () => {
    clearTimeout(timer)
    reject(new DOMException('Aborted', 'AbortError'))
  }
  abortSignal?.addEventListener('abort', cancel, { once: true })
})

export function createDashboardApi(options = {}) {
  const source = options.data ?? DEFAULT_DASHBOARD
  const delay = options.delay ?? 100

  return {
    async load(range, abortSignal) {
      await wait(delay, abortSignal)
      return {
        range,
        metrics: source.metrics.map(metric => ({ ...metric })),
        trend: [...source.trend],
        activity: source.activity.map(item => ({ ...item }))
      }
    }
  }
}

function MetricCard({ metric }) {
  return html`
    <li class="metric" data-dashboard-metric=${metric.id}>
      <span class="metric-label">${metric.label}</span>
      <strong class="metric-value">${metric.value}</strong>
      <span class=${metric.tone}>${metric.change}</span>
    </li>
  `
}

function ActivityRow({ item }) {
  return html`
    <li class="activity-row" data-dashboard-activity=${item.id}>
      <span><strong>${item.actor}</strong> ${item.action}</span>
      <span class=${item.status}>${item.status}</span>
    </li>
  `
}

function TrendBar({ value, index }) {
  return html`<span class="bar" data-dashboard-bar=${index} style=${`height: ${value}%`} title=${`${value}%`}></span>`
}

export function mountDashboardApp(container, options = {}) {
  const api = options.api ?? createDashboardApi()
  const dashboardData = resource((range, abortSignal) => api.load(range, abortSignal), {
    initialValue: options.initialData ?? DEFAULT_DASHBOARD
  })
  const range = signal('7d')
  const activityFilter = signal('all')
  const recording = signal(false)
  const timeline = createPerformanceTimeline({ maxEntries: 300, redact: false })

  const metricViews = computed(() => (dashboardData.data.value?.metrics ?? [])
    .map(metric => component(MetricCard, { metric })))
  const trendViews = computed(() => (dashboardData.data.value?.trend ?? [])
    .map((value, index) => component(TrendBar, { value, index })))
  const activityViews = computed(() => (dashboardData.data.value?.activity ?? [])
    .filter(item => activityFilter.value === 'all' || item.status === activityFilter.value)
    .map(item => component(ActivityRow, { item })))
  const dashboardMessage = computed(() => dashboardData.loading.value
    ? 'Refreshing dashboard…'
    : dashboardData.error.value
      ? 'Could not load dashboard data.'
      : '')

  function reload() {
    return dashboardData.reload(range.value).catch(() => undefined)
  }

  function toggleRecording() {
    if (recording.value) {
      timeline.stop()
      recording.value = false
    } else {
      timeline.start()
      recording.value = true
    }
  }

  const app = mount(() => html`
    <main use:style=${appStyle} class="dashboard">
      <header class="dashboard-header">
        <div>
          <p>Operations</p>
          <h1>Matrix Dashboard</h1>
        </div>
        <button data-dashboard-record @click=${toggleRecording}>${computed(() => recording.value ? 'Stop recording' : 'Record timeline')}</button>
      </header>
      <div class="dashboard-controls">
        <label>Range
          <select data-dashboard-range .value=${range} @change=${event => {
            range.value = event.currentTarget.value
            reload()
          }}>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </label>
        <label>Activity
          <select data-dashboard-filter .value=${activityFilter} @change=${event => activityFilter.value = event.currentTarget.value}>
            <option value="all">All activity</option>
            <option value="success">Success only</option>
            <option value="error">Errors only</option>
          </select>
        </label>
      </div>
      <p data-dashboard-status aria-live="polite">${dashboardMessage}</p>
      <ul class="metric-grid">${keyed(metricViews, item => item.props.metric.id)}</ul>
      <div class="dashboard-main">
        <section class="chart">
          <h2>Traffic trend</h2>
          <div class="bars">${keyed(trendViews, item => item.props.index)}</div>
        </section>
        <section class="activity">
          <h2>Recent activity</h2>
          <ul class="activity-list">${keyed(activityViews, item => item.props.item.id)}</ul>
        </section>
      </div>
    </main>
  `, container)

  const ready = dashboardData.reload(range.value)

  return {
    app,
    api,
    data: dashboardData,
    range,
    activityFilter,
    timeline,
    ready,
    reload,
    dispose() {
      app.unmount()
      dashboardData.dispose()
      timeline.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountDashboardApp(document.querySelector('#app'))
}
