export const performanceBudgets = Object.freeze({
  reactivity: Object.freeze({
    minUpdatesPerSecond: 100000,
    maxSubscriberUpdateMilliseconds: 100
  }),
  browser: Object.freeze({
    'mount initial': 500,
    'single signal update': 100,
    'keyed list mount 1000': 1000,
    'keyed list reorder 1000': 1000,
    'full replacement reference': 500,
    'keyed list mount 10000': 10000,
    'keyed list update 10000': 10000,
    'keyed list unmount 10000': 5000,
    'css variables update 100': 3000,
    'rapid signal updates 100 subscribers': 3000
  })
})
