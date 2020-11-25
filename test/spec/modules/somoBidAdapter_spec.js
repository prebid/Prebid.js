import {expect} from 'chai';
import {spec} from 'modules/somoBidAdapter.js';
import * as utils from 'src/utils.js';

describe('Somo Audience Adapter Tests', function () {
  describe('isBidRequestValid', function () {
    it('should return false when given an invalid bid', function () {
      const bid = {
        bidder: 'somo',
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(false);
    });
    it('should return true when given a placementId bid', function () {
      const bid = {
        bidder: 'somo',
        params: {
          placementId: 'test'
        }
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    describe('buildBannerRequests', function () {
      it('should properly build a banner request with type not defined and sizes not defined', function () {
        const bidRequests = [{
          bidder: 'somo',
          params: {
            placementId: 'test'
          }
        }];
        const bidderRequest = {
          refererInfo: {
            referer: 'https://www.test.com/page?var=val',
            canonicalUrl: 'https://www.test.com/page'
          }
        };

        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request[0].url).to.equal('https://publisher-east.mobileadtrading.com/rtb/bid?s=test');
        expect(request[0].method).to.equal('POST');
        const ortbRequest = request[0].data;
        expect(ortbRequest.site).to.not.equal(null);
        expect(ortbRequest.site.ref).to.equal('https://www.test.com/page?var=val');
        expect(ortbRequest.site.page).to.equal('https://www.test.com/page');
        expect(ortbRequest.site.domain).to.not.be.undefined;
        expect(ortbRequest.imp).to.have.lengthOf(1);
        expect(ortbRequest.device).to.not.equal(null);
        expect(ortbRequest.device.ua).to.equal(navigator.userAgent);
        expect(ortbRequest.imp[0].bidfloor).to.not.be.null;
        expect(ortbRequest.imp[0].banner).to.not.equal(null);
      });

      it('should properly build a banner request with sizes defined in 2d array', function () {
        const bidRequests = [{
          bidder: 'somo',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            }
          },
          params: {
            placementId: 'test'
          }
        }];

        const bidderRequest = {
          refererInfo: {
            referer: 'https://www.test.com/page?var=val',
            canonicalUrl: 'https://www.test.com/page'
          }
        }

        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request[0].url).to.equal('https://publisher-east.mobileadtrading.com/rtb/bid?s=test');
        expect(request[0].method).to.equal('POST');
        const ortbRequest = request[0].data;
        expect(ortbRequest.site).to.not.equal(null);
        expect(ortbRequest.site.ref).to.equal('https://www.test.com/page?var=val');
        expect(ortbRequest.site.page).to.equal('https://www.test.com/page');
        expect(ortbRequest.site.domain).to.not.be.undefined;
        expect(ortbRequest.imp).to.have.lengthOf(1);
        expect(ortbRequest.imp[0].bidfloor).to.not.be.null;
        expect(ortbRequest.imp[0].banner).to.not.equal(null);
        expect(ortbRequest.imp[0].banner.w).to.equal(300);
        expect(ortbRequest.imp[0].banner.h).to.equal(250);
      });
      it('should properly build a banner request with sizes defined in 1d array', function () {
        const bidRequests = [{
          bidder: 'somo',
          mediaTypes: {
            banner: {
              sizes: [300, 250]
            }
          },
          params: {
            placementId: 'test'
          }
        }];

        const bidderRequest = {
          refererInfo: {
            referer: 'https://www.test.com/page?var=val',
            canonicalUrl: 'https://www.test.com/page'
          }
        };

        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request[0].url).to.equal('https://publisher-east.mobileadtrading.com/rtb/bid?s=test');
        expect(request[0].method).to.equal('POST');
        const ortbRequest = request[0].data;
        expect(ortbRequest.site).to.not.equal(null);
        expect(ortbRequest.site.ref).to.equal('https://www.test.com/page?var=val');
        expect(ortbRequest.site.page).to.equal('https://www.test.com/page');
        expect(ortbRequest.site.domain).to.not.be.undefined;
        expect(ortbRequest.imp).to.have.lengthOf(1);
        expect(ortbRequest.imp[0].bidfloor).to.not.be.null;
        expect(ortbRequest.imp[0].banner).to.not.equal(null);
        expect(ortbRequest.imp[0].banner.w).to.equal(300);
        expect(ortbRequest.imp[0].banner.h).to.equal(250);
        expect(ortbRequest.imp[0].banner.mimes).to.equal(undefined);
        expect(ortbRequest.imp[0].banner.btype).to.equal(undefined);
        expect(ortbRequest.imp[0].banner.pos).to.equal(undefined);
        expect(ortbRequest.imp[0].banner.battr).to.equal(undefined);
      });

      it('should populate optional banner parameters', function () {
        const bidRequests = [
          {
            bidder: 'somo',
            mediaTypes: {
              banner: {
                sizes: [[300, 200]]
              }
            },
            mediaType: 'banner',
            params: {
              placementId: 'test',
              banner: {
                mimes: 'video/mp4',
                btype: '4',
                pos: '1',
                battr: 'ibv',
              }
            }
          }
        ];
        const request = spec.buildRequests(bidRequests);
        const ortbRequest = request[0].data;
        expect(ortbRequest.imp[0].banner).to.not.equal(null);
        expect(ortbRequest.imp[0].banner.w).to.equal(300);
        expect(ortbRequest.imp[0].banner.h).to.equal(200);
        expect(ortbRequest.imp[0].banner.mimes).to.equal('video/mp4');
        expect(ortbRequest.imp[0].banner.btype).to.equal('4');
        expect(ortbRequest.imp[0].banner.pos).to.equal('1');
        expect(ortbRequest.imp[0].banner.battr).to.equal('ibv');
      });
    });

    describe('buildVideoRequests', function () {
      it('should properly build a video request with sizes defined', function () {
        const bidRequests = [{
          bidder: 'somo',
          mediaTypes: {
            video: {
              sizes: [200, 300]
            }
          },
          params: {
            placementId: 'test'
          }
        }];

        const bidderRequest = {
          refererInfo: {
            referer: 'https://www.test.com/page?var=val',
            canonicalUrl: 'https://www.test.com/page'
          }
        };

        const request = spec.buildRequests(bidRequests, bidderRequest);
        const ortbRequest = request[0].data;
        expect(ortbRequest.site).to.not.equal(null);
        expect(ortbRequest.site.ref).to.equal('https://www.test.com/page?var=val');
        expect(ortbRequest.site.page).to.equal('https://www.test.com/page');
        expect(ortbRequest.site.domain).to.not.be.undefined;
        expect(ortbRequest.imp).to.have.lengthOf(1);
        expect(ortbRequest.imp[0].video).to.not.equal(null);
        expect(ortbRequest.imp[0].video.w).to.equal(200);
        expect(ortbRequest.imp[0].video.h).to.equal(300);
      });

      it('should properly build a video request with sizes defined in 2d array', function () {
        const bidRequests = [{
          bidder: 'somo',
          mediaTypes: {
            video: {
              sizes: [[200, 300]]
            }
          },
          params: {
            placementId: 'test'
          }
        }];

        const bidderRequest = {
          refererInfo: {
            referer: 'https://www.test.com/page?var=val',
            canonicalUrl: 'https://www.test.com/page'
          }
        };

        const request = spec.buildRequests(bidRequests, bidderRequest);
        const ortbRequest = request[0].data;
        expect(ortbRequest.site).to.not.equal(null);
        expect(ortbRequest.site.ref).to.equal('https://www.test.com/page?var=val');
        expect(ortbRequest.site.page).to.equal('https://www.test.com/page');
        expect(ortbRequest.site.domain).to.not.be.undefined;
        expect(ortbRequest.imp).to.have.lengthOf(1);
        expect(ortbRequest.imp[0].video).to.not.equal(null);
        expect(ortbRequest.imp[0].video.w).to.equal(200);
        expect(ortbRequest.imp[0].video.h).to.equal(300);
      });
      it('should properly build a video request with sizes not defined', function () {
        const bidRequests = [{
          bidder: 'somo',
          mediaType: 'video',
          params: {
            placementId: 'test'
          }
        }];
        const request = spec.buildRequests(bidRequests);
        const ortbRequest = request[0].data;
        expect(ortbRequest.imp).to.have.lengthOf(1);
        expect(ortbRequest.imp[0].video).to.not.equal(null);
        expect(ortbRequest.imp[0].video.mimes).to.equal(undefined);
        expect(ortbRequest.imp[0].video.minduration).to.equal(undefined);
        expect(ortbRequest.imp[0].video.maxduration).to.equal(undefined);
        expect(ortbRequest.imp[0].video.protocols).to.equal(undefined);
        expect(ortbRequest.imp[0].video.startdelay).to.equal(undefined);
        expect(ortbRequest.imp[0].video.linearity).to.equal(undefined);
        expect(ortbRequest.imp[0].video.skip).to.equal(undefined);
        expect(ortbRequest.imp[0].video.delivery).to.equal(undefined);
        expect(ortbRequest.imp[0].video.pos).to.equal(undefined);
        expect(ortbRequest.imp[0].video.api).to.equal(undefined);
        expect(ortbRequest.imp[0].video.battr).to.equal(undefined);
      });

      it('should populate optional video parameters', function () {
        const bidRequests = [
          {
            bidder: 'somo',
            mediaTypes: {
              video: {
                sizes: [[200, 300]]
              }
            },
            params: {
              placementId: 'test',
              video: {
                mimes: 'video/mp4',
                minduration: '15',
                maxduration: '30',
                protocols: 'mp4',
                startdelay: '0',
                linearity: 'linear',
                skip: '1',
                delivery: 'web',
                pos: '1',
                api: 'VPAID 1.0',
                battr: 'ibv',
              }
            }
          }
        ];
        const request = spec.buildRequests(bidRequests);
        const ortbRequest = request[0].data;
        expect(ortbRequest.imp[0].video).to.not.equal(null);
        expect(ortbRequest.imp[0].video.w).to.equal(200);
        expect(ortbRequest.imp[0].video.h).to.equal(300);
        expect(ortbRequest.imp[0].video.mimes).to.equal('video/mp4');
        expect(ortbRequest.imp[0].video.minduration).to.equal('15');
        expect(ortbRequest.imp[0].video.maxduration).to.equal('30');
        expect(ortbRequest.imp[0].video.protocols).to.equal('mp4');
        expect(ortbRequest.imp[0].video.startdelay).to.equal('0');
        expect(ortbRequest.imp[0].video.linearity).to.equal('linear');
        expect(ortbRequest.imp[0].video.skip).to.equal('1');
        expect(ortbRequest.imp[0].video.delivery).to.equal('web');
        expect(ortbRequest.imp[0].video.pos).to.equal('1');
        expect(ortbRequest.imp[0].video.api).to.equal('VPAID 1.0');
        expect(ortbRequest.imp[0].video.battr).to.equal('ibv');
      });
    });

    describe('buildSiteRequests', function () {
      it('should fill in basic site parameters', function () {
        const bidRequests = [{
          bidder: 'somo',
          params: {
            placementId: 'test'
          }
        }];

        const bidderRequest = {
          refererInfo: {
            referer: 'https://www.test.com/page?var=val',
            canonicalUrl: 'https://www.test.com/page'
          }
        };

        const request = spec.buildRequests(bidRequests, bidderRequest);
        const ortbRequest = request[0].data;
        expect(ortbRequest.app).to.equal(null);
        expect(ortbRequest.site).to.not.equal(null);
        expect(ortbRequest.site.ref).to.equal('https://www.test.com/page?var=val');
        expect(ortbRequest.site.page).to.equal('https://www.test.com/page');
        expect(ortbRequest.site.domain).to.not.be.undefined;
      });

      it('should fill in optional site parameters', function () {
        const bidRequests = [{
          bidder: 'somo',
          params: {
            placementId: 'test',
            site: {
              domain: 'somoaudience.com',
              name: 'Somo Audience',
              cat: 'IAB-25',
              keywords: 'unit testing',
              content: 'Unit Testing'
            }
          }
        }];
        const request = spec.buildRequests(bidRequests);
        const ortbRequest = request[0].data;
        expect(ortbRequest.app).to.equal(null);
        expect(ortbRequest.site).to.not.equal(null);
        expect(ortbRequest.site.name).to.equal('Somo Audience');
        expect(ortbRequest.site.domain).to.equal('somoaudience.com');
        expect(ortbRequest.site.cat).to.equal('IAB-25');
        expect(ortbRequest.site.keywords).to.equal('unit testing');
        expect(ortbRequest.site.content).to.equal('Unit Testing');
      })
    });

    describe('buildAppRequests', function () {
      it('should fill in app parameters', function () {
        const bidRequests = [{
          bidder: 'somo',
          params: {
            placementId: 'test',
            app: {
              bundle: 'com.somoaudience.apps',
              storeUrl: 'http://somoaudience.com/apps',
              domain: 'somoaudience.com',
              name: 'Generic SomoAudience App 5',
              cat: 'IAB-25',
              keywords: 'unit testing',
              content: 'Unit Testing',
              ver: '5.423-s',
            }
          }
        }];
        const request = spec.buildRequests(bidRequests);
        const ortbRequest = request[0].data;
        expect(ortbRequest.site).to.equal(null);
        expect(ortbRequest.app).to.not.be.null;
        expect(ortbRequest.app.bundle).to.equal('com.somoaudience.apps');
        expect(ortbRequest.app.storeUrl).to.equal('http://somoaudience.com/apps');
        expect(ortbRequest.app.domain).to.equal('somoaudience.com');
        expect(ortbRequest.app.name).to.equal('Generic SomoAudience App 5');
        expect(ortbRequest.app.ver).to.equal('5.423-s');
        expect(ortbRequest.app.cat).to.equal('IAB-25');
        expect(ortbRequest.app.keywords).to.equal('unit testing');
        expect(ortbRequest.app.content).to.equal('Unit Testing');
      });
    });

    describe('buildGDPRRequests', function () {
      const bidderRequest = {
        gdprConsent: {
          gdprApplies: true,
          consentString: 'test'
        },
      };

      it('should properly build request with gdpr consent', function () {
        const bidRequests = [{
          bidder: 'somo',
          params: {
            placementId: 'test'
          }
        }];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const ortbRequest = request[0].data;
        expect(ortbRequest.reqs).to.not.equal(undefined);
        expect(ortbRequest.reqs.ext).to.not.equal(undefined);
        expect(ortbRequest.reqs.ext.gdpr).to.equal(true);
        expect(ortbRequest.user).to.not.equal(undefined);
        expect(ortbRequest.user.ext).to.not.equal(undefined);
        expect(ortbRequest.user.ext.consent).to.equal('test');
      });
      it('should properly build request with gdpr not applies', function () {
        bidderRequest.gdprConsent.gdprApplies = false;
        const bidRequests = [{
          bidder: 'somo',
          params: {
            placementId: 'test'
          }
        }];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const ortbRequest = request[0].data;
        expect(ortbRequest.reqs).to.not.equal(undefined);
        expect(ortbRequest.reqs.ext).to.not.equal(undefined);
        expect(ortbRequest.reqs.ext.gdpr).to.equal(false);
        expect(ortbRequest.user).to.not.equal(undefined);
        expect(ortbRequest.user.ext).to.not.equal(undefined);
        expect(ortbRequest.user.ext.consent).to.equal('test');
      });
    });

    describe('buildExtraArgsRequests', function () {
      it('should populate optional parameters', function () {
        const bidRequests = [
          {
            bidder: 'somo',
            params: {
              placementId: 'test',
              bcat: ['IAB-2', 'IAB-7'],
              badv: ['somoaudience.com', 'mobileadtrading.com'],
              bidfloor: '0.05',
            },
          }
        ];
        const request = spec.buildRequests(bidRequests);
        const ortbRequest = request[0].data;
        expect(ortbRequest.imp[0].bidfloor).to.not.be.null;
        expect(ortbRequest.imp[0].bidfloor).to.be.equal('0.05');
        expect(ortbRequest.bcat).to.not.be.null;
        expect(ortbRequest.bcat).to.have.lengthOf(2);
        expect(ortbRequest.bcat).to.contain('IAB-2');
        expect(ortbRequest.badv).to.not.be.null;
        expect(ortbRequest.badv).to.have.lengthOf(2);
        expect(ortbRequest.badv).to.contain('somoaudience.com');
      });
    });
  });

  describe('interpretResponse', function () {
    it('Verify banner parse response', function () {
      const bidRequests = [
        {
          bidder: 'somo',
          params: {
            placementId: 'test',
          },
          bidId: '234234234',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const ortbRequest = request[0].data;
      const ortbResponse = {
        seatbid: [{
          bid: [{
            impid: ortbRequest.imp[0].id,
            price: 1.25,
            adm: 'Somo Test Ad'
          }],
          bidId: '234234234'
        }]
      };
      const bids = spec.interpretResponse({ body: ortbResponse }, {bidRequest: bidRequests[0]});
      const bid = bids[0];
      expect(bid.cpm).to.equal(1.25);
      expect(bid.ad).to.equal('Somo Test Ad');
    });

    it('Verify video parse response', function () {
      const bidRequests = [
        {
          bidder: 'somo',
          mediaTypes: {
            video: {
            }
          },
          params: {
            placementId: 'test',
          },
          bidId: '234234234',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const ortbRequest = request[0].data;
      const ortbResponse = {
        seatbid: [{
          bid: [{
            impid: ortbRequest.imp[0].id,
            price: 1.25,
            adm: 'Somo Test Ad'
          }],
          bidId: '234234234'
        }]
      };
      const bids = spec.interpretResponse({ body: ortbResponse }, {bidRequest: bidRequests[0]});
      const bid = bids[0];
      expect(bid.cpm).to.equal(1.25);
      expect(bid.vastXml).to.equal('Somo Test Ad');
    });
  });

  describe('user sync', function () {
    it('should register the pixel sync url', function () {
      let syncs = spec.getUserSyncs({
        pixelEnabled: true
      });
      expect(syncs).to.not.be.an('undefined');
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');
    });

    it('should pass gdpr params', function () {
      let syncs = spec.getUserSyncs({ pixelEnabled: true }, {}, {
        gdprApplies: false, consentString: 'test'
      });
      expect(syncs).to.not.be.an('undefined');
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.contains('gdpr=0');
    });

    it('should pass gdpr applies params', function () {
      let syncs = spec.getUserSyncs({ pixelEnabled: true }, {}, {
        gdprApplies: true, consentString: 'test'
      });
      expect(syncs).to.not.be.an('undefined');
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.contains('gdpr=1');
      expect(syncs[0].url).to.contains('gdpr_consent=test');
    });
  });
});
