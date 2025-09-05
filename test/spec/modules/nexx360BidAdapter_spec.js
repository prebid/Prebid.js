import { expect } from 'chai';
import {
  spec, STORAGE, getNexx360LocalStorage,
} from 'modules/nexx360BidAdapter.js';
import sinon from 'sinon';
import { getAmxId } from '../../../libraries/nexx360Utils/index.js';
const sandbox = sinon.createSandbox();

describe('Nexx360 bid adapter tests', () => {
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
        bidder: 'nexx360',
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

  describe('getNexx360LocalStorage disabled', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => false);
    });
    it('We test if we get the nexx360Id', () => {
      const output = getNexx360LocalStorage();
      expect(output).to.be.eql(false);
    });
    after(() => {
      sandbox.restore()
    });
  })

  describe('getNexx360LocalStorage enabled but nothing', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(STORAGE, 'setDataInLocalStorage');
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake((key) => null);
    });
    it('We test if we get the nexx360Id', () => {
      const output = getNexx360LocalStorage();
      expect(typeof output.nexx360Id).to.be.eql('string');
    });
    after(() => {
      sandbox.restore()
    });
  })

  describe('getNexx360LocalStorage enabled but wrong payload', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(STORAGE, 'setDataInLocalStorage');
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake((key) => '{"nexx360Id":"5ad89a6e-7801-48e7-97bb-fe6f251f6cb4",}');
    });
    it('We test if we get the nexx360Id', () => {
      const output = getNexx360LocalStorage();
      expect(output).to.be.eql(false);
    });
    after(() => {
      sandbox.restore()
    });
  });

  describe('getNexx360LocalStorage enabled', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(STORAGE, 'setDataInLocalStorage');
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake((key) => '{"nexx360Id":"5ad89a6e-7801-48e7-97bb-fe6f251f6cb4"}');
    });
    it('We test if we get the nexx360Id', () => {
      const output = getNexx360LocalStorage();
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
      expect(output).to.be.eql(false);
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
          bidder: 'nexx360',
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
          bidder: 'nexx360',
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
        bidderCode: 'nexx360',
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
            bidderVersion: '6.3',
            localStorage: { amxId: 'abcdef'}
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

  describe('We test intepretResponse', () => {
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

    it('instream responses', () => {
      const response = {
        body: {
          id: '2be64380-ba0c-405a-ab53-51f51c7bde51',
          cur: 'USD',
          seatbid: [
            {
              bid: [
                {
                  id: '8275140264321181514',
                  impid: '263cba3b8bfb72',
                  price: 5,
                  adomain: [
                    'appnexus.com',
                  ],
                  crid: '97517771',
                  h: 1,
                  w: 1,
                  adm: '<VAST>vast</VAST>',
                  ext: {
                    mediaType: 'instream',
                    ssp: 'appnexus',
                    adUnitCode: 'video1',
                  },
                },
              ],
              seat: 'appnexus',
            },
          ],
          ext: {
            cookies: [],
          },
        },
      };

      const output = spec.interpretResponse(response);
      const expectedOutput = [{
        requestId: '263cba3b8bfb72',
        cpm: 5,
        width: 1,
        height: 1,
        creativeId: '97517771',
        currency: 'USD',
        netRevenue: true,
        ttl: 120,
        mediaType: 'video',
        meta: { advertiserDomains: ['appnexus.com'], demandSource: 'appnexus' },
        vastXml: '<VAST>vast</VAST>',
      }];
      expect(output).to.eql(expectedOutput);
    });

    it('outstream responses', () => {
      const response = {
        body: {
          id: '40c23932-135e-4602-9701-ca36f8d80c07',
          cur: 'USD',
          seatbid: [
            {
              bid: [
                {
                  id: '1186971142548769361',
                  impid: '4ce809b61a3928',
                  price: 5,
                  adomain: [
                    'appnexus.com',
                  ],
                  crid: '97517771',
                  h: 1,
                  w: 1,
                  adm: '<VAST>vast</VAST>',
                  ext: {
                    mediaType: 'outstream',
                    ssp: 'appnexus',
                    adUnitCode: 'div-1',
                  },
                },
              ],
              seat: 'appnexus',
            },
          ],
          ext: {
            cookies: [],
          },
        },
      };

      const output = spec.interpretResponse(response);
      const expectedOutut = [{
        requestId: '4ce809b61a3928',
        cpm: 5,
        width: 1,
        height: 1,
        creativeId: '97517771',
        currency: 'USD',
        netRevenue: true,
        ttl: 120,
        mediaType: 'video',
        meta: { advertiserDomains: ['appnexus.com'], demandSource: 'appnexus' },
        vastXml: '<VAST>vast</VAST>',
        renderer: output[0].renderer,
      }];
      expect(output).to.eql(expectedOutut);
    });

    it('native responses', () => {
      const response = {
        body: {
          id: '3c0290c1-6e75-4ef7-9e37-17f5ebf3bfa3',
          cur: 'USD',
          seatbid: [
            {
              bid: [
                {
                  id: '6624930625245272225',
                  impid: '23e11d845514bb',
                  price: 10,
                  adomain: [
                    'prebid.org',
                  ],
                  crid: '97494204',
                  h: 1,
                  w: 1,
                  cat: [
                    'IAB3-1',
                  ],
                  ext: {
                    mediaType: 'native',
                    ssp: 'appnexus',
                    adUnitCode: '/19968336/prebid_native_example_1',
                  },
                  adm: '{"ver":"1.2","assets":[{"id":1,"img":{"url":"https:\\/\\/vcdn.adnxs.com\\/p\\/creative-image\\/f8\\/7f\\/0f\\/13\\/f87f0f13-230c-4f05-8087-db9216e393de.jpg","w":989,"h":742,"ext":{"appnexus":{"prevent_crop":0}}}},{"id":0,"title":{"text":"This is a Prebid Native Creative"}},{"id":2,"data":{"value":"Prebid.org"}}],"link":{"url":"https:\\/\\/ams3-ib.adnxs.com\\/click?AAAAAAAAJEAAAAAAAAAkQAAAAAAAACRAAAAAAAAAJEAAAAAAAAAkQKZS4ZZl5vVbR6p-A-MwnyTZ7QVkAAAAAOLoyQBtJAAAbSQAAAIAAAC8pM8FnPgWAAAAAABVU0QAVVNEAAEAAQBNXQAAAAABAgMCAAAAALoAURe69gAAAAA.\\/bcr=AAAAAAAA8D8=\\/pp=${AUCTION_PRICE}\\/cnd=%21JBC72Aj8-LwKELzJvi4YnPFbIAQoADEAAAAAAAAkQDoJQU1TMzo2MTM1QNAwSQAAAAAAAPA_UQAAAAAAAAAAWQAAAAAAAAAAYQAAAAAAAAAAaQAAAAAAAAAAcQAAAAAAAAAAeACJAQAAAAAAAAAA\\/cca=OTMyNSNBTVMzOjYxMzU=\\/bn=97062\\/clickenc=http%3A%2F%2Fprebid.org%2Fdev-docs%2Fshow-native-ads.html"},"eventtrackers":[{"event":1,"method":1,"url":"https:\\/\\/ams3-ib.adnxs.com\\/it?an_audit=0&referrer=https%3A%2F%2Ftest.nexx360.io%2Fadapter%2Fnative%2Ftest.html&e=wqT_3QKJCqAJBQAAAwDWAAUBCNnbl6AGEKalhbfZzPn6WxjH1PqbsJzMzyQqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlC8yb4uWJzxW2AAaM26dXim9gWAAQGKAQNVU0SSAQEG9F4BmAEBoAEBqAEBsAEAuAECwAEDyAEC0AEJ2AEA4AEA8AEAigIpdWYoJ2EnLCAyNTI5ODg1LCAwKTt1ZigncicsIDk3NDk0MjA0LCAwKTuSAvEDIS0xRDNJQWo4LUx3S0VMekp2aTRZQUNDYzhWc3dBRGdBUUFSSTdVaFE0dEduQmxnQVlQX19fXzhQYUFCd0FYZ0JnQUVCaUFFQmtBRUJtQUVCb0FFQnFBRURzQUVBdVFIenJXcWtBQUFrUU1FQjg2MXFwQUFBSkVESkFYSUtWbWViSmZJXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFNQUNBY2dDQWRBQ0FkZ0NBZUFDQU9nQ0FQZ0NBSUFEQVpnREFib0RDVUZOVXpNNk5qRXpOZUFEMERDSUJBQ1FCQUNZQkFIQkJBQUFBQUFBQUFBQXlRUUFBCQscQUFOZ0VBUEURlSxBQUFDSUJmY3ZxUVUBDQRBQQGoCDdFRgEKCQEMREJCUQkKAQEAeRUoAUwyKAAAWi4oALg0QVhBaEQzd0JhTEQzd0w0QmQyMG1nR0NCZ05WVTBTSUJnQ1FCZ0dZQmdDaEJnQQFONEFBQ1JBcUFZQnNnWWtDHXQARR0MAEcdDABJHQw8dUFZS5oClQEhSkJDNzJBajL1ASRuUEZiSUFRb0FEFfhUa1FEb0pRVTFUTXpvMk1UTTFRTkF3UxFRDFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQwQZUFDSkEdEMjYAvfpA-ACrZhI6gIwaHR0cHM6Ly90ZXN0Lm5leHgzNjAuaW8vYWRhcHRlci9uYXRpdmUJH_CaaHRtbIADAIgDAZADAJgDFKADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMDgAQAkgQJL29wZW5ydGIymAQAqAQAsgQMCAAQABgAIAAwADgAuAQAwASA2rgiyAQA0gQOOTMyNSNBTVMzOjYxMzXaBAIIAeAEAPAEvMm-LvoEEgkAAABAPG1IQBEAAACgV8oCQIgFAZgFAKAF______8BBbABqgUkM2MwMjkwYzEtNmU3NS00ZWY3LTllMzctMTdmNWViZjNiZmEzwAUAyQWJFxTwP9IFCQkJDHgAANgFAeAFAfAFmfQh-gUECAAQAJAGAZgGALgGAMEGCSUo8D_QBvUv2gYWChAJERkBAdpg4AYM8gYCCACABwGIBwCgB0HIB6b2BdIHDRVkASYI2gcGAV1oGADgBwDqBwIIAPAHAIoIAhAAlQgAAIA_mAgB&s=ccf63f2e483a37091d2475d895e7cf7c911d1a78&pp=${AUCTION_PRICE}"}]}',
                },
              ],
              seat: 'appnexus',
            },
          ],
          ext: {
            cookies: [],
          },
        },
      };

      const output = spec.interpretResponse(response);
      const expectOutput = [{
        requestId: '23e11d845514bb',
        cpm: 10,
        width: 1,
        height: 1,
        creativeId: '97494204',
        currency: 'USD',
        netRevenue: true,
        ttl: 120,
        mediaType: 'native',
        meta: {
          advertiserDomains: [
            'prebid.org',
          ],
          demandSource: 'appnexus',
        },
        native: {
          ortb: {
            ver: '1.2',
            assets: [
              {
                id: 1,
                img: {
                  url: 'https://vcdn.adnxs.com/p/creative-image/f8/7f/0f/13/f87f0f13-230c-4f05-8087-db9216e393de.jpg',
                  w: 989,
                  h: 742,
                  ext: {
                    appnexus: {
                      prevent_crop: 0,
                    },
                  },
                },
              },
              {
                id: 0,
                title: {
                  text: 'This is a Prebid Native Creative',
                },
              },
              {
                id: 2,
                data: {
                  value: 'Prebid.org',
                },
              },
            ],
            link: {
              url: 'https://ams3-ib.adnxs.com/click?AAAAAAAAJEAAAAAAAAAkQAAAAAAAACRAAAAAAAAAJEAAAAAAAAAkQKZS4ZZl5vVbR6p-A-MwnyTZ7QVkAAAAAOLoyQBtJAAAbSQAAAIAAAC8pM8FnPgWAAAAAABVU0QAVVNEAAEAAQBNXQAAAAABAgMCAAAAALoAURe69gAAAAA./bcr=AAAAAAAA8D8=/pp=${AUCTION_PRICE}/cnd=%21JBC72Aj8-LwKELzJvi4YnPFbIAQoADEAAAAAAAAkQDoJQU1TMzo2MTM1QNAwSQAAAAAAAPA_UQAAAAAAAAAAWQAAAAAAAAAAYQAAAAAAAAAAaQAAAAAAAAAAcQAAAAAAAAAAeACJAQAAAAAAAAAA/cca=OTMyNSNBTVMzOjYxMzU=/bn=97062/clickenc=http%3A%2F%2Fprebid.org%2Fdev-docs%2Fshow-native-ads.html',
            },
            eventtrackers: [
              {
                event: 1,
                method: 1,
                url: 'https://ams3-ib.adnxs.com/it?an_audit=0&referrer=https%3A%2F%2Ftest.nexx360.io%2Fadapter%2Fnative%2Ftest.html&e=wqT_3QKJCqAJBQAAAwDWAAUBCNnbl6AGEKalhbfZzPn6WxjH1PqbsJzMzyQqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlC8yb4uWJzxW2AAaM26dXim9gWAAQGKAQNVU0SSAQEG9F4BmAEBoAEBqAEBsAEAuAECwAEDyAEC0AEJ2AEA4AEA8AEAigIpdWYoJ2EnLCAyNTI5ODg1LCAwKTt1ZigncicsIDk3NDk0MjA0LCAwKTuSAvEDIS0xRDNJQWo4LUx3S0VMekp2aTRZQUNDYzhWc3dBRGdBUUFSSTdVaFE0dEduQmxnQVlQX19fXzhQYUFCd0FYZ0JnQUVCaUFFQmtBRUJtQUVCb0FFQnFBRURzQUVBdVFIenJXcWtBQUFrUU1FQjg2MXFwQUFBSkVESkFYSUtWbWViSmZJXzJRRUFBQUFBQUFEd1AtQUJBUFVCQUFBQUFKZ0NBS0FDQUxVQ0FBQUFBTDBDQUFBQUFNQUNBY2dDQWRBQ0FkZ0NBZUFDQU9nQ0FQZ0NBSUFEQVpnREFib0RDVUZOVXpNNk5qRXpOZUFEMERDSUJBQ1FCQUNZQkFIQkJBQUFBQUFBQUFBQXlRUUFBCQscQUFOZ0VBUEURlSxBQUFDSUJmY3ZxUVUBDQRBQQGoCDdFRgEKCQEMREJCUQkKAQEAeRUoAUwyKAAAWi4oALg0QVhBaEQzd0JhTEQzd0w0QmQyMG1nR0NCZ05WVTBTSUJnQ1FCZ0dZQmdDaEJnQQFONEFBQ1JBcUFZQnNnWWtDHXQARR0MAEcdDABJHQw8dUFZS5oClQEhSkJDNzJBajL1ASRuUEZiSUFRb0FEFfhUa1FEb0pRVTFUTXpvMk1UTTFRTkF3UxFRDFBBX1URDAxBQUFXHQwAWR0MAGEdDABjHQwQZUFDSkEdEMjYAvfpA-ACrZhI6gIwaHR0cHM6Ly90ZXN0Lm5leHgzNjAuaW8vYWRhcHRlci9uYXRpdmUJH_CaaHRtbIADAIgDAZADAJgDFKADAaoDAMAD4KgByAMA2AMA4AMA6AMA-AMDgAQAkgQJL29wZW5ydGIymAQAqAQAsgQMCAAQABgAIAAwADgAuAQAwASA2rgiyAQA0gQOOTMyNSNBTVMzOjYxMzXaBAIIAeAEAPAEvMm-LvoEEgkAAABAPG1IQBEAAACgV8oCQIgFAZgFAKAF______8BBbABqgUkM2MwMjkwYzEtNmU3NS00ZWY3LTllMzctMTdmNWViZjNiZmEzwAUAyQWJFxTwP9IFCQkJDHgAANgFAeAFAfAFmfQh-gUECAAQAJAGAZgGALgGAMEGCSUo8D_QBvUv2gYWChAJERkBAdpg4AYM8gYCCACABwGIBwCgB0HIB6b2BdIHDRVkASYI2gcGAV1oGADgBwDqBwIIAPAHAIoIAhAAlQgAAIA_mAgB&s=ccf63f2e483a37091d2475d895e7cf7c911d1a78&pp=${AUCTION_PRICE}',
              },
            ],
          },
        },
      }];
      expect(output).to.eql(expectOutput);
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
        cookies: [{'type': 'image', 'url': 'http://www.cookie.sync.org/'}]
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
