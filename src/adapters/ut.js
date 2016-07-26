import { ajax } from '../ajax';
import { generateUUID } from '../utils';

const ENDPOINT = 'http://ib.adnxs.com/ut/v2';

const UtAdapter = function UtAdapter() {

  function _callBids(params) {
    let tags = [];

    for (let bid of params.bids) {
      let tag = {};

      tag.sizes = bid.sizes;
      tag.uuid = generateUUID();
      tag.id = Number.parseInt(bid.params.placementId);
      tag.prebid = true;
      tag.allow_smaller_sizes = false;
      tag.disable_psa = true;
      tag.ad_types = [0];

      tags.push(tag);
    }

    const payload = JSON.stringify({
      tags: [...tags],
      uuid: generateUUID(),
      member_id: "none"
    });

    ajax(ENDPOINT, handleResponse, payload);
  }

  function handleResponse(response, xhr) {
  }

  return {
    callBids: _callBids
  };

};

module.exports = UtAdapter;
