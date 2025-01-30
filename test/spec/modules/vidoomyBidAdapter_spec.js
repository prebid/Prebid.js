import { expect } from 'chai';
import { spec } from 'modules/vidoomyBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { INSTREAM } from '../../../src/video';

const ENDPOINT = `https://d.vidoomy.com/api/rtbserver/prebid/`;
const PIXELS = ['/test.png', '/test2.png?gdpr={{GDPR}}&gdpr_consent={{GDPR_CONSENT}}']

describe('vidoomyBidAdapter', function() {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid;
    beforeEach(() => {
      bid = {
        'bidder': 'vidoomy',
        'params': {
          pid: '123123',
          id: '123123',
          bidfloor: 0.5
        },
        'adUnitCode': 'code',
        'sizes': [[300, 250]]
      };
    });

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when pid is empty', function () {
      bid.params.pid = '';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when bidfloor is invalid', function () {
      bid.params.bidfloor = 'not a number';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when id is empty', function () {
      bid.params.id = '';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params are not passed', function () {
      let invalidBid = Object.assign({}, bid);
      invalidBid.params = {};
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when mediaType is video with INSTREAM context and lacks playerSize property', function () {
      bid.params.mediaTypes = {
        video: {
          context: INSTREAM
        }
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'vidoomy',
        'params': {
          pid: '123123',
          id: '123123'
        },
        'adUnitCode': 'code',
        'mediaTypes': {
          'banner': {
            'context': 'outstream',
            'sizes': [[300, 250], [200, 100]]
          }
        },
        'schain': {
          ver: '1.0',
          complete: 1,
          nodes: [
            {
              'asi': 'exchange1.com',
              'sid': '1234!abcd',
              'hp': 1,
              'rid': 'bid-request-1',
              'name': 'publisher, Inc.',
              'domain': 'publisher.com'
            },
            {
              'asi': 'exchange2.com',
              'sid': 'abcd',
              'hp': 1
            },
            {
              'asi': 'exchange2.com',
              'sid': 'abcd',
              'hp': 1,
              'rid': 'bid-request-2',
              'name': 'intermediary',
              'domain': 'intermediary.com'
            }
          ]
        }
      },
      {
        'bidder': 'vidoomy',
        'params': {
          pid: '456456',
          id: '456456'
        },
        'mediaTypes': {
          'video': {
            'context': 'outstream',
            'playerSize': [400, 225],
          }
        },
        'adUnitCode': 'code2',
      }
    ];

    let bidderRequest = {
      refererInfo: {
        numIframes: 0,
        reachedTop: true,
        domain: 'example.com',
        page: 'http://example.com',
        stack: ['http://example.com']
      }
    };

    const request = spec.buildRequests(bidRequests, bidderRequest);

    it('sends bid request to our endpoint via GET', function () {
      expect(request[0].method).to.equal('GET');
      expect(request[1].method).to.equal('GET');
    });

    it('attaches source and version to endpoint URL as query params', function () {
      expect(request[0].url).to.equal(ENDPOINT);
      expect(request[1].url).to.equal(ENDPOINT);
    });

    it('only accepts first width and height sizes', function () {
      expect('' + request[0].data.w).to.equal('300');
      expect('' + request[0].data.h).to.equal('250');
      expect('' + request[0].data.w).to.not.equal('200');
      expect('' + request[0].data.h).to.not.equal('100');
      expect('' + request[1].data.w).to.equal('400');
      expect('' + request[1].data.h).to.equal('225');
    });

    it('should send id and pid parameters', function () {
      expect('' + request[0].data.id).to.equal('123123');
      expect('' + request[0].data.pid).to.equal('123123');
      expect('' + request[1].data.id).to.equal('456456');
      expect('' + request[1].data.pid).to.equal('456456');
    });

    it('should send schain parameter in serialized form', function () {
      const serializedForm = '1.0,1!exchange1.com,1234%21abcd,1,bid-request-1,publisher%2C%20Inc.,publisher.com!exchange2.com,abcd,1,,,!exchange2.com,abcd,1,bid-request-2,intermediary,intermediary.com'
      expect(request[0].data).to.include.any.keys('schain');
      expect(request[0].data.schain).to.eq(serializedForm);
    });

    it('should return standard json formated eids', function () {
      const eids = [{
        source: 'pubcid.org',
        uids: [
          {
            id: 'some-random-id-value-1',
            atype: 1
          }
        ]
      },
      {
        source: 'adserver.org',
        uids: [{
          id: 'some-random-id-value-2',
          atype: 1
        }]
      }]
      bidRequests[0].userIdAsEids = eids
      const bidRequest = spec.buildRequests(bidRequests, bidderRequest);
      expect(bidRequest[0].data).to.include.any.keys('eids');
      expect(JSON.parse(bidRequest[0].data.eids)).to.eql(eids);
    });

    it('should set the bidfloor if getFloor module is undefined but static bidfloor is present', function () {
      const request = { ...bidRequests[0], params: { bidfloor: 2.5 } }
      const req = spec.buildRequests([request], bidderRequest)[0];
      expect(req.data).to.include.any.keys('bidfloor');
      expect(req.data.bidfloor).to.equal(2.5);
    });

    describe('floorModule', function () {
      const getFloordata = {
        'currency': 'USD',
        'floor': 1.60
      };
      bidRequests[0].getFloor = _ => {
        return getFloordata;
      };
      it('should return getFloor.floor if present', function () {
        const request = spec.buildRequests(bidRequests, bidderRequest)[0];
        expect(request.data.bidfloor).to.equal(getFloordata.floor);
      });
      it('should return the getFloor.floor if it is greater than static bidfloor', function () {
        const bidfloor = 1.40;
        const request = { ...bidRequests[0] };
        request.params.bidfloor = bidfloor;
        const bidRequest = spec.buildRequests([request], bidderRequest)[0];
        expect(bidRequest.data.bidfloor).to.equal(getFloordata.floor);
      });
      it('should return the static bidfloor if it is greater than getFloor.floor', function () {
        const bidfloor = 1.90;
        const request = { ...bidRequests[0] };
        request.params.bidfloor = bidfloor;
        const bidRequest = spec.buildRequests([request], bidderRequest)[0];
        expect(bidRequest.data.bidfloor).to.equal(bidfloor);
      });
    });

    describe('badv, bcat, bapp, btype, battr', function () {
      const bidderRequestNew = {
        ...bidderRequest,
        bcat: ['EX1', 'EX2', 'EX3'],
        badv: ['site.com'],
        bapp: ['app.com'],
        btype: [1, 2, 3],
        battr: [1, 2, 3]
      }
      const request = spec.buildRequests(bidRequests, bidderRequestNew);
      it('should have badv, bcat, bapp, btype, battr in request', function () {
        expect(request[0].data).to.include.any.keys('badv');
        expect(request[0].data).to.include.any.keys('bcat');
        expect(request[0].data).to.include.any.keys('bapp');
        expect(request[0].data).to.include.any.keys('btype');
        expect(request[0].data).to.include.any.keys('battr');
      })

      it('should have equal badv, bcat, bapp, btype, battr in request', function () {
        expect(request[0].badv).to.deep.equal(bidderRequest.refererInfo.badv);
        expect(request[0].bcat).to.deep.equal(bidderRequest.refererInfo.bcat);
        expect(request[0].bapp).to.deep.equal(bidderRequest.refererInfo.bapp);
        expect(request[0].btype).to.deep.equal(bidderRequest.refererInfo.btype);
        expect(request[0].battr).to.deep.equal(bidderRequest.refererInfo.battr);
      })
    })

    describe('first party data', function () {
      const bidderRequest2 = {
        ...bidderRequest,
        ortb2: {
          bcat: ['EX1', 'EX2', 'EX3'],
          badv: ['site.com'],
          bapp: ['app.com'],
          btype: [1, 2, 3],
          battr: [1, 2, 3]
        }
      }
      const request = spec.buildRequests(bidRequests, bidderRequest2);

      it('should have badv, bcat, bapp, btype, battr in request and equal to bidderRequest.ortb2', function () {
        expect(request[0].data.bcat).to.deep.equal(bidderRequest2.ortb2.bcat)
        expect(request[0].data.badv).to.deep.equal(bidderRequest2.ortb2.badv)
        expect(request[0].data.bapp).to.deep.equal(bidderRequest2.ortb2.bapp);
        expect(request[0].data.btype).to.deep.equal(bidderRequest2.ortb2.btype);
        expect(request[0].data.battr).to.deep.equal(bidderRequest2.ortb2.battr);
      });
    });
  });

  describe('interpretResponse', function () {
    const serverResponseVideo = {
      body: {
        'vastUrl': 'https:\/\/vpaid.vidoomy.com\/demo-ad\/tag.xml',
        'mediaType': 'video',
        'requestId': '123123',
        'cpm': 3.265,
        'currency': 'USD',
        'width': 0,
        'height': 300,
        'creativeId': '123123',
        'dealId': '23cb20aa264b72',
        'netRevenue': true,
        'ttl': 60,
        'meta': {
          'mediaType': 'video',
          'rendererUrl': 'https:\/\/vpaid.vidoomy.com\/outstreamplayer\/bundle.js',
          'advertiserDomains': ['vidoomy.com'],
          'advertiserId': 123,
          'advertiserName': 'Vidoomy',
          'agencyId': null,
          'agencyName': null,
          'brandId': null,
          'brandName': null,
          'dchain': null,
          'networkId': null,
          'networkName': null,
          'primaryCatId': 'IAB3-1',
          'secondaryCatIds': null
        }
      }
    }

    const serverResponseBanner = {
      body: {
        'ad': '<iframe src=\'https:\/\/vidoomy.com\/render\/ad.html\' width=\'300\' height=\'250\' frameborder=\'0\' scrolling=\'no\' marginheight=\'0\' marginwidth=\'0\' topmargin=\'0\' leftmargin=\'0\'><\/iframe>',
        'mediaType': 'banner',
        'requestId': '123123',
        'cpm': 4.94,
        'currency': 'USD',
        'width': 250,
        'height': 300,
        'creativeId': '123123',
        'dealId': '230aa095cea76b',
        'netRevenue': true,
        'ttl': 60,
        'meta': {
          'mediaType': 'banner',
          'advertiserDomains': ['vidoomy.com'],
          'advertiserId': 123,
          'advertiserName': 'Vidoomy',
          'agencyId': null,
          'agencyName': null,
          'brandId': null,
          'brandName': null,
          'dchain': null,
          'networkId': null,
          'networkName': null,
          'primaryCatId': 'IAB3-1',
          'secondaryCatIds': null
        },
        'pixels': PIXELS
      }
    }

    it('should get the correct bid response for outstream video, with renderer, an url in ad, and same requestId', function () {
      const bidRequest = {
        data: {
          videoContext: 'outstream'
        }
      }

      let result = spec.interpretResponse(serverResponseVideo, bidRequest);

      expect(result[0].renderer).to.not.be.undefined;
      expect(result[0].ad).to.equal(serverResponseVideo.body.vastUrl);
      expect(result[0].requestId).to.equal(serverResponseVideo.body.requestId);
    });

    it('should get the correct bid response for banner with same requestId', function () {
      const bidRequest = {};
      let result = spec.interpretResponse(serverResponseBanner, bidRequest);

      expect(result[0].requestId).to.equal(serverResponseBanner.body.requestId);
    });

    it('should sync user cookies', function () {
      const GDPR_CONSENT = 'GDPR_TEST'
      const result = spec.getUserSyncs({
        pixelEnabled: true
      }, [serverResponseBanner], { consentString: GDPR_CONSENT, gdprApplies: 1 }, null)
      expect(result).to.eql([
        {
          type: 'image',
          url: PIXELS[0]
        },
        {
          type: 'image',
          url: `/test2.png?gdpr=1&gdpr_consent=${GDPR_CONSENT}`
        }
      ])
    });
  });
});
