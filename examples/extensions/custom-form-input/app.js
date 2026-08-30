import { component, computed, createForm, html, mount, signal } from '../../../src/index.js'

function ValidatedInput({ id, label, type = 'text', field, error }) {
  return html`
    <label for=${id}>${label}
      <input id=${id} type=${type} use:bind=${field} aria-describedby=${`${id}-error`} aria-invalid=${computed(() => Boolean(error.value))}>
      <span id=${`${id}-error`} class="error" role="alert">${error}</span>
    </label>
  `
}

export function mountCustomFormInputApp(container, options = {}) {
  const form = options.form ?? createForm({ displayName: '', email: '' }, {
    displayName: value => value.trim() ? undefined : 'Display name is required',
    email: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : 'Enter a valid email address'
  }, { name: 'custom-profile' })
  const status = signal('')
  const displayNameError = computed(() => form.errors.value.displayName ?? '')
  const emailError = computed(() => form.errors.value.email ?? '')

  function submit(event) {
    event.preventDefault()
    if (Object.keys(form.validate()).length > 0) {
      status.value = 'Fix the highlighted fields'
      return false
    }
    status.value = `Saved ${form.values.value.displayName}`
    return true
  }

  const app = mount(() => html`
    <main class="extension-example">
      <p class="eyebrow">Extension pattern</p>
      <h1>Custom form input</h1>
      <p>Reusable inputs can own labels, ARIA state, and Matrix binding while the parent owns validation.</p>
      <form data-custom-form @submit=${submit}>
        ${component(ValidatedInput, { id: 'display-name', label: 'Display name', field: form.fields.displayName, error: displayNameError })}
        ${component(ValidatedInput, { id: 'email', label: 'Email', type: 'email', field: form.fields.email, error: emailError })}
        <button data-custom-submit type="submit">Save profile</button>
        <p data-custom-status class="status" aria-live="polite">${status}</p>
      </form>
    </main>
  `, container)

  return {
    app,
    form,
    status,
    submit,
    ready: Promise.resolve(),
    dispose() {
      app.unmount()
      displayNameError.dispose()
      emailError.dispose()
      status.dispose()
    }
  }
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  mountCustomFormInputApp(document.querySelector('#app'))
}
