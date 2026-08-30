import { h, render } from 'preact'
import { useState } from 'preact/hooks'

export function createAdapter(container) {
  let setCount

  function Counter() {
    const [count, updateCount] = useState(0)
    setCount = updateCount
    return h('button', null, count)
  }

  render(h(Counter), container)

  return {
    update(iterations) {
      for (let index = 0; index < iterations; index += 1) {
        setCount(value => value + 1)
      }
    },
    dispose() {
      render(null, container)
    }
  }
}
