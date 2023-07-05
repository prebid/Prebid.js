import { registerBidder } from '../src/adapters/bidderFactory.js';
import { NATIVE, BANNER } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const CURRENCY = 'EUR';
const BIDDER_CODE = 'talkads';
const GVLID = 1074;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [ NATIVE, BANNER ],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param poBid  The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (poBid) {
    utils.logInfo('isBidRequestValid : ', poBid);
    if (poBid.params === undefined) {
      utils.logError('VALIDATION FAILED : the parameters must be defined');
      return false;
    }
    if (poBid.params.tag_id === undefined) {
      utils.logError('VALIDATION FAILED : the parameter "tag_id" must be defined');
      return false;
    }
    if (poBid.params.bidder_url === undefined) {
      utils.logError('VALIDATION FAILED : the parameter "bidder_url" must be defined');
      return false;
    }

    return !!(poBid.nativeParams || poBid.sizes);
  }, // isBidRequestValid

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param paValidBidRequests  An array of bids
   * @param poBidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (paValidBidRequests, poBidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    paValidBidRequests = convertOrtbRequestToProprietaryNative(paValidBidRequests);
    utils.logInfo('buildRequests : ', paValidBidRequests, poBidderRequest);
    const laBids = paValidBidRequests.map((poBid, piId) => {
      const loOne = { id: piId, ad_unit: poBid.adUnitCode, bid_id: poBid.bidId, type: '', size: [] };
      if (poBid.nativeParams) {
        loOne.type = 'native';
      } else {
        loOne.type = 'banner';
        loOne.size = poBid.sizes;
      }
      return loOne;
    });
    let laParams = paValidBidRequests[0].params;
    const loServerRequest = {
      cur: CURRENCY,
      timeout: poBidderRequest.timeout,
      auction_id: paValidBidRequests[0].auctionId,
      // TODO: should this use auctionId? see #8573
      transaction_id: paValidBidRequests[0].transactionId,
      bids: laBids,
      gdpr: { applies: false, consent: false },
    };
    if (poBidderRequest && poBidderRequest.gdprConsent) {
      const loGdprConsent = poBidderRequest.gdprConsent;
      if ((typeof loGdprConsent.gdprApplies === 'boolean') && loGdprConsent.gdprApplies) {
        loServerRequest.gdpr.applies = true;
      }
      if ((typeof loGdprConsent.consentString === 'string') && loGdprConsent.consentString) {
        loServerRequest.gdpr.consent = poBidderRequest.gdprConsent.consentString;
      }
    }
    const lsUrl = laParams.bidder_url + '/' + laParams.tag_id;
    return {
      method: 'POST',
      url: lsUrl,
      data: JSON.stringify(loServerRequest),
    };
  }, // buildRequests

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param poServerResponse A successful response from the server.
   * @param poPidRequest Request original server request
   * @return An array of bids which were nested inside the server.
   */
  interpretResponse: function (poServerResponse, poPidRequest) {
    utils.logInfo('interpretResponse : ', poServerResponse);
    if (!poServerResponse.body) {
      return [];
    }
    let laResponse = [];
    if (poServerResponse.body.status !== 'ok') {
      utils.logInfo('Error : ', poServerResponse.body.error);
      return laResponse;
    }
    poServerResponse.body.bids.forEach((poResponse) => {
      laResponse[laResponse.length] = {
        requestId: poResponse.requestId,
        cpm: poResponse.cpm,
        currency: poResponse.currency,
        width: poResponse.width,
        height: poResponse.height,
        ad: poResponse.ad,
        ttl: poResponse.ttl,
        creativeId: poResponse.creativeId,
        netRevenue: poResponse.netRevenue,
        pbid: poServerResponse.body.pbid,
      };
    });
    return laResponse;
  }, // interpretResponse

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction.
   *
   * @param poBid The bid that won the auction
   */
  onBidWon: function (poBid) {
    utils.logInfo('onBidWon : ', poBid);
    let laParams = poBid.params[0];
    if (poBid.pbid) {
      ajax(laParams.bidder_url + 'won/' + poBid.pbid);
    }
  }, // onBidWon
};

registerBidder(spec);
