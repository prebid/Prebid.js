import { converter, getImpIdMap, spec, storage } from 'modules/equativBidAdapter.js';
import { Renderer } from 'src/Renderer.js';
import * as utils from '../../../src/utils.js';
import * as equativUtils from '../../../libraries/equativUtils/equativUtils.js'

describe('Equativ bid adapter tests', () => {
  let sandBox;

  beforeEach(() => {
    sandBox = sinon.createSandbox();
    sandBox.stub(utils, 'logError');
    sandBox.stub(utils, 'logWarn');
  });

  afterEach(() => sandBox.restore());

  const DEFAULT_BANNER_BID_REQUESTS = [
    {
      adUnitCode: 'eqtv_42',
      bidId: 'abcd1234',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [300, 600],
          ],
        },
      },
      bidder: 'equativ',
      params: {
        networkId: 111,
      },
      requestId: 'efgh5678',
      ortb2Imp: {
        ext: {
          tid: 'zsfgzzg',
        },
      },
    }
  ];

  const DEFAULT_VIDEO_BID_REQUESTS = [
    {
      adUnitCode: 'eqtv_43',
      bidId: 'efgh5678',
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480]],
          pos: 3,
          skip: 1,
          linearity: 1,
          minduration: 10,
          maxduration: 30,
          minbitrate: 300,
          maxbitrate: 600,
          w: 640,
          h: 480,
          playbackmethod: [1],
          api: [3],
          mimes: ['video/x-flv', 'video/mp4'],
          // protocols: [2, 3], // used in older adapter ... including as comment for reference
          startdelay: 42,
          battr: [13, 14],
          placement: 1,
        },
      },
      bidder: 'equativ',
      params: {
        networkId: 111,
      },
      requestId: 'abcd1234',
      ortb2Imp: {
        ext: {
          tid: 'zsgzgzz',
        },
      },
    }
  ];

  const nativeOrtbRequest = {
    assets: [{
      id: 0,
      required: 1,
      title: {
        len: 140
      }
    },
    {
      id: 1,
      required: 1,
      img: {
        type: 3,
        w: 300,
        h: 600
      }
    },
    {
      id: 2,
      required: 1,
      data: {
        type: 1
      }
    }],
    context: 1,
    eventtrackers: [{
      event: 1,
      methods: [1, 2]
    }],
    plcmttype: 1,
    privacy: 1,
    ver: '1.2',
  };

  const DEFAULT_NATIVE_BID_REQUESTS = [
    {
      adUnitCode: 'equativ_native_42',
      bidId: 'equativ_native_bidid_42',
      mediaTypes: {
        native: {
          ortb: {
            ...nativeOrtbRequest
          }
        },
      },
      nativeOrtbRequest,
      bidder: 'equativ',
      params: {
        networkId: 111,
      },
      requestId: 'equativ_native_reqid_42',
      ortb2Imp: {
        ext: {
          tid: 'equativ_native_tid_42',
        },
      },
    }
  ];

  const DEFAULT_MULTI_IMP_BID_REQUESTS = [
    {
      adUnitCode: 'eqtv_42',
      bidId: 'abcd1234',
      mediaTypes: {
        banner: DEFAULT_BANNER_BID_REQUESTS[0].mediaTypes.banner,
        video: DEFAULT_VIDEO_BID_REQUESTS[0].mediaTypes.video,
        native: DEFAULT_NATIVE_BID_REQUESTS[0].mediaTypes.native,
      },
      nativeOrtbRequest,
      bidder: 'equativ',
      params: {
        networkId: 111,
      },
      requestId: 'efgh5678',
      ortb2Imp: {
        ext: {
          tid: 'zsfgzzg',
        },
      },
      getFloor: ({ mediaType, size }) => {
        if ((mediaType === 'banner' && size[0] === 300 && size[1] === 250) || mediaType === 'native') {
          return { floor: 1.1 };
        }
        return { floor: 0.9 };
      }
    }
  ];

  const DEFAULT_BANNER_BIDDER_REQUEST = {
    bidderCode: 'equativ',
    bids: DEFAULT_BANNER_BID_REQUESTS,
  };

  const DEFAULT_VIDEO_BIDDER_REQUEST = {
    bidderCode: 'equativ',
    bids: DEFAULT_VIDEO_BID_REQUESTS,
  };

  const DEFAULT_NATIVE_BIDDER_REQUEST = {
    bidderCode: 'equativ',
    bids: DEFAULT_NATIVE_BID_REQUESTS,
  };

  const DEFAULT_MULTI_IMP_BIDDER_REQUEST = {
    bidderCode: 'equativ',
    bids: DEFAULT_MULTI_IMP_BID_REQUESTS,
  };

  const SAMPLE_RESPONSE = {
    body: {
      id: '12h712u7-k22g-8124-ab7a-h268s22dy271',
      seatbid: [
        {
          bid: [
            {
              id: '1bh7jku7-ko2g-8654-ab72-h268shvwy271',
              impid: 'r12gwgf231',
              price: 0.6565,
              adm: '<h1>AD</h1>',
              adomain: ['abc.com'],
              cid: '1242512',
              crid: '535231',
              w: 300,
              h: 600,
              mtype: 1,
              cat: ['IAB19', 'IAB19-1'],
              cattax: 1,
            },
          ],
          seat: '4212',
        },
      ],
      cur: 'USD',
      statuscode: 0,
    },
  };

  describe('buildRequests', () => {
    it('should build correct requests using ORTB converter', () => {
      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      );
      const dataFromConverter = converter.toORTB({
        bidderRequest: DEFAULT_BANNER_BIDDER_REQUEST,
        bidRequests: DEFAULT_BANNER_BID_REQUESTS,
      });
      expect(request[0]).to.deep.equal({
        data: {
          ...dataFromConverter,
          id: request[0].data.id,
          imp: [
            {
              ...dataFromConverter.imp[0],
              id: request[0].data.imp[0].id,
            }
          ],
        },
        method: 'POST',
        url: 'https://ssb-global.smartadserver.com/api/bid?callerId=169',
      });
    });

    it('should generate a 14-char id for each imp object', () => {
      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      );

      request[0].data.imp.forEach(imp => {
        expect(imp.id).to.have.lengthOf(14);
      });
    });

    it('should add ext.bidder to imp object when siteId is defined', () => {
      const bidRequests = [
        { ...DEFAULT_BANNER_BID_REQUESTS[0], params: { siteId: 123 } },
      ];
      const bidderRequest = { ...DEFAULT_BANNER_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[0].ext.bidder).to.deep.equal({
        siteId: 123,
      });
    });

    it('should add ext.bidder to imp object when pageId is defined', () => {
      const bidRequests = [
        { ...DEFAULT_BANNER_BID_REQUESTS[0], params: { pageId: 123 } },
      ];
      const bidderRequest = { ...DEFAULT_BANNER_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[0].ext.bidder).to.deep.equal({
        pageId: 123,
      });
    });

    it('should add ext.bidder to imp object when formatId is defined', () => {
      const bidRequests = [
        { ...DEFAULT_BANNER_BID_REQUESTS[0], params: { formatId: 123 } },
      ];
      const bidderRequest = { ...DEFAULT_BANNER_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[0].ext.bidder).to.deep.equal({
        formatId: 123,
      });
    });

    it('should not add ext.bidder to imp object when siteId, pageId, formatId are not defined', () => {
      const bidRequests = [{ ...DEFAULT_BANNER_BID_REQUESTS[0], params: {} }];
      const bidderRequest = { ...DEFAULT_BANNER_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[0].ext.bidder).to.be.undefined;
    });

    it('should add site.publisher.id param', () => {
      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      )[0];
      expect(request.data.site.publisher.id).to.equal(111);
    });

    it('should pass ortb2.site.publisher.id', () => {
      const bidRequests = [{
        ...DEFAULT_BANNER_BID_REQUESTS[0],
        ortb2: {
          site: {
            publisher: {
              id: 98,
            }
          }
        }
      }];
      delete bidRequests[0].params;
      const bidderRequest = { ...DEFAULT_BANNER_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.site.publisher.id).to.equal(98);
    });

    it('should pass networkId as site.publisher.id', () => {
      const bidRequests = [{
        ...DEFAULT_BANNER_BID_REQUESTS[0],
        ortb2: {
          site: {
            publisher: {}
          }
        }
      }];
      const bidderRequest = { ...DEFAULT_BANNER_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.site.publisher.id).to.equal(111);
    });

    it('should pass ortb2.app.publisher.id', () => {
      const bidRequests = [{
        ...DEFAULT_BANNER_BID_REQUESTS[0],
        ortb2: {
          app: {
            publisher: {
              id: 27,
            }
          }
        }
      }];
      delete bidRequests[0].params;
      const bidderRequest = { ...DEFAULT_BANNER_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.app.publisher.id).to.equal(27);
    });

    it('should pass networkId as app.publisher.id', () => {
      const bidRequests = [{
        ...DEFAULT_BANNER_BID_REQUESTS[0],
        ortb2: {
          app: {
            publisher: {}
          }
        }
      }];
      const bidderRequest = { ...DEFAULT_BANNER_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.app.publisher.id).to.equal(111);
    });

    it('should pass ortb2.dooh.publisher.id', () => {
      const bidRequests = [{
        ...DEFAULT_BANNER_BID_REQUESTS[0],
        ortb2: {
          dooh: {
            publisher: {
              id: 35,
            }
          }
        }
      }];
      delete bidRequests[0].params;
      const bidderRequest = { ...DEFAULT_BANNER_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.dooh.publisher.id).to.equal(35);
    });

    it('should pass networkId as dooh.publisher.id', () => {
      const bidRequests = [{
        ...DEFAULT_BANNER_BID_REQUESTS[0],
        ortb2: {
          dooh: {
            publisher: {}
          }
        }
      }];
      const bidderRequest = { ...DEFAULT_BANNER_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.dooh.publisher.id).to.equal(111);
    });

    it('should not send floor by default', () => {
      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      )[0];
      expect(request.data.imp[0]).to.not.have.property('bidfloor');
    });

    it('should send secure connection', () => {
      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      )[0];
      expect(request.data.imp[0]).to.have.property('secure').that.eq(1);
    });

    it('should have tagid', () => {
      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      )[0];
      expect(request.data.imp[0]).to.have.property('tagid').that.eq(DEFAULT_BANNER_BID_REQUESTS[0].adUnitCode);
    });

    it('should remove dt', () => {
      const bidRequests = [
        { ...DEFAULT_BANNER_BID_REQUESTS[0], ortb2Imp: { dt: 1728377558235 } }
      ];
      const bidderRequest = { ...DEFAULT_BANNER_BIDDER_REQUEST, bids: bidRequests };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[0]).to.not.have.property('dt');
    });

    it('should read and send pid as buyeruid', () => {
      const localStorageData = {
        'eqt_pid': '7789746781'
      };
      const getDataFromLocalStorage = sinon.stub(storage, 'getDataFromLocalStorage');
      getDataFromLocalStorage.callsFake(name => localStorageData[name]);

      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      )[0];

      expect(request.data.user).to.have.property('buyeruid').that.eq(localStorageData['eqt_pid']);

      getDataFromLocalStorage.restore();
    });

    it('should not send buyeruid', () => {
      const getDataFromLocalStorage = sinon.stub(storage, 'getDataFromLocalStorage');
      getDataFromLocalStorage.callsFake(() => null);

      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      )[0];

      expect(request.data).to.not.have.property('user');

      getDataFromLocalStorage.restore();
    });

    it('should pass buyeruid defined in config', () => {
      const getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
      getDataFromLocalStorageStub.callsFake(() => undefined);

      const bidRequest = {
        ...DEFAULT_BANNER_BIDDER_REQUEST,
        ortb2: {
          user: {
            buyeruid: 'buyeruid-provided-by-publisher'
          }
        }
      };
      const request = spec.buildRequests([DEFAULT_BANNER_BID_REQUESTS[0]], bidRequest)[0];

      expect(request.data.user.buyeruid).to.deep.eq(bidRequest.ortb2.user.buyeruid);

      getDataFromLocalStorageStub.restore();
    });

    it('should pass prebid version as ext.equativprebidjsversion param', () => {
      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      )[0];
      expect(request.data.ext.equativprebidjsversion).to.equal('$prebid.version$');
    });

    it('should build a video request properly under normal circumstances', () => {
      // ASSEMBLE
      if (FEATURES.VIDEO) {
        // ACT
        const request = spec.buildRequests(DEFAULT_VIDEO_BID_REQUESTS, {})[0].data;

        // ASSERT
        expect(request.imp[0]).to.have.property('video');

        const videoObj = request.imp[0].video;

        expect(videoObj).to.have.property('api').and.to.deep.equal([3]);
        expect(videoObj).to.have.property('battr').and.to.deep.equal([13, 14]);
        expect(videoObj).to.have.property('linearity').and.to.equal(1);
        expect(videoObj).to.have.property('mimes').and.to.deep.equal(['video/x-flv', 'video/mp4']);
        expect(videoObj).to.have.property('minbitrate').and.to.equal(300);
        expect(videoObj).to.have.property('maxbitrate').and.to.equal(600);
        expect(videoObj).to.have.property('minduration').and.to.equal(10);
        expect(videoObj).to.have.property('maxduration').and.to.equal(30);
        expect(videoObj).to.have.property('placement').and.to.equal(1);
        expect(videoObj).to.have.property('playbackmethod').and.to.deep.equal([1]);
        expect(videoObj).to.have.property('pos').and.to.equal(3);
        expect(videoObj).to.have.property('skip').and.to.equal(1);
        expect(videoObj).to.have.property('startdelay').and.to.equal(42);
        expect(videoObj).to.have.property('w').and.to.equal(640);
        expect(videoObj).to.have.property('h').and.to.equal(480);
        expect(videoObj).not.to.have.property('ext');
      }
    });

    it('should read and pass ortb2Imp.rwdd', () => {
      // ASSEMBLE
      if (FEATURES.VIDEO) {
        const bidRequestsWithOrtb2ImpRwdd = [
          {
            ...DEFAULT_VIDEO_BID_REQUESTS[0],
            ortb2Imp: {
              rwdd: 1
            }
          }
        ];
        // ACT
        const request = spec.buildRequests(bidRequestsWithOrtb2ImpRwdd, {})[0].data;

        // ASSERT
        expect(request.imp[0]).to.have.property('rwdd').and.to.equal(1);
      }
    });

    it('should read mediaTypes.video.ext.rewarded and pass as rwdd', () => {
      // ASSEMBLE
      if (FEATURES.VIDEO) {
        const bidRequestsWithExtReworded = [
          {
            ...DEFAULT_VIDEO_BID_REQUESTS[0],
            mediaTypes: {
              video: {
                ext: {
                  rewarded: 1
                }
              }
            }
          }
        ];
        // ACT
        const request = spec.buildRequests(bidRequestsWithExtReworded, {})[0].data;

        // ASSERT
        expect(request.imp[0]).to.have.property('rwdd').and.to.equal(1);
      }
    });

    it('should prioritize ortb2Imp.rwdd over mediaTypes.video.ext.rewarded', () => {
      // ASSEMBLE
      if (FEATURES.VIDEO) {
        const bidRequestsWithBothRewordedParams = [
          {
            ...DEFAULT_VIDEO_BID_REQUESTS[0],
            mediaTypes: {
              video: {
                ext: {
                  rewarded: 1
                }
              }
            },
            ortb2Imp: {
              rwdd: 2
            }
          }
        ];
        // ACT
        const request = spec.buildRequests(bidRequestsWithBothRewordedParams, {})[0].data;

        // ASSERT
        expect(request.imp[0]).to.have.property('rwdd').and.to.equal(2);
      }
    });

    it('should warn about missing required properties for video requests', () => {
      // ASSEMBLE
      const missingRequiredVideoRequest = DEFAULT_VIDEO_BID_REQUESTS[0];

      // removing required properties
      delete missingRequiredVideoRequest.mediaTypes.video.mimes;
      delete missingRequiredVideoRequest.mediaTypes.video.placement;

      const bidRequests = [missingRequiredVideoRequest];
      const bidderRequest = { ...DEFAULT_VIDEO_BIDDER_REQUEST, bids: bidRequests };

      // ACT
      spec.buildRequests(bidRequests, bidderRequest);

      // ASSERT
      expect(utils.logWarn.callCount).to.equal(2);
      expect(utils.logWarn.getCall(0).args[0]).to.satisfy(arg => arg.includes('"mediaTypes.video.mimes" is missing'));
      expect(utils.logWarn.getCall(1).args[0]).to.satisfy(arg => arg.includes('"mediaTypes.video.placement" is missing'));
    });

    it('should not send a video request when it has an empty body and no other impressions with any media types are defined', () => {
      // ASSEMBLE
      const emptyVideoRequest = {
        ...DEFAULT_VIDEO_BID_REQUESTS[0],
        mediaTypes: {
          video: {}
        }
      };
      const bidRequests = [emptyVideoRequest];
      const bidderRequest = { ...DEFAULT_VIDEO_BIDDER_REQUEST, bids: bidRequests };

      // ACT
      const request = spec.buildRequests(bidRequests, bidderRequest);

      // ASSERT
      expect(utils.logError.calledOnce).to.equal(true);
      expect(utils.logError.args[0][0]).to.satisfy(arg => arg.includes('No request'));
      expect(request).to.be.undefined;
    });

    it('should build a native request properly under normal circumstances', () => {
      if (FEATURES.NATIVE) {
        // ACT
        const request = spec.buildRequests(DEFAULT_NATIVE_BID_REQUESTS, {})[0].data;

        // ASSERT
        expect(request.imp[0]).to.have.property('native');

        const nativeObj = request.imp[0].native;
        expect(nativeObj).to.have.property('ver').and.to.equal('1.2');
        expect(nativeObj).to.have.property('request').and.to.be.a('string');

        const requestObj = JSON.parse(nativeObj.request);
        expect(requestObj).to.have.property('assets').and.to.be.an('array');
        expect(requestObj).to.have.property('eventtrackers').and.to.be.an('array');
        expect(requestObj).to.have.property('plcmttype').and.to.equal(1);
        expect(requestObj).to.have.property('privacy').and.to.equal(1);
        expect(requestObj).to.have.property('ver').and.to.equal('1.2');
      }
    });

    it('should not send a native request when it has an empty body and no other impressions with any media types are defined', () => {
      if (FEATURES.NATIVE) {
        // ASSEMBLE
        const emptyNativeRequest = {
          ...DEFAULT_NATIVE_BID_REQUESTS[0],
          mediaTypes: {
            native: {}
          }
        };
        const bidRequests = [emptyNativeRequest];
        const bidderRequest = { ...DEFAULT_NATIVE_BIDDER_REQUEST, bids: bidRequests };

        // ACT
        const request = spec.buildRequests(bidRequests, bidderRequest);

        // ASSERT
        expect(utils.logError.calledOnce).to.equal(true);
        expect(utils.logError.args[0][0]).to.satisfy(arg => arg.includes('No request'));
        expect(request).to.be.undefined;
      }
    });

    it('should warn about missing "assets" property for native requests', () => {
      if (FEATURES.NATIVE) {
        // ASSEMBLE
        const missingRequiredNativeRequest = utils.deepClone(DEFAULT_NATIVE_BID_REQUESTS[0]);

        // removing just "assets" for this test
        delete missingRequiredNativeRequest.nativeOrtbRequest.assets;
        const bidRequests = [missingRequiredNativeRequest];
        const bidderRequest = { ...DEFAULT_NATIVE_BIDDER_REQUEST, bids: bidRequests };

        // this value comes from native.js, part of the ortbConverter library
        const warningMsgFromLibrary = 'mediaTypes.native is set, but no assets were specified. Native request skipped.'

        // ACT
        spec.buildRequests(bidRequests, bidderRequest);

        // ASSERT
        expect(utils.logWarn.getCall(0).args[0]).to.satisfy(arg => arg.includes(warningMsgFromLibrary));
      }
    });

    it('should warn about other missing required properties for native requests', () => {
      if (FEATURES.NATIVE) {
        // ASSEMBLE
        const missingRequiredNativeRequest = utils.deepClone(DEFAULT_NATIVE_BID_REQUESTS[0]);

        // ortbConverter library will warn about missing assets; we supply warnings for these properties here
        delete missingRequiredNativeRequest.nativeOrtbRequest.assets;
        delete missingRequiredNativeRequest.mediaTypes.native.ortb.eventtrackers;
        delete missingRequiredNativeRequest.mediaTypes.native.ortb.plcmttype;
        delete missingRequiredNativeRequest.mediaTypes.native.ortb.privacy;

        const bidRequests = [missingRequiredNativeRequest];
        const bidderRequest = { ...DEFAULT_NATIVE_BIDDER_REQUEST, bids: bidRequests };

        // ACT
        spec.buildRequests(bidRequests, bidderRequest);

        // ASSERT
        expect(utils.logWarn.callCount).to.equal(4); // the first message, regarding missing assets, is supplied by the ortbConverter library
        expect(utils.logWarn.getCall(0).args[0]).to.satisfy(arg => arg.includes('no assets were specified'));
        expect(utils.logWarn.getCall(1).args[0]).to.satisfy(arg => arg.includes('"mediaTypes.native.ortb.privacy" is missing'));
        expect(utils.logWarn.getCall(2).args[0]).to.satisfy(arg => arg.includes('"mediaTypes.native.ortb.plcmttype" is missing'));
        expect(utils.logWarn.getCall(3).args[0]).to.satisfy(arg => arg.includes('"mediaTypes.native.ortb.eventtrackers" is missing'));
      }
    });

    it('should split banner sizes per floor', () => {
      const bids = [
        {
          ...DEFAULT_BANNER_BID_REQUESTS[0],
          getFloor: ({ size }) => ({ floor: size[0] * size[1] / 100_000 })
        }
      ];

      const request = spec.buildRequests(
        bids,
        { ...DEFAULT_BANNER_BIDDER_REQUEST, bids }
      );

      expect(request[0].data.imp).to.have.lengthOf(2);

      const firstImp = request[0].data.imp[0];
      expect(firstImp.bidfloor).to.equal(300 * 250 / 100_000);
      expect(firstImp.banner.format).to.have.lengthOf(1);
      expect(firstImp.banner.format[0]).to.deep.equal({ w: 300, h: 250 });

      const secondImp = request[0].data.imp[1];
      expect(secondImp.bidfloor).to.equal(300 * 600 / 100_000);
      expect(secondImp.banner.format).to.have.lengthOf(1);
      expect(secondImp.banner.format[0]).to.deep.equal({ w: 300, h: 600 });
    });

    it('should group media types per floor', () => {
      if (FEATURES.NATIVE) {
        const request = spec.buildRequests(
          DEFAULT_MULTI_IMP_BID_REQUESTS,
          DEFAULT_MULTI_IMP_BIDDER_REQUEST
        );

        const firstImp = request[0].data.imp[0];
        expect(firstImp.bidfloor).to.equal(1.1);
        expect(firstImp.banner.format).to.have.lengthOf(1);
        expect(firstImp.banner.format[0]).to.deep.equal({ w: 300, h: 250 });
        expect(firstImp).to.have.property('native');
        expect(firstImp).to.not.have.property('video');

        const secondImp = request[0].data.imp[1];
        expect(secondImp.bidfloor).to.equal(0.9);
        expect(secondImp.banner.format).to.have.lengthOf(1);
        expect(secondImp.banner.format[0]).to.deep.equal({ w: 300, h: 600 });
        expect(secondImp).to.not.have.property('native');
        expect(secondImp).to.have.property('video');
      }
    });

    it('should not send ext.prebid', () => {
      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        {
          ...DEFAULT_BANNER_BIDDER_REQUEST,
          ortb2: {
            ext: {
              prebid: {
                previousauctioninfo: [
                  {
                    bidId: 'abcd1234',
                    bidderCpm: 5,
                    highestBidCpm: 6
                  }
                ]
              }
            }
          }
        }
      )[0];
      expect(request.data.ext).not.to.have.property('prebid');
    });

    it('should send feedback data when lost', () => {
      const bidId = 'abcd1234';
      const cpm = 3.7;
      const impIdMap = getImpIdMap();
      const token = 'y7hd87dw8';
      const RESPONSE_WITH_FEEDBACK = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  ext: {
                    feedback_token: token
                  },
                  impid: Object.keys(impIdMap).find(key => impIdMap[key] === bidId)
                }
              ]
            }
          ]
        }
      };

      let request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      )[0];

      spec.interpretResponse(RESPONSE_WITH_FEEDBACK, request);

      request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        {
          ...DEFAULT_BANNER_BIDDER_REQUEST,
          ortb2: {
            ext: {
              prebid: {
                previousauctioninfo: [
                  {
                    bidId,
                    bidderCpm: 2.41,
                    highestBidCpm: cpm
                  }
                ]
              }
            }
          }
        }
      )[0];

      expect(request.data.ext).to.have.property('bid_feedback').and.to.deep.equal({
        feedback_token: token,
        loss: 102,
        price: cpm
      });
    });

    it('should send feedback data when won', () => {
      const bidId = 'abcd1234';
      const cpm = 2.34;
      const impIdMap = getImpIdMap();
      const token = '87187y83';
      const RESPONSE_WITH_FEEDBACK = {
        body: {
          seatbid: [
            {
              bid: [
                {
                  ext: {
                    feedback_token: token
                  },
                  impid: Object.keys(impIdMap).find(key => impIdMap[key] === bidId)
                }
              ]
            }
          ]
        }
      };

      let request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      )[0];

      spec.interpretResponse(RESPONSE_WITH_FEEDBACK, request);

      request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        {
          ...DEFAULT_BANNER_BIDDER_REQUEST,
          ortb2: {
            ext: {
              prebid: {
                previousauctioninfo: [
                  {
                    bidId,
                    bidderCpm: 2.34,
                    highestBidCpm: cpm
                  }
                ]
              }
            }
          }
        }
      )[0];

      expect(request.data.ext).to.have.property('bid_feedback').and.to.deep.equal({
        feedback_token: token,
        loss: 0,
        price: cpm
      });
    });
  });

  describe('getUserSyncs', () => {
    let handleCookieSyncStub;

    beforeEach(() => {
      handleCookieSyncStub = sinon.stub(equativUtils, 'handleCookieSync');
    });
    afterEach(() => {
      handleCookieSyncStub.restore();
    });

    it('should call handleCookieSync with correct parameters and return its result', () => {
      const expectedResult = [
        { type: 'iframe', url: 'https://sync.example.com' },
      ];

      handleCookieSyncStub.returns(expectedResult)

      const result = spec.getUserSyncs({ iframeEnabled: true },
        SAMPLE_RESPONSE,
        { gdprApplies: true, vendorData: { vendor: { consents: {} } } });

      sinon.assert.calledWithMatch(
        handleCookieSyncStub,
        { iframeEnabled: true },
        SAMPLE_RESPONSE,
        { gdprApplies: true, vendorData: { vendor: { consents: {} } } },
        sinon.match.number,
        sinon.match.object
      );

      expect(result).to.deep.equal(expectedResult);
    });

    it('should return an empty array if handleCookieSync returns an empty array', () => {
      handleCookieSyncStub.returns([]);

      const result = spec.getUserSyncs({ iframeEnabled: true },
        SAMPLE_RESPONSE,
        { gdprApplies: true, vendorData: { vendor: { consents: {} } } });

      expect(result).to.deep.equal([]);
    });
  });

  describe('interpretResponse', () => {
    it('should return data returned by ORTB converter', () => {
      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      )[0];
      const bids = spec.interpretResponse(SAMPLE_RESPONSE, request);
      expect(bids).to.deep.equal(
        converter.fromORTB({
          request: request.data,
          response: SAMPLE_RESPONSE.body,
        })
      );
    });

    it('should not fail if bidRequest.data.imp is undefined', () => {
      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      )[0];
      delete request.data.imp;
      expect(spec.interpretResponse(SAMPLE_RESPONSE, request)).to.not.throw;
    });

    it('should not fail if serverResponse.body.seatbid is undefined', () => {
      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      )[0];
      const response = utils.deepClone(SAMPLE_RESPONSE);
      delete response.body.seatbid;
      expect(spec.interpretResponse(response, request)).to.not.throw;
    });

    it('should pass exp as ttl parameter with its value', () => {
      const request = spec.buildRequests(
        DEFAULT_BANNER_BID_REQUESTS,
        DEFAULT_BANNER_BIDDER_REQUEST
      )[0];

      const response = utils.deepClone(SAMPLE_RESPONSE);
      const bidId = 'abcd1234';
      const impIdMap = getImpIdMap();

      response.body.seatbid[0].bid[0].impid = Object.keys(impIdMap).find(key => impIdMap[key] === bidId);
      response.body.seatbid[0].bid[0].exp = 120;

      const result = spec.interpretResponse(response, request);

      expect(result.bids[0]).to.have.property('ttl').that.eq(120);
    });

    describe('outstream', () => {
      const bidId = 'abcd1234';

      const bidRequests = [{
        bidId,
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          },
          video: {
            context: 'outstream'
          }
        },
        params: {
          networkId: 111
        }
      }];

      it('should add renderer', () => {
        const request = spec.buildRequests(
          bidRequests,
          {
            bidderCode: 'equativ',
            bids: bidRequests
          }
        )[0];

        const response = {
          body: {
            seatbid: [
              {
                bid: [{ mtype: 2 }]
              }
            ]
          }
        };

        const impIdMap = getImpIdMap();
        response.body.seatbid[0].bid[0].impid = Object.keys(impIdMap).find(key => impIdMap[key] === bidId);
        const bid = spec.interpretResponse(response, request).bids[0];

        expect(bid).to.have.property('renderer');
        expect(bid.renderer).to.be.instanceof(Renderer);
        expect(bid.renderer.url).eq('https://apps.sascdn.com/diff/video-outstream/equativ-video-outstream.js');
      });

      it('should initialize and set renderer', () => {
        const fakeRenderer = {
          push: (cb) => cb(),
          setRender: sinon.stub()
        };

        const installStub = sandBox.stub(Renderer, 'install').returns(fakeRenderer);
        const renderAdStub = sandBox.stub();

        window.EquativVideoOutstream = { renderAd: renderAdStub };

        const request = spec.buildRequests(
          bidRequests,
          {
            bidderCode: 'equativ',
            bids: bidRequests
          }
        )[0];

        expect(installStub.notCalled).to.be.true;
        expect(fakeRenderer.setRender.notCalled).to.be.true;

        const response = {
          body: {
            seatbid: [
              {
                bid: [{
                  mtype: 2,
                  renderer: fakeRenderer
                }]
              }
            ]
          }
        };

        const impIdMap = getImpIdMap();
        response.body.seatbid[0].bid[0].impid = Object.keys(impIdMap).find(key => impIdMap[key] === bidId);

        const bid = spec.interpretResponse(response, request).bids[0];

        expect(installStub.calledOnce).to.be.true;
        expect(fakeRenderer.setRender.calledOnce).to.be.true;

        const renderFn = fakeRenderer.setRender.firstCall.args[0];

        renderFn(bid);

        expect(renderAdStub.calledOnce).to.be.true;
        expect(renderAdStub.firstCall.args[0]).to.have.property('slotId');
        expect(renderAdStub.firstCall.args[0]).to.have.property('vast');
      });
    });
  });

  describe('isBidRequestValid', () => {
    it('should return true if params.networkId is set', () => {
      const bidRequest = {
        params: {
          networkId: 123,
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true if ortb2.site.publisher.id is set', () => {
      const bidRequest = {
        ortb2: {
          site: {
            publisher: {
              id: 123,
            },
          },
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true if ortb2.app.publisher.id is set', () => {
      const bidRequest = {
        ortb2: {
          app: {
            publisher: {
              id: 123,
            },
          },
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return true if ortb2.dooh.publisher.id is set', () => {
      const bidRequest = {
        ortb2: {
          dooh: {
            publisher: {
              id: 123,
            },
          },
        },
      };
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false if networkId is not set', () => {
      const bidRequest = {};
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });
  });
});
