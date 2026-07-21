// eslint-disable-next-line prebid/validate-imports
import { fpdValidator } from '../../libraries/fpdUtils/validateFpd.js';
import type { Logger } from "../../src/utils/logging.ts";

let getPubcidOptout = () => false;
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
    warn = logger.logWarn;
    const { isNumber, isEmpty, deepAccess, deepClone } = utils;
    // debugging inspects the data without altering it, so validate against a clone and
    // report invalid data as "Invalid" rather than "Filtered"
    ({ validateFpd } = fpdValidator({ logWarn: logger.logWarn, isNumber, isEmpty, deepAccess, deepClone }, { filter: false }));
  }
}

export function validateOrtb2ForDebug(ortb2) {
  if (ortb2 == null || validateFpd == null) return ortb2;
  return validateFpd(ortb2, '', '', getPubcidOptout());
}

export function validateOrtb2Fragments(ortb2Fragments) {
  if (ortb2Fragments == null) return;
  validateOrtb2ForDebug(ortb2Fragments.global);
  Object.values(ortb2Fragments.bidder || {}).forEach((ortb2) => {
    validateOrtb2ForDebug(ortb2);
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
