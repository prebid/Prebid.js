import { expect } from 'chai';
import sinon from 'sinon';
import { resetUserSync, spec } from 'modules/luponmediaBidAdapter.js';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr.js';

describe('luponmediaBidAdapter (LuponMedia S2S)', function () {
  function bidRequest(params, extra = {}) {
    return {
      bidder: 'luponmedia',
      bidId: 'bid-' + params.key,
      adUnitCode: 'div-' + params.key,
      auctionId: 'auction-1',
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      params,
      ...extra,
    };
  }

  const bidderRequest = {
    bidderCode: 'luponmedia',
    auctionId: 'auction-1',
    timeout: 1000,
    refererInfo: { page: 'https://example.com/a', domain: 'example.com' },
    ortb2: { site: { page: 'https://example.com/a', domain: 'example.com' } },
  };

  describe('isBidRequestValid', function () {
    it('requires a valid key', function () {
      expect(spec.isBidRequestValid(bidRequest({ key: 'acme' }))).to.equal(true);
      expect(spec.isBidRequestValid(bidRequest({ key: 'Acme.home-mpu' }))).to.equal(true);
      ['', 'acme.', '.acme', 'a b', 'acme..x', 'acme/x', 'a"b'].forEach(key => {
        expect(spec.isBidRequestValid(bidRequest({ key })), key).to.equal(false);
      });
      expect(spec.isBidRequestValid(bidRequest({ key: 42 }))).to.equal(false);
      expect(spec.isBidRequestValid({ bidder: 'luponmedia' })).to.equal(false);
    });

    it('rejects the old publisherId / placementId params', function () {
      expect(spec.isBidRequestValid(bidRequest({ publisherId: 'pub', placementId: 'plc' }))).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    afterEach(function () { config.resetConfig(); });

    it('sends the key per slot and its prefix in the url', function () {
      const bids = [
        bidRequest({ key: 'acme' }, { bidId: 'b1', adUnitCode: 'top' }),
        bidRequest({ key: 'ACME.plc-side' }, { bidId: 'b2', adUnitCode: 'side' }),
      ];
      const [req, ...rest] = spec.buildRequests(bids, { ...bidderRequest, bids });

      expect(rest).to.have.length(0);
      expect(req.method).to.equal('POST');
      expect(req.url).to.equal('https://api.imanego.com/openrtb2/auction?key=acme');
      expect(req.data.id).to.equal('auction-1');
      expect(req.data.tmax).to.be.a('number');
      expect(req.data.site.publisher).to.equal(undefined);
      expect(req.data.site.domain).to.equal('example.com');
      expect(req.data.ext?.prebid?.storedrequest).to.equal(undefined);
      expect(req.data.ext?.prebid?.analytics).to.equal(undefined);
      expect(req.data.imp.map(i => i.ext.prebid.imanego.key)).to.deep.equal(['acme', 'acme.plc-side']);
      expect(req.data.imp.map(i => i.ext.prebid.storedrequest)).to.deep.equal([undefined, undefined]);
      expect(req.data.imp.map(i => i.ext.prebid.bidder)).to.deep.equal([undefined, undefined]);
      expect(req.data.imp.map(i => i.ext.prebid.adunitcode)).to.deep.equal(['top', 'side']);
      expect(req.data.imp[0].banner.format[0]).to.deep.equal({ w: 300, h: 250 });
    });

    it('sends one request per key prefix', function () {
      const bids = [
        bidRequest({ key: 'acme' }, { bidId: 'b1' }),
        bidRequest({ key: 'other' }, { bidId: 'b2' }),
        bidRequest({ key: 'acme.side' }, { bidId: 'b3' }),
      ];
      const reqs = spec.buildRequests(bids, { ...bidderRequest, bids });
      expect(reqs.map(r => r.url)).to.deep.equal([
        'https://api.imanego.com/openrtb2/auction?key=acme',
        'https://api.imanego.com/openrtb2/auction?key=other',
      ]);
      expect(reqs[0].data.imp.map(i => i.ext.prebid.imanego.key)).to.deep.equal(['acme', 'acme.side']);
    });

    it('groups any valid key, including ones named like object properties', function () {
      const bids = [bidRequest({ key: 'constructor' }), bidRequest({ key: 'tostring.x' })];
      const reqs = spec.buildRequests(bids, { ...bidderRequest, bids });
      expect(reqs.map(r => r.url)).to.deep.equal([
        'https://api.imanego.com/openrtb2/auction?key=constructor',
        'https://api.imanego.com/openrtb2/auction?key=tostring',
      ]);
    });

    it('ignores unknown params such as dc', function () {
      const bids = [bidRequest({ key: 'acme', dc: 'eu' })];
      expect(spec.buildRequests(bids, { ...bidderRequest, bids })[0].url).to.equal('https://api.imanego.com/openrtb2/auction?key=acme');
    });

    it('allows a localhost endpoint for development only', function () {
      const bids = [bidRequest({ key: 'acme' })];
      config.setConfig({ luponmedia: { devEndpoint: 'http://localhost:8000' } });
      expect(spec.buildRequests(bids, { ...bidderRequest, bids })[0].url).to.equal('http://localhost:8000/openrtb2/auction?key=acme');
      config.setConfig({ luponmedia: { devEndpoint: 'https://evil.example.com' } });
      expect(spec.buildRequests(bids, { ...bidderRequest, bids })[0].url).to.equal('https://api.imanego.com/openrtb2/auction?key=acme');
    });
  });

  describe('interpretResponse', function () {
    it('returns bids as luponmedia with the seat in meta and the win url', function () {
      const bids = [bidRequest({ key: 'acme' })];
      const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
      const impId = req.data.imp[0].id;

      const result = spec.interpretResponse({
        body: {
          id: 'auction-1',
          cur: 'USD',
          seatbid: [{
            seat: 'adf',
            bid: [{
              id: 'b1',
              impid: impId,
              price: 1.25,
              adm: '<div></div>',
              crid: 'cr1',
              w: 300,
              h: 250,
              mtype: 1,
              adomain: ['adv.com'],
              ext: { prebid: { events: { win: 'https://api.imanego.com/event?t=win&b=b1' } } },
            }],
          }],
        },
      }, req);

      expect(result).to.have.length(1);
      expect(result[0].cpm).to.equal(1.25);
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].bidderCode).to.equal(undefined); // core assigns the adapter code (luponmedia)
      expect(result[0].meta.seat).to.equal('adf');
      expect(result[0].winUrl).to.equal('https://api.imanego.com/event?t=win&b=b1');
    });

    it('marks bids on the publisher\'s own account in meta.billing', function () {
      const bids = [bidRequest({ key: 'acme' })];
      const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
      const impId = req.data.imp[0].id;
      const bid = (id, ext) => ({ id, impid: impId, price: 1, adm: '<div></div>', crid: id, w: 300, h: 250, mtype: 1, ext });

      const result = spec.interpretResponse({
        body: {
          id: 'auction-1',
          cur: 'USD',
          seatbid: [
            { seat: 'smartadserver', bid: [bid('own', { imanego: { billing: 'publisher_account', account: '4812' } })] },
            { seat: 'adf', bid: [bid('lupon', {})] },
          ],
        },
      }, req);

      const own = result.find(b => b.meta.seat === 'smartadserver');
      expect(own.meta.billing).to.equal('publisher_account');
      expect(own.meta.billingAccount).to.equal('4812');
      expect(result.find(b => b.meta.seat === 'adf').meta.billing).to.equal(undefined);
    });

    it('returns every bid, highest first', function () {
      const bids = [
        bidRequest({ key: 'acme' }),
        bidRequest({ key: 'acme.plc-2' }),
      ];
      const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
      const [imp1, imp2] = req.data.imp.map(imp => imp.id);
      const bid = (id, impid, price) => ({ id, impid, price, adm: '<div></div>', crid: id, w: 300, h: 250, mtype: 1 });

      const result = spec.interpretResponse({
        body: {
          id: 'auction-1',
          cur: 'USD',
          seatbid: [
            { seat: 'adf', bid: [bid('a1', imp1, 1.1), bid('a2', imp1, 0.9), bid('a3', imp2, 0.5)] },
            { seat: 'rubicon', bid: [bid('r1', imp1, 2.0), bid('r2', imp1, 1.0)] },
          ],
        },
      }, req);

      expect(result.map(b => b.cpm)).to.deep.equal([2.0, 1.1, 1.0, 0.9, 0.5]);
      expect(result.map(b => b.meta.seat)).to.deep.equal(['rubicon', 'adf', 'rubicon', 'adf', 'adf']);
      expect(result.filter(b => b.requestId === bids[0].bidId)).to.have.length(4);
      expect(result.filter(b => b.requestId === bids[1].bidId)).to.have.length(1);
    });

    it('accepts bids without mtype (takes ext.prebid.type)', function () {
      const bids = [bidRequest({ key: 'acme' })];
      const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
      const impId = req.data.imp[0].id;
      const result = spec.interpretResponse({
        body: {
          id: 'auction-1',
          cur: 'USD',
          seatbid: [{ seat: 'adf', bid: [{ id: 'b1', impid: impId, price: 1.5, adm: '<div></div>', crid: 'c', w: 300, h: 250, ext: { prebid: { type: 'banner' } } }] }],
        },
      }, req);
      expect(result).to.have.length(1);
      expect(result[0].mediaType).to.equal('banner');
      expect(result[0].cpm).to.equal(1.5);
    });

    it('uses the bid id as creative id when crid is missing', function () {
      const bids = [bidRequest({ key: 'acme' })];
      const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
      const result = spec.interpretResponse({
        body: { id: 'auction-1', cur: 'USD', seatbid: [{ seat: 'adf', bid: [{ id: 'b9', impid: req.data.imp[0].id, price: 1, adm: '<div></div>', w: 300, h: 250, mtype: 1 }] }] },
      }, req);
      expect(result[0].creativeId).to.equal('b9');
    });

    it('handles empty responses', function () {
      expect(spec.interpretResponse({ body: undefined }, {})).to.deep.equal([]);
    });
  });

  // Prebid's test run also builds without video (features disabled).
  if (FEATURES.VIDEO) {
    describe('outstream video', function () {
      const outstream = { video: { context: 'outstream', playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [2, 3] } };
      const vast = '<VAST version="3.0"></VAST>';

      function respond(req, bids) {
        return spec.interpretResponse({ body: { id: 'auction-1', cur: 'USD', seatbid: [{ seat: 'rubicon', bid: bids }] } }, req);
      }

      it('accepts outstream, rejects instream-only ad units', function () {
        expect(spec.isBidRequestValid(bidRequest({ key: 'acme.outstream' }, { mediaTypes: outstream }))).to.equal(true);
        expect(spec.isBidRequestValid(bidRequest({ key: 'acme' }, { mediaTypes: { video: { context: 'instream', playerSize: [[640, 360]] } } }))).to.equal(false);
      });

      it('sends the player as imp.video and no banner', function () {
        const bids = [bidRequest({ key: 'acme.outstream' }, { mediaTypes: outstream })];
        const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
        const imp = req.data.imp[0];
        expect(imp.video).to.include({ w: 640, h: 360 });
        expect(imp.video.mimes).to.deep.equal(['video/mp4']);
        expect(imp.banner).to.equal(undefined);
        expect(imp.ext.prebid.imanego.key).to.equal('acme.outstream');
      });

      it('drops instream video from a banner ad unit', function () {
        const bids = [bidRequest({ key: 'acme' }, { mediaTypes: { banner: { sizes: [[300, 250]] }, video: { context: 'instream', playerSize: [[640, 360]] } } })];
        const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
        expect(req.data.imp[0].video).to.equal(undefined);
        expect(req.data.imp[0].banner).to.not.equal(undefined);
      });

      it('returns VAST bids with the outstream renderer, without the win notice as VAST url', function () {
        const bids = [bidRequest({ key: 'acme.outstream' }, { mediaTypes: outstream })];
        const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
        const impid = req.data.imp[0].id;
        const result = respond(req, [
          { id: 'v1', impid, price: 3, adm: vast, nurl: 'https://partner/win', crid: 'c', ext: { prebid: { type: 'video' } } },
          { id: 'v2', impid, price: 4, nurl: 'https://partner/win', crid: 'c', ext: { prebid: { type: 'video' } } },
        ]);
        expect(result).to.have.length(1); // no VAST to play: dropped
        expect(result[0].mediaType).to.equal('video');
        expect(result[0].vastXml).to.equal(vast);
        expect(result[0].vastUrl).to.equal(undefined);
        expect(result[0].playerWidth).to.equal(640);
        expect(result[0].renderer.url).to.equal('https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js');
        expect(result[0].winUrl).to.equal('https://partner/win'); // no win event: nurl is the win notice
      });

      it('plays the VAST in the ad unit div with the outstream player', function () {
        const bids = [bidRequest({ key: 'acme.outstream' }, { mediaTypes: outstream })];
        const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
        const [bid] = respond(req, [{ id: 'v1', impid: req.data.imp[0].id, price: 3, adm: vast, crid: 'c', mtype: 2 }]);
        const renderAd = sinon.spy();
        window.ANOutstreamVideo = { renderAd };
        try {
          bid.renderer._render({ ...bid, adUnitCode: 'div-acme.outstream', renderer: { push: (fn) => fn(), getConfig: () => ({ skippable: true }) } });
        } finally {
          delete window.ANOutstreamVideo;
        }
        sinon.assert.calledOnce(renderAd);
        expect(renderAd.firstCall.args[0]).to.deep.equal({
          sizes: [640, 360],
          targetId: 'div-acme.outstream',
          adResponse: { content: vast },
          rendererOptions: { skippable: true },
        });
      });

      it('installs the default renderer when the ad unit renderer is a backup only', function () {
        const bids = [bidRequest({ key: 'acme.outstream' }, { mediaTypes: outstream, renderer: { url: 'https://pub/renderer.js', render() {}, backupOnly: true } })];
        const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
        const result = respond(req, [{ id: 'v1', impid: req.data.imp[0].id, price: 3, adm: vast, crid: 'c', mtype: 2 }]);
        expect(result[0].renderer.url).to.equal('https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js');
      });

      it('leaves rendering to a renderer the ad unit brings', function () {
        const bids = [bidRequest({ key: 'acme.outstream' }, { mediaTypes: outstream, renderer: { url: 'https://pub/renderer.js', render() {} } })];
        const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
        const result = respond(req, [{ id: 'v1', impid: req.data.imp[0].id, price: 3, adm: vast, crid: 'c', mtype: 2 }]);
        expect(result).to.have.length(1);
        expect(result[0].renderer).to.equal(undefined);
      });
    });
  }

  if (FEATURES.NATIVE) {
    describe('native', function () {
      const nativeOrtbRequest = { ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 90 } }, { id: 2, required: 1, img: { type: 3, wmin: 300, hmin: 157 } }] };
      const nativeBid = (extra) => bidRequest({ key: 'acme.native' }, { mediaTypes: { native: { ortb: nativeOrtbRequest } }, nativeOrtbRequest, ...extra });
      const assets = [{ id: 1, title: { text: 'Hello' } }, { id: 2, img: { url: 'https://img/1.jpg', w: 300, h: 157 } }];

      it('sends the native request and no banner', function () {
        const bids = [nativeBid()];
        const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
        const imp = req.data.imp[0];
        const native = JSON.parse(imp.native.request);
        expect(native.assets).to.have.length(2);
        expect(native.plcmttype).to.equal(1);
        expect(native.eventtrackers).to.deep.equal([{ event: 1, methods: [1] }]);
        expect(imp.banner).to.equal(undefined);
      });

      it('returns native bids, unwrapping {"native": ...} and dropping ones without assets', function () {
        const bids = [nativeBid()];
        const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
        const impid = req.data.imp[0].id;
        const result = spec.interpretResponse({
          body: {
            id: 'auction-1',
            cur: 'USD',
            seatbid: [{
              seat: 'adf',
              bid: [
                { id: 'n1', impid, price: 1, adm: JSON.stringify({ native: { ver: '1.2', assets, link: { url: 'https://adv' } } }), crid: 'c', ext: { prebid: { type: 'native' } } },
                { id: 'n2', impid, price: 2, adm: JSON.stringify({ ver: '1.2', assets, link: { url: 'https://adv' } }), crid: 'c', mtype: 4 },
                { id: 'n3', impid, price: 3, adm: 'not json', crid: 'c', mtype: 4 },
              ],
            }],
          },
        }, req);
        expect(result.map(b => b.cpm)).to.deep.equal([2, 1]);
        result.forEach(b => {
          expect(b.mediaType).to.equal('native');
          expect(b.native.ortb.assets).to.have.length(2);
        });
      });

      it('keeps the native nurl as the win notice when there is no win event', function () {
        const bids = [nativeBid()];
        const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
        const adm = JSON.stringify({ ver: '1.2', assets, link: { url: 'https://adv' } });
        const [bid] = spec.interpretResponse({
          body: { id: 'auction-1', cur: 'USD', seatbid: [{ seat: 'adf', bid: [{ id: 'n1', impid: req.data.imp[0].id, price: 1, adm, nurl: 'https://partner/win', crid: 'c', mtype: 4 }] }] },
        }, req);
        expect(bid.winUrl).to.equal('https://partner/win');
      });

      it('strips prototype keys from the native response', function () {
        const bids = [nativeBid()];
        const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
        const adm = `{"ver":"1.2","assets":${JSON.stringify(assets)},"__proto__":{"polluted":1},"link":{"url":"https://adv"}}`;
        const result = spec.interpretResponse({
          body: { id: 'auction-1', cur: 'USD', seatbid: [{ seat: 'adf', bid: [{ id: 'n1', impid: req.data.imp[0].id, price: 1, adm, crid: 'c', mtype: 4 }] }] },
        }, req);
        expect(result).to.have.length(1);
        expect(Object.prototype.hasOwnProperty.call(result[0].native.ortb, '__proto__')).to.equal(false);
        expect({}.polluted).to.equal(undefined);
      });

      it('passes a native request that is not JSON through unchanged', function () {
        const bids = [nativeBid({ ortb2Imp: { native: { request: 'not json' } } })];
        const [req] = spec.buildRequests(bids, { ...bidderRequest, bids });
        expect(req.data.imp[0].native.request).to.equal('not json');
      });

      it('keeps a native ad unit that also lists instream video', function () {
        const bid = nativeBid({ mediaTypes: { native: { ortb: nativeOrtbRequest }, video: { context: 'instream', playerSize: [[640, 360]] } } });
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });
    });
  }

  describe('getUserSyncs', function () {
    beforeEach(function () { resetUserSync(); });
    afterEach(function () { config.resetConfig(); });

    it('loads the sync page once with consent params', function () {
      const bids = [bidRequest({ key: 'acme' })];
      spec.buildRequests(bids, { ...bidderRequest, bids });

      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: true, consentString: 'CONSENT' },
        '1YNN',
        { gppString: 'GPP', applicableSections: [2, 6] }
      );
      expect(syncs).to.deep.equal([{
        type: 'iframe',
        url: 'https://sync.imanego.com/sync?gdpr=1&gdpr_consent=CONSENT&us_privacy=1YNN&gpp=GPP&gpp_sid=2%2C6',
      }]);
      expect(spec.getUserSyncs({ iframeEnabled: true }, [])).to.deep.equal([]);
    });

    it('needs iframe syncs enabled', function () {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, [])).to.deep.equal([]);
    });

    it('allows a localhost sync endpoint for development only', function () {
      config.setConfig({ luponmedia: { devSyncEndpoint: 'http://localhost:8001' } });
      expect(spec.getUserSyncs({ iframeEnabled: true }, [])[0].url).to.equal('http://localhost:8001/sync');
    });
  });

  describe('onBidWon', function () {
    // ajax cannot be stubbed on the module namespace; the global request mock records the call.
    it('fires the win event as a keepalive GET', function () {
      const url = 'https://api.imanego.com/event?t=win&b=b1';
      spec.onBidWon({ winUrl: url });
      const wins = server.requests.filter((req) => req.url === url);
      expect(wins).to.have.length(1);
      expect(wins[0].method).to.equal('GET');
      expect(wins[0].fetch.request.keepalive).to.equal(true);
    });

    it('does nothing without a win url', function () {
      spec.onBidWon({});
      expect(server.requests.length).to.equal(0);
    });

    it('puts the clearing price into the ${AUCTION_PRICE} macro', function () {
      spec.onBidWon({ winUrl: 'https://partner/win?p=${AUCTION_PRICE}', originalCpm: 1.25, cpm: 1 });
      expect(server.requests.map((req) => req.url)).to.deep.equal(['https://partner/win?p=1.25']);
    });
  });

  describe('onBidBillable', function () {
    it('fires the partner\'s burl with the price, as a keepalive GET', function () {
      spec.onBidBillable({ burl: 'https://partner/bill?p=${AUCTION_PRICE}', cpm: 0.8 });
      expect(server.requests).to.have.length(1);
      expect(server.requests[0].url).to.equal('https://partner/bill?p=0.8');
      expect(server.requests[0].fetch.request.keepalive).to.equal(true);
    });

    it('does nothing without a burl', function () {
      spec.onBidBillable({ winUrl: 'https://api.imanego.com/event?t=win' });
      expect(server.requests.length).to.equal(0);
    });
  });
});
