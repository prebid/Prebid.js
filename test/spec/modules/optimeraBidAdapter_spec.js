import { expect } from 'chai';
import { spec } from 'modules/optimeraBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('OptimeraAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  })

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'optimera',
      'params': {
        'custom': {
          'clientID': '0'
        }
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  })

  describe('buildRequests', () => {
    let validBidRequests = [
      {
        'adUnitCode': 'div-0',
        'auctionId': '1ab30503e03994',
        'bidId': '313e0afede8cdb',
        'bidder': 'optimera',
        'bidderRequestId': '202be1ce3f6194',
        'params': {
          'placementCode': '0',
          'placementId': '104333943',
          'custom': {
            'clientId': '0'
          }
        }
      }
    ];
    it('buildRequests fires', () => {
      var request = spec.buildRequests(validBidRequests);
    });
  })

  describe('interpretResponse', () => {
    let serverResponse = 'window.oVa = {"div-0":["RB_K","728x90K"], "div-1":["RB_K","300x250K", "300x600K"], "timestamp":["RB_K","1507565666"]};';
    var bidRequest = {
      'method': 'get',
      'payload': [
        {
          'bidder': 'optimera',
          'params': {
            'placementId': '10433943',
            'placementCode': '0',
            'custom': {
              'clientID': '0'
            }
          },
          'adUnitCode': 'div-0',
          'bidId': '307440db8538ab'
        }
      ]
    }
    it('interpresResponse fires', () => {
      window.oDv = window.oDv || [];
      var bidResponses = spec.interpretResponse(serverResponse, bidRequest);
    });
  });
});
