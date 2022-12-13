import {auctionManager} from '../../../src/auctionManager.js';
import {deepSetValue} from '../../../src/utils.js';

export function setImpAdUnitCode(imp, bidRequest, context, { adUnit, index = auctionManager.index } = {}) {
  adUnit = adUnit || index.getAdUnit(bidRequest);

  if (adUnit) {
    deepSetValue(
      imp,
      `ext.prebid.adunitcode`,
      adUnit.code
    );
  }
}
