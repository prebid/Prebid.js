import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';

const storage = getStorageManager();

const BIDDER_CODE = 'cedato';
const BID_URL = 'https://h.cedatoplayer.com/hb';
const SYNC_URL = 'https://h.cedatoplayer.com/hb_usync';
const TTL = 10000;
const CURRENCY = 'USD';
const NET_REVENUE = true;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function(bid) {
    return !!(
      bid &&
      bid.params &&
      bid.params.player_id &&
      utils.checkCookieSupport() &&
      storage.cookiesAreEnabled()
    );
  },

  buildRequests: function(bidRequests, bidderRequest) {
    const site = { domain: document.domain };
    const device = { ua: navigator.userAgent, w: screen.width, h: screen.height };
    const currency = CURRENCY;
    const tmax = bidderRequest.timeout;
    const auctionId = bidderRequest.auctionId;
    const auctionStart = bidderRequest.auctionStart;
    const bidderRequestId = bidderRequest.bidderRequestId;

    const imp = bidRequests.map(req => {
      const banner = getMediaType(req, 'banner');
      const video = getMediaType(req, 'video');
      const params = req.params;
      const bidId = req.bidId;
      const adUnitCode = req.adUnitCode;
      const bidRequestsCount = req.bidRequestsCount;
      const bidderWinsCount = req.bidderWinsCount;
      const transactionId = req.transactionId;

      return {
        bidId,
        banner,
        video,
        adUnitCode,
        bidRequestsCount,
        bidderWinsCount,
        transactionId,
        params
      };
    });

    const payload = {
      version: '$prebid.version$',
      site,
      device,
      imp,
      currency,
      tmax,
      auctionId,
      auctionStart,
      bidderRequestId
    };

    if (bidderRequest) {
      payload.referer_info = bidderRequest.refererInfo;
      payload.us_privacy = bidderRequest.uspConsent;

      if (bidderRequest.gdprConsent) {
        payload.gdpr_consent = {
          consent_string: bidderRequest.gdprConsent.consentString,
          consent_required: bidderRequest.gdprConsent.gdprApplies
        };
      }
    }

    return formatRequest(payload, bidderRequest);
  },

  interpretResponse: function(resp, {bidderRequest}) {
    resp = resp.body;
    const bids = [];

    if (!resp) {
      return bids;
    }

    resp.seatbid[0].bid.map(serverBid => {
      const bid = newBid(serverBid, bidderRequest);
      bid.currency = resp.cur;
      bids.push(bid);
    });

    return bids;
  },

  getUserSyncs: function(syncOptions, resps, gdprConsent, uspConsent) {
    const syncs = [];
    if (syncOptions.iframeEnabled) {
      syncs.push(getSync('iframe', gdprConsent, uspConsent));
    } else if (syncOptions.pixelEnabled) {
      syncs.push(getSync('image', gdprConsent, uspConsent));
    }
    return syncs;
  }
}

function getMediaType(req, type) {
  const { mediaTypes } = req;

  if (!mediaTypes) {
    return;
  }

  switch (type) {
    case 'banner':
      if (mediaTypes.banner) {
        const { sizes } = mediaTypes.banner;
        return {
          format: getFormats(sizes)
        };
      }
      break;

    case 'video':
      if (mediaTypes.video) {
        const { playerSize, context } = mediaTypes.video;
        return {
          context: context,
          format: getFormats(playerSize)
        };
      }
  }
}

function newBid(serverBid, bidderRequest) {
  const bidRequest = utils.getBidRequest(serverBid.uuid, [bidderRequest]);

  const cpm = serverBid.price;
  const requestId = serverBid.uuid;
  const width = serverBid.w;
  const height = serverBid.h;
  const creativeId = serverBid.crid;
  const dealId = serverBid.dealid;
  const mediaType = serverBid.media_type;
  const netRevenue = NET_REVENUE;
  const ttl = TTL;

  const bid = {
    cpm,
    requestId,
    width,
    height,
    mediaType,
    creativeId,
    dealId,
    netRevenue,
    ttl,
  };

  if (mediaType == 'video') {
    const videoContext = utils.deepAccess(bidRequest, 'mediaTypes.video.context');

    if (videoContext == 'instream') {
      bid.vastUrl = serverBid.vast_url;
      bid.vastImpUrl = serverBid.notify_url;
    }
  } else {
    bid.ad = serverBid.adm;
  }

  return bid;
}

function formatRequest(payload, bidderRequest) {
  const payloadByUrl = {};
  const requests = [];

  payload.imp.forEach(imp => {
    const url = imp.params.bid_url || BID_URL;
    if (!payloadByUrl[url]) {
      payloadByUrl[url] = {
        ...payload,
        imp: []
      };
    }
    payloadByUrl[url].imp.push(imp);
  });

  for (const url in payloadByUrl) {
    requests.push({
      url,
      method: 'POST',
      data: JSON.stringify(payloadByUrl[url]),
      bidderRequest
    });
  }

  return requests;
}

const getSync = (type, gdprConsent, uspConsent = '') => {
  const syncUrl = SYNC_URL;
  let params = '?type=' + type + '&us_privacy=' + uspConsent;
  if (gdprConsent && typeof gdprConsent.consentString === 'string') {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      params += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
    } else {
      params += `&gdpr_consent=${gdprConsent.consentString}`;
    }
  }
  return {
    type: type,
    url: syncUrl + params,
  };
}

const getFormats = arr => arr.map((s) => {
  return { w: s[0], h: s[1] };
});

registerBidder(spec);
