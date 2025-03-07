import { expect } from 'chai';
import {
  spec, BIDDER_CODE, SERVER_PATH_US1_SYNC, SERVER_PATH_US1_EVENTS
} from '../../../modules/bridgeuppBidAdapter.js';
import * as utils from 'src/utils.js';
import * as ajax from 'src/ajax.js';
import { hook } from '../../../src/hook';
import { config } from '../../../src/config.js';
import { addFPDToBidderRequest } from '../../helpers/fpd';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';
import 'modules/consentManagementGpp.js';
import 'modules/priceFloors.js';
import sinon from 'sinon';

// constants
const SITE_DOMAIN_NAME = 'sonargames.com';
const SITE_PAGE = 'https://sonargames.com';
describe('bridgeuppBidAdapter_spec', function () {
  let utilsMock, sandbox, ajaxStub, fetchStub;

  afterEach(function () {
    sandbox.restore();
    utilsMock.restore();
    ajaxStub.restore();
    fetchStub.restore();
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    utilsMock = sinon.mock(utils);
    ajaxStub = sandbox.stub(ajax, 'ajax');
    fetchStub = sinon.stub(global, 'fetch').resolves(new Response('OK'));
  });

  describe('isBidRequestValid', function () {
    let bid;
    beforeEach(function () {
      bid = {
        'bidder': BIDDER_CODE,
        'params': {
          'siteId': 'site-id-12',
        }
      };
    });
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return false when missing bidder', function () {
      delete bid.bidder;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return false when bidder is not valid', function () {
      bid.bidder = 'invalid-bidder';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return false when missing siteId', function () {
      delete bid.params.siteId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
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
        page: 'https://sonarads.com/home',
        ref: 'https://referrer'
      },
      timeout: 1000,
      gdprConsent: {
        gdprApplies: true,
        consentString: 'consentDataString',
        vendorData: {
          vendorConsents: {
            '1300': 1
          },
        },
        apiVersion: 1,
      },
    };

    it('request should build with correct siteId', async function () {
      const bidRequests = [
        {
          bidId: 'bidId',
          bidder: 'sonarads',
          adUnitCode: 'bid-12',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            'siteId': 'site-id-12'
          }
        },
      ];

      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.imp[0].ext.bidder.siteId).to.deep.equal('site-id-12');
    });

    it('request should build with correct imp', async function () {
      const expectedMetric = {
        url: 'https://sonarads.com'
      }
      const bidRequests = [{
        bidId: 'bidId',
        bidder: 'sonarads',
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
            gpid: 'gpid_sonarads'
          },
          rwdd: 1
        },
        params: {
          siteId: 'site-id-12',
          bidfloor: 2.12,
          bidfloorcur: 'USD'
        }
      }];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.imp).to.have.lengthOf(1);
      expect(ortbRequest.imp[0].id).to.deep.equal('bidId');
      expect(ortbRequest.imp[0].tagid).to.deep.equal('impId');
      expect(ortbRequest.imp[0].instl).to.equal(1);
      expect(ortbRequest.imp[0].bidfloor).to.equal(2.12);
      expect(ortbRequest.imp[0].bidfloorcur).to.equal('USD');
      expect(ortbRequest.imp[0].metric).to.deep.equal(expectedMetric);
      expect(ortbRequest.imp[0].ext.gpid).to.equal('gpid_sonarads');
      expect(ortbRequest.imp[0].secure).to.equal(1);
      expect(ortbRequest.imp[0].rwdd).to.equal(1);
    });

    it('request should build with proper site data', async function () {
      const bidRequests = [
        {
          bidder: 'sonarads',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            siteId: 'site-id-12'
          },
        },
      ];
      const ortb2 = {
        site: {
          name: SITE_DOMAIN_NAME,
          domain: SITE_DOMAIN_NAME,
          keywords: 'keyword1, keyword2',
          cat: ['IAB2'],
          pagecat: ['IAB3'],
          sectioncat: ['IAB4'],
          page: SITE_PAGE,
          ref: 'google.com',
          privacypolicy: 1,
          content: {
            url: SITE_PAGE + '/games1'
          }
        }
      };
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest({...bidderRequest, ortb2})).data;
      expect(ortbRequest.site.domain).to.equal(SITE_DOMAIN_NAME);
      expect(ortbRequest.site.publisher.domain).to.equal('sonarads.com');
      expect(ortbRequest.site.page).to.equal(SITE_PAGE);
      expect(ortbRequest.site.name).to.equal(SITE_DOMAIN_NAME);
      expect(ortbRequest.site.keywords).to.equal('keyword1, keyword2');
      expect(ortbRequest.site.cat).to.deep.equal(['IAB2']);
      expect(ortbRequest.site.pagecat).to.deep.equal(['IAB3']);
      expect(ortbRequest.site.sectioncat).to.deep.equal(['IAB4']);
      expect(ortbRequest.site.ref).to.equal('google.com');
      expect(ortbRequest.site.privacypolicy).to.equal(1);
      expect(ortbRequest.site.content.url).to.equal(SITE_PAGE + '/games1')
    });

    it('request should build with proper device data', async function () {
      const bidRequests = [
        {
          bidder: 'sonarads',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            siteId: 'site-id-12'
          },
        },
      ];
      const ortb2 = {
        device: {
          dnt: 1,
          ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          ip: '203.0.113.42',
          h: 800,
          w: 1280,
          language: 'fr',
          lmt: 0,
          js: 0,
          connectiontype: 2,
          hwv: 'iPad',
          model: 'Pro',
          mccmnc: '234-030',
          geo: {
            lat: 48.8566,
            lon: 2.3522
          }
        }
      };
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest({...bidderRequest, ortb2})).data;
      expect(ortbRequest.device.dnt).to.equal(1);
      expect(ortbRequest.device.lmt).to.equal(0);
      expect(ortbRequest.device.js).to.equal(0);
      expect(ortbRequest.device.connectiontype).to.equal(2);
      expect(ortbRequest.device.ua).to.equal('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
      expect(ortbRequest.device.ip).to.equal('203.0.113.42');
      expect(ortbRequest.device.h).to.equal(800);
      expect(ortbRequest.device.w).to.equal(1280);
      expect(ortbRequest.device.language).to.deep.equal('fr');
      expect(ortbRequest.device.hwv).to.deep.equal('iPad');
      expect(ortbRequest.device.model).to.deep.equal('Pro');
      expect(ortbRequest.device.mccmnc).to.deep.equal('234-030');
      expect(ortbRequest.device.geo.lat).to.deep.equal(48.8566);
      expect(ortbRequest.device.geo.lon).to.deep.equal(2.3522);
    });

    it('should properly build a request with source object', async function () {
      const expectedSchain = {id: 'prebid'};
      const ortb2 = {
        source: {
          pchain: 'sonarads',
          schain: expectedSchain
        }
      };
      const bidRequests = [
        {
          bidder: 'sonarads',
          bidId: 'bidId',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            siteId: 'site-id-12',
          },
        },
      ];
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest({...bidderRequest, ortb2})).data;
      expect(ortbRequest.source.schain).to.deep.equal(expectedSchain);
      expect(ortbRequest.source.pchain).to.equal('sonarads');
    });

    it('should properly user object', async function () {
      const bidRequests = [
        {
          bidder: 'sonarads',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            siteId: 'site-id-12'
          }
        },
      ];
      const br = {
        ...bidderRequest,
        ortb2: {
          user: {
            yob: 2012,
            keyowrds: 'test test',
            gender: 'M',
            customdata: 'test no',
            geo: {
              lat: 48.8566,
              lon: 2.3522
            },
            ext: {
              eids: [
                {
                  source: 'sonarads.com',
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
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(br));
      const ortbRequest = request.data;
      expect(ortbRequest.user.yob).to.deep.equal(2012);
      expect(ortbRequest.user.keyowrds).to.deep.equal('test test');
      expect(ortbRequest.user.gender).to.deep.equal('M');
      expect(ortbRequest.user.customdata).to.deep.equal('test no');
      expect(ortbRequest.user.geo.lat).to.deep.equal(48.8566);
      expect(ortbRequest.user.geo.lon).to.deep.equal(2.3522);
      expect(ortbRequest.user.ext.eids).to.deep.equal([
        {
          source: 'sonarads.com',
          uids: [{
            id: 'iid',
            atype: 1
          }]
        }
      ]);
    });

    it('should properly build a request regs object', async function () {
      const bidRequests = [
        {
          bidder: 'sonarads',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            siteId: 'site-id-12'
          },
        },
      ];
      const ortb2 = {
        regs: {
          coppa: 1,
          gpp: 'consent_string',
          gpp_sid: [0, 1, 2],
          us_privacy: 'yes us privacy applied'
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest({...bidderRequest, ortb2})).data;
      expect(ortbRequest.regs.coppa).to.equal(1);
      expect(ortbRequest.regs.gpp).to.equal('consent_string');
      expect(ortbRequest.regs.gpp_sid).to.deep.equal([0, 1, 2]);
      expect(ortbRequest.regs.us_privacy).to.deep.equal('yes us privacy applied');
    });

    it('gdpr test', async function () {
      // using privacy params from global bidder Request
      const bidRequests = [
        {
          bidder: 'sonarads',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            siteId: 'site-id-12'
          },
        },
      ];
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.regs.ext.gdpr).to.deep.equal(1);
      expect(ortbRequest.user.ext.consent).to.equal('consentDataString');
    });

    it('should properly set tmax if available', async function () {
      // using tmax from global bidder Request
      const bidRequests = [
        {
          bidder: 'sonarads',
          adUnitCode: 'bid-1',
          transactionId: 'trans-1',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            siteId: 'site-id-12'
          }
        },
      ];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.tmax).to.equal(bidderRequest.timeout);
    });

    it('should properly build a request with bcat field', async function () {
      const bcat = ['IAB1', 'IAB2'];
      const bidRequests = [
        {
          bidder: 'sonarads',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            siteId: 'site-id-12',
          },
        },
      ];
      const bidderRequest = {
        ortb2: {
          bcat
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.bcat).to.deep.equal(bcat);
    });

    it('should properly build a request with badv field', async function () {
      const badv = ['nike.com'];
      const bidRequests = [
        {
          bidder: 'sonarads',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            siteId: 'site-id-12',
          },
        },
      ];
      const bidderRequest = {
        ortb2: {
          badv
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.badv).to.deep.equal(badv);
    });

    it('should properly build a request with bapp field', async function () {
      const bapp = ['nike.com'];
      const bidRequests = [
        {
          bidder: 'sonarads',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            siteId: 'site-id-12',
          },
        },
      ];
      const bidderRequest = {
        ortb2: {
          bapp
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.bapp).to.deep.equal(bapp);
    });

    it('banner request test', async function () {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidId: 'bidId',
          bidder: 'sonarads',
          adUnitCode: 'bid-12',
          mediaTypes: {
            banner: {
              sizes: [[320, 250]],
              pos: 1,
              topframe: 0,
            }
          },
          params: {
            siteId: 'site-id-12'
          },
          ortb2Imp: {
            banner: {
              api: [1, 2, 3],
              mimes: ['image/jpg', 'image/gif']
            }
          }
        },
      ];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.imp[0].banner).not.to.be.null;
      expect(ortbRequest.imp[0].banner.format[0].w).to.equal(320);
      expect(ortbRequest.imp[0].banner.format[0].h).to.equal(250);
      expect(ortbRequest.imp[0].banner.pos).to.equal(1);
      expect(ortbRequest.imp[0].banner.topframe).to.equal(0);
      expect(ortbRequest.imp[0].banner.api).to.deep.equal([1, 2, 3]);
      expect(ortbRequest.imp[0].banner.mimes).to.deep.equal(['image/jpg', 'image/gif']);
    });

    it('banner request test with sizes > 1', async function () {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidId: 'bidId',
          bidder: 'sonarads',
          adUnitCode: 'bid-12',
          mediaTypes: {
            banner: {
              sizes: [[336, 336], [720, 50]]
            }
          },
          params: {
            siteId: 'site-id-12'
          }
        },
      ];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.imp[0].banner).not.to.be.null;
      expect(ortbRequest.imp[0].banner.format[0].w).to.equal(336);
      expect(ortbRequest.imp[0].banner.format[0].h).to.equal(336);
      expect(ortbRequest.imp[0].banner.format[1].w).to.equal(720);
      expect(ortbRequest.imp[0].banner.format[1].h).to.equal(50);
    });

    it('should properly build a request when coppa is true', async function () {
      const bidRequests = [];
      const bidderRequest = {};
      config.setConfig({coppa: true});

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.regs.coppa).to.equal(1);
    });

    it('should properly build a request when coppa is false', async function () {
      const bidRequests = [];
      const bidderRequest = {};
      config.setConfig({coppa: false});
      let buildRequests = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const ortbRequest = buildRequests.data;
      expect(ortbRequest.regs.coppa).to.equal(0);
    });

    it('should properly build a request when coppa is not defined', async function () {
      const bidRequests = [];
      const bidderRequest = {};
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.regs?.coppa).to.be.undefined;
    });

    it('build a banner request with bidFloor', async function () {
      const bidRequests = [
        {
          bidder: 'sonarads',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50], [720, 90]]
            }
          },
          params: {
            siteId: 'site-id-12',
            bidfloor: 1,
            bidfloorcur: 'USD'
          }
        }
      ];
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].bidfloor).to.deep.equal(1);
      expect(ortbRequest.imp[0].bidfloorcur).to.deep.equal('USD');
    });

    it('build a banner request with getFloor', async function () {
      const bidRequests = [
        {
          bidder: 'sonarads',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            siteId: 'site-id-12'
          },
          getFloor: () => {
            return {currency: 'USD', floor: 1.23, size: '*', mediaType: '*'};
          }
        }
      ];
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].bidfloor).equal(1.23);
      expect(ortbRequest.imp[0].bidfloorcur).equal('USD');
    });
  });

  describe('interpretResponse', function () {
    const bidderRequest = {
      refererInfo: {
        page: 'https://sonarads.com/home',
        ref: 'https://referrer'
      },
      timeout: 1000,
      gdprConsent: {
        gdprApplies: true,
        consentString: 'consentDataString',
        vendorData: {
          vendorConsents: {
            '1300': 1
          },
        },
        apiVersion: 1,
      },
    }

    function mockResponse(bidId, mediaType) {
      return {
        id: 'sonarads-response-id-hash-123123',
        cur: 'USD',
        seatbid: [
          {
            bid: [
              {
                id: 'sonarads-seatbid-bid-id-hash-123qaasd34',
                impid: bidId,
                price: 1.12,
                adomain: ['advertiserDomain.sandbox.sonarads.com'],
                crid: '<adv>d3868d0b2f43c11e4bd60333e5e5ee8b<crid>e471c4061b3b0cd454539c7edb68a1ca',
                w: 320,
                h: 250,
                adm: 'test-ad',
                mtype: mediaType,
                nurl: 'https://et-l.w.sonarads.com/c.asm/',
                api: 3,
                cat: [],
                ext: {
                  prebid: {
                    meta: {
                      advertiserDomains: ['advertiserDomain.sandbox.sonarads.com'],
                      networkName: 'sonarads'
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
              { url: 'https://sync.sonarads.com/prebidjs' },
              { url: 'https://eus.rubiconproject.com/usync.html?p=test' }
            ]
          }
        }
      }
    }

    it('should returns an empty array when bid response is empty', async function () {
      const bidRequests = [];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const serverResponse = {
        headers: {
          get: function () {
            return undefined
          }
        },
        body: {}
      };

      const interpretedBids = spec.interpretResponse(serverResponse, request);
      expect(interpretedBids).to.have.lengthOf(0);
      expect(spec.reportEventsEnabled).to.equal(false);
    });

    it('should return an empty array when there is no bid response', async function () {
      const bidRequests = [];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const serverResponse = {
        headers: {
          get: function () {
            return undefined
          }
        },
        body: {seatbid: []}
      };

      const interpretedBids = spec.interpretResponse(serverResponse, request);
      expect(interpretedBids).to.have.lengthOf(0);
      expect(spec.reportEventsEnabled).to.equal(false);
    });

    it('return banner response', async function () {
      const bidRequests = [{
        adUnitCode: 'impId',
        bidId: 'bidId',
        mediaTypes: {
          banner: {
            sizes: [[320, 50]]
          }
        },
        params: {
          siteId: 'site-id-12',
        }
      }];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const serverResponse = {
        headers: {
          get: function () {
            return undefined
          }
        },
        body: mockResponse('bidId', 1)
      };
      const interpretedBids = spec.interpretResponse(serverResponse, request);
      expect(spec.reportEventsEnabled).to.equal(false);
      expect(interpretedBids).to.have.length(1);
      expect(interpretedBids[0].currency).to.deep.equal('USD');
      expect(interpretedBids[0].mediaType).to.deep.equal('banner');
      expect(interpretedBids[0].requestId).to.deep.equal('bidId');
      expect(interpretedBids[0].seatBidId).to.deep.equal('sonarads-seatbid-bid-id-hash-123qaasd34');
      expect(interpretedBids[0].cpm).to.equal(1.12);
      expect(interpretedBids[0].width).to.equal(320);
      expect(interpretedBids[0].height).to.equal(250);
      expect(interpretedBids[0].creativeId).to.deep.equal('<adv>d3868d0b2f43c11e4bd60333e5e5ee8b<crid>e471c4061b3b0cd454539c7edb68a1ca');
      expect(interpretedBids[0].meta.advertiserDomains[0]).to.deep.equal('advertiserDomain.sandbox.sonarads.com');
    });

    it('should set the reportEventsEnabled to true as part of the response', async function () {
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
          siteId: 'site-id-12',
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
          siteId: 'site-id-12',
        }
      }];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const serverResponse = {
        headers: {
          get: function (header) {
            if (header === 'reportEventsEnabled') {
              return 1;
            }
          }
        },
        body: mockResponse('bidId2', 1)
      };

      const interpretedBids = spec.interpretResponse(serverResponse, request);
      expect(spec.reportEventsEnabled).to.equal(true);
      expect(interpretedBids).to.have.length(1);
    });

    it('bid response when banner wins among two ad units', async function () {
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
          siteId: 'site-id-12',
        },
      }, {
        adUnitCode: 'impId',
        bidId: 'bidId2',
        mediaTypes: {
          banner: {
            sizes: [[320, 250]]
          }
        },
        params: {
          siteId: 'site-id-12',
        }
      }];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const serverResponse = {
        headers: {
          get: function (header) {
            if (header === 'reportEventsEnabled') {
              return 1;
            }
          }
        },
        body: mockResponse('bidId2', 1)
      };

      const interpretedBids = spec.interpretResponse(serverResponse, request);
      expect(spec.reportEventsEnabled).to.equal(true);
      expect(interpretedBids[0].currency).to.deep.equal('USD');
      expect(interpretedBids[0].mediaType).to.deep.equal('banner');
      expect(interpretedBids[0].requestId).to.deep.equal('bidId2');
      expect(interpretedBids[0].cpm).to.equal(1.12);
      expect(interpretedBids[0].seatBidId).to.deep.equal('sonarads-seatbid-bid-id-hash-123qaasd34');
      expect(interpretedBids[0].creativeId).to.deep.equal('<adv>d3868d0b2f43c11e4bd60333e5e5ee8b<crid>e471c4061b3b0cd454539c7edb68a1ca');
      expect(interpretedBids[0].width).to.equal(320);
      expect(interpretedBids[0].height).to.equal(250);
      expect(interpretedBids[0].meta.advertiserDomains[0]).to.deep.equal('advertiserDomain.sandbox.sonarads.com');
    });
  });

  describe('getUserSyncs', function () {
    it('should return empty if iframe disabled and pixelEnabled is false', function () {
      const res = spec.getUserSyncs({});
      expect(res).to.deep.equal([]);
    });

    it('should return user sync if iframe enabled is true', function () {
      const res = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true });
      expect(res).to.deep.equal([{ type: 'iframe', url: `${SERVER_PATH_US1_SYNC}` }]);
    });

    it('should return user sync if iframe enabled is true and gdpr not present', function () {
      const res = spec.getUserSyncs({ iframeEnabled: true }, {}, { gdprApplies: false });
      expect(res).to.deep.equal([{ type: 'iframe', url: `${SERVER_PATH_US1_SYNC}` }]);
    });

    it('should return user sync if iframe enabled is true and gdpr = 1 and gdpr consent present', function () {
      const res = spec.getUserSyncs({ iframeEnabled: true }, {}, { gdprApplies: true, consentString: 'GDPR_CONSENT' });
      expect(res).to.deep.equal([{ type: 'iframe', url: `${SERVER_PATH_US1_SYNC}?gdpr=1&gdpr_consent=GDPR_CONSENT` }]);
    });

    it('should return user sync if iframe enabled is true and gdpr = 1 , gdpr consent present and usp_consent present', function () {
      const res = spec.getUserSyncs({ iframeEnabled: true }, {}, { gdprApplies: true, consentString: 'GDPR_CONSENT' }, 'USP_CONSENT');
      expect(res).to.deep.equal([{ type: 'iframe', url: `${SERVER_PATH_US1_SYNC}?gdpr=1&gdpr_consent=GDPR_CONSENT&us_privacy=USP_CONSENT` }]);
    });

    it('should return user sync if iframe enabled is true usp_consent present and gppConsent present', function () {
      const res = spec.getUserSyncs({ iframeEnabled: true }, {}, { gdprApplies: false, consentString: undefined }, 'USP_CONSENT', { gppString: 'GPP_STRING', applicableSections: [32, 51] });
      expect(res).to.deep.equal([{ type: 'iframe', url: `${SERVER_PATH_US1_SYNC}?us_privacy=USP_CONSENT&gpp=GPP_STRING&gpp_sid=32%2C51` }]);
    });
  });

  describe('onTimeout', function () {
    it('onTimeout function should be defined', function () {
      expect(spec.onTimeout).to.exist.and.to.be.a('function');
    });

    it('should invoke onTimeout, resolving the eventType and domain', function () {
      const bid = [
        {
          bidder: 'sonarads',
          bidId: 'sonar-bid-id-1231232',
          adUnitCode: 'sonar-ad-1231232',
          timeout: 1000,
          auctionId: 'sonar-auction-1231232'
        }
      ];
      spec.reportEventsEnabled = true;
      spec.onTimeout(bid);

      // expected url and payload
      const expectedUrl = `${SERVER_PATH_US1_EVENTS}`;
      const expectedPayload = JSON.stringify({
        domain: location.hostname,
        prebidVersion: '$prebid.version$',
        eventType: 'onTimeout',
        eventPayload: bid
      });

      // assert statements
      expect(fetchStub.callCount).to.be.equal(1);

      const fetchArgs = fetchStub.getCall(0).args;
      expect(fetchArgs[0]).to.equal(expectedUrl);
      const actualPayload = fetchArgs[1]?.body;
      expect(actualPayload).to.equal(expectedPayload);
      expect(fetchArgs[1]).to.deep.include({
        method: 'POST',
        keepalive: true,
      });
      expect(fetchArgs[1]?.headers).to.deep.equal({
        'Content-Type': 'application/json',
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
    it('onSetTargeting function should be defined', function () {
      expect(spec.onSetTargeting).to.exist.and.to.be.a('function');
    });

    it('should invoke onSetTargeting, resolving the eventType and domain', function () {
      const bid = [
        {
          bidder: 'sonarads',
          bidId: 'sonar-bid-id-1231232',
          adUnitCode: 'sonar-ad-1231232',
          timeout: 1000,
          auctionId: 'sonar-auction-1231232'
        }
      ];
      spec.reportEventsEnabled = true;
      spec.onSetTargeting(bid);

      // expected url and payload
      const expectedUrl = `${SERVER_PATH_US1_EVENTS}`;
      const expectedPayload = JSON.stringify({
        domain: location.hostname,
        prebidVersion: '$prebid.version$',
        eventType: 'onSetTargeting',
        eventPayload: bid
      });

      // assert statements
      expect(fetchStub.callCount).to.be.equal(1);

      const fetchArgs = fetchStub.getCall(0).args;
      expect(fetchArgs[0]).to.equal(expectedUrl);
      const actualPayload = fetchArgs[1]?.body;
      expect(actualPayload).to.equal(expectedPayload);
      expect(fetchArgs[1]).to.deep.include({
        method: 'POST',
        keepalive: true,
      });
      expect(fetchArgs[1]?.headers).to.deep.equal({
        'Content-Type': 'application/json',
      });
    });

    it('onSetTargeting should not be called if the bid data is null', function () {
      // Call onSetTargeting with null data
      spec.onSetTargeting(null);
      // Assert that ajax was not called since bid data is null
      expect(fetchStub.callCount).to.be.equal(0);
    });
  });

  describe('onAdRenderSucceeded', function () {
    it('onAdRenderSucceeded function should be defined', function () {
      expect(spec.onAdRenderSucceeded).to.exist.and.to.be.a('function');
    });

    it('should invoke onAdRenderSucceeded, resolving the eventType and domain', function () {
      const bid = [
        {
          bidder: 'sonarads',
          bidId: 'sonar-bid-id-1231232',
          adUnitCode: 'sonar-ad-1231232',
          timeout: 1000,
          auctionId: 'sonar-auction-1231232'
        }
      ];

      spec.reportEventsEnabled = true;
      spec.onAdRenderSucceeded(bid);

      // expected url and payload
      const expectedUrl = `${SERVER_PATH_US1_EVENTS}`;
      const expectedPayload = JSON.stringify({
        domain: location.hostname,
        prebidVersion: '$prebid.version$',
        eventType: 'onAdRenderSucceeded',
        eventPayload: bid
      });

      // assert statements
      expect(fetchStub.callCount).to.be.equal(1);

      const fetchArgs = fetchStub.getCall(0).args;
      expect(fetchArgs[0]).to.equal(expectedUrl);
      const actualPayload = fetchArgs[1]?.body;
      expect(actualPayload).to.equal(expectedPayload);
      expect(fetchArgs[1]).to.deep.include({
        method: 'POST',
        keepalive: true,
      });
      expect(fetchArgs[1]?.headers).to.deep.equal({
        'Content-Type': 'application/json',
      });
    });

    it('onAdRenderSucceeded should not be called if the bid data is null', function () {
      // Call onAdRenderSucceeded with null data
      spec.onAdRenderSucceeded(null);
      // Assert that ajax was not called since bid data is null
      expect(fetchStub.callCount).to.be.equal(0);
    });
  });

  describe('onBidderError', function () {
    it('onBidderError function should be defined', function () {
      expect(spec.onBidderError).to.exist.and.to.be.a('function');
    });

    it('should invoke onBidderError, resolving the eventType and domain', function () {
      const bid = [
        {
          bidder: 'sonarads',
          bidId: 'sonar-bid-id-1231232',
          adUnitCode: 'sonar-ad-1231232',
          timeout: 1000,
          auctionId: 'sonar-auction-1231232'
        }
      ];
      spec.reportEventsEnabled = true;
      spec.onBidderError(bid);

      // expected url and payload
      const expectedUrl = `${SERVER_PATH_US1_EVENTS}`;
      const expectedPayload = JSON.stringify({
        domain: location.hostname,
        prebidVersion: '$prebid.version$',
        eventType: 'onBidderError',
        eventPayload: bid
      });

      // assert statements
      expect(fetchStub.callCount).to.be.equal(1);

      const fetchArgs = fetchStub.getCall(0).args;
      expect(fetchArgs[0]).to.equal(expectedUrl);
      const actualPayload = fetchArgs[1]?.body;
      expect(actualPayload).to.equal(expectedPayload);
      expect(fetchArgs[1]).to.deep.include({
        method: 'POST',
        keepalive: true,
      });
      expect(fetchArgs[1]?.headers).to.deep.equal({
        'Content-Type': 'application/json',
      });
    });

    it('onBidderError should not be called if the bid data is null', function () {
      // Call onBidderError with null data
      spec.onBidderError(null);
      // Assert that ajax was not called since bid data is null
      expect(fetchStub.callCount).to.be.equal(0);
    });
  });

  describe('onBidWon', function () {
    it('onBidWon function should be defined', function () {
      expect(spec.onBidWon).to.exist.and.to.be.a('function');
    });

    it('should invoke onBidWon, resolving the eventType and domain', function () {
      const bid = [
        {
          bidder: 'sonarads',
          bidId: 'sonar-bid-id-1231232',
          adUnitCode: 'sonar-ad-1231232',
          timeout: 1000,
          auctionId: 'sonar-auction-1231232'
        }
      ];
      spec.reportEventsEnabled = true;
      spec.onBidWon(bid);

      // expected url and payload
      const expectedUrl = `${SERVER_PATH_US1_EVENTS}`;
      const expectedPayload = JSON.stringify({
        domain: location.hostname,
        prebidVersion: '$prebid.version$',
        eventType: 'onBidWon',
        eventPayload: bid
      });

      // assert statements
      expect(fetchStub.callCount).to.be.equal(1);

      const fetchArgs = fetchStub.getCall(0).args;
      expect(fetchArgs[0]).to.equal(expectedUrl);
      const actualPayload = fetchArgs[1]?.body;
      expect(actualPayload).to.equal(expectedPayload);
      expect(fetchArgs[1]).to.deep.include({
        method: 'POST',
        keepalive: true,
      });
      expect(fetchArgs[1]?.headers).to.deep.equal({
        'Content-Type': 'application/json',
      });
    });

    it('onBidWon should not be called if the bid data is null', function () {
      // Call onBidWon with null data
      spec.onBidWon(null);
      // Assert that ajax was not called since bid data is null
      expect(fetchStub.callCount).to.be.equal(0);
    });
  });
});
