import { expect } from 'chai';
import sinon from 'sinon';
import {
  spec,
  ENDPOINT,
  APPROVED_ENDPOINTS,
  resolveEndpoint,
  endpointFor,
  normalizeParams,
  getBidMediaType
} from 'modules/bid9BidAdapter.ts';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { server } from 'test/mocks/xhr.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';
import { deepClone } from 'src/utils.js';
// load modules that register ORTB processors
import 'src/prebid.js';
import { setConfig as setCurrencyConfig, resetCurrency } from 'modules/currency.js';
import 'modules/priceFloors.js';
import 'modules/userId/index.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';
import 'modules/consentManagementGpp.js';

const BIDDER_CODE = 'bid9';
// video processing is compiled out of builds without the VIDEO feature (`gulp test` also runs that variant)
function itVideo(title, fn) {
  if (FEATURES.VIDEO) {
    it(title, fn);
  }
}
function describeVideo(title, fn) {
  if (FEATURES.VIDEO) {
    describe(title, fn);
  }
}
const MOCK_ENDPOINT = 'http://localhost:8099/openrtb2/auction';

function bannerBid(overrides = {}) {
  return {
    bidder: BIDDER_CODE,
    bidId: 'banner-bid-1',
    adUnitCode: 'div-banner',
    auctionId: 'auction-1',
    bidderRequestId: 'bidder-request-1',
    transactionId: 'txn-banner',
    mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
    params: { channelId: 'banner-channel' },
    ...overrides
  };
}

function videoBid(videoOverrides = {}, overrides = {}) {
  return {
    bidder: BIDDER_CODE,
    bidId: 'video-bid-1',
    adUnitCode: 'div-video',
    auctionId: 'auction-1',
    bidderRequestId: 'bidder-request-1',
    transactionId: 'txn-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4', 'video/webm'],
        protocols: [2, 3, 5, 6, 7, 8],
        minduration: 5,
        maxduration: 30,
        startdelay: 0,
        plcmt: 1,
        placement: 1,
        linearity: 1,
        skip: 1,
        skipmin: 10,
        skipafter: 5,
        playbackmethod: [2],
        playbackend: 1,
        api: [2, 7],
        minbitrate: 300,
        maxbitrate: 3000,
        delivery: [2],
        pos: 1,
        battr: [13, 14],
        boxingallowed: 1,
        maxextended: 0,
        companiontype: [1, 2],
        ...videoOverrides
      }
    },
    params: { channelId: 'video-channel' },
    ...overrides
  };
}

function bidderRequestFor(bidRequests, ortb2 = {}) {
  return {
    bidderCode: BIDDER_CODE,
    auctionId: 'auction-1',
    bidderRequestId: 'bidder-request-1',
    timeout: 1500,
    refererInfo: { page: 'https://publisher.example/article', domain: 'publisher.example', ref: 'https://google.com' },
    ortb2: {
      site: { domain: 'publisher.example', page: 'https://publisher.example/article', publisher: {} },
      device: { ua: 'test-ua', language: 'en' },
      ...deepClone(ortb2)
    },
    bids: bidRequests
  };
}

function buildData(bidRequests, ortb2) {
  const requests = spec.buildRequests(bidRequests, bidderRequestFor(bidRequests, ortb2));
  // one request per ad unit: callers pass a single bid request
  expect(requests).to.have.length(1);
  return { request: requests[0], data: requests[0].data };
}

function ortbBid(overrides = {}) {
  return {
    id: 'seat-bid-1',
    impid: 'banner-bid-1',
    price: 2.1,
    adm: '<div>bid9 creative ${AUCTION_PRICE}</div>',
    crid: 'creative-1',
    adomain: ['brand.example'],
    cat: ['IAB19', 'IAB19-6'],
    attr: [1],
    w: 300,
    h: 250,
    mtype: 1,
    ...overrides
  };
}

function serverResponse(bids, extra = {}) {
  return { body: { id: 'resp-1', cur: 'USD', seatbid: [{ seat: 'demand-a', bid: bids }], ...extra } };
}

describe('bid9BidAdapter', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
  });

  describe('spec', function () {
    it('registers the bid9 bidder for banner and video', function () {
      expect(spec.code).to.equal('bid9');
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER, VIDEO]);
      expect(newBidder(spec).callBids).to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('accepts a non-empty string channelId', function () {
      expect(spec.isBidRequestValid(bannerBid())).to.equal(true);
      expect(spec.isBidRequestValid(bannerBid({ params: { channelId: '6ad9b11a5711b9cc180941a4' } }))).to.equal(true);
    });

    [
      ['missing params', undefined],
      ['missing channelId', {}],
      ['empty channelId', { channelId: '' }],
      ['blank channelId', { channelId: '   ' }],
      ['numeric channelId', { channelId: 123 }],
      ['object channelId', { channelId: { id: 1 } }],
      ['placementId instead of channelId', { placementId: 'abc' }]
    ].forEach(([name, params]) => {
      it(`rejects ${name} and warns`, function () {
        const warn = sandbox.stub(utils, 'logWarn');
        expect(spec.isBidRequestValid(bannerBid({ params }))).to.equal(false);
        expect(warn.calledOnce).to.equal(true);
      });
    });
  });

  describe('normalizeParams', function () {
    it('keeps valid optional params', function () {
      expect(normalizeParams({ channelId: 'c', publisherId: 'pub', bidFloor: 0.5, bidFloorCur: 'EUR' }))
        .to.deep.equal({ channelId: 'c', publisherId: 'pub', bidFloor: 0.5, bidFloorCur: 'EUR' });
    });

    it('drops invalid optional params with a warning', function () {
      const warn = sandbox.stub(utils, 'logWarn');
      expect(normalizeParams({ channelId: 'c', publisherId: 7, bidFloor: -1, bidFloorCur: 'euro' }))
        .to.deep.equal({ channelId: 'c' });
      expect(warn.callCount).to.equal(3);
    });

    it('handles undefined params', function () {
      expect(normalizeParams()).to.deep.equal({ channelId: undefined });
    });
  });

  describe('resolveEndpoint', function () {
    it('uses the production endpoint by default', function () {
      expect(resolveEndpoint()).to.equal(ENDPOINT);
    });

    it('honours approved endpoint overrides', function () {
      config.setConfig({ bid9: { endpoint: APPROVED_ENDPOINTS[0] } });
      expect(resolveEndpoint()).to.equal(APPROVED_ENDPOINTS[0]);
    });

    it('ignores unapproved overrides outside debug mode', function () {
      const warn = sandbox.stub(utils, 'logWarn');
      config.setConfig({ bid9: { endpoint: 'https://attacker.example/bid' } });
      expect(resolveEndpoint()).to.equal(ENDPOINT);
      expect(warn.calledOnce).to.equal(true);
    });

    it('honours any override in debug mode (local testing)', function () {
      sandbox.stub(utils, 'logInfo');
      config.setConfig({ debug: true, bid9: { endpoint: MOCK_ENDPOINT } });
      expect(resolveEndpoint()).to.equal(MOCK_ENDPOINT);
    });

    it('is used by buildRequests', function () {
      sandbox.stub(utils, 'logInfo');
      config.setConfig({ debug: true, bid9: { endpoint: MOCK_ENDPOINT } });
      expect(buildData([bannerBid()]).request.url).to.equal(`${MOCK_ENDPOINT}?tagid=banner-channel`);
    });
  });

  describe('endpoint URL', function () {
    it('sends each request to the production endpoint with the channel ID as tagid', function () {
      expect(ENDPOINT).to.equal('https://rtb.bid9.ad/sspRTB2');
      expect(buildData([bannerBid({ params: { channelId: '6ad9b11a5711b9cc180941a4' } })]).request.url)
        .to.equal('https://rtb.bid9.ad/sspRTB2?tagid=6ad9b11a5711b9cc180941a4');
    });

    it('URL-encodes the channel ID in the URL but not in imp.tagid', function () {
      const { request, data } = buildData([bannerBid({ params: { channelId: 'a b&c' } })]);
      expect(request.url).to.equal(`${ENDPOINT}?tagid=a%20b%26c`);
      expect(data.imp[0].tagid).to.equal('a b&c');
    });

    it('keeps existing query parameters of an endpoint', function () {
      expect(endpointFor('http://localhost:8099/openrtb2/auction?x=1', 'ch')).to.equal('http://localhost:8099/openrtb2/auction?x=1&tagid=ch');
    });

    it('adds tagid to a debug-mode endpoint override', function () {
      sandbox.stub(utils, 'logInfo');
      config.setConfig({ debug: true, bid9: { endpoint: MOCK_ENDPOINT } });
      expect(buildData([bannerBid({ params: { channelId: 'banner' } })]).request.url).to.equal(`${MOCK_ENDPOINT}?tagid=banner`);
    });

    it('ignores an endpoint override outside debug mode', function () {
      sandbox.stub(utils, 'logWarn');
      config.setConfig({ bid9: { endpoint: MOCK_ENDPOINT } });
      expect(buildData([bannerBid()]).request.url).to.equal(`${ENDPOINT}?tagid=banner-channel`);
    });
  });

  describe('one ad unit per request', function () {
    const threeBanners = () => [
      bannerBid({ bidId: 'b1', adUnitCode: 'top', params: { channelId: 'A' } }),
      bannerBid({ bidId: 'b2', adUnitCode: 'side', params: { channelId: 'A' } }),
      bannerBid({ bidId: 'b3', adUnitCode: 'inline', params: { channelId: 'B' } })
    ];

    it('sends one request per ad unit, even when ad units share a channel', function () {
      const bids = threeBanners();
      const requests = spec.buildRequests(bids, bidderRequestFor(bids, { regs: { ext: { gdpr: 1 } }, user: { ext: { consent: 'CPXYZ' } } }));
      expect(requests).to.have.length(3);
      expect(requests.map(r => r.url)).to.deep.equal([`${ENDPOINT}?tagid=A`, `${ENDPOINT}?tagid=A`, `${ENDPOINT}?tagid=B`]);
      requests.forEach((request, i) => {
        expect(request.method).to.equal('POST');
        expect(request.data.imp).to.have.length(1);
        expect(request.data.imp[0].id).to.equal(bids[i].bidId);
        expect(request.data.imp[0].tagid).to.equal(bids[i].params.channelId);
        expect(request.data.site).to.deep.equal(requests[0].data.site);
        expect(request.data.regs).to.deep.equal({ gdpr: 1 });
        expect(request.data.user.consent).to.equal('CPXYZ');
        expect(request.data.tmax).to.equal(1500);
      });
      expect(new Set(requests.map(r => r.data.id)).size).to.equal(3);
    });

    it('splits banner and video ad units into separate requests', function () {
      const bids = [bannerBid(), videoBid()];
      const requests = spec.buildRequests(bids, bidderRequestFor(bids));
      expect(requests.map(r => r.data.imp.map(imp => imp.id))).to.deep.equal([['banner-bid-1'], ['video-bid-1']]);
      expect(requests.map(r => r.url)).to.deep.equal([`${ENDPOINT}?tagid=banner-channel`, `${ENDPOINT}?tagid=video-channel`]);
    });

    it('ignores a former requestMode setting', function () {
      sandbox.stub(utils, 'logInfo');
      config.setConfig({ debug: true, bid9: { requestMode: 'multi' } });
      const bids = threeBanners();
      expect(spec.buildRequests(bids, bidderRequestFor(bids))).to.have.length(3);
    });

    it('matches each response to its own ad unit', function () {
      const bids = threeBanners();
      const requests = spec.buildRequests(bids, bidderRequestFor(bids));
      const results = requests.map((request, i) => spec.interpretResponse(
        serverResponse([ortbBid({ id: 'r' + i, impid: request.data.imp[0].id, price: i + 1 })]), request
      ));
      expect(results.map(r => r.map(b => [b.requestId, b.cpm]))).to.deep.equal([[['b1', 1]], [['b2', 2]], [['b3', 3]]]);
    });
  });

  describe('buildRequests', function () {
    it('sends a POST with one imp whose id is the bid ID and whose tagid is the channel ID', function () {
      const { request, data } = buildData([bannerBid()]);
      expect(request.method).to.equal('POST');
      expect(data.imp).to.have.length(1);
      expect(data.imp[0].id).to.equal('banner-bid-1');
      expect(data.imp[0].tagid).to.equal('banner-channel');
    });

    it('sets request id, tmax, default cur and prebid channel', function () {
      const { data } = buildData([bannerBid()]);
      expect(data.id).to.be.a('string').and.not.be.empty;
      expect(data.tmax).to.equal(1500);
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.ext.prebid.channel).to.deep.equal({ name: 'pbjs', version: '$prebid.version$' });
    });

    it('mirrors params in imp.ext.bid9', function () {
      const { data } = buildData([bannerBid({ params: { channelId: 'ch-42', publisherId: 'pub-1' } })]);
      expect(data.imp[0].tagid).to.equal('ch-42');
      expect(data.imp[0].ext.bid9).to.deep.equal({ channelId: 'ch-42', publisherId: 'pub-1' });
    });

    it('builds banner imps with every requested size', function () {
      const { data } = buildData([bannerBid()]);
      expect(data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 300, h: 600 }]);
      expect(data.imp[0].video).to.equal(undefined);
      expect(data.imp[0].secure).to.equal(1);
    });

    itVideo('builds a multi-format imp for banner + video ad units', function () {
      const bid = videoBid();
      bid.mediaTypes.banner = { sizes: [[300, 250]] };
      const { data } = buildData([bid]);
      expect(data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);
      expect(data.imp[0].video.w).to.equal(640);
    });

    describeVideo('video', function () {
      it('passes every standard instream video param', function () {
        const bid = videoBid();
        const { data } = buildData([bid]);
        const video = data.imp[0].video;
        const expected = { ...bid.mediaTypes.video };
        delete expected.context;
        delete expected.playerSize;
        Object.entries(expected).forEach(([key, value]) => {
          expect(video[key], key).to.deep.equal(value);
        });
        expect(video.w).to.equal(640);
        expect(video.h).to.equal(480);
        expect(data.imp[0].banner).to.equal(undefined);
      });

      it('passes pod and duration params', function () {
        const { data } = buildData([videoBid({ podid: 'pod-1', podseq: 1, poddur: 60, maxseq: 3, rqddurs: [15, 30], mincpmpersec: 0.1, slotinpod: 1, poddedupe: [1] })]);
        expect(data.imp[0].video).to.include({ podid: 'pod-1', podseq: 1, poddur: 60, maxseq: 3, mincpmpersec: 0.1, slotinpod: 1 });
        expect(data.imp[0].video.rqddurs).to.deep.equal([15, 30]);
      });

      it('supports outstream placement', function () {
        const { data } = buildData([videoBid({ context: 'outstream', plcmt: 4, placement: 3 })]);
        expect(data.imp[0].video.plcmt).to.equal(4);
        expect(data.imp[0].video.placement).to.equal(3);
      });

      it('lets ortb2Imp.video add companionad and override params', function () {
        const companionad = [{ w: 300, h: 250 }];
        const { data } = buildData([videoBid({}, { ortb2Imp: { video: { companionad, maxduration: 60 } } })]);
        expect(data.imp[0].video.companionad).to.deep.equal(companionad);
        expect(data.imp[0].video.maxduration).to.equal(60);
      });
    });

    describe('first party data', function () {
      it('passes site, content, device, app-less ortb2 and bcat/badv through', function () {
        const ortb2 = {
          site: {
            domain: 'publisher.example',
            page: 'https://publisher.example/article',
            keywords: 'sports,football',
            cat: ['IAB17'],
            content: { language: 'en', title: 'Match report', data: [{ name: 'seg', segment: [{ id: '1' }] }] },
            ext: { data: { section: 'sport' } }
          },
          device: { ua: 'ua', language: 'en', geo: { country: 'GBR' } },
          user: { data: [{ name: 'dmp', segment: [{ id: 's1' }] }] },
          bcat: ['IAB25'],
          badv: ['blocked.example']
        };
        const { data } = buildData([bannerBid()], ortb2);
        expect(data.site.keywords).to.equal('sports,football');
        expect(data.site.content).to.deep.equal(ortb2.site.content);
        expect(data.site.ext.data.section).to.equal('sport');
        expect(data.device.geo.country).to.equal('GBR');
        expect(data.user.data).to.deep.equal(ortb2.user.data);
        expect(data.bcat).to.deep.equal(['IAB25']);
        expect(data.badv).to.deep.equal(['blocked.example']);
      });

      it('passes ortb2Imp data such as gpid, instl and rwdd', function () {
        const ortb2Imp = { instl: 1, rwdd: 1, ext: { gpid: '/1234/home#top', data: { pbadslot: '/1234/home#top' } } };
        const { data } = buildData([bannerBid({ ortb2Imp })]);
        expect(data.imp[0].ext.gpid).to.equal('/1234/home#top');
        expect(data.imp[0].ext.data.pbadslot).to.equal('/1234/home#top');
        expect(data.imp[0].instl).to.equal(1);
        expect(data.imp[0].rwdd).to.equal(1);
      });

      it('sets site.publisher.id from publisherId when not already set', function () {
        const { data } = buildData([bannerBid({ params: { channelId: 'c', publisherId: 'pub-9' } })]);
        expect(data.site.publisher.id).to.equal('pub-9');
      });

      it('does not override a publisher id provided in ortb2', function () {
        const { data } = buildData(
          [bannerBid({ params: { channelId: 'c', publisherId: 'pub-9' } })],
          { site: { domain: 'publisher.example', publisher: { id: 'from-ortb2' } } }
        );
        expect(data.site.publisher.id).to.equal('from-ortb2');
      });

      it('sets app.publisher.id for app traffic', function () {
        const bidderRequest = bidderRequestFor([bannerBid({ params: { channelId: 'c', publisherId: 'pub-app' } })]);
        delete bidderRequest.ortb2.site;
        bidderRequest.ortb2.app = { bundle: 'com.example.app' };
        const [{ data }] = spec.buildRequests(bidderRequest.bids, bidderRequest);
        expect(data.app.publisher.id).to.equal('pub-app');
        expect(data.site).to.equal(undefined);
      });

      it('leaves publisher untouched when publisherId is not provided', function () {
        const { data } = buildData([bannerBid()]);
        expect(data.site.publisher.id).to.equal(undefined);
      });
    });

    describe('privacy signals', function () {
      it('sends GDPR applicability and TCF consent in their OpenRTB 2.6 locations only', function () {
        const { data } = buildData([bannerBid()], {
          regs: { ext: { gdpr: 1 } },
          user: { ext: { consent: 'CPXYZ' } }
        });
        expect(data.regs.gdpr).to.equal(1);
        expect(data.user.consent).to.equal('CPXYZ');
        expect(data.regs.ext).to.equal(undefined);
        expect(data.user.ext).to.equal(undefined);
      });

      it('keeps GDPR signals already in OpenRTB 2.6 form', function () {
        const { data } = buildData([bannerBid()], { regs: { gdpr: 0 }, user: { consent: 'CPABC' } });
        expect(data.regs.gdpr).to.equal(0);
        expect(data.user.consent).to.equal('CPABC');
      });

      it('sends US Privacy as regs.us_privacy only', function () {
        const { data } = buildData([bannerBid()], { regs: { ext: { us_privacy: '1YNN' } } });
        expect(data.regs.us_privacy).to.equal('1YNN');
        expect(data.regs.ext).to.equal(undefined);
      });

      it('sends GPP string, section ids and COPPA', function () {
        const { data } = buildData([bannerBid()], { regs: { gpp: 'DBABMA~1---', gpp_sid: [7], coppa: 1 } });
        expect(data.regs.gpp).to.equal('DBABMA~1---');
        expect(data.regs.gpp_sid).to.deep.equal([7]);
        expect(data.regs.coppa).to.equal(1);
        expect(data.regs.ext).to.equal(undefined);
      });

      it('passes DSA requirements through in regs.ext.dsa', function () {
        const dsa = { dsarequired: 3, pubrender: 0, datatopub: 2 };
        const { data } = buildData([bannerBid()], { regs: { ext: { dsa, gdpr: 1 } } });
        expect(data.regs.ext).to.deep.equal({ dsa });
        expect(data.regs.gdpr).to.equal(1);
      });

      it('does not invent privacy fields when none are provided', function () {
        const { data } = buildData([bannerBid()]);
        expect(data.regs?.gdpr).to.equal(undefined);
        expect(data.user?.consent).to.equal(undefined);
        expect(data.regs?.us_privacy).to.equal(undefined);
        expect(data.regs?.gpp).to.equal(undefined);
      });
    });

    describe('identity', function () {
      const eids = [
        { source: 'pubcid.org', uids: [{ id: 'shared-1', atype: 1 }] },
        { source: 'uidapi.com', uids: [{ id: 'uid2-1', atype: 3 }] },
        { source: 'id5-sync.com', uids: [{ id: 'id5-1', atype: 1, ext: { linkType: 2 } }] }
      ];

      it('sends user IDs unchanged in user.eids and user.ext.eids', function () {
        const { data } = buildData([bannerBid()], { user: { ext: { eids } } });
        expect(data.user.eids).to.deep.equal(eids);
        expect(data.user.ext.eids).to.deep.equal(eids);
      });

      it('accepts user IDs provided in user.eids', function () {
        const { data } = buildData([bannerBid()], { user: { eids } });
        expect(data.user.eids).to.deep.equal(eids);
        expect(data.user.ext.eids).to.deep.equal(eids);
      });

      it('sends no user IDs when none are available', function () {
        const { data } = buildData([bannerBid()]);
        expect(data.user?.eids).to.equal(undefined);
        expect(data.user?.ext?.eids).to.equal(undefined);
      });
    });

    describe('supply chain', function () {
      const schain = { ver: '1.0', complete: 1, nodes: [{ asi: 'bid9.example', sid: 'pub-1', hp: 1 }] };

      it('sends the supply chain as source.schain only', function () {
        const { data } = buildData([bannerBid()], { source: { schain } });
        expect(data.source.schain).to.deep.equal(schain);
        expect(data.source.ext).to.equal(undefined);
      });

      it('moves a supply chain provided in source.ext to source.schain', function () {
        const { data } = buildData([bannerBid()], { source: { ext: { schain } } });
        expect(data.source.schain).to.deep.equal(schain);
        expect(data.source.ext).to.equal(undefined);
      });
    });

    describe('floors and currency', function () {
      afterEach(function () {
        resetCurrency();
      });

      it('uses the Price Floors Module floor', function () {
        const bid = bannerBid({ params: { channelId: 'c', bidFloor: 0.2 } });
        bid.getFloor = sandbox.stub().returns({ floor: 1.25, currency: 'EUR' });
        const { data } = buildData([bid]);
        expect(data.imp[0].bidfloor).to.equal(1.25);
        expect(data.imp[0].bidfloorcur).to.equal('EUR');
        expect(bid.getFloor.called).to.equal(true);
      });

      it('passes per-format floors when they differ', function () {
        const bid = bannerBid();
        bid.getFloor = ({ size }) => ({ floor: size?.[1] === 600 ? 2 : 1, currency: 'USD' });
        const { data } = buildData([bid]);
        expect(data.imp[0].bidfloor).to.equal(1);
        expect(data.imp[0].banner.format[1].ext.bidfloor).to.equal(2);
      });

      it('falls back to params.bidFloor when no floor module floor exists', function () {
        const { data } = buildData([bannerBid({ params: { channelId: 'c', bidFloor: 0.5 } })]);
        expect(data.imp[0].bidfloor).to.equal(0.5);
        expect(data.imp[0].bidfloorcur).to.equal('USD');
      });

      it('uses params.bidFloorCur with the static floor', function () {
        const { data } = buildData([bannerBid({ params: { channelId: 'c', bidFloor: 0.5, bidFloorCur: 'EUR' } })]);
        expect(data.imp[0].bidfloorcur).to.equal('EUR');
      });

      it('sends no floor when none is configured', function () {
        const { data } = buildData([bannerBid()]);
        expect(data.imp[0].bidfloor).to.equal(undefined);
      });

      it('uses the ad server currency from the Currency module', function () {
        setCurrencyConfig({ adServerCurrency: 'GBP', rates: { USD: { GBP: 0.8, USD: 1 } } });
        const { data } = buildData([bannerBid()]);
        expect(data.cur).to.deep.equal(['GBP']);
      });
    });
  });

  describe('getBidMediaType', function () {
    it('uses mtype when it is banner or video', function () {
      expect(getBidMediaType({ mtype: 1 }, { video: {} })).to.equal(BANNER);
      expect(getBidMediaType({ mtype: 2 }, { banner: {} })).to.equal(VIDEO);
    });

    it('infers from a single-format imp', function () {
      expect(getBidMediaType({}, { video: {} })).to.equal(VIDEO);
      expect(getBidMediaType({ mtype: 4 }, { banner: {} })).to.equal(BANNER);
    });

    it('infers from markup for multi-format imps', function () {
      expect(getBidMediaType({ adm: '<?xml version="1.0"?><VAST/>' }, { banner: {}, video: {} })).to.equal(VIDEO);
      expect(getBidMediaType({ adm: '  <VAST version="4.0"></VAST>' }, { banner: {}, video: {} })).to.equal(VIDEO);
      expect(getBidMediaType({ adm: '<div></div>' }, { banner: {}, video: {} })).to.equal(BANNER);
      expect(getBidMediaType({}, undefined)).to.equal(BANNER);
    });
  });

  describe('interpretResponse', function () {
    function interpret(bids, bidRequests, extra) {
      const { request } = buildData(bidRequests);
      return spec.interpretResponse(serverResponse(bids, extra), request);
    }

    it('maps a banner bid with deal and metadata', function () {
      const [bid] = interpret([ortbBid({ dealid: 'D-1', burl: 'https://bill.example/?p=${AUCTION_PRICE}', exp: 120 })], [bannerBid()]);
      expect(bid).to.include({
        requestId: 'banner-bid-1',
        cpm: 2.1,
        currency: 'USD',
        width: 300,
        height: 250,
        creativeId: 'creative-1',
        dealId: 'D-1',
        ttl: 120,
        netRevenue: true,
        mediaType: BANNER,
        burl: 'https://bill.example/?p=${AUCTION_PRICE}'
      });
      expect(bid.ad).to.equal('<div>bid9 creative ${AUCTION_PRICE}</div>');
      expect(bid.meta).to.include({ mediaType: BANNER, networkName: 'demand-a', primaryCatId: 'IAB19' });
      expect(bid.meta.advertiserDomains).to.deep.equal(['brand.example']);
      expect(bid.meta.secondaryCatIds).to.deep.equal(['IAB19-6']);
      expect(bid.meta.attr).to.deep.equal([1]);
    });

    it('applies defaults for ttl, currency, creativeId and advertiserDomains', function () {
      const [bid] = interpret([ortbBid({ crid: undefined, adomain: undefined })], [bannerBid()], { cur: undefined });
      expect(bid.ttl).to.equal(300);
      expect(bid.currency).to.equal('USD');
      expect(bid.creativeId).to.equal('seat-bid-1');
      expect(bid.meta.advertiserDomains).to.deep.equal([]);
    });

    it('uses the response currency', function () {
      const [bid] = interpret([ortbBid()], [bannerBid()], { cur: 'EUR' });
      expect(bid.currency).to.equal('EUR');
    });

    itVideo('maps an inline VAST video bid and keeps nurl as a win notice', function () {
      const [bid] = interpret([ortbBid({
        impid: 'video-bid-1',
        mtype: 2,
        price: 4,
        w: 640,
        h: 480,
        adm: '<VAST version="4.0"><Ad><Impression>https://imp.example/?p=${AUCTION_PRICE}</Impression></Ad></VAST>',
        nurl: 'https://win.example/?p=${AUCTION_PRICE}'
      })], [videoBid()]);
      expect(bid.mediaType).to.equal(VIDEO);
      expect(bid.vastXml).to.equal('<VAST version="4.0"><Ad><Impression>https://imp.example/?p=4</Impression></Ad></VAST>');
      expect(bid.vastUrl).to.equal(undefined);
      expect(bid.nurl).to.equal('https://win.example/?p=${AUCTION_PRICE}');
      expect(bid.playerWidth).to.equal(640);
      expect(bid.playerHeight).to.equal(480);
      expect(bid.meta.mediaType).to.equal(VIDEO);
    });

    itVideo('maps a VAST URL video bid with price macro replaced', function () {
      const [bid] = interpret([ortbBid({
        impid: 'video-bid-1',
        mtype: 2,
        price: 3.5,
        adm: undefined,
        nurl: 'https://v.example/vast?p=${AUCTION_PRICE}'
      })], [videoBid()]);
      expect(bid.vastUrl).to.equal('https://v.example/vast?p=3.5');
      expect(bid.vastXml).to.equal(undefined);
    });

    itVideo('treats a bid without mtype on a video-only imp as video', function () {
      const [bid] = interpret([ortbBid({ impid: 'video-bid-1', mtype: undefined, adm: '<VAST version="3.0"></VAST>' })], [videoBid()]);
      expect(bid.mediaType).to.equal(VIDEO);
      expect(bid.vastXml).to.equal('<VAST version="3.0"></VAST>');
    });

    it('treats a bid without mtype on a banner-only imp as banner', function () {
      const [bid] = interpret([ortbBid({ mtype: undefined })], [bannerBid()]);
      expect(bid.mediaType).to.equal(BANNER);
    });

    it('returns bids from several seats', function () {
      const { request } = buildData([bannerBid()]);
      const bids = spec.interpretResponse({
        body: {
          id: 'r',
          cur: 'USD',
          seatbid: [
            { seat: 'a', bid: [ortbBid()] },
            { seat: 'b', bid: [ortbBid({ id: 'b2', price: 1.2 })] }
          ]
        }
      }, request);
      expect(bids.map(b => [b.requestId, b.cpm, b.meta.networkName])).to.deep.equal([
        ['banner-bid-1', 2.1, 'a'],
        ['banner-bid-1', 1.2, 'b']
      ]);
    });

    describe('no-bids and invalid responses', function () {
      let warn;
      beforeEach(function () {
        warn = sandbox.stub(utils, 'logWarn');
        sandbox.stub(utils, 'logError');
      });

      it('returns no bids for an HTTP 204 / empty body without warning', function () {
        const { request } = buildData([bannerBid()]);
        expect(spec.interpretResponse({ body: '' }, request)).to.deep.equal([]);
        expect(spec.interpretResponse({ body: undefined }, request)).to.deep.equal([]);
        expect(spec.interpretResponse(undefined, request)).to.deep.equal([]);
        expect(warn.called).to.equal(false);
      });

      it('returns no bids for an empty object or empty seatbid', function () {
        const { request } = buildData([bannerBid()]);
        expect(spec.interpretResponse({ body: {} }, request)).to.deep.equal([]);
        expect(spec.interpretResponse({ body: { id: 'r', seatbid: [] } }, request)).to.deep.equal([]);
        expect(spec.interpretResponse({ body: { id: 'r', seatbid: [{ bid: [] }, null] } }, request)).to.deep.equal([]);
      });

      it('returns no bids and warns for a non-JSON body', function () {
        const { request } = buildData([bannerBid()]);
        expect(spec.interpretResponse({ body: '<html>error</html>' }, request)).to.deep.equal([]);
        expect(warn.calledOnce).to.equal(true);
      });

      it('returns no bids and warns when seatbid is not an array', function () {
        const { request } = buildData([bannerBid()]);
        expect(spec.interpretResponse({ body: { seatbid: { bid: [] } } }, request)).to.deep.equal([]);
        expect(warn.calledOnce).to.equal(true);
      });

      it('drops zero-price, priceless and markup-less bids but keeps valid ones', function () {
        const { request } = buildData([bannerBid()]);
        const bids = spec.interpretResponse(serverResponse([
          ortbBid({ id: 'zero', price: 0 }),
          ortbBid({ id: 'noprice', price: undefined }),
          ortbBid({ id: 'nomarkup', adm: undefined }),
          'not-a-bid',
          ortbBid({ id: 'good' })
        ]), request);
        expect(bids).to.have.length(1);
        expect(bids[0].seatBidId).to.equal('good');
        expect(warn.callCount).to.equal(3);
      });

      it('ignores bids whose impid matches no request', function () {
        const bids = interpret([ortbBid({ impid: 'unknown-imp' }), ortbBid()], [bannerBid()]);
        expect(bids).to.have.length(1);
        expect(bids[0].requestId).to.equal('banner-bid-1');
      });

      it('returns no bids and warns when conversion throws', function () {
        const bids = spec.interpretResponse(serverResponse([ortbBid()]), { data: {} });
        expect(bids).to.deep.equal([]);
        expect(warn.calledOnce).to.equal(true);
      });

      it('treats a missing seatbid.bid array as no bid', function () {
        const { request } = buildData([bannerBid()]);
        expect(spec.interpretResponse({ body: { seatbid: [{ seat: 'a' }] } }, request)).to.deep.equal([]);
      });
    });
  });

  describe('notifications', function () {
    // `ajax` is rewritten at build time, so assert on the fetch mock's recorded requests
    const noticesTo = url => server.requests.filter(req => req.url === url);

    it('calls nurl with the original cpm and keepalive on win', function () {
      spec.onBidWon({ nurl: 'https://win.example/?p=${AUCTION_PRICE}', cpm: 3, originalCpm: 4 });
      const requests = noticesTo('https://win.example/?p=4');
      expect(requests).to.have.length(1);
      expect(requests[0].method).to.equal('GET');
      expect(requests[0].fetch.request.keepalive).to.equal(true);
    });

    it('falls back to cpm when originalCpm is absent', function () {
      spec.onBidWon({ nurl: 'https://win.example/?p=${AUCTION_PRICE}', cpm: 3 });
      expect(noticesTo('https://win.example/?p=3')).to.have.length(1);
    });

    it('does not call anything on win without nurl', function () {
      spec.onBidWon({ cpm: 3 });
      expect(server.requests).to.have.length(0);
    });

    it('calls burl with keepalive when the bid becomes billable', function () {
      spec.onBidBillable({ burl: 'https://b.example/?p=${AUCTION_PRICE}', cpm: 1.5 });
      const requests = noticesTo('https://b.example/?p=1.5');
      expect(requests).to.have.length(1);
      expect(requests[0].fetch.request.keepalive).to.equal(true);
    });

    it('does not call anything when a billable bid has no burl', function () {
      spec.onBidBillable({ cpm: 1.5, burl: '' });
      expect(server.requests).to.have.length(0);
    });
  });

  describe('debugging hooks', function () {
    let warn;
    beforeEach(function () {
      warn = sandbox.stub(utils, 'logWarn');
    });

    it('logs timeouts through the Prebid logger', function () {
      spec.onTimeout([{ adUnitCode: 'div-banner', bidId: 'b1', timeout: 1500, params: {} }]);
      expect(warn.calledOnce).to.equal(true);
      expect(warn.firstCall.args[1]).to.deep.equal([{ adUnitCode: 'div-banner', bidId: 'b1', timeout: 1500 }]);
    });

    it('tolerates empty timeout data', function () {
      spec.onTimeout(undefined);
      expect(warn.firstCall.args[1]).to.deep.equal([]);
    });

    it('logs bidder errors with the HTTP status', function () {
      spec.onBidderError({ error: { status: 500 }, bidderRequest: { auctionId: 'a-1' } });
      expect(warn.firstCall.args[0]).to.contain('500');
      expect(warn.firstCall.args[1].auctionId).to.equal('a-1');
    });

    it('does not write to the console when debug is off', function () {
      warn.restore();
      const consoleStubs = ['log', 'info', 'warn', 'error'].map(m => sandbox.stub(console, m));
      const bids = [bannerBid(), videoBid()];
      const requests = spec.buildRequests(bids, bidderRequestFor(bids));
      spec.interpretResponse(serverResponse([ortbBid()]), requests[0]);
      consoleStubs.forEach(stub => expect(stub.called).to.equal(false));
    });
  });
});
