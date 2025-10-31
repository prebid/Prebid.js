import { spec, isValid, hasTypeVideo, isSchainValid } from 'modules/onetagBidAdapter.js';
import { expect } from 'chai';
import { BANNER, VIDEO, NATIVE } from 'src/mediaTypes.js';
import { INSTREAM, OUTSTREAM } from 'src/video.js';
import { toOrtbNativeRequest } from 'src/native.js';
import { hasTypeNative } from '../../../modules/onetagBidAdapter.js';

const NATIVE_SUFFIX = 'Ad';

const getFloor = function(params) {
  let floorPrice = 0.0001;
  switch (params.mediaType) {
    case BANNER:
      floorPrice = 1.0;
      break;
    case VIDEO:
      floorPrice = 2.0;
      break;
    case INSTREAM:
      floorPrice = 3.0;
      break;
    case OUTSTREAM:
      floorPrice = 4.0;
      break;
    case NATIVE:
      floorPrice = 5.0;
      break;
  }
  return {currency: params.currency, floor: floorPrice};
};

describe('onetag', function () {
  function createBid() {
    return {
      'bidder': 'onetag',
      'params': {
        'pubId': '386276e072',
      },
      'adUnitCode': 'adunit-code',
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'ortb2Imp': {
        'ext': {
          'tid': '0000'
        }
      },
      'ortb2': {
        'source': {
          'tid': '1111'
        }
      },
      'schain': {
        'validation': 'off',
        'config': {
          'ver': '1.0',
          'complete': 1,
          'nodes': [
            {
              'asi': 'indirectseller.com',
              'sid': '00001',
              'hp': 1
            }
          ]
        }
      },
    };
  }

  function createNativeLegacyBid(bidRequest) {
    let bid = bidRequest || createBid();
    bid.mediaTypes = bid.mediaTypes || {};
    bid.mediaTypes.native = {
      adTemplate: "<div><figure><img decoding=\"async\" referrerpolicy=\"no-referrer\" loading=\"lazy\" src=\"##hb_native_image##\" alt=\"##hb_native_brand##\" width=\"0\" height=\"0\"></figure><div class=\"a-nativeframe__text\"><span class=\"a-nativeframe__label\">##hb_native_brand##</span><h3 class=\"a-nativeframe__title\">##hb_native_title##</h3><div class=\"a-nativeframe__details\"><span class=\"a-nativeframe__cta\">##hb_native_cta##</span><span class=\"a-nativeframe__info\">##hb_native_brand##</span></div></div><a class=\"o-faux-link\" href=\"##hb_native_linkurl##\" target=\"_blank\"></a>",
      title: {
        required: 1,
        sendId: 1
      },
      body: {
        required: 1,
        sendId: 1
      },
      cta: {
        required: 0,
        sendId: 1
      },
      displayUrl: {
        required: 0,
        sendId: 1
      },
      icon: {
        required: 0,
        sendId: 1
      },
      image: {
        required: 1,
        sendId: 1
      },
      sponsoredBy: {
        required: 1,
        sendId: 1
      }
    }
    bid = addNativeParams(bid);
    const ortbConversion = toOrtbNativeRequest(bid.nativeParams);
    bid.mediaTypes.native = {};
    bid.mediaTypes.native.adTemplate = bid.nativeParams.adTemplate;
    bid.mediaTypes.native.ortb = ortbConversion;
    bid.floors = {
      currency: 'EUR',
      schema: {
        delimiter: '|',
        fields: [ 'mediaType', 'size' ]
      },
      values: {
        'native|*': 1.10
      }
    }
    bid.getFloor = getFloor;
    return bid;
  }

  function addNativeParams(bidRequest) {
    const bidParams = bidRequest.nativeParams || {};
    for (const property in bidRequest.mediaTypes.native) {
      bidParams[property] = bidRequest.mediaTypes.native[property];
    }
    bidRequest.nativeParams = bidParams;
    return bidRequest;
  }

  function createNativeBid(bidRequest) {
    const bid = bidRequest || createBid();
    bid.mediaTypes = bid.mediaTypes || {};

    bid.mediaTypes.native = {
      ortb: {
        ver: '1.2',
        assets: [{
          id: 1,
          required: 1,
          title: {
            len: 140
          }
        },
        {
          id: 2,
          required: true,
          img: {
            type: 3,
            wmin: 100,
            hmin: 100,
          }
        },
        {
          id: 3,
          required: true,
          data: {
            type: 6
          }
        },
        {
          id: 4,
          video: {
            mimes: ['video/mp4', 'video/x-mswmv'],
            minduration: 5,
            maxduration: 30,
            protocols: [2, 3]
          }
        }],
        eventtrackers: [{
          event: 1,
          methods: [1],
          url: 'sample-url'
        }]
      }
    };

    bid.floors = {
      currency: 'EUR',
      schema: {
        delimiter: '|',
        fields: [ 'mediaType', 'size' ]
      },
      values: {
        'native|*': 1.10
      }
    }
    bid.getFloor = getFloor;

    return bid;
  }

  function createBannerBid(bidRequest) {
    const bid = bidRequest || createBid();
    bid.mediaTypes = bid.mediaTypes || {};
    bid.mediaTypes.banner = {
      sizes: [[300, 250]]
    };
    bid.floors = {
      currency: 'EUR',
      schema: {
        delimiter: '|',
        fields: [ 'mediaType', 'size' ]
      },
      values: {
        'banner|300x250': 0.10
      }
    }
    bid.getFloor = getFloor;

    return bid;
  }

  function createInstreamVideoBid(bidRequest) {
    const bid = bidRequest || createBid();
    bid.mediaTypes = bid.mediaTypes || {};
    bid.mediaTypes.video = {
      context: 'instream',
      mimes: ['video/mp4', 'video/webm', 'application/javascript', 'video/ogg'],
      playerSize: [640, 480]
    };
    bid.floors = {
      currency: 'EUR',
      schema: {
        delimiter: '|',
        fields: [ 'mediaType', 'size' ]
      },
      values: {
        'video|640x480': 0.10
      }
    }
    bid.getFloor = getFloor;
    return bid;
  }

  function createOutstreamVideoBid(bidRequest) {
    const bid = bidRequest || createBid();
    bid.mediaTypes = bid.mediaTypes || {};
    bid.mediaTypes.video = {
      context: 'outstream',
      mimes: ['video/mp4', 'video/webm', 'application/javascript', 'video/ogg'],
      playerSize: [640, 480]
    };
    bid.floors = {
      currency: 'EUR',
      schema: {
        delimiter: '|',
        fields: [ 'mediaType', 'size' ]
      },
      values: {
        'video|640x480': 0.10
      }
    }
    bid.getFloor = getFloor;
    return bid;
  }

  function createMultiFormatBid() {
    return createInstreamVideoBid(createBannerBid());
  }

  let bannerBid, instreamVideoBid, outstreamVideoBid, nativeBid, nativeLegacyBid;
  beforeEach(() => {
    bannerBid = createBannerBid();
    instreamVideoBid = createInstreamVideoBid();
    outstreamVideoBid = createOutstreamVideoBid();
    nativeBid = createNativeBid();
    nativeLegacyBid = createNativeLegacyBid();
  })

  describe('isBidRequestValid', function () {
    it('Should return true when required params are found', function () {
      expect(spec.isBidRequestValid(bannerBid)).to.be.true;
    });
    it('Should return false when pubId is not a string', function () {
      bannerBid.params.pubId = 30;
      expect(spec.isBidRequestValid(bannerBid)).to.be.false;
    });
    it('Should return false when pubId is undefined', function () {
      bannerBid.params.pubId = undefined;
      expect(spec.isBidRequestValid(bannerBid)).to.be.false;
    });
    describe('banner bidRequest', function () {
      it('Should return false when the sizes array is empty', function () {
        bannerBid.mediaTypes.banner.sizes = [];
        expect(spec.isBidRequestValid(bannerBid)).to.be.false;
      });
    });
    describe('native bidRequest', function () {
      it('Should return true when correct native bid is passed', function () {
        const nativeBid = createNativeBid();
        const nativeLegacyBid = createNativeLegacyBid();
        expect(spec.isBidRequestValid(nativeBid)).to.be.true;
        expect(spec.isBidRequestValid(nativeLegacyBid)).to.be.true;
      });
      it('Should return false when native is not an object', function () {
        const nativeBid = createNativeBid();
        const nativeLegacyBid = createNativeLegacyBid();
        nativeBid.mediaTypes.native = nativeLegacyBid.mediaTypes.native = 30;
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
        expect(spec.isBidRequestValid(nativeLegacyBid)).to.be.false;
      });
      it('Should return false when native.ortb if defined but it isn\'t an object', function () {
        const nativeBid = createNativeBid();
        nativeBid.mediaTypes.native.ortb = 30 || 'string';
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
      });
      it('Should return false when native.ortb.assets is not an array', function () {
        const nativeBid = createNativeBid();
        const nativeLegacyBid = createNativeLegacyBid();
        nativeBid.mediaTypes.native.ortb.assets = nativeLegacyBid.mediaTypes.native.ortb.assets = 30;
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
        expect(spec.isBidRequestValid(nativeLegacyBid)).to.be.false;
      });
      it('Should return false when native.ortb.assets is an empty array', function () {
        const nativeBid = createNativeBid();
        const nativeLegacyBid = createNativeLegacyBid();
        nativeBid.mediaTypes.native.ortb.assets = nativeLegacyBid.mediaTypes.native.ortb.assets = [];
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
        expect(spec.isBidRequestValid(nativeLegacyBid)).to.be.false;
      });
      it('Should return false when native.ortb.assets[i] doesnt have \'id\'', function () {
        const nativeBid = createNativeBid();
        const nativeLegacyBid = createNativeLegacyBid();
        Reflect.deleteProperty(nativeBid.mediaTypes.native.ortb.assets[0], 'id');
        Reflect.deleteProperty(nativeLegacyBid.mediaTypes.native.ortb.assets[0], 'id');
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
        expect(spec.isBidRequestValid(nativeLegacyBid)).to.be.false;
      });
      it('Should return false when native.ortb.assets[i] doesnt have any of \'title\', \'img\', \'data\' and \'video\' properties', function () {
        const nativeBid = createNativeBid();
        const nativeLegacyBid = createNativeLegacyBid();
        const titleIndex = nativeBid.mediaTypes.native.ortb.assets.findIndex(asset => asset.title);
        const legacyTitleIndex = nativeLegacyBid.mediaTypes.native.ortb.assets.findIndex(asset => asset.title);
        Reflect.deleteProperty(nativeBid.mediaTypes.native.ortb.assets[titleIndex], 'title');
        Reflect.deleteProperty(nativeLegacyBid.mediaTypes.native.ortb.assets[legacyTitleIndex], 'title');
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
        expect(spec.isBidRequestValid(nativeLegacyBid)).to.be.false;
      });
      it('Should return false when native.ortb.assets[i] have title, but doesnt have \'len\' property', function () {
        const nativeBid = createNativeBid();
        const nativeLegacyBid = createNativeLegacyBid();
        const titleIndex = nativeBid.mediaTypes.native.ortb.assets.findIndex(asset => asset.title);
        const legacyTitleIndex = nativeLegacyBid.mediaTypes.native.ortb.assets.findIndex(asset => asset.title);
        Reflect.deleteProperty(nativeBid.mediaTypes.native.ortb.assets[titleIndex].title, 'len');
        Reflect.deleteProperty(nativeLegacyBid.mediaTypes.native.ortb.assets[legacyTitleIndex].title, 'len');
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
        expect(spec.isBidRequestValid(nativeLegacyBid)).to.be.false;
      });
      it('Should return false when native.ortb.assets[i] is data but doesnt have \'type\' property', function () {
        const nativeBid = createNativeBid();
        const nativeLegacyBid = createNativeLegacyBid();
        const dataIndex = nativeBid.mediaTypes.native.ortb.assets.findIndex(asset => asset.data);
        Reflect.deleteProperty(nativeBid.mediaTypes.native.ortb.assets[dataIndex].data, 'type');
        Reflect.deleteProperty(nativeLegacyBid.mediaTypes.native.ortb.assets[dataIndex].data, 'type');
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
        expect(spec.isBidRequestValid(nativeLegacyBid)).to.be.false;
      });
      it('Should return false when native.ortb.assets[i] is video but doesnt have \'mimes\' property', function () {
        const nativeBid = createNativeBid();
        const videoIndex = nativeBid.mediaTypes.native.ortb.assets.findIndex(asset => asset.video);
        Reflect.deleteProperty(nativeBid.mediaTypes.native.ortb.assets[videoIndex].video, 'mimes');
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
      });
      it('Should return false when native.ortb.assets[i] is video but doesnt have \'minduration\' property', function () {
        const nativeBid = createNativeBid();
        const videoIndex = nativeBid.mediaTypes.native.ortb.assets.findIndex(asset => asset.video);
        Reflect.deleteProperty(nativeBid.mediaTypes.native.ortb.assets[videoIndex].video, 'minduration');
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
      });
      it('Should return false when native.ortb.assets[i] is video but doesnt have \'maxduration\' property', function () {
        const nativeBid = createNativeBid();
        const videoIndex = nativeBid.mediaTypes.native.ortb.assets.findIndex(asset => asset.video);
        Reflect.deleteProperty(nativeBid.mediaTypes.native.ortb.assets[videoIndex].video, 'maxduration');
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
      });
      it('Should return false when native.ortb.assets[i] is video but doesnt have \'protocols\' property', function () {
        const nativeBid = createNativeBid();
        const videoIndex = nativeBid.mediaTypes.native.ortb.assets.findIndex(asset => asset.video);
        Reflect.deleteProperty(nativeBid.mediaTypes.native.ortb.assets[videoIndex].video, 'protocols');
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
      });
      it('Should return false when native.ortb.eventtrackers is not an array', function () {
        const nativeBid = createNativeBid();
        nativeBid.mediaTypes.native.ortb.eventtrackers = 30;
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
      });
      it('Should return false when native.ortb.eventtrackers[i].event is not a number', function () {
        const nativeBid = createNativeBid();
        nativeBid.mediaTypes.native.ortb.eventtrackers[0].event = 'test-string';
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
      });
      it('Should return false when native.ortb.eventtrackers[i].event is not defined', function () {
        const nativeBid = createNativeBid();
        nativeBid.mediaTypes.native.ortb.eventtrackers[0].event = undefined;
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
      });
      it('Should return false when native.ortb.eventtrackers[i].methods is not an array', function () {
        const nativeBid = createNativeBid();
        nativeBid.mediaTypes.native.ortb.eventtrackers[0].methods = 30;
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
      });
      it('Should return false when native.ortb.eventtrackers[i].methods is empty array', function () {
        const nativeBid = createNativeBid();
        nativeBid.mediaTypes.native.ortb.eventtrackers[0].methods = [];
        expect(spec.isBidRequestValid(nativeBid)).to.be.false;
      });
    });
    describe('video bidRequest', function () {
      it('Should return false when the context is undefined', function () {
        instreamVideoBid.mediaTypes.video.context = undefined;
        expect(spec.isBidRequestValid(instreamVideoBid)).to.be.false;
      });
      it('Should return false when the context is not instream or outstream', function () {
        instreamVideoBid.mediaTypes.video.context = 'wrong';
        expect(spec.isBidRequestValid(instreamVideoBid)).to.be.false;
      });
      it('Should return false when playerSize is undefined', function () {
        const videoBid = createInstreamVideoBid();
        videoBid.mediaTypes.video.playerSize = undefined;
        expect(spec.isBidRequestValid(videoBid)).to.be.false;
      });
      it('Should return false when playerSize is not an array', function () {
        const videoBid = createInstreamVideoBid();
        videoBid.mediaTypes.video.playerSize = 30;
        expect(spec.isBidRequestValid(videoBid)).to.be.false;
      });
      it('Should return false when playerSize is an empty array', function () {
        const videoBid = createInstreamVideoBid();
        videoBid.mediaTypes.video.playerSize = [];
        expect(spec.isBidRequestValid(videoBid)).to.be.false;
      });
      it('Should return true when context is outstream', function () {
        expect(spec.isBidRequestValid(outstreamVideoBid)).to.be.true;
      });
    });
    describe('multi format bidRequest', function () {
      it('Should return true when correct multi format bid is passed', function () {
        expect(spec.isBidRequestValid(createMultiFormatBid())).to.be.true;
      });
      it('Should split multi format bid into two single format bid with same bidId', function () {
        const bids = JSON.parse(spec.buildRequests([createMultiFormatBid()]).data).bids;
        expect(bids.length).to.equal(2);
        expect(bids[0].bidId).to.equal(bids[1].bidId);
      });
      it('Should retrieve correct request bid when extracting video request data', function () {
        const requestBid = createMultiFormatBid();
        const multiFormatRequest = spec.buildRequests([requestBid]);
        const serverResponse = {
          body: {
            bids: [
              {
                mediaType: BANNER,
                requestId: requestBid.bidId,
                ad: 'test-banner'
              }, {
                mediaType: VIDEO,
                requestId: requestBid.bidId,
                vastUrl: 'test-video'
              }
            ]
          }
        };
        const responseBids = spec.interpretResponse(serverResponse, multiFormatRequest);
        expect(responseBids.length).to.equal(2);
        expect(responseBids[0].ad).to.equal('test-banner');
        expect(responseBids[1].vastUrl).to.equal('test-video');
      });
    });
  });

  describe('buildRequests', function () {
    let serverRequest, data;
    before(() => {
      serverRequest = spec.buildRequests([bannerBid, instreamVideoBid, nativeBid, nativeLegacyBid]);
      data = JSON.parse(serverRequest.data);
    });

    it('Creates a ServerRequest object with method, URL and data', function () {
      expect(serverRequest).to.exist;
      expect(serverRequest.method).to.exist;
      expect(serverRequest.url).to.exist;
      expect(serverRequest.data).to.exist;
    });
    it('Returns POST method', function () {
      expect(serverRequest.method).to.equal('POST');
    });
    it('Returns valid URL', function () {
      expect(serverRequest.url).to.equal('https://onetag-sys.com/prebid-request');
    });
    it('Should contain all keys', function () {
      expect(data).to.be.an('object');
      expect(data).to.include.all.keys('location', 'referrer', 'stack', 'numIframes', 'sHeight', 'sWidth', 'docHeight', 'wHeight', 'wWidth', 'sLeft', 'sTop', 'hLength', 'bids', 'docHidden', 'xOffset', 'yOffset', 'networkConnectionType', 'networkEffectiveConnectionType', 'timing', 'version', 'fledgeEnabled');
      expect(data.location).to.satisfy(function (value) {
        return value === null || typeof value === 'string';
      });
      expect(data.referrer).to.satisfy(referrer => referrer === null || typeof referrer === 'string');
      expect(data.stack).to.be.an('array');
      expect(data.numIframes).to.be.a('number');
      expect(data.sHeight).to.be.a('number');
      expect(data.sWidth).to.be.a('number');
      expect(data.wWidth).to.be.a('number');
      expect(data.wHeight).to.be.a('number');
      expect(data.sLeft).to.be.a('number');
      expect(data.sTop).to.be.a('number');
      expect(data.hLength).to.be.a('number');
      expect(data.networkConnectionType).to.satisfy(function (value) {
        return value === null || typeof value === 'string'
      });
      expect(data.networkEffectiveConnectionType).to.satisfy(function (value) {
        return value === null || typeof value === 'string'
      });
      expect(data.fledgeEnabled).to.be.a('boolean');
      expect(data.bids).to.be.an('array');
      expect(data.version).to.have.all.keys('prebid', 'adapter');
      const bids = data['bids'];
      for (let i = 0; i < bids.length; i++) {
        const bid = bids[i];
        if (hasTypeVideo(bid)) {
          expect(bid).to.have.all.keys(
            'adUnitCode',
            'auctionId',
            'bidId',
            'bidderRequestId',
            'pubId',
            'ortb2Imp',
            'transactionId',
            'context',
            'playerSize',
            'mediaTypeInfo',
            'type',
            'priceFloors'
          );
        } else if (hasTypeNative(bid)) {
          expect(bid).to.have.all.keys(
            'adUnitCode',
            'auctionId',
            'bidId',
            'bidderRequestId',
            'pubId',
            'ortb2Imp',
            'transactionId',
            'mediaTypeInfo',
            'sizes',
            'type',
            'priceFloors'
          );
          expect(bid.mediaTypeInfo).to.have.key('ortb');
        } else if (isValid(BANNER, bid)) {
          expect(bid).to.have.all.keys(
            'adUnitCode',
            'auctionId',
            'bidId',
            'bidderRequestId',
            'pubId',
            'ortb2Imp',
            'transactionId',
            'mediaTypeInfo',
            'sizes',
            'type',
            'priceFloors'
          );
        }
        if (bid.schain && isSchainValid(bid.schain)) {
          expect(data).to.have.all.keys('schain');
        }
        expect(bid.bidId).to.be.a('string');
        expect(bid.pubId).to.be.a('string');
        expect(bid.priceFloors).to.be.an('array');
        expect(bid.priceFloors).to.satisfy(function (priceFloors) {
          if (priceFloors.length === 0) {
            return true;
          }
          return priceFloors.every(function (priceFloor) {
            expect(priceFloor).to.have.all.keys('currency', 'floor', 'size');
            expect(priceFloor.currency).to.be.a('string');
            expect(priceFloor.floor).to.be.a('number');
            expect(priceFloor.size).to.satisfy(function (size) {
              if (typeof size !== 'object' && size !== null && typeof size !== 'undefined') {
                return false;
              }
              if (size !== null) {
                const keys = Object.keys(size);
                if (keys.length === 0) {
                  return true;
                }
                expect(size).to.have.keys('width', 'height');
                expect(size.width).to.be.a('number');
                expect(size.height).to.be.a('number');
              }
              return true;
            });
            return true;
          });
        });
      }
    });
    it('Returns empty data if no valid requests are passed', function () {
      serverRequest = spec.buildRequests([]);
      const dataString = serverRequest.data;
      try {
        const dataObj = JSON.parse(dataString);
        expect(dataObj.bids).to.be.an('array').that.is.empty;
      } catch (e) { }
    });
    it('Should pick each bid\'s auctionId and transactionId from ortb2 related fields', function () {
      const serverRequest = spec.buildRequests([bannerBid]);
      const payload = JSON.parse(serverRequest.data);

      expect(payload).to.exist;
      expect(payload.bids).to.exist.and.to.have.length(1);
      expect(payload.bids[0].auctionId).to.equal(bannerBid.ortb2.source.tid);
      expect(payload.bids[0].transactionId).to.equal(bannerBid.ortb2Imp.ext.tid);
      expect(payload.bids[0].ortb2Imp).to.deep.equal(bannerBid.ortb2Imp);
    });
    it('should send GDPR consent data', function () {
      const consentString = 'consentString';
      const addtlConsent = '2~1.35.41.101~dv.9.21.81';
      const bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          consentString: consentString,
          gdprApplies: true,
          addtlConsent: addtlConsent
        }
      };
      const serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);

      expect(payload).to.exist;
      expect(payload.gdprConsent).to.exist;
      expect(payload.gdprConsent.consentString).to.exist.and.to.equal(consentString);
      expect(payload.gdprConsent.addtlConsent).to.exist.and.to.equal(addtlConsent);
      expect(payload.gdprConsent.consentRequired).to.exist.and.to.be.true;
    });
    it('Should send GPP consent data', function () {
      const consentString = 'consentString';
      const applicableSections = [1, 2, 3];
      const bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gppConsent': {
          gppString: consentString,
          applicableSections: applicableSections
        }
      };
      const serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);

      expect(payload).to.exist;
      expect(payload.gppConsent).to.exist;
      expect(payload.gppConsent.consentString).to.exist.and.to.equal(consentString);
      expect(payload.gppConsent.applicableSections).to.have.same.members(applicableSections);
    });
    it('Should send us privacy string', function () {
      const consentString = 'us_foo';
      const bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'uspConsent': consentString
      };
      const serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);

      expect(payload.usPrivacy).to.exist;
      expect(payload.usPrivacy).to.exist.and.to.equal(consentString);
    });
    it('Should send FPD (ortb2 field)', function () {
      const firtPartyData = {
        // this is where the contextual data is placed
        site: {
          name: 'example',
          domain: 'page.example.com',
          // OpenRTB 2.5 spec / Content Taxonomy
          cat: ['IAB2'],
          sectioncat: ['IAB2-2'],
          pagecat: ['IAB2-2'],
          page: 'https://page.example.com/here.html',
          ref: 'https://ref.example.com',
          keywords: 'power tools, drills',
          search: 'drill',
          content: {
            userrating: '4',
            data: [{
              name: 'www.dataprovider1.com', // who resolved the segments
              ext: {
                segtax: 7, // taxonomy used to encode the segments
                cids: ['iris_c73g5jq96mwso4d8']
              },
              // the bare minimum are the IDs. These IDs are the ones from the new IAB Content Taxonomy v3
              segment: [ { id: '687' }, { id: '123' } ]
            }]
          },
          ext: {
            data: { // fields that aren't part of openrtb 2.6
              pageType: 'article',
              category: 'repair'
            }
          }
        },
        // this is where the user data is placed
        user: {
          keywords: 'a,b',
          data: [{
            name: 'dataprovider.com',
            ext: {
              segtax: 4
            },
            segment: [{
              id: '1'
            }]
          }],
          ext: {
            data: {
              registered: true,
              interests: ['cars']
            }
          }
        },
        regs: {
          gpp: 'abc1234',
          gpp_sid: [7]
        }
      };
      const bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'ortb2': firtPartyData
      }
      const serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);
      expect(payload.ortb2).to.exist;
      expect(payload.ortb2).to.exist.and.to.deep.equal(firtPartyData);
    });
    it('Should send DSA (ortb2 field)', function () {
      const dsa = {
        'regs': {
          'ext': {
            'dsa': {
              'required': 1,
              'pubrender': 0,
              'datatopub': 1,
              'transparency': [{
                'domain': 'dsa-domain',
                'params': [1, 2]
              }]
            }
          }
        }
      };
      const bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'ortb2': dsa
      }
      const serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);
      expect(payload.ortb2).to.exist;
      expect(payload.ortb2).to.exist.and.to.deep.equal(dsa);
    });
    it('Should send FLEDGE eligibility flag when FLEDGE is enabled', function () {
      const bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'paapi': {
          'enabled': true
        }
      };
      const serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);

      expect(payload.fledgeEnabled).to.exist;
      expect(payload.fledgeEnabled).to.exist.and.to.equal(bidderRequest.paapi.enabled);
    });
    it('Should send FLEDGE eligibility flag when FLEDGE is not enabled', function () {
      const bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        paapi: {
          enabled: false
        }
      };
      const serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);

      expect(payload.fledgeEnabled).to.exist;
      expect(payload.fledgeEnabled).to.exist.and.to.equal(bidderRequest.paapi.enabled);
    });
    it('Should send FLEDGE eligibility flag set to false when fledgeEnabled is not defined', function () {
      const bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
      };
      const serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);

      expect(payload.fledgeEnabled).to.exist;
      expect(payload.fledgeEnabled).to.exist.and.to.equal(false);
    });
  });
  describe('interpretResponse', function () {
    const request = getBannerVideoRequest();
    const response = getBannerVideoNativeResponse();
    const fledgeResponse = getFledgeBannerResponse();
    const requestData = JSON.parse(request.data);
    it('Returns an array of valid server responses if response object is valid', function () {
      const interpretedResponse = spec.interpretResponse(response, request);
      const fledgeInterpretedResponse = spec.interpretResponse(fledgeResponse, request);
      expect(interpretedResponse).to.be.an('array').that.is.not.empty;
      expect(fledgeInterpretedResponse).to.be.an('object');
      expect(fledgeInterpretedResponse.bids).to.satisfy(function (value) {
        return value === null || Array.isArray(value);
      });
      expect(fledgeInterpretedResponse.paapi).to.be.an('array').that.is.not.empty;
      for (let i = 0; i < interpretedResponse.length; i++) {
        const dataItem = interpretedResponse[i];
        expect(dataItem).to.include.all.keys('requestId', 'cpm', 'width', 'height', 'ttl', 'creativeId', 'netRevenue', 'currency', 'meta', 'dealId');
        if (dataItem.meta.mediaType === VIDEO) {
          const { context } = requestData.bids.find((item) => item.bidId === dataItem.requestId);
          if (context === INSTREAM) {
            expect(dataItem).to.include.all.keys('videoCacheKey', 'vastUrl');
            expect(dataItem.vastUrl).to.be.a('string');
            expect(dataItem.videoCacheKey).to.be.a('string');
          } else if (context === OUTSTREAM) {
            expect(dataItem).to.include.all.keys('renderer', 'vastXml', 'vastUrl');
            expect(dataItem.renderer).to.be.an('object');
            expect(dataItem.vastUrl).to.be.a('string');
            expect(dataItem.vastXml).to.be.a('string');
          }
        } else if (dataItem.meta.mediaType === BANNER) {
          expect(dataItem).to.include.all.keys('ad');
          expect(dataItem.ad).to.be.a('string');
        } else if (dataItem.meta.mediaType === NATIVE || dataItem.meta.mediaType === NATIVE + NATIVE_SUFFIX) {
          expect(dataItem).to.include.all.keys('native');
          expect(dataItem.native).to.be.an('object');
        }
        expect(dataItem.requestId).to.be.a('string');
        expect(dataItem.cpm).to.be.a('number');
        expect(dataItem.width).to.be.a('number');
        expect(dataItem.height).to.be.a('number');
        expect(dataItem.ttl).to.be.a('number');
        expect(dataItem.creativeId).to.be.a('string');
        expect(dataItem.netRevenue).to.be.a('boolean');
        expect(dataItem.currency).to.be.a('string');
        expect(dataItem.meta.advertiserDomains).to.be.an('array');
      }
    });
    it('Returns an empty array if response is not valid', function () {
      const serverResponses = spec.interpretResponse('invalid_response', { data: '{}' });
      expect(serverResponses).to.be.an('array').that.is.empty;
    });
    it('Returns meta dsa field if dsa field is present in response', function () {
      const dsaResponseObj = {
        'behalf': 'Advertiser',
        'paid': 'Advertiser',
        'transparency': {
          'domain': 'dsp1domain.com',
          'params': [1, 2]
        },
        'adrender': 1
      };
      const responseWithDsa = {...response};
      responseWithDsa.body.bids.forEach(bid => bid.dsa = {...dsaResponseObj});
      const serverResponse = spec.interpretResponse(responseWithDsa, request);
      serverResponse.forEach(bid => expect(bid.meta.dsa).to.deep.equals(dsaResponseObj));
    });
  });
  describe('getUserSyncs', function () {
    const sync_endpoint = 'https://onetag-sys.com/usync/';
    it('Returns an iframe if iframeEnabled is true', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true });
      expect(syncs).to.be.an('array');
      expect(syncs.length).to.equal(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include(sync_endpoint);
    });
    it('Returns an empty array if iframeEnabled is false', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: false });
      expect(syncs).to.be.an('array').that.is.empty;
    });
    it('Must pass gdpr params when gdprApplies is true', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, {}, {
        gdprApplies: true, consentString: 'foo'
      });
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include(sync_endpoint);
      expect(syncs[0].url).to.match(/(?:[?&](?:gdpr_consent=foo([^&]*)|gdpr=1([^&]*)|[^&]*))+$/);
    });
    it('Must pass gdpr params when gdprApplies is false', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, {}, {
        gdprApplies: false, consentString: 'foo'
      });
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include(sync_endpoint);
      expect(syncs[0].url).to.match(/(?:[?&](?:gdpr_consent=foo([^&]*)|gdpr=0([^&]*)))+$/);
    });
    it('Must pass gdpr consent string param when gdprApplies is undefined', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, {}, {
        consentString: 'foo'
      });
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include(sync_endpoint);
      expect(syncs[0].url).to.match(/(?:[?&](?:gdpr_consent=foo([^&]*)))+$/);
    });
    it('Must pass no gdpr params when consentString is null', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, {}, {
        consentString: null
      });
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include(sync_endpoint);
      expect(syncs[0].url).to.not.match(/(?:[?&](?:gdpr_consent=([^&]*)|gdpr=([^&]*)))+$/);
    });
    it('Must pass no gdpr param when gdprConsent is empty', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, {}, {});
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include(sync_endpoint);
      expect(syncs[0].url).to.not.match(/(?:[?&](?:gdpr_consent=([^&]*)|gdpr=([^&]*)))+$/);
    });
    it('Must pass gpp consent string when gppConsent object is available', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, {}, {}, {}, {
        gppString: 'foo'
      });
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include(sync_endpoint);
      expect(syncs[0].url).to.match(/(?:[?&](?:gpp_consent=foo([^&]*)))+$/);
    });
    it('Must pass no gpp params when consentString is null', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, {}, {}, {}, {
        gppString: null
      });
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include(sync_endpoint);
      expect(syncs[0].url).to.not.match(/(?:[?&](?:gpp_consent=([^&]*)))+$/);
    });
    it('Must pass no gpp params when consentString is empty', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, {}, {}, {}, {});
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include(sync_endpoint);
      expect(syncs[0].url).to.not.match(/(?:[?&](?:gpp_consent=([^&]*)))+$/);
    });
    it('Should send us privacy string', function () {
      const usConsentString = 'us_foo';
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, {}, {}, usConsentString);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include(sync_endpoint);
      expect(syncs[0].url).to.match(/(?:[?&](?:us_privacy=us_foo(?:[&][^&]*)*))+$/);
    });
  });
  describe('isSchainValid', function () {
    it('Should return false when schain is null or undefined', function () {
      expect(isSchainValid(null)).to.be.false;
      expect(isSchainValid(undefined)).to.be.false;
    });
    it('Should return false when schain is missing nodes key', function () {
      const schain = { 'otherKey': 'otherValue' };
      expect(isSchainValid(schain)).to.be.false;
    });
    it('Should return false when schain is missing one of the required SupplyChainNode attribute', function () {
      const missingAsiNode = { 'sid': '00001', 'hp': 1 };
      const missingSidNode = { 'asi': 'indirectseller.com', 'hp': 1 };
      const missingHpNode = { 'asi': 'indirectseller.com', 'sid': '00001' };
      expect(isSchainValid({ 'config': { 'nodes': [missingAsiNode] } })).to.be.false;
      expect(isSchainValid({ 'config': { 'nodes': [missingSidNode] } })).to.be.false;
      expect(isSchainValid({ 'config': { 'nodes': [missingHpNode] } })).to.be.false;
    });
    it('Should return true when schain contains all required attributes', function () {
      const validSchain = {
        'nodes': [
          {
            'asi': 'indirectseller.com',
            'sid': '00001',
            'hp': 1
          }
        ]
      };
      expect(isSchainValid(validSchain)).to.be.true;
    })
  });
});

function getBannerVideoNativeResponse() {
  return {
    body: {
      nobid: false,
      bids: [
        {
          ad: '<div>Advertising</div>',
          cpm: 13,
          width: 300,
          height: 250,
          creativeId: '1820',
          dealId: 'dishfo',
          currency: 'USD',
          requestId: 'banner',
          mediaType: BANNER,
          adomain: []
        },
        {
          cpm: 13,
          width: 300,
          height: 250,
          creativeId: '1820',
          dealId: 'dishfo',
          currency: 'USD',
          requestId: 'videoInstream',
          vastUrl: 'https://videoinstream.org',
          videoCacheKey: 'key',
          mediaType: VIDEO,
          adomain: ['test_domain']
        },
        {
          cpm: 13,
          width: 300,
          height: 250,
          creativeId: '1820',
          dealId: 'dishfo',
          currency: 'USD',
          vastUrl: 'https://videooutstream.org',
          requestId: 'videoOutstream',
          ad: '<?xml version="1.0" encoding="UTF-8"?><VAST version="2.0"></VAST>',
          rendererUrl: 'https://testRenderer',
          mediaType: VIDEO,
          adomain: []
        },
        {
          requestId: 'nativeRequestId',
          cpm: 10,
          width: 300,
          height: 600,
          adomain: ['test-domain'],
          creativeId: '1821',
          mediaType: 'nativeAd',
          native: {
            ortb: {
              ver: '1.2',
              assets: [
                {
                  id: 1,
                  title: {
                    text: 'test-title',
                    len: 9
                  }
                }],
              link: {
                url: 'test-url',
                clicktrackers: ['test-clicktracker']
              },
              eventtrackers: [
                {
                  event: 1,
                  method: 1,
                  url: 'test-url'
                }
              ]
            }
          },
          currency: 'EUR',
        }
      ]
    }
  };
}

function getFledgeBannerResponse() {
  const bannerVideoResponse = getBannerVideoNativeResponse();
  bannerVideoResponse.body.fledgeAuctionConfigs = [
    {
      bidId: 'fledge',
      config: {
        seller: 'https://onetag-sys.com',
        decisionLogicUrl:
          'https://onetag-sys.com/paapi/decision_logic.js',
        interestGroupBuyers: [
          'https://onetag-sys.com'
        ],
      }
    }
  ]
  return bannerVideoResponse;
}

function getBannerVideoRequest() {
  return {
    data: JSON.stringify({
      bids: [
        {
          adUnitCode: 'target-div',
          bidId: 'videoOutstream',
          bidderRequestId: '12bb1e0f9fb669',
          auctionId: '80784b4d-79ad-49ef-a006-75d8888b7609',
          transactionId: '5f132731-3091-49b2-8fab-0e9c917733bc',
          pubId: '386276e072',
          context: 'outstream',
          mimes: [],
          playerSize: [],
          type: 'video'
        },
        {
          adUnitCode: 'target-div',
          bidId: 'videoInstream',
          bidderRequestId: '12bb1e0f9fb669',
          auctionId: '80784b4d-79ad-49ef-a006-75d8888b7609',
          transactionId: '5f132731-3091-49b2-8fab-0e9c917733bc',
          pubId: '386276e072',
          context: 'instream',
          mimes: [],
          playerSize: [],
          type: 'video'
        }
      ],
      location: 'https%3A%2F%2Flocal.onetag.net%3A9000%2Fv2%2Fprebid-video%2Fvideo.html%3Fpbjs_debug%3Dtrue',
      referrer: '0',
      masked: 0,
      wWidth: 860,
      wHeight: 949,
      sWidth: 1920,
      sHeight: 1080,
      sLeft: 1987,
      sTop: 27,
      xOffset: 0,
      yOffset: 0,
      docHidden: false,
      hLength: 2,
      timing: {
        pageLoadTime: -1593433770022,
        connectTime: 42,
        renderTime: -1593433770092
      },
      onetagSid: 'user_id'
    })
  }
}
