import { expect } from 'chai';
import { spec } from 'modules/hyperbrainzBidAdapter.js';
import { config } from 'src/config.js';

const ENDPOINT = 'https://hb.hyperbrainz.com/bid';
const SYNC_URL = 'https://hb.hyperbrainz.com/sync';

function bannerBid(overrides = {}) {
  return Object.assign(
    {
      bidder: 'hyperbrainz',
      bidId: 'bid-banner',
      adUnitCode: 'div-banner',
      auctionId: 'auction-1',
      params: { placementId: 'plc-banner', publisherId: 'pub-1' },
      mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
    },
    overrides
  );
}

function videoBid(overrides = {}) {
  return Object.assign(
    {
      bidder: 'hyperbrainz',
      bidId: 'bid-video',
      adUnitCode: 'div-video',
      auctionId: 'auction-1',
      params: { placementId: 'plc-video' },
      mediaTypes: {
        video: { context: 'instream', playerSize: [[640, 360]] },
      },
    },
    overrides
  );
}

function nativeBid(overrides = {}) {
  return Object.assign(
    {
      bidder: 'hyperbrainz',
      bidId: 'bid-native',
      adUnitCode: 'div-native',
      auctionId: 'auction-1',
      params: { placementId: 'plc-native' },
      mediaTypes: { native: { title: { required: true, len: 80 } } },
      nativeOrtbRequest: {
        ver: '1.2',
        assets: [{ id: 1, required: 1, title: { len: 80 } }],
      },
    },
    overrides
  );
}

function bidderRequestFor(bids, overrides = {}) {
  return Object.assign(
    {
      auctionId: 'auction-1',
      bidderRequestId: 'breq-1',
      timeout: 1000,
      refererInfo: {
        page: 'https://example.com/page.html',
        domain: 'example.com',
        ref: 'https://referrer.com',
      },
      bids,
    },
    overrides
  );
}

describe('HyperBrainz Bid Adapter', function () {
  afterEach(function () {
    config.resetConfig();
  });

  describe('exposed spec', function () {
    it('has the correct bidder code', function () {
      expect(spec.code).to.equal('hyperbrainz');
    });
    it('supports banner, video and native', function () {
      expect(spec.supportedMediaTypes).to.deep.equal([
        'banner',
        'video',
        'native',
      ]);
    });
  });

  describe('isBidRequestValid', function () {
    it('returns true for a valid banner bid', function () {
      expect(spec.isBidRequestValid(bannerBid())).to.equal(true);
    });

    it('returns true for a valid video bid', function () {
      expect(spec.isBidRequestValid(videoBid())).to.equal(true);
    });

    it('returns true for a valid native bid', function () {
      expect(spec.isBidRequestValid(nativeBid())).to.equal(true);
    });

    it('returns false when params are missing', function () {
      expect(spec.isBidRequestValid({})).to.equal(false);
    });

    it('returns false when placementId is missing', function () {
      expect(
        spec.isBidRequestValid(bannerBid({ params: {} }))
      ).to.equal(false);
    });

    it('returns false when placementId is not a string', function () {
      expect(
        spec.isBidRequestValid(bannerBid({ params: { placementId: 123 } }))
      ).to.equal(false);
    });

    it('returns false when no supported mediaType is present', function () {
      expect(
        spec.isBidRequestValid(bannerBid({ mediaTypes: {} }))
      ).to.equal(false);
    });

    it('returns false for a video bid without context', function () {
      expect(
        spec.isBidRequestValid(
          videoBid({ mediaTypes: { video: { playerSize: [[640, 360]] } } })
        )
      ).to.equal(false);
    });

    it('returns false for a video bid without a size', function () {
      expect(
        spec.isBidRequestValid(
          videoBid({ mediaTypes: { video: { context: 'instream' } } })
        )
      ).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('returns an empty array when there are no bids', function () {
      expect(spec.buildRequests([], bidderRequestFor([]))).to.deep.equal([]);
    });

    it('builds a POST request to the default endpoint', function () {
      const bids = [bannerBid()];
      const requests = spec.buildRequests(bids, bidderRequestFor(bids));
      expect(requests).to.be.an('array').with.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].options.contentType).to.equal('application/json');
      expect(requests[0].options.withCredentials).to.equal(true);
    });

    it('builds a well-formed ORTB payload', function () {
      const bids = [bannerBid()];
      const request = spec.buildRequests(bids, bidderRequestFor(bids))[0];
      const data = JSON.parse(request.data);

      expect(data.id).to.equal('auction-1');
      expect(data.at).to.equal(1);
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.tmax).to.equal(1000);
      expect(data.ext.prebid.auctionId).to.equal('auction-1');
      expect(data.site.domain).to.equal('example.com');
      expect(data.site.page).to.equal('https://example.com/page.html');
      expect(data.site.publisher.id).to.equal('pub-1');
      expect(data.device).to.be.an('object');
      expect(data.imp).to.be.an('array').with.lengthOf(1);
    });

    it('maps a banner impression', function () {
      const bids = [bannerBid()];
      const request = spec.buildRequests(bids, bidderRequestFor(bids))[0];
      const imp = JSON.parse(request.data).imp[0];

      expect(imp.id).to.equal('bid-banner');
      expect(imp.tagid).to.equal('plc-banner');
      expect(imp.bidfloorcur).to.equal('USD');
      expect(imp).to.have.property('secure');
      expect(imp.banner.format).to.deep.equal([
        { w: 300, h: 250 },
        { w: 728, h: 90 },
      ]);
      expect(imp.banner.w).to.equal(300);
      expect(imp.banner.h).to.equal(250);
    });

    it('maps a video impression with ORTB fields', function () {
      const bids = [videoBid()];
      const request = spec.buildRequests(bids, bidderRequestFor(bids))[0];
      const imp = JSON.parse(request.data).imp[0];

      expect(imp.video).to.be.an('object');
      expect(imp.video.w).to.equal(640);
      expect(imp.video.h).to.equal(360);
      expect(imp.video.mimes).to.include('video/mp4');
      expect(imp.video.plcmt).to.equal(1);
      expect(imp.video).to.not.have.property('context');
      expect(imp.video).to.not.have.property('playerSize');
    });

    it('maps a native impression', function () {
      const bids = [nativeBid()];
      const request = spec.buildRequests(bids, bidderRequestFor(bids))[0];
      const imp = JSON.parse(request.data).imp[0];

      expect(imp.native).to.be.an('object');
      expect(imp.native.ver).to.equal('1.2');
      expect(typeof imp.native.request).to.equal('string');
      expect(JSON.parse(imp.native.request)).to.deep.equal({
        ver: '1.2',
        assets: [{ id: 1, required: 1, title: { len: 80 } }],
      });
    });

    it('reads the bid floor from params', function () {
      const bids = [bannerBid({ params: { placementId: 'p', bidFloor: 0.75 } })];
      const request = spec.buildRequests(bids, bidderRequestFor(bids))[0];
      expect(JSON.parse(request.data).imp[0].bidfloor).to.equal(0.75);
    });

    it('reads the bid floor from the getFloor module', function () {
      const bids = [
        bannerBid({ getFloor: () => ({ currency: 'USD', floor: 3.21 }) }),
      ];
      const request = spec.buildRequests(bids, bidderRequestFor(bids))[0];
      expect(JSON.parse(request.data).imp[0].bidfloor).to.equal(3.21);
    });

    it('forwards GDPR consent into regs and user', function () {
      const bids = [bannerBid()];
      const bidderRequest = bidderRequestFor(bids, {
        gdprConsent: { gdprApplies: true, consentString: 'CONSENT_STR' },
      });
      const data = JSON.parse(spec.buildRequests(bids, bidderRequest)[0].data);
      expect(data.regs.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.equal('CONSENT_STR');
    });

    it('forwards US privacy consent', function () {
      const bids = [bannerBid()];
      const bidderRequest = bidderRequestFor(bids, { uspConsent: '1YNN' });
      const data = JSON.parse(spec.buildRequests(bids, bidderRequest)[0].data);
      expect(data.regs.ext.us_privacy).to.equal('1YNN');
    });

    it('sets COPPA when configured', function () {
      config.setConfig({ coppa: true });
      const bids = [bannerBid()];
      const data = JSON.parse(
        spec.buildRequests(bids, bidderRequestFor(bids))[0].data
      );
      expect(data.regs.coppa).to.equal(1);
    });

    it('forwards the supply chain from ortb2', function () {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [{ asi: 'exchange.com', sid: '1234', hp: 1 }],
      };
      const bids = [bannerBid()];
      const bidderRequest = bidderRequestFor(bids, {
        ortb2: { source: { ext: { schain } } },
      });
      const data = JSON.parse(spec.buildRequests(bids, bidderRequest)[0].data);
      expect(data.source.ext.schain).to.deep.equal(schain);
    });
  });

  describe('interpretResponse', function () {
    function requestFor(bids) {
      return spec.buildRequests(bids, bidderRequestFor(bids))[0];
    }

    it('returns an empty array when there is no body', function () {
      expect(
        spec.interpretResponse({}, requestFor([bannerBid()]))
      ).to.deep.equal([]);
    });

    it('returns an empty array when there is no seatbid', function () {
      expect(
        spec.interpretResponse({ body: {} }, requestFor([bannerBid()]))
      ).to.deep.equal([]);
    });

    it('parses a banner bid', function () {
      const bids = [bannerBid()];
      const response = {
        body: {
          cur: 'USD',
          seatbid: [
            {
              bid: [
                {
                  impid: 'bid-banner',
                  price: 1.5,
                  w: 300,
                  h: 250,
                  adm: '<div>ad</div>',
                  crid: 'creative-1',
                  adomain: ['advertiser.com'],
                },
              ],
            },
          ],
        },
      };
      const result = spec.interpretResponse(response, requestFor(bids));
      expect(result).to.have.lengthOf(1);
      expect(result[0].requestId).to.equal('bid-banner');
      expect(result[0].cpm).to.equal(1.5);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].currency).to.equal('USD');
      expect(result[0].ttl).to.equal(300);
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].creativeId).to.equal('creative-1');
      expect(result[0].mediaType).to.equal('banner');
      expect(result[0].ad).to.equal('<div>ad</div>');
      expect(result[0].meta.advertiserDomains).to.deep.equal([
        'advertiser.com',
      ]);
    });

    it('parses a video bid into vastXml/vastUrl', function () {
      const bids = [videoBid()];
      const response = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  impid: 'bid-video',
                  price: 2.0,
                  adm: '<VAST></VAST>',
                  nurl: 'https://hb.hyperbrainz.com/win',
                },
              ],
            },
          ],
        },
      };
      const result = spec.interpretResponse(response, requestFor(bids));
      expect(result).to.have.lengthOf(1);
      expect(result[0].mediaType).to.equal('video');
      expect(result[0].vastXml).to.equal('<VAST></VAST>');
      expect(result[0].vastUrl).to.equal('https://hb.hyperbrainz.com/win');
    });

    it('parses a native bid into the ORTB native shape', function () {
      const bids = [nativeBid()];
      const ortbNative = {
        link: { url: 'https://click.com', clicktrackers: ['https://ct.com'] },
        imptrackers: ['https://imp.com'],
        assets: [
          { id: 1, title: { text: 'Title' } },
          { id: 2, img: { url: 'https://img.com', w: 300, h: 250 } },
          { id: 3, data: { type: 1, value: 'Brand' } },
        ],
      };
      const adm = JSON.stringify(ortbNative);
      const response = {
        body: {
          seatbid: [{ bid: [{ impid: 'bid-native', price: 0.9, adm }] }],
        },
      };
      const result = spec.interpretResponse(response, requestFor(bids));
      expect(result).to.have.lengthOf(1);
      expect(result[0].mediaType).to.equal('native');
      expect(result[0].native.ortb).to.deep.equal(ortbNative);
    });

    it('skips a native bid whose ADM has no assets', function () {
      const bids = [nativeBid()];
      const response = {
        body: {
          seatbid: [
            { bid: [{ impid: 'bid-native', price: 0.9, adm: '{}' }] },
          ],
        },
      };
      expect(
        spec.interpretResponse(response, requestFor(bids))
      ).to.deep.equal([]);
    });

    it('skips bids with a non-positive price', function () {
      const bids = [bannerBid()];
      const response = {
        body: { seatbid: [{ bid: [{ impid: 'bid-banner', price: 0 }] }] },
      };
      expect(
        spec.interpretResponse(response, requestFor(bids))
      ).to.deep.equal([]);
    });

    it('skips bids that do not match a request', function () {
      const bids = [bannerBid()];
      const response = {
        body: { seatbid: [{ bid: [{ impid: 'unknown', price: 1 }] }] },
      };
      expect(
        spec.interpretResponse(response, requestFor(bids))
      ).to.deep.equal([]);
    });

    it('attaches nurl/burl and copies bid extensions', function () {
      const bids = [bannerBid()];
      const response = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  impid: 'bid-banner',
                  price: 1,
                  adm: '<div></div>',
                  nurl: 'https://win',
                  burl: 'https://bill',
                  ext: { foo: 'bar' },
                },
              ],
            },
          ],
        },
      };
      const result = spec.interpretResponse(response, requestFor(bids));
      expect(result[0].nurl).to.equal('https://win');
      expect(result[0].burl).to.equal('https://bill');
      expect(result[0].ext.foo).to.equal('bar');
    });

    it('honors mediaType from the bid extension', function () {
      const bids = [bannerBid()];
      const response = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  impid: 'bid-banner',
                  price: 1,
                  adm: '<VAST></VAST>',
                  ext: { prebid: { type: 'video' } },
                },
              ],
            },
          ],
        },
      };
      const result = spec.interpretResponse(response, requestFor(bids));
      expect(result[0].mediaType).to.equal('video');
    });
  });

  describe('getUserSyncs', function () {
    it('returns nothing when no sync options are enabled', function () {
      expect(
        spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, [])
      ).to.deep.equal([]);
    });

    it('falls back to an iframe sync', function () {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true, pixelEnabled: false },
        []
      );
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal(SYNC_URL);
    });

    it('falls back to a pixel sync', function () {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: false, pixelEnabled: true },
        []
      );
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');
    });

    it('uses server-provided sync URLs', function () {
      const serverResponses = [
        {
          body: {
            ext: {
              sync: [
                { type: 'iframe', url: 'https://sync.com/iframe' },
                { type: 'image', url: 'https://sync.com/pixel' },
              ],
            },
          },
        },
      ];
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true, pixelEnabled: true },
        serverResponses
      );
      expect(syncs).to.have.lengthOf(2);
      expect(syncs[0].url).to.contain('https://sync.com/iframe');
    });

    it('appends GDPR, USP and GPP consent to the sync URL', function () {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true, pixelEnabled: false },
        [],
        { gdprApplies: true, consentString: 'CONSENT' },
        '1YNN',
        { gppString: 'GPP_STR', applicableSections: [2, 3] }
      );
      expect(syncs[0].url).to.contain('gdpr=1');
      expect(syncs[0].url).to.contain('gdpr_consent=CONSENT');
      expect(syncs[0].url).to.contain('us_privacy=1YNN');
      expect(syncs[0].url).to.contain('gpp=GPP_STR');
      expect(syncs[0].url).to.contain('gpp_sid=2,3');
    });
  });

  describe('event handlers', function () {
    it('onBidWon does not throw', function () {
      expect(() => spec.onBidWon({ nurl: 'https://win' })).to.not.throw();
      expect(() => spec.onBidWon({})).to.not.throw();
    });

    it('onTimeout does not throw', function () {
      expect(() =>
        spec.onTimeout({ ext: { timeoutPixel: 'https://timeout' } })
      ).to.not.throw();
      expect(() => spec.onTimeout({})).to.not.throw();
    });

    it('onSetTargeting does not throw', function () {
      expect(() =>
        spec.onSetTargeting({ adUnitCode: 'div-banner' })
      ).to.not.throw();
    });
  });
});
