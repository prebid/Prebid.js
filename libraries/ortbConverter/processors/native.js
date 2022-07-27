import {isPlainObject, mergeDeep} from '../../../src/utils.js';
import {NATIVE} from '../../../src/mediaTypes.js';

export function fillNativeImp(imp, bidRequest, context) {
  if (context.mediaType && context.mediaType !== NATIVE) return;
  let nativeReq = bidRequest.nativeOrtbRequest;
  if (nativeReq) {
    nativeReq = mergeDeep({}, context.nativeRequest, nativeReq);
    imp.native = mergeDeep({}, {
      request: JSON.stringify(nativeReq),
      ver: nativeReq.ver
    }, imp.native)
  }
}

export function fillNativeResponse(bidResponse, bid) {
  if (bidResponse.mediaType === NATIVE) {
    let ortb;
    // TODO: do we need to set bidResponse.adm here?
    // Any consumers can now get the same object from bidResponse.native.ortb;
    // I could not find any, which raises the question - who is looking for this?
    if (typeof bid.adm === 'string') {
      ortb = bidResponse.adm = JSON.parse(bid.adm);
    } else {
      ortb = bidResponse.adm = bid.adm;
    }

    if (isPlainObject(ortb) && Array.isArray(ortb.assets)) {
      bidResponse.native = {
        ortb,
      }
    } else {
      throw new Error('ORTB native response contained no assets');
    }
  }
}
