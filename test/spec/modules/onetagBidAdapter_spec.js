import { spec, isValid, hasTypeVideo } from 'modules/onetagBidAdapter.js';
import { expect } from 'chai';
import { BANNER, VIDEO } from 'src/mediaTypes.js';

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
      'transactionId': 'qwerty123'
    };
  }

  function createBannerBid(bidRequest) {
    const bid = bidRequest || createBid();
    bid.mediaTypes = bid.mediaTypes || {};
    bid.mediaTypes.banner = {
      sizes: [[300, 250]]
    };
    return bid;
  }

  function createVideoBid(bidRequest) {
    const bid = bidRequest || createBid();
    bid.mediaTypes = bid.mediaTypes || {};
    bid.mediaTypes.video = {
      context: 'instream',
      mimes: ['video/mp4', 'video/webm', 'application/javascript', 'video/ogg'],
      playerSize: [640, 480]
    };
    return bid;
  }

  function createWrongVideoOutstreamBid(bidRequest) {
    const bid = bidRequest || createBid();
    bid.mediaTypes = bid.mediaTypes || {};
    bid.mediaTypes.video = {
      context: 'outstream',
      mimes: ['video/mp4', 'video/webm', 'application/javascript', 'video/ogg'],
      playerSize: [640, 480]
    };
    return bid;
  }

  function createMultiFormatBid() {
    return createVideoBid(createBannerBid());
  }

  const bannerBid = createBannerBid();
  const videoBid = createVideoBid();
  const outstreamVideoBid = createWrongVideoOutstreamBid();

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
        bannerBid.sizes = [];
        expect(spec.isBidRequestValid(bannerBid)).to.be.false;
      });
    });
    describe('video bidRequest', function () {
      it('Should return false when the context is undefined', function () {
        videoBid.mediaTypes.video.context = undefined;
        expect(spec.isBidRequestValid(videoBid)).to.be.false;
      });
      it('Should return false when the context is not instream or outstream', function () {
        videoBid.mediaTypes.video.context = 'wrong';
        expect(spec.isBidRequestValid(videoBid)).to.be.false;
      });
      it('Should return false when playerSize is undefined', function () {
        const videoBid = createVideoBid();
        videoBid.mediaTypes.video.playerSize = undefined;
        expect(spec.isBidRequestValid(videoBid)).to.be.false;
      });
      it('Should return false when playerSize is not an array', function () {
        const videoBid = createVideoBid();
        videoBid.mediaTypes.video.playerSize = 30;
        expect(spec.isBidRequestValid(videoBid)).to.be.false;
      });
      it('Should return false when playerSize is an empty array', function () {
        const videoBid = createVideoBid();
        videoBid.mediaTypes.video.playerSize = [];
        expect(spec.isBidRequestValid(videoBid)).to.be.false;
      });
      it('Should return false when context is outstream but no renderer object is defined', function () {
        expect(spec.isBidRequestValid(outstreamVideoBid)).to.be.false;
      });
    });
    describe('multi format bidRequest', function () {
      const multiFormatBid = createMultiFormatBid();
      it('Should return true when correct multi format bid is passed', function () {
        expect(spec.isBidRequestValid(multiFormatBid)).to.be.true;
      });
    });
  });

  describe('buildRequests', function () {
    let serverRequest = spec.buildRequests([bannerBid, videoBid]);
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

    const d = serverRequest.data;
    try {
      const data = JSON.parse(d);
      it('Should contains all keys', function () {
        expect(data).to.be.an('object');
        expect(data).to.have.all.keys('location', 'masked', 'referrer', 'sHeight', 'sWidth', 'timeOffset', 'date', 'wHeight', 'wWidth', 'oHeight', 'oWidth', 'aWidth', 'aHeight', 'sLeft', 'sTop', 'hLength', 'bids', 'docHidden', 'xOffset', 'yOffset');
        expect(data.location).to.be.a('string');
        expect(data.masked).to.be.a('number');
        expect(data.referrer).to.be.a('string');
        expect(data.sHeight).to.be.a('number');
        expect(data.sWidth).to.be.a('number');
        expect(data.wWidth).to.be.a('number');
        expect(data.wHeight).to.be.a('number');
        expect(data.oHeight).to.be.a('number');
        expect(data.oWidth).to.be.a('number');
        expect(data.aWidth).to.be.a('number');
        expect(data.aHeight).to.be.a('number');
        expect(data.sLeft).to.be.a('number');
        expect(data.sTop).to.be.a('number');
        expect(data.hLength).to.be.a('number');
        expect(data.timeOffset).to.be.a('number');
        expect(data.date).to.be.a('string');
        expect(data.bids).to.be.an('array');

        const bids = data['bids'];
        for (let i = 0; i < bids.length; i++) {
          const bid = bids[i];
          if (hasTypeVideo(bid)) {
            expect(bid).to.have.all.keys('adUnitCode', 'auctionId', 'bidId', 'bidderRequestId', 'pubId', 'transactionId', 'context', 'mimes', 'playerSize', 'protocols', 'maxDuration', 'api', 'type');
          } else if (isValid(BANNER, bid)) {
            expect(bid).to.have.all.keys('adUnitCode', 'auctionId', 'bidId', 'bidderRequestId', 'pubId', 'transactionId', 'sizes', 'type');
          }
          expect(bid.bidId).to.be.a('string');
          expect(bid.pubId).to.be.a('string');
        }
      });
    } catch (e) {}
    it('Returns empty data if no valid requests are passed', function () {
      serverRequest = spec.buildRequests([]);
      let dataString = serverRequest.data;
      try {
        let dataObj = JSON.parse(dataString);
        expect(dataObj.bids).to.be.an('array').that.is.empty;
      } catch (e) {}
    });
    it('should send GDPR consent data', function () {
      let consentString = 'consentString';
      let bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          consentString: consentString,
          gdprApplies: true
        }
      };
      let serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);

      expect(payload).to.exist;
      expect(payload.gdprConsent).to.exist;
      expect(payload.gdprConsent.consentString).to.exist.and.to.equal(consentString);
      expect(payload.gdprConsent.consentRequired).to.exist.and.to.be.true;
    });
    it('should send us privacy string', function () {
      let consentString = 'us_foo';
      let bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'uspConsent': consentString
      };
      let serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);

      expect(payload.usPrivacy).to.exist;
      expect(payload.usPrivacy).to.exist.and.to.equal(consentString);
    });
  });
  describe('interpretResponse', function () {
    function getBannerRes() {
      return {
        ad: '<div>Advertising</div>',
        cpm: 13,
        width: 300,
        height: 250,
        creativeId: '1820',
        dealId: 'dishfo',
        currency: 'USD',
        requestId: 'sdiceobxcw',
        mediaType: BANNER
      }
    }
    function getVideoRes() {
      return {
        ad: '<?xml version="1.0" encoding="UTF-8"?><VAST version="2.0"></VAST>',
        cpm: 13,
        width: 300,
        height: 250,
        creativeId: '1820',
        dealId: 'dishfo',
        currency: 'USD',
        requestId: 'sdiceobxcw',
        mediaType: VIDEO
      }
    }
    function getBannerAdnVideoRes() {
      return {
        body: {
          nobid: false,
          bids: [getBannerRes(), getVideoRes()]
        }
      };
    }
    const responseObj = getBannerAdnVideoRes();
    it('Returns an array of valid server responses if response object is valid', function () {
      const serverResponses = spec.interpretResponse(responseObj);

      expect(serverResponses).to.be.an('array').that.is.not.empty;
      for (let i = 0; i < serverResponses.length; i++) {
        let dataItem = serverResponses[i];
        if (dataItem.mediaType === VIDEO) {
          expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'vastXml', 'ttl', 'creativeId', 'netRevenue', 'currency', 'mediaType', 'dealId');
        } else if (dataItem.mediaType === BANNER) {
          expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId', 'netRevenue', 'currency', 'mediaType', 'dealId');
        }
        expect(dataItem.requestId).to.be.a('string');
        expect(dataItem.cpm).to.be.a('number');
        expect(dataItem.width).to.be.a('number');
        expect(dataItem.height).to.be.a('number');
        if (dataItem.mediaType === VIDEO) {
          expect(dataItem.vastXml).to.be.a('string');
        } else if (dataItem.mediaType === BANNER) {
          expect(dataItem.ad).to.be.a('string');
        }
        expect(dataItem.ttl).to.be.a('number');
        expect(dataItem.creativeId).to.be.a('string');
        expect(dataItem.netRevenue).to.be.a('boolean');
        expect(dataItem.currency).to.be.a('string');
      }
      it('Returns an empty array if invalid response is passed', function () {
        const serverResponses = spec.interpretResponse('invalid_response');
        expect(serverResponses).to.be.an('array').that.is.empty;
      });
    });
  });
  describe('getUserSyncs', function () {
    const sync_endpoint = 'https://onetag-sys.com/usync/';
    it('Returns an iframe if iframeEnabled is true', function () {
      const syncs = spec.getUserSyncs({iframeEnabled: true});
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
    it('Should send us privacy string', function () {
      let usConsentString = 'us_foo';
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, {}, {}, usConsentString);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include(sync_endpoint);
      expect(syncs[0].url).to.match(/(?:[?&](?:us_privacy=us_foo(?:[&][^&]*)*))+$/);
    });
  });
});
