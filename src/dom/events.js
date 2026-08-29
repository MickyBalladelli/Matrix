export function delegate(element, eventName, selector, handler, options) {
  if (!element || typeof element.addEventListener !== 'function') {
    throw new TypeError('delegate() attend un élément DOM')
  }
  if (typeof selector !== 'string' || typeof handler !== 'function') {
    throw new TypeError('delegate() attend un sélecteur et une fonction')
  }

  const listener = event => {
    const target = event.target?.closest?.(selector)
    if (!target || !element.contains(target)) {
      return
    }

    handler.call(target, event)
  }

  element.addEventListener(eventName, listener, options)

  return () => {
    element.removeEventListener(eventName, listener, options)
  }
}
