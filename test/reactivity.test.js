import { test } from 'node:test'
import assert from 'node:assert/strict'
import { batch, component, computed, configure, createDevtools, createForm, createScope, effect, getRuntimeConfig, onCleanup, signal, usePlugin } from '../src/index.js'

test('signal and effect follow a dependency', () => {
  const count = signal(0)
  const values = []
  const stop = effect(() => values.push(count.value))

  count.value = 1
  stop()
  count.value = 2

  assert.deepEqual(values, [0, 1])
})

test('signal accepts a custom comparator', () => {
  const source = signal({ count: 0 }, { equals: (left, right) => left.count === right.count })
  let runs = 0

  effect(() => {
    source.value
    runs += 1
  })

  source.value = { count: 0 }
  source.value = { count: 1 }

  assert.equal(runs, 2)
})

test('signal respects Object.is for NaN, 0, and -0', () => {
  const source = signal(NaN)
  let runs = 0

  effect(() => {
    source.value
    runs += 1
  })

  source.value = NaN
  source.value = -0
  source.value = 0

  assert.equal(runs, 3)
})

test('multiple Effects receive the same update', () => {
  const source = signal(0)
  let firstRuns = 0
  let secondRuns = 0

  effect(() => {
    source.value
    firstRuns += 1
  })
  effect(() => {
    source.value
    secondRuns += 1
  })

  source.value = 1

  assert.equal(firstRuns, 2)
  assert.equal(secondRuns, 2)
})

test('conditional dependencies are removed', () => {
  const enabled = signal(true)
  const first = signal('first')
  const second = signal('second')
  const values = []

  effect(() => {
    values.push(enabled.value ? first.value : second.value)
  }, { warnOnDependencyChange: false })

  enabled.value = false
  first.value = 'ignored'
  second.value = 'used'

  assert.deepEqual(values, ['first', 'second', 'used'])
})

test('component and option errors suggest a fix', () => {
  assert.throws(() => component(42), error => {
    assert(error instanceof TypeError)
    assert.match(error.message, /Received number \(42\)/)
    assert.match(error.message, /component\(props => html/)
    return true
  })

  assert.throws(() => effect(() => {}, { flush: 'micotask' }), /Did you mean "microtask"\?/)
})

test('dependency changes warn about stale closure risk', () => {
  const events = []
  const stopPlugin = usePlugin({
    install(api) {
      return api.on('logger', event => events.push(event))
    }
  })
  const enabled = signal(true)
  const first = signal('first')
  const second = signal('second')
  const stop = effect(() => enabled.value ? first.value : second.value, { name: 'conditionalEffect' })

  enabled.value = false
  stop()
  stopPlugin()

  const warning = events.find(event => event.type === 'effect:dependencies-changed')
  assert(warning, 'A dependency change must emit a diagnostic')
  assert.equal(warning.name, 'conditionalEffect')
  assert.equal(warning.staleClosureRisk, true)
})

test('development mode reports untracked reads and mutations', () => {
  const previousConfig = getRuntimeConfig()
  const events = []
  const stopPlugin = usePlugin({
    install(api) {
      return api.on('logger', event => events.push(event))
    }
  })

  configure({ development: true })

  try {
    const outside = signal(1, { name: 'outside' })
    assert.equal(outside.value, 1)

    const props = component(() => null, { label: 'grog' }).props
    assert.throws(() => {
      props.label = 'changed'
    }, /Component props are read-only/)

    const form = createForm({ email: '' }, {
      email: value => value ? undefined : 'required'
    }, { name: 'signup' })
    assert.equal(form.validateField('email'), 'required')
    assert.equal(form.inspectField('email').valid, false)
    assert.equal(form.inspect().name, 'signup')
  } finally {
    stopPlugin()
    configure(previousConfig)
  }

  assert(events.some(event => event.type === 'reactivity:untracked-read' && event.name === 'outside'), 'An out-of-context reactive read must emit a diagnostic')
  assert(events.some(event => event.type === 'component:prop-mutation'), 'A props mutation must emit a diagnostic')
})

test('DevTools expose the reactive graph and local timeline', () => {
  const devtools = createDevtools({ globalName: null, redact: false })
  const source = signal(1, { name: 'source' })
  const doubled = computed(() => source.value * 2, { name: 'doubled' })
  const stop = effect(() => doubled.value, { name: 'panelEffect' })

  const snapshot = devtools.snapshot()
  assert(snapshot.sources.some(item => item.name === 'source' && item.value === 1), 'DevTools must inspect Signals')
  assert(snapshot.sources.some(item => item.name === 'doubled' && item.value === 2), 'DevTools must inspect Computeds')
  assert(snapshot.effects.some(item => item.name === 'panelEffect' && item.dependencyNames.includes('doubled')), 'DevTools must expose Effect dependencies')

  devtools.timeline.start()
  source.value = 2
  devtools.timeline.stop()
  assert(devtools.timeline.snapshot().some(item => item.point === 'scheduler'), 'The timeline must record scheduler events')

  stop()
  doubled.dispose()
  source.dispose()
  devtools.dispose()
})

test('computed is cached and recalculates after invalidation', () => {
  const source = signal(2)
  let runs = 0
  const doubled = computed(() => {
    runs += 1
    return source.value * 2
  })

  assert.equal(runs, 0)
  assert.equal(doubled.value, 4)
  assert.equal(doubled.value, 4)
  assert.equal(runs, 1)

  source.value = 3
  assert.equal(doubled.value, 6)
  assert.equal(runs, 2)
})

test('computed values can be nested', () => {
  const source = signal(2)
  const doubled = computed(() => source.value * 2)
  const label = computed(() => `value:${doubled.value}`)

  assert.equal(label.value, 'value:4')
  source.value = 4
  assert.equal(label.value, 'value:8')
})

test('a computed value can delegate its writes', () => {
  const source = signal(1)
  const doubled = computed({
    get: () => source.value * 2,
    set: value => {
      source.value = value / 2
    }
  })

  doubled.value = 10
  assert.equal(source.value, 5)
  assert.equal(doubled.value, 10)
})

test('Effect cleanup runs before its next execution', () => {
  const source = signal(0)
  const cleanups = []

  effect(() => {
    source.value
    return () => cleanups.push(source.peek())
  })

  source.value = 1

  assert.deepEqual(cleanups, [1])
})

test('batch groups Effects', () => {
  const first = signal(0)
  const second = signal(0)
  let runs = 0

  effect(() => {
    first.value
    second.value
    runs += 1
  })

  batch(() => {
    first.value = 1
    second.value = 1
  })

  assert.equal(runs, 2)
})

test('batch also groups Computed invalidations', () => {
  const source = signal(0)
  let computedRuns = 0
  let effectRuns = 0
  const doubled = computed(() => {
    computedRuns += 1
    return source.value * 2
  })
  const stop = effect(() => {
    doubled.value
    effectRuns += 1
  })

  batch(() => {
    source.value = 1
    source.value = 2
  })

  assert.equal(computedRuns, 2)
  assert.equal(effectRuns, 2)
  assert.equal(doubled.value, 4)

  stop()
  doubled.dispose()
  source.dispose()
})

test('a scope disposes its Effects', () => {
  const scope = createScope()
  const source = signal(0)
  let runs = 0

  scope.run(() => effect(() => {
    source.value
    runs += 1
  }))

  scope.dispose()
  source.value = 1

  assert.equal(runs, 1)
})

test('dispose removes a signal subscription', () => {
  const source = signal(0)
  const stop = effect(() => source.value)

  source.dispose()

  assert.equal(source._source.subscribers.size, 0)
  assert.throws(() => source.value, /disposed signal/)
  stop()
})

test('an error does not block other subscribers', () => {
  const source = signal(0)
  let safeRuns = 0

  effect(() => {
    if (source.value === 1) {
      throw new Error('expected')
    }
  })
  effect(() => {
    source.value
    safeRuns += 1
  })

  assert.throws(() => {
    source.value = 1
  }, /expected/)
  assert.equal(safeRuns, 2)
})

test('reactive cycles are limited', () => {
  const source = signal(0)

  assert.throws(() => {
    effect(() => {
      source.value
      source.value += 1
    })
  }, /Reactive loop detected/)
})

test('an Effect can create another Effect', () => {
  const outerSource = signal(false)
  const innerSource = signal(0)
  let innerRuns = 0
  let stopInner

  effect(() => {
    if (outerSource.value && !stopInner) {
      stopInner = effect(() => {
        innerSource.value
        innerRuns += 1
      })
    }
  })

  outerSource.value = true
  innerSource.value = 1
  stopInner?.()

  assert.equal(innerRuns, 2)
})

test('an exception cleans up dependencies from the failed computation', () => {
  const source = signal(0)
  const other = signal(0)
  let stop

  assert.throws(() => {
    stop = effect(() => {
      source.value
      other.value
      throw new Error('expected')
    })
  }, /expected/)

  assert.equal(source._source.subscribers.size, 0)
  assert.equal(other._source.subscribers.size, 0)
  stop?.()
})

test('a scope cleans up all children in order', () => {
  const scope = createScope()
  const child = createScope(scope)
  const source = signal(0)
  const order = []

  scope.run(() => {
    effect(() => {
      source.value
      return () => order.push('parent effect')
    })
    onCleanup(() => order.push('parent cleanup'))
  })

  child.run(() => {
    effect(() => {
      source.value
      return () => order.push('child effect')
    })
    onCleanup(() => order.push('child cleanup'))
  })

  scope.dispose()

  assert.deepEqual(order, [
    'child effect',
    'child cleanup',
    'parent effect',
    'parent cleanup'
  ])
})

test('a failed cleanup does not block later cleanups', () => {
  const scope = createScope()
  const order = []

  scope.add(() => {
    order.push('first')
    throw new Error('first cleanup')
  })
  scope.add(() => order.push('second'))

  assert.throws(() => scope.dispose(), /first cleanup/)
  assert.deepEqual(order, ['first', 'second'])
})

test('an errored Effect is removed from its dependencies', () => {
  const source = signal(0)
  const stop = effect(() => {
    if (source.value === 1) {
      throw new Error('expected')
    }
  })

  assert.throws(() => {
    source.value = 1
  }, /expected/)

  assert.equal(source._source.subscribers.size, 0)
  stop()
})

test('batch supports many concurrent updates', () => {
  const source = signal(0)
  let runs = 0

  effect(() => {
    source.value
    runs += 1
  })

  batch(() => {
    for (let index = 1; index <= 1000; index += 1) {
      source.value = index
    }
  })

  assert.equal(source.value, 1000)
  assert.equal(runs, 2)
})
