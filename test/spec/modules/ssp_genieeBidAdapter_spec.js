import { expect } from 'chai';
import {
  spec,
  BANNER_ENDPOINT,
  buildExtuidQuery,
} from 'modules/ssp_genieeBidAdapter.js';
import { config } from 'src/config.js';

describe('ssp_genieeBidAdapter', function () {
  const ZONE_ID = 1234567;
  const AD_UNIT_CODE = 'adunit-code';
  const BANNER_BID = {
    bidder: spec.code,
    params: {
      zoneId: ZONE_ID,
      invalidImpBeacon: false,
    },
    adUnitCode: AD_UNIT_CODE,
    sizes: [[300, 250]],
    bidId: 'bidId12345',
    bidderRequestId: 'bidderRequestId12345',
    auctionId: 'auctionId12345',
  };
  let sandbox;

  function getGeparamsDefinedBid(bid, params) {
    const newBid = { ...bid };
    newBid.params.geparams = params;
    return newBid;
  }

  function hasParamsNotBlankStringTestGeparams(param, query) {
    it(`should set the ${query} query to geparams.${param} when geparams.${param} is neither undefined nor null nor a blank string`, function () {
      window.geparams[param] = undefined;
      let request = spec.buildRequests([BANNER_BID]);
      expect(request[0].data).to.not.have.property(`"${query}:`);

      window.geparams[param] = null;
      request = spec.buildRequests([BANNER_BID]);
      expect(request[0].data).to.not.have.property(`"${query}:`);

      window.geparams[param] = '';
      request = spec.buildRequests([BANNER_BID]);
      expect(request[0].data).to.not.have.property(`"${query}:`);

      const value = 'hoge';
      window.geparams[param] = value;
      request = spec.buildRequests([BANNER_BID]);
      expect(JSON.stringify(request[0].data)).to.have.string(`"${query}":"${value}"`);
    });
  }

  function hasParamsNotBlankStringTestGecuparams(param, query) {
    it(`should set the ${query} query to gecuparams.${param} when gecuparams.${param} is neither undefined nor null nor a blank string`, function () {
      window.gecuparams = {};
      window.gecuparams[param] = undefined;
      let request = spec.buildRequests([BANNER_BID]);
      expect(request[0].data).to.not.have.property(`"${query}:`);

      window.gecuparams[param] = null;
      request = spec.buildRequests([BANNER_BID]);
      expect(request[0].data).to.not.have.property(`"${query}:`);

      window.gecuparams[param] = '';
      request = spec.buildRequests([BANNER_BID]);
      expect(request[0].data).to.not.have.property(`"${query}:`);

      const value = 'hoge';
      window.gecuparams[param] = value;
      request = spec.buildRequests([BANNER_BID]);
      expect(JSON.stringify(request[0].data)).to.have.string(`"${query}":"${value}"`);
    });
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    document.documentElement.innerHTML = '';
    const adTagParent = document.createElement('div');
    adTagParent.id = AD_UNIT_CODE;
    document.body.appendChild(adTagParent);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('isBidRequestValid', function () {
    it('should return true when params.zoneId exists and params.currency does not exist', function () {
      expect(spec.isBidRequestValid(BANNER_BID)).to.be.true;
    });

    it('should return true when params.zoneId and params.currency exist and params.currency is JPY or USD', function () {
      config.setConfig({ currency: { adServerCurrency: 'JPY' } });
      expect(
        spec.isBidRequestValid({
          ...BANNER_BID,
          params: { ...BANNER_BID.params },
        })
      ).to.be.true;
      config.setConfig({ currency: { adServerCurrency: 'USD' } });
      expect(
        spec.isBidRequestValid({
          ...BANNER_BID,
          params: { ...BANNER_BID.params },
        })
      ).to.be.true;
    });

    it('should return false when params.zoneId does not exist', function () {
      expect(spec.isBidRequestValid({ ...BANNER_BID, params: {} })).to.be.false;
    });

    it('should return false when params.zoneId and params.currency exist and params.currency is neither JPY nor USD', function () {
      config.setConfig({ currency: { adServerCurrency: 'EUR' } });
      expect(
        spec.isBidRequestValid({
          ...BANNER_BID,
          params: { ...BANNER_BID.params },
        })
      ).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('should changes the endpoint with banner ads or naive ads', function () {
      const request = spec.buildRequests([BANNER_BID]);
      expect(request[0].url).to.equal(BANNER_ENDPOINT);
    });

    it('should return a ServerRequest where the bid is a bid for validBidRequests', function () {
      const request = spec.buildRequests([BANNER_BID]);
      expect(request[0].bid).to.equal(BANNER_BID);
    });

    describe('QueryStringParameters', function () {
      it('should sets the value of the zoneid query to bid.params.zoneId', function () {
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data.zoneid).to.deep.equal(BANNER_BID.params.zoneId);
      });

      it('should set the title query to the encoded page title', function () {
        const testTitle = "Test Page Title with 'special' & \"chars\"";
        sandbox.stub(document, 'title').value(testTitle);
        const request = spec.buildRequests([BANNER_BID]);
        const expectedEncodedTitle = encodeURIComponent(testTitle).replace(/'/g, '%27');
        expect(request[0].data.title).to.deep.equal(expectedEncodedTitle);
      });

      it('should not set the title query when the page title is empty', function () {
        sandbox.stub(document, 'title').value('');
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data).to.not.have.property('title');
      });

      it('should sets the values for loc and referer queries when bidderRequest.refererInfo.referer has a value', function () {
        const referer = 'https://example.com/';
        const request = spec.buildRequests([BANNER_BID], {
          refererInfo: { legacy: { referer: referer }, ref: referer },
        });
        expect(request[0].data.loc).to.deep.equal(referer);
        expect(request[0].data.referer).to.deep.equal(referer);
      });

      it('should makes the values of loc query and referer query geparams value when bidderRequest.refererInfo.referer is a falsy value', function () {
        const loc = 'https://www.google.com/';
        const referer = 'https://example.com/';
        window.geparams = {
          loc: 'https://www.google.com/',
          ref: 'https://example.com/',
        };
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { loc: loc, ref: referer }),
        ]);
        expect(request[0].data.loc).to.deep.equal(encodeURIComponent(loc));
        expect(request[0].data.referer).to.deep.equal(encodeURIComponent(referer));
      });

      it('should sets the value of the ct0 query to geparams.ct0', function () {
        const ct0 = 'hoge';
        window.geparams = {
          ct0: 'hoge',
        };
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { ct0: ct0 }),
        ]);
        expect(request[0].data.ct0).to.deep.equal(ct0);
      });

      it('should replaces currency with JPY if there is no currency provided', function () {
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data.cur).to.deep.equal('JPY');
      });

      it('should makes currency the value of params.currency when params.currency exists', function () {
        const request = spec.buildRequests([
          {
            ...BANNER_BID,
            params: { ...BANNER_BID.params, currency: 'JPY' },
          },
          {
            ...BANNER_BID,
            params: { ...BANNER_BID.params, currency: 'USD' },
          },
        ]);
        expect(request[0].data.cur).to.deep.equal('JPY');
        expect(request[1].data.cur).to.deep.equal('USD');
      });

      it('should not sets the value of the adtk query when geparams.lat does not exist', function () {
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data).to.not.have.property('adtk');
      });

      it('should sets the value of the adtk query to 0 when geparams.lat is truthy value', function () {
        window.geparams = {
          lat: 1,
        };
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { lat: 1 }),
        ]);
        expect(request[0].data.adtk).to.deep.equal('0');
      });

      it('should sets the value of the adtk query to 1 when geparams.lat is falsy value', function () {
        window.geparams = {
          lat: 0,
        };
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { lat: 0 }),
        ]);
        expect(request[0].data.adtk).to.deep.equal('1');
      });

      it('should sets the value of the idfa query to geparams.idfa', function () {
        const idfa = 'hoge';
        window.geparams = {
          idfa: 'hoge',
        };
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { idfa: idfa }),
        ]);
        expect(request[0].data.idfa).to.deep.equal(idfa);
      });

      it('should set the sw query to screen.height and the sh query to screen.width when screen.width is greater than screen.height', function () {
        const width = 1440;
        const height = 900;
        const stub = sinon.stub(window, 'screen').get(function () {
          return { width: width, height: height };
        });
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data.sw).to.deep.equal(height);
        expect(request[0].data.sh).to.deep.equal(width);
        stub.restore();
      });

      it('should set the sw query to screen.width and the sh query to screen.height when screen.width is not greater than screen.height', function () {
        const width = 411;
        const height = 731;
        const stub = sinon.stub(window, 'screen').get(function () {
          return { width: width, height: height };
        });
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data.sw).to.deep.equal(width);
        expect(request[0].data.sh).to.deep.equal(height);
        stub.restore();
      });

      hasParamsNotBlankStringTestGeparams('zip', 'zip');
      hasParamsNotBlankStringTestGeparams('country', 'country');
      hasParamsNotBlankStringTestGeparams('city', 'city');
      hasParamsNotBlankStringTestGeparams('long', 'long');
      hasParamsNotBlankStringTestGeparams('lati', 'lati');

      it('should set the custom query to geparams.custom', function () {
        const params = {
          custom: {
            c1: undefined,
            c2: null,
            c3: '',
            c4: 'hoge',
          },
        };
        window.geparams = {
          custom: {
            c1: undefined,
            c2: null,
            c3: '',
            c4: 'hoge',
          },
        };
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, params),
        ]);
        expect(request[0].data).to.not.have.property('custom_c1');
        expect(request[0].data).to.not.have.property('custom_c2');
        expect(request[0].data).to.not.have.property('custom_c3');
        expect(request[0].data.custom_c4).to.have.string(
          `${params.custom.c4}`
        );
      });

      hasParamsNotBlankStringTestGecuparams('ver', 'gc_ver');
      hasParamsNotBlankStringTestGecuparams('minor', 'gc_minor');
      hasParamsNotBlankStringTestGecuparams('value', 'gc_value');

      it('should sets the value of the gfuid query to geparams.gfuid', function () {
        const gfuid = 'hoge';
        window.geparams = {
          gfuid: 'hoge',
        };
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { gfuid: gfuid }),
        ]);
        expect(request[0].data).to.not.have.property('gfuid');
      });

      it('should sets the value of the adt query to geparams.adt', function () {
        const adt = 'hoge';
        window.geparams = {
          adt: 'hoge',
        };
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { adt: adt }),
        ]);
        expect(request[0].data).to.not.have.property('adt');
      });

      it('should adds a query for naive ads and no query for banner ads', function () {
        // const query = '&tkf=1&ad_track=1&apiv=1.1.0';
        const query_apiv = '1.1.0';
        const query_tkf = '1';
        const query_ad_track = '1';
        const request = spec.buildRequests([BANNER_BID]);
        expect(String(request[0].data.apiv)).to.not.have.string(query_apiv);
        expect(String(request[0].data.tkf)).to.not.have.string(query_tkf);
        expect(String(request[0].data.ad_track)).to.not.have.string(query_ad_track);
      });

      it('should sets the value of the apid query to geparams.bundle when media type is banner', function () {
        const bundle = 'hoge';
        window.geparams = {
          bundle: 'hoge',
        };
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { bundle: bundle }),
        ]);
        expect(request[0].data.apid).to.deep.equal(bundle);
      });

      it('should include only imuid in extuid query when only imuid exists', function () {
        const imuid = 'b.a4ad1d3eeb51e600';
        const request = spec.buildRequests([{...BANNER_BID, userId: {imuid}}]);
        expect(request[0].data.extuid).to.deep.equal(`im:${imuid}`);
      });

      it('should include only id5id in extuid query when only id5id exists', function () {
        const id5id = 'id5id';
        const request = spec.buildRequests([{...BANNER_BID, userId: {id5id: {uid: id5id}}}]);
        expect(request[0].data.extuid).to.deep.equal(`id5:${id5id}`);
      });

      it('should include id5id and imuid in extuid query when id5id and imuid exists', function () {
        const imuid = 'b.a4ad1d3eeb51e600';
        const id5id = 'id5id';
        const request = spec.buildRequests([{...BANNER_BID, userId: {id5id: {uid: id5id}, imuid: imuid}}]);
        expect(request[0].data.extuid).to.deep.equal(`id5:${id5id}\tim:${imuid}`);
      });

      it('should not include the extuid query when both id5 and imuid are missing', function () {
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data).to.not.have.property('extuid');
      });

      describe('buildExtuidQuery', function() {
        it('should return tab-separated string when both id5 and imuId exist', function() {
          const result = buildExtuidQuery({ id5: 'test_id5', imuId: 'test_imu' });
          expect(result).to.equal('id5:test_id5\tim:test_imu');
        });

        it('should return only id5 when imuId is missing', function() {
          const result = buildExtuidQuery({ id5: 'test_id5', imuId: null });
          expect(result).to.equal('id5:test_id5');
        });

        it('should return only imuId when id5 is missing', function() {
          const result = buildExtuidQuery({ id5: null, imuId: 'test_imu' });
          expect(result).to.equal('im:test_imu');
        });

        it('should return null when both id5 and imuId are missing', function() {
          const result = buildExtuidQuery({ id5: null, imuId: null });
          expect(result).to.be.null;
        });
      });

      it('should include gpid when ortb2Imp.ext.gpid exists', function () {
        const gpid = '/123/abc';
        const bidWithGpid = {
          ...BANNER_BID,
          ortb2Imp: {
            ext: {
              gpid: gpid
            }
          }
        };
        const request = spec.buildRequests([bidWithGpid]);
        expect(String(request[0].data.gpid)).to.have.string(gpid);
      });

      it('should include gpid when ortb2Imp.ext.gpid exists', function () {
        const gpid = '/123/abc';
        const bidWithPbadslot = {
          ...BANNER_BID,
          ortb2Imp: {
            ext: {
              gpid
            }
          }
        };
        const request = spec.buildRequests([bidWithPbadslot]);
        expect(String(request[0].data.gpid)).to.have.string(gpid);
      });

      it('should not include gpid when neither ortb2Imp.ext.gpid nor ortb2Imp.ext.data.pbadslot exists', function () {
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data).to.not.have.property('gpid');
      });
    });
  });

  describe('interpretResponse', function () {
    const response = {};
    response[ZONE_ID] = {
      creativeId: '<!-- CREATIVE ID -->',
      cur: 'JPY',
      price: 0.092,
      width: 300,
      height: 250,
      requestid: '2e42361a6172bf',
      adm: '<!-- ADS TAG -->',
    };
    const expected = {
      requestId: response[ZONE_ID].requestid,
      cpm: response[ZONE_ID].price,
      creativeId: response[ZONE_ID].creativeId,
      netRevenue: true,
      currency: 'JPY',
      ttl: 700,
      width: response[ZONE_ID].width,
      height: response[ZONE_ID].height,
    };

    it('should sets the response correctly when it comes to banner ads', function () {
      const expectedBanner = {
        ...expected,
        ad:
          '<body marginwidth="0" marginheight="0"><div><script>window.addEventListener("load",function(){window.parent.document.getElementById("' +
          BANNER_BID.adUnitCode +
          '").height=document.body.scrollHeight})</script>' +
          response[ZONE_ID].adm +
          '</div></body>',
        mediaType: 'banner',
      };
      const request = spec.buildRequests([BANNER_BID])[0];
      const result = spec.interpretResponse({ body: response }, request);
      expect(result[0]).to.deep.equal(expectedBanner);
    });
  });

  describe('getUserSyncs', function () {
    const syncOptions = {
      pixelEnabled: true,
      iframeEnabled: true,
    };
    const responseBase = {
      creativeId: '<!-- CREATIVE ID -->',
      cur: 'JPY',
      price: 0.092,
      width: 300,
      height: 250,
      requestid: '2e42361a6172bf',
      adm: '<!-- ADS TAG -->',
    };

    it('should return an array of length 1 when adm contains one mcs endpoint', function () {
      const response = [{
        body: {
          [ZONE_ID]: {
            ...responseBase,
            adm: '%5c%22https%3a%5c%2f%5c%2fcs.gssprt.jp%5c%2fyie%5c%2fld%5c%2fmcs%3fver%3d1%26dspid%3dlamp%26format%3dgif%26vid%3d1%5c%22%20style%3d'
          }
        }
      }]
      const result = spec.getUserSyncs(syncOptions, response);
      expect(result).to.have.deep.equal([{
        type: 'image',
        url: 'https://cs.gssprt.jp/yie/ld/mcs?ver=1&dspid=lamp&format=gif&vid=1',
      }]);
    });

    it('should return an array of length 2 when adm contains two mcs endpoints', function () {
      const response = [{
        body: {
          [ZONE_ID]: {
            ...responseBase,
            adm: '%5c%22https%3a%5c%2f%5c%2fcs.gssprt.jp%5c%2fyie%5c%2fld%5c%2fmcs%3fver%3d1%26dspid%3dlamp%26format%3dgif%26vid%3d1%5c%22%20style%3d%5c%22display%3a%20none%3b%20visibility%3a%20hidden%3b%5c%22%20%5c%2f%3e%3cimg%20src%3d%5c%22https%3a%5c%2f%5c%2fcs.gssprt.jp%5c%2fyie%5c%2fld%5c%2fmcs%3fver%3d1%26dspid%3drtbhouse%26format%3dgif%26vid%3d1%5c%22%20style%3d%5c%22display%3a'
          }
        }
      }]
      const result = spec.getUserSyncs(syncOptions, response);
      expect(result).to.have.deep.equal([{
        type: 'image',
        url: 'https://cs.gssprt.jp/yie/ld/mcs?ver=1&dspid=lamp&format=gif&vid=1',
      }, {
        type: 'image',
        url: 'https://cs.gssprt.jp/yie/ld/mcs?ver=1&dspid=rtbhouse&format=gif&vid=1',
      }]);
    });

    it('should return an empty array When adm does not include the mcs endpoint', function () {
      const response = [{
        body: {
          [ZONE_ID]: responseBase
        }
      }]
      const result = spec.getUserSyncs(syncOptions, response);
      expect(result).to.have.deep.equal([]);
    });

    it('should return an iframe sync when cs_url exists and iframeEnabled is true', function () {
      const csUrlParam = '/cshtml?ver=1&dspid=lamp&format=html';
      const response = [{
        body: {
          [ZONE_ID]: {
            ...responseBase,
            cs_url: csUrlParam
          }
        }
      }];
      const result = spec.getUserSyncs(syncOptions, response);
      expect(result).to.have.deep.equal([{
        type: 'iframe',
        url: `https://aladdin.genieesspv.jp/yie/ld${csUrlParam}`,
      }]);
    });

    it('should prioritize iframe sync over image sync when cs_url exists', function () {
      const csUrlParam = '/cshtml?ver=1&dspid=lamp&format=html';
      const response = [{
        body: {
          [ZONE_ID]: {
            ...responseBase,
            cs_url: csUrlParam,
            adm: '%5c%22https%3a%5c%2f%5c%2fcs.gssprt.jp%5c%2fyie%5c%2fld%5c%2fmcs%3fver%3d1%26dspid%3dlamp%26format%3dgif%26vid%3d1%5c%22%20style%3d' // admも含む
          }
        }
      }];
      const result = spec.getUserSyncs(syncOptions, response);
      expect(result).to.have.deep.equal([{
        type: 'iframe',
        url: `https://aladdin.genieesspv.jp/yie/ld${csUrlParam}`,
      }]);
    });

    it('should return an image sync when cs_url does not exist but adm contains mcs endpoint and pixelEnabled is true, even if iframeEnabled is false', function () {
      const response = [{
        body: {
          [ZONE_ID]: {
            ...responseBase,
            adm: '%5c%22https%3a%5c%2f%5c%2fcs.gssprt.jp%5c%2fyie%5c%2fld%5c%2fmcs%3fver%3d1%26dspid%3dlamp%26format%3dgif%26vid%3d1%5c%22%20style%3d'
          }
        }
      }];
      const result = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: false }, response);
      expect(result).to.have.deep.equal([{
        type: 'image',
        url: 'https://cs.gssprt.jp/yie/ld/mcs?ver=1&dspid=lamp&format=gif&vid=1',
      }]);
    });

    it('should return an empty array when cs_url exists but iframeEnabled is false and adm does not contain mcs endpoint', function () {
      const csUrlParam = '/cshtml?ver=1&dspid=lamp&format=html';
      const response = [{
        body: {
          [ZONE_ID]: {
            ...responseBase,
            cs_url: csUrlParam,
            adm: '<!-- NO MCS -->'
          }
        }
      }];
      const result = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: false }, response);
      expect(result).to.have.deep.equal([]);
    });

    it('should return correct sync objects when responses contain cs_url, adm or empty body with syncOptions (both true)', function () {
      const csUrlParam = '/cshtml?ver=1&dspid=lamp&format=html';
      const response = [{
        body: {
          [ZONE_ID]: {
            ...responseBase,
            cs_url: csUrlParam
          }
        }
      }, {
        body: {
          1345678: {
            ...responseBase,
            adm: '%5c%22https%3a%5c%2f%5c%2fcs.gssprt.jp%5c%2fyie%5c%2fld%5c%2fmcs%3fver%3d1%26dspid%3dappier%26format%3dgif%26vid%3d1%5c%22%20style%3d'
          }
        }
      }, {
        body: ''
      }];
      const result = spec.getUserSyncs(syncOptions, response);
      expect(result).to.have.deep.equal([{
        type: 'iframe',
        url: `https://aladdin.genieesspv.jp/yie/ld${csUrlParam}`,
      }, {
        type: 'image',
        url: 'https://cs.gssprt.jp/yie/ld/mcs?ver=1&dspid=appier&format=gif&vid=1',
      }]);
    });

    it('should return an iframe sync when iframeEnabled is true and cs_url exists', function () {
      const csUrlParam = '/cshtml?ver=1&dspid=lamp&format=html';
      const response = [{
        body: {
          [ZONE_ID]: {
            ...responseBase,
            cs_url: csUrlParam
          }
        }
      }];
      const result = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, response);
      expect(result).to.have.deep.equal([{
        type: 'iframe',
        url: `https://aladdin.genieesspv.jp/yie/ld${csUrlParam}`,
      }]);
    });

    it('should not return an iframe sync when iframeEnabled is true but cs_url does not exist', function () {
      const response = [{
        body: {
          [ZONE_ID]: {
            ...responseBase,
          }
        }
      }];
      const result = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, response);
      expect(result).to.have.deep.equal([]);
    });

    it('should create an object for each response and return an array when there are multiple responses', function () {
      const response = [{
        body: {
          [ZONE_ID]: {
            ...responseBase,
            adm: '%5c%22https%3a%5c%2f%5c%2fcs.gssprt.jp%5c%2fyie%5c%2fld%5c%2fmcs%3fver%3d1%26dspid%3dlamp%26format%3dgif%26vid%3d1%5c%22%20style%3d'
          }
        }
      }, {
        body: {
          [ZONE_ID]: {
            ...responseBase,
            adm: '%5c%22https%3a%5c%2f%5c%2fcs.gssprt.jp%5c%2fyie%5c%2fld%5c%2fmcs%3fver%3d1%26dspid%3drtbhouse%26format%3dgif%26vid%3d1%5c%22%20style%3d'
          }
        }
      }];
      const result = spec.getUserSyncs(syncOptions, response);
      expect(result).to.have.deep.equal([{
        type: 'image',
        url: 'https://cs.gssprt.jp/yie/ld/mcs?ver=1&dspid=lamp&format=gif&vid=1',
      }, {
        type: 'image',
        url: 'https://cs.gssprt.jp/yie/ld/mcs?ver=1&dspid=rtbhouse&format=gif&vid=1',
      }]);
    });
  });
});
