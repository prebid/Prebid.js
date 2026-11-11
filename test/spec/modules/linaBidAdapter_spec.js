import { expect } from 'chai';
import { spec } from 'modules/linaBidAdapter';
import { config } from 'src/config';
import { coppaDataHandler } from 'src/consentHandler';
import { toFetchRequest } from 'src/ajax';
import sinon from 'sinon';

const BID_REQUEST = {
  bidder: 'lina',
  params: {
    publisherId: 'pub-10001',
    placementId: '550e8400-e29b-41d4-a716-446655440000',
  },
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [728, 90]],
    },
  },
  ortb2Imp: {
    ext: { gpid: '/1234/lina-banner' },
  },
  adUnitCode: 'lina-banner',
  transactionId: 'transaction-001',
  bidId: 'bid-001',
  bidderRequestId: 'bidder-request-001',
  auctionId: 'auction-001',
  sizes: [[300, 250], [728, 90]],
};

const BIDDER_REQUEST = {
  auctionId: 'auction-001',
  timeout: 1000,
  refererInfo: {
    page: 'https://publisher.example/article',
    domain: 'publisher.example',
    ref: 'https://referrer.example',
  },
  gdprConsent: {
    gdprApplies: true,
    consentString: 'consent-001',
  },
  gppConsent: {
    gppString: 'gpp-001',
    applicableSections: [7, 8],
  },
  ortb2: {
    site: { page: 'https://publisher.example/article', domain: 'publisher.example', ref: 'https://referrer.example' },
    device: { ua: 'test-user-agent' },
    source: { ext: { schain: { ver: '1.0', nodes: [] } } },
  },
};

const VALID_RESPONSE = {
  requestId: 'lina-request-001',
  currency: 'USD',
  bids: [{
    requestId: 'bid-001',
    cpm: 2.5,
    currency: 'USD',
    creativeId: 'creative-001',
    ttl: 300,
    netRevenue: true,
    mediaType: 'banner',
    width: 300,
    height: 250,
    ad: '<div>test creative</div>',
    meta: { advertiserDomains: ['advertiser.example'] },
  }],
};

describe('linaBidAdapter', function () {
  const sandbox = sinon.createSandbox();

  afterEach(function () {
    sandbox.restore();
  });

  it('ignores endpoint overrides and uses the fixed HTTPS endpoint for each auction', function () {
    const getConfig = sandbox.stub(config, 'getConfig');
    [
      'https://dev-ssp.example/v1/prebid/bids',
      'https://qa-ssp.example/v1/prebid/bids',
      'http://ssp-api.qa.web3lge.com/v1/prebid/bids',
      'http://127.0.0.1:3000/v1/prebid/bids',
      '//other.example/v1/prebid/bids',
    ].forEach((endpoint) => {
      getConfig.withArgs('lina.endpoint').returns(endpoint);
      expect(spec.buildRequests([BID_REQUEST], BIDDER_REQUEST).url).to.equal('https://ssp-api.qa.web3lge.com/v1/prebid/bids');
    });
    expect(getConfig.calledWith('lina.endpoint')).to.equal(false);
  });

  it('uses the fixed HTTPS endpoint without configuration', function () {
    expect(spec.buildRequests([BID_REQUEST], BIDDER_REQUEST).url).to.equal('https://ssp-api.qa.web3lge.com/v1/prebid/bids');
  });

  it('accepts a valid banner request and rejects missing identifiers', function () {
    expect(spec.isBidRequestValid(BID_REQUEST)).to.equal(true);
    expect(spec.isBidRequestValid({
      ...BID_REQUEST,
      params: { publisherId: 'pub-10001', placementId: '550e8400-e29b-41d4-a716-446655440000' },
    })).to.equal(true);
    expect(spec.isBidRequestValid({ ...BID_REQUEST, params: { publisherId: '', placementId: '550e8400-e29b-41d4-a716-446655440000' } })).to.equal(false);
    expect(spec.isBidRequestValid({ ...BID_REQUEST, params: { publisherId: 'pub-10001', placementId: 'display-001' } })).to.equal(true);
    expect(spec.isBidRequestValid({ ...BID_REQUEST, params: { publisherId: 'pub-10001' } })).to.equal(false);
  });

  it('declares only media types enabled in the build', function () {
    expect(spec.supportedMediaTypes).to.deep.equal(['banner', 'video', ...(FEATURES.NATIVE ? ['native'] : [])]);
  });

  if (FEATURES.NATIVE) {
    it('requires a non-empty Native asset request', function () {
      const nativeBid = {
        ...BID_REQUEST,
        mediaTypes: { native: { ortb: { ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 80 } }] } } },
        sizes: undefined,
      };

      expect(spec.isBidRequestValid(nativeBid)).to.equal(true);
      expect(spec.isBidRequestValid({ ...nativeBid, mediaTypes: { native: {} } })).to.equal(false);
      expect(spec.isBidRequestValid({ ...nativeBid, mediaTypes: { native: { ortb: { ver: '1.2', assets: [] } } } })).to.equal(false);
      expect(spec.isBidRequestValid({
        ...nativeBid,
        mediaTypes: { native: { ortb: { assets: [{ id: 1, title: { len: 80 }, data: { type: 1 } }] } } },
      })).to.equal(false);

      const mixedBid = {
        ...BID_REQUEST,
        mediaTypes: { banner: { sizes: [[300, 250]] }, native: {} },
      };
      expect(spec.isBidRequestValid(mixedBid)).to.equal(true);
      const mixedRequest = spec.buildRequests([mixedBid], BIDDER_REQUEST);
      expect(mixedRequest.data.bids[0].ortb2Imp.banner.format).to.deep.equal([{ w: 300, h: 250 }]);
      expect(mixedRequest.data.bids[0].ortb2Imp).not.to.have.property('native');
    });
  }

  if (FEATURES.NATIVE) {
    it('forwards Publisher Native assets without restoring a stale imp request', function () {
      const nativeRequest = { ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 80 } }] };
      const request = spec.buildRequests([{
        ...BID_REQUEST,
        mediaTypes: { native: { ortb: nativeRequest } },
        sizes: undefined,
        ortb2Imp: { native: { request: '{"ver":"stale","assets":[]}' } },
      }], BIDDER_REQUEST);

      expect(JSON.parse(request.data.bids[0].ortb2Imp.native.request)).to.deep.equal(nativeRequest);
    });
  }

  if (!FEATURES.NATIVE) {
    it('rejects Native-only bids and excludes Native from mixed bids when disabled', function () {
      const native = { ortb: { ver: '1.2', assets: [{ id: 1, title: { len: 80 } }] } };
      expect(spec.isBidRequestValid({
        ...BID_REQUEST, mediaTypes: { native }, sizes: undefined,
      })).to.equal(false);

      const mixedBid = {
        ...BID_REQUEST,
        mediaTypes: { ...BID_REQUEST.mediaTypes, native },
        ortb2Imp: { ...BID_REQUEST.ortb2Imp, native: { request: JSON.stringify(native.ortb) } },
      };
      expect(spec.isBidRequestValid(mixedBid)).to.equal(true);
      const request = spec.buildRequests([mixedBid], BIDDER_REQUEST);
      expect(request.data.bids[0].ortb2Imp).not.to.have.property('native');
      expect(request.data.bids[0].ortb2Imp.banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
      expect(spec.interpretResponse({ body: VALID_RESPONSE }, request)).to.have.lengthOf(1);

      request.data.bids[0].ortb2Imp.native = { request: JSON.stringify(native.ortb) };
      expect(spec.interpretResponse({
        body: {
          ...VALID_RESPONSE,
          bids: [{
            ...VALID_RESPONSE.bids[0],
            mediaType: 'native',
            width: 0,
            height: 0,
            ad: JSON.stringify({ ver: '1.2', assets: [{ id: 1, title: { text: 'Native title' } }] }),
          }],
        },
      }, request)).to.deep.equal([]);
    });
  }

  it('builds one LINA batch request with ORTB and privacy signals', function () {
    const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);

    expect(request.method).to.equal('POST');
    expect(request.url).to.equal('https://ssp-api.qa.web3lge.com/v1/prebid/bids');
    expect(request.data.auctionId).to.equal('auction-001');
    expect(request.data.publisherId).to.equal('pub-10001');
    expect(request.data.timeoutMs).to.equal(1000);
    expect(request.data.ortb2.site).to.deep.equal(BIDDER_REQUEST.ortb2.site);
    expect(request.data.ortb2.site).not.to.have.property('publisher');
    expect(request.data.ortb2.device).to.deep.equal(BIDDER_REQUEST.ortb2.device);
    expect(request.data.ortb2.source).to.deep.equal(BIDDER_REQUEST.ortb2.source);
    expect(request.data.ortb2).not.to.have.property('id');
    expect(request.data.ortb2).not.to.have.property('tmax');
    expect(request.data.ortb2).not.to.have.property('cur');
    expect(request.data).not.to.have.property('page');
    expect(request.data.privacy).to.include({
      gdprApplies: true,
      consentString: 'consent-001',
      gppString: 'gpp-001',
    });
    expect(request.data.privacy.gppSections).to.deep.equal([7, 8]);
    expect(request.data.bids).to.have.lengthOf(1);
    expect(request.data.bids[0]).to.deep.include({
      bidId: 'bid-001', transactionId: 'transaction-001', adUnitCode: 'lina-banner',
    });
    expect(request.data.bids[0]).not.to.have.property('placementId');
    expect(request.data.bids[0].ortb2Imp.banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
    expect(request.data.bids[0].ortb2Imp.ext).to.deep.include(BID_REQUEST.ortb2Imp.ext);
    expect(request).not.to.have.property('options');

    const requestWithMissingBidderAuctionId = spec.buildRequests([BID_REQUEST], { ...BIDDER_REQUEST, auctionId: undefined });
    expect(requestWithMissingBidderAuctionId.data).not.to.have.property('auctionId');
  });

  it('uses a safelisted POST with JSON in the body and no custom headers', function () {
    const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
    const transport = toFetchRequest(request.url, JSON.stringify(request.data), {
      method: request.method,
      withCredentials: true,
      ...request.options,
    });

    expect(transport.method).to.equal('POST');
    expect([...transport.headers.keys()]).to.deep.equal(['content-type']);
    expect(transport.headers.get('Content-Type')).to.equal('text/plain');
    expect(transport.credentials).to.equal('include');
    expect(request.data.publisherId).to.equal(BID_REQUEST.params.publisherId);
  });

  it('preserves shared TIDs independently of legacy aliases and request IDs', function () {
    const ortb2 = { ...BIDDER_REQUEST.ortb2, id: 'publisher-request', source: { tid: 'shared-auction-tid' } };
    const ortb2Imp = { ext: { tid: 'shared-imp-tid', gpid: '/banner' } };
    const request = spec.buildRequests([{ ...BID_REQUEST, ortb2Imp }], { ...BIDDER_REQUEST, ortb2 });
    expect(request.data.ortb2.source.tid).to.equal('shared-auction-tid');
    expect(request.data.bids[0].ortb2Imp.ext.tid).to.equal('shared-imp-tid');
    expect(request.data.ortb2.id).to.equal('publisher-request');
    expect(request.data.bids[0].ortb2Imp.id).to.equal(BID_REQUEST.bidId);
    expect(ortb2.source.tid).to.equal('shared-auction-tid');
    expect(ortb2Imp.ext.tid).to.equal('shared-imp-tid');
  });

  it('accepts unshared TIDs without generating or backfilling them', function () {
    [undefined, null, '', ' ', 123, false].forEach((tid) => {
      const ortb2 = { ...BIDDER_REQUEST.ortb2, source: { tid, fd: 0 } };
      const bid = { ...BID_REQUEST, auctionId: tid, transactionId: tid, ortb2Imp: { ext: { tid, gpid: '/banner' } } };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      const request = spec.buildRequests([bid], { ...BIDDER_REQUEST, auctionId: tid, ortb2 });
      expect(request.data).not.to.have.property('auctionId');
      expect(request.data.ortb2).not.to.have.property('id');
      expect(request.data.ortb2.source).to.deep.equal(ortb2.source);
      expect(request.data.bids[0]).not.to.have.property('transactionId');
      expect(request.data.bids[0].ortb2Imp.ext).to.deep.equal(bid.ortb2Imp.ext);
      expect(ortb2.source).to.have.property('tid', tid);
      expect(bid.ortb2Imp.ext).to.have.property('tid', tid);
    });
    const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
    expect(request.data.ortb2.source).not.to.have.property('tid');
    expect(request.data.bids[0].ortb2Imp.ext).not.to.have.property('tid');
  });

  it('keeps shared and unshared impression TIDs separate within a batch', function () {
    const request = spec.buildRequests([
      { ...BID_REQUEST, ortb2Imp: { ext: { tid: 'shared-first-imp' } } },
      { ...BID_REQUEST, bidId: 'bid-002', ortb2Imp: { ext: { gpid: '/second' } } },
    ], BIDDER_REQUEST);
    expect(request.data.ortb2.source).not.to.have.property('tid');
    expect(request.data.bids[0].ortb2Imp.ext.tid).to.equal('shared-first-imp');
    expect(request.data.bids[1].ortb2Imp.ext).not.to.have.property('tid');
  });

  it('forwards only the banner sizes selected by Prebid, not stale imp formats', function () {
    const request = spec.buildRequests([{
      ...BID_REQUEST,
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      ortb2Imp: {
        banner: { format: [{ w: 300, h: 250 }, { w: 728, h: 90 }], pos: 1 },
        ext: BID_REQUEST.ortb2Imp.ext,
      },
    }], BIDDER_REQUEST);

    expect(request.data.bids[0].ortb2Imp.banner).to.deep.equal({ format: [{ w: 300, h: 250 }], pos: 1 });
    expect(request.data.bids[0].ortb2Imp.ext).to.deep.equal(BID_REQUEST.ortb2Imp.ext);
  });

  it('does not restore a banner from ortb2Imp for a video-only bid', function () {
    const request = spec.buildRequests([{
      ...BID_REQUEST,
      mediaTypes: { video: { playerSize: [640, 360], mimes: ['video/mp4'], protocols: [3] } },
      sizes: undefined,
      ortb2Imp: { banner: { format: [{ w: 300, h: 250 }] } },
    }], BIDDER_REQUEST);

    expect(request.data.bids[0].ortb2Imp).not.to.have.property('banner');
    expect(request.data.bids[0].ortb2Imp.video).to.include({ w: 640, h: 360 });
  });

  it('forwards the Prebid Core default timeout when bidderTimeout is not configured', function () {
    const request = spec.buildRequests([BID_REQUEST], { ...BIDDER_REQUEST, timeout: 3000 });

    expect(request.data.timeoutMs).to.equal(3000);
  });

  it('forwards an explicitly configured bidder timeout', function () {
    const request = spec.buildRequests([BID_REQUEST], { ...BIDDER_REQUEST, timeout: 1000 });

    expect(request.data.timeoutMs).to.equal(1000);
  });

  it('preserves an unknown GDPR applicability state', function () {
    const requestWithoutConsent = spec.buildRequests([BID_REQUEST], { ...BIDDER_REQUEST, gdprConsent: undefined });
    expect(requestWithoutConsent.data.privacy).not.to.have.property('gdprApplies');

    const requestWithExplicitFalse = spec.buildRequests([BID_REQUEST], {
      ...BIDDER_REQUEST,
      gdprConsent: { gdprApplies: false },
    });
    expect(requestWithExplicitFalse.data.privacy.gdprApplies).to.equal(false);
  });

  it('uses explicit request COPPA ahead of the global setting without mutating input', function () {
    const getCoppa = sandbox.stub(coppaDataHandler, 'getCoppa');
    for (const globalCoppa of [false, true]) {
      getCoppa.returns(globalCoppa);
      for (const coppa of [0, 1]) {
        const ortb2 = { ...BIDDER_REQUEST.ortb2, regs: { coppa, gdpr: 1 } };
        const bidderRequest = { ...BIDDER_REQUEST, ortb2 };
        const before = JSON.stringify(bidderRequest);
        const request = spec.buildRequests([BID_REQUEST], bidderRequest);

        expect(request.data.privacy.coppa).to.equal(coppa === 1);
        expect(request.data.ortb2).to.deep.equal(ortb2);
        expect(JSON.stringify(bidderRequest)).to.equal(before);
      }
    }
    expect(getCoppa.called).to.equal(false);
  });

  it('uses global COPPA when the request flag is absent', function () {
    const getCoppa = sandbox.stub(coppaDataHandler, 'getCoppa');
    for (const globalCoppa of [false, true]) {
      getCoppa.returns(globalCoppa);
      for (const ortb2 of [undefined, {}, { regs: {} }]) {
        const request = spec.buildRequests([BID_REQUEST], { ...BIDDER_REQUEST, ortb2 });
        expect(request.data.privacy.coppa).to.equal(globalCoppa);
      }
    }
    expect(getCoppa.callCount).to.equal(6);
  });

  it('falls back to global COPPA rather than coercing malformed request values', function () {
    const getCoppa = sandbox.stub(coppaDataHandler, 'getCoppa');
    for (const globalCoppa of [false, true]) {
      getCoppa.returns(globalCoppa);
      for (const coppa of [null, false, true, '0', '1', -1, 2]) {
        const ortb2 = { ...BIDDER_REQUEST.ortb2, regs: { coppa } };
        const request = spec.buildRequests([BID_REQUEST], { ...BIDDER_REQUEST, ortb2 });
        expect(request.data.privacy.coppa).to.equal(globalCoppa);
        expect(request.data.ortb2.regs.coppa).to.equal(coppa);
      }
    }
    expect(getCoppa.callCount).to.equal(14);
  });

  it('uses the top-level publisher ID and OpenRTB tag ID as canonical identifiers', function () {
    const request = spec.buildRequests([{
      ...BID_REQUEST,
      params: { publisherId: ' pub_local_001 ', placementId: ' 550e8400-e29b-41d4-a716-446655440000 ' },
    }], BIDDER_REQUEST);

    expect(request).not.to.have.property('options');
    expect(request.data.publisherId).to.equal('pub_local_001');
    expect(request.data.ortb2.site).not.to.have.property('publisher');
    expect(request.data.bids[0]).not.to.have.property('placementId');
    expect(request.data.bids[0].ortb2Imp.tagid).to.equal('550e8400-e29b-41d4-a716-446655440000');
  });

  it('splits batches when publisher ids differ', function () {
    const secondBid = {
      ...BID_REQUEST,
      bidId: 'bid-002',
      params: { publisherId: 'pub-second', placementId: '550e8400-e29b-41d4-a716-446655440001' },
    };
    const requests = spec.buildRequests([BID_REQUEST, secondBid], BIDDER_REQUEST);

    expect(requests).to.have.lengthOf(2);
    expect(requests[0].data.publisherId).to.equal(BID_REQUEST.params.publisherId);
    expect(requests[1].data.publisherId).to.equal('pub-second');
    requests.forEach((request) => expect(request).not.to.have.property('options'));
  });

  it('preserves client OpenRTB currency for the SSP to resolve', function () {
    const requestWithCurrency = spec.buildRequests([BID_REQUEST], {
      ...BIDDER_REQUEST,
      ortb2: {
        ...BIDDER_REQUEST.ortb2,
        cur: ['KRW'],
      },
    });
    expect(requestWithCurrency.data).not.to.have.property('currency');
    expect(requestWithCurrency.data.ortb2.site).to.deep.equal(BIDDER_REQUEST.ortb2.site);
    expect(requestWithCurrency.data.ortb2.device).to.deep.equal(BIDDER_REQUEST.ortb2.device);
    expect(requestWithCurrency.data.ortb2.source).to.deep.equal(BIDDER_REQUEST.ortb2.source);
    expect(requestWithCurrency.data.ortb2).not.to.have.property('id');
    expect(requestWithCurrency.data.ortb2.cur).to.deep.equal(['KRW']);

    const requestWithoutCurrency = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
    expect(requestWithoutCurrency.data).not.to.have.property('currency');
  });

  it('preserves extensions without duplicating SSP currency policy', function () {
    const request = spec.buildRequests([BID_REQUEST], {
      ...BIDDER_REQUEST,
      ortb2: { ext: { prebid: { adServerCurrency: 'JPY' } } },
    });
    expect(request.data.ortb2).not.to.have.property('cur');
    expect(request.data.ortb2.ext).to.deep.equal({ prebid: { adServerCurrency: 'JPY' } });
  });

  it('leaves OpenRTB timeout policy to the SSP without modifying the input', function () {
    const ortb2 = { ...BIDDER_REQUEST.ortb2, cur: ['KRW'], tmax: 3000 };
    const request = spec.buildRequests([BID_REQUEST], { ...BIDDER_REQUEST, timeout: 1000, ortb2 });
    expect(request.data.ortb2).to.equal(ortb2);
    expect(request.data.timeoutMs).to.equal(1000);
    expect(ortb2).to.deep.include({ cur: ['KRW'], tmax: 3000 });
  });

  it('does not manufacture a floor using the client floor module', function () {
    const requestWithFloor = spec.buildRequests([{
      ...BID_REQUEST,
      params: { publisherId: 'pub-10001', placementId: '550e8400-e29b-41d4-a716-446655440000' },
      getFloor: () => ({ floor: 1000, currency: 'KRW' }),
    }], BIDDER_REQUEST);
    expect(requestWithFloor.data.publisherId).to.equal('pub-10001');
    expect(requestWithFloor.data.bids[0].ortb2Imp.tagid).to.equal('550e8400-e29b-41d4-a716-446655440000');
    expect(requestWithFloor.data.bids[0].ortb2Imp).not.to.have.property('bidfloor');
    expect(requestWithFloor.data.bids[0].ortb2Imp).not.to.have.property('bidfloorcur');

    const requestWithZeroFloor = spec.buildRequests([{
      ...BID_REQUEST,
      getFloor: () => ({ floor: 0, currency: 'KRW' }),
    }], BIDDER_REQUEST);
    const request = spec.buildRequests([{
      ...BID_REQUEST,
      getFloor: () => ({ floor: Number.NaN, currency: 'KRW' }),
    }], BIDDER_REQUEST);
    expect(requestWithZeroFloor.data.bids[0].ortb2Imp).not.to.have.property('bidfloor');
    expect(request.data.bids[0].ortb2Imp).not.to.have.property('bidfloor');
  });

  it('rejects invalid sizes and unsupported media types', function () {
    expect(spec.isBidRequestValid({
      ...BID_REQUEST,
      mediaTypes: { banner: { sizes: [[0, 250]] } },
      sizes: [[0, 250]],
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      ...BID_REQUEST,
      mediaTypes: { banner: {} },
      sizes: undefined,
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      ...BID_REQUEST,
      mediaTypes: { video: { playerSize: [[300, 250]], mimes: ['video/mp4'], protocols: [3] } },
      sizes: undefined,
    })).to.equal(true);
    expect(spec.isBidRequestValid({
      ...BID_REQUEST,
      mediaTypes: { video: { playerSize: [300, 250], mimes: ['video/mp4'], protocols: [3] } },
      sizes: undefined,
    })).to.equal(true);
    expect(spec.isBidRequestValid({
      ...BID_REQUEST,
      mediaTypes: { video: { playerSize: [[0, 250], [640, 360], [1280, 720]], mimes: ['video/mp4'] } },
      sizes: undefined,
    })).to.equal(true);
    expect(spec.isBidRequestValid({
      ...BID_REQUEST,
      mediaTypes: { video: {} },
      sizes: undefined,
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      ...BID_REQUEST,
      mediaTypes: { video: { playerSize: [[0, 250]] } },
      sizes: undefined,
    })).to.equal(false);
    for (const video of [
      { playerSize: [[640, 360]], mimes: [], protocols: [3] },
      { playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [] },
      { playerSize: [[640, 360]], mimes: [''], protocols: [3] },
      { playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: ['3'] },
      { playerSize: [[640, 360]] },
      { playerSize: [[640, 360]], mimes: ['video/mp4'], minduration: -1 },
      { playerSize: [[640, 360]], mimes: ['video/mp4'], minduration: 0.5 },
      { playerSize: [[640, 360]], mimes: ['video/mp4'], maxduration: -1 },
      { playerSize: [[640, 360]], mimes: ['video/mp4'], maxduration: null },
      { playerSize: [[0, 250], [-1, 720]] },
    ]) {
      expect(spec.isBidRequestValid({ ...BID_REQUEST, mediaTypes: { video }, sizes: undefined })).to.equal(false);
    }
    expect(spec.isBidRequestValid({
      ...BID_REQUEST,
      mediaTypes: { native: { ortb: { ver: '1.2', assets: [{ id: 1, title: { len: 80 } }] } } },
      sizes: undefined,
    })).to.equal(FEATURES.NATIVE);
    expect(spec.isBidRequestValid({
      ...BID_REQUEST,
      mediaTypes: { banner: { sizes: [[300, 250], null] } },
    })).to.equal(false);
    expect(spec.isBidRequestValid({
      ...BID_REQUEST,
      mediaTypes: { banner: { sizes: [[300, 250], ['728', '90']] } },
    })).to.equal(false);
  });

  it('builds a video request with player and VAST hints', function () {
    const videoBid = {
      ...BID_REQUEST,
      mediaTypes: {
        video: {
          playerSize: [[640, 360]],
          mimes: ['video/mp4', 'application/x-mpegURL'],
          protocols: [2, 3],
          minduration: 5,
          maxduration: 30,
        },
      },
      sizes: undefined,
    };
    const request = spec.buildRequests([videoBid], BIDDER_REQUEST);

    expect(request.data.bids[0].ortb2Imp.video).to.deep.include({ w: 640, h: 360 });
    expect(request.data.bids[0].ortb2Imp.video).to.deep.include({
      mimes: ['video/mp4', 'application/x-mpegURL'],
      protocols: [2, 3],
      minduration: 5,
      maxduration: 30,
    });
    expect(request.data.bids[0].ortb2Imp).not.to.have.property('banner');
  });

  it('chooses the first valid video size and preserves playback fields from ORTB', function () {
    const videoBid = {
      ...BID_REQUEST,
      mediaTypes: { video: { playerSize: [[0, 250], [640, 360], [1280, 720]] } },
      sizes: undefined,
      ortb2Imp: { video: { w: 1280, h: 720, mimes: ['video/webm'], protocols: [5] } },
    };
    expect(spec.isBidRequestValid(videoBid)).to.equal(true);
    const request = spec.buildRequests([videoBid], BIDDER_REQUEST);

    expect(request.data.bids[0].ortb2Imp.video).to.deep.equal({
      w: 640, h: 360, mimes: ['video/webm'], protocols: [5],
    });

    const withMime = spec.buildRequests([{
      ...videoBid,
      mediaTypes: { video: { playerSize: [[640, 360]], mimes: ['video/webm'] } },
    }], BIDDER_REQUEST);
    expect(withMime.data.bids[0].ortb2Imp.video).to.deep.equal({
      w: 640, h: 360, mimes: ['video/webm'], protocols: [5],
    });

    const withProtocols = spec.buildRequests([{
      ...videoBid,
      mediaTypes: { video: { playerSize: [[640, 360]], protocols: [5] } },
    }], BIDDER_REQUEST);
    expect(withProtocols.data.bids[0].ortb2Imp.video).to.deep.equal({
      w: 640, h: 360, mimes: ['video/webm'], protocols: [5],
    });
  });

  it('keeps selected video settings when ortb2Imp contains stale video fields', function () {
    const request = spec.buildRequests([{
      ...BID_REQUEST,
      mediaTypes: {
        video: { playerSize: [[640, 360]], mimes: ['video/webm'], protocols: [3], minduration: 10, maxduration: 20 },
      },
      sizes: undefined,
      ortb2Imp: {
        video: { w: 1280, h: 720, mimes: ['video/mp4'], protocols: [2], minduration: 5, maxduration: 30 },
      },
    }], BIDDER_REQUEST);

    expect(request.data.bids[0].ortb2Imp.video).to.deep.equal({
      w: 640, h: 360, mimes: ['video/webm'], protocols: [3], minduration: 10, maxduration: 20,
    });

    const withoutDuration = spec.buildRequests([{
      ...BID_REQUEST,
      mediaTypes: { video: { playerSize: [[640, 360]], mimes: ['video/webm'], protocols: [3] } },
      sizes: undefined,
      ortb2Imp: { video: { w: 1280, h: 720, minduration: 10, maxduration: 20 } },
    }], BIDDER_REQUEST);
    expect(withoutDuration.data.bids[0].ortb2Imp.video).to.deep.equal({
      w: 640, h: 360, mimes: ['video/webm'], protocols: [3], minduration: 10, maxduration: 20,
    });

    const withMinDuration = spec.buildRequests([{
      ...BID_REQUEST,
      mediaTypes: { video: { playerSize: [[640, 360]], mimes: ['video/webm'], minduration: 10 } },
      sizes: undefined,
    }], BIDDER_REQUEST);
    expect(withMinDuration.data.bids[0].ortb2Imp.video).to.deep.equal({
      w: 640, h: 360, mimes: ['video/webm'], minduration: 10,
    });
  });

  it('preserves omitted video options and explicit zero without inventing defaults', function () {
    [
      {},
      { maxduration: 2 },
      { minduration: 40 },
      { minduration: 0 },
      { minduration: 0, maxduration: 2, pos: 0 },
      { minduration: 1, maxduration: 2 },
    ].forEach((input) => {
      const bid = { ...BID_REQUEST, mediaTypes: { video: { playerSize: [[640, 360]], mimes: ['video/webm'], ...input } } };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      const request = spec.buildRequests([bid], BIDDER_REQUEST);
      expect(request.data.bids[0].ortb2Imp.video).to.deep.equal({ w: 640, h: 360, mimes: ['video/webm'], ...input });
    });
    expect(spec.isBidRequestValid({
      ...BID_REQUEST,
      mediaTypes: { video: { playerSize: [[640, 360]], mimes: ['video/webm'], minduration: 40, maxduration: 2 } },
    })).to.equal(false);
  });

  it('preserves standard video fields and extensions without mutating input or merging arrays', function () {
    const bid = {
      ...BID_REQUEST,
      mediaTypes: { video: { playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [2], api: [2], skip: 0, startdelay: 0, playbackmethod: [1] } },
      ortb2Imp: { video: { protocols: [3], ext: { custom: true } }, bidfloor: 99, bidfloorcur: 'KRW', audio: { mimes: ['audio/mp3'] }, id: 'stale', tagid: 'stale' },
    };
    const before = JSON.stringify(bid);
    const imp = spec.buildRequests([bid], BIDDER_REQUEST).data.bids[0].ortb2Imp;
    expect(imp.video).to.deep.include({ api: [2], skip: 0, startdelay: 0, playbackmethod: [1], protocols: [2], ext: { custom: true } });
    expect(imp).to.include({ id: BID_REQUEST.bidId, tagid: BID_REQUEST.params.placementId });
    expect(imp).to.deep.include({ bidfloor: 99, bidfloorcur: 'KRW', audio: { mimes: ['audio/mp3'] } });
    expect(JSON.stringify(bid)).to.equal(before);
  });

  it('preserves valid banner demand when mixed video parameters are invalid', function () {
    for (const video of [
      {},
      { playerSize: [[640, 360]] },
      { playerSize: [[0, 360]], mimes: ['video/mp4'] },
      { playerSize: [[640, 360]], mimes: [] },
      { playerSize: [[640, 360]], mimes: [' '] },
      { playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [] },
      { playerSize: [[640, 360]], mimes: ['video/mp4'], minduration: -1 },
      { playerSize: [[640, 360]], mimes: ['video/mp4'], minduration: 30, maxduration: 5 },
    ]) {
      const mixedBid = {
        ...BID_REQUEST,
        mediaTypes: { banner: { sizes: [[300, 250]] }, video },
        ortb2Imp: {
          ...BID_REQUEST.ortb2Imp,
          video: { w: 1280, h: 720, pos: 1 },
        },
      };
      const before = JSON.stringify(mixedBid);

      expect(spec.isBidRequestValid(mixedBid)).to.equal(true);
      const request = spec.buildRequests([mixedBid], BIDDER_REQUEST);
      expect(request.data.bids[0].ortb2Imp.banner.format).to.deep.equal([{ w: 300, h: 250 }]);
      expect(request.data.bids[0].ortb2Imp).not.to.have.property('video');
      expect(request.data.bids[0].ortb2Imp.ext).to.deep.equal(BID_REQUEST.ortb2Imp.ext);
      expect(spec.interpretResponse({ body: VALID_RESPONSE }, request)).to.have.lengthOf(1);
      expect(spec.interpretResponse({
        body: {
          ...VALID_RESPONSE,
          bids: [{ ...VALID_RESPONSE.bids[0], mediaType: 'video', ad: '<VAST version="3.0"></VAST>' }],
        },
      }, request)).to.deep.equal([]);
      expect(JSON.stringify(mixedBid)).to.equal(before);
    }
  });

  it('preserves valid video demand when mixed banner sizes are invalid', function () {
    for (const banner of [{}, { sizes: [] }, { sizes: [[0, 250]] }, { sizes: [[300, 250], null] }]) {
      const mixedBid = {
        ...BID_REQUEST,
        mediaTypes: { banner, video: { playerSize: [[640, 360]], mimes: ['video/mp4'] } },
        ortb2Imp: { ...BID_REQUEST.ortb2Imp, banner: { format: [{ w: 300, h: 250 }], pos: 1 } },
      };

      expect(spec.isBidRequestValid(mixedBid)).to.equal(true);
      const request = spec.buildRequests([mixedBid], BIDDER_REQUEST);
      expect(request.data.bids[0].ortb2Imp).not.to.have.property('banner');
      expect(request.data.bids[0].ortb2Imp.video).to.deep.equal({ w: 640, h: 360, mimes: ['video/mp4'] });
      expect(spec.interpretResponse({ body: VALID_RESPONSE }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({
        body: {
          ...VALID_RESPONSE,
          bids: [{ ...VALID_RESPONSE.bids[0], mediaType: 'video', ad: '<VAST version="3.0"></VAST>' }],
        },
      }, request)).to.have.lengthOf(1);
    }
  });

  it('preserves valid Native demand alongside invalid banner and video only when enabled', function () {
    const native = { ortb: { ver: '1.2', assets: [{ id: 1, title: { len: 80 } }] } };
    const mixedBid = {
      ...BID_REQUEST,
      mediaTypes: {
        banner: { sizes: [[0, 250]] },
        video: { playerSize: [[640, 360]] },
        native,
      },
      ortb2Imp: {
        ...BID_REQUEST.ortb2Imp,
        banner: { format: [{ w: 300, h: 250 }] },
        video: { w: 1280, h: 720, pos: 1 },
      },
    };

    expect(spec.isBidRequestValid(mixedBid)).to.equal(FEATURES.NATIVE);
    if (FEATURES.NATIVE) {
      const request = spec.buildRequests([mixedBid], BIDDER_REQUEST);
      expect(request.data.bids[0].ortb2Imp).not.to.have.property('banner');
      expect(request.data.bids[0].ortb2Imp).not.to.have.property('video');
      expect(JSON.parse(request.data.bids[0].ortb2Imp.native.request)).to.deep.equal(native.ortb);
    }
  });

  it('rejects mixed requests when none of the declared formats is valid', function () {
    expect(spec.isBidRequestValid({
      ...BID_REQUEST,
      mediaTypes: { banner: { sizes: [[0, 250]] }, video: { playerSize: [[640, 360]] }, native: {} },
    })).to.equal(false);
  });

  it('sends one multi-format LINA bid without client floor policy', function () {
    const multiFormatBid = {
      ...BID_REQUEST,
      mediaTypes: {
        banner: { sizes: [[300, 250]] },
        video: { playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [3] },
        native: { ortb: { ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 80 } }] } },
      },
      sizes: undefined,
      getFloor: () => ({ floor: 1250, currency: 'KRW' }),
    };
    const request = spec.buildRequests([multiFormatBid], BIDDER_REQUEST);

    expect(request.data.bids).to.have.lengthOf(1);
    expect(request.data.bids[0].ortb2Imp).to.deep.include({
      banner: { format: [{ w: 300, h: 250 }] },
      video: { w: 640, h: 360, mimes: ['video/mp4'], protocols: [3] },
      ...(FEATURES.NATIVE ? { native: { request: JSON.stringify({ ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 80 } }] }) } } : {}),
    });
    expect(request.data.bids[0].ortb2Imp).not.to.have.property('bidfloor');
    expect(request.data.bids[0].ortb2Imp).not.to.have.property('bidfloorcur');

    const bids = spec.interpretResponse({
      body: {
        ...VALID_RESPONSE,
        bids: [{
          ...VALID_RESPONSE.bids[0],
          requestId: 'bid-001',
          mediaType: 'video',
          width: 640,
          height: 360,
          ad: '<VAST version="3.0"></VAST>',
        }],
      },
    }, request);
    expect(bids).to.have.lengthOf(1);
    expect(bids[0]).to.include({ mediaType: 'video', vastXml: '<VAST version="3.0"></VAST>' });
  });

  it('returns valid bids and filters unknown or invalid responses', function () {
    const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
    const response = {
      body: {
        ...VALID_RESPONSE,
        bids: [
          ...VALID_RESPONSE.bids,
          { ...VALID_RESPONSE.bids[0], requestId: 'unknown' },
          { ...VALID_RESPONSE.bids[0], requestId: 'bid-001', cpm: 0 },
        ],
      },
    };

    const bids = spec.interpretResponse(response, request);
    expect(bids).to.have.lengthOf(1);
    expect(bids[0]).to.include({ requestId: 'bid-001', cpm: 2.5, currency: 'USD', mediaType: 'banner' });
  });

  it('maps a valid video response to vastXml', function () {
    const videoBid = {
      ...BID_REQUEST,
      mediaTypes: { video: { playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [3] } },
      sizes: undefined,
    };
    const request = spec.buildRequests([videoBid], BIDDER_REQUEST);
    const response = {
      body: {
        ...VALID_RESPONSE,
        bids: [{
          ...VALID_RESPONSE.bids[0],
          mediaType: 'video',
          width: 640,
          height: 360,
          ad: '<VAST version="3.0"></VAST>',
        }],
      },
    };

    const bids = spec.interpretResponse(response, request);
    expect(bids).to.have.lengthOf(1);
    expect(bids[0]).to.include({ mediaType: 'video', vastXml: '<VAST version="3.0"></VAST>' });
    expect(bids[0]).not.to.have.property('ad');
  });

  if (FEATURES.NATIVE) {
    it('maps a valid native response to Prebid ORTB native markup', function () {
      const nativeBid = {
        ...BID_REQUEST,
        mediaTypes: { native: { ortb: { ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 80 } }] } } },
        sizes: undefined,
      };
      const request = spec.buildRequests([nativeBid], BIDDER_REQUEST);
      const response = {
        body: {
          ...VALID_RESPONSE,
          bids: [{
            ...VALID_RESPONSE.bids[0],
            mediaType: 'native',
            width: 0,
            height: 0,
            ad: JSON.stringify({ native: { ver: '1.2', assets: [{ id: 1, title: { text: 'Native title' } }] } }),
          }],
        },
      };

      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0]).to.deep.include({
        mediaType: 'native',
        width: 0,
        height: 0,
        native: { ortb: { ver: '1.2', assets: [{ id: 1, title: { text: 'Native title' } }] } },
      });
      expect(bids[0]).not.to.have.property('ad');

      const invalidMarkups = [
        JSON.stringify({ native: { ver: '1.2', assets: {} } }),
        JSON.stringify({ native: { assets: [] } }),
      ];
      invalidMarkups.forEach((ad) => {
        expect(spec.interpretResponse({
          body: { ...VALID_RESPONSE, bids: [{ ...response.body.bids[0], ad }] },
        }, request)).to.deep.equal([]);
      });
    });
  }

  it('returns valid bids in the publisher currency supplied by LINA', function () {
    const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
    const response = {
      body: {
        ...VALID_RESPONSE,
        currency: 'JPY',
        bids: [{ ...VALID_RESPONSE.bids[0], currency: 'JPY', cpm: 101 }],
      },
    };

    const bids = spec.interpretResponse(response, request);
    expect(bids).to.have.lengthOf(1);
    expect(bids[0]).to.include({ requestId: 'bid-001', cpm: 101, currency: 'JPY' });
  });

  it('returns no bid for malformed response bodies', function () {
    const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);

    expect(spec.interpretResponse({ body: { bids: 'invalid' } }, request)).to.deep.equal([]);
    expect(spec.interpretResponse({ body: { bids: [null] } }, request)).to.deep.equal([]);
    expect(spec.interpretResponse({ body: undefined }, request)).to.deep.equal([]);
  });

  it('returns multiple valid bids from a batch response', function () {
    const secondBidRequest = {
      ...BID_REQUEST,
      bidId: 'bid-002',
      transactionId: 'transaction-002',
      adUnitCode: 'lina-banner-2',
    };
    const request = spec.buildRequests([BID_REQUEST, secondBidRequest], BIDDER_REQUEST);
    const response = {
      body: {
        ...VALID_RESPONSE,
        bids: [
          VALID_RESPONSE.bids[0],
          { ...VALID_RESPONSE.bids[0], requestId: 'bid-002', creativeId: 'creative-002' },
        ],
      },
    };

    expect(request.data.bids).to.have.lengthOf(2);
    expect(spec.interpretResponse(response, request).map((bid) => bid.requestId)).to.deep.equal(['bid-001', 'bid-002']);
  });

  it('filters bids with invalid required response fields', function () {
    const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
    const invalidBids = [
      { currency: 'EUR' },
      { cpm: Infinity },
      { cpm: NaN },
      { ttl: 0 },
      { ttl: 3601 },
      { netRevenue: false },
      { mediaType: 'video' },
      { width: 0 },
      { creativeId: '' },
      { ad: '' },
      { meta: { advertiserDomains: [] } },
      { meta: { advertiserDomains: [123] } },
      { meta: { advertiserDomains: [''] } },
      { dealId: 123 },
      { dealId: '' },
    ];

    invalidBids.forEach((invalidBid) => {
      const response = {
        body: {
          ...VALID_RESPONSE,
          bids: [{ ...VALID_RESPONSE.bids[0], ...invalidBid }],
        },
      };
      expect(spec.interpretResponse(response, request)).to.deep.equal([]);
    });
  });

  it('rejects invalid top-level response fields', function () {
    const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);

    expect(spec.interpretResponse({ body: { ...VALID_RESPONSE, requestId: '' } }, request)).to.deep.equal([]);
    expect(spec.interpretResponse({ body: { ...VALID_RESPONSE, currency: 'JP' } }, request)).to.deep.equal([]);
  });

  it('treats an empty response as no bid and does not register user syncs', function () {
    const request = spec.buildRequests([BID_REQUEST], BIDDER_REQUEST);
    expect(spec.interpretResponse({ body: { requestId: 'lina-request-001', currency: 'USD', bids: [] } }, request)).to.deep.equal([]);
    expect(spec.getUserSyncs()).to.deep.equal([]);
  });
});
