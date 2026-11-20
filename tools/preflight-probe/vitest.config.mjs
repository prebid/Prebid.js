// Runs the unit test specs with captureSetup.mjs added, to record the requests modules build from their own fixtures.
// See README.md. Not part of the test suite: the suite's config (test/vitest/vitest.config.mjs) never loads this.
import fs from 'node:fs'
import path from 'node:path'
import { mergeConfig } from 'vitest/config'
import base from '../../test/vitest/vitest.config.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
export const CAPTURE_DIR = path.join(import.meta.dirname, 'out', 'capture')
const specName = (testPath) => path.basename(testPath).replace(/_spec\.m?js$/, '')

export default mergeConfig(base, {
  test: {
    setupFiles: ['tools/preflight-probe/captureSetup.mjs'],
    browser: {
      commands: {
        // the module a spec file tests, as the URL the spec's own import resolves to
        probeModuleUrl (ctx) {
          const name = `${specName(ctx.testPath)}.js`
          return /BidAdapter\.js$/.test(name) && fs.existsSync(path.join(ROOT, 'dist/src/modules', name)) ? `/dist/src/modules/${name}` : null
        },
        writeProbeCapture (ctx, json) {
          fs.mkdirSync(CAPTURE_DIR, { recursive: true })
          fs.writeFileSync(path.join(CAPTURE_DIR, `${specName(ctx.testPath)}.json`), json)
        },
      },
    },
  },
})
