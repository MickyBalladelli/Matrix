/** @jsxImportSource @mickyballadelli/matrix */

import {
  component,
  computed,
  createRouter,
  css,
  html,
  mount,
  resource,
  signal
} from '@mickyballadelli/matrix'
import { batch } from '@mickyballadelli/matrix/reactivity'
import type { ComponentResult, Signal, StyleDefinition } from '@mickyballadelli/matrix'

const count: Signal<number> = signal(0)
const doubled = computed(() => count.value * 2)
const style: StyleDefinition = css`.counter { color: tomato; }`

const Counter = ({ value }: { value: Signal<number> }): ComponentResult => component(() => html`
  <button use:style=${style} @click=${() => value.update(current => current + 1)}>
    ${value} / ${doubled}
  </button>
`)

const view = <Counter value={count} />
const input = <input aria-label="Count" value={count} onInput={event => event.currentTarget.value} />

batch(() => count.set(2))
resource(async (_signal?: AbortSignal) => 1)

declare const host: Element
mount(() => [view, input], host)

declare const browserWindow: Window
if (browserWindow) {
  const router = createRouter([{ path: '/', view: () => view }])
  void router.navigate('/?page=1#counter')
}
