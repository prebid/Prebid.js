import {expect} from 'chai';
import {spec} from 'modules/nexx360BidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import { requestBidsHook } from 'modules/consentManagement.js';

describe('Nexx360 bid adapter tests', function () {
  const DISPLAY_BID_REQUEST = [{
    'bidder': 'nexx360',
    'params': {
      'account': '1067',
      'tagId': 'luvxjvgn'
    },
    'userId': {
      'id5id': {
        'uid': 'ID5*hQ5WobYI9Od4u52qpaXVKHhxUa4DsOWRAlvaFajm8gINfI1oVAe3UK59416dT4TqDX1pj4MBJ5TYwir6x3JgBw1-avYHSnmvQDdRMbxmC2sNf3ggIRTbyQBdI1RjvHyeDYCsistnTXF_iKF1nutYeQ2BZ4P5d5muZTG7C2PXVFgNg-18io9dCiSjzJXx93KPDYRiuIwtsGGsp51rojlpFw2Fp_dUkjXl4CAblk58DvwNhobwQ27bnBP8F2-Pcs88DYcvKn4r6dm3Vi7ILttxDQ2IgZ2X44ClgjoWh-vRf6ANis8Z7uL16vO8q0P5C21eDYuc4v_KaZqN-p9YWEeEZQ2OpkbRL7n5NieVJExHM6ANkAlLZhVf2T-1906TAIHKDZFm_xMCa1jJfpBqZB2agw2TjfbK6wMtJeHiZaipSuUNlM_CSH0HVXtfMj9yfzjzDZZnltZQ9lvc4JhXye5AwA2X1f9Dhk8VURTvVdfEUlU',
        'ext': {
          'linkType': 2
        }
      }
    },
    'userIdAsEids': [
      {
        'source': 'id5-sync.com',
        'uids': [
          {
            'id': 'ID5*hQ5WobYI9Od4u52qpaXVKHhxUa4DsOWRAlvaFajm8gINfI1oVAe3UK59416dT4TqDX1pj4MBJ5TYwir6x3JgBw1-avYHSnmvQDdRMbxmC2sNf3ggIRTbyQBdI1RjvHyeDYCsistnTXF_iKF1nutYeQ2BZ4P5d5muZTG7C2PXVFgNg-18io9dCiSjzJXx93KPDYRiuIwtsGGsp51rojlpFw2Fp_dUkjXl4CAblk58DvwNhobwQ27bnBP8F2-Pcs88DYcvKn4r6dm3Vi7ILttxDQ2IgZ2X44ClgjoWh-vRf6ANis8Z7uL16vO8q0P5C21eDYuc4v_KaZqN-p9YWEeEZQ2OpkbRL7n5NieVJExHM6ANkAlLZhVf2T-1906TAIHKDZFm_xMCa1jJfpBqZB2agw2TjfbK6wMtJeHiZaipSuUNlM_CSH0HVXtfMj9yfzjzDZZnltZQ9lvc4JhXye5AwA2X1f9Dhk8VURTvVdfEUlU',
            'atype': 1,
            'ext': {
              'linkType': 2
            }
          }
        ]
      }
    ],
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 250], [300, 600]]
      }
    },
    'adUnitCode': 'banner-div',
    'transactionId': '9ad89d90-eb73-41b9-bf5f-7a8e2eecff27',
    'sizes': [[300, 250], [300, 600]],
    'bidId': '4d9e29504f8af6',
    'bidderRequestId': '3423b6bd1a922c',
    'auctionId': '05e0a3a1-9f57-41f6-bbcb-2ba9c9e3d2d5',
    'src': 'client',
    'bidRequestsCount': 1,
    'bidderRequestsCount': 1,
    'bidderWinsCount': 0
  }];

  const DISPLAY_BID_RESPONSE = {'body': {
    'responses': [
      {
        'bidId': '4d9e29504f8af6',
        'cpm': 0.437245,
        'width': 300,
        'height': 250,
        'creativeId': '98493581',
        'currency': 'EUR',
        'netRevenue': true,
        'type': 'banner',
        'ttl': 360,
        'uuid': 'ce6d1ee3-2a05-4d7c-b97a-9e62097798ec',
        'bidder': 'appnexus',
        'consent': 1,
        'tagId': 'luvxjvgn'
      }
    ],
  }};

  const VIDEO_BID_REQUEST = [
    {
      'bidder': 'nexx360',
      'params': {
        'account': '1067',
        'tagId': 'yqsc1tfj'
      },
      'mediaTypes': {
        'video': {
          'context': 'instream',
          'playerSize': [[640, 480]],
          'mimes': ['video/mp4'],
          'protocols': [1, 2, 3, 4, 5, 6],
          'playbackmethod': [2],
          'skip': 1
        }
      },
      'adUnitCode': 'video1',
      'transactionId': '5434c81c-7210-44ae-9014-67c75dee48d0',
      'sizes': [[640, 480]],
      'bidId': '22f90541e576a3',
      'bidderRequestId': '1d4549243f3bfd',
      'auctionId': 'ed21b528-bcab-47e2-8605-ec9b71000c89',
      'src': 'client',
      'bidRequestsCount': 1,
      'bidderRequestsCount': 1,
      'bidderWinsCount': 0
    }
  ]

  const VIDEO_BID_RESPONSE = {'body': {
    'responses': [
      {
        'bidId': '2c129e8e01859a',
        'type': 'video',
        'uuid': 'b8e7b2f0-c378-479f-aa4f-4f55d5d7d1d5',
        'cpm': 4.5421,
        'width': 1,
        'height': 1,
        'creativeId': '97517771',
        'currency': 'EUR',
        'netRevenue': true,
        'ttl': 360,
        'bidder': 'appnexus',
        'consent': 1,
        'tagId': 'yqsc1tfj'
      }
    ]
  }};

  const DEFAULT_OPTIONS = {
    gdprConsent: {
      gdprApplies: true,
      consentString: 'BOzZdA0OzZdA0AGABBENDJ-AAAAvh7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__79__3z3_9pxP78k89r7337Mw_v-_v-b7JCPN_Y3v-8Kg',
      vendorData: {}
    },
    refererInfo: {
      referer: 'https://www.prebid.org',
      canonicalUrl: 'https://www.prebid.org/the/link/to/the/page'
    },
    uspConsent: '111222333',
    userId: { 'id5id': { uid: '1111' } },
    schain: {
      'ver': '1.0',
      'complete': 1,
      'nodes': [{
        'asi': 'exchange1.com',
        'sid': '1234',
        'hp': 1,
        'rid': 'bid-request-1',
        'name': 'publisher',
        'domain': 'publisher.com'
      }]
    },
  };

  it('We verify isBidRequestValid with uncorrect bidfloorCurrency', function() {
    const bid = { params: {
      'account': '1067',
      'tagId': 'luvxjvgn',
      'bidfloorCurrency': 'AAA',
    }};
    expect(spec.isBidRequestValid(bid)).to.be.equal(false);
  });

  it('We verify isBidRequestValid with uncorrect bidfloor', function() {
    const bid = { params: {
      'account': '1067',
      'tagId': 'luvxjvgn',
      'bidfloorCurrency': 'EUR',
      'bidfloor': 'EUR',
    }};
    expect(spec.isBidRequestValid(bid)).to.be.equal(false);
  });

  it('We verify isBidRequestValid with uncorrect keywords', function() {
    const bid = { params: {
      'account': '1067',
      'tagId': 'luvxjvgn',
      'bidfloorCurrency': 'EUR',
      'bidfloor': 0.8,
      'keywords': 'test',
    }};
    expect(spec.isBidRequestValid(bid)).to.be.equal(false);
  });

  it('Verify banner build request', function () {
    const request = spec.buildRequests(DISPLAY_BID_REQUEST, DEFAULT_OPTIONS);
    expect(request).to.have.property('url').and.to.equal('https://fast.nexx360.io/prebid');
    expect(request).to.have.property('method').and.to.equal('POST');
    const requestContent = JSON.parse(request.data);
    expect(requestContent.userEids.length).to.be.eql(1);
    expect(requestContent.userEids[0]).to.have.property('source').and.to.equal('id5-sync.com');
    expect(requestContent.userEids[0]).to.have.property('uids');
    expect(requestContent.userEids[0].uids[0]).to.have.property('id').and.to.equal('ID5*hQ5WobYI9Od4u52qpaXVKHhxUa4DsOWRAlvaFajm8gINfI1oVAe3UK59416dT4TqDX1pj4MBJ5TYwir6x3JgBw1-avYHSnmvQDdRMbxmC2sNf3ggIRTbyQBdI1RjvHyeDYCsistnTXF_iKF1nutYeQ2BZ4P5d5muZTG7C2PXVFgNg-18io9dCiSjzJXx93KPDYRiuIwtsGGsp51rojlpFw2Fp_dUkjXl4CAblk58DvwNhobwQ27bnBP8F2-Pcs88DYcvKn4r6dm3Vi7ILttxDQ2IgZ2X44ClgjoWh-vRf6ANis8Z7uL16vO8q0P5C21eDYuc4v_KaZqN-p9YWEeEZQ2OpkbRL7n5NieVJExHM6ANkAlLZhVf2T-1906TAIHKDZFm_xMCa1jJfpBqZB2agw2TjfbK6wMtJeHiZaipSuUNlM_CSH0HVXtfMj9yfzjzDZZnltZQ9lvc4JhXye5AwA2X1f9Dhk8VURTvVdfEUlU');
    expect(requestContent.adUnits[0]).to.have.property('account').and.to.equal('1067');
    expect(requestContent.adUnits[0]).to.have.property('tagId').and.to.equal('luvxjvgn');
    expect(requestContent.adUnits[0]).to.have.property('label').and.to.equal('banner-div');
    expect(requestContent.adUnits[0]).to.have.property('bidId').and.to.equal('4d9e29504f8af6');
    expect(requestContent.adUnits[0]).to.have.property('auctionId').and.to.equal('05e0a3a1-9f57-41f6-bbcb-2ba9c9e3d2d5');
    expect(requestContent.adUnits[0]).to.have.property('mediatypes').exist;
    expect(requestContent.adUnits[0].mediatypes).to.have.property('banner').exist;
    expect(requestContent.adUnits[0]).to.have.property('bidfloor').and.to.equal(0);
    expect(requestContent.adUnits[0]).to.have.property('bidfloorCurrency').and.to.equal('USD');
    expect(requestContent.adUnits[0]).to.have.property('keywords');
    expect(requestContent.adUnits[0].keywords.length).to.be.eql(0);
  });

  it('We add bidfloor and keywords', function() {
    const DISPLAY_BID_REQUEST_2 = [ ...DISPLAY_BID_REQUEST ];
    DISPLAY_BID_REQUEST_2[0].params.keywords = { interest: 'cars' };
    DISPLAY_BID_REQUEST_2[0].params.bidfloor = 2.1;
    const request = spec.buildRequests(DISPLAY_BID_REQUEST, DEFAULT_OPTIONS);
    const requestContent = JSON.parse(request.data);
    expect(requestContent.adUnits[0]).to.have.property('bidfloor').and.to.equal(2.1);
    expect(requestContent.adUnits[0]).to.have.property('bidfloorCurrency').and.to.equal('USD');
    expect(requestContent.adUnits[0]).to.have.property('keywords');
    expect(requestContent.adUnits[0].keywords.length).to.be.eql(1);
    expect(requestContent.adUnits[0].keywords[0].key).to.be.eql('interest');
    expect(requestContent.adUnits[0].keywords[0].value[0]).to.be.eql('cars');
  });

  it('Verify banner parse response', function () {
    const request = spec.buildRequests(DISPLAY_BID_REQUEST, DEFAULT_OPTIONS);
    const response = spec.interpretResponse(DISPLAY_BID_RESPONSE, request);
    expect(response).to.have.lengthOf(1);
    const bid = response[0];
    expect(bid.cpm).to.equal(0.437245);
    expect(bid.adUrl).to.equal('https://fast.nexx360.io/cache?uuid=ce6d1ee3-2a05-4d7c-b97a-9e62097798ec');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.creativeId).to.equal('98493581');
    expect(bid.currency).to.equal('EUR');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.ttl).to.equal(360);
    expect(bid.requestId).to.equal('4d9e29504f8af6');
    expect(bid.nexx360).to.exist;
    expect(bid.nexx360.ssp).to.equal('appnexus');
  });

  it('Verify video build request', function () {
    const request = spec.buildRequests(VIDEO_BID_REQUEST, DEFAULT_OPTIONS);
    expect(request).to.have.property('url').and.to.equal('https://fast.nexx360.io/prebid');
    expect(request).to.have.property('method').and.to.equal('POST');
    const requestContent = JSON.parse(request.data);
    expect(requestContent.adUnits[0]).to.have.property('account').and.to.equal('1067');
    expect(requestContent.adUnits[0]).to.have.property('tagId').and.to.equal('yqsc1tfj');
    expect(requestContent.adUnits[0]).to.have.property('label').and.to.equal('video1');
    expect(requestContent.adUnits[0]).to.have.property('bidId').and.to.equal('22f90541e576a3');
    expect(requestContent.adUnits[0]).to.have.property('auctionId').and.to.equal('ed21b528-bcab-47e2-8605-ec9b71000c89');
    expect(requestContent.adUnits[0]).to.have.property('mediatypes').exist;
    expect(requestContent.adUnits[0].mediatypes).to.have.property('video').exist;
  });

  it('Verify video parse response', function () {
    const request = spec.buildRequests(VIDEO_BID_REQUEST, DEFAULT_OPTIONS);
    const response = spec.interpretResponse(VIDEO_BID_RESPONSE, request);
    expect(response).to.have.lengthOf(1);
    const bid = response[0];
    expect(bid.cpm).to.equal(4.5421);
    expect(bid.vastUrl).to.equal('https://fast.nexx360.io/cache?uuid=b8e7b2f0-c378-479f-aa4f-4f55d5d7d1d5');
    expect(bid.vastImpUrl).to.equal('https://fast.nexx360.io/track-imp?type=prebid&mediatype=video&ssp=appnexus&tag_id=yqsc1tfj&consent=1&price=4.5421');
    expect(bid.width).to.equal(1);
    expect(bid.height).to.equal(1);
    expect(bid.creativeId).to.equal('97517771');
    expect(bid.currency).to.equal('EUR');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.ttl).to.equal(360);
    expect(bid.requestId).to.equal('2c129e8e01859a');
    expect(bid.nexx360).to.exist;
    expect(bid.nexx360.ssp).to.equal('appnexus');
  });

  it('Verifies bidder code', function () {
    expect(spec.code).to.equal('nexx360');
  });

  it('Verifies bidder aliases', function () {
    expect(spec.aliases).to.have.lengthOf(1);
    expect(spec.aliases[0]).to.equal('revenuemaker');
  });
  it('Verifies if bid request valid', function () {
    expect(spec.isBidRequestValid(DISPLAY_BID_REQUEST[0])).to.equal(true);
  });
  it('Verifies bid won', function () {
    const request = spec.buildRequests(DISPLAY_BID_REQUEST, DEFAULT_OPTIONS);
    const response = spec.interpretResponse(DISPLAY_BID_RESPONSE, request);
    const won = spec.onBidWon(response[0]);
    expect(won).to.equal(true);
  });
  it('Verifies user sync without cookie in bid response', function () {
    var syncs = spec.getUserSyncs({}, [DISPLAY_BID_RESPONSE], DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
    expect(syncs).to.have.lengthOf(0);
  });
  it('Verifies user sync with cookies in bid response', function () {
    DISPLAY_BID_RESPONSE.body.cookies = [{'type': 'image', 'url': 'http://www.cookie.sync.org/'}];
    var syncs = spec.getUserSyncs({}, [DISPLAY_BID_RESPONSE], DEFAULT_OPTIONS.gdprConsent);
    expect(syncs).to.have.lengthOf(1);
    expect(syncs[0]).to.have.property('type').and.to.equal('image');
    expect(syncs[0]).to.have.property('url').and.to.equal('http://www.cookie.sync.org/');
  });
  it('Verifies user sync with no bid response', function() {
    var syncs = spec.getUserSyncs({}, null, DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
    expect(syncs).to.have.lengthOf(0);
  });
  it('Verifies user sync with no bid body response', function() {
    var syncs = spec.getUserSyncs({}, [], DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
    expect(syncs).to.have.lengthOf(0);
    var syncs = spec.getUserSyncs({}, [{}], DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
    expect(syncs).to.have.lengthOf(0);
  });
});
