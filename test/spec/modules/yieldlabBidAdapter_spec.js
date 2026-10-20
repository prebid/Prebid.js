import { expect } from 'chai';
import { spec } from 'modules/yieldlabBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { isNativeOpenRTBBidValid, toOrtbNativeRequest } from 'src/native.js';

import 'src/prebid.js';
import 'modules/currency.js';
import 'modules/userId/index.js';
import 'modules/multibid/index.js';
import 'modules/priceFloors.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';

import { hook } from 'src/hook.js';

const DEFAULT_REQUEST = () => ({
  bidder: 'yieldlab',
  params: {
    adslotId: '1111',
    supplyId: '2222',
    targeting: {
      key1: 'value1',
      key2: 'value2',
      notDoubleEncoded: 'value3,value4'
    },
    extId: 'abc'
  },
  bidderRequestId: '143346cf0f1731',
  auctionId: '2e41f65424c87c',
  adUnitCode: 'adunit-code',
  bidId: '2d925f27f5079f',
  mediaTypes: {
    banner: { sizes: [[728, 90]] }
  },
  userIdAsEids: [{
    source: 'netid.de',
    uids: [{ id: 'fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg', atype: 1 }]
  }, {
    source: 'digitrust.de',
    uids: [{ id: 'd8aa10fa-d86c-451d-aad8-5f16162a9e64', atype: 2 }]
  }],
  schain: {
    ver: '1.0',
    complete: 1,
    nodes: [
      { asi: 'indirectseller.com', sid: '1', hp: 1 },
      { asi: 'indirectseller2.com', name: 'indirectseller2 name with comma , and bang !', sid: '2', hp: 1 }
    ]
  }
});

const VIDEO_REQUEST = () => ({
  ...DEFAULT_REQUEST(),
  mediaTypes: {
    video: {
      playerSize: [[640, 480]],
      context: 'outstream'
    }
  }
});

const NATIVE_REQUEST = () => {
  const native = {
    title: { required: true, len: 90 },
    body: { required: true },
    image: { required: true, sizes: [100, 100] },
    icon: { required: true, sizes: [16, 16] }
  };
  // Core sets nativeOrtbRequest on every native bid request; the converter builds imp.native from it.
  return { ...DEFAULT_REQUEST(), mediaTypes: { native }, nativeOrtbRequest: toOrtbNativeRequest(native) };
};

describe('yieldlabBidAdapter (ORTB)', () => {
  before(() => {
    hook.ready();
  });

  describe('instantiation', () => {
    it('creates a bidder instance', () => {
      const bidder = newBidder(spec);
      expect(bidder.callBids).to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('returns true for required params', () => {
      expect(spec.isBidRequestValid({
        params: { adslotId: '1', supplyId: '2' }
      })).to.equal(true);
    });

    it('returns false when required params are missing', () => {
      expect(spec.isBidRequestValid({})).to.equal(false);
    });
  });

  describe('buildRequests (POST /ortb)', () => {
    it('builds a POST with OpenRTB body and headers', () => {
      const bid = DEFAULT_REQUEST();
      const bidderRequest = {
        auctionId: 'auction-123',
        timeout: 700,
        refererInfo: { page: 'https://example.test/page', ref: 'https://ref.test/ref' },
        ortb2: {
          // Core's FPD enrichment sets site.page/ref; the adapter doesn't.
          site: { page: 'https://example.test/page', ref: 'https://ref.test/ref' },
          ext: { vm: { gp: true, foo: 'bar' } },
          source: { ext: { schain: bid.schain } },
          user: { ext: { eids: bid.userIdAsEids } }
        }
      };

      const req = spec.buildRequests([bid], bidderRequest);

      expect(req.method).to.equal('POST');
      expect(req.url).to.match(/\/ortb$/);
      expect(req.options).to.have.nested.property('contentType', 'application/json');
      expect(req.options).to.have.nested.property('customHeaders.x-openrtb-version', '2.6');

      const ortb = req.data;

      expect(ortb.tmax).to.equal(700);
      expect(ortb.cur).to.deep.equal(['EUR']);

      // site
      expect(ortb).to.have.property('site');
      expect(ortb.site.page).to.equal('https://example.test/page');
      expect(ortb.site.ref).to.equal('https://ref.test/ref');

      // imp[0]
      expect(ortb.imp).to.be.an('array').with.length(1);
      const imp = ortb.imp[0];
      expect(imp.id).to.equal(bid.bidId);
      expect(imp.tagid).to.equal('1111');

      expect(ortb).to.have.nested.property('ext.vm.client', 'prebid-js');

      // ext.vm (pass-through + additions)
      expect(ortb).to.have.nested.property('ext.vm');
      expect(ortb.ext.vm.gp).to.equal(true);
      expect(ortb.ext.vm.foo).to.equal('bar');
      expect(ortb.ext.vm.externalid).to.equal('abc');
      expect(ortb.ext.vm.targeting).to.equal('key1=value1&key2=value2&notDoubleEncoded=value3,value4');

      expect(ortb).to.have.nested.property('user.ext.eids').that.is.an('array').with.length(2);
      expect(ortb).to.have.nested.property('user.eids').that.is.an('array').with.length(2);

      expect(ortb).to.have.nested.property('source.ext.schain.ver', '1.0');
      expect(ortb).to.have.nested.property('source.schain.ver', '1.0');
    });

    it('returns no request at all when not a single imp could be built', () => {
      // No imps means no request: an ORTB request without impressions is invalid.
      const req = spec.buildRequests([], { auctionId: 'no-imps', timeout: 300 });

      expect(req).to.deep.equal([]);
    });

    describe('applyIabContent', () => {
      it('copies fields to site.content, aliases live to livestream, ignores nulls, preserves unknown keys', () => {
        const bid = DEFAULT_REQUEST();
        bid.params.iabContent = {
          id: 'c-1',
          title: 'Episode Title',
          live: 1,
          keywords: 'foo,bar',
          customX: 'keep-me',
          nullable: null
        };

        const bidderRequest = {
          auctionId: 'auc-iab',
          timeout: 500,
          refererInfo: { page: 'https://p', ref: 'https://r' }
        };

        const req = spec.buildRequests([bid], bidderRequest);
        const ortb = req.data;

        expect(ortb).to.have.nested.property('site.content');
        const content = ortb.site.content;
        expect(content.id).to.equal('c-1');
        expect(content.title).to.equal('Episode Title');
        expect(content.livestream).to.equal(1); // alias applied
        expect(content).to.have.property('keywords', 'foo,bar');
        expect(content).to.have.property('customX', 'keep-me');
        expect(content).to.not.have.property('nullable');
      });

      it('overwrites existing duplicate fields in content (by design)', () => {
        const bid = DEFAULT_REQUEST();
        bid.params.iabContent = { title: 'new-title' };

        const bidderRequest = {
          auctionId: 'auc-iab2',
          timeout: 300,
          refererInfo: { page: 'https://p', ref: 'https://r' },
          // pre-populate site.content via ortb2 to ensure we overwrite
          ortb2: { site: { content: { title: 'old-title', series: 'keep-series' } } }
        };

        const req = spec.buildRequests([bid], bidderRequest);
        const ortb = req.data;

        expect(ortb).to.have.nested.property('site.content');
        expect(ortb.site.content.title).to.equal('new-title'); // overwritten
        expect(ortb.site.content.series).to.equal('keep-series'); // unrelated preserved
      });

      it('leaves a page content field alone when the param sets it to null', () => {
        const bid = DEFAULT_REQUEST();
        bid.params.iabContent = { title: null, series: 'param-series' };

        const req = spec.buildRequests([bid], {
          auctionId: 'auc-iab-null',
          ortb2: { site: { content: { title: 'page-title' } } }
        });

        expect(req.data.site.content).to.deep.equal({ title: 'page-title', series: 'param-series' });
      });

      it('writes to app.content for an app request', () => {
        const bid = DEFAULT_REQUEST();
        bid.params.iabContent = { title: 'app-title', live: 0 };

        const req = spec.buildRequests([bid], {
          auctionId: 'auc-iab-app',
          ortb2: { app: { bundle: 'com.example', content: { series: 'app-series' } } }
        });

        expect(req.data.app.content).to.deep.equal({ series: 'app-series', title: 'app-title', livestream: 0 });
        expect(req.data).to.not.have.nested.property('site.content');
      });

      it('takes the first ad unit that sets iabContent for the whole request', () => {
        const without = DEFAULT_REQUEST();
        delete without.params.iabContent;
        const first = DEFAULT_REQUEST();
        first.bidId = 'bid-2';
        first.params.iabContent = { title: 'first' };
        const second = DEFAULT_REQUEST();
        second.bidId = 'bid-3';
        second.params.iabContent = { title: 'second' };

        const req = spec.buildRequests([without, first, second], { auctionId: 'auc-iab-first' });

        expect(req.data.site.content.title).to.equal('first');
      });

      it('prefers an explicit livestream over the live alias, whatever the key order', () => {
        const liveFirst = DEFAULT_REQUEST();
        liveFirst.params.iabContent = { live: 1, livestream: 0 };
        const livestreamFirst = DEFAULT_REQUEST();
        livestreamFirst.params.iabContent = { livestream: 0, live: 1 };

        for (const bid of [liveFirst, livestreamFirst]) {
          const content = spec.buildRequests([bid], { auctionId: 'auc-iab-live' }).data.site.content;
          expect(content.livestream).to.equal(0);
          expect(content).to.not.have.property('live');
        }
      });

      it('joins a keywords array into the comma-separated string OpenRTB defines', () => {
        // The adserver rejects a request whose content.keywords is not a string.
        const bid = DEFAULT_REQUEST();
        bid.params.iabContent = { keywords: ['k1', 'k2'] };

        const content = spec.buildRequests([bid], { auctionId: 'auc-iab-kw' }).data.site.content;

        expect(content.keywords).to.equal('k1,k2');
      });

      it('ignores an iabContent param that is not a plain object', () => {
        for (const iabContent of ['title=x', 42, ['a', 'b']]) {
          const bid = DEFAULT_REQUEST();
          bid.params.iabContent = iabContent;

          const req = spec.buildRequests([bid], { auctionId: 'auc-iab-shape' });

          expect(req.data).to.not.have.nested.property('site.content');
        }
      });
    });

    describe('applyVmExt', () => {
      it('preserves unrelated FPD fields but overwrites externalid, targeting', () => {
        const bid = DEFAULT_REQUEST(); // extId = 'abc'
        // add some targeting to ensure encoding happens
        bid.params.targeting = { a: '1', b: '2' };

        const bidderRequest = {
          auctionId: 'auc-vm-1',
          timeout: 600,
          refererInfo: { page: 'https://p', ref: 'https://r' },
          ortb2: {
            ext: {
              vm: {
                gp: true,
                foo: 'bar',
                windowid: 'window-id',
                externalid: 'old-ext',
                targeting: 'old-target'
              }
            }
          }
        };

        const req = spec.buildRequests([bid], bidderRequest);
        const ortb = req.data;

        expect(ortb).to.have.nested.property('ext.vm.gp', true);
        expect(ortb).to.have.nested.property('ext.vm.foo', 'bar');
        expect(ortb.ext.vm.windowid).to.equal('window-id');

        // overwritten by adapter
        expect(ortb.ext.vm.externalid).to.equal('abc');
        expect(ortb.ext.vm.targeting).to.equal('a=1&b=2');
      });
    });
  });

  describe('interpretResponse (banner)', () => {
    it('maps a standard ORTB banner bid', () => {
      const bid = DEFAULT_REQUEST();
      const req = spec.buildRequests([bid], { auctionId: 'auction-123', timeout: 700 });
      const ortbReq = req.data;

      const serverResponse = {
        body: {
          id: 'auction-123',
          seatbid: [{
            bid: [{
              impid: ortbReq.imp[0].id,
              mtype: 1,
              price: 1.23,
              adm: '<div>banner creative</div>',
              w: 728,
              h: 90,
              crid: 'srv-1',
              dealid: 'deal-42',
              adomain: ['yieldlab']
            }]
          }],
          cur: 'EUR'
        }
      };

      const res = spec.interpretResponse(serverResponse, req);
      expect(res).to.be.an('array').with.length(1);
      const bidResponse = res[0];

      expect(bidResponse.mediaType).to.equal('banner');
      expect(bidResponse.cpm).to.equal(1.23);
      expect(bidResponse.width).to.equal(728);
      expect(bidResponse.height).to.equal(90);
      expect(bidResponse.creativeId).to.equal('srv-1');
      expect(bidResponse.dealId).to.equal('deal-42');
      expect(bidResponse.currency).to.equal('EUR');
      expect(bidResponse.netRevenue).to.equal(false);
      expect(bidResponse.ttl).to.equal(300);
      expect(bidResponse.ad).to.equal('<div>banner creative</div>');
      expect(bidResponse.meta.advertiserDomains).to.deep.equal(['yieldlab']);
    });

    it('reports net revenue when the endpoint marks the bid net', () => {
      const req = spec.buildRequests([DEFAULT_REQUEST()], { auctionId: 'auction-net' });
      const bidWith = (ext) => spec.interpretResponse({
        body: {
          id: 'auction-net',
          seatbid: [{
            bid: [{ impid: req.data.imp[0].id, mtype: 1, price: 1, adm: '<div></div>', w: 728, h: 90, crid: 'c', adomain: ['yieldlab'], ext }]
          }],
          cur: 'EUR'
        }
      }, req)[0];

      expect(bidWith({ netrevenue: true }).netRevenue).to.equal(true);
      expect(bidWith({ netrevenue: false }).netRevenue).to.equal(false);
    });

    it('passes through DSA', () => {
      const bid = DEFAULT_REQUEST();
      const req = spec.buildRequests([bid], { auctionId: 'auction-nodom', timeout: 300 });
      const ortbReq = req.data;

      const serverResponse = {
        body: {
          id: 'auction-nodom',
          seatbid: [{
            bid: [{
              impid: ortbReq.imp[0].id,
              mtype: 1,
              price: 0.5,
              adm: '<div>banner</div>',
              id: 'srv-2',
              ext: { dsa: { foo: 'bar' } }
            }]
          }],
          cur: 'EUR'
        }
      };

      const res = spec.interpretResponse(serverResponse, req);
      expect(res).to.have.length(1);
      const bidResponse = res[0];

      expect(bidResponse.mediaType).to.equal('banner');
      expect(bidResponse.meta.dsa).to.deep.equal({ foo: 'bar' });
    });
  });

  describe('interpretResponse (video)', () => {
    it('installs outstream renderer and applies player size', () => {
      const bid = VIDEO_REQUEST();
      const req = spec.buildRequests([bid], { auctionId: 'a' });
      const ortbReq = req.data;

      const serverResponse = {
        body: {
          id: 'a',
          seatbid: [{
            bid: [{
              impid: ortbReq.imp[0].id,
              price: 2.0,
              // mtype alone decides the response media type
              mtype: 2,
              adm: '<VAST version="3.0"></VAST>',
              w: 640,
              h: 480,
              adomain: ['yieldlab'],
              crid: 'v-1'
            }]
          }],
          cur: 'EUR'
        }
      };

      const res = spec.interpretResponse(serverResponse, req);
      expect(res).to.have.length(1);
      const bidResponse = res[0];

      expect(bidResponse.mediaType).to.equal('video');
      expect(bidResponse.width).to.equal(640);
      expect(bidResponse.height).to.equal(480);
      expect(bidResponse.renderer).to.exist;
      expect(bidResponse.renderer.id).to.equal(bid.bidId);
    });

    it('uses playerSize when server omits w/h', () => {
      const bid = VIDEO_REQUEST();
      const req = spec.buildRequests([bid], { auctionId: 'a2' });
      const ortbReq = req.data;

      const serverResponse = {
        body: {
          id: 'a2',
          seatbid: [{
            bid: [{
              impid: ortbReq.imp[0].id,
              mtype: 2,
              price: 1.5,
              adm: '<VAST version="3.0"></VAST>',
              // w/h intentionally omitted
              adomain: ['yieldlab'],
              crid: 'v-2'
            }]
          }],
          cur: 'EUR'
        }
      };

      const res = spec.interpretResponse(serverResponse, req);
      expect(res).to.have.length(1);
      const bidResponse = res[0];

      expect(bidResponse.mediaType).to.equal('video');
      expect(bidResponse.width).to.equal(640); // from playerSize
      expect(bidResponse.height).to.equal(480); // from playerSize
    });
  });

  describe('interpretResponse (native)', () => {
    if (FEATURES.NATIVE) {
      it('sends the native request and keeps the assets and trackers it gets back', () => {
        const bid = NATIVE_REQUEST();
        const req = spec.buildRequests([bid], { auctionId: 'a' });
        const ortbReq = req.data;

        const requested = JSON.parse(ortbReq.imp[0].native.request).assets;
        expect(requested.map((a) => a.id)).to.deep.equal(bid.nativeOrtbRequest.assets.map((a) => a.id));
        const idOf = (pick) => requested.find(pick).id;

        // Native 1.1+ response: no `native` wrapper object.
        const nativeAdm = JSON.stringify({
          link: { url: 'https://www.yieldlab.de' },
          assets: [
            { id: idOf((a) => a.title), title: { text: 'This is a great headline' } },
            { id: idOf((a) => a.img?.type === 3), img: { url: 'https://ad.yieldlab.net/yl-logo100x100.jpg', w: 100, h: 100 } },
            { id: idOf((a) => a.data), data: { value: 'Native body value' } },
            { id: idOf((a) => a.img?.type === 1), img: { url: 'https://ad.yieldlab.net/assets/favicon/favicon-16x16.png', w: 16, h: 16 } }
          ],
          imptrackers: ['https://tracker/1', 'https://tracker/2']
        });

        const res = spec.interpretResponse({
          body: {
            id: 'a',
            seatbid: [{
              bid: [{ impid: ortbReq.imp[0].id, price: 0.9, mtype: 4, adm: nativeAdm, adomain: ['yieldlab'], crid: 'n-1' }]
            }],
            cur: 'EUR'
          }
        }, req);
        expect(res).to.have.length(1);
        expect(res[0].mediaType).to.equal('native');

        const nativeResponse = res[0].native.ortb;
        expect(nativeResponse.assets.map((a) => a.id)).to.have.members(requested.map((a) => a.id));
        expect(nativeResponse.imptrackers).to.deep.equal(['https://tracker/1', 'https://tracker/2']);
        expect(nativeResponse.link?.url).to.equal('https://www.yieldlab.de');
        expect(isNativeOpenRTBBidValid(nativeResponse, bid.nativeOrtbRequest)).to.equal(true);
      });
    }
  });

  describe('native asset-id contract with the adserver', () => {
    if (FEATURES.NATIVE) {
      // The endpoint answers in the asset ids the request sent and the adapter passes
      // them through. Prebid validates and renders by id, so a mismatch drops every native bid.
      const nativeBid = (nativeCfg) => {
        const bid = { ...DEFAULT_REQUEST(), mediaTypes: { native: nativeCfg } };
        bid.nativeOrtbRequest = toOrtbNativeRequest(nativeCfg);
        return bid;
      };

      /** Answer a bid request in its own asset ids and the bare envelope, as the endpoint does. */
      const interpretResponseInRequestedIds = (bidRequest) => {
        const req = spec.buildRequests([bidRequest], { auctionId: 'nat-ids' });
        const ortbReq = req.data;
        const requested = JSON.parse(ortbReq.imp[0].native.request).assets;

        const adm = JSON.stringify({
          ver: '1.2',
          link: { url: 'https://ad.yieldlab.net/qa/click' },
          assets: requested.map((asset) => (asset.title
            ? { id: asset.id, title: { text: 'This is a great headline' } }
            : { id: asset.id, img: { url: 'https://ad.yieldlab.net/qa/main.jpg', w: 300, h: 250 } }))
        });

        const res = spec.interpretResponse({
          body: {
            id: 'nat-ids',
            cur: 'EUR',
            seatbid: [{
              bid: [{
                impid: ortbReq.imp[0].id,
                price: 1.0,
                mtype: 4,
                adm,
                adomain: ['yieldlab'],
                crid: 'qa-native-crid'
              }]
            }]
          }
        }, req);
        expect(res).to.have.length(1);
        return { bidResponse: res[0], requestedIds: requested.map((a) => a.id) };
      };

      it('passes the asset ids through without renumbering them', () => {
        const bid = nativeBid({ image: { required: false, sizes: [300, 250] } });
        const { bidResponse, requestedIds } = interpretResponseInRequestedIds(bid);

        expect(bidResponse.native.ortb.assets.map((a) => a.id)).to.deep.equal(requestedIds);
      });

      it('produces a bid Prebid considers valid, which is what matching ids buy us', () => {
        const bid = nativeBid({
          title: { required: true, len: 90 },
          image: { required: false, sizes: [300, 250] }
        });
        const { bidResponse } = interpretResponseInRequestedIds(bid);

        expect(bidResponse.mediaType).to.equal('native');
        expect(isNativeOpenRTBBidValid(bidResponse.native.ortb, bid.nativeOrtbRequest)).to.equal(true);
      });
    }
  });

  describe('getUserSyncs', () => {
    const syncOptions = { iframeEnabled: true, pixelEnabled: false };

    it('returns iframe sync with GDPR fields', () => {
      const gdprConsent = { gdprApplies: true, consentString: 'CONSENT-STRING' };
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent, '1YYY');
      expect(syncs).to.be.an('array').with.length(1);
      const sync = syncs[0];
      expect(sync.type).to.equal('iframe');
      expect(sync.url).to.match(/^https:\/\/ad.yieldlab.net\/d\/6846326\/766\/2x2\?/);
      expect(sync.url).to.include('type=h');
      expect(sync.url).to.include('gdpr=1');
      expect(sync.url).to.include('gdpr_consent=CONSENT-STRING');
      expect(sync.url).to.not.include('usp_consent');
      expect(sync.url).to.match(/ts=\d+/);
    });

    it('returns empty when iframe syncs are disabled', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, [], null, null);
      expect(syncs).to.deep.equal([]);
    });

    it('omits both GDPR params when there is no consent data', () => {
      const syncs = spec.getUserSyncs(syncOptions, [], undefined, undefined);

      expect(syncs).to.be.an('array').with.length(1);
      expect(syncs[0].url).to.include('/d/6846326/766/2x2?');
      expect(syncs[0].url).to.include('type=h');
      expect(syncs[0].url).to.match(/ts=\d+/);
      expect(syncs[0].url).to.not.include('gdpr=');
      expect(syncs[0].url).to.not.include('gdpr_consent=');
    });

    it('sends gdpr=0 when gdprApplies is false', () => {
      const syncs = spec.getUserSyncs(syncOptions, [], { gdprApplies: false, consentString: 'CONSENT-0' }, null);

      expect(syncs).to.have.length(1);
      expect(syncs[0].url).to.include('gdpr=0');
      expect(syncs[0].url).to.include('gdpr_consent=CONSENT-0');
    });

    it('omits gdpr but keeps the consent string when gdprApplies is not a boolean', () => {
      const syncs = spec.getUserSyncs(syncOptions, [], { consentString: 'CONSENT-ONLY' }, null);

      expect(syncs).to.have.length(1);
      expect(syncs[0].url).to.not.include('gdpr=');
      expect(syncs[0].url).to.include('gdpr_consent=CONSENT-ONLY');
    });
  });

  describe('floors', () => {
    // The adapter computes no floors: the price floors module's converter
    // processors write imp.bidfloor and a floor per media type, and the
    // endpoint applies the one for the adslot's media type, ignoring any
    // currency but EUR and USD.

    it('sends the floor getFloor returns, asked for in EUR', () => {
      const bid = DEFAULT_REQUEST();
      const calls = [];
      bid.getFloor = (args) => {
        calls.push(args);
        return { currency: 'EUR', floor: 1.1 };
      };

      const imp = spec.buildRequests([bid], { auctionId: 'flo-eur', timeout: 300 }).data.imp[0];

      expect(calls.every(({ currency }) => currency === 'EUR')).to.equal(true);
      expect(imp.bidfloor).to.equal(1.1);
      expect(imp).to.have.property('bidfloorcur', 'EUR');
    });

    it('passes a floor in another currency through for the endpoint to convert or ignore', () => {
      for (const currency of ['USD', 'GBP']) {
        const bid = DEFAULT_REQUEST();
        bid.getFloor = () => ({ currency, floor: 3.3 });

        const imp = spec.buildRequests([bid], { auctionId: 'flo-cur', timeout: 300 }).data.imp[0];

        expect(imp.bidfloor).to.equal(3.3);
        expect(imp).to.have.property('bidfloorcur', currency);
      }
    });

    it('sends a floor per media type of a multiformat ad unit', () => {
      const bid = DEFAULT_REQUEST();
      bid.mediaTypes.video = { playerSize: [[640, 480]], context: 'outstream' };
      const floors = { '*': 1.0, banner: 2.0, video: 3.0 };
      bid.getFloor = ({ mediaType, size }) =>
        ({ currency: 'EUR', floor: Array.isArray(size) ? floors.banner : floors[mediaType] });

      const imp = spec.buildRequests([bid], { auctionId: 'flo-multiformat', timeout: 300 }).data.imp[0];

      // The wildcard at the top level, each media type's own floor beside it.
      expect(imp.bidfloor).to.equal(1.0);
      expect(imp.banner).to.have.nested.property('ext.bidfloor', 2.0);
      expect(imp.banner).to.have.nested.property('ext.bidfloorcur', 'EUR');
      if (FEATURES.VIDEO) {
        expect(imp.video).to.have.nested.property('ext.bidfloor', 3.0);
      }
    });

    it('leaves out a media type floor that equals imp.bidfloor', () => {
      // The endpoint falls back to imp.bidfloor when the media object has none.
      const bid = DEFAULT_REQUEST();
      bid.getFloor = () => ({ currency: 'EUR', floor: 1.5 });

      const imp = spec.buildRequests([bid], { auctionId: 'flo-same', timeout: 300 }).data.imp[0];

      expect(imp.bidfloor).to.equal(1.5);
      expect(imp.banner).to.not.have.nested.property('ext.bidfloor');
    });

    it('keeps the imp, unfloored, when getFloor throws', () => {
      // Publisher floor code can throw; the floors module catches it.
      const bid = DEFAULT_REQUEST();
      bid.getFloor = () => {
        throw new Error('floor provider exploded');
      };

      const ortb = spec.buildRequests([bid], { auctionId: 'flo-throws', timeout: 300 }).data;

      expect(ortb.imp).to.be.an('array').with.length(1);
      expect(ortb.imp[0].tagid).to.equal('1111');
      expect(ortb.imp[0]).to.not.have.property('bidfloor');
    });

    it('leaves the imp unfloored when the bid has no getFloor', () => {
      const bid = DEFAULT_REQUEST();
      expect(bid.getFloor).to.equal(undefined);

      const imp = spec.buildRequests([bid], { auctionId: 'flo-nogetfloor', timeout: 300 }).data.imp[0];

      expect(imp).to.not.have.property('bidfloor');
      expect(imp).to.not.have.property('bidfloorcur');
    });

    it('leaves the imp unfloored when getFloor answers with no usable floor', () => {
      for (const floor of [undefined, 0]) {
        const bid = DEFAULT_REQUEST();
        bid.getFloor = () => ({ currency: 'EUR', floor });

        const imp = spec.buildRequests([bid], { auctionId: 'flo-none', timeout: 300 }).data.imp[0];

        expect(imp).to.not.have.property('bidfloor');
        expect(imp).to.not.have.property('bidfloorcur');
      }
    });
  });

  describe('responses', () => {
    it('yields no bid when the response omits mtype', () => {
      // Core resolves the media type from mtype alone and drops the bid without it.
      const bid = DEFAULT_REQUEST();
      const req = spec.buildRequests([bid], { auctionId: 'no-mtype', timeout: 300 });
      const ortbReq = req.data;

      const res = spec.interpretResponse({
        body: {
          id: 'no-mtype',
          cur: 'EUR',
          seatbid: [{
            bid: [{
              impid: ortbReq.imp[0].id,
              price: 1.0,
              adm: '<div>banner creative</div>',
              crid: 'no-mtype-crid',
              adomain: ['yieldlab']
            }]
          }]
        }
      }, req);

      expect(res).to.have.length(0);
    });
  });

  describe('applyConsent', () => {
    it('mirrors 2.5 fields (regs.ext.gdpr=1, user.ext.consent) into 2.6 (regs.gdpr, user.consent)', () => {
      const bid = DEFAULT_REQUEST();
      const bidderRequest = {
        auctionId: 'gdpr-mirror-1',
        timeout: 400,
        ortb2: {
          regs: { ext: { gdpr: 1 } },
          user: { ext: { consent: 'CONSENT-STRING' } }
        }
      };

      const req = spec.buildRequests([bid], bidderRequest);
      const ortb = req.data;

      // source (2.5) still present
      expect(ortb).to.have.nested.property('regs.ext.gdpr', 1);
      expect(ortb).to.have.nested.property('user.ext.consent', 'CONSENT-STRING');
      // mirrored (2.6)
      expect(ortb).to.have.nested.property('regs.gdpr', 1);
      expect(ortb).to.have.nested.property('user.consent', 'CONSENT-STRING');
    });

    it('mirrors when gdpr=0 and leaves consent absent if not provided', () => {
      const bid = DEFAULT_REQUEST();
      const bidderRequest = {
        auctionId: 'gdpr-mirror-0',
        timeout: 400,
        ortb2: {
          regs: { ext: { gdpr: 0 } }
          // no user.ext.consent
        }
      };

      const req = spec.buildRequests([bid], bidderRequest);
      const ortb = req.data;

      expect(ortb).to.have.nested.property('regs.ext.gdpr', 0);
      expect(ortb).to.have.nested.property('regs.gdpr', 0);
      expect(ortb).to.not.have.nested.property('user.consent');
    });

    it('mirrors an empty consent string rather than dropping it', () => {
      const bid = DEFAULT_REQUEST();
      const bidderRequest = {
        auctionId: 'gdpr-empty-consent',
        timeout: 400,
        ortb2: {
          regs: { ext: { gdpr: 1 } },
          user: { ext: { consent: '' } }
        }
      };

      const req = spec.buildRequests([bid], bidderRequest);
      const ortb = req.data;

      expect(ortb).to.have.nested.property('user.ext.consent', '');
      expect(ortb).to.have.nested.property('user.consent', '');
    });

    it('leaves both 2.6 fields absent when the page supplies no consent data', () => {
      const bid = DEFAULT_REQUEST();

      const req = spec.buildRequests([bid], { auctionId: 'gdpr-absent', timeout: 400 });
      const ortb = req.data;

      expect(ortb).to.not.have.nested.property('regs.gdpr');
      expect(ortb).to.not.have.nested.property('user.consent');
    });
  });

  describe('multiple imps', () => {
    it('sets tagid per imp and merges VM targeting with later values overwriting earlier', () => {
      const bid1 = DEFAULT_REQUEST();
      bid1.params.adslotId = '1111';
      bid1.params.targeting = { k: '1' };

      const bid2 = DEFAULT_REQUEST();
      bid2.bidId = 'BID-2';
      bid2.params.adslotId = '2222';
      bid2.params.targeting = { k: '2', x: 'y' };

      const req = spec.buildRequests([bid1, bid2], { auctionId: 'multi', timeout: 300 });
      const ortb = req.data;

      const imp1 = ortb.imp.find(i => i.id === bid1.bidId);
      const imp2 = ortb.imp.find(i => i.id === bid2.bidId);
      expect(imp1.tagid).to.equal('1111');
      expect(imp2.tagid).to.equal('2222');

      // mergeKeyValues + kvToQueryString: later overwrite, order preserved
      expect(ortb).to.have.nested.property('ext.vm.targeting', 'k=2&x=y');
    });
  });

  describe('applySchain', () => {
    it('mirrors source.ext.schain to source.schain', () => {
      const bid = DEFAULT_REQUEST();

      const bidderRequest = {
        auctionId: 'schain-fpd',
        timeout: 300,
        ortb2: { source: { ext: { schain: bid.schain } } }
      };

      const req = spec.buildRequests([bid], bidderRequest);
      const ortb = req.data;

      expect(ortb).to.have.nested.property('source.ext.schain.ver', '1.0');
      expect(ortb).to.have.nested.property('source.schain.ver', '1.0');
    });

    it('mirrors the whole chain, nodes included', () => {
      const bid = DEFAULT_REQUEST();

      const req = spec.buildRequests([bid], {
        auctionId: 'schain-nodes',
        timeout: 300,
        ortb2: { source: { ext: { schain: bid.schain } } }
      });
      const ortb = req.data;

      expect(ortb.source.schain).to.deep.equal(bid.schain);
      expect(ortb.source.schain.nodes).to.have.length(2);
      expect(ortb.source.schain.nodes[1].name).to.equal('indirectseller2 name with comma , and bang !');
    });

    it('leaves source.schain absent when the page provides no chain', () => {
      const bid = DEFAULT_REQUEST();

      const req = spec.buildRequests([bid], { auctionId: 'schain-none', timeout: 300 });
      const ortb = req.data;

      expect(ortb).to.not.have.nested.property('source.schain');
    });
  });

  describe('applyEids', () => {
    it('mirrors user.ext.eids to user.eids', () => {
      const bid = DEFAULT_REQUEST();

      const req = spec.buildRequests([bid], {
        auctionId: 'eids-mirror',
        timeout: 300,
        ortb2: { user: { ext: { eids: bid.userIdAsEids } } }
      });
      const ortb = req.data;

      expect(ortb.user.ext.eids).to.deep.equal(bid.userIdAsEids);
      expect(ortb.user.eids).to.deep.equal(bid.userIdAsEids);
      expect(ortb.user.eids[0].source).to.equal('netid.de');
      expect(ortb.user.eids[1].uids[0].atype).to.equal(2);
    });

    it('leaves user.eids absent when the page provides no eids', () => {
      const bid = DEFAULT_REQUEST();

      const req = spec.buildRequests([bid], { auctionId: 'eids-none', timeout: 300 });
      const ortb = req.data;

      expect(ortb).to.not.have.nested.property('user.eids');
    });
  });

  describe('dealId', () => {
    it('is left unset when the served bid carries no dealid', () => {
      const bid = DEFAULT_REQUEST();
      const req = spec.buildRequests([bid], { auctionId: 'deal-none', timeout: 300 });
      const ortbReq = req.data;

      const serverResponse = {
        body: {
          id: 'deal-none',
          seatbid: [{
            bid: [{
              impid: ortbReq.imp[0].id,
              price: 1.0,
              mtype: 1,
              adm: '<div>banner creative</div>',
              crid: 'no-deal',
              adomain: ['yieldlab']
              // no dealid
            }]
          }],
          cur: 'EUR'
        }
      };

      const res = spec.interpretResponse(serverResponse, req);
      expect(res).to.have.length(1);
      expect(res[0]).to.not.have.property('dealId');
    });
  });
});
