import { expect } from 'chai';
import {
  spec, STORAGE, getMtcLocalStorage,
} from 'modules/mtcBidAdapter.js';
import sinon from 'sinon';
const sandbox = sinon.createSandbox();

describe('Mtc bid adapter tests', () => {
  const DEFAULT_OPTIONS = {
    gdprConsent: {
      gdprApplies: true,
      consentString: 'BOzZdA0OzZdA0AGABBENDJ-AAAAvh7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__79__3z3_9pxP78k89r7337Mw_v-_v-b7JCPN_Y3v-8Kg',
      vendorData: {},
    },
    refererInfo: {
      referer: 'https://www.prebid.org',
      canonicalUrl: 'https://www.prebid.org/the/link/to/the/page',
    },
    uspConsent: '111222333',
    userId: { id5id: { uid: '1111' } },
    schain: {
      ver: '1.0',
      complete: 1,
      nodes: [{
        asi: 'exchange1.com',
        sid: '1234',
        hp: 1,
        rid: 'bid-request-1',
        name: 'publisher',
        domain: 'publisher.com',
      }],
    },
  };

  describe('isBidRequestValid()', () => {
    let bannerBid;
    beforeEach(() => {
      bannerBid = {
        bidder: 'mtc',
        mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
        adUnitCode: 'div-1',
        transactionId: '70bdc37e-9475-4b27-8c74-4634bdc2ee66',
        sizes: [[300, 250], [300, 600]],
        bidId: '4906582fc87d0c',
        bidderRequestId: '332fda16002dbe',
        auctionId: '98932591-c822-42e3-850e-4b3cf748d063',
      }
    });

    it('We verify isBidRequestValid with incorrect tagid', () => {
      bannerBid.params = { 'tagid': 'luvxjvgn' };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(false);
    });

    it('We verify isBidRequestValid with correct tagId', () => {
      bannerBid.params = { 'tagId': 'luvxjvgn' };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(true);
    });

    it('We verify isBidRequestValid with correct placement', () => {
      bannerBid.params = { 'placement': 'testad' };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(true);
    });
  });

  describe('getMtcLocalStorage disabled', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => false);
    });
    it('We test if we get the mtcId', () => {
      const output = getMtcLocalStorage();
      expect(output).to.be.eql(null);
    });
    after(() => {
      sandbox.restore()
    });
  });

  describe('getMtcLocalStorage enabled but nothing', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(STORAGE, 'setDataInLocalStorage');
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake(() => null);
    });
    it('We test if we get the mtcId', () => {
      const output = getMtcLocalStorage();
      expect(typeof output.mtcId).to.be.eql('string');
    });
    after(() => {
      sandbox.restore()
    });
  });

  describe('getMtcLocalStorage enabled but wrong payload', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(STORAGE, 'setDataInLocalStorage');
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake(() => '{"mtcId":"5ad89a6e-7801-48e7-97bb-fe6f251f6cb4",}');
    });
    it('We test if we get the mtcId', () => {
      const output = getMtcLocalStorage();
      expect(output).to.be.eql(null);
    });
    after(() => {
      sandbox.restore()
    });
  });

  describe('getMtcLocalStorage enabled', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(STORAGE, 'setDataInLocalStorage');
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake(() => '{"mtcId":"5ad89a6e-7801-48e7-97bb-fe6f251f6cb4"}');
    });
    it('We test if we get the mtcId', () => {
      const output = getMtcLocalStorage();
      expect(output.mtcId).to.be.eql('5ad89a6e-7801-48e7-97bb-fe6f251f6cb4');
    });
    after(() => {
      sandbox.restore()
    });
  });

  describe('buildRequests()', () => {
    before(() => {
      const documentStub = sandbox.stub(document, 'getElementById');
      documentStub.withArgs('div-1').returns({
        offsetWidth: 200,
        offsetHeight: 250,
        style: {
          maxWidth: '400px',
          maxHeight: '350px',
        },
        getBoundingClientRect() { return { width: 200, height: 250 }; }
      });
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(STORAGE, 'setDataInLocalStorage');
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake(() => 'abcdef');
    });
    describe('We test with a multiple display bids', () => {
      const sampleBids = [
        {
          bidder: 'mtc',
          params: {
            tagId: 'luvxjvgn',
            divId: 'div-1',
            adUnitName: 'header-ad',
            adUnitPath: '/12345/mtc/Homepage/HP/Header-Ad',
          },
          ortb2Imp: {
            ext: {
              gpid: '/12345/mtc/Homepage/HP/Header-Ad',
            }
          },
          adUnitCode: 'header-ad-1234',
          transactionId: '469a570d-f187-488d-b1cb-48c1a2009be9',
          sizes: [[300, 250], [300, 600]],
          bidId: '44a2706ac3574',
          bidderRequestId: '359bf8a3c06b2e',
          auctionId: '2e684815-b44e-4e04-b812-56da54adbe74',
        },
        {
          bidder: 'mtc',
          params: {
            placement: 'testPlacement',
            allBids: true,
          },
          mediaTypes: {
            banner: {
              sizes: [[728, 90], [970, 250]]
            }
          },

          adUnitCode: 'div-2-abcd',
          transactionId: '6196885d-4e76-40dc-a09c-906ed232626b',
          sizes: [[728, 90], [970, 250]],
          bidId: '5ba94555219a03',
          bidderRequestId: '359bf8a3c06b2e',
          auctionId: '2e684815-b44e-4e04-b812-56da54adbe74',
        }
      ];
      const bidderRequest = {
        bidderCode: 'mtc',
        auctionId: '2e684815-b44e-4e04-b812-56da54adbe74',
        bidderRequestId: '359bf8a3c06b2e',
        refererInfo: {
          reachedTop: true,
          isAmp: false,
          numIframes: 0,
          stack: [
            'https://test.nexx360.io/adapter/index.html'
          ],
          topmostLocation: 'https://test.nexx360.io/adapter/index.html',
          location: 'https://test.nexx360.io/adapter/index.html',
          canonicalUrl: null,
          page: 'https://test.nexx360.io/adapter/index.html',
          domain: 'test.nexx360.io',
          ref: null,
          legacy: {
            reachedTop: true,
            isAmp: false,
            numIframes: 0,
            stack: [
              'https://test.nexx360.io/adapter/index.html'
            ],
            referer: 'https://test.nexx360.io/adapter/index.html',
            canonicalUrl: null
          },
        },
        gdprConsent: {
          gdprApplies: true,
          consentString: 'CPhdLUAPhdLUAAKAsAENCmCsAP_AAE7AAAqIJFNd_H__bW9r-f5_aft0eY1P9_r37uQzDhfNk-8F3L_W_LwX52E7NF36tq4KmR4ku1LBIUNlHMHUDUmwaokVryHsak2cpzNKJ7BEknMZOydYGF9vmxtj-QKY7_5_d3bx2D-t_9v239z3z81Xn3d53-_03LCdV5_9Dfn9fR_bc9KPt_58v8v8_____3_e__3_7997BIiAaADgAJYBnwEeAJXAXmAwQBj4DtgHcgPBAeKBIgAA.YAAAAAAAAAAA',
        }
      };
      it('We perform a test with 2 display adunits', () => {
        const displayBids = structuredClone(sampleBids);
        displayBids[0].mediaTypes = {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        };
        const request = spec.buildRequests(displayBids, bidderRequest);
        const requestContent = request.data;
        expect(request).to.have.property('method').and.to.equal('POST');
        expect(requestContent.imp[0].ext.mtc.tagId).to.be.eql('luvxjvgn');
        expect(requestContent.imp[0].ext.mtc.divId).to.be.eql('div-1');
        expect(requestContent.imp[1].ext.mtc.placement).to.be.eql('testPlacement');
        expect(requestContent.ext.bidderVersion).to.be.eql('1.0');
      });

      if (FEATURES.VIDEO) {
        it('We perform a test with a multiformat adunit', () => {
          const multiformatBids = structuredClone(sampleBids);
          multiformatBids[0].mediaTypes = {
            banner: {
              sizes: [[300, 250], [300, 600]]
            },
            video: {
              context: 'outstream',
              playerSize: [640, 480],
              mimes: ['video/mp4'],
              protocols: [1, 2, 3, 4, 5, 6, 7, 8],
              playbackmethod: [2],
              skip: 1,
              playback_method: ['auto_play_sound_off']
            }
          };
          const request = spec.buildRequests(multiformatBids, bidderRequest);
          const video = request.data.imp[0].video;
          const expectedVideo = {
            mimes: ['video/mp4'],
            protocols: [1, 2, 3, 4, 5, 6, 7, 8],
            playbackmethod: [2],
            skip: 1,
            w: 640,
            h: 480,
            ext: {
              playerSize: [640, 480],
              context: 'outstream',
            },
          };
          expect(video).to.eql(expectedVideo);
        });

        it('We perform a test with a instream adunit', () => {
          const videoBids = structuredClone(sampleBids);
          videoBids[0].mediaTypes = {
            video: {
              context: 'instream',
              playerSize: [640, 480],
              mimes: ['video/mp4'],
              protocols: [1, 2, 3, 4, 5, 6],
              playbackmethod: [2],
              skip: 1
            }
          };
          const request = spec.buildRequests(videoBids, bidderRequest);
          const requestContent = request.data;
          expect(request).to.have.property('method').and.to.equal('POST');
          expect(requestContent.imp[0].video.ext.context).to.be.eql('instream');
          expect(requestContent.imp[0].video.playbackmethod[0]).to.be.eql(2);
        });
      }
    });
    after(() => {
      sandbox.restore()
    });
  });

  describe('We test interpretResponse', () => {
    it('empty response', () => {
      const response = {
        body: ''
      };
      const output = spec.interpretResponse(response);
      expect(output.length).to.be.eql(0);
    });
    it('banner responses with adm', () => {
      const response = {
        body: {
          id: 'a8d3a675-a4ba-4d26-807f-c8f2fad821e0',
          cur: 'USD',
          seatbid: [
            {
              bid: [
                {
                  id: '4427551302944024629',
                  impid: '226175918ebeda',
                  price: 1.5,
                  adomain: [
                    'http://prebid.org',
                  ],
                  crid: '98493581',
                  ssp: 'appnexus',
                  h: 600,
                  w: 300,
                  adm: '<div>TestAd</div>',
                  cat: [
                    'IAB3-1',
                  ],
                  ext: {
                    adUnitCode: 'div-1',
                    mediaType: 'banner',
                    adUrl: 'https://fast.nexx360.io/cache?uuid=fdddcebc-1edf-489d-880d-1418d8bdc493',
                    ssp: 'appnexus',
                  },
                },
              ],
              seat: 'appnexus',
            },
          ],
          ext: {
            id: 'de3de7c7-e1cf-4712-80a9-94eb26bfc718',
            cookies: [],
          },
        },
      };
      const output = spec.interpretResponse(response);
      const expectedOutput = [{
        requestId: '226175918ebeda',
        cpm: 1.5,
        width: 300,
        height: 600,
        creativeId: '98493581',
        currency: 'USD',
        netRevenue: true,
        ttl: 120,
        mediaType: 'banner',
        meta: {
          advertiserDomains: [
            'http://prebid.org',
          ],
          demandSource: 'appnexus',
        },
        ad: '<div>TestAd</div>',
      }];
      expect(output).to.eql(expectedOutput);
    });
  });

  describe('getUserSyncs()', () => {
    const response = { body: { cookies: [] } };
    it('Verifies user sync without cookie in bid response', () => {
      const syncs = spec.getUserSyncs({}, [response], DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
      expect(syncs).to.eql([]);
    });
    it('Verifies user sync with cookies in bid response', () => {
      response.body.ext = {
        cookies: [{ 'type': 'image', 'url': 'http://www.cookie.sync.org/' }]
      };
      const syncs = spec.getUserSyncs({}, [response], DEFAULT_OPTIONS.gdprConsent);
      const expectedSyncs = [{ type: 'image', url: 'http://www.cookie.sync.org/' }];
      expect(syncs).to.eql(expectedSyncs);
    });
    it('Verifies user sync with no bid response', () => {
      var syncs = spec.getUserSyncs({}, null, DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
      expect(syncs).to.eql([]);
    });
    it('Verifies user sync with no bid body response', () => {
      let syncs = spec.getUserSyncs({}, [], DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
      expect(syncs).to.eql([]);
      syncs = spec.getUserSyncs({}, [{}], DEFAULT_OPTIONS.gdprConsent, DEFAULT_OPTIONS.uspConsent);
      expect(syncs).to.eql([]);
    });
  });
});
