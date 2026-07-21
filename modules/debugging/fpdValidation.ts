// eslint-disable-next-line prebid/validate-imports
import { fpdValidator } from '../../libraries/fpdUtils/validateFpd.js';
import type { Logger } from "../../src/utils/logging.ts";

let getPubcidOptout = () => false;
let utilsRef;
let warn: Logger['logWarn'];
let validateFpd;

export function configureFpdValidation({ getOptout, utils, logger }: {
  getOptout?: () => boolean;
  utils?: any;
  logger?: Logger;
} = {}) {
  if (getOptout) {
    getPubcidOptout = getOptout;
  }
  if (utils && logger) {
    utilsRef = utils;
    warn = logger.logWarn;
    const { isNumber, isEmpty, deepAccess } = utils;
    ({ validateFpd } = fpdValidator({ logWarn: logger.logWarn, isNumber, isEmpty, deepAccess }));
  }
}

export function validateOrtb2ForDebug(ortb2, { deepClone }: { deepClone?: <T>(obj: T) => T } = {}) {
  if (ortb2 == null || deepClone == null || validateFpd == null) return ortb2;
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
  // FPD validation is a debugging aid; never let it break the auction.
  try {
    validateOrtb2Fragments(req.ortb2Fragments);
  } catch (e) {
    warn('Error validating ortb2 first-party data', e);
  }
  next.call(this, req);
}
