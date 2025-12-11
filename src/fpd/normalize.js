import {deepEqual, deepSetValue, deepAccess, logWarn} from '../utils.js';
import {hook} from '../hook.js';

export const normalizeFPD = hook('sync', function(ortb2Fragments) {
  [
    normalizeEIDs,
    makeNormalizer('source.schain', 'source.ext.schain', 'source.ext.schain'),
    makeNormalizer('device.sua', 'device.ext.sua', 'device.sua'),
    makeNormalizer('regs.gdpr', 'regs.ext.gdpr', 'regs.ext.gdpr'),
    makeNormalizer('user.consent', 'user.ext.consent', 'user.ext.consent'),
    makeNormalizer('regs.us_privacy', 'regs.ext.us_privacy', 'regs.ext.us_privacy'),
    makeNormalizer('regs.gpp', 'regs.ext.gpp', 'regs.gpp'),
    makeNormalizer('regs.gpp_sid', 'regs.ext.gpp_sid', 'regs.gpp_sid'),
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

export function makeNormalizer(preferred, fallback, dest) {
  if (dest !== preferred && dest !== fallback) throw new Error('invalid argument');
  const delPath = (dest === preferred ? fallback : preferred).split('.');
  const delProp = delPath.pop();
  const delTarget = delPath.join('.');

  return function (ortb2, context) {
    if (!ortb2) return ortb2;
    const prefData = deepAccess(ortb2, preferred);
    const fallbackData = deepAccess(ortb2, fallback);
    if (prefData != null && fallbackData != null && !deepEqual(prefData, fallbackData)) {
      logWarn(`Conflicting ${preferred} and ${fallback} (${context}), preferring ${preferred}`, {
        [preferred]: prefData,
        [fallback]: fallbackData
      })
    }
    if ((prefData ?? fallbackData) != null) {
      deepSetValue(ortb2, dest, prefData ?? fallbackData);
    }
    const ignoredTarget = deepAccess(ortb2, delTarget);
    if (ignoredTarget != null && typeof ignoredTarget === 'object') {
      delete ignoredTarget[delProp];
    }
    return ortb2;
  }
}
