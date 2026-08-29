import { effect } from '../reactivity/effect.js'
import { computed, signal } from '../reactivity/index.js'
import { isReactiveValue } from './reactive.js'

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

export function createForm(initialValues = {}, validators = {}) {
  const fields = Object.fromEntries(
    Object.entries(initialValues).map(([name, value]) => [name, signal(value)])
  )
  const errors = signal({})
  const values = computed(() => Object.fromEntries(
    Object.entries(fields).map(([name, field]) => [name, field.value])
  ))
  const valid = computed(() => Object.keys(errors.value).length === 0)

  function validate() {
    const nextErrors = {}

    for (const [name, validator] of Object.entries(validators)) {
      if (typeof validator !== 'function') {
        continue
      }

      const message = validator(fields[name]?.value, values.value)
      if (message) {
        nextErrors[name] = message
      }
    }

    errors.value = nextErrors
    return nextErrors
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
    fields,
    values,
    errors,
    valid,
    validate,
    reset
  }
}
