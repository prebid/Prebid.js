import { expect } from 'chai';
import { spec } from 'modules/fidelityBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('FidelityAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'fidelity',
      'params': {
        'zoneid': '37',
        'floor': '0.05',
        'server': 't.fidelity-media.com',
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

    it('should return true when required params found', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'zoneid': '37',
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'zoneid': 0,
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let bidderRequest = {
      bidderCode: 'fidelity',
      requestId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
      bidderRequestId: '178e34bad3658f',
      bids: [
        {
          bidder: 'fidelity',
          params: {
            zoneid: '37',
            floor: '0.05',
            server: 't.fidelity-media.com',
          },
          placementCode: '/19968336/header-bid-tag-0',
          sizes: [[300, 250], [320, 50]],
          bidId: '2ffb201a808da7',
          bidderRequestId: '178e34bad3658f',
          requestId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
          transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b'
        }
      ],
      start: 1472239426002,
      auctionStart: 1472239426000,
      timeout: 5000
    };

    it('should add source and verison to the tag', () => {
      const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
      const payload = request.data;
      expect(payload.from).to.exist;
      expect(payload.v).to.exist;
      expect(payload.requestid).to.exist;
      expect(payload.impid).to.exist;
      expect(payload.zoneid).to.exist;
      expect(payload.floor).to.exist;
      expect(payload.charset).to.exist;
      expect(payload.subid).to.exist;
      expect(payload.flashver).to.exist;
      expect(payload.tmax).to.exist;
      expect(payload.defloc).to.exist;
    });

    it('should add gdpr consent information to the request', () => {
      let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      bidderRequest.gdprConsent = {
        gdprApplies: true,
        consentString: consentString,
        vendorData: {
          vendorConsents: {
            '408': 1
          },
        },
      };
      const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
      const payload = request.data;
      expect(payload.gdpr).to.exist.and.to.be.a('number');
      expect(payload.gdpr).to.equal(1);
      expect(payload.consent_str).to.exist.and.to.be.a('string');
      expect(payload.consent_str).to.equal(consentString);
      expect(payload.consent_given).to.exist.and.to.be.a('number');
      expect(payload.consent_given).to.equal(1);
    });

    it('sends bid request to ENDPOINT via GET', () => {
      const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
      expect(request.url).to.equal('//t.fidelity-media.com/delivery/hb.php');
      expect(request.method).to.equal('GET');
    });
  })

  describe('interpretResponse', () => {
    let response = {
      'id': '543210',
      'seatbid': [ {
        'bid': [ {
          'id': '1111111',
          'impid': 'bidId-123456-1',
          'price': 0.09,
          'adm': '<!-- Creative -->',
          'width': 728,
          'height': 90,
        } ]
      } ]
    };

    it('should get correct bid response', () => {
      let expectedResponse = [
        {
          requestId: 'bidId-123456-1',
          creativeId: 'bidId-123456-1',
          cpm: 0.09,
          width: 728,
          height: 90,
          ad: '<!-- Creative -->',
          netRevenue: true,
          currency: 'USD',
          ttl: 360,
        }
      ];

      let result = spec.interpretResponse({ body: response });
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', () => {
      let response = {
        'id': '543210',
        'seatbid': [ ]
      };

      let result = spec.interpretResponse({ body: response });
      expect(result.length).to.equal(0);
    });
  });

  describe('user sync', () => {
    const syncUrl = '//x.fidelity-media.com/delivery/matches.php?type=iframe';

    it('should register the sync iframe', () => {
      expect(spec.getUserSyncs({})).to.be.undefined;
      expect(spec.getUserSyncs({iframeEnabled: false})).to.be.undefined;
      const options = spec.getUserSyncs({iframeEnabled: true});
      expect(options).to.not.be.undefined;
      expect(options).to.have.lengthOf(1);
      expect(options[0].type).to.equal('iframe');
      expect(options[0].url).to.equal(syncUrl);
    });
  });
});
