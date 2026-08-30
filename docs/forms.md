# Form validation

`createForm` keeps field signals, a computed values object, errors, and validity together. Its validators are synchronous and return a message or `undefined`.

## A validated form

```js
import { computed, createForm, html, mount } from '@mickyballadelli/matrix'

const form = createForm({
  email: '',
  password: '',
  role: 'member',
  topics: []
}, {
  email: value => {
    if (!value) return 'Email is required'
    if (!/^\S+@\S+\.\S+$/.test(value)) return 'Enter a valid email'
  },
  password: value => {
    if (value.length < 12) return 'Use at least 12 characters'
  },
  role: value => value ? undefined : 'Choose a role'
})

const errorList = computed(() => Object.entries(form.errors.value)
  .map(([field, message]) => html`<li data-field=${field}>${message}</li>`))

const App = () => html`
  <form @submit.prevent=${submit} novalidate>
    <label>
      Email
      <input type="email" use:bind=${form.fields.email} aria-describedby="form-errors">
    </label>

    <label>
      Password
      <input type="password" use:bind=${form.fields.password}>
    </label>

    <label>
      Role
      <select use:bind=${form.fields.role}>
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
    </label>

    <label>
      Topics
      <select multiple use:bind=${form.fields.topics}>
        <option value="reactivity">Reactivity</option>
        <option value="routing">Routing</option>
      </select>
    </label>

    <ul id="form-errors" role="alert">${errorList}</ul>
    <button>Save</button>
    <button type="button" @click=${() => form.reset()}>Reset</button>
  </form>
`

async function submit(event) {
  event.preventDefault()
  const errors = form.validate()
  if (Object.keys(errors).length > 0) return

  await save(form.values.value)
}

async function save(values) {
  const response = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values)
  })

  if (!response.ok) {
    throw new Error('Could not save the form')
  }
}

mount(App, document.querySelector('#app'))
```

`form.validate()` updates `form.errors` and returns the same error object. `form.valid` is a Computed that is `true` when there are no errors. Render errors with an `aria-live` region or `role="alert"` when the message changes the user's next action.

## Complex values

Fields can hold arrays or objects because Matrix signals use the value type supplied in `initialValues`:

```js
const form = createForm({
  profile: { firstName: '', lastName: '' },
  tags: []
})

form.fields.profile.update(profile => ({ ...profile, firstName: 'Ada' }))
form.fields.tags.value = ['reactivity', 'routing']
```

Use a new object or array reference when changing a complex field. `use:bind` supports text, number, range, checkbox, radio, file, single select, and multiple select controls. A multiple select writes an array of selected option values.

## Async validation

The built-in validators are synchronous. Run remote checks after local validation and write a server error back to the error signal. Guard against an older request winning a race:

```js
let validationRun = 0

async function validateEmailRemotely() {
  const email = form.fields.email.value
  const run = ++validationRun
  const response = await fetch(`/api/email-available?email=${encodeURIComponent(email)}`)

  if (run !== validationRun) return false

  if (!response.ok) {
    form.errors.value = { ...form.errors.value, email: 'Could not check this email' }
    return false
  }

  const result = await response.json()
  if (run !== validationRun) return false

  const nextErrors = { ...form.errors.value }
  if (!result.available) {
    nextErrors.email = 'That email is already registered'
  } else {
    delete nextErrors.email
  }
  form.errors.value = nextErrors
  return result.available
}
```

Disable the submit button while the check is running with a separate `saving` signal. Validate again on submit; client-side validation is a user experience aid, not authorization.
