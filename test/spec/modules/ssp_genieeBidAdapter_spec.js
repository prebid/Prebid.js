import { expect } from 'chai';
import {
  spec,
  BANNER_ENDPOINT,
} from 'modules/ssp_genieeBidAdapter.js';
import { config } from '../../../src/config.js';

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
    document.documentElement.innerHTML = '';
    const adTagParent = document.createElement('div');
    adTagParent.id = AD_UNIT_CODE;
    document.body.appendChild(adTagParent);
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
        expect(String(request[0].data.zoneid)).to.have.string(
          `${BANNER_BID.params.zoneId}`
        );
      });

      it('should sets the values for loc and referer queries when bidderRequest.refererInfo.referer has a value', function () {
        const referer = 'https://example.com/';
        const request = spec.buildRequests([BANNER_BID], {
          refererInfo: { legacy: { referer: referer }, ref: referer },
        });
        expect(String(request[0].data.loc)).to.have.string(
          `${referer}`
        );
        expect(String(request[0].data.referer)).to.have.string(
          `${referer}`
        );
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
        expect(String(request[0].data.loc)).to.have.string(
          `${encodeURIComponent(loc)}`
        );
        expect(String(request[0].data.referer)).to.have.string(
          `${encodeURIComponent(referer)}`
        );
      });

      it('should sets the value of the ct0 query to geparams.ct0', function () {
        const ct0 = 'hoge';
        window.geparams = {
          ct0: 'hoge',
        };
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { ct0: ct0 }),
        ]);
        expect(String(request[0].data.ct0)).to.have.string(`${ct0}`);
      });

      it('should replaces currency with JPY if there is no currency provided', function () {
        const request = spec.buildRequests([BANNER_BID]);
        expect(String(request[0].data.cur)).to.have.string('JPY');
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
        expect(String(request[0].data.cur)).to.have.string('JPY');
        expect(String(request[1].data.cur)).to.have.string('USD');
      });

      it('should makes invalidImpBeacon the value of params.invalidImpBeacon when params.invalidImpBeacon exists (in current version, this parameter is not necessary and ib is always `0`)', function () {
        const request = spec.buildRequests([
          {
            ...BANNER_BID,
            params: { ...BANNER_BID.params, invalidImpBeacon: true },
          },
          {
            ...BANNER_BID,
            params: { ...BANNER_BID.params, invalidImpBeacon: false },
          },
          {
            ...BANNER_BID,
            params: { ...BANNER_BID.params },
          },
        ]);
        expect(String(request[0].data.ib)).to.have.string('0');
        expect(String(request[1].data.ib)).to.have.string('0');
        expect(String(request[2].data.ib)).to.have.string('0');
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
        expect(String(request[0].data.adtk)).to.have.string('0');
      });

      it('should sets the value of the adtk query to 1 when geparams.lat is falsy value', function () {
        window.geparams = {
          lat: 0,
        };
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { lat: 0 }),
        ]);
        expect(String(request[0].data.adtk)).to.have.string('1');
      });

      it('should sets the value of the idfa query to geparams.idfa', function () {
        const idfa = 'hoge';
        window.geparams = {
          idfa: 'hoge',
        };
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { idfa: idfa }),
        ]);
        expect(String(request[0].data.idfa)).to.have.string(`${idfa}`);
      });

      it('should set the sw query to screen.height and the sh query to screen.width when screen.width is greater than screen.height', function () {
        const width = 1440;
        const height = 900;
        const stub = sinon.stub(window, 'screen').get(function () {
          return { width: width, height: height };
        });
        const request = spec.buildRequests([BANNER_BID]);
        expect(String(request[0].data.sw)).to.have.string(`${height}`);
        expect(String(request[0].data.sh)).to.have.string(`${width}`);
        stub.restore();
      });

      it('should set the sw query to screen.width and the sh query to screen.height when screen.width is not greater than screen.height', function () {
        const width = 411;
        const height = 731;
        const stub = sinon.stub(window, 'screen').get(function () {
          return { width: width, height: height };
        });
        const request = spec.buildRequests([BANNER_BID]);
        expect(String(request[0].data.sw)).to.have.string(`${width}`);
        expect(String(request[0].data.sh)).to.have.string(`${height}`);
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
        expect(String(request[0].data.apid)).to.have.string(`${bundle}`);
      });

      it('should not include the extuid query when it does not contain the imuid cookie', function () {
        const stub = sinon.stub(document, 'cookie').get(function () {
          return '';
        });
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data).to.not.have.property('extuid');
        stub.restore();
      });

      it('should include an extuid query when it contains an imuid cookie', function () {
        const imuid = 'b.a4ad1d3eeb51e600';
        const stub = sinon.stub(document, 'cookie').get(function () {
          return `_im_uid.3929=${imuid}`;
        });
        const request = spec.buildRequests([BANNER_BID]);
        expect(String(request[0].data.extuid)).to.have.string(
          `${`im:${imuid}`}`
        );
        stub.restore();
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
      expect(result[0]).to.have.deep.equal(expectedBanner);
    });
  });
});
