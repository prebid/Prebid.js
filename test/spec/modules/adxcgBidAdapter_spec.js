import {expect} from 'chai';
import {spec} from 'modules/adxcgBidAdapter.js';
import {deepClone, parseUrl} from 'src/utils.js';

describe('AdxcgAdapter', function () {
  let bidBanner = {
    bidder: 'adxcg',
    params: {
      adzoneid: '1'
    },
    adUnitCode: 'adunit-code',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [640, 360],
          [1, 1]
        ]
      }
    },
    bidId: '84ab500420319d',
    bidderRequestId: '7101db09af0db2',
    auctionId: '1d1a030790a475'
  };

  let bidVideo = {
    bidder: 'adxcg',
    params: {
      adzoneid: '20',
      video: {
        api: [2],
        protocols: [1, 2],
        mimes: ['video/mp4'],
        maxduration: 30
      }
    },
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 480]]
      }
    },
    adUnitCode: 'adunit-code',
    bidId: '84ab500420319d',
    bidderRequestId: '7101db09af0db2',
    auctionId: '1d1a030790a475'
  };

  let bidNative = {
    bidder: 'adxcg',
    params: {
      adzoneid: '2379'
    },
    mediaTypes: {
      native: {
        image: {
          sendId: false,
          required: true,
          sizes: [80, 80]
        },
        title: {
          required: true,
          len: 75
        },
        body: {
          required: true,
          len: 200
        },
        sponsoredBy: {
          required: false,
          len: 20
        }
      }
    },
    adUnitCode: 'adunit-code',
    bidId: '84ab500420319d',
    bidderRequestId: '7101db09af0db2',
    auctionId: '1d1a030790a475'
  };

  describe('isBidRequestValid', function () {
    it('should return true when required params found bidNative', function () {
      expect(spec.isBidRequestValid(bidNative)).to.equal(true);
    });

    it('should return true when required params  found bidVideo', function () {
      expect(spec.isBidRequestValid(bidVideo)).to.equal(true);
    });

    it('should return true when required params found bidBanner', function () {
      expect(spec.isBidRequestValid(bidBanner)).to.equal(true);
    });

    it('should return true when required params not found', function () {
      expect(spec.isBidRequestValid({})).to.be.false;
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bidBanner);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when required video params not found', function () {
      const simpleVideo = JSON.parse(JSON.stringify(bidVideo));
      simpleVideo.params.adzoneid = 123;
      expect(spec.isBidRequestValid(simpleVideo)).to.be.false;
      simpleVideo.params.mimes = [1, 2, 3];
      expect(spec.isBidRequestValid(simpleVideo)).to.be.false;
      simpleVideo.params.mimes = 'bad type';
      expect(spec.isBidRequestValid(simpleVideo)).to.be.false;
    });
  });

  describe('request function http', function () {
    it('creates a valid adxcg request url bidBanner', function () {
      let request = spec.buildRequests([bidBanner]);
      expect(request).to.exist;
      expect(request.method).to.equal('GET');
      let parsedRequestUrl = parseUrl(request.url);
      expect(parsedRequestUrl.hostname).to.equal('hbps.adxcg.net');
      expect(parsedRequestUrl.pathname).to.equal('/get/adi');

      let query = parsedRequestUrl.search;
      expect(query.renderformat).to.equal('javascript');
      expect(query.ver).to.equal('r20191128PB30');
      expect(query.source).to.equal('pbjs10');
      expect(query.pbjs).to.equal('$prebid.version$');
      expect(query.adzoneid).to.equal('1');
      expect(query.format).to.equal('300x250|640x360|1x1');
      expect(query.jsonp).to.be.undefined;
      expect(query.prebidBidIds).to.equal('84ab500420319d');
      expect(query.bidfloors).to.equal('0');

      expect(query).to.have.property('secure');
      expect(query).to.have.property('uw');
      expect(query).to.have.property('uh');
      expect(query).to.have.property('dpr');
      expect(query).to.have.property('bt');
      expect(query).to.have.property('cookies');
      expect(query).to.have.property('tz');
      expect(query).to.have.property('dt');
      expect(query).to.have.property('iob');
      expect(query).to.have.property('rndid');
      expect(query).to.have.property('ref');
      expect(query).to.have.property('url');
    });

    it('creates a valid adxcg request url bidVideo', function () {
      let request = spec.buildRequests([bidVideo]);
      expect(request).to.exist;
      expect(request.method).to.equal('GET');
      let parsedRequestUrl = parseUrl(request.url);
      expect(parsedRequestUrl.hostname).to.equal('hbps.adxcg.net');
      expect(parsedRequestUrl.pathname).to.equal('/get/adi');

      let query = parsedRequestUrl.search;
      // general part
      expect(query.renderformat).to.equal('javascript');
      expect(query.ver).to.equal('r20191128PB30');
      expect(query.source).to.equal('pbjs10');
      expect(query.pbjs).to.equal('$prebid.version$');
      expect(query.adzoneid).to.equal('20');
      expect(query.format).to.equal('640x480');
      expect(query.jsonp).to.be.undefined;
      expect(query.prebidBidIds).to.equal('84ab500420319d');
      expect(query.bidfloors).to.equal('0');

      expect(query).to.have.property('secure');
      expect(query).to.have.property('uw');
      expect(query).to.have.property('uh');
      expect(query).to.have.property('dpr');
      expect(query).to.have.property('bt');
      expect(query).to.have.property('cookies');
      expect(query).to.have.property('tz');
      expect(query).to.have.property('dt');
      expect(query).to.have.property('iob');
      expect(query).to.have.property('rndid');
      expect(query).to.have.property('ref');
      expect(query).to.have.property('url');

      // video specific part
      expect(query['video.maxduration.0']).to.equal('30');
      expect(query['video.mimes.0']).to.equal('video/mp4');
      expect(query['video.context.0']).to.equal('instream');
    });

    it('creates a valid adxcg request url bidNative', function () {
      let request = spec.buildRequests([bidNative]);
      expect(request).to.exist;
      expect(request.method).to.equal('GET');
      let parsedRequestUrl = parseUrl(request.url);
      expect(parsedRequestUrl.hostname).to.equal('hbps.adxcg.net');
      expect(parsedRequestUrl.pathname).to.equal('/get/adi');

      let query = parsedRequestUrl.search;
      expect(query.renderformat).to.equal('javascript');
      expect(query.ver).to.equal('r20191128PB30');
      expect(query.source).to.equal('pbjs10');
      expect(query.pbjs).to.equal('$prebid.version$');
      expect(query.adzoneid).to.equal('2379');
      expect(query.format).to.equal('0x0');
      expect(query.jsonp).to.be.undefined;
      expect(query.prebidBidIds).to.equal('84ab500420319d');
      expect(query.bidfloors).to.equal('0');

      expect(query).to.have.property('secure');
      expect(query).to.have.property('uw');
      expect(query).to.have.property('uh');
      expect(query).to.have.property('dpr');
      expect(query).to.have.property('bt');
      expect(query).to.have.property('cookies');
      expect(query).to.have.property('tz');
      expect(query).to.have.property('dt');
      expect(query).to.have.property('iob');
      expect(query).to.have.property('rndid');
      expect(query).to.have.property('ref');
      expect(query).to.have.property('url');
    });
  });

  describe('gdpr compliance', function () {
    it('should send GDPR Consent data if gdprApplies', function () {
      let request = spec.buildRequests([bidBanner], {
        gdprConsent: {
          gdprApplies: true,
          consentString: 'consentDataString'
        }
      });
      let parsedRequestUrl = parseUrl(request.url);
      let query = parsedRequestUrl.search;

      expect(query.gdpr).to.equal('1');
      expect(query.gdpr_consent).to.equal('consentDataString');
    });

    it('should not send GDPR Consent data if gdprApplies is false or undefined', function () {
      let request = spec.buildRequests([bidBanner], {
        gdprConsent: {
          gdprApplies: false,
          consentString: 'consentDataString'
        }
      });
      let parsedRequestUrl = parseUrl(request.url);
      let query = parsedRequestUrl.search;

      expect(query.gdpr).to.be.undefined;
      expect(query.gdpr_consent).to.be.undefined;
    });
  });

  describe('userid pubcid should be passed to querystring', function () {
    let bidderRequests = {};
    let bid = deepClone([bidBanner]);
    bid[0].userId = {pubcid: 'pubcidabcd'};

    it('should send pubcid if available', function () {
      let request = spec.buildRequests(bid, bidderRequests);
      let parsedRequestUrl = parseUrl(request.url);
      let query = parsedRequestUrl.search;
      expect(query.pubcid).to.equal('pubcidabcd');
    });
  });

  describe('userid tdid should be passed to querystring', function () {
    let bid = deepClone([bidBanner]);
    let bidderRequests = {};

    bid[0].userId = {tdid: 'tdidabcd'};

    it('should send pubcid if available', function () {
      let request = spec.buildRequests(bid, bidderRequests);
      let parsedRequestUrl = parseUrl(request.url);
      let query = parsedRequestUrl.search;
      expect(query.tdid).to.equal('tdidabcd');
    });
  });

  describe('userid id5id should be passed to querystring', function () {
    let bid = deepClone([bidBanner]);
    let bidderRequests = {};

    bid[0].userId = {id5id: 'id5idsample'};

    it('should send pubcid if available', function () {
      let request = spec.buildRequests(bid, bidderRequests);
      let parsedRequestUrl = parseUrl(request.url);
      let query = parsedRequestUrl.search;
      expect(query.id5id).to.equal('id5idsample');
    });
  });

  describe('userid idl_env should be passed to querystring', function () {
    let bid = deepClone([bidBanner]);
    let bidderRequests = {};

    bid[0].userId = {idl_env: 'idl_envsample'};

    it('should send pubcid if available', function () {
      let request = spec.buildRequests(bid, bidderRequests);
      let parsedRequestUrl = parseUrl(request.url);
      let query = parsedRequestUrl.search;
      expect(query.idl_env).to.equal('idl_envsample');
    });
  });

  describe('response handler', function () {
    let BIDDER_REQUEST = {
      bidder: 'adxcg',
      params: {
        adzoneid: '1'
      },
      adUnitCode: 'adunit-code',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [640, 360],
            [1, 1]
          ]
        }
      },
      bidId: '84ab500420319d',
      bidderRequestId: '7101db09af0db2',
      auctionId: '1d1a030790a475'
    };

    let BANNER_RESPONSE = {
      body: [
        {
          bidId: '84ab500420319d',
          bidderCode: 'adxcg',
          width: 300,
          height: 250,
          creativeId: '42',
          cpm: 0.45,
          currency: 'USD',
          netRevenue: true,
          ad: '<!-- adContent -->'
        }
      ],
      header: {someheader: 'fakedata'}
    };

    let BANNER_RESPONSE_WITHDEALID = {
      body: [
        {
          bidId: '84ab500420319d',
          bidderCode: 'adxcg',
          width: 300,
          height: 250,
          deal_id: '7722',
          creativeId: '42',
          cpm: 0.45,
          currency: 'USD',
          netRevenue: true,
          ad: '<!-- adContent -->'
        }
      ],
      header: {someheader: 'fakedata'}
    };

    let VIDEO_RESPONSE = {
      body: [
        {
          bidId: '84ab500420319d',
          bidderCode: 'adxcg',
          width: 640,
          height: 360,
          creativeId: '42',
          cpm: 0.45,
          currency: 'USD',
          netRevenue: true,
          vastUrl: 'vastContentUrl'
        }
      ],
      header: {someheader: 'fakedata'}
    };

    let NATIVE_RESPONSE = {
      body: [
        {
          bidId: '84ab500420319d',
          bidderCode: 'adxcg',
          width: 0,
          height: 0,
          creativeId: '42',
          cpm: 0.45,
          currency: 'USD',
          netRevenue: true,
          nativeResponse: {
            assets: [
              {
                id: 1,
                required: 0,
                title: {
                  text: 'titleContent'
                }
              },
              {
                id: 2,
                required: 0,
                img: {
                  url: 'imageContent',
                  w: 600,
                  h: 600
                }
              },
              {
                id: 3,
                required: 0,
                data: {
                  label: 'DESC',
                  value: 'descriptionContent'
                }
              },
              {
                id: 0,
                required: 0,
                data: {
                  label: 'SPONSORED',
                  value: 'sponsoredByContent'
                }
              },
              {
                id: 5,
                required: 0,
                icon: {
                  url: 'iconContent',
                  w: 400,
                  h: 400
                }
              }
            ],
            link: {
              url: 'linkContent'
            },
            imptrackers: ['impressionTracker1', 'impressionTracker2']
          }
        }
      ],
      header: {someheader: 'fakedata'}
    };

    it('handles regular responses', function () {
      let result = spec.interpretResponse(BANNER_RESPONSE, BIDDER_REQUEST);

      expect(result).to.have.lengthOf(1);

      expect(result[0]).to.exist;
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].creativeId).to.equal(42);
      expect(result[0].cpm).to.equal(0.45);
      expect(result[0].ad).to.equal('<!-- adContent -->');
      expect(result[0].currency).to.equal('USD');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].ttl).to.equal(300);
      expect(result[0].dealId).to.not.exist;
    });

    it('handles regular responses with dealid', function () {
      let result = spec.interpretResponse(
        BANNER_RESPONSE_WITHDEALID,
        BIDDER_REQUEST
      );

      expect(result).to.have.lengthOf(1);

      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].creativeId).to.equal(42);
      expect(result[0].cpm).to.equal(0.45);
      expect(result[0].ad).to.equal('<!-- adContent -->');
      expect(result[0].currency).to.equal('USD');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].ttl).to.equal(300);
    });

    it('handles video responses', function () {
      let result = spec.interpretResponse(VIDEO_RESPONSE, BIDDER_REQUEST);
      expect(result).to.have.lengthOf(1);

      expect(result[0].width).to.equal(640);
      expect(result[0].height).to.equal(360);
      expect(result[0].mediaType).to.equal('video');
      expect(result[0].creativeId).to.equal(42);
      expect(result[0].cpm).to.equal(0.45);
      expect(result[0].vastUrl).to.equal('vastContentUrl');
      expect(result[0].currency).to.equal('USD');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].ttl).to.equal(300);
    });

    it('handles native responses', function () {
      let result = spec.interpretResponse(NATIVE_RESPONSE, BIDDER_REQUEST);

      expect(result[0].width).to.equal(0);
      expect(result[0].height).to.equal(0);
      expect(result[0].mediaType).to.equal('native');
      expect(result[0].creativeId).to.equal(42);
      expect(result[0].cpm).to.equal(0.45);
      expect(result[0].currency).to.equal('USD');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].ttl).to.equal(300);

      expect(result[0].native.clickUrl).to.equal('linkContent');
      expect(result[0].native.impressionTrackers).to.deep.equal([
        'impressionTracker1',
        'impressionTracker2'
      ]);
      expect(result[0].native.title).to.equal('titleContent');

      expect(result[0].native.image.url).to.equal('imageContent');
      expect(result[0].native.image.height).to.equal(600);
      expect(result[0].native.image.width).to.equal(600);

      expect(result[0].native.icon.url).to.equal('iconContent');
      expect(result[0].native.icon.height).to.equal(400);
      expect(result[0].native.icon.width).to.equal(400);

      expect(result[0].native.body).to.equal('descriptionContent');
      expect(result[0].native.sponsoredBy).to.equal('sponsoredByContent');
    });

    it('handles nobid responses', function () {
      let response = [];
      let bidderRequest = BIDDER_REQUEST;

      let result = spec.interpretResponse(response, bidderRequest);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    let syncoptionsIframe = {
      iframeEnabled: 'true'
    };

    it('should return iframe sync option', function () {
      expect(spec.getUserSyncs(syncoptionsIframe)[0].type).to.equal('iframe');
      expect(spec.getUserSyncs(syncoptionsIframe)[0].url).to.equal(
        'https://cdn.adxcg.net/pb-sync.html'
      );
    });
  });
});
