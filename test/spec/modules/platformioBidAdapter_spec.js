import {expect} from 'chai';
import {spec} from 'modules/platformioBidAdapter';
import {getTopWindowLocation} from 'src/utils';

describe('Platformio Adapter Tests', () => {
  const slotConfigs = [{
    placementCode: '/DfpAccount1/slot1',
    sizes: [[300, 250]],
    bidId: 'bid12345',
    params: {
      pubId: '28082',
      siteId: '26047',
      placementId: '123',
      size: '300x250'
    }
  }, {
    placementCode: '/DfpAccount2/slot2',
    sizes: [[250, 250]],
    bidId: 'bid23456',
    params: {
      pubId: '28082',
      siteId: '26047',
      placementId: '456',
      size: '250x250'
    }
  }];
  it('Verify build request', () => {
    const request = spec.buildRequests(slotConfigs);
    expect(request.url).to.equal('//piohbdisp.hb.adx1.com/');
    expect(request.method).to.equal('POST');
    const ortbRequest = JSON.parse(request.data);
    // site object
    expect(ortbRequest.site).to.not.equal(null);
    expect(ortbRequest.site.publisher).to.not.equal(null);
    expect(ortbRequest.site.publisher.id).to.equal('28082');
    expect(ortbRequest.site.ref).to.equal(window.top.document.referrer);
    expect(ortbRequest.site.page).to.equal(getTopWindowLocation().href);
    expect(ortbRequest.imp).to.have.lengthOf(2);
    // device object
    expect(ortbRequest.device).to.not.equal(null);
    expect(ortbRequest.device.ua).to.equal(navigator.userAgent);
    // slot 1
    expect(ortbRequest.imp[0].tagid).to.equal('123');
    expect(ortbRequest.imp[0].banner).to.not.equal(null);
    expect(ortbRequest.imp[0].banner.w).to.equal(300);
    expect(ortbRequest.imp[0].banner.h).to.equal(250);
    // slot 2
    expect(ortbRequest.imp[1].tagid).to.equal('456');
    expect(ortbRequest.imp[1].banner).to.not.equal(null);
    expect(ortbRequest.imp[1].banner.w).to.equal(250);
    expect(ortbRequest.imp[1].banner.h).to.equal(250);
  });

  it('Verify parse response', () => {
    const request = spec.buildRequests(slotConfigs);
    const ortbRequest = JSON.parse(request.data);
    const ortbResponse = {
      seatbid: [{
        bid: [{
          impid: ortbRequest.imp[0].id,
          price: 1.25,
          adm: 'This is an Ad'
        }]
      }]
    };
    const bids = spec.interpretResponse(ortbResponse, request);
    expect(bids).to.have.lengthOf(1);
    // verify first bid
    const bid = bids[0];
    expect(bid.cpm).to.equal(1.25);
    expect(bid.ad).to.equal('This is an Ad');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.adId).to.equal('bid12345');
    expect(bid.creative_id).to.equal('bid12345');
    expect(bid.creativeId).to.equal('bid12345');
  });

  it('Verify full passback', () => {
    const request = spec.buildRequests(slotConfigs);
    const bids = spec.interpretResponse(null, request)
    expect(bids).to.have.lengthOf(0);
  });

  it('Verifies bidder code', () => {
    expect(spec.code).to.equal('platformio');
  });

  it('Verifies if bid request valid', () => {
    expect(spec.isBidRequestValid(slotConfigs[0])).to.equal(true);
    expect(spec.isBidRequestValid({})).to.equal(false);
    expect(spec.isBidRequestValid({ params: {} })).to.equal(false);
  });
});
