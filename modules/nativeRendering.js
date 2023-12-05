import {getRenderingData} from '../src/adRendering.js';
import {getNativeRenderingData, isNativeResponse} from '../src/native.js';
import {auctionManager} from '../src/auctionManager.js';

function getRenderingDataHook(next, bidResponse, options) {
  if (isNativeResponse(bidResponse)) {
    next.bail({
      native: getNativeRenderingData(bidResponse, auctionManager.index.getAdUnit(bidResponse))
    })
  } else {
    next(bidResponse, options)
  }
}

if (FEATURES.NATIVE) {
  getRenderingData.before(getRenderingDataHook)
}
