import { expect } from 'chai';
import { spec } from 'modules/adoceanBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { deepClone } from 'src/utils.js';

describe('AdoceanAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bannerBid = {
      bidder: 'adocean',
      params: {
        masterId: 'tmYF.DMl7ZBq.Nqt2Bq4FutQTJfTpxCOmtNPZoQUDcL.G7',
        slaveId: 'adoceanmyaozpniqismex',
        emitter: 'myao.adocean.pl'
      },
      adUnitCode: 'adunit-code',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bannerBid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      const invalidBid = Object.assign({}, bannerBid, {params: {masterId: 0}});
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    const videoInscreenBid = {
      bidder: 'adocean',
      params: {
        masterId: 'tmYF.DMl7ZBq.Nqt2Bq4FutQTJfTpxCOmtNPZoQUDcL.G7',
        slaveId: 'adoceanmyaozpniqismex',
        emitter: 'myao.adocean.pl'
      },
      adUnitCode: 'adunit-code',
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [300, 250]
        }
      },
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
    };

    it('should return true for instream video', function () {
      expect(spec.isBidRequestValid(videoInscreenBid)).to.equal(true);
    });

    const videoAdpodBid = {
      bidder: 'adocean',
      params: {
        masterId: 'tmYF.DMl7ZBq.Nqt2Bq4FutQTJfTpxCOmtNPZoQUDcL.G7',
        slaveId: 'adoceanmyaozpniqismex',
        emitter: 'myao.adocean.pl'
      },
      adUnitCode: 'adunit-code',
      mediaTypes: {
        video: {
          context: 'adpod',
          playerSize: [300, 250],
          adPodDurationSec: 300,
          durationRangeSec: [15, 30],
          requireExactDuration: false
        }
      },
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
    };

    it('should return true for adpod video without requireExactDuration', function () {
      expect(spec.isBidRequestValid(videoAdpodBid)).to.equal(true);
    });

    it('should return false for adpod video with requireExactDuration', function () {
      const invalidBid = Object.assign({}, videoAdpodBid);
      invalidBid.mediaTypes.video.requireExactDuration = true;
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    const videoOutstreamBid = {
      bidder: 'adocean',
      params: {
        masterId: 'tmYF.DMl7ZBq.Nqt2Bq4FutQTJfTpxCOmtNPZoQUDcL.G7',
        slaveId: 'adoceanmyaozpniqismex',
        emitter: 'myao.adocean.pl'
      },
      adUnitCode: 'adunit-code',
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [300, 250]
        }
      },
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
    };

    it('should return false for outstream video', function () {
      expect(spec.isBidRequestValid(videoOutstreamBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        bidder: 'adocean',
        params: {
          masterId: 'tmYF.DMl7ZBq.Nqt2Bq4FutQTJfTpxCOmtNPZoQUDcL.G7',
          slaveId: 'adoceanmyaozpniqismex',
          emitter: 'myao.adocean.pl'
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
      },
      {
        bidder: 'adocean',
        params: {
          masterId: 'tmYF.DMl7ZBq.Nqt2Bq4FutQTJfTpxCOmtNPZoQUDcL.G7',
          slaveId: 'adoceanmyaozpniqismex',
          emitter: 'myao.adocean.pl'
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[300, 200], [600, 250]]
          }
        },
        bidId: '30b31c1838de1f',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
      }
    ];

    const bidderRequest = {
      gdprConsent: {
        consentString: 'BOQHk-4OSlWKFBoABBPLBd-AAAAgWAHAACAAsAPQBSACmgFTAOkA',
        gdprApplies: true
      }
    };

    it('should send two requests if slave is duplicated', function () {
      const nrOfRequests = spec.buildRequests(bidRequests, bidderRequest).length;
      expect(nrOfRequests).to.equal(2);
    });

    it('should add bidIdMap with correct slaveId => bidId mapping', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      for (let i = 0; i < bidRequests.length; i++) {
        expect(requests[i]).to.exist;
        expect(requests[i].bidIdMap).to.exist;
        expect(requests[i].bidIdMap[bidRequests[i].params.slaveId]).to.equal(bidRequests[i].bidId);
      }
    });

    it('sends bid request to url via GET', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.method).to.equal('GET');
      expect(request.url).to.match(new RegExp(`^https://${bidRequests[0].params.emitter}/_[0-9]*/ad.json`));
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

    it('should attach slaves information to url', function () {
      let requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].url).to.include('slaves=zpniqismex');
      expect(requests[1].url).to.include('slaves=zpniqismex');
      expect(requests[0].url).to.include('aosize=300x250%2C300x600');
      expect(requests[1].url).to.include('aosize=300x200%2C600x250');

      const differentSlavesBids = deepClone(bidRequests);
      differentSlavesBids[1].params.slaveId = 'adoceanmyaowafpdwlrks';
      requests = spec.buildRequests(differentSlavesBids, bidderRequest);
      expect(requests.length).to.equal(2);
      expect(requests[0].url).to.include('slaves=zpniqismex');
      expect(requests[1].url).to.include('slaves=wafpdwlrks');
    });

    const videoInstreamBidRequests = [
      {
        bidder: 'adocean',
        params: {
          masterId: 'tmYF.DMl7ZBq.Nqt2Bq4FutQTJfTpxCOmtNPZoQUDcL.G7',
          slaveId: 'adoceanmyaozpniqismex',
          emitter: 'myao.adocean.pl'
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          video: {
            playerSize: [200, 200],
            context: 'instream',
            minduration: 10,
            maxduration: 60,
          }
        },
        bidId: '30b31c1838de1g',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a476',
      }
    ];

    it('should build correct video instream request', function () {
      const request = spec.buildRequests(videoInstreamBidRequests, bidderRequest)[0];
      expect(request).to.exist;
      expect(request.url).to.include('id=' + videoInstreamBidRequests[0].params.masterId);
      expect(request.url).to.include('slaves=zpniqismex');
      expect(request.url).to.include('spots=1');
      expect(request.url).to.include('dur=60');
      expect(request.url).to.include('maxdur=60');
      expect(request.url).to.include('mindur=10');
    });

    const videoAdpodBidRequests = [
      {
        bidder: 'adocean',
        params: {
          masterId: 'tmYF.DMl7ZBq.Nqt2Bq4FutQTJfTpxCOmtNPZoQUDcL.G7',
          slaveId: 'adoceanmyaozpniqismex',
          emitter: 'myao.adocean.pl'
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {
          video: {
            playerSize: [200, 200],
            context: 'adpod',
            adPodDurationSec: 300,
            durationRangeSec: [15, 30],
            requireExactDuration: false
          }
        },
        bidId: '30b31c1838de1h',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a476',
      }
    ];

    it('should build correct video adpod request', function () {
      const request = spec.buildRequests(videoAdpodBidRequests, bidderRequest)[0];
      expect(request).to.exist;
      expect(request.url).to.include('id=' + videoAdpodBidRequests[0].params.masterId);
      expect(request.url).to.include('slaves=zpniqismex');
      expect(request.url).to.include('spots=20'); // 300 / 15 = 20
      expect(request.url).to.include('dur=300');
      expect(request.url).to.include('maxdur=30');
      expect(request.url).to.not.include('mindur=');
    });
  });

  describe('interpretResponseBanner', function () {
    const response = {
      'body': [
        {
          'id': 'adoceanmyaozpniqismex',
          'price': '0.019000',
          'ttl': '360',
          'crid': 'veeinoriep',
          'currency': 'EUR',
          'width': '300',
          'height': '250',
          'isVideo': false,
          'code': '%3C!--%20Creative%20--%3E',
          'adomain': ['adocean.pl']
        }
      ],
      'headers': {
        'get': function() {}
      }
    };

    const bidRequest = {
      bidder: 'adocean',
      params: {
        masterId: 'tmYF.DMl7ZBq.Nqt2Bq4FutQTJfTpxCOmtNPZoQUDcL.G7',
        slaveId: 'adoceanmyaozpniqismex',
        emitter: 'myao.adocean.pl'
      },
      adUnitCode: 'adunit-code',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      bidIdMap: {
        adoceanmyaozpniqismex: '30b31c1838de1e'
      },
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
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
          'creativeId': 'veeinoriep',
          'ttl': 360,
          'netRevenue': false,
          'meta': {
            'advertiserDomains': ['adocean.pl'],
            'mediaType': 'banner'
          }
        }
      ];

      const result = spec.interpretResponse(response, bidRequest);
      expect(result).to.have.lengthOf(1, 'Response should contain 1 bid');
      let resultKeys = Object.keys(result[0]);
      expect(resultKeys.sort()).to.deep.equal(Object.keys(expectedResponse[0]).sort(), 'Response keys do not match');
      resultKeys.forEach(function(k) {
        if (k === 'ad') {
          expect(result[0][k]).to.match(/<!-- Creative -->$/, 'ad does not match');
        } else if (k === 'meta') {
          expect(result[0][k]).to.deep.equal(expectedResponse[0][k], 'meta does not match');
        } else {
          expect(result[0][k]).to.equal(expectedResponse[0][k], `${k} does not match`);
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
      expect(result).to.have.lengthOf(0, 'Error response should be empty');
    });
  });

  describe('interpretResponseVideo', function () {
    const response = {
      'body': [
        {
          'id': 'adoceanmyaolifgmvmpfj',
          'price': '0.019000',
          'ttl': '360',
          'crid': 'qpqhltkgpu',
          'currency': 'EUR',
          'width': '300',
          'height': '250',
          'isVideo': true,
          'code': '%3C!--%20Video%20Creative%20--%3E',
          'adomain': ['adocean.pl']
        }
      ],
      'headers': {
        'get': function() {}
      }
    };

    const bidRequest = {
      bidder: 'adocean',
      params: {
        masterId: 'tmYF.DMl7ZBq.Nqt2Bq4FutQTJfTpxCOmtNPZoQUDcL.G7',
        slaveId: 'adoceanmyaolifgmvmpfj',
        emitter: 'myao.adocean.pl'
      },
      adUnitCode: 'adunit-code',
      bidIdMap: {
        adoceanmyaolifgmvmpfj: '30b31c1838de1e'
      },
      mediaTypes: {
        video: {
          playerSize: [200, 200],
          context: 'instream'
        }
      },
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
    };

    it('should get correct bid response', function () {
      const expectedResponse = [
        {
          'requestId': '30b31c1838de1e',
          'cpm': 0.019000,
          'currency': 'EUR',
          'width': 300,
          'height': 250,
          'vastXml': '<!-- Video Creative -->',
          'creativeId': 'qpqhltkgpu',
          'ttl': 360,
          'netRevenue': false,
          'meta': {
            'advertiserDomains': ['adocean.pl'],
            'mediaType': 'video'
          }
        }
      ];

      const result = spec.interpretResponse(response, bidRequest);
      expect(result).to.have.lengthOf(1, 'Response should contain 1 bid');
      let resultKeys = Object.keys(result[0]);
      expect(resultKeys.sort()).to.deep.equal(Object.keys(expectedResponse[0]).sort(), 'Response keys do not match');
      resultKeys.forEach(function(k) {
        if (k === 'vastXml') {
          expect(result[0][k]).to.match(/<!-- Video Creative -->$/, 'vastXml does not match');
        } else if (k === 'meta') {
          expect(result[0][k]).to.deep.equal(expectedResponse[0][k], 'meta does not match');
        } else {
          expect(result[0][k]).to.equal(expectedResponse[0][k], `${k} does not match`);
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
      expect(result).to.have.lengthOf(0, 'Error response should be empty');
    });
  });
});
