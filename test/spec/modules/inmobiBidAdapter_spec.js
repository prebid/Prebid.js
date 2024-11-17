import { expect } from 'chai';
import {
  spec,
} from 'modules/inmobiBidAdapter.js';
import * as utils from 'src/utils.js';
import * as ajax from 'src/ajax.js';
import { BANNER, NATIVE, VIDEO } from '../../../src/mediaTypes.js';
import { hook } from '../../../src/hook';
import { config } from '../../../src/config.js';
import { syncAddFPDToBidderRequest } from '../../helpers/fpd';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';
import 'modules/consentManagementGpp.js';
import 'modules/priceFloors.js';
import sinon from 'sinon';

// constants
const GVLID = 333;
export const ADAPTER_VERSION = 1.0;
const BIDDER_CODE = 'inmobi';
export const EVENT_ENDPOINT = 'https://sync.inmobi.com';

describe('The inmobi bidding adapter', function () {
  let utilsMock, sandbox, ajaxStub, fetchStub; ;

  beforeEach(function () {
    // mock objects
    utilsMock = sinon.mock(utils);
    sandbox = sinon.sandbox.create();
    ajaxStub = sandbox.stub(ajax, 'ajax');
    fetchStub = sinon.stub(global, 'fetch').resolves(new Response('OK'));
  });

  afterEach(function () {
    utilsMock.restore();
    sandbox.restore();
    ajaxStub.restore();
    fetchStub.restore();
  });

  describe('onBidWon', function () {
    // existence test
    it('onBidWon function should be defined', function () {
      expect(spec.onBidWon).to.exist.and.to.be.a('function');
    });

    it('It should invoke onBidWon, resolving the eventType and domain', function () {
      const bid = {
        bidder: 'inmobi',
        width: 300,
        height: 250,
        adId: '330a22bdea4cac1',
        mediaType: 'banner',
        cpm: 0.28,
        ad: 'inmobiAd',
        requestId: '418b37f85e772c1',
        adUnitCode: 'div-gpt-ad-1460505748561-01',
        size: '350x250',
        adserverTargeting: {
          hb_bidder: 'prebid',
          hb_adid: '330a22bdea4cac1',
          hb_pb: '0.20',
          hb_size: '350x250'
        },
        meta: {
          loggingPercentage: 100
        }
      };
      spec.onBidWon(bid);
      // expected url and payload
      const expectedUrl = `${EVENT_ENDPOINT}/report/onBidWon`;
      const expectedPayload = JSON.stringify({
        domain: location.hostname,
        eventPayload: bid.meta
      });
      // assert statements
      expect(fetchStub.callCount).to.be.equal(1);
      const fetchArgs = fetchStub.getCall(0).args;
      /*
                     index  fetch parameter
                     0 ->   URL
                     1 ->   options (method, headers, body, etc.)
                  */
      expect(fetchArgs[0]).to.equal(expectedUrl);
      const actualPayload = fetchArgs[1]?.body;
      expect(actualPayload).to.equal(expectedPayload);
      expect(fetchArgs[1]).to.deep.include({
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      });
      expect(fetchArgs[1]?.headers).to.deep.equal({
        'Content-Type': 'text/plain',
      });
    });

    it('onBidWon should not be called when loggingPercentage is set to 0', function () {
      const bid = {
        bidder: 'inmobi',
        width: 300,
        height: 250,
        adId: '330a22bdea4cac1',
        mediaType: 'banner',
        cpm: 0.28,
        ad: 'inmobiAd',
        requestId: '418b37f85e772c1',
        adUnitCode: 'div-gpt-ad-1460505748561-01',
        size: '350x250',
        adserverTargeting: {
          hb_bidder: 'prebid',
          hb_adid: '330a22bdea4cac1',
          hb_pb: '0.20',
          hb_size: '350x250'
        },
        meta: {
          loggingPercentage: 0
        }
      };
      spec.onBidWon(bid);
      // expected url and payload
      const expectedUrl = `${EVENT_ENDPOINT}/report/onBidWon`;
      const expectedPayload = JSON.stringify({
        domain: location.hostname,
        eventPayload: bid.meta
      });
      // assert statements
      expect(fetchStub.callCount).to.be.equal(0);
    });

    it('onBidWon should not be called if the bid data is null', function () {
      // Call onBidWon with null data
      spec.onBidWon(null);
      // Assert that ajax was not called since bid data is null
      expect(fetchStub.callCount).to.be.equal(0);
    });
  });

  describe('onBidderError', function () {
    it('onBidderError function should be defined', function () {
      expect(spec.onBidderError).to.exist.and.to.be.a('function');
    });

    it('onBidderError should not be called if the bid data is null', function () {
      // Call onBidError with null data
      spec.onBidderError(null);
      // Assert that ajax was not called since bid data is null
      expect(fetchStub.callCount).to.be.equal(0);
    });

    it('onBidderError should be called with the eventType', function () {
      const bid = {
        error: 'error', // Assuming this will be a mock or reference to an actual XMLHttpRequest object
        bidderRequest: {
          auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
          auctionStart: 1579746300522,
          bidder: 'inmobi',
          bidderRequestId: '15246a574e859f'
        }
      };
      spec.onBidderError(bid);
      // expected url and payload
      const expectedUrl = `${EVENT_ENDPOINT}/report/onBidderError`;
      const expectedPayload = JSON.stringify({
        domain: location.hostname,
        eventPayload: bid
      });
      // assert statements
      expect(fetchStub.callCount).to.be.equal(1);
      const fetchArgs = fetchStub.getCall(0).args;
      /*
                     index  fetch parameter
                     0 ->   URL
                     1 ->   options (method, headers, body, etc.)
                  */
      expect(fetchArgs[0]).to.equal(expectedUrl);
      const actualPayload = fetchArgs[1]?.body;
      expect(actualPayload).to.equal(expectedPayload);
      expect(fetchArgs[1]).to.deep.include({
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      });
      expect(fetchArgs[1]?.headers).to.deep.equal({
        'Content-Type': 'text/plain',
      });
    });
  });

  describe('onAdRenderSucceeded', function () {
    // existence test
    it('onAdRenderSucceeded function should be defined', function () {
      expect(spec.onAdRenderSucceeded).to.exist.and.to.be.a('function');
    });

    it('should invoke onAdRenderSucceeded, resolving the eventType and domain', function () {
      const bid = {
        bidder: 'inmobi',
        width: 300,
        height: 250,
        adId: '330a22bdea4cac1',
        mediaType: 'banner',
        cpm: 0.28,
        ad: 'inmobiAd',
        requestId: '418b37f85e772c1',
        adUnitCode: 'div-gpt-ad-1460505748561-01',
        size: '350x250',
        adserverTargeting: {
          hb_bidder: 'prebid',
          hb_adid: '330a22bdea4cac1',
          hb_pb: '0.20',
          hb_size: '350x250'
        },
        meta: {
          loggingPercentage: 100
        }
      };
      spec.onAdRenderSucceeded(bid);
      // expected url and payload
      const expectedUrl = `${EVENT_ENDPOINT}/report/onAdRenderSucceeded`;
      const expectedPayload = JSON.stringify({
        domain: location.hostname,
        eventPayload: bid.meta
      });
      // assert statements
      expect(fetchStub.callCount).to.be.equal(1);
      const fetchArgs = fetchStub.getCall(0).args;
      /*
                     index  fetch parameter
                     0 ->   URL
                     1 ->   options (method, headers, body, etc.)
                  */
      expect(fetchArgs[0]).to.equal(expectedUrl);
      const actualPayload = fetchArgs[1]?.body;
      expect(actualPayload).to.equal(expectedPayload);
      expect(fetchArgs[1]).to.deep.include({
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      });
      expect(fetchArgs[1]?.headers).to.deep.equal({
        'Content-Type': 'text/plain',
      });
    });

    it('onAdRenderSucceeded should not be called when loggingPercentage is 0', function () {
      const bid = {
        bidder: 'inmobi',
        width: 300,
        height: 250,
        adId: '330a22bdea4cac1',
        mediaType: 'banner',
        cpm: 0.28,
        ad: 'inmobiAd',
        requestId: '418b37f85e772c1',
        adUnitCode: 'div-gpt-ad-1460505748561-01',
        size: '350x250',
        adserverTargeting: {
          hb_bidder: 'prebid',
          hb_adid: '330a22bdea4cac1',
          hb_pb: '0.20',
          hb_size: '350x250'
        },
        meta: {
          loggingPercentage: 0
        }
      };
      spec.onAdRenderSucceeded(bid);
      // expected url and payload
      const expectedUrl = `${EVENT_ENDPOINT}/report/onAdRenderSucceeded`;
      const expectedPayload = JSON.stringify({
        domain: location.hostname,
        eventPayload: bid.meta
      });
      // assert statements
      expect(fetchStub.callCount).to.be.equal(0);
    });

    it('onAdRenderSucceeded should not be called if the bid data is null', function () {
      // Call onAdRenderSucceeded with null data
      spec.onAdRenderSucceeded(null);
      // Assert that ajax was not called since bid data is null
      expect(fetchStub.callCount).to.be.equal(0);
    });
  });

  describe('onTimeout', function () {
    // existence test
    it('onTimeout function should be defined', function () {
      expect(spec.onTimeout).to.exist.and.to.be.a('function');
    });

    it('should invoke onTimeout, resolving the eventType and domain', function () {
      const bid = [
        {
          bidder: 'inmobi',
          bidId: '51ef8751f9aead1',
          adUnitCode: 'div-gpt-ad-14605057481561-0',
          timeout: 3000,
          auctionId: '18fd8b8b0bd7517'
        }
      ];
      spec.onTimeout(bid);
      // expected url and payload
      const expectedUrl = `${EVENT_ENDPOINT}/report/onTimeout`;
      const expectedPayload = JSON.stringify({
        domain: location.hostname,
        eventPayload: bid
      });
      // assert statements
      expect(fetchStub.callCount).to.be.equal(1);
      const fetchArgs = fetchStub.getCall(0).args;
      /*
                     index  fetch parameter
                     0 ->   URL
                     1 ->   options (method, headers, body, etc.)
                  */
      expect(fetchArgs[0]).to.equal(expectedUrl);
      const actualPayload = fetchArgs[1]?.body;
      expect(actualPayload).to.equal(expectedPayload);
      expect(fetchArgs[1]).to.deep.include({
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      });
      expect(fetchArgs[1]?.headers).to.deep.equal({
        'Content-Type': 'text/plain',
      });
    });

    it('onTimeout should not be called if the bid data is null', function () {
      // Call onTimeout with null data
      spec.onTimeout(null);
      // Assert that ajax was not called since bid data is null
      expect(fetchStub.callCount).to.be.equal(0);
    });
  });

  describe('onSetTargeting', function () {
    // existence test
    it('The onSetTargeting function should be defined', function () {
      expect(spec.onSetTargeting).to.exist.and.to.be.a('function');
    });

    it('should invoke onSetTargeting, resolving the eventType and domain', function () {
      const bid = {
        bidder: 'inmobi',
        width: 300,
        height: 250,
        adId: '330a22bdea4cac1',
        mediaType: 'banner',
        cpm: 0.28,
        ad: 'inmobiAd',
        requestId: '418b37f85e7721c',
        adUnitCode: 'div-gpt-ad-1460505748561-01',
        size: '350x250',
        adserverTargeting: {
          hb_bidder: 'prebid',
          hb_adid: '330a22bdea4cac1',
          hb_pb: '0.20',
          hb_size: '350x250'
        },
        meta: {
          loggingPercentage: 100
        }
      };
      spec.onSetTargeting(bid);
      // expected url and payload
      const expectedUrl = `${EVENT_ENDPOINT}/report/onSetTargeting`;
      const expectedPayload = JSON.stringify({
        domain: location.hostname,
        eventPayload: bid.meta
      });
      // assert statements
      expect(fetchStub.callCount).to.be.equal(1);
      const fetchArgs = fetchStub.getCall(0).args;
      /*
                     index  fetch parameter
                     0 ->   URL
                     1 ->   options (method, headers, body, etc.)
                  */
      expect(fetchArgs[0]).to.equal(expectedUrl);
      const actualPayload = fetchArgs[1]?.body;
      expect(actualPayload).to.equal(expectedPayload);
      expect(fetchArgs[1]).to.deep.include({
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      });
      expect(fetchArgs[1]?.headers).to.deep.equal({
        'Content-Type': 'text/plain',
      });
    });

    it('onSetTargeting should not be called when loggingPercentage is 0', function () {
      const bid = {
        bidder: 'inmobi',
        width: 300,
        height: 250,
        adId: '330a22bdea4cac1',
        mediaType: 'banner',
        cpm: 0.28,
        ad: 'inmobiAd',
        requestId: '418b37f85e7721c',
        adUnitCode: 'div-gpt-ad-1460505748561-01',
        size: '350x250',
        adserverTargeting: {
          hb_bidder: 'prebid',
          hb_adid: '330a22bdea4cac1',
          hb_pb: '0.20',
          hb_size: '350x250'
        },
        meta: {
          loggingPercentage: 0
        }
      };
      spec.onSetTargeting(bid);
      // expected url and payload
      const expectedUrl = `${EVENT_ENDPOINT}/report/onSetTargeting`;
      const expectedPayload = JSON.stringify({
        domain: location.hostname,
        eventPayload: bid.meta
      });
      // assert statements
      expect(fetchStub.callCount).to.be.equal(0);
    });

    it('onSetTargeting should not be called if the bid data is null', function () {
      // Call onSetTargeting with null data
      spec.onSetTargeting(null);
      // Assert that ajax was not called since bid data is null
      expect(fetchStub.callCount).to.be.equal(0);
    });
  });

  describe('isBidRequestValid', function () {
    it('should return false when an invalid bid is provided', function () {
      const bid = {
        bidder: 'inmobi',
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(false);
    });

    it('should return true when the bid contains a PLC', function () {
      const bid = {
        bidder: 'inmobi',
        params: {
          plc: '123a',
        },
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    before(() => {
      hook.ready();
    })
    afterEach(function () {
      config.resetConfig();
    });
    const bidderRequest = {
      refererInfo: {
        page: 'inmobi',
        topmostLocation: 'inmobi'
      },
      timeout: 3000,
      gdprConsent: {
        gdprApplies: true,
        consentString: 'consentDataString',
        vendorData: {
          vendorConsents: {
            '333': 1
          },
        },
        apiVersion: 1,
      },
    };

    it('request should build with correct plc', function () {
      const bidRequests = [
        {
          bidId: 'bidId',
          bidder: 'inmobi',
          adUnitCode: 'bid-12',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '123'
          }
        },
      ];
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.imp[0].ext.bidder.plc).to.deep.equal('123');
    });

    it('request should build with correct imp', function () {
      const expectedMetric = {
        url: 'https://inmobi.com'
      }
      const bidRequests = [{
        bidId: 'bidId',
        bidder: 'inmobi',
        adUnitCode: 'impId',
        mediaTypes: {
          banner: {
            sizes: [[320, 50]]
          }
        },
        ortb2Imp: {
          instl: 1,
          metric: expectedMetric,
          ext: {
            gpid: 'gpid_inmobi'
          },
          rwdd: 1
        },
        params: {
          plc: '123ai',
          bidfloor: 4.66,
          bidfloorcur: 'USD'
        }
      }];

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp).to.have.lengthOf(1);
      expect(ortbRequest.imp[0].id).to.deep.equal('bidId');
      expect(ortbRequest.imp[0].tagid).to.deep.equal('impId');
      expect(ortbRequest.imp[0].instl).to.equal(1);
      expect(ortbRequest.imp[0].bidfloor).to.equal(4.66);
      expect(ortbRequest.imp[0].bidfloorcur).to.equal('USD');
      expect(ortbRequest.imp[0].metric).to.deep.equal(expectedMetric);
      expect(ortbRequest.imp[0].secure).to.equal(0);
      expect(ortbRequest.imp[0].ext.gpid).to.equal('gpid_inmobi');
      expect(ortbRequest.imp[0].rwdd).to.equal(1);
    });

    it('request should build with proper site data', function () {
      const bidRequests = [
        {
          bidder: 'inmobi',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '1234a',
          },
        },
      ];
      const ortb2 = {
        site: {
          name: 'raapchikgames.com',
          domain: 'raapchikgames.com',
          keywords: 'test1, test2',
          cat: ['IAB2'],
          pagecat: ['IAB3'],
          sectioncat: ['IAB4'],
          page: 'https://raapchikgames.com',
          ref: 'inmobi.com',
          privacypolicy: 1,
          content: {
            url: 'https://raapchikgames.com/games1'
          }
        }
      };
      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest({ ...bidderRequest, ortb2 })).data;
      expect(ortbRequest.site.domain).to.equal('raapchikgames.com');
      expect(ortbRequest.site.publisher.domain).to.equal('inmobi');
      expect(ortbRequest.site.page).to.equal('https://raapchikgames.com');
      expect(ortbRequest.site.name).to.equal('raapchikgames.com');
      expect(ortbRequest.site.keywords).to.equal('test1, test2');
      expect(ortbRequest.site.cat).to.deep.equal(['IAB2']);
      expect(ortbRequest.site.pagecat).to.deep.equal(['IAB3']);
      expect(ortbRequest.site.sectioncat).to.deep.equal(['IAB4']);
      expect(ortbRequest.site.ref).to.equal('inmobi.com');
      expect(ortbRequest.site.privacypolicy).to.equal(1);
      expect(ortbRequest.site.content.url).to.equal('https://raapchikgames.com/games1')
    });

    it('request should build with proper device data', function () {
      const bidRequests = [
        {
          bidder: 'inmobi',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '1234a',
          },
        },
      ];
      const ortb2 = {
        device: {
          dnt: 0,
          ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          ip: '195.199.250.144',
          h: 919,
          w: 1920,
          language: 'hu',
          lmt: 1,
          js: 1,
          connectiontype: 0,
          hwv: '5S',
          model: 'iphone',
          mccmnc: '310-005',
          geo: {
            lat: 40.0964439,
            lon: -75.3009142
          }
        }
      };
      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest({ ...bidderRequest, ortb2 })).data;
      expect(ortbRequest.device.dnt).to.equal(0);
      expect(ortbRequest.device.lmt).to.equal(1);
      expect(ortbRequest.device.js).to.equal(1);
      expect(ortbRequest.device.connectiontype).to.equal(0);
      expect(ortbRequest.device.ua).to.equal('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');
      expect(ortbRequest.device.ip).to.equal('195.199.250.144');
      expect(ortbRequest.device.h).to.equal(919);
      expect(ortbRequest.device.w).to.equal(1920);
      expect(ortbRequest.device.language).to.deep.equal('hu');
      expect(ortbRequest.device.hwv).to.deep.equal('5S');
      expect(ortbRequest.device.model).to.deep.equal('iphone');
      expect(ortbRequest.device.mccmnc).to.deep.equal('310-005');
      expect(ortbRequest.device.geo.lat).to.deep.equal(40.0964439);
      expect(ortbRequest.device.geo.lon).to.deep.equal(-75.3009142);
    });

    it('should properly build a request with source object', function () {
      const expectedSchain = { id: 'prebid' };
      const ortb2 = {
        source: {
          pchain: 'inmobi',
          schain: expectedSchain
        }
      };
      const bidRequests = [
        {
          bidder: 'inmobi',
          bidId: 'bidId',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '124',
          },
        },
      ];
      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest({ ...bidderRequest, ortb2 })).data;
      expect(ortbRequest.source.ext.schain).to.deep.equal(expectedSchain);
      expect(ortbRequest.source.pchain).to.equal('inmobi');
    });

    it('should properly user object', function () {
      const bidRequests = [
        {
          bidder: 'inmobi',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '123'
          }
        },
      ];
      const br = {
        ...bidderRequest,
        ortb2: {
          user: {
            yob: 2002,
            keyowrds: 'test test',
            gender: 'M',
            customdata: 'test no',
            geo: {
              lat: 40.0964439,
              lon: -75.3009142
            },
            ext: {
              eids: [
                {
                  source: 'inmobi.com',
                  uids: [{
                    id: 'iid',
                    atype: 1
                  }]
                }
              ]
            }
          }
        }
      }
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(br));
      const ortbRequest = request.data;
      expect(ortbRequest.user.yob).to.deep.equal(2002);
      expect(ortbRequest.user.keyowrds).to.deep.equal('test test');
      expect(ortbRequest.user.gender).to.deep.equal('M');
      expect(ortbRequest.user.customdata).to.deep.equal('test no');
      expect(ortbRequest.user.geo.lat).to.deep.equal(40.0964439);
      expect(ortbRequest.user.geo.lon).to.deep.equal(-75.3009142);
      expect(ortbRequest.user.ext.eids).to.deep.equal([
        {
          source: 'inmobi.com',
          uids: [{
            id: 'iid',
            atype: 1
          }]
        }
      ]);
    });

    it('should properly build a request regs object', function () {
      const bidRequests = [
        {
          bidder: 'inmobi',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '1234a',
          },
        },
      ];
      const ortb2 = {
        regs: {
          coppa: 1,
          gpp: 'gpp_consent_string',
          gpp_sid: [0, 1, 2],
          us_privacy: 'yes us privacy applied'
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest({ ...bidderRequest, ortb2 })).data;
      expect(ortbRequest.regs.coppa).to.equal(1);
      expect(ortbRequest.regs.ext.gpp).to.equal('gpp_consent_string');
      expect(ortbRequest.regs.ext.gpp_sid).to.deep.equal([0, 1, 2]);
      expect(ortbRequest.regs.ext.us_privacy).to.deep.equal('yes us privacy applied');
    });

    it('gdpr test', function () {
      // using privacy params from global bidder Request
      const bidRequests = [
        {
          bidder: 'inmobi',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '1234a',
          },
        },
      ];
      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.regs.ext.gdpr).to.deep.equal(1);
      expect(ortbRequest.user.ext.consent).to.equal('consentDataString');
    });

    it('should properly set tmax if available', function () {
      // using tmax from global bidder Request
      const bidRequests = [
        {
          bidder: 'inmobi',
          adUnitCode: 'bid-1',
          transactionId: 'trans-1',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '123'
          }
        },
      ];
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.tmax).to.equal(bidderRequest.timeout);
    });

    it('should properly build a request with bcat field', function () {
      const bcat = ['IAB1', 'IAB2'];
      const bidRequests = [
        {
          bidder: 'inmobi',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '123a',
          },
        },
      ];
      const bidderRequest = {
        ortb2: {
          bcat
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.bcat).to.deep.equal(bcat);
    });

    it('should properly build a request with badv field', function () {
      const badv = ['ford.com'];
      const bidRequests = [
        {
          bidder: 'inmobi',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '12ea',
          },
        },
      ];
      const bidderRequest = {
        ortb2: {
          badv
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.badv).to.deep.equal(badv);
    });

    it('should properly build a request with bapp field', function () {
      const bapp = ['raapchik.com'];
      const bidRequests = [
        {
          bidder: 'inmobi',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '123a',
          },
        },
      ];
      const bidderRequest = {
        ortb2: {
          bapp
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.bapp).to.deep.equal(bapp);
    });

    it('banner request test', function () {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidId: 'bidId',
          bidder: 'inmobi',
          adUnitCode: 'bid-12',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]],
              pos: 1,
              topframe: 0,
            }
          },
          params: {
            plc: '123'
          },
          ortb2Imp: {
            banner: {
              api: [1, 2],
              mimes: ['image/jpg', 'image/gif']
            }
          }
        },
      ];
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.imp[0].banner).not.to.be.null;
      expect(ortbRequest.imp[0].banner.format[0].w).to.equal(320);
      expect(ortbRequest.imp[0].banner.format[0].h).to.equal(50);
      expect(ortbRequest.imp[0].banner.pos).to.equal(1);
      expect(ortbRequest.imp[0].banner.topframe).to.equal(0);
      expect(ortbRequest.imp[0].banner.api).to.deep.equal([1, 2]);
      expect(ortbRequest.imp[0].banner.mimes).to.deep.equal(['image/jpg', 'image/gif']);
    });

    it('banner request test with sizes > 1', function () {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidId: 'bidId',
          bidder: 'inmobi',
          adUnitCode: 'bid-12',
          mediaTypes: {
            banner: {
              sizes: [[320, 50], [720, 50]]
            }
          },
          params: {
            plc: '123'
          }
        },
      ];
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.imp[0].banner).not.to.be.null;
      expect(ortbRequest.imp[0].banner.format[0].w).to.equal(320);
      expect(ortbRequest.imp[0].banner.format[0].h).to.equal(50);
      expect(ortbRequest.imp[0].banner.format[1].w).to.equal(720);
      expect(ortbRequest.imp[0].banner.format[1].h).to.equal(50);
    });

    if (FEATURES.VIDEO) {
      it('video request test', function () {
        const bidRequests = [
          {
            bidder: 'inmobi',
            adUnitCode: 'bid-123',
            sizes: [[640, 360]],
            mediaTypes: {
              video: {
                context: 'inbanner',
                playerSize: [640, 360],
                mimes: ['video/mp4', 'video/x-flv'],
                maxduration: 30,
                api: [1, 2],
                protocols: [2, 3],
                plcmt: 3,
                w: 640,
                h: 360,
                linearity: 1,
                skipmin: 30,
                skipafter: 30,
                minbitrate: 10000,
                maxbitrate: 48000,
                delivery: [1, 2, 3],
                pos: 1,
                playbackend: 1,
                adPodDurationSec: 30,
                durationRangeSec: [1, 30],
                skip: 1,
                minduration: 5,
                startdelay: 5,
                playbackmethod: [1, 3],
                placement: 2
              }
            },
            params: {
              plc: '123'
            },
          },
        ];
        const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
        const ortbRequest = request.data;
        expect(ortbRequest.imp).to.have.lengthOf(1);
        expect(ortbRequest.imp[0].video.skip).to.equal(1);
        expect(ortbRequest.imp[0].video.minduration).to.equal(5);
        expect(ortbRequest.imp[0].video.startdelay).to.equal(5);
        expect(ortbRequest.imp[0].video.playbackmethod).to.deep.equal([1, 3]);
        expect(ortbRequest.imp[0].video.placement).to.equal(2);
        expect(ortbRequest.imp[0].video.mimes).to.deep.equal(['video/mp4', 'video/x-flv']);
        expect(ortbRequest.imp[0].video.maxduration).to.equal(30);
        expect(ortbRequest.imp[0].video.api).to.deep.equal([1, 2]);
        expect(ortbRequest.imp[0].video.protocols).to.deep.equal([2, 3]);
        expect(ortbRequest.imp[0].video.plcmt).to.equal(3);
        expect(ortbRequest.imp[0].video.w).to.equal(640);
        expect(ortbRequest.imp[0].video.h).to.equal(360);
        expect(ortbRequest.imp[0].video.linearity).to.equal(1);
        expect(ortbRequest.imp[0].video.skipmin).to.equal(30);
        expect(ortbRequest.imp[0].video.skipafter).to.equal(30);
        expect(ortbRequest.imp[0].video.minbitrate).to.equal(10000);
        expect(ortbRequest.imp[0].video.maxbitrate).to.equal(48000);
        expect(ortbRequest.imp[0].video.delivery).to.deep.equal([1, 2, 3]);
        expect(ortbRequest.imp[0].video.pos).to.equal(1);
        expect(ortbRequest.imp[0].video.playbackend).to.equal(1);
      });
    }

    if (FEATURES.VIDEO) {
      it('video request with player size > 1 ', function () {
        const bidRequests = [
          {
            bidder: 'inmobi',
            adUnitCode: 'bid-123',
            sizes: [[640, 360], [480, 320]],
            mediaTypes: {
              video: {
                context: 'inbanner',
                playerSize: [[640, 360], [480, 320]],
                mimes: ['video/mp4', 'video/x-flv'],
                maxduration: 30,
                api: [1, 2],
                protocols: [2, 3],
                plcmt: 3,
                w: 640,
                h: 360,
                linearity: 1,
                skipmin: 30,
                skipafter: 30,
                minbitrate: 10000,
                maxbitrate: 48000,
                delivery: [1, 2, 3],
                pos: 1,
                playbackend: 1,
                adPodDurationSec: 30,
                durationRangeSec: [1, 30],
                skip: 1,
                minduration: 5,
                startdelay: 5,
                playbackmethod: [1, 3],
                placement: 2
              }
            },
            params: {
              plc: '123'
            },
          },
        ];
        const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
        const ortbRequest = request.data;
        expect(ortbRequest.imp).to.have.lengthOf(1);
        expect(ortbRequest.imp[0].video.w).to.be.equal(640);
        expect(ortbRequest.imp[0].video.h).to.be.equal(360);
      });
    }

    if (FEATURES.VIDEO) {
      it('video request test when skip is 0', function () {
        const bidRequests = [
          {
            bidder: 'inmobi',
            adUnitCode: 'bid-123',
            sizes: [[640, 360]],
            mediaTypes: {
              video: {
                context: 'inbanner',
                playerSize: [640, 360],
                mimes: ['video/mp4', 'video/x-flv'],
                maxduration: 30,
                api: [1, 2],
                protocols: [2, 3],
                plcmt: 3,
                w: 640,
                h: 360,
                linearity: 1,
                skipmin: 30,
                skipafter: 30,
                minbitrate: 10000,
                maxbitrate: 48000,
                delivery: [1, 2, 3],
                pos: 1,
                playbackend: 1,
                adPodDurationSec: 30,
                durationRangeSec: [1, 30],
                skip: 0,
                minduration: 5,
                startdelay: 5,
                playbackmethod: [1, 3],
                placement: 2
              }
            },
            params: {
              plc: '123'
            },
          },
        ];
        const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
        const ortbRequest = request.data;
        expect(ortbRequest.imp).to.have.lengthOf(1);
        expect(ortbRequest.imp[0].video.skip).to.equal(0);
      });
    }

    if (FEATURES.NATIVE) {
      it('native request test without assests', function () {
        const bidRequests = [
          {
            mediaTypes: {
              native: {}
            },
            params: {
              'plc': '123a'
            }
          },
        ];
        const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
        const ortbRequest = request.data;
        expect(ortbRequest.imp[0].native).to.be.undefined;
      });
    }

    if (FEATURES.NATIVE) {
      it('native request with assets', function () {
        const assets = [{
          required: 1,
          id: 1,
          img: {
            type: 3,
            wmin: 100,
            hmin: 100,
          }
        },
        {
          required: 1,
          id: 2,
          title: {
            len: 140,
          }
        },
        {
          required: 1,
          id: 3,
          data: {
            type: 1,
          }
        }];
        const bidRequests = [
          {
            mediaTypes: {
              native: {}
            },
            nativeOrtbRequest: {
              assets: assets
            },
            params: {}
          },
        ];
        const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
        const ortbRequest = request.data;

        expect(ortbRequest.imp[0].native.request).to.not.be.null;
        const nativeRequest = JSON.parse(ortbRequest.imp[0].native.request);
        expect(nativeRequest).to.have.property('assets');
        expect(nativeRequest.assets).to.deep.equal(assets);
      });
    }

    it('should properly build a request when coppa flag is true', function () {
      const bidRequests = [];
      const bidderRequest = {};
      config.setConfig({ coppa: true });
      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.regs.coppa).to.equal(1);
    });

    it('should properly build a request when coppa flag is false', function () {
      const bidRequests = [];
      const bidderRequest = {};
      config.setConfig({ coppa: false });
      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.regs.coppa).to.equal(0);
    });

    it('should properly build a request when coppa flag is not defined', function () {
      const bidRequests = [];
      const bidderRequest = {};
      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.regs?.coppa).to.be.undefined;
    });

    it('build a banner request with bidFloor', function () {
      const bidRequests = [
        {
          bidder: 'inmobi',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50], [720, 90]]
            }
          },
          params: {
            plc: '123a',
            bidfloor: 1,
            bidfloorcur: 'USD'
          }
        }
      ];
      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].bidfloor).to.deep.equal(1);
      expect(ortbRequest.imp[0].bidfloorcur).to.deep.equal('USD');
    });

    it('build a banner request with getFloor', function () {
      const bidRequests = [
        {
          bidder: 'inmobi',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '123a'
          },
          getFloor: inputParams => {
            return { currency: 'USD', floor: 1.23, size: '*', mediaType: '*' };
          }
        }
      ];
      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].bidfloor).equal(1.23);
      expect(ortbRequest.imp[0].bidfloorcur).equal('USD');
    });

    if (FEATURES.VIDEO) {
      it('build a video request with bidFloor', function () {
        const bidRequests = [
          {
            bidder: 'inmobi',
            adUnitCode: 'impId',
            mediaTypes: {
              video: {
                playerSize: [[480, 320], [720, 480]]
              }
            },
            params: {
              plc: '123a',
              bidfloor: 1,
              bidfloorcur: 'USD'
            }
          }
        ];
        const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
        expect(ortbRequest.imp[0].bidfloor).to.equal(1);
        expect(ortbRequest.imp[0].bidfloorcur).to.equal('USD');
      });
    }

    if (FEATURES.VIDEO) {
      it('build a video request with getFloor', function () {
        const bidRequests = [
          {
            bidder: 'inmobi',
            adUnitCode: 'impId',
            mediaTypes: {
              video: {
                playerSize: [[480, 320], [720, 480]]
              }
            },
            params: {
              plc: '123a'
            },
            getFloor: inputParams => {
              return { currency: 'USD', floor: 1.23, size: '*', mediaType: '*' };
            }
          }
        ];
        const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
        expect(ortbRequest.imp[0].bidfloor).to.equal(1.23);
        expect(ortbRequest.imp[0].bidfloorcur).to.equal('USD');
      });
    }

    if (FEATURES.NATIVE && FEATURES.VIDEO) {
      it('build a mutli format request with getFloor', function () {
        const assets = [{
          required: 1,
          id: 1,
          img: {
            type: 3,
            wmin: 100,
            hmin: 100,
          }
        },
        {
          required: 1,
          id: 2,
          title: {
            len: 140,
          }
        },
        {
          required: 1,
          id: 3,
          data: {
            type: 1,
          }
        }];
        const bidRequests = [
          {
            bidder: 'inmobi',
            adUnitCode: 'impId',
            mediaTypes: {
              banner: {
                sizes: [[320, 50], [720, 90]]
              },
              video: {
                playerSize: [640, 480],
              },
              native: {

              }
            },
            nativeOrtbRequest: {
              assets: assets
            },
            params: {
              plc: '12456'
            },
            getFloor: inputParams => {
              return { currency: 'USD', floor: 1.23, size: '*', mediaType: '*' };
            }
          },
        ];
        const bidderRequest = {};
        const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
        expect(ortbRequest.imp[0].banner).not.to.be.undefined;
        expect(ortbRequest.imp[0].video).not.to.be.undefined;
        expect(ortbRequest.imp[0].native.request).not.to.be.undefined;
        expect(ortbRequest.imp[0].bidfloor).to.deep.equal(1.23);
        expect(ortbRequest.imp[0].bidfloorcur).to.deep.equal('USD');
      });
    }

    if (FEATURES.VIDEO) {
      it('build a multi imp request', function () {
        const bidRequests = [{
          adUnitCode: 'impId',
          bidId: 'bidId',
          mediaTypes: {
            video: {
              context: 'inbanner',
              playerSize: [640, 360],
              mimes: ['video/mp4', 'video/x-flv'],
              maxduration: 30,
              api: [1, 2],
              protocols: [2, 3],
              plcmt: 3,
              w: 640,
              h: 360,
              linearity: 1,
              skipmin: 30,
              skipafter: 30,
              minbitrate: 10000,
              maxbitrate: 48000,
              delivery: [1, 2, 3],
              pos: 1,
              playbackend: 1,
              adPodDurationSec: 30,
              durationRangeSec: [1, 30],
              skip: 1,
              minduration: 5,
              startdelay: 5,
              playbackmethod: [1, 3],
              placement: 2
            }
          },
          params: {
            plc: '123'
          },
        }, {
          adUnitCode: 'impId',
          bidId: 'bidId2',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '123',
          }
        }];
        const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
        expect(ortbRequest.imp).to.have.lengthOf(2);
        expect(ortbRequest.imp[0].video.skip).to.equal(1);
        expect(ortbRequest.imp[0].video.minduration).to.equal(5);
        expect(ortbRequest.imp[0].video.startdelay).to.equal(5);
        expect(ortbRequest.imp[0].video.playbackmethod).to.deep.equal([1, 3]);
        expect(ortbRequest.imp[0].video.placement).to.equal(2);
        // banner test
        expect(ortbRequest.imp[1].banner).not.to.be.undefined;
      });
    }

    if (FEATURES.VIDEO) {
      it('build a multi format request', function () {
        const bidRequests = [{
          adUnitCode: 'impId',
          bidId: 'bidId',
          mediaTypes: {
            video: {
              context: 'inbanner',
              playerSize: [640, 360],
              mimes: ['video/mp4', 'video/x-flv'],
              maxduration: 30,
              api: [1, 2],
              protocols: [2, 3],
              plcmt: 3,
              w: 640,
              h: 360,
              linearity: 1,
              skipmin: 30,
              skipafter: 30,
              minbitrate: 10000,
              maxbitrate: 48000,
              delivery: [1, 2, 3],
              pos: 1,
              playbackend: 1,
              adPodDurationSec: 30,
              durationRangeSec: [1, 30],
              skip: 1,
              minduration: 5,
              startdelay: 5,
              playbackmethod: [1, 3],
              placement: 2
            },
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '123'
          },
        }];
        const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
        expect(ortbRequest.imp).to.have.lengthOf(1);
        expect(ortbRequest.imp[0].video.skip).to.equal(1);
        expect(ortbRequest.imp[0].video.minduration).to.equal(5);
        expect(ortbRequest.imp[0].video.startdelay).to.equal(5);
        expect(ortbRequest.imp[0].video.playbackmethod).to.deep.equal([1, 3]);
        expect(ortbRequest.imp[0].video.placement).to.equal(2);
        // banner test
        expect(ortbRequest.imp[0].banner).not.to.be.undefined;
      });
    }
  });

  describe('getUserSyncs', function () {
    const syncEndPoint = 'https://sync.inmobi.com/prebidjs?';

    it('should return empty if iframe disabled and pixelEnabled is false', function () {
      const res = spec.getUserSyncs({});
      expect(res).to.deep.equal([]);
    });

    it('should return user sync if iframe enabled is true', function () {
      const res = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true });
      expect(res).to.deep.equal([{ type: 'iframe', url: syncEndPoint }]);
    });

    it('should return user sync if iframe enabled is true and gdpr not present', function () {
      const res = spec.getUserSyncs({ iframeEnabled: true }, {}, { gdprApplies: false });
      expect(res).to.deep.equal([{ type: 'iframe', url: `${syncEndPoint}` }]);
    });

    it('should return user sync if iframe enabled is true and gdpr = 1 and gdpr consent present', function () {
      const res = spec.getUserSyncs({ iframeEnabled: true }, {}, { gdprApplies: true, consentString: 'GDPR_CONSENT' });
      expect(res).to.deep.equal([{ type: 'iframe', url: `${syncEndPoint}gdpr=1&gdpr_consent=GDPR_CONSENT` }]);
    });

    it('should return user sync if iframe enabled is true and gdpr = 1 , gdpr consent present and usp_consent present', function () {
      const res = spec.getUserSyncs({ iframeEnabled: true }, {}, { gdprApplies: true, consentString: 'GDPR_CONSENT' }, 'USP_CONSENT');
      expect(res).to.deep.equal([{ type: 'iframe', url: `${syncEndPoint}gdpr=1&gdpr_consent=GDPR_CONSENT&us_privacy=USP_CONSENT` }]);
    });

    it('should return user sync if iframe enabled is true  usp_consent present and gppConsent present', function () {
      const res = spec.getUserSyncs({ iframeEnabled: true }, {}, { gdprApplies: false, consentString: undefined }, 'USP_CONSENT', { gppString: 'GPP_STRING', applicableSections: [32, 51] });
      expect(res).to.deep.equal([{ type: 'iframe', url: `${syncEndPoint}us_privacy=USP_CONSENT&gpp=GPP_STRING&gpp_sid=32%2C51` }]);
    });

    const responses = [{
      body: {
        ext: {
          prebidjs: {
            urls: [
              {
                url: 'https://sync.inmobi.com/prebidjs'
              },
              {
                url: 'https://eus.rubiconproject.com/usync.html?p=test'
              }
            ]
          }
        }
      }
    }];

    it('should return urls from response when iframe enabled is false and pixel enabled', function () {
      const res = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, responses);
      expect(res).to.deep.equal([
        { type: 'image', url: 'https://sync.inmobi.com/prebidjs' },
        { type: 'image', url: 'https://eus.rubiconproject.com/usync.html?p=test' }
      ])
    });

    it('should return urls from response when iframe enabled is false and pixel enabled and empty responses', function () {
      const responses = [];
      const res = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, responses);
      expect(res).to.deep.equal([
        { type: 'image', url: `${syncEndPoint}` }
      ])
    });

    it('should return urls from response when iframe enabled is false and pixel enabled and no response', function () {
      const responses = undefined;
      const res = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, responses);
      expect(res).to.deep.equal([
        { type: 'image', url: `${syncEndPoint}` }
      ])
    });

    it('should return urls from response when iframe enabled is false and all consent parameters present', function () {
      const res = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, responses, { gdprApplies: true, consentString: 'GDPR_CONSENT' }, 'USP_CONSENT', { gppString: 'GPP_STRING', applicableSections: [32, 51] });
      expect(res).to.deep.equal([
        { type: 'image', url: 'https://sync.inmobi.com/prebidjs?gdpr=1&gdpr_consent=GDPR_CONSENT&us_privacy=USP_CONSENT&gpp=GPP_STRING&gpp_sid=32%2C51' },
        { type: 'image', url: 'https://eus.rubiconproject.com/usync.html?p=test&gdpr=1&gdpr_consent=GDPR_CONSENT&us_privacy=USP_CONSENT&gpp=GPP_STRING&gpp_sid=32%2C51' }
      ])
    });
  });

  describe('interpretResponse', function () {
    const bidderRequest = {
      refererInfo: {
        page: 'https://raapchikgames.com',
        topmostLocation: 'https://raapchikgames.com'
      },
      timeout: 3000,
      gdprConsent: {
        gdprApplies: true,
        consentString: 'consentDataString',
        vendorData: {
          vendorConsents: {
            '333': 1
          },
        },
        apiVersion: 1,
      },
    };
    function mockResponse(winningBidId, mediaType) {
      return {
        id: '95d08af8-2d50-4d75-a411-8ecd9224970e',
        cur: 'USD',
        seatbid: [
          {
            bid: [
              {
                id: '20dd72ed-930f-1000-e56f-07c37a793f30',
                impid: winningBidId,
                price: 1.1645,
                adomain: ['advertiserDomain.sandbox.inmobi.com'],
                crid: '<adv>88b37efcd5f34d368e60317c706942a4<crid>ef6f6976eb394046958fd0e8a7b75301',
                w: 320,
                h: 50,
                adm: 'test-ad',
                mtype: mediaType,
                nurl: 'https://et-l.w.inmobi.com/c.asm/',
                api: 3,
                cat: [],
                ext: {
                  loggingPercentage: 100,
                  prebid: {
                    meta: {
                      advertiserDomains: ['advertiserDomain.sandbox.inmobi.com'],
                      networkName: 'inmobi'
                    }
                  }
                }
              }
            ]
          }
        ],
        ext: {
          prebidjs: {
            urls: [
              { url: 'https://sync.inmobi.com/prebidjs' },
              { url: 'https://eus.rubiconproject.com/usync.html?p=test' }
            ]
          }
        }
      };
    };

    function mockResponseNative(winningBidId, mediaType) {
      return {
        id: '95d08af8-2d50-4d75-a411-8ecd9224970e',
        cur: 'USD',
        seatbid: [
          {
            bid: [
              {
                id: '20dd72ed-930f-1000-e56f-07c37a793f30',
                impid: winningBidId,
                price: 1.1645,
                adomain: ['advertiserDomain.sandbox.inmobi.com'],
                crid: '<adv>88b37efcd5f34d368e60317c706942a4<crid>ef6f6976eb394046958fd0e8a7b75301',
                w: 320,
                h: 50,
                adm: '{"native":{"ver":"1.2","assets":[{"img":{"w":100,"h":100,"type":3,"url":"https://supply.inmobicdn.net/sandbox-prod-assets/Native_testAd.png"},"id":1,"required":1},{"id":2,"title":{"len":140,"text":"Native-Title-InMobi-Sandbox"},"required":1},{"data":{"type":1,"value":""},"id":3,"required":1},{"data":{"type":2,"value":"InMobi native test - Subtitle"},"id":4,"required":0},{"img":{"w":20,"h":20,"type":1,"url":"https://supply.inmobicdn.net/sandbox-prod-assets/inmobi-Logo-150x150.png"},"id":5,"required":0}],"link":{"clicktrackers":["https://c-eus.w.inmobi.com/"],"url":"https://www.inmobi.com"},"eventtrackers":[{"method":1,"event":1,"url":"https://et-eus.w.inmobi.com/"}]}}',
                mtype: mediaType,
                nurl: 'https://et-l.w.inmobi.com/c.asm/',
                api: 3,
                cat: [],
                ext: {
                  loggingPercentage: 100,
                  prebid: {
                    meta: {
                      advertiserDomains: ['advertiserDomain.sandbox.inmobi.com'],
                      networkName: 'inmobi'
                    }
                  }
                }
              }
            ]
          }
        ],
        ext: {
          prebidjs: {
            urls: [
              { url: 'https://sync.inmobi.com/prebidjs' },
              { url: 'https://eus.rubiconproject.com/usync.html?p=test' }
            ]
          }
        }
      };
    };

    it('returns an empty array when bid response is empty', function () {
      const bidRequests = [];
      const response = {};
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(0);
    });

    it('should return an empty array when there is no bid response', function () {
      const bidRequests = [];
      const response = { seatbid: [] };
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse({ body: response }, request);
      expect(bids).to.have.lengthOf(0);
    });

    it('return banner response', function () {
      const bidRequests = [{
        adUnitCode: 'impId',
        bidId: 'bidId',
        mediaTypes: {
          banner: {
            sizes: [[320, 50]]
          }
        },
        params: {
          plc: '124a',
        }
      }];
      const response = mockResponse('bidId', 1);
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse({ body: response }, request);
      expect(bids).to.have.length(1);
      expect(bids[0].currency).to.deep.equal('USD');
      expect(bids[0].mediaType).to.deep.equal('banner');
      expect(bids[0].requestId).to.deep.equal('bidId');
      expect(bids[0].seatBidId).to.deep.equal('20dd72ed-930f-1000-e56f-07c37a793f30');
      expect(bids[0].cpm).to.equal(1.1645);
      expect(bids[0].width).to.equal(320);
      expect(bids[0].height).to.equal(50);
      expect(bids[0].creativeId).to.deep.equal('<adv>88b37efcd5f34d368e60317c706942a4<crid>ef6f6976eb394046958fd0e8a7b75301');
      expect(bids[0].meta.loggingPercentage).to.equal(100);
      expect(bids[0].meta.advertiserDomains[0]).to.deep.equal('advertiserDomain.sandbox.inmobi.com');
      expect(bids[0].meta.prebid.meta.networkName).to.deep.equal('inmobi');
    });

    it('bid response when banner wins among two ad units', function () {
      const bidRequests = [{
        adUnitCode: 'impId',
        bidId: 'bidId',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 320],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          plc: '123',
        },
      }, {
        adUnitCode: 'impId',
        bidId: 'bidId2',
        mediaTypes: {
          banner: {
            sizes: [[320, 50]]
          }
        },
        params: {
          plc: '123',
        }
      }];
      const response = mockResponse('bidId2', 1);
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse({ body: response }, request);
      expect(bids[0].currency).to.deep.equal('USD');
      expect(bids[0].mediaType).to.deep.equal('banner');
      expect(bids[0].requestId).to.deep.equal('bidId2');
      expect(bids[0].seatBidId).to.deep.equal('20dd72ed-930f-1000-e56f-07c37a793f30');
      expect(bids[0].cpm).to.equal(1.1645);
      expect(bids[0].width).to.equal(320);
      expect(bids[0].height).to.equal(50);
      expect(bids[0].creativeId).to.deep.equal('<adv>88b37efcd5f34d368e60317c706942a4<crid>ef6f6976eb394046958fd0e8a7b75301');
      expect(bids[0].meta.loggingPercentage).to.equal(100);
      expect(bids[0].meta.advertiserDomains[0]).to.deep.equal('advertiserDomain.sandbox.inmobi.com');
      expect(bids[0].meta.prebid.meta.networkName).to.deep.equal('inmobi');
    });

    if (FEATURES.VIDEO) {
      it('return instream video response', function () {
        const bidRequests = [{
          adUnitCode: 'impId',
          bidId: 'bidId',
          mediaTypes: {
            video: {
              context: 'instream',
              mimes: ['video/mpeg'],
              playerSize: [640, 320],
              protocols: [5, 6],
              maxduration: 30,
              api: [1, 2]
            }
          },
          params: {
            plc: '123a1',
          },
        }];
        const response = mockResponse('bidId', 2);
        const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
        const bids = spec.interpretResponse({ body: response }, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(VIDEO);
        expect(bids[0].currency).to.deep.equal('USD');
        expect(bids[0].requestId).to.deep.equal('bidId');
        expect(bids[0].seatBidId).to.deep.equal('20dd72ed-930f-1000-e56f-07c37a793f30');
        expect(bids[0].cpm).to.equal(1.1645);
        expect(bids[0].playerWidth).to.equal(640);
        expect(bids[0].playerHeight).to.equal(320);
        expect(bids[0].creativeId).to.deep.equal('<adv>88b37efcd5f34d368e60317c706942a4<crid>ef6f6976eb394046958fd0e8a7b75301');
        expect(bids[0].meta.loggingPercentage).to.equal(100);
        expect(bids[0].meta.advertiserDomains[0]).to.deep.equal('advertiserDomain.sandbox.inmobi.com');
        expect(bids[0].meta.prebid.meta.networkName).to.deep.equal('inmobi');
        expect(bids[0].vastUrl).to.equal('https://et-l.w.inmobi.com/c.asm/');
        expect(bids[0].vastXml).to.equal('test-ad');
      });
    }

    if (FEATURES.VIDEO) {
      it('return video outstream response', function () {
        const bidRequests = [{
          adUnitCode: 'impId',
          bidId: 'bidId',
          mediaTypes: {
            video: {
              context: 'outstream',
              mimes: ['video/mpeg'],
              playerSize: [640, 320],
              protocols: [5, 6],
              maxduration: 30,
              api: [1, 2]
            }
          },
          params: {
            plc: '123a1',
          },
        }];
        const response = mockResponse('bidId', 2);
        const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
        const bids = spec.interpretResponse({ body: response }, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(VIDEO);
        expect(bids[0].currency).to.deep.equal('USD');
        expect(bids[0].requestId).to.deep.equal('bidId');
        expect(bids[0].seatBidId).to.deep.equal('20dd72ed-930f-1000-e56f-07c37a793f30');
        expect(bids[0].cpm).to.equal(1.1645);
        expect(bids[0].playerWidth).to.equal(640);
        expect(bids[0].playerHeight).to.equal(320);
        expect(bids[0].creativeId).to.deep.equal('<adv>88b37efcd5f34d368e60317c706942a4<crid>ef6f6976eb394046958fd0e8a7b75301');
        expect(bids[0].meta.loggingPercentage).to.equal(100);
        expect(bids[0].meta.advertiserDomains[0]).to.deep.equal('advertiserDomain.sandbox.inmobi.com');
        expect(bids[0].meta.prebid.meta.networkName).to.deep.equal('inmobi');
        expect(bids[0].vastUrl).to.equal('https://et-l.w.inmobi.com/c.asm/');
        expect(bids[0].vastXml).to.equal('test-ad');
      });
    }

    if (FEATURES.VIDEO) {
      it('bid response when video wins among two ad units', function () {
        const bidRequests = [{
          adUnitCode: 'impId',
          bidId: 'bidId',
          mediaTypes: {
            video: {
              context: 'instream',
              mimes: ['video/mpeg'],
              playerSize: [640, 320],
              protocols: [5, 6],
              maxduration: 30,
              api: [1, 2]
            }
          },
          params: {
            plc: '123',
          },
        }, {
          adUnitCode: 'impId',
          bidId: 'bidId2',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '123',
          }
        }];
        const response = mockResponse('bidId', 2);
        const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
        const bids = spec.interpretResponse({ body: response }, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(VIDEO);
        expect(bids[0].currency).to.deep.equal('USD');
        expect(bids[0].requestId).to.deep.equal('bidId');
        expect(bids[0].seatBidId).to.deep.equal('20dd72ed-930f-1000-e56f-07c37a793f30');
        expect(bids[0].cpm).to.equal(1.1645);
        expect(bids[0].playerWidth).to.equal(640);
        expect(bids[0].playerHeight).to.equal(320);
        expect(bids[0].creativeId).to.deep.equal('<adv>88b37efcd5f34d368e60317c706942a4<crid>ef6f6976eb394046958fd0e8a7b75301');
        expect(bids[0].meta.loggingPercentage).to.equal(100);
        expect(bids[0].meta.advertiserDomains[0]).to.deep.equal('advertiserDomain.sandbox.inmobi.com');
        expect(bids[0].meta.prebid.meta.networkName).to.deep.equal('inmobi');
        expect(bids[0].vastUrl).to.equal('https://et-l.w.inmobi.com/c.asm/');
        expect(bids[0].vastXml).to.equal('test-ad');
      });
    }

    if (FEATURES.NATIVE) {
      it('should correctly parse a native bid response', function () {
        const bidRequests = [{
          adUnitCode: 'impId',
          bidId: 'bidId',
          params: {
            plc: '123',
          },
          native: true,
          bidder: 'inmobi',
          mediaTypes: {
            native: {
              image: {
                required: true,
                sizes: [120, 60],
                sendId: true,
                sendTargetingKeys: false
              }
            }
          }
        }];
        const response = mockResponseNative('bidId', 4);
        const expectedAdmNativeOrtb = JSON.parse(response.seatbid[0].bid[0].adm).native;
        const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
        const bids = spec.interpretResponse({ body: response }, request);

        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(NATIVE);
        // testing
        expect(bids[0].requestId).to.deep.equal('bidId');
        expect(bids[0].seatBidId).to.deep.equal('20dd72ed-930f-1000-e56f-07c37a793f30')
        expect(bids[0].cpm).to.deep.equal(1.1645);
        expect(bids[0].currency).to.deep.equal('USD');
        expect(bids[0].width).to.deep.equal(320);
        expect(bids[0].height).to.deep.equal(50);
        expect(bids[0].ad).to.equal(undefined);
        expect(bids[0].native.ortb).not.to.be.null;
        expect(bids[0].native.ortb).to.deep.equal(expectedAdmNativeOrtb);
        expect(bids[0].creativeId).to.deep.equal('<adv>88b37efcd5f34d368e60317c706942a4<crid>ef6f6976eb394046958fd0e8a7b75301');
        expect(bids[0].meta.advertiserDomains[0]).to.deep.equal('advertiserDomain.sandbox.inmobi.com');
        expect(bids[0].meta.prebid.meta.networkName).to.deep.equal('inmobi');
      });
    }

    if (FEATURES.NATIVE) {
      it('should correctly parse a native bid response when there are two ad units', function () {
        const bidRequests = [{
          adUnitCode: 'impId',
          bidId: 'bidId',
          params: {
            plc: '123',
          },
          native: true,
          bidder: 'inmobi',
          mediaTypes: {
            native: {
              image: {
                required: true,
                sizes: [120, 60],
                sendId: true,
                sendTargetingKeys: false
              }
            }
          }
        },
        {
          adUnitCode: 'impId',
          bidId: 'bidId2',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            plc: '123',
          }
        }];
        const response = mockResponseNative('bidId', 4);
        const expectedAdmNativeOrtb = JSON.parse(response.seatbid[0].bid[0].adm).native;
        const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
        const bids = spec.interpretResponse({ body: response }, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(NATIVE);
        // testing
        expect(bids[0].requestId).to.deep.equal('bidId');
        expect(bids[0].seatBidId).to.deep.equal('20dd72ed-930f-1000-e56f-07c37a793f30')
        expect(bids[0].cpm).to.deep.equal(1.1645);
        expect(bids[0].currency).to.deep.equal('USD');
        expect(bids[0].width).to.deep.equal(320);
        expect(bids[0].height).to.deep.equal(50);
        expect(bids[0].ad).to.equal(undefined);
        expect(bids[0].native.ortb).not.to.be.null;
        expect(bids[0].native.ortb).to.deep.equal(expectedAdmNativeOrtb);
        expect(bids[0].creativeId).to.deep.equal('<adv>88b37efcd5f34d368e60317c706942a4<crid>ef6f6976eb394046958fd0e8a7b75301');
        expect(bids[0].meta.advertiserDomains[0]).to.deep.equal('advertiserDomain.sandbox.inmobi.com');
        expect(bids[0].meta.prebid.meta.networkName).to.deep.equal('inmobi');
      });
    }
  });
});
