import { spec } from 'modules/setupadBidAdapter.js';

describe('SetupadAdapter', function () {
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
    },
  ];

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
      expect(JSON.parse(request[0].data).regs.ext.us_privacy).to.equal(
        'usp-context-string'
      );
    });

    it('check request params without GDPR', function () {
      let bidRequestsWithoutGDPR = Object.assign({}, bidRequests[0]);
      delete bidRequestsWithoutGDPR.gdprConsent;
      const request = spec.buildRequests(
        [bidRequestsWithoutGDPR],
        bidRequestsWithoutGDPR
      );
      expect(JSON.parse(request[0].data).regs.ext.gdpr).to.be.undefined;
      expect(JSON.parse(request[0].data).regs.ext.us_privacy).to.equal(
        'usp-context-string'
      );
    });

    it('should return correct storedrequest id if account_id is provided', function () {
      const request = spec.buildRequests(bidRequests, bidRequests[0]);
      expect(JSON.parse(request[0].data).ext.prebid.storedrequest.id).to.equal(
        'test-account-id'
      );
    });

    it('should return correct storedrequest id if account_id is not provided', function () {
      let bidRequestsWithoutAccountId = Object.assign({}, bidRequests[0]);
      delete bidRequestsWithoutAccountId.params.account_id;
      const request = spec.buildRequests(
        [bidRequestsWithoutAccountId],
        bidRequestsWithoutAccountId
      );
      expect(JSON.parse(request[0].data).ext.prebid.storedrequest.id).to.equal(
        'default'
      );
    });

    it('validate generated params', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request[0].bidId).to.equal('22c4871113f461');
      expect(JSON.parse(request[0].data).id).to.equal(
        'b06c5141-fe8f-4cdf-9d7d-54415490a917'
      );
    });

    it('check if domain was added', function () {
      const request = spec.buildRequests(bidRequests);
      expect(JSON.parse(request[0].data).site.domain).to.exist;
    });

    it('check if elOffsets was added', function () {
      const request = spec.buildRequests(bidRequests);
      expect(JSON.parse(request[0].data).ext.setupad.elOffsets).to.be.an(
        'object'
      );
    });

    it('check if imp object was added', function () {
      const request = spec.buildRequests(bidRequests);
      expect(JSON.parse(request[0].data).imp).to.be.an('array');
    });
  });

  describe('getUserSync', function () {
    it('should return correct user sync url', function () {
      const syncOptionsPixel = {
        iframeEnabled: false,
        pixelEnabled: true,
      };
      const syncOptionsIframe = {
        iframeEnabled: true,
        pixelEnabled: false,
      };
      expect(spec.getUserSyncs(syncOptionsPixel)).to.deep.equal([
        {
          type: 'image',
          url: 'https://prebid.setupad.io/cookie_sync?type=image',
        },
      ]);
      expect(spec.getUserSyncs(syncOptionsIframe)).to.deep.equal([
        {
          type: 'iframe',
          url: 'https://prebid.setupad.io/cookie_sync?type=iframe',
        },
      ]);
    });

    it('should return valid url if GDPR and USP exist', function () {
      const syncOptions = {
        iframeEnabled: false,
        pixelEnabled: true,
      };

      let userSync = spec.getUserSyncs(
        syncOptions,
        [],
        bidRequests[0].gdprConsent,
        bidRequests[0].uspConsent
      );
      expect(userSync).to.be.an('array').with.lengthOf(1);
      expect(userSync[0].type).to.equal('image');
      expect(userSync[0].url).to.equal(
        'https://prebid.setupad.io/cookie_sync?gdpr=1&gdpr_consent=BOtmiBKOtmiBKABABAENAFAAAAACeAAA&us_privacy=usp-context-string&type=image'
      );
    });

    it('Test getUserSyncs function if GDPR is undefined', function () {
      const syncOptions = {
        iframeEnabled: false,
        pixelEnabled: true,
      };

      let userSync = spec.getUserSyncs(
        syncOptions,
        [serverResponse],
        undefined,
        bidRequests[0].uspConsent
      );
      expect(userSync).to.be.an('array').with.lengthOf(1);
      expect(userSync[0].type).to.equal('image');
      expect(userSync[0].url).to.equal('urlA?gdpr=0');
    });
  });

  describe('interpretResponse', function () {
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

  describe('getUrlPixelMetric', function () {
    const REPORT_ENDPOINT =
      'https://adapter-analytics.azurewebsites.net/api/adapter-analytics';
    const mockData = [
      {
        eventName: 'bidRequested',
        bid: {
          bidderCode: 'appnexus',
          bids: [{ bidder: 'appnexus', params: {} }],
        },

        expected: undefined,
      },

      {
        eventName: 'bidRequested',
        bid: {
          bidderCode: 'appnexus',
          bids: [{ bidder: 'appnexus', params: { account_id: 'test' } }],
        },

        expected: undefined,
      },

      {
        eventName: 'bidRequested',
        bid: {
          bidderCode: 'appnexus',
          bids: [{ bidder: 'appnexus', params: { placement_id: '123' } }],
        },

        expected: undefined,
      },

      {
        eventName: 'bidRequested',
        bid: {
          bidderCode: 'setupad',
          bids: [{ bidder: 'setupad', params: { placement_id: '123' } }],
        },

        expected: `${REPORT_ENDPOINT}?event=bidRequested&bidder=setupad&placementIds=123`,
      },

      {
        eventName: 'bidRequested',
        bid: {
          bidderCode: 'setupad',
          bids: [
            { bidder: 'setupad', params: { placement_id: '123' } },
            { bidder: 'setupad', params: { placement_id: '321' } },
          ],
        },

        expected: `${REPORT_ENDPOINT}?event=bidRequested&bidder=setupad&placementIds=123;321`,
      },

      {
        eventName: 'bidResponse',
        bid: {
          bidderCode: 'appnexus',
        },

        expected: undefined,
      },

      {
        eventName: 'bidResponse',
        bid: {
          bidderCode: 'setupad',
          params: { placement_id: '123' },
        },

        expected: `${REPORT_ENDPOINT}?event=bidResponse&bidder=setupad&placementIds=123`,
      },

      {
        eventName: 'noBid',
        bid: {
          bidder: 'appnexus',
        },

        expected: undefined,
      },

      {
        eventName: 'noBid',
        bid: {
          bidder: 'setupad',
          params: { placement_id: '123' },
        },

        expected: `${REPORT_ENDPOINT}?event=noBid&bidder=setupad&placementIds=123`,
      },

      {
        eventName: 'bidTimeout',
        bid: {
          bidder: 'appnexus',
        },

        expected: undefined,
      },

      {
        eventName: 'bidTimeout',
        bid: {
          bidder: 'setupad',
          params: { placement_id: '123' },
        },

        expected: `${REPORT_ENDPOINT}?event=bidTimeout&bidder=setupad&placementIds=123`,
      },

      {
        eventName: 'bidWon',
        bid: {
          bidder: 'setupad',
          cpm: 0.8,
          params: { placement_id: '123', account_id: 'test' },
        },

        expected: `${REPORT_ENDPOINT}?event=bidWon&bidder=setupad&placementIds=123&cpm=0.8&data=${JSON.stringify(
          {
            bidder: 'setupad',
            cpm: 0.8,
            params: { placement_id: '123', account_id: 'test' },
          }
        )}`,
      },
    ];

    it('should return correct url', function () {
      mockData.forEach(({ eventName, bid, expected }) => {
        const url = spec.getUrlPixelMetric(eventName, bid);
        expect(url).to.equal(expected);
      });
    });
  });
});
