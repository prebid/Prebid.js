import { expect } from 'chai';
import { spec } from 'modules/undertoneBidAdapter';

const URL = '//hb.undertone.com/hb';
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

const bidReq = [{
  bidder: BIDDER_CODE,
  params: {
    placementId: '10433394',
    publisherId: 12345
  },
  sizes: [[300, 250], [300, 600]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746'
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
    tdid: '123456',
    digitrustid: {data: {id: 'DTID', keyv: 4, privacy: {optout: false}, producer: 'ABC', version: 2}}
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

describe('Undertone Adapter', function () {
  describe('request', function () {
    it('should validate bid request', function () {
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });
    it('should not validate incorrect bid request', function () {
      expect(spec.isBidRequestValid(invalidBidReq)).to.equal(undefined);
    });
  });
  describe('build request', function () {
    it('should send request to correct url via POST not in GDPR', function () {
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
      let gdpr = bidderReqGdpr.gdprConsent.gdprApplies ? 1 : 0
      const REQ_URL = `${URL}?pid=${bidReq[0].params.publisherId}&domain=${domain}&gdpr=${gdpr}&gdprstr=${bidderReqGdpr.gdprConsent.consentString}`;
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
      expect(bid1.params).to.be.an('object');
      const bid2 = JSON.parse(request.data)['x-ut-hb-params'][1];
      expect(bid2.bidRequestId).to.equal('453cf42d72bb3c');
      expect(bid2.sizes.length).to.equal(1);
      expect(bid2.placementId === null).to.equal(true);
      expect(bid2.publisherId).to.equal(12345);
      expect(bid2.params).to.be.an('object');
    });
    it('should send all userIds data to server', function () {
      const request = spec.buildRequests(bidReqUserIds, bidderReq);
      const bidCommons = JSON.parse(request.data)['commons'];
      expect(bidCommons).to.be.an('object');
      expect(bidCommons.uids).to.be.an('object');
      expect(bidCommons.uids.tdid).to.equal('123456');
      expect(bidCommons.uids.digitrustid.data.id).to.equal('DTID');
    });
  });

  describe('interpretResponse', function () {
    it('should build bid array', function () {
      let result = spec.interpretResponse({body: bidResponse});
      expect(result.length).to.equal(1);
    });

    it('should have all relevant fields', function () {
      const result = spec.interpretResponse({body: bidResponse});
      const bid = result[0];

      expect(bid.requestId).to.equal('263be71e91dd9d');
      expect(bid.cpm).to.equal(100);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.creativeId).to.equal(15);
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(360);
    });

    it('should return empty array when response is incorrect', function () {
      expect(spec.interpretResponse({body: {}}).length).to.equal(0);
      expect(spec.interpretResponse({body: []}).length).to.equal(0);
    });

    it('should only use valid bid responses', function () {
      expect(spec.interpretResponse({ body: bidResArray }).length).to.equal(1);
    });
  });

  describe('getUserSyncs', () => {
    let testParams = [
      {
        name: 'with iframe and no gdpr data',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, null],
        expect: {
          type: 'iframe',
          pixels: ['//cdn.undertone.com/js/usersync.html']
        }
      },
      {
        name: 'with iframe and gdpr on',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, {gdprApplies: true, consentString: '234234'}],
        expect: {
          type: 'iframe',
          pixels: ['//cdn.undertone.com/js/usersync.html?gdpr=1&gdprstr=234234']
        }
      },
      {
        name: 'with iframe and no gdpr off',
        arguments: [{ iframeEnabled: true, pixelEnabled: true }, {}, {gdprApplies: false}],
        expect: {
          type: 'iframe',
          pixels: ['//cdn.undertone.com/js/usersync.html?gdpr=0&gdprstr=']
        }
      },
      {
        name: 'with pixels and no gdpr data',
        arguments: [{ pixelEnabled: true }, {}, null],
        expect: {
          type: 'image',
          pixels: ['//usr.undertone.com/userPixel/syncOne?id=1&of=2',
            '//usr.undertone.com/userPixel/syncOne?id=2&of=2']
        }
      },
      {
        name: 'with pixels and gdpr on',
        arguments: [{ pixelEnabled: true }, {}, {gdprApplies: true, consentString: '234234'}],
        expect: {
          type: 'image',
          pixels: ['//usr.undertone.com/userPixel/syncOne?id=1&of=2&gdpr=1&gdprstr=234234',
            '//usr.undertone.com/userPixel/syncOne?id=2&of=2&gdpr=1&gdprstr=234234']
        }
      },
      {
        name: 'with pixels and gdpr off',
        arguments: [{ pixelEnabled: true }, {}, {gdprApplies: false}],
        expect: {
          type: 'image',
          pixels: ['//usr.undertone.com/userPixel/syncOne?id=1&of=2&gdpr=0&gdprstr=',
            '//usr.undertone.com/userPixel/syncOne?id=2&of=2&gdpr=0&gdprstr=']
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
