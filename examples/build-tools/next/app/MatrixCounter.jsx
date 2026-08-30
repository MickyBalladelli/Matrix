'use client'

import { useEffect, useRef } from 'react'
import { html, mount, signal } from '@mickyballadelli/matrix'

export default function MatrixCounter() {
  const host = useRef(null)

  useEffect(() => {
    const count = signal(0)
    const app = mount(() => html`
      <button @click=${() => count.update(value => value + 1)}>${count}</button>
    `, host.current)

    return () => {
      app.unmount()
      count.dispose()
    }
  }, [])

  return <div ref={host} />
}
