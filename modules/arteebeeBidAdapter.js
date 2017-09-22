import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';       // useful functions
import { ajax } from 'src/ajax';          // recommended AJAX library
import { STATUS } from 'src/constants';

/**
 * Adapter for requesting bids from ArTeeBee.
 *
 * @returns {{callBids: _callBids}}
 */
function ArteebeeAdapter() {
  function _callBids(params) {
  }

  return {
    callBids: _callBids
  };
}

adaptermanager.registerBidAdapter(new ArteebeeAdapter(), 'arteebee');

module.exports = ArteebeeAdapter;
