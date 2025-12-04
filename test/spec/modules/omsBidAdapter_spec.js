import {expect} from 'chai';
import * as utils from 'src/utils.js';
import {spec} from 'modules/omsBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory.js';
import * as winDimensions from 'src/utils/winDimensions.js';

const URL = 'https://rt.marphezis.com/hb';

describe('omsBidAdapter', function () {
  const adapter = newBidder(spec);
  let element, win;
  let bidRequests;
  let sandbox;

  beforeEach(function () {
    element = {
      x: 0,
      y: 0,

      width: 0,
      height: 0,

      getBoundingClientRect: () => {
        return {
          width: element.width,
          height: element.height,

          left: element.x,
          top: element.y,
          right: element.x + element.width,
          bottom: element.y + element.height
        };
      }
    };
    win = {
      document: {
        visibilityState: 'visible'
      },
      location: {
        href: "http:/location"
      },
      innerWidth: 800,
      innerHeight: 600
    };
    bidRequests = [{
      'bidder': 'oms',
      'params': {
        'publisherId': 1234567
      },
      'adUnitCode': 'adunit-code',
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250], [300, 600]]
        }
      },
      'bidId': '5fb26ac22bde4',
      'bidderRequestId': '4bf93aeb730cb9',
      'auctionId': 'ffe9a1f7-7b67-4bda-a8e0-9ee5dc9f442e',
      'ortb2': {
        'source': {
          'ext': {
            'schain': {
              'ver': '1.0',
              'complete': 1,
              'nodes': [
                {
                  'asi': 'exchange1.com',
                  'sid': '1234',
                  'hp': 1,
                  'rid': 'bid-request-1',
                  'name': 'publisher',
                  'domain': 'publisher.com'
                }
              ]
            }
          }
        }
      },
    }];

    sandbox = sinon.createSandbox();
    sandbox.stub(document, 'getElementById').withArgs('adunit-code').returns(element);
    sandbox.stub(utils, 'getWindowTop').returns(win);
    sandbox.stub(utils, 'getWindowSelf').returns(win);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('isBidRequestValid', function () {
    const bid = {
      'bidder': 'oms',
      'params': {
        'publisherId': 1234567
      },
      'adUnitCode': 'adunit-code',
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250], [300, 600]]
        }
      },
      'bidId': '5fb26ac22bde4',
      'bidderRequestId': '4bf93aeb730cb9',
      'auctionId': 'ffe9a1f7-7b67-4bda-a8e0-9ee5dc9f442e',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when publisherId not passed correctly', function () {
      bid.params.publisherId = undefined;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when require params are not passed', function () {
      const invalidBid = Object.assign({}, bid);
      invalidBid.params = {};
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('sends bid request to our endpoint via POST', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.method).to.equal('POST');
    });

    it('request url should match our endpoint url', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(URL);
    });

    it('sets the proper banner object', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
    });

    it('sets the proper video object when ad unit media type is video', function () {
      const bidRequests = [
        {
          'bidder': 'oms',
          'params': {
            'publisherId': 1234567
          },
          'adUnitCode': 'adunit-code',
          'mediaTypes': {
            'video': {
              'context': 'instream',
              'playerSize': [640, 480]
            }
          },
          'bidId': '5fb26ac22bde4',
          'bidderRequestId': '4bf93aeb730cb9',
          'auctionId': 'ffe9a1f7-7b67-4bda-a8e0-9ee5dc9f442e',
          'ortb2': {
            'source': {
              'ext': {
                'schain': {
                  'ver': '1.0',
                  'complete': 1,
                  'nodes': [
                    {
                      'asi': 'exchange1.com',
                      'sid': '1234',
                      'hp': 1,
                      'rid': 'bid-request-1',
                      'name': 'publisher',
                      'domain': 'publisher.com'
                    }
                  ]
                }
              }
            }
          },
        }
      ]
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].video.context).to.equal('instream');
      expect(payload.imp[0].video.playerSize).to.deep.equal([640, 480]);
    });

    it('accepts a single array as a size', function () {
      bidRequests[0].mediaTypes.banner.sizes = [300, 250];
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}]);
    });

    it('sends bidfloor param if present', function () {
      bidRequests[0].params.bidFloor = 0.05;
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].bidfloor).to.equal(0.05);
    });

    it('sends tagid', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].tagid).to.equal('adunit-code');
    });

    it('sends publisher id', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data);
      expect(payload.site.publisher.id).to.equal(1234567);
    });

    it('sends gdpr info if exists', function () {
      const consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      const bidderRequest = {
        'bidderCode': 'oms',
        'auctionId': '1d1a030790a437',
        'bidderRequestId': '22edbae2744bf5',
        'timeout': 3000,
        gdprConsent: {
          consentString: consentString,
          gdprApplies: true
        },
        refererInfo: {
          page: 'http://example.com/page.html',
          domain: 'example.com',
        }
      };
      bidderRequest.bids = bidRequests;

      const data = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);

      expect(data.regs.gdpr).to.exist.and.to.be.a('number');
      expect(data.regs.gdpr).to.equal(1);
      expect(data.user.consent).to.exist.and.to.be.a('string');
      expect(data.user.consent).to.equal(consentString);
    });

    it('sends usp info if exists', function () {
      const uspConsent = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      const bidderRequest = {
        'bidderCode': 'oms',
        'auctionId': '1d1a030790a437',
        'bidderRequestId': '22edbae2744bf5',
        'timeout': 3000,
        uspConsent,
        refererInfo: {
          page: 'http://example.com/page.html',
          domain: 'example.com',
        }
      };
      bidderRequest.bids = bidRequests;

      const data = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);

      expect(data.regs.us_privacy).to.exist.and.to.be.a('string');
      expect(data.regs.us_privacy).to.equal(uspConsent);
    });

    it('sends coppa', function () {
      const data = JSON.parse(spec.buildRequests(bidRequests, {ortb2: {regs: {coppa: 1}}}).data)
      expect(data.regs).to.not.be.undefined;
      expect(data.regs.coppa).to.equal(1);
    });

    it('sends schain', function () {
      const data = JSON.parse(spec.buildRequests(bidRequests).data);
      expect(data).to.not.be.undefined;
      expect(data.source).to.not.be.undefined;
      expect(data.source.ext).to.not.be.undefined;
      expect(data.source.ext.schain).to.not.be.undefined;
      expect(data.source.ext.schain.complete).to.equal(1);
      expect(data.source.ext.schain.ver).to.equal('1.0');
      expect(data.source.ext.schain.nodes).to.not.be.undefined;
      expect(data.source.ext.schain.nodes).to.lengthOf(1);
      expect(data.source.ext.schain.nodes[0].asi).to.equal('exchange1.com');
      expect(data.source.ext.schain.nodes[0].sid).to.equal('1234');
      expect(data.source.ext.schain.nodes[0].hp).to.equal(1);
      expect(data.source.ext.schain.nodes[0].rid).to.equal('bid-request-1');
      expect(data.source.ext.schain.nodes[0].name).to.equal('publisher');
      expect(data.source.ext.schain.nodes[0].domain).to.equal('publisher.com');
    });

    it('sends user eid parameters', function () {
      bidRequests[0].userIdAsEids = [{
        source: 'pubcid.org',
        uids: [{
          id: 'userid_pubcid'
        }]
      }, {
        source: 'adserver.org',
        uids: [{
          id: 'userid_ttd',
          ext: {
            rtiPartner: 'TDID'
          }
        }]
      }
      ];

      const data = JSON.parse(spec.buildRequests(bidRequests).data);

      expect(data.user).to.not.be.undefined;
      expect(data.user.ext).to.not.be.undefined;
      expect(data.user.ext.eids).to.not.be.undefined;
      expect(data.user.ext.eids).to.deep.equal(bidRequests[0].userIdAsEids);
    });

    it('sends gpid parameters', function () {
      bidRequests[0].ortb2Imp = {
        'ext': {
          'gpid': '/1111/home-left',
          'data': {
            'adserver': {
              'name': 'gam',
              'adslot': '/1111/home'
            },
            'pbadslot': '/1111/home-left'
          }
        }
      }

      const data = JSON.parse(spec.buildRequests(bidRequests).data);
      expect(data.imp[0].ext).to.not.be.undefined;
      expect(data.imp[0].ext.gpid).to.not.be.undefined;
      expect(data.imp[0].ext.adserverName).to.not.be.undefined;
      expect(data.imp[0].ext.adslot).to.not.be.undefined;
      expect(data.imp[0].ext.pbadslot).to.not.be.undefined;
    });

    context('when element is fully in view', function () {
      it('returns 100', function () {
        Object.assign(element, {width: 600, height: 400});
        const request = spec.buildRequests(bidRequests);
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].banner.ext.viewability).to.equal(100);
      });
    });

    context('when element is out of view', function () {
      it('returns 0', function () {
        Object.assign(element, {x: -300, y: 0, width: 207, height: 320});
        const request = spec.buildRequests(bidRequests);
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].banner.ext.viewability).to.equal(0);
      });
    });

    context('when element is partially in view', function () {
      it('returns percentage', function () {
        const getWinDimensionsStub = sandbox.stub(winDimensions, 'getWinDimensions')
        getWinDimensionsStub.returns({ innerHeight: win.innerHeight, innerWidth: win.innerWidth });
        Object.assign(element, {width: 800, height: 800});
        const request = spec.buildRequests(bidRequests);
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].banner.ext.viewability).to.equal(75);
      });
    });

    context('when width or height of the element is zero', function () {
      it('try to use alternative values', function () {
        const getWinDimensionsStub = sandbox.stub(winDimensions, 'getWinDimensions')
        getWinDimensionsStub.returns({ innerHeight: win.innerHeight, innerWidth: win.innerWidth });
        Object.assign(element, {width: 0, height: 0});
        bidRequests[0].mediaTypes.banner.sizes = [[800, 2400]];
        const request = spec.buildRequests(bidRequests);
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].banner.ext.viewability).to.equal(25);
      });
    });

    context('when nested iframes', function () {
      it('returns \'na\'', function () {
        Object.assign(element, {width: 600, height: 400});

        utils.getWindowTop.restore();
        utils.getWindowSelf.restore();
        sandbox.stub(utils, 'getWindowTop').returns(win);
        sandbox.stub(utils, 'getWindowSelf').returns({});

        const request = spec.buildRequests(bidRequests);
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].banner.ext.viewability).to.equal('na');
      });
    });

    context('when tab is inactive', function () {
      it('returns 0', function () {
        Object.assign(element, {width: 600, height: 400});

        utils.getWindowTop.restore();
        win.document.visibilityState = 'hidden';
        sandbox.stub(utils, 'getWindowTop').returns(win);

        const request = spec.buildRequests(bidRequests);
        const payload = JSON.parse(request.data);
        expect(payload.imp[0].banner.ext.viewability).to.equal(0);
      });
    });
  });

  describe('interpretResponse', function () {
    let response;
    beforeEach(function () {
      response = {
        body: {
          'id': '37386aade21a71',
          'seatbid': [{
            'bid': [{
              'id': '376874781',
              'impid': '283a9f4cd2415d',
              'price': 0.35743275,
              'nurl': '<!-- NURL -->',
              'adm': '<!-- Creative -->',
              'w': 300,
              'h': 250,
              'adomain': ['example.com']
            }]
          }]
        }
      };
    });

    it('should get the correct bid response', function () {
      const expectedResponse = [{
        'requestId': '283a9f4cd2415d',
        'cpm': 0.35743275,
        'width': 300,
        'height': 250,
        'creativeId': '376874781',
        'currency': 'USD',
        'netRevenue': true,
        'mediaType': 'banner',
        'ad': `<!-- Creative --><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="${encodeURI('<!-- NURL -->')}"></div>`,
        'ttl': 300,
        'meta': {
          'advertiserDomains': ['example.com']
        }
      }];

      const result = spec.interpretResponse(response);
      expect(result[0]).to.deep.equal(expectedResponse[0]);
    });

    it('should get the correct bid response for video bids', function () {
      const expectedResponse = [{
        'requestId': '283a9f4cd2415d',
        'cpm': 0.35743275,
        'width': 300,
        'height': 250,
        'creativeId': '376874781',
        'currency': 'USD',
        'netRevenue': true,
        'mediaType': 'video',
        'ad': `<!-- Creative --><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="${encodeURI('<!-- NURL -->')}"></div>`,
        'ttl': 300,
        'meta': {
          'advertiserDomains': ['example.com']
        }
      }];
      const response = {
        body: {
          'id': '37386aade21a71',
          'seatbid': [{
            'bid': [{
              'id': '376874781',
              'impid': '283a9f4cd2415d',
              'price': 0.35743275,
              'nurl': '<!-- NURL -->',
              'adm': '<!-- Creative -->',
              'w': 300,
              'h': 250,
              'adomain': ['example.com'],
              'mtype': 2
            }]
          }]
        }
      };

      const result = spec.interpretResponse(response);
      expect(result[0]).to.deep.equal(expectedResponse[0]);
    });

    it('crid should default to the bid id if not on the response', function () {
      const expectedResponse = [{
        'requestId': '283a9f4cd2415d',
        'cpm': 0.35743275,
        'width': 300,
        'height': 250,
        'creativeId': response.body.seatbid[0].bid[0].id,
        'currency': 'USD',
        'netRevenue': true,
        'mediaType': 'banner',
        'ad': `<!-- Creative --><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="${encodeURI('<!-- NURL -->')}"></div>`,
        'ttl': 300,
        'meta': {
          'advertiserDomains': ['example.com']
        }
      }];

      const result = spec.interpretResponse(response);
      expect(result[0]).to.deep.equal(expectedResponse[0]);
    });

    it('handles empty bid response', function () {
      const response = {
        body: ''
      };
      const result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs ', () => {
    const syncOptions = { iframeEnabled: true };
    const userSyncUrlIframe = 'https://rt.marphezis.com/sync?dpid=0';

    it('returns empty syncs arr when syncOptions.iframeEnabled is false', () => {
      expect(spec.getUserSyncs({ iframeEnabled: false }, {}, undefined, undefined)).to.be.empty;
    });

    it('returns syncs arr when syncOptions.iframeEnabled is true', () => {
      expect(spec.getUserSyncs(syncOptions, {}, undefined, undefined)).to.deep.equal([{
        type: 'iframe',
        url: userSyncUrlIframe
      }]);
    });

    it('should pass gdpr param when gdprConsent.gdprApplies type is boolean', () => {
      expect(spec.getUserSyncs(syncOptions, {}, { gdprApplies: true }, undefined)).to.deep.equal([{
        type: 'iframe',
        url: `${userSyncUrlIframe}&gdpr=1`
      }]);
      expect(spec.getUserSyncs(syncOptions, {}, { gdprApplies: false }, undefined)).to.deep.equal([{
        type: 'iframe',
        url: `${userSyncUrlIframe}&gdpr=0`
      }]);
    });

    it('should pass gdpr_consent param when gdprConsent.consentString type is string', () => {
      expect(spec.getUserSyncs(syncOptions, {}, { gdprApplies: false, consentString: 'test' }, undefined)).to.deep.equal([{
        type: 'iframe',
        url: `${userSyncUrlIframe}&gdpr=0&gdpr_consent=test`
      }]);
    });

    it('should pass no params when gdprConsent.consentString and gdprConsent.gdprApplies types dont match', () => {
      expect(spec.getUserSyncs(syncOptions, {}, { gdprApplies: 'true', consentString: 1 }, undefined)).to.deep.equal([{
        type: 'iframe',
        url: `${userSyncUrlIframe}`
      }]);
    });

    it('should pass us_privacy param when uspConsent is defined', function () {
      expect(spec.getUserSyncs(syncOptions, {}, undefined, 'test')).to.deep.equal([{
        type: 'iframe', url: `${userSyncUrlIframe}&us_privacy=test`
      }]);
    });

    it('should pass gpp and gpp_sid params when gppConsent.gppString is defined', function () {
      expect(spec.getUserSyncs(syncOptions, {}, {}, undefined, {
        gppString: 'test',
        applicableSections: [1, 2]
      })).to.deep.equal([{
        type: 'iframe', url: `${userSyncUrlIframe}&gpp=test&gpp_sid=1,2`
      }]);
    });

    it('should pass all params correctly', function () {
      expect(spec.getUserSyncs(syncOptions, {}, { gdprApplies: false, consentString: 'test' }, 'test', {
        gppString: 'test',
        applicableSections: []
      })).to.deep.equal([{
        type: 'iframe', url: `${userSyncUrlIframe}&gdpr=0&gdpr_consent=test&us_privacy=test&gpp=test&gpp_sid=`
      }]);
    });
  });
});
