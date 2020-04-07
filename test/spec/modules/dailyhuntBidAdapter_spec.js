import { expect } from 'chai';
import { spec } from 'modules/dailyhuntBidAdapter.js';

const PROD_PREBID_ENDPOINT_URL = 'https://qa-pbs-van.dailyhunt.in/openrtb2/auction';
const PROD_PREBID_TEST_ENDPOINT_URL = 'http://dh2-van-qa-n1.dailyhunt.in:8000/openrtb2/auction';

const _encodeURIComponent = function (a) {
  if (!a) { return }
  let b = window.encodeURIComponent(a);
  b = b.replace(/'/g, '%27');
  return b;
}

describe('DailyhuntAdapter', function () {
  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'dailyhunt',
      'params': {
        placement_id: 1,
        publisher_id: 1
      }
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });
})
