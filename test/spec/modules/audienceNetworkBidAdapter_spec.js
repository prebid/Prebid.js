/**
 * @file Tests for AudienceNetwork adapter.
 */
import { expect } from 'chai';

import bidmanager from 'src/bidmanager';
import { STATUS } from 'src/constants.json';
import * as utils from 'src/utils';

import AudienceNetwork from 'modules/audienceNetworkBidAdapter';

const bidderCode = 'audienceNetwork';
const placementId = 'test-placement-id';
const placementCode = '/test/placement/code';
const playerwidth = 320;
const playerheight = 180;

/**
 * Expect haystack string to contain needle n times.
 * @param {String} haystack
 * @param {String} needle
 * @param {String} [n=1]
 * @throws {Error}
 */
const expectToContain = (haystack, needle, n = 1) =>
  expect(haystack.split(needle)).to.have.lengthOf(n + 1,
    `expected ${n} occurrence(s) of '${needle}' in '${haystack}'`);

describe('AudienceNetwork adapter', () => {
  describe('Public API', () => {
    const adapter = new AudienceNetwork();
    it('getBidderCode', () => {
      expect(adapter.getBidderCode).to.be.a('function');
      expect(adapter.getBidderCode()).to.equal(bidderCode);
    });
    it('setBidderCode', () => {
      expect(adapter.setBidderCode).to.be.a('function');
    });
    it('callBids', () => {
      expect(adapter.setBidderCode).to.be.a('function');
    });
  });

  describe('callBids parameter parsing', () => {
    let xhr;
    let requests;
    let addBidResponse;
    let logError;

    beforeEach(() => {
      xhr = sinon.useFakeXMLHttpRequest();
      xhr.onCreate = request => requests.push(request);
      requests = [];
      addBidResponse = sinon.stub(bidmanager, 'addBidResponse');
      logError = sinon.stub(utils, 'logError');
    });

    afterEach(() => {
      xhr.restore();
      bidmanager.addBidResponse.restore();
      utils.logError.restore();
    });

    it('missing placementId parameter', () => {
      // Invalid parameters
      const params = {
        bidderCode,
        bids: [{
          bidder: bidderCode,
          sizes: ['native']
        }]
      };
      // Request bids
      new AudienceNetwork().callBids(params);
      // Verify no attempt to fetch response
      expect(requests).to.have.lengthOf(0);
      // Verify no attempt to add a response as no placement was provided
      expect(addBidResponse.calledOnce).to.equal(false);
      // Verify attempt to log error
      expect(logError.calledOnce).to.equal(true);
    });

    it('invalid sizes parameter', () => {
      // Invalid parameters
      const params = {
        bidderCode,
        bids: [{
          bidder: bidderCode,
          params: { placementId },
          sizes: ['', undefined, null, '300x100', [300, 100], [300], {}]
        }]
      };
      // Request bids
      new AudienceNetwork().callBids(params);
      // Verify no attempt to fetch response
      expect(requests).to.have.lengthOf(0);
      // Verify attempt to log error
      expect(logError.calledOnce).to.equal(true);
    });

    it('filter valid sizes', () => {
      // Valid parameters
      const params = {
        bidderCode,
        bids: [{
          bidder: bidderCode,
          params: { placementId },
          sizes: [[1, 1], [300, 250]]
        }]
      };
      // Request bids
      new AudienceNetwork().callBids(params);
      // Verify attempt to fetch response
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('GET');
      expect(requests[0].url)
        .to.contain('https://an.facebook.com/v2/placementbid.json?')
        .and.to.contain('placementids[]=test-placement-id')
        .and.to.contain('adformats[]=300x250')
        .and.to.contain('pageurl=http%3A%2F%2F');
      // Verify no attempt to log error
      expect(logError.called).to.equal(false);
    });

    it('valid parameters', () => {
      const params = {
        bidderCode,
        bids: [{
          bidder: bidderCode,
          params: { placementId },
          sizes: [[300, 250], [320, 50]]
        },
        {
          bidder: bidderCode,
          params: { placementId },
          sizes: [[320, 50], [300, 250]]
        }]
      };
      // Request bids
      new AudienceNetwork().callBids(params);
      // Verify attempt to fetch response
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('GET');
      expect(requests[0].url)
        .to.contain('https://an.facebook.com/v2/placementbid.json?')
        .and.to.contain('placementids[]=test-placement-id&placementids[]=test-placement-id')
        .and.to.contain('adformats[]=320x50')
        .and.to.contain('adformats[]=300x250')
        .and.to.contain('pageurl=http%3A%2F%2F');
      // Verify no attempt to log error
      expect(logError.called).to.equal(false);
    });

    it('fullwidth', () => {
      // Valid parameters
      const params = {
        bidderCode,
        bids: [{
          bidder: bidderCode,
          params: {
            placementId,
            format: 'fullwidth'
          },
          sizes: [[300, 250]]
        }]
      };
      // Request bids
      new AudienceNetwork().callBids(params);
      // Verify attempt to fetch response
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('GET');
      expect(requests[0].url)
        .to.contain('https://an.facebook.com/v2/placementbid.json?')
        .and.to.contain('placementids[]=test-placement-id')
        .and.to.contain('adformats[]=fullwidth')
        .and.to.contain('pageurl=http%3A%2F%2F');
      // Verify no attempt to log error
      expect(logError.called).to.equal(false);
    });

    it('native', () => {
      // Valid parameters
      const params = {
        bidderCode,
        bids: [{
          bidder: bidderCode,
          params: {
            placementId,
            format: 'native'
          },
          sizes: [[300, 250]]
        }]
      };
      // Request bids
      new AudienceNetwork().callBids(params);
      // Verify attempt to fetch response
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('GET');
      expect(requests[0].url)
        .to.contain('https://an.facebook.com/v2/placementbid.json?')
        .and.to.contain('placementids[]=test-placement-id')
        .and.to.contain('adformats[]=native')
        .and.to.contain('pageurl=http%3A%2F%2F');
      // Verify no attempt to log error
      expect(logError.called).to.equal(false);
    });

    it('video', () => {
      // Valid parameters
      const params = {
        bidderCode,
        bids: [{
          bidder: bidderCode,
          params: {
            placementId,
            format: 'video'
          },
          sizes: [[playerwidth, playerheight]]
        }]
      };
      // Request bids
      new AudienceNetwork().callBids(params);
      // Verify attempt to fetch response
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('GET');
      expect(requests[0].url)
        .to.contain('https://an.facebook.com/v2/placementbid.json?')
        .and.to.contain('placementids[]=test-placement-id')
        .and.to.contain('adformats[]=video')
        .and.to.contain('sdk[]=')
        .and.to.contain('pageurl=http%3A%2F%2F');
      // Verify no attempt to log error
      expect(logError.called).to.equal(false);
    });
  });

  describe('callBids response handling', () => {
    let server;
    let addBidResponse;
    let logError;

    beforeEach(() => {
      server = sinon.fakeServer.create();
      addBidResponse = sinon.stub(bidmanager, 'addBidResponse');
      logError = sinon.stub(utils, 'logError');
    });

    afterEach(() => {
      server.restore();
      bidmanager.addBidResponse.restore();
      utils.logError.restore();
    });

    it('error in response', () => {
      // Error response
      const error = 'test-error-message';
      server.respondWith(JSON.stringify({
        errors: [error]
      }));
      // Request bids
      new AudienceNetwork().callBids({
        bidderCode,
        bids: [{
          bidder: bidderCode,
          params: { placementId },
          sizes: [[300, 250]]
        }]
      });
      server.respond();
      // Verify attempt to call addBidResponse
      expect(addBidResponse.calledOnce).to.equal(true);
      expect(addBidResponse.args[0]).to.have.lengthOf(2);
      expect(addBidResponse.args[0][1].getStatusCode()).to.equal(STATUS.NO_BID);
      expect(addBidResponse.args[0][1].bidderCode).to.equal(bidderCode);
      // Verify attempt to log error
      expect(logError.calledOnce).to.equal(true);
      expect(logError.calledWith(error)).to.equal(true);
    });

    it('valid native bid in response', () => {
      // Valid response
      server.respondWith(JSON.stringify({
        errors: [],
        bids: {
          [placementId]: [{
            placement_id: placementId,
            bid_id: 'test-bid-id',
            bid_price_cents: 123,
            bid_price_currency: 'usd',
            bid_price_model: 'cpm'
          }]
        }
      }));
      // Request bids
      new AudienceNetwork().callBids({
        bidderCode,
        bids: [{
          bidder: bidderCode,
          placementCode,
          params: {
            placementId,
            format: 'native'
          },
          sizes: [[300, 250]]
        }]
      });
      server.respond();
      // Verify attempt to call addBidResponse
      expect(addBidResponse.calledOnce).to.equal(true);
      expect(addBidResponse.args[0]).to.have.lengthOf(2);
      expect(addBidResponse.args[0][0]).to.equal(placementCode);
      // Verify Prebid attributes in bid response
      const bidResponse = addBidResponse.args[0][1];
      expect(bidResponse.getStatusCode()).to.equal(STATUS.GOOD);
      expect(bidResponse.cpm).to.equal(1.23);
      expect(bidResponse.bidderCode).to.equal(bidderCode);
      expect(bidResponse.width).to.equal(300);
      expect(bidResponse.height).to.equal(250);
      expect(bidResponse.ad)
        .to.contain(`placementid:'${placementId}',format:'native',bidid:'test-bid-id'`, 'ad missing parameters')
        .and.to.contain('getElementsByTagName("style")', 'ad missing native styles')
        .and.to.contain('<div class="thirdPartyRoot"><a class="fbAdLink">', 'ad missing native container');
      // Verify Audience Network attributes in bid response
      expect(bidResponse.hb_bidder).to.equal('fan');
      expect(bidResponse.fb_bidid).to.equal('test-bid-id');
      expect(bidResponse.fb_format).to.equal('native');
      expect(bidResponse.fb_placementid).to.equal(placementId);
      // Verify no attempt to log error
      expect(logError.called).to.equal(false, 'logError called');
    });

    it('valid IAB bid in response', () => {
      // Valid response
      server.respondWith(JSON.stringify({
        errors: [],
        bids: {
          [placementId]: [{
            placement_id: placementId,
            bid_id: 'test-bid-id',
            bid_price_cents: 123,
            bid_price_currency: 'usd',
            bid_price_model: 'cpm'
          }]
        }
      }));
      // Request bids
      new AudienceNetwork().callBids({
        bidderCode,
        bids: [{
          bidder: bidderCode,
          placementCode,
          params: { placementId },
          sizes: [[300, 250]]
        }]
      });
      server.respond();
      // Verify attempt to call addBidResponse
      expect(addBidResponse.calledOnce).to.equal(true);
      expect(addBidResponse.args[0]).to.have.lengthOf(2);
      expect(addBidResponse.args[0][0]).to.equal(placementCode);
      // Verify bidResponse Object
      const bidResponse = addBidResponse.args[0][1];
      expect(bidResponse.getStatusCode()).to.equal(STATUS.GOOD);
      expect(bidResponse.cpm).to.equal(1.23);
      expect(bidResponse.bidderCode).to.equal(bidderCode);
      expect(bidResponse.width).to.equal(300);
      expect(bidResponse.height).to.equal(250);
      expect(bidResponse.ad)
        .to.contain(`placementid:'${placementId}',format:'300x250',bidid:'test-bid-id'`, 'ad missing parameters')
        .and.not.to.contain('getElementsByTagName("style")', 'ad should not contain native styles')
        .and.not.to.contain('<div class="thirdPartyRoot"><a class="fbAdLink">', 'ad should not contain native container');
      // Verify no attempt to log error
      expect(logError.called).to.equal(false, 'logError called');
    });

    it('filters invalid slot sizes', () => {
      // Valid response
      server.respondWith(JSON.stringify({
        errors: [],
        bids: {
          [placementId]: [{
            placement_id: placementId,
            bid_id: 'test-bid-id',
            bid_price_cents: 123,
            bid_price_currency: 'usd',
            bid_price_model: 'cpm'
          }]
        }
      }));
      // Request bids
      new AudienceNetwork().callBids({
        bidderCode,
        bids: [{
          bidder: bidderCode,
          placementCode,
          params: { placementId },
          sizes: ['350x200']
        }, {
          bidder: bidderCode,
          placementCode,
          params: { placementId },
          sizes: [[300, 250]]
        }]
      });
      server.respond();
      // Verify attempt to call addBidResponse
      expect(addBidResponse.calledOnce).to.equal(true);
      expect(addBidResponse.args[0]).to.have.lengthOf(2);
      expect(addBidResponse.args[0][0]).to.equal(placementCode);
      // Verify bidResponse Object
      const bidResponse = addBidResponse.args[0][1];
      expect(bidResponse.getStatusCode()).to.equal(STATUS.GOOD);
      expect(bidResponse.cpm).to.equal(1.23);
      expect(bidResponse.bidderCode).to.equal(bidderCode);
      expect(bidResponse.width).to.equal(300);
      expect(bidResponse.height).to.equal(250);
      // Verify no attempt to log error
      expect(logError.called).to.equal(false, 'logError called');
    });

    it('valid multiple bids in response', () => {
      const placementIdNative = 'test-placement-id-native';
      const placementIdIab = 'test-placement-id-iab';
      const placementCodeNative = 'test-placement-code-native';
      const placementCodeIab = 'test-placement-code-iab';
      // Valid response
      server.respondWith(JSON.stringify({
        errors: [],
        bids: {
          [placementIdNative]: [{
            placement_id: placementIdNative,
            bid_id: 'test-bid-id-native',
            bid_price_cents: 123,
            bid_price_currency: 'usd',
            bid_price_model: 'cpm'
          }],
          [placementIdIab]: [{
            placement_id: placementIdIab,
            bid_id: 'test-bid-id-iab',
            bid_price_cents: 456,
            bid_price_currency: 'usd',
            bid_price_model: 'cpm'
          }]
        }
      }));
      // Request bids
      new AudienceNetwork().callBids({
        bidderCode,
        bids: [{
          bidder: bidderCode,
          placementCode: placementCodeNative,
          params: {
            placementId: placementIdNative,
            format: 'native'
          },
          sizes: [[300, 250]]
        }, {
          bidder: bidderCode,
          placementCode: placementCodeIab,
          params: { placementId: placementIdIab },
          sizes: [[300, 250]]
        }]
      });
      server.respond();
      // Verify multiple attempts to call addBidResponse
      expect(addBidResponse.calledTwice).to.equal(true);
      // Verify native
      const addBidResponseNativeCall = addBidResponse.args[0];
      expect(addBidResponseNativeCall).to.have.lengthOf(2);
      expect(addBidResponseNativeCall[0]).to.equal(placementCodeNative);
      expect(addBidResponseNativeCall[1].getStatusCode()).to.equal(STATUS.GOOD);
      expect(addBidResponseNativeCall[1].cpm).to.equal(1.23);
      expect(addBidResponseNativeCall[1].bidderCode).to.equal(bidderCode);
      expect(addBidResponseNativeCall[1].width).to.equal(300);
      expect(addBidResponseNativeCall[1].height).to.equal(250);
      expect(addBidResponseNativeCall[1].ad).to.contain(`placementid:'${placementIdNative}',format:'native',bidid:'test-bid-id-native'`, 'ad missing parameters');
      // Verify IAB
      const addBidResponseIabCall = addBidResponse.args[1];
      expect(addBidResponseIabCall).to.have.lengthOf(2);
      expect(addBidResponseIabCall[0]).to.equal(placementCodeIab);
      expect(addBidResponseIabCall[1].getStatusCode()).to.equal(STATUS.GOOD);
      expect(addBidResponseIabCall[1].cpm).to.equal(4.56);
      expect(addBidResponseIabCall[1].bidderCode).to.equal(bidderCode);
      expect(addBidResponseIabCall[1].width).to.equal(300);
      expect(addBidResponseIabCall[1].height).to.equal(250);
      expect(addBidResponseIabCall[1].ad).to.contain(`placementid:'${placementIdIab}',format:'300x250',bidid:'test-bid-id-iab'`, 'ad missing parameters');
      // Verify no attempt to log error
      expect(logError.called).to.equal(false, 'logError called');
    });

    it('valid video bid in response', () => {
      const bidId = 'test-bid-id-video';
      // Valid response
      server.respondWith(JSON.stringify({
        errors: [],
        bids: {
          [placementId]: [{
            placement_id: placementId,
            bid_id: bidId,
            bid_price_cents: 123,
            bid_price_currency: 'usd',
            bid_price_model: 'cpm'
          }]
        }
      }));
      // Request bids
      new AudienceNetwork().callBids({
        bidderCode,
        bids: [{
          bidder: bidderCode,
          placementCode,
          params: {
            placementId,
            format: 'video'
          },
          sizes: [[playerwidth, playerheight]]
        }]
      });
      server.respond();
      // Verify addBidResponse call
      expect(addBidResponse.calledOnce).to.equal(true);
      const addBidResponseArgs = addBidResponse.args[0];
      expect(addBidResponseArgs).to.have.lengthOf(2);
      expect(addBidResponseArgs[0]).to.equal(placementCode);
      expect(addBidResponseArgs[1].getStatusCode()).to.equal(STATUS.GOOD);
      expect(addBidResponseArgs[1].cpm).to.equal(1.23);
      expect(addBidResponseArgs[1].bidderCode).to.equal(bidderCode);
      // Video-specific properties
      expect(addBidResponseArgs[1].mediaType).to.equal('video');
      expect(addBidResponseArgs[1].vastUrl)
        .to.equal(addBidResponseArgs[1].descriptionUrl)
        .and.to.contain('https://an.facebook.com/v1/instream/vast.xml?')
        .and.to.contain(`placementid=${placementId}`)
        .and.to.contain('pageurl=http%3A%2F%2F')
        .and.to.contain(`playerwidth=${playerwidth}`)
        .and.to.contain(`playerheight=${playerheight}`)
        .and.to.contain(`bidid=${bidId}`);
      expect(addBidResponseArgs[1].width).to.equal(playerwidth);
      expect(addBidResponseArgs[1].height).to.equal(playerheight);
      // Verify no attempt to log error
      expect(logError.called).to.equal(false, 'logError called');
    });

    it('mixed video and native bids', () => {
      const videoPlacementId = 'test-video-placement-id';
      const videoBidId = 'test-video-bid-id';
      const nativePlacementId = 'test-native-placement-id';
      const nativeBidId = 'test-native-bid-id';
      // Valid response
      server.respondWith(JSON.stringify({
        errors: [],
        bids: {
          [videoPlacementId]: [{
            placement_id: videoPlacementId,
            bid_id: videoBidId,
            bid_price_cents: 123,
            bid_price_currency: 'usd',
            bid_price_model: 'cpm'
          }],
          [nativePlacementId]: [{
            placement_id: nativePlacementId,
            bid_id: nativeBidId,
            bid_price_cents: 456,
            bid_price_currency: 'usd',
            bid_price_model: 'cpm'
          }]
        }
      }));
      // Request bids
      new AudienceNetwork().callBids({
        bidderCode,
        bids: [{
          bidder: bidderCode,
          placementCode,
          params: {
            placementId: videoPlacementId,
            format: 'video'
          },
          sizes: [[playerwidth, playerheight]]
        }, {
          bidder: bidderCode,
          placementCode,
          params: {
            placementId: nativePlacementId,
            format: 'native'
          },
          sizes: [[300, 250]]
        }]
      });
      server.respond();
      // Verify multiple attempts to call addBidResponse
      expect(addBidResponse.calledTwice).to.equal(true);
      // Verify video
      const addBidResponseVideoCall = addBidResponse.args[0];
      expect(addBidResponseVideoCall).to.have.lengthOf(2);
      expect(addBidResponseVideoCall[0]).to.equal(placementCode);
      expect(addBidResponseVideoCall[1].getStatusCode()).to.equal(STATUS.GOOD);
      expect(addBidResponseVideoCall[1].cpm).to.equal(1.23);
      expect(addBidResponseVideoCall[1].bidderCode).to.equal(bidderCode);
      // Video-specific properties
      expect(addBidResponseVideoCall[1].mediaType).to.equal('video');
      expect(addBidResponseVideoCall[1].vastUrl)
        .to.equal(addBidResponseVideoCall[1].descriptionUrl)
        .and.to.contain('https://an.facebook.com/v1/instream/vast.xml?')
        .and.to.contain(`placementid=${videoPlacementId}`)
        .and.to.contain('pageurl=http%3A%2F%2F')
        .and.to.contain(`playerwidth=${playerwidth}`)
        .and.to.contain(`playerheight=${playerheight}`)
        .and.to.contain(`bidid=${videoBidId}`);
      expect(addBidResponseVideoCall[1].width).to.equal(playerwidth);
      expect(addBidResponseVideoCall[1].height).to.equal(playerheight);
      // Verify native
      const addBidResponseNativeCall = addBidResponse.args[1];
      expect(addBidResponseNativeCall).to.have.lengthOf(2);
      expect(addBidResponseNativeCall[0]).to.equal(placementCode);
      expect(addBidResponseNativeCall[1].getStatusCode()).to.equal(STATUS.GOOD);
      expect(addBidResponseNativeCall[1].cpm).to.equal(4.56);
      expect(addBidResponseNativeCall[1].bidderCode).to.equal(bidderCode);
      expect(addBidResponseNativeCall[1].width).to.equal(300);
      expect(addBidResponseNativeCall[1].height).to.equal(250);
      expect(addBidResponseNativeCall[1].ad).to.contain(`placementid:'${nativePlacementId}',format:'native',bidid:'${nativeBidId}'`);
      // Verify no attempt to log error
      expect(logError.called).to.equal(false, 'logError called');
    });
  });
});
