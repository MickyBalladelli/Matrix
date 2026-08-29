import {
  ERROR_BOUNDARY_RESULT,
  getCurrentComponent
} from './context.js'

export const COMPONENT_RESULT = Symbol('matrix.component.result')

export function component(render, props = {}) {
  if (typeof render !== 'function') {
    throw new TypeError('component() attend une fonction de rendu')
  }

  const sourceProps = props && typeof props === 'object' ? props : {}
  const protectedProps = new Proxy(sourceProps, {
    set() {
      throw new TypeError('Les props sont en lecture seule')
    },
    deleteProperty() {
      throw new TypeError('Les props sont en lecture seule')
    }
  })

  return {
    [COMPONENT_RESULT]: true,
    render,
    props: protectedProps,
    update(nextResult) {
      return nextResult?.render === render
    }
  }
}

export function isComponentResult(value) {
  return Boolean(value && value[COMPONENT_RESULT])
}

export function onMount(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('onMount() attend une fonction')
  }

  const instance = getCurrentComponent()
  if (!instance) {
    throw new Error('onMount() doit être appelé dans un composant')
  }

  instance.mountCallbacks.push(callback)
}

export function onUnmount(cleanup) {
  if (typeof cleanup !== 'function') {
    throw new TypeError('onUnmount() attend une fonction')
  }

  const instance = getCurrentComponent()
  if (!instance) {
    throw new Error('onUnmount() doit être appelé dans un composant')
  }

  return instance.scope.add(cleanup)
}

export function errorBoundary(render, fallback, props = {}) {
  if (typeof render !== 'function') {
    throw new TypeError('errorBoundary() attend une fonction de rendu')
  }

  const protectedProps = props && typeof props === 'object'
    ? new Proxy(props, {
        set() {
          throw new TypeError('Les props sont en lecture seule')
        },
        deleteProperty() {
          throw new TypeError('Les props sont en lecture seule')
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
