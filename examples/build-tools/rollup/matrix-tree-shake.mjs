const matrixPackagePath = 'node_modules/@mickyballadelli/matrix/'

export function matrixTreeShake() {
  return {
    name: 'matrix-tree-shake',
    transform(code, id) {
      if (!id.includes(matrixPackagePath)) {
        return null
      }

      return {
        code,
        map: null,
        moduleSideEffects: false
      }
    }
  }
}
