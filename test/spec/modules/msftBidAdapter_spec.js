import {
  expect
} from 'chai';
import {
  spec
} from 'modules/msftBidAdapter.js';
import {
  BANNER,
  VIDEO,
  NATIVE
} from '../../../src/mediaTypes.js';
import {
  deepClone
} from '../../../src/utils.js';

const ENDPOINT_URL_NORMAL = 'https://ib.adnxs.com/openrtb2/prebidjs';

describe('msftBidAdapter', function () {
  const baseBidRequests = {
    bidder: 'msft',
    adUnitCode: 'adunit-code',
    bidId: '2c5f3044f546f1',
    params: {
      placement_id: 12345
    }
  };

  const baseBidderRequest = {
    auctionId: 'test-auction-id',
    ortb2: {
      site: {
        page: 'http://www.example.com/page.html',
        domain: 'example.com'
      },
      user: {
        ext: {
          eids: [{
            source: 'adserver.org',
            uids: [{
              id: '12345',
              atype: 1
            }]
          }, {
            source: 'uidapi.com',
            uids: [{
              id: '12345',
              atype: 1
            }]
          }]
        }
      }
    },
    refererInfo: {
      "reachedTop": true,
      "isAmp": false,
      "numIframes": 0,
      "stack": ['http://test.localhost:9999/integrationExamples/gpt/hello_world_2.html?pbjs_debug=true'],
      "topmostLocation": "http://test.localhost:9999/integrationExamples/gpt/hello_world_2.html?pbjs_debug=true",
      "location": "http://test.localhost:9999/integrationExamples/gpt/hello_world_2.html?pbjs_debug=true",
      "canonicalUrl": 'http://www.example.com/page.html',
      "page": "http://test.localhost:9999/integrationExamples/gpt/hello_world_2.html?pbjs_debug=true",
      "domain": "test.localhost:9999",
      "ref": "http://test.localhost:9999/integrationExamples/gpt/hello_world_2.html?pbjs_debug=true",
      "legacy": {
        "reachedTop": true,
        "isAmp": false,
        "numIframes": 0,
        "stack": [],
        "referer": "http://test.localhost:9999/integrationExamples/gpt/hello_world_2.html?pbjs_debug=true",
        "canonicalUrl": null
      }
    },
    bids: baseBidRequests,
    gdprConsent: {
      gdprApplies: true,
      consentString: 'test-consent-string',
      vendorData: {
        purpose: {
          consents: {
            1: true
          }
        }
      }
    }
  };

  describe('isBidRequestValid', function () {
    it('should return true when required params are present (placement_id)', function () {
      const bid = {
        bidder: 'msft',
        params: {
          placement_id: 12345
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params are present (member and inv_code)', function () {
      const bid = {
        bidder: 'msft',
        params: {
          member: 123,
          inv_code: 'abc'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not present', function () {
      const bid = {
        bidder: 'msft',
        params: {
          member: 123
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params are not the correct type', function () {
      const bid = {
        bidder: 'msft',
        params: {
          placement_id: '12345'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false, 'placement_id is string, should be number');

      bid.params = {
        member: '123',
        inv_code: 'abc'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false, 'member is string, should be number');

      bid.params = {
        member: 123,
        inv_code: 123
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false, 'inv_code is number, should be string');
    });

    it('should build a basic banner request', function () {
      let testBidRequest = deepClone(baseBidRequests);
      testBidRequest.params = Object.assign({}, testBidRequest.params, {
        banner_frameworks: [1, 2, 6],
        allow_smaller_sizes: false,
        use_pmt_rule: true,
        keywords: 'sports,music=rock',
        traffic_source_code: 'some_traffic_source',
        pubclick: 'http://publisher.click.url',
        ext_inv_code: 'inv_code_123',
        ext_imp_id: 'ext_imp_id_456'
      });
      const bidRequests = [{
        ...testBidRequest,
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600]
            ]
          }
        },
      }];

      const testBidderRequest = deepClone(baseBidderRequest);
      const bidderRequest = Object.assign({}, testBidderRequest, {
        bids: bidRequests
      });

      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.satisfy(url => url.startsWith(ENDPOINT_URL_NORMAL));
      const data = request.data;
      expect(data).to.exist;
      expect(data.imp).to.have.lengthOf(1);
      expect(data.imp[0].banner.format).to.deep.equal([{
        w: 300,
        h: 250
      }, {
        w: 300,
        h: 600
      }]);
      expect(data.imp[0].banner.api).to.deep.equal([1, 2, 6]);
      expect(data.imp[0].ext.appnexus.placement_id).to.equal(12345);
      expect(data.imp[0].ext.appnexus.allow_smaller_sizes).to.equal(false);
      expect(data.imp[0].ext.appnexus.use_pmt_rule).to.equal(true);
      expect(data.imp[0].ext.appnexus.keywords).to.equal('sports,music=rock');
      expect(data.imp[0].ext.appnexus.traffic_source_code).to.equal('some_traffic_source');
      expect(data.imp[0].ext.appnexus.pubclick).to.equal('http://publisher.click.url');
      expect(data.imp[0].ext.appnexus.ext_inv_code).to.equal('inv_code_123');
      expect(data.imp[0].id).to.equal('ext_imp_id_456');
    });

    if (FEATURES.VIDEO) {
      it('should build a video request', function () {
        const testBidRequests = deepClone(baseBidRequests);
        const testBidderRequest = deepClone(baseBidderRequest);

        const bidRequests = [{
          ...testBidRequests,
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [
                [640, 480]
              ],
              plcmt: 4,
              mimes: ['video/mp4'],
              protocols: [2, 3],
              api: [2]
            }
          }
        }];
        const bidderRequest = Object.assign({}, testBidderRequest, {
          bids: bidRequests
        });

        const request = spec.buildRequests(bidRequests, bidderRequest)[0];
        expect(request.method).to.equal('POST');
        expect(request.url).to.satisfy(url => url.startsWith(ENDPOINT_URL_NORMAL));
        const data = request.data;
        expect(data).to.exist;
        expect(data.imp).to.have.lengthOf(1);
        expect(data.imp[0].video).to.exist;
        expect(data.imp[0].video.placement).to.equal(4);
        expect(data.imp[0].video.w).to.equal(640);
        expect(data.imp[0].video.h).to.equal(480);
        expect(data.imp[0].ext.appnexus.require_asset_url).to.be.true;
      });
    }

    if (FEATURES.NATIVE) {
      it('should build a native request', function () {
        const testBidRequest = deepClone(baseBidRequests);
        const testBidderRequest = deepClone(baseBidderRequest);

        testBidRequest.params = {
          member: 123,
          inv_code: 'inv_code_123'
        }
        const nativeRequest = {
          assets: [{
            id: 1,
            required: 1,
            title: {
              len: 140
            }
          }],
          context: 1,
          plcmttype: 1,
          ver: '1.2'
        };

        const bidRequests = [{
          ...testBidRequest,
          mediaTypes: {
            native: {
              ortb: nativeRequest
            }
          },
          nativeOrtbRequest: nativeRequest,
          nativeParams: {
            ortb: nativeRequest
          }
        }];
        const bidderRequest = Object.assign({}, testBidderRequest, {
          bids: bidRequests
        });

        const request = spec.buildRequests(bidRequests, bidderRequest)[0];
        expect(request.method).to.equal('POST');
        expect(request.url).to.satisfy(url => url.startsWith(ENDPOINT_URL_NORMAL));
        const data = request.data;
        expect(data.imp).to.have.lengthOf(1);
        expect(data.imp[0].native.request).to.equal(JSON.stringify(nativeRequest));
      });
    }
  });

  describe('interpretResponse', function () {
    const bannerBidderRequest = {
      "bidderCode": "msft",
      "auctionId": null,
      "bidderRequestId": "f8c98171-d21f-4087-a1be-f72be8136dcc",
      "bids": [{
        "bidder": "msft",
        "params": {
          "placement_id": 13144370
        },
        "ortb2Imp": {
          "ext": {
            "data": {
              "adserver": {
                "name": "gam",
                "adslot": "/19968336/header-bid-tag-0"
              }
            },
            "gpid": "/19968336/header-bid-tag-0"
          }
        },
        "mediaTypes": {
          "banner": {
            "sizes": [
              [
                300,
                250
              ]
            ]
          }
        },
        "adUnitCode": "div-gpt-ad-1460505748561-0",
        "transactionId": null,
        "adUnitId": "94211d51-e391-4939-b965-bd8e974dca92",
        "sizes": [
          [
            300,
            250
          ]
        ],
        "bidId": "453e250c-a12c-420b-8539-ee0ef2f4868e",
        "bidderRequestId": "f8c98171-d21f-4087-a1be-f72be8136dcc",
        "auctionId": null,
        "src": "client",
        "auctionsCount": 1,
        "bidRequestsCount": 1,
        "bidderRequestsCount": 1,
        "bidderWinsCount": 0,
        "deferBilling": false,
        "ortb2": {
          "site": {
            "domain": "test.localhost:9999",
            "publisher": {
              "domain": "test.localhost:9999"
            },
            "page": "http://test.localhost:9999/integrationExamples/gpt/hello_world_2.html?pbjs_debug=true",
            "ref": "http://test.localhost:9999/integrationExamples/gpt/hello_world_2.html?pbjs_debug=true"
          },
          "device": {
            "w": 2560,
            "h": 1440,
            "dnt": 0,
            "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
            "language": "en",
            "ext": {
              "vpw": 2560,
              "vph": 647
            },
            "sua": {
              "source": 1,
              "platform": {
                "brand": "macOS"
              },
              "browsers": [{
                "brand": "Chromium",
                "version": [
                  "140"
                ]
              },
              {
                "brand": "Not=A?Brand",
                "version": [
                  "24"
                ]
              },
              {
                "brand": "Google Chrome",
                "version": [
                  "140"
                ]
              }
              ],
              "mobile": 0
            }
          },
          "source": {}
        }
      }],
      "auctionStart": 1759244033417,
      "timeout": 1000,
      "refererInfo": {
        "reachedTop": true,
        "isAmp": false,
        "numIframes": 0,
        "stack": [],
        "topmostLocation": "http://test.localhost:9999/integrationExamples/gpt/hello_world_2.html?pbjs_debug=true",
        "location": "http://test.localhost:9999/integrationExamples/gpt/hello_world_2.html?pbjs_debug=true",
        "canonicalUrl": null,
        "page": "http://test.localhost:9999/integrationExamples/gpt/hello_world_2.html?pbjs_debug=true",
        "domain": "test.localhost:9999",
        "ref": "http://test.localhost:9999/integrationExamples/gpt/hello_world_2.html?pbjs_debug=true",
        "legacy": {
          "reachedTop": true,
          "isAmp": false,
          "numIframes": 0,
          "stack": [],
          "referer": "http://test.localhost:9999/integrationExamples/gpt/hello_world_2.html?pbjs_debug=true",
          "canonicalUrl": null
        }
      },
      "ortb2": {
        "site": {
          "domain": "test.localhost:9999",
          "publisher": {
            "domain": "test.localhost:9999"
          },
          "page": "http://test.localhost:9999/integrationExamples/gpt/hello_world_2.html?pbjs_debug=true",
          "ref": "http://test.localhost:9999/integrationExamples/gpt/hello_world_2.html?pbjs_debug=true"
        },
        "device": {
          "w": 2560,
          "h": 1440,
          "dnt": 0,
          "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
          "language": "en",
          "ext": {
            "vpw": 2560,
            "vph": 647
          },
          "sua": {
            "source": 1,
            "platform": {
              "brand": "macOS"
            },
            "browsers": [{
              "brand": "Chromium",
              "version": [
                "140"
              ]
            },
            {
              "brand": "Not=A?Brand",
              "version": [
                "24"
              ]
            },
            {
              "brand": "Google Chrome",
              "version": [
                "140"
              ]
            }
            ],
            "mobile": 0
          }
        },
        "source": {}
      },
      "start": 1759244033424
    };

    const bannerBidResponse = {
      "body": {
        "id": "099630d6-1943-43ef-841d-fe916871e00a",
        "seatbid": [{
          "bid": [{
            "id": "2609670786764493419",
            "impid": "453e250c-a12c-420b-8539-ee0ef2f4868e",
            "price": 1.5,
            "adid": "96846035",
            "adm": "<script src=\"https://nym2-ib.adnxs.com/ab?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Fgpt%2Fhello_world_2.html%3Fpbjs_debug%3Dtrue&e=wqT_3QKvDqAvBwAAAwDWAAUBCMTe78YGEObJ46zJivGvRhjGpKbEk569pU4qNgkAAAECCPg_EQEHNAAA-D8ZAAAAwPUo-D8hERIAKREJADERG6gwsqKiBjjtSEDtSEgCUNOBly5YnPFbYABotc95eIj9BYABAYoBA1VTRJIBAQbwSZgBrAKgAfoBqAEBsAEAuAECwAEDyAEC0AEA2AEA4AEA8AEAigIpdWYoJ2EnLCAyNTI5ODg1LCAwKTt1ZigncicsIDk2ODQ2MDM1BRXw_ZICpQQhVm1BdHdnakt2Sm9kRU5PQmx5NFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUXNxS2lCbGdBWU00QmFBQndGSGdJZ0FFVWlBRUlrQUVCbUFFQm9BRUJxQUVEc0FFQXVRRy0wRXpGQUFENFA4RUJ2dEJNeFFBQS1EX0pBZmg3cVp5SWNQRV8yUUVBQUFBQUFBRHdQLUFCQVBVQkFBQUFBSmdDQUtBQ0FMVUNBQUFBQUwwQ0FBQUFBTUFDQU1nQ0FOQUNBTmdDQU9BQ0FPZ0NBUGdDQUlBREFaZ0RBYm9EQ1U1WlRUSTZOakl5TnVBRHFrcUlCQUNRQkFDWUJBSEJCBU0JAQh5UVEJCQEBFE5nRUFQRRGVLEFBQUNJQmRJd3FRVQENCagIN0VGAQoJAQhEQkIdPwB5FSgMQUFBTjIoAABaLigAuDRBWHdrd253QmUzODJnTDRCZDIwbWdHQ0JnTlZVMFNJQmdDUUJnR1lCZ0NoQmdBAU40QUFQZ19xQVlCc2dZa0MddABFHQwARx0MAEkdDKB1QVlLLUFlNDB3ajRCNkxWQ1BnSDdkd0ktQWVvN0FqNEJfUDhDSUVJQQlqAEEB-EhDQUNRQ0FBLpoClQEhS1JBeHlRNikCJG5QRmJJQVFvQUQxMFhENFB6b0pUbGxOTWpvMk1qSTJRS3BLUxGJDFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQwQZUFDSkEdEHjCAjVodHRwczovL2RvY3MucHJlYmlkLm9yZy9kZXYtARTwYS9nZXR0aW5nLXN0YXJ0ZWQuaHRtbNgC9-kD4AKtmEjqAlVodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2dwdC9oZWxsb193b3JsZF8yBVJ8P3BianNfZGVidWc9dHJ1ZfICEQoGQURWX0lEEgcyNTJhigUUCENQRwUUFDU2ODQ4NAUUCAVDUAETNAg2MTI1MTE0NvICDgoIATxoRlJFURICMTDyAg0KCFJFTV9VU0VSEgEw8gIMCSEUQ09ERRIABQ8BWBEPEAsKB0NQFQ4QCQoFSU8BYQQA8gEaBElPFRo4EwoPQ1VTVE9NX01PREVMDSQIGgoWMhYAHExFQUZfTkFNBWoIHgoaNh0ACEFTVAE-EElGSUVEAWIcDQoIU1BMSVQBTeABMIADAIgDAZADAJgDFKADAaoDAkgAwAPYBMgDANgDAOADAOgDAPgDA4AEAJIEEi9vcGVucnRiMi8pyPBhanOYBACiBA4xMDAuMTQuMTYzLjI1MKgE_UOyBA4IABAAGAAgADAAOAJCALgEAMAEgNq4IsgEANIEDjkzMjUjTllNMjo2MjI22gQCCAHgBADwBNOBly6IBQGYBQCgBf____8FA7ABqgUkMDk5NjMwZDYtMTk0My00M2VmLTg0MWQtZmU5MTY4NzFlMDBhwAUAyQWpwxTwP9IFCQkJDDQAANgFAeAFAfAFAfoFBAGXKJAGAJgGALgGAMEGCSMo8D_QBvUv2gYWChAJERkBAcVg4AYB8gYCCACABwGIBwCgBwHIB4j9BdIHDxViASYQIADaBwYBX_CdGADgBwDqBwIIAPAHkPWmA4oIYQpdAAABmZseoaBGX8RUlZjk5qh-YEbiixFeNKSwU942xVq95IWMpLMfZlV-kwZx7igi_tadimiKAcrhNH810Dec1tTfiroSFHftKanxAhowy564iuN_tWpE5xar7QwcEAGVCAAAgD-YCAHACADSCA4IgYKEiJCgwIABEAAYANoIBAgAIADgCADoCAA.&s=e37c73c0429f3ddf2575c67463e2e49a5fa09c68&pp=${AUCTION_PRICE}\"></script>",
            "adomain": [
              "prebid.org"
            ],
            "iurl": "https://nym2-ib.adnxs.com/cr?id=96846035",
            "cid": "9325",
            "crid": "96846035",
            "h": 250,
            "w": 300,
            "ext": {
              "appnexus": {
                "brand_id": 1,
                "auction_id": 5070987573008590000,
                "bidder_id": 2,
                "bid_ad_type": 0,
                "buyer_line_item_id": 0,
                "seller_line_item_id": 0,
                "curator_line_item_id": 0,
                "advertiser_id": 2529885,
                "renderer_id": 0,
                "no_ad_url": "https://nym2-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Fgpt%2Fhello_world_2.html%3Fpbjs_debug%3Dtrue&e=wqT_3QKYDKAYBgAAAwDWAAUBCMTe78YGEObJ46zJivGvRhjGpKbEk569pU4qNgkAAAkCABEJBywAABkAAADA9Sj4PyEREgApEQkAMREb9A4BMLKiogY47UhA7UhIAFAAWJzxW2AAaLXPeXgAgAEBigEAkgEDVVNEmAGsAqAB-gGoAQGwAQC4AQLAAQDIAQLQAQDYAQDgAQDwAQCKAil1ZignYScsIDI1Mjk4ODUsIDApO3VmKCdyJywgOTY4NDYwMzUsIDApO5ICpQQhVm1BdHdnakt2Sm9kRU5PQmx5NFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUXNxS2lCbGdBWU00QmFBQndGSGdJZ0FFVWlBRUlrQUVCbUFFQm9BRUJxQUVEc0FFQXVRRy0wRXpGQUFENFA4RUJ2dEJNeFFBQS1EX0pBZmg3cVp5SWNQRV8yUUVBQUFBQUFBRHdQLUFCQVBVQgURKEpnQ0FLQUNBTFVDBRAETDAJCPBJTUFDQU1nQ0FOQUNBTmdDQU9BQ0FPZ0NBUGdDQUlBREFaZ0RBYm9EQ1U1WlRUSTZOakl5TnVBRHFrcUlCQUNRQkFDWUJBSEJCQUEFVwEBCHlRUQEHCQEYTmdFQVBFRQkNAQEgQ0lCZEl3cVFVAQ0gQUFBRHdQN0VGAQoJAQhEQkIdPwB5FSgMQUFBTjIoAABaLigAuDRBWHdrd253QmUzODJnTDRCZDIwbWdHQ0JnTlZVMFNJQmdDUUJnR1lCZ0NoQmdBAU40QUFQZ19xQVlCc2dZa0MddABFHQwARx0MAEkdDKB1QVlLLUFlNDB3ajRCNkxWQ1BnSDdkd0ktQWVvN0FqNEJfUDhDSUVJQQlqYEFBQUNJQ0FDUUNBQS6aApUBIUtSQXh5UWoyKQIkblBGYklBUW9BRDEwWEQ0UHpvSlRsbE5Nam8yTWpJMlFLcEtTEYkMUEFfVREMDEFBQVcdDABZHQwAYR0MAGMdDBBlQUNKQR0QeMICNWh0dHBzOi8vZG9jcy5wcmViaWQub3JnL2Rldi0BFPBhL2dldHRpbmctc3RhcnRlZC5odG1s2AL36QPgAq2YSOoCVWh0dHA6Ly90ZXN0LmxvY2FsaG9zdDo5OTk5L2ludGVncmF0aW9uRXhhbXBsZXMvZ3B0L2hlbGxvX3dvcmxkXzIFUvBGP3BianNfZGVidWc9dHJ1ZYADAIgDAZADAJgDFKADAaoDAkgAwAPYBMgDANgDAOADAOgDAPgDA4AEAJIEEi9vcGVucnRiMi8JwfBhanOYBACiBA4xMDAuMTQuMTYzLjI1MKgE_UOyBA4IABAAGAAgADAAOAJCALgEAMAEgNq4IsgEANIEDjkzMjUjTllNMjo2MjI22gQCCADgBADwBNOBly6IBQGYBQCgBf____8FA7ABqgUkMDk5NjMwZDYtMTk0My00M2VmLTg0MWQtZmU5MTY4NzFlMDBhwAUAyQWJtBTwP9IFCQkJDDQAANgFAeAFAfAFAfoFBAGXKJAGAJgGALgGAMEGCSMo8L_QBvUv2gYWChAJERkBAcVg4AYB8gYCCACABwGIBwCgBwHIB4j9BdIHDxViASYQIADaBwYBX_CBGADgBwDqBwIIAPAHkPWmA4oIYQpdAAABmZseoaBGX8RUlZjk5qh-YEbiixFeNKSwU942xVq95IWMpLMfZlV-kwZx7igi_tadimiKAcrhNH810Dec1tTfiroSFHftKanxAhowy564iuN_tWpE5xar7QwcEAGVCAAAgD-YCAHACADSCA2HMNoIBAgAIADgCADoCAA.&s=6644c05b4a0f8a14c7aae16b72c1408265651a7e"
              }
            }
          }],
          "seat": "9325"
        }],
        "bidid": "5488067055951399787",
        "cur": "USD",
        "ext": {
          "tmaxrequest": 150
        }
      },
      "headers": {}
    };

    const videoInstreamBidderRequest = {
      "bidderCode": "msft",
      "auctionId": null,
      "bidderRequestId": "ba7c3a68-9f32-4fab-97dc-d016fcef290b",
      "bids": [{
        "bidder": "msft",
        "params": {
          "placement_id": 31523633
        },
        "ortb2Imp": {
          "video": {
            "mimes": [
              "video/mp4",
              "video/ogg",
              "video/webm",
              "application/vnd.apple.mpegurl",
              "application/javascript"
            ],
            "startdelay": 0,
            "protocols": [
              2,
              3,
              7
            ],
            "w": 640,
            "h": 360,
            "placement": 1,
            "maxextended": -1,
            "boxingallowed": 1,
            "playbackmethod": [
              3
            ],
            "playbackend": 1,
            "pos": 1,
            "api": [
              2
            ]
          },
          "ext": {
            "data": {}
          }
        },
        "mediaTypes": {
          "video": {
            "mimes": [
              "video/mp4",
              "video/ogg",
              "video/webm",
              "application/vnd.apple.mpegurl",
              "application/javascript"
            ],
            "protocols": [
              2,
              3,
              7
            ],
            "api": [
              2
            ],
            "h": 360,
            "w": 640,
            "maxextended": -1,
            "boxingallowed": 1,
            "playbackmethod": [
              3
            ],
            "playbackend": 1,
            "pos": 1,
            "playerSize": [
              [
                640,
                360
              ]
            ],
            "context": "instream",
            "placement": 1,
            "startdelay": 0
          }
        },
        "adUnitCode": "div-gpt-ad-51545-0",
        "transactionId": null,
        "adUnitId": "b88648c1-fb3c-475e-bc44-764d12dbf4d8",
        "sizes": [
          [
            640,
            360
          ]
        ],
        "bidId": "8d37414a-7a4f-4f3b-a922-5e9db77a6d6c",
        "bidderRequestId": "ba7c3a68-9f32-4fab-97dc-d016fcef290b",
        "auctionId": null,
        "src": "client",
        "auctionsCount": 1,
        "bidRequestsCount": 1,
        "bidderRequestsCount": 1,
        "bidderWinsCount": 0,
        "deferBilling": false,
        "ortb2": {
          "site": {
            "domain": "test.localhost:9999",
            "publisher": {
              "domain": "test.localhost:9999"
            },
            "page": "http://test.localhost:9999/integrationExamples/videoModule/videojs/localVideoCache.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member_id=13859",
            "ref": "http://test.localhost:9999/integrationExamples/videoModule/videojs/localVideoCache.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member_id=13859",
            "content": {
              "url": ""
            }
          },
          "device": {
            "w": 2560,
            "h": 1440,
            "dnt": 0,
            "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
            "language": "en",
            "ext": {
              "vpw": 2560,
              "vph": 647
            },
            "sua": {
              "source": 1,
              "platform": {
                "brand": "macOS"
              },
              "browsers": [{
                "brand": "Chromium",
                "version": [
                  "140"
                ]
              },
              {
                "brand": "Not=A?Brand",
                "version": [
                  "24"
                ]
              },
              {
                "brand": "Google Chrome",
                "version": [
                  "140"
                ]
              }
              ],
              "mobile": 0
            }
          },
          "source": {}
        }
      }],
      "auctionStart": 1759252766012,
      "timeout": 3000,
      "refererInfo": {
        "reachedTop": true,
        "isAmp": false,
        "numIframes": 0,
        "stack": [],
        "topmostLocation": "http://test.localhost:9999/integrationExamples/videoModule/videojs/localVideoCache.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member_id=13859",
        "location": "http://test.localhost:9999/integrationExamples/videoModule/videojs/localVideoCache.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member_id=13859",
        "canonicalUrl": null,
        "page": "http://test.localhost:9999/integrationExamples/videoModule/videojs/localVideoCache.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member_id=13859",
        "domain": "test.localhost:9999",
        "ref": "http://test.localhost:9999/integrationExamples/videoModule/videojs/localVideoCache.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member_id=13859",
        "legacy": {
          "reachedTop": true,
          "isAmp": false,
          "numIframes": 0,
          "stack": [],
          "referer": "http://test.localhost:9999/integrationExamples/videoModule/videojs/localVideoCache.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member_id=13859",
          "canonicalUrl": null
        }
      },
      "ortb2": {
        "site": {
          "domain": "test.localhost:9999",
          "publisher": {
            "domain": "test.localhost:9999"
          },
          "page": "http://test.localhost:9999/integrationExamples/videoModule/videojs/localVideoCache.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member_id=13859",
          "ref": "http://test.localhost:9999/integrationExamples/videoModule/videojs/localVideoCache.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member_id=13859",
          "content": {
            "url": ""
          }
        },
        "device": {
          "w": 2560,
          "h": 1440,
          "dnt": 0,
          "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
          "language": "en",
          "ext": {
            "vpw": 2560,
            "vph": 647
          },
          "sua": {
            "source": 1,
            "platform": {
              "brand": "macOS"
            },
            "browsers": [{
              "brand": "Chromium",
              "version": [
                "140"
              ]
            },
            {
              "brand": "Not=A?Brand",
              "version": [
                "24"
              ]
            },
            {
              "brand": "Google Chrome",
              "version": [
                "140"
              ]
            }
            ],
            "mobile": 0
          }
        },
        "source": {}
      },
      "start": 1759252766017
    };

    const videoInstreamBidResponse = {
      "body": {
        "id": "e999d11a-38f8-46e3-84ec-55103f10e760",
        "seatbid": [{
          "bid": [{
            "id": "6400954803477699288",
            "impid": "8d37414a-7a4f-4f3b-a922-5e9db77a6d6c",
            "price": 10,
            "adid": "484626808",
            "adm": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><VAST version=\"4.0\"><Ad id=\"484626808\"><Wrapper><AdSystem version=\"4.0\">adnxs</AdSystem><VASTAdTagURI><![CDATA[https://nym2-ib.adnxs.com/ab?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2FvideoModule%2Fvideojs%2FlocalVideoCache.html%3Fpbjs_debug%3Dtrue%26apn_debug_dongle%3DQWERTY%26apn_debug_member_id%3D13859&e=wqT_3QLpDqBpBwAAAwDWAAUBCM-i8MYGEPvDtIb7u8ykLhjGpKbEk569pU4qNgkAAAECCCRAEQEHEAAAJEAZCQkI4D8hCQkIJEApEQkAMQkJsOA_MLGGhA84o2xAo2xIAlD4oovnAViVr6IBYABonY3GAXgAgAEBigEDVVNEkgUG8EaYAQGgAQGoAQGwAQC4AQPAAQTIAQLQAQDYAQDgAQDwAQCKAj51ZignYScsIDY2MjEwMjgsIDApO3VmKCdpJywgNzY1ODIzNxUUMHInLCA0ODQ2MjY4MDgFFvCLkgK5BCFxR1hPWmdqOHJJUWNFUGlpaS1jQkdBQWdsYS1pQVRBQU9BQkFCRWlqYkZDeGhvUVBXQUJnemdGb0FIQUFlQUNBQVFDSUFRQ1FBUUdZQVFHZ0FRR29BUUd3QVFDNUFaVWM0RUEwUDQ5QXdRSHpyV3FrQUFBa1FNa0JBQUFBQUFBQThEX1pBUUEJDnRQQV80QUg5dGRNRDlRRUFBQ0JCbUFJQW9BSUJ0UUkFJAB2DQjwVXdBSUF5QUlBMEFJQTJBSUE0QUlBNkFJQS1BSUFnQU1CbUFNQnVnTUpUbGxOTWpvME5UWTA0QU9xU29BRTZMbXJDWWdFaHZUbERKQUVBSmdFQWNFRUFBBWMUQUFBREpCAQcNARgyQVFBOFFRDQ4oQUFBSWdGMUNPcEIRExRQQV9zUVUBGgkBCE1FRgkJFEFBSkVEShUoDEFBQTAFKCBCQU16LVBRTmsVKEg4RF9nQmNDRVBmQUY1STZvQ19nAQhgVUE0SUdBMVZUUklnR0FKQUdBWmdHQUtFRwFMAQEsSkVDb0JnU3lCaVFKARANAQBSDQgBAQBaAQUNAQBoDQiAQUFBQzRCaWo0QjdqVENQZ0hvdFVJLUFmdDNBajRCNmpzARQYOF93SWdRZwEtAQFca1FJZ0lBSkFJQUEuLpoCmQEhaGhHVTl3Oj0CLEpXdm9nRWdCQ2dBTTEhVENSQU9nbE9XVTB5T2pRMU5qUkFxa3AVsQg4RDkdsQBCHbEAQh2xBEJwAYYJAQRCeAkIAQEQQjRBSWs1sPBSOEQ4LtgCAOAC5I9d6gKZAWh0dHA6Ly90ZXN0LmxvY2FsaG9zdDo5OTk5L2ludGVncmF0aW9uRXhhbXBsZXMvdmlkZW9Nb2R1bGUvdmlkZW9qcy8FN4hWaWRlb0NhY2hlLmh0bWw_cGJqc19kZWJ1Zz10cnVlJmFwbgkPNF9kb25nbGU9UVdFUlRZHRhwbWVtYmVyX2lkPTEzODU58gIRCgZBRFZfSUQSBzZpwhzyAhIKBkNQRwEUPAgyMzcyNTkyNPICCgoFQ1ABFBgBMPICDQoIATYMRlJFUREQHFJFTV9VU0VSBRAADAkgGENPREUSAPIBDwFREQ8QCwoHQ1AVDhAQCgVJTwFZBAc3iS8A8gEhBElPFSE4EwoPQ1VTVE9NX01PREVMASsUAPICGgoWMhYAHExFQUZfTkFNBXEIHgoaNh0ACEFTVAE-EElGSUVEAT4cDQoIU1BMSVQBTfDlATCAAwCIAwGQAwCYAxSgAwGqAwJIAMAD4KgByAMA2AMA4AMA6AMA-AMDgAQAkgQSL29wZW5ydGIyL3ByZWJpZGpzmAQBogQOMTAwLjE0LjE2My4yNTCoBI5FsgQSCAEQCBiABSDoAigCMAA4BEIAuAQAwAQAyAQA0gQPMTM4NTkjTllNMjo0NTY02gQCCAHgBADwBPiii-cBiAUBmAUAoAX___________8BqgUkZTk5OWQxMWEtMzhmOC00NmUzLTg0ZWMtNTUxMDNmMTBlNzYwwAUAyQUAAAAAAADwP9IFCQkAAAAFDmjYBQHgBQHwBQH6BQQIABAAkAYBmAYAuAYAwQYFIDAA8D_QBtjmA9oGFgoQCRIZAWwQABgA4AYE8gYCCACABwGIBwCgB0DIBwDSBw8JESYBJBAgANoHBgFe8J0YAOAHAOoHAggA8AeQ9aYDighhCl0AAAGZm6OcmC5JMd-wzSH7S9CRaxvHzflX566DLUSOdQz88wyj3PqZEziVi4kwgLfD1XTpdj9BkTddNkqxU3TRdaKoURBAeRFiz3Ky5sh4Ali0fl6qRX1x8G-p788QAZUIAACAP5gIAcAIANIIDgiBgoSIkKDAgAEQABgA2ggECAAgAOAIAOgIAA..&s=ec6b67f896520314ab0b7fdb4b0847a14df44537&pp=${AUCTION_PRICE}]]></VASTAdTagURI><Impression><![CDATA[https://nym2-ib.adnxs.com/nop]]></Impression><Creatives><Creative adID=\"484626808\"><Linear></Linear></Creative></Creatives></Wrapper></Ad></VAST>",
            "adomain": [
              "example.com"
            ],
            "iurl": "https://nym2-ib.adnxs.com/cr?id=484626808",
            "nurl": "https://nym2-ib.adnxs.com/something?",
            "cid": "13859",
            "crid": "484626808",
            "h": 1,
            "w": 1,
            "ext": {
              "appnexus": {
                "brand_id": 1,
                "auction_id": 3335251835858264600,
                "bidder_id": 2,
                "bid_ad_type": 1,
                "creative_info": {
                  "video": {
                    "duration": 30,
                    "mimes": [
                      "video/mp4"
                    ]
                  }
                },
                "buyer_line_item_id": 0,
                "seller_line_item_id": 0,
                "curator_line_item_id": 0,
                "advertiser_id": 6621028,
                "renderer_id": 0,
                "no_ad_url": "https://nym2-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2FvideoModule%2Fvideojs%2FlocalVideoCache.html%3Fpbjs_debug%3Dtrue%26apn_debug_dongle%3DQWERTY%26apn_debug_member_id%3D13859&e=wqT_3QLTDKBTBgAAAwDWAAUBCM-i8MYGEPvDtIb7u8ykLhjGpKbEk569pU4qNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwdeA_MLGGhA84o2xAo2xIAFAAWJWvogFgAGidjcYBeACAAQGKAQCSAQNVU0SYAQGgAQGoAQGwAQC4AQPAAQDIAQLQAQDYAQDgAQDwAQCKAj51ZignYScsIDY2MjEwMjgsIDApO3VmKCdpJywgNzY1ODIzNywgMCkFFDByJywgNDg0NjI2ODA4BRbwi5ICuQQhcUdYT1pnajhySVFjRVBpaWktY0JHQUFnbGEtaUFUQUFPQUJBQkVpamJGQ3hob1FQV0FCZ3pnRm9BSEFBZUFDQUFRQ0lBUUNRQVFHWUFRR2dBUUdvQVFHd0FRQzVBWlVjNEVBMFA0OUF3UUh6cldxa0FBQWtRTWtCQUFBQUFBQUE4RF9aQVFBCQ50UEFfNEFIOXRkTUQ5UUVBQUNCQm1BSUFvQUlCdFFJBSQAdg0I8FV3QUlBeUFJQTBBSUEyQUlBNEFJQTZBSUEtQUlBZ0FNQm1BTUJ1Z01KVGxsTk1qbzBOVFkwNEFPcVNvQUU2TG1yQ1lnRWh2VGxESkFFQUpnRUFjRUVBQQVjFEFBQURKQgEHDQEYMkFRQThRUQ0OKEFBQUlnRjFDT3BCERMUUEFfc1FVARoJAQhNRUYJCRRBQUpFREoVKAxBQUEwBSggQkFNei1QUU5rFShIOERfZ0JjQ0VQZkFGNUk2b0NfZwEIYFVBNElHQTFWVFJJZ0dBSkFHQVpnR0FLRUcBTAEBLEpFQ29CZ1N5QmlRSgEQDQEAUg0IAQEAWgEFDQEAaA0IgEFBQUM0QmlqNEI3alRDUGdIb3RVSS1BZnQzQWo0QjZqcwEUGDhfd0lnUWcBLQEBXGtRSWdJQUpBSUFBLi6aApkBIWhoR1U5dzo9AixKV3ZvZ0VnQkNnQU0xIVRDUkFPZ2xPV1UweU9qUTFOalJBcWtwFbEIOEQ5HbEAQh2xAEIdsQRCcAGGCQEEQngJCAEBEEI0QUlrNbDwUjhEOC7YAgDgAuSPXeoCmQFodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL3ZpZGVvTW9kdWxlL3ZpZGVvanMvBTeIVmlkZW9DYWNoZS5odG1sP3BianNfZGVidWc9dHJ1ZSZhcG4JDzRfZG9uZ2xlPVFXRVJUWR0Y9CoBbWVtYmVyX2lkPTEzODU5gAMAiAMBkAMAmAMUoAMBqgMCSADAA-CoAcgDANgDAOADAOgDAPgDA4AEAJIEEi9vcGVucnRiMi9wcmViaWRqc5gEAaIEDjEwMC4xNC4xNjMuMjUwqASORbIEEggBEAgYgAUg6AIoAjAAOARCALgEAMAEAMgEANIEDzEzODU5I05ZTTI6NDU2NNoEAggA4AQA8AT4oovnAYgFAZgFAKAF____________AaoFJGU5OTlkMTFhLTM4ZjgtNDZlMy04NGVjLTU1MTAzZjEwZTc2MMAFAMkFAAAAAAAA8D_SBQkJAAAAAAAAAADYBQHgBQHwBQH6BQQIABAAkAYBmAYAuAYAwQYAAAAAAADwv9AG2OYD2gYWChAAAAAAAAABRQkBbBAAGADgBgTyBgIIAIAHAYgHAKAHQMgHANIHDwkJIgAABSQUIADaBwYIBQvwk-AHAOoHAggA8AeQ9aYDighhCl0AAAGZm6OcmC5JMd-wzSH7S9CRaxvHzflX566DLUSOdQz88wyj3PqZEziVi4kwgLfD1XTpdj9BkTddNkqxU3TRdaKoURBAeRFiz3Ky5sh4Ali0fl6qRX1x8G-p788QAZUIAACAP5gIAcAIANIIBggAEAAYANoIBAgAIADgCADoCAA.&s=20f85682f8ef5755702e4b1bc90549390e5b580a",
                "asset_url": "https://nym2-ib.adnxs.com/ab?ro=1&an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2FvideoModule%2Fvideojs%2FlocalVideoCache.html%3Fpbjs_debug%3Dtrue%26apn_debug_dongle%3DQWERTY%26apn_debug_member_id%3D13859&e=wqT_3QLpDqBpBwAAAwDWAAUBCM-i8MYGEPvDtIb7u8ykLhjGpKbEk569pU4qNgkAAAECCCRAEQEHEAAAJEAZCQkI4D8hCQkIJEApEQkAMQkJsOA_MLGGhA84o2xAo2xIAlD4oovnAViVr6IBYABonY3GAXgAgAEBigEDVVNEkgUG8EaYAQGgAQGoAQGwAQC4AQPAAQTIAQLQAQDYAQDgAQDwAQCKAj51ZignYScsIDY2MjEwMjgsIDApO3VmKCdpJywgNzY1ODIzNxUUMHInLCA0ODQ2MjY4MDgFFvCLkgK5BCFxR1hPWmdqOHJJUWNFUGlpaS1jQkdBQWdsYS1pQVRBQU9BQkFCRWlqYkZDeGhvUVBXQUJnemdGb0FIQUFlQUNBQVFDSUFRQ1FBUUdZQVFHZ0FRR29BUUd3QVFDNUFaVWM0RUEwUDQ5QXdRSHpyV3FrQUFBa1FNa0JBQUFBQUFBQThEX1pBUUEJDnRQQV80QUg5dGRNRDlRRUFBQ0JCbUFJQW9BSUJ0UUkFJAB2DQjwVXdBSUF5QUlBMEFJQTJBSUE0QUlBNkFJQS1BSUFnQU1CbUFNQnVnTUpUbGxOTWpvME5UWTA0QU9xU29BRTZMbXJDWWdFaHZUbERKQUVBSmdFQWNFRUFBBWMUQUFBREpCAQcNARgyQVFBOFFRDQ4oQUFBSWdGMUNPcEIRExRQQV9zUVUBGgkBCE1FRgkJFEFBSkVEShUoDEFBQTAFKCBCQU16LVBRTmsVKEg4RF9nQmNDRVBmQUY1STZvQ19nAQhgVUE0SUdBMVZUUklnR0FKQUdBWmdHQUtFRwFMAQEsSkVDb0JnU3lCaVFKARANAQBSDQgBAQBaAQUNAQBoDQiAQUFBQzRCaWo0QjdqVENQZ0hvdFVJLUFmdDNBajRCNmpzARQYOF93SWdRZwEtAQFca1FJZ0lBSkFJQUEuLpoCmQEhaGhHVTl3Oj0CLEpXdm9nRWdCQ2dBTTEhVENSQU9nbE9XVTB5T2pRMU5qUkFxa3AVsQg4RDkdsQBCHbEAQh2xBEJwAYYJAQRCeAkIAQEQQjRBSWs1sPBSOEQ4LtgCAOAC5I9d6gKZAWh0dHA6Ly90ZXN0LmxvY2FsaG9zdDo5OTk5L2ludGVncmF0aW9uRXhhbXBsZXMvdmlkZW9Nb2R1bGUvdmlkZW9qcy8FN4hWaWRlb0NhY2hlLmh0bWw_cGJqc19kZWJ1Zz10cnVlJmFwbgkPNF9kb25nbGU9UVdFUlRZHRhwbWVtYmVyX2lkPTEzODU58gIRCgZBRFZfSUQSBzZpwhzyAhIKBkNQRwEUPAgyMzcyNTkyNPICCgoFQ1ABFBgBMPICDQoIATYMRlJFUREQHFJFTV9VU0VSBRAADAkgGENPREUSAPIBDwFREQ8QCwoHQ1AVDhAQCgVJTwFZBAc3iS8A8gEhBElPFSE4EwoPQ1VTVE9NX01PREVMASsUAPICGgoWMhYAHExFQUZfTkFNBXEIHgoaNh0ACEFTVAE-EElGSUVEAT4cDQoIU1BMSVQBTfDlATCAAwCIAwGQAwCYAxSgAwGqAwJIAMAD4KgByAMA2AMA4AMA6AMA-AMDgAQAkgQSL29wZW5ydGIyL3ByZWJpZGpzmAQBogQOMTAwLjE0LjE2My4yNTCoBI5FsgQSCAEQCBiABSDoAigCMAA4BEIAuAQAwAQAyAQA0gQPMTM4NTkjTllNMjo0NTY02gQCCAHgBADwBPiii-cBiAUBmAUAoAX___________8BqgUkZTk5OWQxMWEtMzhmOC00NmUzLTg0ZWMtNTUxMDNmMTBlNzYwwAUAyQUAAAAAAADwP9IFCQkAAAAFDmjYBQHgBQHwBQH6BQQIABAAkAYBmAYAuAYAwQYFIDAA8D_QBtjmA9oGFgoQCRIZAWwQABgA4AYE8gYCCACABwGIBwCgB0DIBwDSBw8JESYBJBAgANoHBgFe8J0YAOAHAOoHAggA8AeQ9aYDighhCl0AAAGZm6OcmC5JMd-wzSH7S9CRaxvHzflX566DLUSOdQz88wyj3PqZEziVi4kwgLfD1XTpdj9BkTddNkqxU3TRdaKoURBAeRFiz3Ky5sh4Ali0fl6qRX1x8G-p788QAZUIAACAP5gIAcAIANIIDgiBgoSIkKDAgAEQABgA2ggECAAgAOAIAOgIAA..&s=ec6b67f896520314ab0b7fdb4b0847a14df44537{AUCTION_PRICE}"
              }
            }
          }],
          "seat": "13859"
        }],
        "bidid": "3531514400060956584",
        "cur": "USD",
        "ext": {
          "tmaxrequest": 150
        }
      },
      "headers": {}
    };

    const videoOutstreamBidderRequest = {
      "bidderCode": "msft",
      "auctionId": null,
      "bidderRequestId": "3348a473-ad23-4672-bd82-cb0625b1ccd5",
      "bids": [{
        "bidder": "msft",
        "params": {
          "placement_id": 33911093,
          "video": {
            "skippable": true
          }
        },
        "ortb2Imp": {
          "video": {
            "mimes": [
              "video/mp4"
            ],
            "protocols": [
              2,
              3,
              5,
              6,
              7,
              8
            ],
            "w": 640,
            "h": 480,
            "plcmt": 4
          },
          "ext": {
            "data": {
              "adserver": {
                "name": "gam",
                "adslot": "/19968336/prebid_outstream_adunit_1"
              }
            },
            "gpid": "/19968336/prebid_outstream_adunit_1"
          }
        },
        "mediaTypes": {
          "video": {
            "playerSize": [
              [
                640,
                480
              ]
            ],
            "context": "outstream",
            "mimes": [
              "video/mp4"
            ],
            "protocols": [
              2,
              3,
              5,
              6,
              7,
              8
            ],
            "plcmt": 4,
            "w": 640,
            "h": 480
          }
        },
        "adUnitCode": "video1",
        "transactionId": null,
        "adUnitId": "202e3ff9-e9fc-4b91-84d8-c808e7f8f1b2",
        "sizes": [
          [
            640,
            480
          ]
        ],
        "bidId": "29ffa2b1-821d-4542-b948-8533c1832a68",
        "bidderRequestId": "3348a473-ad23-4672-bd82-cb0625b1ccd5",
        "auctionId": null,
        "src": "client",
        "auctionsCount": 1,
        "bidRequestsCount": 1,
        "bidderRequestsCount": 1,
        "bidderWinsCount": 0,
        "deferBilling": false,
        "ortb2": {
          "site": {
            "domain": "test.localhost:9999",
            "publisher": {
              "domain": "test.localhost:9999"
            },
            "page": "http://test.localhost:9999/integrationExamples/gpt/old/outstream.html?pbjs_debug=true"
          },
          "device": {
            "w": 2560,
            "h": 1440,
            "dnt": 0,
            "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
            "language": "en",
            "ext": {
              "vpw": 2560,
              "vph": 815
            },
            "sua": {
              "source": 1,
              "platform": {
                "brand": "macOS"
              },
              "browsers": [{
                "brand": "Google Chrome",
                "version": [
                  "141"
                ]
              },
              {
                "brand": "Not?A_Brand",
                "version": [
                  "8"
                ]
              },
              {
                "brand": "Chromium",
                "version": [
                  "141"
                ]
              }
              ],
              "mobile": 0
            }
          },
          "source": {}
        }
      }],
      "auctionStart": 1759325217458,
      "timeout": 3000,
      "refererInfo": {
        "reachedTop": true,
        "isAmp": false,
        "numIframes": 0,
        "stack": [],
        "topmostLocation": "http://test.localhost:9999/integrationExamples/gpt/old/outstream.html?pbjs_debug=true",
        "location": "http://test.localhost:9999/integrationExamples/gpt/old/outstream.html?pbjs_debug=true",
        "canonicalUrl": null,
        "page": "http://test.localhost:9999/integrationExamples/gpt/old/outstream.html?pbjs_debug=true",
        "domain": "test.localhost:9999",
        "ref": null,
        "legacy": {
          "reachedTop": true,
          "isAmp": false,
          "numIframes": 0,
          "stack": [],
          "referer": "http://test.localhost:9999/integrationExamples/gpt/old/outstream.html?pbjs_debug=true",
          "canonicalUrl": null
        }
      },
      "ortb2": {
        "site": {
          "domain": "test.localhost:9999",
          "publisher": {
            "domain": "test.localhost:9999"
          },
          "page": "http://test.localhost:9999/integrationExamples/gpt/old/outstream.html?pbjs_debug=true"
        },
        "device": {
          "w": 2560,
          "h": 1440,
          "dnt": 0,
          "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
          "language": "en",
          "ext": {
            "vpw": 2560,
            "vph": 815
          },
          "sua": {
            "source": 1,
            "platform": {
              "brand": "macOS"
            },
            "browsers": [{
              "brand": "Google Chrome",
              "version": [
                "141"
              ]
            },
            {
              "brand": "Not?A_Brand",
              "version": [
                "8"
              ]
            },
            {
              "brand": "Chromium",
              "version": [
                "141"
              ]
            }
            ],
            "mobile": 0
          }
        },
        "source": {}
      },
      "start": 1759325217463
    }

    const videoOutstreamBidResponse = {
      "body": {
        "id": "cb624440-f8bd-4da1-8256-d8a243651bef",
        "seatbid": [{
          "bid": [{
            "id": "3757141233787776626",
            "impid": "29ffa2b1-821d-4542-b948-8533c1832a68",
            "price": 25.00001,
            "adid": "546521568",
            "adm": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><VAST version=\"4.0\"><Ad id=\"546521568\"><Wrapper><AdSystem version=\"4.0\">adnxs</AdSystem><VASTAdTagURI><![CDATA[https://nym2-ib.adnxs.com/ab?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Fgpt%2Fold%2Foutstream.html%3Fpbjs_debug%3Dtrue&e=wqT_3QKjDqAjBwAAAwDWAAUBCK_Y9MYGEJPj5qzflrr8fBgAKjYJR6zFpwAAOUARRw0JBBkABQEI4D8hERsAKREJADEFGsAA4D8wteKVEDjFPUDFPUgCUOCDzYQCWIKjsQFgAGjIgtUBeMm7BYABAYoBA1VTRJIBAQbwSZgBAaABAagBAbABALgBA8ABA8gBAtABANgBAOABAPABAIoCQHVmKCdhJywgMTA4OTY0MTksIDApO3VmKCdpJywgMTA1OTI0MjAsERU0cicsIDU0NjUyMTU2OCwBFvCQkgK9BCEyMmNxTndpcHI3a2RFT0NEellRQ0dBQWdncU94QVRBQU9BQkFCRWpGUFZDMTRwVVFXQUJnX19fX193OW9BSEFXZUFDQUFSYUlBUUNRQVFHWUFRR2dBUUdvQVFHd0FRQzVBWEJaaGMwQUFEbEF3UUZ3V1lYTkFBQTVRTWtCQUFBQUFBQUE4RF9aQVFBQQUPdFBBXzRBR2t3WVlGOVFFQUFNaEJtQUlBb0FJQnRRSQUjAHYNCPBVd0FJQnlBSUIwQUlXMkFJQTRBSUE2QUlBLUFJQWdBTUJtQU1CdWdNSlRsbE5Nam8wT1RReDRBT3JTb0FFZ05tS0Q0Z0V3LUNLRDVBRUFKZ0VBY0VFQUEFYxRBQUFESkIBBw0BGDJBUUE4UVENDihBQUFJZ0Z6U2FwQhETFFBBX3NRVQEaCQEITUVGCQkUQUFPVURKLigAADAuKAAETmsVKMg4RF9nQmFITG1BSHdCWVB1M1F6NEJhT0ltUVdDQmdOVlUwU0lCZ0NRQmdHWUJnQ2hCZ0EJYyxEbEFxQVlFc2dZa0MRkAxBQUFFHQwARx0MAEkdDKB1QVlVLUFlNDB3ajRCNkxWQ1BnSDdkd0ktQWVvN0FqNEJfUDhDSUVJQQFRBcxQQ0lDQUNRQ0FBLpoCmQEhR2hHSHlnOkECLElLanNRRWdCQ2dBTRFtWERsQU9nbE9XVTB5T2pRNU5ERkFxMHBKAVUBAQw4RDlSAQgJAQRCWgkIAQEEQmgBBgkBBEJwCQgBAQRCeAEGCQEQQjRBSWs1sPCqOEQ4LtgCAOAC1MY96gJVaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9ncHQvb2xkL291dHN0cmVhbS5odG1sP3BianNfZGVidWc9dHJ1ZfICEgoGQURWX0lEEggxMDg5NjQxOfICEgoGQ1BHX0lEEggyNjcwMzYxOfICCgoFQ1BfSUQSATDyAg0KCEFEVl9GUkVREgEwBRA8UkVNX1VTRVISATDyAgwKCAEgFENPREUSAAUPAVERDxALCgdDUBUOFBEKBUlPXwFtcfAA8gEiBElPFSI4EwoPQ1VTVE9NX01PREVMASwUAPICGgoWMhYAHExFQUZfTkFNBXIIHgoaNh0ACEFTVAE-EElGSUVEAT4cDQoIU1BMSVQBTfCQATCAAwCIAwGQAwCYAxSgAwGqAwJIAMAD4KgByAMA2AMA4AMA6AMA-AMDgAQAkgQSL29wZW5ydGIyL3ByZWJpZGpzmAQAogQOMTAwLjE0LjE2My4yNTCoBACyBBAIABAAGIAFIOADMAA4BEIAuAQAwAQAyAQA0gQONzg3NyNOWU0yOjQ5NDHaBAIIAeAEAPAE4KFdIIgFAZgFAKAF_xEBuAGqBSRjYjYyNDQ0MC1mOGJkLTRkYTEtODI1Ni1kOGEyNDM2NTFiZWbABQDJBQAAAQIU8D_SBQkJAQoBASzYBQHgBQHwBQH6BQQBlyiQBgGYBgC4BgDBBgEfMAAA8D_QBqIo2gYWChAJERkBcBAAGADgBgTyBgIIAIAHAYgHAKAHQMgHybsF0gcPFWIBJhAgANoHBgFf8J0YAOAHAOoHAggA8AeQ9aYDighhCl0AAAGZn_SXmHz46LX1mbGTFPjBc4ofoClrarilv48ccB0T3Vm-FTukoSSDehJCIeSY21q6N-oSr0ocUA3idwnaOplNcuHDF9VJLxBvM58E-tcQVhuo1F41W8_LM1AQAZUIAACAP5gIAcAIANIIDgiBgoSIkKDAgAEQABgA2ggECAAgAOAIAOgIAA..&s=925c3254312f297878dfbc0bea2c02b59b1eaf10&pp=${AUCTION_PRICE}]]></VASTAdTagURI><Impression><![CDATA[https://nym2-ib.adnxs.com/nop]]></Impression><Creatives><Creative adID=\"546521568\"><Linear></Linear></Creative></Creatives></Wrapper></Ad></VAST>",
            "adomain": [
              "example.com"
            ],
            "iurl": "https://nym2-ib.adnxs.com/cr?id=546521568",
            "nurl": "https://nym2-ib.adnxs.com/something",
            "cid": "7877",
            "crid": "546521568",
            "h": 1,
            "w": 1,
            "ext": {
              "appnexus": {
                "brand_id": 1,
                "auction_id": 9005203323134521000,
                "bidder_id": 2,
                "bid_ad_type": 1,
                "creative_info": {
                  "video": {
                    "duration": 30,
                    "mimes": [
                      "video/mp4",
                      "video/webm"
                    ]
                  }
                },
                "buyer_line_item_id": 0,
                "seller_line_item_id": 0,
                "curator_line_item_id": 0,
                "advertiser_id": 10896419,
                "renderer_id": 2,
                "renderer_url": "https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js",
                "renderer_config": "{}",
                "no_ad_url": "https://nym2-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Fgpt%2Fold%2Foutstream.html%3Fpbjs_debug%3Dtrue&e=wqT_3QKJDHwJBgAAAwDWAAUBCK_Y9MYGEJPj5qzflrr8fBgAKjYJAA0BABENCAQAGQkJCOA_IQkJCAAAKREJADEJCfSoAeA_MLXilRA4xT1AxT1IAFAAWIKjsQFgAGjIgtUBeACAAQGKAQCSAQNVU0SYAQGgAQGoAQGwAQC4AQPAAQDIAQLQAQDYAQDgAQDwAQCKAkB1ZignYScsIDEwODk2NDE5LCAwKTt1ZignaScsIDEwNTkyNDIwLCAwKTt1ZigncicsIDU0NjUyMTU2OCwgMCk7kgK9BCEyMmNxTndpcHI3a2RFT0NEellRQ0dBQWdncU94QVRBQU9BQkFCRWpGUFZDMTRwVVFXQUJnX19fX193OW9BSEFXZUFDQUFSYUlBUUNRQVFHWUFRR2dBUUdvQVFHd0FRQzVBWEJaaGMwQUFEbEF3UUZ3V1lYTkFBQTVRTWtCQUFBQUFBQUE4RF9aQVFBQUFBQUFBUEFfNEFHa3dZWUY5UUVBQU1oQm1BSUFvQUlCdFFJQUFBQUF2UUlBQUFBQXdBSUJ5QUlCMEFJVzJBSUE0QUlBNkFJQS1BSUFnQU1CbUFNQnVnTUpUbGxOTWpvME9UUXg0QU9yU29BRWdObUtENGdFdy1DS0Q1QUVBSmdFQWNFRUFBQUFBAYgIQURKFaEkQUFBMkFRQThRUQELCQEcSWdGelNhcEIRExRQQV9zUVUJHAEBCE1FRgEHAQEMT1VESi4oAAAwLigABE5rFSjIOERfZ0JhSExtQUh3QllQdTNRejRCYU9JbVFXQ0JnTlZVMFNJQmdDUUJnR1lCZ0NoQmdBAV80QUFEbEFxQVlFc2dZa0MRkAxBQUFFHQwARx0MAEkdDKB1QVlVLUFlNDB3ajRCNkxWQ1BnSDdkd0ktQWVvN0FqNEJfUDhDSUVJQQFRaEFBQU9VQ0lDQUNRQ0FBLpoCmQEhR2hHSHlnaTZBAixJS2pzUUVnQkNnQU0RbVhEbEFPZ2xPV1UweU9qUTVOREZBcTBwSgFVAQEMOEQ5UgEICQEEQloJCAEBBEJoAQYJAQRCcAkIAQEEQngBBgkBEEI0QUlrNbD0NAE4RDgu2AIA4ALUxj3qAlVodHRwOi8vdGVzdC5sb2NhbGhvc3Q6OTk5OS9pbnRlZ3JhdGlvbkV4YW1wbGVzL2dwdC9vbGQvb3V0c3RyZWFtLmh0bWw_cGJqc19kZWJ1Zz10cnVlgAMAiAMBkAMAmAMUoAMBqgMCSADAA-CoAcgDANgDAOADAOgDAPgDA4AEAJIEEi9vcGVucnRiMi9wcmViaWRqc5gEAKIEDjEwMC4xNC4xNjMuMjUwqAQAsgQQCAAQABiABSDgAzAAOARCALgEAMAEAMgEANIEDjc4NzcjTllNMjo0OTQx2gQCCADgBADwBOCDzYQCiAUBmAUAoAX___________8BqgUkY2I2MjQ0NDAtZjhiZC00ZGExLTgyNTYtZDhhMjQzNjUxYmVmwAUAyQWJpBDwP9IFCZXdaNgFAeAFAfAFAfoFBAgAEACQBgGYBgC4BgDBBg0vJL_QBqIo2gYWChAJERkBcBAAGADgBgTyBgIIAIAHAYgHAKAHQMgHybsF0gcPFWIBJhAgANoHBgFf8IEYAOAHAOoHAggA8AeQ9aYDighhCl0AAAGZn_SXmHz46LX1mbGTFPjBc4ofoClrarilv48ccB0T3Vm-FTukoSSDehJCIeSY21q6N-oSr0ocUA3idwnaOplNcuHDF9VJLxBvM58E-tcQVhuo1F41W8_LM1AQAZUIAACAP5gIAcAIANIIDYcw2ggECAAgAOAIAOgIAA..&s=ce270f0cb1dee88fbb6b6bb8d59b1d9ca7e38e90"
              }
            }
          }],
          "seat": "7877"
        }],
        "bidid": "1510787988993274243",
        "cur": "USD",
        "ext": {
          "tmaxrequest": 150
        }
      },
      "headers": {}
    }

    const nativeBidderRequest = {
      "bidderCode": "msft",
      "auctionId": null,
      "bidderRequestId": "cdfd0842-275b-4f87-8b46-8f4052454a5e",
      "bids": [{
        "bidder": "msft",
        "params": {
          "placement_id": 33907873
        },
        "ortb2Imp": {
          "ext": {
            "data": {
              "adserver": {
                "name": "gam",
                "adslot": "/19968336/prebid_native_cdn_test_1"
              }
            },
            "gpid": "/19968336/prebid_native_cdn_test_1"
          }
        },
        "nativeParams": {
          "ortb": {
            "ver": "1.2",
            "assets": [{
              "id": 1,
              "required": 1,
              "img": {
                "type": 3,
                "w": 989,
                "h": 742
              }
            },
            {
              "id": 2,
              "required": 1,
              "title": {
                "len": 100
              }
            },
            {
              "id": 3,
              "required": 1,
              "data": {
                "type": 1
              }
            }
            ]
          }
        },
        "nativeOrtbRequest": {
          "ver": "1.2",
          "assets": [{
            "id": 1,
            "required": 1,
            "img": {
              "type": 3,
              "w": 989,
              "h": 742
            }
          },
          {
            "id": 2,
            "required": 1,
            "title": {
              "len": 100
            }
          },
          {
            "id": 3,
            "required": 1,
            "data": {
              "type": 1
            }
          }
          ]
        },
        "mediaTypes": {
          "native": {
            "ortb": {
              "ver": "1.2",
              "assets": [{
                "id": 1,
                "required": 1,
                "img": {
                  "type": 3,
                  "w": 989,
                  "h": 742
                }
              },
              {
                "id": 2,
                "required": 1,
                "title": {
                  "len": 100
                }
              },
              {
                "id": 3,
                "required": 1,
                "data": {
                  "type": 1
                }
              }
              ]
            }
          }
        },
        "adUnitCode": "/19968336/prebid_native_cdn_test_1",
        "transactionId": null,
        "adUnitId": "e93238c6-03b8-4142-bd2b-af384da2b0ae",
        "sizes": [],
        "bidId": "519ca815-b76b-4ab0-9dc5-c78fa77dd7b1",
        "bidderRequestId": "cdfd0842-275b-4f87-8b46-8f4052454a5e",
        "auctionId": null,
        "src": "client",
        "auctionsCount": 1,
        "bidRequestsCount": 1,
        "bidderRequestsCount": 1,
        "bidderWinsCount": 0,
        "deferBilling": false,
        "ortb2": {
          "site": {
            "domain": "test.localhost:9999",
            "publisher": {
              "domain": "test.localhost:9999"
            },
            "page": "http://test.localhost:9999/integrationExamples/gpt/old/demo_native_cdn.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member=9325",
            "ref": "http://test.localhost:9999/integrationExamples/gpt/old/demo_native_cdn.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member=9325"
          },
          "device": {
            "w": 2560,
            "h": 1440,
            "dnt": 0,
            "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
            "language": "en",
            "ext": {
              "vpw": 2560,
              "vph": 647
            },
            "sua": {
              "source": 1,
              "platform": {
                "brand": "macOS"
              },
              "browsers": [{
                "brand": "Chromium",
                "version": [
                  "140"
                ]
              },
              {
                "brand": "Not=A?Brand",
                "version": [
                  "24"
                ]
              },
              {
                "brand": "Google Chrome",
                "version": [
                  "140"
                ]
              }
              ],
              "mobile": 0
            }
          },
          "source": {}
        }
      }],
      "auctionStart": 1759249513048,
      "timeout": 3000,
      "refererInfo": {
        "reachedTop": true,
        "isAmp": false,
        "numIframes": 0,
        "stack": [],
        "topmostLocation": "http://test.localhost:9999/integrationExamples/gpt/old/demo_native_cdn.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member=9325",
        "location": "http://test.localhost:9999/integrationExamples/gpt/old/demo_native_cdn.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member=9325",
        "canonicalUrl": null,
        "page": "http://test.localhost:9999/integrationExamples/gpt/old/demo_native_cdn.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member=9325",
        "domain": "test.localhost:9999",
        "ref": "http://test.localhost:9999/integrationExamples/gpt/old/demo_native_cdn.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member=9325",
        "legacy": {
          "reachedTop": true,
          "isAmp": false,
          "numIframes": 0,
          "stack": [],
          "referer": "http://test.localhost:9999/integrationExamples/gpt/old/demo_native_cdn.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member=9325",
          "canonicalUrl": null
        }
      },
      "ortb2": {
        "site": {
          "domain": "test.localhost:9999",
          "publisher": {
            "domain": "test.localhost:9999"
          },
          "page": "http://test.localhost:9999/integrationExamples/gpt/old/demo_native_cdn.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member=9325",
          "ref": "http://test.localhost:9999/integrationExamples/gpt/old/demo_native_cdn.html?pbjs_debug=true&apn_debug_dongle=QWERTY&apn_debug_member=9325"
        },
        "device": {
          "w": 2560,
          "h": 1440,
          "dnt": 0,
          "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
          "language": "en",
          "ext": {
            "vpw": 2560,
            "vph": 647
          },
          "sua": {
            "source": 1,
            "platform": {
              "brand": "macOS"
            },
            "browsers": [{
              "brand": "Chromium",
              "version": [
                "140"
              ]
            },
            {
              "brand": "Not=A?Brand",
              "version": [
                "24"
              ]
            },
            {
              "brand": "Google Chrome",
              "version": [
                "140"
              ]
            }
            ],
            "mobile": 0
          }
        },
        "source": {}
      },
      "start": 1759249513055
    };

    const nativeBidResponse = {
      "body": {
        "id": "408873b5-0b75-43f2-b490-ba05466265e7",
        "seatbid": [{
          "bid": [{
            "id": "2634147710021988035",
            "impid": "519ca815-b76b-4ab0-9dc5-c78fa77dd7b1",
            "price": 5,
            "adid": "546255182",
            "adm": "{\"ver\":\"1.2\",\"assets\":[{\"id\":1,\"img\":{\"url\":\"https:\\/\\/crcdn01.adnxs-simple.com\\/creative20\\/p\\/9325\\/2024\\/8\\/14\\/60018074\\/6ceb0f95-1465-4e90-b295-4b6e2aff3035.jpg\",\"w\":989,\"h\":742,\"ext\":{\"appnexus\":{\"prevent_crop\":0}}}},{\"id\":2,\"title\":{\"text\":\"This is a AST Native Creative\"}},{\"id\":3,\"data\":{\"value\":\"AST\"}}],\"link\":{\"url\":\"https:\\/\\/nym2-ib.adnxs.com\\/click2?e=wqT_3QKfAfBDnwAAAAMAxBkFAQizifDGBhD8vNTpipOK8TEYxqSmxJOevaVOIKHJlRAo7Ugw7Ug4AkDO4ryEAkijlKIBUABaA1VTRGIBBWhoAXABeJ7txQGAAQCIAQGQAQKYAQSgAQKpAQAFAQgUQLEVCgC5DQoI4D_BDQoIFEDJFQow2AEA4AEA8AH1L_gBAA..\\/s=fec918f3f3660ce11dc2975bb7beb9df3d181748\\/bcr=AAAAAAAA8D8=\\/pp=${AUCTION_PRICE}\\/cnd=%21khGz_Qi-7rgdEM7ivIQCGKOUogEgBCgAMQAAAAAAABRAOglOWU0yOjQ5ODlAqkpJAAAAAAAA8D9RAAAAAAAAAABZAAAAAAAAAABhAAAAAAAAAABpAAAAAAAAAABxAAAAAAAAAAB4AIkBAAAAAAAA8D8.\\/cca=OTMyNSNOWU0yOjQ5ODk=\\/bn=0\\/clickenc=http%3A%2F%2Fprebid.org\"},\"eventtrackers\":[{\"event\":1,\"method\":1,\"url\":\"https:\\/\\/nym2-ib.adnxs.com\\/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Fgpt%2Fold%2Fdemo_native_cdn.html%3Fpbjs_debug%3Dtrue%26apn_debug_dongle%3DQWERTY%26apn_debug_member%3D9325&e=wqT_3QLSDKBSBgAAAwDWAAUBCLOJ8MYGEPy81OmKk4rxMRjGpKbEk569pU4qNgkAAAECCBRAEQEHEAAAFEAZCQkI4D8hCQkIFEApEQkAMQkJsOA_MKHJlRA47UhA7UhIAlDO4ryEAlijlKIBYABonu3FAXgAgAEBigEDVVNEkgUG8EaYAQGgAQGoAQGwAQC4AQLAAQTIAQLQAQDYAQDgAQDwAQCKAj51ZignYScsIDY1NjgyOTEsIDApO3VmKCdpJywgNzYyNDE2NRUUMHInLCA1NDYyNTUxODIFFvCQkgK9BCF3Mmd1QmdpLTdyZ2RFTTdpdklRQ0dBQWdvNVNpQVRBQU9BQkFCRWp0U0ZDaHlaVVFXQUJnemdGb0FIQU9lTFlZZ0FFT2lBRzJHSkFCQVpnQkFhQUJBYWdCQWJBQkFMa0I4NjFxcEFBQUZFREJBZk90YXFRQUFCUkF5UUVBQUFBQUFBRHdQOWtCQUFBQQEPdDhEX2dBZVdyMFFQMUFRQUFvRUNZQWdDZ0FnRzFBZwEiBEM5CQjwVURBQWdESUFnRFFBZzdZQXJZWTRBSUE2QUlBLUFJQWdBTUJtQU1CdWdNSlRsbE5Nam8wT1RnNTRBT3FTb0FFdXM2Z0NZZ0VrZnFKRDVBRUFKZ0VBY0VFAWIJAQREShWVJEFBQTJBUUE4UVEBCwkBHElnRl9TYXBCERMUUEFfc1FVCRwBAQhNRUYBBwEBDEZFREouKAAAMC4oAAROaxUoAfywQmFEQ0h2QUYyYXZkRFBnRjRfS1FBNElHQTFWVFJJZ0dBSkFHQVpnR0FLRUdBAV0lXCRDb0JnU3lCaVFKARANAQBSDQgBAQBaAQUNAQBoDQiAQUFBQzRCZ3I0QjdqVENQZ0hvdFVJLUFmdDNBajRCNmpzARQUOF93SWdRJXkBAVxVUUlnSUFKQUlBQS4umgKZASFraEd6X1E6QQIsS09Vb2dFZ0JDZ0FNMSFUQlJBT2dsT1dVMHlPalE1T0RsQXFrcBWxCDhEOR2xAEIdsQBCHbEEQnABhgkBBEJ4CQgBARBCNEFJazWw9LYBOEQ4LtgC9-kD4AKtmEjqAokBaHR0cDovL3Rlc3QubG9jYWxob3N0Ojk5OTkvaW50ZWdyYXRpb25FeGFtcGxlcy9ncHQvb2xkL2RlbW9fbmF0aXZlX2Nkbi5odG1sP3BianNfZGVidWc9dHJ1ZSZhcG5fZGVidWdfZG9uZ2xlPVFXRVJUWSZhcG5fZGVidWdfbWVtYmVyPTkzMjWAAwCIAwGQAwCYAxSgAwGqAwJIAMAD4KgByAMA2AMA4AMA6AMA-AMDgAQAkgQSL29wZW5ydGIyL3ByZWJpZGpzmAQAogQOMTAwLjE0LjE2My4yNTCoBNhEsgQOCAAQABgAIAAwADgAQgC4BADABADIBADSBA45MzI1I05ZTTI6NDk4OdoEAggB4AQA8ATO4ryEAogFAZgFAKAF____________AaoFJDQwODg3M2I1LTBiNzUtNDNmMi1iNDkwLWJhMDU0NjYyNjVlN8AFAMkFAAAAAAAA8D_SBQkJAAAAAAAAAADYBQHgBQHwBQH6BQQIABAAkAYBmAYAuAYAwQYAAAAAAADwP9AG9S_aBhYKEAAAAAAAAAAAAAAAAAEbaBAAGADgBgzyBgIIAIAHAYgHAKAHQcgHANIHDxVgASQQIADaBwYJ8vCb4AcA6gcCCADwB5D1pgOKCGEKXQAAAZmbcls4MeIomK01HnxjZ19jnODCYNG_e0eXMrsJyOA5um4JVppxvM9079B8pwi2cU2gbzDjYgmYgkdUJXwe4yn9EtYSYNavJIDFeQm0RRGvDEj6ltcLGUilABABlQgAAIA_mAgBwAgA0ggOCIGChIiQoMCAARAAGADaCAQIACAA4AgA6AgA&s=0a66129aafb703cfab8bbce859eacdfa0f456a28&pp=${AUCTION_PRICE}\"}]}",
            "adomain": [
              "example.com"
            ],
            "iurl": "https://nym2-ib.adnxs.com/cr?id=546255182",
            "cid": "9325",
            "crid": "546255182",
            "ext": {
              "appnexus": {
                "brand_id": 1,
                "auction_id": 3594480088801156600,
                "bidder_id": 2,
                "bid_ad_type": 3,
                "buyer_line_item_id": 0,
                "seller_line_item_id": 0,
                "curator_line_item_id": 0,
                "advertiser_id": 6568291,
                "renderer_id": 0,
                "no_ad_url": "https://nym2-ib.adnxs.com/it?an_audit=0&referrer=http%3A%2F%2Ftest.localhost%3A9999%2FintegrationExamples%2Fgpt%2Fold%2Fdemo_native_cdn.html%3Fpbjs_debug%3Dtrue%26apn_debug_dongle%3DQWERTY%26apn_debug_member%3D9325&e=wqT_3QLDDKBDBgAAAwDWAAUBCLOJ8MYGEPy81OmKk4rxMRjGpKbEk569pU4qNgkAAAkCABEJBwgAABkJCQjgPyEJCQgAACkRCQAxCQnwdeA_MKHJlRA47UhA7UhIAFAAWKOUogFgAGie7cUBeACAAQGKAQCSAQNVU0SYAQGgAQGoAQGwAQC4AQLAAQDIAQLQAQDYAQDgAQDwAQCKAj51ZignYScsIDY1NjgyOTEsIDApO3VmKCdpJywgNzYyNDE2NSwgMCkFFDByJywgNTQ2MjU1MTgyBRbwkJICvQQhdzJndUJnaS03cmdkRU03aXZJUUNHQUFnbzVTaUFUQUFPQUJBQkVqdFNGQ2h5WlVRV0FCZ3pnRm9BSEFPZUxZWWdBRU9pQUcyR0pBQkFaZ0JBYUFCQWFnQkFiQUJBTGtCODYxcXBBQUFGRURCQWZPdGFxUUFBQlJBeVFFQUFBQUFBQUR3UDlrQkFBQUEBD3Q4RF9nQWVXcjBRUDFBUUFBb0VDWUFnQ2dBZ0cxQWcBIgRDOQkI8FVEQUFnRElBZ0RRQWc3WUFyWVk0QUlBNkFJQS1BSUFnQU1CbUFNQnVnTUpUbGxOTWpvME9UZzU0QU9xU29BRXVzNmdDWWdFa2ZxSkQ1QUVBSmdFQWNFRQFiCQEEREoVlSRBQUEyQVFBOFFRAQsJARxJZ0ZfU2FwQhETFFBBX3NRVQkcAQEITUVGAQcBAQxGRURKLigAADAuKAAETmsVKAH8sEJhRENIdkFGMmF2ZERQZ0Y0X0tRQTRJR0ExVlRSSWdHQUpBR0FaZ0dBS0VHQQFdJVwkQ29CZ1N5QmlRSgEQDQEAUg0IAQEAWgEFDQEAaA0IgEFBQUM0QmdyNEI3alRDUGdIb3RVSS1BZnQzQWo0QjZqcwEUFDhfd0lnUSV5AQFcVVFJZ0lBSkFJQUEuLpoCmQEha2hHel9ROkECLEtPVW9nRWdCQ2dBTTEhVEJSQU9nbE9XVTB5T2pRNU9EbEFxa3AVsQg4RDkdsQBCHbEAQh2xBEJwAYYJAQRCeAkIAQEQQjRBSWs1sPS2AThEOC7YAvfpA-ACrZhI6gKJAWh0dHA6Ly90ZXN0LmxvY2FsaG9zdDo5OTk5L2ludGVncmF0aW9uRXhhbXBsZXMvZ3B0L29sZC9kZW1vX25hdGl2ZV9jZG4uaHRtbD9wYmpzX2RlYnVnPXRydWUmYXBuX2RlYnVnX2RvbmdsZT1RV0VSVFkmYXBuX2RlYnVnX21lbWJlcj05MzI1gAMAiAMBkAMAmAMUoAMBqgMCSADAA-CoAcgDANgDAOADAOgDAPgDA4AEAJIEEi9vcGVucnRiMi9wcmViaWRqc5gEAKIEDjEwMC4xNC4xNjMuMjUwqATYRLIEDggAEAAYACAAMAA4AEIAuAQAwAQAyAQA0gQOOTMyNSNOWU0yOjQ5ODnaBAIIAOAEAPAEzuK8hAKIBQGYBQCgBf___________wGqBSQ0MDg4NzNiNS0wYjc1LTQzZjItYjQ5MC1iYTA1NDY2MjY1ZTfABQDJBQAAAAAAAPA_0gUJCQAAAAAAAAAA2AUB4AUB8AUB-gUECAAQAJAGAZgGALgGAMEGAAAAAAAA8L_QBvUv2gYWChAAAAAAAAAAAAAAAAABG2gQABgA4AYM8gYCCACABwGIBwCgB0HIBwDSBw8VYAEkECAA2gcGCfLwk-AHAOoHAggA8AeQ9aYDighhCl0AAAGZm3JbODHiKJitNR58Y2dfY5zgwmDRv3tHlzK7CcjgObpuCVaacbzPdO_QfKcItnFNoG8w42IJmIJHVCV8HuMp_RLWEmDWrySAxXkJtEURrwxI-pbXCxlIpQAQAZUIAACAP5gIAcAIANIIBggAEAAYANoIBAgAIADgCADoCAA.&s=98218facb1e5673b9630690b1a1b943ce1e978de"
              }
            }
          }],
          "seat": "9325"
        }],
        "bidid": "5186086519274374393",
        "cur": "USD",
        "ext": {
          "tmaxrequest": 150
        }
      },
      "headers": {}
    };

    it('should interpret a banner response', function () {
      const request = spec.buildRequests(bannerBidderRequest.bids, bannerBidderRequest)[0];
      const bids = spec.interpretResponse(bannerBidResponse, request);

      expect(bids).to.have.lengthOf(1);
      const bid = bids[0];
      expect(bid.mediaType).to.equal(BANNER);
      expect(bid.cpm).to.equal(1.5);
      expect(bid.ad).to.equal(bannerBidResponse.body.seatbid[0].bid[0].adm);
      expect(bid.meta.advertiser_id).to.equal(2529885);
    });

    if (FEATURES.VIDEO) {
      it('should interpret a video instream response', function () {
        const request = spec.buildRequests(videoInstreamBidderRequest.bids, videoInstreamBidderRequest)[0];
        const bids = spec.interpretResponse(videoInstreamBidResponse, request);
        expect(bids).to.have.lengthOf(1);
        const bid = bids[0];
        expect(bid.mediaType).to.equal(VIDEO);
        expect(bid.cpm).to.equal(10);
        expect(bid.vastUrl).to.equal(`${videoInstreamBidResponse.body.seatbid[0].bid[0].nurl}&redir=${encodeURIComponent(videoInstreamBidResponse.body.seatbid[0].bid[0].ext.appnexus.asset_url)}`);
        expect(bid.playerWidth).to.equal(640);
        expect(bid.playerHeight).to.equal(360);
        expect(bid.meta.advertiser_id).to.equal(6621028);
      });

      it('should interpret a video outstream response', function () {
        const request = spec.buildRequests(videoOutstreamBidderRequest.bids, videoOutstreamBidderRequest)[0];
        const bids = spec.interpretResponse(videoOutstreamBidResponse, request);
        expect(bids).to.have.lengthOf(1);
        const bid = bids[0];
        expect(bid.mediaType).to.equal(VIDEO);
        expect(bid.cpm).to.equal(25.00001);
        expect(bid.vastXml).to.equal(videoOutstreamBidResponse.body.seatbid[0].bid[0].adm);
        expect(bid.playerWidth).to.equal(640);
        expect(bid.playerHeight).to.equal(480);
        expect(bid.meta.advertiser_id).to.equal(10896419);
        expect(typeof bid.renderer.render).to.equal('function');
      });
    }

    if (FEATURES.NATIVE) {
      it('should interpret a native response', function () {
        const request = spec.buildRequests(nativeBidderRequest.bids, nativeBidderRequest)[0];
        const bids = spec.interpretResponse(nativeBidResponse, request);
        expect(bids).to.have.lengthOf(1);
        const bid = bids[0];
        expect(bid.mediaType).to.equal(NATIVE);
        expect(bid.cpm).to.equal(5);
        expect(bid.native.ortb.ver).to.equal('1.2');
        expect(bid.native.ortb.assets[0].id).to.equal(1);
        expect(bid.native.ortb.assets[0].img.url).to.equal('https://crcdn01.adnxs-simple.com/creative20/p/9325/2024/8/14/60018074/6ceb0f95-1465-4e90-b295-4b6e2aff3035.jpg');
        expect(bid.native.ortb.assets[0].img.w).to.equal(989);
        expect(bid.native.ortb.assets[0].img.h).to.equal(742);
        expect(bid.native.ortb.assets[1].id).to.equal(2);
        expect(bid.native.ortb.assets[1].title.text).to.equal('This is a AST Native Creative');
        expect(bid.native.ortb.assets[2].id).to.equal(3);
        expect(bid.native.ortb.assets[2].data.value).to.equal('AST');
        expect(bid.native.ortb.eventtrackers[0].event).to.equal(1);
        expect(bid.native.ortb.eventtrackers[0].method).to.equal(1);
        expect(bid.native.ortb.eventtrackers[0].url).to.contains(['https://nym2-ib.adnxs.com/it']);
      });
    }
  });

  describe('getUserSyncs', function () {
    it('should return an iframe sync if enabled and GDPR consent is given', function () {
      const syncOptions = {
        iframeEnabled: true
      };
      const gdprConsent = {
        gdprApplies: true,
        consentString: '...',
        vendorData: {
          purpose: {
            consents: {
              1: true
            }
          }
        }
      };
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(syncs).to.deep.equal([{
        type: 'iframe',
        url: 'https://acdn.adnxs.com/dmp/async_usersync.html'
      }]);
    });

    it('should return a pixel sync if enabled', function () {
      const syncOptions = {
        pixelEnabled: true
      };
      const syncs = spec.getUserSyncs(syncOptions, []);
      expect(syncs).to.not.be.empty;
      expect(syncs[0].type).to.equal('image');
    });
  });
});
