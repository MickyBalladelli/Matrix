const dashboard = document.querySelector('#dashboard')

const formatNumber = value => Number.isFinite(value)
  ? new Intl.NumberFormat().format(value)
  : '—'

const formatMilliseconds = value => Number.isFinite(value)
  ? `${value.toFixed(3)} ms`
  : '—'

const cell = (row, value, className = '') => {
  const element = document.createElement('td')
  element.textContent = value
  if (className) {
    element.className = className
  }
  row.append(element)
}

const heading = (row, value) => {
  const element = document.createElement('th')
  element.scope = 'col'
  element.textContent = value
  row.append(element)
}

const table = (headers, rows) => {
  const element = document.createElement('table')
  const head = document.createElement('thead')
  const headerRow = document.createElement('tr')
  headers.forEach(header => heading(headerRow, header))
  head.append(headerRow)
  element.append(head)

  const body = document.createElement('tbody')
  rows.forEach(values => {
    const row = document.createElement('tr')
    values.forEach(value => cell(row, value))
    body.append(row)
  })
  element.append(body)
  return element
}

const section = (title, content) => {
  const element = document.createElement('section')
  const headingElement = document.createElement('h2')
  headingElement.textContent = title
  element.append(headingElement, content)
  return element
}

function render(history) {
  const runs = Array.isArray(history.runs) ? history.runs : []
  dashboard.textContent = ''

  if (runs.length === 0) {
    const message = document.createElement('p')
    message.textContent = 'No performance runs recorded yet. Run npm run bench:record.'
    dashboard.append(message)
    return
  }

  const latest = runs.at(-1)
  const title = document.createElement('h1')
  title.textContent = 'Matrix performance'
  dashboard.append(title)

  const intro = document.createElement('p')
  intro.className = 'muted'
  intro.textContent = `Latest run: ${latest.label} (${latest.phase}) on ${latest.recordedAt}`
  dashboard.append(intro)

  const cards = document.createElement('div')
  cards.className = 'cards'
  const cardValues = [
    ['Reactive updates', `${formatNumber(latest.reactivity?.updatesPerSecond)} / sec`],
    ['Reactive loop', formatMilliseconds(latest.reactivity?.milliseconds)],
    ['Recorded runs', formatNumber(runs.length)],
    ['Regressions', formatNumber(latest.regressions?.length ?? 0)]
  ]
  cardValues.forEach(([label, value]) => {
    const card = document.createElement('div')
    card.className = 'card'
    const name = document.createElement('span')
    name.className = 'muted'
    name.textContent = label
    const number = document.createElement('strong')
    number.textContent = value
    card.append(name, number)
    cards.append(card)
  })
  dashboard.append(cards)

  const sizeRows = Object.entries(latest.size ?? {}).map(([name, measurement]) => [
    name,
    `${formatNumber(measurement.brotliBytes)} B`,
    `${formatNumber(measurement.brotliLimit)} B`,
    `${formatNumber(measurement.gzipBytes)} B`
  ])
  dashboard.append(section('Bundle size', table(['Entry', 'Brotli', 'Limit', 'Gzip'], sizeRows)))

  const browserRows = []
  for (const report of latest.browser ?? []) {
    for (const measurement of report.measurements ?? []) {
      browserRows.push([
        report.browser,
        report.fixture,
        measurement.name,
        formatMilliseconds(measurement.milliseconds)
      ])
    }
  }
  dashboard.append(section('Browser benchmarks', table(['Browser', 'Fixture', 'Measurement', 'Time'], browserRows)))

  const runRows = [...runs].reverse().map(run => [
    run.label,
    run.phase,
    run.change ?? '—',
    run.recordedAt,
    formatNumber(run.regressions?.length ?? 0)
  ])
  dashboard.append(section('Run history', table(['Label', 'Phase', 'Change', 'Recorded', 'Regressions'], runRows)))

  const link = document.createElement('p')
  link.className = 'muted'
  const rawHistory = document.createElement('a')
  rawHistory.href = './performance-history.json'
  rawHistory.textContent = 'Open raw performance history'
  link.append(rawHistory)
  dashboard.append(link)
}

fetch('./performance-history.json')
  .then(response => {
    if (!response.ok) {
      throw new Error(`Could not load performance history (${response.status})`)
    }
    return response.json()
  })
  .then(render)
  .catch(error => {
    dashboard.textContent = `Performance history unavailable: ${error.message}`
  })
