import { expect } from 'chai';
import {
  spec, STORAGE, getInsurAdsLocalStorage, getGzipSetting,
} from 'modules/insuradsBidAdapter.js';
import sinon from 'sinon';
import { getAmxId } from '../../../libraries/nexx360Utils/index.js';
const sandbox = sinon.createSandbox();

describe('InsurAds bid adapter tests', () => {
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
    uspConsent: '1112223334',
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

  it('We test getGzipSettings', () => {
    const output = getGzipSetting();
    expect(output).to.be.a('boolean');
  });

  describe('isBidRequestValid()', () => {
    let bannerBid;
    beforeEach(() => {
      bannerBid = {
        bidder: 'insurads',
        mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
        adUnitCode: 'div-1',
        transactionId: '70bdc37e-9475-4b27-8c74-4634bdc2ee66',
        sizes: [[300, 250], [300, 600]],
        bidId: '4906582fc87d0c',
        bidderRequestId: '332fda16002dbe',
        auctionId: '98932591-c822-42e3-850e-4b3cf748d063',
      }
    });

    it('We verify isBidRequestValid with unvalid adUnitName', () => {
      bannerBid.params = { adUnitName: 1 };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(false);
    });

    it('We verify isBidRequestValid with empty adUnitName', () => {
      bannerBid.params = { adUnitName: '' };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(false);
    });

    it('We verify isBidRequestValid with unvalid adUnitPath', () => {
      bannerBid.params = { adUnitPath: 1 };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(false);
    });

    it('We verify isBidRequestValid with unvalid divId', () => {
      bannerBid.params = { divId: 1 };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(false);
    });

    it('We verify isBidRequestValid unvalid allBids', () => {
      bannerBid.params = { allBids: 1 };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(false);
    });

    it('We verify isBidRequestValid with uncorrect tagid', () => {
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

  describe('getInsurAdsLocalStorage disabled', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => false);
    });
    it('We test if we get the nexx360Id', () => {
      const output = getInsurAdsLocalStorage();
      expect(output).to.be.eql(null);
    });
    after(() => {
      sandbox.restore()
    });
  });

  describe('getInsurAdsLocalStorage enabled but nothing', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(STORAGE, 'setDataInLocalStorage');
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake((key) => null);
    });
    it('We test if we get the nexx360Id', () => {
      const output = getInsurAdsLocalStorage();
      expect(typeof output.nexx360Id).to.be.eql('string');
    });
    after(() => {
      sandbox.restore()
    });
  });

  describe('getInsurAdsLocalStorage enabled but wrong payload', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(STORAGE, 'setDataInLocalStorage');
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake((key) => '{"nexx360Id":"5ad89a6e-7801-48e7-97bb-fe6f251f6cb4",}');
    });
    it('We test if we get the nexx360Id', () => {
      const output = getInsurAdsLocalStorage();
      expect(output).to.be.eql(null);
    });
    after(() => {
      sandbox.restore()
    });
  });

  describe('getInsurAdsLocalStorage enabled', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(STORAGE, 'setDataInLocalStorage');
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake((key) => '{"nexx360Id":"5ad89a6e-7801-48e7-97bb-fe6f251f6cb4"}');
    });
    it('We test if we get the nexx360Id', () => {
      const output = getInsurAdsLocalStorage();
      expect(output.nexx360Id).to.be.eql('5ad89a6e-7801-48e7-97bb-fe6f251f6cb4');
    });
    after(() => {
      sandbox.restore()
    });
  });

  describe('getAmxId() with localStorage enabled and data not set', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(STORAGE, 'setDataInLocalStorage');
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake((key) => null);
    });
    it('We test if we get the amxId', () => {
      const output = getAmxId(STORAGE, 'nexx360');
      expect(output).to.be.eql(null);
    });
    after(() => {
      sandbox.restore()
    });
  });

  describe('getAmxId() with localStorage enabled and data set', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(STORAGE, 'setDataInLocalStorage');
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake((key) => 'abcdef');
    });
    it('We test if we get the amxId', () => {
      const output = getAmxId(STORAGE, 'nexx360');
      expect(output).to.be.eql('abcdef');
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
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake((key) => 'abcdef');
    });
    describe('We test with a multiple display bids', () => {
      const sampleBids = [
        {
          bidder: 'insurads',
          params: {
            tagId: 'luvxjvgn',
            divId: 'div-1',
            adUnitName: 'header-ad',
            adUnitPath: '/12345/nexx360/Homepage/HP/Header-Ad',
          },
          ortb2Imp: {
            ext: {
              gpid: '/12345/nexx360/Homepage/HP/Header-Ad',
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
          bidder: 'insurads',
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
        bidderCode: 'insurads',
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
        const expectedRequest = {
          imp: [
            {
              id: '44a2706ac3574',
              banner: {
                topframe: 0,
                format: [
                  { w: 300, h: 250 },
                  { w: 300, h: 600 },
                ],
              },
              secure: 1,
              tagid: 'header-ad-1234',
              ext: {
                adUnitCode: 'header-ad-1234',
                gpid: '/12345/nexx360/Homepage/HP/Header-Ad',
                divId: 'div-1',
                dimensions: {
                  slotW: 200,
                  slotH: 250,
                  cssMaxW: '400px',
                  cssMaxH: '350px',
                },
                nexx360: {
                  tagId: 'luvxjvgn',
                  adUnitName: 'header-ad',
                  adUnitPath: '/12345/nexx360/Homepage/HP/Header-Ad',
                  divId: 'div-1',
                },
                adUnitName: 'header-ad',
                adUnitPath: '/12345/nexx360/Homepage/HP/Header-Ad',
              },
            },
            {
              id: '5ba94555219a03',
              banner: {
                topframe: 0,
                format: [
                  { w: 728, h: 90 },
                  { w: 970, h: 250 },
                ],
              },
              secure: 1,
              tagid: 'div-2-abcd',
              ext: {
                adUnitCode: 'div-2-abcd',
                divId: 'div-2-abcd',
                nexx360: {
                  placement: 'testPlacement',
                  divId: 'div-2-abcd',
                  allBids: true,
                },
              },
            },
          ],
          id: requestContent.id,
          test: 0,
          ext: {
            version: requestContent.ext.version,
            source: 'prebid.js',
            pageViewId: requestContent.ext.pageViewId,
            bidderVersion: '7.1',
            localStorage: { amxId: 'abcdef' },
            sessionId: requestContent.ext.sessionId,
            requestCounter: 0,
          },
          cur: [
            'USD',
          ],
          user: {
            ext: {
              eids: [
                {
                  source: 'amxdt.net',
                  uids: [
                    {
                      id: 'abcdef',
                      atype: 1,
                    }
                  ]
                }
              ]
            }
          },
        };
        expect(requestContent).to.be.eql(expectedRequest);
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

  describe('interpretResponse()', () => {
    it('merges rtdData into bidResponse.adserverTargeting', () => {
      const serverResponse = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{
              impid: '44a2706ac3574',
              price: 1.23,
              w: 300,
              h: 250,
              crid: 'creative-1',
              adm: '<div>ad</div>',
              adomain: ['example.com'],
              ext: { mediaType: 'banner', ssp: 'insurads' }
            }]
          }]
        }
      };

      const request = {
        data: {
          imp: [{
            id: '44a2706ac3574',
            ext: {
              rtdData: {
                ia_test: 'ia_value'
              }
            }
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.have.length(1);
      expect(bids[0]).to.have.property('adserverTargeting');
      expect(bids[0].adserverTargeting).to.include({ ia_test: 'ia_value' });
    });

    it('does not throw if request is missing', () => {
      const serverResponse = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{
              impid: '44a2706ac3574',
              price: 1.23,
              w: 300,
              h: 250,
              crid: 'creative-1',
              adm: '<div>ad</div>',
              adomain: ['example.com'],
              ext: { mediaType: 'banner', ssp: 'insurads' }
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse);
      expect(bids).to.have.length(1);
    });

    it('parses multiple bids of different media types', () => {
      const serverResponse = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{
              impid: 'imp-banner',
              price: 0.5,
              w: 300,
              h: 250,
              crid: 'creative-banner',
              adm: '<div>banner ad</div>',
              adomain: ['banner.example.com'],
              ext: { mediaType: 'banner', ssp: 'insurads' }
            }, {
              impid: 'imp-video',
              price: 1.5,
              w: 640,
              h: 480,
              crid: 'creative-video',
              adm: '<VAST version="3.0"></VAST>',
              adomain: ['video.example.com'],
              ext: { mediaType: 'video', ssp: 'insurads' }
            }, {
              impid: 'imp-native',
              price: 0.8,
              crid: 'creative-native',
              adm: '{"native":{"assets":[]}}',
              adomain: ['native.example.com'],
              ext: { mediaType: 'native', ssp: 'insurads' }
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse);
      expect(bids).to.be.an('array');
      expect(bids).to.have.length(3);
      const cpms = bids.map(bid => bid.cpm);
      expect(cpms).to.include(0.5);
      expect(cpms).to.include(1.5);
      expect(cpms).to.include(0.8);
    });

    it('returns an empty array for an empty or malformed response body', () => {
      const emptyResponse = { body: {} };
      const noBodyResponse = {};

      const bidsFromEmpty = spec.interpretResponse(emptyResponse);
      const bidsFromNoBody = spec.interpretResponse(noBodyResponse);

      expect(bidsFromEmpty).to.be.an('array').that.has.length(0);
      expect(bidsFromNoBody).to.be.an('array').that.has.length(0);
    });
  });

  describe('getUserSyncs()', () => {
    it('returns an empty array when all user sync types are disabled', () => {
      const syncOptions = {
        iframeEnabled: false,
        pixelEnabled: false
      };
      const syncs = spec.getUserSyncs(syncOptions, []);
      expect(syncs).to.be.an('array').that.has.length(0);
    });

    it('does not throw and returns an array when at least one sync type is enabled', () => {
      const syncOptions = {
        iframeEnabled: true,
        pixelEnabled: false
      };
      const syncs = spec.getUserSyncs(syncOptions, []);
      expect(syncs).to.be.an('array');
    });
  });
});
