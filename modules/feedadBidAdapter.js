import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import {config} from 'src/config';

/**
 * Bidder network identity code
 * @type {string}
 */
const BIDDER_CODE = 'feedad';

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function (bid) {
  },
  buildRequests: function (validBidRequests, bidderRequest) {
  },
  interpretResponse: function (serverResponse, request) {
  },
  getUserSyncs: function (syncOptions, serverResponses) {
  },
  onTimeout: function (timeoutData) {
  },
  onBidWon: function (bid) {
  },
  onSetTargeting: function (bid) {
  }
};
registerBidder(spec);
