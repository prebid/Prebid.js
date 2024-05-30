import { expect } from 'chai';
import { getTimeoutUrl, spec } from 'modules/seedtagBidAdapter.js';
import * as utils from 'src/utils.js';
import * as mockGpt from 'test/spec/integration/faker/googletag.js';
import { config } from '../../../src/config.js';

const PUBLISHER_ID = '0000-0000-01';
const ADUNIT_ID = '000000';

const adUnitCode = '/19968336/header-bid-tag-0'

// create a default adunit
const slot = document.createElement('div');
slot.id = adUnitCode;
slot.style.width = '300px'
slot.style.height = '250px'
slot.style.position = 'absolute'
slot.style.top = '10px'
slot.style.left = '20px'

document.body.appendChild(slot);

function getSlotConfigs(mediaTypes, params) {
  return {
    params: params,
    sizes: [
      [300, 250],
      [300, 600],
    ],
    bidId: '30b31c1838de1e',
    bidderRequestId: '22edbae2733bf6',
    auctionId: '1d1a030790a475',
    bidRequestsCount: 1,
    bidder: 'seedtag',
    mediaTypes: mediaTypes,
    src: 'client',
    ortb2Imp: {
      ext: {
        tid: 'd704d006-0d6e-4a09-ad6c-179e7e758096',
      }
    },
    adUnitCode: adUnitCode,
  };
}

function createInStreamSlotConfig(mediaType) {
  return getSlotConfigs(mediaType, {
    publisherId: PUBLISHER_ID,
    adUnitId: ADUNIT_ID,
    placement: 'inStream',
  });
}

const createBannerSlotConfig = (placement, mediatypes) => {
  return getSlotConfigs(mediatypes || { banner: {} }, {
    publisherId: PUBLISHER_ID,
    adUnitId: ADUNIT_ID,
    placement,
  });
};

describe('Seedtag Adapter', function () {
  beforeEach(function () {
    mockGpt.reset();
  });

  afterEach(function () {
    mockGpt.enable();
  });
  describe('isBidRequestValid method', function () {
    describe('returns true', function () {
      describe('when banner slot config has all mandatory params', () => {
        const placements = ['inBanner', 'inImage', 'inScreen', 'inArticle'];
        placements.forEach((placement) => {
          it(placement + 'should be valid', function () {
            const isBidRequestValid = spec.isBidRequestValid(
              createBannerSlotConfig(placement)
            );
            expect(isBidRequestValid).to.equal(true);
          });

          it(
            placement +
              ' should be valid when has display and video mediatypes, and video context is outstream',
            function () {
              const isBidRequestValid = spec.isBidRequestValid(
                createBannerSlotConfig(placement, {
                  banner: {},
                  video: {
                    context: 'outstream',
                    playerSize: [[600, 200]],
                  },
                })
              );
              expect(isBidRequestValid).to.equal(true);
            }
          );

          it(
            placement +
              " shouldn't be valid when has display and video mediatypes, and video context is instream",
            function () {
              const isBidRequestValid = spec.isBidRequestValid(
                createBannerSlotConfig(placement, {
                  banner: {},
                  video: {
                    context: 'instream',
                    playerSize: [[600, 200]],
                  },
                })
              );
              expect(isBidRequestValid).to.equal(false);
            }
          );
        });
      });
      describe('when video slot has all mandatory params', function () {
        it('should return true, when video context is instream', function () {
          const slotConfig = createInStreamSlotConfig({
            video: {
              context: 'instream',
              playerSize: [[600, 200]],
            },
          });
          const isBidRequestValid = spec.isBidRequestValid(slotConfig);
          expect(isBidRequestValid).to.equal(true);
        });
        it('should return true, when video context is instream and mediatype is video and banner', function () {
          const slotConfig = createInStreamSlotConfig({
            video: {
              context: 'instream',
              playerSize: [[600, 200]],
            },
            banner: {},
          });
          const isBidRequestValid = spec.isBidRequestValid(slotConfig);
          expect(isBidRequestValid).to.equal(true);
        });
        it('should return false, when video context is instream, but placement is not inStream', function () {
          const slotConfig = getSlotConfigs(
            {
              video: {
                context: 'instream',
                playerSize: [[600, 200]],
              },
            },
            {
              publisherId: PUBLISHER_ID,
              adUnitId: ADUNIT_ID,
              placement: 'inBanner',
            }
          );
          const isBidRequestValid = spec.isBidRequestValid(slotConfig);
          expect(isBidRequestValid).to.equal(false);
        });
        it('should return false, when video context is outstream', function () {
          const slotConfig = createInStreamSlotConfig({
            video: {
              context: 'outstream',
              playerSize: [[600, 200]],
            },
          });
          const isBidRequestValid = spec.isBidRequestValid(slotConfig);
          expect(isBidRequestValid).to.equal(false);
        });
      });
    });
    describe('returns false', function () {
      describe('when params are not correct', function () {
        function createSlotConfig(params) {
          return getSlotConfigs({ banner: {} }, params);
        }
        it('does not have the PublisherToken.', function () {
          const isBidRequestValid = spec.isBidRequestValid(
            createSlotConfig({
              adUnitId: ADUNIT_ID,
              placement: 'inBanner',
            })
          );
          expect(isBidRequestValid).to.equal(false);
        });
        it('does not have the AdUnitId.', function () {
          const isBidRequestValid = spec.isBidRequestValid(
            createSlotConfig({
              publisherId: PUBLISHER_ID,
              placement: 'inBanner',
            })
          );
          expect(isBidRequestValid).to.equal(false);
        });
        it('does not have the placement.', function () {
          const isBidRequestValid = spec.isBidRequestValid(
            createSlotConfig({
              publisherId: PUBLISHER_ID,
              adUnitId: ADUNIT_ID,
            })
          );
          expect(isBidRequestValid).to.equal(false);
        });
        it('does not have a the correct placement.', function () {
          const isBidRequestValid = spec.isBidRequestValid(
            createSlotConfig({
              publisherId: PUBLISHER_ID,
              adUnitId: ADUNIT_ID,
              placement: 'another_thing',
            })
          );
          expect(isBidRequestValid).to.equal(false);
        });
      });

      describe('when video mediaType object is not correct', function () {
        it('is a void object', function () {
          const isBidRequestValid = spec.isBidRequestValid(
            createInStreamSlotConfig({ video: {} })
          );
          expect(isBidRequestValid).to.equal(false);
        });
        it('does not have playerSize.', function () {
          const isBidRequestValid = spec.isBidRequestValid(
            createInStreamSlotConfig({ video: { context: 'instream' } })
          );
          expect(isBidRequestValid).to.equal(false);
        });
        it('is outstream ', function () {
          const isBidRequestValid = spec.isBidRequestValid(
            createInStreamSlotConfig({
              video: {
                context: 'outstream',
                playerSize: [[600, 200]],
              },
            })
          );
          expect(isBidRequestValid).to.equal(false);
        });
        describe('order does not matter', function () {
          it('when video is not the first slot', function () {
            const isBidRequestValid = spec.isBidRequestValid(
              createInStreamSlotConfig({ banner: {}, video: {} })
            );
            expect(isBidRequestValid).to.equal(false);
          });
          it('when video is the first slot', function () {
            const isBidRequestValid = spec.isBidRequestValid(
              createInStreamSlotConfig({ video: {}, banner: {} })
            );
            expect(isBidRequestValid).to.equal(false);
          });
        });
      });
    });
  });

  describe('buildRequests method', function () {
    const bidderRequest = {
      refererInfo: { page: 'referer' },
      timeout: 1000,
    };
    const mandatoryDisplayParams = {
      publisherId: PUBLISHER_ID,
      adUnitId: ADUNIT_ID,
      placement: 'inBanner',
    };
    const mandatoryVideoParams = {
      publisherId: PUBLISHER_ID,
      adUnitId: ADUNIT_ID,
      placement: 'inStream',
    };
    const validBidRequests = [
      getSlotConfigs({ banner: {} }, mandatoryDisplayParams),
      getSlotConfigs(
        {
          video: {
            context: 'instream',
            playerSize: [[300, 200]],
            mimes: ['video/mp4'],
          },
        },
        mandatoryVideoParams
      ),
    ];
    it('Url params should be correct ', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://s.seedtag.com/c/hb/bid');
    });

    it('Common data request should be correct', function () {
      const now = Date.now();
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);
      expect(data.url).to.equal('referer');
      expect(data.publisherToken).to.equal('0000-0000-01');
      expect(typeof data.version).to.equal('string');
      expect(
        ['fixed', 'mobile', 'unknown'].indexOf(data.connectionType)
      ).to.be.above(-1);
      expect(data.auctionStart).to.be.greaterThanOrEqual(now);
      expect(data.ttfb).to.be.greaterThanOrEqual(0);

      expect(data.bidRequests[0].adUnitCode).to.equal(adUnitCode);
    });

    describe('GDPR params', function () {
      describe('when there arent consent management platform', function () {
        it('cmp should be false', function () {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          const data = JSON.parse(request.data);
          expect(data.cmp).to.equal(false);
        });
      });
      describe('when there are consent management platform', function () {
        it('cmps should be true and ga should not sended, when gdprApplies is undefined', function () {
          bidderRequest['gdprConsent'] = {
            gdprApplies: undefined,
            consentString: 'consentString',
          };
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          const data = JSON.parse(request.data);
          expect(data.cmp).to.equal(true);
          expect(Object.keys(data).indexOf('data')).to.equal(-1);
          expect(data.cd).to.equal('consentString');
        });
        it('cmps should be true and all gdpr parameters should be sended, when there are gdprApplies', function () {
          bidderRequest['gdprConsent'] = {
            gdprApplies: true,
            consentString: 'consentString',
          };
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          const data = JSON.parse(request.data);
          expect(data.cmp).to.equal(true);
          expect(data.ga).to.equal(true);
          expect(data.cd).to.equal('consentString');
        });
        it('should expose gvlid', function () {
          expect(spec.gvlid).to.equal(157);
        });
        it('should handle uspConsent', function () {
          const uspConsent = '1---';

          bidderRequest['uspConsent'] = uspConsent;

          const request = spec.buildRequests(validBidRequests, bidderRequest);
          const payload = JSON.parse(request.data);

          expect(payload.uspConsent).to.exist;
          expect(payload.uspConsent).to.equal(uspConsent);
        });

        it("shouldn't send uspConsent when not available", function () {
          const uspConsent = undefined;

          bidderRequest['uspConsent'] = uspConsent;

          const request = spec.buildRequests(validBidRequests, bidderRequest);
          const payload = JSON.parse(request.data);

          expect(payload.uspConsent).to.not.exist;
        });
      });
    });

    describe('BidRequests params', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);
      const bidRequests = data.bidRequests;
      it('should request a Banner', function () {
        const bannerBid = bidRequests[0];
        expect(bannerBid.id).to.equal('30b31c1838de1e');
        expect(bannerBid.transactionId).to.equal(
          'd704d006-0d6e-4a09-ad6c-179e7e758096'
        );
        expect(bannerBid.supplyTypes[0]).to.equal('display');
        expect(bannerBid.adUnitId).to.equal('000000');
        expect(bannerBid.sizes[0][0]).to.equal(300);
        expect(bannerBid.sizes[0][1]).to.equal(250);
        expect(bannerBid.sizes[1][0]).to.equal(300);
        expect(bannerBid.sizes[1][1]).to.equal(600);
        expect(bannerBid.requestCount).to.equal(1);
      });
      it('should request an InStream Video', function () {
        const videoBid = bidRequests[1];
        expect(videoBid.id).to.equal('30b31c1838de1e');
        expect(videoBid.transactionId).to.equal(
          'd704d006-0d6e-4a09-ad6c-179e7e758096'
        );
        expect(videoBid.supplyTypes[0]).to.equal('video');
        expect(videoBid.adUnitId).to.equal('000000');
        expect(videoBid.videoParams.mimes).to.eql(['video/mp4']);
        expect(videoBid.videoParams.w).to.equal(300);
        expect(videoBid.videoParams.h).to.equal(200);
        expect(videoBid.sizes[0][0]).to.equal(300);
        expect(videoBid.sizes[0][1]).to.equal(250);
        expect(videoBid.sizes[1][0]).to.equal(300);
        expect(videoBid.sizes[1][1]).to.equal(600);
        expect(videoBid.requestCount).to.equal(1);
      });

      it('should have geom parameters if slot is available', function() {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const data = JSON.parse(request.data);
        const bidRequests = data.bidRequests;
        const bannerBid = bidRequests[0];

        // on some CI, the DOM is not initialized, so we need to check if the slot is available
        const slot = document.getElementById(adUnitCode)
        if (slot) {
          expect(bannerBid).to.have.property('geom')

          const params = [['width', 300], ['height', 250], ['top', 10], ['left', 20], ['scrollY', 0]]
          params.forEach(([param, value]) => {
            expect(bannerBid.geom).to.have.property(param)
            expect(bannerBid.geom[param]).to.be.a('number')
            expect(bannerBid.geom[param]).to.be.equal(value)
          })

          expect(bannerBid.geom).to.have.property('viewport')
          const viewportParams = ['width', 'height']
          viewportParams.forEach(param => {
            expect(bannerBid.geom.viewport).to.have.property(param)
            expect(bannerBid.geom.viewport[param]).to.be.a('number')
          })
        } else {
          expect(bannerBid).to.not.have.property('geom')
        }
      })
    });

    describe('COPPA param', function () {
      it('should add COPPA param to payload when prebid config has parameter COPPA equal to true', function () {
        config.setConfig({ coppa: true });

        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const data = JSON.parse(request.data);
        expect(data.coppa).to.equal(true);
      });

      it('should not add COPPA param to payload when prebid config has parameter COPPA equal to false', function () {
        config.setConfig({ coppa: false });

        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const data = JSON.parse(request.data);
        expect(data.coppa).to.be.undefined;
      });

      it('should not add COPPA param to payload when prebid config has not parameter COPPA', function () {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const data = JSON.parse(request.data);
        expect(data.coppa).to.be.undefined;
      });
    });
    describe('schain param', function () {
      it('should add schain to payload when exposed on validBidRequest', function () {
        // https://github.com/prebid/Prebid.js/blob/master/modules/schain.md#sample-code-for-passing-the-schain-object
        const schain = {
          ver: '1.0',
          complete: 1,
          nodes: [
            {
              asi: 'indirectseller.com',
              sid: '00001',
              hp: 1,
            },

            {
              asi: 'indirectseller-2.com',
              sid: '00002',
              hp: 1,
            },
          ],
        };

        // duplicate
        const bidRequests = JSON.parse(JSON.stringify(validBidRequests));
        bidRequests[0].schain = schain;

        const request = spec.buildRequests(bidRequests, bidderRequest);

        const payload = JSON.parse(request.data);

        expect(payload.schain).to.exist;
        expect(payload.schain).to.deep.equal(schain);
      });

      it("shouldn't add schain to payload when not exposed", function () {
        const request = spec.buildRequests(validBidRequests, bidderRequest);

        const payload = JSON.parse(request.data);

        expect(payload.schain).to.not.exist;
      });
    });

    describe('GPP param', function () {
      it('should be added to payload when bidderRequest has gppConsent param', function () {
        const gppConsent = {
          gppString: 'someGppString',
          applicableSections: [7]
        }
        bidderRequest['gppConsent'] = gppConsent
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const data = JSON.parse(request.data);
        expect(data.gppConsent).to.exist;
        expect(data.gppConsent.gppString).to.equal(gppConsent.gppString);
        expect(data.gppConsent.applicableSections[0]).to.equal(gppConsent.applicableSections[0]);
      });

      it('should be undefined on payload when bidderRequest has not gppConsent param', function () {
        bidderRequest.gppConsent = undefined
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const data = JSON.parse(request.data);
        expect(data.gppConsent).to.be.undefined;
      });

      it('should be added to payload when bidderRequest has ortb2 param', function () {
        const ortb2 = {
          regs: {
            gpp: 'someGppString',
            gpp_sid: [7]
          }
        }
        bidderRequest['gppConsent'] = undefined
        bidderRequest['ortb2'] = ortb2;
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const data = JSON.parse(request.data);
        expect(data.gppConsent).to.exist;
        expect(data.gppConsent.gppString).to.equal(ortb2.regs.gpp);
        expect(data.gppConsent.applicableSections[0]).to.equal(ortb2.regs.gpp_sid[0]);
      });

      it('should be added to payload when bidderRequest has neither gppConsent nor ortb2', function () {
        bidderRequest['ortb2'] = undefined;
        bidderRequest['gppConsent'] = undefined;
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const data = JSON.parse(request.data);
        expect(data.gppConsent).to.be.undefined;
      });
    });

    describe('User param', function () {
      it('should be added to payload user data param when bidderRequest has ortb2 user info', function () {
        var ortb2 = {

          user: {

            data: [
              {
                ext: {
                  segtax: 601,
                  segclass: '4'
                },
                segment: [
                  {
                    id: '149'
                  }
                ],
                name: 'randomname'
              }

            ]
          }
        }
        bidderRequest['ortb2'] = ortb2
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const data = JSON.parse(request.data);

        expect(data.user).to.exist;
        expect(data.user.topics).to.exist;
        expect(data.user.topics).to.be.an('array').that.is.not.empty;
        expect(data.user.topics[0].ext).to.eql(ortb2.user.data[0].ext);
        expect(data.user.topics[0].segment).to.eql(ortb2.user.data[0].segment);
        expect(data.user.topics[0].name).to.eql(ortb2.user.data[0].name);
      })

      it('should be added to payload user eids param when validRequest has userId info', function () {
        var userIdAsEids = [{
          source: 'sourceid',
          uids: [{
            atype: 1,
            id: 'randomId'
          }]
        }]
        validBidRequests[0]['userIdAsEids'] = userIdAsEids
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const data = JSON.parse(request.data);

        expect(data.user).to.exist;
        expect(data.user.eids).to.exist;
        expect(data.user.eids).to.be.an('array').that.is.not.empty;
        expect(data.user.eids).to.deep.equal(userIdAsEids);
      })
    });

    describe('Blocking params', function () {
      it('should add bcat param to payload when bidderRequest has ortb2 bcat info', function () {
        const blockedCategories = ['IAB1', 'IAB2']
        var ortb2 = {
          bcat: blockedCategories
        }
        bidderRequest['ortb2'] = ortb2

        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const data = JSON.parse(request.data);
        expect(data.bcat).to.deep.equal(blockedCategories);
      });

      it('should add badv param to payload when bidderRequest has ortb2 badv info', function () {
        const blockedAdvertisers = ['blocked.com']
        var ortb2 = {
          badv: blockedAdvertisers
        }
        bidderRequest['ortb2'] = ortb2

        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const data = JSON.parse(request.data);
        expect(data.badv).to.deep.equal(blockedAdvertisers);
      });

      it('should not add bcat and badv params to payload when bidderRequest does not have ortb2 badv and bcat info', function () {
        var ortb2 = {}
        bidderRequest['ortb2'] = ortb2

        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const data = JSON.parse(request.data);
        expect(data.bcat).to.be.undefined;
        expect(data.badv).to.be.undefined;
      });
    });
  })
  describe('interpret response method', function () {
    it('should return a void array, when the server response are not correct.', function () {
      const request = { data: JSON.stringify({}) };
      const serverResponse = {
        body: {},
      };
      const bids = spec.interpretResponse(serverResponse, request);
      expect(typeof bids).to.equal('object');
      expect(bids.length).to.equal(0);
    });
    it('should return a void array, when the server response have no bids.', function () {
      const request = { data: JSON.stringify({}) };
      const serverResponse = { body: { bids: [] } };
      const bids = spec.interpretResponse(serverResponse, request);
      expect(typeof bids).to.equal('object');
      expect(bids.length).to.equal(0);
    });
    describe('when the server response return a bid', function () {
      describe('the bid is a banner', function () {
        it('should return a banner bid', function () {
          const request = { data: JSON.stringify({}) };
          const serverResponse = {
            body: {
              bids: [
                {
                  bidId: '2159a54dc2566f',
                  price: 0.5,
                  currency: 'USD',
                  content: 'content',
                  width: 728,
                  height: 90,
                  mediaType: 'display',
                  ttl: 360,
                  nurl: 'testurl.com/nurl',
                  adomain: ['advertiserdomain.com'],
                },
              ],
              cookieSync: { url: '' },
            },
          };
          const bids = spec.interpretResponse(serverResponse, request);
          expect(bids.length).to.equal(1);
          expect(bids[0].requestId).to.equal('2159a54dc2566f');
          expect(bids[0].cpm).to.equal(0.5);
          expect(bids[0].width).to.equal(728);
          expect(bids[0].height).to.equal(90);
          expect(bids[0].currency).to.equal('USD');
          expect(bids[0].netRevenue).to.equal(true);
          expect(bids[0].ad).to.equal('content');
          expect(bids[0].nurl).to.equal('testurl.com/nurl');
          expect(bids[0].meta.advertiserDomains).to.deep.equal([
            'advertiserdomain.com',
          ]);
        });
      });
      describe('the bid is a video', function () {
        it('should return a instream bid', function () {
          const request = { data: JSON.stringify({}) };
          const serverResponse = {
            body: {
              bids: [
                {
                  bidId: '2159a54dc2566f',
                  price: 0.5,
                  currency: 'USD',
                  content: 'content',
                  width: 728,
                  height: 90,
                  mediaType: 'video',
                  ttl: 360,
                  nurl: undefined,
                },
              ],
              cookieSync: { url: '' },
            },
          };
          const bids = spec.interpretResponse(serverResponse, request);
          expect(bids.length).to.equal(1);
          expect(bids[0].requestId).to.equal('2159a54dc2566f');
          expect(bids[0].cpm).to.equal(0.5);
          expect(bids[0].width).to.equal(728);
          expect(bids[0].height).to.equal(90);
          expect(bids[0].currency).to.equal('USD');
          expect(bids[0].netRevenue).to.equal(true);
          expect(bids[0].vastXml).to.equal('content');
          expect(bids[0].meta.advertiserDomains).to.deep.equal([]);
        });
      });
    });
  });

  describe('user syncs method', function () {
    it('should return empty array, when iframe sync option are disabled.', function () {
      const syncOption = { iframeEnabled: false };
      const serverResponses = [{ body: { cookieSync: 'someUrl' } }];
      const cookieSyncArray = spec.getUserSyncs(syncOption, serverResponses);
      expect(cookieSyncArray.length).to.equal(0);
    });
    it('should return empty array, when the server response are wrong.', function () {
      const syncOption = { iframeEnabled: true };
      const serverResponses = [{ body: {} }];
      const cookieSyncArray = spec.getUserSyncs(syncOption, serverResponses);
      expect(cookieSyncArray.length).to.equal(0);
    });
    it('should return empty array, when the server response are void.', function () {
      const syncOption = { iframeEnabled: true };
      const serverResponses = [{ body: { cookieSync: '' } }];
      const cookieSyncArray = spec.getUserSyncs(syncOption, serverResponses);
      expect(cookieSyncArray.length).to.equal(0);
    });
    it('should return a array with the cookie sync, when the server response with a cookie sync.', function () {
      const syncOption = { iframeEnabled: true };
      const serverResponses = [{ body: { cookieSync: 'someUrl' } }];
      const cookieSyncArray = spec.getUserSyncs(syncOption, serverResponses);
      expect(cookieSyncArray.length).to.equal(1);
      expect(cookieSyncArray[0].type).to.equal('iframe');
      expect(cookieSyncArray[0].url).to.equal('someUrl');
    });
  });

  describe('onTimeout', function () {
    beforeEach(function () {
      sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      utils.triggerPixel.restore();
    });

    it('should return the correct endpoint', function () {
      const params = { publisherId: '0000', adUnitId: '11111' };
      const timeout = 3000;
      const timeoutData = [{ params: [params], timeout }];
      const timeoutUrl = getTimeoutUrl(timeoutData);
      expect(timeoutUrl).to.equal(
        'https://s.seedtag.com/se/hb/timeout?publisherToken=' +
        params.publisherId +
        '&adUnitId=' +
        params.adUnitId +
        '&timeout=' +
        timeout
      );
    });

    it('should set the timeout pixel', function () {
      const params = { publisherId: '0000', adUnitId: '11111' };
      const timeout = 3000;
      const timeoutData = [{ params: [params], timeout }];
      spec.onTimeout(timeoutData);
      expect(
        utils.triggerPixel.calledWith(
          'https://s.seedtag.com/se/hb/timeout?publisherToken=' +
          params.publisherId +
          '&adUnitId=' +
          params.adUnitId +
          '&timeout=' +
          timeout
        )
      ).to.equal(true);
    });
  });

  describe('onBidWon', function () {
    beforeEach(function () {
      sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      utils.triggerPixel.restore();
    });

    describe('without nurl', function () {
      const bid = {};

      it('does not create pixel ', function () {
        spec.onBidWon(bid);
        expect(utils.triggerPixel.called).to.equal(false);
      });
    });

    describe('with nurl', function () {
      const nurl = 'http://seedtag_domain/won';
      const bid = { nurl };

      it('creates nurl pixel if bid nurl', function () {
        spec.onBidWon({ nurl });
        expect(utils.triggerPixel.calledWith(nurl)).to.equal(true);
      });
    });
  });
});
