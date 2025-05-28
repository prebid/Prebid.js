import bidderUtils, { NATIVE_PARAMS, NATIVE_ID_MAP } from 'libraries/datablocksUtils/bidderUtils.js';
import { expect } from 'chai';

describe('bidderUtils', function () {
  describe('createNativeRequest', function () {
    // Tests for createNativeRequest will go here
    it('should return an empty assets array if nativeParams is empty or null', function () {
      const nativeRequestNull = bidderUtils.createNativeRequest(null, NATIVE_PARAMS);
      expect(nativeRequestNull.request.assets).to.be.an('array').that.is.empty;

      const nativeRequestEmpty = bidderUtils.createNativeRequest({}, NATIVE_PARAMS);
      expect(nativeRequestEmpty.request.assets).to.be.an('array').that.is.empty;
    });

    it('should correctly map all known native parameters to assets', function () {
      const fullNativeParams = {
        title: { required: true, len: 100 },
        icon: { required: false, sizes: [[50, 50]] },
        image: { required: true, sizes: [[300, 200], [320, 240]], aspect_ratios: [{min_width: 300, ratio_width: 3, ratio_height: 2}] },
        body: { required: true, len: 500 },
        sponsoredBy: { required: false, len: 50 },
        cta: { required: true, len: 20 },
        body2: { len: 100 },
        rating: {},
        likes: {},
        downloads: {},
        displayUrl: { len: 30 },
        price: {},
        salePrice: {},
        address: { len: 100 },
        phone: { len: 20 }
      };
      const nativeRequest = bidderUtils.createNativeRequest(fullNativeParams, NATIVE_PARAMS);
      expect(nativeRequest.request.assets).to.have.lengthOf(Object.keys(NATIVE_PARAMS).length);

      // Check a few key assets
      const titleAsset = nativeRequest.request.assets.find(a => a.id === NATIVE_PARAMS.title.id);
      expect(titleAsset).to.exist;
      expect(titleAsset.required).to.equal(1);
      expect(titleAsset.title.len).to.equal(100);

      const imageAsset = nativeRequest.request.assets.find(a => a.id === NATIVE_PARAMS.image.id);
      expect(imageAsset).to.exist;
      expect(imageAsset.required).to.equal(1);
      expect(imageAsset.img.w).to.equal(300); // First size
      expect(imageAsset.img.h).to.equal(200);
      expect(imageAsset.img.wmin).to.equal(300); // From aspect_ratios
      expect(imageAsset.img.hmin).to.equal(200); // Calculated from aspect_ratios

      const iconAsset = nativeRequest.request.assets.find(a => a.id === NATIVE_PARAMS.icon.id);
      expect(iconAsset).to.exist;
      expect(iconAsset.required).to.equal(0);
      expect(iconAsset.img.w).to.equal(50);
      expect(iconAsset.img.h).to.equal(50);
      expect(iconAsset.img.type).to.equal(NATIVE_PARAMS.icon.type);


      const ctaAsset = nativeRequest.request.assets.find(a => a.id === NATIVE_PARAMS.cta.id);
      expect(ctaAsset).to.exist;
      expect(ctaAsset.required).to.equal(1);
      expect(ctaAsset.data.len).to.equal(20);
      expect(ctaAsset.data.type).to.equal(NATIVE_PARAMS.cta.type);
    });

    it('should ignore unknown native parameters', function () {
      const mixedParams = {
        title: { required: true, len: 100 },
        unknownParam: { value: 'test' },
        image: { sizes: [[300, 200]]}
      };
      const nativeRequest = bidderUtils.createNativeRequest(mixedParams, NATIVE_PARAMS);
      expect(nativeRequest.request.assets).to.have.lengthOf(2); // title and image
      expect(nativeRequest.request.assets.find(a => a.id === NATIVE_PARAMS.title.id)).to.exist;
      expect(nativeRequest.request.assets.find(a => a.id === NATIVE_PARAMS.image.id)).to.exist;
    });

    it('should handle various combinations of asset properties', function () {
      const params = {
        title: { len: 140 }, // only len
        image: { required: true, aspect_ratios: [{ min_width: 100, ratio_width: 1, ratio_height: 1 }] }, // only required and aspect_ratios
        icon: { sizes: [[80, 80]] }, // only sizes
        cta: { required: true } // only required
      };
      const nativeRequest = bidderUtils.createNativeRequest(params, NATIVE_PARAMS);
      expect(nativeRequest.request.assets).to.have.lengthOf(4);

      const titleAsset = nativeRequest.request.assets.find(a => a.id === NATIVE_PARAMS.title.id);
      expect(titleAsset.title.len).to.equal(140);
      expect(titleAsset.required).to.equal(0); // default

      const imageAsset = nativeRequest.request.assets.find(a => a.id === NATIVE_PARAMS.image.id);
      expect(imageAsset.required).to.equal(1);
      expect(imageAsset.img.wmin).to.equal(100);
      expect(imageAsset.img.hmin).to.equal(100);
      expect(imageAsset.img.w).to.be.undefined; // No sizes provided

      const iconAsset = nativeRequest.request.assets.find(a => a.id === NATIVE_PARAMS.icon.id);
      expect(iconAsset.img.w).to.equal(80);
      expect(iconAsset.img.h).to.equal(80);

      const ctaAsset = nativeRequest.request.assets.find(a => a.id === NATIVE_PARAMS.cta.id);
      expect(ctaAsset.required).to.equal(1);
      expect(ctaAsset.data.len).to.be.undefined;
    });
  });

  describe('parseNative', function () {
    // Tests for parseNative will go here
    it('should correctly parse a standard native response', function () {
      const nativeResponse = {
        assets: [
          { id: NATIVE_PARAMS.title.id, title: { text: 'Test Title' } },
          { id: NATIVE_PARAMS.image.id, img: { url: 'image.png', w: 300, h: 200 } },
          { id: NATIVE_PARAMS.icon.id, img: { url: 'icon.png', w: 50, h: 50 } },
          { id: NATIVE_PARAMS.body.id, data: { value: 'This is the body.' } },
          { id: NATIVE_PARAMS.sponsoredBy.id, data: { value: 'Advertiser' } },
          { id: NATIVE_PARAMS.cta.id, data: { value: 'Click Here' } }
        ],
        link: { url: 'landing.com', clicktrackers: ['click1.com', 'click2.com'] },
        imptrackers: ['imp1.com', 'imp2.com'],
        jstracker: '<script>console.log("impression");</script>'
      };
      const parsed = bidderUtils.parseNative(nativeResponse, NATIVE_ID_MAP);

      expect(parsed.title).to.equal('Test Title');
      expect(parsed.image.url).to.equal('image.png');
      expect(parsed.image.width).to.equal(300);
      expect(parsed.image.height).to.equal(200);
      expect(parsed.icon.url).to.equal('icon.png');
      expect(parsed.icon.width).to.equal(50);
      expect(parsed.icon.height).to.equal(50);
      expect(parsed.body).to.equal('This is the body.');
      expect(parsed.sponsoredBy).to.equal('Advertiser');
      expect(parsed.cta).to.equal('Click Here');
      expect(parsed.clickUrl).to.equal('landing.com');
      expect(parsed.clickTrackers).to.deep.equal(['click1.com', 'click2.com']);
      expect(parsed.impressionTrackers).to.deep.equal(['imp1.com', 'imp2.com']);
      expect(parsed.javascriptTrackers).to.deep.equal(['<script>console.log("impression");</script>']);
    });

    it('should handle missing optional fields in native response', function () {
      const nativeResponse = {
        assets: [
          { id: NATIVE_PARAMS.title.id, title: { text: 'Test Title' } }
        ],
        link: { url: 'landing.com' }
        // No imptrackers, no jstracker, no clicktrackers in link
      };
      const parsed = bidderUtils.parseNative(nativeResponse, NATIVE_ID_MAP);

      expect(parsed.title).to.equal('Test Title');
      expect(parsed.clickUrl).to.equal('landing.com');
      expect(parsed.clickTrackers).to.be.an('array').that.is.empty;
      expect(parsed.impressionTrackers).to.be.an('array').that.is.empty;
      expect(parsed.javascriptTrackers).to.be.an('array').that.is.empty;
    });

    it('should handle empty or undefined values for asset properties', function () {
      const nativeResponse = {
        assets: [
          { id: NATIVE_PARAMS.title.id, title: { text: '' } }, // Empty title text
          { id: NATIVE_PARAMS.image.id, img: { url: 'image.png' } }, // Missing w, h
          { id: NATIVE_PARAMS.body.id, data: {} } // Empty data object
        ],
        link: { url: 'landing.com' }
      };
      const parsed = bidderUtils.parseNative(nativeResponse, NATIVE_ID_MAP);

      expect(parsed.title).to.be.undefined; // isEmpty should catch this
      expect(parsed.image.url).to.equal('image.png');
      expect(parsed.image.width).to.be.undefined;
      expect(parsed.image.height).to.be.undefined;
      expect(parsed.body).to.be.undefined; // isEmpty should catch this
    });

    it('should ignore assets with IDs not in NATIVE_ID_MAP', function () {
      const nativeResponse = {
        assets: [
          { id: NATIVE_PARAMS.title.id, title: { text: 'Real Title' } },
          { id: 999, title: { text: 'Fake Title' } } // Unknown ID
        ],
        link: { url: 'landing.com' }
      };
      const parsed = bidderUtils.parseNative(nativeResponse, NATIVE_ID_MAP);

      expect(parsed.title).to.equal('Real Title');
      expect(Object.keys(parsed)).to.not.include('Fake Title'); // Ensure no property was created for the fake asset
    });

    it('should handle an empty assets array', function () {
      const nativeResponse = {
        assets: [],
        link: { url: 'landing.com' },
        imptrackers: ['imp1.com']
      };
      const parsed = bidderUtils.parseNative(nativeResponse, NATIVE_ID_MAP);

      expect(parsed.clickUrl).to.equal('landing.com');
      expect(parsed.impressionTrackers).to.deep.equal(['imp1.com']);
      // No specific asset properties should be set
      expect(parsed.title).to.be.undefined;
      expect(parsed.image).to.be.undefined;
    });
  });
});
