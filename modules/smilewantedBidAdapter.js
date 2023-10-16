import { isArray, logError, logWarn, isFn, isPlainObject } from '../src/utils.js';
import { Renderer } from '../src/Renderer.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

export const spec = {
  code: 'smilewanted',
  aliases: ['smile', 'sw'],
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.zoneId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bid => {
      var payload = {
        zoneId: bid.params.zoneId,
        currencyCode: config.getConfig('currency.adServerCurrency') || 'EUR',
        tagId: bid.adUnitCode,
        sizes: bid.sizes.map(size => ({
          w: size[0],
          h: size[1]
        })),
        transactionId: bid.transactionId,
        timeout: config.getConfig('bidderTimeout'),
        bidId: bid.bidId,
        /** positionType is undocumented
        It is unclear what this parameter means.
        If it means the same as pos in openRTB,
        It should read from openRTB object
        or from mediaTypes.banner.pos */
        positionType: bid.params.positionType || '',
        prebidVersion: '$prebid.version$'
      };

      const floor = getBidFloor(bid);
      if (floor) {
        payload.bidfloor = floor;
      }

      if (bid.params.bidfloor) {
        payload.bidfloor = bid.params.bidfloor;
      }

      if (bidderRequest && bidderRequest.refererInfo) {
        payload.pageDomain = bidderRequest.refererInfo.page || '';
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        payload.gdpr_consent = bidderRequest.gdprConsent.consentString;
        payload.gdpr = bidderRequest.gdprConsent.gdprApplies; // we're handling the undefined case server side
      }
      var payloadString = JSON.stringify(payload);
      return {
        method: 'POST',
        url: 'https://prebid.smilewanted.com',
        data: payloadString,
      };
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    var response = serverResponse.body;

    try {
      if (response) {
        const dealId = response.dealId || '';
        const bidResponse = {
          requestId: JSON.parse(bidRequest.data).bidId,
          cpm: response.cpm,
          width: response.width,
          height: response.height,
          creativeId: response.creativeId,
          dealId: response.dealId,
          currency: response.currency,
          netRevenue: response.isNetCpm,
          ttl: response.ttl,
          ad: response.ad,
        };

        if (response.formatTypeSw == 'video_instream' || response.formatTypeSw == 'video_outstream') {
          bidResponse['mediaType'] = 'video';
          bidResponse['vastUrl'] = response.ad;
          bidResponse['ad'] = null;
        }

        if (response.formatTypeSw == 'video_outstream') {
          bidResponse['renderer'] = newRenderer(JSON.parse(bidRequest.data), response);
        }

        if (dealId.length > 0) {
          bidResponse.dealId = dealId;
        }

        bidResponse.meta = {};
        if (response.meta && response.meta.advertiserDomains && isArray(response.meta.advertiserDomains)) {
          bidResponse.meta.advertiserDomains = response.meta.advertiserDomains;
        }
        bidResponses.push(bidResponse);
      }
    } catch (error) {
      logError('Error while parsing smilewanted response', error);
    }
    return bidResponses;
  },

  /**
   * User syncs.
   *
   * @param {*} syncOptions Publisher prebid configuration.
   * @param {*} serverResponses A successful response from the server.
   * @return {Syncs[]} An array of syncs that should be executed.
   */
  getUserSyncs: function(syncOptions, responses, gdprConsent, uspConsent) {
    let params = '';

    if (gdprConsent && typeof gdprConsent.consentString === 'string') {
      // add 'gdpr' only if 'gdprApplies' is defined
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        params += `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        params += `?gdpr_consent=${gdprConsent.consentString}`;
      }
    }

    if (uspConsent) {
      params += `${params ? '&' : '?'}us_privacy=${encodeURIComponent(uspConsent)}`;
    }

    const syncs = []

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: 'https://csync.smilewanted.com' + params
      });
    }

    return syncs;
  }
}

/**
 * Create SmileWanted renderer
 * @param requestId
 * @returns {*}
 */
function newRenderer(bidRequest, bidResponse) {
  const renderer = Renderer.install({
    id: bidRequest.bidId,
    url: bidResponse.OustreamTemplateUrl,
    loaded: false
  });

  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logWarn('Prebid Error calling setRender on newRenderer', err);
  }
  return renderer;
}

/**
 * Initialise SmileWanted outstream
 * @param bid
 */
function outstreamRender(bid) {
  bid.renderer.push(() => {
    window.SmileWantedOutStreamInit({
      width: bid.width,
      height: bid.height,
      vastUrl: bid.vastUrl,
      elId: bid.adUnitCode
    });
  });
}

/**
 * Get the floor price from bid.params for backward compatibility.
 * If not found, then check floor module.
 * @param bid A valid bid object
 * @returns {*|number} floor price
 */
function getBidFloor(bid) {
  if (isFn(bid.getFloor)) {
    const floorInfo = bid.getFloor({
      currency: 'USD',
      mediaType: 'banner',
      size: bid.sizes.map(size => ({ w: size[0], h: size[1] }))
    });
    if (isPlainObject(floorInfo) && !isNaN(floorInfo.floor) && floorInfo.currency === 'USD') {
      return parseFloat(floorInfo.floor);
    }
  }
  return null;
}

registerBidder(spec);
