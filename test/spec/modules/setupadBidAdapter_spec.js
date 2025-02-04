import { spec, biddersCreativeIds } from 'modules/setupadBidAdapter.js';

describe('SetupadAdapter', function () {
  const userIdAsEids = [
    {
      source: 'pubcid.org',
      uids: [
        {
          atype: 1,
          id: '01EAJWWNEPN3CYMM5N8M5VXY22',
        },
      ],
    },
  ];

  const bidRequests = [
    {
      adUnitCode: 'test-div',
      auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      bidId: '22c4871113f461',
      bidder: 'rubicon',
      bidderRequestId: '15246a574e859f',
      uspConsent: 'usp-context-string',
      gdprConsent: {
        consentString: 'BOtmiBKOtmiBKABABAENAFAAAAACeAAA',
        gdprApplies: true,
      },
      params: {
        placement_id: '123',
        account_id: 'test-account-id',
      },
      sizes: [[300, 250]],
      ortb2: {
        device: {
          w: 1500,
          h: 1000,
        },
        site: {
          domain: 'test.com',
          page: 'http://test.com',
        },
      },
      userIdAsEids,
    },
    {
      adUnitCode: 'test-div-2',
      auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      bidId: '22c4871113f461',
      bidder: 'rubicon',
      bidderRequestId: '15246a574e859f',
      uspConsent: 'usp-context-string',
      gdprConsent: {
        consentString: 'BOtmiBKOtmiBKABABAENAFAAAAACeAAA',
        gdprApplies: true,
      },
      params: {
        placement_id: '123',
        account_id: 'test-account-id',
      },
      sizes: [[300, 250]],
      ortb2: {
        device: {
          w: 1500,
          h: 1000,
        },
        site: {
          domain: 'test.com',
          page: 'http://test.com',
        },
      },
      userIdAsEids,
    },
  ];

  const bidderRequest = {
    auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
    auctionStart: 1579746300522,
    bidderCode: 'setupad',
    bidderRequestId: '15246a574e859f',
    bids: [
      {
        adUnitCode: 'test-div',
        auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
        bidId: '22c4871113f461',
        bidder: 'rubicon',
        bidderRequestId: '15246a574e859f',
        uspConsent: 'usp-context-string',
        gdprConsent: {
          consentString: 'BOtmiBKOtmiBKABABAENAFAAAAACeAAA',
          gdprApplies: true,
        },
        params: {
          placement_id: '123',
          account_id: 'test-account-id',
        },
        sizes: [[300, 250]],
        ortb2: {
          device: {
            w: 1500,
            h: 1000,
          },
          site: {
            domain: 'test.com',
            page: 'http://test.com',
          },
        },
        userIdAsEids,
      },
      {
        adUnitCode: 'test-div-2',
        auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
        bidId: '22c4871113f461',
        bidder: 'rubicon',
        bidderRequestId: '15246a574e859f',
        uspConsent: 'usp-context-string',
        gdprConsent: {
          consentString: 'BOtmiBKOtmiBKABABAENAFAAAAACeAAA',
          gdprApplies: true,
        },
        params: {
          placement_id: '123',
          account_id: 'test-account-id',
        },
        sizes: [[300, 250]],
        ortb2: {
          device: {
            w: 1500,
            h: 1000,
          },
          site: {
            domain: 'test.com',
            page: 'http://test.com',
          },
        },
        userIdAsEids,
      },
    ],
    gdprConsent: {
      consentString: 'BOtmiBKOtmiBKABABAENAFAAAAACeAAA',
      vendorData: {},
      gdprApplies: true,
    },
    ortb2: {
      device: {
        w: 1500,
        h: 1000,
      },
    },
    refererInfo: {
      canonicalUrl: null,
      domain: 'test.com',
      page: 'http://test.com',
      referer: null,
    },
  };

  const serverResponse = {
    body: {
      seatbid: [
        {
          bid: [{ crid: 123 }, { crid: 1234 }],
          seat: 'pubmatic',
        },
        {
          bid: [{ crid: 12345 }],
          seat: 'setupad',
        },
      ],
    },
    testCase: 1,
  };

  describe('isBidRequestValid', function () {
    const bid = {
      bidder: 'setupad',
      params: {
        placement_id: '123',
        account_id: '123',
      },
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when placement_id is missing', function () {
      const bidWithoutPlacementId = { ...bid };
      delete bidWithoutPlacementId.params.placement_id;
      expect(spec.isBidRequestValid(bidWithoutPlacementId)).to.equal(false);
    });

    it('should return false when account_id is missing', function () {
      const bidWithoutAccountId = { ...bid };
      delete bidWithoutAccountId.params.account_id;
      expect(spec.isBidRequestValid(bidWithoutAccountId)).to.equal(false);
    });

    it('should return false when required params are not passed', function () {
      delete bid.params.placement_id;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should return correct storedrequest id for bids if placement_id is provided', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[0].ext.prebid.storedrequest.id).to.equal('123');
    });

    it('should return correct storedrequest id if account_id is provided', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.ext.prebid.storedrequest.id).to.equal('test-account-id');
    });

    it('should return setupad custom adapter param', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.setupad).to.equal('adapter');
    });

    // Change this to 1 whenever TEST_REQUEST = 1. This is allowed only for testing requests locally
    it('should return correct test attribute value from global value', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.test).to.equal(0);
    });
  });

  describe('getUserSyncs', () => {
    it('should return user sync', () => {
      const syncOptions = {
        iframeEnabled: true,
        pixelEnabled: true,
      };
      const responses = [
        {
          body: {
            ext: {
              responsetimemillis: {
                'test seat 1': 2,
                'test seat 2': 1,
              },
            },
          },
        },
      ];
      const gdprConsent = {
        gdprApplies: 1,
        consentString: 'dkj49Sjmfjuj34as:12jaf90123hufabidfy9u23brfpoig',
      };
      const uspConsent = 'mkjvbiniwot4827obfoy8sdg8203gb';
      const expectedUserSyncs = [
        {
          type: 'iframe',
          url: 'https://cookie.stpd.cloud/sync?bidders=%5B%22test%20seat%201%22%2C%22test%20seat%202%22%5D&gdpr=1&gdpr_consent=dkj49Sjmfjuj34as:12jaf90123hufabidfy9u23brfpoig&usp_consent=mkjvbiniwot4827obfoy8sdg8203gb&type=iframe',
        },
      ];

      const userSyncs = spec.getUserSyncs(syncOptions, responses, gdprConsent, uspConsent);

      expect(userSyncs).to.deep.equal(expectedUserSyncs);
    });

    it('should return empty user syncs when responsetimemillis is not defined', () => {
      const syncOptions = {
        iframeEnabled: true,
        pixelEnabled: true,
      };
      const responses = [
        {
          body: {
            ext: {},
          },
        },
      ];
      const gdprConsent = {
        gdprApplies: 1,
        consentString: 'dkj49Sjmfjuj34as:12jaf90123hufabidfy9u23brfpoig',
      };
      const uspConsent = 'mkjvbiniwot4827obfoy8sdg8203gb';
      const expectedUserSyncs = [];

      const userSyncs = spec.getUserSyncs(syncOptions, responses, gdprConsent, uspConsent);

      expect(userSyncs).to.deep.equal(expectedUserSyncs);
    });
  });

  describe('interpretResponse', function () {
    it('should return empty array if error during parsing', () => {
      const wrongServerResponse = 'wrong data';
      let request = spec.buildRequests(bidRequests, bidderRequest);
      let result = spec.interpretResponse(wrongServerResponse, request);

      expect(result).to.be.instanceof(Array);
      expect(result.length).to.equal(0);
    });

    it('should update biddersCreativeIds correctly', function () {
      spec.interpretResponse(serverResponse, bidderRequest);

      expect(biddersCreativeIds).to.deep.equal({
        123: 'pubmatic',
        1234: 'pubmatic',
        12345: 'setupad',
      });
    });
  });

  describe('onBidWon', function () {
    it('should stop if bidder is not equal to BIDDER_CODE', function () {
      const bid = {
        bidder: 'rubicon',
      };
      const result = spec.onBidWon(bid);
      expect(result).to.be.undefined;
    });

    it('should stop if bid.params is not provided', function () {
      const bid = {
        bidder: 'setupad',
      };
      const result = spec.onBidWon(bid);
      expect(result).to.be.undefined;
    });

    it('should stop if bid.params is empty array', function () {
      const bid = {
        bidder: 'setupad',
        params: [],
      };
      const result = spec.onBidWon(bid);
      expect(result).to.be.undefined;
    });

    it('should stop if bid.params is not array', function () {
      expect(
        spec.onBidWon({
          bidder: 'setupad',
          params: {},
        })
      ).to.be.undefined;

      expect(
        spec.onBidWon({
          bidder: 'setupad',
          params: 'test',
        })
      ).to.be.undefined;

      expect(
        spec.onBidWon({
          bidder: 'setupad',
          params: 1,
        })
      ).to.be.undefined;

      expect(
        spec.onBidWon({
          bidder: 'setupad',
          params: null,
        })
      ).to.be.undefined;

      expect(
        spec.onBidWon({
          bidder: 'setupad',
          params: undefined,
        })
      ).to.be.undefined;
    });

    it('should stop if bid.params.placement_id is not provided', function () {
      const bid = {
        bidder: 'setupad',
        params: [{ account_id: 'test' }],
      };
      const result = spec.onBidWon(bid);
      expect(result).to.be.undefined;
    });

    it('should stop if bid.params is not provided and bid.bids is not an array', function () {
      const bid = {
        bidder: 'setupad',
        params: undefined,
        bids: {},
      };
      const result = spec.onBidWon(bid);
      expect(result).to.be.undefined;
    });
  });
});
