import {expect} from 'chai';
import {spec} from 'modules/undertoneBidAdapter.js';
import {BANNER, VIDEO} from '../../../src/mediaTypes';
import {deepClone} from '../../../src/utils';

const URL = 'https://hb.undertone.com/hb';
const BIDDER_CODE = 'undertone';
const validBidReq = {
  bidder: BIDDER_CODE,
  params: {
    placementId: '10433394',
    publisherId: 12345
  },
  sizes: [[300, 250], [300, 600]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054747',
};

const invalidBidReq = {
  bidder: BIDDER_CODE,
  params: {
    placementId: '123456789'
  },
  sizes: [[300, 250], [300, 600]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746'
};

const videoBidReq = [{
  adUnitCode: 'div-gpt-ad-1460505748561-0',
  bidder: BIDDER_CODE,
  params: {
    placementId: '10433394',
    publisherId: 12345,
    video: {
      id: 123,
      skippable: true,
      playbackMethod: 2,
      maxDuration: 30
    }
  },
  mediaTypes: {video: {
    context: 'outstream',
    playerSize: [640, 480]
  }},
  sizes: [[300, 250], [300, 600]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746'
},
{
  adUnitCode: 'div-gpt-ad-1460505748561-1',
  bidder: BIDDER_CODE,
  params: {
    placementId: '10433395',
    publisherId: 12345
  },
  mediaTypes: {video: {
    context: 'outstream',
    playerSize: [640, 480]
  }},
  sizes: [[300, 250], [300, 600]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746'
}];
const schainObj = {
  'ver': '1.0',
  'complete': 1,
  'nodes': [
    {
      'asi': 'indirectseller.com',
      'sid': '00001',
      'hp': 1
    },

    {
      'asi': 'indirectseller-2.com',
      'sid': '00002',
      'hp': 2
    }
  ]
};
const bidReq = [{
  adUnitCode: 'div-gpt-ad-1460505748561-0',
  bidder: BIDDER_CODE,
  params: {
    placementId: '10433394',
    publisherId: 12345,
  },
  sizes: [[300, 250], [300, 600]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746'
},
{
  adUnitCode: 'div-gpt-ad-1460505748561-0',
  bidder: BIDDER_CODE,
  params: {
    publisherId: 12345
  },
  sizes: [[1, 1]],
  bidId: '453cf42d72bb3c',
  auctionId: '6c22f5a5-59df-4dc6-b92c-f433bcf0a874',
  schain: schainObj
}];

const supplyChainedBidReqs = [{
  adUnitCode: 'div-gpt-ad-1460505748561-0',
  bidder: BIDDER_CODE,
  params: {
    placementId: '10433394',
    publisherId: 12345,
  },
  sizes: [[300, 250], [300, 600]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746',
  schain: schainObj
}, {
  adUnitCode: 'div-gpt-ad-1460505748561-0',
  bidder: BIDDER_CODE,
  params: {
    publisherId: 12345
  },
  sizes: [[1, 1]],
  bidId: '453cf42d72bb3c',
  auctionId: '6c22f5a5-59df-4dc6-b92c-f433bcf0a874'
}];

const bidReqUserIds = [{
  bidder: BIDDER_CODE,
  params: {
    placementId: '10433394',
    publisherId: 12345
  },
  sizes: [[300, 250], [300, 600]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746',
  userId: {
    idl_env: '1111',
    tdid: '123456',
    digitrustid: {data: {id: 'DTID', keyv: 4, privacy: {optout: false}, producer: 'ABC', version: 2}},
    id5id: { uid: '1111' }
  }
},
{
  bidder: BIDDER_CODE,
  params: {
    publisherId: 12345
  },
  sizes: [[1, 1]],
  bidId: '453cf42d72bb3c',
  auctionId: '6c22f5a5-59df-4dc6-b92c-f433bcf0a874'
}];

const bidderReq = {
  refererInfo: {
    referer: 'http://prebid.org/dev-docs/bidder-adaptor.html'
  }
};

const bidderReqGdpr = {
  refererInfo: {
    referer: 'http://prebid.org/dev-docs/bidder-adaptor.html'
  },
  gdprConsent: {
    gdprApplies: true,
    consentString: 'acdefgh'
  }
};

const bidderReqCcpa = {
  refererInfo: {
    referer: 'http://prebid.org/dev-docs/bidder-adaptor.html'
  },
  uspConsent: 'NY12'
};

const bidderReqCcpaAndGdpr = {
  refererInfo: {
    referer: 'http://prebid.org/dev-docs/bidder-adaptor.html'
  },
  gdprConsent: {
    gdprApplies: true,
    consentString: 'acdefgh'
  },
  uspConsent: 'NY12'
};

const validBidRes = {
  ad: '<div>Hello</div>',
  publisherId: 12345,
  bidRequestId: '263be71e91dd9d',
  adId: 15,
  cpm: 100,
  nCampaignId: 2,
  creativeId: '123abc',
  currency: 'USD',
  netRevenue: true,
  width: 300,
  height: 250,
  ttl: 360
};

const bidResponse = [validBidRes];

const bidResArray = [
  validBidRes,
  {
    ad: '',
    bidRequestId: '263be71e91dd9d',
    cpm: 100,
    adId: '123abc',
    currency: 'USD',
    netRevenue: true,
    width: 300,
    height: 250,
    ttl: 360
  },
  {
    ad: '<div>Hello</div>',
    bidRequestId: '',
    cpm: 0,
    adId: '123abc',
    currency: 'USD',
    netRevenue: true,
    width: 300,
    height: 250,
    ttl: 360
  }
];
const bidVideoResponse = [
  {
    ad: '<xml />',
    bidRequestId: '263be71e91dd9d',
    cpm: 100,
    adId: '123abc',
    currency: 'USD',
    mediaType: 'video',
    netRevenue: true,
    width: 300,
    height: 250,
    ttl: 360
  }
];

let element;
let sandbox;

let elementParent = {
  offsetLeft: 100,
  offsetTop: 100,
  offsetHeight: 100,
  getAttribute: function() {}
};

describe('Undertone Adapter', () => {
  describe('request', () => {
    it('should validate bid request', () => {
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });
    it('should not validate incorrect bid request', () => {
      expect(spec.isBidRequestValid(invalidBidReq)).to.equal(undefined);
    });
  });
  describe('build request', function () {
    beforeEach(function() {
      element = {
        id: 'div-gpt-ad-1460505748561-0',
        offsetLeft: 100,
        offsetTop: 100,
        offsetWidth: 300,
        offsetHeight: 250
      };

      sandbox = sinon.sandbox.create();
      sandbox.stub(document, 'getElementById').withArgs('div-gpt-ad-1460505748561-0').returns(element);
    });

    afterEach(function() {
      sandbox.restore();
    });

    describe('getFloor', function () {
      it('should send 0 floor when getFloor is undefined', function() {
        const request = spec.buildRequests(videoBidReq, bidderReq);
        const bidReq = JSON.parse(request.data)['x-ut-hb-params'][0];
        expect(bidReq.mediaType).to.deep.equal(VIDEO);
        expect(bidReq.bidfloor).to.deep.equal(0);
      });
      it('should send mocked floor when defined on video media-type', function() {
        const clonedVideoBidReqArr = deepClone(videoBidReq);
        const mockedFloorResponse = {
          currency: 'USD',
          floor: 2.3
        };
        clonedVideoBidReqArr[1].getFloor = () => mockedFloorResponse;

        const request = spec.buildRequests(clonedVideoBidReqArr, bidderReq);
        const bidReq1 = JSON.parse(request.data)['x-ut-hb-params'][0];
        const bidReq2 = JSON.parse(request.data)['x-ut-hb-params'][1];
        expect(bidReq1.mediaType).to.deep.equal(VIDEO);
        expect(bidReq1.bidfloor).to.deep.equal(0);

        expect(bidReq2.mediaType).to.deep.equal(VIDEO);
        expect(bidReq2.bidfloor).to.deep.equal(mockedFloorResponse.floor);
      });
      it('should send mocked floor on banner media-type', function() {
        const clonedValidBidReqArr = [deepClone(validBidReq)];
        const mockedFloorResponse = {
          currency: 'USD',
          floor: 2.3
        };
        clonedValidBidReqArr[0].getFloor = () => mockedFloorResponse;

        const request = spec.buildRequests(clonedValidBidReqArr, bidderReq);
        const bidReq = JSON.parse(request.data)['x-ut-hb-params'][0];
        expect(bidReq.mediaType).to.deep.equal(BANNER);
        expect(bidReq.bidfloor).to.deep.equal(mockedFloorResponse.floor);
      });
      it('should send 0 floor on invalid currency', function() {
        const clonedValidBidReqArr = [deepClone(validBidReq)];
        const mockedFloorResponse = {
          currency: 'EUR',
          floor: 2.3
        };
        clonedValidBidReqArr[0].getFloor = () => mockedFloorResponse;

        const request = spec.buildRequests(clonedValidBidReqArr, bidderReq);
        const bidReq = JSON.parse(request.data)['x-ut-hb-params'][0];
        expect(bidReq.mediaType).to.deep.equal(BANNER);
        expect(bidReq.bidfloor).to.deep.equal(0);
      });
    });
    describe('supply chain', function () {
      it('should send supply chain if found on first bid', function () {
        const request = spec.buildRequests(supplyChainedBidReqs, bidderReq);
        const commons = JSON.parse(request.data)['commons'];
        expect(commons.schain).to.deep.equal(schainObj);
      });
      it('should not send supply chain if not found on first bid', function () {
        const request = spec.buildRequests(bidReq, bidderReq);
        const commons = JSON.parse(request.data)['commons'];
        expect(commons.schain).to.not.exist;
      });
    });
    it('should send request to correct url via POST not in GDPR or CCPA', function () {
      const request = spec.buildRequests(bidReq, bidderReq);
      const domainStart = bidderReq.refererInfo.referer.indexOf('//');
      const domainEnd = bidderReq.refererInfo.referer.indexOf('/', domainStart + 2);
      const domain = bidderReq.refererInfo.referer.substring(domainStart + 2, domainEnd);
      const REQ_URL = `${URL}?pid=${bidReq[0].params.publisherId}&domain=${domain}`;
      expect(request.url).to.equal(REQ_URL);
      expect(request.method).to.equal('POST');
    });
    it('should send request to correct url via POST when in GDPR', function () {
      const request = spec.buildRequests(bidReq, bidderReqGdpr);
      const domainStart = bidderReq.refererInfo.referer.indexOf('//');
      const domainEnd = bidderReq.refererInfo.referer.indexOf('/', domainStart + 2);
      const domain = bidderReq.refererInfo.referer.substring(domainStart + 2, domainEnd);
      let gdpr = bidderReqGdpr.gdprConsent.gdprApplies ? 1 : 0;
      const REQ_URL = `${URL}?pid=${bidReq[0].params.publisherId}&domain=${domain}&gdpr=${gdpr}&gdprstr=${bidderReqGdpr.gdprConsent.consentString}`;
      expect(request.url).to.equal(REQ_URL);
      expect(request.method).to.equal('POST');
    });
    it('should send request to correct url via POST when in CCPA', function () {
      const request = spec.buildRequests(bidReq, bidderReqCcpa);
      const domainStart = bidderReq.refererInfo.referer.indexOf('//');
      const domainEnd = bidderReq.refererInfo.referer.indexOf('/', domainStart + 2);
      const domain = bidderReq.refererInfo.referer.substring(domainStart + 2, domainEnd);
      let ccpa = bidderReqCcpa.uspConsent;
      const REQ_URL = `${URL}?pid=${bidReq[0].params.publisherId}&domain=${domain}&ccpa=${ccpa}`;
      expect(request.url).to.equal(REQ_URL);
      expect(request.method).to.equal('POST');
    });
    it('should send request to correct url via POST when in GDPR and CCPA', function () {
      const request = spec.buildRequests(bidReq, bidderReqCcpaAndGdpr);
      const domainStart = bidderReq.refererInfo.referer.indexOf('//');
      const domainEnd = bidderReq.refererInfo.referer.indexOf('/', domainStart + 2);
      const domain = bidderReq.refererInfo.referer.substring(domainStart + 2, domainEnd);
      let ccpa = bidderReqCcpaAndGdpr.uspConsent;
      let gdpr = bidderReqCcpaAndGdpr.gdprConsent.gdprApplies ? 1 : 0;
      const REQ_URL = `${URL}?pid=${bidReq[0].params.publisherId}&domain=${domain}&gdpr=${gdpr}&gdprstr=${bidderReqGdpr.gdprConsent.consentString}&ccpa=${ccpa}`;
      expect(request.url).to.equal(REQ_URL);
      expect(request.method).to.equal('POST');
    });
    it('should have all relevant fields', function () {
      const request = spec.buildRequests(bidReq, bidderReq);
      const bid1 = JSON.parse(request.data)['x-ut-hb-params'][0];
      expect(bid1.bidRequestId).to.equal('263be71e91dd9d');
      expect(bid1.sizes.length).to.equal(2);
      expect(bid1.placementId).to.equal('10433394');
      expect(bid1.publisherId).to.equal(12345);
      expect(bid1.coordinates).to.be.an('array');
      expect(bid1.params).to.be.an('object');
      const bid2 = JSON.parse(request.data)['x-ut-hb-params'][1];
      expect(bid2.bidRequestId).to.equal('453cf42d72bb3c');
      expect(bid2.sizes.length).to.equal(1);
      expect(bid2.placementId === null).to.equal(true);
      expect(bid2.publisherId).to.equal(12345);
      expect(bid2.params).to.be.an('object');
    });
    it('should send video fields correctly', function () {
      const request = spec.buildRequests(videoBidReq, bidderReq);
      const bidVideo = JSON.parse(request.data)['x-ut-hb-params'][0];
      const bidVideo2 = JSON.parse(request.data)['x-ut-hb-params'][1];

      expect(bidVideo.mediaType).to.equal('video');
      expect(bidVideo.video).to.be.an('object');
      expect(bidVideo.video.playerSize).to.be.an('array');
      expect(bidVideo.video.streamType).to.equal('outstream');
      expect(bidVideo.video.playbackMethod).to.equal(2);
      expect(bidVideo.video.maxDuration).to.equal(30);
      expect(bidVideo.video.skippable).to.equal(true);

      expect(bidVideo2.video.skippable).to.equal(null);
      expect(bidVideo2.video.maxDuration).to.equal(null);
      expect(bidVideo2.video.playbackMethod).to.equal(null);
    });
    it('should send all userIds data to server', function () {
      const request = spec.buildRequests(bidReqUserIds, bidderReq);
      const bidCommons = JSON.parse(request.data)['commons'];
      expect(bidCommons).to.be.an('object');
      expect(bidCommons.uids).to.be.an('object');
      expect(bidCommons.uids.tdid).to.equal('123456');
      expect(bidCommons.uids.idl_env).to.equal('1111');
      expect(bidCommons.uids.digitrustid.data.id).to.equal('DTID');
      expect(bidCommons.uids.id5id.uid).to.equal('1111');
    });
    it('should send page sizes sizes correctly', function () {
      const request = spec.buildRequests(bidReqUserIds, bidderReq);
      const bidCommons = JSON.parse(request.data)['commons'];
      expect(bidCommons).to.be.an('object');
      expect(bidCommons.pageSize).to.be.an('array');
      expect(bidCommons.pageSize[0]).to.equal(window.innerWidth);
      expect(bidCommons.pageSize[1]).to.equal(window.innerHeight);
    });
    it('should send banner coordinates', function() {
      const request = spec.buildRequests(bidReq, bidderReq);
      const bid1 = JSON.parse(request.data)['x-ut-hb-params'][0];
      expect(bid1.coordinates).to.be.an('array');
      expect(bid1.coordinates[0]).to.equal(100);
      expect(bid1.coordinates[1]).to.equal(100);
    });
    it('should send banner coordinates plus parent', function() {
      element.offsetParent = elementParent;
      const request = spec.buildRequests(bidReq, bidderReq);
      const bid1 = JSON.parse(request.data)['x-ut-hb-params'][0];
      expect(bid1.coordinates).to.be.an('array');
      expect(bid1.coordinates[0]).to.equal(200);
      expect(bid1.coordinates[1]).to.equal(200);
    });
  });

  describe('interpretResponse', () => {
    it('should build bid array', () => {
      let result = spec.interpretResponse({body: bidResponse});
      expect(result.length).to.equal(1);
    });

    it('should have all relevant fields', () => {
      const result = spec.interpretResponse({body: bidResponse});
      const bid = result[0];

      expect(bid.requestId).to.equal('263be71e91dd9d');
      expect(bid.cpm).to.equal(100);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.meta.advertiserDomains).to.deep.equal([]);
      expect(bid.creativeId).to.equal(15);
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(360);
    });

    it('should return empty array when response is incorrect', () => {
      expect(spec.interpretResponse({body: {}}).length).to.equal(0);
      expect(spec.interpretResponse({body: []}).length).to.equal(0);
    });

    it('should only use valid bid responses', () => {
      expect(spec.interpretResponse({ body: bidResArray }).length).to.equal(1);
    });

    it('should detect video response', () => {
      const videoResult = spec.interpretResponse({body: bidVideoResponse});
      const vbid = videoResult[0];

      expect(vbid.mediaType).to.equal('video');
    });
  });

  describe('getUserSyncs', () => {
    let testParams = [
      {
        name: 'with iframe and no gdpr or ccpa data',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, null],
        expect: {
          type: 'iframe',
          pixels: ['https://cdn.undertone.com/js/usersync.html']
        }
      },
      {
        name: 'with iframe and gdpr on',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, {gdprApplies: true, consentString: '234234'}],
        expect: {
          type: 'iframe',
          pixels: ['https://cdn.undertone.com/js/usersync.html?gdpr=1&gdprstr=234234']
        }
      },
      {
        name: 'with iframe and ccpa on',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, null, 'YN12'],
        expect: {
          type: 'iframe',
          pixels: ['https://cdn.undertone.com/js/usersync.html?ccpa=YN12']
        }
      },
      {
        name: 'with iframe and no gdpr off or ccpa',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, {gdprApplies: false}],
        expect: {
          type: 'iframe',
          pixels: ['https://cdn.undertone.com/js/usersync.html?gdpr=0&gdprstr=']
        }
      },
      {
        name: 'with iframe and gdpr and ccpa',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, {gdprApplies: true, consentString: '234234'}, 'YN12'],
        expect: {
          type: 'iframe',
          pixels: ['https://cdn.undertone.com/js/usersync.html?gdpr=1&gdprstr=234234&ccpa=YN12']
        }
      },
      {
        name: 'with pixels and no gdpr or ccpa data',
        arguments: [{ pixelEnabled: true }, {}, null],
        expect: {
          type: 'image',
          pixels: ['https://usr.undertone.com/userPixel/syncOne?id=1&of=2',
            'https://usr.undertone.com/userPixel/syncOne?id=2&of=2']
        }
      },
      {
        name: 'with pixels and gdpr on',
        arguments: [{ pixelEnabled: true }, {}, {gdprApplies: true, consentString: '234234'}],
        expect: {
          type: 'image',
          pixels: ['https://usr.undertone.com/userPixel/syncOne?id=1&of=2&gdpr=1&gdprstr=234234',
            'https://usr.undertone.com/userPixel/syncOne?id=2&of=2&gdpr=1&gdprstr=234234']
        }
      },
      {
        name: 'with pixels and ccpa on',
        arguments: [{ pixelEnabled: true }, {}, null, 'YN12'],
        expect: {
          type: 'image',
          pixels: ['https://usr.undertone.com/userPixel/syncOne?id=1&of=2&ccpa=YN12',
            'https://usr.undertone.com/userPixel/syncOne?id=2&of=2&ccpa=YN12']
        }
      },
      {
        name: 'with pixels and gdpr off',
        arguments: [{ pixelEnabled: true }, {}, {gdprApplies: false}],
        expect: {
          type: 'image',
          pixels: ['https://usr.undertone.com/userPixel/syncOne?id=1&of=2&gdpr=0&gdprstr=',
            'https://usr.undertone.com/userPixel/syncOne?id=2&of=2&gdpr=0&gdprstr=']
        }
      },
      {
        name: 'with pixels and gdpr and ccpa on',
        arguments: [{ pixelEnabled: true }, {}, {gdprApplies: true, consentString: '234234'}, 'YN12'],
        expect: {
          type: 'image',
          pixels: ['https://usr.undertone.com/userPixel/syncOne?id=1&of=2&gdpr=1&gdprstr=234234&ccpa=YN12',
            'https://usr.undertone.com/userPixel/syncOne?id=2&of=2&gdpr=1&gdprstr=234234&ccpa=YN12']
        }
      }
    ];

    for (let i = 0; i < testParams.length; i++) {
      let currParams = testParams[i];
      it(currParams.name, function () {
        const result = spec.getUserSyncs.apply(this, currParams.arguments);
        expect(result).to.have.lengthOf(currParams.expect.pixels.length);
        for (let ix = 0; ix < currParams.expect.pixels.length; ix++) {
          expect(result[ix].url).to.equal(currParams.expect.pixels[ix]);
          expect(result[ix].type).to.equal(currParams.expect.type);
        }
      });
    }
  });
});
