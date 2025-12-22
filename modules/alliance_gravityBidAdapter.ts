import { deepSetValue } from '../src/utils.js';
import {AdapterRequest, BidderSpec, registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'

import { interpretResponse, enrichImp, getUserSyncs } from '../libraries/alliancegravityUtils/index.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';
import { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import { ORTBImp, ORTBRequest } from '../src/prebid.public.js';

const BIDDER_CODE = 'alliance_gravity';
const REQUEST_URL = 'https://pbs.production.agrvt.com/openrtb2/auction';
const GVLID = 501;

const DEFAULT_GZIP_ENABLED = false;

declare module '../src/adUnits' {
  interface BidderParams {
    srid: string
  }
}

const converter = ortbConverter({
  context: {
    netRevenue: true, // or false if your adapter should set bidResponse.netRevenue = false
    ttl: 90, // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)
  },
  imp(buildImp, bidRequest: BidRequest<typeof BIDDER_CODE>, context) {
    let imp:ORTBImp = buildImp(bidRequest, context);
    imp = enrichImp(imp, bidRequest);
    const adUnitCode = bidRequest.adUnitCode;
    const slotEl:HTMLElement | null = document.getElementById(adUnitCode);
    if (slotEl) {
      const { width, height } = getBoundingClientRect(slotEl);
      deepSetValue(imp, 'ext.dimensions.slotW', width);
      deepSetValue(imp, 'ext.dimensions.slotH', height);
      deepSetValue(imp, 'ext.dimensions.cssMaxW', slotEl.style?.maxWidth);
      deepSetValue(imp, 'ext.dimensions.cssMaxH', slotEl.style?.maxHeight);
    }
    deepSetValue(imp, 'ext.prebid.storedrequest.id', bidRequest.params.srid);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    return buildRequest(imps, bidderRequest, context);
  },
});

const isBidRequestValid = (bid:BidRequest<typeof BIDDER_CODE>): boolean => {
  if (!bid.params.srid || typeof bid.params.srid !== 'string' || bid.params.srid === '') {
    return false;
  }
  return true;
};

const buildRequests = (
  bidRequests: BidRequest<typeof BIDDER_CODE>[],
  bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>,
): AdapterRequest => {
  const data:ORTBRequest = converter.toORTB({bidRequests, bidderRequest})
  const adapterRequest:AdapterRequest = {
    method: 'POST',
    url: REQUEST_URL,
    data,
    options: {
      endpointCompression: DEFAULT_GZIP_ENABLED
    },
  }
  return adapterRequest;
}

export const spec:BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
