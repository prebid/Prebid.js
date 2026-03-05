import path from 'path'
import { validate } from 'schema-utils'

const boModule = path.resolve(import.meta.dirname, '../dist/src/buildOptions.mjs')

/**
 * Resolve the absolute path of the default build options module.
 * @returns {string} Absolute path to the generated build options module.
 */
export function getBuildOptionsModule () {
  return boModule
}

const schema = {
  type: 'object',
  properties: {
    globalVarName: {
      type: 'string',
      description: 'Prebid global variable name. Default is "pbjs"',
    },
    defineGlobal: {
      type: 'boolean',
      description: 'If false, do not set a global variable. Default is true.'
    },
    distUrlBase: {
      type: 'string',
      description: 'Base URL to use for dynamically loaded modules (e.g. debugging-standalone.js)'
    }
  }
}

/**
 * Validate and load build options overrides.
 * @param {object} [options] user supplied overrides
 * @returns {Promise<object>} Promise resolving to merged build options.
 */
export function getBuildOptions (options = {}) {
  validate(schema, options, {
    name: 'Prebid build options',
  })
  const overrides = {}
  if (options.globalVarName != null) {
    overrides.pbGlobal = options.globalVarName
  }
  ['defineGlobal', 'distUrlBase'].forEach((option) => {
    if (options[option] != null) {
      overrides[option] = options[option]
    }
  })
  return import(getBuildOptionsModule())
    .then(({ default: defaultOptions }) => {
      return Object.assign(
        {},
        defaultOptions,
        overrides
      )
    })
}
