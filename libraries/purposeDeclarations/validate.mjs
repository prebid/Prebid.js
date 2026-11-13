// NOTE: this file is used both by the build system and Prebid runtime; the former
// needs the ".mjs" extension, but precompilation transforms this into a "normal" .js

export function validatePurposeDeclarations({ purposes, legIntPurposes, flexiblePurposes }) {
  const bothBases = purposes.concat(legIntPurposes).filter(purpose => purposes.includes(purpose) && legIntPurposes.includes(purpose));
  if (bothBases.length > 0) {
    return `declares both consent and LI for purposes ${bothBases.join(', ')}`;
  }
  const noBasis = flexiblePurposes.filter(purpose => !purposes.includes(purpose) && !legIntPurposes.includes(purpose));
  if (noBasis.length > 0) {
    return `declares purposes ${noBasis.join(', ')} as flexible, but no legal basis for them`;
  }
}
