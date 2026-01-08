import {isPlainObject, logWarn, mergeDeep} from '../../../src/utils.js';
import {NATIVE} from '../../../src/mediaTypes.js';

export function fillNativeImp(imp, bidRequest, context) {
  if (context.mediaType && context.mediaType !== NATIVE) return;
  let nativeReq = bidRequest.nativeOrtbRequest;
  if (nativeReq) {
    nativeReq = Object.assign({}, context.nativeRequest, nativeReq);
    if (nativeReq.assets?.length) {
      imp.native = mergeDeep({}, {
        request: JSON.stringify(nativeReq),
        ver: nativeReq.ver
      }, imp.native)
    } else {
      logWarn('mediaTypes.native is set, but no assets were specified. Native request skipped.', bidRequest)
    }
  }
}

export function fillNativeResponse(bidResponse, bid) {
  if (bidResponse.mediaType === NATIVE) {
    let ortb;
    if (typeof bid.adm === 'string') {
      ortb = JSON.parse(bid.adm);
    } else {
      ortb = bid.adm;
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
