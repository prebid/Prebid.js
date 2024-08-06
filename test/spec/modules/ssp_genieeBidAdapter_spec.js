import { expect, assert } from 'chai';
import {
  spec,
  BANNER_ENDPOINT,
  NATIVE_ENDPOINT,
} from 'modules/ssp_genieeBidAdapter.js';

describe('ssp_genieeBidAdapter', function () {
  function getNativeResponseBody(response) {
    return (
      'gnnative_' + ZONE_ID + '_callback(' + JSON.stringify(response) + ');'
    );
  }

  const ZONE_ID = 1234567;
  const AD_UNIT_CODE = 'adunit-code';
  const NATIVE_CALLBACK_KEY = 'gnnative_' + ZONE_ID + '_callback';
  const NATIVE_OBJECT_KEY = 'gnnative_' + ZONE_ID;
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

  const NATIVE_BID = {
    ...BANNER_BID,
    params: {
      zoneId: ZONE_ID,
      native: {
        itemFormat:
          '<style type="text/css">*{margin:0;padding:0;font-size:100%}div.gn-nad_frst{width:300px;height:250px;margin:auto;background-color:#FFF;position:relative}div.gn-nad_frst a{text-decoration:none;-webkit-tap-highlight-color:transparent;color:#4B4B4B}div.gn-nad_frst div.gn-nad_frst_img-container{margin:0px;padding:0px;text-align:center;background-color:#000;text-align:center;height:157px}p.gn-nad_frst_img-container div.gn-nad_frst_img{position:relative;width:auto;vertical-align:top;border:0;right:0px}div.gn-nad_frst_img img{height:157px;width:auto}div.gn-nad_frst div.gn-nad_frst_optout{position:absolute;top:0px;right:0px}img.gn-nad_frst_optimg{height:20px;width:auto}div.gn-nad_frst div.gn-nad_frst_text-container{padding:2%;overflow:hidden;height:93px}p.gn-nad_frst_bottom-title{width:100%;margin:0px;padding:0px;text-align:left;overflow:hidden;text-overflow:ellipsis;font-size:14px;font-weight:700;margin-top:2px;word-wrap:break-word;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical}p.gn-nad_frst_bottom-desc{width:100%;margin:0px;padding:0px;text-align:left;overflow:hidden;text-overflow:ellipsis;font-size:12px;margin-top:8px;word-wrap:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}div.gn-nad_frst_text-container p.gn-nad_frst_pr{margin:0px;padding:0px;position:absolute;bottom:3px;text-align:left;margin-top:0.1em;font-size:8px;color:#CCC}</style><div class="gn-nad_frst"> <a href="{landing-url}" target="_blank"><div class="gn-nad_frst_img-container"><div class="gn-nad_frst_img"> <img src="{screenshots-url}"></div><div class="gn-nad_frst_optout" style="display: none"> <a href="{optout-url}" target="_blank"> <img class="gn-nad_frst_optimg" src="{optout-image-url}"> </a></div></div><div class="gn-nad_frst_text-container"><p class="gn-nad_frst_bottom-title"> {title}</p><p class="gn-nad_frst_bottom-desc">{description}</p><p class="gn-nad_frst_pr"> </p></div> </a></div>',
        nativePostReplace: '',
        apiv: '1.1.0',
        tkf: 1,
      },
    },
    // When calling the API, nativeParams are defined in the adUnit object, not the bid object.
    // Before Prebid sends a bid request to each bidder, it is copied from adUnit to bid.
    nativeParams: {
      title: {
        required: true,
        len: 80,
      },
      image: {
        required: false,
        sizes: [300, 250],
      },
      sponsoredBy: {
        required: true,
      },
    },
    mediaTypes: {
      native: {
        ortb: {
          assets: [{
            id: 1,
            required: 1,
            img: {
              type: 3,
              w: 300,
              h: 250,
            }
          },
          {
            id: 2,
            required: 1,
            title: {
              len: 80
            }
          },
          {
            id: 3,
            required: 1,
            data: {
              type: 1,
              len: 80
            }
          }]
        },
      }
    }
  };

  function getGeparamsDefinedBid(bid, params) {
    const newBid = { ...bid };
    newBid.params.geparams = params;
    return newBid;
  }

  function getGecuparamsDefinedBid(bid, params) {
    const newBid = { ...bid };
    newBid.params.gecuparams = params;
    return newBid;
  }

  function hasParamsNotBlankStringTest(isGeparams, param, query) {
    const defineParamsFunc = isGeparams
      ? getGeparamsDefinedBid
      : getGecuparamsDefinedBid;
    const paramsName = isGeparams ? 'geparams' : 'gecuparams';

    it(`should set the ${query} query to ${paramsName}.${param} when ${paramsName}.${param} is neither undefined nor null nor a blank string`, function () {
      const params = {};
      params[param] = undefined;
      let request = spec.buildRequests([defineParamsFunc(BANNER_BID, params)]);
      expect(request[0].data).to.not.have.string(`&${query}=`);

      params[param] = null;
      request = spec.buildRequests([defineParamsFunc(BANNER_BID, params)]);
      expect(request[0].data).to.not.have.string(`&${query}=`);

      params[param] = '';
      request = spec.buildRequests([defineParamsFunc(BANNER_BID, params)]);
      expect(request[0].data).to.not.have.string(`&${query}=`);

      const value = 'hoge';
      params[param] = value;
      request = spec.buildRequests([defineParamsFunc(BANNER_BID, params)]);
      expect(request[0].data).to.have.string(`&${query}=${value}`);
    });
  }

  beforeEach(function () {
    document.documentElement.innerHTML = '';
    const adTagParent = document.createElement('div');
    adTagParent.id = AD_UNIT_CODE;
    document.body.appendChild(adTagParent);
  });

  after(function () {
    document.documentElement.innerHTML = '';
    delete window[NATIVE_CALLBACK_KEY];
    delete window[NATIVE_OBJECT_KEY];
  });

  describe('isBidRequestValid', function () {
    it('should return true when params.zoneId exists and params.currency does not exist', function () {
      expect(spec.isBidRequestValid(BANNER_BID)).to.be.true;
    });

    it('should return true when params.zoneId and params.currency exist and params.currency is JPY or USD', function () {
      expect(
        spec.isBidRequestValid({
          ...BANNER_BID,
          params: { ...BANNER_BID.params, currency: 'JPY' },
        })
      ).to.be.true;
      expect(
        spec.isBidRequestValid({
          ...BANNER_BID,
          params: { ...BANNER_BID.params, currency: 'USD' },
        })
      ).to.be.true;
    });

    it('should return false when params.zoneId does not exist', function () {
      expect(spec.isBidRequestValid({ ...BANNER_BID, params: {} })).to.be.false;
    });

    it('should return false when params.zoneId and params.currency exist and params.currency is neither JPY nor USD', function () {
      expect(
        spec.isBidRequestValid({
          ...BANNER_BID,
          params: { ...BANNER_BID.params, currency: 'EUR' },
        })
      ).to.be.false;
    });

    it('should return true when the ad format is native and params.native.itemFormat exists and params.native.nativePostReplace exists', function () {
      expect(spec.isBidRequestValid(NATIVE_BID)).to.be.true;
    });

    it('should return false when the ad format is native and params.native does not exist', function () {
      expect(
        spec.isBidRequestValid({
          ...NATIVE_BID,
          params: { ...NATIVE_BID.params, native: undefined },
        })
      ).to.be.false;
    });

    it('should return false when the ad format is native and params.native.itemFormat does not exist or params.native.nativePostReplace does not exist', function () {
      expect(
        spec.isBidRequestValid({
          ...NATIVE_BID,
          params: {
            ...NATIVE_BID.params,
            native: { itemFormat: undefined },
          },
        })
      ).to.be.false;
      expect(
        spec.isBidRequestValid({
          ...NATIVE_BID,
          params: {
            ...NATIVE_BID.params,
            native: { nativePostReplace: undefined },
          },
        })
      ).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('should changes the endpoint with banner ads or naive ads', function () {
      const request = spec.buildRequests([BANNER_BID, NATIVE_BID]);
      expect(request[0].url).to.equal(BANNER_ENDPOINT);
      expect(request[1].url).to.equal(NATIVE_ENDPOINT);
    });

    it('should return a ServerRequest where the bid is a bid for validBidRequests', function () {
      const request = spec.buildRequests([BANNER_BID, NATIVE_BID]);
      expect(request[0].bid).to.equal(BANNER_BID);
      expect(request[1].bid).to.equal(NATIVE_BID);
    });

    describe('QueryStringParameters', function () {
      it('should sets the value of the zoneid query to bid.params.zoneId', function () {
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data).to.have.string(
          `zoneid=${BANNER_BID.params.zoneId}`
        );
      });

      it('should sets the values for loc and referer queries when bidderRequest.refererInfo.referer has a value', function () {
        const referer = 'https://example.com/';
        const request = spec.buildRequests([BANNER_BID], {
          refererInfo: { legacy: { referer: referer }, ref: referer },
        });
        expect(request[0].data).to.have.string(
          `&loc=${encodeURIComponent(referer)}`
        );
        expect(request[0].data).to.have.string(
          `&referer=${encodeURIComponent(referer)}`
        );
      });

      it('should makes the values of loc query and referer query geparams value when bidderRequest.refererInfo.referer is a falsy value', function () {
        const loc = 'https://www.google.com/';
        const referer = 'https://example.com/';
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { loc: loc, ref: referer }),
        ]);
        expect(request[0].data).to.have.string(
          `&loc=${encodeURIComponent(encodeURIComponent(loc))}`
        );
        expect(request[0].data).to.have.string(
          `&referer=${encodeURIComponent(encodeURIComponent(referer))}`
        );
      });

      it('should sets the value of the ct0 query to geparams.ct0', function () {
        const ct0 = 'hoge';
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { ct0: ct0 }),
        ]);
        expect(request[0].data).to.have.string(`&ct0=${ct0}`);
      });

      it('should replaces currency with JPY if there is no currency provided', function () {
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data).to.have.string('&cur=JPY&');
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
        expect(request[0].data).to.have.string('&cur=JPY&');
        expect(request[1].data).to.have.string('&cur=USD&');
      });

      it('should makes invalidImpBeacon the value of params.invalidImpBeacon when params.invalidImpBeacon exists', function () {
        const request = spec.buildRequests([
          {
            ...BANNER_BID,
            params: { ...BANNER_BID.params, invalidImpBeacon: true },
          },
          {
            ...BANNER_BID,
            params: { ...BANNER_BID.params, invalidImpBeacon: false },
          },
        ]);
        expect(request[0].data).to.have.string('&ib=0&');
        expect(request[1].data).to.have.string('&ib=1&');
      });

      it('should not sets the value of the adtk query when geparams.lat does not exist', function () {
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data).to.not.have.string('&adtk=');
      });

      it('should sets the value of the adtk query to 0 when geparams.lat is truthy value', function () {
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { lat: 1 }),
        ]);
        expect(request[0].data).to.have.string('&adtk=0&');
      });

      it('should sets the value of the adtk query to 1 when geparams.lat is falsy value', function () {
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { lat: 0 }),
        ]);
        expect(request[0].data).to.have.string('&adtk=1&');
      });

      it('should sets the value of the idfa query to geparams.idfa', function () {
        const idfa = 'hoge';
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { idfa: idfa }),
        ]);
        expect(request[0].data).to.have.string(`&idfa=${idfa}`);
      });

      it('should set the sw query to screen.height and the sh query to screen.width when screen.width is greater than screen.height', function () {
        const width = 1440;
        const height = 900;
        const stub = sinon.stub(window, 'screen').get(function () {
          return { width: width, height: height };
        });
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data).to.have.string(`&sw=${height}&sh=${width}`);
        stub.restore();
      });

      it('should set the sw query to screen.width and the sh query to screen.height when screen.width is not greater than screen.height', function () {
        const width = 411;
        const height = 731;
        const stub = sinon.stub(window, 'screen').get(function () {
          return { width: width, height: height };
        });
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data).to.have.string(`&sw=${width}&sh=${height}`);
        stub.restore();
      });

      hasParamsNotBlankStringTest(true, 'zip', 'zip');
      hasParamsNotBlankStringTest(true, 'country', 'country');
      hasParamsNotBlankStringTest(true, 'city', 'city');
      hasParamsNotBlankStringTest(true, 'long', 'long');
      hasParamsNotBlankStringTest(true, 'lati', 'lati');

      it('should set the custom query to geparams.custom', function () {
        const params = {
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
        expect(request[0].data).to.not.have.string('&custom_c1=');
        expect(request[0].data).to.not.have.string('&custom_c2=');
        expect(request[0].data).to.not.have.string('&custom_c3=');
        expect(request[0].data).to.have.string(
          `&custom_c4=${params.custom.c4}`
        );
      });

      hasParamsNotBlankStringTest(false, 'ver', 'gc_ver');
      hasParamsNotBlankStringTest(false, 'minor', 'gc_minor');
      hasParamsNotBlankStringTest(false, 'value', 'gc_value');

      it('should sets the value of the gfuid query to geparams.gfuid when media type is native', function () {
        const gfuid = 'hoge';
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { gfuid: gfuid }),
          getGeparamsDefinedBid(NATIVE_BID, { gfuid: gfuid }),
        ]);
        expect(request[0].data).to.not.have.string(`&gfuid=`);
        expect(request[1].data).to.have.string(`&gfuid=${gfuid}`);
      });

      it('should sets the value of the adt query to geparams.adt when media type is native', function () {
        const adt = 'hoge';
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { adt: adt }),
          getGeparamsDefinedBid(NATIVE_BID, { adt: adt }),
        ]);
        expect(request[0].data).to.not.have.string(`&adt=`);
        expect(request[1].data).to.have.string(`&adt=${adt}`);
      });

      it('should adds a query for naive ads and no query for banner ads', function () {
        // const query = '&tkf=1&ad_track=1&apiv=1.1.0';
        const query = '&apiv=1.1.0&tkf=1&ad_track=1';
        const request = spec.buildRequests([BANNER_BID, NATIVE_BID]);
        expect(request[0].data).to.not.have.string(query);
        expect(request[1].data).to.have.string(query);
      });

      it('should sets the value of the apid query to geparams.bundle when media type is banner', function () {
        const bundle = 'hoge';
        const request = spec.buildRequests([
          getGeparamsDefinedBid(BANNER_BID, { bundle: bundle }),
          getGeparamsDefinedBid(NATIVE_BID, { bundle: bundle }),
        ]);
        expect(request[0].data).to.have.string(`&apid=${bundle}`);
        expect(request[1].data).to.not.have.string(`&apid=`);
      });

      it('should not include the extuid query when it does not contain the imuid cookie', function () {
        const stub = sinon.stub(document, 'cookie').get(function () {
          return '';
        });
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data).to.not.have.string('&extuid=');
        stub.restore();
      });

      it('should include an extuid query when it contains an imuid cookie', function () {
        const imuid = 'b.a4ad1d3eeb51e600';
        const stub = sinon.stub(document, 'cookie').get(function () {
          return `_im_uid.3929=${imuid}`;
        });
        const request = spec.buildRequests([BANNER_BID]);
        expect(request[0].data).to.have.string(
          `&extuid=${encodeURIComponent(`im:${imuid}`)}`
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
    const nativeResponse = {};
    nativeResponse[ZONE_ID] = {
      ...response[ZONE_ID],
      title: 'aaa',
      description: 'iii',
      cta: 'uuu',
      advertiser: 'eee',
      landingURL: 'https://example.com/',
      trackings: 'ooo',
    };
    const nativeVideoResponse = {};
    nativeVideoResponse[ZONE_ID] = {
      ...nativeResponse[ZONE_ID],
      vast_xml: encodeURIComponent('<?xml version="1.0" encoding="UTF-8" standalone="no"?><VAST version="3.0"><Ad id="98765"></Ad></VAST>'),
      item_format_url: '\/\/js.gsspcln.jp\/m\/0_1234567890.json',
      video_player_url: '\/\/js.gsspcln.jp\/j\/gnvp.20210317.min.js',
      video_renderer_url: '\/\/js.gsspcln.jp\/j\/gnvp.tagrd.20210317.min.js',
    };
    const expected = {
      requestId: response[ZONE_ID].requestid,
      cpm: response[ZONE_ID].price,
      creativeId: response[ZONE_ID].creativeId,
      netRevenue: true,
      currency: 'JPY',
      ttl: 700,
      width: response[ZONE_ID].width + 'px',
      height: response[ZONE_ID].height + 'px',
    };
    const expectedNative = {
      ...expected,
      mediaType: 'native',
      native: {
        title: nativeResponse[ZONE_ID].title,
        body: nativeResponse[ZONE_ID].description,
        cta: nativeResponse[ZONE_ID].cta,
        sponsoredBy: nativeResponse[ZONE_ID].advertiser,
        clickUrl: encodeURIComponent(nativeResponse[ZONE_ID].landingURL),
        impressionTrackers: nativeResponse[ZONE_ID].trackings,
      },
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

    it('should sets the response correctly when it is a native ad', function () {
      const request = spec.buildRequests([NATIVE_BID])[0];
      const result = spec.interpretResponse(
        { body: getNativeResponseBody(nativeResponse) },
        request
      );
      expect(result[0]).to.have.deep.equal({
        ...expectedNative,
        ad: '<body marginwidth="0" marginheight="0"><script type=\'text/javascript\'>window.parent.gnnative_1234567.targetWindow=window;window.parent.' + getNativeResponseBody(nativeResponse) + '</script></body>',
      });
    });

    it('should sets the response correctly when it is a native video ad', function () {
      const request = spec.buildRequests([NATIVE_BID])[0];
      const result = spec.interpretResponse(
        { body: getNativeResponseBody(nativeVideoResponse) },
        request
      );
      expect(result[0]).to.have.deep.equal({
        ...expectedNative,
        ad: '<body marginwidth="0" marginheight="0"><script type=\'text/javascript\'>window.parent.gnnative_1234567.targetWindow=window;window.parent.' + getNativeResponseBody(nativeVideoResponse) + '</script></body>',
      });
    });

    it('should sets native.image when there are screenshots in the response in the native ad', function () {
      const screenshots = {
        url: 'https://example.com/',
        width: 336,
        height: 280,
      };
      const nativeImageResponse = { ...nativeResponse };
      nativeImageResponse[ZONE_ID].screenshots = screenshots;
      const expectedNativeImage = {
        ...expectedNative,
        ad: '<body marginwidth="0" marginheight="0"><script type=\'text/javascript\'>window.parent.gnnative_1234567.targetWindow=window;window.parent.' + getNativeResponseBody(nativeImageResponse) + '</script></body>',
      };
      expectedNativeImage.native.image = screenshots;
      const request = spec.buildRequests([NATIVE_BID])[0];
      const result = spec.interpretResponse(
        { body: getNativeResponseBody(nativeImageResponse) },
        request
      );
      expect(result[0]).to.have.deep.equal(expectedNativeImage);
    });

    it('should sets native.icon when there is an icon in the response in the native ad', function () {
      const icon = {
        url: 'https://example.com/',
        width: 300,
        height: 250,
      };
      const nativeIconResponse = { ...nativeResponse };
      nativeIconResponse[ZONE_ID].icon = icon;
      const expectedNativeIcon = {
        ...expectedNative,
        ad: '<body marginwidth="0" marginheight="0"><script type=\'text/javascript\'>window.parent.gnnative_1234567.targetWindow=window;window.parent.gnnative_1234567_callback({"1234567":{"creativeId":"<!-- CREATIVE ID -->","cur":"JPY","price":0.092,"width":300,"height":250,"requestid":"2e42361a6172bf","adm":"<!-- ADS TAG -->","title":"aaa","description":"iii","cta":"uuu","advertiser":"eee","landingURL":"https://example.com/","trackings":"ooo","screenshots":{"url":"https://example.com/","width":336,"height":280},"icon":{"url":"https://example.com/","width":300,"height":250}}});</script></body>',
      };
      expectedNativeIcon.native.icon = icon;
      const request = spec.buildRequests([NATIVE_BID])[0];
      const result = spec.interpretResponse(
        { body: getNativeResponseBody(nativeIconResponse) },
        request
      );
      expect(result[0]).to.have.deep.equal(expectedNativeIcon);
    });

    describe('when the response is a native ad', function () {
      it('should define a callback function called in the server response', function () {
        const request = spec.buildRequests([NATIVE_BID])[0];
        spec.interpretResponse(
          { body: getNativeResponseBody(nativeResponse) },
          request
        );

        expect(window).to.have.own.property(NATIVE_CALLBACK_KEY).that.is.a('function');
      });

      it('should define a window object to render native ad', function () {
        const { native } = NATIVE_BID.params;
        const request = spec.buildRequests([NATIVE_BID])[0];
        spec.interpretResponse(
          { body: getNativeResponseBody(nativeResponse) },
          request
        );

        expect(window).to.have.own.property(NATIVE_OBJECT_KEY).that.is.a('object');
        expect(window[NATIVE_OBJECT_KEY]).to.have.deep.include({
          targetWindow: null,
          itemFormat: native.itemFormat,
          zoneid: ZONE_ID,
        });
        expect(window[NATIVE_OBJECT_KEY]).to.have.own.property('write_native_ad').that.is.a('function');
      });

      it('the callback function should calls write_native_ad function', function() {
        const request = spec.buildRequests([NATIVE_BID])[0];
        spec.interpretResponse(
          { body: getNativeResponseBody(nativeResponse) },
          request
        );

        window[NATIVE_OBJECT_KEY].write_native_ad = sinon.spy();
        window[NATIVE_CALLBACK_KEY].call(null, nativeResponse);
        assert(window[NATIVE_OBJECT_KEY].write_native_ad.calledOnce);
      });
    });

    describe('when the response is a native video ad', function () {
      it('should define a callback function called in the server response', function () {
        const request = spec.buildRequests([NATIVE_BID])[0];
        spec.interpretResponse(
          { body: getNativeResponseBody(nativeVideoResponse) },
          request
        );

        expect(window).to.have.own.property(NATIVE_CALLBACK_KEY).that.is.a('function');
      });

      it('should define a window object to render native video ad', function () {
        const { native } = NATIVE_BID.params;
        const request = spec.buildRequests([NATIVE_BID])[0];
        spec.interpretResponse(
          { body: getNativeResponseBody(nativeVideoResponse) },
          request
        );

        expect(window).to.have.own.property(NATIVE_OBJECT_KEY).that.is.a('object');
        expect(window[NATIVE_OBJECT_KEY]).to.have.deep.include({
          targetWindow: null,
          itemFormat: native.itemFormat,
          zoneid: ZONE_ID,
        });
        expect(window[NATIVE_OBJECT_KEY]).to.have.own.property('write_native_video_ad').that.is.a('function');
      });

      it('the callback function should calls write_native_video_ad function', function() {
        const request = spec.buildRequests([NATIVE_BID])[0];
        spec.interpretResponse(
          { body: getNativeResponseBody(nativeVideoResponse) },
          request
        );

        window[NATIVE_OBJECT_KEY].write_native_video_ad = sinon.spy();
        window[NATIVE_CALLBACK_KEY].call(null, nativeVideoResponse);
        assert(window[NATIVE_OBJECT_KEY].write_native_video_ad.calledOnce);
      });
    });
  });
});
