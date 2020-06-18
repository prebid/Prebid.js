import { expect } from 'chai';
import { spec } from 'modules/ucfunnelBidAdapter.js';
import {BANNER, VIDEO, NATIVE} from 'src/mediaTypes.js';

const URL = 'https://hb.aralego.com/header';
const BIDDER_CODE = 'ucfunnel';

const bidderRequest = {
  uspConsent: '1YNN'
};

const validBannerBidReq = {
  bidder: BIDDER_CODE,
  params: {
    adid: 'ad-34BBD2AA24B678BBFD4E7B9EE3B872D',
    bidfloor: 1.0
  },
  sizes: [[300, 250]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746',
  'schain': {
    'ver': '1.0',
    'complete': 1,
    'nodes': [
      {
        'asi': 'exchange1.com',
        'sid': '1234',
        'hp': 1,
        'rid': 'bid-request-1',
        'name': 'publisher',
        'domain': 'publisher.com'
      }
    ]
  }
};

const invalidBannerBidReq = {
  bidder: BIDDER_CODE,
  params: {
    adid: 123456789
  },
  sizes: [[300, 250]],
  bidId: '263be71e91dd9d',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746'
};

const validBannerBidRes = {
  creative_type: BANNER,
  ad_id: 'ad-34BBD2AA24B678BBFD4E7B9EE3B872D',
  adm: '<html style="height:100%"><body style="width:300px;height: 100%;padding:0;margin:0 auto;"><div style="width:100%;height:100%;display:table;"><div style="width:100%;height:100%;display:table-cell;text-align:center;vertical-align:middle;"><a href="//www.ucfunnel.com/" target="_blank"><img src="//cdn.aralego.net/ucfad/house/ucf/AdGent-300x250.jpg" width="300px" height="250px" align="middle" style="border:none"></a></div></div></body></html>',
  cpm: 1.01,
  height: 250,
  width: 300
};

const invalidBannerBidRes = '';

const validVideoBidReq = {
  bidder: BIDDER_CODE,
  params: {
    adid: 'ad-9A22D466494297EAC443D967B2622DA9'
  },
  sizes: [[640, 360]],
  bidId: '263be71e91dd9f',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746',
};

const validVideoBidRes = {
  creative_type: VIDEO,
  ad_id: 'ad-9A22D466494297EAC443D967B2622DA9',
  vastUrl: 'https://ads.aralego.com/ads/58f9749f-0553-4993-8d9a-013a38b29e55',
  vastXml: '<VAST version="3.0"><Ad id="preroll-1"><InLine><AdSystem>ucX</AdSystem><AdTitle> I-Primo </AdTitle><Creatives><Creative><Linear><Duration>00:00:30</Duration><TrackingEvents><Tracking event="start"><![CDATA[https://dev-ads.aralego.com/c/ucfunnel-test-vad-campaign/start]]></Tracking><Tracking event="complete"><![CDATA[https://dev-ads.aralego.com/c/ucfunnel-test-vad-campaign/complete]]></Tracking><Tracking event="unmute"><![CDATA[https://dev-ads.aralego.com/c/ucfunnel-test-vad-campaign/umute]]></Tracking><Tracking event="rewind"><![CDATA[https://dev-ads.aralego.com/c/ucfunnel-test-vad-campaign/rewind]]></Tracking></TrackingEvents><VideoClicks><ClickThrough><![CDATA[https://www.iprimo.tw/]]></ClickThrough><ClickTracking><![CDATA[https://dev-ads.aralego.com/c/ucfunnel-test-vad-campaign/clk]]></ClickTracking></VideoClicks><MediaFiles><MediaFile width="1920" height="1080" type="video/mp4" delivery="progressive"><![CDATA[https://cdn.aralego.net/ucfad/house/ucf/i-primo.mp4]]</MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>',
  cpm: 1.01,
  width: 640,
  height: 360
};

const validNativeBidReq = {
  bidder: BIDDER_CODE,
  params: {
    adid: 'ad-627736446B2BD3A60E8AEABDB7BD833E'
  },
  sizes: [[1, 1]],
  bidId: '263be71e91dda0',
  auctionId: '9ad1fa8d-2297-4660-a018-b39945054746',
};

const validNativeBidRes = {
  creative_type: NATIVE,
  ad_id: 'ad-9A22D466494297EAC443D967B2622DA9',
  native: {
    title: 'ucfunnel adExchange',
    body: 'We monetize your traffic via historic data driven protocol',
    cta: 'Learn more',
    sponsoredBy: 'ucfunnel Co., Ltd.',
    image: {
      url: 'https://cdn.aralego.net/img/main/AdGent-1200x627.jpg',
      width: 1200,
      height: 627
    },
    icon: {
      url: 'https://cdn.aralego.net/img/logo/logo-84x84.jpg',
      widt: 84,
      heigh: 84
    },
    clickUrl: 'https://www.ucfunnel.com',
    clicktrackers: ['https://dev-ad-track.aralego.com/v1/nat/click?iid=72165d02-408a-470c-bb52-ae7d7b0a4549'],
    impressionTrackers: ['https://www.aralego.net/imp?mf=native&adid=ad-9A22D466494297EAC443D967B2622DA9&auc=9ad1fa8d-2297-4660-a018-b39945054746'],
  },
  cpm: 1.01,
  height: 1,
  width: 1
};

describe('ucfunnel Adapter', function () {
  describe('request', function () {
    it('should validate bid request', function () {
      expect(spec.isBidRequestValid(validBannerBidReq)).to.equal(true);
    });
    it('should not validate incorrect bid request', function () {
      expect(spec.isBidRequestValid(invalidBannerBidReq)).to.equal(false);
    });
  });
  describe('build request', function () {
    const request = spec.buildRequests([validBannerBidReq], bidderRequest);
    it('should create a POST request for every bid', function () {
      expect(request[0].method).to.equal('GET');
      expect(request[0].url).to.equal(spec.ENDPOINT);
    });

    it('should attach the bid request object', function () {
      expect(request[0].bidRequest).to.equal(validBannerBidReq);
    });

    it('should attach request data', function () {
      const data = request[0].data;
      const [ width, height ] = validBannerBidReq.sizes[0];
      expect(data.usprivacy).to.equal('1YNN');
      expect(data.adid).to.equal('ad-34BBD2AA24B678BBFD4E7B9EE3B872D');
      expect(data.w).to.equal(width);
      expect(data.h).to.equal(height);
      expect(data.schain).to.equal('1.0,1!exchange1.com,1234,1,bid-request-1,publisher,publisher.com');
    });

    it('must parse bid size from a nested array', function () {
      const width = 640;
      const height = 480;
      validBannerBidReq.sizes = [[ width, height ]];
      const requests = spec.buildRequests([ validBannerBidReq ]);
      const data = requests[0].data;
      expect(data.w).to.equal(width);
      expect(data.h).to.equal(height);
    });
  });

  describe('interpretResponse', function () {
    describe('should support banner', function () {
      const request = spec.buildRequests([ validBannerBidReq ]);
      const result = spec.interpretResponse({body: validBannerBidRes}, request[0]);
      it('should build bid array for banner', function () {
        expect(result.length).to.equal(1);
      });

      it('should have all relevant fields', function () {
        const bid = result[0];

        expect(bid.mediaType).to.equal(BANNER);
        expect(bid.ad).to.exist;
        expect(bid.requestId).to.equal('263be71e91dd9d');
        expect(bid.cpm).to.equal(1.01);
        expect(bid.width).to.equal(300);
        expect(bid.height).to.equal(250);
      });
    });

    describe('handle banner no ad', function () {
      const request = spec.buildRequests([ validBannerBidReq ]);
      const result = spec.interpretResponse({body: invalidBannerBidRes}, request[0]);
      it('should build bid array for banner', function () {
        expect(result.length).to.equal(1);
      });

      it('should have all relevant fields', function () {
        const bid = result[0];

        expect(bid.ad).to.exist;
        expect(bid.requestId).to.equal('263be71e91dd9d');
        expect(bid.cpm).to.equal(0);
        expect(bid.width).to.equal(300);
        expect(bid.height).to.equal(250);
      });
    });

    describe('handle banner cpm under bidfloor', function () {
      const request = spec.buildRequests([ validBannerBidReq ]);
      const result = spec.interpretResponse({body: invalidBannerBidRes}, request[0]);
      it('should build bid array for banner', function () {
        expect(result.length).to.equal(1);
      });

      it('should have all relevant fields', function () {
        const bid = result[0];

        expect(bid.ad).to.exist;
        expect(bid.requestId).to.equal('263be71e91dd9d');
        expect(bid.cpm).to.equal(0);
        expect(bid.width).to.equal(300);
        expect(bid.height).to.equal(250);
      });
    });

    describe('should support video', function () {
      const request = spec.buildRequests([ validVideoBidReq ]);
      const result = spec.interpretResponse({body: validVideoBidRes}, request[0]);
      it('should build bid array', function () {
        expect(result.length).to.equal(1);
      });

      it('should have all relevant fields', function () {
        const bid = result[0];

        expect(bid.mediaType).to.equal(VIDEO);
        expect(bid.vastUrl).to.exist;
        expect(bid.vastXml).to.exist;
        expect(bid.requestId).to.equal('263be71e91dd9f');
        expect(bid.cpm).to.equal(1.01);
        expect(bid.width).to.equal(640);
        expect(bid.height).to.equal(360);
      });
    });

    describe('should support native', function () {
      const request = spec.buildRequests([ validNativeBidReq ]);
      const result = spec.interpretResponse({body: validNativeBidRes}, request[0]);
      it('should build bid array', function () {
        expect(result.length).to.equal(1);
      });

      it('should have all relevant fields', function () {
        const bid = result[0];

        expect(bid.mediaType).to.equal(NATIVE);
        expect(bid.native).to.exist;
        expect(bid.requestId).to.equal('263be71e91dda0');
        expect(bid.cpm).to.equal(1.01);
        expect(bid.width).to.equal(1);
        expect(bid.height).to.equal(1);
        expect(bid.native.clickUrl).to.equal('https://www.ucfunnel.com');
        expect(bid.native.clickTrackers[0]).to.equal('https://dev-ad-track.aralego.com/v1/nat/click?iid=72165d02-408a-470c-bb52-ae7d7b0a4549');
      });
    });
  });

  describe('cookie sync', function () {
    describe('cookie sync iframe', function () {
      const result = spec.getUserSyncs({'iframeEnabled': true});

      it('should return cookie sync iframe info', function () {
        expect(result[0].type).to.equal('iframe');
        expect(result[0].url).to.equal('https://cdn.aralego.net/ucfad/cookie/sync.html');
      });
    });
    describe('cookie sync image', function () {
      const result = spec.getUserSyncs({'pixelEnabled': true});
      it('should return cookie sync image info', function () {
        expect(result[0].type).to.equal('image');
        expect(result[0].url).to.equal('https://sync.aralego.com/idSync');
      });
    });
  });
});
