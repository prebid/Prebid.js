import {expect} from 'chai';
import Adapter from 'src/adapters/adkernel';
import * as ajax from 'src/ajax';
import * as utils from 'src/utils';
import bidmanager from 'src/bidmanager';
import CONSTANTS from 'src/constants.json';

describe('Adkernel adapter', () => {
  const bid1_zone1 = {
      bidder: 'adkernel',
      bidId: 'Bid_01',
      params: {zoneId: 1, host: 'rtb.adkernel.com'},
      placementCode: 'ad-unit-1',
      sizes: [[300, 250]]
    }, bid2_zone2 = {
      bidder: 'adkernel',
      bidId: 'Bid_02',
      params: {zoneId: 2, host: 'rtb.adkernel.com'},
      placementCode: 'ad-unit-2',
      sizes: [[728, 90]]
    }, bid3_host2 = {
      bidder: 'adkernel',
      bidId: 'Bid_02',
      params: {zoneId: 1, host: 'rtb-private.adkernel.com'},
      placementCode: 'ad-unit-2',
      sizes: [[728, 90]]
    }, bid_without_zone = {
      bidder: 'adkernel',
      bidId: 'Bid_W',
      params: {host: 'rtb-private.adkernel.com'},
      placementCode: 'ad-unit-1',
      sizes: [[728, 90]]
    }, bid_without_host = {
      bidder: 'adkernel',
      bidId: 'Bid_W',
      params: {zoneId: 1},
      placementCode: 'ad-unit-1',
      sizes: [[728, 90]]
    };

  const bidResponse1 = {
      'id': 'bid1',
      'seatbid': [{
        'bid': [{
          'id': '1',
          'impid': 'Bid_01',
          'price': 3.01,
          'nurl': 'https://rtb.com/win?i=ZjKoPYSFI3Y_0',
          'adm': '<!-- admarkup here -->'
        }]
      }],
      'cur': 'USD'
    }, bidResponse2 = {
      'id': 'bid2',
      'seatbid': [{
        'bid': [{
          'id': '2',
          'impid': 'Bid_02',
          'price': 1.31,
          'adm': '<!-- admarkup here -->'
        }]
      }],
      'cur': 'USD'
    };

  let adapter,
    sandbox,
    ajaxStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    adapter = Adapter.createNew();
    ajaxStub = sandbox.stub(ajax, 'ajax');
  });

  afterEach(() => {
    sandbox.restore();
  });

  function doRequest(bids) {
    adapter.callBids({
      bidderCode: 'adkernel',
      bids: bids
    });
  }

  describe('input parameters validation', () => {
    let spy;

    beforeEach(() => {
      spy = sandbox.spy();
      sandbox.stub(bidmanager, 'addBidResponse');
    });

    it('empty request shouldn\'t generate exception', () => {
      expect(adapter.callBids({
        bidderCode: 'adkernel'
      })).to.be.an('undefined');
    });

    it('request without zone shouldn\'t issue a request', () => {
      doRequest([bid_without_zone]);
      sinon.assert.notCalled(ajaxStub);
      expect(bidmanager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(bidmanager.addBidResponse.firstCall.args[1].bidderCode).to.equal('adkernel');
    });

    it('request without host shouldn\'t issue a request', () => {
      doRequest([bid_without_host]);
      sinon.assert.notCalled(ajaxStub);
      expect(bidmanager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(bidmanager.addBidResponse.firstCall.args[1].bidderCode).to.equal('adkernel');
    });
  });

  describe('request building', () => {
    let bidRequest;

    beforeEach(() => {
      sandbox.stub(utils, 'getTopWindowLocation', () => {
        return {
          protocol: 'https:',
          hostname: 'example.com',
          host: 'example.com',
          pathname: '/index.html',
          href: 'http://example.com/index.html'
        };
      });

      ajaxStub.onCall(0).callsArgWith(1, JSON.stringify(bidResponse1));
      doRequest([bid1_zone1]);
      bidRequest = JSON.parse(decodeURIComponent(ajaxStub.getCall(0).args[2].r));
    });

    it('should be a first-price auction', () => {
      expect(bidRequest).to.have.property('at', 1);
    });

    it('should have banner object', () => {
      expect(bidRequest.imp[0]).to.have.property('banner');
    });

    it('should have h/w', () => {
      expect(bidRequest.imp[0].banner).to.have.property('w', 300);
      expect(bidRequest.imp[0].banner).to.have.property('h', 250);
    });

    it('should respect secure connection', () => {
      expect(bidRequest.imp[0]).to.have.property('secure', 1);
    });

    it('should have tagid', () => {
      // console.warn(bidRequest.imp[0]);
      expect(bidRequest.imp[0]).to.have.property('tagid', 'ad-unit-1');
    });

    it('should create proper site block', () => {
      expect(bidRequest.site).to.have.property('domain', 'example.com');
      expect(bidRequest.site).to.have.property('page', 'http://example.com/index.html');
    });

    it('should fill device with caller macro', () => {
      expect(bidRequest).to.have.property('device');
      expect(bidRequest.device).to.have.property('ip', 'caller');
      expect(bidRequest.device).to.have.property('ua', 'caller');
    })
  });

  describe('requests routing', () => {
    it('should issue a request for each network', () => {
      ajaxStub.onFirstCall().callsArgWith(1, '')
        .onSecondCall().callsArgWith(1, '');
      doRequest([bid1_zone1, bid3_host2]);
      expect(ajaxStub.calledTwice);
      expect(ajaxStub.firstCall.args[0]).to.include(bid1_zone1.params.host);
      expect(ajaxStub.secondCall.args[0]).to.include(bid3_host2.params.host);
    });

    it('should issue a request for each zone', () => {
      ajaxStub.onCall(0).callsArgWith(1, JSON.stringify(bidResponse1));
      ajaxStub.onCall(1).callsArgWith(1, JSON.stringify(bidResponse2));
      doRequest([bid1_zone1, bid2_zone2]);
      expect(ajaxStub.calledTwice);
    });

    it('should route calls to proper zones', () => {
      ajaxStub.onCall(0).callsArgWith(1, JSON.stringify(bidResponse1));
      ajaxStub.onCall(1).callsArgWith(1, JSON.stringify(bidResponse2));
      doRequest([bid1_zone1, bid2_zone2]);
      expect(ajaxStub.firstCall.args[2].zone).to.equal('1');
      expect(ajaxStub.secondCall.args[2].zone).to.equal('2');
    });
  });

  describe('responses processing', () => {
    beforeEach(() => {
      sandbox.stub(bidmanager, 'addBidResponse');
    });

    it('should return fully-initialized bid-response', () => {
      ajaxStub.onCall(0).callsArgWith(1, JSON.stringify(bidResponse1));
      doRequest([bid1_zone1]);
      let bidResponse = bidmanager.addBidResponse.firstCall.args[1];
      expect(bidmanager.addBidResponse.firstCall.args[0]).to.equal('ad-unit-1');
      expect(bidResponse.getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(bidResponse.bidderCode).to.equal('adkernel');
      expect(bidResponse.cpm).to.equal(3.01);
      expect(bidResponse.ad).to.include('<!-- admarkup here -->');
      expect(bidResponse.width).to.equal(300);
      expect(bidResponse.height).to.equal(250);
    });

    it('should map responses to proper ad units', () => {
      ajaxStub.onCall(0).callsArgWith(1, JSON.stringify(bidResponse1));
      ajaxStub.onCall(1).callsArgWith(1, JSON.stringify(bidResponse2));
      doRequest([bid1_zone1, bid2_zone2]);
      expect(bidmanager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(bidmanager.addBidResponse.firstCall.args[1].bidderCode).to.equal('adkernel');
      expect(bidmanager.addBidResponse.firstCall.args[0]).to.equal('ad-unit-1');
      expect(bidmanager.addBidResponse.secondCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(bidmanager.addBidResponse.secondCall.args[1].bidderCode).to.equal('adkernel');
      expect(bidmanager.addBidResponse.secondCall.args[0]).to.equal('ad-unit-2');
    });

    it('should process empty responses', () => {
      ajaxStub.onCall(0).callsArgWith(1, JSON.stringify(bidResponse1));
      ajaxStub.onCall(1).callsArgWith(1, '');
      doRequest([bid1_zone1, bid2_zone2]);
      expect(bidmanager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(bidmanager.addBidResponse.firstCall.args[1].bidderCode).to.equal('adkernel');
      expect(bidmanager.addBidResponse.firstCall.args[0]).to.equal('ad-unit-1');
      expect(bidmanager.addBidResponse.secondCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.NO_BID);
      expect(bidmanager.addBidResponse.secondCall.args[1].bidderCode).to.equal('adkernel');
      expect(bidmanager.addBidResponse.secondCall.args[0]).to.equal('ad-unit-2');
    });

    it('should add nurl as pixel', () => {
      sandbox.spy(utils, 'createTrackPixelHtml');
      ajaxStub.onCall(0).callsArgWith(1, JSON.stringify(bidResponse1));
      doRequest([bid1_zone1]);
      expect(bidmanager.addBidResponse.firstCall.args[1].getStatusCode()).to.equal(CONSTANTS.STATUS.GOOD);
      expect(utils.createTrackPixelHtml.calledOnce);
      let result = pbjs.getBidResponsesForAdUnitCode(bid1_zone1.placementCode);
      let expectedNurl = bidResponse1.seatbid[0].bid[0].nurl + '&px=1';
      expect(result.bids[0].ad).to.include(expectedNurl);
    });

    it('should perform usersync for each unique host/zone combination', () => {
      ajaxStub.callsArgWith(1, '');
      const expectedSyncUrls = ['http://rtb.adkernel.com/user-sync?zone=1', 'http://rtb.adkernel.com/user-sync?zone=2',
        'http://rtb-private.adkernel.com/user-sync?zone=1'];
      sandbox.spy(utils, 'createInvisibleIframe');
      doRequest([bid1_zone1, bid2_zone2, bid2_zone2, bid3_host2]);
      expect(utils.createInvisibleIframe.calledThrice);
      let userSyncUrls = utils.createInvisibleIframe.returnValues.map(val => val.src);
      expect(userSyncUrls).to.be.eql(expectedSyncUrls);
    });
  });

  describe('adapter aliasing', () => {
    const ALIAS_NAME = 'adkernelAlias';

    it('should allow bidder code changing', () => {
      expect(adapter.getBidderCode()).to.equal('adkernel');
      adapter.setBidderCode(ALIAS_NAME);
      expect(adapter.getBidderCode()).to.equal(ALIAS_NAME);
    });
  });
});
