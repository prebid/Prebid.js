import { expect } from 'chai';
import { spec, storage } from '../../../modules/insticatorBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { getWinDimensions } from '../../../src/utils.js';
import { getGlobal } from '../../../src/prebidGlobal.js';

const USER_ID_KEY = 'hb_insticator_uid';
const USER_ID_DUMMY_VALUE = '74f78609-a92d-4cf1-869f-1b244bbfb5d2';
const USER_ID_STUBBED = '12345678-1234-1234-1234-123456789abc';

const utils = require('src/utils.js');

describe('InsticatorBidAdapter', function () {
  const adapter = newBidder(spec);

  const bidderRequestId = '22edbae2733bf6';
  const bidRequest = {
    bidder: 'insticator',
    adUnitCode: 'adunit-code',
    params: {
      adUnitId: '1a2b3c4d5e6f1a2b3c4d',
      user: {
        yob: 1984,
        gender: 'M'
      },
    },
    sizes: [[300, 250], [300, 600]],
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]],
        pos: 4,
      },
      video: {
        mimes: [
          'video/mp4',
          'video/mpeg',
        ],
        w: 250,
        h: 300,
        placement: 2,
      },
    },
    bidId: '30b31c1838de1e',
    ortb2Imp: {
      instl: 1,
      ext: {
        gpid: '1111/homepage'
      }
    },
    ortb2: {
      source: {
        ext: {
          schain: {
            ver: '1.0',
            complete: 1,
            nodes: [
              {
                asi: 'insticator.com',
                sid: '00001',
                hp: 1,
                rid: bidderRequestId
              }
            ]
          }
        }
      }
    },
    userIdAsEids: [
      {
        source: 'criteo.com',
        uids: [
          {
            id: '123',
            atype: 1
          }
        ]
      }
    ],
  };

  let bidderRequest = {
    bidderRequestId,
    ortb2: {
      source: {
        tid: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
      },
    },
    timeout: 300,
    gdprApplies: 1,
    gdprConsent: {
      consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
      vendorData: {},
      gdprApplies: true
    },
    refererInfo: {
      numIframes: 0,
      reachedTop: true,
      page: 'https://example.com',
      domain: 'example.com',
      ref: 'https://referrer.com',
      stack: ['https://example.com']
    },
  };

  describe('.code', function () {
    it('should return a bidder code of insticator', function () {
      expect(spec.code).to.equal('insticator');
    });
  });

  describe('inherited functions', function () {
    it('should exist and be a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true if the bid is valid', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.be.true;
    });

    it('should return false if there is no adUnitId param', () => {
      expect(spec.isBidRequestValid({ ...bidRequest, ...{ params: {} } })).to.be.false;
    });

    it('should return false if there is no mediaTypes', () => {
      expect(spec.isBidRequestValid({ ...bidRequest, ...{ mediaTypes: {} } })).to.be.false;
    });

    it('should return false if there are no banner sizes and no sizes', () => {
      bidRequest.mediaTypes.banner = {};
      expect(spec.isBidRequestValid({ ...bidRequest, ...{ sizes: {} } })).to.be.false;
    });

    it('should return true if there is sizes and no banner sizes', () => {
      expect(spec.isBidRequestValid(bidRequest)).to.be.true;
    });

    it('should return true if there is banner sizes and no sizes', () => {
      bidRequest.mediaTypes.banner.sizes = [[300, 250], [300, 600]];
      expect(spec.isBidRequestValid({ ...bidRequest, ...{ sizes: {} } })).to.be.true;
    });

    it('should return true if there is video and video sizes', () => {
      expect(spec.isBidRequestValid({
        ...bidRequest,
        ...{
          mediaTypes: {
            video: {
              mimes: [
                'video/mp4',
                'video/mpeg',
              ],
              w: 250,
              h: 300,
            },
          }
        }
      })).to.be.true;
    });

    it('should return false if there is no video sizes', () => {
      expect(spec.isBidRequestValid({
        ...bidRequest,
        ...{
          mediaTypes: {
            video: {},
          }
        }
      })).to.be.false;
    });

    it('should return true if video object is absent/undefined', () => {
      expect(spec.isBidRequestValid({
        ...bidRequest,
        ...{
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]],
            },
          }
        }
      })).to.be.true;
    });

    it('should return false if video plcmt is not a number', () => {
      expect(spec.isBidRequestValid({
        ...bidRequest,
        ...{
          mediaTypes: {
            video: {
              mimes: [
                'video/mp4',
                'video/mpeg',
              ],
              w: 250,
              h: 300,
              plcmt: 'NaN',
            },
          }
        }
      })).to.be.false;
    });

    it('should return true if playerSize is present instead of w and h', () => {
      expect(spec.isBidRequestValid({
        ...bidRequest,
        ...{
          mediaTypes: {
            video: {
              mimes: [
                'video/mp4',
                'video/mpeg',
              ],
              playerSize: [250, 300],
              plcmt: 1,
            },
          }
        }
      })).to.be.true;
    });

    it('should return true if optional video fields are valid', () => {
      expect(spec.isBidRequestValid({
        ...bidRequest,
        ...{
          mediaTypes: {
            video: {
              mimes: [
                'video/mp4',
                'video/mpeg',
              ],
              playerSize: [250, 300],
              placement: 1,
              startdelay: 1,
              skip: 1,
              skipmin: 1,
              skipafter: 1,
              minduration: 1,
              maxduration: 1,
              api: [1, 2],
              protocols: [2],
              battr: [1, 2],
              playbackmethod: [1, 2],
              playbackend: 1,
              delivery: [1, 2],
              pos: 1,
            },
          }
        }
      })).to.be.true;
    });

    it('should return false if video min duration > max duration', () => {
      expect(spec.isBidRequestValid({
        ...bidRequest,
        ...{
          mediaTypes: {
            video: {
              mimes: [
                'video/mp4',
                'video/mpeg',
              ],
              playerSize: [250, 300],
              placement: 1,
              minduration: 5,
              maxduration: 4,
            },
          }
        }
      })).to.be.false;
    });

    it('should return true when video bidder params override bidRequest video params', () => {
      expect(spec.isBidRequestValid({
        ...bidRequest,
        ...{
          mediaTypes: {
            video: {
              mimes: [
                'video/mp4',
                'video/mpeg',
              ],
              playerSize: [250, 300],
              plcmt: 1,
            },
          }
        },
        params: {
          ...bidRequest.params,
          video: {
            mimes: [
              'video/mp4',
              'video/mpeg',
              'video/x-flv',
              'video/webm',
            ],
            plcmt: 2,
          },
        }
      })).to.be.true;
    });
  });

  describe('buildRequests', function () {
    let getDataFromLocalStorageStub, localStorageIsEnabledStub;
    let getCookieStub, cookiesAreEnabledStub;
    let sandbox;
    let serverRequests, serverRequest;

    beforeEach(() => {
      getGlobal().bidderSettings = {
        insticator: {
          storageAllowed: true
        }
      };
      getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
      localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
      getCookieStub = sinon.stub(storage, 'getCookie');
      cookiesAreEnabledStub = sinon.stub(storage, 'cookiesAreEnabled');

      sandbox = sinon.createSandbox();
      sandbox.stub(utils, 'generateUUID').returns(USER_ID_STUBBED);
    });

    afterEach(() => {
      sandbox.restore();
      getDataFromLocalStorageStub.restore();
      localStorageIsEnabledStub.restore();
      getCookieStub.restore();
      cookiesAreEnabledStub.restore();
      getGlobal().bidderSettings = {};
    });

    before(() => {
      serverRequests = spec.buildRequests([bidRequest], bidderRequest);
      serverRequest = serverRequests[0];
    });

    it('should create a request', function () {
      expect(serverRequests).to.have.length(1);
    });

    it('should create a request object with method, URL, options and data', function () {
      expect(serverRequest).to.exist;
      expect(serverRequest.method).to.exist;
      expect(serverRequest.url).to.exist;
      expect(serverRequest.options).to.exist;
      expect(serverRequest.data).to.exist;
    });

    it('should return POST method', function () {
      expect(serverRequest.method).to.equal('POST');
    });

    it('should return valid URL', function () {
      expect(serverRequest.url).to.equal('https://ex.ingage.tech/v1/openrtb');
    });

    it('should return valid options', function () {
      expect(serverRequest.options).to.be.an('object');
      expect(serverRequest.options.contentType).to.equal('application/json');
      expect(serverRequest.options.withCredentials).to.be.true;
    });

    it('should return valid data if array of bids is valid', function () {
      localStorageIsEnabledStub.returns(true);
      cookiesAreEnabledStub.returns(false);
      localStorage.setItem(USER_ID_KEY, USER_ID_DUMMY_VALUE);

      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);

      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('id', 'tmax', 'source', 'site', 'device', 'regs', 'user', 'imp', 'ext');
      expect(data.id).to.equal(bidderRequest.bidderRequestId);
      expect(data.tmax).to.equal(bidderRequest.timeout);
      expect(data.source).to.have.all.keys('fd', 'tid', 'ext');
      expect(data.source.fd).to.equal(1);
      expect(data.source.tid).to.equal(bidderRequest.ortb2.source.tid);
      expect(data.source.ext).to.have.property('schain').to.deep.equal({
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'insticator.com',
            sid: '00001',
            hp: 1,
            rid: bidderRequest.bidderRequestId
          }
        ]
      });
      expect(data.site).to.be.an('object');
      expect(data.site.domain).not.to.be.empty;
      expect(data.site.page).not.to.be.empty;
      expect(data.site.ref).to.equal(bidderRequest.refererInfo.ref);
      expect(data.device).to.be.an('object');
      expect(data.device.w).to.equal(getWinDimensions().innerWidth);
      expect(data.device.h).to.equal(getWinDimensions().innerHeight);
      expect(data.device.js).to.equal(1);
      expect(data.device.ext).to.be.an('object');
      expect(data.device.ext.localStorage).to.equal(true);
      expect(data.device.ext.cookies).to.equal(false);
      expect(data.regs).to.be.an('object');
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.regs.ext.gdprConsentString).to.equal(bidderRequest.gdprConsent.consentString);
      expect(data.user).to.be.an('object');
      expect(data.user).to.have.property('yob');
      expect(data.user.yob).to.equal(1984);
      expect(data.user).to.have.property('gender');
      expect(data.user.gender).to.equal('M');
      expect(data.user.ext).to.have.property('eids');
      expect(data.user.ext.eids).to.deep.equal([
        {
          source: 'criteo.com',
          uids: [
            {
              id: '123',
              atype: 1
            }
          ]
        }
      ]);
      expect(data.imp).to.be.an('array').that.have.lengthOf(1);
      expect(data.imp).to.deep.equal([{
        id: bidRequest.bidId,
        tagid: bidRequest.adUnitCode,
        instl: 1,
        secure: 0,
        banner: {
          format: [
            { w: 300, h: 250 },
            { w: 300, h: 600 }
          ]
        },
        video: {
          mimes: [
            'video/mp4',
            'video/mpeg',
          ],
          h: 300,
          w: 250,
          placement: 2,
        },
        ext: {
          gpid: bidRequest.ortb2Imp.ext.gpid,
          insticator: {
            adUnitId: bidRequest.params.adUnitId,
          },
          prebid: {
            bidder: {
              insticator: {
                adUnitId: bidRequest.params.adUnitId,
              }
            }
          }
        }
      }]);
      expect(data.ext).to.be.an('object');
      expect(data.ext.insticator).to.be.an('object');
      expect(data.ext.insticator).to.deep.equal({
        adapter: {
          vendor: 'prebid',
          prebid: '$prebid.version$'
        }
      });
    });

    it('should generate new userId if not valid user is stored', function () {
      localStorageIsEnabledStub.returns(true);
      localStorage.setItem(USER_ID_KEY, 'fake-user-id');

      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);

      expect(data.user.id).to.equal(USER_ID_STUBBED);
    });

    it('should return with coppa regs object if no gdprConsent is passed', function () {
      const requests = spec.buildRequests([bidRequest], { ...bidderRequest, ...{ gdprConsent: false } });
      const data = JSON.parse(requests[0].data);
      expect(data.regs).to.be.an('object');
      expect(data.regs.coppa).to.be.oneOf([0, 1]);
    });

    it('should return with us_privacy string if uspConsent is passed', function () {
      const requests = spec.buildRequests([bidRequest], { ...bidderRequest, ...{ uspConsent: '1YNN' } });
      const data = JSON.parse(requests[0].data);
      expect(data.regs).to.be.an('object');
      expect(data.regs.ext).to.be.an('object');
      expect(data.regs.ext.us_privacy).to.equal('1YNN');
      expect(data.regs.ext.ccpa).to.equal('1YNN');
    });

    it('should return with gpp if gppConsent is passed', function () {
      const requests = spec.buildRequests([bidRequest], { ...bidderRequest, ...{ gppConsent: { gppString: '1YNN', applicableSections: ['1', '2'] } } });
      const data = JSON.parse(requests[0].data);
      expect(data.regs).to.be.an('object');
      expect(data.regs.ext).to.be.an('object');
      expect(data.regs.ext.gppSid).to.deep.equal(['1', '2']);
    });

    it('should create the request with dsa data and return with dsa object', function() {
      const dsa = {
        dsarequired: 2,
        pubrender: 1,
        datatopub: 2,
        transparency: [{
          domain: 'google.com',
          dsaparams: [1, 2]
        }]
      };
      const bidRequestWithDsa = {
        ...bidderRequest,
        ortb2: {
          regs: {
            ext: {
              dsa: dsa
            }
          }
        }
      };
      const requests = spec.buildRequests([bidRequest], { ...bidRequestWithDsa });
      const data = JSON.parse(requests[0].data);
      expect(data.regs).to.be.an('object');
      expect(data.regs.ext).to.be.an('object');
      expect(data.regs.ext.dsa).to.deep.equal(dsa);
    });

    it('should return empty array if no valid requests are passed', function () {
      expect(spec.buildRequests([], bidderRequest)).to.be.an('array').that.have.lengthOf(0);
    });

    it('should have bidder params override bidRequest mediatypes', function () {
      const tempBiddRequest = {
        ...bidRequest,
        params: {
          ...bidRequest.params,
          video: {
            mimes: [
              'video/mp4',
              'video/mpeg',
              'video/x-flv',
              'video/webm',
              'video/ogg',
            ],
            plcmt: 4,
            w: 640,
            h: 480,
          }
        }
      };
      const requests = spec.buildRequests([tempBiddRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].video.mimes).to.deep.equal([
        'video/mp4',
        'video/mpeg',
        'video/x-flv',
        'video/webm',
        'video/ogg',
      ]);
      expect(data.imp[0].video.placement).to.equal(2);
      expect(data.imp[0].video.plcmt).to.equal(4);
      expect(data.imp[0].video.w).to.equal(640);
      expect(data.imp[0].video.h).to.equal(480);
    });

    it('should have bidder bidfloor from the request', function () {
      const tempBiddRequest = {
        ...bidRequest,
        params: {
          ...bidRequest.params,
          floor: 0.5,
        },
      };
      const requests = spec.buildRequests([tempBiddRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].bidfloor).to.equal(0.5);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('should have bidder bidfloorcur from the request', function () {
      const expectedFloor = 1.5;
      const currency = 'USD';
      const tempBiddRequest = {
        ...bidRequest,
        params: {
          ...bidRequest.params,
          floor: 0.5,
          currency: 'USD',
        },
      };
      tempBiddRequest.getFloor = () => ({ floor: expectedFloor, currency });

      const requests = spec.buildRequests([tempBiddRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].bidfloor).to.equal(1.5);
      expect(data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('should have 1 floor for banner 300x250 and 1.5 for 300x600', function () {
      const tempBiddRequest = {
        ...bidRequest,
        params: {
          ...bidRequest.params,
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
            format: [{ w: 300, h: 250 }]
          },
        },
      };
      tempBiddRequest.getFloor = (params) => {
        return { floor: params.size[1] === 250 ? 1 : 1.5, currency: 'USD' };
      };

      const requests = spec.buildRequests([tempBiddRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].bidfloor).to.equal(1);

      tempBiddRequest.mediaTypes.banner.format = [{ w: 300, h: 600 },
      ];
      const request2 = spec.buildRequests([tempBiddRequest], bidderRequest);
      const data2 = JSON.parse(request2[0].data);
      expect(data2.imp[0].bidfloor).to.equal(1.5);
    });

    it('should have 4 floor for video 300x250 and 4.5 for 300x600', function () {
      const tempBiddRequest = {
        ...bidRequest,
        params: {
          ...bidRequest.params,
        },
        mediaTypes: {
          video: {
            mimes: [
              'video/mp4',
              'video/mpeg',
            ],
            w: 300,
            h: 250,
            placement: 2,
          },
        },
      };
      tempBiddRequest.getFloor = (params) => {
        return { floor: params.size[1] === 250 ? 4 : 4.5, currency: 'USD' };
      };

      const requests = spec.buildRequests([tempBiddRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].bidfloor).to.equal(4);

      tempBiddRequest.mediaTypes.video.w = 300;
      tempBiddRequest.mediaTypes.video.h = 600;
      const request2 = spec.buildRequests([tempBiddRequest], bidderRequest);
      const data2 = JSON.parse(request2[0].data);
      expect(data2.imp[0].bidfloor).to.equal(4.5);
    });

    it('should have sites first party data if present in bidderRequest ortb2', function () {
      bidderRequest = {
        ...bidderRequest,
        ortb2: {
          ...bidderRequest.ortb2,
          site: {
            keywords: 'keyword1,keyword2',
            search: 'search',
            content: {
              title: 'title',
              keywords: 'keyword3,keyword4',
              genre: 'rock'
            },
            cat: ['IAB1', 'IAB2']
          }
        }
      };
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data).to.have.property('site');
      expect(data.site).to.have.property('keywords');
      expect(data.site.keywords).to.equal('keyword1,keyword2');
      expect(data.site).to.have.property('search');
      expect(data.site.search).to.equal('search');
      expect(data.site).to.have.property('content');
      expect(data.site.content).to.have.property('title');
      expect(data.site.content.title).to.equal('title');
      expect(data.site.content).to.have.property('keywords');
      expect(data.site.content.keywords).to.equal('keyword3,keyword4');
      expect(data.site.content).to.have.property('genre');
      expect(data.site.content.genre).to.equal('rock');
      expect(data.site).to.have.property('cat');
      expect(data.site.cat).to.deep.equal(['IAB1', 'IAB2']);
    });

    it('should have device.sua if present in bidderRequest ortb2', function () {
      bidderRequest = {
        ...bidderRequest,
        ortb2: {
          ...bidderRequest.ortb2,
          device: {
            ...bidderRequest.ortb2.device,
            sua: {}
          }
        }
      };
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data).to.have.property('device');
      expect(data.device).to.have.property('sua');
    });

    it('should use param bid_endpoint_request_url for request endpoint if present', function () {
      const tempBiddRequest = {
        ...bidRequest,
        params: {
          ...bidRequest.params,
          bid_endpoint_request_url: 'https://example.com'
        }
      };
      const requests = spec.buildRequests([tempBiddRequest], bidderRequest);
      expect(requests[0].url).to.equal('https://example.com');
    });

    it('should have user keywords if present in bidrequest', function () {
      const tempBiddRequest = {
        ...bidRequest,
        params: {
          ...bidRequest.params,
          user: {
            keywords: 'keyword1,keyword2'
          }
        }
      };
      const requests = spec.buildRequests([tempBiddRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.user).to.have.property('keywords');
      expect(data.user.keywords).to.equal('keyword1,keyword2');
    });

    it('should remove video params if they are invalid', function () {
      const tempBiddRequest = {
        ...bidRequest,
        mediaTypes: {
          ...bidRequest.mediaTypes,
          video: {
            mimes: [
              'video/mp4',
              'video/mpeg',
              'video/x-flv',
              'video/webm',
              'video/ogg',
            ],
            protocols: 'NaN',
            w: '300',
            h: '250',
          }
        }
      };
      const requests = spec.buildRequests([tempBiddRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.imp[0].video).to.not.have.property('plcmt');
    });

    it('carries video podseq -1 and drops a value outside the AdCOM list', function () {
      const podBidRequest = {
        ...bidRequest,
        mediaTypes: {
          ...bidRequest.mediaTypes,
          video: { ...bidRequest.mediaTypes.video, podseq: -1 },
        },
      };
      const podData = JSON.parse(spec.buildRequests([podBidRequest], bidderRequest)[0].data);
      expect(podData.imp[0].video.podseq).to.equal(-1);

      const outOfRange = {
        ...bidRequest,
        mediaTypes: {
          ...bidRequest.mediaTypes,
          video: { ...bidRequest.mediaTypes.video, podseq: 2 },
        },
      };
      const outOfRangeData = JSON.parse(spec.buildRequests([outOfRange], bidderRequest)[0].data);
      expect(outOfRangeData.imp[0].video).to.not.have.property('podseq');
    });

    it('should have user consent and gdpr string if gdprConsent is passed', function () {
      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.regs).to.be.an('object');
      expect(data.regs.ext).to.be.an('object');
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.regs.ext.gdprConsentString).to.equal(bidderRequest.gdprConsent.consentString);
      expect(data.user.ext).to.have.property('consent');
      expect(data.user.ext.consent).to.equal(bidderRequest.gdprConsent.consentString);
    });

    it('should have one or more privacy policies if present in bidrequest, like gpp, gdpr and us_privacy', function () {
      const requests = spec.buildRequests([bidRequest], { ...bidderRequest, ...{ uspConsent: '1YNN' } });
      const data = JSON.parse(requests[0].data);
      expect(data.regs.ext).to.have.property('gdpr');
      expect(data.regs.ext).to.have.property('us_privacy');
      expect(data.regs.ext).to.have.property('gppSid');
    });

    it('should return true if publisherId is absent', () => {
      expect(spec.isBidRequestValid(bidRequest)).to.be.true;
    });

    it('should have publisher object with id in site object, if publisherId present in params', function () {
      const tempBiddRequest = {
        ...bidRequest,
      };
      tempBiddRequest.params = {
        ...tempBiddRequest.params,
        publisherId: '86dd03a1-053f-4e3e-90e7-389070a0c62c'
      };
      const requests = spec.buildRequests([tempBiddRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.site.publisher).to.be.an('object');
      expect(data.site.publisher.id).to.equal(tempBiddRequest.params.publisherId);
    });

    it('should have publisher object should be empty, if publisherId is empty string', function () {
      const tempBiddRequest = {
        ...bidRequest,
      };
      tempBiddRequest.params = {
        ...tempBiddRequest.params,
        publisherId: ''
      };
      const requests = spec.buildRequests([tempBiddRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);
      expect(data.site.publisher).to.not.an('object');
    });

    it('should include publisherId as query parameter in endpoint URL', function () {
      const tempBiddRequest = {
        ...bidRequest,
      };
      tempBiddRequest.params = {
        ...tempBiddRequest.params,
        publisherId: '86dd03a1-053f-4e3e-90e7-389070a0c62c'
      };
      const requests = spec.buildRequests([tempBiddRequest], bidderRequest);
      expect(requests[0].url).to.include('publisherId=86dd03a1-053f-4e3e-90e7-389070a0c62c');
    });

    it('should not include publisherId query param if publisherId is not present', function () {
      const tempBiddRequest = {
        ...bidRequest,
      };
      // Ensure no publisherId in params
      delete tempBiddRequest.params.publisherId;
      const requests = spec.buildRequests([tempBiddRequest], bidderRequest);
      expect(requests[0].url).to.not.include('publisherId');
    });

    it('should not include publisherId query param if publisherId is empty string', function () {
      const tempBiddRequest = {
        ...bidRequest,
      };
      tempBiddRequest.params = {
        ...tempBiddRequest.params,
        publisherId: ''
      };
      const requests = spec.buildRequests([tempBiddRequest], bidderRequest);
      expect(requests[0].url).to.not.include('publisherId');
    });

    it('should include publisherId query param with custom endpoint URL', function () {
      const tempBiddRequest = {
        ...bidRequest,
      };
      tempBiddRequest.params = {
        ...tempBiddRequest.params,
        publisherId: 'test-publisher-123',
        bid_endpoint_request_url: 'https://custom.endpoint.com/v1/bid'
      };
      const requests = spec.buildRequests([tempBiddRequest], bidderRequest);
      expect(requests[0].url).to.equal('https://custom.endpoint.com/v1/bid?publisherId=test-publisher-123');
    });
  });

  describe('interpretResponse', function () {
    const bidRequests = {
      method: 'POST',
      url: 'https://ex.ingage.tech/v1/openrtb',
      options: {
        contentType: 'application/json',
        withCredentials: true,
      },
      data: '',
      bidderRequest: {
        bidderRequestId: '22edbae2733bf6',
        auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
        timeout: 300,
        bids: [
          {
            bidder: 'insticator',
            params: {
              adUnitId: '1a2b3c4d5e6f1a2b3c4d'
            },
            adUnitCode: 'adunit-code-1',
            sizes: [[300, 250], [300, 600]],
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [300, 600]]
              }
            },
            bidId: 'bid1',
          },
          {
            bidder: 'insticator',
            params: {
              adUnitId: '1a2b3c4d5e6f1a2b3c4d'
            },
            adUnitCode: 'adunit-code-2',
            sizes: [[120, 600], [300, 600], [160, 600]],
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [300, 600]]
              }
            },
            bidId: 'bid2',
          },
          {
            bidder: 'insticator',
            params: {
              adUnitId: '1a2b3c4d5e6f1a2b3c4d'
            },
            adUnitCode: 'adunit-code-3',
            sizes: [[120, 600], [300, 600], [160, 600]],
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [300, 600]]
              }
            },
            bidId: 'bid3',
          }
        ]
      }
    };

    const bidResponse = {
      body: {
        id: '22edbae2733bf6',
        bidid: 'foo9876',
        cur: 'USD',
        seatbid: [
          {
            seat: 'some-dsp',
            bid: [
              {
                impid: 'bid1',
                crid: 'crid1',
                price: 0.5,
                w: 300,
                h: 200,
                adm: 'adm1',
                exp: 60,
                adomain: ['test1.com'],
                ext: {
                  meta: {
                    test: 1
                  }
                }
              },
              {
                impid: 'bid2',
                crid: 'crid2',
                price: 1.5,
                w: 600,
                h: 200,
                adm: 'adm2',
                adomain: ['test2.com'],
              },
              {
                impid: 'bid3',
                crid: 'crid3',
                price: 5.0,
                w: 300,
                h: 200,
                adm: 'adm3',
                adomain: ['test3.com'],
              }
            ],
          },
        ]
      }
    };

    const prebidResponse = [
      {
        requestId: 'bid1',
        creativeId: 'crid1',
        cpm: 0.5,
        currency: 'USD',
        netRevenue: true,
        ttl: 60, // MIN(60, 300) = 60 - bid.exp is upper bound
        width: 300,
        height: 200,
        mediaType: 'banner',
        ad: 'adm1',
        adUnitCode: 'adunit-code-1',
        meta: {
          advertiserDomains: ['test1.com'],
          test: 1,
          seat: 'some-dsp',
          mediaType: 'banner'
        }
      },
      {
        requestId: 'bid2',
        creativeId: 'crid2',
        cpm: 1.5,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        width: 600,
        height: 200,
        mediaType: 'banner',
        meta: {
          advertiserDomains: [
            'test2.com'
          ],
          seat: 'some-dsp',
          mediaType: 'banner'
        },
        ad: 'adm2',
        adUnitCode: 'adunit-code-2',
      },
      {
        requestId: 'bid3',
        creativeId: 'crid3',
        cpm: 5.0,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        width: 300,
        height: 200,
        mediaType: 'banner',
        meta: {
          advertiserDomains: [
            'test3.com'
          ],
          seat: 'some-dsp',
          mediaType: 'banner'
        },
        ad: 'adm3',
        adUnitCode: 'adunit-code-3',
      },
    ];

    it('should map bidResponse to prebidResponse', function () {
      const response = spec.interpretResponse(bidResponse, bidRequests);
      response.forEach((resp, i) => {
        expect(resp).to.deep.equal(prebidResponse[i]);
      });
    });

    it('should return empty response if bidderRequestId is invalid', function () {
      const response = Object.assign({}, bidResponse);
      response.body.id = 'fake-id';
      expect(spec.interpretResponse(response, bidRequests)).to.have.length(0);
    });

    it('should return empty response if there is no seatbid array in response', function () {
      const response = Object.assign({}, bidResponse);
      delete response.body.seatbid;
      expect(spec.interpretResponse(response, bidRequests)).to.have.length(0);
    });

    it('should return empty response for 204 No Content (undefined body)', function () {
      const response = { body: undefined };
      expect(spec.interpretResponse(response, bidRequests)).to.have.length(0);
    });

    it('should return empty response for 204 No Content (null body)', function () {
      const response = { body: null };
      expect(spec.interpretResponse(response, bidRequests)).to.have.length(0);
    });

    it('should return empty response for empty object body', function () {
      const response = { body: {} };
      expect(spec.interpretResponse(response, bidRequests)).to.have.length(0);
    });

    // ORTB 2.6 Response Fields Tests
    describe('ORTB 2.6 response fields', function () {
      const ortb26BidRequests = {
        method: 'POST',
        url: 'https://ex.ingage.tech/v1/openrtb',
        options: {
          contentType: 'application/json',
          withCredentials: true,
        },
        data: '',
        bidderRequest: {
          bidderRequestId: '22edbae2733bf6',
          auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
          timeout: 300,
          bids: [
            {
              bidder: 'insticator',
              params: {
                adUnitId: '1a2b3c4d5e6f1a2b3c4d'
              },
              adUnitCode: 'adunit-code-1',
              sizes: [[300, 250]],
              mediaTypes: {
                banner: {
                  sizes: [[300, 250]]
                }
              },
              bidId: 'bid1',
            }
          ]
        }
      };

      it('should map category (cat) to meta.primaryCatId and meta.secondaryCatIds', function () {
        const response = {
          body: {
            id: '22edbae2733bf6',
            seatbid: [{
              seat: 'dsp-1',
              bid: [{
                impid: 'bid1',
                crid: 'crid1',
                price: 1.0,
                w: 300,
                h: 250,
                adm: 'adm1',
                cat: ['IAB1', 'IAB2-1', 'IAB3'],
              }]
            }]
          }
        };
        const bidResponse = spec.interpretResponse(response, ortb26BidRequests)[0];

        expect(bidResponse.meta).to.have.property('primaryCatId', 'IAB1');
        expect(bidResponse.meta).to.have.property('secondaryCatIds').that.deep.equals(['IAB2-1', 'IAB3']);
      });

      it('should map single category without secondaryCatIds', function () {
        const response = {
          body: {
            id: '22edbae2733bf6',
            seatbid: [{
              seat: 'dsp-1',
              bid: [{
                impid: 'bid1',
                crid: 'crid1',
                price: 1.0,
                w: 300,
                h: 250,
                adm: 'adm1',
                cat: ['IAB1'],
              }]
            }]
          }
        };
        const bidResponse = spec.interpretResponse(response, ortb26BidRequests)[0];

        expect(bidResponse.meta).to.have.property('primaryCatId', 'IAB1');
        expect(bidResponse.meta).to.not.have.property('secondaryCatIds');
      });

      it('should map seat to meta.seat', function () {
        const response = {
          body: {
            id: '22edbae2733bf6',
            seatbid: [{
              seat: 'dsp-seat-123',
              bid: [{
                impid: 'bid1',
                crid: 'crid1',
                price: 1.0,
                w: 300,
                h: 250,
                adm: 'adm1',
                adomain: ['test.com'],
              }]
            }]
          }
        };
        const bidResponse = spec.interpretResponse(response, ortb26BidRequests)[0];

        expect(bidResponse.meta).to.have.property('seat', 'dsp-seat-123');
      });

      it('should map creative attributes (attr) to meta.attr', function () {
        const response = {
          body: {
            id: '22edbae2733bf6',
            seatbid: [{
              seat: 'dsp-1',
              bid: [{
                impid: 'bid1',
                crid: 'crid1',
                price: 1.0,
                w: 300,
                h: 250,
                adm: 'adm1',
                attr: [1, 2, 3],
              }]
            }]
          }
        };
        const bidResponse = spec.interpretResponse(response, ortb26BidRequests)[0];

        expect(bidResponse.meta).to.have.property('attr').that.deep.equals([1, 2, 3]);
      });

      it('should map dealid to bidResponse.dealId', function () {
        const response = {
          body: {
            id: '22edbae2733bf6',
            seatbid: [{
              seat: 'dsp-1',
              bid: [{
                impid: 'bid1',
                crid: 'crid1',
                price: 1.0,
                w: 300,
                h: 250,
                adm: 'adm1',
                dealid: 'deal-abc-123',
              }]
            }]
          }
        };
        const bidResponse = spec.interpretResponse(response, ortb26BidRequests)[0];

        expect(bidResponse).to.have.property('dealId', 'deal-abc-123');
      });

      it('should map billing URL (burl) to bidResponse.burl', function () {
        const response = {
          body: {
            id: '22edbae2733bf6',
            seatbid: [{
              seat: 'dsp-1',
              bid: [{
                impid: 'bid1',
                crid: 'crid1',
                price: 1.0,
                w: 300,
                h: 250,
                adm: 'adm1',
                burl: 'https://billing.example.com/win?price=${AUCTION_PRICE}',
              }]
            }]
          }
        };
        const bidResponse = spec.interpretResponse(response, ortb26BidRequests)[0];

        expect(bidResponse).to.have.property('burl', 'https://billing.example.com/win?price=${AUCTION_PRICE}');
      });

      it('should map notice URL (nurl) to bidResponse.nurl', function () {
        const response = {
          body: {
            id: '22edbae2733bf6',
            seatbid: [{
              seat: 'dsp-1',
              bid: [{
                impid: 'bid1',
                crid: 'crid1',
                price: 1.0,
                w: 300,
                h: 250,
                adm: 'adm1',
                nurl: 'https://win.example.com/notify?price=${AUCTION_PRICE}',
              }]
            }]
          }
        };
        const bidResponse = spec.interpretResponse(response, ortb26BidRequests)[0];

        expect(bidResponse).to.have.property('nurl', 'https://win.example.com/notify?price=${AUCTION_PRICE}');
      });

      it('should map video duration (dur) to bidResponse.video.durationSeconds', function () {
        const videoBidRequests = {
          ...ortb26BidRequests,
          bidderRequest: {
            ...ortb26BidRequests.bidderRequest,
            bids: [{
              ...ortb26BidRequests.bidderRequest.bids[0],
              mediaTypes: {
                video: {
                  mimes: ['video/mp4'],
                  playerSize: [[640, 480]],
                }
              }
            }]
          }
        };

        const response = {
          body: {
            id: '22edbae2733bf6',
            seatbid: [{
              seat: 'dsp-1',
              bid: [{
                impid: 'bid1',
                crid: 'crid1',
                price: 1.0,
                w: 640,
                h: 480,
                adm: '<VAST version="4.0"><Ad></Ad></VAST>',
                dur: 30,
              }]
            }]
          }
        };
        const bidResponse = spec.interpretResponse(response, videoBidRequests)[0];

        expect(bidResponse).to.have.property('video');
        expect(bidResponse.video).to.have.property('durationSeconds', 30);
      });

      it('should set video.durationSeconds and not set video.context for instream video', function () {
        const instreamBidRequests = {
          ...ortb26BidRequests,
          bidderRequest: {
            ...ortb26BidRequests.bidderRequest,
            bids: [{
              ...ortb26BidRequests.bidderRequest.bids[0],
              mediaTypes: {
                video: {
                  mimes: ['video/mp4'],
                  playerSize: [[640, 480]],
                  context: 'instream',
                }
              }
            }]
          }
        };

        const response = {
          body: {
            id: '22edbae2733bf6',
            seatbid: [{
              seat: 'dsp-1',
              bid: [{
                impid: 'bid1',
                crid: 'crid1',
                price: 1.0,
                w: 640,
                h: 480,
                adm: '<VAST version="4.0"><Ad></Ad></VAST>',
                dur: 30,
              }]
            }]
          }
        };
        const bidResponse = spec.interpretResponse(response, instreamBidRequests)[0];

        expect(bidResponse).to.have.property('video');
        expect(bidResponse.video).to.have.property('durationSeconds', 30);
        expect(bidResponse.video).to.not.have.property('context');
      });

      it('should use MIN of bid.exp and BID_TTL for ttl (bid.exp is upper bound)', function () {
        // When bid.exp (60) is less than BID_TTL (300), use 60
        const responseWithLowExp = {
          body: {
            id: '22edbae2733bf6',
            seatbid: [{
              seat: 'dsp-1',
              bid: [{
                impid: 'bid1',
                crid: 'crid1',
                price: 1.0,
                w: 300,
                h: 250,
                adm: 'adm1',
                exp: 60,
              }]
            }]
          }
        };
        const bidResponseLow = spec.interpretResponse(responseWithLowExp, ortb26BidRequests)[0];
        expect(bidResponseLow.ttl).to.equal(60); // MIN(60, 300) = 60

        // When bid.exp (600) is greater than BID_TTL (300), use 300
        const responseWithHighExp = {
          body: {
            id: '22edbae2733bf6',
            seatbid: [{
              seat: 'dsp-1',
              bid: [{
                impid: 'bid1',
                crid: 'crid1',
                price: 1.0,
                w: 300,
                h: 250,
                adm: 'adm1',
                exp: 600,
              }]
            }]
          }
        };
        const bidResponseHigh = spec.interpretResponse(responseWithHighExp, ortb26BidRequests)[0];
        expect(bidResponseHigh.ttl).to.equal(300); // MIN(600, 300) = 300
      });

      it('should default ttl to BID_TTL when bid.exp is not provided', function () {
        const response = {
          body: {
            id: '22edbae2733bf6',
            seatbid: [{
              seat: 'dsp-1',
              bid: [{
                impid: 'bid1',
                crid: 'crid1',
                price: 1.0,
                w: 300,
                h: 250,
                adm: 'adm1',
                // no exp field
              }]
            }]
          }
        };
        const bidResponse = spec.interpretResponse(response, ortb26BidRequests)[0];
        expect(bidResponse.ttl).to.equal(300); // defaults to configTTL when no bid.exp
      });

      it('should include all ORTB 2.6 fields in a single response', function () {
        const response = {
          body: {
            id: '22edbae2733bf6',
            seatbid: [{
              seat: 'full-dsp',
              bid: [{
                impid: 'bid1',
                crid: 'crid1',
                price: 2.5,
                w: 300,
                h: 250,
                adm: 'adm1',
                adomain: ['advertiser.com'],
                cat: ['IAB1', 'IAB2'],
                attr: [1, 2],
                dealid: 'premium-deal',
                burl: 'https://billing.example.com/win',
                exp: 450,
              }]
            }]
          }
        };
        const bidResponse = spec.interpretResponse(response, ortb26BidRequests)[0];

        // Check all ORTB 2.6 fields
        expect(bidResponse.meta.advertiserDomains).to.deep.equal(['advertiser.com']);
        expect(bidResponse.meta.primaryCatId).to.equal('IAB1');
        expect(bidResponse.meta.secondaryCatIds).to.deep.equal(['IAB2']);
        expect(bidResponse.meta.seat).to.equal('full-dsp');
        expect(bidResponse.meta.attr).to.deep.equal([1, 2]);
        expect(bidResponse.dealId).to.equal('premium-deal');
        expect(bidResponse.burl).to.equal('https://billing.example.com/win');
        expect(bidResponse.ttl).to.equal(300); // MIN(450, 300) = 300 - bid.exp is upper bound
      });

      // Media Type Detection Tests
      describe('media type detection', function () {
        it('should detect video using mtype=2 (ORTB 2.6 standard)', function () {
          const response = {
            body: {
              id: '22edbae2733bf6',
              seatbid: [{
                seat: 'dsp-1',
                bid: [{
                  impid: 'bid1',
                  crid: 'crid1',
                  price: 1.0,
                  w: 300,
                  h: 250,
                  adm: 'some non-vast content',
                  mtype: 2, // video
                }]
              }]
            }
          };
          const bidResponse = spec.interpretResponse(response, ortb26BidRequests)[0];
          expect(bidResponse.mediaType).to.equal('video');
        });

        it('should detect banner using mtype=1 (ORTB 2.6 standard)', function () {
          const response = {
            body: {
              id: '22edbae2733bf6',
              seatbid: [{
                seat: 'dsp-1',
                bid: [{
                  impid: 'bid1',
                  crid: 'crid1',
                  price: 1.0,
                  w: 300,
                  h: 250,
                  adm: '<VAST version="4.0"></VAST>', // VAST content but mtype says banner
                  mtype: 1, // banner
                }]
              }]
            }
          };
          const bidResponse = spec.interpretResponse(response, ortb26BidRequests)[0];
          expect(bidResponse.mediaType).to.equal('banner');
        });

        it('should detect video using case-insensitive VAST detection', function () {
          const videoRequests = utils.deepClone(ortb26BidRequests);
          videoRequests.bidderRequest.bids[0].mediaTypes.video = { mimes: ['video/mp4'] };
          const response = {
            body: {
              id: '22edbae2733bf6',
              seatbid: [{
                seat: 'dsp-1',
                bid: [{
                  impid: 'bid1',
                  crid: 'crid1',
                  price: 1.0,
                  w: 300,
                  h: 250,
                  adm: '<vast version="4.0"><Ad></Ad></vast>', // lowercase vast
                  // no mtype
                }]
              }]
            }
          };
          const bidResponse = spec.interpretResponse(response, videoRequests)[0];
          expect(bidResponse.mediaType).to.equal('video');
        });

        it('should default to banner when no video signals present', function () {
          const response = {
            body: {
              id: '22edbae2733bf6',
              seatbid: [{
                seat: 'dsp-1',
                bid: [{
                  impid: 'bid1',
                  crid: 'crid1',
                  price: 1.0,
                  w: 300,
                  h: 250,
                  adm: '<div>banner ad</div>',
                  // no mtype, no VAST
                }]
              }]
            }
          };
          const bidResponse = spec.interpretResponse(response, ortb26BidRequests)[0];
          expect(bidResponse.mediaType).to.equal('banner');
        });

        it('should detect banner when VAST-like content is inside script tag', function () {
          const response = {
            body: {
              id: '22edbae2733bf6',
              seatbid: [{
                seat: 'dsp-1',
                bid: [{
                  impid: 'bid1',
                  crid: 'crid1',
                  price: 1.0,
                  w: 300,
                  h: 250,
                  adm: '<script>var vast = "<VAST version=4.0></VAST>";</script><div>banner</div>',
                  // no mtype
                }]
              }]
            }
          };
          const bidResponse = spec.interpretResponse(response, ortb26BidRequests)[0];
          expect(bidResponse.mediaType).to.equal('banner');
        });
      });
    });
  });

  describe('getUserSyncs', function () {
    const bidResponse = [{
      body: {
        ext: {
          sync: [{
            code: 'so',
            delay: 0
          }]
        }
      }
    }];

    it('should return one user sync', function () {
      expect(spec.getUserSyncs({}, bidResponse)).to.deep.equal([{
        code: 'so',
        delay: 0
      }]);
    });

    it('should return an empty array when sync is enabled but there are no bidResponses', function () {
      expect(spec.getUserSyncs({}, [])).to.have.length(0);
    });

    it('should return an empty array when sync is enabled but no sync ext returned', function () {
      const response = Object.assign({}, bidResponse[0]);
      delete response.body.ext.sync;
      expect(spec.getUserSyncs({}, [response])).to.have.length(0);
    });
  });

  describe('Response with video Instream', function () {
    const bidRequestVid = {
      method: 'POST',
      url: 'https://ex.ingage.tech/v1/openrtb',
      options: {
        contentType: 'application/json',
        withCredentials: true,
      },
      data: '',
      bidderRequest: {
        bidderRequestId: '22edbae2733bf6',
        auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
        timeout: 300,
        bids: [
          {
            bidder: 'insticator',
            params: {
              adUnitId: '1a2b3c4d5e6f1a2b3c4d'
            },
            adUnitCode: 'adunit-code-1',
            mediaTypes: {
              video: {
                mimes: [
                  'video/mp4',
                  'video/mpeg',
                ],
                playerSize: [[250, 300]],
                placement: 2,
                plcmt: 2,
              }
            },
            bidId: 'bid1',
          }
        ]
      }
    };

    const bidResponseVid = {
      body: {
        id: '22edbae2733bf6',
        bidid: 'foo9876',
        cur: 'USD',
        seatbid: [
          {
            seat: 'some-dsp',
            bid: [
              {
                ad: '<Vast></Vast>',
                impid: 'bid1',
                crid: 'crid1',
                price: 0.5,
                w: 300,
                h: 250,
                adm: '<VAST version="4.0"><Ad></Ad></VAST>',
                exp: 60,
                adomain: ['test1.com'],
                ext: {
                  meta: {
                    test: 1
                  }
                },
              }
            ],
          },
        ]
      }
    };
    const bidRequestWithVideo = utils.deepClone(bidRequestVid);

    it('should have related properties for video Instream', function() {
      const serverResponseWithInstream = utils.deepClone(bidResponseVid);
      serverResponseWithInstream.body.seatbid[0].bid[0].vastXml = '<VAST version="4.0"><Ad></Ad></VAST>';
      serverResponseWithInstream.body.seatbid[0].bid[0].mediaType = 'video';
      const bidResponse = spec.interpretResponse(serverResponseWithInstream, bidRequestWithVideo)[0];
      expect(bidResponse).to.have.any.keys('mediaType', 'vastXml', 'vastUrl');
      expect(bidResponse).to.have.property('mediaType', 'video');
      expect(bidResponse.width).to.equal(300);
      expect(bidResponse.height).to.equal(250);
      expect(bidResponse).to.have.property('vastXml', '<VAST version="4.0"><Ad></Ad></VAST>');
      expect(bidResponse.vastUrl).to.match(/^data:text\/xml;charset=utf-8;base64,[\w+/=]+$/);
    });
  });

  describe(`Response with DSA data`, function() {
    const bidRequestDsa = {
      method: 'POST',
      url: 'https://ex.ingage.tech/v1/openrtb',
      options: {
        contentType: 'application/json',
        withCredentials: true,
      },
      data: '',
      bidderRequest: {
        bidderRequestId: '22edbae2733bf6',
        auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
        timeout: 300,
        bids: [
          {
            bidder: 'insticator',
            params: {
              adUnitId: '1a2b3c4d5e6f1a2b3c4d'
            },
            adUnitCode: 'adunit-code-1',
            mediaTypes: {
              video: {
                mimes: [
                  'video/mp4',
                  'video/mpeg',
                ],
                playerSize: [[250, 300]],
                placement: 2,
                plcmt: 2,
              }
            },
            bidId: 'bid1',
          }
        ],
        ortb2: {
          regs: {
            ext: {
              dsa: {
                dsarequired: 2,
                pubrender: 1,
                datatopub: 2,
                transparency: [{
                  domain: 'google.com',
                  dsaparams: [1, 2]
                }]
              }
            }
          }
        },
      }
    };

    const bidResponseDsa = {
      body: {
        id: '22edbae2733bf6',
        bidid: 'foo9876',
        cur: 'USD',
        seatbid: [
          {
            seat: 'some-dsp',
            bid: [
              {
                ad: '<Vast></Vast>',
                impid: 'bid1',
                crid: 'crid1',
                price: 0.5,
                w: 300,
                h: 250,
                adm: '<VAST version="4.0"><Ad></Ad></VAST>',
                exp: 60,
                adomain: ['test1.com'],
                ext: {
                  meta: {
                    test: 1,
                  },
                  dsa: {
                    behalf: 'Advertiser',
                    paid: 'Advertiser',
                    transparency: [{
                      domain: 'google.com',
                      dsaparams: [1, 2]
                    }],
                    adrender: 1
                  }
                },
              }
            ],
          },
        ]
      }
    };
    const bidRequestWithDsa = utils.deepClone(bidRequestDsa);
    it('should have related properties for DSA data', function() {
      const serverResponseWithDsa = utils.deepClone(bidResponseDsa);
      const bidResponse = spec.interpretResponse(serverResponseWithDsa, bidRequestWithDsa)[0];
      expect(bidResponse).to.have.any.keys('ext');
      expect(bidResponse.ext.dsa).to.have.property('behalf', 'Advertiser');
      expect(bidResponse.ext.dsa).to.have.property('paid', 'Advertiser');
      expect(bidResponse.ext.dsa).to.have.property('adrender', 1);
    });
  });
});

// Decodes the base64 data URI honouring charset=utf-8; fatal:true so invalid UTF-8 throws.
function decodeVastDataUri(dataUri) {
  const base64 = dataUri.replace(/^data:text\/xml;charset=utf-8;base64,/, '');
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let idx = 0; idx < binary.length; idx++) {
    bytes[idx] = binary.charCodeAt(idx);
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

describe('InsticatorBidAdapter — audio', function () {
  const audioBidRequest = {
    bidder: 'insticator',
    adUnitCode: 'audio-adunit',
    params: { adUnitId: '1a2b3c4d5e6f1a2b3c4d' },
    mediaTypes: {
      audio: {
        mimes: ['audio/mp4', 'audio/mpeg'],
        minduration: 5,
        maxduration: 30,
        startdelay: 0,
        api: [2, 7],
        delivery: [1, 2],
        minbitrate: 32,
        maxbitrate: 320,
        companiontype: [1, 2],
        feed: 3,
        stitched: 1,
        nvol: 2,
      },
    },
    bidId: 'audio-bid-1',
  };

  describe('supportedMediaTypes', function () {
    it('includes audio alongside banner and video', function () {
      expect(spec.supportedMediaTypes).to.include('audio');
      expect(spec.supportedMediaTypes).to.include('banner');
      expect(spec.supportedMediaTypes).to.include('video');
    });
  });

  describe('isBidRequestValid', function () {
    it('accepts an audio-only ad unit', function () {
      expect(spec.isBidRequestValid(audioBidRequest)).to.be.true;
    });

    it('accepts audio with no mimes — the exchange defaults them', function () {
      const bid = { ...audioBidRequest, mediaTypes: { audio: { minduration: 5, maxduration: 30 } } };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('warns when audio mimes are absent, without rejecting the bid', function () {
      const logWarnStub = sinon.stub(utils, 'logWarn');
      try {
        const bid = { ...audioBidRequest, mediaTypes: { audio: { minduration: 5, maxduration: 30 } } };
        expect(spec.isBidRequestValid(bid)).to.be.true;
        const messages = logWarnStub.getCalls().map((call) => String(call.args[0]));
        expect(messages.some((message) => message.includes('audio mimes not specified'))).to.be.true;
      } finally {
        logWarnStub.restore();
      }
    });

    it('does not warn when mimes arrive through params.audio', function () {
      const logWarnStub = sinon.stub(utils, 'logWarn');
      try {
        const bid = {
          ...audioBidRequest,
          mediaTypes: { audio: { minduration: 5, maxduration: 30 } },
          params: { ...audioBidRequest.params, audio: { mimes: ['audio/aac'] } },
        };
        expect(spec.isBidRequestValid(bid)).to.be.true;
        const messages = logWarnStub.getCalls().map((call) => String(call.args[0]));
        expect(messages.some((message) => message.includes('audio mimes not specified'))).to.be.false;
      } finally {
        logWarnStub.restore();
      }
    });

    it('does not read stringified durations as inverted', function () {
      const bid = { ...audioBidRequest, mediaTypes: { audio: { mimes: ['audio/mp4'], minduration: '5', maxduration: '30' } } };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('rejects audio whose minduration exceeds maxduration', function () {
      const bid = { ...audioBidRequest, mediaTypes: { audio: { mimes: ['audio/mp4'], minduration: 60, maxduration: 30 } } };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('still rejects an ad unit with no banner, video or audio', function () {
      expect(spec.isBidRequestValid({ ...audioBidRequest, mediaTypes: {} })).to.be.false;
    });

    it('logs an invalid optional audio param but still accepts the bid', function () {
      const logErrorStub = sinon.stub(utils, 'logError');
      try {
        const bid = {
          ...audioBidRequest,
          mediaTypes: { audio: { mimes: ['audio/mp4'], protocols: 'not-an-array' } },
        };
        expect(spec.isBidRequestValid(bid)).to.be.true;
        const messages = logErrorStub.getCalls().map((call) => String(call.args[0]));
        expect(messages.some((message) => message.includes('audio protocols is invalid'))).to.be.true;
      } finally {
        logErrorStub.restore();
      }
    });
  });

  describe('buildRequests', function () {
    let sandbox;
    let localStorageIsEnabledStub, cookiesAreEnabledStub, getDataFromLocalStorageStub, getCookieStub;

    beforeEach(function () {
      getGlobal().bidderSettings = { insticator: { storageAllowed: true } };
      getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage').returns(USER_ID_DUMMY_VALUE);
      localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled').returns(true);
      getCookieStub = sinon.stub(storage, 'getCookie').returns(USER_ID_DUMMY_VALUE);
      cookiesAreEnabledStub = sinon.stub(storage, 'cookiesAreEnabled').returns(true);
      sandbox = sinon.createSandbox();
    });

    afterEach(function () {
      sandbox.restore();
      getDataFromLocalStorageStub.restore();
      localStorageIsEnabledStub.restore();
      getCookieStub.restore();
      cookiesAreEnabledStub.restore();
      getGlobal().bidderSettings = {};
    });

    function firstImp(bid) {
      const requests = spec.buildRequests([bid], { bidderRequestId: 'req-1', refererInfo: { page: 'https://example.com' } });
      return JSON.parse(requests[0].data).imp[0];
    }

    it('builds imp.audio with mimes and the optional params', function () {
      const imp = firstImp(audioBidRequest);
      expect(imp.audio).to.exist;
      expect(imp.audio.mimes).to.deep.equal(['audio/mp4', 'audio/mpeg']);
      expect(imp.audio.minduration).to.equal(5);
      expect(imp.audio.maxduration).to.equal(30);
      expect(imp.audio.startdelay).to.equal(0);
      expect(imp.audio.api).to.deep.equal([2, 7]);
      expect(imp.audio.delivery).to.deep.equal([1, 2]);
      expect(imp.audio.companiontype).to.deep.equal([1, 2]);
    });

    it('carries the audio-only fields feed, stitched and nvol', function () {
      const imp = firstImp(audioBidRequest);
      expect(imp.audio.feed).to.equal(3);
      expect(imp.audio.stitched).to.equal(1);
      expect(imp.audio.nvol).to.equal(2);
    });

    it('emits no banner or video object for an audio-only ad unit', function () {
      const imp = firstImp(audioBidRequest);
      expect(imp.audio).to.exist;
      expect(imp.banner).to.not.exist;
      expect(imp.video).to.not.exist;
    });

    it('drops an out-of-range audio param rather than sending it', function () {
      const bid = { ...audioBidRequest, mediaTypes: { audio: { mimes: ['audio/mp4'], feed: 99, nvol: 42, stitched: 7 } } };
      const imp = firstImp(bid);
      expect(imp.audio.feed).to.not.exist;
      expect(imp.audio.nvol).to.not.exist;
      expect(imp.audio.stitched).to.not.exist;
    });

    it('emits no audio object when the ad unit has none', function () {
      const bid = { ...audioBidRequest, mediaTypes: { banner: { sizes: [[300, 250]] } } };
      const imp = firstImp(bid);
      expect(imp.audio).to.not.exist;
    });

    it('prefers a valid params.audio mimes override over the ad unit value', function () {
      const bid = {
        ...audioBidRequest,
        params: { ...audioBidRequest.params, audio: { mimes: ['audio/aac'] } },
      };
      const imp = firstImp(bid);
      expect(imp.audio.mimes).to.deep.equal(['audio/aac']);
    });

    it('keeps the ad unit mimes when the params.audio override is malformed', function () {
      const bid = {
        ...audioBidRequest,
        params: { ...audioBidRequest.params, audio: { mimes: 'audio/aac' } },
      };
      const imp = firstImp(bid);
      expect(imp.audio.mimes).to.deep.equal(['audio/mp4', 'audio/mpeg']);
    });

    it('drops a malformed mimes list rather than sending it', function () {
      const bid = { ...audioBidRequest, mediaTypes: { audio: { mimes: 'audio/mp4' } } };
      const imp = firstImp(bid);
      expect(imp.audio).to.exist;
      expect(imp.audio.mimes).to.not.exist;
    });

    it('ignores params.audio keys outside the supported set', function () {
      const bid = { ...audioBidRequest, params: { ...audioBidRequest.params, audio: { notAnOrtbField: 'nope' } } };
      const imp = firstImp(bid);
      expect(imp.audio.notAnOrtbField).to.not.exist;
    });

    it('applies a valid params.audio override without mutating the bid', function () {
      const params = { ...audioBidRequest.params, audio: { minduration: 10, feed: 99 } };
      const bid = { ...audioBidRequest, params };
      const imp = firstImp(bid);
      expect(imp.audio.minduration).to.equal(10);
      expect(imp.audio.feed).to.not.equal(99);
      expect(imp.audio.feed).to.equal(audioBidRequest.mediaTypes.audio.feed);
      expect(params.audio.feed).to.equal(99);
    });

    it('merges ext from the ad unit and params.audio', function () {
      const bid = {
        ...audioBidRequest,
        mediaTypes: { audio: { ...audioBidRequest.mediaTypes.audio, ext: { adUnitKey: 'a' } } },
        params: { ...audioBidRequest.params, audio: { ext: { bidderKey: 'b' } } },
      };
      const imp = firstImp(bid);
      expect(imp.audio.ext).to.deep.equal({ adUnitKey: 'a', bidderKey: 'b' });
    });

    it('lets params.audio win on a colliding ext key', function () {
      const bid = {
        ...audioBidRequest,
        mediaTypes: { audio: { ...audioBidRequest.mediaTypes.audio, ext: { shared: 'adUnit', adUnitKey: 'a' } } },
        params: { ...audioBidRequest.params, audio: { ext: { shared: 'params' } } },
      };
      const imp = firstImp(bid);
      expect(imp.audio.ext).to.deep.equal({ shared: 'params', adUnitKey: 'a' });
    });

    it('merges nested ext objects without mutating either source', function () {
      const adUnitExt = { nested: { keep: 1 } };
      const paramsExt = { nested: { add: 2 } };
      const bid = {
        ...audioBidRequest,
        mediaTypes: { audio: { ...audioBidRequest.mediaTypes.audio, ext: adUnitExt } },
        params: { ...audioBidRequest.params, audio: { ext: paramsExt } },
      };
      const imp = firstImp(bid);
      expect(imp.audio.ext.nested).to.deep.equal({ keep: 1, add: 2 });
      expect(adUnitExt).to.deep.equal({ nested: { keep: 1 } });
      expect(paramsExt).to.deep.equal({ nested: { add: 2 } });
    });

    it('keeps a lone ext from either source', function () {
      const fromAdUnit = firstImp({
        ...audioBidRequest,
        mediaTypes: { audio: { ...audioBidRequest.mediaTypes.audio, ext: { adUnitKey: 'a' } } },
      });
      expect(fromAdUnit.audio.ext).to.deep.equal({ adUnitKey: 'a' });

      const fromParams = firstImp({
        ...audioBidRequest,
        params: { ...audioBidRequest.params, audio: { ext: { bidderKey: 'b' } } },
      });
      expect(fromParams.audio.ext).to.deep.equal({ bidderKey: 'b' });
    });

    it('asks for an audio floor', function () {
      const seen = [];
      const bid = {
        ...audioBidRequest,
        getFloor: (args) => { seen.push(args); return { currency: 'USD', floor: 1.23 }; },
      };
      const imp = firstImp(bid);
      expect(seen.some((call) => call.mediaType === 'audio')).to.equal(true);
      expect(imp.bidfloor).to.equal(1.23);
    });

    it('carries the remaining ORTB audio params', function () {
      const bid = {
        ...audioBidRequest,
        mediaTypes: {
          audio: {
            ...audioBidRequest.mediaTypes.audio,
            protocols: [2, 3, 5, 6],
            battr: [13, 14],
            maxextended: 30,
            rqddurs: [15, 30],
            sequence: 2,
          },
        },
      };
      const imp = firstImp(bid);
      expect(imp.audio.protocols).to.deep.equal([2, 3, 5, 6]);
      expect(imp.audio.battr).to.deep.equal([13, 14]);
      expect(imp.audio.maxextended).to.equal(30);
      expect(imp.audio.rqddurs).to.deep.equal([15, 30]);
      expect(imp.audio.sequence).to.equal(2);
    });

    it('carries the audio ad pod params', function () {
      const bid = {
        ...audioBidRequest,
        mediaTypes: {
          audio: {
            ...audioBidRequest.mediaTypes.audio,
            poddur: 120,
            podid: 'pod-1',
            podseq: 0,
            slotinpod: 1,
            mincpmpersec: 0.05,
            maxseq: 4,
          },
        },
      };
      const imp = firstImp(bid);
      expect(imp.audio.poddur).to.equal(120);
      expect(imp.audio.podid).to.equal('pod-1');
      expect(imp.audio.podseq).to.equal(0);
      expect(imp.audio.slotinpod).to.equal(1);
      expect(imp.audio.mincpmpersec).to.equal(0.05);
      expect(imp.audio.maxseq).to.equal(4);
    });

    it('carries companionad, durfloors and ext', function () {
      const bid = {
        ...audioBidRequest,
        mediaTypes: {
          audio: {
            ...audioBidRequest.mediaTypes.audio,
            companionad: [{ w: 300, h: 250 }],
            durfloors: [{ mindur: 15, maxdur: 30, bidfloor: 1.5 }],
            ext: { custom: 'value' },
          },
        },
      };
      const imp = firstImp(bid);
      expect(imp.audio.companionad).to.deep.equal([{ w: 300, h: 250 }]);
      expect(imp.audio.durfloors).to.deep.equal([{ mindur: 15, maxdur: 30, bidfloor: 1.5 }]);
      expect(imp.audio.ext).to.deep.equal({ custom: 'value' });
    });

    it('drops companionad and durfloors when the array does not hold objects', function () {
      const bid = {
        ...audioBidRequest,
        mediaTypes: {
          audio: {
            ...audioBidRequest.mediaTypes.audio,
            companionad: ['not-an-object'],
            durfloors: [1, 2],
          },
        },
      };
      const imp = firstImp(bid);
      expect(imp.audio.companionad).to.not.exist;
      expect(imp.audio.durfloors).to.not.exist;
    });

    it('carries the bitrate bounds and the delivery context', function () {
      const bid = {
        ...audioBidRequest,
        mediaTypes: {
          audio: {
            ...audioBidRequest.mediaTypes.audio,
            minbitrate: 32,
            maxbitrate: 320,
            context: 'instream',
          },
        },
      };
      const imp = firstImp(bid);
      expect(imp.audio.minbitrate).to.equal(32);
      expect(imp.audio.maxbitrate).to.equal(320);
      expect(imp.audio.context).to.equal('instream');
    });

    it('keeps the bid but drops a stringified duration', function () {
      const bid = {
        ...audioBidRequest,
        mediaTypes: { audio: { ...audioBidRequest.mediaTypes.audio, minduration: '5', maxduration: '30' } },
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      const imp = firstImp(bid);
      expect(imp.audio.minduration).to.not.exist;
      expect(imp.audio.maxduration).to.not.exist;
    });

    it('rejects the bid when minduration exceeds maxduration as integers', function () {
      const bid = {
        ...audioBidRequest,
        mediaTypes: { audio: { ...audioBidRequest.mediaTypes.audio, minduration: 30, maxduration: 5 } },
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('drops ext when it is not a plain object', function () {
      const bid = {
        ...audioBidRequest,
        mediaTypes: { audio: { ...audioBidRequest.mediaTypes.audio, ext: ['nope'] } },
      };
      const imp = firstImp(bid);
      expect(imp.audio.ext).to.not.exist;
    });

    it('drops pod params that are out of range', function () {
      const bid = {
        ...audioBidRequest,
        mediaTypes: {
          audio: {
            ...audioBidRequest.mediaTypes.audio,
            poddur: 0,
            podid: '',
            podseq: 2,
            slotinpod: 9,
            mincpmpersec: 0,
            maxseq: -2,
          },
        },
      };
      const imp = firstImp(bid);
      expect(imp.audio.poddur).to.not.exist;
      expect(imp.audio.podid).to.not.exist;
      expect(imp.audio.podseq).to.not.exist;
      expect(imp.audio.slotinpod).to.not.exist;
      expect(imp.audio.mincpmpersec).to.not.exist;
      expect(imp.audio.maxseq).to.not.exist;
    });

    it('carries podseq -1, the AdCOM value for the last pod in the stream', function () {
      const bid = {
        ...audioBidRequest,
        mediaTypes: {
          audio: { ...audioBidRequest.mediaTypes.audio, podseq: -1 },
        },
      };
      const imp = firstImp(bid);
      expect(imp.audio.podseq).to.equal(-1);
    });

    it('drops rqddurs when any duration is not positive', function () {
      const bid = {
        ...audioBidRequest,
        mediaTypes: { audio: { ...audioBidRequest.mediaTypes.audio, rqddurs: [15, 0, -5] } },
      };
      const imp = firstImp(bid);
      expect(imp.audio.rqddurs).to.not.exist;
    });

    it('drops protocols, battr and maxextended when malformed', function () {
      const bid = {
        ...audioBidRequest,
        mediaTypes: {
          audio: {
            ...audioBidRequest.mediaTypes.audio,
            protocols: 'vast',
            battr: [{}],
            maxextended: 'thirty',
          },
        },
      };
      const imp = firstImp(bid);
      expect(imp.audio.protocols).to.not.exist;
      expect(imp.audio.battr).to.not.exist;
      expect(imp.audio.maxextended).to.not.exist;
    });

    it('forwards mediaTypes.audio.context', function () {
      const bid = {
        ...audioBidRequest,
        mediaTypes: { audio: { ...audioBidRequest.mediaTypes.audio, context: 'instream' } },
      };
      expect(firstImp(bid).audio.context).to.equal('instream');
    });

    it('omits context when the ad unit declares none', function () {
      expect(firstImp(audioBidRequest).audio.context).to.not.exist;
    });
  });

  describe('interpretResponse', function () {
    const request = {
      bidderRequest: {
        bidderRequestId: 'req-1',
        bids: [{ ...audioBidRequest, adUnitCode: 'audio-adunit' }],
      },
    };
    const vast = '<VAST version="4.1"><Ad id="1"><InLine></InLine></Ad></VAST>';

    function respond(bid) {
      return spec.interpretResponse({ body: { id: 'req-1', cur: 'USD', seatbid: [{ seat: 's', bid: [bid] }] } }, request);
    }

    it('maps mtype 3 to the audio media type', function () {
      const [response] = respond({ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm: vast, mtype: 3 });
      expect(response.mediaType).to.equal('audio');
    });

    it('exposes an audio creative as vastXml', function () {
      const [response] = respond({ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm: vast, mtype: 3 });
      expect(response.vastXml).to.equal(vast);
    });

    it('still reports mtype 2 as video', function () {
      const [response] = respond({ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm: vast, mtype: 2 });
      expect(response.mediaType).to.equal('video');
    });

    it('uses the declared media types when VAST arrives with no mtype', function () {
      const [response] = respond({ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm: vast });
      expect(response.mediaType).to.equal('audio');
    });

    it('still reports VAST with no mtype as video when the unit declares video', function () {
      const videoRequest = {
        bidderRequest: {
          bidderRequestId: 'req-1',
          bids: [{
            ...audioBidRequest,
            adUnitCode: 'video-adunit',
            mediaTypes: { video: { context: 'instream', mimes: ['video/mp4'] } },
          }],
        },
      };
      const [response] = spec.interpretResponse(
        { body: { id: 'req-1', cur: 'USD', seatbid: [{ seat: 's', bid: [{ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm: vast }] }] } },
        videoRequest,
      );
      expect(response.mediaType).to.equal('video');
    });

    it('omits width and height when the bid carries no size', function () {
      const [response] = respond({ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm: vast, mtype: 3 });
      expect(response).to.not.have.property('width');
      expect(response).to.not.have.property('height');
    });

    it('keeps width and height when the bid does carry a size', function () {
      const [response] = respond({ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm: vast, mtype: 3, w: 300, h: 250 });
      expect(response.width).to.equal(300);
      expect(response.height).to.equal(250);
    });

    it('survives a bid whose ext.meta is not an object', function () {
      const [response] = respond({ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm: vast, mtype: 3, ext: { meta: 'not an object' } });
      expect(response.meta.mediaType).to.equal('audio');
    });

    it('copies ext.meta rather than mutating the bid', function () {
      const dspExt = { meta: { advertiserDomains: ['advertiser.example'] } };
      const [response] = respond({ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm: vast, mtype: 3, ext: dspExt });
      expect(response.meta.advertiserDomains).to.deep.equal(['advertiser.example']);
      expect(Object.keys(dspExt.meta)).to.deep.equal(['advertiserDomains']);
    });

    it('mirrors the media type onto meta so bidResponseFilter cannot reject it', function () {
      const [response] = respond({ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm: vast, mtype: 3 });
      expect(response.meta.mediaType).to.equal('audio');
    });

    it('mirrors the media type onto meta for every mtype the exchange can send', function () {
      const cases = [
        { mtype: 1, adm: '<div>banner</div>', expected: 'banner' },
        { mtype: 2, adm: vast, expected: 'video' },
        { mtype: 3, adm: vast, expected: 'audio' },
      ];
      cases.forEach(({ mtype, adm, expected }) => {
        const [response] = respond({ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm, mtype });
        expect(response.meta.mediaType).to.equal(expected);
        expect(response.mediaType).to.equal(expected);
      });
    });

    it('derives a vastUrl from the audio vastXml', function () {
      const [response] = respond({ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm: vast, mtype: 3 });
      expect(response.vastUrl).to.be.a('string').and.to.contain('data:text/xml');
    });

    it('lets mtype decide audio on a multi-format unit', function () {
      const multiFormat = {
        bidderRequest: {
          bidderRequestId: 'req-1',
          bids: [{
            ...audioBidRequest,
            adUnitCode: 'audio-adunit',
            mediaTypes: { audio: { mimes: ['audio/mp4'] }, video: { mimes: ['video/mp4'] } },
          }],
        },
      };
      const [response] = spec.interpretResponse(
        { body: { id: 'req-1', cur: 'USD', seatbid: [{ seat: 's', bid: [{ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm: vast, mtype: 3 }] }] } },
        multiFormat,
      );
      expect(response.mediaType).to.equal('audio');
    });

    it('encodes a creative carrying characters outside Latin-1', function () {
      const localisedVast = '<VAST version="4.1"><Ad><InLine><AdTitle>Caf\u00e9 \u2014 Gr\u00fc\u00dfe \u201cx\u201d \u65e5\u672c</AdTitle></InLine></Ad></VAST>';
      const [response] = respond({ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm: localisedVast, mtype: 3 });
      expect(response.vastUrl).to.be.a('string').and.to.contain('data:text/xml');
      expect(response.vastXml).to.equal(localisedVast);
      expect(decodeVastDataUri(response.vastUrl)).to.equal(localisedVast);
    });

    it('preserves escaped quotes inside the creative', function () {
      const embeddedJson = '<VAST version="4.1"><Ad><InLine><Extensions><Extension><![CDATA[{"title":"He said \\"hi\\"","id":7}]]></Extension></Extensions></InLine></Ad></VAST>';
      const [response] = respond({ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm: embeddedJson, mtype: 3 });
      expect(response.vastXml).to.equal(embeddedJson);
      expect(decodeVastDataUri(response.vastUrl)).to.equal(embeddedJson);
    });
  });
});

describe('InsticatorBidAdapter — placement identifiers', function () {
  const baseBid = {
    bidder: 'insticator',
    adUnitCode: 'placement-adunit',
    bidId: 'placement-bid-1',
    params: { adUnitId: '1a2b3c4d5e6f1a2b3c4d' },
    mediaTypes: { banner: { sizes: [[300, 250]] } },
  };

  function firstImp(bid) {
    const requests = spec.buildRequests([bid], { bidderRequestId: 'req-1', refererInfo: { page: 'https://example.com' } });
    return JSON.parse(requests[0].data).imp[0];
  }

  it('forwards ext.data.pbadslot', function () {
    const imp = firstImp({ ...baseBid, ortb2Imp: { ext: { data: { pbadslot: '/1111/homepage' } } } });
    expect(imp.ext.data.pbadslot).to.equal('/1111/homepage');
  });

  it('forwards ext.data.adserver.adslot and name', function () {
    const imp = firstImp({
      ...baseBid,
      ortb2Imp: { ext: { data: { adserver: { name: 'gam', adslot: '/1111/homepage/leaderboard' } } } },
    });
    expect(imp.ext.data.adserver.adslot).to.equal('/1111/homepage/leaderboard');
    expect(imp.ext.data.adserver.name).to.equal('gam');
  });

  it('forwards all three alongside gpid', function () {
    const imp = firstImp({
      ...baseBid,
      ortb2Imp: { ext: { gpid: '/1111/homepage#1', data: { pbadslot: '/1111/homepage', adserver: { name: 'gam', adslot: '/1111/slot' } } } },
    });
    expect(imp.ext.gpid).to.equal('/1111/homepage#1');
    expect(imp.ext.data.pbadslot).to.equal('/1111/homepage');
    expect(imp.ext.data.adserver.adslot).to.equal('/1111/slot');
  });

  it('forwards first-party data keys beyond the slot fields', function () {
    const imp = firstImp({
      ...baseBid,
      ortb2Imp: { ext: { data: { pbadslot: '/1111/homepage', keywords: ['sport'], pageType: 'article' } } },
    });
    expect(imp.ext.data.keywords).to.deep.equal(['sport']);
    expect(imp.ext.data.pageType).to.equal('article');
  });

  it('leaves ext.data absent when the publisher sets neither', function () {
    const imp = firstImp({ ...baseBid, ortb2Imp: { ext: { gpid: '/1111/homepage#1' } } });
    expect(imp.ext).to.not.have.property('data');
  });

  it('leaves ext.data absent when there is no ortb2Imp at all', function () {
    const imp = firstImp(baseBid);
    expect(imp.ext).to.not.have.property('data');
  });
});

describe('InsticatorBidAdapter — vastUrl encoding', function () {
  const videoBidRequest = {
    bidder: 'insticator',
    adUnitCode: 'video-adunit',
    params: { adUnitId: '1a2b3c4d5e6f1a2b3c4d' },
    mediaTypes: { video: { mimes: ['video/mp4'] } },
    bidId: 'video-bid-1',
  };
  const request = { bidderRequest: { bidderRequestId: 'req-1', bids: [videoBidRequest] } };

  function respondVideo(adm) {
    return spec.interpretResponse(
      { body: { id: 'req-1', cur: 'USD', seatbid: [{ seat: 's', bid: [{ impid: 'video-bid-1', crid: 'cr1', price: 1.5, adm, mtype: 2 }] }] } },
      request,
    )[0];
  }

  const inLine = (title) => `<VAST version="4.1"><Ad><InLine><AdTitle>${title}</AdTitle></InLine></Ad></VAST>`;
  const creatives = {
    'plain ASCII': inLine('Hello'),
    'Latin-1 characters': inLine('Caf\u00e9 Gr\u00fc\u00dfe se\u00f1or \u00a9 20\u00b0 \u00a35'),
    'characters beyond Latin-1': inLine('a \u2014 b \u20ac9.99 \u65e5\u672c\u8a9e \u201cx\u201d'),
    'an emoji': inLine('\u{1F600}'),
    'escaped quotes in a CDATA payload':
      '<VAST version="4.1"><Ad><InLine><Extensions><Extension><![CDATA[{"t":"He said \\"hi\\""}]]></Extension></Extensions></InLine></Ad></VAST>',
  };

  Object.entries(creatives).forEach(([label, creative]) => {
    it(`round-trips a video creative with ${label}`, function () {
      const response = respondVideo(creative);
      expect(response.mediaType).to.equal('video');
      expect(response.vastXml).to.equal(creative);
      expect(decodeVastDataUri(response.vastUrl)).to.equal(creative);
    });
  });

  it('round-trips a creative longer than the encoder chunk size', function () {
    const creative = inLine('Caf\u00e9 '.repeat(20000));
    expect(decodeVastDataUri(respondVideo(creative).vastUrl)).to.equal(creative);
  });

  it('encodes audio and video creatives identically', function () {
    const creative = inLine('Caf\u00e9 \u2014 \u65e5\u672c');
    const audioUrl = spec.interpretResponse(
      { body: { id: 'req-1', cur: 'USD', seatbid: [{ seat: 's', bid: [{ impid: 'audio-bid-1', crid: 'cr1', price: 1.5, adm: creative, mtype: 3 }] }] } },
      { bidderRequest: { bidderRequestId: 'req-1', bids: [{ ...videoBidRequest, bidId: 'audio-bid-1', mediaTypes: { audio: { mimes: ['audio/mp4'] } } }] } },
    )[0].vastUrl;
    expect(respondVideo(creative).vastUrl).to.equal(audioUrl);
  });
});

describe('InsticatorBidAdapter — audio bidder params that are not an object', function () {
  const audioBid = {
    bidder: 'insticator', adUnitCode: 'au', bidId: 'b1',
    params: { adUnitId: '1a2b3c4d5e6f1a2b3c4d', audio: null },
    mediaTypes: { audio: { mimes: ['audio/mp4'] } },
    ortb2Imp: {}, ortb2: {},
  };
  const bidderRequest = {
    bidderRequestId: 'r1', timeout: 3000,
    refererInfo: { page: 'https://e.com', ref: '', domain: 'e.com' }, ortb2: {},
  };

  it('does not throw when params.audio is null', function () {
    expect(spec.isBidRequestValid(audioBid)).to.equal(true);
    expect(() => spec.buildRequests([audioBid], bidderRequest)).to.not.throw();
    const payload = JSON.parse(spec.buildRequests([audioBid], bidderRequest)[0].data);
    expect(payload.imp[0].audio.mimes).to.deep.equal(['audio/mp4']);
  });
});

describe('InsticatorBidAdapter — media type when mtype is absent', function () {
  const audioVast = '<VAST version="4.1"><Ad><InLine><Creatives><Creative><Linear><MediaFiles>' +
    '<MediaFile type="audio/mp4"><![CDATA[https://cdn.example/ad.m4a]]></MediaFile>' +
    '</MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>';
  const videoVast = audioVast.replace('audio/mp4', 'video/mp4').replace('ad.m4a', 'ad.mp4');

  const resolve = (mediaTypes, adm) => spec.interpretResponse(
    { body: { id: 'req-1', cur: 'USD', seatbid: [{ seat: 's', bid: [{ impid: 'b1', crid: 'cr1', price: 1.5, adm }] }] } },
    {
      bidderRequest: {
        bidderRequestId: 'req-1',
        bids: [{
          bidder: 'insticator',
          adUnitCode: 'au',
          params: { adUnitId: '1a2b3c4d5e6f1a2b3c4d' },
          mediaTypes,
          bidId: 'b1'
        }]
      }
    },
  )[0]?.mediaType;

  const audio = { audio: { mimes: ['audio/mp4'] } };
  const video = { video: { mimes: ['video/mp4'] } };
  const banner = { banner: { sizes: [[300, 250]] } };

  it('resolves audio from an audio-only ad unit', function () {
    expect(resolve(audio, audioVast)).to.equal('audio');
  });

  it('resolves video from a video-only ad unit', function () {
    expect(resolve(video, videoVast)).to.equal('video');
  });

  it('uses the MediaFile type when the unit declares audio and video', function () {
    expect(resolve({ ...audio, ...video }, audioVast)).to.equal('audio');
    expect(resolve({ ...audio, ...video }, videoVast)).to.equal('video');
  });

  it('reads the MediaFile type through untidy attribute formatting', function () {
    const untidy = [
      '<MediaFile type=\'audio/mpeg\'>',
      '<MediaFile type = "audio/mp4">',
      '<MediaFile type=audio/aac>',
      '<MediaFile TYPE="AUDIO/MP4">',
      '<MediaFile type="  audio/mp4">',
      '<MediaFile type="audio /mp4">',
    ];
    untidy.forEach((mediaFile) => {
      const adm = `<VAST version="4.1"><Ad><InLine><Creatives><Creative><Linear><MediaFiles>${mediaFile}<![CDATA[https://cdn.example/ad]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>`;
      expect(resolve({ ...audio, ...video }, adm), mediaFile).to.equal('audio');
    });
  });

  it('does not mistake an audio path in a video media file URL', function () {
    const adm = '<VAST version="4.1"><Ad><InLine><Creatives><Creative><Linear><MediaFiles>' +
      '<MediaFile type="video/mp4"><![CDATA[https://cdn.example/audio/clip.mp4]]></MediaFile>' +
      '</MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>';
    expect(resolve({ ...audio, ...video }, adm)).to.equal('video');
  });

  it('types VAST markup as video on a banner-only ad unit, as upstream does', function () {
    expect(resolve(banner, videoVast)).to.equal('video');
  });

  it('types VAST markup as video when no request bid matches the response', function () {
    const response = spec.interpretResponse(
      { body: { id: 'req-1', cur: 'USD', seatbid: [{ seat: 's', bid: [{ impid: 'unmatched', crid: 'cr1', price: 1.5, adm: videoVast }] }] } },
      {
        bidderRequest: {
          bidderRequestId: 'req-1',
          bids: [{
            bidder: 'insticator',
            adUnitCode: 'au',
            params: { adUnitId: '1a2b3c4d5e6f1a2b3c4d' },
            mediaTypes: video,
            bidId: 'b1'
          }]
        }
      },
    )[0];
    expect(response.mediaType).to.equal('video');
  });

  it('prefers video when the unit declares both and no MediaFile names audio', function () {
    expect(resolve({ ...audio, ...video }, '<VAST version="4.1"><Ad><InLine></InLine></Ad></VAST>')).to.equal('video');
  });

  it('still lets mtype win over the markup', function () {
    const withMtype = spec.interpretResponse(
      { body: { id: 'req-1', cur: 'USD', seatbid: [{ seat: 's', bid: [{ impid: 'b1', crid: 'cr1', price: 1.5, adm: audioVast, mtype: 2 }] }] } },
      {
        bidderRequest: {
          bidderRequestId: 'req-1',
          bids: [{
            bidder: 'insticator',
            adUnitCode: 'au',
            params: { adUnitId: '1a2b3c4d5e6f1a2b3c4d' },
            mediaTypes: { ...audio, ...video },
            bidId: 'b1'
          }]
        }
      },
    )[0];
    expect(withMtype.mediaType).to.equal('video');
  });
});
