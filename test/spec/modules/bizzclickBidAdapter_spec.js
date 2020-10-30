import { expect } from 'chai';
import { spec } from 'modules/bizzclickBidAdapter.js';

const NATIVE_BID_REQUEST = {
  code: 'native_example',
  mediaTypes: {
    native: {
      title: {
        required: true,
        len: 800
      },
      image: {
        required: true,
        len: 80
      },
      sponsoredBy: {
        required: true
      },
      clickUrl: {
        required: true
      },
      privacyLink: {
        required: false
      },
      body: {
        required: true
      },
      icon: {
        required: true,
        sizes: [50, 50]
      }
    }
  },
  bidder: 'bizzclick',
  params: {
    placementId: 'hash',
    accountId: 'accountId'
  },
  timeout: 1000

};

const BANNER_BID_RESPONSE = {
  id: 'request_id',
  bidid: 'request_imp_id',
  seatbid: [{
    bid: [{
      id: 'bid_id',
      impid: 'request_imp_id',
      price: 5,
      adomain: ['example.com'],
      adm: 'admcode',
      crid: 'crid',
      ext: {
        mediaType: 'banner'
      }
    }],
  }],
};

const VIDEO_BID_RESPONSE = {
  id: 'request_id',
  bidid: 'request_imp_id',
  seatbid: [{
    bid: [{
      id: 'bid_id',
      impid: 'request_imp_id',
      price: 5,
      adomain: ['example.com'],
      adm: 'admcode',
      crid: 'crid',
      ext: {
        mediaType: 'video',
        vastUrl: 'http://example.vast',
      }
    }],
  }],
};

const NATIVE_BID_RESPONSE = {
  id: 'request_id',
  bidid: 'request_imp_id',
  seatbid: [{
    bid: [{
      id: 'bid_id',
      impid: 'request_imp_id',
      price: 5,
      adomain: ['example.com'],
      adm: { native:
          {
            assets: [{title: {text: 'dummyText'}}],
            link: {url: 'example.com'},
            imptrackers: ['tracker1.com', 'tracker2.com', 'tracker3.com'],
            jstracker: 'tracker1.com'
          }
      },
      crid: 'crid',
      ext: {
        mediaType: 'native'
      }
    }],
  }],
};

describe('BizzclickAdapter', function() {
  describe('isBidRequestValid', function() {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(NATIVE_BID_REQUEST)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, NATIVE_BID_REQUEST);
      delete bid.params;
      bid.params = {
        'IncorrectParam': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const request = spec.buildRequests([NATIVE_BID_REQUEST]);

    it('Creates a ServerRequest object with method, URL and data', function () {
      expect(request).to.exist;
      expect(request.method).to.exist;
      expect(request.url).to.exist;
      expect(request.data).to.exist;
    });

    it('sends bid request to our endpoint via POST', function () {
      expect(request.method).to.equal('POST');
    });

    it('Returns valid URL', function () {
      expect(request.url).to.equal('https://us-e-node1.bizzclick.com/bid?rtb_seat_id=prebidjs&secret_key=accountId');
    });

    it('Returns empty data if no valid requests are passed', function () {
      let serverRequest = spec.buildRequests([]);
      expect(serverRequest).to.be.an('array').that.is.empty;
    });
  });

  describe('interpretResponse', function () {
    it('Should interpret banner response', function () {
      const bannerResponse = {
        body: [BANNER_BID_RESPONSE]
      }

      const expectedBidResponse = {
        requestId: BANNER_BID_RESPONSE.id,
        cpm: BANNER_BID_RESPONSE.seatbid[0].bid[0].price,
        width: BANNER_BID_RESPONSE.seatbid[0].bid[0].w,
        height: BANNER_BID_RESPONSE.seatbid[0].bid[0].h,
        ttl: BANNER_BID_RESPONSE.ttl || 1200,
        currency: BANNER_BID_RESPONSE.cur || 'USD',
        netRevenue: true,
        creativeId: BANNER_BID_RESPONSE.seatbid[0].bid[0].crid,
        dealId: BANNER_BID_RESPONSE.seatbid[0].bid[0].dealid,
        mediaType: 'banner',
        ad: BANNER_BID_RESPONSE.seatbid[0].bid[0].adm
      }

      let bannerResponses = spec.interpretResponse(bannerResponse);

      expect(bannerResponses).to.be.an('array').that.is.not.empty;
      let dataItem = bannerResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId',
        'netRevenue', 'currency', 'dealId', 'mediaType');
      expect(dataItem.requestId).to.equal(expectedBidResponse.requestId);
      expect(dataItem.cpm).to.equal(expectedBidResponse.cpm);
      expect(dataItem.ad).to.equal(expectedBidResponse.ad);
      expect(dataItem.ttl).to.equal(expectedBidResponse.ttl);
      expect(dataItem.creativeId).to.equal(expectedBidResponse.creativeId);
      expect(dataItem.netRevenue).to.be.true;
      expect(dataItem.currency).to.equal(expectedBidResponse.currency);
      expect(dataItem.width).to.equal(expectedBidResponse.width);
      expect(dataItem.height).to.equal(expectedBidResponse.height);
    });

    it('Should interpret video response', function () {
      const videoResponse = {
        body: [VIDEO_BID_RESPONSE]
      }

      const expectedBidResponse = {
        requestId: VIDEO_BID_RESPONSE.id,
        cpm: VIDEO_BID_RESPONSE.seatbid[0].bid[0].price,
        width: VIDEO_BID_RESPONSE.seatbid[0].bid[0].w,
        height: VIDEO_BID_RESPONSE.seatbid[0].bid[0].h,
        ttl: VIDEO_BID_RESPONSE.ttl || 1200,
        currency: VIDEO_BID_RESPONSE.cur || 'USD',
        netRevenue: true,
        creativeId: VIDEO_BID_RESPONSE.seatbid[0].bid[0].crid,
        dealId: VIDEO_BID_RESPONSE.seatbid[0].bid[0].dealid,
        mediaType: 'video',
        vastXml: VIDEO_BID_RESPONSE.seatbid[0].bid[0].adm,
        vastUrl: VIDEO_BID_RESPONSE.seatbid[0].bid[0].ext.vastUrl
      }

      let videoResponses = spec.interpretResponse(videoResponse);

      expect(videoResponses).to.be.an('array').that.is.not.empty;
      let dataItem = videoResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'vastXml', 'vastUrl', 'ttl', 'creativeId',
        'netRevenue', 'currency', 'dealId', 'mediaType');
      expect(dataItem.requestId).to.equal(expectedBidResponse.requestId);
      expect(dataItem.cpm).to.equal(expectedBidResponse.cpm);
      expect(dataItem.vastXml).to.equal(expectedBidResponse.vastXml)
      expect(dataItem.ttl).to.equal(expectedBidResponse.ttl);
      expect(dataItem.creativeId).to.equal(expectedBidResponse.creativeId);
      expect(dataItem.netRevenue).to.be.true;
      expect(dataItem.currency).to.equal(expectedBidResponse.currency);
      expect(dataItem.width).to.equal(expectedBidResponse.width);
      expect(dataItem.height).to.equal(expectedBidResponse.height);
    });

    it('Should interpret native response', function () {
      const nativeResponse = {
        body: [NATIVE_BID_RESPONSE]
      }

      const expectedBidResponse = {
        requestId: NATIVE_BID_RESPONSE.id,
        cpm: NATIVE_BID_RESPONSE.seatbid[0].bid[0].price,
        width: NATIVE_BID_RESPONSE.seatbid[0].bid[0].w,
        height: NATIVE_BID_RESPONSE.seatbid[0].bid[0].h,
        ttl: NATIVE_BID_RESPONSE.ttl || 1200,
        currency: NATIVE_BID_RESPONSE.cur || 'USD',
        netRevenue: true,
        creativeId: NATIVE_BID_RESPONSE.seatbid[0].bid[0].crid,
        dealId: NATIVE_BID_RESPONSE.seatbid[0].bid[0].dealid,
        mediaType: 'native',
        native: {clickUrl: NATIVE_BID_RESPONSE.seatbid[0].bid[0].adm.native.link.url}
      }

      let nativeResponses = spec.interpretResponse(nativeResponse);

      expect(nativeResponses).to.be.an('array').that.is.not.empty;
      let dataItem = nativeResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'native', 'ttl', 'creativeId',
        'netRevenue', 'currency', 'dealId', 'mediaType');
      expect(dataItem.requestId).to.equal(expectedBidResponse.requestId);
      expect(dataItem.cpm).to.equal(expectedBidResponse.cpm);
      expect(dataItem.native.clickUrl).to.equal(expectedBidResponse.native.clickUrl)
      expect(dataItem.ttl).to.equal(expectedBidResponse.ttl);
      expect(dataItem.creativeId).to.equal(expectedBidResponse.creativeId);
      expect(dataItem.netRevenue).to.be.true;
      expect(dataItem.currency).to.equal(expectedBidResponse.currency);
      expect(dataItem.width).to.equal(expectedBidResponse.width);
      expect(dataItem.height).to.equal(expectedBidResponse.height);
    });
  });
})
