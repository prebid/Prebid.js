import { expect } from 'chai';
import { spec } from 'modules/mobilefuseBidAdapter.js';

describe('mobilefuseBidAdapter', function () {
  const bidRequest = {
    bidder: 'mobilefuse',
    params: {
      placement_id: 'abc123',
      bidfloor: 1.25
    },
    adUnitCode: 'div-gpt-ad',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    transactionId: 'txn-id-1',
    bidId: 'bid-id-1'
  };

  const bidderRequest = {
    gdprConsent: {
      gdprApplies: true,
      consentString: 'GDPR_CONSENT'
    },
    uspConsent: '1NYN',
    gppConsent: {
      gppString: 'GPP_STRING',
      applicableSections: [7]
    }
  };

  it('should validate required params', function () {
    expect(spec.isBidRequestValid({ params: { placement_id: '123' }})).to.be.true;
    expect(spec.isBidRequestValid({ params: { }})).to.be.false;
  });

  it('should build a valid request', function () {
    const request = spec.buildRequests([bidRequest], bidderRequest);
    expect(request.method).to.equal('POST');
    expect(request.url).to.contain('https://mfx.mobilefuse.com/openrtb');
    expect(request.data).to.be.an('object');
    expect(request.data.imp).to.have.length(1);
    expect(request.data.imp[0].tagid).to.equal('abc123');
    expect(request.data.imp[0].bidfloor).to.equal(1.25);
  });

  it('should interpret the response correctly', function () {
    const serverResponse = {
      body: {
        seatbid: [{
          bid: [{
            impid: 'bid-id-1',
            price: 1.50,
            adm: '<div>ad</div>',
            crid: 'creative123',
            w: 300,
            h: 250
          }]
        }],
        cur: 'USD'
      }
    };

    const interpreted = spec.interpretResponse(serverResponse, {
      data: { imp: [{ id: 'bid-id-1' }] }
    });

    expect(interpreted).to.be.an('array').that.has.length(1);
    const bid = interpreted[0];
    expect(bid.cpm).to.equal(1.50);
    expect(bid.ad).to.equal('<div>ad</div>');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.currency).to.equal('USD');
  });

  it('should return user syncs', function () {
    const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], bidderRequest.gdprConsent, bidderRequest.uspConsent, bidderRequest.gppConsent);
    expect(syncs).to.be.an('array').that.is.not.empty;
    expect(syncs[0].type).to.equal('iframe');
    expect(syncs[0].url).to.contain('https://mfx.mobilefuse.com/usync?');
  });
});
