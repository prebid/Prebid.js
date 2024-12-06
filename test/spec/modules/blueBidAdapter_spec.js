import { expect } from 'chai';
import {
  spec,
  storage,
} from 'modules/blueBidAdapter.js';
import * as utils from 'src/utils.js';
import * as refererDetection from 'src/refererDetection.js';
import * as ajax from 'src/ajax.js';
import { config } from '../../../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../../../src/mediaTypes.js';
import {syncAddFPDToBidderRequest} from '../../helpers/fpd.js';
import 'modules/userId/index.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';
import 'modules/consentManagementGpp.js';
import 'modules/schain.js';
import {hook} from '../../../src/hook.js';

describe('The Blue bidding adapter', function () {
  let utilsMock, sandbox, ajaxStub;

  beforeEach(function () {
    $$PREBID_GLOBAL$$.bidderSettings = {
      blue: {
        storageAllowed: true
      }
    };
    // Remove FastBid to avoid side effects
    localStorage.removeItem('blue_fast_bid');
    utilsMock = sinon.mock(utils);

    sandbox = sinon.sandbox.create();
    ajaxStub = sandbox.stub(ajax, 'ajax');
  });

  afterEach(function () {
    $$PREBID_GLOBAL$$.bidderSettings = {};
    global.Blue = undefined;
    utilsMock.restore();
    sandbox.restore();
    ajaxStub.restore();
  });

  describe('isBidRequestValid', function () {
    it('should return false when given an invalid bid', function () {
      const bid = {
        bidder: 'blue',
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(false);
    });

    it('should return true when given a zoneId bid', function () {
      const bid = {
        bidder: 'blue',
        params: {
          publisherId: 123,
        },
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    const refererUrl = 'https://blue.com?pbt_debug=1&pbt_nolog=1';
    const bidderRequest = {
      refererInfo: {
        page: refererUrl,
        topmostLocation: refererUrl
      },
      timeout: 3000,
      gdprConsent: {
        gdprApplies: true,
        consentString: 'consentDataString',
        vendorData: {
          vendorConsents: {
            '91': 1
          },
        },
        apiVersion: 1,
      },
    };

    let localStorageIsEnabledStub;

    before(() => {
      hook.ready();
    });

    this.beforeEach(function () {
      localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
      localStorageIsEnabledStub.returns(true);
    });

    afterEach(function () {
      localStorageIsEnabledStub.restore();
      config.resetConfig();
    });

    it('should properly build a request using random uuid as auction id', function () {
      const generateUUIDStub = sinon.stub(utils, 'generateUUID');
      generateUUIDStub.returns('def');
      const bidderRequest = {};
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {}
        },
      ];
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.id).to.equal('def');
      generateUUIDStub.restore();
    });

    it('should properly transmit source.tid if available', function () {
      const bidderRequest = {
        ortb2: {
          source: {
            tid: 'abc'
          }
        }
      };
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {}
        },
      ];
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.source.tid).to.equal('abc');
    });

    it('should properly transmit tmax if available', function () {
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {}
        },
      ];
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.tmax).to.equal(bidderRequest.timeout);
    });

    it('should properly transmit bidId if available', function () {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidId: 'bidId',
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {}
        },
      ];
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.imp[0].id).to.equal('bidId');
    });

    it('should properly forward eids', function () {
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {}
        },
      ];
      const br = {
        ...bidderRequest,
        ortb2: {
          user: {
            ext: {
              eids: [
                {
                  source: 'blue.com',
                  uids: [{
                    id: 'abc',
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
      expect(ortbRequest.user.ext.eids).to.deep.equal([
        {
          source: 'blue.com',
          uids: [{
            id: 'abc',
            atype: 1
          }]
        }
      ]);
    });

    it('should properly build a publisherId request', function () {
      const bidderRequest = {
        refererInfo: {
          page: refererUrl,
          topmostLocation: refererUrl,
        },
        timeout: 3000,
        gdprConsent: {
          gdprApplies: false,
          consentString: undefined,
          vendorData: {
            vendorConsents: {
              '1': 0
            },
          },
        },
      };
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          ortb2Imp: {
            ext: {
              tid: 'transaction-123',
            },
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90]]
            }
          },
          params: {
            networkId: 456,
          },
        },
      ];

      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      expect(request.url).to.contain('https://bidder-us-east-1.getblue.io/engine/?src=prebid');
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.site.page).to.equal(refererUrl);
      expect(ortbRequest.imp).to.have.lengthOf(1);
      expect(ortbRequest.imp[0].tagid).to.equal('bid-123');
      expect(ortbRequest.imp[0].banner.format).to.have.lengthOf(2);
      expect(ortbRequest.imp[0].banner.format[0].w).to.equal(300);
      expect(ortbRequest.imp[0].banner.format[0].h).to.equal(250);
      expect(ortbRequest.imp[0].banner.format[1].w).to.equal(728);
      expect(ortbRequest.imp[0].banner.format[1].h).to.equal(90);
      expect(ortbRequest.user?.ext?.consent).to.equal(undefined);
      expect(ortbRequest.regs.ext.gdpr).to.equal(0);
    });

    it('should properly build a request with undefined gdpr consent fields when they are not provided', function () {
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        timeout: 3000,
        gdprConsent: {},
      };

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.user?.ext?.consent).to.equal(undefined);
      expect(ortbRequest.regs?.ext?.gdpr).to.equal(undefined);
    });

    it('should properly build a request with ccpa consent field', function () {
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        timeout: 3000,
        uspConsent: '1YNY',
      };

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.regs.ext.us_privacy).to.equal('1YNY');
    });

    it('should properly build a request with overridden tmax', function () {
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        timeout: 1234
      };

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.tmax).to.equal(1234);
    });

    it('should properly build a request with device sua field', function () {
      const sua = {
        platform: {
          brand: 'abc'
        }
      }
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        timeout: 3000,
        uspConsent: '1YNY',
        ortb2: {
          device: {
            sua: sua
          }
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.device.ext.sua).not.to.be.null;
      expect(ortbRequest.device.ext.sua.platform.brand).to.equal('abc');
    });

    it('should properly build a request with gpp consent field', function () {
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const ortb2 = {
        regs: {
          gpp: 'gpp_consent_string',
          gpp_sid: [0, 1, 2],
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest({ ...bidderRequest, ortb2 })).data;
      expect(ortbRequest.regs.ext.gpp).to.equal('gpp_consent_string');
      expect(ortbRequest.regs.ext.gpp_sid).to.deep.equal([0, 1, 2]);
    });

    it('should properly build a request with dsa object', function () {
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      let dsa = {
        required: 3,
        pubrender: 0,
        datatopub: 2,
        transparency: [{
          domain: 'platform1domain.com',
          params: [1]
        }, {
          domain: 'SSP2domain.com',
          params: [1, 2]
        }]
      };
      const ortb2 = {
        regs: {
          ext: {
            dsa: dsa
          }
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest({ ...bidderRequest, ortb2 })).data;
      expect(ortbRequest.regs.ext.dsa).to.deep.equal(dsa);
    });

    it('should properly build a request with schain object', function () {
      const expectedSchain = {
        someProperty: 'someValue'
      };
      const bidRequests = [
        {
          bidder: 'blue',
          schain: expectedSchain,
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.source.ext.schain).to.equal(expectedSchain);
    });

    it('should properly build a request with bcat field', function () {
      const bcat = ['IAB1', 'IAB2'];
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
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
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
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
      const bapp = ['com.foo.mygame'];
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
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

    it('should properly build a request without first party data', function () {
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123
          }
        },
      ];

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest({ ...bidderRequest, ortb2: {} })).data;
      expect(ortbRequest.site.page).to.equal(refererUrl);
      expect(ortbRequest.imp).to.have.lengthOf(1);
      expect(ortbRequest.imp[0].tagid).to.equal('bid-123');
      expect(ortbRequest.imp[0].banner.format).to.have.lengthOf(1);
      expect(ortbRequest.imp[0].banner.format[0].w).to.equal(728);
      expect(ortbRequest.imp[0].banner.format[0].h).to.equal(90);
      expect(ortbRequest.imp[0].ext.bidder.zoneid).to.equal(123);
      expect(ortbRequest.user.ext.consent).to.equal('consentDataString');
      expect(ortbRequest.regs.ext.gdpr).to.equal(1);
      expect(ortbRequest.regs.ext.gdprversion).to.equal(1);
    });

    it('should properly build a request with first party data', function () {
      const siteData = {
        keywords: ['power tools'],
        content: {
          data: [{
            name: 'some_provider',
            ext: {
              segtax: 3
            },
            segment: [
              { 'id': '1001' },
              { 'id': '1002' }
            ]
          }]
        },
        ext: {
          data: {
            pageType: 'article'
          }
        }
      };
      const userData = {
        gender: 'M',
        data: [{
          name: 'some_provider',
          ext: {
            segtax: 3
          },
          segment: [
            { 'id': '1001' },
            { 'id': '1002' }
          ]
        }],
        ext: {
          data: {
            registered: true
          }
        }
      };
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
            ext: {
              bidfloor: 0.75
            }
          },
          ortb2Imp: {
            ext: {
              data: {
                someContextAttribute: 'abc'
              }
            }
          }
        },
      ];

      const ortb2 = {
        site: siteData,
        user: userData
      };

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest({ ...bidderRequest, ortb2 })).data;
      expect(ortbRequest.user).to.deep.equal({ ...userData, ext: { ...userData.ext, consent: 'consentDataString' } });
      expect(ortbRequest.site).to.deep.equal({ ...siteData, page: refererUrl, domain: 'blue.com', publisher: { ...ortbRequest.site.publisher, domain: 'blue.com' } });
      expect(ortbRequest.imp[0].ext.bidfloor).to.equal(0.75);
      expect(ortbRequest.imp[0].ext.data.someContextAttribute).to.equal('abc')
    });

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

    it('should properly build a banner request with floors', function () {
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90]]
            }
          },
          params: {
            networkId: 456,
          },

          getFloor: inputParams => {
            if (inputParams.mediaType === BANNER && inputParams.size[0] === 300 && inputParams.size[1] === 250) {
              return {
                currency: 'USD',
                floor: 1.0
              };
            } else if (inputParams.mediaType === BANNER && inputParams.size[0] === 728 && inputParams.size[1] === 90) {
              return {
                currency: 'USD',
                floor: 2.0
              };
            } else {
              return {}
            }
          }
        },
      ];
      const bidderRequest = {};
      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].ext.floors).to.deep.equal({
        'banner': {
          '300x250': { 'currency': 'USD', 'floor': 1 },
          '728x90': { 'currency': 'USD', 'floor': 2 }
        }
      });
    });

    it('should properly build a request with static floors', function () {
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90]]
            }
          },
          params: {
            networkId: 456,
            bidFloor: 1,
            bidFloorCur: 'EUR'
          },
        },
      ];
      const bidderRequest = {};
      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].ext.floors).to.deep.equal({
        'banner': {
          '300x250': { 'currency': 'EUR', 'floor': 1 },
          '728x90': { 'currency': 'EUR', 'floor': 1 }
        }
      });
    });

    it('should properly build a request when imp.rwdd is present', function () {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123
          },
          ortb2Imp: {
            rwdd: 1
          }
        },
      ];

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].ext.rwdd).to.equal(1);
    });

    it('should properly build a request when imp.rwdd is false', function () {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123
          },
          ortb2Imp: {
            rwdd: 0
          }
        },
      ];

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].ext?.rwdd).to.equal(0);
    });

    it('should properly build a request when FLEDGE is enabled', function () {
      const bidderRequest = {
        paapi: {
          enabled: true
        }
      };
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123
          },
          ortb2Imp: {
            ext: {
              igs: {
                ae: 1
              }
            }
          }
        },
      ];

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].ext.igs.ae).to.equal(1);
    });

    it('should properly build a request when FLEDGE is disabled', function () {
      const bidderRequest = {
        paapi: {
          enabled: false
        },
      };
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123
          },
          ortb2Imp: {
            ext: {
              igs: {
                ae: 1
              }
            }
          }
        },
      ];

      const ortbRequest = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].ext.igs?.ae).to.be.undefined;
    });

    it('should properly transmit the pubid and slot uid if available', function () {
      const bidderRequest = {
        ortb2: {
          site: {
            publisher: {
              id: 'pub-777'
            }
          }
        }
      };
      const bidRequests = [
        {
          bidder: 'blue',
          adUnitCode: 'bid-123',
          ortb2Imp: {
            ext: {
              tid: 'transaction-123',
            },
          },
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
        {
          bidder: 'blue',
          adUnitCode: 'bid-234',
          ortb2Imp: {
            ext: {
              tid: 'transaction-234',
            },
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90]]
            }
          },
          params: {
            networkId: 456,
            pubid: 'pub-888',
            uid: 888
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.site.publisher.id).to.equal('pub-888');
      expect(ortbRequest.imp[0].ext.bidder.uid).to.be.undefined;
      expect(ortbRequest.imp[1].ext.bidder.uid).to.equal(888);
    });

    it('should properly transmit device.ext.cdep if available', function () {
      const bidderRequest = {
        ortb2: {
          device: {
            ext: {
              cdep: 'cookieDeprecationLabel'
            }
          }
        }
      };
      const bidRequests = [];
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.device.ext.cdep).to.equal('cookieDeprecationLabel');
    });
  });

  describe('interpretResponse', function () {
    const refererUrl = 'https://blue.com?pbt_debug=1&pbt_nolog=1';
    const bidderRequest = {
      refererInfo: {
        page: refererUrl,
        topmostLocation: refererUrl
      },
      timeout: 3000,
      gdprConsent: {
        gdprApplies: true,
        consentString: 'consentDataString',
        vendorData: {
          vendorConsents: {
            '91': 1
          },
        },
        apiVersion: 1,
      },
    };

    function mockResponse(winningBidId, mediaType) {
      return {
        id: 'test-requestId',
        seatbid: [
          {
            seat: 'blue',
            bid: [
              {
                id: 'test-bidderId',
                impid: winningBidId,
                price: 1.23,
                adomain: ['blue.com'],
                bundle: '',
                iurl: 'http://some_image/',
                cid: '123456',
                crid: 'test-crId',
                dealid: 'deal-code',
                w: 728,
                h: 90,
                adm: 'test-ad',
                adm_native: mediaType === NATIVE ? {
                  ver: '1.2',
                  assets: [
                    {
                      id: 10,
                      title: {
                        text: 'Some product'
                      }
                    },
                    {
                      id: 11,
                      img: {
                        type: 3,
                        url: 'https://main_image_url.com',
                        w: 400,
                        h: 400
                      }
                    },
                    {
                      id: 12,
                      data: {
                        value: 'Some product'
                      }
                    },
                    {
                      id: 13,
                      data: {
                        value: '1,499 TL'
                      }
                    },
                    {
                      id: 15,
                      data: {
                        value: 'CTA'
                      },
                      link: {
                        url: 'https://cta_url.com'
                      }
                    },
                    {
                      id: 17,
                      img: {
                        type: 1,
                        url: 'https://main_image_url.com',
                        w: 200,
                        h: 200
                      },
                      link: {
                        url: 'https://icon_image_url.com'
                      }
                    },
                    {
                      id: 16,
                      data: {
                        value: 'Some brand'
                      }
                    }
                  ],
                  eventtrackers: [
                    {
                      event: 1,
                      method: 1,
                      url: 'https://eventtrackers.com'
                    },
                    {
                      event: 1,
                      method: 1,
                      url: 'https://test_in_isolation.blue.com/tpd?dd=HTlW9l9xTEZqRHVlSHFiSWx5Q2VQMlEwSTJhNCUyQkxNazQ1Y29LR3ZmS2VTSDFsUGdkRHNoWjQ2UWp0SGtVZ1RTbHI0TFRpTlVqNWxiUkZOeGVFNjVraW53R0loRVJQNDJOY2R1eWxVdjBBQ1BEdVFvTyUyRlg3aWJaeUFha3UyemNNVGpmJTJCS1prc0FwRjZRJTJCQ2dpaFBJeVhZRmQlMkZURVZocUFRdm03OTdFZHZSbURNZWt4Uzh2M1NSUUxmTmhaTnNnRXd4VkZlOTdJOXdnNGZjaVolMkZWYmdYVjJJMkQ0eGxQaFIwQmVtWk1sQ09tNXlGY0Nwc09GTDladzExJTJGVExGNXJsdGpneERDeTMlMkJuNUlUcEU4NDFLMTZPc2ZoWFUwMmpGbDFpVjBPZUVtTlEwaWNOeHRyRFYyenRKd0lpJTJGTTElMkY1WGZ3Smo3aTh0bUJzdzZRdlZUSXppanNkamo3ekZNZjhKdjl2VDJ5eHV1YnVzdmdRdk5iWnprNXVFMVdmbGs0QU1QY0ozZQ'
                    }
                  ],
                  privacy: 'https://cta_url.com',
                  ext: {
                    privacy: {
                      imageurl: 'https://icon_image_url.com',
                      clickurl: 'https://cta_url.com',
                      longlegaltext: ''
                    }
                  }
                } : undefined,
                ext: {
                  mediatype: mediaType,
                  displayurl: mediaType === VIDEO ? 'http://test-ad' : undefined,
                  dsa: {
                    adrender: 1
                  },
                  meta: {
                    networkName: 'Blue'
                  },
                  videoPlayerType: mediaType === VIDEO ? 'RadiantMediaPlayer' : undefined,
                  videoPlayerConfig: mediaType === VIDEO ? {} : undefined,
                  cur: 'CUR'
                }
              }
            ]
          }
        ]
      };
    }

    it('should return an empty array when parsing an empty bid response', function () {
      const bidRequests = [];
      const response = {};
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(0);
    });

    it('should return an empty array when parsing a well-formed no bid response', function () {
      const bidRequests = [];
      const response = { seatbid: [] };
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse({ body: response }, request);
      expect(bids).to.have.lengthOf(0);
    });

    it('should properly parse a banner bid response', function () {
      const bidRequests = [{
        adUnitCode: 'test-requestId',
        bidId: 'test-bidId',
        mediaTypes: {
          banner: {
            sizes: [[728, 90]]
          }
        },
        params: {
          networkId: 456,
        }
      }];
      const response = mockResponse('test-bidId', BANNER);
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse({ body: response }, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal(BANNER);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].seatBidId).to.equal('test-bidderId')
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].currency).to.equal('CUR');
      expect(bids[0].width).to.equal(728);
      expect(bids[0].height).to.equal(90);
      expect(bids[0].ad).to.equal('test-ad');
      expect(bids[0].creativeId).to.equal('test-crId');
      expect(bids[0].dealId).to.equal('deal-code');
      expect(bids[0].meta.advertiserDomains[0]).to.equal('blue.com');
      expect(bids[0].meta.networkName).to.equal('Blue');
      expect(bids[0].meta.dsa.adrender).to.equal(1);
    });

    it('should properly parse a bid response when banner win with twin ad units', function () {
      const bidRequests = [{
        adUnitCode: 'test-requestId',
        bidId: 'test-bidId',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
        },
      }, {
        adUnitCode: 'test-requestId',
        bidId: 'test-bidId2',
        mediaTypes: {
          banner: {
            sizes: [[728, 90]]
          }
        },
        params: {
          networkId: 456,
        }
      }];
      const response = mockResponse('test-bidId2', BANNER);
      const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse({ body: response }, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal(BANNER);
      expect(bids[0].requestId).to.equal('test-bidId2');
      expect(bids[0].seatBidId).to.equal('test-bidderId')
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].currency).to.equal('CUR');
      expect(bids[0].width).to.equal(728);
      expect(bids[0].height).to.equal(90);
      expect(bids[0].ad).to.equal('test-ad');
      expect(bids[0].creativeId).to.equal('test-crId');
      expect(bids[0].dealId).to.equal('deal-code');
      expect(bids[0].meta.advertiserDomains[0]).to.equal('blue.com');
      expect(bids[0].meta.networkName).to.equal('Blue');
      expect(bids[0].meta.dsa.adrender).to.equal(1);
    });

    [{
      hasBidResponseLevelPafData: true,
      hasBidResponseBidLevelPafData: true,
      shouldContainsBidMetaPafData: true
    },
    {
      hasBidResponseLevelPafData: false,
      hasBidResponseBidLevelPafData: true,
      shouldContainsBidMetaPafData: false
    },
    {
      hasBidResponseLevelPafData: true,
      hasBidResponseBidLevelPafData: false,
      shouldContainsBidMetaPafData: false
    },
    {
      hasBidResponseLevelPafData: false,
      hasBidResponseBidLevelPafData: false,
      shouldContainsBidMetaPafData: false
    }].forEach(testCase =>
      it('should properly forward or not meta paf data', () => {
        const bidPafContentId = 'abcdef';
        const pafTransmission = {
          version: '12'
        };
        const bidRequests = [{
          bidId: 'test-bidId',
          adUnitCode: 'adUnitId',
          sizes: [[300, 250]],
          params: {
            networkId: 456,
          }
        }];
        const response = {
          id: 'test-requestId',
          seatbid: [{
            seat: 'blue',
            bid: [
              {
                id: 'test-bidderId',
                impid: 'test-bidId',
                w: 728,
                h: 90,
                ext: {
                  mediatype: BANNER,
                  paf: testCase.hasBidResponseBidLevelPafData ? {
                    content_id: bidPafContentId
                  } : undefined
                }
              }
            ]
          }],
          ext: (testCase.hasBidResponseLevelPafData ? {
            paf: {
              transmission: pafTransmission
            }
          } : undefined)
        };

        const request = spec.buildRequests(bidRequests, syncAddFPDToBidderRequest(bidderRequest));
        const bids = spec.interpretResponse({ body: response }, request);

        expect(bids).to.have.lengthOf(1);

        const expectedBidMetaPafData = {
          paf: {
            content_id: bidPafContentId,
            transmission: pafTransmission
          }
        };

        if (testCase.shouldContainsBidMetaPafData) {
          expect(bids[0].meta).to.deep.equal(expectedBidMetaPafData);
        } else {
          expect(bids[0].meta).not.to.deep.equal(expectedBidMetaPafData);
        }
      })
    )
  });
});
