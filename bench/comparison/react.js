import React, { useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

export function createAdapter(container) {
  let setCount
  const root = createRoot(container)

  function Counter() {
    const [count, updateCount] = useState(0)
    setCount = updateCount
    return React.createElement('button', null, count)
  }

  flushSync(() => root.render(React.createElement(Counter)))

  return {
    update(iterations) {
      for (let index = 0; index < iterations; index += 1) {
        flushSync(() => setCount(value => value + 1))
      }
    },
    dispose() {
      flushSync(() => root.unmount())
    }
  }
}
