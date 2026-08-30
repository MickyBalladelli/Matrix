export const Fragment: unique symbol

import type { Reactive } from './index.js'

type MatrixValue<T> = T | Reactive<T>
type DataAttributes = { [Name in `data-${string}`]?: MatrixValue<string | number | boolean | null | undefined> }
type AriaAttributes = { [Name in `aria-${string}`]?: MatrixValue<string | number | boolean | null | undefined> }
type MatrixEvent<EventType, ElementType extends Element> = EventType extends Event
  ? Omit<EventType, 'currentTarget'> & { readonly currentTarget: ElementType }
  : EventType
type EventAttributes<ElementType extends Element> = {
  [Name in keyof GlobalEventHandlersEventMap as `on${Capitalize<Name & string>}`]?: (event: MatrixEvent<GlobalEventHandlersEventMap[Name], ElementType>) => void
} & {
  [Name in keyof GlobalEventHandlersEventMap as `on${Capitalize<Name & string>}${'Capture' | 'Once' | 'Passive' | 'Prevent' | 'Stop'}`]?: (event: MatrixEvent<GlobalEventHandlersEventMap[Name], ElementType>) => void
}
type ReservedElementAttribute = 'children' | 'class' | 'className' | 'style' | 'key' | `on${string}` | `data-${string}` | `aria-${string}` | `use:${string}`
type ElementProperties<ElementType> = {
  [Name in keyof ElementType as Name extends string
    ? Name extends ReservedElementAttribute
      ? never
      : ElementType[Name] extends (...args: never[]) => unknown
        ? never
        : Name
    : never]?: MatrixValue<ElementType[Name]>
}

export type IntrinsicElementAttributes<ElementType extends Element> = ElementProperties<ElementType> & EventAttributes<ElementType> & DataAttributes & AriaAttributes & {
  children?: unknown
  class?: MatrixValue<string | null | undefined>
  className?: MatrixValue<string | null | undefined>
  key?: string | number
  style?: MatrixValue<string | Record<string, string | number | null | undefined> | null | undefined>
  'use:bind'?: unknown
  'use:style'?: unknown
  'use:vars'?: unknown
}

export function jsx<Props extends Record<string, unknown>>(
  type: keyof JSX.IntrinsicElements | ((props: Props) => unknown) | typeof Fragment,
  props?: Props | null,
  key?: string | number
): unknown

export function jsxs<Props extends Record<string, unknown>>(
  type: keyof JSX.IntrinsicElements | ((props: Props) => unknown) | typeof Fragment,
  props?: Props | null,
  key?: string | number
): unknown

export function jsxDEV<Props extends Record<string, unknown>>(
  type: keyof JSX.IntrinsicElements | ((props: Props) => unknown) | typeof Fragment,
  props?: Props | null,
  key?: string | number,
  isStaticChildren?: boolean,
  source?: unknown,
  self?: unknown
): unknown

export function createElement<Props extends Record<string, unknown>>(
  type: keyof JSX.IntrinsicElements | ((props: Props) => unknown) | typeof Fragment,
  props?: Props | null,
  ...children: unknown[]
): unknown

export const h: typeof createElement

export namespace JSX {
  type Element = unknown

  type IntrinsicElements = {
    [Name in keyof HTMLElementTagNameMap]: IntrinsicElementAttributes<HTMLElementTagNameMap[Name]>
  } & {
    [Name in keyof SVGElementTagNameMap]: IntrinsicElementAttributes<SVGElementTagNameMap[Name]>
  } & {
    [Name in `${string}-${string}`]: IntrinsicElementAttributes<HTMLElement>
  }

  interface ElementChildrenAttribute {
    children: {}
  }
}
