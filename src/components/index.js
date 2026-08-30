import {
  ERROR_BOUNDARY_RESULT,
  getCurrentComponent
} from './context.js'
import { captureCallsite, describeValue } from '../utils/diagnostics.js'
import { warnDevelopment } from '../utils/development.js'

export const COMPONENT_RESULT = Symbol('matrix.component.result')

function warnPropMutation(name, operation, property) {
  const propertyName = String(property)
  warnDevelopment(
    `Component "${name || 'anonymous'}" props are read-only. Cannot ${operation} "${propertyName}". Update the owner state instead.`,
    {
      type: 'component:prop-mutation',
      name: name || 'anonymous',
      operation,
      property: propertyName,
      stack: captureCallsite()
    }
  )
}

function readonlyProps(sourceProps, name) {
  return new Proxy(sourceProps, {
    set(target, property) {
      warnPropMutation(name, 'set', property)
      throw new TypeError('Component props are read-only')
    },
    deleteProperty(target, property) {
      warnPropMutation(name, 'delete', property)
      throw new TypeError('Component props are read-only')
    }
  })
}

export function component(render, props = {}, key) {
  if (typeof render !== 'function') {
    throw new TypeError(`component() expects a render function. Received ${describeValue(render)}. Pass a function such as component(props => html\`<div>...</div>\`).`)
  }

  const sourceProps = props && typeof props === 'object' ? props : {}
  const protectedProps = readonlyProps(sourceProps, render.name)

  const result = {
    [COMPONENT_RESULT]: true,
    key,
    render,
    props: protectedProps,
    update(nextResult) {
      return nextResult?.render === render && nextResult?.key === key
    }
  }

  Object.defineProperty(result, '_matrixSourceLocation', {
    value: captureCallsite(),
    enumerable: false
  })

  return result
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

  if (!instance.isMounted) {
    instance.mountCallbacks.push(callback)
  }
}

export function onUnmount(cleanup) {
  if (typeof cleanup !== 'function') {
    throw new TypeError('onUnmount() expects a function')
  }

  const instance = getCurrentComponent()
  if (!instance) {
    throw new Error('onUnmount() must be called inside a component')
  }

  if (instance.isMounted) {
    return () => {}
  }

  return instance.scope.add(cleanup)
}

export function errorBoundary(render, fallback, props = {}) {
  if (typeof render !== 'function') {
    throw new TypeError(`errorBoundary() expects a render function. Received ${describeValue(render)}. Pass a function such as errorBoundary(props => html\`<div>...</div>\`, fallback).`)
  }

  const protectedProps = props && typeof props === 'object'
    ? readonlyProps(props, render.name)
    : {}

  const result = {
    [COMPONENT_RESULT]: true,
    [ERROR_BOUNDARY_RESULT]: true,
    render,
    fallback,
    props: protectedProps,
    update(nextResult) {
      return nextResult?.render === render
    }
  }

  Object.defineProperty(result, '_matrixSourceLocation', {
    value: captureCallsite(),
    enumerable: false
  })

  return result
}

export { inject, provide, runWithComponent } from './context.js'
