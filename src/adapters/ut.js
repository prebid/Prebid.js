import { ajax } from '../ajax';

const ENDPOINT = 'http://ib.adnxs.com/ut/v2';

const UtAdapter = function UtAdapter() {

  function _callBids(params) {

    let bids = [];
    for (let bid of params.bids) {
    }

    ajax(ENDPOINT, null, bids);
  }

  return {
    callBids: _callBids
  };

};

module.exports = UtAdapter;
