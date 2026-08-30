import { test } from 'node:test'
import assert from 'node:assert/strict'
import { batch, computed, createRouter, delegate, effect, mount, runInWorker, signal } from '../src/index.js'

test('signals and Computeds work in Node without a DOM', () => {
  assert.equal(typeof globalThis.document, 'undefined')
  assert.equal(typeof globalThis.window, 'undefined')

  const source = signal(2)
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
    source.value = 3
    source.value = 4
  })

  assert.equal(doubled.value, 8)
  assert.equal(computedRuns, 2)
  assert.equal(effectRuns, 2)

  stop()
  doubled.dispose()
  source.dispose()
})

test('browser-only APIs fail clearly in Node', () => {
  assert.throws(() => createRouter(), /createRouter\(\) must be used in a browser/)
  assert.throws(() => mount(null, null), /mount\(\) expects a DOM container/)
  assert.throws(() => delegate(null, 'click', 'button', () => {}), /delegate\(\) expects a DOM element/)
  assert.throws(() => runInWorker(() => 1, null), /runInWorker\(\) requires a browser Worker/)
})
