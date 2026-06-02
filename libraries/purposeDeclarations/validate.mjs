// NOTE: this file is used both by the build system and Prebid runtime; the former
// needs the ".mjs" extension, but precompilation transforms this into a "normal" .js

export function validatePurposeDeclarations({purposes, legIntPurposes, flexiblePurposes}) {
  purposes = new Set(purposes);
  legIntPurposes = new Set(legIntPurposes);
  flexiblePurposes = new Set(flexiblePurposes);
  const bothBases = purposes.intersection(legIntPurposes);
  if (bothBases.size > 0) {
    return `declares both consent and LI for purposes ${Array.from(bothBases).join(', ')}`
  }
  const noBasis = flexiblePurposes.difference(purposes).difference(legIntPurposes);
  if (noBasis.size > 0) {
    return `declares purposes ${Array.from(noBasis).join(', ')} as flexible, but no legal basis for them`
  }
}
