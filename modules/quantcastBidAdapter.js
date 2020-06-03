import * as utils from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import find from 'core-js-pure/features/array/find.js';

const BIDDER_CODE = 'quantcast';
const DEFAULT_BID_FLOOR = 0.0000000001;

const QUANTCAST_VENDOR_ID = '11';
// Check other required purposes on server
const PURPOSE_DATA_COLLECT = '1';

export const QUANTCAST_DOMAIN = 'qcx.quantserve.com';
export const QUANTCAST_TEST_DOMAIN = 's2s-canary.quantserve.com';
export const QUANTCAST_NET_REVENUE = true;
export const QUANTCAST_TEST_PUBLISHER = 'test-publisher';
export const QUANTCAST_TTL = 4;
export const QUANTCAST_PROTOCOL = 'https';
export const QUANTCAST_PORT = '8443';

function makeVideoImp(bid) {
  const video = {};
  if (bid.params.video) {
    video['mimes'] = bid.params.video.mimes;
    video['minduration'] = bid.params.video.minduration;
    video['maxduration'] = bid.params.video.maxduration;
    video['protocols'] = bid.params.video.protocols;
    video['startdelay'] = bid.params.video.startdelay;
    video['linearity'] = bid.params.video.linearity;
    video['battr'] = bid.params.video.battr;
    video['maxbitrate'] = bid.params.video.maxbitrate;
    video['playbackmethod'] = bid.params.video.playbackmethod;
    video['delivery'] = bid.params.video.delivery;
    video['placement'] = bid.params.video.placement;
    video['api'] = bid.params.video.api;
  }
  if (bid.mediaTypes.video.mimes) {
    video['mimes'] = bid.mediaTypes.video.mimes;
  }
  if (utils.isArray(bid.mediaTypes.video.playerSize[0])) {
    video['w'] = bid.mediaTypes.video.playerSize[0][0];
    video['h'] = bid.mediaTypes.video.playerSize[0][1];
  } else {
    video['w'] = bid.mediaTypes.video.playerSize[0];
    video['h'] = bid.mediaTypes.video.playerSize[1];
  }
  return {
    video: video,
    placementCode: bid.placementCode,
    bidFloor: bid.params.bidFloor || DEFAULT_BID_FLOOR
  };
}

function makeBannerImp(bid) {
  const sizes = bid.sizes || bid.mediaTypes.banner.sizes;

  return {
    banner: {
      battr: bid.params.battr,
      sizes: sizes.map(size => {
        return {
          width: size[0],
          height: size[1]
        };
      })
    },
    placementCode: bid.placementCode,
    bidFloor: bid.params.bidFloor || DEFAULT_BID_FLOOR
  };
}

function getDomain(url) {
  if (!url) {
    return url;
  }
  return url.replace('http://', '').replace('https://', '').replace('www.', '').split(/[/?#]/)[0];
}

function checkTCFv1(vendorData) {
  let vendorConsent = vendorData.vendorConsents && vendorData.vendorConsents[QUANTCAST_VENDOR_ID];
  let purposeConsent = vendorData.purposeConsents && vendorData.purposeConsents[PURPOSE_DATA_COLLECT];

  return !!(vendorConsent && purposeConsent);
}

function checkTCFv2(tcData) {
  if (tcData.purposeOneTreatment && tcData.publisherCC === 'DE') {
    // special purpose 1 treatment for Germany
    return true;
  }

  let restrictions = tcData.publisher ? tcData.publisher.restrictions : {};
  let qcRestriction = restrictions && restrictions[PURPOSE_DATA_COLLECT]
    ? restrictions[PURPOSE_DATA_COLLECT][QUANTCAST_VENDOR_ID]
    : null;

  if (qcRestriction === 0 || qcRestriction === 2) {
    // Not allowed by publisher, or requires legitimate interest
    return false;
  }

  let vendorConsent = tcData.vendor && tcData.vendor.consents && tcData.vendor.consents[QUANTCAST_VENDOR_ID];
  let purposeConsent = tcData.purpose && tcData.purpose.consents && tcData.purpose.consents[PURPOSE_DATA_COLLECT];

  return !!(vendorConsent && purposeConsent);
}

/**
 * The documentation for Prebid.js Adapter 1.0 can be found at link below,
 * http://prebid.org/dev-docs/bidder-adapter-1.html
 */
export const spec = {
  code: BIDDER_CODE,
  GVLID: 11,
  supportedMediaTypes: ['banner', 'video'],
  hasUserSynced: false,

  /**
   * Verify the `AdUnits.bids` response with `true` for valid request and `false`
   * for invalid request.
   *
   * @param {object} bid
   * @return boolean `true` is this is a valid bid, and `false` otherwise
   */
  isBidRequestValid(bid) {
    return !!bid.params.publisherId;
  },

  /**
   * Make a server request when the page asks Prebid.js for bids from a list of
   * `BidRequests`.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be send to Quantcast server
   * @param bidderRequest
   * @return ServerRequest information describing the request to the server.
   */
  buildRequests(bidRequests, bidderRequest) {
    const bids = bidRequests || [];
    const gdprConsent = utils.deepAccess(bidderRequest, 'gdprConsent') || {};
    const uspConsent = utils.deepAccess(bidderRequest, 'uspConsent');
    const referrer = utils.deepAccess(bidderRequest, 'refererInfo.referer');
    const page = utils.deepAccess(bidderRequest, 'refererInfo.canonicalUrl') || config.getConfig('pageUrl') || utils.deepAccess(window, 'location.href');
    const domain = getDomain(page);

    // Check for GDPR consent for purpose 1, and drop request if consent has not been given
    // Remaining consent checks are performed server-side.
    if (gdprConsent.gdprApplies) {
      if (gdprConsent.vendorData) {
        if (gdprConsent.apiVersion === 1 && !checkTCFv1(gdprConsent.vendorData)) {
          utils.logInfo(`${BIDDER_CODE}: No purpose 1 consent for TCF v1`);
          return;
        }
        if (gdprConsent.apiVersion === 2 && !checkTCFv2(gdprConsent.vendorData)) {
          utils.logInfo(`${BIDDER_CODE}: No purpose 1 consent for TCF v2`);
          return;
        }
      }
    }

    let bidRequestsList = [];

    bids.forEach(bid => {
      let imp;
      if (bid.mediaTypes) {
        if (bid.mediaTypes.video && bid.mediaTypes.video.context === 'instream') {
          imp = makeVideoImp(bid);
        } else if (bid.mediaTypes.banner) {
          imp = makeBannerImp(bid);
        } else {
          // Unsupported mediaType
          utils.logInfo(`${BIDDER_CODE}: No supported mediaTypes found in ${JSON.stringify(bid.mediaTypes)}`);
          return;
        }
      } else {
        // Parse as banner by default
        imp = makeBannerImp(bid);
      }

      // Request Data Format can be found at https://wiki.corp.qc/display/adinf/QCX
      const requestData = {
        publisherId: bid.params.publisherId,
        requestId: bid.bidId,
        imp: [imp],
        site: {
          page,
          referrer,
          domain
        },
        bidId: bid.bidId,
        gdprSignal: gdprConsent.gdprApplies ? 1 : 0,
        gdprConsent: gdprConsent.consentString,
        uspSignal: uspConsent ? 1 : 0,
        uspConsent,
        coppa: config.getConfig('coppa') === true ? 1 : 0,
        prebidJsVersion: '$prebid.version$'
      };

      const data = JSON.stringify(requestData);
      const qcDomain = bid.params.publisherId === QUANTCAST_TEST_PUBLISHER
        ? QUANTCAST_TEST_DOMAIN
        : QUANTCAST_DOMAIN;
      const url = `${QUANTCAST_PROTOCOL}://${qcDomain}:${QUANTCAST_PORT}/qchb`;

      bidRequestsList.push({
        data,
        method: 'POST',
        url
      });
    });

    return bidRequestsList;
  },

  /**
   * Function get called when the browser has received the response from Quantcast server.
   * The function parse the response and create a `bidResponse` object containing one/more bids.
   * Returns an empty array if no valid bids
   *
   * Response Data Format can be found at https://wiki.corp.qc/display/adinf/QCX
   *
   * @param {*} serverResponse A successful response from Quantcast server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   *
   */
  interpretResponse(serverResponse) {
    if (serverResponse === undefined) {
      utils.logError('Server Response is undefined');
      return [];
    }

    const response = serverResponse['body'];

    if (response === undefined || !response.hasOwnProperty('bids')) {
      utils.logError('Sub-optimal JSON received from Quantcast server');
      return [];
    }

    if (utils.isEmpty(response.bids)) {
      // Shortcut response handling if no bids are present
      return [];
    }

    const bidResponsesList = response.bids.map(bid => {
      const { ad, cpm, width, height, creativeId, currency, videoUrl, dealId } = bid;

      const result = {
        requestId: response.requestId,
        cpm,
        width,
        height,
        ad,
        ttl: QUANTCAST_TTL,
        creativeId,
        netRevenue: QUANTCAST_NET_REVENUE,
        currency
      };

      if (videoUrl !== undefined && videoUrl) {
        result['vastUrl'] = videoUrl;
        result['mediaType'] = 'video';
      }

      if (dealId !== undefined && dealId) {
        result['dealId'] = dealId;
      }

      return result;
    });

    return bidResponsesList;
  },
  onTimeout(timeoutData) {
    const url = `${QUANTCAST_PROTOCOL}://${QUANTCAST_DOMAIN}:${QUANTCAST_PORT}/qchb_notify?type=timeout`;
    ajax(url, null, null);
  },
  getUserSyncs(syncOptions, serverResponses) {
    const syncs = []
    if (!this.hasUserSynced && syncOptions.pixelEnabled) {
      const responseWithUrl = find(serverResponses, serverResponse =>
        utils.deepAccess(serverResponse.body, 'userSync.url')
      );

      if (responseWithUrl) {
        const url = utils.deepAccess(responseWithUrl.body, 'userSync.url')
        syncs.push({
          type: 'image',
          url: url
        });
      }
      this.hasUserSynced = true;
    }
    return syncs;
  },
  resetUserSync() {
    this.hasUserSynced = false;
  }
};

registerBidder(spec);
