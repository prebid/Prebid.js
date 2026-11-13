import { getBuildOptionsVirtualModuleId, renderBuildOptionsVirtualModule } from './virtualBuildOptions.mjs'

export default async function (source) {
  if (this.resourcePath !== getBuildOptionsVirtualModuleId()) {
    return source
  }
  return renderBuildOptionsVirtualModule(this.getOptions())
}
