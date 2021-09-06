import { expect } from 'chai';
import { spec } from 'modules/vidoomyBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { INSTREAM } from '../../../src/video';

const ENDPOINT = `https://d.vidoomy.com/api/rtbserver/prebid/`;

describe('vidoomyBidAdapter', function() {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid;
    beforeEach(() => {
      bid = {
        'bidder': 'vidoomy',
        'params': {
          pid: '123123',
          id: '123123'
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

    it('should return false when id is empty', function () {
      bid.params.id = '';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
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
        referer: 'http://example.com',
        stack: ['http://example.com']
      }
    };

    const request = spec.buildRequests(bidRequests, bidderRequest);

    it('sends bid request to our endpoint via GET', function () {
      expect(request[0].method).to.equal('GET');
      expect(request[1].method).to.equal('GET');
    });

    it('attaches source and version to endpoint URL as query params', function () {
      expect(request[0].url).to.include(ENDPOINT);
      expect(request[1].url).to.include(ENDPOINT);
    });

    it('only accepts first width and height sizes', function () {
      expect(request[0].url).to.include('w=300');
      expect(request[0].url).to.include('h=250');
      expect(request[0].url).to.not.include('w=200');
      expect(request[0].url).to.not.include('h=100');
      expect(request[1].url).to.include('w=400');
      expect(request[1].url).to.include('h=225');
    });

    it('should send id and pid parameters', function () {
      expect(request[0].url).to.include('id=123123');
      expect(request[0].url).to.include('pid=123123');
      expect(request[1].url).to.include('id=456456');
      expect(request[1].url).to.include('pid=456456');
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
        }
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
  });
});
