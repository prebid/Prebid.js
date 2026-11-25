import { expect } from 'chai';
import {
  spec, COOKIE_SYNC_LOADER,
} from 'modules/inmobiVantageBidAdapter.js';
import * as utils from 'src/utils.js';
import { NATIVE, VIDEO } from '../../../src/mediaTypes.js';
import { hook } from '../../../src/hook.js';
import { config } from '../../../src/config.js';
import { addFPDToBidderRequest } from '../../helpers/fpd.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';
import 'modules/consentManagementGpp.js';
import 'modules/priceFloors.js';
import sinon from 'sinon';

describe('The inmobiVantage bidding adapter', function () {
  let utilsMock, sandbox;

  beforeEach(function () {
    // mock objects
    utilsMock = sinon.mock(utils);
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    utilsMock.restore();
    sandbox.restore();
  });

  describe('isBidRequestValid', function () {
    it('should return false when an invalid bid is provided', function () {
      const bid = {
        bidder: 'inmobiVantage',
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(false);
    });

    it('should return true when the bid contains tagID and siteID', function () {
      const bid = {
        bidder: 'inmobiVantage',
        params: {
          tagID: '123a', siteID: 'site-1',
        },
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });

    it('should return false when tagID is missing', function () {
      const bid = {
        bidder: 'inmobiVantage',
        params: {
          siteID: 'site-1',
        },
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when siteID is missing', function () {
      const bid = {
        bidder: 'inmobiVantage',
        params: {
          tagID: '123a',
        },
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    before(() => {
      hook.ready();
    });
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

    it('should register under the inmobiVantage bidder code', function () {
      expect(spec.code).to.equal('inmobiVantage');
    });

    it('request should be sent to the InMobi Prebid Server endpoint', async function () {
      const bidRequests = [
        {
          bidId: 'bidId',
          bidder: 'inmobiVantage',
          adUnitCode: 'bid-12',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            tagID: '123', siteID: 'site-1'
          }
        },
      ];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      expect(request.url).to.equal('https://pbs.inmobi.com/openrtb2/auction/pbjs');
      expect(request.method).to.equal('POST');
      expect(request.options.withCredentials).to.equal(true);
    });

    it('request should map tagID to the imp-level stored request and imp.tagid', async function () {
      const bidRequests = [
        {
          bidId: 'bidId',
          bidder: 'inmobiVantage',
          adUnitCode: 'bid-12',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            tagID: '123', siteID: 'site-1', bidfloor: 0.5
          }
        },
      ];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.imp[0].ext.prebid.storedrequest.id).to.equal('123');
      expect(ortbRequest.imp[0].ext.params).to.be.undefined;
      expect(ortbRequest.imp[0].tagid).to.equal('123');
    });

    it('request should map siteID to the request-level stored request', async function () {
      const bidRequests = [
        {
          bidId: 'bidId',
          bidder: 'inmobiVantage',
          adUnitCode: 'bid-12',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            tagID: '123', siteID: 'site-1'
          }
        },
      ];
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.ext.prebid.storedrequest.id).to.equal('site-1');
      expect(ortbRequest.ext.prebid.channel.name).to.equal('pbjs_Vantage');
      expect(ortbRequest.ext.prebid.passthrough.inmobiVantage.siteID).to.equal('site-1');
    });

    it('request should build with correct imp', async function () {
      const expectedMetric = {
        url: 'https://inmobi.com'
      };
      const bidRequests = [{
        bidId: 'bidId',
        bidder: 'inmobiVantage',
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
          tagID: '123ai',
          siteID: 'site-1',
          bidfloor: 4.66,
          bidfloorcur: 'USD'
        }
      }];

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp).to.have.lengthOf(1);
      expect(ortbRequest.imp[0].id).to.deep.equal('bidId');
      expect(ortbRequest.imp[0].tagid).to.deep.equal('123ai');
      expect(ortbRequest.imp[0].instl).to.equal(1);
      expect(ortbRequest.imp[0].bidfloor).to.equal(4.66);
      expect(ortbRequest.imp[0].bidfloorcur).to.equal('USD');
      expect(ortbRequest.imp[0].metric).to.deep.equal(expectedMetric);
      expect(ortbRequest.imp[0].secure).to.equal(0);
      expect(ortbRequest.imp[0].ext.gpid).to.equal('gpid_inmobi');
      expect(ortbRequest.imp[0].rwdd).to.equal(1);
    });

    it('request should build with proper site data', async function () {
      const bidRequests = [
        {
          bidder: 'inmobiVantage',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            tagID: '1234a', siteID: 'site-1',
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
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest({ ...bidderRequest, ortb2 })).data;
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
      expect(ortbRequest.site.content.url).to.equal('https://raapchikgames.com/games1');
    });

    it('request should build with proper device data', async function () {
      const bidRequests = [
        {
          bidder: 'inmobiVantage',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            tagID: '1234a', siteID: 'site-1',
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
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest({ ...bidderRequest, ortb2 })).data;
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

    it('should properly build a request with source object', async function () {
      const expectedSchain = { id: 'prebid' };
      const ortb2 = {
        source: {
          pchain: 'inmobi',
          schain: expectedSchain
        }
      };
      const bidRequests = [
        {
          bidder: 'inmobiVantage',
          bidId: 'bidId',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            tagID: '124', siteID: 'site-1',
          },
        },
      ];
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest({ ...bidderRequest, ortb2 })).data;
      expect(ortbRequest.source.ext.schain).to.deep.equal(expectedSchain);
      expect(ortbRequest.source.pchain).to.equal('inmobi');
    });

    it('should properly user object', async function () {
      const bidRequests = [
        {
          bidder: 'inmobiVantage',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            tagID: '123', siteID: 'site-1'
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
      };
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(br));
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

    it('should properly build a request regs object', async function () {
      const bidRequests = [
        {
          bidder: 'inmobiVantage',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            tagID: '1234a', siteID: 'site-1',
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

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest({ ...bidderRequest, ortb2 })).data;
      expect(ortbRequest.regs.coppa).to.equal(1);
      expect(ortbRequest.regs.ext.gpp).to.equal('gpp_consent_string');
      expect(ortbRequest.regs.ext.gpp_sid).to.deep.equal([0, 1, 2]);
      expect(ortbRequest.regs.ext.us_privacy).to.deep.equal('yes us privacy applied');
    });

    it('gdpr test', async function () {
      // using privacy params from global bidder Request
      const bidRequests = [
        {
          bidder: 'inmobiVantage',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            tagID: '1234a', siteID: 'site-1',
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
          bidder: 'inmobiVantage',
          adUnitCode: 'bid-1',
          transactionId: 'trans-1',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            tagID: '123', siteID: 'site-1'
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
          bidder: 'inmobiVantage',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            tagID: '123a', siteID: 'site-1',
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
      const badv = ['ford.com'];
      const bidRequests = [
        {
          bidder: 'inmobiVantage',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            tagID: '12ea', siteID: 'site-1',
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
      const bapp = ['raapchik.com'];
      const bidRequests = [
        {
          bidder: 'inmobiVantage',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            tagID: '123a', siteID: 'site-1',
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
          bidder: 'inmobiVantage',
          adUnitCode: 'bid-12',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]],
              pos: 1,
              topframe: 0,
            }
          },
          params: {
            tagID: '123', siteID: 'site-1'
          },
          ortb2Imp: {
            banner: {
              api: [1, 2],
              mimes: ['image/jpg', 'image/gif']
            }
          }
        },
      ];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.imp[0].banner).not.to.be.null;
      expect(ortbRequest.imp[0].banner.format[0].w).to.equal(320);
      expect(ortbRequest.imp[0].banner.format[0].h).to.equal(50);
      expect(ortbRequest.imp[0].banner.pos).to.equal(1);
      expect(ortbRequest.imp[0].banner.topframe).to.equal(0);
      expect(ortbRequest.imp[0].banner.api).to.deep.equal([1, 2]);
      expect(ortbRequest.imp[0].banner.mimes).to.deep.equal(['image/jpg', 'image/gif']);
    });

    it('banner request test with sizes > 1', async function () {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidId: 'bidId',
          bidder: 'inmobiVantage',
          adUnitCode: 'bid-12',
          mediaTypes: {
            banner: {
              sizes: [[320, 50], [720, 50]]
            }
          },
          params: {
            tagID: '123', siteID: 'site-1'
          }
        },
      ];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.imp[0].banner).not.to.be.null;
      expect(ortbRequest.imp[0].banner.format[0].w).to.equal(320);
      expect(ortbRequest.imp[0].banner.format[0].h).to.equal(50);
      expect(ortbRequest.imp[0].banner.format[1].w).to.equal(720);
      expect(ortbRequest.imp[0].banner.format[1].h).to.equal(50);
    });

    if (FEATURES.VIDEO) {
      it('video request test', async function () {
        const bidRequests = [
          {
            bidder: 'inmobiVantage',
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
                skip: 1,
                minduration: 5,
                startdelay: 5,
                playbackmethod: [1, 3],
                placement: 2
              }
            },
            params: {
              tagID: '123', siteID: 'site-1'
            },
          },
        ];
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
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
      it('video request with player size > 1 ', async function () {
        const bidRequests = [
          {
            bidder: 'inmobiVantage',
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
                skip: 1,
                minduration: 5,
                startdelay: 5,
                playbackmethod: [1, 3],
                placement: 2
              }
            },
            params: {
              tagID: '123', siteID: 'site-1'
            },
          },
        ];
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        const ortbRequest = request.data;
        expect(ortbRequest.imp).to.have.lengthOf(1);
        expect(ortbRequest.imp[0].video.w).to.be.equal(640);
        expect(ortbRequest.imp[0].video.h).to.be.equal(360);
      });
    }

    if (FEATURES.VIDEO) {
      it('video request test when skip is 0', async function () {
        const bidRequests = [
          {
            bidder: 'inmobiVantage',
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
                skip: 0,
                minduration: 5,
                startdelay: 5,
                playbackmethod: [1, 3],
                placement: 2
              }
            },
            params: {
              tagID: '123', siteID: 'site-1'
            },
          },
        ];
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        const ortbRequest = request.data;
        expect(ortbRequest.imp).to.have.lengthOf(1);
        expect(ortbRequest.imp[0].video.skip).to.equal(0);
      });
    }

    if (FEATURES.NATIVE) {
      it('native request test without assests', async function () {
        const bidRequests = [
          {
            mediaTypes: {
              native: {}
            },
            params: {
              'tagID': '123a', 'siteID': 'site-1'
            }
          },
        ];
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        const ortbRequest = request.data;
        expect(ortbRequest.imp[0].native).to.be.undefined;
      });
    }

    if (FEATURES.NATIVE) {
      it('native request with assets', async function () {
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
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        const ortbRequest = request.data;

        expect(ortbRequest.imp[0].native.request).to.not.be.null;
        const nativeRequest = JSON.parse(ortbRequest.imp[0].native.request);
        expect(nativeRequest).to.have.property('assets');
        expect(nativeRequest.assets).to.deep.equal(assets);
      });
    }

    it('should properly build a request when coppa flag is true', async function () {
      const bidRequests = [];
      const bidderRequest = {};
      config.setConfig({ coppa: true });
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.regs.coppa).to.equal(1);
    });

    it('should properly build a request when coppa flag is false', async function () {
      const bidRequests = [];
      const bidderRequest = {};
      config.setConfig({ coppa: false });
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.regs.coppa).to.equal(0);
    });

    it('should properly build a request when coppa flag is not defined', async function () {
      const bidRequests = [];
      const bidderRequest = {};
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.regs?.coppa).to.be.undefined;
    });

    it('build a banner request with bidFloor', async function () {
      const bidRequests = [
        {
          bidder: 'inmobiVantage',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50], [720, 90]]
            }
          },
          params: {
            tagID: '123a',
            siteID: 'site-1',
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
          bidder: 'inmobiVantage',
          adUnitCode: 'impId',
          mediaTypes: {
            banner: {
              sizes: [[320, 50]]
            }
          },
          params: {
            tagID: '123a', siteID: 'site-1'
          },
          getFloor: inputParams => {
            return { currency: 'USD', floor: 1.23, size: '*', mediaType: '*' };
          }
        }
      ];
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].bidfloor).equal(1.23);
      expect(ortbRequest.imp[0].bidfloorcur).equal('USD');
    });

    if (FEATURES.VIDEO) {
      it('build a video request with bidFloor', async function () {
        const bidRequests = [
          {
            bidder: 'inmobiVantage',
            adUnitCode: 'impId',
            mediaTypes: {
              video: {
                playerSize: [[480, 320], [720, 480]]
              }
            },
            params: {
              tagID: '123a',
              siteID: 'site-1',
              bidfloor: 1,
              bidfloorcur: 'USD'
            }
          }
        ];
        const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
        expect(ortbRequest.imp[0].bidfloor).to.equal(1);
        expect(ortbRequest.imp[0].bidfloorcur).to.equal('USD');
      });
    }

    if (FEATURES.VIDEO) {
      it('build a video request with getFloor', async function () {
        const bidRequests = [
          {
            bidder: 'inmobiVantage',
            adUnitCode: 'impId',
            mediaTypes: {
              video: {
                playerSize: [[480, 320], [720, 480]]
              }
            },
            params: {
              tagID: '123a', siteID: 'site-1'
            },
            getFloor: inputParams => {
              return { currency: 'USD', floor: 1.23, size: '*', mediaType: '*' };
            }
          }
        ];
        const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
        expect(ortbRequest.imp[0].bidfloor).to.equal(1.23);
        expect(ortbRequest.imp[0].bidfloorcur).to.equal('USD');
      });
    }

    if (FEATURES.NATIVE && FEATURES.VIDEO) {
      it('build a mutli format request with getFloor', async function () {
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
            bidder: 'inmobiVantage',
            adUnitCode: 'impId',
            mediaTypes: {
              banner: {
                sizes: [[320, 50], [720, 90]]
              },
              video: {
                playerSize: [640, 480],
              },
              native: {}
            },
            nativeOrtbRequest: {
              assets: assets
            },
            params: {
              tagID: '12456', siteID: 'site-1'
            },
            getFloor: inputParams => {
              return { currency: 'USD', floor: 1.23, size: '*', mediaType: '*' };
            }
          },
        ];
        const bidderRequest = {};
        const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
        expect(ortbRequest.imp[0].banner).not.to.be.undefined;
        expect(ortbRequest.imp[0].video).not.to.be.undefined;
        expect(ortbRequest.imp[0].native.request).not.to.be.undefined;
        expect(ortbRequest.imp[0].bidfloor).to.deep.equal(1.23);
        expect(ortbRequest.imp[0].bidfloorcur).to.deep.equal('USD');
      });
    }

    if (FEATURES.VIDEO) {
      it('build a multi imp request', async function () {
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
              skip: 1,
              minduration: 5,
              startdelay: 5,
              playbackmethod: [1, 3],
              placement: 2
            }
          },
          params: {
            tagID: '123', siteID: 'site-1'
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
            tagID: '123', siteID: 'site-1',
          }
        }];
        const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
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
      it('build a multi format request', async function () {
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
            tagID: '123', siteID: 'site-1'
          },
        }];
        const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
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
    const responses = [{
      body: {
        seatbid: [{ seat: 'inmobi' }, { seat: 'rubicon' }],
        ext: { responsetimemillis: { inmobi: 80, rubicon: 120, pubmatic: 95 } }
      }
    }];

    function syncParams(syncs) {
      return new URL(syncs[0].url).searchParams;
    }

    it('should return no syncs when iframes are disabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, responses);
      expect(syncs).to.deep.equal([]);
    });

    it('should return no syncs when Prebid Server called no bidders', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, []);
      expect(syncs).to.deep.equal([]);
    });

    it('should return one loader iframe to the Prebid sync queue', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, responses);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url.startsWith(`${COOKIE_SYNC_LOADER}?`)).to.equal(true);
    });

    it('should sync every bidder Prebid Server called, including the ones without bids', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, responses);
      expect(syncParams(syncs).get('bidders')).to.equal('inmobi,rubicon,pubmatic');
    });

    it('should fall back to the response seats when responsetimemillis is missing', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true },
        [{ body: { seatbid: [{ seat: 'rubicon' }, { seat: 'rubicon' }] } }]);
      expect(syncParams(syncs).get('bidders')).to.equal('rubicon');
    });

    it('should pass privacy signals to the loader', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, responses,
        { gdprApplies: true, consentString: 'GDPR_CONSENT' }, 'USP_CONSENT',
        { gppString: 'GPP_STRING', applicableSections: [32, 51] });
      const params = syncParams(syncs);
      expect(params.get('gdpr')).to.equal('1');
      expect(params.get('gdpr_consent')).to.equal('GDPR_CONSENT');
      expect(params.get('us_privacy')).to.equal('USP_CONSENT');
      expect(params.get('gpp')).to.equal('GPP_STRING');
      expect(params.get('gpp_sid')).to.equal('32,51');
    });

    it('should not send gdpr_consent when gdpr does not apply', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, responses,
        { gdprApplies: false, consentString: 'GDPR_CONSENT' });
      expect(syncParams(syncs).get('gdpr')).to.equal('0');
      expect(syncParams(syncs).has('gdpr_consent')).to.equal(false);
    });

    it('should not send coop_sync so Prebid Server config decides', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, responses);
      expect(syncParams(syncs).has('coop_sync')).to.equal(false);
    });

    it('should send the account echoed back in the response passthrough', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [{
        body: {
          ext: {
            responsetimemillis: { rubicon: 120 },
            prebid: { passthrough: { inmobiVantage: { siteID: 'site-1' } } }
          }
        }
      }]);
      expect(syncParams(syncs).get('account')).to.equal('site-1');
    });

    it('should not send an account when the response has no passthrough', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, responses);
      expect(syncParams(syncs).has('account')).to.equal(false);
    });

    it('should tell the loader to skip image syncs when pixels are disabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, responses);
      expect(syncParams(syncs).get('image')).to.equal('0');
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
        ]
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
        ]
      };
    };

    it('returns an empty array when bid response is empty', async function () {
      const bidRequests = [];
      const response = {};
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(0);
    });

    it('should return an empty array when there is no bid response', async function () {
      const bidRequests = [];
      const response = { seatbid: [] };
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse({ body: response }, request);
      expect(bids).to.have.lengthOf(0);
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
          tagID: '124a', siteID: 'site-1',
        }
      }];
      const response = mockResponse('bidId', 1);
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
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
          tagID: '123', siteID: 'site-1',
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
          tagID: '123', siteID: 'site-1',
        }
      }];
      const response = mockResponse('bidId2', 1);
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
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
      it('return instream video response', async function () {
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
            tagID: '123a1', siteID: 'site-1',
          },
        }];
        const response = mockResponse('bidId', 2);
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
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
      it('return video outstream response', async function () {
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
            tagID: '123a1', siteID: 'site-1',
          },
        }];
        const response = mockResponse('bidId', 2);
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
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
      it('bid response when video wins among two ad units', async function () {
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
            tagID: '123', siteID: 'site-1',
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
            tagID: '123', siteID: 'site-1',
          }
        }];
        const response = mockResponse('bidId', 2);
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
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
      it('should correctly parse a native bid response', async function () {
        const bidRequests = [{
          adUnitCode: 'impId',
          bidId: 'bidId',
          params: {
            tagID: '123', siteID: 'site-1',
          },
          native: true,
          bidder: 'inmobiVantage',
          mediaTypes: {
            native: {
              image: {
                required: true,
                sizes: [120, 60],
                sendId: true,
              }
            }
          }
        }];
        const response = mockResponseNative('bidId', 4);
        const expectedAdmNativeOrtb = JSON.parse(response.seatbid[0].bid[0].adm).native;
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        const bids = spec.interpretResponse({ body: response }, request);

        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(NATIVE);
        // testing
        expect(bids[0].requestId).to.deep.equal('bidId');
        expect(bids[0].seatBidId).to.deep.equal('20dd72ed-930f-1000-e56f-07c37a793f30');
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
      it('should correctly parse a native bid response when there are two ad units', async function () {
        const bidRequests = [{
          adUnitCode: 'impId',
          bidId: 'bidId',
          params: {
            tagID: '123', siteID: 'site-1',
          },
          native: true,
          bidder: 'inmobiVantage',
          mediaTypes: {
            native: {
              image: {
                required: true,
                sizes: [120, 60],
                sendId: true,
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
            tagID: '123', siteID: 'site-1',
          }
        }];
        const response = mockResponseNative('bidId', 4);
        const expectedAdmNativeOrtb = JSON.parse(response.seatbid[0].bid[0].adm).native;
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        const bids = spec.interpretResponse({ body: response }, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(NATIVE);
        // testing
        expect(bids[0].requestId).to.deep.equal('bidId');
        expect(bids[0].seatBidId).to.deep.equal('20dd72ed-930f-1000-e56f-07c37a793f30');
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

    it('should put PBS ext.prebid.meta at the top level of meta', async function () {
      const bidRequests = [{
        adUnitCode: 'impId',
        bidId: 'bidId',
        mediaTypes: { banner: { sizes: [[320, 50]] } },
        params: { tagID: '124a', siteID: 'site-1' }
      }];
      const response = mockResponse('bidId', 1);
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse({ body: response }, request);
      expect(bids[0].meta.networkName).to.equal('inmobi');
    });

    it('should read the media type from ext.prebid.type when mtype is absent', async function () {
      const bidRequests = [{
        adUnitCode: 'impId',
        bidId: 'bidId',
        mediaTypes: { banner: { sizes: [[320, 50]] } },
        params: { tagID: '124a', siteID: 'site-1' }
      }];
      const response = mockResponse('bidId', undefined);
      response.seatbid[0].bid[0].ext.prebid.type = 'banner';
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse({ body: response }, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal('banner');
    });

    if (FEATURES.NATIVE) {
      it('should keep a native adm that already has root-level assets', async function () {
        const bidRequests = [{
          adUnitCode: 'impId',
          bidId: 'bidId',
          params: { tagID: '123', siteID: 'site-1' },
          bidder: 'inmobiVantage',
          mediaTypes: { native: { image: { required: true, sizes: [120, 60] } } }
        }];
        const response = mockResponseNative('bidId', 4);
        const nativeOrtb = JSON.parse(response.seatbid[0].bid[0].adm).native;
        response.seatbid[0].bid[0].adm = JSON.stringify(nativeOrtb);
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        const bids = spec.interpretResponse({ body: response }, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].native.ortb).to.deep.equal(nativeOrtb);
      });
    }
  });
});
