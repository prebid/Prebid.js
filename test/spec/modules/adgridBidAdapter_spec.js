import { expect } from 'chai';
import {
  spec, STORAGE, getAdgridLocalStorage,
} from 'modules/adgridBidAdapter.js';
import sinon from 'sinon';
const sandbox = sinon.createSandbox();

describe('adgrid bid adapter tests', () => {
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
        bidder: 'adgrid',
        mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
        adUnitCode: 'div-1',
        transactionId: '70bdc37e-9475-4b27-8c74-4634bdc2ee66',
        sizes: [[300, 250], [300, 600]],
        bidId: '4906582fc87d0c',
        bidderRequestId: '332fda16002dbe',
        auctionId: '98932591-c822-42e3-850e-4b3cf748d063',
      }
    });

    it('We verify isBidRequestValid unvalid domainId', () => {
      bannerBid.params = { domainid: 1 };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(false);
    });

    it('We verify isBidRequestValid with uncorrect domainId', () => {
      bannerBid.params = { domainId: '1234', placement: 'testadgd' };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(false);
    });

    it('We verify isBidRequestValid with uncorrect placement', () => {
      bannerBid.params = { domainId: 1234, placement: 4321 };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(false);
    });

    it('We verify isBidRequestValid with correct payload', () => {
      bannerBid.params = { domainId: 1234, placement: '4321' };
      expect(spec.isBidRequestValid(bannerBid)).to.be.equal(true);
    });
  });

  describe('getLocalStorage disabled', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => false);
    });
    it('We test if we get the adgridId', () => {
      const output = getAdgridLocalStorage();
      expect(output).to.be.eql(null);
    });
    after(() => {
      sandbox.restore()
    });
  })

  describe('getLocalStorage enabled but nothing', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(STORAGE, 'setDataInLocalStorage');
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake((key) => null);
    });
    it('We test if we get the adgridId', () => {
      const output = getAdgridLocalStorage();
      expect(typeof output.adgridId).to.be.eql('string');
    });
    after(() => {
      sandbox.restore()
    });
  })

  describe('getLocalStorage enabled but wrong payload', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(STORAGE, 'setDataInLocalStorage');
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake((key) => '{"adgridId":"5ad89a6e-7801-48e7-97bb-fe6f251f6cb4",}');
    });
    it('We test if we get the adgridId', () => {
      const output = getAdgridLocalStorage();
      expect(output).to.be.eql(null);
    });
    after(() => {
      sandbox.restore()
    });
  });

  describe('getLocalStorage enabled', () => {
    before(() => {
      sandbox.stub(STORAGE, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(STORAGE, 'setDataInLocalStorage');
      sandbox.stub(STORAGE, 'getDataFromLocalStorage').callsFake((key) => '{"adgridId":"5ad89a6e-7801-48e7-97bb-fe6f251f6cb4"}');
    });
    it('We test if we get the adgridId', () => {
      const output = getAdgridLocalStorage();
      expect(output.adgridId).to.be.eql('5ad89a6e-7801-48e7-97bb-fe6f251f6cb4');
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
        }
      });
    });
    describe('We test with a multiple display bids', () => {
      const sampleBids = [
        {
          bidder: 'adgrid',
          params: {
            placement: 'testadgd',
            domainId: 1234,
          },
          ortb2Imp: {
            ext: {
              gpid: '/12345/Header-Ad',
            }
          },
          adUnitCode: 'header-ad-1234',
          transactionId: '469a570d-f187-488d-b1cb-48c1a2009be9',
          sizes: [[300, 250], [300, 600]],
          bidId: '44a2706ac3574',
          bidderRequestId: '359bf8a3c06b2e',
          auctionId: '2e684815-b44e-4e04-b812-56da54adbe74',
          userIdAsEids: [
            {
              source: 'id5-sync.com',
              uids: [
                {
                  id: 'ID5*xe3R0Pbrc5Y4WBrb5UZSWTiS1t9DU2LgQrhdZOgFdXMoglhqmjs_SfBbyHfSYGZKKIT4Gf-XOQ_anA3iqi0hJSiFyD3aICGHDJFxNS8LO84ohwTQ0EiwOexZAbBlH0chKIhbvdGBfuouNuVF_YHCoyiLQJDp3WQiH96lE9MH2T0ojRqoyR623gxAWlBCBPh7KI4bYtZlet3Vtr-gH5_xqCiSEd7aYV37wHxUTSN38Isok_0qDCHg4pKXCcVM2h6FKJSGmvw-xPm9HkfkIcbh1CiVVG4nREP142XrBecdzhQomNlcalmwdzGHsuHPjTP-KJraa15yvvZDceq-f_YfECicDllYBLEsg24oPRM-ibMonWtT9qOm5dSfWS5G_r09KJ4HMB6REICq1wleDD1mwSigXkM_nxIKa4TxRaRqEekoooWRwuKA5-euHN3xxNfIKKP19EtGhuNTs0YdCSe8_w',
                  atype: 1,
                  ext: {
                    linkType: 2
                  }
                }
              ]
            },
            {
              source: 'domain.com',
              uids: [
                {
                  id: 'value read from cookie or local storage',
                  atype: 1,
                  ext: {
                    stype: 'ppuid'
                  }
                }
              ]
            }
          ],
        },
        {
          bidder: 'adgrid',
          params: {
            placement: 'testadgd',
            domainId: 1234,
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
      ]
      const bidderRequest = {
        bidderCode: 'adgrid',
        auctionId: '2e684815-b44e-4e04-b812-56da54adbe74',
        bidderRequestId: '359bf8a3c06b2e',
        refererInfo: {
          reachedTop: true,
          isAmp: false,
          numIframes: 0,
          stack: [
            'https://test.com'
          ],
          topmostLocation: 'https://test.com',
          location: 'https://test.com',
          canonicalUrl: null,
          page: 'https://test.com',
          domain: 'test.com',
          ref: null,
          legacy: {
            reachedTop: true,
            isAmp: false,
            numIframes: 0,
            stack: [
              'https://test.com'
            ],
            referer: 'https://test.com',
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
                divId: 'header-ad-1234',
                gpid: '/12345/Header-Ad',
                adgrid: {
                  placement: 'testadgd',
                  domainId: 1234,
                },
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
                adgrid: {
                  placement: 'testadgd',
                  domainId: 1234,
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
            bidderVersion: '2.0',
            requestCounter: 0,
            sessionId: requestContent.ext.sessionId,
          },
          cur: [
            'USD',
          ],
          user: {},
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
                  ssp: 'test',
                  h: 600,
                  w: 300,
                  adm: '<div>TestAd</div>',
                  cat: [
                    'IAB3-1',
                  ],
                  ext: {
                    adUnitCode: 'div-1',
                    mediaType: 'banner',
                    ssp: 'test',
                  },
                },
              ],
              seat: 'test',
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
          demandSource: 'test',
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
                    'adgrid.com',
                  ],
                  crid: '97517771',
                  h: 1,
                  w: 1,
                  adm: '<VAST>vast</VAST>',
                  ext: {
                    mediaType: 'instream',
                    ssp: 'test',
                    adUnitCode: 'video1',
                  },
                },
              ],
              seat: 'test',
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
        meta: {
          advertiserDomains: ['adgrid.com'],
          demandSource: 'test'
        },
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
                    'adgrid.com',
                  ],
                  crid: '97517771',
                  h: 1,
                  w: 1,
                  adm: '<VAST>vast</VAST>',
                  ext: {
                    mediaType: 'outstream',
                    ssp: 'test',
                    adUnitCode: 'div-1',
                    divId: 'div-1',
                  },
                },
              ],
              seat: 'test',
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
        divId: 'div-1',
        mediaType: 'video',
        meta: { advertiserDomains: ['adgrid.com'], demandSource: 'test' },
        vastXml: '<VAST>vast</VAST>',
        renderer: output[0].renderer,
      }];
      expect(output).to.eql(expectedOutut);
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
