import {expect} from 'chai';
import {spec,
  buildSuccessNotification,
  buildErrorNotification,
  buildTimeoutNotification,
  sendNotification,
  getBidFloor
} from 'modules/tadvertisingBidAdapter';
import * as utils from '../../../src/utils.js';
import * as ajax from '../../../src/ajax.js';
import sinon from 'sinon';

describe('tadvertisingBidAdapter', () => {
  function getBid() {
    return {
      'bidder': 'tadvertising',
      'params': {
        'publisherId': '22222222',
        'placementId': '33333333',
      },
      'mediaTypes': {
        'banner': {
          'sizes': [
            [300, 250]
          ]
        }
      },
      'adUnitCode': 'adunit-code',
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };
  }

  function getBidderRequest() {
    return {
      "bidderCode": "tadvertising",
      "auctionId": "1d1a030790a475",
      "bidderRequestId": "22edbae2733bf6",
      "bids": [
        {
          "bidder": "tadvertising",
          "params": {
            "publisherId": "22222222",
            'placementId': '33333333',
          },
          "mediaTypes": {
            "banner": {
              "sizes": [
                [300, 250]
              ]
            }
          },
          "adUnitCode": "adunit-code",
          "bidId": "30b31c1838de1e",
          "bidderRequestId": "22edbae2733bf6",
          "auctionId": "1d1a030790a475"
        }
      ]
    }
  }

  describe('isBidRequestValid', function () {
    // Helper function to check if FEATURES.VIDEO is enabled
    function isVideoFeatureEnabled() {
      // Create a test bid with video
      let testBid = getBid();
      delete testBid.mediaTypes.banner;
      testBid.mediaTypes.video = {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [1, 2, 3],
        api: [1, 2],
        maxduration: 30
      };

      // Create the same bid but without maxduration
      let testBidNoMaxduration = JSON.parse(JSON.stringify(testBid));
      delete testBidNoMaxduration.mediaTypes.video.maxduration;

      // If FEATURES.VIDEO is enabled, validation should fail without maxduration
      // If not enabled, both should pass
      return spec.isBidRequestValid(testBid) && !spec.isBidRequestValid(testBidNoMaxduration);
    }

    const videoFeatureEnabled = isVideoFeatureEnabled();

    it('should return true when required parameters are defined', function () {
      expect(spec.isBidRequestValid(getBid())).to.equal(true);
    });

    it('should return false when publisherId not passed', function () {
      let bid = getBid();
      delete bid.params.publisherId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when placementId not passed', function () {
      let bid = getBid();
      delete bid.params.placementId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when publisherId is longer than 32 characters', function () {
      let bid = getBid();
      bid.params.publisherId = '111111111111111111111111111111111';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when neither mediaTypes.banner nor mediaTypes.video is present', function () {
      let bid = getBid();
      delete bid.mediaTypes.banner;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when mediaTypes.video is properly configured', function () {
      let bid = getBid();
      delete bid.mediaTypes.banner;
      bid.mediaTypes.video = {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [1, 2, 3],
        api: [1, 2],
        maxduration: 30
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    // Conditional tests based on FEATURES.VIDEO flag
    if (videoFeatureEnabled) {
      it('should return false when mediaTypes.video is missing maxduration (FEATURES.VIDEO enabled)', function () {
        let bid = getBid();
        delete bid.mediaTypes.banner;
        bid.mediaTypes.video = {
          context: 'instream',
          playerSize: [640, 480],
          mimes: ['video/mp4'],
          protocols: [1, 2, 3],
          api: [1, 2]
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false when mediaTypes.video.maxduration is not an integer (FEATURES.VIDEO enabled)', function () {
        let bid = getBid();
        delete bid.mediaTypes.banner;
        bid.mediaTypes.video = {
          context: 'instream',
          playerSize: [640, 480],
          mimes: ['video/mp4'],
          protocols: [1, 2, 3],
          api: [1, 2],
          maxduration: '30'
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false when mediaTypes.video is missing api (FEATURES.VIDEO enabled)', function () {
        let bid = getBid();
        delete bid.mediaTypes.banner;
        bid.mediaTypes.video = {
          context: 'instream',
          playerSize: [640, 480],
          mimes: ['video/mp4'],
          protocols: [1, 2, 3],
          maxduration: 30
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false when mediaTypes.video.api is an empty array (FEATURES.VIDEO enabled)', function () {
        let bid = getBid();
        delete bid.mediaTypes.banner;
        bid.mediaTypes.video = {
          context: 'instream',
          playerSize: [640, 480],
          mimes: ['video/mp4'],
          protocols: [1, 2, 3],
          api: [],
          maxduration: 30
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false when mediaTypes.video is missing mimes (FEATURES.VIDEO enabled)', function () {
        let bid = getBid();
        delete bid.mediaTypes.banner;
        bid.mediaTypes.video = {
          context: 'instream',
          playerSize: [640, 480],
          protocols: [1, 2, 3],
          api: [1, 2],
          maxduration: 30
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false when mediaTypes.video.mimes is an empty array (FEATURES.VIDEO enabled)', function () {
        let bid = getBid();
        delete bid.mediaTypes.banner;
        bid.mediaTypes.video = {
          context: 'instream',
          playerSize: [640, 480],
          mimes: [],
          protocols: [1, 2, 3],
          api: [1, 2],
          maxduration: 30
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false when mediaTypes.video is missing protocols (FEATURES.VIDEO enabled)', function () {
        let bid = getBid();
        delete bid.mediaTypes.banner;
        bid.mediaTypes.video = {
          context: 'instream',
          playerSize: [640, 480],
          mimes: ['video/mp4'],
          api: [1, 2],
          maxduration: 30
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
    } else {
      it('should skip video validation when FEATURES.VIDEO is not enabled', function() {
        let bid = getBid();
        delete bid.mediaTypes.banner;
        bid.mediaTypes.video = {
          context: 'instream',
          playerSize: [640, 480]
          // Missing required fields, but should still pass if FEATURES.VIDEO is not enabled
        };
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });
    }
  });

  describe('buildRequests', function () {
    function getConvertedBidRequest() {
      return {
        "imp": [
          {
            "id": "30b31c1838de1e",
            "banner": {
              "topframe": 0,
              "format": [
                {
                  "w": 300,
                  "h": 250
                }
              ]
            },
            "secure": 1
          }
        ],
        "id": "test_id",
        "test": 0
      }
    }

    it('should return a valid bid request', function () {
      const request = spec.buildRequests(getBid(), getBidderRequest());
      const data = request.data;
      const expected = getConvertedBidRequest()

      expect(request.method).to.equal('POST');
      expect(data.imp.id).to.equal(expected.imp.id);
      expect(data.imp.banner).to.equal(expected.imp.banner);
    })

    it('should set imp.0.bidfloor and imp.0.bidfloorcur when bidFloor is present', function () {
      let bidderRequest = getBidderRequest();
      bidderRequest.bids[0].params.bidfloor = 1.5;
      const request = spec.buildRequests(getBid(), bidderRequest);
      const data = request.data;

      expect(data.imp[0].bidfloor).to.equal(1.5);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
    })

    it('should set imp.0.bidfloor and imp.0.bidfloorcur when getFloor returns valid floor', function () {
      let bidderRequest = getBidderRequest();
      bidderRequest.bids[0].getFloor = function() {
        return {
          floor: 2.5,
          currency: 'USD'
        };
      };
      const request = spec.buildRequests(getBid(), bidderRequest);
      const data = request.data;

      expect(data.imp[0].bidfloor).to.equal(2.5);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
    })

    it('should set placementId on every impression on bids', function() {
      let bidderRequest = getBidderRequest();
      let bid1 = getBid()
      bid1.bidId = '123'
      bid1.params.placementId = '111'

      let bid2 = getBid()
      bid2.bidId = '456'
      bid2.params.placementId = '222'

      bidderRequest.bids = [bid1, bid2]

      const request = spec.buildRequests([bid1, bid2], bidderRequest);
      const data = request.data;

      expect(data.imp[0].ext.gpid).to.equal(bidderRequest.bids[0].params.placementId);
      expect(data.imp[1].ext.gpid).to.equal(bidderRequest.bids[1].params.placementId);
    })

    it('should add unified ID info to user.ext.eids in the request', function () {
      let bidderRequest = getBidderRequest();
      let bid1 = bidderRequest.bids[0]
      bid1.userIdAsEids = [
        {
          source: 'adserver.org',
          uids: [
            {
              atype: 1,
              ext: {
                rtiPartner: 'TDID'
              },
              id: '00000000-0000-0000-0000-000000000000'
            }
          ]
        }
      ];

      const expectedEids = bid1.userIdAsEids

      const request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      const data = request.data;

      expect(data.user.ext.eids).to.deep.equal(expectedEids)
    })
  });

  describe('interpretResponse', function () {
    function getBidderResponse() {
      return { body: {
        "id": "10b1e33f-fddc-4621-a472-d7bff0529cbf",
        "cur": "USD",
        "impid": "38c219964ca1998",
        "seatbid": [
          {
            "bid": [
              {
                "id": "1",
                "impid": "38c219964ca1998",
                "price": 0.78740156,
                "adm": "<html><h3>I am an ad</h3></html>",
                "cid": "ay35w7m",
                "crid": "id8tke3f",
                "adomain": [
                  "emetriq.com"
                ],
                "cat": [
                  "IAB2",
                  "IAB2-3"
                ],
                "h": 250,
                "w": 300,
                "mtype": 1
              }
            ],
            "seat": "2271"
          }
        ]
      }
      }
    }

    it('should return an empty array when there is no body', function () {
      const bidderRequest = getBidderRequest();
      const bidRequest = spec.buildRequests([], bidderRequest);

      const emptyArray = spec.interpretResponse({body: {}}, bidRequest);

      expect(emptyArray).to.deep.equal([]);
    })

    it('should return successful bid', function () {
      const bidderRequest = getBidderRequest();
      const bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
      const bidderResponse = getBidderResponse();
      const interpretedBids = spec.interpretResponse(bidderResponse, bidRequest);
      const bid = interpretedBids[0];

      expect(bid.mediaType).to.deep.equal("banner");
      expect(bid.ttl).to.equal(360);
      expect(bid.netRevenue).to.equal(true);
      expect(bid.currency).to.deep.equal("USD");
      expect(bid.dealId).to.equal(null);
    })

    it('should set currency to usd when response.body.curr is null', function () {
      const bidderRequest = getBidderRequest();
      const bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
      const bidderResponse = getBidderResponse();
      bidderResponse.body.cur = null;
      const interpretedBids = spec.interpretResponse(bidderResponse, bidRequest);
      const bid = interpretedBids[0];

      expect(bid.currency).to.deep.equal("USD");
    })

    it('should set mediaType to video ', function () {
      const bidderRequest = getBidderRequest();
      const bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
      let bidderResponse = getBidderResponse();

      bidderResponse.body.seatbid[0].bid[0].adm = '<VAST version="3.0">testvast1</VAST>';
      bidderResponse.body.seatbid[0].bid[0].mtype = 2;

      const interpretedBids = spec.interpretResponse(bidderResponse, bidRequest);
      const bid = interpretedBids[0];

      expect(bid.mediaType).to.deep.equal("video");
    })

    it('should return empty array when response has no body', function () {
      const bidderRequest = getBidderRequest();
      const bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
      const bidderResponse = { body: {} };

      const interpretedBids = spec.interpretResponse(bidderResponse, bidRequest);

      expect(interpretedBids).to.deep.equal([]);
    })

    it('should return empty array when response has only id and ext.uss', function () {
      const bidderRequest = getBidderRequest();
      const bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
      const bidderResponse = { body: { id: '10b1e33f-fddc-4621-a472-d7bff0529cbf', ext: { uss: 1 } } };

      const interpretedBids = spec.interpretResponse(bidderResponse, bidRequest);

      expect(interpretedBids).to.deep.equal([]);
    })
  });

  describe('getUserSyncs', function() {
    function getGdprConsent() {
      return {
        "consentString": "CQTJuAAQTJuAAB7FlCENBvFsAP_gAEPgAAAALSNT_G__bWlr-T73aftkeYxP9_h77sQxBgbJE-4FzLvW_JwXx2E5NAzatqIKmRIAu3TBIQNlHJDURVCgaogVryDMaEyUoTNKJ6BkiBMRI2NYCFxvm4tjeQCY5vr991c1mB-t7dr83dzyy4hHn3a5_2S1WJCdAYetDfv8ZBKT-9IMd_x8v4v4_F7pE2-eS1n_pGvp6D9-YnM_9B299_bbffzPn__ql_-_X_vf_n37v943n77v___BaAAEw0KiCMsiAEIlAwggQAKCsICKBAEAACQNEBACYMCnIGAC6wkQAgBQADBACAAEGAAIAABIAEIgAoAKBAABAIFAAGABAMBAAwMAAYALAQCAAEB0DFMCCAQLABIzIoNMCUABIICWyoQSAIEFcIQizwCCBETBQAAAgAFAQAAPBYDEkgJWJBAFxBNAAAQAABRAgQIpGzAEFAZstBeDJ9GRpgGD5gmaUwDIAiCMjJNiE37TDxyFEKAA",
        "vendorData": {
          "gdprApplies": true,
          "purpose": {
            "consents": {
              "1": true,
              "2": true,
              "3": true,
              "4": true,
              "5": true,
              "6": true,
              "7": true,
              "8": true,
              "9": true,
              "10": true,
              "11": true
            },
          },
          "vendor": {
            "consents": {
              "21": true,
              "213": true,
            },
          },
        },
        "gdprApplies": true,
        "apiVersion": 2
      }
    }

    it('should return an empty array when sync is enabled but there are no bidResponses', function () {
      let result = spec.getUserSyncs({ pixelEnabled: true }, [], getGdprConsent())

      expect(result).to.have.length(0);
    });

    it('should return an empty array with when sync is not enabled', function () {
      let serverResponse = {body: {ext: { uss: 0}}};
      let result = spec.getUserSyncs({ pixelEnabled: true }, [serverResponse], getGdprConsent())

      expect(result).to.have.length(0);
    });

    it('should return an empty array with when purpose one is not consented', function () {
      let serverResponse = {body: {ext: { uss: 1}}};
      let consent = getGdprConsent()
      consent.vendorData.purpose.consents[1] = false;

      let result = spec.getUserSyncs({ pixelEnabled: true }, [serverResponse], consent)

      expect(result).to.have.length(0);
    });

    it('should return an array with sync if purpose and venders are consented', function () {
      let serverResponse = {body: {ext: { uss: 1}}};
      let result = spec.getUserSyncs({ pixelEnabled: true }, [serverResponse], getGdprConsent())

      expect(result).to.have.length(1);
    });

    it('should return url with gdpr_consent string only', function () {
      let serverResponse = {body: {ext: { uss: 1}}};
      let gdprConsent = getGdprConsent();
      gdprConsent.gdprApplies = null;

      let result = spec.getUserSyncs({ pixelEnabled: true }, [serverResponse], gdprConsent)

      expect(result).to.have.length(1);
      expect(result[0].url).is.equal(spec.sync_url + '&gdpr_consent=CQTJuAAQTJuAAB7FlCENBvFsAP_gAEPgAAAALSNT_G__bWlr-T73aftkeYxP9_h77sQxBgbJE-4FzLvW_JwXx2E5NAzatqIKmRIAu3TBIQNlHJDURVCgaogVryDMaEyUoTNKJ6BkiBMRI2NYCFxvm4tjeQCY5vr991c1mB-t7dr83dzyy4hHn3a5_2S1WJCdAYetDfv8ZBKT-9IMd_x8v4v4_F7pE2-eS1n_pGvp6D9-YnM_9B299_bbffzPn__ql_-_X_vf_n37v943n77v___BaAAEw0KiCMsiAEIlAwggQAKCsICKBAEAACQNEBACYMCnIGAC6wkQAgBQADBACAAEGAAIAABIAEIgAoAKBAABAIFAAGABAMBAAwMAAYALAQCAAEB0DFMCCAQLABIzIoNMCUABIICWyoQSAIEFcIQizwCCBETBQAAAgAFAQAAPBYDEkgJWJBAFxBNAAAQAABRAgQIpGzAEFAZstBeDJ9GRpgGD5gmaUwDIAiCMjJNiE37TDxyFEKAA')
    })

    it('should return empty sync array when pixel is not enabled', function () {
      let serverResponse = {body: {ext: { uss: 1}}};
      let gdprConsent = getGdprConsent();
      gdprConsent.gdprApplies = false;

      let result = spec.getUserSyncs({ pixelEnabled: false }, [serverResponse], gdprConsent)

      expect(result).is.empty;
    });
  });

  describe('buildSuccessNotification', function() {
    it('should build correct BidResponseNotification', function() {
      let bidderRequest = {
        "params": [
          {
            "publisherId": "publisher123",
            "placementId": "placement456"
          }
        ],
        "adId": "ad789",
        "auctionId": "auction101112",
        "adUnitCode": "adunit131415",
        "requestId": "request161718",
        "cpm": 1.25,
        "currency": "USD",
        "creativeId": "creative192021",
        "size": "300x250",
        "dealId": "deal222324",
        "mediaType": "banner",
        "status": "rendered",
        "timeToRespond": 250
      }
      let result = buildSuccessNotification(bidderRequest)

      expect(result).to.deep.equal({
        "adId": "ad789",
        "adUnitCode": "adunit131415",
        "auctionId": "auction101112",
        "bidId": "ad789",
        "cpm": 1.25,
        "creativeId": "creative192021",
        "currency": "USD",
        "dealId": "deal222324",
        "mediaType": "banner",
        "placementId": "placement456",
        "publisherId": "publisher123",
        "size": "300x250",
        "status": "rendered",
        "ttr": 250
      });
    });
  });

  describe('buildErrorNotification', function() {
    it('should build correct BidErrorResponseNotification', function() {
      let bidderRequest = {
        "bids": [
          {
            "params": {
              "publisherId": "publisher123",
              "placementId": "placement456"
            },
            "bidId": "bid789",
            "adUnitCode": "adunit101112"
          }
        ],
        "auctionId": "auction131415",
        "refererInfo": {
          "page": "https://example.com/page"
        },
        "timeout": 3000
      }

      let error = {
        "timedOut": false,
        "status": 404,
        "responseText": "Resource not found"
      }
      let result = buildErrorNotification(bidderRequest, error)

      expect(result).to.deep.equal({
        "publisherId": "publisher123",
        "placementId": "placement456",
        "bidId": "bid789",
        "auctionId": "auction131415",
        "adUnitCode": "adunit101112",
        "page": "https://example.com/page",
        "timeout": 3000,
        "timedOut": false,
        "statusCode": 404,
        "response": "Resource not found"
      });
    });

    it('should build correct BidErrorResponseNotification with alternative structure', function() {
      let bidderRequest = {
        "bids": [
          {
            "params": [{
              "publisherId": "publisher123",
              "placementId": "placement456"
            }],
            "bidId": "bid789",
            "adUnitCode": "adunit101112"
          }
        ],
        "auctionId": "auction131415",
        "refererInfo": {
          "page": "https://example.com/page"
        },
        "timeout": 3000
      }

      let error = {
        "timedOut": false,
        "status": 404,
        "responseText": "Resource not found"
      }
      let result = buildErrorNotification(bidderRequest, error)

      expect(result).to.deep.equal({
        "publisherId": "publisher123",
        "placementId": "placement456",
        "bidId": "bid789",
        "auctionId": "auction131415",
        "adUnitCode": "adunit101112",
        "page": "https://example.com/page",
        "timeout": 3000,
        "timedOut": false,
        "statusCode": 404,
        "response": "Resource not found"
      });
    });

    it('should build correctly when error is not present', function() {
      let bidderRequest = {
        "bids": [
          {
            "params": [{
              "publisherId": "publisher123",
              "placementId": "placement456"
            }],
            "bidId": "bid789",
            "adUnitCode": "adunit101112"
          }
        ],
        "auctionId": "auction131415",
        "refererInfo": {
          "page": "https://example.com/page"
        },
        "timeout": 3000
      }

      let result = buildErrorNotification(bidderRequest)

      expect(result).to.deep.equal({
        "publisherId": "publisher123",
        "placementId": "placement456",
        "bidId": "bid789",
        "auctionId": "auction131415",
        "adUnitCode": "adunit101112",
        "page": "https://example.com/page",
        "timeout": 3000,
      });
    })
  });

  describe('buildTimeoutNotification', function() {
    it('should build correct BidTimeoutNotification', function() {
      let bid = {
        "params": [
          {
            "publisherId": "publisher123",
            "placementId": "placement456"
          }
        ],
        "bidId": "bid789",
        "auctionId": "auction101112",
        "adUnitCode": "adunit131415",
        "ortb2": {
          "site": {
            "page": "https://example.com/page"
          }
        },
        "timeout": 3000
      }
      let result = buildTimeoutNotification(bid)

      expect(result).to.deep.equal({
        "publisherId": "publisher123",
        "placementId": "placement456",
        "bidId": "bid789",
        "auctionId": "auction101112",
        "adUnitCode": "adunit131415",
        "page": "https://example.com/page",
        "timeout": 3000
      });
    });
  });

  describe('sendNotification', function() {
    let sendBeaconStub;
    let ajaxStub;
    let logErrorStub;

    beforeEach(function() {
      spec.notify_url = 'https://test.com/notify';
      sendBeaconStub = sinon.stub(ajax, 'sendBeacon');
      ajaxStub = sinon.stub(ajax, 'ajax');
      logErrorStub = sinon.stub(utils, 'logError');
    });

    afterEach(function() {
      sendBeaconStub.restore();
      ajaxStub.restore();
      logErrorStub.restore();
    });

    it('should send notification using sendBeacon when it is supported', function() {
      const eventType = 'test';
      const data = { test: 'data' };
      sendBeaconStub.returns(true);

      sendNotification(spec.notify_url, eventType, data);

      expect(sendBeaconStub.calledOnce).to.be.true;
      expect(sendBeaconStub.firstCall.args[0]).to.equal(spec.notify_url + '/test');
      expect(sendBeaconStub.firstCall.args[1]).to.equal(JSON.stringify(data));
      expect(ajaxStub.called).to.be.false;
    });

    it('should fallback to ajax when sendBeacon fails', function() {
      const eventType = 'test';
      const data = { test: 'data' };
      sendBeaconStub.returns(false);

      sendNotification(spec.notify_url, eventType, data);

      expect(sendBeaconStub.calledOnce).to.be.true;
      expect(ajaxStub.calledOnce).to.be.true;
      expect(ajaxStub.firstCall.args[0]).to.equal(spec.notify_url + '/test');
      expect(ajaxStub.firstCall.args[2]).to.equal(JSON.stringify(data));
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({
        method: 'POST',
        contentType: 'text/plain',
        keepalive: true,
      });
    });

    it('should log error when an exception occurs', function() {
      const eventType = 'test';
      const data = { test: 'data' };
      const error = new Error('Test error');
      sendBeaconStub.throws(error);

      sendNotification(spec.notify_url, eventType, data);

      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.equal('tadvertising');
      expect(logErrorStub.firstCall.args[1]).to.equal('Failed to notify event: test');
      expect(logErrorStub.firstCall.args[2]).to.equal(error);
    });
  });

  describe('onBidWon', function() {
    let sandbox;
    let buildSuccessNotificationSpy;

    beforeEach(function() {
      spec.notify_url = 'https://test.com/notify';
      sandbox = sinon.createSandbox();

      // Create spies on the module functions
      buildSuccessNotificationSpy = sandbox.spy(spec, 'onBidWon');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should call onBidWon with correct parameters', function() {
      const bid = {
        adId: 'test-ad-id',
        auctionId: 'test-auction-id',
        cpm: 1.5
      };

      spec.onBidWon(bid);

      expect(buildSuccessNotificationSpy.calledOnce).to.be.true;
      expect(buildSuccessNotificationSpy.firstCall.args[0]).to.equal(bid);
    });
  });

  describe('onBidBillable', function() {
    let sandbox;
    let onBidBillableSpy;

    beforeEach(function() {
      spec.notify_url = 'https://test.com/notify';
      sandbox = sinon.createSandbox();
      onBidBillableSpy = sandbox.spy(spec, 'onBidBillable');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should call onBidBillable with correct parameters', function() {
      const bid = {
        adId: 'test-ad-id',
        auctionId: 'test-auction-id',
        cpm: 1.5,
        burl: 'https://example.com/burl?price=${AUCTION_PRICE}'
      };

      spec.onBidBillable(bid);

      expect(onBidBillableSpy.calledOnce).to.be.true;
      expect(onBidBillableSpy.firstCall.args[0]).to.equal(bid);
    });
  });

  describe('onTimeout', function() {
    let sandbox;
    let onTimeoutSpy;

    beforeEach(function() {
      spec.notify_url = 'https://test.com/notify';
      sandbox = sinon.createSandbox();
      onTimeoutSpy = sandbox.spy(spec, 'onTimeout');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should call onTimeout with correct parameters', function() {
      const timeoutData = [
        { bidId: 'bid1', timeout: 1000 },
        { bidId: 'bid2', timeout: 2000 }
      ];

      spec.onTimeout(timeoutData);

      expect(onTimeoutSpy.calledOnce).to.be.true;
      expect(onTimeoutSpy.firstCall.args[0]).to.equal(timeoutData);
    });
  });

  describe('onBidderError', function() {
    let sandbox;
    let onBidderErrorSpy;

    beforeEach(function() {
      spec.notify_url = 'https://test.com/notify';
      sandbox = sinon.createSandbox();
      onBidderErrorSpy = sandbox.spy(spec, 'onBidderError');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should call onBidderError with correct parameters', function() {
      const error = new Error('Test error');
      const bidderRequest = {
        bidderCode: 'tadvertising',
        bids: [{ bidId: 'test-bid-id' }]
      };

      spec.onBidderError({ error, bidderRequest });

      expect(onBidderErrorSpy.calledOnce).to.be.true;
      expect(onBidderErrorSpy.firstCall.args[0]).to.deep.equal({ error, bidderRequest });
    });
  });

  describe('getBidFloor', function() {
    it('should return bid.params.bidfloor when it exists', function() {
      const bid = {
        params: {
          bidfloor: 0.5
        }
      };

      const result = getBidFloor(bid);

      expect(result).to.equal(0.5);
    });

    it('should return null when bid.getFloor is not a function', function() {
      const bid = {
        params: {}
      };

      const result = getBidFloor(bid);

      expect(result).to.be.null;
    });

    it('should return floor.floor when bid.getFloor returns valid floor object', function() {
      const bid = {
        params: {},
        getFloor: function() {
          return {
            floor: 1.0,
            currency: 'USD'
          };
        }
      };

      const result = getBidFloor(bid);

      expect(result).to.equal(1.0);
    });

    it('should return null when bid.getFloor returns object with non-USD currency', function() {
      const bid = {
        params: {},
        getFloor: function() {
          return {
            floor: 1.0,
            currency: 'EUR'
          };
        }
      };

      const result = getBidFloor(bid);

      expect(result).to.be.null;
    });

    it('should return null when bid.getFloor returns object with NaN floor', function() {
      const bid = {
        params: {},
        getFloor: function() {
          return {
            floor: NaN,
            currency: 'USD'
          };
        }
      };

      const result = getBidFloor(bid);

      expect(result).to.be.null;
    });

    it('should return null when bid.getFloor returns non-object', function() {
      const bid = {
        params: {},
        getFloor: function() {
          return "not an object";
        }
      };

      const result = getBidFloor(bid);

      expect(result).to.be.null;
    });
  });
})
