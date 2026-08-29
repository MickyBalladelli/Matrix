import {
  ERROR_BOUNDARY_RESULT,
  getCurrentComponent
} from './context.js'

export const COMPONENT_RESULT = Symbol('matrix.component.result')

export function component(render, props = {}, key) {
  if (typeof render !== 'function') {
    throw new TypeError('component() expects a render function')
  }

  const sourceProps = props && typeof props === 'object' ? props : {}
  const protectedProps = new Proxy(sourceProps, {
    set() {
      throw new TypeError('Component props are read-only')
    },
    deleteProperty() {
      throw new TypeError('Component props are read-only')
    }
  })

  return {
    [COMPONENT_RESULT]: true,
    key,
    render,
    props: protectedProps,
    update(nextResult) {
      return nextResult?.render === render && nextResult?.key === key
    }
  }
}

export function isComponentResult(value) {
  return Boolean(value && value[COMPONENT_RESULT])
}

export function onMount(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('onMount() expects a function')
  }

  const instance = getCurrentComponent()
  if (!instance) {
    throw new Error('onMount() must be called inside a component')
  }

  instance.mountCallbacks.push(callback)
}

export function onUnmount(cleanup) {
  if (typeof cleanup !== 'function') {
    throw new TypeError('onUnmount() expects a function')
  }

  const instance = getCurrentComponent()
  if (!instance) {
    throw new Error('onUnmount() must be called inside a component')
  }

  return instance.scope.add(cleanup)
}

export function errorBoundary(render, fallback, props = {}) {
  if (typeof render !== 'function') {
    throw new TypeError('errorBoundary() expects a render function')
  }

  const protectedProps = props && typeof props === 'object'
    ? new Proxy(props, {
        set() {
          throw new TypeError('Component props are read-only')
        },
        deleteProperty() {
          throw new TypeError('Component props are read-only')
        }
      })
    : {}

  return {
    [COMPONENT_RESULT]: true,
    [ERROR_BOUNDARY_RESULT]: true,
    render,
    fallback,
    props: protectedProps,
    update(nextResult) {
      return nextResult?.render === render
    }
  }
}

export { inject, provide, runWithComponent } from './context.js'
