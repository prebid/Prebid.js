import { expect } from 'chai';
import { spec } from 'modules/mobilefuseBidAdapter.js';

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

  it('should interpret the response correctly', function () {
    const request = spec.buildRequests([bidRequest], bidderRequest);
    const bid = spec.interpretResponse(serverResponse, request)[0];
    expect(bid.cpm).to.equal(2.5);
    expect(bid.ad).to.equal('<div>Ad Markup</div>');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.meta.advertiserDomains).to.deep.equal(['example.com']);
  });

  it('should return user syncs with proper query params', function () {
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
});
