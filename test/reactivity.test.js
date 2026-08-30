import { test } from 'node:test'
import assert from 'node:assert/strict'
import { batch, component, computed, createScope, effect, onCleanup, signal, usePlugin } from '../src/index.js'

test('signal et effect suivent une dépendance', () => {
  const count = signal(0)
  const values = []
  const stop = effect(() => values.push(count.value))

  count.value = 1
  stop()
  count.value = 2

  assert.deepEqual(values, [0, 1])
})

test('signal accepte une comparaison personnalisée', () => {
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

test('signal respecte Object.is pour NaN, 0 et -0', () => {
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

test('plusieurs Effects reçoivent la même mise à jour', () => {
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

test('les dépendances conditionnelles sont retirées', () => {
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

test('les erreurs de composant et options suggèrent une correction', () => {
  assert.throws(() => component(42), error => {
    assert(error instanceof TypeError)
    assert.match(error.message, /Received number \(42\)/)
    assert.match(error.message, /component\(props => html/)
    return true
  })

  assert.throws(() => effect(() => {}, { flush: 'micotask' }), /Did you mean "microtask"\?/)
})

test('un changement de dépendances signale le risque de fermeture obsolète', () => {
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
  assert(warning, 'Un changement de dépendances doit produire un diagnostic')
  assert.equal(warning.name, 'conditionalEffect')
  assert.equal(warning.staleClosureRisk, true)
})

test('computed est cache et se recalcule après invalidation', () => {
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

test('les computed peuvent être imbriqués', () => {
  const source = signal(2)
  const doubled = computed(() => source.value * 2)
  const label = computed(() => `value:${doubled.value}`)

  assert.equal(label.value, 'value:4')
  source.value = 4
  assert.equal(label.value, 'value:8')
})

test('un computed peut déléguer son écriture', () => {
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

test('le nettoyage d’un Effect est appelé avant sa prochaine exécution', () => {
  const source = signal(0)
  const cleanups = []

  effect(() => {
    source.value
    return () => cleanups.push(source.peek())
  })

  source.value = 1

  assert.deepEqual(cleanups, [1])
})

test('batch regroupe les Effects', () => {
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

test('un scope dispose ses Effects', () => {
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

test('dispose retire les abonnements d’un signal', () => {
  const source = signal(0)
  const stop = effect(() => source.value)

  source.dispose()

  assert.equal(source._source.subscribers.size, 0)
  assert.throws(() => source.value, /disposed signal/)
  stop()
})

test('une erreur ne bloque pas les autres abonnés', () => {
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

test('les cycles réactifs sont limités', () => {
  const source = signal(0)

  assert.throws(() => {
    effect(() => {
      source.value
      source.value += 1
    })
  }, /Reactive loop detected/)
})

test('un Effect peut créer un autre Effect', () => {
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

test('une exception nettoie les dépendances de la tentative de calcul', () => {
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

test('un scope nettoie tous ses enfants et respecte leur ordre', () => {
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

test('un cleanup qui échoue ne bloque pas les suivants', () => {
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

test('un effet en erreur est retiré de ses dépendances', () => {
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

test('batch supporte beaucoup de mises à jour concurrentes', () => {
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
