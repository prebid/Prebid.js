import { expect } from 'chai';
import { spec } from 'modules/braveBidAdapter.js';

const request_native = {
  code: 'brave-native-prebid',
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
  bidder: 'brave',
  params: {
    placementId: 'to0QI2aPgkbBZq6vgf0oHitouZduz0qw'
  }
};

const request_banner = {
  code: 'brave-prebid',
  mediaTypes: {
    banner: {
      sizes: [[300, 250]]
    }
  },
  bidder: 'brave',
  params: {
    placementId: 'to0QI2aPgkbBZq6vgf0oHitouZduz0qw'
  }
}

const bidRequest = {
  gdprConsent: {
    consentString: 'HFIDUYFIUYIUYWIPOI87392DSU',
    gdprApplies: true
  },
  uspConsent: 'uspConsentString',
  bidderRequestId: 'testid',
  refererInfo: {
    referer: 'testdomain.com'
  },
  timeout: 700
}

const request_video = {
  code: 'brave-video-prebid',
  mediaTypes: { video: {
    minduration: 1,
    maxduration: 999,
    boxingallowed: 1,
    skip: 0,
    mimes: [
      'application/javascript',
      'video/mp4'
    ],
    playerSize: [[768, 1024]],
    protocols: [
      2, 3
    ],
    linearity: 1,
    api: [
      1,
      2
    ]
  }
  },

  bidder: 'brave',
  params: {
    placementId: 'to0QI2aPgkbBZq6vgf0oHitouZduz0qw'
  }

}

const response_banner = {
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
    }]
  }]
};

const response_video = {
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
        mediaType: 'video'
      }
    }],
  }],
};

let imgData = {
  url: `https://example.com/image`,
  w: 1200,
  h: 627
};

const response_native = {
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
            assets: [
              {id: 1, title: 'dummyText'},
              {id: 3, image: imgData},
              {
                id: 5,
                data: {value: 'organization.name'}
              }
            ],
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

describe('BraveBidAdapter', function() {
  describe('isBidRequestValid', function() {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(request_banner)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, request_banner);
      bid.params = {
        'IncorrectParam': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('build Native Request', function () {
    const request = spec.buildRequests([request_native], bidRequest);

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
      expect(request.url).to.equal('https://point.bravegroup.tv/?t=2&partner=to0QI2aPgkbBZq6vgf0oHitouZduz0qw');
    });

    it('Returns empty data if no valid requests are passed', function () {
      let serverRequest = spec.buildRequests([]);
      expect(serverRequest).to.be.an('array').that.is.empty;
    });
  });

  describe('build Banner Request', function () {
    const request = spec.buildRequests([request_banner], bidRequest);

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
      expect(request.url).to.equal('https://point.bravegroup.tv/?t=2&partner=to0QI2aPgkbBZq6vgf0oHitouZduz0qw');
    });
  });

  describe('build Video Request', function () {
    const request = spec.buildRequests([request_video], bidRequest);

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
      expect(request.url).to.equal('https://point.bravegroup.tv/?t=2&partner=to0QI2aPgkbBZq6vgf0oHitouZduz0qw');
    });
  });

  describe('interpretResponse', function () {
    it('Empty response must return empty array', function() {
      const emptyResponse = null;
      let response = spec.interpretResponse(emptyResponse);

      expect(response).to.be.an('array').that.is.empty;
    })

    it('Should interpret banner response', function () {
      const bannerResponse = {
        body: response_banner
      }

      const expectedBidResponse = {
        requestId: response_banner.seatbid[0].bid[0].impid,
        cpm: response_banner.seatbid[0].bid[0].price,
        width: response_banner.seatbid[0].bid[0].w,
        height: response_banner.seatbid[0].bid[0].h,
        ttl: response_banner.ttl || 1200,
        currency: response_banner.cur || 'USD',
        netRevenue: true,
        creativeId: response_banner.seatbid[0].bid[0].crid,
        dealId: response_banner.seatbid[0].bid[0].dealid,
        mediaType: 'banner',
        ad: response_banner.seatbid[0].bid[0].adm
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
        body: response_video
      }

      const expectedBidResponse = {
        requestId: response_video.seatbid[0].bid[0].impid,
        cpm: response_video.seatbid[0].bid[0].price,
        width: response_video.seatbid[0].bid[0].w,
        height: response_video.seatbid[0].bid[0].h,
        ttl: response_video.ttl || 1200,
        currency: response_video.cur || 'USD',
        netRevenue: true,
        creativeId: response_video.seatbid[0].bid[0].crid,
        dealId: response_video.seatbid[0].bid[0].dealid,
        mediaType: 'video',
        vastUrl: response_video.seatbid[0].bid[0].adm
      }

      let videoResponses = spec.interpretResponse(videoResponse);

      expect(videoResponses).to.be.an('array').that.is.not.empty;
      let dataItem = videoResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'vastUrl', 'ttl', 'creativeId',
        'netRevenue', 'currency', 'dealId', 'mediaType');
      expect(dataItem.requestId).to.equal(expectedBidResponse.requestId);
      expect(dataItem.cpm).to.equal(expectedBidResponse.cpm);
      expect(dataItem.vastUrl).to.equal(expectedBidResponse.vastUrl)
      expect(dataItem.ttl).to.equal(expectedBidResponse.ttl);
      expect(dataItem.creativeId).to.equal(expectedBidResponse.creativeId);
      expect(dataItem.netRevenue).to.be.true;
      expect(dataItem.currency).to.equal(expectedBidResponse.currency);
      expect(dataItem.width).to.equal(expectedBidResponse.width);
      expect(dataItem.height).to.equal(expectedBidResponse.height);
    });

    it('Should interpret native response', function () {
      const nativeResponse = {
        body: response_native
      }

      const expectedBidResponse = {
        requestId: response_native.seatbid[0].bid[0].impid,
        cpm: response_native.seatbid[0].bid[0].price,
        width: response_native.seatbid[0].bid[0].w,
        height: response_native.seatbid[0].bid[0].h,
        ttl: response_native.ttl || 1200,
        currency: response_native.cur || 'USD',
        netRevenue: true,
        creativeId: response_native.seatbid[0].bid[0].crid,
        dealId: response_native.seatbid[0].bid[0].dealid,
        mediaType: 'native',
        native: {clickUrl: response_native.seatbid[0].bid[0].adm.native.link.url}
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
