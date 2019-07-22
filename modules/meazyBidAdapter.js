import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';

const BIDDER_CODE = 'meazy';
const PREBID_ENDPOINT = 'rtb-filter.meazy.co';
const SYNC_ENDPOINT = '//sync.meazy.co/sync/iframe';
const ENDPOINT_CONFIG = {
  defaultCurrency: ['USD'],
  availableSize: ['300x250', '320x480', '160x600']
};

const buildURI = (pid) => {
  return `//${PREBID_ENDPOINT}/pbjs?host=${utils.getOrigin()}&api_key=${pid}`;
}

const validateSize = (size) => {
  return ENDPOINT_CONFIG.availableSize.indexOf(size.join('x')) !== -1;
}

const buildImpression = (bidRequest) => {
  const impression = {
    id: utils.getUniqueIdentifierStr(),
    tagid: bidRequest.adUnitCode,
    banner: {
      format: bidRequest.sizes.map(size => ({ w: size[0], h: size[1] }))
    }
  };

  return impression;
}

const buildItems = (bidRequests) => {
  const imp = [];
  const user = {};

  bidRequests.forEach(bidRequest => {
    imp.push(buildImpression(bidRequest));
    if (utils.deepAccess(bidRequest, 'gdprConsent.gdprApplies')) {
      user.ext = {
        consent: bidRequest.gdprConsent.consentString,
        gdpr: bidRequest.gdprConsent.gdprApplies & 1
      }
    }
  });

  return { imp, user };
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!bid.params.pid && bid.sizes.some(validateSize);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests) {
    const { user, imp } = buildItems(bidRequests);

    const payload = {
      imp,
      user,
      id: bidRequests[0].bidId,
      site: {
        domain: utils.getOrigin(),
        page: utils.getTopWindowUrl(),
        ref: utils.getTopWindowReferrer()
      },
      device: {
        w: window.screen.width,
        h: window.screen.height,
        language: navigator.language
      },
      cur: ENDPOINT_CONFIG.defaultCurrency
    };
    const payloadString = JSON.stringify(payload);

    return {
      method: 'POST',
      url: buildURI(bidRequests[0].params.pid),
      data: payloadString
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse) {
    const bids = [];

    if (!utils.isArray(serverResponse.body.seatbid) || !serverResponse.body.seatbid[0]) {
      return bids;
    }

    serverResponse.body.seatbid[0].bid.forEach(bidResponse => {
      const bid = {
        requestId: serverResponse.body.id,
        cpm: bidResponse.price,
        width: bidResponse.w,
        height: bidResponse.h,
        creativeId: bidResponse.crid,
        netRevenue: bidResponse.netRevenue !== undefined ? bidResponse.netRevenue : true,
        dealId: bidResponse.dealid,
        currency: ENDPOINT_CONFIG.defaultCurrency[0],
        ttl: bidResponse.exp || 900,
        ad: bidResponse.adm
      }

      bids.push(bid);
    });

    return bids;
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];

    if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: serverResponses[0].body.ext.syncUrl
      });
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: SYNC_ENDPOINT
      });
    }

    return syncs;
  }
}

registerBidder(spec);
