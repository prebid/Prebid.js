import { expect } from 'chai';
import { spec } from 'modules/dailyhuntBidAdapter.js';

const PROD_PREBID_ENDPOINT_URL = 'https://money.dailyhunt.in/openrtb2/auction';

const PROD_ENDPOINT_URL = 'https://money.dailyhunt.in/openx/ads/index.php';

const _encodeURIComponent = function (a) {
  if (!a) { return }
  let b = window.encodeURIComponent(a);
  b = b.replace(/'/g, '%27');
  return b;
}

describe('DailyhuntAdapter', function () {
  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'dailyhunt',
      'params': {
        partnerId: 'pb-partnerId'
      }
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'dailyhunt',
        'params': {
          'placementId': '10433394'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 50]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'transactionId': '04f2659e-c005-4eb1-a57c-fa93145e3843'
      }
    ];
    let bidderRequest = {
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'bidderCode': 'dailyhunt',
      'bids': [
        {
          ...bidRequests[0]
        }
      ],
      'refererInfo': {
        'referer': 'http://m.dailyhunt.in/'
      }
    };

    let nativeBidRequests = [
      {
        'bidder': 'dailyhunt',
        'params': {
          'placementId': '10433394'
        },
        nativeParams: {
          image: {
            required: true,
          },
          title: {
            required: true,
          },
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 50]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'transactionId': '04f2659e-c005-4eb1-a57c-fa93145e3843'
      }
    ];
    let nativeBidderRequest = {
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'bidderCode': 'dailyhunt',
      'bids': [
        {
          ...nativeBidRequests[0]
        }
      ],
      'refererInfo': {
        'referer': 'http://m.dailyhunt.in/'
      }
    };

    it('sends display bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.url).to.equal(PROD_PREBID_ENDPOINT_URL);
      expect(request.method).to.equal('POST');
    });

    it('sends native bid request to ENDPOINT via GET', function () {
      const request = spec.buildRequests(nativeBidRequests, nativeBidderRequest)[0];
      expect(request.url).to.equal(PROD_ENDPOINT_URL);
      expect(request.method).to.equal('GET');
    });
  })

  describe('interpretResponse', function () {
    let nativeResponse = [
      [
        {
          'ad': {
            'requestId': '12345',
            'type': 'native-banner',
            'aduid': 'notId=ad-123679',
            'srcUrlExpiry': '60',
            'position': 'web',
            'width': 300,
            'height': 250,
            'card-position': 6,
            'positionWithTicker': 6,
            'min-ad-distance': 9,
            'banner-fill': 'fill-width',
            'bannerid': '70459',
            'adTemplate': 'H',
            'showOnlyImage': 'false',
            'id': '4210005ddbed0f096078.05613283',
            'span': 60,
            'useInternalBrowser': 'false',
            'useWideViewPort': 'true',
            'adCacheGood': '1',
            'adCacheAverage': '1',
            'adCacheSlow': '1',
            'allowDelayedAdInsert': 'true',
            'adGroupId': '4210005ddbed0f0982f4.86287578',
            'adContext': null,
            'showPlayIcon': 'false',
            'showBorder': 'false',
            'adid': '123679',
            'typeId': '3',
            'subTypeId': '0',
            'orderId': '1',
            'data-subSlot': 'web-3',
            'data-partner': 'DH',
            'data-origin': 'pbs',
            'pbAdU': '0',
            'price': '1.4',
            'beaconUrl': 'beacon-url',
            'landingUrl': null,
            'content': {
              'bg-color': '#ffffff',
              'bg-color-night': '#000000',
              'language': 'en',
              'sourceAlphabet': 'A',
              'iconLink': 'icon-link',
              'itemTag': {
                'color': '#0889ac',
                'color-night': '#a5a5a5',
                'data': 'Promoted'
              },
              'itemTitle': {
                'color': '#000000',
                'color-night': '#ffffff',
                'data': 'PREBID TEST'
              },
              'itemSubtitle1': {
                'color': '#000000',
                'color-night': '#ffffff',
                'data': 'Lorem Ipsum lorem ipsum'
              },
              'itemSubtitle2': {
                'color': '#4caf79',
                'color-night': '#ffffff',
                'data': 'CLICK ME'
              }
            },
            'action': 'action-url',
            'shareability': null
          }
        }
      ]
    ];

    let bannerResponse = {
      'id': 'da32def7-6779-403c-ada7-0b201dbc9744',
      'seatbid': [
        {
          'bid': [
            {
              'id': '3db3773286ee59',
              'impid': '1',
              'price': 0.14,
              'adm': "<!DOCTYPE HTML>\r\n<html lang=\"en-us\">\r\n<head>\r\n\t<meta http-equiv=\"Content-type\" content=\"text/html; charset=utf-8\">\r\n\t<title>Widgets Magazine</title>\r\n\t<style type=\"text/css\" media=\"screen\">\r\n\t</style>\r\n\t<script src=\"https://cdn.tercept.com/js/trcpt?account_id=TCPT-1547\"></script>\r\n\t<script src=\"https://www.googletagservices.com/tag/js/gpt.js\"></script>\r\n\t<script>\r\n\t\tvar googletag = googletag || {};\r\n\t\tgoogletag.cmd = googletag.cmd || [];\r\n\t\tgoogletag.cmd.push(function() {\r\n\t\t\twindow && window.tercept && window.tercept.init && window.tercept.init(83414793);\r\n\t\t});\r\n\r\n\t\t googletag.pubads().addEventListener('slotRenderEnded', function(event) {\r\n\t\t    if (event.slot.getSlotElementId() == \"div-gpt-ad-1528458606795-1\") {\r\n\t\t\tvar containsAd = !event.isEmpty;\r\n\t\t\tif (!containsAd) {\r\n\t\t\t  parent.AdManager.renderFallbackAd(this);     \r\n\t\t\t}\r\n\t\t    }\r\n\t\t  });\r\n\r\n\t\t googletag.cmd.push(function() {\r\n\t\t   var common_wap_firstpage = googletag.defineSlot('/83414793/Common_Wap_Firstpage', [300, 250], 'div-gpt-ad-1528458606795-1').addService(googletag.pubads());\r\n\t\t   (window && window.tercept && window.tercept.setTargeting)?(window.tercept.setTargeting(common_wap_firstpage)):((common_wap_firstpage).setTargeting('tcpt', ['TCPT_NL']));\r\n\r\n\t\t   googletag.pubads().enableSingleRequest();\r\n\t\t   googletag.pubads().collapseEmptyDivs();\r\n\t\t   googletag.enableServices();\r\n\t\t });\r\n\t</script>\r\n\r\n</head>\r\n\r\n<body>\r\n\r\n<!-- /83414793/Common_WapMiddle -->\r\n<div id='div-gpt-ad-1528458606795-1' style='margin:0 auto; width: 300px; height: auto;'>\r\n<script>\r\ngoogletag.cmd.push(function() { googletag.display('div-gpt-ad-1528458606795-1'); });\r\n</script>\r\n</div>\r\n\r\n</body>\r\n</html><img class=\"ad_beacon\" style=\"display: none;\" src=\"http://money.dailyhunt.in/impression?uniqueId=asd5ddbf014cac993.66466212&adId=66658&campaignId=55044&adPlacement=web&partnerRef=&city=&state=&country=india&clientId=asd\" />",
              'adid': '66658',
              'crid': 'asd5ddbf014cac993.66466212',
              'dealid': 'asd5ddbf014cac993.66466212',
              'w': 300,
              'h': 250,
              'ext': {
                'prebid': {
                  'type': 'banner'
                }
              }
            }
          ],
          'seat': 'dailyhunt'
        }
      ],
      'ext': {
        'responsetimemillis': {
          'dailyhunt': 119
        }
      }
    };

    it('should get correct native bid response', function () {
      let expectedResponse = [
        {
          requestId: '12345',
          cpm: '10',
          creativeId: '70459',
          currency: 'USD',
          ttl: 360,
          netRevenue: true,
          mediaType: 'native',
          native: {
            title: 'PREBID TEST',
            body: 'Lorem Ipsum lorem ipsum',
            body2: 'Lorem Ipsum lorem ipsum',
            cta: 'CLICK ME',
            clickUrl: _encodeURIComponent('action-url'),
            impressionTrackers: [],
            clickTrackers: [],
            image: {
              url: 'icon-link',
              height: 250,
              width: 300
            },
            icon: {
              url: 'icon-link',
              height: 300,
              width: 250
            }
          }
        }
      ];
      let bidderRequest = {
        bids: [{
          bidId: '3db3773286ee59',
          adUnitCode: 'code',
          'requestId': '12345'
        }]
      }
      let result = spec.interpretResponse({ body: nativeResponse }, { bidderRequest });
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('should get correct banner bid response', function () {
      let expectedResponse = [
        {
          requestId: '12345',
          cpm: 0.14,
          creativeId: 'asd5ddbf014cac993.66466212',
          width: 300,
          height: 250,
          ttl: 360,
          netRevenue: true,
          currency: 'USD',
          ad: "<!DOCTYPE HTML>\r\n<html lang=\"en-us\">\r\n<head>\r\n\t<meta http-equiv=\"Content-type\" content=\"text/html; charset=utf-8\">\r\n\t<title>Widgets Magazine</title>\r\n\t<style type=\"text/css\" media=\"screen\">\r\n\t</style>\r\n\t<script src=\"https://cdn.tercept.com/js/trcpt?account_id=TCPT-1547\"></script>\r\n\t<script src=\"https://www.googletagservices.com/tag/js/gpt.js\"></script>\r\n\t<script>\r\n\t\tvar googletag = googletag || {};\r\n\t\tgoogletag.cmd = googletag.cmd || [];\r\n\t\tgoogletag.cmd.push(function() {\r\n\t\t\twindow && window.tercept && window.tercept.init && window.tercept.init(83414793);\r\n\t\t});\r\n\r\n\t\t googletag.pubads().addEventListener('slotRenderEnded', function(event) {\r\n\t\t    if (event.slot.getSlotElementId() == \"div-gpt-ad-1528458606795-1\") {\r\n\t\t\tvar containsAd = !event.isEmpty;\r\n\t\t\tif (!containsAd) {\r\n\t\t\t  parent.AdManager.renderFallbackAd(this);     \r\n\t\t\t}\r\n\t\t    }\r\n\t\t  });\r\n\r\n\t\t googletag.cmd.push(function() {\r\n\t\t   var common_wap_firstpage = googletag.defineSlot('/83414793/Common_Wap_Firstpage', [300, 250], 'div-gpt-ad-1528458606795-1').addService(googletag.pubads());\r\n\t\t   (window && window.tercept && window.tercept.setTargeting)?(window.tercept.setTargeting(common_wap_firstpage)):((common_wap_firstpage).setTargeting('tcpt', ['TCPT_NL']));\r\n\r\n\t\t   googletag.pubads().enableSingleRequest();\r\n\t\t   googletag.pubads().collapseEmptyDivs();\r\n\t\t   googletag.enableServices();\r\n\t\t });\r\n\t</script>\r\n\r\n</head>\r\n\r\n<body>\r\n\r\n<!-- /83414793/Common_WapMiddle -->\r\n<div id='div-gpt-ad-1528458606795-1' style='margin:0 auto; width: 300px; height: auto;'>\r\n<script>\r\ngoogletag.cmd.push(function() { googletag.display('div-gpt-ad-1528458606795-1'); });\r\n</script>\r\n</div>\r\n\r\n</body>\r\n</html><img class=\"ad_beacon\" style=\"display: none;\" src=\"http://money.dailyhunt.in/impression?uniqueId=asd5ddbf014cac993.66466212&adId=66658&campaignId=55044&adPlacement=web&partnerRef=&city=&state=&country=india&clientId=asd\" />",
        }
      ];
      let bidderRequest = {
        bids: [{
          bidId: '3db3773286ee59',
          adUnitCode: 'code',
          'requestId': '12345'
        }]
      }
      let result = spec.interpretResponse({ body: bannerResponse }, bidderRequest);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });
  })
})
