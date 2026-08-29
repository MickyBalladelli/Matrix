export function isReactiveValue(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value.kind === 'signal' || value.kind === 'computed') &&
    typeof value.get === 'function'
  )
}

export function readReactive(value) {
  return isReactiveValue(value) ? value.value : value
}
