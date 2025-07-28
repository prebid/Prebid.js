import { getBuildOptions, getBuildOptionsModule } from './buildOptions.mjs'

/**
 *
 * @param source
 */
export default async function (source) {
  if (this.resourcePath !== getBuildOptionsModule()) {
    return source
  }
  return `export default ${JSON.stringify(await getBuildOptions(this.getOptions()), null, 2)};`
}
