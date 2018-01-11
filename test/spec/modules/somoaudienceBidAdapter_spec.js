import {expect} from 'chai';
import {spec} from 'modules/somoaudienceBidAdapter';
import {getTopWindowLocation, getTopWindowReferrer} from 'src/utils';
import {newBidder} from 'src/adapters/bidderFactory';

describe('Somo Audience Adapter Tests', () => {
  const bidderSet = [
    {
      bidder: 'somoaudience',
      params: {
        placementId: 'test'
      }
    },
  ];

  const bidderAppSet = [
    {
      bidder: 'somoaudience',
      params: {
        placementId: 'test',
        app: {
          bundle: 'com.somoaudience.apps',
          storeUrl: 'http://somoaudience.com/apps',
          domain: 'somoaudience.com',
        }
      }
    },
  ];

  const bidderBadSet = [
    {
      bidder: 'somoaudience',
      params: {
        placement_id: 'test'
      }
    },
  ];

  it('Verifies bidder code', () => {
    expect(spec.code).to.equal('somoaudience');
  });

  it('Verifies bidder aliases', () => {
    expect(spec.aliases).to.have.lengthOf(1);
    expect(spec.aliases[0]).to.equal('somo');
  });

  it('Verifies if bid request valid', () => {
    expect(spec.isBidRequestValid(bidderSet[0])).to.equal(true);
    expect(spec.isBidRequestValid(bidderAppSet[0])).to.equal(true);
    expect(spec.isBidRequestValid({})).to.equal(false);
    expect(spec.isBidRequestValid(bidderBadSet[0])).to.equal(false);
    expect(spec.isBidRequestValid({ params: {} })).to.equal(false);
    expect(spec.isBidRequestValid({ params: { placementId: '12345' }})).to.equal(true);
  });

  it('Verifies buildRequests', () => {
    const request = spec.buildRequests(bidderSet);
    let br = request[0];
    expect(br.url).to.equal('//publisher-east.mobileadtrading.com/rtb/bid?s=test');
    expect(br.method).to.equal('POST');
    const ortbRequest = br.data;
    expect(ortbRequest.site).to.not.equal(null);
    expect(ortbRequest.site.ref).to.equal(getTopWindowReferrer());
    expect(ortbRequest.site.page).to.equal(getTopWindowLocation().href);
    expect(ortbRequest.imp).to.have.lengthOf(1);
    expect(ortbRequest.device).to.not.equal(null);
    expect(ortbRequest.device.ua).to.equal(navigator.userAgent);
  });

  it('Verify parse response', () => {
    const request = spec.buildRequests(bidderSet);
    const ortbRequest = request[0].data;
    const ortbResponse = {
      seatbid: [{
        bid: [{
          impid: ortbRequest.imp[0].id,
          price: 1.25,
          adm: 'Somo Test Ad'
        }]
      }]
    };
    const bids = spec.interpretResponse({ body: ortbResponse }, request);
    const bid = bids[0];
    expect(bid.cpm).to.equal(1.25);
    expect(bid.ad).to.equal('Somo Test Ad');
  });
  it('Verify app requests', () => {
    const request = spec.buildRequests(bidderAppSet);
    const ortbRequest = request[0].data;
    expect(ortbRequest.site).to.equal(null);
    expect(ortbRequest.app).to.not.be.null;
    expect(ortbRequest.app.bundle).to.equal('com.somoaudience.apps');
    expect(ortbRequest.app.storeurl).to.equal('http://somoaudience.com/apps');
    expect(ortbRequest.app.domain).to.equal('somoaudience.com');
  });
});
