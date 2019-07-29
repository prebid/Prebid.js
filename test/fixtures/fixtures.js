// jscs:disable
import CONSTANTS from 'src/constants.json';
const utils = require('src/utils.js');

function convertTargetingsFromOldToNew(targetings) {
  var mapOfOldToNew = {
    'hb_bidder': CONSTANTS.TARGETING_KEYS.BIDDER,
    'hb_adid': CONSTANTS.TARGETING_KEYS.AD_ID,
    'hb_pb': CONSTANTS.TARGETING_KEYS.PRICE_BUCKET,
    'hb_size': CONSTANTS.TARGETING_KEYS.SIZE,
    'hb_deal': CONSTANTS.TARGETING_KEYS.DEAL,
    'hb_source': CONSTANTS.TARGETING_KEYS.SOURCE,
    'hb_format': CONSTANTS.TARGETING_KEYS.FORMAT
  };
  var newTargetings = {};
  utils._each(targetings, function(value, currentKey) {
    var replaced = false;
    utils._each(mapOfOldToNew, function(newKey, oldKey) {
      if (currentKey.indexOf(oldKey) === 0 && oldKey !== newKey) {
        var updatedKey = currentKey.replace(oldKey, newKey);
        newTargetings[updatedKey] = targetings[currentKey];
        replaced = true;
      }
    });
    if (!replaced) {
      newTargetings[currentKey] = targetings[currentKey];
    }
  })
  return newTargetings;
}

export function getBidRequests() {
  return [
    {
      'bidderCode': 'appnexus',
      'auctionId': '1863e370099523',
      'bidderRequestId': '2946b569352ef2',
      'bids': [
        {
          'bidder': 'appnexus',
          'params': {
            'placementId': '4799418',
            'test': 'me'
          },
          'adUnitCode': '/19968336/header-bid-tag1',
          'sizes': [
            [
              728,
              90
            ],
            [
              970,
              90
            ]
          ],
          'bidId': '392b5a6b05d648',
          'bidderRequestId': '2946b569352ef2',
          'auctionId': '1863e370099523',
          'startTime': 1462918897462,
          'status': 1,
          'transactionId': 'fsafsa'
        },
        {
          'bidder': 'appnexus',
          'params': {
            'placementId': '4799418'
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '4dccdc37746135',
          'bidderRequestId': '2946b569352ef2',
          'auctionId': '1863e370099523',
          'startTime': 1462918897463,
          'status': 1,
          'transactionId': 'fsafsa'
        }
      ],
      'start': 1462918897460
    },
    {
      'bidderCode': 'pubmatic',
      'auctionId': '1863e370099523',
      'bidderRequestId': '5e1525bae3eb11',
      'bids': [
        {
          'bidder': 'pubmatic',
          'params': {
            'publisherId': 39741,
            'adSlot': '39620189@300x250'
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '6d11aa2d5b3659',
          'bidderRequestId': '5e1525bae3eb11',
          'auctionId': '1863e370099523',
          'transactionId': 'fsafsa'
        }
      ],
      'start': 1462918897463
    },
    {
      'bidderCode': 'rubicon',
      'auctionId': '1863e370099523',
      'bidderRequestId': '8778750ee15a77',
      'bids': [
        {
          'bidder': 'rubicon',
          'params': {
            'accountId': '14062',
            'siteId': '70608',
            'zoneId': '335918',
            'userId': '12346',
            'keywords': [
              'a',
              'b',
              'c'
            ],
            'inventory': {
              'rating': '5-star',
              'prodtype': 'tech'
            },
            'visitor': {
              'ucat': 'new',
              'search': 'iphone'
            },
            'sizes': [
              15,
              10
            ],
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '96aff279720d39',
          'bidderRequestId': '8778750ee15a77',
          'auctionId': '1863e370099523',
          'transactionId': 'fsafsa'
        }
      ],
      'start': 1462918897474
    },
    {
      'bidderCode': 'triplelift',
      'auctionId': '1863e370099523',
      'bidderRequestId': '107f5e6e98dcf09',
      'bids': [
        {
          'bidder': 'triplelift',
          'params': {
            'inventoryCode': 'sortable_all_right_sports'
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '1144e2f0de84363',
          'bidderRequestId': '107f5e6e98dcf09',
          'auctionId': '1863e370099523',
          'startTime': 1462918897477,
          'transactionId': 'fsafsa'
        }
      ],
      'start': 1462918897475
    },
    {
      'bidderCode': 'brightcom',
      'auctionId': '1863e370099523',
      'bidderRequestId': '12eeded736650b4',
      'bids': [
        {
          'bidder': 'brightcom',
          'params': {
            'tagId': 16577
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '135e89c039705da',
          'bidderRequestId': '12eeded736650b4',
          'auctionId': '1863e370099523',
          'status': 1,
          'transactionId': 'fsafsa'
        }
      ],
      'start': 1462918897477
    },
    {
      'bidderCode': 'brealtime',
      'auctionId': '1863e370099523',
      'bidderRequestId': '167c4d79b615948',
      'bids': [
        {
          'bidder': 'brealtime',
          'params': {
            'placementId': '4799418'
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '17dd1d869bed44e',
          'bidderRequestId': '167c4d79b615948',
          'auctionId': '1863e370099523',
          'startTime': 1462918897480,
          'status': 1,
          'transactionId': 'fsafsa'
        }
      ],
      'start': 1462918897479
    },
    {
      'bidderCode': 'pagescience',
      'auctionId': '1863e370099523',
      'bidderRequestId': '18bed198c172a69',
      'bids': [
        {
          'bidder': 'pagescience',
          'params': {
            'placementId': '4799418'
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '192c8c1df0f5d1d',
          'bidderRequestId': '18bed198c172a69',
          'auctionId': '1863e370099523',
          'startTime': 1462918897481,
          'status': 1,
          'transactionId': 'fsafsa'
        }
      ],
      'start': 1462918897480
    },
    {
      'bidderCode': 'amazon',
      'auctionId': '1863e370099523',
      'bidderRequestId': '20d0d30333715a7',
      'bids': [
        {
          'bidder': 'amazon',
          'params': {
            'aId': 3080
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '21ae8131ec04f6e',
          'bidderRequestId': '20d0d30333715a7',
          'auctionId': '1863e370099523',
          'transactionId': 'fsafsa'
        }
      ],
      'start': 1462918897482
    }
  ];
}

export function getBidResponses() {
  return [
    {
      'bidderCode': 'triplelift',
      'width': 0,
      'height': 0,
      'statusMessage': 'Bid available',
      'adId': '222bb26f9e8bd',
      'cpm': 0.112256,
      'ad': "<script>document.createElement('IMG').src=\"https://tlx.3lift.com/header/notify?cp=0.112256&px=1&aid=7732622907770006001&n=CAAR9ihcj8L12D8agQRodHRwOi8vYjEtdXMtd2VzdC0xLnplbWFudGEuY29tL2FwaS9iaWRkZXIvdHJpcGxlbGlmdC93aW4vP2VuYz1QWjRXU0NPT0hBN0IyVzVEUlU3Nlc1Vk1GNzdGUFREWFhNRkFWUk9QRFVSQlhPM0VaQ1k1N0s3NjRYVERHQVpPRVc3TVhKN1U0U1dTR0hFTDZFTlEyT1gzUVBBU0Q3TDdPUlFaNE5VWVJWSjVVUEJVVUpIUTVTRU1RTjU0VzZJREZVVVM1Q1FERkNHTVNCVEJFVzczM0hLSUtJNE1IRFNMSUJWTEpXU0pHRVVDQVJNV1pFT0xRQUNSNEFaVUtUQ0dEWlNRS0NGM0FYVEtUUlhUVUNYR0pTWjZIN0NFRUNDMlgyTUpBQTZLTkY0RDQ3RFFSS1RMSkRPQkI3UDJBSUpOWE5TMkFDVVUzM05aRjYzQUU2U0c1SVVCVEVZVVJKWDVJVVJJUEk1TU1MUUlWWEpMVVlKT0FNRzRRQktCWkpLR0wyWDVLM0w2WU9SVE5GS0NKNFZaRjRZR1hRRVVXRUtHTEpaWDQ3WDM1R09SQzNHRVYyVlMyNDdBTkFTTU5CWlgmcHJpY2U9JHtBVUNUSU9OX1BSSUNFfSZyenVpZD01YjMxZWU0OC0xNmZlLTExZTYtYTNlNC01YWMzYjhiNzJiNmQgjMoLKAAw250LOAFAAEgBUAGQAQCgAZwTqAGjILAB%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FAboBa2h0dHA6Ly9pbWFnZXMyLnplbWFudGEuY29tLzMxMTk4NDVmLTM4YzEtNDQzYi1hYjU3LWM0ZjU1ZGY4YmFmMS5qcGc%2Fdz0xMDAwJmg9NzA1JmZpdD1jcm9wJmNyb3A9ZmFjZXMmZm09anBnwAEAyAEA0AEA\";window.tl_auction_response_522756=\"dynamicCreativeRender({\\\"settings\\\":{\\\"advertiser_name\\\":\\\"BuildDirect\\\",\\\"impression_pixels\\\":[\\\"https:\\/\\/sp.analytics.yahoo.com\\/spp.pl?a=1000157933821&.yp=436986\\\"],\\\"type\\\":\\\"image\\\",\\\"additional_data\\\":{\\\"bmid\\\":\\\"2460\\\",\\\"ts\\\":\\\"1462919239\\\",\\\"brid\\\":\\\"4131\\\",\\\"aid\\\":\\\"7732622907770006001\\\"},\\\"client_side_render\\\":true,\\\"format_id\\\":1,\\\"render_options_bm\\\":0},\\\"assets\\\":[{\\\"image_id\\\":-1,\\\"image_url\\\":\\\"http:\\/\\/images2.zemanta.com\\/3119845f-38c1-443b-ab57-c4f55df8baf1.jpg?w=1000&h=705&fit=crop&crop=faces&fm=jpg\\\",\\\"image_width\\\":1000,\\\"image_height\\\":705,\\\"heading\\\":\\\"Remove These 8 Things From Your Kitchen NOW\\\",\\\"caption\\\":\\\"BuildDirect Blog: Life At Home\\\",\\\"clickthrough_url\\\":\\\"http:\\/\\/r1.zemanta.com\\/r\\/u1bxdm8opi4g\\/b1_triplelift\\/701\\/30230\\/?_b_rzuid=5b31ee48-16fe-11e6-a3e4-5ac3b8b72b6d&_b_bzuid=5b31ee48-16fe-11e6-a3e4-cedd9baee96d&_r_publisherdomain=prebid.org&_b_ab=chubby_fox_floor&_b_ctrl=1\\\"}]});\";</script><script src=\"//ib.3lift.com/ttj?inv_code=sortable_all_right_sports\" data-auction-response-id=\"522756\"></script>",
      'responseTimestamp': 1462919239337,
      'requestTimestamp': 1462919238936,
      'bidder': 'triplelift',
      'adUnitCode': '/19968336/header-bid-tag-0',
      'timeToRespond': 401,
      'pbLg': '0.00',
      'pbMg': '0.10',
      'pbHg': '0.11',
      'pbAg': '0.10',
      'size': '0x0',
      'auctionId': 123456,
      'requestId': '1144e2f0de84363',
      'adserverTargeting': convertTargetingsFromOldToNew({
        'hb_bidder': 'triplelift',
        'hb_adid': '222bb26f9e8bd',
        'hb_pb': '10.00',
        'hb_size': '0x0',
        'foobar': '0x0'
      }),
      'netRevenue': true,
      'currency': 'USD',
      'ttl': 300
    },
    {
      'bidderCode': 'appnexus',
      'width': 300,
      'height': 250,
      'statusMessage': 'Bid available',
      'adId': '233bcbee889d46d',
      'creative_id': 29681110,
      'cpm': 10,
      'adUrl': 'http://lax1-ib.adnxs.com/ab?e=wqT_3QL8BKh8AgAAAwDWAAUBCMjAybkFEMLLiJWTu9PsVxjL84KE1tzG-kkgASotCQAAAQII4D8RAQcQAADgPxkJCQjwPyEJCQjgPykRCaAwuvekAji-B0C-B0gCUNbLkw5YweAnYABokUB4190DgAEBigEDVVNEkgUG8FKYAawCoAH6AagBAbABALgBAcABA8gBANABANgBAOABAPABAIoCOnVmKCdhJywgNDk0NDcyLCAxNDYyOTE5MjQwKTt1ZigncicsIDI5NjgxMTEwLDIeAPBskgLZASFmU21rZ0FpNjBJY0VFTmJMa3c0WUFDREI0Q2N3QURnQVFBUkl2Z2RRdXZla0FsZ0FZSk1IYUFCd0EzZ0RnQUVEaUFFRGtBRUJtQUVCb0FFQnFBRURzQUVBdVFFQUFBQUFBQURnUDhFQgkMTEFBNERfSkFRMkxMcEVUMU93XzJRFSggd1AtQUJBUFVCBSxASmdDaW9EVTJnV2dBZ0MxQWcBFgRDOQkIqERBQWdQSUFnUFFBZ1BZQWdQZ0FnRG9BZ0Q0QWdDQUF3RS6aAiUhV1FrbmI63AAcd2VBbklBUW8JXPCVVS7YAugH4ALH0wHqAh9odHRwOi8vcHJlYmlkLm9yZzo5OTk5L2dwdC5odG1sgAMAiAMBkAMAmAMFoAMBqgMAsAMAuAMAwAOsAsgDANgDAOADAOgDAPgDA4AEAJIEBC9qcHSYBACiBAoxMC4xLjEzLjM3qAQAsgQICAAQABgAIAC4BADABADIBADSBAoxMC4wLjg1Ljkx&s=1bf15e8cdc7c0c8c119614c6386ab1496560da39&referrer=http%3A%2F%2Fprebid.org%3A9999%2Fgpt.html',
      'responseTimestamp': 1462919239340,
      'requestTimestamp': 1462919238919,
      'bidder': 'appnexus',
      'adUnitCode': '/19968336/header-bid-tag-0',
      'timeToRespond': 421,
      'pbLg': '5.00',
      'pbMg': '10.00',
      'pbHg': '10.00',
      'pbAg': '10.00',
      'size': '300x250',
      'alwaysUseBid': true,
      'auctionId': 123456,
      'requestId': '4dccdc37746135',
      'adserverTargeting': convertTargetingsFromOldToNew({
        'hb_bidder': 'appnexus',
        'hb_adid': '233bcbee889d46d',
        'hb_pb': '10.00',
        'hb_size': '300x250',
        'foobar': '300x250'
      }),
      'netRevenue': true,
      'currency': 'USD',
      'ttl': 300
    },
    {
      'bidderCode': 'appnexus',
      'width': 728,
      'height': 90,
      'statusMessage': 'Bid available',
      'adId': '24bd938435ec3fc',
      'creative_id': 33989846,
      'cpm': 10,
      'adUrl': 'http://lax1-ib.adnxs.com/ab?e=wqT_3QLyBKhyAgAAAwDWAAUBCMjAybkFEOOryfjI7rGNWhjL84KE1tzG-kkgASotCQAAAQII4D8RAQcQAADgPxkJCQjwPyEJCQjgPykRCaAwuvekAji-B0C-B0gCUNbJmhBYweAnYABokUB4mt0CgAEBigEDVVNEkgUG8ECYAdgFoAFaqAEBsAEAuAEBwAEDyAEA0AEA2AEA4AEA8AEAigI6dWYoJ2EnLCA0OTQ0NzIsIDE0NjI5MTkyNDApOwEcLHInLCAzMzk4OTg0NjYeAPBvkgLNASFwU2Y1YUFpNjBJY0VFTmJKbWhBWUFDREI0Q2N3QURnQVFBUkl2Z2RRdXZla0FsZ0FZSk1IYUFCd3lnNTRDb0FCcGh5SUFRcVFBUUdZQVFHZ0FRR29BUU93QVFDNUFRQUFBQUFBQU9BX3dRRQkMSEFEZ1A4a0JJNTJDbGs5VjB6X1oVKCRQQV80QUVBOVFFBSw8bUFLS2dNQ0NENkFDQUxVQwUVBEwwCQh0T0FDQU9nQ0FQZ0NBSUFEQVEuLpoCJSFfZ2lqYXdpMtAA8KZ3ZUFuSUFRb2lvREFnZzgu2ALoB-ACx9MB6gIfaHR0cDovL3ByZWJpZC5vcmc6OTk5OS9ncHQuaHRtbIADAIgDAZADAJgDBaADAaoDALADALgDAMADrALIAwDYAwDgAwDoAwD4AwOABACSBAQvanB0mAQAogQKMTAuMS4xMy4zN6gEi-wJsgQICAAQABgAIAC4BADABADIBADSBAsxMC4wLjgwLjI0MA..&s=1f584d32c2d7ae3ce3662cfac7ca24e710bc7fd0&referrer=http%3A%2F%2Fprebid.org%3A9999%2Fgpt.html',
      'responseTimestamp': 1462919239342,
      'requestTimestamp': 1462919238919,
      'bidder': 'appnexus',
      'adUnitCode': '/19968336/header-bid-tag1',
      'timeToRespond': 423,
      'pbLg': '5.00',
      'pbMg': '10.00',
      'pbHg': '10.00',
      'pbAg': '10.00',
      'size': '728x90',
      'alwaysUseBid': true,
      'auctionId': 123456,
      'requestId': '392b5a6b05d648',
      'adserverTargeting': convertTargetingsFromOldToNew({
        'hb_bidder': 'appnexus',
        'hb_adid': '24bd938435ec3fc',
        'hb_pb': '10.00',
        'hb_size': '728x90',
        'foobar': '728x90'
      }),
      'netRevenue': true,
      'currency': 'USD',
      'ttl': 300
    },
    {
      'bidderCode': 'pagescience',
      'width': 300,
      'height': 250,
      'statusMessage': 'Bid available',
      'adId': '25bedd4813632d7',
      'creative_id': 29681110,
      'cpm': 0.5,
      'adUrl': 'http://lax1-ib.adnxs.com/ab?e=wqT_3QLzBKhzAgAAAwDWAAUBCMjAybkFEM7fioW41qjIQRjL84KE1tzG-kkgASotCQAAAQII4D8RAQcQAADgPxkJCQjwPyEJCQjgPykRCaAwuvekAji-B0C-B0gCUNbLkw5YweAnYABokUB4yIsEgAEBigEDVVNEkgUG8FKYAawCoAH6AagBAbABALgBAcABA8gBANABANgBAOABAPABAIoCOnVmKCdhJywgNDk0NDcyLCAxNDYyOTE5MjQwKTt1ZigncicsIDI5NjgxMTEwLDIeAPBvkgLNASFfeWVLYndpNjBJY0VFTmJMa3c0WUFDREI0Q2N3QURnQVFBUkl2Z2RRdXZla0FsZ0FZSk1IYUFCdzNBMTRDb0FCcGh5SUFRcVFBUUdZQVFHZ0FRR29BUU93QVFDNUFRQUFBQUFBQU9BX3dRRQkMSEFEZ1A4a0JSR3RLaGp1UTFEX1oVKCRQQV80QUVBOVFFBSw8bUFLS2dQVFNES0FDQUxVQwUVBEwwCQhwT0FDQU9nQ0FQZ0NBSUFEQVEuLpoCJSFlQWwtYkE20ADwpndlQW5JQVFvaW9EMDBndy7YAugH4ALH0wHqAh9odHRwOi8vcHJlYmlkLm9yZzo5OTk5L2dwdC5odG1sgAMAiAMBkAMAmAMFoAMBqgMAsAMAuAMAwAOsAsgDANgDAOADAOgDAPgDA4AEAJIEBC9qcHSYBACiBAoxMC4xLjEzLjM3qASL7AmyBAgIABAAGAAgALgEAMAEAMgEANIECzEwLjAuOTMuMjAy&s=1fd8d5650fa1fb8d918a2f403d6a1f97c10d7ec2&referrer=http%3A%2F%2Fprebid.org%3A9999%2Fgpt.html',
      'responseTimestamp': 1462919239343,
      'requestTimestamp': 1462919238943,
      'bidder': 'pagescience',
      'adUnitCode': '/19968336/header-bid-tag-0',
      'timeToRespond': 400,
      'pbLg': '0.50',
      'pbMg': '0.50',
      'pbHg': '0.50',
      'pbAg': '0.50',
      'size': '300x250',
      'auctionId': 123456,
      'requestId': '192c8c1df0f5d1d',
      'adserverTargeting': convertTargetingsFromOldToNew({
        'hb_bidder': 'pagescience',
        'hb_adid': '25bedd4813632d7',
        'hb_pb': '10.00',
        'hb_size': '300x250',
        'foobar': '300x250'
      }),
      'netRevenue': true,
      'currency': 'USD',
      'ttl': 300
    },
    {
      'bidderCode': 'brightcom',
      'width': 300,
      'height': 250,
      'statusMessage': 'Bid available',
      'adId': '26e0795ab963896',
      'cpm': 0.17,
      'ad': "<script type=\"text/javascript\">document.write('<scr'+'ipt src=\"//trk.diamondminebubble.com/h.html?e=hb_before_creative_renders&ho=2140340&ty=j&si=300x250&ta=16577&cd=cdn.marphezis.com&raid=15f3d12e77c1e5a&rimid=14fe662ee0a3506&rbid=235894352&cb=' + Math.floor((Math.random()*100000000000)+1) + '&ref=\"></scr' + 'ipt>');</script><script type=\"text/javascript\">var compassSmartTag={h:\"2140340\",t:\"16577\",d:\"2\",referral:\"\",y_b:{y:\"j\",s:\"300x250\"},hb:{raid:\"15f3d12e77c1e5a\",rimid:\"14fe662ee0a3506\",rbid:\"235894352\"}};</script><script src=\"//cdn.marphezis.com/cmps/cst.min.js\"></script><img src=\"http://notifications.iselephant.com/hb/awin?byid=400&imid=14fe662ee0a3506&auid=15f3d12e77c1e5a&bdid=235894352\" width=\"1\" height=\"1\" style=\"display:none\" />",
      'responseTimestamp': 1462919239420,
      'requestTimestamp': 1462919238937,
      'bidder': 'brightcom',
      'adUnitCode': '/19968336/header-bid-tag-0',
      'timeToRespond': 483,
      'pbLg': '0.00',
      'pbMg': '0.10',
      'pbHg': '0.17',
      'pbAg': '0.15',
      'size': '300x250',
      'auctionId': 654321,
      'requestId': '135e89c039705da',
      'adserverTargeting': convertTargetingsFromOldToNew({
        'hb_bidder': 'brightcom',
        'hb_adid': '26e0795ab963896',
        'hb_pb': '10.00',
        'hb_size': '300x250',
        'foobar': '300x250'
      }),
      'netRevenue': true,
      'currency': 'USD',
      'ttl': 300
    },
    {
      'bidderCode': 'brealtime',
      'width': 300,
      'height': 250,
      'statusMessage': 'Bid available',
      'adId': '275bd666f5a5a5d',
      'creative_id': 29681110,
      'cpm': 0.5,
      'adUrl': 'http://lax1-ib.adnxs.com/ab?e=wqT_3QLzBKhzAgAAAwDWAAUBCMjAybkFEIPr4YfMvKLoQBjL84KE1tzG-kkgASotCQAAAQII4D8RAQcQAADgPxkJCQjwPyEJCQjgPykRCaAwuvekAji-B0C-B0gCUNbLkw5YweAnYABokUB4mo8EgAEBigEDVVNEkgUG8FKYAawCoAH6AagBAbABALgBAcABA8gBANABANgBAOABAPABAIoCOnVmKCdhJywgNDk0NDcyLCAxNDYyOTE5MjQwKTt1ZigncicsIDI5NjgxMTEwLDIeAPBvkgLNASFsU2NQWlFpNjBJY0VFTmJMa3c0WUFDREI0Q2N3QURnQVFBUkl2Z2RRdXZla0FsZ0FZSk1IYUFCdzNBMTRDb0FCcGh5SUFRcVFBUUdZQVFHZ0FRR29BUU93QVFDNUFRQUFBQUFBQU9BX3dRRQkMSEFEZ1A4a0JHZmNvazFBejFUX1oVKCRQQV80QUVBOVFFBSw8bUFLS2dOU0NEYUFDQUxVQwUVBEwwCQh0T0FDQU9nQ0FQZ0NBSUFEQVEuLpoCJSFDUWxfYXdpMtAA8KZ3ZUFuSUFRb2lvRFVnZzAu2ALoB-ACx9MB6gIfaHR0cDovL3ByZWJpZC5vcmc6OTk5OS9ncHQuaHRtbIADAIgDAZADAJgDBaADAaoDALADALgDAMADrALIAwDYAwDgAwDoAwD4AwOABACSBAQvanB0mAQAogQKMTAuMS4xMy4zN6gEi-wJsgQICAAQABgAIAC4BADABADIBADSBAsxMC4wLjg1LjIwOA..&s=975cfe6518f064683541240f0d780d93a5f973da&referrer=http%3A%2F%2Fprebid.org%3A9999%2Fgpt.html',
      'responseTimestamp': 1462919239486,
      'requestTimestamp': 1462919238941,
      'bidder': 'brealtime',
      'adUnitCode': '/19968336/header-bid-tag-0',
      'timeToRespond': 545,
      'pbLg': '0.50',
      'pbMg': '0.50',
      'pbHg': '0.50',
      'pbAg': '0.50',
      'size': '300x250',
      'auctionId': 654321,
      'requestId': '17dd1d869bed44e',
      'adserverTargeting': convertTargetingsFromOldToNew({
        'hb_bidder': 'brealtime',
        'hb_adid': '275bd666f5a5a5d',
        'hb_pb': '10.00',
        'hb_size': '300x250',
        'foobar': '300x250'
      }),
      'netRevenue': true,
      'currency': 'USD',
      'ttl': 300
    },
    {
      'bidderCode': 'pubmatic',
      'width': '300',
      'height': '250',
      'statusMessage': 'Bid available',
      'adId': '28f4039c636b6a7',
      'adSlot': '39620189@300x250',
      'cpm': 5.9396,
      'ad': "<span class=\"PubAPIAd\"><img src=\"http://usw-lax.adsrvr.org/bid/feedback/pubmatic?iid=467b5d95-d55a-4125-a90a-64a34d92ceec&crid=p84y3ree&wp=8.5059874&aid=9519B012-A2CF-4166-93F5-DEB9D7CC9680&wpc=USD&sfe=969e047&puid=4367D163-7DC9-40CD-8DC1-0A0876574ADE&tdid=9514a176-457b-4bb1-ae75-0d2b5e8012fa&pid=rw83mt1&ag=rmorau3&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&svbttd=1&dt=PC&osf=OSX&os=Other&br=Chrome&rlangs=en&mlang=&svpid=39741&did=&rcxt=Other&lat=45.518097&lon=-122.675095&tmpc=&daid=&vp=0&osi=&osv=&bp=13.6497&testid=audience-eval-old&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI/f//////////ARIGcGVlcjM5EISVAw==&crrelr=\" width=\"1\" height=\"1\" style=\"display: none;\"/><IFRAME SRC=\"https://ad.doubleclick.net/ddm/adi/N84001.284566THETRADEDESK/B9241716.125553599;sz=300x250;click0=http://insight.adsrvr.org/track/clk?imp=467b5d95-d55a-4125-a90a-64a34d92ceec&ag=rmorau3&crid=p84y3ree&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&sv=pubmatic&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=39741&rlangs=en&mlang=&did=&rcxt=Other&tmpc=&vrtd=&osi=&osv=&daid=&dnr=0&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARIGcGVlcjM5EISVAw%3D%3D&crrelr=&svscid=66156&testid=audience-eval-old&r=;ord=102917?\" WIDTH=300 HEIGHT=250 MARGINWIDTH=0 MARGINHEIGHT=0 HSPACE=0 VSPACE=0 FRAMEBORDER=0 SCROLLING=no BORDERCOLOR='#000000'>\r\n<SCRIPT language='JavaScript1.1' SRC=\"https://ad.doubleclick.net/ddm/adj/N84001.284566THETRADEDESK/B9241716.125553599;abr=!ie;sz=300x250;click0=http://insight.adsrvr.org/track/clk?imp=467b5d95-d55a-4125-a90a-64a34d92ceec&ag=rmorau3&crid=p84y3ree&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&sv=pubmatic&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=39741&rlangs=en&mlang=&did=&rcxt=Other&tmpc=&vrtd=&osi=&osv=&daid=&dnr=0&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARIGcGVlcjM5EISVAw%3D%3D&crrelr=&svscid=66156&testid=audience-eval-old&r=;ord=102917?\">\r\n</SCRIPT>\r\n<NOSCRIPT>\r\n<A HREF=\"http://insight.adsrvr.org/track/clk?imp=467b5d95-d55a-4125-a90a-64a34d92ceec&ag=rmorau3&crid=p84y3ree&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&sv=pubmatic&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=39741&rlangs=en&mlang=&did=&rcxt=Other&tmpc=&vrtd=&osi=&osv=&daid=&dnr=0&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARIGcGVlcjM5EISVAw%3D%3D&crrelr=&svscid=66156&testid=audience-eval-old&r=https://ad.doubleclick.net/ddm/jump/N84001.284566THETRADEDESK/B9241716.125553599;abr=!ie4;abr=!ie5;sz=300x250;click0=http://insight.adsrvr.org/track/clk?imp=467b5d95-d55a-4125-a90a-64a34d92ceec&ag=rmorau3&crid=p84y3ree&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&sv=pubmatic&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=39741&rlangs=en&mlang=&did=&rcxt=Other&tmpc=&vrtd=&osi=&osv=&daid=&dnr=0&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARIGcGVlcjM5EISVAw%3D%3D&crrelr=&svscid=66156&testid=audience-eval-old&r=;ord=102917?\">\r\n<IMG SRC=\"https://ad.doubleclick.net/ddm/ad/N84001.284566THETRADEDESK/B9241716.125553599;abr=!ie4;abr=!ie5;sz=300x250;click0=http://insight.adsrvr.org/track/clk?imp=467b5d95-d55a-4125-a90a-64a34d92ceec&ag=rmorau3&crid=p84y3ree&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&sv=pubmatic&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=39741&rlangs=en&mlang=&did=&rcxt=Other&tmpc=&vrtd=&osi=&osv=&daid=&dnr=0&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARIGcGVlcjM5EISVAw%3D%3D&crrelr=&svscid=66156&testid=audience-eval-old&r=;ord=102917?\" BORDER=0 WIDTH=300 HEIGHT=250 ALT=\"Advertisement\"></A>\r\n</NOSCRIPT>\r\n</IFRAME><span id=\"te-clearads-js-tradedesk01cont1\"><script type=\"text/javascript\" src=\"https://choices.truste.com/ca?pid=tradedesk01&aid=tradedesk01&cid=10312015&c=tradedesk01cont1&js=pmw0&w=300&h=250&sid=0\"></script></span>\r</span> <!-- PubMatic Ad Ends --><div style=\"position:absolute;left:0px;top:0px;visibility:hidden;\"><img src=\"http://aktrack.pubmatic.com/AdServer/AdDisplayTrackerServlet?operId=1&pubId=39741&siteId=66156&adId=148827&adServerId=243&kefact=5.939592&kaxefact=5.939592&kadNetFrequecy=1&kadwidth=300&kadheight=250&kadsizeid=9&kltstamp=1462919239&indirectAdId=0&adServerOptimizerId=2&ranreq=0.8652068939929505&kpbmtpfact=8.505987&dcId=1&tldId=19194842&passback=0&imprId=8025E377-EC45-4EB6-826C-49D56CCE47DF&oid=8025E377-EC45-4EB6-826C-49D56CCE47DF&ias=272&crID=p84y3ree&campaignId=6810&creativeId=0&pctr=0.000000&wDSPByrId=1362&pageURL=http%253A%252F%252Fprebid.org%253A9999%252Fgpt.html&lpu=www.etrade.com\"></div>",
      'dealId': '',
      'responseTimestamp': 1462919239544,
      'requestTimestamp': 1462919238922,
      'bidder': 'pubmatic',
      'adUnitCode': '/19968336/header-bid-tag-0',
      'timeToRespond': 622,
      'pbLg': '5.00',
      'pbMg': '5.90',
      'pbHg': '5.93',
      'pbAg': '5.90',
      'size': '300x250',
      'auctionId': 654321,
      'requestId': '6d11aa2d5b3659',
      'adserverTargeting': convertTargetingsFromOldToNew({
        'hb_bidder': 'pubmatic',
        'hb_adid': '28f4039c636b6a7',
        'hb_pb': '10.00',
        'hb_size': '300x250',
        'foobar': '300x250'
      }),
      'netRevenue': true,
      'currency': 'USD',
      'ttl': 300
    },
    {
      'bidderCode': 'rubicon',
      'width': 300,
      'height': 600,
      'statusMessage': 'Bid available',
      'adId': '29019e2ab586a5a',
      'cpm': 2.74,
      'ad': '<script type="text/javascript">;(function (rt, fe) { rt.renderCreative(fe, "/19968336/header-bid-tag-0", "10"); }((parent.window.rubicontag || window.top.rubicontag), (document.body || document.documentElement)));</script>',
      'responseTimestamp': 1462919239860,
      'requestTimestamp': 1462919238934,
      'bidder': 'rubicon',
      'adUnitCode': '/19968336/header-bid-tag-0',
      'timeToRespond': 926,
      'pbLg': '2.50',
      'pbMg': '2.70',
      'pbHg': '2.74',
      'pbAg': '2.70',
      'size': '300x600',
      'auctionId': 654321,
      'requestId': '96aff279720d39',
      'adserverTargeting': convertTargetingsFromOldToNew({
        'hb_bidder': 'rubicon',
        'hb_adid': '29019e2ab586a5a',
        'hb_pb': '10.00',
        'hb_size': '300x600',
        'foobar': '300x600'
      }),
      'netRevenue': true,
      'currency': 'USD',
      'ttl': 300
    }
  ];
}

export function getSlotTargeting() {
  return {
    '/19968336/header-bid-tag-0': [
      convertTargetingsFromOldToNew({
        'hb_bidder': [
          'appnexus'
        ]
      }),
      convertTargetingsFromOldToNew({
        'hb_adid': [
          '233bcbee889d46d'
        ]
      }),
      convertTargetingsFromOldToNew({
        'hb_pb': [
          '10.00'
        ]
      }),
      convertTargetingsFromOldToNew({
        'hb_size': [
          '300x250'
        ]
      }),
      {
        'foobar': [
          '300x250'
        ]
      }
    ]
  };
}

export function getAdUnits() {
  return [
    {
      'code': '/19968336/header-bid-tag1',
      'sizes': [
        [
          728,
          90
        ],
        [
          970,
          90
        ]
      ],
      'bids': [
        {
          'bidder': 'adequant',
          'params': {
            'publisher_id': '1234567',
            'bidfloor': 0.01
          },
          'adUnitCode': '/19968336/header-bid-tag1',
          'sizes': [
            [
              728,
              90
            ],
            [
              970,
              90
            ]
          ],
          'bidId': '3692954f816efc',
          'bidderRequestId': '2b1a75d5e826c4',
          'auctionId': '1ff753bd4ae5cb'
        },
        {
          'bidder': 'appnexus',
          'params': {
            'placementId': '543221',
            'test': 'me'
          },
          'adUnitCode': '/19968336/header-bid-tag1',
          'sizes': [
            [
              728,
              90
            ],
            [
              970,
              90
            ]
          ],
          'bidId': '68136e1c47023d',
          'bidderRequestId': '55e24a66bed717',
          'auctionId': '1ff753bd4ae5cb',
          'startTime': 1463510220995,
          'status': 1
        }
      ]
    },
    {
      'code': '/19968336/header-bid-tag-0',
      'sizes': [
        [
          300,
          250
        ],
        [
          300,
          600
        ]
      ],
      'bids': [
        {
          'bidder': 'appnexus',
          'params': {
            'placementId': '5324321'
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '7e5d6af25ed188',
          'bidderRequestId': '55e24a66bed717',
          'auctionId': '1ff753bd4ae5cb',
          'startTime': 1463510220996
        },
        {
          'bidder': 'adequant',
          'params': {
            'publisher_id': '12353433',
            'bidfloor': 0.01
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '4448d80ac1374e',
          'bidderRequestId': '2b1a75d5e826c4',
          'auctionId': '1ff753bd4ae5cb'
        },
        {
          'bidder': 'triplelift',
          'params': {
            'inventoryCode': 'inv_code_here'
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '9514d586c52abf',
          'bidderRequestId': '8c4f03b838d7ee',
          'auctionId': '1ff753bd4ae5cb',
          'startTime': 1463510220997
        },
        {
          'bidder': 'springserve',
          'params': {
            'impId': 1234,
            'supplyPartnerId': 1,
            'test': true
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '113079fed03f58c',
          'bidderRequestId': '1048e0df882e965',
          'auctionId': '1ff753bd4ae5cb'
        },
        {
          'bidder': 'rubicon',
          'params': {
            'accountId': '123456',
            'siteId': '345678',
            'zoneId': '234567',
            'userId': '12346',
            'keywords': [
              'a',
              'b',
              'c'
            ],
            'inventory': {
              'rating': '5-star',
              'prodtype': 'tech'
            },
            'visitor': {
              'ucat': 'new',
              'search': 'iphone'
            },
            'sizes': [
              15,
              10
            ]
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '13c2c2a79d155ea',
          'bidderRequestId': '129e383ac549e5d',
          'auctionId': '1ff753bd4ae5cb'
        },
        {
          'bidder': 'openx',
          'params': {
            'jstag_url': 'http://servedbyopenx.com/w/1.0/jstag?nc=account_key',
            'unit': 2345677
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '154f9cbf82df565',
          'bidderRequestId': '1448569c2453b84',
          'auctionId': '1ff753bd4ae5cb'
        },
        {
          'bidder': 'pubmatic',
          'params': {
            'publisherId': 1234567,
            'adSlot': '1234567@300x250'
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '17f8c3a8fb13308',
          'bidderRequestId': '16095445eeb05e4',
          'auctionId': '1ff753bd4ae5cb'
        },
        {
          'bidder': 'pagescience',
          'params': {
            'placementId': '1234567'
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '2074d5757675542',
          'bidderRequestId': '19883380ef5453a',
          'auctionId': '1ff753bd4ae5cb',
          'startTime': 1463510221014
        },
        {
          'bidder': 'brealtime',
          'params': {
            'placementId': '1234567'
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '222b6ad5a9b835d',
          'bidderRequestId': '2163409fdf6f333',
          'auctionId': '1ff753bd4ae5cb',
          'startTime': 1463510221015
        },
        {
          'bidder': 'indexExchange',
          'params': {
            'id': '1',
            'siteID': 123456,
            'timeout': 10000
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '2499961ab3f937a',
          'bidderRequestId': '23b57a2de4ae50b',
          'auctionId': '1ff753bd4ae5cb'
        },
        {
          'bidder': 'adform',
          'params': {
            'adxDomain': 'adx.adform.net',
            'mid': 123456,
            'test': 1
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '26605265bf5e9c5',
          'bidderRequestId': '25a0902299c17d3',
          'auctionId': '1ff753bd4ae5cb'
        },
        {
          'bidder': 'amazon',
          'params': {
            'aId': 3080
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '2935d8f6764fe45',
          'bidderRequestId': '28afa21ca9246c1',
          'auctionId': '1ff753bd4ae5cb'
        },
        {
          'bidder': 'aol',
          'params': {
            'network': '112345.45',
            'placement': 12345
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '31d1489681dc539',
          'bidderRequestId': '30bf32da9080fdd',
          'auctionId': '1ff753bd4ae5cb'
        },
        {
          'bidder': 'sovrn',
          'params': {
            'tagid': '123556'
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '33c1a8028d91563',
          'bidderRequestId': '324bcb47cfcf034',
          'auctionId': '1ff753bd4ae5cb'
        },
        {
          'bidder': 'pulsepoint',
          'params': {
            'cf': '300X250',
            'cp': 1233456,
            'ct': 12357
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '379219f0506a26f',
          'bidderRequestId': '360ec66bbb0719c',
          'auctionId': '1ff753bd4ae5cb'
        },
        {
          'bidder': 'brightcom',
          'params': {
            'tagId': 75423
          },
          'adUnitCode': '/19968336/header-bid-tag-0',
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ],
          'bidId': '395cfcf496e7d6d',
          'bidderRequestId': '38a776c7f001ea',
          'auctionId': '1ff753bd4ae5cb'
        }
      ]
    }
  ];
};

export function getBidResponsesFromAPI() {
  return {
    '/19968336/header-bid-tag-0': {
      'bids': [
        {
          'bidderCode': 'brightcom',
          'width': 300,
          'height': 250,
          'statusMessage': 'Bid available',
          'adId': '26e0795ab963896',
          'cpm': 0.17,
          'ad': "<script type=\"text/javascript\">document.write('<scr'+'ipt src=\"//trk.diamondminebubble.com/h.html?e=hb_before_creative_renders&ho=2140340&ty=j&si=300x250&ta=16577&cd=cdn.marphezis.com&raid=15f3d12e77c1e5a&rimid=14fe662ee0a3506&rbid=235894352&cb=' + Math.floor((Math.random()*100000000000)+1) + '&ref=\"></scr' + 'ipt>');</script><script type=\"text/javascript\">var compassSmartTag={h:\"2140340\",t:\"16577\",d:\"2\",referral:\"\",y_b:{y:\"j\",s:\"300x250\"},hb:{raid:\"15f3d12e77c1e5a\",rimid:\"14fe662ee0a3506\",rbid:\"235894352\"}};</script><script src=\"//cdn.marphezis.com/cmps/cst.min.js\"></script><img src=\"http://notifications.iselephant.com/hb/awin?byid=400&imid=14fe662ee0a3506&auid=15f3d12e77c1e5a&bdid=235894352\" width=\"1\" height=\"1\" style=\"display:none\" />",
          'responseTimestamp': 1462919239420,
          'requestTimestamp': 1462919238937,
          'bidder': 'brightcom',
          'adUnitCode': '/19968336/header-bid-tag-0',
          'timeToRespond': 483,
          'pbLg': '0.00',
          'pbMg': '0.10',
          'pbHg': '0.17',
          'pbAg': '0.15',
          'size': '300x250',
          'auctionId': 654321,
          'requestId': '135e89c039705da',
          'adserverTargeting': convertTargetingsFromOldToNew({
            'hb_bidder': 'brightcom',
            'hb_adid': '26e0795ab963896',
            'hb_pb': '10.00',
            'hb_size': '300x250',
            'foobar': '300x250'
          }),
          'netRevenue': true,
          'currency': 'USD',
          'ttl': 300
        },
        {
          'bidderCode': 'brealtime',
          'width': 300,
          'height': 250,
          'statusMessage': 'Bid available',
          'adId': '275bd666f5a5a5d',
          'creative_id': 29681110,
          'cpm': 0.5,
          'adUrl': 'http://lax1-ib.adnxs.com/ab?e=wqT_3QLzBKhzAgAAAwDWAAUBCMjAybkFEIPr4YfMvKLoQBjL84KE1tzG-kkgASotCQAAAQII4D8RAQcQAADgPxkJCQjwPyEJCQjgPykRCaAwuvekAji-B0C-B0gCUNbLkw5YweAnYABokUB4mo8EgAEBigEDVVNEkgUG8FKYAawCoAH6AagBAbABALgBAcABA8gBANABANgBAOABAPABAIoCOnVmKCdhJywgNDk0NDcyLCAxNDYyOTE5MjQwKTt1ZigncicsIDI5NjgxMTEwLDIeAPBvkgLNASFsU2NQWlFpNjBJY0VFTmJMa3c0WUFDREI0Q2N3QURnQVFBUkl2Z2RRdXZla0FsZ0FZSk1IYUFCdzNBMTRDb0FCcGh5SUFRcVFBUUdZQVFHZ0FRR29BUU93QVFDNUFRQUFBQUFBQU9BX3dRRQkMSEFEZ1A4a0JHZmNvazFBejFUX1oVKCRQQV80QUVBOVFFBSw8bUFLS2dOU0NEYUFDQUxVQwUVBEwwCQh0T0FDQU9nQ0FQZ0NBSUFEQVEuLpoCJSFDUWxfYXdpMtAA8KZ3ZUFuSUFRb2lvRFVnZzAu2ALoB-ACx9MB6gIfaHR0cDovL3ByZWJpZC5vcmc6OTk5OS9ncHQuaHRtbIADAIgDAZADAJgDBaADAaoDALADALgDAMADrALIAwDYAwDgAwDoAwD4AwOABACSBAQvanB0mAQAogQKMTAuMS4xMy4zN6gEi-wJsgQICAAQABgAIAC4BADABADIBADSBAsxMC4wLjg1LjIwOA..&s=975cfe6518f064683541240f0d780d93a5f973da&referrer=http%3A%2F%2Fprebid.org%3A9999%2Fgpt.html',
          'responseTimestamp': 1462919239486,
          'requestTimestamp': 1462919238941,
          'bidder': 'brealtime',
          'adUnitCode': '/19968336/header-bid-tag-0',
          'timeToRespond': 545,
          'pbLg': '0.50',
          'pbMg': '0.50',
          'pbHg': '0.50',
          'pbAg': '0.50',
          'size': '300x250',
          'auctionId': 654321,
          'requestId': '17dd1d869bed44e',
          'adserverTargeting': convertTargetingsFromOldToNew({
            'hb_bidder': 'brealtime',
            'hb_adid': '275bd666f5a5a5d',
            'hb_pb': '10.00',
            'hb_size': '300x250',
            'foobar': '300x250'
          }),
          'netRevenue': true,
          'currency': 'USD',
          'ttl': 300
        },
        {
          'bidderCode': 'pubmatic',
          'width': '300',
          'height': '250',
          'statusMessage': 'Bid available',
          'adId': '28f4039c636b6a7',
          'adSlot': '39620189@300x250',
          'cpm': 5.9396,
          'ad': "<span class=\"PubAPIAd\"><img src=\"http://usw-lax.adsrvr.org/bid/feedback/pubmatic?iid=467b5d95-d55a-4125-a90a-64a34d92ceec&crid=p84y3ree&wp=8.5059874&aid=9519B012-A2CF-4166-93F5-DEB9D7CC9680&wpc=USD&sfe=969e047&puid=4367D163-7DC9-40CD-8DC1-0A0876574ADE&tdid=9514a176-457b-4bb1-ae75-0d2b5e8012fa&pid=rw83mt1&ag=rmorau3&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&svbttd=1&dt=PC&osf=OSX&os=Other&br=Chrome&rlangs=en&mlang=&svpid=39741&did=&rcxt=Other&lat=45.518097&lon=-122.675095&tmpc=&daid=&vp=0&osi=&osv=&bp=13.6497&testid=audience-eval-old&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI/f//////////ARIGcGVlcjM5EISVAw==&crrelr=\" width=\"1\" height=\"1\" style=\"display: none;\"/><IFRAME SRC=\"https://ad.doubleclick.net/ddm/adi/N84001.284566THETRADEDESK/B9241716.125553599;sz=300x250;click0=http://insight.adsrvr.org/track/clk?imp=467b5d95-d55a-4125-a90a-64a34d92ceec&ag=rmorau3&crid=p84y3ree&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&sv=pubmatic&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=39741&rlangs=en&mlang=&did=&rcxt=Other&tmpc=&vrtd=&osi=&osv=&daid=&dnr=0&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARIGcGVlcjM5EISVAw%3D%3D&crrelr=&svscid=66156&testid=audience-eval-old&r=;ord=102917?\" WIDTH=300 HEIGHT=250 MARGINWIDTH=0 MARGINHEIGHT=0 HSPACE=0 VSPACE=0 FRAMEBORDER=0 SCROLLING=no BORDERCOLOR='#000000'>\r\n<SCRIPT language='JavaScript1.1' SRC=\"https://ad.doubleclick.net/ddm/adj/N84001.284566THETRADEDESK/B9241716.125553599;abr=!ie;sz=300x250;click0=http://insight.adsrvr.org/track/clk?imp=467b5d95-d55a-4125-a90a-64a34d92ceec&ag=rmorau3&crid=p84y3ree&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&sv=pubmatic&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=39741&rlangs=en&mlang=&did=&rcxt=Other&tmpc=&vrtd=&osi=&osv=&daid=&dnr=0&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARIGcGVlcjM5EISVAw%3D%3D&crrelr=&svscid=66156&testid=audience-eval-old&r=;ord=102917?\">\r\n</SCRIPT>\r\n<NOSCRIPT>\r\n<A HREF=\"http://insight.adsrvr.org/track/clk?imp=467b5d95-d55a-4125-a90a-64a34d92ceec&ag=rmorau3&crid=p84y3ree&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&sv=pubmatic&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=39741&rlangs=en&mlang=&did=&rcxt=Other&tmpc=&vrtd=&osi=&osv=&daid=&dnr=0&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARIGcGVlcjM5EISVAw%3D%3D&crrelr=&svscid=66156&testid=audience-eval-old&r=https://ad.doubleclick.net/ddm/jump/N84001.284566THETRADEDESK/B9241716.125553599;abr=!ie4;abr=!ie5;sz=300x250;click0=http://insight.adsrvr.org/track/clk?imp=467b5d95-d55a-4125-a90a-64a34d92ceec&ag=rmorau3&crid=p84y3ree&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&sv=pubmatic&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=39741&rlangs=en&mlang=&did=&rcxt=Other&tmpc=&vrtd=&osi=&osv=&daid=&dnr=0&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARIGcGVlcjM5EISVAw%3D%3D&crrelr=&svscid=66156&testid=audience-eval-old&r=;ord=102917?\">\r\n<IMG SRC=\"https://ad.doubleclick.net/ddm/ad/N84001.284566THETRADEDESK/B9241716.125553599;abr=!ie4;abr=!ie5;sz=300x250;click0=http://insight.adsrvr.org/track/clk?imp=467b5d95-d55a-4125-a90a-64a34d92ceec&ag=rmorau3&crid=p84y3ree&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&sv=pubmatic&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=39741&rlangs=en&mlang=&did=&rcxt=Other&tmpc=&vrtd=&osi=&osv=&daid=&dnr=0&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARIGcGVlcjM5EISVAw%3D%3D&crrelr=&svscid=66156&testid=audience-eval-old&r=;ord=102917?\" BORDER=0 WIDTH=300 HEIGHT=250 ALT=\"Advertisement\"></A>\r\n</NOSCRIPT>\r\n</IFRAME><span id=\"te-clearads-js-tradedesk01cont1\"><script type=\"text/javascript\" src=\"https://choices.truste.com/ca?pid=tradedesk01&aid=tradedesk01&cid=10312015&c=tradedesk01cont1&js=pmw0&w=300&h=250&sid=0\"></script></span>\r</span> <!-- PubMatic Ad Ends --><div style=\"position:absolute;left:0px;top:0px;visibility:hidden;\"><img src=\"http://aktrack.pubmatic.com/AdServer/AdDisplayTrackerServlet?operId=1&pubId=39741&siteId=66156&adId=148827&adServerId=243&kefact=5.939592&kaxefact=5.939592&kadNetFrequecy=1&kadwidth=300&kadheight=250&kadsizeid=9&kltstamp=1462919239&indirectAdId=0&adServerOptimizerId=2&ranreq=0.8652068939929505&kpbmtpfact=8.505987&dcId=1&tldId=19194842&passback=0&imprId=8025E377-EC45-4EB6-826C-49D56CCE47DF&oid=8025E377-EC45-4EB6-826C-49D56CCE47DF&ias=272&crID=p84y3ree&campaignId=6810&creativeId=0&pctr=0.000000&wDSPByrId=1362&pageURL=http%253A%252F%252Fprebid.org%253A9999%252Fgpt.html&lpu=www.etrade.com\"></div>",
          'dealId': '',
          'responseTimestamp': 1462919239544,
          'requestTimestamp': 1462919238922,
          'bidder': 'pubmatic',
          'adUnitCode': '/19968336/header-bid-tag-0',
          'timeToRespond': 622,
          'pbLg': '5.00',
          'pbMg': '5.90',
          'pbHg': '5.93',
          'pbAg': '5.90',
          'size': '300x250',
          'auctionId': 654321,
          'requestId': '6d11aa2d5b3659',
          'adserverTargeting': convertTargetingsFromOldToNew({
            'hb_bidder': 'pubmatic',
            'hb_adid': '28f4039c636b6a7',
            'hb_pb': '10.00',
            'hb_size': '300x250',
            'foobar': '300x250'
          }),
          'netRevenue': true,
          'currency': 'USD',
          'ttl': 300
        },
        {
          'bidderCode': 'rubicon',
          'width': 300,
          'height': 600,
          'statusMessage': 'Bid available',
          'adId': '29019e2ab586a5a',
          'cpm': 2.74,
          'ad': '<script type="text/javascript">;(function (rt, fe) { rt.renderCreative(fe, "/19968336/header-bid-tag-0", "10"); }((parent.window.rubicontag || window.top.rubicontag), (document.body || document.documentElement)));</script>',
          'responseTimestamp': 1462919239860,
          'requestTimestamp': 1462919238934,
          'bidder': 'rubicon',
          'adUnitCode': '/19968336/header-bid-tag-0',
          'timeToRespond': 926,
          'pbLg': '2.50',
          'pbMg': '2.70',
          'pbHg': '2.74',
          'pbAg': '2.70',
          'size': '300x600',
          'auctionId': 654321,
          'requestId': '96aff279720d39',
          'adserverTargeting': convertTargetingsFromOldToNew({
            'hb_bidder': 'rubicon',
            'hb_adid': '29019e2ab586a5a',
            'hb_pb': '10.00',
            'hb_size': '300x600',
            'foobar': '300x600'
          }),
          'netRevenue': true,
          'currency': 'USD',
          'ttl': 300
        }
      ]
    }
  };
}

// Ad server targeting when `setConfig({ enableSendAllBids: true })` is set.
export function getAdServerTargeting() {
  return {
    '/19968336/header-bid-tag-0': convertTargetingsFromOldToNew({
      'foobar': '0x0,300x250,300x600',
      'hb_size': '300x250',
      'hb_pb': '10.00',
      'hb_adid': '233bcbee889d46d',
      'hb_bidder': 'appnexus',
      'hb_size_triplelift': '0x0',
      'hb_pb_triplelift': '10.00',
      'hb_adid_triplelift': '222bb26f9e8bd',
      'hb_bidder_triplelift': 'triplelift',
      'hb_size_appnexus': '300x250',
      'hb_pb_appnexus': '10.00',
      'hb_adid_appnexus': '233bcbee889d46d',
      'hb_bidder_appnexus': 'appnexus',
      'hb_size_pagescience': '300x250',
      'hb_pb_pagescience': '10.00',
      'hb_adid_pagescience': '25bedd4813632d7',
      'hb_bidder_pagescienc': 'pagescience',
      'hb_size_brightcom': '300x250',
      'hb_pb_brightcom': '10.00',
      'hb_adid_brightcom': '26e0795ab963896',
      'hb_bidder_brightcom': 'brightcom',
      'hb_size_brealtime': '300x250',
      'hb_pb_brealtime': '10.00',
      'hb_adid_brealtime': '275bd666f5a5a5d',
      'hb_bidder_brealtime': 'brealtime',
      'hb_size_pubmatic': '300x250',
      'hb_pb_pubmatic': '10.00',
      'hb_adid_pubmatic': '28f4039c636b6a7',
      'hb_bidder_pubmatic': 'pubmatic',
      'hb_size_rubicon': '300x600',
      'hb_pb_rubicon': '10.00',
      'hb_adid_rubicon': '29019e2ab586a5a',
      'hb_bidder_rubicon': 'rubicon'
    }),
    '/19968336/header-bid-tag1': convertTargetingsFromOldToNew({
      'foobar': '728x90',
      'hb_size': '728x90',
      'hb_pb': '10.00',
      'hb_adid': '24bd938435ec3fc',
      'hb_bidder': 'appnexus',
      'hb_size_appnexus': '728x90',
      'hb_pb_appnexus': '10.00',
      'hb_adid_appnexus': '24bd938435ec3fc',
      'hb_bidder_appnexus': 'appnexus'
    })
  };
}

// Key/values used to set ad server targeting.
export function getTargetingKeys() {
  return [
    [
      CONSTANTS.TARGETING_KEYS.BIDDER,
      'appnexus'
    ],
    [
      CONSTANTS.TARGETING_KEYS.AD_ID,
      '233bcbee889d46d'
    ],
    [
      CONSTANTS.TARGETING_KEYS.PRICE_BUCKET,
      '10.00'
    ],
    [
      CONSTANTS.TARGETING_KEYS.SIZE,
      '300x250'
    ],
    [
      'foobar',
      ['0x0', '300x250', '300x600']
    ]
  ];
}

// Key/values used to set ad server targeting when bid landscape
// targeting is on.
export function getTargetingKeysBidLandscape() {
  return [
    [
      CONSTANTS.TARGETING_KEYS.BIDDER,
      'appnexus'
    ],
    [
      CONSTANTS.TARGETING_KEYS.AD_ID + '_appnexus',
      '233bcbee889d46d'
    ],
    [
      CONSTANTS.TARGETING_KEYS.PRICE_BUCKET,
      '10.00'
    ],
    [
      CONSTANTS.TARGETING_KEYS.SIZE,
      '300x250'
    ],
    [
      'foobar',
      ['0x0', '300x250', '300x600']
    ],
    [
      CONSTANTS.TARGETING_KEYS.BIDDER + '_triplelift',
      'triplelift'
    ],
    [
      CONSTANTS.TARGETING_KEYS.AD_ID + '_triplelift',
      '222bb26f9e8bd'
    ],
    [
      CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_triplelift',
      '10.00'
    ],
    [
      CONSTANTS.TARGETING_KEYS.SIZE + '_triplelift',
      '0x0'
    ],
    [
      CONSTANTS.TARGETING_KEYS.BIDDER + '_appnexus',
      'appnexus'
    ],
    [
      CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_appnexus',
      '10.00'
    ],
    [
      CONSTANTS.TARGETING_KEYS.SIZE + '_appnexus',
      '300x250'
    ],
    [
      CONSTANTS.TARGETING_KEYS.BIDDER + '_pagescienc',
      'pagescience'
    ],
    [
      CONSTANTS.TARGETING_KEYS.AD_ID + '_pagescience',
      '25bedd4813632d7'
    ],
    [
      CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_pagescience',
      '10.00'
    ],
    [
      CONSTANTS.TARGETING_KEYS.SIZE + '_pagescience',
      '300x250'
    ],
    [
      CONSTANTS.TARGETING_KEYS.BIDDER + '_brightcom',
      'brightcom'
    ],
    [
      CONSTANTS.TARGETING_KEYS.AD_ID + '_brightcom',
      '26e0795ab963896'
    ],
    [
      CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_brightcom',
      '10.00'
    ],
    [
      CONSTANTS.TARGETING_KEYS.SIZE + '_brightcom',
      '300x250'
    ],
    [
      CONSTANTS.TARGETING_KEYS.BIDDER + '_brealtime',
      'brealtime'
    ],
    [
      CONSTANTS.TARGETING_KEYS.AD_ID + '_brealtime',
      '275bd666f5a5a5d'
    ],
    [
      CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_brealtime',
      '10.00'
    ],
    [
      CONSTANTS.TARGETING_KEYS.SIZE + '_brealtime',
      '300x250'
    ],
    [
      CONSTANTS.TARGETING_KEYS.BIDDER + '_pubmatic',
      'pubmatic'
    ],
    [
      CONSTANTS.TARGETING_KEYS.AD_ID + '_pubmatic',
      '28f4039c636b6a7'
    ],
    [
      CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_pubmatic',
      '10.00'
    ],
    [
      CONSTANTS.TARGETING_KEYS.SIZE + '_pubmatic',
      '300x250'
    ],
    [
      CONSTANTS.TARGETING_KEYS.BIDDER + '_rubicon',
      'rubicon'
    ],
    [
      CONSTANTS.TARGETING_KEYS.AD_ID + '_rubicon',
      '29019e2ab586a5a'
    ],
    [
      CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_rubicon',
      '10.00'
    ],
    [
      CONSTANTS.TARGETING_KEYS.SIZE + '_rubicon',
      '300x600'
    ]
  ];
}

export function getBidRequestedPayload() {
  return {
    'bidderCode': 'adequant',
    'auctionId': '150f361b202aa8',
    'bidderRequestId': '2b193b7a6ff421',
    'bids': [
      {
        'bidder': 'adequant',
        'params': {
          'publisher_id': '5000563',
          'bidfloor': 0.01
        },
        'adUnitCode': '/19968336/header-bid-tag-1',
        'sizes': [
          [
            300,
            250
          ],
          [
            300,
            600
          ],
          [
            300,
            250
          ],
          [
            100,
            100
          ]
        ],
        'bidId': '39032dc5c7e834',
        'bidderRequestId': '2b193b7a6ff421',
        'auctionId': '150f361b202aa8'
      }
    ],
    'start': 1465426155412
  };
}

export function getCurrencyRates() {
  return {
    'dataAsOf': '2017-04-25',
    'conversions': {
      'GBP': { 'CNY': 8.8282, 'JPY': 141.7, 'USD': 1.2824 },
      'USD': { 'CNY': 6.8842, 'GBP': 0.7798, 'JPY': 110.49 }
    }
  };
}

export function createBidReceived({bidder, cpm, auctionId, responseTimestamp, adUnitCode, adId, status, ttl, requestId}) {
  let bid = {
    'bidderCode': bidder,
    'width': '300',
    'height': '250',
    'statusMessage': 'Bid available',
    'adId': adId,
    'cpm': cpm,
    'ad': 'markup',
    'ad_id': adId,
    'sizeId': '15',
    'requestTimestamp': 1454535718610,
    'responseTimestamp': responseTimestamp,
    'auctionId': auctionId,
    'requestId': requestId,
    'timeToRespond': 123,
    'pbLg': '0.50',
    'pbMg': '0.50',
    'pbHg': '0.53',
    'adUnitCode': adUnitCode,
    'bidder': bidder,
    'size': '300x250',
    'adserverTargeting': convertTargetingsFromOldToNew({
      'hb_bidder': bidder,
      'hb_adid': adId,
      'hb_pb': cpm,
      'foobar': '300x250'
    }),
    'netRevenue': true,
    'currency': 'USD',
    'ttl': (!ttl) ? 300 : ttl
  };

  if (typeof status !== 'undefined') {
    bid.status = status;
  }
  return bid;
}
