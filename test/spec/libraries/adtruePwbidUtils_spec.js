import { expect } from 'chai';
import {
  DATA_TYPES, VIDEO_CUSTOM_PARAMS, NATIVE_ASSETS,
  parseBannerSizes, createBannerRequest, createVideoRequest, parseNativeAssets,
  getResponseMeta, getDomainFromURL
} from 'libraries/adtruePwbidUtils/bidderUtils.js';
import { spec as adtrue } from 'modules/adtrueBidAdapter.js';
import { spec as pwbid } from 'modules/pwbidBidAdapter.js';

describe('adtruePwbidUtils', function () {
  describe('banner requests', function () {
    it('uses the first non-fluid size as primary and keeps the remaining formats', function () {
      const bid = { params: {}, mediaTypes: { banner: { sizes: ['fluid', [300, 250], [728, 90]] } } };
      parseBannerSizes(bid);
      expect(bid.params).to.deep.equal({ width: 300, height: 250 });
      expect(bid.mediaTypes.banner.sizes).to.deep.equal([[728, 90]]);
      const banner = createBannerRequest(bid, sinon.spy());
      expect(banner).to.include({ w: 300, h: 250, pos: 0 });
      expect(banner.format).to.deep.equal([{ w: 728, h: 90 }]);
    });

    it('resets dimensions even when banner sizes are absent', function () {
      [{}, { video: {} }, { banner: {} }].forEach(mediaTypes => {
        const bid = { params: { width: 300, height: 250 }, mediaTypes };
        parseBannerSizes(bid);
        expect(bid.params).to.deep.equal({ width: 0, height: 0 });
      });
      const bid = { params: {} };
      parseBannerSizes(bid);
      expect(bid.params).to.deep.equal({ width: 0, height: 0 });
    });

    [[], undefined, 'fluid'].forEach(sizes => {
      it(`rejects a banner without usable sizes: ${JSON.stringify(sizes)}`, function () {
        const logWarning = sinon.spy();
        const bid = { params: { adUnit: 'test' }, mediaTypes: { banner: { sizes } } };
        expect(createBannerRequest(bid, logWarning)).to.equal(undefined);
        expect(logWarning.calledOnce).to.equal(true);
        expect(logWarning.firstCall.args[0]).to.contain('test');
      });
    });

    it('can derive numeric dimensions without pre-parsed params and ignores short formats', function () {
      const bid = { params: {}, mediaTypes: { banner: { sizes: [['300', '250'], [728, 90], [1]] } } };
      const banner = createBannerRequest(bid, sinon.spy());
      expect(banner).to.include({ w: 300, h: 250 });
      expect(banner.format).to.deep.equal([{ w: 728, h: 90 }]);
    });

    it('omits format for a single primary size', function () {
      const bid = { params: {}, mediaTypes: { banner: { sizes: [[300, 250]] } } };
      parseBannerSizes(bid);
      expect(createBannerRequest(bid, sinon.spy())).not.to.have.property('format');
    });
  });

  describe('video requests', function () {
    it('validates the allowlist and gives nested playerSize precedence over dimensions', function () {
      const logWarning = sinon.spy();
      const video = createVideoRequest({
        mimes: ['video/mp4'], minduration: '5', maxduration: 30, w: 1, h: 2, skip: 1, unknown: true
      }, [[640, 480], [320, 240]], VIDEO_CUSTOM_PARAMS, logWarning);
      expect(video).to.deep.equal({ mimes: ['video/mp4'], minduration: undefined, maxduration: 30, w: 640, h: 480 });
      expect(logWarning.args).to.deep.equal([
        ['Ignoring param key: minduration, expects number, found string', 'minduration']
      ]);
    });

    it('supports a flat playerSize and adapter-specific allowlist additions', function () {
      const video = createVideoRequest({ skip: 1, enabled: false, name: 'video' }, [640, 480], {
        ...VIDEO_CUSTOM_PARAMS, skip: DATA_TYPES.NUMBER, enabled: DATA_TYPES.BOOLEAN, name: DATA_TYPES.STRING
      }, sinon.spy());
      expect(video).to.deep.equal({ skip: 1, enabled: false, name: 'video', w: 640, h: 480 });
    });

    it('ignores inherited video params and leaves dimensions alone without a usable size', function () {
      const video = createVideoRequest(Object.create({ maxduration: 30 }), [], VIDEO_CUSTOM_PARAMS, sinon.spy());
      expect(video).to.deep.equal({});
    });
  });

  describe('native assets', function () {
    it('maps title, images and data assets and defaults missing response dimensions', function () {
      const bid = { native: {} };
      parseNativeAssets([
        { id: 1, title: { text: 'Title' } },
        { id: 2, img: { url: 'image', w: 300, h: 250 } },
        { id: 3, img: { url: 'icon', w: 50, h: 50 } },
        { id: 4, data: { value: 'Sponsor' } },
        { id: 999, data: { value: 'ignored' } }
      ], bid, { 4: 'sponsoredBy' });
      expect(bid).to.deep.equal({
        mediaType: 'native',
        width: 0,
        height: 0,
        native: {
          title: 'Title',
          image: { url: 'image', width: 300, height: 250 },
          icon: { url: 'icon', width: 50, height: 50 },
          sponsoredBy: 'Sponsor'
        }
      });
    });

    it('preserves supplied dimensions and tolerates missing asset contents', function () {
      const bid = { native: {}, width: 300, height: 250 };
      parseNativeAssets([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 5 }], bid, { 5: 'body' });
      expect(bid).to.include({ width: 300, height: 250 });
      expect(bid.native).to.deep.equal({
        title: undefined,
        body: undefined,
        image: { url: undefined, width: undefined, height: undefined },
        icon: { url: undefined, width: undefined, height: undefined }
      });
    });
  });

  it('extracts metadata only when supplied by the bidder', function () {
    expect(getResponseMeta({})).to.deep.equal({});
    expect(getResponseMeta({ ext: {}, adomain: [] })).to.deep.equal({});
    expect(getResponseMeta({ ext: { dspid: 'network', advid: 'buyer' }, adomain: ['example.org'] })).to.deep.equal({
      networkId: 'network', buyerId: 'buyer', advertiserDomains: ['example.org'], clickUrl: 'example.org'
    });
  });

  it('extracts the hostname from the request page', function () {
    expect(getDomainFromURL('https://example.org:8080/page?q=test')).to.equal('example.org');
  });

  [adtrue, pwbid].forEach(spec => {
    describe(`${spec.code} integration`, function () {
      let bid;
      const bidderRequest = { refererInfo: { page: 'https://example.org', ref: '' } };
      const payload = request => typeof request.data === 'string' ? JSON.parse(request.data) : request.data;

      beforeEach(function () {
        bid = {
          bidder: spec.code,
          bidId: 'bid-1',
          adUnitCode: 'unit-1',
          params: { publisherId: 'publisher', zoneId: 'zone', siteId: 'site' },
          mediaTypes: { banner: { sizes: ['fluid', [300, 250], [728, 90]] } }
        };
      });

      it('shares banner sizing without changing bidder params or mutating the input', function () {
        const original = structuredClone(bid);
        const request = spec.buildRequests([bid], bidderRequest);
        const imp = payload(request).imp[0];
        expect(imp.banner).to.include({ w: 300, h: 250, pos: 0 });
        expect(imp.banner.format).to.deep.equal([{ w: 728, h: 90 }]);
        expect(imp.tagid).to.equal(spec === adtrue ? 'zone' : 'unit-1');
        expect(bid).to.deep.equal(original);
      });

      it('preserves the adapter-specific video params and extensions', function () {
        bid.mediaTypes = { video: { playerSize: [[640, 480]], mimes: ['video/webm'], placement: 1, maxduration: 30 } };
        bid.params.video = { mimes: ['video/mp4'], minduration: 5, skip: 1, skippable: true, w: 1, h: 2 };
        const original = structuredClone(bid);
        const video = payload(spec.buildRequests([bid], bidderRequest)).imp[0].video;
        expect(video).to.include({ w: 640, h: 480, minduration: 5 });
        expect(video.mimes).to.deep.equal(spec === adtrue ? ['video/mp4'] : ['video/webm', 'video/mp4']);
        if (spec === adtrue) {
          expect(video.ext).to.deep.equal({ video_skippable: 1 });
          expect(video).not.to.have.property('skip');
          expect(video).not.to.have.property('maxduration');
        } else {
          expect(video).to.include({ skip: 1, maxduration: 30, placement: 1 });
          expect(video).not.to.have.property('ext');
        }
        expect(bid).to.deep.equal(original);
      });

      it('preserves the native response envelope, tracker location and revenue convention', function () {
        const native = {
          assets: [{ id: NATIVE_ASSETS.TITLE.ID, title: { text: 'Title' } }],
          link: { url: 'https://click.example', clicktrackers: ['click-tracker'] },
          imptrackers: ['impression-tracker'],
          jstracker: 'script'
        };
        const request = spec.buildRequests([bid], bidderRequest);
        const response = {
          body: {
            seatbid: [{
              bid: [{
                impid: bid.bidId,
                price: 1,
                adm: JSON.stringify(spec === adtrue ? { native } : native),
                ext: { bidtype: 2, dspid: 'network', advid: 'buyer' },
                adomain: ['example.org']
              }]
            }]
          }
        };
        const result = spec.interpretResponse(response, request)[0];
        expect(result.mediaType).to.equal('native');
        expect(result.native.title).to.equal('Title');
        expect(result).to.include({ width: 0, height: 0, netRevenue: spec === pwbid });
        const trackers = spec === adtrue ? result.native : result;
        expect(trackers.clickUrl).to.equal(native.link.url);
        expect(trackers.clickTrackers).to.deep.equal(native.link.clicktrackers);
        expect(trackers.impressionTrackers).to.deep.equal(native.imptrackers);
        expect(trackers.jstracker).to.equal(native.jstracker);
        expect(result.meta).to.deep.equal({
          networkId: 'network', buyerId: 'buyer', advertiserDomains: ['example.org'], clickUrl: 'example.org'
        });
      });
    });
  });
});
