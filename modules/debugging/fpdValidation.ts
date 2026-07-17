// eslint-disable-next-line prebid/validate-imports
import { validateFpd } from '../../libraries/fpdUtils/validateFpd.js';

let getPubcidOptout = () => false;
let configRef;
let utilsRef;

export function configureFpdValidation({ getOptout, config, utils }: {
  getOptout?: () => boolean;
  config?: any;
  utils?: any;
} = {}) {
  if (getOptout) {
    getPubcidOptout = getOptout;
  }
  if (config) {
    configRef = config;
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

export function validateConfiguredFpd() {
  if (configRef == null) return;
  const deepClone = utilsRef?.deepClone;
  // Assumption: enable debugging after ortb2 is already configured for global and bidders.
  validateOrtb2ForDebug(configRef.getAnyConfig('ortb2'), { deepClone });
  const bidderConfigs = configRef.getBidderConfig?.() || {};
  Object.values(bidderConfigs).forEach((cfg: any) => {
    validateOrtb2ForDebug(cfg?.ortb2, { deepClone });
  });
}
