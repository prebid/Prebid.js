import { expect } from 'chai';
import { ImproveDigitalAdServerJSClient, spec } from 'modules/improvedigitalBidAdapter';
import { config } from 'src/config';
import { userSync } from 'src/userSync';

describe('Improve Digital Adapter Tests', function () {
  let idClient = new ImproveDigitalAdServerJSClient('hb');

  const METHOD = 'GET';
  const URL = 'https://ice.360yield.com/hb';
  const PARAM_PREFIX = 'jsonp=';

  const simpleBidRequest = {
    bidder: 'improvedigital',
    params: {
      placementId: 1053688
    },
    adUnitCode: 'div-gpt-ad-1499748733608-0',
    transactionId: 'f183e871-fbed-45f0-a427-c8a63c4c01eb',
    bidId: '33e9500b21129f',
    bidderRequestId: '2772c1e566670b',
    auctionId: '192721e36a0239',
    sizes: [[300, 250], [160, 600], ['blah', 150], [-1, 300], [300, -5]]
  };

  const simpleSmartTagBidRequest = {
    bidder: 'improvedigital',
    bidId: '1a2b3c',
    placementCode: 'placement1',
    params: {
      publisherId: 1032,
      placementKey: 'data_team_test_hb_smoke_test'
    }
  };

  const bidderRequestGdpr = {
    gdprConsent: {
      consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
      vendorData: {},
      gdprApplies: true
    },
  };

  const bidderRequestReferrer = {
    refererInfo: {
      referer: 'https://blah.com/test.html',
    },
  };

  describe('isBidRequestValid', function () {
    it('should return false when no bid', function () {
      expect(spec.isBidRequestValid()).to.equal(false);
    });

    it('should return false when no bid.params', function () {
      let bid = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when both placementId and placementKey + publisherId are missing', function () {
      let bid = { 'params': {} };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when only one of placementKey and publisherId is present', function () {
      let bid = {
        params: {
          publisherId: 1234
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid = {
        params: {
          placementKey: 'xyz'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when placementId is passed', function () {
      let bid = { 'params': {} };
      expect(spec.isBidRequestValid(simpleBidRequest)).to.equal(true);
    });

    it('should return true when both placementKey and publisherId are passed', function () {
      let bid = { 'params': {} };
      expect(spec.isBidRequestValid(simpleSmartTagBidRequest)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('should make a well-formed request objects', function () {
      const requests = spec.buildRequests([simpleBidRequest]);
      expect(requests).to.be.an('array');
      expect(requests.length).to.equal(1);

      const request = requests[0];
      expect(request.method).to.equal(METHOD);
      expect(request.url).to.equal(URL);
      expect(request.data.substring(0, PARAM_PREFIX.length)).to.equal(PARAM_PREFIX);

      const params = JSON.parse(decodeURIComponent(request.data.substring(PARAM_PREFIX.length)));
      expect(params.bid_request).to.be.an('object');
      expect(params.bid_request.id).to.be.a('string');
      expect(params.bid_request.version).to.equal(`${spec.version}-${idClient.CONSTANTS.CLIENT_VERSION}`);
      expect(params.bid_request.imp).to.deep.equal([
        {
          id: '33e9500b21129f',
          pid: 1053688,
          tid: 'f183e871-fbed-45f0-a427-c8a63c4c01eb',
          banner: {}
        }
      ]);
    });

    it('should set placementKey and publisherId for smart tags', function () {
      const requests = spec.buildRequests([simpleSmartTagBidRequest]);
      const params = JSON.parse(decodeURIComponent(requests[0].data.substring(PARAM_PREFIX.length)));
      expect(params.bid_request.imp[0].pubid).to.equal(1032);
      expect(params.bid_request.imp[0].pkey).to.equal('data_team_test_hb_smoke_test');
    });

    it('should add keyValues', function () {
      let bidRequest = Object.assign({}, simpleBidRequest);
      const keyValues = {
        testKey: [
          'testValue'
        ]
      };
      bidRequest.params.keyValues = keyValues;
      const request = spec.buildRequests([bidRequest])[0];
      const params = JSON.parse(decodeURIComponent(request.data.substring(PARAM_PREFIX.length)));
      expect(params.bid_request.imp[0].kvw).to.deep.equal(keyValues);
    });

    it('should add single size filter', function () {
      let bidRequest = Object.assign({}, simpleBidRequest);
      const size = {
        w: 800,
        h: 600
      };
      bidRequest.params.size = size;
      const request = spec.buildRequests([bidRequest])[0];
      const params = JSON.parse(decodeURIComponent(request.data.substring(PARAM_PREFIX.length)));
      expect(params.bid_request.imp[0].banner).to.deep.equal(size);
      // When single size filter is set, format shouldn't be populated. This
      // is to maintain backward compatibily
      expect(params.bid_request.imp[0].banner.format).to.not.exist;
    });

    it('should add currency', function () {
      const bidRequest = Object.assign({}, simpleBidRequest);
      const getConfigStub = sinon.stub(config, 'getConfig').returns('JPY');
      const request = spec.buildRequests([bidRequest])[0];
      const params = JSON.parse(decodeURIComponent(request.data.substring(PARAM_PREFIX.length)));
      expect(params.bid_request.imp[0].currency).to.equal('JPY');
      getConfigStub.restore();
    });

    it('should add bid floor', function () {
      const bidRequest = Object.assign({}, simpleBidRequest);
      let request = spec.buildRequests([bidRequest])[0];
      let params = JSON.parse(decodeURIComponent(request.data.substring(PARAM_PREFIX.length)));
      // Floor price currency shouldn't be populated without a floor price
      expect(params.bid_request.imp[0].bidfloorcur).to.not.exist;

      // Default floor price currency
      bidRequest.params.bidFloor = 0.05;
      request = spec.buildRequests([bidRequest])[0];
      params = JSON.parse(decodeURIComponent(request.data.substring(PARAM_PREFIX.length)));
      expect(params.bid_request.imp[0].bidfloor).to.equal(0.05);
      expect(params.bid_request.imp[0].bidfloorcur).to.equal('USD');

      // Floor price currency
      bidRequest.params.bidFloorCur = 'eUR';
      request = spec.buildRequests([bidRequest])[0];
      params = JSON.parse(decodeURIComponent(request.data.substring(PARAM_PREFIX.length)));
      expect(params.bid_request.imp[0].bidfloor).to.equal(0.05);
      expect(params.bid_request.imp[0].bidfloorcur).to.equal('EUR');
    });

    it('should add GDPR consent string', function () {
      const bidRequest = Object.assign({}, simpleBidRequest);
      const request = spec.buildRequests([bidRequest], bidderRequestGdpr)[0];
      const params = JSON.parse(decodeURIComponent(request.data.substring(PARAM_PREFIX.length)));
      expect(params.bid_request.gdpr).to.equal('BOJ/P2HOJ/P2HABABMAAAAAZ+A==');
    });

    it('should add referrer', function () {
      const bidRequest = Object.assign({}, simpleBidRequest);
      const request = spec.buildRequests([bidRequest], bidderRequestReferrer)[0];
      const params = JSON.parse(decodeURIComponent(request.data.substring(PARAM_PREFIX.length)));
      expect(params.bid_request.referrer).to.equal('https://blah.com/test.html');
    });

    it('should return 2 requests', function () {
      const requests = spec.buildRequests([
        simpleBidRequest,
        simpleSmartTagBidRequest
      ]);
      expect(requests).to.be.an('array');
      expect(requests.length).to.equal(2);
    });

    it('should return one request in a single request mode', function () {
      const getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.singleRequest').returns(true);
      const requests = spec.buildRequests([
        simpleBidRequest,
        simpleSmartTagBidRequest
      ]);
      expect(requests).to.be.an('array');
      expect(requests.length).to.equal(1);
      getConfigStub.restore();
    });

    it('should set Prebid sizes in bid request', function () {
      const getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.usePrebidSizes').returns(true);
      const request = spec.buildRequests([simpleBidRequest])[0];
      const params = JSON.parse(decodeURIComponent(request.data.substring(PARAM_PREFIX.length)));
      expect(params.bid_request.imp[0].banner).to.deep.equal({
        format: [
          { w: 300, h: 250 },
          { w: 160, h: 600 }
        ]
      });
      getConfigStub.restore();
    });

    it('should not add single size filter when using Prebid sizes', function () {
      const getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('improvedigital.usePrebidSizes').returns(true);
      const bidRequest = Object.assign({}, simpleBidRequest);
      const size = {
        w: 800,
        h: 600
      };
      bidRequest.params.size = size;
      const request = spec.buildRequests([bidRequest])[0];
      const params = JSON.parse(decodeURIComponent(request.data.substring(PARAM_PREFIX.length)));
      expect(params.bid_request.imp[0].banner).to.deep.equal({
        format: [
          { w: 300, h: 250 },
          { w: 160, h: 600 }
        ]
      });
      getConfigStub.restore();
    });
  });

  const serverResponse = {
    'body': {
      'id': '687a06c541d8d1',
      'site_id': 191642,
      'bid': [
        {
          'isNet': false,
          'id': '33e9500b21129f',
          'advid': '5279',
          'price': 1.45888594164456,
          'nurl': 'http://ice.360yield.com/imp_pixel?ic=wVmhKI07hCVyGC1sNdFp.6buOSiGYOw8jPyZLlcMY2RCwD4ek3Fy6.xUI7U002skGBs3objMBoNU-Frpvmb9js3NKIG0YZJgWaNdcpXY9gOXE9hY4-wxybCjVSNzhOQB-zic73hzcnJnKeoGgcfvt8fMy18-yD0aVdYWt4zbqdoITOkKNCPBEgbPFu1rcje-o7a64yZ7H3dKvtnIixXQYc1Ep86xGSBGXY6xW2KfUOMT6vnkemxO72divMkMdhR8cAuqIubbx-ZID8-xf5c9k7p6DseeBW0I8ionrlTHx.rGosgxhiFaMqtr7HiA7PBzKvPdeEYN0hQ8RYo8JzYL82hA91A3V2m9Ij6y0DfIJnnrKN8YORffhxmJ6DzwEl1zjrVFbD01bqB3Vdww8w8PQJSkKQkd313tr-atU8LS26fnBmOngEkVHwAr2WCKxuUvxHmuVBTA-Lgz7wKwMoOJCA3hFxMavVb0ZFB7CK0BUTVU6z0De92Q.FJKNCHLMbjX3vcAQ90=',
          'h': 290,
          'pid': 1053688,
          'sync': [
            'http://link1',
            'http://link2'
          ],
          'crid': '422031',
          'w': 600,
          'cid': '99006',
          'adm': 'document.writeln(\"<a href=\\\"http:\\/\\/ice.360yield.com\\/click\\/wVmhKEKFeJufyP3hFfp7fv95ynoKe7vnG9V-j8EyAzklSoKRkownAclw4Zzcw-OcbJMg2KfjNiO8GoO9WP1jbNM8Q5GtmClbG9hZPBS4v6oBBiDi50AjRqHQsDAoBOJrIJtVyCfrnAIxvbysozCpLt20ov6jz2JPi6fe.D55HNeDLDyiLNgxVPa3y9jJZf65JBirCjOoZ-1Mj1BLB.57VdMaEhpGjjl5HnPgw0Pv7Hm1BO7PB9nCXJ9IwOH3IrKo.Wyy1iKDk6zeGwGOkQHSOMuQnCHyD35x6bhDQrpl5H6fTRTR8D2m5.-Zjh3fs8SKlo0i25EjKPw65iF.tvgcnq01U08OIh86EeSciamJgV0hNsk20TcTubfsoPN4are4nQ0y2gB-lz9tf3AjqHpSz5NoJWrpWtnrBHbjm.dS1XUQB1tzcLpIkA34nDe2eNxRZbZkZNSSs.Y8jQemfbjuLpttcemHqidFZo3xp37eSfUImw.HbyFdnK-wxFDYudgsIDxGJWI=\\/\\/http%3A%2F%2Fwww.improvedigital.com\\\" target=\\\"_blank\\\"><img style=\\\"border: 0;\\\" border=\\\"0\\\" width=\\\"600\\\" height=\\\"290\\\" src=\\\"http:\\/\\/creative.360yield.com\\/file\\/221728\\/ImproveDigital600x290.jpg\\\" alt=\\\"\\\"\\/><\\/a>\");document.writeln(\"<improvedigital_ad_output_information tp_id=\\\"\\\" buyer_id=\\\"0\\\" rtb_advertiser=\\\"\\\" campaign_id=\\\"99006\\\" line_item_id=\\\"268515\\\" creative_id=\\\"422031\\\" crid=\\\"0\\\" placement_id=\\\"1053688\\\"><\\/improvedigital_ad_output_information>\");'
        }
      ],
      'debug': ''
    }
  };

  const serverResponseTwoBids = {
    'body': {
      'id': '687a06c541d8d1',
      'site_id': 191642,
      'bid': [
        serverResponse.body.bid[0],
        {
          'isNet': true,
          'id': '1234',
          'advid': '5280',
          'price': 1.23,
          'nurl': 'http://link/imp_pixel?ic=wVmhKI07hCVyGC1sNdFp.6buOSiGYOw8jPyZLlcMY2RCwD4ek3Fy6.xUI7U002skGBs3objMBoNU-Frpvmb9js3NKIG0YZJgWaNdcpXY9gOXE9hY4-wxybCjVSNzhOQB-zic73hzcnJnKeoGgcfvt8fMy18-yD0aVdYWt4zbqdoITOkKNCPBEgbPFu1rcje-o7a64yZ7H3dKvtnIixXQYc1Ep86xGSBGXY6xW2KfUOMT6vnkemxO72divMkMdhR8cAuqIubbx-ZID8-xf5c9k7p6DseeBW0I8ionrlTHx.rGosgxhiFaMqtr7HiA7PBzKvPdeEYN0hQ8RYo8JzYL82hA91A3V2m9Ij6y0DfIJnnrKN8YORffhxmJ6DzwEl1zjrVFbD01bqB3Vdww8w8PQJSkKQkd313tr-atU8LS26fnBmOngEkVHwAr2WCKxuUvxHmuVBTA-Lgz7wKwMoOJCA3hFxMavVb0ZFB7CK0BUTVU6z0De92Q.FJKNCHLMbjX3vcAQ90=',
          'h': 400,
          'pid': 1053688,
          'sync': [
            'http://link3'
          ],
          'crid': '422033',
          'w': 700,
          'cid': '99006',
          'adm': 'document.writeln(\"<a href=\\\"http:\\/\\/ice.360yield.com\\/click\\/wVmhKEKFeJufyP3hFfp7fv95ynoKe7vnG9V-j8EyAzklSoKRkownAclw4Zzcw-OcbJMg2KfjNiO8GoO9WP1jbNM8Q5GtmClbG9hZPBS4v6oBBiDi50AjRqHQsDAoBOJrIJtVyCfrnAIxvbysozCpLt20ov6jz2JPi6fe.D55HNeDLDyiLNgxVPa3y9jJZf65JBirCjOoZ-1Mj1BLB.57VdMaEhpGjjl5HnPgw0Pv7Hm1BO7PB9nCXJ9IwOH3IrKo.Wyy1iKDk6zeGwGOkQHSOMuQnCHyD35x6bhDQrpl5H6fTRTR8D2m5.-Zjh3fs8SKlo0i25EjKPw65iF.tvgcnq01U08OIh86EeSciamJgV0hNsk20TcTubfsoPN4are4nQ0y2gB-lz9tf3AjqHpSz5NoJWrpWtnrBHbjm.dS1XUQB1tzcLpIkA34nDe2eNxRZbZkZNSSs.Y8jQemfbjuLpttcemHqidFZo3xp37eSfUImw.HbyFdnK-wxFDYudgsIDxGJWI=\\/\\/http%3A%2F%2Fwww.improvedigital.com\\\" target=\\\"_blank\\\"><img style=\\\"border: 0;\\\" border=\\\"0\\\" width=\\\"600\\\" height=\\\"290\\\" src=\\\"http:\\/\\/creative.360yield.com\\/file\\/221728\\/ImproveDigital600x290.jpg\\\" alt=\\\"\\\"\\/><\\/a>\");document.writeln(\"<improvedigital_ad_output_information tp_id=\\\"\\\" buyer_id=\\\"0\\\" rtb_advertiser=\\\"\\\" campaign_id=\\\"99006\\\" line_item_id=\\\"268515\\\" creative_id=\\\"422031\\\" crid=\\\"0\\\" placement_id=\\\"1053688\\\"><\\/improvedigital_ad_output_information>\");'
        }
      ],
      'debug': ''
    }
  };

  const serverResponseNative = {
    body: {
      id: '687a06c541d8d1',
      site_id: 191642,
      bid: [
        {
          isNet: false,
          id: '33e9500b21129f',
          advid: '5279',
          price: 1.45888594164456,
          nurl: 'http://ice.360yield.com/imp_pixel?ic=wVm',
          h: 290,
          pid: 1053688,
          sync: [
            'http://link1',
            'http://link2'
          ],
          crid: '422031',
          w: 600,
          cid: '99006',
          native: {
            assets: [
              {
                title: {
                  text: 'Native title'
                }
              },
              {
                data: {
                  type: 1,
                  value: 'Improve Digital'
                }
              },
              {
                data: {
                  type: 2,
                  value: 'Native body'
                }
              },
              {
                data: {
                  type: 3,
                  value: '4' // rating
                }
              },
              {
                data: {
                  type: 4,
                  value: '10105' // likes
                }
              },
              {
                data: {
                  type: 5,
                  value: '150000' // downloads
                }
              },
              {
                data: {
                  type: 6,
                  value: '3.99' // price
                }
              },
              {
                data: {
                  type: 7,
                  value: '4.49' // salePrice
                }
              },
              {
                data: {
                  type: 8,
                  value: '(123) 456-7890' // phone
                }
              },
              {
                data: {
                  type: 9,
                  value: '123 Main Street, Anywhere USA' // address
                }
              },
              {
                data: {
                  type: 10,
                  value: 'body2'
                }
              },
              {
                data: {
                  type: 11,
                  value: 'https://myurl.com' // displayUrl
                }
              },
              {
                data: {
                  type: 12,
                  value: 'Do it' // cta
                }
              },
              {
                img: {
                  type: 1,
                  url: 'Should get ignored',
                  h: 300,
                  w: 400
                }
              },
              {
                img: {
                  type: 2,
                  url: 'http://blah.com/icon.jpg',
                  h: 30,
                  w: 40
                }

              },
              {
                img: {
                  type: 3,
                  url: 'http://blah.com/image.jpg',
                  h: 200,
                  w: 800
                }
              }
            ],
            link: {
              url: 'http://advertiser.com',
              clicktrackers: [
                'http://click.tracker.com/click?impid=123'
              ]
            },
            imptrackers: [
              'http://imptrack1.com',
              'http://imptrack2.com'
            ],
            jstracker: '<script src=\"http://www.foobar.js\"></script>',
            privacy: 'https://www.myprivacyurl.com'
          }
        }
      ],
      debug: ''
    }
  };

  const nativeEventtrackers = [
    {
      event: 1,
      method: 1,
      url: 'http://www.mytracker.com/imptracker'
    },
    {
      event: 1,
      method: 2,
      url: 'http://www.mytracker.com/tracker.js'
    }
  ];

  describe('interpretResponse', function () {
    let expectedBid = [
      {
        'ad': '<img src=\"http://ice.360yield.com/imp_pixel?ic=wVmhKI07hCVyGC1sNdFp.6buOSiGYOw8jPyZLlcMY2RCwD4ek3Fy6.xUI7U002skGBs3objMBoNU-Frpvmb9js3NKIG0YZJgWaNdcpXY9gOXE9hY4-wxybCjVSNzhOQB-zic73hzcnJnKeoGgcfvt8fMy18-yD0aVdYWt4zbqdoITOkKNCPBEgbPFu1rcje-o7a64yZ7H3dKvtnIixXQYc1Ep86xGSBGXY6xW2KfUOMT6vnkemxO72divMkMdhR8cAuqIubbx-ZID8-xf5c9k7p6DseeBW0I8ionrlTHx.rGosgxhiFaMqtr7HiA7PBzKvPdeEYN0hQ8RYo8JzYL82hA91A3V2m9Ij6y0DfIJnnrKN8YORffhxmJ6DzwEl1zjrVFbD01bqB3Vdww8w8PQJSkKQkd313tr-atU8LS26fnBmOngEkVHwAr2WCKxuUvxHmuVBTA-Lgz7wKwMoOJCA3hFxMavVb0ZFB7CK0BUTVU6z0De92Q.FJKNCHLMbjX3vcAQ90=\" width=\"0\" height=\"0\" style=\"display:none\"><script>document.writeln(\"<a href=\\\"http:\\/\\/ice.360yield.com\\/click\\/wVmhKEKFeJufyP3hFfp7fv95ynoKe7vnG9V-j8EyAzklSoKRkownAclw4Zzcw-OcbJMg2KfjNiO8GoO9WP1jbNM8Q5GtmClbG9hZPBS4v6oBBiDi50AjRqHQsDAoBOJrIJtVyCfrnAIxvbysozCpLt20ov6jz2JPi6fe.D55HNeDLDyiLNgxVPa3y9jJZf65JBirCjOoZ-1Mj1BLB.57VdMaEhpGjjl5HnPgw0Pv7Hm1BO7PB9nCXJ9IwOH3IrKo.Wyy1iKDk6zeGwGOkQHSOMuQnCHyD35x6bhDQrpl5H6fTRTR8D2m5.-Zjh3fs8SKlo0i25EjKPw65iF.tvgcnq01U08OIh86EeSciamJgV0hNsk20TcTubfsoPN4are4nQ0y2gB-lz9tf3AjqHpSz5NoJWrpWtnrBHbjm.dS1XUQB1tzcLpIkA34nDe2eNxRZbZkZNSSs.Y8jQemfbjuLpttcemHqidFZo3xp37eSfUImw.HbyFdnK-wxFDYudgsIDxGJWI=\\/\\/http%3A%2F%2Fwww.improvedigital.com\\\" target=\\\"_blank\\\"><img style=\\\"border: 0;\\\" border=\\\"0\\\" width=\\\"600\\\" height=\\\"290\\\" src=\\\"http:\\/\\/creative.360yield.com\\/file\\/221728\\/ImproveDigital600x290.jpg\\\" alt=\\\"\\\"\\/><\\/a>\");document.writeln(\"<improvedigital_ad_output_information tp_id=\\\"\\\" buyer_id=\\\"0\\\" rtb_advertiser=\\\"\\\" campaign_id=\\\"99006\\\" line_item_id=\\\"268515\\\" creative_id=\\\"422031\\\" crid=\\\"0\\\" placement_id=\\\"1053688\\\"><\\/improvedigital_ad_output_information>\");</script>',
        'adId': '33e9500b21129f',
        'creativeId': '422031',
        'cpm': 1.45888594164456,
        'currency': 'USD',
        'height': 290,
        'mediaType': 'banner',
        'netRevenue': false,
        'requestId': '33e9500b21129f',
        'ttl': 300,
        'width': 600
      }
    ];

    let expectedTwoBids = [
      expectedBid[0],
      {
        'ad': '<img src=\"http://link/imp_pixel?ic=wVmhKI07hCVyGC1sNdFp.6buOSiGYOw8jPyZLlcMY2RCwD4ek3Fy6.xUI7U002skGBs3objMBoNU-Frpvmb9js3NKIG0YZJgWaNdcpXY9gOXE9hY4-wxybCjVSNzhOQB-zic73hzcnJnKeoGgcfvt8fMy18-yD0aVdYWt4zbqdoITOkKNCPBEgbPFu1rcje-o7a64yZ7H3dKvtnIixXQYc1Ep86xGSBGXY6xW2KfUOMT6vnkemxO72divMkMdhR8cAuqIubbx-ZID8-xf5c9k7p6DseeBW0I8ionrlTHx.rGosgxhiFaMqtr7HiA7PBzKvPdeEYN0hQ8RYo8JzYL82hA91A3V2m9Ij6y0DfIJnnrKN8YORffhxmJ6DzwEl1zjrVFbD01bqB3Vdww8w8PQJSkKQkd313tr-atU8LS26fnBmOngEkVHwAr2WCKxuUvxHmuVBTA-Lgz7wKwMoOJCA3hFxMavVb0ZFB7CK0BUTVU6z0De92Q.FJKNCHLMbjX3vcAQ90=\" width=\"0\" height=\"0\" style=\"display:none\"><script>document.writeln(\"<a href=\\\"http:\\/\\/ice.360yield.com\\/click\\/wVmhKEKFeJufyP3hFfp7fv95ynoKe7vnG9V-j8EyAzklSoKRkownAclw4Zzcw-OcbJMg2KfjNiO8GoO9WP1jbNM8Q5GtmClbG9hZPBS4v6oBBiDi50AjRqHQsDAoBOJrIJtVyCfrnAIxvbysozCpLt20ov6jz2JPi6fe.D55HNeDLDyiLNgxVPa3y9jJZf65JBirCjOoZ-1Mj1BLB.57VdMaEhpGjjl5HnPgw0Pv7Hm1BO7PB9nCXJ9IwOH3IrKo.Wyy1iKDk6zeGwGOkQHSOMuQnCHyD35x6bhDQrpl5H6fTRTR8D2m5.-Zjh3fs8SKlo0i25EjKPw65iF.tvgcnq01U08OIh86EeSciamJgV0hNsk20TcTubfsoPN4are4nQ0y2gB-lz9tf3AjqHpSz5NoJWrpWtnrBHbjm.dS1XUQB1tzcLpIkA34nDe2eNxRZbZkZNSSs.Y8jQemfbjuLpttcemHqidFZo3xp37eSfUImw.HbyFdnK-wxFDYudgsIDxGJWI=\\/\\/http%3A%2F%2Fwww.improvedigital.com\\\" target=\\\"_blank\\\"><img style=\\\"border: 0;\\\" border=\\\"0\\\" width=\\\"600\\\" height=\\\"290\\\" src=\\\"http:\\/\\/creative.360yield.com\\/file\\/221728\\/ImproveDigital600x290.jpg\\\" alt=\\\"\\\"\\/><\\/a>\");document.writeln(\"<improvedigital_ad_output_information tp_id=\\\"\\\" buyer_id=\\\"0\\\" rtb_advertiser=\\\"\\\" campaign_id=\\\"99006\\\" line_item_id=\\\"268515\\\" creative_id=\\\"422031\\\" crid=\\\"0\\\" placement_id=\\\"1053688\\\"><\\/improvedigital_ad_output_information>\");</script>',
        'adId': '1234',
        'creativeId': '422033',
        'cpm': 1.23,
        'currency': 'USD',
        'height': 400,
        'mediaType': 'banner',
        'netRevenue': true,
        'requestId': '1234',
        'ttl': 300,
        'width': 700
      }
    ];

    let expectedBidNative = [
      {
        mediaType: 'native',
        adId: '33e9500b21129f',
        creativeId: '422031',
        cpm: 1.45888594164456,
        currency: 'USD',
        height: 290,
        netRevenue: false,
        requestId: '33e9500b21129f',
        ttl: 300,
        width: 600,
        native: {
          title: 'Native title',
          body: 'Native body',
          body2: 'body2',
          cta: 'Do it',
          sponsoredBy: 'Improve Digital',
          rating: '4',
          likes: '10105',
          downloads: '150000',
          price: '3.99',
          salePrice: '4.49',
          phone: '(123) 456-7890',
          address: '123 Main Street, Anywhere USA',
          displayUrl: 'https://myurl.com',
          icon: {
            url: 'http://blah.com/icon.jpg',
            height: 30,
            width: 40
          },
          image: {
            url: 'http://blah.com/image.jpg',
            height: 200,
            width: 800
          },
          clickUrl: 'http://advertiser.com',
          clickTrackers: ['http://click.tracker.com/click?impid=123'],
          impressionTrackers: [
            'http://ice.360yield.com/imp_pixel?ic=wVm',
            'http://imptrack1.com',
            'http://imptrack2.com'
          ],
          javascriptTrackers: '<script src=\"http://www.foobar.js\"></script>',
          privacyLink: 'https://www.myprivacyurl.com'
        }
      }
    ];

    it('should return a well-formed bid', function () {
      const bids = spec.interpretResponse(serverResponse);
      expect(bids).to.deep.equal(expectedBid);
    });

    it('should return two bids', function () {
      const bids = spec.interpretResponse(serverResponseTwoBids);
      expect(bids).to.deep.equal(expectedTwoBids);
    });

    it('should set dealId correctly', function () {
      let response = JSON.parse(JSON.stringify(serverResponse));
      let bids;

      delete response.body.bid[0].lid;
      response.body.bid[0].buying_type = 'deal_id';
      bids = spec.interpretResponse(response);
      expect(bids[0].dealId).to.not.exist;

      response.body.bid[0].lid = 268515;
      delete response.body.bid[0].buying_type;
      bids = spec.interpretResponse(response);
      expect(bids[0].dealId).to.not.exist;

      response.body.bid[0].lid = 268515;
      response.body.bid[0].buying_type = 'classic';
      bids = spec.interpretResponse(response);
      expect(bids[0].dealId).to.not.exist;

      response.body.bid[0].lid = 268515;
      response.body.bid[0].buying_type = 'deal_id';
      bids = spec.interpretResponse(response);
      expect(bids[0].dealId).to.equal(268515);

      response.body.bid[0].lid = [ 268515, 12456, 34567 ];
      response.body.bid[0].buying_type = 'deal_id';
      bids = spec.interpretResponse(response);
      expect(bids[0].dealId).to.not.exist;

      response.body.bid[0].lid = [ 268515, 12456, 34567 ];
      response.body.bid[0].buying_type = [ 'deal_id', 'classic' ];
      bids = spec.interpretResponse(response);
      expect(bids[0].dealId).to.not.exist;

      response.body.bid[0].lid = [ 268515, 12456, 34567 ];
      response.body.bid[0].buying_type = [ 'classic', 'deal_id', 'deal_id' ];
      bids = spec.interpretResponse(response);
      expect(bids[0].dealId).to.equal(12456);
    });

    it('should set currency', function () {
      let response = JSON.parse(JSON.stringify(serverResponse));
      response.body.bid[0].currency = 'eur';
      const bids = spec.interpretResponse(response);
      expect(bids[0].currency).to.equal('EUR');
    });

    it('should return empty array for bad response or no price', function () {
      let response = JSON.parse(JSON.stringify(serverResponse));
      let bids;

      // Price missing or 0
      response.body.bid[0].price = 0;
      bids = spec.interpretResponse(response);
      expect(bids).to.deep.equal([]);
      delete response.body.bid[0].price;
      bids = spec.interpretResponse(response);
      expect(bids).to.deep.equal([]);
      response.body.bid[0].price = null;
      bids = spec.interpretResponse(response);
      expect(bids).to.deep.equal([]);

      // errorCode present
      response = JSON.parse(JSON.stringify(serverResponse));
      response.body.bid[0].errorCode = undefined;
      bids = spec.interpretResponse(response);
      expect(bids).to.deep.equal([]);

      // adm and native missing
      response = JSON.parse(JSON.stringify(serverResponse));
      delete response.body.bid[0].adm;
      bids = spec.interpretResponse(response);
      expect(bids).to.deep.equal([]);
      response.body.bid[0].adm = null;
      bids = spec.interpretResponse(response);
      expect(bids).to.deep.equal([]);
    });

    it('should set netRevenue', function () {
      let response = JSON.parse(JSON.stringify(serverResponse));
      response.body.bid[0].isNet = true;
      const bids = spec.interpretResponse(response);
      expect(bids[0].netRevenue).to.equal(true);
    });

    // Native ads
    it('should return a well-formed native ad bid', function () {
      let bids = spec.interpretResponse(serverResponseNative);
      expect(bids[0].ortbNative).to.deep.equal(serverResponseNative.body.bid[0].native);
      delete bids[0].ortbNative;
      expect(bids).to.deep.equal(expectedBidNative);

      // eventtrackers
      const response = JSON.parse(JSON.stringify(serverResponseNative));
      const expectedBids = JSON.parse(JSON.stringify(expectedBidNative));
      response.body.bid[0].native.eventtrackers = nativeEventtrackers;
      expectedBids[0].native.impressionTrackers = [
        'http://ice.360yield.com/imp_pixel?ic=wVm',
        'http://www.mytracker.com/imptracker'
      ];
      expectedBids[0].native.javascriptTrackers = '<script src=\"http://www.mytracker.com/tracker.js\"></script>';
      bids = spec.interpretResponse(response);
      delete bids[0].ortbNative;
      expect(bids).to.deep.equal(expectedBids);
    });
  });

  describe('getUserSyncs', function () {
    const serverResponses = [ serverResponseTwoBids ];

    it('should return no syncs when pixel syncing is disabled', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: false }, serverResponses);
      expect(syncs).to.deep.equal([]);
    });

    it('should return user syncs', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, serverResponses);
      const expected = [
        { type: 'image', url: 'http://link1' },
        { type: 'image', url: 'http://link2' },
        { type: 'image', url: 'http://link3' }
      ];
      expect(syncs).to.deep.equal(expected);
    });
  });
});
