import { getBuildOptions, getBuildOptionsModule } from './buildOptions.mjs'

export function getBuildOptionsVirtualModuleId() {
  return getBuildOptionsModule()
}

export async function renderBuildOptionsVirtualModule(options = {}) {
  const buildOptions = await getBuildOptions(options)
  return `export default ${JSON.stringify(buildOptions, null, 2)};`
}
