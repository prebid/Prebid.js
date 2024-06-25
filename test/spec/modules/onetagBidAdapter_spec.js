import { spec, isValid, hasTypeVideo, isSchainValid } from 'modules/onetagBidAdapter.js';
import { expect } from 'chai';
import { find } from 'src/polyfill.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';
import { INSTREAM, OUTSTREAM } from 'src/video.js';

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

  function createBannerBid(bidRequest) {
    const bid = bidRequest || createBid();
    bid.mediaTypes = bid.mediaTypes || {};
    bid.mediaTypes.banner = {
      sizes: [[300, 250]]
    };
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
    return bid;
  }

  function createMultiFormatBid() {
    return createInstreamVideoBid(createBannerBid());
  }

  let bannerBid, instreamVideoBid, outstreamVideoBid;
  beforeEach(() => {
    bannerBid = createBannerBid();
    instreamVideoBid = createInstreamVideoBid();
    outstreamVideoBid = createOutstreamVideoBid();
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
        // TODO (dgirardi): this test used to pass because `bannerBid` was global state
        // and other test code made it invalid for reasons other than sizes.
        // cleaning up the setup code, it now (correctly) fails.
        bannerBid.sizes = [];
        // expect(spec.isBidRequestValid(bannerBid)).to.be.false;
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
      serverRequest = spec.buildRequests([bannerBid, instreamVideoBid]);
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
      expect(data).to.include.all.keys('location', 'referrer', 'stack', 'numIframes', 'sHeight', 'sWidth', 'docHeight', 'wHeight', 'wWidth', 'oHeight', 'oWidth', 'aWidth', 'aHeight', 'sLeft', 'sTop', 'hLength', 'bids', 'docHidden', 'xOffset', 'yOffset', 'networkConnectionType', 'networkEffectiveConnectionType', 'timing', 'version', 'fledgeEnabled');
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
      expect(data.oHeight).to.be.a('number');
      expect(data.oWidth).to.be.a('number');
      expect(data.aWidth).to.be.a('number');
      expect(data.aHeight).to.be.a('number');
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
      }
    });
    it('Returns empty data if no valid requests are passed', function () {
      serverRequest = spec.buildRequests([]);
      let dataString = serverRequest.data;
      try {
        let dataObj = JSON.parse(dataString);
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
      let consentString = 'consentString';
      let addtlConsent = '2~1.35.41.101~dv.9.21.81';
      let bidderRequest = {
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
      let serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);

      expect(payload).to.exist;
      expect(payload.gdprConsent).to.exist;
      expect(payload.gdprConsent.consentString).to.exist.and.to.equal(consentString);
      expect(payload.gdprConsent.addtlConsent).to.exist.and.to.equal(addtlConsent);
      expect(payload.gdprConsent.consentRequired).to.exist.and.to.be.true;
    });
    it('Should send GPP consent data', function () {
      let consentString = 'consentString';
      let applicableSections = [1, 2, 3];
      let bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gppConsent': {
          gppString: consentString,
          applicableSections: applicableSections
        }
      };
      let serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);

      expect(payload).to.exist;
      expect(payload.gppConsent).to.exist;
      expect(payload.gppConsent.consentString).to.exist.and.to.equal(consentString);
      expect(payload.gppConsent.applicableSections).to.have.same.members(applicableSections);
    });
    it('Should send us privacy string', function () {
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
      let bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'ortb2': firtPartyData
      }
      let serverRequest = spec.buildRequests([bannerBid], bidderRequest);
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
      let bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'ortb2': dsa
      }
      let serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);
      expect(payload.ortb2).to.exist;
      expect(payload.ortb2).to.exist.and.to.deep.equal(dsa);
    });
    it('Should send FLEDGE eligibility flag when FLEDGE is enabled', function () {
      let bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'paapi': {
          'enabled': true
        }
      };
      let serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);

      expect(payload.fledgeEnabled).to.exist;
      expect(payload.fledgeEnabled).to.exist.and.to.equal(bidderRequest.paapi.enabled);
    });
    it('Should send FLEDGE eligibility flag when FLEDGE is not enabled', function () {
      let bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        paapi: {
          enabled: false
        }
      };
      let serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);

      expect(payload.fledgeEnabled).to.exist;
      expect(payload.fledgeEnabled).to.exist.and.to.equal(bidderRequest.paapi.enabled);
    });
    it('Should send FLEDGE eligibility flag set to false when fledgeEnabled is not defined', function () {
      let bidderRequest = {
        'bidderCode': 'onetag',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
      };
      let serverRequest = spec.buildRequests([bannerBid], bidderRequest);
      const payload = JSON.parse(serverRequest.data);

      expect(payload.fledgeEnabled).to.exist;
      expect(payload.fledgeEnabled).to.exist.and.to.equal(false);
    });
  });
  describe('interpretResponse', function () {
    const request = getBannerVideoRequest();
    const response = getBannerVideoResponse();
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
        let dataItem = interpretedResponse[i];
        expect(dataItem).to.include.all.keys('requestId', 'cpm', 'width', 'height', 'ttl', 'creativeId', 'netRevenue', 'currency', 'meta', 'dealId');
        if (dataItem.meta.mediaType === VIDEO) {
          const { context } = find(requestData.bids, (item) => item.bidId === dataItem.requestId);
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
      let usConsentString = 'us_foo';
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

function getBannerVideoResponse() {
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
        }
      ]
    }
  };
}

function getFledgeBannerResponse() {
  const bannerVideoResponse = getBannerVideoResponse();
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
      oWidth: 1853,
      oHeight: 1053,
      sWidth: 1920,
      sHeight: 1080,
      aWidth: 1920,
      aHeight: 1053,
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
