import { expect } from 'chai';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';
import { normalizeFPD } from 'src/fpd/normalize.js';
import { continueAuction, handleSetFloorsConfig } from 'modules/priceFloors.js';
import { spec } from '../../../modules/loglyBidAdapter.ts';

describe('loglyBidAdapter', function () {
  const bannerBidRequest = {
    bidder: 'logly',
    bidId: '254304ac29e265',
    params: {
      adspotId: 16
    },
    adUnitCode: '/19968336/prebid_banner_example_1',
    transactionId: '10aee457-617c-4572-ab5b-99df1d73ccb4',
    bidderRequestId: '15da3afd9632d7',
    auctionId: 'f890b7d9-e787-4237-ac21-6d8554abac9f',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    }
  };

  const bidderRequest = {
    refererInfo: {
      page: 'https://example.com/article',
      ref: 'https://previous.example.com/',
      reachedTop: true,
      numIframes: 1,
      stack: []
    },
    auctionStart: 1632194172781,
    bidderCode: 'logly',
    bidderRequestId: '15da3afd9632d7',
    auctionId: 'f890b7d9-e787-4237-ac21-6d8554abac9f',
    timeout: 3000
  };

  beforeEach(function () {
    config.setConfig({
      currency: {
        adServerCurrency: 'JPY'
      },
      publisherDomain: 'publisher.example.com'
    });
  });

  afterEach(function () {
    config.resetConfig();
  });

  describe('isBidRequestValid', function () {
    it('should return true if adspotId is present', function () {
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.true;
    });

    it('should return false if the adspotId parameter is not present', function () {
      const bidRequest = utils.deepClone(bannerBidRequest);
      delete bidRequest.params.adspotId;
      expect(spec.isBidRequestValid(bidRequest)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('should generate a valid POST request payload', function () {
      const request = spec.buildRequests([bannerBidRequest], bidderRequest)[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://bid.logly.co.jp/prebid/client/v2?adspot_id=16');
      expect(request.data).to.exist;

      const data = JSON.parse(request.data);
      expect(data.auctionId).to.equal(bannerBidRequest.auctionId);
      expect(data.bidderRequestId).to.equal(bannerBidRequest.bidderRequestId);
      expect(data.transactionId).to.equal(bannerBidRequest.transactionId);
      expect(data.adUnitCode).to.equal(bannerBidRequest.adUnitCode);
      expect(data.bidId).to.equal(bannerBidRequest.bidId);
      expect(data.mediaTypes).to.deep.equal(bannerBidRequest.mediaTypes);
      expect(data.params).to.deep.equal(bannerBidRequest.params);
      expect(data.prebidJsVersion).to.equal('$prebid.version$');
      expect(data.url).to.exist;
      expect(data.domain).to.equal('publisher.example.com');
      expect(data.referer).to.equal(bidderRequest.refererInfo.ref);
      expect(data.auctionStartTime).to.equal(bidderRequest.auctionStart);
      expect(data.currency).to.equal('JPY');
      expect(data.timeout).to.equal(3000);
      expect(data).to.not.have.property('im_uid');
    });

    it('should send bidderRequest.timeout as timeout', function () {
      const request = spec.buildRequests([bannerBidRequest], { ...bidderRequest, timeout: 1500 })[0];

      expect(JSON.parse(request.data).timeout).to.equal(1500);
    });

    describe('im_uid', function () {
      it('should send im_uid from ortb2.user.ext.eids', function () {
        const bidRequest = {
          ...utils.deepClone(bannerBidRequest),
          ortb2: {
            user: {
              ext: {
                eids: [{
                  source: 'other-provider.com',
                  uids: [{ id: 'some-id', atype: 1 }]
                }, {
                  source: 'intimatemerger.com',
                  uids: [{
                    id: 'bid-eid-imuid',
                    atype: 1
                  }]
                }]
              }
            }
          }
        };

        const request = spec.buildRequests([bidRequest], bidderRequest)[0];

        expect(JSON.parse(request.data)).to.include({
          im_uid: 'bid-eid-imuid'
        });
      });

      it('should not send im_uid when ortb2.user.ext.eids has no intimatemerger.com entry', function () {
        const bidRequest = {
          ...utils.deepClone(bannerBidRequest),
          ortb2: {
            user: {
              ext: {
                eids: [{
                  source: 'other-provider.com',
                  uids: [{ id: 'some-id', atype: 1 }]
                }]
              }
            }
          }
        };

        const request = spec.buildRequests([bidRequest], bidderRequest)[0];

        expect(JSON.parse(request.data)).to.not.have.property('im_uid');
      });

      it('should find im_uid past null or undefined entries in ortb2.user.ext.eids', function () {
        const imEid = { source: 'intimatemerger.com', uids: [{ id: 'bid-eid-imuid', atype: 1 }] };
        const bidRequest = { ...utils.deepClone(bannerBidRequest), ortb2: { user: { ext: { eids: [null, undefined, imEid] } } } };

        const data = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);

        expect(data.im_uid).to.equal('bid-eid-imuid');
      });
    });

    describe('bidfloors', function () {
      it('should send the floor of each banner size from getFloor in JPY', function () {
        const getFloorStub = sinon.stub();
        getFloorStub.withArgs({ currency: 'JPY', mediaType: 'banner', size: [300, 250] }).returns({ floor: 27.5, currency: 'JPY' });
        getFloorStub.withArgs({ currency: 'JPY', mediaType: 'banner', size: [336, 280] }).returns({ floor: 30, currency: 'JPY' });
        const bidRequest = {
          ...utils.deepClone(bannerBidRequest),
          mediaTypes: { banner: { sizes: [[300, 250], [336, 280]] } },
          getFloor: getFloorStub
        };

        const data = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);

        expect(data.bidfloors).to.deep.equal({
          '300x250': { floor: 27.5, currency: 'JPY' },
          '336x280': { floor: 30, currency: 'JPY' }
        });
      });

      it('should send the floor in the currency returned by getFloor when it cannot be converted to JPY', function () {
        const bidRequest = {
          ...utils.deepClone(bannerBidRequest),
          getFloor: () => ({ floor: 0.18, currency: 'USD' })
        };

        const data = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);

        expect(data.bidfloors).to.deep.equal({ '300x250': { floor: 0.18, currency: 'USD' } });
      });

      it('should send only the sizes that have a floor', function () {
        const bidRequest = {
          ...utils.deepClone(bannerBidRequest),
          mediaTypes: { banner: { sizes: [[300, 250], [336, 280]] } },
          getFloor: ({ size }) => (size[0] === 300 ? { floor: 27.5, currency: 'JPY' } : {})
        };

        const data = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);

        expect(data.bidfloors).to.deep.equal({ '300x250': { floor: 27.5, currency: 'JPY' } });
      });

      it('should not send bidfloors when getFloor is not available or returns no floor', function () {
        const withoutGetFloor = utils.deepClone(bannerBidRequest);
        const withEmptyFloor = { ...utils.deepClone(bannerBidRequest), getFloor: () => ({}) };
        const withNullFloor = { ...utils.deepClone(bannerBidRequest), getFloor: () => null };
        const withNaNFloor = { ...utils.deepClone(bannerBidRequest), getFloor: () => ({ floor: NaN, currency: 'JPY' }) };

        [withoutGetFloor, withEmptyFloor, withNullFloor, withNaNFloor].forEach(bidRequest => {
          const data = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);
          expect(data).to.not.have.property('bidfloors');
        });
      });

      it('should send the other floors and the other ad units when getFloor throws for one size', function () {
        const throwingBidRequest = {
          ...utils.deepClone(bannerBidRequest),
          mediaTypes: { banner: { sizes: [[300, 250], [336, 280]] } },
          getFloor: ({ size }) => {
            if (size[0] === 336) {
              throw new Error('floor error');
            }
            return { floor: 27.5, currency: 'JPY' };
          }
        };
        const otherBidRequest = { ...utils.deepClone(bannerBidRequest), bidId: '3a1f0b7e5c2d4a', getFloor: () => ({ floor: 30, currency: 'JPY' }) };

        const requests = spec.buildRequests([throwingBidRequest, otherBidRequest], bidderRequest);

        expect(requests).to.have.lengthOf(2);
        expect(JSON.parse(requests[0].data).bidfloors).to.deep.equal({ '300x250': { floor: 27.5, currency: 'JPY' } });
        expect(JSON.parse(requests[1].data).bidfloors).to.deep.equal({ '300x250': { floor: 30, currency: 'JPY' } });
      });

      it('should send the floor of each size from the price floors module when floors are set only per size', function () {
        try {
          handleSetFloorsConfig({
            enabled: true,
            enforcement: { bidAdjustment: false },
            data: {
              currency: 'JPY',
              schema: { fields: ['mediaType', 'size'] },
              values: { 'banner|300x250': 100, 'banner|336x280': 120 }
            }
          });
          const bid = { ...utils.deepClone(bannerBidRequest), mediaTypes: { banner: { sizes: [[300, 250], [336, 280]] } } };
          const adUnits = [{ code: bid.adUnitCode, mediaTypes: bid.mediaTypes, bids: [bid] }];
          continueAuction({ reqBidsConfigObj: { auctionId: 'logly-floors', adUnits }, nextFn: sinon.stub() });

          const data = JSON.parse(spec.buildRequests([bid], { ...bidderRequest, auctionId: 'logly-floors' })[0].data);

          expect(data.bidfloors).to.deep.equal({
            '300x250': { floor: 100, currency: 'JPY' },
            '336x280': { floor: 120, currency: 'JPY' }
          });
        } finally {
          handleSetFloorsConfig({ enabled: false });
        }
      });
    });

    describe('eids', function () {
      it('should send all eids from ortb2.user.ext.eids', function () {
        const eids = [{
          source: 'intimatemerger.com',
          uids: [{ id: 'bid-eid-imuid', atype: 1 }]
        }, {
          source: 'pubcid.org',
          uids: [{ id: 'pubcid-value', atype: 1 }]
        }];
        const bidRequest = { ...utils.deepClone(bannerBidRequest), ortb2: { user: { ext: { eids } } } };

        const data = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);

        expect(data.eids).to.deep.equal(eids);
      });

      // Goes through core's normalizeFPD so this test fails if core stops moving ortb2.user.eids into ortb2.user.ext.eids, which the adapter reads.
      it('should send eids written by the publisher as ortb2.user.eids', function () {
        const eids = [{ source: 'intimatemerger.com', uids: [{ id: 'bid-eid-imuid', atype: 1 }] }];
        const { global } = normalizeFPD({ global: { user: { eids } }, bidder: {} });
        const bidRequest = { ...utils.deepClone(bannerBidRequest), ortb2: global };

        const data = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);

        expect(data.eids).to.deep.equal(eids);
      });

      it('should send userIdAsEids instead of ortb2.user.ext.eids when both are present', function () {
        const userIdAsEids = [{ source: 'intimatemerger.com', uids: [{ id: 'user-id-as-eids-imuid', atype: 1 }] }];
        const bidRequest = {
          ...utils.deepClone(bannerBidRequest),
          userIdAsEids,
          ortb2: { user: { ext: { eids: [{ source: 'intimatemerger.com', uids: [{ id: 'ortb2-imuid', atype: 1 }] }] } } }
        };

        const data = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);

        expect(data.eids).to.deep.equal(userIdAsEids);
        expect(data.im_uid).to.equal('user-id-as-eids-imuid');
      });

      it('should send empty eids when ortb2 has no eids', function () {
        const data = JSON.parse(spec.buildRequests([bannerBidRequest], bidderRequest)[0].data);

        expect(data.eids).to.deep.equal([]);
      });

      it('should send empty eids when ortb2.user.ext.eids is not an array', function () {
        [{}, 'eids', 1].forEach(eids => {
          const bidRequest = { ...utils.deepClone(bannerBidRequest), ortb2: { user: { ext: { eids } } } };

          const data = JSON.parse(spec.buildRequests([bidRequest], bidderRequest)[0].data);

          expect(data.eids).to.deep.equal([]);
          expect(data).to.not.have.property('im_uid');
        });
      });
    });
  });

  describe('interpretResponse', function () {
    it('should return an empty array if an invalid response is passed', function () {
      expect(spec.interpretResponse({}, {})).to.be.an('array').that.is.empty;
    });

    it('should return a valid banner response when passed a valid server response', function () {
      const request = spec.buildRequests([bannerBidRequest], bidderRequest)[0];
      const interpretedResponse = spec.interpretResponse({
        body: {
          bids: [{
            requestId: '254304ac29e265',
            cpm: 10.123,
            width: 300,
            height: 250,
            creativeId: '123456789',
            currency: 'JPY',
            netRevenue: true,
            ttl: 30,
            ad: '<div>banner ad markup</div>'
          }]
        }
      }, request);

      expect(interpretedResponse).to.have.lengthOf(1);
      expect(interpretedResponse[0]).to.deep.include({
        requestId: '254304ac29e265',
        cpm: 10.123,
        width: 300,
        height: 250,
        creativeId: '123456789',
        currency: 'JPY',
        netRevenue: true,
        ttl: 30,
        ad: '<div>banner ad markup</div>'
      });
    });

    it('should return an empty array if body is missing, lacks bids, or has an error', function () {
      const request = spec.buildRequests([bannerBidRequest], bidderRequest)[0];
      expect(spec.interpretResponse({}, request)).to.be.an('array').that.is.empty;
      expect(spec.interpretResponse({ body: {} }, request)).to.be.an('array').that.is.empty;
      expect(spec.interpretResponse({ body: { error: 'no fill' } }, request)).to.be.an('array').that.is.empty;
    });
  });

  describe('getUserSyncs', function () {
    it('should return no usersyncs', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [])).to.be.an('array').that.is.empty;
    });
  });
});
