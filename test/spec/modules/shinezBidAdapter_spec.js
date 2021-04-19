import { expect } from 'chai';
import sinon from 'sinon';
import { spec, internal } from 'modules/shinezBidAdapter.js';

describe('shinezBidAdapter', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });
  afterEach(() => {
    sandbox.restore();
  });
  describe('isBidRequestValid', () => {
    const cases = [
      [
        'should return false when placementId is missing',
        {
          params: {},
        },
        false,
      ],
      [
        'should return false when placementId has wrong type',
        {
          params: {
            placementId: 123,
          },
        },
        false,
      ],
      [
        'should return false when unit has wrong type',
        {
          params: {
            placementId: '00654321',
            unit: 150,
          },
        },
        false,
      ],
      [
        'should return true when required params found and valid',
        {
          params: {
            placementId: '00654321',
          },
        },
        true,
      ],
      [
        'should return true when all params found and valid',
        {
          params: {
            placementId: '00654321',
            unit: '__header-bid-1',
          },
        },
        true,
      ],
    ];
    cases.map(([description, request, expected]) => {
      it(description, () => {
        const result = spec.isBidRequestValid(request);
        expect(result).to.be.equal(expected);
      });
    });
  });
  describe('buildRequests', () => {
    it('should build server request correctly', () => {
      const utcOffset = 300;
      const validBidRequests = [
        {
          params: {
            placementId: '00654321',
            unit: 'header-bid-tag-1-shinez',
          },
          crumbs: {
            pubcid: 'c8584a82-bec3-4347-8d3e-e7612438a161',
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250]],
            },
          },
          adUnitCode: 'header-bid-tag-1',
          transactionId: '665760dc-a249-4be7-ae86-91f417b2c65d',
        },
      ];
      const bidderRequest = {
        refererInfo: {
          referer: 'http://site-with-ads.com',
        },
      };
      sandbox.stub(Date.prototype, 'getTimezoneOffset').returns(utcOffset);
      const result = spec.buildRequests(validBidRequests, bidderRequest);
      const expectedData = [
        {
          bidId: validBidRequests[0].bidId,
          transactionId: validBidRequests[0].transactionId,
          crumbs: validBidRequests[0].crumbs,
          mediaTypes: validBidRequests[0].mediaTypes,
          refererInfo: bidderRequest.refererInfo,
          adUnitCode: validBidRequests[0].adUnitCode,
          utcOffset: utcOffset,
          placementId: validBidRequests[0].params.placementId,
          unit: validBidRequests[0].params.unit,
        },
      ];
      expect(result.method, "request should be POST'ed").equal('POST');
      expect(result.url, 'request should be send to correct url').equal(
        internal.TARGET_URL
      );
      expect(result.data, 'request should have correct payload').to.deep.equal(
        expectedData
      );
    });
  });
  describe('interpretResponse', () => {
    it('should interpret bid responses correctly', () => {
      const response = {
        body: [
          {
            bidId: '2ece6496f4d0c9',
            cpm: 0.03,
            currency: 'USD',
            width: 300,
            height: 250,
            ad: `<h1>The Ad</h1>`,
            ttl: 60,
            creativeId: 'V8qlA6guwm',
            netRevenue: true,
          },
        ],
      };
      const bids = [
        {
          requestId: response.body[0].bidId,
          cpm: response.body[0].cpm,
          currency: response.body[0].currency,
          width: response.body[0].width,
          height: response.body[0].height,
          ad: response.body[0].ad,
          ttl: response.body[0].ttl,
          creativeId: response.body[0].creativeId,
          netRevenue: response.body[0].netRevenue,
        },
      ];
      const result = spec.interpretResponse(response);
      expect(result).to.deep.equal(bids);
    });
  });
});
