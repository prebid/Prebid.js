/* eslint-disable no-tabs */
import { expect } from 'chai';
import { spec, storage } from 'modules/tpmnBidAdapter.js';
import { generateUUID } from '../../../src/utils.js';
import { newBidder } from '../../../src/adapters/bidderFactory';
import * as sinon from 'sinon';

describe('tpmnAdapterTests', function() {
  const adapter = newBidder(spec);
  const BIDDER_CODE = 'tpmn';
  let sandbox = sinon.sandbox.create();
  let getCookieStub;

  beforeEach(function () {
    $$PREBID_GLOBAL$$.bidderSettings = {
      tpmn: {
        storageAllowed: true
      }
    };
    sandbox = sinon.sandbox.create();
    getCookieStub = sinon.stub(storage, 'getCookie');
  });

  afterEach(function () {
    sandbox.restore();
    getCookieStub.restore();
    $$PREBID_GLOBAL$$.bidderSettings = {};
  });

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  });

  describe('isBidRequestValid', function() {
    let bid = {
      adUnitCode: 'temp-unitcode',
      bidder: 'tpmn',
      params: {
        inventoryId: '1',
        publisherId: 'TPMN'
      },
      bidId: '29092404798c9',
      bidderRequestId: 'a01',
      auctionId: 'da1d7a33-0260-4e83-a621-14674116f3f9',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      }
    };

    it('should return true if a bid is valid banner bid request', function() {
      expect(spec.isBidRequestValid(bid)).to.be.equal(true);
    });

    it('should return false where requried param is missing', function() {
      let bid = Object.assign({}, bid);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.be.equal(false);
    });

    it('should return false when required param values have invalid type', function() {
      let bid = Object.assign({}, bid);
      bid.params = {
        'inventoryId': null,
        'publisherId': null
      };
      expect(spec.isBidRequestValid(bid)).to.be.equal(false);
    });
  });

  describe('buildRequests', function() {
    it('should return an empty list  if there are no bid requests', function() {
      const emptyBidRequests = [];
      const bidderRequest = {};
      const request = spec.buildRequests(emptyBidRequests, bidderRequest);
      expect(request).to.be.an('array').that.is.empty;
    });
    it('should generate a POST server request with bidder API url, data', function() {
      const bid = {
        adUnitCode: 'temp-unitcode',
        bidder: 'tpmn',
        params: {
          inventoryId: '1',
          publisherId: 'TPMN'
        },
        bidId: '29092404798c9',
        bidderRequestId: 'a01',
        auctionId: 'da1d7a33-0260-4e83-a621-14674116f3f9',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      };
      const tempBidRequests = [bid];
      const tempBidderRequest = {refererInfo: {
          referer: 'http://localhost/test',
          site: {
            domain: 'localhost',
            page: 'http://localhost/test'
          }
        }};
      const builtRequest = spec.buildRequests(tempBidRequests, tempBidderRequest);

      expect(builtRequest).to.have.lengthOf(1);
      expect(builtRequest[0].method).to.equal('POST');
      expect(builtRequest[0].url).to.match(/ad.tpmn.co.kr\/prebidhb.tpmn/);
      const apiRequest = builtRequest[0].data;
      expect(apiRequest.site).to.deep.equal({
        domain: 'localhost',
        page: 'http://localhost/test'
      });
      expect(apiRequest.bids).to.have.lengthOf('1');
      expect(apiRequest.bids[0].inventoryId).to.equal('1');
      expect(apiRequest.bids[0].publisherId).to.equal('TPMN');
      expect(apiRequest.bids[0].bidId).to.equal('29092404798c9');
      expect(apiRequest.bids[0].adUnitCode).to.equal('temp-unitcode');
      expect(apiRequest.bids[0].auctionId).to.equal('da1d7a33-0260-4e83-a621-14674116f3f9');
      expect(apiRequest.bids[0].sizes).to.have.lengthOf('1');
      expect(apiRequest.bids[0].sizes[0]).to.deep.equal({
        width: 300,
        height: 250
      });
    });
  });

  describe('interpretResponse', function() {
    const bid = {
      adUnitCode: 'temp-unitcode',
      bidder: 'tpmn',
      params: {
        inventoryId: '1',
        publisherId: 'TPMN'
      },
      bidId: '29092404798c9',
      bidderRequestId: 'a01',
      auctionId: 'da1d7a33-0260-4e83-a621-14674116f3f9',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      }
    };
    const tempBidRequests = [bid];

    it('should return an empty aray to indicate no valid bids', function() {
      const emptyServerResponse = {};
      const bidResponses = spec.interpretResponse(emptyServerResponse, tempBidRequests);
      expect(bidResponses).is.an('array').that.is.empty;
    });
    it('should return an empty array to indicate no valid bids', function() {
      const mockBidResult = {
        requestId: '9cf19229-34f6-4d06-bc1d-0e44e8d616c8',
        cpm: 10.0,
        creativeId: '1',
        width: 300,
        height: 250,
        netRevenue: true,
        currency: 'USD',
        ttl: 1800,
        ad: '<div style=\"width:300px;height:250px;margin: auto;background-color:#eee;border:solid 1px #b8b8b8;display:table;\"><span style=\"text-align:center;vertical-align:middle;display:table-cell;\"><a href=\"http://tpmn.co.kr\" target=\"_blank\">TPMN HeaderBidding!</a></span></div>',
        adType: 'banner'
      };
      const testServerResponse = {
        headers: [],
        body: [mockBidResult]
      };
      const bidResponses = spec.interpretResponse(testServerResponse, tempBidRequests);
      expect(bidResponses).deep.equal([mockBidResult]);
    });
  });

  describe('getUserSync', function() {
    const KEY_ID = 'uuid';
    const TMP_UUID = generateUUID().replace(/-/g, '');

    it('getCookie mock Test', () => {
      const uuid = storage.getCookie(KEY_ID);
      expect(uuid).to.equal(undefined);
    });

    it('getCookie mock Test', () => {
      expect(TMP_UUID.length).to.equal(32);
      getCookieStub.withArgs(KEY_ID).returns(TMP_UUID);
      const uuid = storage.getCookie(KEY_ID);
      expect(uuid).to.equal(TMP_UUID);
    });

    it('case 1 -> allow iframe', () => {
      // eslint-disable-next-line no-console
      console.log('case 1');
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true });
      // eslint-disable-next-line no-console
      console.log(syncs);
      expect(syncs.length).to.equal(1);
      expect(syncs[0].type).to.equal('iframe');
    });

    it('case 2 -> allow pixel with static sync', () => {
      // eslint-disable-next-line no-console
      console.log('case 2');
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true });
      // eslint-disable-next-line no-console
      console.log(syncs);
      expect(syncs.length).to.be.equal(7);
      expect(syncs[0].type).to.be.equal('image');
      expect(syncs[1].type).to.be.equal('image');
      expect(syncs[2].type).to.be.equal('image');
      expect(syncs[3].type).to.be.equal('image');
    });

    it('case 3 -> allow pixel with uuid static sync', () => {
      // eslint-disable-next-line no-console
      console.log('case 3');
      getCookieStub.withArgs(KEY_ID).returns(TMP_UUID);
      const uuid = storage.getCookie(KEY_ID);
      expect(uuid).to.equal(TMP_UUID);
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true });
      // eslint-disable-next-line no-console
      console.log(syncs);
      expect(syncs.length).to.be.equal(7);
      expect(syncs[0].type).to.be.equal('image');
    });

    it('case 4 -> allow pixel with uuid static sync', () => {
      // eslint-disable-next-line no-console
      console.log('case 4');

      getCookieStub.withArgs(KEY_ID).returns(TMP_UUID);
      getCookieStub.withArgs('bidswitch').returns('123456789');
      getCookieStub.withArgs('appier').returns('123456789');
      getCookieStub.withArgs('adb_guid').returns('123456789');
      getCookieStub.withArgs('ucfunnel').returns('123456789');
      getCookieStub.withArgs('nasmedia').returns('123456789');
      getCookieStub.withArgs('mezzomedia').returns('123456789');
      getCookieStub.withArgs('admixernet').returns('123456789');

      expect(storage.getCookie(KEY_ID)).to.equal(TMP_UUID);
      expect(storage.getCookie('bidswitch')).to.equal('123456789');
      expect(storage.getCookie('appier')).to.equal('123456789');
      expect(storage.getCookie('adb_guid')).to.equal('123456789');
      expect(storage.getCookie('ucfunnel')).to.equal('123456789');
      expect(storage.getCookie('nasmedia')).to.equal('123456789');
      expect(storage.getCookie('mezzomedia')).to.equal('123456789');
      expect(storage.getCookie('admixernet')).to.equal('123456789');

      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true });
      // eslint-disable-next-line no-console
      console.log(syncs);
      expect(syncs.length).to.be.equal(0);
    });

    it('case 5 -> allow pixel with Only partners who are not sync yet proceed.', () => {
      // eslint-disable-next-line no-console
      console.log('case 5');

      getCookieStub.withArgs(KEY_ID).returns(TMP_UUID);
      // getCookieStub.withArgs('bidswitch').returns('123456789');
      getCookieStub.withArgs('appier').returns('123456789');
      getCookieStub.withArgs('adb_guid').returns('123456789');
      getCookieStub.withArgs('ucfunnel').returns('123456789');
      // getCookieStub.withArgs('nasmedia').returns('123456789');
      getCookieStub.withArgs('mezzomedia').returns('123456789');
      // getCookieStub.withArgs('admixernet').returns('123456789');

      expect(storage.getCookie(KEY_ID)).to.equal(TMP_UUID);
      expect(storage.getCookie('bidswitch')).to.equal(undefined);
      expect(storage.getCookie('appier')).to.equal('123456789');
      expect(storage.getCookie('adb_guid')).to.equal('123456789');
      expect(storage.getCookie('ucfunnel')).to.equal('123456789');
      expect(storage.getCookie('nasmedia')).to.equal(undefined);
      expect(storage.getCookie('mezzomedia')).to.equal('123456789');
      expect(storage.getCookie('admixernet')).to.equal(undefined);

      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true });
      // eslint-disable-next-line no-console
      console.log(syncs);
      expect(syncs.length).to.be.equal(3);
    });
  });
});
