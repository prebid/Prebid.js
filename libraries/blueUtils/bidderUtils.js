import { isFn, isPlainObject, deepSetValue, replaceAuctionPrice, triggerPixel } from '../../src/utils.js';

export function getBidFloor(bid, mediaType, defaultCurrency) {
  if (isFn(bid.getFloor)) {
    let floor = bid.getFloor({
      currency: defaultCurrency,
      mediaType: mediaType,
      size: '*',
    });
    if (
      isPlainObject(floor) &&
      !isNaN(floor.floor) &&
      floor.currency === defaultCurrency
    ) {
      return floor.floor;
    }
  }
  return null;
}

export function buildOrtbRequest(bidRequests, bidderRequest, context, gvlid, ortbConverterInstance) {
  const ortbRequest = ortbConverterInstance.toORTB({ bidRequests, bidderRequest, context });
  ortbRequest.ext = ortbRequest.ext || {};
  deepSetValue(ortbRequest, 'ext.gvlid', gvlid);
  return ortbRequest;
}

export function ortbConverterRequest(buildRequest, imps, bidderRequest, context) {
  let request = buildRequest(imps, bidderRequest, context);
  deepSetValue(request, 'site.publisher.id', context.publisherId);
  return request;
}

export function ortbConverterImp(buildImp, bidRequest, context) {
  let imp = buildImp(bidRequest, context);
  // context.mediaTypes is expected to be set by the adapter calling this function
  const floor = getBidFloor(bidRequest, context.mediaTypes.banner, context.mediaTypes.defaultCurrency);
  imp.tagid = bidRequest.params.placementId;

  if (floor) {
    imp.bidfloor = floor;
    imp.bidfloorcur = context.mediaTypes.defaultCurrency;
  }

  return imp;
}

export function buildBidObjectBase(bid, serverResponseBody, bidderCode, defaultCurrency) {
  return {
    ad: replaceAuctionPrice(bid.adm, bid.price),
    adapterCode: bidderCode,
    cpm: bid.price,
    currency: serverResponseBody.cur || defaultCurrency,
    deferBilling: false,
    deferRendering: false,
    width: bid.w,
    height: bid.h,
    mediaType: bid.ext?.mediaType || 'banner',
    netRevenue: true,
    originalCpm: bid.price,
    originalCurrency: serverResponseBody.cur || defaultCurrency,
    requestId: bid.impid,
    seatBidId: bid.id
  };
}

export function commonOnBidWonHandler(bid, processUrl = (url, bidData) => url) {
  const { burl, nurl } = bid || {};

  if (nurl) {
    triggerPixel(processUrl(nurl, bid));
  }

  if (burl) {
    triggerPixel(processUrl(burl, bid));
  }
}

export function commonIsBidRequestValid(bid) {
  return !!bid.params.placementId && !!bid.params.publisherId;
}

export function createOrtbConverter(ortbConverterFunc, bannerMediaType, defaultCurrencyConst, impFunc, requestFunc) {
  return ortbConverterFunc({
    context: {
      netRevenue: true,
      ttl: 100,
      mediaTypes: {
        banner: bannerMediaType,
        defaultCurrency: defaultCurrencyConst
      }
    },
    imp: impFunc,
    request: requestFunc,
  });
}

export function getPublisherIdFromBids(validBidRequests) {
  return validBidRequests.find(
    (bidRequest) => bidRequest.params?.publisherId
  )?.params.publisherId;
}

export function packageOrtbRequest(ortbRequest, endpointUrl, dataProcessor, requestOptions) {
  return [
    {
      method: 'POST',
      url: endpointUrl,
      data: dataProcessor(ortbRequest),
      options: requestOptions,
    }
  ];
}
