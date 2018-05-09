import { expect } from 'chai'
import { spec } from 'modules/getintentBidAdapter'

describe('GetIntent Adapter Tests:', () => {
  const bidRequests = [{
    bidId: 'bid12345',
    params: {
      pid: 'p1000',
      tid: 't1000'
    },
    sizes: [[300, 250]]
  }];
  const videoBidRequest = {
    bidId: 'bid789',
    params: {
      pid: 'p1001',
      tid: 't1001',
      video: {
        mimes: ['video/mp4', 'application/javascript'],
        max_dur: 20,
        api: [1, 2],
        skippable: true
      }
    },
    sizes: [300, 250],
    mediaType: 'video'
  };

  it('Verify build request', () => {
    const serverRequests = spec.buildRequests(bidRequests);
    let serverRequest = serverRequests[0];
    expect(serverRequest.url).to.equal('//px.adhigh.net/rtb/direct_banner');
    expect(serverRequest.method).to.equal('GET');
    expect(serverRequest.data.bid_id).to.equal('bid12345');
    expect(serverRequest.data.pid).to.equal('p1000');
    expect(serverRequest.data.tid).to.equal('t1000');
    expect(serverRequest.data.size).to.equal('300x250');
    expect(serverRequest.data.is_video).to.equal(false);
  });

  it('Verify build video request', () => {
    const serverRequests = spec.buildRequests([videoBidRequest]);
    let serverRequest = serverRequests[0];
    expect(serverRequest.url).to.equal('//px.adhigh.net/rtb/direct_vast');
    expect(serverRequest.method).to.equal('GET');
    expect(serverRequest.data.bid_id).to.equal('bid789');
    expect(serverRequest.data.pid).to.equal('p1001');
    expect(serverRequest.data.tid).to.equal('t1001');
    expect(serverRequest.data.size).to.equal('300x250');
    expect(serverRequest.data.is_video).to.equal(true);
    expect(serverRequest.data.mimes).to.equal('video/mp4,application/javascript');
    expect(serverRequest.data.max_dur).to.equal(20);
    expect(serverRequest.data.api).to.equal('1,2');
    expect(serverRequest.data.skippable).to.equal(true);
  });

  it('Verify parse response', () => {
    const serverResponse = {
      body: {
        bid_id: 'bid12345',
        cpm: 2.25,
        currency: 'USD',
        size: '300x250',
        creative_id: '1000',
        ad: 'Ad markup'
      },
      headers: {
      }
    };
    const bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(2.25);
    expect(bid.currency).to.equal('USD');
    expect(bid.creativeId).to.equal('1000');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.requestId).to.equal('bid12345');
    expect(bid.mediaType).to.equal('banner');
    expect(bid.ad).to.equal('Ad markup');
  });

  it('Verify parse video response', () => {
    const serverResponse = {
      body: {
        bid_id: 'bid789',
        cpm: 3.25,
        currency: 'USD',
        size: '300x250',
        creative_id: '2000',
        vast_url: '//vast.xml/url'
      },
      headers: {
      }
    };
    const bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(3.25);
    expect(bid.currency).to.equal('USD');
    expect(bid.creativeId).to.equal('2000');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.requestId).to.equal('bid789');
    expect(bid.mediaType).to.equal('video');
    expect(bid.vastUrl).to.equal('//vast.xml/url');
  });

  it('Verify bidder code', () => {
    expect(spec.code).to.equal('getintent');
  });

  it('Verify bidder aliases', () => {
    expect(spec.aliases).to.have.lengthOf(1);
    expect(spec.aliases[0]).to.equal('getintentAdapter');
  });

  it('Verify supported media types', () => {
    expect(spec.supportedMediaTypes).to.have.lengthOf(2);
    expect(spec.supportedMediaTypes[0]).to.equal('video');
    expect(spec.supportedMediaTypes[1]).to.equal('banner');
  });

  it('Verify if bid request valid', () => {
    expect(spec.isBidRequestValid(bidRequests[0])).to.equal(true);
    expect(spec.isBidRequestValid({})).to.equal(false);
    expect(spec.isBidRequestValid({ params: {} })).to.equal(false);
    expect(spec.isBidRequestValid({ params: { test: 123 } })).to.equal(false);
    expect(spec.isBidRequestValid({ params: { pid: 111, tid: 222 } })).to.equal(true);
  });
});
