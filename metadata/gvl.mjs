const GVL_URL = 'https://vendor-list.consensu.org/v3/vendor-list.json';

export const getGvl = (() => {
  let gvl;
  return function () {
    if (gvl == null) {
      gvl = fetch(GVL_URL)
        .then(resp => resp.json())
        .catch((err) => {
          gvl = null;
          return Promise.reject(err);
        });
    }
    return gvl;
  };
})();

export function isValidGvlId(gvlId, gvl = getGvl) {
  return gvl().then(gvl => {
    return !!(gvl.vendors[gvlId] && !gvl.vendors[gvlId].deletedDate);
  })
}

export function validatePurposeDeclarations({purposes, legIntPurposes, flexiblePurposes}) {
  // tcfControl assumes the GVL follows its own spec, trust but verify
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

export function getPurposes(gvlId, gvl = getGvl) {
  return gvl().then(gvl => {
    const {purposes, legIntPurposes, flexiblePurposes, specialFeatures} = gvl.vendors[gvlId];
    return {
      purposes, legIntPurposes, flexiblePurposes, specialFeatures
    }
  })

}
