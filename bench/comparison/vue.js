import { createApp, h, nextTick, ref } from 'vue'

export function createAdapter(container) {
  let count
  const app = createApp({
    setup() {
      count = ref(0)
      return () => h('button', count.value)
    }
  })
  app.mount(container)

  return {
    async update(iterations) {
      for (let index = 0; index < iterations; index += 1) {
        count.value = index + 1
      }
      await nextTick()
    },
    dispose() {
      app.unmount()
    }
  }
}
