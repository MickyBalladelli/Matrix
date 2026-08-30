import { useEffect, useRef } from 'react'
import { html, mount, signal } from '@mickyballadelli/matrix'

export default function Index() {
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

  return (
    <main>
      <h1>Matrix + Remix</h1>
      <div ref={host} />
    </main>
  )
}
