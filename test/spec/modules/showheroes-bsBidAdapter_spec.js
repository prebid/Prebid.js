import { expect } from 'chai'
import { spec } from 'modules/showheroes-bsBidAdapter.js'
import { addFPDToBidderRequest } from '../../helpers/fpd.js';
import 'modules/priceFloors.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';
import 'modules/schain.js';
import { VIDEO } from 'src/mediaTypes.js'

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

  it('passes gdpr, usp, schain, floor in ortb request', async () => {
    const bidRequest = Object.assign({}, bidRequestVideoV2)
    const fullRequest = {
      bids: [bidRequestVideoV2],
      ...bidderRequest,
      ...gdpr,
      ...schain,
      ...{uspConsent: uspConsent},
    };
    bidRequest.schain = schain.schain.config;
    const getFloorResponse = {currency: 'EUR', floor: 3};
    bidRequest.getFloor = () => getFloorResponse;
    const request = spec.buildRequests([bidRequest], await addFPDToBidderRequest(fullRequest));
    const payload = request.data;
    expect(payload.regs.ext.gdpr).to.eql(Number(gdpr.gdprConsent.gdprApplies));
    expect(payload.regs.ext.us_privacy).to.eql(uspConsent);
    expect(payload.user.ext.consent).to.eql(gdpr.gdprConsent.consentString);
    expect(payload.source.ext.schain).to.eql(bidRequest.schain);
    expect(payload.test).to.eql(0);
    expect(payload.imp[0].bidfloor).eql(3);
    expect(payload.imp[0].bidfloorcur).eql('EUR');
    expect(payload.imp[0].displaymanager).eql('Prebid.js');
    expect(payload.site.page).to.eql('https://example.com/home');
  });

  describe('interpretResponse', function () {
    const vastXml = '<?xml version="1.0" encoding="utf-8"?><VAST version="3.0"><Error><![CDATA[https://static.showheroes.com/shim.gif]]></Error></VAST>'

    const callback_won = 'https://test.com/track/?ver=15&session_id=01ecd03ce381505ccdeb88e555b05001&category=request_session&type=event&request_session_id=01ecd03ce381505ccdeb88e555b05001&label=prebid_won&reason=ok'
    const basicResponse = {
      cur: 'EUR',
      seatbid: [{
        bid: [{
          price: 1,
          w: 640,
          h: 480,
          adm: vastXml,
          impid: '38b373e1e31c18',
          crid: 'c_38b373e1e31c18',
          adomain: adomain,
          ext: {
            callbacks: {
              won: [callback_won],
            },
            extra: 'test',
          },
        }],
        seat: 'showheroes',
      }]
    }
    const vastUrl = 'https://test.com/vast/?zid=AACBWAcof-611K4U&u=https://example.org/?foo=bar&gdpr=0&cs=XXXXXXXXXXXXXXXXXXXX&sid=01ecd03ce381505ccdeb88e555b05001&width=300&height=200&prebidmode=1'

    if (FEATURES.VIDEO) {
      it('should get correct bid response when type is video (V2)', function () {
        const request = spec.buildRequests([bidRequestVideoV2], bidderRequest)
        const expectedResponse = [
          {
            cpm: 1,
            creativeId: 'c_38b373e1e31c18',
            creative_id: 'c_38b373e1e31c18',
            currency: 'EUR',
            width: 640,
            height: 480,
            playerHeight: 480,
            playerWidth: 640,
            mediaType: 'video',
            netRevenue: true,
            requestId: '38b373e1e31c18',
            ttl: 300,
            meta: {
              advertiserDomains: adomain
            },
            vastXml: vastXml,
            callbacks: {
              won: [callback_won],
            },
            extra: 'test',
          }
        ]

        const result = spec.interpretResponse({ 'body': basicResponse }, request)
        expect(result).to.deep.equal(expectedResponse)
      })

      it('should get correct bid response when type is outstream (slot V2)', function () {
        window.myRenderer = {
          renderAd: function() {
            return null;
          }
        }
        const bidRequestV2 = JSON.parse(JSON.stringify(bidRequestOutstreamV2));
        const bidResponse = JSON.parse(JSON.stringify(basicResponse));
        bidResponse.seatbid[0].bid[0].ext.rendererConfig = {
          rendererUrl: 'https://test.com/render.js',
          renderFunc: 'myRenderer.renderAd',
          renderOptions: {
            key: 'my renderer custom value',
          }
        };
        const slotId = 'testSlot2'

        const container = document.createElement('div')
        container.setAttribute('id', slotId)
        document.body.appendChild(container)

        const request = spec.buildRequests([bidRequestV2], bidderRequest)

        const result = spec.interpretResponse({ 'body': bidResponse }, request)
        const bid = result[0]
        expect(bid).to.have.property('mediaType', VIDEO);
        expect(typeof bid.renderer).to.be.eql('object');
        expect(bid.renderer.url).to.eql('https://test.com/render.js');

        sinon.spy(window.myRenderer, 'renderAd');
        bid.renderer.render(bid);

        const renderCall = window.myRenderer.renderAd.getCall(0);
        const renderPayload = renderCall.args[0];
        expect(renderPayload.adResponse.content).to.eql(vastXml);
        expect(renderPayload.key).to.eql('my renderer custom value');
      })

      it('should get correct bid response when type is outstream (customRender)', function () {
        const bidRequest = JSON.parse(JSON.stringify(bidRequestOutstreamV2));

        const request = spec.buildRequests([bidRequest], bidderRequest)

        const result = spec.interpretResponse({ 'body': basicResponse }, request)
        const bid = result[0];
        expect(bid).to.have.property('mediaType', VIDEO);

        expect(bid.vastXml).to.eql(vastXml);
      })

      it('should get vast url', function () {
        const bidRequest = JSON.parse(JSON.stringify(bidRequestOutstreamV2));
        const bidResponse = JSON.parse(JSON.stringify(basicResponse));
        bidResponse.seatbid[0].bid[0].nurl = vastUrl

        const request = spec.buildRequests([bidRequest], bidderRequest)

        const result = spec.interpretResponse({ 'body': bidResponse }, request)
        const bid = result[0];
        expect(bid).to.have.property('mediaType', VIDEO);

        expect(bid.vastXml).to.eql(vastXml);
        expect(bid.vastUrl).to.eql(vastUrl);
      })
    }
  });

  describe('getUserSyncs', function () {
    const response = [{
      body: {
        ext: {
          userSync: {
            iframes: ['https://sync.showheroes.com/iframe'],
            pixels: ['https://sync.showheroes.com/pixel']
          }
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
