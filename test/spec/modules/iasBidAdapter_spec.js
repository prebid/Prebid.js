import { expect } from 'chai';
import { spec } from 'modules/iasBidAdapter';

describe('iasBidAdapter is an adapter that', function () {
  it('has the correct bidder code', function () {
    expect(spec.code).to.equal('ias');
  });
  describe('has a method `isBidRequestValid` that', function () {
    it('exists', function () {
      expect(spec.isBidRequestValid).to.be.a('function');
    });
    it('returns false if bid params misses `pubId`', function () {
      expect(spec.isBidRequestValid(
        {
          params: {
            adUnitPath: 'someAdUnitPath'
          }
        })).to.equal(false);
    });
    it('returns false if bid params misses `adUnitPath`', function () {
      expect(spec.isBidRequestValid(
        {
          params: {
            pubId: 'somePubId'
          }
        })).to.equal(false);
    });
    it('returns true otherwise', function () {
      expect(spec.isBidRequestValid(
        {
          params: {
            adUnitPath: 'someAdUnitPath',
            pubId: 'somePubId',
            someOtherParam: 'abc'
          }
        })).to.equal(true);
    });
  });

  describe('has a method `buildRequests` that', function () {
    it('exists', function () {
      expect(spec.buildRequests).to.be.a('function');
    });
    describe('given bid requests, returns a `ServerRequest` instance that', function () {
      let bidRequests, IAS_HOST;
      beforeEach(function () {
        IAS_HOST = '//pixel.adsafeprotected.com/services/pub';
        bidRequests = [
          {
            adUnitCode: 'one-div-id',
            auctionId: 'someAuctionId',
            bidId: 'someBidId',
            bidder: 'ias',
            bidderRequestId: 'someBidderRequestId',
            params: {
              pubId: '1234',
              adUnitPath: '/a/b/c'
            },
            sizes: [
              [10, 20],
              [300, 400]
            ],
            transactionId: 'someTransactionId'
          },
          {
            adUnitCode: 'two-div-id',
            auctionId: 'someAuctionId',
            bidId: 'someBidId',
            bidder: 'ias',
            bidderRequestId: 'someBidderRequestId',
            params: {
              pubId: '1234',
              adUnitPath: '/d/e/f'
            },
            sizes: [
              [50, 60]
            ],
            transactionId: 'someTransactionId'
          }
        ];
      });
      it('has property `method` of `GET`', function () {
        expect(spec.buildRequests(bidRequests)).to.deep.include({
          method: 'GET'
        });
      });
      it('has property `url` to be the correct IAS endpoint', function () {
        expect(spec.buildRequests(bidRequests)).to.deep.include({
          url: IAS_HOST
        });
      });
      it('only includes the first `bidRequest` as the bidRequest variable on a multiple slot request', function () {
        expect(spec.buildRequests(bidRequests).bidRequest.adUnitCode).to.equal(bidRequests[0].adUnitCode);
      });
      describe('has property `data` that is an encode query string containing information such as', function () {
        let val;
        const ANID_PARAM = 'anId';
        const SLOT_PARAM = 'slot';
        const SLOT_ID_PARAM = 'id';
        const SLOT_SIZE_PARAM = 'ss';
        const SLOT_AD_UNIT_PATH_PARAM = 'p';

        beforeEach(function () {
          val = decodeURI(spec.buildRequests(bidRequests).data);
        });
        it('publisher id', function () {
          expect(val).to.have.string(`${ANID_PARAM}=1234`);
        });
        it('ad slot`s id, size and ad unit path', function () {
          expect(val).to.have.string(`${SLOT_PARAM}={${SLOT_ID_PARAM}:one-div-id,${SLOT_SIZE_PARAM}:[10.20,300.400],${SLOT_AD_UNIT_PATH_PARAM}:/a/b/c}`);
          expect(val).to.have.string(`${SLOT_PARAM}={${SLOT_ID_PARAM}:two-div-id,${SLOT_SIZE_PARAM}:[50.60],${SLOT_AD_UNIT_PATH_PARAM}:/d/e/f}`);
        });
        it('window size', function () {
          expect(val).to.match(/.*wr=[0-9]*\.[0-9]*/);
        });
        it('screen size', function () {
          expect(val).to.match(/.*sr=[0-9]*\.[0-9]*/);
        });
        it('url value', function () {
          expect(val).to.match(/.*url=https?%3A%2F%2F[^\s$.?#].[^\s]*/);
        });
      });
      it('has property `bidRequest` that is the first passed in bid request', function () {
        expect(spec.buildRequests(bidRequests)).to.deep.include({
          bidRequest: bidRequests[0]
        });
      });
    });
  });
  describe('has a method `interpretResponse` that', function () {
    it('exists', function () {
      expect(spec.interpretResponse).to.be.a('function');
    });
    describe('returns a list of bid response that', function () {
      let bidRequests, bidResponse, slots, serverResponse;
      beforeEach(function () {
        bidRequests = [
          {
            adUnitCode: 'one-div-id',
            auctionId: 'someAuctionId',
            bidId: 'someBidId1',
            bidder: 'ias',
            bidderRequestId: 'someBidderRequestId',
            params: {
              pubId: '1234',
              adUnitPath: '/a/b/c'
            },
            sizes: [
              [10, 20],
              [300, 400]
            ],
            transactionId: 'someTransactionId'
          },
          {
            adUnitCode: 'two-div-id',
            auctionId: 'someAuctionId',
            bidId: 'someBidId2',
            bidder: 'ias',
            bidderRequestId: 'someBidderRequestId',
            params: {
              pubId: '1234',
              adUnitPath: '/d/e/f'
            },
            sizes: [
              [50, 60]
            ],
            transactionId: 'someTransactionId'
          }
        ];
        const request = {
          bidRequest: {
            bidId: '102938'
          }
        };
        slots = {};
        slots['test-div-id'] = {
          id: '1234',
          vw: ['60', '70']
        };
        slots['test-div-id-two'] = {
          id: '5678',
          vw: ['80', '90']
        };
        serverResponse = {
          body: {
            brandSafety: {
              adt: 'adtVal',
              alc: 'alcVal',
              dlm: 'dlmVal',
              drg: 'drgVal',
              hat: 'hatVal',
              off: 'offVal',
              vio: 'vioVal'
            },
            fr: 'false',
            slots: slots
          },
          headers: {}
        };
        bidResponse = spec.interpretResponse(serverResponse, request);
      });
      it('has IAS keyword `adt` as property', function () {
        expect(bidResponse[0]).to.deep.include({ adt: 'adtVal' });
      });
      it('has IAS keyword `alc` as property', function () {
        expect(bidResponse[0]).to.deep.include({ alc: 'alcVal' });
      });
      it('has IAS keyword `dlm` as property', function () {
        expect(bidResponse[0]).to.deep.include({ dlm: 'dlmVal' });
      });
      it('has IAS keyword `drg` as property', function () {
        expect(bidResponse[0]).to.deep.include({ drg: 'drgVal' });
      });
      it('has IAS keyword `hat` as property', function () {
        expect(bidResponse[0]).to.deep.include({ hat: 'hatVal' });
      });
      it('has IAS keyword `off` as property', function () {
        expect(bidResponse[0]).to.deep.include({ off: 'offVal' });
      });
      it('has IAS keyword `vio` as property', function () {
        expect(bidResponse[0]).to.deep.include({ vio: 'vioVal' });
      });
      it('has IAS keyword `fr` as property', function () {
        expect(bidResponse[0]).to.deep.include({ fr: 'false' });
      });
      it('has property `slots`', function () {
        expect(bidResponse[0]).to.deep.include({ slots: slots });
      });
      it('response is the same for multiple slots', function () {
        var adapter = spec;
        var requests = adapter.buildRequests(bidRequests);
        expect(adapter.interpretResponse(serverResponse, requests)).to.length(2);
      });
    });
    describe('returns a list of bid response that with custom value', function () {
      let bidRequests, bidResponse, slots, custom, serverResponse;
      beforeEach(function () {
        bidRequests = [
          {
            adUnitCode: 'one-div-id',
            auctionId: 'someAuctionId',
            bidId: 'someBidId1',
            bidder: 'ias',
            bidderRequestId: 'someBidderRequestId',
            params: {
              pubId: '1234',
              adUnitPath: '/a/b/c'
            },
            sizes: [
              [10, 20],
              [300, 400]
            ],
            transactionId: 'someTransactionId'
          },
          {
            adUnitCode: 'two-div-id',
            auctionId: 'someAuctionId',
            bidId: 'someBidId2',
            bidder: 'ias',
            bidderRequestId: 'someBidderRequestId',
            params: {
              pubId: '1234',
              adUnitPath: '/d/e/f'
            },
            sizes: [
              [50, 60]
            ],
            transactionId: 'someTransactionId'
          }
        ];
        const request = {
          bidRequest: {
            bidId: '102938'
          }
        };
        slots = {};
        slots['test-div-id'] = {
          id: '1234',
          vw: ['60', '70']
        };
        slots['test-div-id-two'] = {
          id: '5678',
          vw: ['80', '90']
        };
        custom = {};
        custom['ias-kw'] = ['IAS_1_KW', 'IAS_2_KW'];
        serverResponse = {
          body: {
            brandSafety: {
              adt: 'adtVal',
              alc: 'alcVal',
              dlm: 'dlmVal',
              drg: 'drgVal',
              hat: 'hatVal',
              off: 'offVal',
              vio: 'vioVal'
            },
            fr: 'false',
            slots: slots,
            custom: custom
          },
          headers: {}
        };
        bidResponse = spec.interpretResponse(serverResponse, request);
      });
      it('has IAS keyword `adt` as property', function () {
        expect(bidResponse[0]).to.deep.include({ adt: 'adtVal' });
      });
      it('has IAS keyword `alc` as property', function () {
        expect(bidResponse[0]).to.deep.include({ alc: 'alcVal' });
      });
      it('has IAS keyword `dlm` as property', function () {
        expect(bidResponse[0]).to.deep.include({ dlm: 'dlmVal' });
      });
      it('has IAS keyword `drg` as property', function () {
        expect(bidResponse[0]).to.deep.include({ drg: 'drgVal' });
      });
      it('has IAS keyword `hat` as property', function () {
        expect(bidResponse[0]).to.deep.include({ hat: 'hatVal' });
      });
      it('has IAS keyword `off` as property', function () {
        expect(bidResponse[0]).to.deep.include({ off: 'offVal' });
      });
      it('has IAS keyword `vio` as property', function () {
        expect(bidResponse[0]).to.deep.include({ vio: 'vioVal' });
      });
      it('has IAS keyword `fr` as property', function () {
        expect(bidResponse[0]).to.deep.include({ fr: 'false' });
      });
      it('has property `slots`', function () {
        expect(bidResponse[0]).to.deep.include({ slots: slots });
      });
      it('has property `custom`', function () {
        expect(bidResponse[0]).to.deep.include({ custom: custom });
      });
      it('response is the same for multiple slots', function () {
        var adapter = spec;
        var requests = adapter.buildRequests(bidRequests);
        expect(adapter.interpretResponse(serverResponse, requests)).to.length(3);
      });
    });
  });
});
