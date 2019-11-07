import {expect} from 'chai';
import {spec} from 'modules/polluxBidAdapter';
import {utils} from 'src/utils';
import {newBidder} from 'src/adapters/bidderFactory';
import { parseQS } from 'src/url';

describe('POLLUX Bid Adapter tests', function () {
  // ad units setup
  const setup_single_bid = [{
    placementCode: 'div-gpt-ad-1460505661587-0',
    bidId: '789s6354sfg856',
    bidderUrl: '//adn.polluxnetwork.com/prebid/v1',
    sizes: [[728, 90], [300, 250]],
    params: {zone: '1806,276'}
  }];
  const setup_multi_bid = [{
    placementCode: 'div-gpt-ad-1460505661639-0',
    bidId: '21fe992ca48d55',
    sizes: [[300, 250]],
    params: {zone: '1806'}
  }, {
    placementCode: 'div-gpt-ad-1460505661812-0',
    bidId: '23kljh54390534',
    sizes: [[728, 90]],
    params: {zone: '276'}
  }];

  it('TEST: verify buildRequests no valid bid requests', function () {
    let request = spec.buildRequests(false);
    expect(request).to.not.equal(null);
    expect(request).to.not.have.property('method');
    expect(request).to.not.have.property('url');
    expect(request).to.not.have.property('data');
    request = spec.buildRequests([]);
    expect(request).to.not.equal(null);
    expect(request).to.not.have.property('method');
    expect(request).to.not.have.property('url');
    expect(request).to.not.have.property('data');
    request = spec.buildRequests({});
    expect(request).to.not.equal(null);
    expect(request).to.not.have.property('method');
    expect(request).to.not.have.property('url');
    expect(request).to.not.have.property('data');
    request = spec.buildRequests(null);
    expect(request).to.not.equal(null);
    expect(request).to.not.have.property('method');
    expect(request).to.not.have.property('url');
    expect(request).to.not.have.property('data');
  });

  it('TEST: verify buildRequests single bid', function () {
    const request = spec.buildRequests(setup_single_bid);
    expect(request.method).to.equal('POST');
    const requested_bids = JSON.parse(request.data);
    // bids request
    expect(requested_bids).to.not.equal(null);
    expect(requested_bids).to.have.lengthOf(1);
    // bid objects
    expect(requested_bids[0]).to.not.equal(null);
    expect(requested_bids[0]).to.have.property('bidId');
    expect(requested_bids[0]).to.have.property('sizes');
    expect(requested_bids[0]).to.have.property('zones');
    // bid 0
    expect(requested_bids[0].bidId).to.equal('789s6354sfg856');
    expect(requested_bids[0].sizes).to.not.equal(null);
    expect(requested_bids[0].sizes).to.have.lengthOf(2);
    expect(requested_bids[0].sizes[0][0]).to.equal(728);
    expect(requested_bids[0].sizes[0][1]).to.equal(90);
    expect(requested_bids[0].sizes[1][0]).to.equal(300);
    expect(requested_bids[0].sizes[1][1]).to.equal(250);
    expect(requested_bids[0].zones).to.equal('1806,276');
  });

  it('TEST: verify buildRequests multi bid', function () {
    const request = spec.buildRequests(setup_multi_bid);
    expect(request.method).to.equal('POST');
    const requested_bids = JSON.parse(request.data);
    // bids request
    expect(requested_bids).to.not.equal(null);
    expect(requested_bids).to.have.lengthOf(2);
    // bid objects
    expect(requested_bids[0]).to.not.equal(null);
    expect(requested_bids[0]).to.have.property('bidId');
    expect(requested_bids[0]).to.have.property('sizes');
    expect(requested_bids[0]).to.have.property('zones');
    expect(requested_bids[1]).to.not.equal(null);
    expect(requested_bids[1]).to.have.property('bidId');
    expect(requested_bids[1]).to.have.property('sizes');
    expect(requested_bids[1]).to.have.property('zones');
    // bid 0
    expect(requested_bids[0].bidId).to.equal('21fe992ca48d55');
    expect(requested_bids[0].sizes).to.not.equal(null);
    expect(requested_bids[0].sizes).to.have.lengthOf(1);
    expect(requested_bids[0].sizes[0][0]).to.equal(300);
    expect(requested_bids[0].sizes[0][1]).to.equal(250);
    expect(requested_bids[0].zones).to.equal('1806');
    // bid 1
    expect(requested_bids[1].bidId).to.equal('23kljh54390534');
    expect(requested_bids[1].sizes).to.not.equal(null);
    expect(requested_bids[1].sizes).to.have.lengthOf(1);
    expect(requested_bids[1].sizes[0][0]).to.equal(728);
    expect(requested_bids[1].sizes[0][1]).to.equal(90);
    expect(requested_bids[1].zones).to.equal('276');
  });

  it('TEST: verify interpretResponse empty', function () {
    let bids = spec.interpretResponse(false, {});
    expect(bids).to.not.equal(null);
    expect(bids).to.have.lengthOf(0);
    bids = spec.interpretResponse([], {});
    expect(bids).to.not.equal(null);
    expect(bids).to.have.lengthOf(0);
    bids = spec.interpretResponse({}, {});
    expect(bids).to.not.equal(null);
    expect(bids).to.have.lengthOf(0);
    bids = spec.interpretResponse(null, {});
    expect(bids).to.not.equal(null);
    expect(bids).to.have.lengthOf(0);
  });

  it('TEST: verify interpretResponse ad_type url', function () {
    const serverResponse = {
      body: [
        {
          bidId: '789s6354sfg856',
          cpm: '2.15',
          width: '728',
          height: '90',
          ad: 'http://adn.polluxnetwork.com/zone/276?_plx_prebid=1&_plx_campaign=1125',
          ad_type: 'url',
          creativeId: '1125',
          referrer: 'http://www.example.com'
        }
      ]
    };
    const bids = spec.interpretResponse(serverResponse, {});
    expect(bids).to.have.lengthOf(1);
    expect(bids[0].requestId).to.equal('789s6354sfg856');
    expect(bids[0].cpm).to.equal(2.15);
    expect(bids[0].width).to.equal(728);
    expect(bids[0].height).to.equal(90);
    expect(bids[0].ttl).to.equal(3600);
    expect(bids[0].creativeId).to.equal('1125');
    expect(bids[0].netRevenue).to.equal(true);
    expect(bids[0].currency).to.equal('EUR');
    expect(bids[0].referrer).to.equal('http://www.example.com');
    expect(bids[0].adUrl).to.equal('http://adn.polluxnetwork.com/zone/276?_plx_prebid=1&_plx_campaign=1125');
    expect(bids[0]).to.not.have.property('ad');
  });

  it('TEST: verify interpretResponse ad_type html', function () {
    const serverResponse = {
      body: [
        {
          bidId: '789s6354sfg856',
          cpm: '2.15',
          width: '728',
          height: '90',
          ad: '<html><h3>I am an ad</h3></html>',
          ad_type: 'html',
          creativeId: '1125'
        }
      ]
    };
    const bids = spec.interpretResponse(serverResponse, {});
    expect(bids).to.have.lengthOf(1);
    expect(bids[0].requestId).to.equal('789s6354sfg856');
    expect(bids[0].cpm).to.equal(2.15);
    expect(bids[0].width).to.equal(728);
    expect(bids[0].height).to.equal(90);
    expect(bids[0].ttl).to.equal(3600);
    expect(bids[0].creativeId).to.equal('1125');
    expect(bids[0].netRevenue).to.equal(true);
    expect(bids[0].currency).to.equal('EUR');
    expect(bids[0]).to.not.have.property('referrer');
    expect(bids[0]).to.not.have.property('adUrl');
    expect(bids[0].ad).to.equal('<html><h3>I am an ad</h3></html>');
  });

  it('TEST: verify url and query params', function () {
    const URL = require('url-parse');
    const request = spec.buildRequests(setup_single_bid);
    const parsedUrl = new URL('https:' + request.url);
    expect(parsedUrl.origin).to.equal('https://adn.polluxnetwork.com');
    expect(parsedUrl.pathname).to.equal('/prebid/v1');
    expect(parsedUrl).to.have.property('query');
    const parsedQuery = parseQS(parsedUrl.query);
    expect(parsedQuery).to.have.property('domain').and.to.have.length.above(1);
  });

  it('TEST: verify isBidRequestValid', function () {
    expect(spec.isBidRequestValid({})).to.equal(false);
    expect(spec.isBidRequestValid({params: {}})).to.equal(false);
    expect(spec.isBidRequestValid(setup_single_bid[0])).to.equal(true);
    expect(spec.isBidRequestValid(setup_multi_bid[0])).to.equal(true);
    expect(spec.isBidRequestValid(setup_multi_bid[1])).to.equal(true);
  });

  it('TEST: verify bidder code', function () {
    expect(spec.code).to.equal('pollux');
  });

  it('TEST: verify bidder aliases', function () {
    expect(spec.aliases).to.have.lengthOf(1);
    expect(spec.aliases[0]).to.equal('plx');
  });
});
