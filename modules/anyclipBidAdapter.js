import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {deepAccess, isArray, logError, logInfo} from '../src/utils.js';
import {config} from '../src/config.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 */

const BIDDER_CODE = 'anyclip';
const ENDPOINT_URL = 'https://prebid.anyclip.com';
const DEFAULT_CURRENCY = 'USD';
const NET_REVENUE = false;

let pubTag = null;

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * @param {object} bid
   * @return {boolean}
   */
  isBidRequestValid: (bid = {}) => {
    const bidder = deepAccess(bid, 'bidder');
    const params = deepAccess(bid, 'params', {});
    const mediaTypes = deepAccess(bid, 'mediaTypes', {});
    const banner = deepAccess(mediaTypes, BANNER, {});

    const isValidBidder = (bidder === BIDDER_CODE);
    const isValidSize = (Boolean(banner.sizes) && isArray(mediaTypes[BANNER].sizes) && mediaTypes[BANNER].sizes.length > 0);
    const hasSizes = mediaTypes[BANNER] ? isValidSize : false;
    const hasRequiredBidParams = Boolean(params.publisherId && params.supplyTagId);

    const isValid = isValidBidder && hasSizes && hasRequiredBidParams;
    if (!isValid) {
      logError(`Invalid bid request: isValidBidder: ${isValidBidder}, hasSizes: ${hasSizes}, hasRequiredBidParams: ${hasRequiredBidParams}`);
    }
    return isValid;
  },

  /**
   * @param {BidRequest[]} validBidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    const bidRequest = validBidRequests[0];

    let refererInfo;
    if (bidderRequest && bidderRequest.refererInfo) {
      refererInfo = bidderRequest.refererInfo;
    }

    const timeout = bidderRequest.timeout;
    const timeoutAdjustment = timeout - ((20 / 100) * timeout); // timeout adjustment - 20%

    if (isPubTagAvailable()) {
      if (!pubTag) {
        pubTag = window._anyclip.pubTag;
      }
      // Options
      const options = {
        publisherId: bidRequest.params.publisherId,
        supplyTagId: bidRequest.params.supplyTagId,
        url: refererInfo.page,
        domain: refererInfo.domain,
        prebidTimeout: timeoutAdjustment,
        gpid: bidRequest.adUnitCode,
        ext: {
          transactionId: bidRequest.transactionId
        },
        sizes: bidRequest.sizes.map((size) => {
          return {width: size[0], height: size[1]}
        })
      }
      // Floor
      const floor = parseFloat(deepAccess(bidRequest, 'params.floor'));
      if (!isNaN(floor)) {
        options.ext.floor = floor;
      }
      // Supply Chain (Schain)
      if (bidRequest?.schain) {
        options.schain = bidRequest.schain
      }
      // GDPR & Consent (EU)
      if (bidderRequest?.gdprConsent) {
        options.gdpr = (bidderRequest.gdprConsent.gdprApplies ? 1 : 0);
        options.consent = bidderRequest.gdprConsent.consentString;
      }
      // GPP
      if (bidderRequest?.gppConsent?.gppString) {
        options.gpp = {
          gppVersion: bidderRequest.gppConsent.gppVersion,
          sectionList: bidderRequest.gppConsent.sectionList,
          applicableSections: bidderRequest.gppConsent.applicableSections,
          gppString: bidderRequest.gppConsent.gppString
        }
      }
      // CCPA (US Privacy)
      if (bidderRequest?.uspConsent) {
        options.usPrivacy = bidderRequest.uspConsent;
      }
      // COPPA
      if (config.getConfig('coppa') === true) {
        options.coppa = 1;
      }
      // Eids
      if (bidRequest?.userIdAsEids) {
        const eids = bidRequest.userIdAsEids;
        if (eids && eids.length) {
          options.eids = eids;
        }
      }

      // Request bids
      const requestBidsPromise = pubTag.requestBids(options);
      if (requestBidsPromise !== undefined) {
        requestBidsPromise
          .then(() => {
            logInfo('PubTag requestBids > DONE');
          })
          .catch((err) => {
            logInfo('PubTag requestBids > ERROR', err);
          });
      }

      // Request
      const payload = {
        tmax: timeoutAdjustment
      }

      return {
        method: 'GET',
        url: ENDPOINT_URL,
        data: payload,
        bidRequest
      }
    }
  },

  /**
   * @param {*} serverResponse
   * @param {ServerRequest} bidRequest
   * @return {Bid[]}
   */
  interpretResponse: (serverResponse, { bidRequest }) => {
    const body = serverResponse.body || serverResponse;
    const bids = [];

    if (isPubTagAvailable() && pubTag) {
      const bidResponse = pubTag.getBids(bidRequest.transactionId);
      if (bidResponse) {
        const { adServer } = bidResponse;
        if (adServer) {
          bids.push({
            requestId: bidRequest.bidId,
            creativeId: adServer.bid.creativeId,
            cpm: bidResponse.cpm,
            width: adServer.bid.width,
            height: adServer.bid.height,
            currency: adServer.bid.currency || DEFAULT_CURRENCY,
            netRevenue: NET_REVENUE,
            ttl: adServer.bid.ttl,
            ad: adServer.bid.ad,
            meta: adServer.bid.meta
          });
        }
      }
    }

    return bids;
  },

  /**
   * @param {Bid} bid
   */
  onBidWon: (bid) => {
    if (isPubTagAvailable() && pubTag) {
      pubTag.bidWon(bid);
    }
  }
}

/**
 * @return {boolean}
 */
const isPubTagAvailable = () => {
  return !!(window._anyclip && window._anyclip.PubTag);
}

registerBidder(spec);
