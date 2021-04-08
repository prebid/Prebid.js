import {expect} from 'chai';
import {spec} from 'modules/adheseBidAdapter.js';

const BID_ID = 456;
const TTL = 360;
const NET_REVENUE = true;

let minimalBid = function() {
  return {
    'bidId': BID_ID,
    'bidder': 'adhese',
    'params': {
      account: 'demo',
      location: '_main_page_',
      format: 'leaderboard'
    }
  }
};

let bidWithParams = function(data) {
  let bid = minimalBid();
  bid.params.data = data;
  return bid;
};

describe('AdheseAdapter', function () {
  describe('getUserSyncs', function () {
    const serverResponses = [{
      account: 'demo'
    }];
    const gdprConsent = {
      gdprApplies: true,
      consentString: 'CONSENT_STRING'
    };
    it('should return empty when iframe disallowed', function () {
      expect(spec.getUserSyncs({ iframeEnabled: false }, serverResponses, gdprConsent)).to.be.empty;
    });
    it('should return empty when no serverResponses present', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [], gdprConsent)).to.be.empty;
    });
    it('should return empty when no account info present in the response', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [{}], gdprConsent)).to.be.empty;
    });
    it('should return usersync url when iframe allowed', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true }, serverResponses, gdprConsent)).to.deep.equal([{ type: 'iframe', url: 'https://user-sync.adhese.com/iframe/user_sync.html?account=demo&gdpr=1&consentString=CONSENT_STRING' }]);
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(minimalBid())).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, minimalBid());
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidderRequest = {
      gdprConsent: {
        gdprApplies: true,
        consentString: 'CONSENT_STRING'
      },
      refererInfo: {
        referer: 'http://prebid.org/dev-docs/subjects?_d=1'
      }
    };

    it('should include requested slots', function () {
      let req = spec.buildRequests([ minimalBid() ], bidderRequest);

      expect(JSON.parse(req.data).slots[0].slotname).to.equal('_main_page_-leaderboard');
    });

    it('should include all extra bid params', function () {
      let req = spec.buildRequests([ bidWithParams({ 'ag': '25' }) ], bidderRequest);

      expect(JSON.parse(req.data).slots[0].parameters).to.deep.include({ 'ag': [ '25' ] });
    });

    it('should assign bid params per slot', function () {
      let req = spec.buildRequests([ bidWithParams({ 'ag': '25' }), bidWithParams({ 'ag': '25', 'ci': 'gent' }) ], bidderRequest);

      expect(JSON.parse(req.data).slots[0].parameters).to.deep.include({ 'ag': [ '25' ] }).and.not.to.deep.include({ 'ci': [ 'gent' ] });
      expect(JSON.parse(req.data).slots[1].parameters).to.deep.include({ 'ag': [ '25' ] }).and.to.deep.include({ 'ci': [ 'gent' ] });
    });

    it('should split multiple target values', function () {
      let req = spec.buildRequests([ bidWithParams({ 'ci': 'london' }), bidWithParams({ 'ci': 'gent' }) ], bidderRequest);

      expect(JSON.parse(req.data).slots[0].parameters).to.deep.include({ 'ci': [ 'london' ] });
      expect(JSON.parse(req.data).slots[1].parameters).to.deep.include({ 'ci': [ 'gent' ] });
    });

    it('should filter out empty params', function () {
      let req = spec.buildRequests([ bidWithParams({ 'aa': [], 'bb': null, 'cc': '', 'dd': [ '', '' ], 'ee': [ 0, 1, null ], 'ff': 0, 'gg': [ 'x', 'y', '' ] }) ], bidderRequest);

      let params = JSON.parse(req.data).slots[0].parameters;
      expect(params).to.not.have.any.keys('aa', 'bb', 'cc', 'dd');
      expect(params).to.deep.include({ 'ee': [ 0, 1 ], 'ff': [ 0 ], 'gg': [ 'x', 'y' ] });
    });

    it('should include gdpr consent param', function () {
      let req = spec.buildRequests([ minimalBid() ], bidderRequest);

      expect(JSON.parse(req.data).parameters).to.deep.include({ 'xt': [ 'CONSENT_STRING' ] });
    });

    it('should include referer param in base64url format', function () {
      let req = spec.buildRequests([ minimalBid() ], bidderRequest);

      expect(JSON.parse(req.data).parameters).to.deep.include({ 'xf': [ 'aHR0cDovL3ByZWJpZC5vcmcvZGV2LWRvY3Mvc3ViamVjdHM_X2Q9MQ' ] });
    });

    it('should include eids', function () {
      let bid = minimalBid();
      bid.userIdAsEids = [{ source: 'id5-sync.com', uids: [{ id: 'ID5@59sigaS-...' }] }];

      let req = spec.buildRequests([ bid ], bidderRequest);

      expect(JSON.parse(req.data).user.ext.eids).to.deep.equal(bid.userIdAsEids);
    });

    it('should not include eids field when userid module disabled', function () {
      let req = spec.buildRequests([ minimalBid() ], bidderRequest);

      expect(JSON.parse(req.data)).to.not.have.key('eids');
    });

    it('should request vast content as url', function () {
      let req = spec.buildRequests([ minimalBid() ], bidderRequest);

      expect(JSON.parse(req.data).vastContentAsUrl).to.equal(true);
    });

    it('should include bids', function () {
      let bid = minimalBid();
      let req = spec.buildRequests([ bid ], bidderRequest);

      expect(req.bids).to.deep.equal([ bid ]);
    });

    it('should make a POST request', function () {
      let req = spec.buildRequests([ minimalBid() ], bidderRequest);

      expect(req.method).to.equal('POST');
    });

    it('should request the json endpoint', function () {
      let req = spec.buildRequests([ minimalBid() ], bidderRequest);

      expect(req.url).to.equal('https://ads-demo.adhese.com/json');
    });
  });

  describe('interpretResponse', () => {
    let bidRequest = {
      bids: [ minimalBid() ]
    };

    it('should get correct ssp banner response', () => {
      let sspBannerResponse = {
        body: [
          {
            origin: 'APPNEXUS',
            originInstance: '',
            ext: 'js',
            slotID: '10',
            slotName: '_main_page_-leaderboard',
            adType: 'leaderboard',
            originData: {
              seatbid: [{
                bid: [{
                  crid: '60613369',
                  dealid: null
                }],
                seat: '958'
              }]
            },
            width: '728',
            height: '90',
            body: '<div style="background-color:red; height:250px; width:300px"></div>',
            tracker: 'https://hosts-demo.adhese.com/rtb_gateway/handlers/client/track/?id=a2f39296-6dd0-4b3c-be85-7baa22e7ff4a',
            impressionCounter: 'https://hosts-demo.adhese.com/rtb_gateway/handlers/client/track/?id=a2f39296-6dd0-4b3c-be85-7baa22e7ff4a',
            extension: {'prebid': {'cpm': {'amount': '1.000000', 'currency': 'USD'}}, mediaType: 'banner'}
          }
        ]
      };

      let expectedResponse = [{
        requestId: BID_ID,
        ad: '<div style="background-color:red; height:250px; width:300px"></div><img src=\'https://hosts-demo.adhese.com/rtb_gateway/handlers/client/track/?id=a2f39296-6dd0-4b3c-be85-7baa22e7ff4a\' style=\'height:1px; width:1px; margin: -1px -1px; display:none;\'/>',
        cpm: 1,
        currency: 'USD',
        creativeId: '60613369',
        dealId: '',
        width: 728,
        height: 90,
        mediaType: 'banner',
        netRevenue: NET_REVENUE,
        ttl: TTL,
        adhese: {
          origin: 'APPNEXUS',
          originInstance: '',
          originData: {
            adType: 'leaderboard',
            seatbid: [
              {
                bid: [ { crid: '60613369', dealid: null } ],
                seat: '958'
              }
            ],
            slotId: '10',
            slotName: '_main_page_-leaderboard'
          }
        }
      }];
      expect(spec.interpretResponse(sspBannerResponse, bidRequest)).to.deep.equal(expectedResponse);
    });

    it('should get correct ssp video response', () => {
      let sspVideoResponse = {
        body: [
          {
            origin: 'RUBICON',
            ext: 'js',
            slotName: '_main_page_-leaderboard',
            adType: 'leaderboard',
            width: '640',
            height: '350',
            body: '<?xml version="1.0" encoding="UTF-8"?><VAST xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.0" xsi:noNamespaceSchemaLocation="vast.xsd"></VAST>',
            extension: {'prebid': {'cpm': {'amount': '2.1', 'currency': 'USD'}}, mediaType: 'video'}
          }
        ]
      };

      let expectedResponse = [{
        requestId: BID_ID,
        vastXml: '<?xml version="1.0" encoding="UTF-8"?><VAST xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.0" xsi:noNamespaceSchemaLocation="vast.xsd"></VAST>',
        cpm: 2.1,
        currency: 'USD',
        creativeId: 'RUBICON',
        dealId: '',
        width: 640,
        height: 350,
        mediaType: 'video',
        netRevenue: NET_REVENUE,
        ttl: TTL,
        adhese: {
          origin: 'RUBICON',
          originInstance: '',
          originData: {}
        }
      }];
      expect(spec.interpretResponse(sspVideoResponse, bidRequest)).to.deep.equal(expectedResponse);
    });

    it('should get correct ssp cache video response', () => {
      let sspCachedVideoResponse = {
        body: [
          {
            origin: 'RUBICON',
            ext: 'js',
            slotName: '_main_page_-leaderboard',
            adType: 'leaderboard',
            width: '640',
            height: '350',
            cachedBodyUrl: 'https://ads-demo.adhese.com/content/38983ccc-4083-4c24-932c-96f798d969b3',
            extension: {'prebid': {'cpm': {'amount': '2.1', 'currency': 'USD'}}, mediaType: 'video'}
          }
        ]
      };

      let expectedResponse = [{
        requestId: BID_ID,
        vastUrl: 'https://ads-demo.adhese.com/content/38983ccc-4083-4c24-932c-96f798d969b3',
        cpm: 2.1,
        currency: 'USD',
        creativeId: 'RUBICON',
        dealId: '',
        width: 640,
        height: 350,
        mediaType: 'video',
        netRevenue: NET_REVENUE,
        ttl: TTL,
        adhese: {
          origin: 'RUBICON',
          originInstance: '',
          originData: {}
        }
      }];
      expect(spec.interpretResponse(sspCachedVideoResponse, bidRequest)).to.deep.equal(expectedResponse);
    });

    it('should get correct Adhese banner response', () => {
      const adheseBannerResponse = {
        body: [
          {
            adType: 'largeleaderboard', // it can differ from the requested slot
            adFormat: 'largeleaderboard',
            timeStamp: '1544009030000',
            orderId: '22051',
            adspaceId: '162363',
            body: '<script id="body" type="text/javascript"></script>',
            tag: '<script id="tag" type="text/javascript"></script>',
            tracker: 'https://hosts-demo.adhese.com/track/tracker',
            altText: '<ADHESE_ALT_TEXT>',
            height: '150',
            width: '840',
            tagUrl: 'https://pool-demo.adhese.com/pool/lib/90511.js',
            libId: '90511',
            id: '742898',
            advertiserId: '2081',
            ext: 'js',
            url: 'https://hosts-demo.adhese.com/raylene/url',
            clickTag: 'https://hosts-demo.adhese.com/raylene/clickTag',
            poolPath: 'https://hosts-demo.adhese.com/pool/lib/',
            orderName: 'Luminus boiler comodity-Pareto -201812',
            creativeName: 'nl_demo _network_ron_dlbd_840x150_fix_dir_asv_std_dis_brd_nrt_na_red',
            slotName: '_main_page_-leaderboard',
            slotID: '29306',
            impressionCounter: 'https://hosts-demo.adhese.com/track/742898',
            origin: 'JERLICIA',
            originData: {},
            auctionable: true,
            extension: {
              prebid: {
                cpm: {
                  amount: '5.96',
                  currency: 'USD'
                }
              },
              mediaType: 'banner'
            }
          }
        ]
      };

      let expectedResponse = [{
        requestId: BID_ID,
        ad: '<script id="body" type="text/javascript"></script><img src=\'https://hosts-demo.adhese.com/track/742898\' style=\'height:1px; width:1px; margin: -1px -1px; display:none;\'/>',
        adhese: {
          origin: '',
          originInstance: '',
          originData: {
            adFormat: 'largeleaderboard',
            adId: '742898',
            adType: 'largeleaderboard',
            adspaceId: '162363',
            libId: '90511',
            orderProperty: undefined,
            priority: undefined,
            viewableImpressionCounter: undefined,
            slotId: '29306',
            slotName: '_main_page_-leaderboard',
            advertiserId: '2081'
          }
        },
        cpm: 5.96,
        currency: 'USD',
        creativeId: '742898',
        dealId: '22051',
        width: 840,
        height: 150,
        mediaType: 'banner',
        netRevenue: NET_REVENUE,
        ttl: TTL,
      }];
      expect(spec.interpretResponse(adheseBannerResponse, bidRequest)).to.deep.equal(expectedResponse);
    });

    it('should get correct Adhese video response', () => {
      const adheseVideoResponse = {
        body: [
          {
            adType: 'preroll',
            adFormat: '',
            orderId: '22248',
            adspaceId: '164196',
            body: '<ADHESE_BODY>',
            height: '360',
            width: '640',
            tag: "<?xml version='1.0' encoding='UTF-8' standalone='no'?><VAST version='2.0' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xsi:noNamespaceSchemaLocation='vast.xsd'></VAST>",
            libId: '89860',
            id: '742470',
            advertiserId: '2263',
            ext: 'advar',
            orderName: 'Smartphoto EOY-20181112',
            creativeName: 'PREROLL',
            slotName: '_main_page_-leaderboard',
            slotID: '41711',
            impressionCounter: 'https://hosts-demo.adhese.com/track/742898',
            origin: 'JERLICIA',
            originData: {},
            auctionable: true,
            extension: {
              mediaType: 'video'
            }
          }
        ]
      };

      let expectedResponse = [{
        requestId: BID_ID,
        vastXml: '<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'no\'?><VAST version=\'2.0\' xmlns:xsi=\'http://www.w3.org/2001/XMLSchema-instance\' xsi:noNamespaceSchemaLocation=\'vast.xsd\'></VAST>',
        adhese: {
          origin: '',
          originInstance: '',
          originData: {
            adFormat: '',
            adId: '742470',
            adType: 'preroll',
            adspaceId: '164196',
            libId: '89860',
            orderProperty: undefined,
            priority: undefined,
            viewableImpressionCounter: undefined,
            slotId: '41711',
            slotName: '_main_page_-leaderboard',
            advertiserId: '2263',
          }
        },
        cpm: 0,
        currency: 'USD',
        creativeId: '742470',
        dealId: '22248',
        width: 640,
        height: 360,
        mediaType: 'video',
        netRevenue: NET_REVENUE,
        ttl: TTL,
      }];
      expect(spec.interpretResponse(adheseVideoResponse, bidRequest)).to.deep.equal(expectedResponse);
    });

    it('should get correct Adhese cached video response', () => {
      const adheseVideoResponse = {
        body: [
          {
            adType: 'preroll',
            adFormat: '',
            orderId: '22248',
            adspaceId: '164196',
            body: '<ADHESE_BODY>',
            height: '360',
            width: '640',
            extension: {
              mediaType: 'video'
            },
            cachedBodyUrl: 'https://ads-demo.adhese.com/content/38983ccc-4083-4c24-932c-96f798d969b3',
            libId: '89860',
            id: '742470',
            advertiserId: '2263',
            ext: 'advar',
            orderName: 'Smartphoto EOY-20181112',
            creativeName: 'PREROLL',
            slotName: '_main_page_-leaderboard',
            slotID: '41711',
            impressionCounter: 'https://hosts-demo.adhese.com/track/742898',
            origin: 'JERLICIA',
            originData: {},
            auctionable: true
          }
        ]
      };

      let expectedResponse = [{
        requestId: BID_ID,
        vastUrl: 'https://ads-demo.adhese.com/content/38983ccc-4083-4c24-932c-96f798d969b3',
        adhese: {
          origin: '',
          originInstance: '',
          originData: {
            adFormat: '',
            adId: '742470',
            adType: 'preroll',
            adspaceId: '164196',
            libId: '89860',
            orderProperty: undefined,
            priority: undefined,
            viewableImpressionCounter: undefined,
            slotId: '41711',
            slotName: '_main_page_-leaderboard',
            advertiserId: '2263',
          }
        },
        cpm: 0,
        currency: 'USD',
        creativeId: '742470',
        dealId: '22248',
        width: 640,
        height: 360,
        mediaType: 'video',
        netRevenue: NET_REVENUE,
        ttl: TTL,
      }];
      expect(spec.interpretResponse(adheseVideoResponse, bidRequest)).to.deep.equal(expectedResponse);
    });

    it('should return no bids for empty adserver response', () => {
      let adserverResponse = { body: [] };
      expect(spec.interpretResponse(adserverResponse, bidRequest)).to.be.empty;
    });
  });
});
