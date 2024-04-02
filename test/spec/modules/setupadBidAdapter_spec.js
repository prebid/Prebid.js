import { spec } from 'modules/setupadBidAdapter.js';

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
  ];

  const bidderRequest = {
    ortb2: {
      device: {
        w: 1500,
        h: 1000,
      },
    },
    refererInfo: {
      domain: 'test.com',
      page: 'http://test.com',
      ref: '',
    },
  };

  const serverResponse = {
    body: {
      id: 'f7b3d2da-e762-410c-b069-424f92c4c4b2',
      seatbid: [
        {
          bid: [
            {
              id: 'test-bid-id',
              price: 0.8,
              adm: 'this is an ad',
              adid: 'test-ad-id',
              adomain: ['test.addomain.com'],
              w: 300,
              h: 250,
            },
          ],
          seat: 'testBidder',
        },
      ],
      cur: 'USD',
      ext: {
        sync: {
          image: ['urlA?gdpr={{.GDPR}}'],
          iframe: ['urlB'],
        },
      },
    },
  };

  describe('isBidRequestValid', function () {
    const bid = {
      bidder: 'setupad',
      params: {
        placement_id: '123',
      },
    };
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return false when required params are not passed', function () {
      delete bid.params.placement_id;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('check request params with GDPR and USP', function () {
      const request = spec.buildRequests(bidRequests, bidRequests[0]);
      expect(JSON.parse(request[0].data).user.ext.consent).to.equal(
        'BOtmiBKOtmiBKABABAENAFAAAAACeAAA'
      );
      expect(JSON.parse(request[0].data).regs.ext.gdpr).to.equal(1);
      expect(JSON.parse(request[0].data).regs.ext.us_privacy).to.equal('usp-context-string');
    });

    it('check request params without GDPR', function () {
      let bidRequestsWithoutGDPR = Object.assign({}, bidRequests[0]);
      delete bidRequestsWithoutGDPR.gdprConsent;
      const request = spec.buildRequests([bidRequestsWithoutGDPR], bidRequestsWithoutGDPR);
      expect(JSON.parse(request[0].data).regs.ext.gdpr).to.be.undefined;
      expect(JSON.parse(request[0].data).regs.ext.us_privacy).to.equal('usp-context-string');
    });

    it('should return correct storedrequest id if account_id is provided', function () {
      const request = spec.buildRequests(bidRequests, bidRequests[0]);
      expect(JSON.parse(request[0].data).ext.prebid.storedrequest.id).to.equal('test-account-id');
    });

    it('should return correct storedrequest id if account_id is not provided', function () {
      let bidRequestsWithoutAccountId = Object.assign({}, bidRequests[0]);
      delete bidRequestsWithoutAccountId.params.account_id;
      const request = spec.buildRequests(
        [bidRequestsWithoutAccountId],
        bidRequestsWithoutAccountId
      );
      expect(JSON.parse(request[0].data).ext.prebid.storedrequest.id).to.equal('default');
    });

    it('validate generated params', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request[0].bidId).to.equal('22c4871113f461');
      expect(JSON.parse(request[0].data).id).to.equal('15246a574e859f');
    });

    it('check if correct site object was added', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const siteObj = JSON.parse(request[0].data).site;

      expect(siteObj.domain).to.equal('test.com');
      expect(siteObj.page).to.equal('http://test.com');
      expect(siteObj.ref).to.equal('');
    });

    it('check if correct device object was added', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const deviceObj = JSON.parse(request[0].data).device;

      expect(deviceObj.w).to.equal(1500);
      expect(deviceObj.h).to.equal(1000);
    });

    it('check if imp object was added', function () {
      const request = spec.buildRequests(bidRequests);
      expect(JSON.parse(request[0].data).imp).to.be.an('array');
    });

    it('should send "user.ext.eids" in the request for Prebid.js supported modules only', function () {
      const request = spec.buildRequests(bidRequests);
      expect(JSON.parse(request[0].data).user.ext.eids).to.deep.equal(userIdAsEids);
    });

    it('should send an undefined "user.ext.eids" in the request if userId module is unsupported', function () {
      let bidRequestsUnsupportedUserIdModule = Object.assign({}, bidRequests[0]);
      delete bidRequestsUnsupportedUserIdModule.userIdAsEids;
      const request = spec.buildRequests(bidRequestsUnsupportedUserIdModule);

      expect(JSON.parse(request[0].data).user.ext.eids).to.be.undefined;
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
      let request = spec.buildRequests(bidRequests, bidRequests[0]);
      let result = spec.interpretResponse(wrongServerResponse, request);

      expect(result).to.be.instanceof(Array);
      expect(result.length).to.equal(0);
    });

    it('should get correct bid response', function () {
      const result = spec.interpretResponse(serverResponse, bidRequests[0]);
      expect(result).to.be.an('array').with.lengthOf(1);
      expect(result[0].requestId).to.equal('22c4871113f461');
      expect(result[0].cpm).to.equal(0.8);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].creativeId).to.equal('test-bid-id');
      expect(result[0].currency).to.equal('USD');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].ttl).to.equal(360);
      expect(result[0].ad).to.equal('this is an ad');
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
