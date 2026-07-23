import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { logError, isFn, isPlainObject, formatQS } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { toOrtb26 } from '../libraries/ortb2.5Translator/translator.js';
import { getUserSyncParams } from '../libraries/userSyncUtils/userSyncUtils.js';

const BIDDER_CODE = 'synapsehx';
const METHOD = 'POST';
const ENDPOINT_URL = `https://rtb.hx.compasonline.com/pbjs`;

function getMediaType(bid) {
  if (bid.mtype) {
    const mtypeToMediaType = { 1: BANNER, 2: VIDEO };
    return mtypeToMediaType[bid.mtype];
  }
  return bid?.ext?.prebid?.type;
}

const converter = ortbConverter({
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    if (bidRequest?.params?.adUnitId) {
      imp.tagid = bidRequest.params.adUnitId;
    }

    const floor = getBidFloor(bidRequest);
    if (floor) {
      imp.bidfloor = floor;
      imp.bidfloorcur = 'USD';
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    return buildRequest(imps, bidderRequest, context);
  },
  bidResponse(buildBidResponse, bid, context) {
    const isValidBidType = Object.keys(context.bidRequest.mediaTypes).includes(getMediaType(bid));

    if (isValidBidType) {
      return buildBidResponse(bid, context);
    }

    logError('Incorrect bid type for bid: ', bid.id);
  },
  context: {
    netRevenue: true,
    ttl: 30
  },
  translator: toOrtb26
});

function getBidFloor(bid) {
  if (isFn(bid.getFloor)) {
    const floor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*'
    });
    if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
      return floor.floor;
    }
  }
  return bid.params?.floor;
}

function isValidBidFloorCurrency(bid) {
  return !bid.ortb2Imp?.bidfloorcur || bid.ortb2Imp.bidfloorcur === 'USD';
}

function isValidParams(bid) {
  const tenantId = bid?.params?.tenantId;
  const adUnitId = bid?.params?.adUnitId;
  return typeof tenantId === 'string' && tenantId.length > 0 &&
    (adUnitId == null || (typeof adUnitId === 'string' && adUnitId.length > 0));
}

function makeUrl(bidRequests) {
  return `${ENDPOINT_URL}?${formatQS({ pid: bidRequests[0].params.tenantId })}`;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],
  isBidRequestValid: (bid) => !!bid && isValidParams(bid) && isValidBidFloorCurrency(bid),

  buildRequests: (bidRequests, bidderRequest) => {
    const data = converter.toORTB({ bidRequests, bidderRequest });

    return [{
      method: METHOD,
      url: makeUrl(bidRequests),
      options: {
        contentType: 'application/json',
        withCredentials: true,
        crossOrigin: true
      },
      data: data,
    }];
  },

  interpretResponse: ({ body }, req) => {
    if (!body || !body.seatbid || body.seatbid.length === 0) {
      return [];
    }
    return converter.fromORTB({
      response: body,
      request: req.data
    });
  },

  onTimeout: (data) => { },

  onBidWon: (bid) => {
    if (bid.nurl) {
      const url = new URL(bid.nurl);
      url.searchParams.set('cpm', bid.cpm);
      fetch(url.toString(), { method: 'GET', keepalive: true }).catch(err =>
        logError('Error triggering win notification', err)
      );
    }
  },

  onSetTargeting: (bid) => { },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs = [];

    if (serverResponses && (syncOptions.iframeEnabled || syncOptions.pixelEnabled)) {
      const params = formatQS(getUserSyncParams(gdprConsent, uspConsent, gppConsent));

      if (syncOptions.iframeEnabled) {
        serverResponses.forEach(response => {
          const iframeUrl = response?.body?.ext?.[BIDDER_CODE]?.sync?.iframe;
          if (iframeUrl) {
            syncs.push({
              type: "iframe",
              url: `${iframeUrl}${params ? `${iframeUrl.lastIndexOf('?') !== -1 ? '&' : '?'}${params}` : ''}`,
            });
          }
        });
      } else if (syncOptions.pixelEnabled) {
        serverResponses.forEach(response => {
          const images = response?.body?.ext?.[BIDDER_CODE]?.sync?.image || [];
          images.forEach(image => {
            syncs.push({
              type: "image",
              url: `${image}${params ? `${image.lastIndexOf('?') !== -1 ? '&' : '?'}${params}` : ''}`,
            });
          });
        });
      }
    }

    return syncs;
  }
};

registerBidder(spec);
