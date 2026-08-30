import { computed, createForm, css, html, mount, resource, signal } from '../../../src/index.js'

const appStyle = css`
  .server-app { max-width: 44rem; margin: 3rem auto; padding: 1rem; font-family: system-ui, sans-serif; color: #172033; }
  .server-card { padding: 1.3rem; border: 1px solid #dbe3ef; border-radius: .75rem; background: white; }
  .server-card h1 { margin-top: 0; }
  label { display: grid; gap: .3rem; margin: 1rem 0; }
  input, button { padding: .6rem .7rem; border: 1px solid #aebbd0; border-radius: .4rem; font: inherit; }
  button { color: white; border-color: #2563eb; background: #2563eb; cursor: pointer; }
  button[disabled] { opacity: .55; cursor: wait; }
  .server-message { color: #047857; }
  .server-error { color: #b91c1c; }
`

export function createServerApi(options = {}) {
  const baseUrl = options.baseUrl ?? '/api'
  const request = options.fetch ?? globalThis.fetch
  if (typeof request !== 'function') {
    throw new Error('Server integration requires fetch or an injected API')
  }

  return {
    async loadProfile(abortSignal) {
      const response = await request(`${baseUrl}/profile`, { signal: abortSignal })
      if (!response.ok) throw new Error(`Profile request failed: ${response.status}`)
      return response.json()
    },
    async saveProfile(values, abortSignal) {
      const response = await request(`${baseUrl}/profile`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
        signal: abortSignal
      })
      if (!response.ok) throw new Error(`Profile save failed: ${response.status}`)
      return response.json()
    }
  }
}

export function mountServerIntegrationApp(container, options = {}) {
  const api = options.api ?? createServerApi(options)
  const profile = resource(abortSignal => api.loadProfile(abortSignal), { initialValue: options.initialProfile ?? null })
  const form = createForm({ displayName: '', team: '' }, {
    displayName: value => value.trim() ? undefined : 'Display name is required',
    team: value => value.trim() ? undefined : 'Team is required'
  }, { name: 'server-profile' })
  const saving = signal(false)
  const message = signal('')
  const errorMessage = computed(() => profile.error.value?.message ?? '')
  const formErrors = computed(() => Object.values(form.errors.value).map(error => html`<li>${error}</li>`))

  async function save(event) {
    event.preventDefault()
    if (Object.keys(form.validate()).length > 0) return false
    saving.value = true
    message.value = ''
    try {
      await api.saveProfile(form.values.value)
      message.value = 'Profile saved on the server'
    } catch (error) {
      message.value = error.message
    } finally {
      saving.value = false
    }
    return true
  }

  const app = mount(() => html`
    <main use:style=${appStyle} class="server-app">
      <section class="server-card">
        <p>Matrix official example</p><h1>Server profile</h1>
        <p data-server-load-status>${computed(() => profile.loading.value ? 'Loading profile…' : errorMessage.value ? errorMessage : 'Profile loaded')}</p>
        <form data-server-form @submit=${save}>
          <label>Display name <input data-server-name use:bind=${form.fields.displayName}></label>
          <label>Team <input data-server-team use:bind=${form.fields.team}></label>
          <ul data-server-errors>${formErrors}</ul>
          <button data-server-save type="submit" disabled=${saving}>Save profile</button>
          <p class="server-message" data-server-message aria-live="polite">${message}</p>
        </form>
      </section>
    </main>
  `, container)

  const ready = profile.reload()
    .then(values => {
      if (values) form.reset({ displayName: values.displayName ?? '', team: values.team ?? '' })
      return values
    })
    .catch(() => undefined)

  return {
    app,
    api,
    profile,
    form,
    saving,
    message,
    ready,
    save,
    dispose() {
      app.unmount()
      profile.dispose()
      errorMessage.dispose()
      formErrors.dispose()
      saving.dispose()
      message.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountServerIntegrationApp(document.querySelector('#app'))
}
