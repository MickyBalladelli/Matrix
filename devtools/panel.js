const browserApi = globalThis.browser ?? globalThis.chrome
const refreshButton = document.querySelector('#refresh')
const timelineButton = document.querySelector('#timeline')
let timelineRecording = false

function evaluate(expression) {
  return new Promise((resolve, reject) => {
    browserApi.devtools.inspectedWindow.eval(expression, (value, exception) => {
      if (exception) {
        reject(new Error(exception.description || exception.value || 'Matrix DevTools evaluation failed'))
        return
      }
      resolve(value)
    })
  })
}

function print(id, value) {
  document.querySelector(id).textContent = JSON.stringify(value ?? [], null, 2)
}

async function refresh() {
  try {
    const snapshot = await evaluate('globalThis.__MATRIX_DEVTOOLS__?.snapshot?.()')
    if (!snapshot) {
      document.querySelector('#status').textContent = 'Matrix DevTools not installed on this page. Call createDevtools() in the app.'
      return
    }

    document.querySelector('#status').textContent = `Matrix runtime v${snapshot.version} · ${snapshot.capturedAt}`
    print('#components', snapshot.components)
    print('#sources', snapshot.sources)
    print('#effects', snapshot.effects)
    print('#routers', snapshot.routers)
    print('#timeline-output', snapshot.timeline)
  } catch (error) {
    document.querySelector('#status').textContent = error.message
  }
}

async function toggleTimeline() {
  const method = timelineRecording ? 'stop' : 'start'
  try {
    await evaluate(`globalThis.__MATRIX_DEVTOOLS__?.timeline?.${method}?.()`)
    timelineRecording = !timelineRecording
    timelineButton.textContent = timelineRecording ? 'Stop timeline' : 'Start timeline'
    await refresh()
  } catch (error) {
    document.querySelector('#status').textContent = error.message
  }
}

refreshButton.addEventListener('click', refresh)
timelineButton.addEventListener('click', toggleTimeline)
refresh()
