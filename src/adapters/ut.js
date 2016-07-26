import { ajax } from '../ajax';
import { generateUUID, getSizes } from '../utils';

const ENDPOINT = 'http://ib.adnxs.com/ut/v2';

function UtAdapter() {
  function callBids(params) {
    const tags = params.bids.map(bid => {
      let tag = {};

      const sizes = getSizes(bid.sizes);
      tag.sizes = sizes;
      tag.primary_size = sizes[0];

      tag.uuid = generateUUID();
      tag.id = Number.parseInt(bid.params.placementId);
      tag.prebid = true;
      tag.allow_smaller_sizes = false;
      tag.disable_psa = true;
      tag.ad_types = [0];

      return tag;
    });

    const request = {
      tags: [...tags],
      uuid: generateUUID(),
      member_id: "none"
    };

    const payload = JSON.stringify(request);
    ajax(ENDPOINT, handleResponse, payload);
  }

  function handleResponse(response, xhr) {
  }

  return {callBids};
}

module.exports = UtAdapter;
