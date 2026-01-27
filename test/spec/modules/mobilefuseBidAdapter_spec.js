import * as utils from '../../../src/utils.js';
import { expect } from 'chai';
import { spec } from 'modules/mobilefuseBidAdapter.js';
import { config } from '../../../src/config.js';
import { userSync } from '../../../src/userSync.js';

const bidRequest = {
  bidder: 'mobilefuse',
  params: {
    placement_id: 'test-placement-id',
    bidfloor: 1.25,
  },
  adUnitCode: 'ad-slot-1',
  mediaTypes: {
    banner: {
      sizes: [[300, 250]],
    }
  },
  bidId: 'bid-id-123',
  transactionId: 'txn-id-123',
  gpid: 'test-gpid',
  userIdAsEids: [{
    source: 'sharedid.org',
    uids: [{ id: '01ERJ8WABCXYZ6789', atype: 1 }],
  }],
  schain: {
    ver: '1.0',
    complete: 1,
    nodes: [{ asi: 'exchange.com', sid: 'abc123', hp: 1 }],
  },
};

const bidderRequest = {
  bidderCode: 'mobilefuse',
  bids: [bidRequest],
  uspConsent: '1YNN',
  gppConsent: {
    gppString: 'GPP_CONSENT_STRING',
    applicableSections: [7],
  },
};

const serverResponse = {
  body: {
    seatbid: [{
      bid: [{
        impid: bidRequest.bidId,
        price: 2.5,
        adm: '<div>Ad Markup</div>',
        crid: 'creative123',
        w: 300,
        h: 250,
        mtype: 1,
        adomain: ['example.com'],
      }],
    }],
  }
};

describe('mobilefuseBidAdapter', function () {
  it('should validate bids', function () {
    expect(spec.isBidRequestValid(bidRequest)).to.be.true;
    expect(spec.isBidRequestValid({params: {}})).to.be.false;
  });

  it('should build a valid request payload', function () {
    const request = spec.buildRequests([bidRequest], bidderRequest);
    expect(request.method).to.equal('POST');
    expect(request.url).to.equal('https://mfx.mobilefuse.com/prebidjs');
    expect(request.data).to.be.an('object');

    const imp = request.data.imp[0];
    expect(imp.tagid).to.equal('test-placement-id');
    expect(imp.bidfloor).to.equal(1.25);
    expect(imp.ext.gpid).to.equal('test-gpid');
  });

  it('should include regs in the request', function () {
    const request = spec.buildRequests([bidRequest], bidderRequest);
    const regs = request.data.regs;
    expect(regs.us_privacy).to.equal('1YNN');
    expect(regs.gpp).to.equal('GPP_CONSENT_STRING');
    expect(regs.gpp_sid).to.deep.equal([7]);
  });

  describe('should include ifsync in the request', function () {
    let sandbox;
    let utilsMock;

    beforeEach(() => {
      utilsMock = sinon.mock(utils);
      sandbox = sinon.createSandbox();
      utilsMock = sandbox.mock(utils);
    });

    afterEach(() => {
      utilsMock.restore();
      sandbox.restore();
    });

    it('the ifsync flag should be false for user-sync iframe disabled', function () {
      sandbox.stub(config, 'getConfig')
        .withArgs('userSync')
        .returns({ syncEnabled: true });

      sandbox.stub(userSync, 'canBidderRegisterSync')
        .withArgs('iframe', 'mobilefuse')
        .returns(false);

      const request = spec.buildRequests([bidRequest], bidderRequest);
      const ext = request.data.ext.prebid.mobilefuse;
      expect(ext.ifsync).to.equal(false);
    });

    it('the ifsync flag should be true for user-sync iframe enabled', function () {
      sandbox.stub(config, 'getConfig')
        .withArgs('userSync')
        .returns({ syncEnabled: true });

      sandbox.stub(userSync, 'canBidderRegisterSync')
        .withArgs('iframe', 'mobilefuse')
        .returns(true);

      const request = spec.buildRequests([bidRequest], bidderRequest);
      const ext = request.data.ext.prebid.mobilefuse;
      expect(ext.ifsync).to.equal(true);
    });
  });

  it('should interpret the response correctly', function () {
    const request = spec.buildRequests([bidRequest], bidderRequest);
    const bid = spec.interpretResponse(serverResponse, request)[0];
    expect(bid.cpm).to.equal(2.5);
    expect(bid.ad).to.equal('<div>Ad Markup</div>');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.meta.advertiserDomains).to.deep.equal(['example.com']);
  });

  it('should return user syncs with proper query params when iframe sync is enabled', function () {
    const syncs = spec.getUserSyncs(
      {iframeEnabled: true},
      [],
      null,
      bidderRequest.uspConsent,
      bidderRequest.gppConsent,
    );

    expect(syncs).to.be.an('array').that.has.lengthOf(1);
    const sync = syncs[0];
    expect(sync.type).to.equal('iframe');
    expect(sync.url).to.include('https://mfx.mobilefuse.com/usync');
    expect(sync.url).to.include('gpp=GPP_CONSENT_STRING');
    expect(sync.url).to.include('gpp_sid=7');
  });

  it('should return pixel user syncs when iframe sync is disabled', function () {
    const response = {
      body: {
        ...serverResponse.body,
        ext: {
          syncs: [
            'https://abc.com/pixel?id=123',
            'https://xyz.com/pixel?id=456',
          ]
        }
      }
    };

    const syncs = spec.getUserSyncs(
      {iframeEnabled: false},
      [response],
      null,
      bidderRequest.uspConsent,
      bidderRequest.gppConsent,
    );

    expect(syncs).to.be.an('array').that.has.lengthOf(2);
    expect(syncs[0].type).to.equal('image');
    expect(syncs[0].url).to.equal('https://abc.com/pixel?id=123');
    expect(syncs[1].type).to.equal('image');
    expect(syncs[1].url).to.equal('https://xyz.com/pixel?id=456');
  });
});
