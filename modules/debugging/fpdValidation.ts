// eslint-disable-next-line prebid/validate-imports
import { validateFpd } from '../../libraries/fpdUtils/validateFpd.js';

let getPubcidOptout = () => false;
let utilsRef;

export function configureFpdValidation({ getOptout, utils }: {
  getOptout?: () => boolean;
  utils?: any;
} = {}) {
  if (getOptout) {
    getPubcidOptout = getOptout;
  }
  if (utils) {
    utilsRef = utils;
  }
}

export function validateOrtb2ForDebug(ortb2, { deepClone }: { deepClone?: <T>(obj: T) => T } = {}) {
  if (ortb2 == null || deepClone == null) return ortb2;
  validateFpd(deepClone(ortb2), '', '', getPubcidOptout());
  return ortb2;
}

export function validateOrtb2Fragments(ortb2Fragments) {
  if (ortb2Fragments == null) return;
  const deepClone = utilsRef?.deepClone;
  validateOrtb2ForDebug(ortb2Fragments.global, { deepClone });
  Object.values(ortb2Fragments.bidder || {}).forEach((ortb2) => {
    validateOrtb2ForDebug(ortb2, { deepClone });
  });
}

export function startAuctionFpdValidationHook(next, req) {
  validateOrtb2Fragments(req.ortb2Fragments);
  next.call(this, req);
}
