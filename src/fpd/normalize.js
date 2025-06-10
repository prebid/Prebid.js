import {deepEqual, deepSetValue} from '../utils.js';

export function normalizeFPD(ortb2Fragments) {
  applyNormalizer(normalizeEIDs, ortb2Fragments);
  return ortb2Fragments;
}

function applyNormalizer(normalizer, ortb2Fragments) {
  ortb2Fragments.global = normalizer(ortb2Fragments.global);
  Object.entries(ortb2Fragments.bidder).forEach(([bidder, ortb2]) => {
    ortb2Fragments.bidder[bidder] = normalizer(ortb2);
  })
}

export function normalizeEIDs(target) {
  if (!target) return target;
  const seen = [];
  const eids = [
    ...(target?.user?.eids ?? []).map(eid => [0, eid]),
    ...(target?.user?.ext?.eids ?? []).map(eid => [1, eid])
  ].filter(([source, eid]) => {
    if (seen.findIndex(([candidateSource, candidateEid]) =>
      source !== candidateSource && deepEqual(candidateEid, eid)
    ) > -1) {
      return false;
    } else {
      seen.push([source, eid]);
      return true;
    }
  });

  deepSetValue(target, 'user.ext.eids', eids.map(([_, eid]) => eid));
  delete target?.user?.eids;
  return target;
}
