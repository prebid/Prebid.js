import { expect } from 'chai';
import { spec } from 'modules/ttdBidAdapter';
import { deepClone } from 'src/utils.js';
import { config } from 'src/config';
import { detectReferer } from 'src/refererDetection.js';

import { buildWindowTree } from '../../helpers/refererDetectionHelper.js';

describe('ttdBidAdapter', function () {
  function testBuildRequests(bidRequests, bidderRequestBase) {
    const clonedBidderRequest = deepClone(bidderRequestBase);
    clonedBidderRequest.bids = bidRequests;
    return spec.buildRequests(bidRequests, clonedBidderRequest);
  }

  describe('isBidRequestValid', function() {
    function makeBid() {
      return {
        'bidder': 'ttd',
        'params': {
          'supplySourceId': 'supplier',
          'publisherId': '22222222',
          'placementId': 'some-PlacementId_1'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [
              [300, 250]
            ]
          }
        },
        'adUnitCode': 'adunit-code',
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      };
    }

    describe('core', function () {
      it('should return true when required params found', function () {
        expect(spec.isBidRequestValid(makeBid())).to.equal(true);
      });

      it('should return false when publisherId not passed', function () {
        const bid = makeBid();
        delete bid.params.publisherId;
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false when supplySourceId not passed', function () {
        const bid = makeBid();
        delete bid.params.supplySourceId;
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false when publisherId is longer than 64 characters', function () {
        const bid = makeBid();
        bid.params.publisherId = '1'.repeat(65);
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return true when publisherId is equal to 64 characters', function () {
        const bid = makeBid();
        bid.params.publisherId = '1'.repeat(64);
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return true if placementId is not passed and gpid is passed', function () {
        const bid = makeBid();
        delete bid.params.placementId;
        bid.ortb2Imp = {
          ext: {
            gpid: '/1111/home#header'
          }
        }
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return false if neither placementId nor gpid is passed', function () {
        const bid = makeBid();
        delete bid.params.placementId;
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false if neither mediaTypes.banner nor mediaTypes.video is passed', function () {
        const bid = makeBid();
        delete bid.mediaTypes
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false if bidfloor is passed incorrectly', function () {
        const bid = makeBid();
        bid.params.bidfloor = 'invalid bidfloor';
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return true if bidfloor is passed correctly as a float', function () {
        const bid = makeBid();
        bid.params.bidfloor = 3.01;
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return false if customBidderEndpoint is provided and does not start with https://', function () {
        const bid = makeBid();
        bid.params.customBidderEndpoint = 'customBidderEndpoint/bid/bidder/';
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false if customBidderEndpoint is provided and does not end with /bid/bidder/', function () {
        const bid = makeBid();
        bid.params.customBidderEndpoint = 'https://customBidderEndpoint/bid/bidder';
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return true if customBidderEndpoint is provided that starts with https:// and ends with /bid/bidder/', function () {
        const bid = makeBid();
        bid.params.customBidderEndpoint = 'https://customBidderEndpoint/bid/bidder/';
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });
    });

    describe('banner', function () {
      it('should return true if banner.pos is passed correctly', function () {
        const bid = makeBid();
        bid.mediaTypes.banner.pos = 1;
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });
    });

    describe('video', function () {
      if (!FEATURES.VIDEO) {
        return;
      }

      function makeBid() {
        return {
          'bidder': 'ttd',
          'params': {
            'supplySourceId': 'supplier',
            'publisherId': '22222222',
            'placementId': 'somePlacementId'
          },
          'mediaTypes': {
            'video': {
              'minduration': 5,
              'maxduration': 30,
              'playerSize': [640, 480],
              'api': [1, 3],
              'mimes': ['video/mp4'],
              'protocols': [2, 3, 5, 6]
            }
          },
          'adUnitCode': 'adunit-code',
          'sizes': [
            [300, 250]
          ],
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
        };
      }

      it('should return true if required parameters are passed', function () {
        const bid = makeBid();
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return false if maxduration is missing', function () {
        const bid = makeBid();
        delete bid.mediaTypes.video.maxduration;
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false if api is missing', function () {
        const bid = makeBid();
        delete bid.mediaTypes.video.api;
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false if mimes is missing', function () {
        const bid = makeBid();
        delete bid.mediaTypes.video.mimes;
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false if protocols is missing', function () {
        const bid = makeBid();
        delete bid.mediaTypes.video.protocols;
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
    });
  });

  describe('getUserSyncs', function () {
    it('to check the user sync iframe', function () {
      const syncOptions = {
        pixelEnabled: true
      };
      const gdprConsentString = 'BON3G4EON3G4EAAABAENAA____ABl____A';
      const gdprConsent = {
        consentString: gdprConsentString,
        gdprApplies: true
      };
      const uspConsent = '1YYY';

      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent, uspConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');

      const params = new URLSearchParams(new URL(syncs[0].url).search);
      expect(params.get('us_privacy')).to.equal(uspConsent);
      expect(params.get('ust')).to.equal('image');
      expect(params.get('gdpr')).to.equal('1');
      expect(params.get('gdpr_consent')).to.equal(gdprConsentString);
    });
  });

  describe('buildRequests-banner', function () {
    const baseBannerBidRequests = [{
      'bidder': 'ttd',
      'params': {
        'supplySourceId': 'supplier',
        'publisherId': '13144370',
        'placementId': '1gaa015'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250], [300, 600]]
        }
      },
      'ortb2Imp': {
        'ext': {
          'tid': '8651474f-58b1-4368-b812-84f8c937a099',
        }
      },
      'sizes': [[300, 250], [300, 600]],
      'transactionId': '1111474f-58b1-4368-b812-84f8c937a099',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'bidId': '243310435309b5',
      'bidderRequestId': '18084284054531',
      'auctionId': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
      'src': 'client',
      'bidRequestsCount': 1
    }];

    const testWindow = buildWindowTree(['https://www.example.com/test', 'https://www.example.com/other/page', 'https://www.example.com/third/page'], 'https://othersite.com/', 'https://example.com/canonical/page');
    const baseBidderRequestReferer = detectReferer(testWindow)();
    const baseBidderRequest = {
      'bidderCode': 'ttd',
      ortb2: {
        source: {
          tid: 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
        }
      },
      'bidderRequestId': '18084284054531',
      'auctionStart': 1540945362095,
      'timeout': 3000,
      'refererInfo': baseBidderRequestReferer,
      'start': 1540945362099,
      'doneCbCallCount': 0
    };

    const extFirstPartyDataValues = ['value', 'value2'];
    const extFirstPartyData = {
      data: {
        firstPartyKey: 'firstPartyValue',
        firstPartyKey2: extFirstPartyDataValues
      },
      custom: 'custom_data',
      custom_kvp: {
        customKey: 'customValue'
      }
    }

    function validateExtFirstPartyData(ext) {
      expect(ext.data.firstPartyKey).to.equal('firstPartyValue');
      expect(ext.data.firstPartyKey2).to.eql(extFirstPartyDataValues);
      expect(ext.custom).to.equal('custom_data');
      expect(ext.custom_kvp.customKey).to.equal('customValue');
    }

    it('sends bid request to our endpoint that makes sense', function () {
      const request = testBuildRequests(baseBannerBidRequests, baseBidderRequest);
      expect(request.method).to.equal('POST');
      expect(request.url).to.be.not.empty;
      expect(request.data).to.be.not.null;
    });

    it('bid request should parse tmax or have a default and minimum', function () {
      const requestWithoutTimeout = {
        ...baseBidderRequest,
        timeout: null
      };
      var requestBody = testBuildRequests(baseBannerBidRequests, requestWithoutTimeout).data;
      expect(requestBody.tmax).to.be.equal(400);

      const requestWithTimeout = {
        ...baseBidderRequest,
        timeout: 600
      };
      requestBody = testBuildRequests(baseBannerBidRequests, requestWithTimeout).data;
      expect(requestBody.tmax).to.be.equal(600);

      const requestWithLowerTimeout = {
        ...baseBidderRequest,
        timeout: 300
      };
      requestBody = testBuildRequests(baseBannerBidRequests, requestWithLowerTimeout).data;
      expect(requestBody.tmax).to.be.equal(400);
    });

    it('sets bidrequest.id to bidderRequestId', function () {
      const requestBody = testBuildRequests(baseBannerBidRequests, baseBidderRequest).data;
      expect(requestBody.id).to.equal('18084284054531');
    });

    it('sets impression id to ad unit\'s bid id', function () {
      const requestBody = testBuildRequests(baseBannerBidRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].id).to.equal('243310435309b5');
    });

    it('sends bid requests to the correct endpoint', function () {
      const url = testBuildRequests(baseBannerBidRequests, baseBidderRequest).url;
      expect(url).to.equal('https://direct.adsrvr.org/bid/bidder/supplier');
    });

    it('sends bid requests to the correct http2 endpoint', function () {
      const bannerBidRequestsWithHttp2Endpoint = deepClone(baseBannerBidRequests);
      bannerBidRequestsWithHttp2Endpoint[0].params.useHttp2 = true;
      const url = testBuildRequests(bannerBidRequestsWithHttp2Endpoint, baseBidderRequest).url;
      expect(url).to.equal('https://d2.adsrvr.org/bid/bidder/supplier');
    });

    it('sends bid requests to the correct custom endpoint', function () {
      const bannerBidRequestsWithCustomEndpoint = deepClone(baseBannerBidRequests);
      bannerBidRequestsWithCustomEndpoint[0].params.customBidderEndpoint = 'https://customBidderEndpoint/bid/bidder/';
      const url = testBuildRequests(bannerBidRequestsWithCustomEndpoint, baseBidderRequest).url;
      expect(url).to.equal('https://customBidderEndpoint/bid/bidder/supplier');
    });

    it('sends publisher id', function () {
      const requestBody = testBuildRequests(baseBannerBidRequests, baseBidderRequest).data;
      expect(requestBody.site).to.be.not.null;
      expect(requestBody.site.publisher).to.be.not.null;
      expect(requestBody.site.publisher.id).to.equal(baseBannerBidRequests[0].params.publisherId);
    });

    it('sends placement id in tagid', function () {
      const requestBody = testBuildRequests(baseBannerBidRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].tagid).to.equal(baseBannerBidRequests[0].params.placementId);
    });

    it('sends gpid in tagid if present', function () {
      const clonedBannerRequests = deepClone(baseBannerBidRequests);
      const gpid = '/1111/home#header';
      clonedBannerRequests[0].ortb2Imp = {
        ext: {
          gpid: gpid
        }
      };
      const requestBody = testBuildRequests(clonedBannerRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].tagid).to.equal(gpid);
    });

    it('sends gpid in ext.gpid if present', function () {
      const clonedBannerRequests = deepClone(baseBannerBidRequests);
      const gpid = '/1111/home#header';
      clonedBannerRequests[0].ortb2Imp = {
        ext: {
          gpid: gpid
        }
      };
      const requestBody = testBuildRequests(clonedBannerRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].ext).to.be.not.null;
      expect(requestBody.imp[0].ext.gpid).to.equal(gpid);
    });

    it('sends rwdd in imp.rwdd if present', function () {
      const clonedBannerRequests = deepClone(baseBannerBidRequests);
      const gpid = '/1111/home#header';
      const rwdd = 1;
      clonedBannerRequests[0].ortb2Imp = {
        rwdd: rwdd,
        ext: {
          gpid: gpid
        }
      };
      const requestBody = testBuildRequests(clonedBannerRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].rwdd).to.be.not.null;
      expect(requestBody.imp[0].rwdd).to.equal(1);
    });

    it('sends source.tid', function () {
      const requestBody = testBuildRequests(baseBannerBidRequests, baseBidderRequest).data;
      expect(requestBody.source).to.be.not.null;
      expect(requestBody.source.tid).to.equal(baseBidderRequest.ortb2.source.tid);
    });

    it('includes the ad size in the bid request', function () {
      const requestBody = testBuildRequests(baseBannerBidRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].banner.format[0].w).to.equal(300);
      expect(requestBody.imp[0].banner.format[0].h).to.equal(250);
      expect(requestBody.imp[0].banner.format[1].w).to.equal(300);
      expect(requestBody.imp[0].banner.format[1].h).to.equal(600);
    });

    it('includes the detected referer in the bid request', function () {
      const requestBody = testBuildRequests(baseBannerBidRequests, baseBidderRequest).data;
      expect(requestBody.site.page).to.equal('https://www.example.com/test');
    });

    it('ensure top most location is used', function () {
      const requestBody = testBuildRequests(baseBannerBidRequests, baseBidderRequest).data;
      expect(requestBody.site.page).to.equal('https://www.example.com/test');
    });

    it('sets the banner pos correctly if sent', function () {
      const clonedBannerRequests = deepClone(baseBannerBidRequests);
      clonedBannerRequests[0].mediaTypes.banner.pos = 1;

      const requestBody = testBuildRequests(clonedBannerRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].banner.pos).to.equal(1);
    });

    it('sets the banner expansion direction correctly if sent', function () {
      const clonedBannerRequests = deepClone(baseBannerBidRequests);
      const expdir = [1, 3]
      clonedBannerRequests[0].params.banner = {
        expdir: expdir
      };

      const requestBody = testBuildRequests(clonedBannerRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].banner.expdir).to.equal(expdir);
    });

    it('merges first party site data', function () {
      const ortb2 = {
        site: {
          publisher: {
            domain: 'https://foo.bar',
          }
        }
      };
      const baseBidderRequestWithoutRefererDomain = {
        ...baseBidderRequest,
        refererInfo: {
          ...baseBannerBidRequests.referer,
          domain: null
        }
      }
      const requestBody = testBuildRequests(
        baseBannerBidRequests, {...baseBidderRequestWithoutRefererDomain, ortb2}
      ).data;
      config.resetConfig();
      expect(requestBody.site.publisher).to.deep.equal({domain: 'https://foo.bar', id: '13144370'});
    });

    it('referer domain overrides first party site data publisher domain', function () {
      const ortb2 = {
        site: {
          publisher: {
            domain: 'https://foo.bar',
          }
        }
      };
      const requestBody = testBuildRequests(
        baseBannerBidRequests, {...baseBidderRequest, ortb2}
      ).data;
      config.resetConfig();
      expect(requestBody.site.publisher.domain).to.equal(baseBidderRequest.refererInfo.domain);
    });

    it('sets keywords properly if sent', function () {
      const ortb2 = {
        site: {
          keywords: 'highViewability, clothing, holiday shopping'
        }
      };
      const requestBody = testBuildRequests(baseBannerBidRequests, {...baseBidderRequest, ortb2}).data;
      config.resetConfig();
      expect(requestBody.ext.ttdprebid.keywords).to.deep.equal(['highViewability', 'clothing', 'holiday shopping']);
    });

    it('sets bcat properly if sent', function () {
      const ortb2 = {
        bcat: ['IAB1-1', 'IAB2-9']
      };
      const requestBody = testBuildRequests(baseBannerBidRequests, {...baseBidderRequest, ortb2}).data;
      config.resetConfig();
      expect(requestBody.bcat).to.deep.equal(['IAB1-1', 'IAB2-9']);
    });

    it('sets badv properly if sent', function () {
      const ortb2 = {
        badv: ['adv1.com', 'adv2.com']
      };
      const requestBody = testBuildRequests(baseBannerBidRequests, {...baseBidderRequest, ortb2}).data;
      config.resetConfig();
      expect(requestBody.badv).to.deep.equal(['adv1.com', 'adv2.com']);
    });

    it('sets battr properly if present', function () {
      const clonedBannerRequests = deepClone(baseBannerBidRequests);
      const battr = [1, 2, 3];
      clonedBannerRequests[0].ortb2Imp = {
        banner: {
          battr: battr
        }
      };
      const requestBody = testBuildRequests(clonedBannerRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].banner.battr).to.equal(battr);
    });

    it('sets ext properly', function () {
      const clonedBannerRequests = deepClone(baseBannerBidRequests);

      const requestBody = testBuildRequests(clonedBannerRequests, baseBidderRequest).data;
      expect(requestBody.ext.ttdprebid.pbjs).to.equal('$prebid.version$');
    });

    it('adds gdpr consent info to the request', function () {
      const consentString = 'BON3G4EON3G4EAAABAENAA____ABl____A';
      const clonedBidderRequest = deepClone(baseBidderRequest);
      clonedBidderRequest.gdprConsent = {
        consentString: consentString,
        gdprApplies: true
      };

      const requestBody = testBuildRequests(baseBannerBidRequests, clonedBidderRequest).data;
      expect(requestBody.user.ext.consent).to.equal(consentString);
      expect(requestBody.regs.ext.gdpr).to.equal(1);
    });

    it('adds usp consent info to the request', function () {
      const consentString = 'BON3G4EON3G4EAAABAENAA____ABl____A';
      const clonedBidderRequest = deepClone(baseBidderRequest);
      clonedBidderRequest.uspConsent = consentString;

      const requestBody = testBuildRequests(baseBannerBidRequests, clonedBidderRequest).data;
      expect(requestBody.regs.ext.us_privacy).to.equal(consentString);
    });

    it('adds coppa consent info to the request', function () {
      const clonedBidderRequest = deepClone(baseBidderRequest);

      config.setConfig({coppa: true});
      const requestBody = testBuildRequests(baseBannerBidRequests, clonedBidderRequest).data;
      config.resetConfig();
      expect(requestBody.regs.coppa).to.equal(1);
    });

    it('adds gpp consent info to the request', function () {
      const ortb2 = {
        regs: {
          gpp: 'somegppstring',
          gpp_sid: [6, 7]
        }
      };
      const clonedBidderRequest = {...deepClone(baseBidderRequest), ortb2};
      const requestBody = testBuildRequests(baseBannerBidRequests, clonedBidderRequest).data;
      config.resetConfig();
      expect(requestBody.regs.gpp).to.equal('somegppstring');
      expect(requestBody.regs.gpp_sid).to.eql([6, 7]);
    });

    it('adds schain info to the request', function () {
      const schain = {
        'ver': '1.0',
        'complete': 1,
        'nodes': [{
          'asi': 'indirectseller.com',
          'sid': '00001',
          'hp': 1
        }, {
          'asi': 'indirectseller-2.com',
          'sid': '00002',
          'hp': 1
        }]
      };
      const clonedBannerBidRequests = deepClone(baseBannerBidRequests);
      clonedBannerBidRequests[0].ortb2 = { source: { ext: { schain: schain } } };

      const requestBody = testBuildRequests(clonedBannerBidRequests, baseBidderRequest).data;
      expect(requestBody.source.ext.schain).to.deep.equal(schain);
    });

    it('adds unified ID and UID2 info to user.ext.eids in the request', function () {
      const TDID = '00000000-0000-0000-0000-000000000000';
      const UID2 = '99999999-9999-9999-9999-999999999999';
      const clonedBannerRequests = deepClone(baseBannerBidRequests);
      clonedBannerRequests[0].userIdAsEids = [
        {
          source: 'adserver.org',
          uids: [
            {
              atype: 1,
              ext: {
                rtiPartner: 'TDID'
              },
              id: TDID
            }
          ]
        },
        {
          source: 'uidapi.com',
          uids: [
            {
              atype: 3,
              id: UID2
            }
          ]
        }
      ];
      const expectedEids = clonedBannerRequests[0].userIdAsEids;

      const requestBody = testBuildRequests(clonedBannerRequests, baseBidderRequest).data;
      expect(requestBody.user.ext.eids).to.deep.equal(expectedEids);
    });

    it('adds first party site data to the request', function () {
      const ortb2 = {
        site: {
          name: 'example',
          domain: 'page.example.com',
          cat: ['IAB2'],
          sectioncat: ['IAB2-2'],
          pagecat: ['IAB2-2'],
          page: 'https://page.example.com/here.html',
          ref: 'https://ref.example.com',
          keywords: 'power tools, drills'
        }
      };
      const clonedBidderRequest = {...deepClone(baseBidderRequest), ortb2};
      const requestBody = testBuildRequests(baseBannerBidRequests, clonedBidderRequest).data;
      expect(requestBody.site.name).to.equal('example');
      expect(requestBody.site.domain).to.equal('page.example.com');
      expect(requestBody.site.cat[0]).to.equal('IAB2');
      expect(requestBody.site.sectioncat[0]).to.equal('IAB2-2');
      expect(requestBody.site.pagecat[0]).to.equal('IAB2-2');
      expect(requestBody.site.page).to.equal('https://page.example.com/here.html');
      expect(requestBody.site.ref).to.equal('https://ref.example.com');
      expect(requestBody.site.keywords).to.equal('power tools, drills');
    });

    it('should fallback to floor module if no bidfloor is sent ', function () {
      const clonedBannerRequests = deepClone(baseBannerBidRequests);
      const bidfloor = 5.00;
      clonedBannerRequests[0].getFloor = () => {
        return { currency: 'USD', floor: bidfloor };
      };
      const requestBody = testBuildRequests(clonedBannerRequests, baseBidderRequest).data;
      config.resetConfig();
      expect(requestBody.imp[0].bidfloor).to.equal(bidfloor);
    });

    it('adds default value for secure if not set to request', function () {
      const requestBody = testBuildRequests(baseBannerBidRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].secure).to.equal(1);
    });

    it('adds secure to request', function () {
      const clonedBannerRequests = deepClone(baseBannerBidRequests);
      clonedBannerRequests[0].ortb2Imp.secure = 0;

      let requestBody = testBuildRequests(clonedBannerRequests, baseBidderRequest).data;
      expect(0).to.equal(requestBody.imp[0].secure);

      clonedBannerRequests[0].ortb2Imp.secure = 1;
      requestBody = testBuildRequests(clonedBannerRequests, baseBidderRequest).data;
      expect(1).to.equal(requestBody.imp[0].secure);
    });

    it('adds all of site first party data to request', function() {
      const ortb2 = {
        site: {
          ext: extFirstPartyData,
          search: 'test search'
        }
      };

      const clonedBidderRequest = {...deepClone(baseBidderRequest), ortb2};
      const requestBody = testBuildRequests(baseBannerBidRequests, clonedBidderRequest).data;

      validateExtFirstPartyData(requestBody.site.ext)
      expect(requestBody.site.search).to.equal('test search')
    });

    it('adds all of user first party data to request', function() {
      const ortb2 = {
        user: {
          ext: extFirstPartyData,
          yob: 1998
        }
      };

      const clonedBidderRequest = {...deepClone(baseBidderRequest), ortb2};
      const requestBody = testBuildRequests(baseBannerBidRequests, clonedBidderRequest).data;

      validateExtFirstPartyData(requestBody.user.ext)
      expect(requestBody.user.yob).to.equal(1998)
    });

    it('adds all of imp first party data to request', function() {
      const metric = { type: 'viewability', value: 0.8 };
      const clonedBannerRequests = deepClone(baseBannerBidRequests);
      clonedBannerRequests[0].ortb2Imp = {
        ext: extFirstPartyData,
        metric: [metric],
        clickbrowser: 1
      };

      const requestBody = testBuildRequests(clonedBannerRequests, baseBidderRequest).data;

      validateExtFirstPartyData(requestBody.imp[0].ext)
      expect(requestBody.imp[0].tagid).to.equal('1gaa015');
      expect(requestBody.imp[0].metric[0]).to.deep.equal(metric);
      expect(requestBody.imp[0].clickbrowser).to.equal(1)
    });

    it('adds all of app first party data to request', function() {
      const ortb2 = {
        app: {
          ext: extFirstPartyData,
          ver: 'v1.0'
        }
      };

      const clonedBidderRequest = {...deepClone(baseBidderRequest), ortb2};
      const requestBody = testBuildRequests(baseBannerBidRequests, clonedBidderRequest).data;

      validateExtFirstPartyData(requestBody.app.ext)
      expect(requestBody.app.ver).to.equal('v1.0')
    });

    it('adds all of device first party data to request', function() {
      const ortb2 = {
        device: {
          ext: extFirstPartyData,
          os: 'iPhone'
        }
      };

      const clonedBidderRequest = {...deepClone(baseBidderRequest), ortb2};
      const requestBody = testBuildRequests(baseBannerBidRequests, clonedBidderRequest).data;

      validateExtFirstPartyData(requestBody.device.ext)
      expect(requestBody.device.os).to.equal('iPhone')
    });

    it('adds all of pmp first party data to request', function() {
      const ortb2 = {
        pmp: {
          ext: extFirstPartyData,
          private_auction: 1
        }
      };

      const clonedBidderRequest = {...deepClone(baseBidderRequest), ortb2};
      const requestBody = testBuildRequests(baseBannerBidRequests, clonedBidderRequest).data;

      validateExtFirstPartyData(requestBody.imp[0].pmp.ext)
      expect(requestBody.imp[0].pmp.private_auction).to.equal(1)
    });
  });

  describe('buildRequests-banner-multiple', function () {
    const baseBannerMultipleBidRequests = [{
      'bidder': 'ttd',
      'params': {
        'supplySourceId': 'supplier',
        'publisherId': '13144370',
        'placementId': 'bottom'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250], [300, 600]]
        }
      },
      'ortb2Imp': {
        'ext': {
          'tid': '8651474f-58b1-4368-b812-84f8c937a099',
        }
      },
      'sizes': [[300, 250], [300, 600]],
      'transactionId': '1111474f-58b1-4368-b812-84f8c937a099',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'bidId': 'small',
      'bidderRequestId': '18084284054531',
      'auctionId': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
      'src': 'client',
      'bidRequestsCount': 1
    }, {
      'bidder': 'ttd',
      'params': {
        'publisherId': '13144370',
        'placementId': 'top'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[728, 90]]
        }
      },
      'ortb2Imp': {
        'ext': {
          'tid': '12345678-58b1-4368-b812-84f8c937a099',
        }
      },
      'sizes': [[728, 90]],
      'transactionId': '825c1228-ca8c-4657-b40f-2df500621527',
      'adUnitCode': 'div-gpt-ad-91515710-0',
      'bidId': 'large',
      'bidderRequestId': '18084284054531',
      'auctionId': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
      'src': 'client',
      'bidRequestsCount': 1
    }];

    const baseBidderRequest = {
      'bidderCode': 'ttd',
      ortb2: {
        source: {
          tid: 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
        }
      },
      'bidderRequestId': '18084284054531',
      'auctionStart': 1540945362095,
      'timeout': 3000,
      'refererInfo': {
        'referer': 'https://www.test.com',
        'reachedTop': true,
        'numIframes': 0,
        'stack': [
          'https://www.test.com'
        ]
      },
      'start': 1540945362099,
      'doneCbCallCount': 0
    };

    it('sends multiple impressions', function () {
      const requestBody = testBuildRequests(baseBannerMultipleBidRequests, baseBidderRequest).data;
      expect(requestBody.imp.length).to.equal(2);
      expect(requestBody.source).to.be.not.null;
      expect(requestBody.source.tid).to.equal(baseBidderRequest.ortb2.source.tid);
      expect(requestBody.imp[0].ext).to.be.not.null;
      expect(requestBody.imp[0].ext.tid).to.equal('8651474f-58b1-4368-b812-84f8c937a099');
      expect(requestBody.imp[1].ext).to.be.not.null;
      expect(requestBody.imp[1].ext.tid).to.equal('12345678-58b1-4368-b812-84f8c937a099');
    });

    it('sends the right tag ids for each ad unit', function () {
      const requestBody = testBuildRequests(baseBannerMultipleBidRequests, baseBidderRequest).data;
      requestBody.imp.forEach(imp => {
        if (imp.id === 'small') {
          expect(imp.tagid).to.equal('bottom');
        } else if (imp.id === 'large') {
          expect(imp.tagid).to.equal('top');
        } else {
          assert.fail('no matching impression id found');
        }
      });
    });

    it('sends the sizes for each ad unit', function () {
      const requestBody = testBuildRequests(baseBannerMultipleBidRequests, baseBidderRequest).data;
      requestBody.imp.forEach(imp => {
        if (imp.id === 'small') {
          expect(imp.banner.format[0].w).to.equal(300);
          expect(imp.banner.format[0].h).to.equal(250);
          expect(imp.banner.format[1].w).to.equal(300);
          expect(imp.banner.format[1].h).to.equal(600);
        } else if (imp.id === 'large') {
          expect(imp.banner.format[0].w).to.equal(728);
          expect(imp.banner.format[0].h).to.equal(90);
        } else {
          assert.fail('no matching impression id found');
        }
      });
    });
  });

  describe('buildRequests-display-video-multiformat', function () {
    if (!FEATURES.VIDEO) {
      return;
    }

    const baseMultiformatBidRequests = [{
      'bidder': 'ttd',
      'params': {
        'supplySourceId': 'supplier',
        'publisherId': '13144370',
        'placementId': '1gaa015'
      },
      'mediaTypes': {
        'video': {
          'playerSize': [640, 480],
          'api': [1, 3],
          'mimes': ['video/mp4'],
          'protocols': [2, 3, 5, 6],
          'minduration': 5,
          'maxduration': 30
        },
        'banner': {
          'sizes': [[300, 250], [300, 600]]
        }
      },
      'ortb2Imp': {
        'ext': {
          'tid': '8651474f-58b1-4368-b812-84f8c937a099',
        }
      },
      'transactionId': '1111474f-58b1-4368-b812-84f8c937a099',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'bidId': '243310435309b5',
      'bidderRequestId': '18084284054531',
      'auctionId': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
      'src': 'client',
      'bidRequestsCount': 1
    }];

    const baseBidderRequest = {
      'bidderCode': 'ttd',
      'auctionId': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
      'bidderRequestId': '18084284054531',
      'auctionStart': 1540945362095,
      'timeout': 3000,
      'refererInfo': {
        'referer': 'https://www.example.com/test',
        'reachedTop': true,
        'numIframes': 0,
        'stack': [
          'https://www.example.com/test'
        ]
      },
      'start': 1540945362099,
      'doneCbCallCount': 0
    };

    it('includes the video ad size in the bid request', function () {
      const requestBody = testBuildRequests(baseMultiformatBidRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].video.w).to.equal(640);
      expect(requestBody.imp[0].video.h).to.equal(480);
    });

    it('includes the banner ad size in the bid request', function () {
      const requestBody = testBuildRequests(baseMultiformatBidRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].banner.format[0].w).to.equal(300);
      expect(requestBody.imp[0].banner.format[0].h).to.equal(250);
      expect(requestBody.imp[0].banner.format[1].w).to.equal(300);
      expect(requestBody.imp[0].banner.format[1].h).to.equal(600);
    });
  });

  describe('buildRequests-video', function () {
    if (!FEATURES.VIDEO) {
      return;
    }

    const baseVideoBidRequests = [{
      'bidder': 'ttd',
      'params': {
        'supplySourceId': 'supplier',
        'publisherId': '13144370',
        'placementId': '1gaa015'
      },
      'mediaTypes': {
        'video': {
          'playerSize': [640, 480],
          'api': [1, 3],
          'mimes': ['video/mp4'],
          'protocols': [2, 3, 5, 6],
          'minduration': 5,
          'maxduration': 30
        }
      },
      'ortb2Imp': {
        'ext': {
          'tid': '8651474f-58b1-4368-b812-84f8c937a099',
        }
      },
      'transactionId': '1111474f-58b1-4368-b812-84f8c937a099',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'bidId': '243310435309b5',
      'bidderRequestId': '18084284054531',
      'auctionId': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
      'src': 'client',
      'bidRequestsCount': 1
    }];

    const baseBidderRequest = {
      'bidderCode': 'ttd',
      'auctionId': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
      'bidderRequestId': '18084284054531',
      'auctionStart': 1540945362095,
      'timeout': 3000,
      'refererInfo': {
        'referer': 'https://www.example.com/test',
        'reachedTop': true,
        'numIframes': 0,
        'stack': [
          'https://www.example.com/test'
        ]
      },
      'start': 1540945362099,
      'doneCbCallCount': 0
    };

    it('includes the ad size in the bid request', function () {
      const requestBody = testBuildRequests(baseVideoBidRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].video.w).to.equal(640);
      expect(requestBody.imp[0].video.h).to.equal(480);
    });

    it('includes the mimes in the bid request', function () {
      const requestBody = testBuildRequests(baseVideoBidRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].video.mimes[0]).to.equal('video/mp4');
    });

    it('includes the min and max duration in the bid request', function () {
      const requestBody = testBuildRequests(baseVideoBidRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].video.minduration).to.equal(5);
      expect(requestBody.imp[0].video.maxduration).to.equal(30);
    });

    it('sets the minduration to 0 if missing', function () {
      const clonedVideoRequests = deepClone(baseVideoBidRequests);
      delete clonedVideoRequests[0].mediaTypes.video.minduration

      const requestBody = testBuildRequests(clonedVideoRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].video.minduration).to.equal(0);
    });

    it('includes the api frameworks in the bid request', function () {
      const requestBody = testBuildRequests(baseVideoBidRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].video.api[0]).to.equal(1);
      expect(requestBody.imp[0].video.api[1]).to.equal(3);
    });

    it('includes the protocols in the bid request', function () {
      const requestBody = testBuildRequests(baseVideoBidRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].video.protocols[0]).to.equal(2);
      expect(requestBody.imp[0].video.protocols[1]).to.equal(3);
      expect(requestBody.imp[0].video.protocols[2]).to.equal(5);
      expect(requestBody.imp[0].video.protocols[3]).to.equal(6);
    });

    it('sets skip correctly if sent', function () {
      const clonedVideoRequests = deepClone(baseVideoBidRequests);
      clonedVideoRequests[0].mediaTypes.video.skip = 1;
      clonedVideoRequests[0].mediaTypes.video.skipmin = 5;
      clonedVideoRequests[0].mediaTypes.video.skipafter = 10;

      const requestBody = testBuildRequests(clonedVideoRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].video.skip).to.equal(1);
      expect(requestBody.imp[0].video.skipmin).to.equal(5);
      expect(requestBody.imp[0].video.skipafter).to.equal(10);
    });

    it('sets bitrate correctly if sent', function () {
      const clonedVideoRequests = deepClone(baseVideoBidRequests);
      clonedVideoRequests[0].mediaTypes.video.minbitrate = 100;
      clonedVideoRequests[0].mediaTypes.video.maxbitrate = 500;

      const requestBody = testBuildRequests(clonedVideoRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].video.minbitrate).to.equal(100);
      expect(requestBody.imp[0].video.maxbitrate).to.equal(500);
    });

    it('sets pos correctly if sent', function () {
      const clonedVideoRequests = deepClone(baseVideoBidRequests);
      clonedVideoRequests[0].mediaTypes.video.pos = 1;

      const requestBody = testBuildRequests(clonedVideoRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].video.pos).to.equal(1);
    });

    it('sets playbackmethod correctly if sent', function () {
      const clonedVideoRequests = deepClone(baseVideoBidRequests);
      clonedVideoRequests[0].mediaTypes.video.playbackmethod = [1];

      const requestBody = testBuildRequests(clonedVideoRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].video.playbackmethod[0]).to.equal(1);
    });

    it('sets startdelay correctly if sent', function () {
      const clonedVideoRequests = deepClone(baseVideoBidRequests);
      clonedVideoRequests[0].mediaTypes.video.startdelay = -1;

      const requestBody = testBuildRequests(clonedVideoRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].video.startdelay).to.equal(-1);
    });

    it('sets placement correctly if sent', function () {
      const clonedVideoRequests = deepClone(baseVideoBidRequests);
      clonedVideoRequests[0].mediaTypes.video.placement = 3;

      const requestBody = testBuildRequests(clonedVideoRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].video.placement).to.equal(3);
    });

    it('sets plcmt correctly if sent', function () {
      const clonedVideoRequests = deepClone(baseVideoBidRequests);
      clonedVideoRequests[0].mediaTypes.video.plcmt = 3;

      const requestBody = testBuildRequests(clonedVideoRequests, baseBidderRequest).data;
      expect(requestBody.imp[0].video.plcmt).to.equal(3);
    });
  });

  describe('interpretResponse-empty', function () {
    it('should handle empty response', function () {
      const result = spec.interpretResponse({});
      expect(result.length).to.equal(0);
    });

    it('should handle empty seatbid response', function () {
      const response = {
        body: {
          'id': '5e5c23a5ba71e78',
          'seatbid': []
        }
      };
      const result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });

  describe('interpretResponse-simple-display', function () {
    const incoming = {
      body: {
        'id': '5e5c23a5ba71e78',
        'seatbid': [
          {
            'bid': [
              {
                'id': '6vmb3isptf',
                'crid': 'ttdscreative',
                'impid': '322add653672f68',
                'price': 1.22,
                'adm': '<!-- creative -->',
                'cat': [],
                'h': 90,
                'w': 728,
                'ttl': 60,
                'dealid': 'ttd-dealid-1',
                'adomain': ['advertiser.com'],
                'ext': {
                  'mediatype': 1
                }
              }
            ],
            'seat': 'MOCK'
          }
        ],
        'cur': 'EUR',
        'bidid': '5e5c23a5ba71e78'
      }
    };

    const serverRequest = {
      'method': 'POST',
      'url': 'https://direct.adsrvr.org/bid/bidder/supplier',
      'data': {
        'id': 'c47237df-c108-419f-9c2b-da513dc3c133',
        'imp': [
          {
            'id': '322add653672f68',
            'tagid': 'simple',
            'banner': {
              'w': 728,
              'h': 90,
              'format': [
                {
                  'w': 728,
                  'h': 90
                }
              ]
            }
          }
        ],
        'site': {
          'page': 'http://www.test.com',
          'publisher': {
            'id': '111'
          }
        },
        'device': {
          'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36',
          'dnt': 0,
          'language': 'en-US',
          'connectiontype': 0
        },
        'user': {},
        'at': 1,
        'cur': [
          'USD'
        ],
        'regs': {},
        'ext': {
          'ttdprebid': {
            'ver': 'TTD-PREBID-2019.11.12',
            'pbjs': '2.31.0'
          }
        }
      },
      'options': {
        'withCredentials': true
      }
    };

    const expectedBid = {
      'requestId': '322add653672f68',
      'cpm': 1.22,
      'width': 728,
      'height': 90,
      'creativeId': 'ttdscreative',
      'dealId': 'ttd-dealid-1',
      'currency': 'EUR',
      'netRevenue': true,
      'ttl': 60,
      'ad': '<!-- creative -->',
      'mediaType': 'banner',
      'meta': {
        'advertiserDomains': ['advertiser.com']
      }
    };

    it('should get the correct bid response', function () {
      const result = spec.interpretResponse(incoming, serverRequest);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(expectedBid);
    });
  });

  describe('interpretResponse-multiple-display', function () {
    const incoming = {
      'body': {
        'id': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
        'seatbid': [
          {
            'bid': [
              {
                'id': 'small',
                'impid': 'small',
                'price': 4.25,
                'adm': '<img src=\"https://test.adsrvr.org/feedback/prebid?iid=a6702d4e-8d0f-4c48-b251-ce7db4150b46&crid=creativeId999&wp=${AUCTION_PRICE}&aid=small&wpc=USD&sfe=f8d2db2&puid=&tdid=825c1228-ca8c-4657-b40f-2df500621527&pid=&ag=adgroupid&sig=dFthumiovXraET6E7SiXy41xVCF0HgbuBSVkvazJp-w.&cf=&fq=0&td_s=www.test.com&rcats=&mcat=&mste=&mfld=0&mssi=&mfsi=&uhow=&agsa=&rgco=&rgre=&rgme=&rgci=&rgz=&svbttd=1&dt=Other&osf=&os=&br=&rlangs=en&mlang=&svpid=13144370&did=&rcxt=Other&lat=&lon=&tmpc=&daid=&vp=0&osi=&osv=&bp=250.25&c=OAA.&dur=&crrelr=&ipl=bottom&vc=0&said=e7b34fa3-8654-424e-8c49-03e509e53d8c&ict=Unknown\" width=\"1\" height=\"1\" style=\"display: none;\"/>Default Test Ad Tag',
                'cid': 'campaignId132',
                'crid': 'creativeId999',
                'adomain': [
                  'http://foo'
                ],
                'dealid': null,
                'w': 300,
                'h': 600,
                'cat': [],
                'ext': {
                  'mediatype': 1
                }
              },
              {
                'id': 'large',
                'impid': 'large',
                'price': 5.25,
                'adm': '<img src=\"https://test.adsrvr.org/feedback/prebid?iid=02348bcc-773a-4e98-8550-d27a870262e4&crid=creativeId222&wp=${AUCTION_PRICE}&aid=large&wpc=USD&sfe=f8d2db2&puid=&tdid=825c1228-ca8c-4657-b40f-2df500621527&pid=&ag=adgroupid&sig=iK1Drckqd-4kokX0eXwWQn5rh0EynlQim0H22GyT3pg.&cf=&fq=0&td_s=www.test.com&rcats=&mcat=&mste=&mfld=0&mssi=&mfsi=&uhow=&agsa=&rgco=&rgre=&rgme=&rgci=&rgz=&svbttd=1&dt=Other&osf=&os=&br=&rlangs=en&mlang=&svpid=13144370&did=&rcxt=Other&lat=&lon=&tmpc=&daid=&vp=0&osi=&osv=&bp=251.25&c=OAA.&dur=&crrelr=&ipl=top&vc=0&said=e7b34fa3-8654-424e-8c49-03e509e53d8c&ict=Unknown\" width=\"1\" height=\"1\" style=\"display: none;\"/>Default Test Ad Tag',
                'cid': 'campaignId132',
                'crid': 'creativeId222',
                'adomain': [
                  'http://foo2'
                ],
                'dealid': null,
                'w': 728,
                'h': 90,
                'cat': [],
                'ext': {
                  'mediatype': 1
                }
              }
            ],
            'seat': 'supplyVendorBuyerId132'
          }
        ],
        'cur': 'USD'
      }
    };

    const expectedBids = [
      {
        'requestId': 'small',
        'cpm': 4.25,
        'width': 300,
        'height': 600,
        'creativeId': 'creativeId999',
        'currency': 'USD',
        'dealId': null,
        'netRevenue': true,
        'ttl': 360,
        'ad': '<img src=\"https://test.adsrvr.org/feedback/prebid?iid=a6702d4e-8d0f-4c48-b251-ce7db4150b46&crid=creativeId999&wp=4.25&aid=small&wpc=USD&sfe=f8d2db2&puid=&tdid=825c1228-ca8c-4657-b40f-2df500621527&pid=&ag=adgroupid&sig=dFthumiovXraET6E7SiXy41xVCF0HgbuBSVkvazJp-w.&cf=&fq=0&td_s=www.test.com&rcats=&mcat=&mste=&mfld=0&mssi=&mfsi=&uhow=&agsa=&rgco=&rgre=&rgme=&rgci=&rgz=&svbttd=1&dt=Other&osf=&os=&br=&rlangs=en&mlang=&svpid=13144370&did=&rcxt=Other&lat=&lon=&tmpc=&daid=&vp=0&osi=&osv=&bp=250.25&c=OAA.&dur=&crrelr=&ipl=bottom&vc=0&said=e7b34fa3-8654-424e-8c49-03e509e53d8c&ict=Unknown\" width=\"1\" height=\"1\" style=\"display: none;\"/>Default Test Ad Tag',
        'mediaType': 'banner',
        'meta': {
          'advertiserDomains': ['http://foo']
        }
      },
      {
        'requestId': 'large',
        'cpm': 5.25,
        'width': 728,
        'height': 90,
        'creativeId': 'creativeId222',
        'currency': 'USD',
        'dealId': null,
        'netRevenue': true,
        'ttl': 360,
        'ad': '<img src=\"https://test.adsrvr.org/feedback/prebid?iid=02348bcc-773a-4e98-8550-d27a870262e4&crid=creativeId222&wp=5.25&aid=large&wpc=USD&sfe=f8d2db2&puid=&tdid=825c1228-ca8c-4657-b40f-2df500621527&pid=&ag=adgroupid&sig=iK1Drckqd-4kokX0eXwWQn5rh0EynlQim0H22GyT3pg.&cf=&fq=0&td_s=www.test.com&rcats=&mcat=&mste=&mfld=0&mssi=&mfsi=&uhow=&agsa=&rgco=&rgre=&rgme=&rgci=&rgz=&svbttd=1&dt=Other&osf=&os=&br=&rlangs=en&mlang=&svpid=13144370&did=&rcxt=Other&lat=&lon=&tmpc=&daid=&vp=0&osi=&osv=&bp=251.25&c=OAA.&dur=&crrelr=&ipl=top&vc=0&said=e7b34fa3-8654-424e-8c49-03e509e53d8c&ict=Unknown\" width=\"1\" height=\"1\" style=\"display: none;\"/>Default Test Ad Tag',
        'mediaType': 'banner',
        'meta': {
          'advertiserDomains': ['http://foo2']
        }
      }
    ];

    const serverRequest = {
      'method': 'POST',
      'url': 'https://direct.adsrvr.org/bid/bidder/supplier',
      'data': {
        'id': 'c47237df-c108-419f-9c2b-da513dc3c133',
        'imp': [
          {
            'id': 'small',
            'tagid': 'test1',
            'banner': {
              'w': 300,
              'h': 600,
              'format': [
                {
                  'w': 300,
                  'h': 600
                }
              ]
            }
          },
          {
            'id': 'large',
            'tagid': 'test2',
            'banner': {
              'w': 728,
              'h': 90,
              'format': [
                {
                  'w': 728,
                  'h': 90
                }
              ]
            }
          }
        ],
        'site': {
          'page': 'http://www.test.com',
          'publisher': {
            'id': '111'
          }
        },
        'device': {
          'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36',
          'dnt': 0,
          'language': 'en-US',
          'connectiontype': 0
        },
        'user': {},
        'at': 1,
        'cur': [
          'USD'
        ],
        'regs': {},
        'ext': {
          'ttdprebid': {
            'ver': 'TTD-PREBID-2019.11.12',
            'pbjs': '2.31.0'
          }
        }
      },
      'options': {
        'withCredentials': true
      }
    };

    it('should get the correct bid response', function () {
      const result = spec.interpretResponse(incoming, serverRequest);
      expect(result.length).to.equal(2);
      expect(result).to.deep.equal(expectedBids);
    });
  });

  describe('interpretResponse-simple-video', function () {
    if (!FEATURES.VIDEO) {
      return;
    }

    const incoming = {
      'body': {
        'cur': 'USD',
        'seatbid': [
          {
            'bid': [
              {
                'crid': 'mokivv6m',
                'ext': {
                  'advid': '7ieo6xk',
                  'agid': '7q9n3s2',
                  'deal': {
                    'dealid': '7013542'
                  },
                  'imptrackers': [],
                  'viewabilityvendors': [],
                  'mediatype': 2
                },
                'h': 480,
                'impid': '2eabb87dfbcae4',
                'nurl': 'https://insight.adsrvr.org/enduser/vast?iid=00000000-0000-0000-0000-000000000000&crid=v3pek2eh&wp=${AUCTION_PRICE}&aid=&wpc=&sfe=0&puid=&tdid=00000000-0000-0000-0000-000000000000&pid=&ag=&adv=&sig=AAAAAAAAAAAAAA.&cf=&fq=0&td_s=&rcats=&mcat=&mste=&mfld=4&mssi=&mfsi=&uhow=&agsa=&rgco=&rgre=&rgme=&rgci=&rgz=&svbttd=0&dt=&osf=&os=&br=&rlangs=en&mlang=en&svpid=&did=&rcxt=&lat=&lon=&tmpc=&daid=&vp=0&osi=&osv=&dc=0&vcc=QAFIAVABiAECwAEDyAED0AED6AEG8AEBgAIDigIMCAIIBQgDCAYICwgMmgIECAEIAqACA6gCAsACAA..&sv=noop&pidi=&advi=&cmpi=&agi=&cridi=&svi=&cmp=&skip=1&c=&dur=&crrelr=',
                'price': 13.6,
                'ttl': 500,
                'w': 600
              }
            ],
            'seat': 'supplyVendorBuyerId132'
          }
        ]
      },
      'headers': {}
    };

    const serverRequest = {
      'method': 'POST',
      'url': 'https://direct.bid.adsrvr.org/bid/bidder/supplier',
      'data': {
        'id': 'e94ec12d-ae1d-4ed7-abd1-eb3198ce3b63',
        'imp': [
          {
            'id': '2eabb87dfbcae4',
            'tagid': 'video',
            'video': {
              'api': [
                1,
                3
              ],
              'mimes': [
                'video/mp4'
              ],
              'minduration': 5,
              'maxduration': 30,
              'w': 640,
              'h': 480,
              'protocols': [
                2,
                3,
                5,
                6
              ]
            }
          }
        ],
        'site': {
          'page': 'http://www.test.com',
          'publisher': {
            'id': '111'
          }
        },
        'device': {
          'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36',
          'dnt': 0,
          'language': 'en-US',
          'connectiontype': 0
        },
        'user': {},
        'at': 1,
        'cur': [
          'USD'
        ],
        'regs': {},
        'ext': {
          'ttdprebid': {
            'ver': 'TTD-PREBID-2019.11.12',
            'pbjs': '3.10.0'
          }
        }
      },
      'options': {
        'withCredentials': true
      }
    };

    const expectedBid = {
      'requestId': '2eabb87dfbcae4',
      'cpm': 13.6,
      'creativeId': 'mokivv6m',
      'dealId': null,
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 500,
      'width': 640,
      'height': 480,
      'mediaType': 'video',
      'vastUrl': 'https://insight.adsrvr.org/enduser/vast?iid=00000000-0000-0000-0000-000000000000&crid=v3pek2eh&wp=13.6&aid=&wpc=&sfe=0&puid=&tdid=00000000-0000-0000-0000-000000000000&pid=&ag=&adv=&sig=AAAAAAAAAAAAAA.&cf=&fq=0&td_s=&rcats=&mcat=&mste=&mfld=4&mssi=&mfsi=&uhow=&agsa=&rgco=&rgre=&rgme=&rgci=&rgz=&svbttd=0&dt=&osf=&os=&br=&rlangs=en&mlang=en&svpid=&did=&rcxt=&lat=&lon=&tmpc=&daid=&vp=0&osi=&osv=&dc=0&vcc=QAFIAVABiAECwAEDyAED0AED6AEG8AEBgAIDigIMCAIIBQgDCAYICwgMmgIECAEIAqACA6gCAsACAA..&sv=noop&pidi=&advi=&cmpi=&agi=&cridi=&svi=&cmp=&skip=1&c=&dur=&crrelr=',
      'meta': {}
    };

    it('should get the correct bid response if nurl is returned', function () {
      const result = spec.interpretResponse(incoming, serverRequest);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(expectedBid);
    });

    it('should get the correct bid response if adm is returned', function () {
      const vastXml = "<VAST version=\"2.0\"><Ad id=\"preroll-1\"><InLine><AdSystem>2.0</AdSystem><AdTitle>5748406</AdTitle><Impression id=\"blah\"><![CDATA[http://b.scorecardresearch.com/b?C1=1&C2=6000003&C3=0000000200500000197000000&C4=us&C7=http://www.scanscout.com&C8=scanscout.com&C9=http://www.scanscout.com&C10=xn&rn=-103217130]]></Impression><Creatives><Creative><Linear><Duration>00:00:30</Duration><TrackingEvents> </TrackingEvents><VideoClicks><ClickThrough id=\"scanscout\"><![CDATA[ http://www.target.com ]]></ClickThrough></VideoClicks><MediaFiles><MediaFile height=\"396\" width=\"600\" bitrate=\"496\" type=\"video/x-flv\" delivery=\"progressive\"><![CDATA[http://media.scanscout.com/ads/partner1_a1d1fbbc-c4d4-419f-b6c8-e9db63fd4491.flv]]></MediaFile></MediaFiles></Linear></Creative><Creative><CompanionAds><Companion height=\"250\" width=\"300\" id=\"555750\"><HTMLResource><![CDATA[<A onClick=\"var i= new Image(1,1); i.src='http://app.scanscout.com/ssframework/log/log.png?a=logitemaction&RI=555750&CbC=1&CbF=true&EC=0&RC=0&SmC=2&CbM=1.0E-5&VI=736e6b13bad531dc476bc3612749bc35&admode=preroll&PRI=-4827170214961170629&RprC=0&ADsn=17&VcaI=192,197&RrC=1&VgI=736e6b13bad531dc476bc3612749bc35&AVI=142&Ust=ma&Uctry=us&CI=1223187&AC=4&PI=567&Udma=506&ADI=5748406&VclF=true';\" HREF=\"http://target.com\" target=\"_blank\"> <IMG SRC=\"http://media.scanscout.com/ads/target300x250Companion.jpg\" BORDER=0 WIDTH=300 HEIGHT=250 ALT=\"Click Here\"> </A> <img src=\"http://app.scanscout.com/ssframework/log/log.png?a=logitemaction&RI=555750&CbC=1&CbF=true&EC=1&RC=0&SmC=2&CbM=1.0E-5&VI=736e6b13bad531dc476bc3612749bc35&admode=preroll&PRI=-4827170214961170629&RprC=0&ADsn=17&VcaI=192,197&RrC=1&VgI=736e6b13bad531dc476bc3612749bc35&AVI=142&Ust=ma&Uctry=us&CI=1223187&AC=4&PI=567&Udma=506&ADI=5748406&VclF=true\" height=\"1\" width=\"1\">]]></HTMLResource></Companion></CompanionAds></Creative></Creatives></InLine></Ad></VAST>";
      const admIncoming = deepClone(incoming);
      delete admIncoming.body.seatbid[0].bid[0].nurl;
      admIncoming.body.seatbid[0].bid[0].adm = vastXml;

      const vastXmlExpectedBid = deepClone(expectedBid);
      delete vastXmlExpectedBid.vastUrl;
      vastXmlExpectedBid.vastXml = vastXml;

      const result = spec.interpretResponse(admIncoming, serverRequest);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(vastXmlExpectedBid);
    });
  });

  describe('interpretResponse-display-and-video', function () {
    if (!FEATURES.VIDEO) {
      return;
    }

    const incoming = {
      'body': {
        'id': 'e7b34fa3-8654-424e-8c49-03e509e53d8c',
        'seatbid': [
          {
            'bid': [
              {
                'id': 'small',
                'impid': 'small',
                'price': 4.25,
                'adm': '<img src=\"https://test.adsrvr.org/feedback/prebid?iid=a6702d4e-8d0f-4c48-b251-ce7db4150b46&crid=creativeId999&wp=${AUCTION_PRICE}&aid=small&wpc=USD&sfe=f8d2db2&puid=&tdid=825c1228-ca8c-4657-b40f-2df500621527&pid=&ag=adgroupid&sig=dFthumiovXraET6E7SiXy41xVCF0HgbuBSVkvazJp-w.&cf=&fq=0&td_s=www.test.com&rcats=&mcat=&mste=&mfld=0&mssi=&mfsi=&uhow=&agsa=&rgco=&rgre=&rgme=&rgci=&rgz=&svbttd=1&dt=Other&osf=&os=&br=&rlangs=en&mlang=&svpid=13144370&did=&rcxt=Other&lat=&lon=&tmpc=&daid=&vp=0&osi=&osv=&bp=250.25&c=OAA.&dur=&crrelr=&ipl=bottom&vc=0&said=e7b34fa3-8654-424e-8c49-03e509e53d8c&ict=Unknown\" width=\"1\" height=\"1\" style=\"display: none;\"/>Default Test Ad Tag',
                'cid': 'campaignId132',
                'crid': 'creativeId999',
                'adomain': [
                  'http://foo'
                ],
                'dealid': null,
                'w': 300,
                'h': 600,
                'cat': [],
                'ext': {
                  'mediatype': 1
                }
              },
              {
                'crid': 'mokivv6m',
                'ext': {
                  'advid': '7ieo6xk',
                  'agid': '7q9n3s2',
                  'deal': {
                    'dealid': '7013542'
                  },
                  'imptrackers': [],
                  'viewabilityvendors': [],
                  'mediatype': 2
                },
                'h': 480,
                'impid': '2eabb87dfbcae4',
                'nurl': 'https://insight.adsrvr.org/enduser/vast?iid=00000000-0000-0000-0000-000000000000&crid=v3pek2eh&wp=${AUCTION_PRICE}&aid=&wpc=&sfe=0&puid=&tdid=00000000-0000-0000-0000-000000000000&pid=&ag=&adv=&sig=AAAAAAAAAAAAAA.&cf=&fq=0&td_s=&rcats=&mcat=&mste=&mfld=4&mssi=&mfsi=&uhow=&agsa=&rgco=&rgre=&rgme=&rgci=&rgz=&svbttd=0&dt=&osf=&os=&br=&rlangs=en&mlang=en&svpid=&did=&rcxt=&lat=&lon=&tmpc=&daid=&vp=0&osi=&osv=&dc=0&vcc=QAFIAVABiAECwAEDyAED0AED6AEG8AEBgAIDigIMCAIIBQgDCAYICwgMmgIECAEIAqACA6gCAsACAA..&sv=noop&pidi=&advi=&cmpi=&agi=&cridi=&svi=&cmp=&skip=1&c=&dur=&crrelr=',
                'price': 13.6,
                'ttl': 500,
                'w': 600
              }
            ],
            'seat': 'supplyVendorBuyerId132'
          }
        ],
        'cur': 'USD'
      }
    };

    const expectedBids = [
      {
        'requestId': 'small',
        'cpm': 4.25,
        'width': 300,
        'height': 600,
        'creativeId': 'creativeId999',
        'currency': 'USD',
        'dealId': null,
        'netRevenue': true,
        'ttl': 360,
        'ad': '<img src=\"https://test.adsrvr.org/feedback/prebid?iid=a6702d4e-8d0f-4c48-b251-ce7db4150b46&crid=creativeId999&wp=4.25&aid=small&wpc=USD&sfe=f8d2db2&puid=&tdid=825c1228-ca8c-4657-b40f-2df500621527&pid=&ag=adgroupid&sig=dFthumiovXraET6E7SiXy41xVCF0HgbuBSVkvazJp-w.&cf=&fq=0&td_s=www.test.com&rcats=&mcat=&mste=&mfld=0&mssi=&mfsi=&uhow=&agsa=&rgco=&rgre=&rgme=&rgci=&rgz=&svbttd=1&dt=Other&osf=&os=&br=&rlangs=en&mlang=&svpid=13144370&did=&rcxt=Other&lat=&lon=&tmpc=&daid=&vp=0&osi=&osv=&bp=250.25&c=OAA.&dur=&crrelr=&ipl=bottom&vc=0&said=e7b34fa3-8654-424e-8c49-03e509e53d8c&ict=Unknown\" width=\"1\" height=\"1\" style=\"display: none;\"/>Default Test Ad Tag',
        'mediaType': 'banner',
        'meta': {
          'advertiserDomains': ['http://foo']
        }
      },
      {
        'requestId': '2eabb87dfbcae4',
        'cpm': 13.6,
        'creativeId': 'mokivv6m',
        'dealId': null,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 500,
        'width': 640,
        'height': 480,
        'mediaType': 'video',
        'vastUrl': 'https://insight.adsrvr.org/enduser/vast?iid=00000000-0000-0000-0000-000000000000&crid=v3pek2eh&wp=13.6&aid=&wpc=&sfe=0&puid=&tdid=00000000-0000-0000-0000-000000000000&pid=&ag=&adv=&sig=AAAAAAAAAAAAAA.&cf=&fq=0&td_s=&rcats=&mcat=&mste=&mfld=4&mssi=&mfsi=&uhow=&agsa=&rgco=&rgre=&rgme=&rgci=&rgz=&svbttd=0&dt=&osf=&os=&br=&rlangs=en&mlang=en&svpid=&did=&rcxt=&lat=&lon=&tmpc=&daid=&vp=0&osi=&osv=&dc=0&vcc=QAFIAVABiAECwAEDyAED0AED6AEG8AEBgAIDigIMCAIIBQgDCAYICwgMmgIECAEIAqACA6gCAsACAA..&sv=noop&pidi=&advi=&cmpi=&agi=&cridi=&svi=&cmp=&skip=1&c=&dur=&crrelr=',
        'meta': {}
      }
    ];

    const serverRequest = {
      'method': 'POST',
      'url': 'https://direct.adsrvr.org/bid/bidder/supplier',
      'data': {
        'id': 'c47237df-c108-419f-9c2b-da513dc3c133',
        'imp': [
          {
            'id': 'small',
            'tagid': 'test1',
            'banner': {
              'w': 300,
              'h': 600,
              'format': [
                {
                  'w': 300,
                  'h': 600
                }
              ]
            },
          },
          {
            'id': '2eabb87dfbcae4',
            'tagid': 'video',
            'video': {
              'api': [
                1,
                3
              ],
              'mimes': [
                'video/mp4'
              ],
              'minduration': 5,
              'maxduration': 30,
              'w': 640,
              'h': 480,
              'protocols': [
                2,
                3,
                5,
                6
              ]
            }
          }
        ],
        'site': {
          'page': 'http://www.test.com',
          'publisher': {
            'id': '111'
          }
        },
        'device': {
          'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36',
          'dnt': 0,
          'language': 'en-US',
          'connectiontype': 0
        },
        'user': {},
        'at': 1,
        'cur': [
          'USD'
        ],
        'regs': {},
        'ext': {
          'ttdprebid': {
            'ver': 'TTD-PREBID-2019.11.12',
            'pbjs': '2.31.0'
          }
        }
      },
      'options': {
        'withCredentials': true
      }
    };

    it('should get the correct bid response', function () {
      const result = spec.interpretResponse(incoming, serverRequest);
      expect(result.length).to.equal(2);
      expect(result).to.deep.equal(expectedBids);
    });
  });
});
