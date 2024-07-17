/* eslint-disable no-console */

import { expect } from 'chai';
import { spec } from 'modules/raveltechBidAdapter.js';

const ENDPOINT = 'https://pb1.rvlproxy.net/bid/bid';
const RID_LENGTH = 10000;

describe('RavelTechAdapter', function () {
  let bidRequests = [{
    'bidder': 'raveltech',
    'params': {
      'placementId': 234234
    },
    'userId': {
      'id5id': {
        'uid': '0',
        'ext': {
          'linkType': 0,
          'pba': 'K2ogG7aaimJB4/PSEuwADQ=='
        }
      },
      'pubProvidedId': [
        {
          'source': 'adnxs.com',
          'uids': [
            {
              'id': 'webo-id-1',
              'atype': 1,
              'ext': {
                'stype': 'ppuid'
              }
            }
          ]
        },
        {
          'source': 'adnxs.com',
          'uids': [
            {
              'id': 'webo-id-2',
              'atype': 1,
              'ext': {
                'stype': 'ppuid'
              }
            }
          ]
        },
        null
      ]
    },
    'userIdAsEids': [
      {
        'source': 'id5-sync.com',
        'uids': [
          {
            'id': '0',
            'atype': 1,
            'ext': {
              'linkType': 0,
              'pba': 'K2ogG7aaimJB4/PSEuwADQ=='
            }
          }
        ]
      },
      {
        'source': 'adnxs.com',
        'uids': [
          {
            'id': 'webo-id-1',
            'atype': 1,
            'ext': {
              'stype': 'ppuid'
            }
          },
          {
            'id': 'webo-id-2',
            'atype': 1,
            'ext': {
              'stype': 'ppuid'
            }
          }
        ]
      }
    ],
    'ortb2Imp': {
      'ext': {}
    },
    'mediaTypes': {
      'banner': {
        'sizes': [
          [300, 250],
          [300, 600],
          [728, 90]
        ]
      }
    },
    'adUnitCode': 'test-div',
    'transactionId': null,
    'adUnitId': 'd6f8ff69-1336-41c3-a639-20b76c6e0be1',
    'sizes': [
      [300, 250],
      [300, 600],
      [728, 90]
    ],
    'bidId': '3da7e5be5cc74',
    'bidderRequestId': '22077672ce0e1f',
    'auctionId': null,
    'src': 'client',
    'bidRequestsCount': 1,
    'bidderRequestsCount': 1,
    'bidderWinsCount': 0
  }];

  describe('anonymizeBidRequests', function () {
    let anonymizedBidRequests;

    beforeEach(function() {
      console.log('ravel: beforeEach() eids ', JSON.stringify(bidRequests[0].userIdAsEids));
      anonymizedBidRequests = spec.buildRequests(bidRequests);
      if (!Array.isArray(anonymizedBidRequests)) {
        anonymizedBidRequests = [anonymizedBidRequests];
      }
    });

    it('should anonymize every id if the source is eligible for anonymization', function() {
      anonymizedBidRequests.forEach(bid => {
        const eids = bid.data.eids;

        eids.forEach(eid => {
          if (eid.source === 'not-eligible-source') { return; } // if the source is not eligible, then go to the next eid
          expect(eid.id).to.be.an('array').that.is.empty;
        })
      })
    });

    it('should empty the id if the source is not eligible for anonymization', function() {
      anonymizedBidRequests.forEach(bid => {
        const eids = bid.data.eids;

        eids.forEach(eid => {
          if (eid.source !== 'not-eligible-source') { return; } // if the source is eligible, then go to the next eid
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

/* eslint-disable no-console */
