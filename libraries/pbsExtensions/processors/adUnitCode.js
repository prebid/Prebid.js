import {auctionManager} from '../../../src/auctionManager.js';
import {deepSetValue} from '../../../src/utils.js';

export function setImpAdUnitCode(imp, bidRequest, context, { adUnit, index = auctionManager.index } = {}) {
  // eslint-disable-next-line no-console
  console.log('imp: ', imp);
  // eslint-disable-next-line no-console
  console.log('bidRequest: ', bidRequest);
  // eslint-disable-next-line no-console
  console.log('context: ', context);
  // eslint-disable-next-line no-console
  console.log('adUnit: ', adUnit);
  // eslint-disable-next-line no-console
  console.log('index.getAdUnit(bidRequest): ', index.getAdUnit(bidRequest));
  // eslint-disable-next-line no-console
  console.log('index: ', index);

  adUnit = adUnit || index.getAdUnit(bidRequest);

  if (adUnit) {
    deepSetValue(
      imp,
      `ext.prebid.adunitcode`,
      adUnit.code
    );
  }
}
