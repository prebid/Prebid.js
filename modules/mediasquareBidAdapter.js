import {ajax} from '../src/ajax.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import {Renderer} from '../src/Renderer.js';
import { getRefererInfo } from '../src/refererDetection.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const BIDDER_CODE = 'mediasquare';
const BIDDER_URL_PROD = 'https://pbs-front.mediasquare.fr/'
const BIDDER_URL_TEST = 'https://bidder-test.mediasquare.fr/'
const BIDDER_ENDPOINT_AUCTION = 'msq_prebid';
const BIDDER_ENDPOINT_WINNING = 'winning';

const OUTSTREAM_RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

export const spec = {
  code: BIDDER_CODE,
  gvlid: 791,
  aliases: ['msq'], // short code
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.owner && bid.params.code);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    let codes = [];
    let endpoint = document.location.search.match(/msq_test=true/) ? BIDDER_URL_TEST : BIDDER_URL_PROD;
    let floor = {};
    const test = config.getConfig('debug') ? 1 : 0;
    let adunitValue = null;
    Object.keys(validBidRequests).forEach(key => {
      floor = {};
      adunitValue = validBidRequests[key];
      if (typeof adunitValue.getFloor === 'function') {
        if (Array.isArray(adunitValue.sizes)) {
          adunitValue.sizes.forEach(value => {
            let tmpFloor = adunitValue.getFloor({currency: 'USD', mediaType: '*', size: value});
            if (tmpFloor != {}) { floor[value.join('x')] = tmpFloor; }
          });
        }
        let tmpFloor = adunitValue.getFloor({currency: 'USD', mediaType: '*', size: '*'});
        if (tmpFloor != {}) { floor['*'] = tmpFloor; }
      }
      codes.push({
        owner: adunitValue.params.owner,
        code: adunitValue.params.code,
        adunit: adunitValue.adUnitCode,
        bidId: adunitValue.bidId,
        // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
        auctionId: adunitValue.auctionId,
        transactionId: adunitValue.ortb2Imp?.ext?.tid,
        mediatypes: adunitValue.mediaTypes,
        floor: floor
      });
    });
    const payload = {
      codes: codes,
      // TODO: is 'page' the right value here?
      referer: encodeURIComponent(bidderRequest.refererInfo.page || bidderRequest.refererInfo.topmostLocation),
      pbjs: '$prebid.version$'
    };
    if (bidderRequest) { // modules informations (gdpr, ccpa, schain, userId)
      if (bidderRequest.gdprConsent) {
        payload.gdpr = {
          consent_string: bidderRequest.gdprConsent.consentString,
          consent_required: bidderRequest.gdprConsent.gdprApplies
        };
      }
      if (bidderRequest.uspConsent) { payload.uspConsent = bidderRequest.uspConsent; }
      if (bidderRequest.schain) { payload.schain = bidderRequest.schain; }
      if (bidderRequest.userId) {
        payload.userId = bidderRequest.userId;
      } else if (bidderRequest.hasOwnProperty('bids') && typeof bidderRequest.bids == 'object' && bidderRequest.bids.length > 0 && bidderRequest.bids[0].hasOwnProperty('userId')) {
        payload.userId = bidderRequest.bids[0].userId;
      }
      if (bidderRequest.ortb2?.regs?.ext?.dsa) { payload.dsa = bidderRequest.ortb2.regs.ext.dsa }
    };
    if (test) { payload.debug = true; }
    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: endpoint + BIDDER_ENDPOINT_AUCTION,
      data: payloadString,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const serverBody = serverResponse.body;
    // const headerValue = serverResponse.headers.get('some-response-header');
    const bidResponses = [];
    let bidResponse = null;
    let value = null;
    if (serverBody.hasOwnProperty('responses')) {
      Object.keys(serverBody['responses']).forEach(key => {
        value = serverBody['responses'][key];
        bidResponse = {
          requestId: value['bid_id'],
          cpm: value['cpm'],
          width: value['width'],
          height: value['height'],
          creativeId: value['creative_id'],
          currency: value['currency'],
          netRevenue: value['net_revenue'],
          ttl: value['ttl'],
          ad: value['ad'],
          mediasquare: {},
          meta: {
            'advertiserDomains': value['adomain']
          }
        };
        if ('dsa' in value) { bidResponse.meta.dsa = value['dsa']; }
        let paramsToSearchFor = ['bidder', 'code', 'match', 'hasConsent', 'context', 'increment', 'ova'];
        paramsToSearchFor.forEach(param => {
          if (param in value) {
            bidResponse['mediasquare'][param] = value[param];
          }
        });
        if ('native' in value) {
          bidResponse['native'] = value['native'];
          bidResponse['mediaType'] = 'native';
        } else if ('video' in value) {
          if ('url' in value['video']) { bidResponse['vastUrl'] = value['video']['url'] }
          if ('xml' in value['video']) { bidResponse['vastXml'] = value['video']['xml'] }
          bidResponse['mediaType'] = 'video';
          bidResponse['renderer'] = createRenderer(value, OUTSTREAM_RENDERER_URL);
        }
        if (value.hasOwnProperty('deal_id')) { bidResponse['dealId'] = value['deal_id']; }
        bidResponses.push(bidResponse);
      });
    }
    return bidResponses;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    if (typeof serverResponses === 'object' && serverResponses != null && serverResponses.length > 0 && serverResponses[0].hasOwnProperty('body') &&
        serverResponses[0].body.hasOwnProperty('cookies') && typeof serverResponses[0].body.cookies === 'object') {
      return serverResponses[0].body.cookies;
    } else {
      return [];
    }
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
   */
  onBidWon: function(bid) {
    // fires a pixel to confirm a winning bid
    if (bid.hasOwnProperty('mediaType') && bid.mediaType == 'video') {
      return;
    }
    let params = { pbjs: '$prebid.version$', referer: encodeURIComponent(getRefererInfo().page || getRefererInfo().topmostLocation) };
    let endpoint = document.location.search.match(/msq_test=true/) ? BIDDER_URL_TEST : BIDDER_URL_PROD;
    let paramsToSearchFor = ['bidder', 'code', 'match', 'hasConsent', 'context', 'increment', 'ova'];
    if (bid.hasOwnProperty('mediasquare')) {
      paramsToSearchFor.forEach(param => {
        if (bid['mediasquare'].hasOwnProperty(param)) {
          params[param] = bid['mediasquare'][param];
          if (typeof params[param] == 'number') {
            params[param] = params[param].toString();
          }
        }
      });
    };
    paramsToSearchFor = ['cpm', 'size', 'mediaType', 'currency', 'creativeId', 'adUnitCode', 'timeToRespond', 'requestId', 'auctionId', 'originalCpm', 'originalCurrency'];
    paramsToSearchFor.forEach(param => {
      if (bid.hasOwnProperty(param)) {
        params[param] = bid[param];
        if (typeof params[param] == 'number') {
          params[param] = params[param].toString();
        }
      }
    });
    ajax(endpoint + BIDDER_ENDPOINT_WINNING, null, JSON.stringify(params), {method: 'POST', withCredentials: true});
    return true;
  }

}

function outstreamRender(bid) {
  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      sizes: [bid.width, bid.height],
      targetId: bid.adUnitCode,
      adResponse: bid.adResponse,
      rendererOptions: {
        showBigPlayButton: false,
        showProgressBar: 'bar',
        showVolume: false,
        allowFullscreen: true,
        skippable: false,
        content: bid.vastXml
      }
    });
  });
}

function createRenderer(bid, url) {
  const renderer = Renderer.install({
    id: bid.bidId,
    url: url,
    loaded: false,
    adUnitCode: bid.adUnitCode,
    targetId: bid.adUnitCode
  });
  renderer.setRender(outstreamRender);
  return renderer;
}

registerBidder(spec);
