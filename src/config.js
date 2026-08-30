const DEFAULT_CONFIG = {
  development: false,
  bindingWarningThreshold: 50
}

let runtimeConfig = Object.freeze({ ...DEFAULT_CONFIG })

export function configure(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('configure() expects an options object')
  }

  const nextConfig = { ...runtimeConfig }

  if ('development' in options) {
    if (typeof options.development !== 'boolean') {
      throw new TypeError('configure() expects development to be a boolean')
    }
    nextConfig.development = options.development
  }

  if ('bindingWarningThreshold' in options) {
    const threshold = options.bindingWarningThreshold
    if (!Number.isInteger(threshold) || threshold < 1) {
      throw new TypeError('configure() expects bindingWarningThreshold to be a positive integer')
    }
    nextConfig.bindingWarningThreshold = threshold
  }

  runtimeConfig = Object.freeze(nextConfig)
  return runtimeConfig
}

export function getRuntimeConfig() {
  return runtimeConfig
}

export function isDevelopment() {
  return runtimeConfig.development
}
