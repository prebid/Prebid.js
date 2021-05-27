import { expect } from 'chai';
import { spec } from 'modules/gothamadsBidAdapter.js';
import { config } from 'src/config.js';

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
  bidder: 'gothamads',
  params: {
    placementId: 'hash',
    accountId: 'accountId'
  },
  timeout: 1000

};

const BANNER_BID_REQUEST = {
  code: 'banner_example',
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250],
        [300, 600]
      ]
    }
  },
  bidder: 'gothamads',
  params: {
    placementId: 'hash',
    accountId: 'accountId'
  },
  timeout: 1000,
  gdprConsent: {
    consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
    gdprApplies: 1,
  },
  uspConsent: 'uspConsent'
}

const bidRequest = {
  refererInfo: {
    referer: 'test.com'
  }
}

const VIDEO_BID_REQUEST = {
  code: 'video1',
  sizes: [640, 480],
  mediaTypes: {
    video: {
      minduration: 0,
      maxduration: 999,
      boxingallowed: 1,
      skip: 0,
      mimes: [
        'application/javascript',
        'video/mp4'
      ],
      w: 1920,
      h: 1080,
      protocols: [
        2
      ],
      linearity: 1,
      api: [
        1,
        2
      ]
    }
  },

  bidder: 'gothamads',
  params: {
    placementId: 'hash',
    accountId: 'accountId'
  },
  timeout: 1000

}

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

let imgData = {
  url: `https://example.com/image`,
  w: 1200,
  h: 627
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
      adm: {
        native: {
          assets: [{
            id: 0,
            title: 'dummyText'
          },
          {
            id: 3,
            image: imgData
          },
          {
            id: 5,
            data: {
              value: 'organization.name'
            }
          }
          ],
          link: {
            url: 'example.com'
          },
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

describe('GothamAdsAdapter', function () {
  describe('with COPPA', function () {
    beforeEach(function () {
      sinon.stub(config, 'getConfig')
        .withArgs('coppa')
        .returns(true);
    });
    afterEach(function () {
      config.getConfig.restore();
    });

    it('should send the Coppa "required" flag set to "1" in the request', function () {
      let serverRequest = spec.buildRequests([BANNER_BID_REQUEST]);
      expect(serverRequest.data[0].regs.coppa).to.equal(1);
    });
  });
  describe('isBidRequestValid', function () {
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

  describe('build Native Request', function () {
    const request = spec.buildRequests([NATIVE_BID_REQUEST], bidRequest);

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
      expect(request.url).to.equal('https://us-e-node1.gothamads.com/bid?pass=accountId&integration=prebidjs');
    });

    it('Returns empty data if no valid requests are passed', function () {
      let serverRequest = spec.buildRequests([]);
      expect(serverRequest).to.be.an('array').that.is.empty;
    });
  });

  describe('build Banner Request', function () {
    const request = spec.buildRequests([BANNER_BID_REQUEST]);

    it('Creates a ServerRequest object with method, URL and data', function () {
      expect(request).to.exist;
      expect(request.method).to.exist;
      expect(request.url).to.exist;
      expect(request.data).to.exist;
    });

    it('check consent and ccpa string is set properly', function () {
      expect(request.data[0].regs.ext.gdpr).to.equal(1);
      expect(request.data[0].user.ext.consent).to.equal(BANNER_BID_REQUEST.gdprConsent.consentString);
      expect(request.data[0].regs.ext.us_privacy).to.equal(BANNER_BID_REQUEST.uspConsent);
    });

    it('sends bid request to our endpoint via POST', function () {
      expect(request.method).to.equal('POST');
    });

    it('Returns valid URL', function () {
      expect(request.url).to.equal('https://us-e-node1.gothamads.com/bid?pass=accountId&integration=prebidjs');
    });
  });

  describe('build Video Request', function () {
    const request = spec.buildRequests([VIDEO_BID_REQUEST]);

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
      expect(request.url).to.equal('https://us-e-node1.gothamads.com/bid?pass=accountId&integration=prebidjs');
    });
  });

  describe('interpretResponse', function () {
    it('Empty response must return empty array', function () {
      const emptyResponse = null;
      let response = spec.interpretResponse(emptyResponse);

      expect(response).to.be.an('array').that.is.empty;
    })

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
        meta: BANNER_BID_RESPONSE.seatbid[0].bid[0].adomain,
        ad: BANNER_BID_RESPONSE.seatbid[0].bid[0].adm
      }

      let bannerResponses = spec.interpretResponse(bannerResponse);

      expect(bannerResponses).to.be.an('array').that.is.not.empty;
      let dataItem = bannerResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId',
        'netRevenue', 'currency', 'dealId', 'mediaType', 'meta');
      expect(dataItem.requestId).to.equal(expectedBidResponse.requestId);
      expect(dataItem.cpm).to.equal(expectedBidResponse.cpm);
      expect(dataItem.ad).to.equal(expectedBidResponse.ad);
      expect(dataItem.ttl).to.equal(expectedBidResponse.ttl);
      expect(dataItem.creativeId).to.equal(expectedBidResponse.creativeId);
      expect(dataItem.netRevenue).to.be.true;
      expect(dataItem.meta).to.have.property('advertiserDomains', expectedBidResponse.meta);
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
        meta: VIDEO_BID_RESPONSE.seatbid[0].bid[0].adomain,
        vastXml: VIDEO_BID_RESPONSE.seatbid[0].bid[0].adm,
        vastUrl: VIDEO_BID_RESPONSE.seatbid[0].bid[0].ext.vastUrl
      }

      let videoResponses = spec.interpretResponse(videoResponse);

      expect(videoResponses).to.be.an('array').that.is.not.empty;
      let dataItem = videoResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'vastXml', 'vastUrl', 'ttl', 'creativeId',
        'netRevenue', 'currency', 'dealId', 'mediaType', 'meta');
      expect(dataItem.requestId).to.equal(expectedBidResponse.requestId);
      expect(dataItem.cpm).to.equal(expectedBidResponse.cpm);
      expect(dataItem.vastXml).to.equal(expectedBidResponse.vastXml);
      expect(dataItem.ttl).to.equal(expectedBidResponse.ttl);
      expect(dataItem.creativeId).to.equal(expectedBidResponse.creativeId);
      expect(dataItem.meta).to.have.property('advertiserDomains', expectedBidResponse.meta);
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
        meta: NATIVE_BID_RESPONSE.seatbid[0].bid[0].adomain,
        mediaType: 'native',
        native: {
          clickUrl: NATIVE_BID_RESPONSE.seatbid[0].bid[0].adm.native.link.url
        }
      }

      let nativeResponses = spec.interpretResponse(nativeResponse);

      expect(nativeResponses).to.be.an('array').that.is.not.empty;
      let dataItem = nativeResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'native', 'ttl', 'creativeId',
        'netRevenue', 'currency', 'dealId', 'mediaType', 'meta');
      expect(dataItem.requestId).to.equal(expectedBidResponse.requestId);
      expect(dataItem.cpm).to.equal(expectedBidResponse.cpm);
      expect(dataItem.native.clickUrl).to.equal(expectedBidResponse.native.clickUrl);
      expect(dataItem.ttl).to.equal(expectedBidResponse.ttl);
      expect(dataItem.meta).to.have.property('advertiserDomains', expectedBidResponse.meta);
      expect(dataItem.creativeId).to.equal(expectedBidResponse.creativeId);
      expect(dataItem.netRevenue).to.be.true;
      expect(dataItem.currency).to.equal(expectedBidResponse.currency);
      expect(dataItem.width).to.equal(expectedBidResponse.width);
      expect(dataItem.height).to.equal(expectedBidResponse.height);
    });
  });
})
