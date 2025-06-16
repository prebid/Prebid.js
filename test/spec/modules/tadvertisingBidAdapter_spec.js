import {expect} from 'chai';
import {spec} from 'modules/tadvertisingBidAdapter';

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

    it('should set user.buyeruid when userId.tdid is present', function () {
      let bidderRequest = getBidderRequest();
      bidderRequest.bids[0].userId = {tdid: '1234567890'};
      const request = spec.buildRequests(getBid(), bidderRequest);
      const data = request.data;

      expect(data.user.buyeruid).to.equal(bidderRequest.bids[0].userId.tdid);
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
  });

  describe('getUserSyncs', function() {
    function getGdprConsent() {
      return {
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
  });
})
