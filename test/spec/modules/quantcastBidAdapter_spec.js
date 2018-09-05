import * as utils from 'src/utils';
import { expect } from 'chai';
import {
  QUANTCAST_DOMAIN,
  QUANTCAST_TEST_DOMAIN,
  QUANTCAST_NET_REVENUE,
  QUANTCAST_TTL,
  QUANTCAST_TEST_PUBLISHER,
  QUANTCAST_PROTOCOL,
  QUANTCAST_PORT,
  spec as qcSpec
} from '../../../modules/quantcastBidAdapter';
import { newBidder } from '../../../src/adapters/bidderFactory';
import { parse } from 'src/url';

describe('Quantcast adapter', function () {
  const quantcastAdapter = newBidder(qcSpec);
  let bidRequest;

  beforeEach(function () {
    bidRequest = {
      bidder: 'quantcast',
      bidId: '2f7b179d443f14',
      auctionId: '595ffa73-d78a-46c9-b18e-f99548a5be6b',
      bidderRequestId: '1cc026909c24c8',
      placementCode: 'div-gpt-ad-1438287399331-0',
      params: {
        publisherId: QUANTCAST_TEST_PUBLISHER, // REQUIRED - Publisher ID provided by Quantcast
        battr: [1, 2] // OPTIONAL - Array of blocked creative attributes as per OpenRTB Spec List 5.3
      },
      sizes: [[300, 250]]
    };
  });

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(quantcastAdapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('`isBidRequestValid`', function () {
    it('should return `false` when bid is not passed', function () {
      expect(qcSpec.isBidRequestValid()).to.equal(false);
    });

    it('should return `false` when bid `mediaType` is `video`', function () {
      const bidRequest = { mediaType: 'video' };

      expect(qcSpec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return `true` when bid contains required params', function () {
      const bidRequest = { mediaType: 'banner' };

      expect(qcSpec.isBidRequestValid(bidRequest)).to.equal(true);
    });
  });

  describe('`buildRequests`', function () {
    it('selects protocol and port', function () {
      switch (window.location.protocol) {
        case 'https:':
          expect(QUANTCAST_PROTOCOL).to.equal('https');
          expect(QUANTCAST_PORT).to.equal('8443');
          break;
        default:
          expect(QUANTCAST_PROTOCOL).to.equal('http');
          expect(QUANTCAST_PORT).to.equal('8080');
          break;
      }
    });

    it('sends bid requests to Quantcast Canary Endpoint if `publisherId` is `test-publisher`', function () {
      const requests = qcSpec.buildRequests([bidRequest]);
      const url = parse(requests[0]['url']);
      expect(url.hostname).to.equal(QUANTCAST_TEST_DOMAIN);
    });

    it('sends bid requests to default endpoint for non standard publisher IDs', function () {
      const modifiedBidRequest = Object.assign({}, bidRequest, {
        params: Object.assign({}, bidRequest.params, {
          publisherId: 'foo-bar',
        }),
      });
      const requests = qcSpec.buildRequests([modifiedBidRequest]);
      expect(requests[0]['url']).to.equal(
        `${QUANTCAST_PROTOCOL}://${QUANTCAST_DOMAIN}:${QUANTCAST_PORT}/qchb`
      );
    });

    it('sends bid requests to Quantcast Header Bidding Endpoints via POST', function () {
      const requests = qcSpec.buildRequests([bidRequest]);

      expect(requests[0].method).to.equal('POST');
    });

    it('sends bid requests contains all the required parameters', function () {
      const referrer = utils.getTopWindowUrl();
      const loc = utils.getTopWindowLocation();
      const domain = loc.hostname;

      const requests = qcSpec.buildRequests([bidRequest]);
      const expectedBidRequest = {
        publisherId: QUANTCAST_TEST_PUBLISHER,
        requestId: '2f7b179d443f14',
        imp: [
          {
            banner: {
              battr: [1, 2],
              sizes: [{ width: 300, height: 250 }]
            },
            placementCode: 'div-gpt-ad-1438287399331-0',
            bidFloor: 1e-10
          }
        ],
        site: {
          page: loc.href,
          referrer,
          domain
        },
        bidId: '2f7b179d443f14',
        gdprSignal: 0
      };

      expect(requests[0].data).to.equal(JSON.stringify(expectedBidRequest));
    });
  });

  it('propagates GDPR consent string and signal', function () {
    const gdprConsent = { gdprApplies: true, consentString: 'consentString' }
    const requests = qcSpec.buildRequests([bidRequest], { gdprConsent });
    const parsed = JSON.parse(requests[0].data)
    expect(parsed.gdprSignal).to.equal(1);
    expect(parsed.gdprConsent).to.equal(gdprConsent.consentString);
  });

  describe('`interpretResponse`', function () {
    // The sample response is from https://wiki.corp.qc/display/adinf/QCX
    const body = {
      bidderCode: 'qcx', // Renaming it to use CamelCase since that is what is used in the Prebid.js variable name
      requestId: 'erlangcluster@qa-rtb002.us-ec.adtech.com-11417780270886458', // Added this field. This is not used now but could be useful in troubleshooting later on. Specially for sites using iFrames
      bids: [
        {
          statusCode: 1,
          placementCode: 'imp1', // Changing this to placementCode to be reflective
          cpm: 4.5,
          currency: 'USD',
          ad:
            '<!DOCTYPE html><div style="height: 250; width: 300; display: table-cell; vertical-align: middle;"><div style="width: 300px; margin-left: auto; margin-right: auto;"><script src="https://adserver.adtechus.com/addyn/3.0/5399.1/2394397/0/-1/QUANTCAST;size=300x250;target=_blank;alias=;kvp36=;sub1=;kvl=;kvc=;kvs=300x250;kvi=;kva=;sub2=;rdclick=http://exch.quantserve.com/r?a=;labels=_qc.clk,_click.adserver.rtb,_click.rand.;rtbip=;rtbdata2=;redirecturl2=" type="text/javascript"></script><img src="https://exch.quantserve.com/pixel/p_12345.gif?media=ad&p=&r=&rand=&labels=_qc.imp,_imp.adserver.rtb&rtbip=&rtbdata2=" style="display: none;" border="0" height="1" width="1" alt="Quantcast"/></div></div>',
          creativeId: 1001,
          width: 300,
          height: 250
        }
      ]
    };

    const response = {
      body,
      headers: {}
    };

    it('should return an empty array if `serverResponse` is `undefined`', function () {
      const interpretedResponse = qcSpec.interpretResponse();

      expect(interpretedResponse.length).to.equal(0);
    });

    it('should return an empty array if the parsed response does NOT include `bids`', function () {
      const interpretedResponse = qcSpec.interpretResponse({});

      expect(interpretedResponse.length).to.equal(0);
    });

    it('should return an empty array if the parsed response has an empty `bids`', function () {
      const interpretedResponse = qcSpec.interpretResponse({ bids: [] });

      expect(interpretedResponse.length).to.equal(0);
    });

    it('should get correct bid response', function () {
      const expectedResponse = {
        requestId: 'erlangcluster@qa-rtb002.us-ec.adtech.com-11417780270886458',
        cpm: 4.5,
        width: 300,
        height: 250,
        ad:
          '<!DOCTYPE html><div style="height: 250; width: 300; display: table-cell; vertical-align: middle;"><div style="width: 300px; margin-left: auto; margin-right: auto;"><script src="https://adserver.adtechus.com/addyn/3.0/5399.1/2394397/0/-1/QUANTCAST;size=300x250;target=_blank;alias=;kvp36=;sub1=;kvl=;kvc=;kvs=300x250;kvi=;kva=;sub2=;rdclick=http://exch.quantserve.com/r?a=;labels=_qc.clk,_click.adserver.rtb,_click.rand.;rtbip=;rtbdata2=;redirecturl2=" type="text/javascript"></script><img src="https://exch.quantserve.com/pixel/p_12345.gif?media=ad&p=&r=&rand=&labels=_qc.imp,_imp.adserver.rtb&rtbip=&rtbdata2=" style="display: none;" border="0" height="1" width="1" alt="Quantcast"/></div></div>',
        ttl: QUANTCAST_TTL,
        creativeId: 1001,
        netRevenue: QUANTCAST_NET_REVENUE,
        currency: 'USD'
      };
      const interpretedResponse = qcSpec.interpretResponse(response);

      expect(interpretedResponse[0]).to.deep.equal(expectedResponse);
    });

    it('handles no bid response', function () {
      const body = {
        bidderCode: 'qcx', // Renaming it to use CamelCase since that is what is used in the Prebid.js variable name
        requestId: 'erlangcluster@qa-rtb002.us-ec.adtech.com-11417780270886458', // Added this field. This is not used now but could be useful in troubleshooting later on. Specially for sites using iFrames
        bids: []
      };
      const response = {
        body,
        headers: {}
      };
      const expectedResponse = [];
      const interpretedResponse = qcSpec.interpretResponse(response);

      expect(interpretedResponse.length).to.equal(0);
    });
  });
});
