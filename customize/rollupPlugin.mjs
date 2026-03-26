import path from 'node:path'
import { getBuildOptionsVirtualModuleId, renderBuildOptionsVirtualModule } from './virtualBuildOptions.mjs'

function stripQuery(id) {
  const queryIndex = id.indexOf('?')
  return queryIndex === -1 ? id : id.slice(0, queryIndex)
}

function normalizeId(id) {
  const clean = stripQuery(id)
  if (clean.startsWith('/@fs/')) {
    return path.normalize(clean.slice(4))
  }
  return path.normalize(clean)
}

export default function prebidBuildOptions(options = {}) {
  const buildOptionsModule = path.normalize(getBuildOptionsVirtualModuleId())

  return {
    name: 'prebid-build-options',
    resolveId(source, importer) {
      const cleanSource = stripQuery(source)
      if (path.isAbsolute(cleanSource) && normalizeId(cleanSource) === buildOptionsModule) {
        return buildOptionsModule
      }
      if (importer) {
        const resolved = path.resolve(path.dirname(stripQuery(importer)), cleanSource)
        if (normalizeId(resolved) === buildOptionsModule) {
          return buildOptionsModule
        }
      }
      return null
    },
    async load(id) {
      if (normalizeId(id) !== buildOptionsModule) {
        return null
      }
      return renderBuildOptionsVirtualModule(options)
    }
  }
}
