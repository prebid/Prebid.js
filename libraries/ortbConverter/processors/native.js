import {isPlainObject, logError} from '../../../src/utils.js';
import {NATIVE} from '../../../src/mediaTypes.js';

const nativeEventTrackerMethodMap = {
  img: 1,
  js: 2
};

const nativeEventTrackerEventMap = {
  impression: 1,
  'viewable-mrc50': 2,
  'viewable-mrc100': 3,
  'viewable-video50': 4,
};

export function fillNativeImp(imp, bidRequest, context) {
  if (context.mediaType && context.mediaType !== NATIVE) return;
  const nativeReq = bidRequest.nativeOrtbRequest;
  if (nativeReq) {
    const defaultRequest = {
      // TODO: determine best way to pass these and if we allow defaults
      context: 1,
      plcmttype: 1,
      eventtrackers: [
        {event: 1, methods: [1]}
      ],
    };
    const request = Object.assign(defaultRequest, nativeReq)
    imp.native = {
      request: JSON.stringify(request),
      ver: '1.2'
    };
  }
}

export function fillNativeResponse(bidObject, bid, context) {
  if (bidObject.mediaType === NATIVE) {
    let ortb;
    if (typeof bid.adm === 'string') {
      ortb = bidObject.adm = JSON.parse(bid.adm);
    } else {
      ortb = bidObject.adm = bid.adm;
    }

    // ortb.imptrackers and ortb.jstracker are going to be deprecated. So, when we find
    // those properties, we're creating the equivalent eventtrackers and let prebid universal
    //  creative deal with it
    for (const imptracker of ortb.imptrackers || []) {
      ortb.eventtrackers.push({
        event: nativeEventTrackerEventMap.impression,
        method: nativeEventTrackerMethodMap.img,
        url: imptracker
      })
    }
    if (ortb.jstracker) {
      ortb.eventtrackers.push({
        event: nativeEventTrackerEventMap.impression,
        method: nativeEventTrackerMethodMap.js,
        url: ortb.jstracker
      })
    }

    if (isPlainObject(ortb) && Array.isArray(ortb.assets)) {
      bidObject.native = {
        ortb,
      }
    } else {
      logError('ORTB native response contained no assets');
    }
  }
}
