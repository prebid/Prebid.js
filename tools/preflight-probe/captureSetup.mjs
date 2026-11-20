// Loaded after the suite's own setup files (see vitest.config.mjs): records every Request the page constructs, and
// every request the spec's module returns from spec.buildRequests, then hands them to Node when the spec file ends.
/* eslint-disable jsdoc/require-jsdoc -- a maintainer script, not shipped code */
import { afterAll } from 'vitest'
import { commands } from 'vitest/browser'

const MAX = 200
const requests = []
const builds = []
const text = (body) => typeof body === 'string' ? body : body == null ? null : '[non-string body]'

const NativeRequest = window.Request
window.Request = class extends NativeRequest {
  constructor (input, init) {
    super(input, init)
    if (requests.length < MAX) {
      requests.push({ url: this.url, method: this.method, headers: [...this.headers], credentials: this.credentials, body: text(init?.body) })
    }
  }
}

function record (out) {
  [].concat(out ?? []).forEach(req => {
    if (builds.length >= MAX || typeof req?.url !== 'string') return
    let data = req.data
    try {
      data = typeof data === 'string' || data == null ? data : JSON.stringify(data)
    } catch {
      data = '[unserializable]'
    }
    const { contentType, customHeaders, withCredentials, endpointCompression } = req.options ?? {}
    builds.push({ url: req.url, method: req.method, data, options: { contentType, customHeaders, withCredentials, endpointCompression } })
  })
}

const moduleUrl = await commands.probeModuleUrl()
if (moduleUrl) {
  // Vite rewrites a dynamic import() in this file to add ?import, which would load a second instance of the module
  // beside the one the spec imports; a Function body is not rewritten
  // eslint-disable-next-line no-new-func
  const mod = await new Function('url', 'return import(url)')(moduleUrl)
  const spec = Object.values(mod).find(v => typeof v?.buildRequests === 'function')
  if (spec && !Object.isFrozen(spec)) {
    const buildRequests = spec.buildRequests
    spec.buildRequests = function (...args) {
      const out = buildRequests.apply(this, args)
      try {
        record(out)
      } catch {}
      return out
    }
  }
}

afterAll(async () => {
  await commands.writeProbeCapture(JSON.stringify({ requests, builds }))
})
