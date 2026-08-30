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
    'full replacement reference': 500
  })
})
