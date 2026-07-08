export const CORE_MOD = 'prebid-core';
export const METADATA_SUFFIX = '.metadata.js';
const MODULES_REQUIRING_METADATA = ['storageControl'];


export function requiresMetadata(module) {
  return MODULES_REQUIRING_METADATA.includes(module);
}

export function resolveDependencies(modules, depGraph, hasMetadata, requiresMeta = requiresMetadata) {
  const metadataChunks = modules.some(requiresMeta)
    ? modules.concat([CORE_MOD]).filter(hasMetadata).map(mod => `${mod}${METADATA_SUFFIX}`)
    : [];
  const chunks = new Set([
    `${CORE_MOD}.js`,
    ...modules.map(mod => `${mod}.js`),
    ...metadataChunks
  ]);
  function addDependenciesFor(chunk) {
    (depGraph[chunk] || []).forEach(dep => {
      chunks.add(dep);
      addDependenciesFor(dep);
    })
  }
  chunks.forEach(addDependenciesFor);
  return Array.from(chunks);
}
