import {expect} from 'chai';
import {ENDPOINT, spec} from 'modules/appnerveBidAdapter.js';

describe('appnerveBidAdapter', function () {
  const bannerBid = {
    bidId: 'bid-1', transactionId: 'transaction-1', adUnitCode: 'slot-1',
    params: {sourceId: '74000976'},
    mediaTypes: {banner: {sizes: [[300, 250], [320, 50]]}}
  };
  const requestContext = {
    bidderRequestId: 'request-1', auctionId: 'auction-1', timeout: 1000,
    ortb2: {site: {domain: 'publisher.example'}, source: {ext: {schain: {ver: '1.0', complete: 1, nodes: []}}}}
  };

  it('validates required parameters and media types', function () {
    expect(spec.isBidRequestValid(bannerBid)).to.equal(true);
    expect(spec.isBidRequestValid({...bannerBid, params: {placementId: '74000976'}})).to.equal(true);
    expect(spec.isBidRequestValid({...bannerBid, params: {}})).to.equal(false);
    expect(spec.isBidRequestValid({...bannerBid, mediaTypes: {}})).to.equal(false);
  });

  it('builds multi-size banner requests without a CORS preflight content type', function () {
    const [request] = spec.buildRequests([bannerBid], requestContext);
    const payload = JSON.parse(request.data);
    expect(request.url).to.equal(`${ENDPOINT}?ssp_id=74000976`);
    expect(request.options).to.deep.equal({contentType: 'text/plain', withCredentials: false});
    expect(payload.site.domain).to.equal('publisher.example');
    expect(payload.source.ext.schain.complete).to.equal(1);
    expect(payload.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 320, h: 50}]);
  });

  it('groups multiple impressions by source ID', function () {
    const requests = spec.buildRequests([
      bannerBid,
      {...bannerBid, bidId: 'bid-2', params: {sourceId: '74000976'}},
      {...bannerBid, bidId: 'bid-3', params: {sourceId: '74000977'}}
    ], requestContext);
    expect(requests).to.have.length(2);
    expect(JSON.parse(requests[0].data).imp).to.have.length(2);
  });

  it('forwards GDPR, USP, GPP and COPPA signals', function () {
    const [request] = spec.buildRequests([bannerBid], {
      ...requestContext,
      ortb2: {...requestContext.ortb2, regs: {coppa: 1}},
      gdprConsent: {gdprApplies: true, consentString: 'TC_STRING'},
      uspConsent: '1YNN',
      gppConsent: {gppString: 'DBABMA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA', applicableSections: [7, 8]}
    });
    const payload = JSON.parse(request.data);
    expect(payload.regs.coppa).to.equal(1);
    expect(payload.regs.ext.gdpr).to.equal(1);
    expect(payload.regs.ext.us_privacy).to.equal('1YNN');
    expect(payload.regs.ext.gpp_sid).to.deep.equal([7, 8]);
    expect(payload.user.ext.consent).to.equal('TC_STRING');
  });

  it('adds floors and preserves currency', function () {
    const bid = {...bannerBid, getFloor: () => ({floor: 1.25, currency: 'EUR'})};
    const [request] = spec.buildRequests([bid], requestContext);
    const imp = JSON.parse(request.data).imp[0];
    expect(imp.bidfloor).to.equal(1.25);
    expect(imp.bidfloorcur).to.equal('EUR');
  });

  it('builds video, native and audio impressions', function () {
    const video = {...bannerBid, bidId: 'video', mediaTypes: {video: {context: 'outstream', playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [2, 3, 5, 6]}}};
    const native = {...bannerBid, bidId: 'native', mediaTypes: {native: {title: {required: true, len: 90}, image: {required: true, sizes: [1200, 627]}, body: {required: true, len: 140}}}};
    const audio = {...bannerBid, bidId: 'audio', mediaTypes: {audio: {mimes: ['audio/mpeg'], minduration: 5, maxduration: 30, protocols: [2, 3, 5, 6]}}};
    const payload = JSON.parse(spec.buildRequests([video, native, audio], requestContext)[0].data);
    expect(payload.imp[0].video.w).to.equal(640);
    expect(JSON.parse(payload.imp[1].native.request).assets).to.have.length(3);
    expect(payload.imp[2].audio.mimes).to.deep.equal(['audio/mpeg']);
  });

  it('uses the returned Prebid media type for multi-format bids', function () {
    const multi = {...bannerBid, mediaTypes: {...bannerBid.mediaTypes, video: {context: 'outstream', playerSize: [[640, 360]]}}};
    const response = spec.interpretResponse({body: {seatbid: [{bid: [{
      id: 'bid-response', crid: 'creative-1', impid: 'bid-1', price: 0.2,
      adm: '<div>banner</div>', w: 300, h: 250, ext: {prebid: {type: 'banner'}}
    }]}]}}, {bidMap: {'bid-1': multi}});
    expect(response[0].mediaType).to.equal('banner');
    expect(response[0].ad).to.equal('<div>banner</div>');
  });

  it('maps OpenRTB Native 1.2 responses', function () {
    const original = {...bannerBid, mediaTypes: {native: {title: {required: true}}}};
    const adm = JSON.stringify({native: {
      link: {url: 'https://brand.example', clicktrackers: ['https://tracker.example/click']},
      imptrackers: ['https://tracker.example/imp'],
      assets: [
        {id: 1, title: {text: 'Native title'}},
        {id: 2, img: {type: 3, url: 'https://cdn.example/main.jpg', w: 1200, h: 627}},
        {id: 3, data: {type: 2, value: 'Native body'}}
      ]
    }});
    const response = spec.interpretResponse({body: {seatbid: [{bid: [{id: 'b', crid: 'c', impid: 'bid-1', price: 0.4, adm, ext: {prebid: {type: 'native'}}}]}]}}, {bidMap: {'bid-1': original}});
    expect(response[0].native.title).to.equal('Native title');
    expect(response[0].native.image.url).to.equal('https://cdn.example/main.jpg');
    expect(response[0].native.clickUrl).to.equal('https://brand.example');
  });

  it('returns deals, currency and multiple valid bids', function () {
    const body = {cur: 'EUR', seatbid: [
      {seat: 'a', bid: [{id: 'b1', crid: 'c1', impid: 'bid-1', price: 0.2, adm: '<div>A</div>', w: 300, h: 250, dealid: 'deal-1'}]},
      {seat: 'b', bid: [{id: 'b2', crid: 'c2', impid: 'bid-2', price: 0.3, adm: '<div>B</div>', w: 300, h: 250}]}
    ]};
    const responses = spec.interpretResponse({body}, {bidMap: {'bid-1': bannerBid, 'bid-2': {...bannerBid, bidId: 'bid-2'}}});
    expect(responses).to.have.length(2);
    expect(responses[0].dealId).to.equal('deal-1');
    expect(responses[0].currency).to.equal('EUR');
  });

  it('rejects empty, malformed, zero-price and incomplete bids', function () {
    expect(spec.interpretResponse({body: 'not-json'}, {bidMap: {}})).to.deep.equal([]);
    expect(spec.interpretResponse({body: {seatbid: []}}, {bidMap: {}})).to.deep.equal([]);
    const invalid = (bid) => spec.interpretResponse({body: {seatbid: [{bid: [bid]}]}}, {bidMap: {'bid-1': bannerBid}});
    expect(invalid({id: 'b', crid: 'c', impid: 'bid-1', price: 0, adm: '<div/>', w: 300, h: 250})).to.deep.equal([]);
    expect(invalid({id: 'b', crid: 'c', impid: 'bid-1', price: 1, w: 300, h: 250})).to.deep.equal([]);
    expect(invalid({impid: 'bid-1', price: 1, adm: '<div/>', w: 300, h: 250})).to.deep.equal([]);
  });

  it('does not perform user syncing', function () {
    expect(spec.getUserSyncs()).to.deep.equal([]);
  });
});
