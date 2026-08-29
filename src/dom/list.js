export const KEYED_LIST_RESULT = Symbol('matrix.keyed.list')

export function keyed(items, getKey = value => value) {
  if (typeof getKey !== 'function') {
    throw new TypeError('keyed() attend une fonction de clé')
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
