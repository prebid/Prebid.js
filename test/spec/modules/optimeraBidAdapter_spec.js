import { expect } from 'chai';
import { spec } from 'modules/optimeraBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('OptimeraAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  })

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'optimera',
      'params': {
        'clientID': '9999'
      },
      'adUnitCode': 'div-0',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  })

  describe('buildRequests', function () {
    let bid = [
      {
        'adUnitCode': 'div-0',
        'auctionId': '1ab30503e03994',
        'bidId': '313e0afede8cdb',
        'bidder': 'optimera',
        'bidderRequestId': '202be1ce3f6194',
        'params': {
          'clientID': '0'
        }
      }
    ];
    it('buildRequests fires', function () {
      let request = spec.buildRequests(bid);
      expect(request).to.exist;
      expect(request.method).to.equal('GET');
      expect(request.payload).to.exist;
    });
  })

  describe('interpretResponse', function () {
    let serverResponse = {};
    serverResponse.body = JSON.parse('{"div-0":["RB_K","728x90K"], "timestamp":["RB_K","1507565666"], "device": { "de": { "div-0":["A1","728x90K"] }, "mo": { "div-0":["RB_K","728x90K"] }, "tb": { "div-0":["RB_K","728x90K"] } } }');
    var bidRequest = {
      'method': 'get',
      'payload': [
        {
          'bidder': 'optimera',
          'params': {
            'clientID': '0'
          },
          'adUnitCode': 'div-0',
          'bidId': '307440db8538ab'
        }
      ]
    }
    it('interpresResponse fires', function () {
      let bidResponses = spec.interpretResponse(serverResponse, bidRequest);
      expect(bidResponses[0].dealId[0]).to.equal('RB_K');
      expect(bidResponses[0].dealId[1]).to.equal('728x90K');
    });
  });

  describe('interpretResponse with optional device param', function () {
    let serverResponse = {};
    serverResponse.body = JSON.parse('{"div-0":["RB_K","728x90K"], "timestamp":["RB_K","1507565666"], "device": { "de": { "div-0":["A1","728x90K"] }, "mo": { "div-0":["RB_K","728x90K"] }, "tb": { "div-0":["RB_K","728x90K"] } } }');
    var bidRequest = {
      'method': 'get',
      'payload': [
        {
          'bidder': 'optimera',
          'params': {
            'clientID': '0',
            'device': 'de'
          },
          'adUnitCode': 'div-0',
          'bidId': '307440db8538ab'
        }
      ]
    }
    it('interpresResponse fires', function () {
      let bidResponses = spec.interpretResponse(serverResponse, bidRequest);
      expect(bidResponses[0].dealId[0]).to.equal('A1');
      expect(bidResponses[0].dealId[1]).to.equal('728x90K');
    });
  });
});
