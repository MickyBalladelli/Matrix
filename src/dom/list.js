export const KEYED_LIST_RESULT = Symbol('matrix.keyed.list')

export function keyed(items, getKey = value => value?.key ?? value) {
  if (typeof getKey !== 'function') {
    throw new TypeError('keyed() expects a key function')
  }

  return {
    [KEYED_LIST_RESULT]: true,
    items,
    getKey
  }
}

export function isKeyedList(value) {
  return Boolean(value && value[KEYED_LIST_RESULT])
}
