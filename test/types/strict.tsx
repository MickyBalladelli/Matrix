/** @jsxImportSource @mickyballadelli/matrix */

import { component, computed, html, signal } from '@mickyballadelli/matrix'
import type { ComponentResult, Reactive, Signal } from '@mickyballadelli/matrix'

type CounterProps = {
  count: Reactive<number>
  label: string
}

const count = signal(0)

const Counter = (props: Readonly<CounterProps>): ComponentResult => {
  // @ts-expect-error Component props are read-only
  props.label = 'changed'
  // @ts-expect-error Component props are read-only
  props.count = signal(1)

  return component(() => html`<span>${props.label}: ${props.count}</span>`)
}

const reactiveProps = <Counter count={count} label="Count" />
const componentResult = component(Counter, { count, label: 'Count' })
// @ts-expect-error Component result props are read-only
componentResult.props.label = 'changed'
void reactiveProps
void componentResult

// @ts-expect-error Signal values are read-only through the public type
count.value = 1
count.set(1)
count.update(value => value + 1)

const doubled = computed(() => count.value * 2)
const computedProps = <Counter count={doubled} label="Doubled" />
void computedProps

// @ts-expect-error Computed values are read-only
doubled.value = 2

const validButton = (
  <button
    aria-label="Increment"
    className={signal('counter')}
    data-count={count}
    disabled={signal(false)}
    onClick={event => event.currentTarget.focus()}
    onClickPrevent={event => event.preventDefault()}
  />
)
void validButton

// @ts-expect-error Misspelled intrinsic attributes must fail
const misspelledAttribute = <button clasName="counter" />

// @ts-expect-error Invalid event names must fail
const invalidEvent = <button onClik={() => {}} />

const invalidReactiveProp = (
  // @ts-expect-error The component requires a reactive numeric prop
  <Counter count={42} label="Count" />
)
void invalidReactiveProp
