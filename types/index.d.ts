export interface Signal<T> {
  value: T
  readonly kind: 'signal'
  readonly name: string
  get(): T
  set(value: T): T
  update(updater: (value: T) => T): T
  peek(): T
  subscribe(listener: (value: T, previousValue: T) => void): () => void
  dispose(): void
}

export interface Computed<T> {
  readonly value: T
  readonly kind: 'computed'
  readonly name: string
  get(): T
  peek(): T
  subscribe(listener: (value: T, previousValue: T) => void): () => void
  dispose(): void
}

export type Reactive<T> = Signal<T> | Computed<T>

export interface SignalOptions<T> {
  name?: string
  equals?: (left: T, right: T) => boolean
}

export function signal<T>(initialValue: T, options?: SignalOptions<T>): Signal<T>
export function computed<T>(fn: () => T, options?: SignalOptions<T>): Computed<T>
export function computed<T>(definition: { get: () => T; set: (value: T) => void }, options?: SignalOptions<T>): Computed<T> & { set(value: T): T }

export interface EffectOptions {
  flush?: 'sync' | 'microtask'
  name?: string
}

export function effect(fn: () => void | (() => void), options?: EffectOptions): () => void
export function batch<T>(fn: () => T): T
export function flushJobs(): void

export interface Scope {
  readonly disposed: boolean
  run<T>(fn: () => T): T
  add(cleanup: () => void): () => void
  dispose(): void
}

export function createScope(parent?: Scope): Scope
export function disposeScope(scope: Scope): void
export function onCleanup(cleanup: () => void): () => void

export interface TemplateResult {
  readonly strings: TemplateStringsArray
  readonly values: unknown[]
  readonly key?: string | number
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): TemplateResult
export function keyed<T>(items: T[] | Reactive<T[]>, getKey: (item: T) => string | number): unknown

export interface MountHandle {
  readonly nodes: Node[]
  unmount(): void
}

export function mount(view: unknown, container: Element | DocumentFragment, props?: Record<string, unknown>): MountHandle
export function render(value: unknown, container: Element | DocumentFragment, before?: Node | null): unknown
export function delegate(element: Element, event: string, selector: string, handler: (event: Event) => void, options?: AddEventListenerOptions): () => void

export interface ComponentResult {
  readonly props: Record<string, unknown>
  readonly key?: string | number
}

export function component<Props extends Record<string, unknown>>(
  render: (props: Readonly<Props>) => unknown,
  props?: Props
): ComponentResult
export function onMount(callback: (root: Node | null) => void | (() => void)): void
export function onUnmount(cleanup: () => void): () => void
export function provide<T>(key: unknown, value: T): T
export function inject<T>(key: unknown, fallback?: T): T | undefined
export function errorBoundary(render: (props: Readonly<Record<string, unknown>>) => unknown, fallback: unknown, props?: Record<string, unknown>): ComponentResult

export interface StyleDefinition {
  readonly id: string
  readonly cssText: string
  readonly scopeSelector: string | null
}

export function css(strings: TemplateStringsArray, ...values: unknown[]): StyleDefinition
export function css(value: string): StyleDefinition
export function globalCss(strings: TemplateStringsArray, ...values: unknown[]): StyleDefinition
export function globalCss(value: string): StyleDefinition
export function cssVariables(values: Record<string, unknown>): unknown
export const defaultTokens: Readonly<Record<string, string>>
export function tokens(overrides?: Record<string, unknown>): unknown
export function theme(definition?: { light?: Record<string, unknown>; dark?: Record<string, unknown> } | Record<string, unknown>): StyleDefinition
export function utilityCss(): StyleDefinition
export function disposeStyle(definition: StyleDefinition, document?: Document): boolean

export interface MatrixPluginApi {
  on(point: MatrixPluginPoint, hook: (event: MatrixPluginEvent) => void): () => void
}

export type MatrixPluginPoint = 'renderer' | 'scheduler' | 'logger' | 'style'
export type MatrixPluginEvent = Record<string, unknown> & { type?: string }

export interface MatrixPlugin {
  install(api: MatrixPluginApi): void | (() => void)
}

export function usePlugin(plugin: MatrixPlugin): () => void

export interface RouteDefinition {
  path: string
  view?: (props: Record<string, unknown>) => unknown
  redirect?: string | ((context: {
    route: RouteDefinition & { params: Record<string, string> }
    path: string
    search: string
    hash: string
  }) => string)
  [key: string]: unknown
}

export interface NavigationContext {
  from: (RouteDefinition & { params: Record<string, string> }) | null
  to: (RouteDefinition & { params: Record<string, string> }) | null
  path: string
  search: string
  hash: string
}

export interface Router {
  readonly path: Signal<string>
  readonly search: Signal<string>
  readonly hash: Signal<string>
  readonly current: Computed<(RouteDefinition & { params: Record<string, string> }) | null>
  readonly routes: RouteDefinition[]
  start(): () => void
  stop(): void
  dispose(): void
  navigate(path: string, options?: { replace?: boolean; scroll?: boolean }): Promise<boolean>
  link(path: string): (event: MouseEvent) => Promise<boolean | void>
}

export function createRouter(routes?: RouteDefinition[], options?: {
  base?: string
  beforeEach?: (context: NavigationContext) => boolean | void | Promise<boolean | void>
  afterEach?: (context: NavigationContext & { route: NavigationContext['to'] }) => void | Promise<void>
}): Router
export function routerView(router: Router, fallback?: unknown): Computed<unknown>

export interface Form<T extends Record<string, unknown>> {
  fields: { [K in keyof T]: Signal<T[K]> }
  values: Computed<T>
  errors: Signal<Record<string, unknown>>
  valid: Computed<boolean>
  validate(): Record<string, unknown>
  reset(values?: Partial<T>): void
}

export function createForm<T extends Record<string, unknown>>(
  initialValues: T,
  validators?: Partial<{ [K in keyof T]: (value: T[K], values: T) => string | undefined }>
): Form<T>

export interface Resource<T> {
  status: Signal<'idle' | 'loading' | 'success' | 'error'>
  data: Signal<T | null>
  error: Signal<unknown>
  loading: Computed<boolean>
  reload(...args: unknown[]): Promise<T | undefined>
  dispose(): void
}

export function resource<T, Args extends unknown[] = unknown[]>(loader: (...args: [...Args, AbortSignal?]) => Promise<T>, options?: {
  initialValue?: T
  immediate?: boolean
  args?: Args
}): Resource<T>

export function setDevtoolsHook(hook?: (event: Record<string, unknown>) => void): void
export function watchDebug(source: Reactive<unknown>, name?: string, logger?: Console, options?: { warnAfter?: number; redact?: boolean }): () => void
export function inspect(source: Reactive<unknown>): Record<string, unknown>
export function inspectEffects(): Array<{ name: string; dependencies: number }>
export function createLogger(options?: { enabled?: boolean; logger?: Console; warnAfter?: number; redact?: boolean }): {
  watch(source: Reactive<unknown>, name?: string): () => void
  inspect(source: Reactive<unknown>): Record<string, unknown>
}
