import { expect } from 'chai';
import { spec } from '../../../modules/adviverseBidAdapter.ts';
import { deepClone } from '../../../src/utils.js';

const ENDPOINT_URL = 'https://serve.adviverse.com/prebid/auction';

const bannerBid = {
  adUnitCode: 'banner-unit',
  bidId: 'bid-banner',
  bidder: 'adviverse',
  mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
  sizes: [[300, 250], [300, 600]],
  params: { tagKey: 'tk_test' },
};

const videoBid = {
  adUnitCode: 'video-unit',
  bidId: 'bid-video',
  bidder: 'adviverse',
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [640, 480],
      mimes: ['video/mp4'],
      protocols: [2, 3, 5, 6],
      minduration: 5,
      maxduration: 30,
    },
  },
  sizes: [[640, 480]],
  params: { tagKey: 'tk_video' },
};

describe('Adviverse bid adapter', () => {
  it('declares banner and video', () => {
    expect(spec.code).to.equal('adviverse');
    expect(spec.supportedMediaTypes).to.deep.equal(['banner', 'video']);
  });

  describe('isBidRequestValid', () => {
    it('accepts a non-empty tagKey', () => {
      expect(spec.isBidRequestValid(deepClone(bannerBid))).to.be.true;
    });

    it('rejects a missing, empty or non-string tagKey', () => {
      [undefined, {}, { tagKey: '' }, { tagKey: 123 }].forEach((params) => {
        expect(spec.isBidRequestValid({ ...bannerBid, params })).to.be.false;
      });
    });
  });

  describe('buildRequests', () => {
    it('sends every ad unit in one POST', () => {
      const req = spec.buildRequests([deepClone(bannerBid), deepClone(videoBid)], {});
      expect(req.method).to.equal('POST');
      expect(req.url).to.equal(ENDPOINT_URL);
      expect(req.data.imps).to.have.length(2);
    });

    it('maps a banner unit to tagKey, requestId and sizes', () => {
      const req = spec.buildRequests([deepClone(bannerBid)], {});
      expect(req.data.imps[0]).to.deep.equal({
        tagKey: 'tk_test',
        requestId: 'bid-banner',
        adUnitCode: 'banner-unit',
        sizes: [[300, 250], [300, 600]],
      });
    });

    it('maps a video unit without turning playerSize into banner sizes', () => {
      const req = spec.buildRequests([deepClone(videoBid)], {});
      expect(req.data.imps[0].sizes).to.deep.equal([]);
      expect(req.data.imps[0].video).to.deep.equal({
        playerSize: [[640, 480]],
        context: 'instream',
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        minduration: 5,
        maxduration: 30,
      });
    });

    it('defaults the video context and keeps both formats on a multi-format unit', () => {
      const bid = deepClone(bannerBid);
      bid.mediaTypes.video = { playerSize: [[640, 480], [400, 300]] };
      const imp = spec.buildRequests([bid], {}).data.imps[0];
      expect(imp.sizes).to.deep.equal([[300, 250], [300, 600]]);
      expect(imp.video).to.deep.equal({ playerSize: [[640, 480], [400, 300]], context: 'instream' });
    });

    it('sends no consent or id fields when none are present', () => {
      const data = spec.buildRequests([deepClone(bannerBid)], {}).data;
      expect(data).to.not.have.any.keys('gdpr', 'gdpr_applies', 'us_privacy', 'uid');
    });

    it('forwards GDPR, US Privacy and the SharedID', () => {
      const data = spec.buildRequests([deepClone(bannerBid)], {
        gdprConsent: { gdprApplies: true, consentString: 'CONSENT' },
        uspConsent: '1YNN',
        ortb2: {
          user: {
            ext: {
              eids: [
                { source: 'other.com', uids: [{ id: 'x' }] },
                { source: 'pubcid.org', uids: [{ id: 'shared-id' }] },
              ],
            },
          },
        },
      }).data;
      expect(data.gdpr).to.equal('CONSENT');
      expect(data.gdpr_applies).to.equal(1);
      expect(data.us_privacy).to.equal('1YNN');
      expect(data.uid).to.equal('shared-id');
    });

    it('sends gdpr_applies 0 and an empty string without a consent string', () => {
      const data = spec.buildRequests([deepClone(bannerBid)], { gdprConsent: { gdprApplies: false } }).data;
      expect(data.gdpr).to.equal('');
      expect(data.gdpr_applies).to.equal(0);
    });
  });

  describe('interpretResponse', () => {
    it('maps a banner bid', () => {
      const bids = spec.interpretResponse({
        body: {
          bids: [{
            requestId: 'bid-banner',
            cpm: 1.8,
            currency: 'USD',
            width: 300,
            height: 250,
            ad: '<a href="#"></a>',
            creativeId: 'cr1',
            netRevenue: true,
            ttl: 300,
            dealId: 'DEAL1',
            meta: { advertiserId: 'adv1', mediaType: 'banner' },
          }],
        },
      });
      expect(bids).to.deep.equal([{
        requestId: 'bid-banner',
        cpm: 1.8,
        currency: 'USD',
        width: 300,
        height: 250,
        creativeId: 'cr1',
        netRevenue: true,
        ttl: 300,
        meta: { advertiserId: 'adv1', mediaType: 'banner' },
        mediaType: 'banner',
        ad: '<a href="#"></a>',
        dealId: 'DEAL1',
      }]);
    });

    it('maps a video bid and applies defaults', () => {
      const [bid] = spec.interpretResponse({
        body: {
          bids: [{
            requestId: 'bid-video',
            cpm: 4,
            width: 640,
            height: 480,
            vastXml: '<VAST version="4.2"></VAST>',
            mediaType: 'video',
            creativeId: 'cr2',
          }],
        },
      });
      expect(bid.mediaType).to.equal('video');
      expect(bid.vastXml).to.equal('<VAST version="4.2"></VAST>');
      expect(bid).to.not.have.property('ad');
      expect(bid).to.not.have.property('dealId');
      expect(bid.currency).to.equal('USD');
      expect(bid.ttl).to.equal(300);
      expect(bid.netRevenue).to.be.true;
      expect(bid.meta).to.deep.equal({});
    });

    it('drops bids without a price, requestId or creative', () => {
      const bids = spec.interpretResponse({
        body: {
          bids: [
            { requestId: 'a', cpm: 0, ad: '<div></div>' },
            { cpm: 1, ad: '<div></div>' },
            { requestId: 'b', cpm: 1 },
            null,
          ],
        },
      });
      expect(bids).to.deep.equal([]);
    });

    it('returns no bids for an empty or no-content response', () => {
      expect(spec.interpretResponse({ body: { bids: [] } })).to.deep.equal([]);
      expect(spec.interpretResponse({ body: undefined })).to.deep.equal([]);
      expect(spec.interpretResponse({})).to.deep.equal([]);
    });
  });
});
