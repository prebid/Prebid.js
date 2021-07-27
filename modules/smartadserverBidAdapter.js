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
const GVL_ID = 45;
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
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
   * Transforms the banner ad unit sizes into an object array.
   *
   * @param {*} bannerSizes Array of size array (ex. [[300, 250]]).
   * @returns
   */
  adaptBannerSizes: function(bannerSizes) {
    return bannerSizes.map(size => ({
      w: size[0],
      h: size[1]
    }));
  },

  /**
   * Fills the payload with specific video attributes.
   *
   * @param {*} payload Payload that will be sent in the ServerRequest
   * @param {*} videoMediaType Video media type.
   */
  fillPayloadForVideoBidRequest: function(payload, videoMediaType, videoParams) {
    const playerSize = videoMediaType.playerSize[0];
    payload.isVideo = videoMediaType.context === 'instream';
    payload.mediaType = VIDEO;
    payload.videoData = {
      videoProtocol: videoParams.protocol,
      playerWidth: playerSize[0],
      playerHeight: playerSize[1],
      adBreak: videoParams.startDelay || 1
    };
  },

  /**
   * Creates the server request.
   *
   * @param {*} payload Body of the request.
   * @param {string} domain Endpoint domain .
   * @returns {ServerRequest} Info describing the request to the server.
   */
  createServerRequest: function(payload, domain) {
    return {
      method: 'POST',
      url: (domain !== undefined ? domain : 'https://prg.smartadserver.com') + '/prebid/v1',
      data: JSON.stringify(payload),
    };
  },

  /**
   * Makes server requests from the list of BidRequests.
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
    return validBidRequests.reduce((bidRequests, bid) => {
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

      if (bidderRequest && bidderRequest.gdprConsent) {
        payload.addtl_consent = bidderRequest.gdprConsent.addtlConsent;
        payload.gdpr_consent = bidderRequest.gdprConsent.consentString;
        payload.gdpr = bidderRequest.gdprConsent.gdprApplies; // we're handling the undefined case server side
      }

      if (bid && bid.userId) {
        payload.eids = createEidsArray(bid.userId);
      }

      if (bidderRequest && bidderRequest.uspConsent) {
        payload.us_privacy = bidderRequest.uspConsent;
      }

      const videoMediaType = utils.deepAccess(bid, 'mediaTypes.video');
      const bannerMediaType = utils.deepAccess(bid, 'mediaTypes.banner');
      const isAdUnitContainingVideo = videoMediaType && (videoMediaType.context === 'instream' || videoMediaType.context === 'outstream');
      if (!isAdUnitContainingVideo && bannerMediaType) {
        payload.sizes = spec.adaptBannerSizes(bannerMediaType.sizes);
        bidRequests.push(spec.createServerRequest(payload, bid.params.domain));
      } else if (isAdUnitContainingVideo && !bannerMediaType) {
        spec.fillPayloadForVideoBidRequest(payload, videoMediaType, bid.params.video);
        bidRequests.push(spec.createServerRequest(payload, bid.params.domain));
      } else if (isAdUnitContainingVideo && bannerMediaType) {
        // If there are video and banner media types in the ad unit, we clone the payload
        // to create a specific one for video.
        let videoPayload = utils.deepClone(payload);

        spec.fillPayloadForVideoBidRequest(videoPayload, videoMediaType, bid.params.video);
        bidRequests.push(spec.createServerRequest(videoPayload, bid.params.domain));

        payload.sizes = spec.adaptBannerSizes(bannerMediaType.sizes);
        bidRequests.push(spec.createServerRequest(payload, bid.params.domain));
      } else {
        bidRequests.push({});
      }

      return bidRequests;
    }, []);
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
      if (response && !response.isNoAd) {
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
          ttl: response.ttl,
          dspPixels: response.dspPixels,
          meta: { advertiserDomains: response.adomain ? response.adomain : [] }
        };

        if (bidRequest.mediaType === VIDEO) {
          bidResponse.mediaType = VIDEO;
          bidResponse.vastUrl = response.adUrl;
          bidResponse.vastXml = response.ad;
          bidResponse.content = response.ad;
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
    if (syncOptions.iframeEnabled && serverResponses.length > 0 && serverResponses[0].body.cSyncUrl != null) {
      syncs.push({
        type: 'iframe',
        url: serverResponses[0].body.cSyncUrl
      });
    } else if (syncOptions.pixelEnabled && serverResponses.length > 0 && serverResponses[0].body.dspPixels !== undefined) {
      serverResponses[0].body.dspPixels.forEach(function(pixel) {
        syncs.push({
          type: 'image',
          url: pixel
        });
      });
    }
    return syncs;
  }
};

registerBidder(spec);
