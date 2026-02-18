import {expect} from 'chai';
import {spec} from 'modules/allegroBidAdapter.js';
import {config} from 'src/config.js';
import sinon from 'sinon';
import * as utils from 'src/utils.js';

function buildBidRequest({bidId = 'bid1', adUnitCode = 'div-1', sizes = [[300, 250]], params = {}, mediaTypes} = {}) {
  return {
    bidId,
    adUnitCode,
    bidder: 'allegro',
    params,
    mediaTypes: mediaTypes || {banner: {sizes}},
  };
}

function buildBidderRequest(bidRequests, ortb2Overrides = {}) {
  return {
    bidderCode: 'allegro',
    bids: bidRequests,
    auctionId: 'auc-1',
    timeout: 1000,
    refererInfo: {page: 'https://example.com', domain: 'example.com', ref: '', stack: ['https://example.com']},
    ortb2: Object.assign({
      device: {
        dnt: 0,
        sua: {mobile: 0}
      }
    }, ortb2Overrides)
  };
}

describe('Allegro Bid Adapter', () => {
  let configStub;

  afterEach(() => {
    sinon.restore();
  });

  it('should export the expected code and media types', () => {
    expect(spec.code).to.equal('allegro');
    expect(spec.supportedMediaTypes).to.deep.equal(['banner', 'video', 'native']);
  });

  describe('isBidRequestValid', () => {
    it('returns true for not undefined bidRequest', () => {
      expect(spec.isBidRequestValid({})).to.equal(true);
      expect(spec.isBidRequestValid(buildBidRequest({}))).to.equal(true);
    });
    it('returns false for undefined bidRequest', () => {
      expect(spec.isBidRequestValid(undefined)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    it('builds a POST request to default endpoint with ORTB data', () => {
      configStub = sinon.stub(config, 'getConfig').callsFake((key) => undefined);
      const bidRequests = [buildBidRequest({})];
      const bidderRequest = buildBidderRequest(bidRequests);
      const req = spec.buildRequests(bidRequests, bidderRequest);
      expect(req.method).to.equal('POST');
      expect(req.url).to.equal('https://prebid.rtb.allegrogroup.com/v1/rtb/prebid/bid');
      expect(req.options.contentType).to.equal('text/plain');
      expect(req.data).to.exist;
      expect(req.data.imp).to.be.an('array').with.lengthOf(1);
    });

    it('respects custom bidder URL from config', () => {
      configStub = sinon.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'allegro.bidderUrl') return 'https://override.endpoint/prebid';
        return undefined;
      });
      let bidRequest = [buildBidRequest({})];
      const req = spec.buildRequests(bidRequest, buildBidderRequest(bidRequest));
      expect(req.url).to.equal('https://override.endpoint/prebid');
    });

    it('converts extension fields by default', () => {
      configStub = sinon.stub(config, 'getConfig').callsFake((key) => undefined);
      const bidRequests = [buildBidRequest({})];
      const ortb2 = {
        site: {ext: {siteCustom: 'val'}, publisher: {ext: {pubCustom: 'pub'}}},
        user: {ext: {userCustom: 'usr'}, data: [{ext: {dataCustom: 'd1'}}]},
        device: {ext: {deviceCustom: 'dev'}, sua: {mobile: 1}, dnt: 1},
        regs: {ext: {gdpr: 1, other: 'x'}},
        source: {ext: {sourceCustom: 'src'}},
        ext: {requestCustom: 'req'}
      };
      const bidderRequest = buildBidderRequest(bidRequests, ortb2);
      const req = spec.buildRequests(bidRequests, bidderRequest);
      const data = req.data;

      expect(data.site.ext).to.equal(undefined);
      expect(data.site['[com.google.doubleclick.site]'].siteCustom).to.equal('val');
      expect(data.site.publisher['[com.google.doubleclick.publisher]'].pubCustom).to.equal('pub');
      expect(data.user['[com.google.doubleclick.user]'].userCustom).to.equal('usr');
      expect(data.user.data[0]['[com.google.doubleclick.data]'].dataCustom).to.equal('d1');
      expect(data.device['[com.google.doubleclick.device]'].deviceCustom).to.equal('dev');
      expect(data.device.dnt).to.be.a('boolean');
      expect(data.device.sua.mobile).to.equal(true);
      expect(data.regs['[com.google.doubleclick.regs]'].other).to.equal('x');
      expect(data.regs['[com.google.doubleclick.regs]'].gdpr).to.equal(true);
      expect(data['[com.google.doubleclick.bid_request]'].requestCustom).to.equal('req');
    });

    it('does not convert extension fields when allegro.convertExtensionFields = false', () => {
      configStub = sinon.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'allegro.convertExtensionFields') return false;
        return undefined;
      });
      const bidRequests = [buildBidRequest({})];
      const ortb2 = {site: {ext: {siteCustom: 'val'}}};
      const req = spec.buildRequests(bidRequests, buildBidderRequest(bidRequests, ortb2));
      expect(req.data.site.ext.siteCustom).to.equal('val');
      expect(req.data.site['[com.google.doubleclick.site]']).to.equal(undefined);
    });

    it('converts numeric flags to booleans (topframe, secure, test) when present', () => {
      configStub = sinon.stub(config, 'getConfig').callsFake((key) => undefined);
      const bidRequests = [buildBidRequest({mediaTypes: {banner: {sizes: [[300, 250]], topframe: 1}}, params: {secure: 1}})];
      const bidderRequest = buildBidderRequest(bidRequests);
      // add test flag via ortb2 without clobbering existing device object
      bidderRequest.ortb2.test = 1;
      const req = spec.buildRequests(bidRequests, bidderRequest);
      const imp = req.data.imp[0];
      // topframe may be absent depending on processors; if present it's converted to boolean
      if (Object.prototype.hasOwnProperty.call(imp.banner, 'topframe')) {
        expect(imp.banner.topframe).to.be.a('boolean');
      }
      expect(imp.secure).to.equal(true);
      expect(req.data.test).to.equal(true);
    });
  });

  describe('interpretResponse', () => {
    it('returns undefined for empty body', () => {
      const result = spec.interpretResponse({}, {data: {}});
      expect(result).to.equal(undefined);
    });

    it('returns converted bids for a valid ORTB response', () => {
      configStub = sinon.stub(config, 'getConfig').callsFake((key) => undefined);
      const bidRequests = [buildBidRequest({bidId: 'imp-1'})];
      const bidderRequest = buildBidderRequest(bidRequests);
      const built = spec.buildRequests(bidRequests, bidderRequest);
      const impId = built.data.imp[0].id; // use actual id from converter
      const ortbResponse = {
        id: 'resp1',
        seatbid: [{
          seat: 'seat1',
          bid: [{impid: impId, price: 1.23, crid: 'creative1', w: 300, h: 250}]
        }]
      };
      const result = spec.interpretResponse({body: ortbResponse}, built);
      expect(result).to.be.an('array').with.lengthOf(1);
      const bid = result[0];
      expect(bid.cpm).to.equal(1.23);
      expect(bid.mediaType).to.equal('banner');
      expect(bid.ttl).to.equal(360); // default context ttl
      expect(bid.netRevenue).to.equal(true);
    });

    it('ignores bids with impid not present in original request', () => {
      configStub = sinon.stub(config, 'getConfig').callsFake((key) => undefined);
      const bidRequests = [buildBidRequest({bidId: 'imp-1'})];
      const bidderRequest = buildBidderRequest(bidRequests);
      const built = spec.buildRequests(bidRequests, bidderRequest);
      const ortbResponse = {
        seatbid: [{seat: 'seat1', bid: [{impid: 'unknown', price: 0.5, crid: 'x'}]}]
      };
      const result = spec.interpretResponse({body: ortbResponse}, built);
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  describe('onBidWon', () => {
    it('does nothing if config flag disabled', () => {
      configStub = sinon.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'allegro.triggerImpressionPixel') return false;
        return undefined;
      });
      const bid = {burl: 'https://example.com/win?price=${AUCTION_PRICE}', cpm: 1.2};
      expect(spec.onBidWon(bid)).to.equal(undefined);
    });

    it('does nothing when burl missing even if flag enabled', () => {
      configStub = sinon.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'allegro.triggerImpressionPixel') return true;
        return undefined;
      });
      expect(spec.onBidWon({})).to.equal(undefined);
    });

    it('fires impression pixel with provided burl when enabled', () => {
      const pixelSpy = sinon.spy();
      // stub config and utils.triggerPixel; need to stub imported triggerPixel via utils module
      configStub = sinon.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'allegro.triggerImpressionPixel') return true;
        return undefined;
      });
      sinon.stub(utils, 'triggerPixel').callsFake(pixelSpy);
      const bid = {
        burl: 'https://example.com/win?aid=auction_id&bid=bid_id&imp=imp_id&price=0.91&cur=USD',
        auctionId: 'auc-1',
        requestId: 'req-1',
        impid: 'imp-1',
        cpm: 0.91,
        currency: 'USD'
      };
      spec.onBidWon(bid);
      expect(pixelSpy.calledOnce).to.equal(true);
      const calledWith = pixelSpy.getCall(0).args[0];
      expect(calledWith).to.equal(bid.burl);
    });
  });
});
