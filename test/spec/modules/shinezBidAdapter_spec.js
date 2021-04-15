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
  })
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
      const validBidRequests = [ { bidId: '1' }, { bidId: '2' } ];
      const bidderRequest = { refererInfo: { referer: 'http://site-with-ads.com' } };
      sandbox.stub(Date.prototype, 'getTimezoneOffset').returns(utcOffset);
      sandbox.stub(internal, '_buildServerBidRequest')
        .callsFake((bidRequest, bidderRequest, utcOffset) => ({
          bidId: bidRequest.bidId,
          refererInfo: bidderRequest.refererInfo,
          utcOffset: utcOffset })
        );
      const payload = [
        {
          bidId: '1',
          refererInfo: bidderRequest.refererInfo,
          utcOffset: utcOffset
        },
        {
          bidId: '2',
          refererInfo: bidderRequest.refererInfo,
          utcOffset: utcOffset
        }
      ]
      const result = spec.buildRequests(validBidRequests, bidderRequest);
      expect(result.method, 'request should be POST\'ed').equal('POST');
      expect(result.url.toString(), 'request should be send to correct url').equal(internal.TARGET_URL);
      expect(result.data, 'request should have correct payload').to.deep.equal(payload);
    });
  });
  describe('interpretResponse', () => {
    it('should interpret bid responses correctly', () => {
      sandbox
        .stub(internal, '_convertServerBidResponse')
        .callsFake((request) => ({ requestId: request.bidId }));
      const responses = { body: [{ bidId: '1' }, { bidId: '2' }] };
      const expected = [{ requestId: '1' }, { requestId: '2' }];
      const result = spec.interpretResponse(responses);
      expect(result).to.deep.equal(expected);
    });
  });
  describe('_buildServerBidRequest', () => {
    it('should build server bid request correctly', () => {
      const bidRequest = {
        bidId: '22cee66f4fcb0a',
        transactionId: '44b6190e-9085-49bd-a6b9-b603544e4bfe',
        crumbs: {
          pubcid: 'c8584a82-bec3-4347-8d3e-e7612438a161',
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
          },
        },
        params: {
          placementId: '00654321',
          unit: '__header-bid-1',
        },
        adUnitCode: '/19968336/header-bid-tag-1',
      };
      const bidderRequest = {
        fpd: {
          ortb2: {
            site: 'http://site-with-ads.com',
          },
        },
        refererInfo: {
          referer: 'http://site-with-ads.com',
        },
      };
      const utcOffset = 300;
      const expected = {
        bidId: bidRequest.bidId,
        transactionId: bidRequest.transactionId,
        crumbs: bidRequest.crumbs,
        fpd: bidRequest.fpd,
        mediaTypes: bidRequest.mediaTypes,
        refererInfo: bidderRequest.refererInfo,
        placementId: bidRequest.params.placementId,
        utcOffset: utcOffset,
        adUnitCode: bidRequest.adUnitCode,
        unit: bidRequest.params.unit
      };
      const result = internal._buildServerBidRequest(bidRequest, bidderRequest, utcOffset);
      expect(result).to.deep.equal(expected);
    });
  });
  describe('_convertServerBidResponse', () => {
    it('should convert server response bid correctly', () => {
      const response = {
        bidId: '2ece6496f4d0c9',
        cpm: 1,
        currency: 'USD',
        width: 300,
        height: 250,
        ad: `<h1>The Ad</h1>`,
        ttl: 60,
        creativeId: 'V8qlA6guwm',
        netRevenue: true,
      };
      const expected = {
        requestId: response.bidId,
        cpm: response.cpm,
        currency: response.currency,
        width: response.width,
        height: response.height,
        ad: response.ad,
        ttl: response.ttl,
        creativeId: response.creativeId,
        netRevenue: response.netRevenue,
      };
      const result = internal._convertServerBidResponse(response);
      expect(result).to.deep.equal(expected);
    });
  });
});
