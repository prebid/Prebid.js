import { expect } from 'chai';
import { spec } from '../../../modules/adbroBidAdapter.js';
import { BANNER } from '../../../src/mediaTypes.js';
import * as utils from '../../../src/utils.js';

const bidder = 'adbro';

describe('adbroBidAdapter', function () {
  const validBid = {
    bidId: utils.getUniqueIdentifierStr(),
    bidder: bidder,
    adUnitCode: 'ad-1234-0',
    mediaTypes: {
      [BANNER]: {
        sizes: [[300, 250]]
      }
    },
    params: {
      placementId: 'testBanner'
    },
  }; const bids = [validBid];

  const invalidBid = {
    bidId: utils.getUniqueIdentifierStr(),
    bidder: bidder,
    mediaTypes: {
      [BANNER]: {
        sizes: [[300, 250]]
      }
    },
    params: {
    }
  }

  const bidderRequest = {
    refererInfo: {
      referer: 'https://test.com',
      page: 'https://test.com'
    },
    ortb2: {
      device: {
        w: 1080,
        h: 720,
        language: 'en-US'
      }
    },
    timeout: 500
  };

  describe('isBidRequestValid', function () {
    it('Should return true if there are bidId, params and key parameters present', function () {
      expect(spec.isBidRequestValid(bids[0])).to.be.true;
    });
    it('Should return false if at least one of parameters is not present', function () {
      expect(spec.isBidRequestValid(invalidBid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let serverRequests = spec.buildRequests(bids, bidderRequest);

    it('Creates a valid ServerRequest object', function () {
      expect(serverRequests).to.be.an('array').that.is.not.empty;
      const serverRequest = serverRequests[0];
      expect(serverRequest).to.exist;
      expect(serverRequest.method).to.exist;
      expect(serverRequest.method).to.equal('POST');
      expect(serverRequest.url).to.exist;
      expect(serverRequest.url).to.equal('https://jp.bidbro.me/pbjs?placementId=testBanner');
      expect(serverRequest.data).to.exist;
    });

    it('Returns general data valid', function () {
      const data = serverRequests[0].data;
      expect(data).to.be.an('object');
      expect(data.id).to.be.a('string');
      expect(data.imp).to.have.lengthOf(1);
      expect(data.device).to.be.an('object');
      expect(data.device.js).to.be.equal(1);
      expect(data.test).to.be.equal(0);
      expect(data.tmax).to.be.a('number').equal(500);
    });

    it('Returns valid imps', function () {
      const { imp } = serverRequests[0].data;
      for (let i = 0, len = imp.length; i < len; i++) {
        const impression = imp[i];
        expect(impression).to.have.property('id').that.is.not.empty;
        expect(impression).to.have.property('secure', 1);
        expect(impression).to.have.property('displaymanager', 'Prebid.js');
        expect(impression).to.have.property('displaymanagerver').that.is.not.empty;
        expect(impression).to.have.property('tagid', 'ad-1234-0');
        expect(impression).to.have.property('banner').that.is.an('object');
        expect(impression.banner).to.have.property('format').that.is.an('array').with.lengthOf(1);
        expect(impression.banner.format[0]).to.have.property('w', 300);
        expect(impression.banner.format[0]).to.have.property('h', 250);
      }
    });
  });

  describe('interpretResponse', function () {
    it('Should interpret banner response', function () {
      const responseBid = {
        id: utils.getUniqueIdentifierStr(),
        impid: validBid.bidId,
        price: 0.1,
        burl: 'https://jp.bidbro.me/notice?type=Bill&track=QURCUk8&price=${AUCTION_PRICE}&f=',
        nurl: 'https://jp.bidbro.me/notice?type=Win&track=QURCUk8&price=${AUCTION_PRICE}',
        lurl: 'https://jp.bidbro.me/notice?type=Loss&track=QURCUk8&price=${AUCTION_PRICE}',
        adm: '<script type="application/javascript">console.log("ADBRO")</script>',
        adomain: ['adbro.com'],
        crid: 'pbjs-1234',
        w: 300,
        h: 250,
      };
      const bidRequest = spec.buildRequests(bids, bidderRequest)[0];
      const bidResponse = {body: {
        id: bidRequest.data.id,
        bidid: utils.getUniqueIdentifierStr(),
        seatbid: [{seat: '501', bid: [responseBid]}],
      }};
      const responses = spec.interpretResponse(bidResponse, bidRequest);
      expect(responses).to.be.an('array').that.is.not.empty;
      const response = responses[0];

      expect(response).to.have.property('seatBidId', responseBid.id);
      expect(response).to.have.property('requestId', responseBid.impid);
      expect(response).to.have.property('burl', responseBid.burl);
      expect(response).to.have.property('cpm', responseBid.price);
      expect(response).to.have.property('width', responseBid.w);
      expect(response).to.have.property('height', responseBid.h);
      expect(response).to.have.property('netRevenue', true);
      expect(response).to.have.property('currency', 'USD');
      expect(response).to.have.property('ttl', 30);
      expect(response).to.have.property('creativeId', responseBid.crid);
      expect(response).to.have.property('ad').that.contains(responseBid.adm);
      expect(response.meta).to.be.an('object').that.has.any.key('advertiserDomains');
      expect(response.meta.advertiserDomains).to.be.an('array').that.contains('adbro.com');
    });

    it('Should return an empty array if invalid banner response is passed', function () {
      const bidRequest = spec.buildRequests(bids, bidderRequest)[0];
      const bidResponse = {body: {
        id: bidRequest.data.id,
        bidid: utils.getUniqueIdentifierStr(),
        seatbid: [{seat: '501', bid: [{
          id: utils.getUniqueIdentifierStr(),
          impid: invalidBid.bidId,
          price: 0.4,
          w: 300,
          h: 250,
        }]}],
      }};
      const responses = spec.interpretResponse(bidResponse, bidRequest);
      expect(responses).to.be.an('array').that.is.empty;
    });
  });

  describe('onBidBillable', function () {
    let sandbox;
    let triggerPixelStub;
    const pixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      triggerPixelStub = sandbox.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('Should trigger billing URL pixel', function () {
      spec.onBidBillable({burl: pixel});
      sinon.assert.calledOnce(triggerPixelStub);
      sinon.assert.calledWith(triggerPixelStub, pixel);
    });

    it('Should not trigger billing URL pixel when bid without it is provided', function () {
      spec.onBidBillable({});
      sinon.assert.notCalled(triggerPixelStub);
    });
  });
});
