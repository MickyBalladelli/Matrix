export const Fragment: unique symbol

export function jsx(
  type: string | ((props: Record<string, unknown>) => unknown) | typeof Fragment,
  props?: Record<string, unknown> | null,
  key?: string | number
): unknown

export function jsxs(
  type: string | ((props: Record<string, unknown>) => unknown) | typeof Fragment,
  props?: Record<string, unknown> | null,
  key?: string | number
): unknown

export function jsxDEV(
  type: string | ((props: Record<string, unknown>) => unknown) | typeof Fragment,
  props?: Record<string, unknown> | null,
  key?: string | number,
  isStaticChildren?: boolean,
  source?: unknown,
  self?: unknown
): unknown

export function createElement(
  type: string | ((props: Record<string, unknown>) => unknown) | typeof Fragment,
  props?: Record<string, unknown> | null,
  ...children: unknown[]
): unknown

export const h: typeof createElement

export namespace JSX {
  type Element = unknown

  interface IntrinsicElements {
    [elementName: string]: Record<string, unknown>
  }

  interface ElementChildrenAttribute {
    children: {}
  }
}
