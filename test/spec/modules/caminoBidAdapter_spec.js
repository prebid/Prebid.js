import { expect } from 'chai';
import { spec } from 'modules/caminoBidAdapter.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';
import { getGlobal } from 'src/prebidGlobal.js';
import { config } from 'src/config.js';

describe('caminoBidAdapter', function () {
  const bannerBid = {
    bidder: 'camino',
    bidId: 'bid-banner-1',
    adUnitCode: 'banner-div',
    params: { placementId: '12345', publisherId: '987' },
    mediaTypes: {
      banner: { sizes: [[300, 250], [300, 600]] }
    }
  };

  const videoBid = {
    bidder: 'camino',
    bidId: 'bid-video-1',
    adUnitCode: 'video-div',
    params: { placementId: '12345', publisherId: '987' },
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3]
      }
    }
  };

  const bidderRequest = {
    bidderRequestId: 'req-1',
    timeout: 3000,
    refererInfo: { domain: 'example.com', page: 'https://example.com/article', ref: 'https://referrer.com' },
    gdprConsent: { gdprApplies: true, consentString: 'CONSENT_STR' },
    uspConsent: '1YNN',
    ortb2: { regs: { coppa: 1 } }
  };

  it('declares the IAB Europe GVL vendor ID', function () {
    expect(spec.gvlid).to.equal(1670);
  });

  describe('isBidRequestValid', function () {
    it('returns true when publisherId is present', function () {
      expect(spec.isBidRequestValid(bannerBid)).to.equal(true);
    });

    it('returns false when params are missing', function () {
      expect(spec.isBidRequestValid({})).to.equal(false);
    });

    it('returns true when placementId is missing', function () {
      expect(spec.isBidRequestValid({ ...bannerBid, params: { publisherId: '987' } })).to.equal(true);
    });

    it('returns false when publisherId is missing', function () {
      expect(spec.isBidRequestValid({ ...bannerBid, params: { placementId: '12345' } })).to.equal(false);
    });

    it('returns false when banner sizes is not an array', function () {
      const bid = { params: { placementId: '12345', publisherId: '987' }, mediaTypes: { banner: { sizes: '300x250' } } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns true for a valid video bid', function () {
      expect(spec.isBidRequestValid(videoBid)).to.equal(true);
    });

    it('returns false when video is missing mimes or protocols', function () {
      const noMimes = { params: { placementId: '12345', publisherId: '987' }, mediaTypes: { video: { context: 'instream', playerSize: [[640, 480]], protocols: [2] } } };
      const noProtocols = { params: { placementId: '12345', publisherId: '987' }, mediaTypes: { video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'] } } };
      expect(spec.isBidRequestValid(noMimes)).to.equal(false);
      expect(spec.isBidRequestValid(noProtocols)).to.equal(false);
    });

    it('accepts a banner+video ad unit with incomplete video, for its banner part', function () {
      const bid = {
        params: { placementId: '12345', publisherId: '987' },
        mediaTypes: { banner: { sizes: [[300, 250]] }, video: { context: 'instream', playerSize: [[640, 480]] } }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('sends a single POST with all imps batched', function () {
      const request = spec.buildRequests([bannerBid, videoBid], bidderRequest);
      expect(request.method).to.equal('POST');
      expect(request.url).to.be.a('string');
      const data = JSON.parse(request.data);
      expect(data.id).to.be.a('string');
      expect(data.imp).to.have.lengthOf(2);
    });

    it('sends with Prebid default options', function () {
      const request = spec.buildRequests([bannerBid], bidderRequest);
      expect(request.options).to.equal(undefined);
    });

    it('builds banner format from sizes', function () {
      const data = JSON.parse(spec.buildRequests([bannerBid], bidderRequest).data);
      expect(data.imp[0].id).to.equal('bid-banner-1');
      expect(data.imp[0].tagid).to.equal('banner-div');
      expect(data.imp[0].ext.placementId).to.equal('12345');
      expect(data.imp[0].banner.format).to.deep.equal([
        { w: 300, h: 250 },
        { w: 300, h: 600 }
      ]);
    });

    it('omits imp.ext.placementId when the placementId param is not set', function () {
      const bid = { ...bannerBid, params: { publisherId: '987' } };
      const data = JSON.parse(spec.buildRequests([bid], bidderRequest).data);
      expect(data.imp[0].ext).to.not.have.property('placementId');
    });

    it('reports viewability and scroll offset as "na" when the slot element is missing', function () {
      const data = JSON.parse(spec.buildRequests([bannerBid], bidderRequest).data);
      expect(data.imp[0].banner.ext.viewability).to.equal('na');
      expect(data.imp[0].banner.ext.scrollOffset).to.equal('na');
    });

    it('measures viewability and scroll offset when the slot element exists', function () {
      const element = document.createElement('div');
      element.id = 'banner-div';
      document.body.appendChild(element);
      try {
        const data = JSON.parse(spec.buildRequests([bannerBid], bidderRequest).data);
        expect(data.imp[0].banner.ext.viewability).to.be.a('number');
        expect(data.imp[0].banner.ext.scrollOffset).to.be.a('number');
        expect(data.imp[0].banner.ext.scrollOffset).to.be.at.least(0);
      } finally {
        document.body.removeChild(element);
      }
    });

    it('builds an OpenRTB video imp from mediaTypes.video', function () {
      const data = JSON.parse(spec.buildRequests([videoBid], bidderRequest).data);
      const video = data.imp[0].video;
      expect(video.mimes).to.deep.equal(['video/mp4']);
      expect(video.protocols).to.deep.equal([2, 3]);
      expect(video.w).to.equal(640);
      expect(video.h).to.equal(480);
      expect(video.plcmt).to.equal(2);
      expect(video.startdelay).to.equal(0);
      expect(video.context).to.be.undefined;
      expect(video.playerSize).to.be.undefined;
    });

    describe('banner+video ad units', function () {
      const multiBid = {
        bidder: 'camino',
        bidId: 'bid-multi-1',
        adUnitCode: 'multi-div',
        params: { placementId: '12345', publisherId: '987' },
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          video: videoBid.mediaTypes.video
        }
      };

      it('sends only the video when the video part is complete', function () {
        const imp = JSON.parse(spec.buildRequests([multiBid], bidderRequest).data).imp[0];
        expect(imp.video.w).to.equal(640);
        expect(imp.video.mimes).to.deep.equal(['video/mp4']);
        expect(imp.banner).to.be.undefined;
      });

      it('sends only the banner when the video part is incomplete', function () {
        const bid = { ...multiBid, mediaTypes: { ...multiBid.mediaTypes, video: { context: 'instream', playerSize: [[640, 480]] } } };
        const imp = JSON.parse(spec.buildRequests([bid], bidderRequest).data).imp[0];
        expect(imp.banner.format).to.deep.equal([{ w: 300, h: 250 }]);
        expect(imp.video).to.be.undefined;
      });
    });

    it('populates site from refererInfo and publisher param', function () {
      const data = JSON.parse(spec.buildRequests([bannerBid], bidderRequest).data);
      expect(data.site.domain).to.equal('example.com');
      expect(data.site.page).to.equal('https://example.com/article');
      expect(data.site.publisher.id).to.equal('987');
    });

    it('forwards tmax', function () {
      const data = JSON.parse(spec.buildRequests([bannerBid], bidderRequest).data);
      expect(data.tmax).to.equal(3000);
    });

    it('forwards the device Prebid built in ortb2.device unchanged', function () {
      const device = {
        ua: 'Mozilla/5.0',
        w: 960,
        h: 1707,
        language: 'en',
        sua: { platform: { brand: 'macOS' }, mobile: 0 },
        ext: { vpw: 1280, vph: 800 }
      };
      const request = spec.buildRequests([bannerBid], Object.assign({}, bidderRequest, { ortb2: { device } }));
      expect(JSON.parse(request.data).device).to.deep.equal(device);
    });

    it('builds regs with gdpr, us_privacy and coppa', function () {
      const data = JSON.parse(spec.buildRequests([bannerBid], bidderRequest).data);
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.regs.ext.us_privacy).to.equal('1YNN');
      expect(data.regs.coppa).to.equal(1);
    });

    it('builds user consent from gdpr', function () {
      const data = JSON.parse(spec.buildRequests([bannerBid], bidderRequest).data);
      expect(data.user.ext.consent).to.equal('CONSENT_STR');
    });

    it('includes user eids when present', function () {
      const eids = [{ source: 'example.com', uids: [{ id: 'abc' }] }];
      const bid = Object.assign({}, bannerBid, { userIdAsEids: eids });
      const data = JSON.parse(spec.buildRequests([bid], bidderRequest).data);
      expect(data.user.ext.eids).to.deep.equal(eids);
    });

    it('includes schain when present', function () {
      const schain = { ver: '1.0', complete: 1, nodes: [] };
      const bid = Object.assign({}, bannerBid, { ortb2: { source: { ext: { schain } } } });
      const data = JSON.parse(spec.buildRequests([bid], bidderRequest).data);
      expect(data.source.ext.schain).to.deep.equal(schain);
    });

    it('forwards frequency counters per imp', function () {
      const bid = Object.assign({}, bannerBid, {
        bidRequestsCount: 3,
        bidderRequestsCount: 2,
        bidderWinsCount: 1
      });
      const data = JSON.parse(spec.buildRequests([bid], bidderRequest).data);
      expect(data.imp[0].ext.bidRequestCount).to.equal(3);
      expect(data.imp[0].ext.bidderRequestCount).to.equal(2);
      expect(data.imp[0].ext.bidderWinCount).to.equal(1);
    });

    it('sends a persistent session id and an incrementing refresh count', function () {
      getGlobal().bidderSettings = { camino: { storageAllowed: true } };
      try {
        const first = JSON.parse(spec.buildRequests([bannerBid], bidderRequest).data);
        const second = JSON.parse(spec.buildRequests([bannerBid], bidderRequest).data);
        expect(first.ext.session.id).to.be.a('string');
        expect(second.ext.session.id).to.equal(first.ext.session.id);
        expect(second.ext.session.refreshCount).to.equal(first.ext.session.refreshCount + 1);
      } finally {
        getGlobal().bidderSettings = {};
      }
    });

    it('omits the session id when storage is not allowed', function () {
      const data = JSON.parse(spec.buildRequests([bannerBid], bidderRequest).data);
      expect(data.ext.session.id).to.be.undefined;
      expect(data.ext.session.refreshCount).to.be.a('number');
    });

    it('includes bidfloor when getFloor is available', function () {
      const bid = Object.assign({}, bannerBid, {
        getFloor: () => ({ currency: 'USD', floor: 1.25 })
      });
      const data = JSON.parse(spec.buildRequests([bid], bidderRequest).data);
      expect(data.imp[0].bidfloor).to.equal(1.25);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('sends the lowest floor across banner sizes', function () {
      const bid = Object.assign({}, bannerBid, {
        getFloor: ({ size }) => ({ currency: 'USD', floor: size[1] === 250 ? 2.0 : 1.5 })
      });
      const data = JSON.parse(spec.buildRequests([bid], bidderRequest).data);
      expect(data.imp[0].bidfloor).to.equal(1.5);
    });

    it('requests the video floor with the player size', function () {
      const calls = [];
      const bid = Object.assign({}, videoBid, {
        getFloor(params) {
          calls.push(params);
          return { currency: 'USD', floor: 3 };
        }
      });
      const data = JSON.parse(spec.buildRequests([bid], bidderRequest).data);
      expect(data.imp[0].bidfloor).to.equal(3);
      expect(calls).to.deep.equal([{ currency: 'USD', mediaType: 'video', size: [640, 480] }]);
    });

    it('omits bidfloor when the floors module returns another currency', function () {
      const bid = Object.assign({}, bannerBid, {
        getFloor: () => ({ currency: 'EUR', floor: 1.25 })
      });
      const data = JSON.parse(spec.buildRequests([bid], bidderRequest).data);
      expect(data.imp[0].bidfloor).to.be.undefined;
      expect(data.imp[0].bidfloorcur).to.be.undefined;
    });
  });

  describe('interpretResponse', function () {
    it('returns an empty array when seatbid is missing', function () {
      expect(spec.interpretResponse({ body: {} })).to.deep.equal([]);
    });

    it('maps a banner bid', function () {
      const serverResponse = {
        body: {
          id: 'resp-1',
          cur: 'USD',
          seatbid: [{
            bid: [{
              impid: 'bid-banner-1',
              price: 2.5,
              w: 300,
              h: 250,
              crid: 'crid-1',
              adm: '<div>ad</div>',
              adomain: ['advertiser.com'],
              mtype: 1
            }]
          }]
        }
      };
      const [bid] = spec.interpretResponse(serverResponse);
      expect(bid.requestId).to.equal('bid-banner-1');
      expect(bid.cpm).to.equal(2.5);
      expect(bid.currency).to.equal('USD');
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.creativeId).to.equal('crid-1');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(300);
      expect(bid.mediaType).to.equal(BANNER);
      expect(bid.ad).to.equal('<div>ad</div>');
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });

    it('appends a tracking pixel to the ad markup when nurl is present', function () {
      const serverResponse = {
        body: {
          id: 'resp-1',
          seatbid: [{
            bid: [{
              impid: 'bid-banner-1',
              price: 2.5,
              w: 300,
              h: 250,
              adm: '<div>ad</div>',
              nurl: 'https://camino.example/win?price=${AUCTION_PRICE}',
              mtype: 1
            }]
          }]
        }
      };
      const [bid] = spec.interpretResponse(serverResponse);
      expect(bid.ad).to.contain('<div>ad</div>');
      expect(bid.ad).to.contain('https://camino.example/win?price=2.5');
      expect(bid.ad).to.not.contain('AUCTION_PRICE');
    });

    it('maps a video bid to vastXml', function () {
      const serverResponse = {
        body: {
          id: 'resp-1',
          seatbid: [{
            bid: [{
              impid: 'bid-video-1',
              price: 5,
              w: 640,
              h: 480,
              crid: 'crid-2',
              adm: '<VAST></VAST>',
              nurl: 'https://camino.example/win',
              mtype: 2
            }]
          }]
        }
      };
      const [bid] = spec.interpretResponse(serverResponse);
      expect(bid.mediaType).to.equal(VIDEO);
      expect(bid.vastXml).to.equal('<VAST></VAST>');
      expect(bid.vastImpUrl).to.equal('https://camino.example/win');
      expect(bid.ad).to.be.undefined;
      expect(bid.video).to.be.undefined;
    });

    it('maps bid.dur to video.durationSeconds', function () {
      const serverResponse = {
        body: {
          id: 'resp-1',
          seatbid: [{
            bid: [{
              impid: 'bid-video-1',
              price: 5,
              w: 460,
              h: 259,
              adm: '<VAST></VAST>',
              mtype: 2,
              dur: 5
            }]
          }]
        }
      };
      const [bid] = spec.interpretResponse(serverResponse);
      expect(bid.video).to.deep.equal({ durationSeconds: 5 });
    });
  });

  describe('getUserSyncs', function () {
    it('returns an iframe sync when iframe is enabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], bidderRequest.gdprConsent, bidderRequest.uspConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
    });

    it('returns an image sync when only pixels are enabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, [], bidderRequest.gdprConsent, bidderRequest.uspConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');
    });

    it('prefers the iframe sync when both are enabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, []);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
    });

    it('returns no syncs when both are disabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, []);
      expect(syncs).to.deep.equal([]);
    });

    describe('session id forwarding', function () {
      const SID_KEY = 'camino_sid';

      beforeEach(function () {
        config.setConfig({ deviceAccess: true });
        getGlobal().bidderSettings = { camino: { storageAllowed: true } };
      });

      afterEach(function () {
        localStorage.removeItem(SID_KEY);
        getGlobal().bidderSettings = {};
        config.resetConfig();
      });

      it('appends the localStorage session id as sid so the hub can alias it to camino_uid', function () {
        localStorage.setItem(SID_KEY, 'sess-abc-123');
        const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);
        expect(syncs[0].url).to.include('sid=sess-abc-123');
      });

      it('appends sid to the image sync too', function () {
        localStorage.setItem(SID_KEY, 'sess-abc-123');
        const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, []);
        expect(syncs[0].url).to.include('sid=sess-abc-123');
      });

      it('omits sid when no session id is stored', function () {
        localStorage.removeItem(SID_KEY);
        const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);
        expect(syncs[0].url).to.not.include('sid=');
      });
    });
  });
});
