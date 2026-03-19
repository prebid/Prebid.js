import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { logError, isFn, isPlainObject } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js'
import { ortb25Translator } from '../libraries/ortb2.5Translator/translator.js';

const BIDDER_CODE = 'startio';
const METHOD = 'POST';
const GVLID = 1216;
const ENDPOINT_URL = `https://pbc-rtb.startappnetwork.com/1.3/2.5/getbid?account=pbc`;

const converter = ortbConverter({
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    if (imp?.banner?.format?.[0]) {
      imp.banner.w ??= imp.banner.format[0]?.w;
      imp.banner.h ??= imp.banner.format[0]?.h;
    }

    const floor = getBidFloor(bidRequest);
    if (floor) {
      imp.bidfloor = floor;
      imp.bidfloorcur = 'USD';
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const bidParams = context?.bidParams;
    const publisherId = bidParams?.publisherId;
    if (request?.site) {
      request.site.publisher = request.site.publisher || {};
      request.site.publisher.id = publisherId;
    } else if (request?.app) {
      request.app.publisher = request.app.publisher || {};
      request.app.publisher.id = publisherId;
    }
    request.ext = request.ext || {};
    request.ext.prebid = request.ext.prebid || {};

    const ortb = bidderRequest.ortb2;
    request.regs ??= {};
    request.regs.coppa = ortb?.regs?.coppa;

    if (bidderRequest.uspConsent) {
      request.regs.ext ??= {};
      request.regs.ext.us_privacy = bidderRequest.uspConsent;
    }

    request.bcat = ortb?.bcat || bidParams?.bcat;
    request.badv = ortb?.badv || bidParams?.badv;
    request.bapp = ortb?.bapp || bidParams?.bapp;

    spec.supportedMediaTypes.forEach(mediaType => {
      if (request.imp[0].hasOwnProperty(mediaType)) {
        request.imp[0][mediaType].battr ??= ortb?.[mediaType]?.battr || bidParams?.battr;
      }
    })

    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const isValidBidType = bid?.ext?.prebid?.type === context?.mediaType;

    if (context.mediaType === NATIVE) {
      const ortb = JSON.parse(bid.adm);
      bid.adm = ortb.native;
    }

    if (isValidBidType) {
      return buildBidResponse(bid, context);
    }

    logError('Bid type is incorrect for bid: ', bid['id'])
  },
  context: {
    netRevenue: true,
    ttl: 30
  },
  translator: ortb25Translator()
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

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER, NATIVE],
  gvlid: GVLID,
  isBidRequestValid: (bid) => !!bid && isValidBidFloorCurrency(bid),

  buildRequests: (bidRequests, bidderRequest) => {
    return bidRequests.map((bidRequest) => {
      const mediaType = Object.keys(bidRequest.mediaTypes || {})[0] || BANNER;
      const data = converter.toORTB({
        bidRequests: [bidRequest],
        bidderRequest,
        context: {mediaType, bidParams: bidRequest.params}
      });

      return {
        method: METHOD,
        url: ENDPOINT_URL,
        options: {
          contentType: 'text/plain',
          withCredentials: false,
          crossOrigin: true
        },
        data: data,
      };
    });
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
};

registerBidder(spec);
