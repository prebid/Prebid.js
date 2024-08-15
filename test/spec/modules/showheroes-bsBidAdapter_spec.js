import { expect } from 'chai'
import { spec } from 'modules/showheroes-bsBidAdapter.js'
import { syncAddFPDToBidderRequest } from '../../helpers/fpd.js';
import 'modules/priceFloors.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';
import 'modules/schain.js';
import { VIDEO, BANNER } from 'src/mediaTypes.js'

const bidderRequest = {
  refererInfo: {
    page: 'https://example.com/home',
    ref: 'https://referrer'
  }
}

const adomain = ['showheroes.com'];

const gdpr = {
  gdprConsent: {
    apiVersion: 2,
    consentString: 'CONSENT',
    vendorData: { purpose: { consents: { 1: true } } },
    gdprApplies: true,
  }
}

const uspConsent = '1---';

const schain = {
  schain: {
    validation: 'strict',
    config: {
      ver: '1.0',
      complete: 1,
      nodes: [
        {
          asi: 'some.com',
          sid: '00001',
          hp: 1
        }
      ]
    }
  }
}

const bidRequestCommonParamsV2 = {
  bidder: 'showheroes-bs',
  params: {
    unitId: 'AACBWAcof-611K4U',
  },
  adUnitCode: 'adunit-code-1',
  bidId: '38b373e1e31c18',
  bidderRequestId: '12e3ade2543ba6',
  auctionId: '43aa080090a47f',
}

const bidRequestVideoV2 = {
  ...bidRequestCommonParamsV2,
  ...{
    mediaTypes: {
      video: {
        playerSize: [640, 480],
        context: 'instream',
      }
    }
  }
}

const bidRequestOutstreamV2 = {
  ...bidRequestCommonParamsV2,
  ...{
    mediaTypes: {
      video: {
        playerSize: [640, 480],
        context: 'outstream'
      },
    }
  }
}

const bidRequestBanner = {
  ...bidRequestCommonParamsV2,
  ...{
    mediaTypes: {
      banner: {
        sizes: [[640, 360]]
      }
    }
  }
}

const bidRequestVideoAndBanner = {
  ...bidRequestCommonParamsV2,
  mediaTypes: {
    ...bidRequestBanner.mediaTypes,
    ...bidRequestVideoV2.mediaTypes
  }
}

describe('shBidAdapter', () => {
  it('validates request', () => {
    const bid = {
      params: {
        testKey: 'testValue',
      },
    };
    expect(spec.isBidRequestValid(bid)).to.eql(false);
    bid.params = {
      unitId: 'test_unit',
    };
    expect(spec.isBidRequestValid(bid)).to.eql(true);
  });

  it('passes gdpr, usp, schain, floor in ortb request', () => {
    const bidRequest = Object.assign({}, bidRequestVideoV2)
    const fullRequest = {
      bids: [bidRequestVideoV2],
      ...bidderRequest,
      ...gdpr,
      ...schain,
      ...{ uspConsent: uspConsent },
    };
    bidRequest.schain = schain.schain.config;
    const getFloorResponse = { currency: 'EUR', floor: 3 };
    bidRequest.getFloor = () => getFloorResponse;
    const request = spec.buildRequests([bidRequest], syncAddFPDToBidderRequest(fullRequest));
    const payload = request.data;
    expect(payload.regs.ext.gdpr).to.eql(Number(gdpr.gdprConsent.gdprApplies));
    expect(payload.regs.ext.us_privacy).to.eql(uspConsent);
    expect(payload.user.ext.consent).to.eql(gdpr.gdprConsent.consentString);
    expect(payload.source.ext.schain).to.eql(bidRequest.schain);
    expect(payload.test).to.eql(0);
    expect(payload.imp[0].bidfloor).eql(3);
    expect(payload.imp[0].bidfloorcur).eql('EUR');
    expect(payload.site.page).to.eql('https://example.com/home');
    expect(payload.device.ua).to.undefined;
    expect(payload.device.sua).to.undefined;
  });

  it('override QA params', () => {
    const bidRequest = Object.assign({}, bidRequestVideoV2)
    const fullRequest = {
      bids: [bidRequestVideoV2],
    };
    const bidEndpoint = 'https://bidder.com/endpoint';
    const fakePageURL = 'https://testing.page.com/'
    bidRequest.params.qa = {
      endpoint: bidEndpoint,
      pageURL: fakePageURL,
    };
    const request = spec.buildRequests([bidRequest], syncAddFPDToBidderRequest(fullRequest));
    expect(request.url).to.eql(bidEndpoint);
    expect(request.data.site.page).to.eql(fakePageURL)
    expect(request.data.site.domain).to.eql('testing.page.com');
    expect(request.data.test).to.eql(1);
  });

  // it('handle banner and video', () => {
  //   const bidRequest = Object.assign({}, bidRequestVideoAndBanner)
  //   const fullRequest = {
  //     bids: [bidRequest],
  //   };
  //   const request = spec.buildRequests([bidRequest], syncAddFPDToBidderRequest(fullRequest));
  //   const payload = request.data;

  //   expect(payload.imp[0].video).to.be.a('object');
  //   expect(payload.imp[0].ext.mediaType).eql('instream')
  //   expect(payload.imp[0].banner).to.be.undefined;
  //   const requestBanner = Object.assign({}, bidRequestBanner)
  //   const fullRequestBanner = {
  //     bids: [requestBanner],
  //   };
  //   const bannerORTB = spec.buildRequests([requestBanner], syncAddFPDToBidderRequest(fullRequestBanner));
  //   const payloadBanner = bannerORTB.data;

  //   expect(payloadBanner.imp[0].banner).to.be.a('object');
  //   expect(payloadBanner.imp[0].ext.mediaType).eql('banner')
  //   expect(payloadBanner.imp[0].video).to.be.undefined;
  // });

  describe('interpretResponse', function () {
    it('handles nobid responses', function () {
      expect(spec.interpretResponse({ body: {} }, { data: { meta: {} } }).length).to.equal(0)
      expect(spec.interpretResponse({ body: [] }, { data: { meta: {} } }).length).to.equal(0)
    })

    const vastXml = '<?xml version="1.0" encoding="utf-8"?><VAST version="3.0"><Error><![CDATA[https://static.showheroes.com/shim.gif]]></Error></VAST>'

    const basicResponse = {
      cpm: 5,
      currency: 'EUR',
      mediaType: VIDEO,
      context: 'instream',
      bidId: '38b373e1e31c18',
      size: { 'width': 640, 'height': 480 },
      vastTag: 'https:\/\/test.com\/commercial\/wrapper?player_id=47427aa0-f11a-4d24-abca-1295a46a46cd&ad_bidder=showheroes-bs&master_shadt=1&description_url=https%3A%2F%2Fbid-service.stage.showheroes.com%2Fvast%2Fad%2Fcache%2F4840b920-40e1-4e09-9231-60bbf088c8d6',
      vastXml: vastXml,
      adomain: adomain,
    };

    const responseBanner = {
      'bids': [{
        ...basicResponse,
        'mediaType': BANNER,
      }],
    };

    const basicResponseV2 = {
      requestId: '38b373e1e31c18',
      adUnitCode: 'adunit-code-1',
      cpm: 1,
      currency: 'EUR',
      width: 640,
      height: 480,
      advertiserDomain: [],
      callbacks: {
        won: ['https://test.com/track/?ver=15&session_id=01ecd03ce381505ccdeb88e555b05001&category=request_session&type=event&request_session_id=01ecd03ce381505ccdeb88e555b05001&label=prebid_won&reason=ok']
      },
      vastXml: vastXml,
      mediaType: 'video',
      adomain: adomain,
    };

    const vastUrl = 'https://test.com/vast/?zid=AACBWAcof-611K4U&u=https://example.org/?foo=bar&gdpr=0&cs=XXXXXXXXXXXXXXXXXXXX&sid=01ecd03ce381505ccdeb88e555b05001&width=300&height=200&prebidmode=1'

    const responseVideoV2 = {
      bidResponses: [{
        ...basicResponseV2,
        context: 'instream',
        vastUrl: vastUrl,
      }],
    };

    const responseVideoOutstreamV2 = {
      bidResponses: [{
        ...basicResponseV2,
        context: 'outstream',
        ad: '<script id="testScript" data-wid="auto" type="text/javascript" src="https://test.tv/display/?zid=AACBTwsZVANd9NlB&u=https%3A%2F%2Fexample.org%2F%3Ffoo%3Dbar&gdpr=0&cs=XXXXXXXXXXXXXXXXXXXX&sid=01ececb3b4c19270d6a77ccf75433001&width=300&height=200&prebidmode=1"></script>',
        vastUrl: vastUrl,
      }],
    };

    it('should get correct bid response when type is video (V2)', function () {
      const request = spec.buildRequests([bidRequestVideoV2], bidderRequest)
      const expectedResponse = [
        {
          cpm: 1,
          creativeId: 'c_38b373e1e31c18',
          adUnitCode: 'adunit-code-1',
          currency: 'EUR',
          width: 640,
          height: 480,
          mediaType: 'video',
          netRevenue: true,
          vastUrl: vastUrl,
          requestId: '38b373e1e31c18',
          ttl: 300,
          meta: {
            advertiserDomains: adomain
          },
          vastXml: vastXml,
          adResponse: {
            content: vastXml,
          },
        }
      ]

      const result = spec.interpretResponse({ 'body': responseVideoV2 }, request)
      expect(result).to.deep.equal(expectedResponse)
    })

    it('should get correct bid response when type is banner', function () {
      const request = spec.buildRequests([bidRequestBanner], bidderRequest)

      const result = spec.interpretResponse({ 'body': responseBanner }, request)
      expect(result[0]).to.have.property('mediaType', BANNER);
      expect(result[0].ad).to.include('<script async src="https://static.showheroes.com/publishertag.js')
      expect(result[0].ad).to.include('<div class="showheroes-spot"')
    })

    it('should get correct bid response when type is outstream (slot V2)', function () {
      const bidRequestV2 = JSON.parse(JSON.stringify(bidRequestOutstreamV2));
      const slotId = 'testSlot2'
      bidRequestV2.params.outstreamOptions = {
        slot: slotId
      }

      const container = document.createElement('div')
      container.setAttribute('id', slotId)
      document.body.appendChild(container)

      const request = spec.buildRequests([bidRequestV2], bidderRequest)

      const result = spec.interpretResponse({ 'body': responseVideoOutstreamV2 }, request)
      const bid = result[0]
      expect(bid).to.have.property('mediaType', VIDEO);
    })

    it('should get correct bid response when type is outstream (customRender)', function () {
      const bidRequest = JSON.parse(JSON.stringify(bidRequestOutstreamV2));

      const request = spec.buildRequests([bidRequest], bidderRequest)

      const result = spec.interpretResponse({ 'body': responseVideoOutstreamV2 }, request)
      const bid = result[0];
      expect(bid).to.have.property('mediaType', VIDEO);

      expect(bid.vastXml).to.eql(vastXml);
      expect(bid.vastUrl).to.equal(vastUrl);
    })
  });

  describe('getUserSyncs', function () {
    const response = [{
      body: {
        userSync: {
          iframes: ['https://sync.showheroes.com/iframe'],
          pixels: ['https://sync.showheroes.com/pixel']
        }
      }
    }]

    it('empty', function () {
      let result = spec.getUserSyncs({}, []);

      expect(result).to.deep.equal([]);
    });

    it('iframe', function () {
      let result = spec.getUserSyncs({
        iframeEnabled: true
      }, response);

      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.equal('https://sync.showheroes.com/iframe');
    });

    it('pixel', function () {
      let result = spec.getUserSyncs({
        pixelEnabled: true
      }, response);

      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.equal('https://sync.showheroes.com/pixel');
    });
  });
});
