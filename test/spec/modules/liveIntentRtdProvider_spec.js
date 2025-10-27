import {liveIntentRtdSubmodule} from 'modules/liveIntentRtdProvider.js';
import * as utils from 'src/utils.js';
import { expect } from 'chai';

describe('LiveIntent Rtd Provider', function () {
  const SUBMODULE_NAME = 'liveintent';

  describe('submodule `init`', function () {
    const config = {
      name: SUBMODULE_NAME,
    };
    it('init returns true when the subModuleName is defined', function () {
      const value = liveIntentRtdSubmodule.init(config);
      expect(value).to.equal(true);
    });
  })

  describe('submodule `onBidRequestEvent`', function () {
    const bidRequestExample = {
      bidderCode: 'appnexus',
      auctionId: '8dbd7cb1-7f6d-4f84-946c-d0df4837234a',
      bidderRequestId: '2a038c6820142b',
      bids: [
        {
          bidder: 'appnexus',
          userId: {
            lipb: {
              segments: [
                'asa_1231',
                'lalo_4311',
                'liurl_99123'
              ]
            }
          }
        }
      ]
    }

    it('exists', function () {
      expect(liveIntentRtdSubmodule.onBidRequestEvent).to.be.a('function');
    });

    it('undefined segments field does not change the ortb2', function() {
      const bidRequest = {
        bidderCode: 'appnexus',
        auctionId: '8dbd7cb1-7f6d-4f84-946c-d0df4837234a',
        bidderRequestId: '2a038c6820142b',
        bids: [
          {
            bidder: 'appnexus',
            ortb2: {}
          }
        ]
      }

      liveIntentRtdSubmodule.onBidRequestEvent(bidRequest);
      const ortb2 = bidRequest.bids[0].ortb2;
      expect(ortb2).to.deep.equal({});
    });

    it('extracts segments and move them to the bidRequest.ortb2.user.data when the ortb2 is undefined', function() {
      const bidRequest = utils.deepClone(bidRequestExample);

      liveIntentRtdSubmodule.onBidRequestEvent(bidRequest);
      const ortb2 = bidRequest.bids[0].ortb2;
      const expectedOrtb2 = {user: {data: [{name: 'liveintent.com', segment: [{id: 'asa_1231'}, {id: 'lalo_4311'}, {id: 'liurl_99123'}]}]}}
      expect(ortb2).to.deep.equal(expectedOrtb2);
    });

    it('extracts segments and move them to the bidRequest.ortb2.user.data when user is undefined', function() {
      bidRequestExample.bids[0].ortb2 = { source: {} }
      const bidRequest = utils.deepClone(bidRequestExample);

      liveIntentRtdSubmodule.onBidRequestEvent(bidRequest);
      const ortb2 = bidRequest.bids[0].ortb2;
      const expectedOrtb2 = {source: {}, user: {data: [{name: 'liveintent.com', segment: [{id: 'asa_1231'}, {id: 'lalo_4311'}, {id: 'liurl_99123'}]}]}}
      expect(ortb2).to.deep.equal(expectedOrtb2);
    });

    it('extracts segments and move them to the bidRequest.ortb2.user.data when data is undefined', function() {
      bidRequestExample.bids[0].ortb2 = {
        source: {},
        user: {}
      }
      const bidRequest = utils.deepClone(bidRequestExample);

      liveIntentRtdSubmodule.onBidRequestEvent(bidRequest);
      const ortb2 = bidRequest.bids[0].ortb2;
      const expectedOrtb2 = {source: {}, user: {data: [{name: 'liveintent.com', segment: [{id: 'asa_1231'}, {id: 'lalo_4311'}, {id: 'liurl_99123'}]}]}}
      expect(ortb2).to.deep.equal(expectedOrtb2);
    });

    it('extracts segments and move them to the bidRequest.ortb2.user.data with the existing data', function() {
      bidRequestExample.bids[0].ortb2 = {
        source: {},
        user: {
          data: [
            {
              name: 'example.com',
              segment: [
                { id: 'a_1231' },
                { id: 'b_4311' }
              ]
            }
          ]
        }
      }
      const bidRequest = utils.deepClone(bidRequestExample);

      liveIntentRtdSubmodule.onBidRequestEvent(bidRequest);
      const ortb2 = bidRequest.bids[0].ortb2;
      const expectedOrtb2 = {source: {}, user: {data: [{name: 'example.com', segment: [{id: 'a_1231'}, {id: 'b_4311'}]}, {name: 'liveintent.com', segment: [{id: 'asa_1231'}, {id: 'lalo_4311'}, {id: 'liurl_99123'}]}]}}
      expect(ortb2).to.deep.equal(expectedOrtb2);
    });
  });
});
