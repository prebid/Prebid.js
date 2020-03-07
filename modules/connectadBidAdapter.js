import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js'
import {config} from '../src/config.js';

const BIDDER_CODE = 'connectad';
const BIDDER_CODE_ALIAS = 'connectadrealtime';
const ENDPOINT_URL = 'https://i.connectad.io/api/v2';
const SUPPORTED_MEDIA_TYPES = [BANNER];

export const spec = {
  code: BIDDER_CODE,
  aliases: [ BIDDER_CODE_ALIAS ],
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: function(bid) {
    return !!(bid.params.networkId && bid.params.siteId);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    let digitrust;

    let ret = {
      method: 'POST',
      url: '',
      data: '',
      bidRequest: []
    };

    if (validBidRequests.length < 1) {
      return ret;
    }

    const data = Object.assign({
      placements: [],
      time: Date.now(),
      user: {},
      url: (bidderRequest.refererInfo && bidderRequest.refererInfo.referer) ? bidderRequest.refererInfo.referer : window.location.href,
      referrer: window.document.referrer,
      referrer_info: bidderRequest.refererInfo,
      screensize: getScreenSize(),
      dnt: (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0,
      language: navigator.language,
      ua: navigator.userAgent
    });

    // coppa compliance
    if (config.getConfig('coppa') === true) {
      utils.deepSetValue(data, 'user.coppa', 1);
    }

    // adding schain object
    if (validBidRequests[0].schain) {
      utils.deepSetValue(data, 'source.ext.schain', validBidRequests[0].schain);
    }

    // Attaching GDPR Consent Params
    if (bidderRequest.gdprConsent) {
      let gdprApplies;
      if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
        gdprApplies = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      }
      utils.deepSetValue(data, 'user.ext.gdpr', gdprApplies);
      utils.deepSetValue(data, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
    }

    // CCPA
    if (bidderRequest.uspConsent) {
      utils.deepSetValue(data, 'user.ext.us_privacy', bidderRequest.uspConsent);
    }

    // Digitrust Support
    const bidRequestDigitrust = utils.deepAccess(validBidRequests[0], 'userId.digitrustid.data');
    if (bidRequestDigitrust && (!bidRequestDigitrust.privacy || !bidRequestDigitrust.privacy.optout)) {
      digitrust = {
        id: bidRequestDigitrust.id,
        keyv: bidRequestDigitrust.keyv
      }
    }

    if (digitrust) {
      utils.deepSetValue(data, 'user.ext.digitrust', {
        id: digitrust.id,
        keyv: digitrust.keyv
      })
    }

    if (validBidRequests[0].userId && typeof validBidRequests[0].userId === 'object' && (validBidRequests[0].userId.tdid || validBidRequests[0].userId.pubcid || validBidRequests[0].userId.lipb || validBidRequests[0].userId.id5id || validBidRequests[0].userId.parrableid)) {
      utils.deepSetValue(data, 'user.ext.eids', []);

      if (validBidRequests[0].userId.tdid) {
        data.user.ext.eids.push({
          source: 'adserver.org',
          uids: [{
            id: validBidRequests[0].userId.tdid,
            ext: {
              rtiPartner: 'TDID'
            }
          }]
        });
      }

      if (validBidRequests[0].userId.pubcid) {
        data.user.ext.eids.push({
          source: 'pubcommon',
          uids: [{
            id: validBidRequests[0].userId.pubcid,
          }]
        });
      }

      if (validBidRequests[0].userId.id5id) {
        data.user.ext.eids.push({
          source: 'id5-sync.com',
          uids: [{
            id: validBidRequests[0].userId.id5id,
          }]
        });
      }

      if (validBidRequests[0].userId.parrableid) {
        data.user.ext.eids.push({
          source: 'parrable.com',
          uids: [{
            id: validBidRequests[0].userId.parrableid,
          }]
        });
      }

      if (validBidRequests[0].userId.lipb && validBidRequests[0].userId.lipb.lipbid) {
        data.user.ext.eids.push({
          source: 'liveintent.com',
          uids: [{
            id: validBidRequests[0].userId.lipb.lipbid
          }]
        });
      }
    }

    validBidRequests.map(bid => {
      const placement = Object.assign({
        id: bid.transactionId,
        divName: bid.bidId,
        sizes: bid.mediaTypes.banner.sizes,
        adTypes: getSize(bid.mediaTypes.banner.sizes || bid.sizes)
      }, bid.params);

      if (placement.networkId && placement.siteId) {
        data.placements.push(placement);
      }
    });

    ret.data = JSON.stringify(data);
    ret.bidRequest = validBidRequests;
    ret.url = ENDPOINT_URL;

    return ret;
  },

  interpretResponse: function(serverResponse, bidRequest, bidderRequest) {
    let bid;
    let bids;
    let bidId;
    let bidObj;
    let bidResponses = [];

    bids = bidRequest.bidRequest;

    serverResponse = (serverResponse || {}).body;
    for (let i = 0; i < bids.length; i++) {
      bid = {};
      bidObj = bids[i];
      bidId = bidObj.bidId;

      if (serverResponse) {
        const decision = serverResponse.decisions && serverResponse.decisions[bidId];
        const price = decision && decision.pricing && decision.pricing.clearPrice;

        if (decision && price) {
          bid.requestId = bidId;
          bid.cpm = price;
          bid.width = decision.width;
          bid.height = decision.height;
          bid.dealid = decision.dealid || null;
          bid.ad = retrieveAd(decision);
          bid.currency = 'USD';
          bid.creativeId = decision.adId;
          bid.ttl = 360;
          bid.netRevenue = true;
          bidResponses.push(bid);
        }
      }
    }

    return bidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    let syncEndpoint = 'https://cdn.connectad.io/connectmyusers.php?';

    if (gdprConsent) {
      syncEndpoint = utils.tryAppendQueryString(syncEndpoint, 'gdpr', (gdprConsent.gdprApplies ? 1 : 0));
    }

    if (gdprConsent && typeof gdprConsent.consentString === 'string') {
      syncEndpoint = utils.tryAppendQueryString(syncEndpoint, 'gdpr_consent', gdprConsent.consentString);
    }

    if (uspConsent) {
      syncEndpoint = utils.tryAppendQueryString(syncEndpoint, 'us_privacy', uspConsent);
    }

    if (config.getConfig('coppa') === true) {
      syncEndpoint = utils.tryAppendQueryString(syncEndpoint, 'coppa', 1);
    }

    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: syncEndpoint
      }];
    } else {
      utils.logWarn('Bidder ConnectAd: Please activate iFrame Sync');
    }
  }
};

const sizeMap = [
  null,
  '120x90',
  '200x200',
  '468x60',
  '728x90',
  '300x250',
  '160x600',
  '120x600',
  '300x100',
  '180x150',
  '336x280',
  '240x400',
  '234x60',
  '88x31',
  '120x60',
  '120x240',
  '125x125',
  '220x250',
  '250x250',
  '250x90',
  '0x0',
  '200x90',
  '300x50',
  '320x50',
  '320x480',
  '185x185',
  '620x45',
  '300x125',
  '800x250',
  '980x120',
  '980x150',
  '320x150',
  '300x300',
  '200x600',
  '320x500',
  '320x320'
];

sizeMap[77] = '970x90';
sizeMap[123] = '970x250';
sizeMap[43] = '300x600';
sizeMap[286] = '970x66';
sizeMap[3230] = '970x280';
sizeMap[429] = '486x60';
sizeMap[374] = '700x500';
sizeMap[934] = '300x1050';
sizeMap[1578] = '320x100';
sizeMap[331] = '320x250';
sizeMap[3301] = '320x267';
sizeMap[2730] = '728x250';

function getSize(sizes) {
  const result = [];
  sizes.forEach(function(size) {
    const index = sizeMap.indexOf(size[0] + 'x' + size[1]);
    if (index >= 0) {
      result.push(index);
    }
  });
  return result;
}

function retrieveAd(decision) {
  return decision.contents && decision.contents[0] && decision.contents[0].body;
}

function getScreenSize() {
  return [window.screen.width, window.screen.height].join('x');
}

registerBidder(spec);
