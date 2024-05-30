import {expect} from 'chai';
import {spec} from 'modules/admixerBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {config} from '../../../src/config.js';

const BIDDER_CODE = 'admixer';
const WL_BIDDER_CODE = 'admixerwl'
const ENDPOINT_URL = 'https://inv-nets.admixer.net/prebid.1.2.aspx';
const ENDPOINT_URL_CUSTOM = 'https://custom.admixer.net/prebid.aspx';
const ZONE_ID = '2eb6bd58-865c-47ce-af7f-a918108c3fd2';
const CLIENT_ID = 5124;
const ENDPOINT_ID = 81264;

describe('AdmixerAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.be.exist.and.to.be.a('function');
    });
  });
  // inv-nets.admixer.net/adxprebid.1.2.aspx

  describe('isBidRequestValid', function () {
    let bid = {
      bidder: BIDDER_CODE,
      params: {
        zone: ZONE_ID,
      },
      adUnitCode: 'adunit-code',
      sizes: [
        [300, 250],
        [300, 600],
      ],
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
    };

    let wlBid = {
      bidder: WL_BIDDER_CODE,
      params: {
        clientId: CLIENT_ID,
        endpointId: ENDPOINT_ID,
      },
      adUnitCode: 'adunit-code',
      sizes: [
        [300, 250],
        [300, 600],
      ],
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return true when params required by WL found', function () {
      expect(spec.isBidRequestValid(wlBid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        placementId: 0,
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return false when params required by WL are not passed', function () {
      let wlBid = Object.assign({}, wlBid);
      delete wlBid.params;
      wlBid.params = {
        clientId: 0,
      };
      expect(spec.isBidRequestValid(wlBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let validRequest = [
      {
        bidder: BIDDER_CODE,
        params: {
          zone: ZONE_ID,
        },
        adUnitCode: 'adunit-code',
        sizes: [
          [300, 250],
          [300, 600],
        ],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
      },
    ];
    let bidderRequest = {
      bidderCode: BIDDER_CODE,
      refererInfo: {
        page: 'https://example.com',
      },
    };

    it('should add referrer and imp to be equal bidRequest', function () {
      const request = spec.buildRequests(validRequest, bidderRequest);
      const payload = request.data;
      expect(payload.referrer).to.not.be.undefined;
      expect(payload.imps[0]).to.deep.equal(validRequest[0]);
    });

    it('sends bid request to ENDPOINT via GET', function () {
      const request = spec.buildRequests(validRequest, bidderRequest);
      expect(request.url).to.equal(ENDPOINT_URL);
      expect(request.method).to.equal('POST');
    });

    it('sends bid request to CUSTOM_ENDPOINT via GET', function () {
      config.setBidderConfig({
        bidders: [BIDDER_CODE], // one or more bidders
        config: { [BIDDER_CODE]: { endpoint_url: ENDPOINT_URL_CUSTOM } },
      });
      const request = config.runWithBidder(BIDDER_CODE, () =>
        spec.buildRequests(validRequest, bidderRequest)
      );
      expect(request.url).to.equal(ENDPOINT_URL_CUSTOM);
      expect(request.method).to.equal('POST');
    });
  });

  describe('buildRequests URL check', function () {
    const requestParamsFor = (bidder) => ({
      validRequest: [
        {
          bidder: bidder,
          params: bidder === 'admixerwl' ? {
            clientId: CLIENT_ID,
            endpointId: ENDPOINT_ID
          } : {
            zone: ZONE_ID,
          },
          adUnitCode: 'adunit-code',
          sizes: [
            [300, 250],
            [300, 600],
          ],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
        },
      ],
      bidderRequest: {
        bidderCode: bidder,
        refererInfo: {
          page: 'https://example.com',
        },
      }
    })

    it('build request for admixer', function () {
      const requestParams = requestParamsFor('admixer');
      const request = spec.buildRequests(requestParams.validRequest, requestParams.bidderRequest);
      expect(request.url).to.equal('https://inv-nets.admixer.net/prebid.1.2.aspx');
      expect(request.method).to.equal('POST');
    });
    it('build request for go2net', function () {
      const requestParams = requestParamsFor('go2net');
      const request = spec.buildRequests(requestParams.validRequest, requestParams.bidderRequest);
      expect(request.url).to.equal('https://ads.go2net.com.ua/prebid.1.2.aspx');
      expect(request.method).to.equal('POST');
    });
    it('build request for adblender', function () {
      const requestParams = requestParamsFor('adblender');
      const request = spec.buildRequests(requestParams.validRequest, requestParams.bidderRequest);
      expect(request.url).to.equal('https://inv-nets.admixer.net/prebid.1.2.aspx');
      expect(request.method).to.equal('POST');
    });
    it('build request for futureads', function () {
      const requestParams = requestParamsFor('futureads');
      const request = spec.buildRequests(requestParams.validRequest, requestParams.bidderRequest);
      expect(request.url).to.equal('https://ads.futureads.io/prebid.1.2.aspx');
      expect(request.method).to.equal('POST');
    });
    it('build request for smn', function () {
      const requestParams = requestParamsFor('smn');
      const request = spec.buildRequests(requestParams.validRequest, requestParams.bidderRequest);
      expect(request.url).to.equal('https://ads.smn.rs/prebid.1.2.aspx');
      expect(request.method).to.equal('POST');
    });
    it('build request for admixeradx', function () {
      const requestParams = requestParamsFor('admixeradx');
      const request = spec.buildRequests(requestParams.validRequest, requestParams.bidderRequest);
      expect(request.url).to.equal('https://inv-nets.admixer.net/adxprebid.1.2.aspx');
      expect(request.method).to.equal('POST');
    });
    it('build request for admixerwl', function () {
      const requestParams = requestParamsFor('admixerwl');
      const request = spec.buildRequests(requestParams.validRequest, requestParams.bidderRequest);
      expect(request.url).to.equal(`https://inv-nets-adxwl.admixer.com/adxwlprebid.aspx?client=${CLIENT_ID}`);
      expect(request.method).to.equal('POST');
    });
  });

  describe('checkFloorGetting', function () {
    let validRequest = [
      {
        bidder: BIDDER_CODE,
        params: {
          zone: ZONE_ID,
        },
        adUnitCode: 'adunit-code',
        sizes: [[300, 250]],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
      },
    ];
    let bidderRequest = {
      bidderCode: BIDDER_CODE,
      refererInfo: {
        page: 'https://example.com',
      },
    };
    it('gets floor', function () {
      bidderRequest.getFloor = () => {
        return { floor: 0.6 };
      };
      const request = spec.buildRequests(validRequest, bidderRequest);
      const payload = request.data;
      expect(payload.bidFloor).to.deep.equal(0.6);
    });
  });

  describe('interpretResponse', function () {
    let response = {
      body: {
        ads: [
          {
            currency: 'USD',
            cpm: 6.21,
            ad: '<div>ad</div>',
            width: 300,
            height: 600,
            creativeId: 'ccca3e5e-0c54-4761-9667-771322fbdffc',
            ttl: 360,
            netRevenue: false,
            requestId: '5e4e763b6bc60b',
            dealId: 'asd123',
            meta: {
              advertiserId: 123,
              networkId: 123,
              advertiserDomains: ['test.com'],
            },
          },
        ],
      },
    };

    it('should get correct bid response', function () {
      const ads = response.body.ads;
      let expectedResponse = [
        {
          requestId: ads[0].requestId,
          cpm: ads[0].cpm,
          creativeId: ads[0].creativeId,
          width: ads[0].width,
          height: ads[0].height,
          ad: ads[0].ad,
          currency: ads[0].currency,
          netRevenue: ads[0].netRevenue,
          ttl: ads[0].ttl,
          dealId: ads[0].dealId,
          meta: {
            advertiserId: 123,
            networkId: 123,
            advertiserDomains: ['test.com'],
          },
        },
      ];

      let result = spec.interpretResponse(response);
      expect(result[0]).to.deep.equal(expectedResponse[0]);
    });

    it('handles nobid responses', function () {
      let response = [];

      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    let imgUrl = 'https://example.com/img1';
    let frmUrl = 'https://example.com/frm2';
    let responses = [
      {
        body: {
          cm: {
            pixels: [imgUrl],
            iframes: [frmUrl],
          },
        },
      },
    ];

    it('Returns valid values', function () {
      let userSyncAll = spec.getUserSyncs({pixelEnabled: true, iframeEnabled: true}, responses);
      let userSyncImg = spec.getUserSyncs({pixelEnabled: true, iframeEnabled: false}, responses);
      let userSyncFrm = spec.getUserSyncs({pixelEnabled: false, iframeEnabled: true}, responses);
      expect(userSyncAll).to.be.an('array').with.lengthOf(2);
      expect(userSyncImg).to.be.an('array').with.lengthOf(1);
      expect(userSyncImg[0].url).to.be.equal(imgUrl);
      expect(userSyncImg[0].type).to.be.equal('image');
      expect(userSyncFrm).to.be.an('array').with.lengthOf(1);
      expect(userSyncFrm[0].url).to.be.equal(frmUrl);
      expect(userSyncFrm[0].type).to.be.equal('iframe');
    });
  });
});
