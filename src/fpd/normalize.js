import {deepEqual, deepSetValue, logWarn} from '../utils.js';
import {hook} from '../hook.js';

export const normalizeFPD = hook('sync', function(ortb2Fragments) {
  [
    normalizeEIDs,
    normalizeSchain
  ].forEach(normalizer => applyNormalizer(normalizer, ortb2Fragments));
  return ortb2Fragments;
})

function applyNormalizer(normalizer, ortb2Fragments) {
  ortb2Fragments.global = normalizer(ortb2Fragments.global, 'global FPD');
  Object.entries(ortb2Fragments.bidder).forEach(([bidder, ortb2]) => {
    ortb2Fragments.bidder[bidder] = normalizer(ortb2, `bidder '${bidder}' FPD`);
  })
}

export function normalizeEIDs(target, context) {
  if (!target) return target;
  const seen = [];
  const eids = [
    ...(target?.user?.eids ?? []).map(eid => [0, eid]),
    ...(target?.user?.ext?.eids ?? []).map(eid => [1, eid])
  ].filter(([source, eid]) => {
    if (seen.findIndex(([candidateSource, candidateEid]) =>
      source !== candidateSource && deepEqual(candidateEid, eid)
    ) > -1) {
      logWarn(`Found duplicate EID in user.eids and user.ext.eids (${context})`, eid)
      return false;
    } else {
      seen.push([source, eid]);
      return true;
    }
  });
  if (eids.length > 0) {
    deepSetValue(target, 'user.ext.eids', eids.map(([_, eid]) => eid));
  }
  delete target?.user?.eids;
  return target;
}

export function normalizeSchain(target, context) {
  if (!target) return target;
  const schain = target.source?.schain;
  const extSchain = target.source?.ext?.schain;
  if (schain != null && extSchain != null && !deepEqual(schain, extSchain)) {
    logWarn(`Conflicting source.schain and source.ext.schain (${context}), preferring source.schain`, {
      'source.schain': schain,
      'source.ext.schain': extSchain
    })
  }
  if ((schain ?? extSchain) != null) {
    deepSetValue(target, 'source.ext.schain', schain ?? extSchain);
  }
  delete target.source?.schain;
  return target;
}
