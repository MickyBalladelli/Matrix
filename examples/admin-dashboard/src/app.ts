import { component, computed, createPerformanceTimeline, css, html, keyed, mount, resource, signal } from '../../../src/index.js'

const DEFAULT_DATA = {
  users: [
    { id: 'ada', name: 'Ada Lovelace', email: 'ada@example.com', role: 'Admin', status: 'active', spend: 1240, lastSeen: '2 min ago' },
    { id: 'boudica', name: 'Boudica Gray', email: 'boudica@example.com', role: 'Editor', status: 'active', spend: 820, lastSeen: '18 min ago' },
    { id: 'cato', name: 'Cato Ruiz', email: 'cato@example.com', role: 'Viewer', status: 'invited', spend: 140, lastSeen: 'Never' },
    { id: 'dido', name: 'Dido Okafor', email: 'dido@example.com', role: 'Editor', status: 'suspended', spend: 460, lastSeen: '3 days ago' },
    { id: 'enki', name: 'Enki Shah', email: 'enki@example.com', role: 'Viewer', status: 'active', spend: 680, lastSeen: '1 hour ago' }
  ]
}

const appStyle = css`
  .admin { max-width: 78rem; margin: 2rem auto; padding: 1rem; font-family: system-ui, sans-serif; color: #172033; }
  .admin-header, .admin-controls { display: flex; gap: 1rem; align-items: center; justify-content: space-between; }
  .admin-header { margin-bottom: 1rem; }
  .admin-header h1 { margin: 0; }
  .admin-controls { margin-bottom: 1rem; }
  .admin-controls label { display: grid; gap: .3rem; }
  input, select, button { padding: .55rem .7rem; border: 1px solid #aebbd0; border-radius: .4rem; font: inherit; }
  button { color: white; border-color: #2563eb; background: #2563eb; cursor: pointer; }
  .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 0 0 1rem; padding: 0; list-style: none; }
  .metric, .table-card { padding: 1rem; border: 1px solid #dbe3ef; border-radius: .7rem; background: white; }
  .metric strong { display: block; margin-top: .3rem; font-size: 1.6rem; }
  .metric small, .admin-status { color: #64748b; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: .7rem; border-bottom: 1px solid #eef2f7; text-align: left; white-space: nowrap; }
  th { color: #475569; font-size: .85rem; }
  .status { font-size: .85rem; }
  .status-active { color: #047857; }
  .status-invited { color: #a16207; }
  .status-suspended { color: #b91c1c; }
  .admin-footer { display: flex; gap: .75rem; align-items: center; justify-content: space-between; margin-top: 1rem; }
  @media (max-width: 700px) { .admin-header, .admin-controls { align-items: flex-start; flex-direction: column; } .metric-grid { grid-template-columns: 1fr; } }
`

export function createAdminDashboardApi(options = {}) {
  const users = options.users ?? DEFAULT_DATA.users
  return {
    async load() {
      return { users: users.map(user => ({ ...user })) }
    }
  }
}

function Metric({ label, value, detail }) {
  return html`<li class="metric"><small>${label}</small><strong>${value}</strong><span>${detail}</span></li>`
}

function UserRow({ user }) {
  return html`
    <tr data-admin-row=${user.id}>
      <td><strong>${user.name}</strong><br><small>${user.email}</small></td>
      <td>${user.role}</td>
      <td><span class=${`status status-${user.status}`}>${user.status}</span></td>
      <td>$${user.spend}</td>
      <td>${user.lastSeen}</td>
    </tr>
  `
}

export function mountAdminDashboardApp(container, options = {}) {
  const api = options.api ?? createAdminDashboardApi()
  const data = resource(() => api.load(), { initialValue: options.initialData ?? DEFAULT_DATA })
  const query = signal('')
  const status = signal('all')
  const sort = signal('name')
  const page = signal(1)
  const pageSize = 4
  const timeline = createPerformanceTimeline({ maxEntries: 200 })
  const recording = signal(false)
  const rows = computed(() => {
    const normalizedQuery = query.value.trim().toLowerCase()
    const filtered = (data.data.value?.users ?? []).filter(user => {
      const matchesQuery = !normalizedQuery || `${user.name} ${user.email}`.toLowerCase().includes(normalizedQuery)
      const matchesStatus = status.value === 'all' || user.status === status.value
      return matchesQuery && matchesStatus
    })
    return filtered.sort((left, right) => sort.value === 'spend'
      ? right.spend - left.spend
      : left.name.localeCompare(right.name))
  })
  const visibleRows = computed(() => rows.value.slice((page.value - 1) * pageSize, page.value * pageSize)
    .map(user => component(UserRow, { user })))
  const pageCount = computed(() => Math.max(1, Math.ceil(rows.value.length / pageSize)))
  const metrics = computed(() => {
    const users = data.data.value?.users ?? []
    return [
      { id: 'total', label: 'Total users', value: users.length, detail: 'All accounts' },
      { id: 'active', label: 'Active', value: users.filter(user => user.status === 'active').length, detail: 'Ready to use' },
      { id: 'spend', label: 'Account value', value: `$${users.reduce((total, user) => total + user.spend, 0)}`, detail: 'Demo billing total' }
    ].map(metric => component(Metric, metric))
  })

  const resetPage = () => { page.value = 1 }
  const previousPage = () => { page.value = Math.max(1, page.value - 1) }
  const nextPage = () => { page.value = Math.min(pageCount.value, page.value + 1) }
  const toggleTimeline = () => {
    if (timeline.isRecording) {
      timeline.stop()
      recording.value = false
    } else {
      timeline.start()
      recording.value = true
    }
  }

  const app = mount(() => html`
    <main use:style=${appStyle} class="admin">
      <header class="admin-header">
        <div><p>Matrix official example</p><h1>Admin Console</h1></div>
        <button data-admin-record @click=${toggleTimeline}>${computed(() => recording.value ? 'Stop timeline' : 'Record timeline')}</button>
      </header>
      <ul class="metric-grid" data-admin-metrics>${keyed(metrics, item => item.props.id)}</ul>
      <section class="table-card">
        <div class="admin-controls">
          <label>Search users <input data-admin-search placeholder="Name or email" use:bind=${{ source: query, sanitize: value => String(value) }} @input=${resetPage}></label>
          <label>Status
            <select data-admin-status .value=${status} @change=${event => { status.value = event.currentTarget.value; resetPage() }}>
              <option value="all">All statuses</option><option value="active">Active</option><option value="invited">Invited</option><option value="suspended">Suspended</option>
            </select>
          </label>
          <label>Sort
            <select data-admin-sort .value=${sort} @change=${event => { sort.value = event.currentTarget.value; resetPage() }}>
              <option value="name">Name</option><option value="spend">Account value</option>
            </select>
          </label>
        </div>
        <p class="admin-status" data-admin-status-message aria-live="polite">${computed(() => data.loading.value ? 'Refreshing…' : `${rows.value.length} matching user(s)`)}</p>
        <div class="table-wrap">
          <table data-admin-table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Value</th><th>Last seen</th></tr></thead><tbody>${keyed(visibleRows, item => item.props.user.id)}</tbody></table>
        </div>
        <footer class="admin-footer">
          <span data-admin-page>Page ${page} of ${pageCount}</span>
          <span><button data-admin-prev @click=${previousPage}>Previous</button> <button data-admin-next @click=${nextPage}>Next</button></span>
        </footer>
      </section>
    </main>
  `, container)

  const ready = data.reload().catch(() => undefined)
  return {
    app,
    api,
    data,
    query,
    status,
    sort,
    page,
    timeline,
    ready,
    dispose() {
      app.unmount()
      data.dispose()
      rows.dispose()
      visibleRows.dispose()
      pageCount.dispose()
      metrics.dispose()
      query.dispose()
      status.dispose()
      sort.dispose()
      page.dispose()
      recording.dispose()
      timeline.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountAdminDashboardApp(document.querySelector('#app'))
}
