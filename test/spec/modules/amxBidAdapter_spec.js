import { expect } from 'chai';
import { spec } from 'modules/amxBidAdapter.js';
import { createEidsArray } from 'modules/userId/eids.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr.js';
import * as utils from 'src/utils.js';

const sampleRequestId = '82c91e127a9b93e';
const sampleDisplayAd = `<script src='https://assets.a-mo.net/tmode.v1.js'></script>`;
const sampleDisplayCRID = '78827819';
// minimal example vast
const sampleVideoAd = (addlImpression) =>
  `
<?xml version='1.0' encoding='UTF-8' ?><VAST version='2.0'><Ad id='128a6.44d74.46b3'><InLine><Error><![CDATA[http://example.net/hbx/verr?e=]]></Error><Impression><![CDATA[http://example.net/hbx/vimp?lid=test&aid=testapp]]></Impression><Creatives><Creative sequence='1'><Linear><Duration>00:00:15</Duration><TrackingEvents><Tracking event='firstQuartile'><![CDATA[https://example.com?event=first_quartile]]></Tracking></TrackingEvents><VideoClicks><ClickThrough><![CDATA[http://example.com]]></ClickThrough></VideoClicks><MediaFiles><MediaFile delivery='progressive' width='16' height='9' type='video/mp4' bitrate='800'><![CDATA[https://example.com/media.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives>${addlImpression}</InLine></Ad></VAST>
`.replace(/\n+/g, '');

const sampleFPD = {
  site: {
    keywords: 'sample keywords',
    ext: {
      data: {
        pageType: 'article',
      },
    },
  },
  user: {
    gender: 'O',
    yob: 1982,
  },
};

const sampleBidderRequest = {
  gdprConsent: {
    gdprApplies: true,
    consentString: utils.getUniqueIdentifierStr(),
    vendorData: {},
  },
  gppConsent: {
    gppString: 'example',
    applicableSections: 'example',
  },

  auctionId: null,

  uspConsent: '1YYY',
  refererInfo: {
    reachedTop: true,
    numIframes: 10,
    stack: ['https://www.prebid.org'],
    canonicalUrl: 'https://prebid.org',
    location: 'https://www.prebid.org',
    site: 'prebid.org',
    topmostLocation: 'https://www.prebid.org',
    page: 'https://www.prebid.org/the/link/to/the/page',
  },
  ortb2: sampleFPD,
};

const sampleImpExt = {
  testKey: 'testValue',
};

const sampleBidRequestBase = {
  bidder: spec.code,
  params: {
    endpoint: 'https://httpbin.org/post',
  },
  ortb2Imp: {
    ext: sampleImpExt,
  },
  sizes: [[320, 50]],
  getFloor(params) {
    if (
      params.size == null ||
      params.currency == null ||
      params.mediaType == null
    ) {
      throw new Error(
        `getFloor called with incomplete params: ${JSON.stringify(params)}`
      );
    }
    return {
      floor: 0.5,
      currency: 'USD',
    };
  },
  mediaTypes: {
    [BANNER]: {
      sizes: [[300, 250]],
    },
  },
  adUnitCode: 'div-gpt-ad-example',
  transactionId: utils.getUniqueIdentifierStr(),
  bidId: sampleRequestId,

  auctionId: null,
};

const schainConfig = {
  ver: '1.0',
  nodes: [
    {
      asi: 'greatnetwork.exchange',
      sid: '000001',
      hp: 1,
      rid: 'bid_request_1',
      domain: 'publisher.com',
    },
  ],
};

const sampleBidRequestVideo = {
  ...sampleBidRequestBase,
  bidId: sampleRequestId + '_video',
  sizes: [[300, 150]],
  schain: schainConfig,
  mediaTypes: {
    [VIDEO]: {
      sizes: [[360, 250]],
      context: 'adpod',
      adPodDurationSec: 90,
      contentMode: 'live',
    },
  },
};

const sampleServerResponse = {
  p: {
    hreq: [
      'https://1x1.a-mo.net/hbx/g_sync?partner=test',
      'https://1x1.a-mo.net/hbx/g_syncf?__st=iframe',
    ],
  },
  r: {
    [sampleRequestId]: [
      {
        b: [
          {
            adid: '78827819',
            adm: sampleDisplayAd,
            adomain: ['example.com'],
            crid: sampleDisplayCRID,
            h: 600,
            id: '2014691335735134254',
            impid: '1',
            exp: 90,
            price: 0.25,
            w: 300,
          },
          {
            adid: '222976952',
            adm: sampleVideoAd(''),
            adomain: ['example.com'],
            crid: sampleDisplayCRID,
            ext: {},
            h: 1,
            id: '7735706981389902829',
            impid: '1',
            exp: 90,
            price: 0.25,
            w: 1,
          },
        ],
      },
    ],
  },
};

describe('AmxBidAdapter', () => {
  describe('isBidRequestValid', () => {
    it('endpoint must be an optional string', () => {
      expect(spec.isBidRequestValid({ params: { endpoint: 1 } })).to.equal(
        false
      );
      expect(spec.isBidRequestValid({ params: { endpoint: 'test' } })).to.equal(
        true
      );
    });

    it('tagId is an optional string', () => {
      expect(spec.isBidRequestValid({ params: { tagId: 1 } })).to.equal(false);
      expect(spec.isBidRequestValid({ params: { tagId: 'test' } })).to.equal(
        true
      );
    });

    it('testMode is an optional truthy value', () => {
      expect(spec.isBidRequestValid({ params: { testMode: 1 } })).to.equal(
        true
      );
      expect(spec.isBidRequestValid({ params: { testMode: 'true' } })).to.equal(
        true
      );
      // ignore invalid values (falsy)
      expect(
        spec.isBidRequestValid({
          params: { testMode: 'non-truthy-invalid-value' },
        })
      ).to.equal(true);
      expect(spec.isBidRequestValid({ params: { testMode: false } })).to.equal(
        true
      );
    });

    it('none of the params are required', () => {
      expect(spec.isBidRequestValid({})).to.equal(true);
    });
  });
  describe('getUserSync', () => {
    it('Will perform an iframe sync even if there is no server response..', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true });
      expect(syncs).to.eql([
        {
          type: 'iframe',
          url: 'https://prebid.a-mo.net/isyn?gdpr_consent=&gdpr=0&us_privacy=&gpp=&gpp_sid=',
        },
      ]);
    });

    it('will return valid syncs from a server response', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [
        { body: sampleServerResponse },
      ]);
      expect(syncs.length).to.equal(2);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[1].type).to.equal('iframe');
    });

    it('will filter out iframe syncs based on options', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: false }, [
        { body: sampleServerResponse },
        { body: sampleServerResponse },
      ]);
      expect(syncs.length).to.equal(2);
      expect(syncs).to.satisfy((allSyncs) =>
        allSyncs.every((sync) => sync.type === 'image')
      );
    });
  });

  describe('buildRequests', () => {
    it('will default to prebid.a-mo.net endpoint', () => {
      const { url } = spec.buildRequests([], sampleBidderRequest);
      expect(url).to.equal('https://prebid.a-mo.net/a/c');
    });

    it('will read the prebid version & global', () => {
      const {
        data: { V: prebidVersion, vg: prebidGlobal },
      } = spec.buildRequests(
        [
          {
            ...sampleBidRequestBase,
            params: {
              testMode: true,
            },
          },
        ],
        sampleBidderRequest
      );
      expect(prebidVersion).to.equal('$prebid.version$');
      expect(prebidGlobal).to.equal('$$PREBID_GLOBAL$$');
    });

    it('reads test mode from the first bid request', () => {
      const { data } = spec.buildRequests(
        [
          {
            ...sampleBidRequestBase,
            params: {
              testMode: true,
            },
          },
        ],
        sampleBidderRequest
      );
      expect(data.tm).to.equal(true);
    });

    it('will attach additional referrer info data', () => {
      const { data } = spec.buildRequests(
        [sampleBidRequestBase],
        sampleBidderRequest
      );
      expect(data.ri.r).to.equal(
        sampleBidderRequest.refererInfo.topmostLocation
      );
      expect(data.ri.t).to.equal(sampleBidderRequest.refererInfo.reachedTop);
      expect(data.ri.l).to.equal(sampleBidderRequest.refererInfo.numIframes);
      expect(data.ri.s).to.equal(sampleBidderRequest.refererInfo.stack);
      expect(data.ri.c).to.equal(sampleBidderRequest.refererInfo.canonicalUrl);
    });

    it('if prebid is in an iframe, will use the frame url as domain, if the topmost is not avialable', () => {
      const { data } = spec.buildRequests([sampleBidRequestBase], {
        ...sampleBidderRequest,
        refererInfo: {
          location: null,
          topmostLocation: null,
          ref: 'http://search-traffic-source.com',
        },
      });
      expect(data.do).to.equal('localhost');
      expect(data.re).to.equal('http://search-traffic-source.com');
    });

    it('if prebid is in an iframe, will use the topmost url as domain', () => {
      const { data } = spec.buildRequests([sampleBidRequestBase], {
        ...sampleBidderRequest,
        refererInfo: {
          location: null,
          topmostLocation: 'http://top-site.com',
          ref: 'http://search-traffic-source.com',
        },
      });
      expect(data.do).to.equal('top-site.com');
      expect(data.re).to.equal('http://search-traffic-source.com');
    });

    it('handles GDPR, USP Consent, COPPA, and GPP', () => {
      const { data } = spec.buildRequests(
        [sampleBidRequestBase],
        sampleBidderRequest
      );
      delete data.m; // don't deal with 'm' in this test
      expect(data.gs).to.equal(sampleBidderRequest.gdprConsent.gdprApplies);
      expect(data.gc).to.equal(sampleBidderRequest.gdprConsent.consentString);
      expect(data.usp).to.equal(sampleBidderRequest.uspConsent);
      expect(data.gpp).to.equal(sampleBidderRequest.gppConsent);
      expect(data.cpp).to.equal(0);
    });

    it('will forward bid request count & wins count data', () => {
      const bidderRequestsCount = Math.floor(Math.random() * 100);
      const bidderWinsCount = Math.floor(Math.random() * 100);
      const { data } = spec.buildRequests(
        [
          {
            ...sampleBidRequestBase,
            bidderRequestsCount,
            bidderWinsCount,
          },
        ],
        sampleBidderRequest
      );

      expect(data.brc).to.equal(bidderRequestsCount);
      expect(data.bwc).to.equal(bidderWinsCount);
      expect(data.trc).to.equal(0);
    });

    it('will attach sync configuration', () => {
      const request = () =>
        spec.buildRequests([sampleBidRequestBase], sampleBidderRequest);

      const setConfig = (filterSettings) =>
        config.setConfig({
          userSync: {
            syncsPerBidder: 2,
            syncDelay: 2300,
            syncEnabled: true,
            filterSettings,
          },
        });

      const test = (filterSettings) => {
        setConfig(filterSettings);
        return request().data.sync;
      };

      const base = { d: 2300, l: 2, e: true };

      const tests = [
        [undefined, { ...base, t: 0 }],
        [
          {
            image: {
              bidders: '*',
              filter: 'include',
            },
            iframe: {
              bidders: '*',
              filter: 'include',
            },
          },
          { ...base, t: 3 },
        ],
        [
          {
            image: {
              bidders: ['amx'],
            },
            iframe: {
              bidders: '*',
              filter: 'include',
            },
          },
          { ...base, t: 3 },
        ],
        [
          {
            image: {
              bidders: ['other'],
            },
            iframe: {
              bidders: '*',
            },
          },
          { ...base, t: 2 },
        ],
        [
          {
            image: {
              bidders: ['amx'],
            },
            iframe: {
              bidders: ['amx'],
              filter: 'exclude',
            },
          },
          { ...base, t: 1 },
        ],
      ];

      for (let i = 0, l = tests.length; i < l; i++) {
        const [result, expected] = tests[i];
        expect(test(result), `input: ${JSON.stringify(result)}`).to.deep.equal(
          expected
        );
      }
    });

    it('will forward first-party data', () => {
      const { data } = spec.buildRequests(
        [sampleBidRequestBase],
        sampleBidderRequest
      );
      expect(data.fpd2).to.deep.equal(sampleFPD);
    });

    it('will collect & forward RTI user IDs', () => {
      const randomRTI = `greatRTI${Math.floor(Math.random() * 100)}`;
      const userId = {
        britepoolid: 'sample-britepool',
        criteoId: 'sample-criteo',
        digitrustid: { data: { id: 'sample-digitrust' } },
        id5id: { uid: 'sample-id5' },
        idl_env: 'sample-liveramp',
        lipb: { lipbid: 'sample-liveintent' },
        netId: 'sample-netid',
        parrableId: { eid: 'sample-parrable' },
        pubcid: 'sample-pubcid',
        [randomRTI]: 'sample-unknown',
        tdid: 'sample-ttd',
      };

      const eids = createEidsArray(userId);
      const bid = {
        ...sampleBidRequestBase,
        userIdAsEids: eids,
      };

      const { data } = spec.buildRequests([bid, bid], sampleBidderRequest);
      expect(data.eids).to.deep.equal(eids);
    });

    it('can build a banner request', () => {
      const { method, url, data } = spec.buildRequests(
        [
          sampleBidRequestBase,
          {
            ...sampleBidRequestBase,
            bidId: sampleRequestId + '_2',
            params: {
              ...sampleBidRequestBase.params,
              adUnitId: '',
              tagId: 'example',
            },
          },
        ],
        sampleBidderRequest
      );

      expect(url).to.equal(sampleBidRequestBase.params.endpoint);
      expect(method).to.equal('POST');
      expect(Object.keys(data.m).length).to.equal(2);
      expect(data.m[sampleRequestId]).to.deep.equal({
        av: true,
        au: 'div-gpt-ad-example',
        vd: {},
        ms: [[[320, 50]], [[300, 250]], []],
        aw: 300,
        sc: {},
        ah: 250,
        tf: 0,
        f: 0.5,
        vr: false,
        rtb: {
          ext: sampleImpExt,
        },
      });
      expect(data.m[sampleRequestId + '_2']).to.deep.equal({
        av: true,
        aw: 300,
        au: 'div-gpt-ad-example',
        sc: {},
        ms: [[[320, 50]], [[300, 250]], []],
        i: 'example',
        ah: 250,
        vd: {},
        tf: 0,
        f: 0.5,
        vr: false,
        rtb: {
          ext: sampleImpExt,
        },
      });
    });

    it('can build a video request', () => {
      const { data } = spec.buildRequests(
        [
          {
            ...sampleBidRequestVideo,
            params: {
              ...sampleBidRequestVideo.params,
              adUnitId: 'custom-auid',
            },
          },
        ],
        sampleBidderRequest
      );
      expect(Object.keys(data.m).length).to.equal(1);
      expect(data.m[sampleRequestId + '_video']).to.deep.equal({
        au: 'custom-auid',
        ms: [[[300, 150]], [], [[360, 250]]],
        av: true,
        aw: 360,
        ah: 250,
        sc: schainConfig,
        vd: {
          sizes: [[360, 250]],
          context: 'adpod',
          adPodDurationSec: 90,
          contentMode: 'live',
        },
        tf: 0,
        f: 0.5,
        rtb: {
          ext: sampleImpExt,
        },
        vr: true,
      });
    });
  });

  describe('interpretResponse', () => {
    const baseBidResponse = {
      requestId: sampleRequestId,
      cpm: 0.25,
      creativeId: sampleDisplayCRID,
      currency: 'USD',
      netRevenue: true,
      meta: {
        advertiserDomains: ['example.com'],
      },
    };

    const baseRequest = {
      data: {
        m: {
          [sampleRequestId]: {
            aw: 300,
            ah: 250,
          },
        },
      },
    };

    it('will handle a nobid response', () => {
      const parsed = spec.interpretResponse({ body: '' }, baseRequest);
      expect(parsed).to.eql([]);
    });

    it('will read an bidderCode override from bid.ext.prebid.meta', () => {
      const currentConfig = config.getConfig();
      config.setConfig({
        ...currentConfig,
        bidderSettings: {
          amx: {
            allowAlternateBidderCodes: true
          }
        }
      });

      const parsed = spec.interpretResponse(
        { body: {
          ...sampleServerResponse,
          r: {
            [sampleRequestId]: [{
              ...sampleServerResponse.r[sampleRequestId][0],
              b: [{
                ...sampleServerResponse.r[sampleRequestId][0].b[0],
                ext: {
                  bc: 'amx-pmp',
                  ds: 'example',
                }
              }]
            }]
          }}},
        baseRequest
      );

      config.setConfig(currentConfig);
      expect(parsed.length).to.equal(1); // we removed one

      // we should have display, video, display
      expect(parsed[0]).to.deep.equal({
        ...baseBidResponse,
        meta: {
          ...baseBidResponse.meta,
          mediaType: BANNER,
          demandSource: 'example'
        },
        mediaType: BANNER,
        bidderCode: 'amx-pmp',
        width: 300,
        height: 600, // from the bid itself
        ttl: 90,
        ad: sampleDisplayAd,
      });
    });

    it('can parse a display ad', () => {
      const parsed = spec.interpretResponse(
        { body: sampleServerResponse },
        baseRequest
      );
      expect(parsed.length).to.equal(2);

      // we should have display, video, display
      expect(parsed[0]).to.deep.equal({
        ...baseBidResponse,
        meta: {
          ...baseBidResponse.meta,
          mediaType: BANNER,
        },
        mediaType: BANNER,
        width: 300,
        height: 600, // from the bid itself
        ttl: 90,
        ad: sampleDisplayAd,
      });
    });

    it('can parse a video ad', () => {
      const parsed = spec.interpretResponse(
        { body: sampleServerResponse },
        baseRequest
      );
      expect(parsed.length).to.equal(2);
      expect(parsed[1]).to.deep.equal({
        ...baseBidResponse,
        meta: {
          ...baseBidResponse.meta,
          mediaType: VIDEO,
        },
        mediaType: VIDEO,
        vastXml: sampleVideoAd(''),
        width: 300,
        height: 250,
        ttl: 90,
      });
    });
  });

  describe('analytics methods', () => {
    let firedPixels = [];
    let _Image = window.Image;
    before(() => {
      _Image = window.Image;
      window.Image = class FakeImage {
        _src = '';

        get src() {
          return this._src;
        }

        set src(value) {
          this._src = value;
          firedPixels.push(value);
        }
      };
    });

    beforeEach(() => {
      firedPixels = [];
    });

    after(() => {
      window.Image = _Image;
    });

    it('will fire an event for onSetTargeting', () => {
      spec.onSetTargeting({
        bidder: 'example',
        width: 300,
        height: 250,
        adId: 'ad-id',
        mediaType: BANNER,
        cpm: 1.23,
        requestId: utils.getUniqueIdentifierStr(),
        adUnitCode: 'div-gpt-ad',
        adserverTargeting: {
          hb_pb: '1.23',
          hb_adid: 'ad-id',
          hb_bidder: 'example',
        },
      });
      expect(firedPixels.length).to.equal(1);
      expect(firedPixels[0]).to.match(/\/hbx\/g_pbst/);
      try {
        const parsed = new URL(firedPixels[0]);
        const nestedData = parsed.searchParams.get('c2');
        expect(nestedData).to.equal(
          utils.formatQS({
            hb_pb: '1.23',
            hb_adid: 'ad-id',
            hb_bidder: 'example',
          })
        );
      } catch (e) {
        // unsupported browser; try testing for string
        const pixel = firedPixels[0];
        expect(pixel).to.have.string(encodeURIComponent('hb_pb=1.23'));
        expect(pixel).to.have.string(encodeURIComponent('hb_adid=ad-id'));
      }
    });

    it('will log an event for timeout', () => {
      // this will use sendBeacon..
      spec.onTimeout([
        {
          bidder: 'example',
          bidId: 'test-bid-id',
          adUnitCode: 'div-gpt-ad',
          ortb2: {
            site: {
              ref: 'https://example.com',
            },
          },
          params: {
            tagId: 'tag-id',
          },
          timeout: 300,
          auctionId: utils.getUniqueIdentifierStr(),
        },
      ]);

      const [request] = server.requests;
      request.respond(204, {'Content-Type': 'text/html'}, null);
      expect(request.url).to.equal('https://1x1.a-mo.net/e');

      if (typeof Request !== 'undefined' && 'keepalive' in Request.prototype) {
        expect(request.fetch.request.keepalive).to.equal(true);
      }

      const {c: common, e: events} = JSON.parse(request.requestBody)
      expect(common).to.deep.equal({
        V: '$prebid.version$',
        vg: '$$PREBID_GLOBAL$$',
        U: null,
        re: 'https://example.com',
      });

      expect(events.length).to.equal(1);
      const [event] = events;
      expect(event.n).to.equal('g_pbto')
      expect(event.A).to.equal('example');
      expect(event.mid).to.equal('tag-id');
      expect(event.cn).to.equal(300);
      expect(event.bid).to.equal('test-bid-id');
      expect(event.a).to.equal('div-gpt-ad');
    });

    it('will log an event for prebid win', () => {
      spec.onBidWon({
        bidder: 'example',
        adId: 'test-ad-id',
        width: 300,
        height: 250,
        mediaType: VIDEO,
        cpm: 1.34,
        adUnitCode: 'div-gpt-ad',
        timeout: 300,
        auctionId: utils.getUniqueIdentifierStr(),
      });
      expect(firedPixels.length).to.equal(1);
      expect(firedPixels[0]).to.match(/\/hbx\/g_pbwin/);

      const pixel = firedPixels[0];
      try {
        const url = new URL(pixel);
        expect(url.searchParams.get('C')).to.equal('1');
        expect(url.searchParams.get('np')).to.equal('1.34');
      } catch (e) {
        expect(pixel).to.have.string('C=1');
        expect(pixel).to.have.string('np=1.34');
      }
    });
  });
});
