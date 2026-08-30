import { component, computed, createForm, createRouter, css, cssVariables, html, keyed, mount, onMount, resource, routerView, signal } from '../../../src/index.js'

const appStyle = css`
  .spa { max-width: 64rem; margin: 2rem auto; padding: 1rem; font-family: system-ui, sans-serif; color: #172033; }
  .spa-header, .spa-nav, .spa-actions { display: flex; gap: .7rem; align-items: center; justify-content: space-between; }
  .spa-header { padding-bottom: 1rem; border-bottom: 1px solid #dbe3ef; }
  .spa-header h1 { margin: 0; }
  .spa-nav { justify-content: flex-start; margin: 1rem 0; }
  .spa-nav a, button { padding: .5rem .7rem; border: 1px solid #aebbd0; border-radius: .4rem; font: inherit; }
  .spa-nav a { color: #1d4ed8; text-decoration: none; }
  .spa-nav a.active { color: white; border-color: #2563eb; background: #2563eb; }
  .spa-card { padding: 1rem; border: 1px solid #dbe3ef; border-radius: .7rem; background: white; }
  .task-list { display: grid; gap: .6rem; padding: 0; list-style: none; }
  .task { display: flex; gap: .7rem; align-items: center; padding: .6rem; border-bottom: 1px solid #eef2f7; }
  .task.done span { color: #64748b; text-decoration: line-through; }
  input, select { padding: .55rem .7rem; border: 1px solid #aebbd0; border-radius: .4rem; font: inherit; }
  button { color: white; border-color: #2563eb; background: var(--spa-accent); cursor: pointer; }
  .spa-message { color: #64748b; }
`

const DEFAULT_TASKS = [
  { id: 'one', title: 'Read the Matrix guide', done: true },
  { id: 'two', title: 'Build a reactive view', done: false }
]

function TaskRow({ task, onToggle }) {
  return html`
    <li class=${task.done ? 'task done' : 'task'} data-spa-task=${task.id}>
      <input type="checkbox" .checked=${task.done} @change=${() => onToggle(task.id)}>
      <span>${task.title}</span>
    </li>
  `
}

export function mountSpaApp(container, options = {}) {
  const tasks = signal(options.tasks ?? DEFAULT_TASKS.map(task => ({ ...task })))
  const themeMode = signal('light')
  const taskForm = createForm({ title: '' }, { title: value => value.trim() ? undefined : 'Task title is required' }, { name: 'spa-task' })
  const message = signal('')
  const mounted = signal(false)
  const appData = resource(async () => ({ version: 'local', updated: 'just now' }), { initialValue: { version: 'local', updated: 'local demo' } })
  const accentValue = computed(() => themeMode.value === 'light' ? '#2563eb' : '#9333ea')
  const accent = cssVariables({ '--spa-accent': accentValue })
  const taskRows = computed(() => tasks.value.map(task => component(TaskRow, {
    task,
    onToggle: id => tasks.update(items => items.map(item => item.id === id ? { ...item, done: !item.done } : item))
  })))
  const taskCount = computed(() => `${tasks.value.filter(task => !task.done).length} open task(s)`)

  function addTask(event) {
    event.preventDefault()
    if (Object.keys(taskForm.validate()).length > 0) return false
    const title = taskForm.fields.title.value.trim()
    tasks.update(items => [...items, { id: `task-${Date.now()}`, title, done: false }])
    taskForm.reset()
    message.value = 'Task added'
    return true
  }

  function HomePage() {
    return html`<section class="spa-card" data-spa-home><h2>One small app</h2><p>Router, forms, resources, keyed lists, and theme state in one example.</p><p class="spa-message">Runtime ${computed(() => appData.data.value?.version ?? 'loading')}</p></section>`
  }

  function TasksPage() {
    return html`
      <section class="spa-card" data-spa-tasks>
        <h2>Tasks</h2>
        <p data-spa-task-count>${taskCount}</p>
        <form data-spa-task-form @submit=${addTask}><input data-spa-task-input placeholder="New task" use:bind=${taskForm.fields.title}> <button>Add task</button></form>
        <ul class="task-list">${keyed(taskRows, item => item.props.task.id)}</ul>
        <p class="spa-message" data-spa-message>${message}</p>
      </section>
    `
  }

  function SettingsPage() {
    return html`
      <section class="spa-card" data-spa-settings>
        <h2>Settings</h2>
        <label>Theme <select data-spa-theme .value=${themeMode} @change=${event => themeMode.value = event.currentTarget.value}><option value="light">Light</option><option value="dark">Dark</option></select></label>
        <p>Current theme: ${themeMode}</p>
      </section>
    `
  }

  const router = createRouter([
    { path: '/', view: HomePage },
    { path: '/tasks', view: TasksPage },
    { path: '/settings', view: SettingsPage }
  ])
  const activeView = routerView(router, () => html`<section class="spa-card">Page not found</section>`)
  const App = () => {
    onMount(() => { mounted.value = true })
    return html`
    <main use:style=${appStyle} use:vars=${accent} class="spa">
      <header class="spa-header"><div><p>Matrix official example</p><h1>Matrix Workspace</h1></div><span data-spa-mounted>${computed(() => mounted.value ? 'ready' : 'starting')}</span></header>
      <nav class="spa-nav">
        <a href="/" class=${computed(() => router.path.value === '/' ? 'active' : '')} @click=${router.link('/')}>Home</a>
        <a href="/tasks" class=${computed(() => router.path.value === '/tasks' ? 'active' : '')} @click=${router.link('/tasks')}>Tasks</a>
        <a href="/settings" class=${computed(() => router.path.value === '/settings' ? 'active' : '')} @click=${router.link('/settings')}>Settings</a>
      </nav>
      ${activeView}
    </main>
  `
  }

  const app = mount(App, container)
  router.start()
  const ready = router.current.value ? Promise.resolve() : router.navigate('/', { replace: true, scroll: false })

  return {
    app,
    router,
    tasks,
    taskForm,
    themeMode,
    appData,
    ready,
    dispose() {
      app.unmount()
      router.dispose()
      appData.dispose()
      accentValue.dispose()
      taskRows.dispose()
      taskCount.dispose()
      tasks.dispose()
      themeMode.dispose()
      message.dispose()
      mounted.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountSpaApp(document.querySelector('#app'))
}
