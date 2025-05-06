import { expect } from 'chai';
import { spec } from '../../../modules/adgridBidAdapter.js'

const globalConfig = {
  method: 'POST',
  endPoint: 'https://api-prebid.adgrid.io/api/v1/auction'
};

const userConfig = {
  gdprConsent: {
    gdprApplies: true,
    consentString: 'COwK6gaOwK6gaFmAAAENAPCAAAAAAAAAAAAAAAAAAAAA.IFoEUQQgAIQwgIwQABAEAAAAOIAACAIAAAAQAIAgEAACEAAAAAgAQBAAAAAAAGBAAgAAAAAAAFAAECAAAgAAQARAEQAAAAAJAAIAAgAAAYQEAAAQmAgBC3ZAYzUw',
    vendorData: {}
  },
  uspConsent: '123456'
};

describe('AdGrid Bid Adapter', function () {
  const bannerRequest = [{
    bidId: 123456,
    auctionId: 98765,
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      }
    },
    params: {
      domainId: 12345,
      placement: 'leaderboard'
    }
  }];

  const videoRequest = [{
    bidId: 123456,
    auctionId: 98765,
    mediaTypes: {
      video: {
        playerSize: [
          [640, 480]
        ],
        context: 'instream'
      }
    },
    params: {
      domainId: 12345,
      placement: 'video1'
    }
  }];

  describe('isBidRequestValid', function () {
    it('Should return true when domainId and placement exist inside params object', function () {
      const isBidValid = spec.isBidRequestValid(bannerRequest[0]);
      expect(isBidValid).to.be.true;
    });

    it('Should return false when domainId and placement are not exist inside params object', function () {
      const isBidNotValid = spec.isBidRequestValid(null);
      expect(isBidNotValid).to.be.false;
    });
  });

  describe('buildRequests', function () {
    const request = spec.buildRequests(bannerRequest, bannerRequest[0]);
    const requestVideo = spec.buildRequests(videoRequest, videoRequest[0]);
    const payload = request.data;
    const apiURL = request.url;
    const method = request.method;

    it('Test the request is not empty', function () {
      expect(request).to.not.be.empty;
    });

    it('Test the request payload is not empty', function () {
      expect(payload).to.not.be.empty;
    });

    it('Test the API End Point', function () {
      expect(apiURL).to.equal(globalConfig.endPoint);
    });

    it('should send the correct method', function () {
      expect(method).to.equal(globalConfig.method);
    });

    it('should send the correct requestId', function () {
      expect(request.data.bids[0].requestId).to.equal(bannerRequest[0].bidId);
      expect(requestVideo.data.bids[0].requestId).to.equal(videoRequest[0].bidId);
    });

    it('should send the correct sizes array', function () {
      expect(request.data.bids[0].sizes).to.be.an('array');
    });

    it('should send the correct media type', function () {
      expect(request.data.bids[0].mediaType).to.equal('banner')
      expect(requestVideo.data.bids[0].mediaType).to.equal('video')
    });
  });

  describe('interpretResponse', function () {
    const responseObj = {
      bids: [
        {
          bidId: '4b99f3428651c1',
          cpm: 7.7,
          ad: '<div>Ad Content</div>',
          creativeId: '9004',
          currency: 'USD',
          mediaType: 'banner',
          width: 320,
          height: 50,
          domainId: '2002',
          marketplaceId: '703',
          devices: 'desktop'
        }
      ]
    };

    it('Test the interpretResponse function', function () {
      const receivedBid = responseObj.bids[0];
      const response = {};
      response.body = responseObj;

      const bidRequest = {};
      bidRequest.currency = 'USD';

      const bidResponse = spec.interpretResponse(response, bidRequest);
      expect(bidResponse).to.not.be.empty;

      const bid = bidResponse[0];
      expect(bid).to.not.be.empty;
      expect(bid.requestId).to.equal(receivedBid.bidId);
      expect(bid.ad).to.equal(receivedBid.ad);
      expect(bid.cpm).to.equal(receivedBid.cpm);
      expect(bid.mediaType).to.equal(receivedBid.mediaType);
      expect(bid.creativeId).to.equal(receivedBid.creativeId);
      expect(bid.width).to.equal(receivedBid.width);
      expect(bid.height).to.equal(receivedBid.height);
      expect(bid.currency).to.equal(receivedBid.currency);
    });
  });

  describe('getUserSyncs', function () {
    const response = { body: { cookies: [] } };

    it('Validate the user sync without cookie', function () {
      var syncs = spec.getUserSyncs({}, [response], userConfig.gdprConsent, userConfig.uspConsent);
      expect(syncs).to.have.lengthOf(0);
    });

    it('Validate the user sync with cookie', function () {
      response.body.ext = {
        cookies: [{ 'type': 'image', 'url': 'https://cookie-sync.org/' }]
      };
      var syncs = spec.getUserSyncs({}, [response], userConfig.gdprConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0]).to.have.property('type').and.to.equal('image');
      expect(syncs[0]).to.have.property('url').and.to.equal('https://cookie-sync.org/');
    });

    it('Validate the user sync with no bid', function () {
      var syncs = spec.getUserSyncs({}, null, userConfig.gdprConsent, userConfig.uspConsent);
      expect(syncs).to.have.lengthOf(0);
    });

    it('Validate the user sync with no bid body', function () {
      var syncs = spec.getUserSyncs({}, [], userConfig.gdprConsent, userConfig.uspConsent);
      expect(syncs).to.have.lengthOf(0);
      var syncs = spec.getUserSyncs({}, [{}], userConfig.gdprConsent, userConfig.uspConsent);
      expect(syncs).to.have.lengthOf(0);
    });
  });
});
