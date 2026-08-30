import { effect } from '../reactivity/effect.js'
import { computed, signal } from '../reactivity/index.js'
import { isReactiveValue } from './reactive.js'
import { warnDevelopment } from './development.js'
import { captureCallsite } from './diagnostics.js'

function getInputValue(element) {
  if (element.type === 'checkbox') {
    return element.checked
  }

  if (element.type === 'radio') {
    return element.checked ? element.value : undefined
  }

  if (element.type === 'file') {
    return element.files
  }

  if (element.type === 'number' || element.type === 'range') {
    return element.value === '' ? '' : element.valueAsNumber
  }

  if (element.multiple && element.options) {
    return [...element.selectedOptions].map(option => option.value)
  }

  return element.value
}

function setInputValue(element, value) {
  if (element.type === 'checkbox') {
    element.checked = Boolean(value)
    return
  }

  if (element.type === 'radio') {
    element.checked = String(value ?? '') === element.value
    return
  }

  if (element.type === 'file') {
    return
  }

  if (element.multiple && element.options && Array.isArray(value)) {
    const selected = new Set(value.map(String))
    for (const option of element.options) {
      option.selected = selected.has(option.value)
    }
    return
  }

  const nextValue = value ?? ''
  if (element.value !== String(nextValue)) {
    element.value = nextValue
  }
}

export function bindInput(element, source, scope) {
  const binding = source
  const target = binding?.source ?? binding
  const debounce = Number(binding?.debounce ?? 0)

  if (!isReactiveValue(target) || target.kind !== 'signal' || typeof target.set !== 'function') {
    throw new TypeError('use:bind expects a writable signal')
  }

  let focused = false
  let composing = false
  let timer

  effect(() => {
    if (!focused) {
      setInputValue(element, target.value)
    }
  })

  const writeValue = () => {
    timer = undefined
    const nextValue = getInputValue(element)
    if (nextValue !== undefined) {
      target.value = nextValue
    }
  }

  const onInput = () => {
    if (composing) {
      return
    }

    if (debounce > 0) {
      clearTimeout(timer)
      timer = setTimeout(writeValue, debounce)
      return
    }

    writeValue()
  }

  const onFocus = () => {
    focused = true
  }

  const onBlur = () => {
    focused = false
    setInputValue(element, target.value)
  }

  const onCompositionStart = () => {
    composing = true
  }

  const onCompositionEnd = () => {
    composing = false
    onInput()
  }

  element.addEventListener('input', onInput)
  element.addEventListener('change', onInput)
  element.addEventListener('focus', onFocus)
  element.addEventListener('blur', onBlur)
  element.addEventListener('compositionstart', onCompositionStart)
  element.addEventListener('compositionend', onCompositionEnd)

  scope.add(() => {
    clearTimeout(timer)
    element.removeEventListener('input', onInput)
    element.removeEventListener('change', onInput)
    element.removeEventListener('focus', onFocus)
    element.removeEventListener('blur', onBlur)
    element.removeEventListener('compositionstart', onCompositionStart)
    element.removeEventListener('compositionend', onCompositionEnd)
  })
}

export function createForm(initialValues = {}, validators = {}, options = {}) {
  if (!initialValues || typeof initialValues !== 'object' || Array.isArray(initialValues)) {
    throw new TypeError('createForm() expects an object of initial field values')
  }

  if (!validators || typeof validators !== 'object' || Array.isArray(validators)) {
    throw new TypeError('createForm() expects an object of field validators')
  }

  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('createForm() expects an options object')
  }

  if (options.name !== undefined && typeof options.name !== 'string') {
    throw new TypeError('createForm() expects options.name to be a string')
  }

  const formName = options.name ?? 'form'
  const fields = Object.fromEntries(
    Object.entries(initialValues).map(([name, value]) => [name, signal(value)])
  )
  const errors = signal({})
  const values = computed(() => Object.fromEntries(
    Object.entries(fields).map(([name, field]) => [name, field.value])
  ))
  const valid = computed(() => Object.keys(errors.value).length === 0)

  function readValues() {
    return values.peek()
  }

  function runValidator(name, validator, snapshot) {
    let message

    try {
      message = validator(fields[name].peek(), snapshot)
    } catch (error) {
      warnDevelopment(
        `Validator for form "${formName}" field "${name}" threw an error.`,
        { type: 'form:validation-error', form: formName, field: name, error, stack: captureCallsite() }
      )
      throw error
    }

    if (message !== undefined && typeof message !== 'string') {
      warnDevelopment(
        `Validator for form "${formName}" field "${name}" returned a non-string error. Return a message or undefined.`,
        { type: 'form:validation-error', form: formName, field: name, value: message }
      )
    }

    return message
  }

  function validate() {
    const nextErrors = {}
    const snapshot = readValues()

    for (const [name, validator] of Object.entries(validators)) {
      if (typeof validator !== 'function') {
        warnDevelopment(
          `Validator for form "${formName}" field "${name}" is not a function and was skipped.`,
          { type: 'form:validation-error', form: formName, field: name, issue: 'invalid-validator' }
        )
        continue
      }

      if (!fields[name]) {
        warnDevelopment(
          `Validator for form "${formName}" targets unknown field "${name}" and was skipped.`,
          { type: 'form:validation-error', form: formName, field: name, issue: 'unknown-field' }
        )
        continue
      }

      const message = runValidator(name, validator, snapshot)
      if (message) {
        nextErrors[name] = message
      }
    }

    errors.value = nextErrors
    return nextErrors
  }

  function validateField(name) {
    if (!fields[name]) {
      warnDevelopment(
        `Form "${formName}" has no field "${name}" to validate.`,
        { type: 'form:validation-error', form: formName, field: name, issue: 'unknown-field' }
      )
      return undefined
    }

    const validator = validators[name]
    const nextErrors = { ...errors.peek() }
    if (typeof validator !== 'function') {
      delete nextErrors[name]
    } else {
      const message = runValidator(name, validator, readValues())
      if (message) {
        nextErrors[name] = message
      } else {
        delete nextErrors[name]
      }
    }

    errors.value = nextErrors
    return nextErrors[name]
  }

  function inspectField(name) {
    const field = fields[name]
    if (!field) {
      warnDevelopment(
        `Form "${formName}" has no field "${name}" to inspect.`,
        { type: 'form:validation-error', form: formName, field: name, issue: 'unknown-field' }
      )
      return undefined
    }

    const error = errors.peek()[name]
    return {
      name,
      value: field.peek(),
      error,
      valid: !error,
      hasValidator: typeof validators[name] === 'function'
    }
  }

  function inspect() {
    const snapshot = readValues()
    const currentErrors = errors.peek()
    return {
      name: formName,
      values: snapshot,
      errors: { ...currentErrors },
      valid: Object.keys(currentErrors).length === 0,
      fields: Object.fromEntries(Object.keys(fields).map(name => [name, {
        value: fields[name].peek(),
        error: currentErrors[name],
        valid: !currentErrors[name],
        hasValidator: typeof validators[name] === 'function'
      }]))
    }
  }

  function reset(nextValues = initialValues) {
    for (const [name, value] of Object.entries(nextValues)) {
      if (fields[name]) {
        fields[name].value = value
      }
    }
    errors.value = {}
  }

  validate()

  return {
    name: formName,
    fields,
    values,
    errors,
    valid,
    validate,
    validateField,
    inspect,
    inspectField,
    reset
  }
}
