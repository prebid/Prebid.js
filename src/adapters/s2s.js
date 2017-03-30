import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';

const ENDPOINT = '//prebid.adnxs.com/auction';
const TYPE = 's2s';

/**
 * Bidder adapter for /ut endpoint. Given the list of all ad unit tag IDs,
 * sends out a bid request. When a bid response is back, registers the bid
 * to Prebid.js. This adapter supports alias bidding.
 */
module.exports = function() {
  /* Prebid executes this function when the page asks to send out bid requests */
 let  _callBids = function(bidRequest) {

    const payload = JSON.stringify(bidRequest);
    ajax(ENDPOINT, handleResponse, payload, {
      contentType: 'text/plain',
      withCredentials : true
    });
  };

  function handleResponse(response) {
    let parsed;

    try {
      parsed = JSON.parse(response);
    } catch (error) {
      utils.logError(error);
    }

    if (!parsed || parsed.status.includes('Error')) {
      console.log('error parsing resposne');
    }

  }

  return {
    callBids: _callBids
  };
};
