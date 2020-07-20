import * as utils from '../src/utils.js';
import {
  BANNER,
  VIDEO
} from '../src/mediaTypes.js';
import {
  config
} from '../src/config.js';
import {
  registerBidder
} from '../src/adapters/bidderFactory.js';
import {
  createEidsArray
} from './userId/eids.js';
const BIDDER_CODE = 'smartadserver';
export const spec = {
  code: BIDDER_CODE,
  aliases: ['smart'], // short code
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.siteId && bid.params.pageId && bid.params.formatId);
  },

  /**
   * Serialize a supply chain object to a string uri encoded
   *
   * @param {*} schain object
   */
  serializeSupplyChain: function(schain) {
    if (!schain || !schain.nodes) return null;
    const nodesProperties = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];
    return `${schain.ver},${schain.complete}!` +
      schain.nodes.map(node => nodesProperties.map(prop =>
        node[prop] ? encodeURIComponent(node[prop]) : '')
        .join(','))
        .join('!');
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests an array of bids
   * @param {BidderRequest} bidderRequest bidder request object
   * @return {ServerRequest[]} Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    // use bidderRequest.bids[] to get bidder-dependent request info
    // if your bidder supports multiple currencies, use config.getConfig(currency)
    // to find which one the ad server needs

    // pull requested transaction ID from bidderRequest.bids[].transactionId
    return validBidRequests.map(bid => {
      // Common bid request attributes for banner, outstream and instream.
      let payload = {
        siteid: bid.params.siteId,
        pageid: bid.params.pageId,
        formatid: bid.params.formatId,
        currencyCode: config.getConfig('currency.adServerCurrency'),
        bidfloor: bid.params.bidfloor || 0.0,
        targeting: bid.params.target && bid.params.target !== '' ? bid.params.target : undefined,
        buid: bid.params.buId && bid.params.buId !== '' ? bid.params.buId : undefined,
        appname: bid.params.appName && bid.params.appName !== '' ? bid.params.appName : undefined,
        ckid: bid.params.ckId || 0,
        tagId: bid.adUnitCode,
        pageDomain: bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer ? bidderRequest.refererInfo.referer : undefined,
        transactionId: bid.transactionId,
        timeout: config.getConfig('bidderTimeout'),
        bidId: bid.bidId,
        prebidVersion: '$prebid.version$',
        schain: spec.serializeSupplyChain(bid.schain)
      };

      const videoMediaType = utils.deepAccess(bid, 'mediaTypes.video');
      if (!videoMediaType) {
        const bannerMediaType = utils.deepAccess(bid, 'mediaTypes.banner');
        payload.sizes = bannerMediaType.sizes.map(size => ({
          w: size[0],
          h: size[1]
        }));
      } else if (videoMediaType && videoMediaType.context === 'instream') {
        // Specific attributes for instream.
        let playerSize = videoMediaType.playerSize[0];
        payload.isVideo = true;
        payload.videoData = {
          videoProtocol: bid.params.video.protocol,
          playerWidth: playerSize[0],
          playerHeight: playerSize[1],
          adBreak: bid.params.video.startDelay || 1
        };
      } else {
        return {};
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        payload.gdpr_consent = bidderRequest.gdprConsent.consentString;
        payload.gdpr = bidderRequest.gdprConsent.gdprApplies; // we're handling the undefined case server side
      }

      if (bid && bid.userId) {
        payload.eids = createEidsArray(bid.userId);
      }

      if (bidderRequest && bidderRequest.uspConsent) {
        payload.us_privacy = bidderRequest.uspConsent;
      }

      var payloadString = JSON.stringify(payload);

      return {
        method: 'POST',
        url: (bid.params.domain !== undefined ? bid.params.domain : 'https://prg.smartadserver.com') + '/prebid/v1',
        data: payloadString,
      };
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {*} bidRequestString
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequestString) {
    const bidResponses = [];
    let response = serverResponse.body;
    try {
      if (response) {
        const bidRequest = JSON.parse(bidRequestString.data);

        let bidResponse = {
          requestId: bidRequest.bidId,
          cpm: response.cpm,
          width: response.width,
          height: response.height,
          creativeId: response.creativeId,
          dealId: response.dealId,
          currency: response.currency,
          netRevenue: response.isNetCpm,
          ttl: response.ttl
        };

        if (bidRequest.isVideo) {
          bidResponse.mediaType = VIDEO;
          bidResponse.vastUrl = response.adUrl;
          bidResponse.vastXml = response.ad;
        } else {
          bidResponse.adUrl = response.adUrl;
          bidResponse.ad = response.ad;
        }

        bidResponses.push(bidResponse);
      }
    } catch (error) {
      utils.logError('Error while parsing smart server response', error);
    }
    return bidResponses;
  },

  /**
   * User syncs.
   *
   * @param {*} syncOptions Publisher prebid configuration.
   * @param {*} serverResponses A successful response from the server.
   * @return {syncs[]} An array of syncs that should be executed.
   */
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    if (syncOptions.iframeEnabled && serverResponses.length > 0) {
      syncs.push({
        type: 'iframe',
        url: serverResponses[0].body.cSyncUrl
      });
    }
    return syncs;
  }
};

registerBidder(spec);
