import { expect } from 'chai';
import { spec } from 'modules/adoceanBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('AdoceanAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      'bidder': 'adocean',
      'params': {
        'masterId': 'tmYF.DMl7ZBq.Nqt2Bq4FutQTJfTpxCOmtNPZoQUDcL.G7',
        'slaveId': 'adoceanmyaozpniqismex',
        'emiter': 'myao.adocean.pl'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      const bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'masterId': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        'bidder': 'adocean',
        'params': {
          'masterId': 'tmYF.DMl7ZBq.Nqt2Bq4FutQTJfTpxCOmtNPZoQUDcL.G7',
          'slaveId': 'adoceanmyaozpniqismex',
          'emiter': 'myao.adocean.pl'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    const bidderRequest = {
      gdprConsent: {
        consentString: 'BOQHk-4OSlWKFBoABBPLBd-AAAAgWAHAACAAsAPQBSACmgFTAOkA',
        gdprApplies: true
      }
    };

    it('should add bidIdMap with slaveId => bidId mapping', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.bidIdMap).to.exists;
      const bidIdMap = request.bidIdMap;
      expect(bidIdMap[bidRequests[0].params.slaveId]).to.equal(bidRequests[0].bidId);
    });

    it('sends bid request to url via GET', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.method).to.equal('GET');
      expect(request.url).to.match(new RegExp(`^https://${bidRequests[0].params.emiter}/ad.json`));
    });

    it('should attach id to url', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.url).to.include('id=' + bidRequests[0].params.masterId);
    });

    it('should attach consent information to url', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.url).to.include('gdpr=1');
      expect(request.url).to.include('gdpr_consent=' + bidderRequest.gdprConsent.consentString);
    });
  })

  describe('interpretResponse', function () {
    const response = {
      'body': [
        {
          'id': 'adoceanmyaozpniqismex',
          'price': '0.019000',
          'winurl': '',
          'statsUrl': '',
          'code': '%3C!--%20Creative%20--%3E',
          'currency': 'EUR',
          'minFloorPrice': '0.01',
          'width': '300',
          'height': '250',
          'crid': '0af345b42983cc4bc0',
          'ttl': '300'
        }
      ],
      'headers': {
        'get': function() {}
      }
    };

    const bidRequest = {
      'bidder': 'adocean',
      'params': {
        'masterId': 'tmYF.DMl7ZBq.Nqt2Bq4FutQTJfTpxCOmtNPZoQUDcL.G7',
        'slaveId': 'adoceanmyaozpniqismex',
        'emiter': 'myao.adocean.pl'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250]],
      'bidIdMap': {
        'adoceanmyaozpniqismex': '30b31c1838de1e'
      },
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should get correct bid response', function () {
      const expectedResponse = [
        {
          'requestId': '30b31c1838de1e',
          'cpm': 0.019000,
          'currency': 'EUR',
          'width': 300,
          'height': 250,
          'ad': '<!-- Creative -->',
          'creativeId': '0af345b42983cc4bc0',
          'ttl': 300,
          'netRevenue': false
        }
      ];

      const result = spec.interpretResponse(response, bidRequest);
      expect(result).to.have.lengthOf(1);
      let resultKeys = Object.keys(result[0]);
      expect(resultKeys.sort()).to.deep.equal(Object.keys(expectedResponse[0]).sort());
      resultKeys.forEach(function(k) {
        if (k === 'ad') {
          expect(result[0][k]).to.match(/<!-- Creative -->$/);
        } else {
          expect(result[0][k]).to.equal(expectedResponse[0][k]);
        }
      });
    });

    it('handles nobid responses', function () {
      response.body = [
        {
          'id': 'adoceanmyaolafpjwftbz',
          'error': 'true'
        }
      ];

      const result = spec.interpretResponse(response, bidRequest);
      expect(result).to.have.lengthOf(0);
    });
  });
});
