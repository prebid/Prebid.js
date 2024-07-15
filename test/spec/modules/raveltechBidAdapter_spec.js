import { expect } from 'chai';
import { spec } from 'modules/raveltechBidAdapter.js';

const ENDPOINT = 'https://pb1.rvlproxy.net/bid/bid';
const RID_LENGTH = 10000;

describe('RavelTechAdapter', function () {
  const bidRequests = [{
    'bidder': 'raveltech',
    'params': {
      'placement_id': 234234
    },
    'userIdAsEids': [{
      'source': 'not-eligible-source',
      'uids': [{
        'id': '12345678'
      }]
    },
    {
      'source': 'adnxs.com',
      'uids': [{
        'id': '5435546'
      },
      {
        'id': '2398645'
      }]
    }]
  }];

  describe('anonymizeBidRequests', function () {
    let anonymizedBidRequests;

    beforeEach(function() {
      anonymizedBidRequests = spec.buildRequests(bidRequests);
      if (!Array.isArray(anonymizedBidRequests)) {
        anonymizedBidRequests = [anonymizedBidRequests];
      }
    });

    it('should anonymize every id if the source is eligible for anonymization', function() {
      anonymizedBidRequests.forEach(bid => {
        console.log(bid);
        bid.data = JSON.parse(bid.data);
        const eids = bid.data.eids;

        eids.forEach(eid => {
          if (eid.source === 'not-eligible-source') { return; }
          expect(typeof eid.id).to.equal('string');
          expect(eid.id.length).to.be.at.least(RID_LENGTH);
        })
      })
    });

    it('should empty the id if the source is not eligible for anonymization', function() {
      anonymizedBidRequests.forEach(bid => {
        console.log(bid);
        bid.data = JSON.parse(bid.data);
        const eids = bid.data.eids;

        eids.forEach(eid => {
          if (eid.source !== 'not-eligible-source') { return; }
          expect(eid.id).to.satisfy(id => id === '' || (Array.isArray(id) && id.length === 0));
        })
      })
    });

    it('should update the URL of every bid request', function() {
      anonymizedBidRequests.forEach(bid => {
        expect(bid.url).to.equal(ENDPOINT);
      });
    });
  });
});
