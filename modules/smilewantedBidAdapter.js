import * as utils from '../src/utils';
import { Renderer } from '../src/Renderer';
import { config } from '../src/config';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER, VIDEO } from '../src/mediaTypes';

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
        bidfloor: bid.params.bidfloor || 0.0,
        tagId: bid.adUnitCode,
        sizes: bid.sizes.map(size => ({
          w: size[0],
          h: size[1]
        })),
        transactionId: bid.transactionId,
        timeout: config.getConfig('bidderTimeout'),
        bidId: bid.bidId,
        prebidVersion: '$prebid.version$'
      };

      if (bidderRequest && bidderRequest.refererInfo) {
        payload.pageDomain = bidderRequest.refererInfo.referer || '';
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

        bidResponses.push(bidResponse);
      }
    } catch (error) {
      utils.logError('Error while parsing smilewanted response', error);
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
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = []
    if (syncOptions.iframeEnabled && serverResponses.length > 0) {
      if (serverResponses[0].body.cSyncUrl === 'https://csync.smilewanted.com') {
        syncs.push({
          type: 'iframe',
          url: serverResponses[0].body.cSyncUrl
        });
      }
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
    utils.logWarn('Prebid Error calling setRender on newRenderer', err);
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

registerBidder(spec);
