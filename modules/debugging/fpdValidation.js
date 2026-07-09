// eslint-disable-next-line prebid/validate-imports
import { validateFpd } from '../../libraries/fpdUtils/validateFpd.js';

let getPubcidOptout = () => false;

export function configureFpdValidation({ getOptout } = {}) {
  if (getOptout) {
    getPubcidOptout = getOptout;
  }
}

export function validateInterceptedBidFpd(bidRequest) {
  if (!bidRequest?.ortb2) {
    return;
  }
  validateFpd(bidRequest.ortb2, '', '', getPubcidOptout());
}
