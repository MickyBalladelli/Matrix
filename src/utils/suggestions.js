export function suggestClosest(value, candidates) {
  if (typeof value !== 'string' || value.length === 0) {
    return ''
  }

  const normalizedValue = value.toLowerCase()
  let closest
  let closestDistance = Infinity

  for (const candidate of candidates) {
    const distance = editDistance(normalizedValue, candidate.toLowerCase())
    if (distance < closestDistance) {
      closest = candidate
      closestDistance = distance
    }
  }

  const threshold = Math.max(1, Math.floor(normalizedValue.length / 3))
  return closest && closestDistance <= threshold
    ? ` Did you mean "${closest}"?`
    : ''
}

function editDistance(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0]
    row[0] = leftIndex

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const current = row[rightIndex]
      row[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? previous
        : Math.min(previous, row[rightIndex - 1], current) + 1
      previous = current
    }
  }

  return row[right.length]
}
