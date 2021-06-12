import { spec } from 'modules/smaatoBidAdapter.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { createEidsArray } from 'modules/userId/eids.js';

const ADTYPE_IMG = 'Img';
const ADTYPE_RICHMEDIA = 'Richmedia';
const ADTYPE_VIDEO = 'Video';

const request = {
  method: 'POST',
  url: 'https://prebid.ad.smaato.net/oapi/prebid',
  data: ''
};

const REFERRER = 'http://example.com/page.html'
const CONSENT_STRING = 'HFIDUYFIUYIUYWIPOI87392DSU'

const defaultBidderRequest = {
  gdprConsent: {
    consentString: CONSENT_STRING,
    gdprApplies: true
  },
  uspConsent: 'uspConsentString',
  refererInfo: {
    referer: REFERRER,
  },
  timeout: 1200
};

const minimalBidderRequest = {
  refererInfo: {
    referer: REFERRER,
  }
};

const singleBannerBidRequest = {
  bidder: 'smaato',
  params: {
    publisherId: 'publisherId',
    adspaceId: 'adspaceId'
  },
  mediaTypes: {
    banner: {
      sizes: [[300, 50]]
    }
  },
  adUnitCode: '/19968336/header-bid-tag-0',
  transactionId: 'transactionId',
  sizes: [[300, 50]],
  bidId: 'bidId',
  bidderRequestId: 'bidderRequestId',
  auctionId: 'auctionId',
  src: 'client',
  bidRequestsCount: 1,
  bidderRequestsCount: 1,
  bidderWinsCount: 0
};

const inAppBidRequest = {
  bidder: 'smaato',
  params: {
    publisherId: 'publisherId',
    adspaceId: 'adspaceId',
    app: {
      ifa: 'aDeviceId',
      geo: {
        lat: 33.3,
        lon: -88.8
      }
    }
  },
  mediaTypes: {
    banner: {
      sizes: [[300, 50]]
    }
  },
  adUnitCode: '/19968336/header-bid-tag-0',
  transactionId: 'transactionId',
  sizes: [[300, 50]],
  bidId: 'bidId',
  bidderRequestId: 'bidderRequestId',
  auctionId: 'auctionId',
  src: 'client',
  bidRequestsCount: 1,
  bidderRequestsCount: 1,
  bidderWinsCount: 0
};

const extractPayloadOfFirstAndOnlyRequest = (reqs) => {
  expect(reqs).to.have.length(1);
  return JSON.parse(reqs[0].data);
}

describe('smaatoBidAdapterTest', () => {
  describe('isBidRequestValid', () => {
    it('has valid params', () => {
      expect(spec.isBidRequestValid({params: {publisherId: '123', adspaceId: '456'}})).to.be.true;
      expect(spec.isBidRequestValid(singleBannerBidRequest)).to.be.true;
    });
    it('has invalid params', () => {
      expect(spec.isBidRequestValid({})).to.be.false;
      expect(spec.isBidRequestValid({params: {}})).to.be.false;
      expect(spec.isBidRequestValid({params: {publisherId: '123'}})).to.be.false;
      expect(spec.isBidRequestValid({params: {publisherId: '123', adspaceId: 456}})).to.be.false;
    });
  });

  describe('buildRequests', () => {
    describe('common', () => {
      it('auction type is 1 (first price auction)', () => {
        const reqs = spec.buildRequests([singleBannerBidRequest], defaultBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.at).to.be.equal(1);
      })

      it('currency is US dollar', () => {
        const reqs = spec.buildRequests([singleBannerBidRequest], defaultBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.cur).to.be.deep.equal(['USD']);
      })

      it('can override endpoint', () => {
        const overridenEndpoint = 'https://prebid/bidder';
        const updatedBidRequest = utils.deepClone(singleBannerBidRequest);
        utils.deepSetValue(updatedBidRequest, 'params.endpoint', overridenEndpoint);

        const reqs = spec.buildRequests([updatedBidRequest], defaultBidderRequest);

        expect(reqs).to.have.length(1);
        expect(reqs[0].url).to.equal(overridenEndpoint);
      });

      it('sends correct imp', () => {
        const reqs = spec.buildRequests([singleBannerBidRequest], defaultBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.imp).to.deep.equal([
          {
            id: 'bidId',
            banner: {
              w: 300,
              h: 50,
              format: [
                {
                  h: 50,
                  w: 300
                }
              ]
            },
            tagid: 'adspaceId'
          }
        ]);
      });

      it('sends correct site', () => {
        const reqs = spec.buildRequests([singleBannerBidRequest], defaultBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.site.id).to.exist.and.to.be.a('string');
        expect(req.site.domain).to.exist.and.to.be.a('string');
        expect(req.site.page).to.exist.and.to.be.a('string');
        expect(req.site.ref).to.equal(REFERRER);
        expect(req.site.publisher.id).to.equal('publisherId');
      })

      it('sends gdpr applies if exists', () => {
        const reqs = spec.buildRequests([singleBannerBidRequest], defaultBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.regs.ext.gdpr).to.equal(1);
        expect(req.user.ext.consent).to.equal(CONSENT_STRING);
      });

      it('sends no gdpr applies if no gdpr exists', () => {
        const reqs = spec.buildRequests([singleBannerBidRequest], minimalBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.regs.ext.gdpr).to.not.exist;
        expect(req.user.ext.consent).to.not.exist;
      });

      it('sends us_privacy if exists', () => {
        const reqs = spec.buildRequests([singleBannerBidRequest], defaultBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.regs.ext.us_privacy).to.equal('uspConsentString');
      });

      it('sends tmax', () => {
        const reqs = spec.buildRequests([singleBannerBidRequest], defaultBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.tmax).to.equal(1200);
      });

      it('sends no us_privacy if no us_privacy exists', () => {
        const reqs = spec.buildRequests([singleBannerBidRequest], minimalBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.regs.ext.us_privacy).to.not.exist;
      });

      it('sends first party data', () => {
        this.sandbox = sinon.sandbox.create()
        this.sandbox.stub(config, 'getConfig').callsFake(key => {
          const config = {
            ortb2: {
              site: {
                keywords: 'power tools,drills'
              },
              user: {
                keywords: 'a,b',
                gender: 'M',
                yob: 1984
              }
            }
          };
          return utils.deepAccess(config, key);
        });

        const reqs = spec.buildRequests([singleBannerBidRequest], defaultBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.user.gender).to.equal('M');
        expect(req.user.yob).to.equal(1984);
        expect(req.user.keywords).to.eql('a,b');
        expect(req.user.ext.consent).to.equal(CONSENT_STRING);
        expect(req.site.keywords).to.eql('power tools,drills');
        expect(req.site.publisher.id).to.equal('publisherId');
        this.sandbox.restore();
      });

      it('has no user ids', () => {
        const reqs = spec.buildRequests([singleBannerBidRequest], defaultBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.user.ext.eids).to.not.exist;
      });
    });

    describe('multiple requests', () => {
      it('build individual server request for each bid request', () => {
        const bidRequest1 = utils.deepClone(singleBannerBidRequest);
        const bidRequest1BidId = '1111';
        utils.deepSetValue(bidRequest1, 'bidId', bidRequest1BidId);
        const bidRequest2 = utils.deepClone(singleBannerBidRequest);
        const bidRequest2BidId = '2222';
        utils.deepSetValue(bidRequest2, 'bidId', bidRequest2BidId);

        const reqs = spec.buildRequests([bidRequest1, bidRequest2], defaultBidderRequest);

        expect(reqs).to.have.length(2);
        expect(JSON.parse(reqs[0].data).imp[0].id).to.be.equal(bidRequest1BidId);
        expect(JSON.parse(reqs[1].data).imp[0].id).to.be.equal(bidRequest2BidId);
      });
    });

    describe('buildRequests for video imps', () => {
      it('sends correct video imps', () => {
        const singleVideoBidRequest = {
          bidder: 'smaato',
          params: {
            publisherId: 'publisherId',
            adspaceId: 'adspaceId'
          },
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [[768, 1024]],
              mimes: ['video/mp4', 'video/quicktime', 'video/3gpp', 'video/x-m4v'],
              minduration: 5,
              maxduration: 30,
              startdelay: 0,
              linearity: 1,
              protocols: [7],
              skip: 1,
              skipmin: 5,
              api: [7],
              ext: {rewarded: 0}
            }
          },
          adUnitCode: '/19968336/header-bid-tag-0',
          transactionId: 'transactionId',
          sizes: [[300, 50]],
          bidId: 'bidId',
          bidderRequestId: 'bidderRequestId',
          auctionId: 'auctionId',
          src: 'client',
          bidRequestsCount: 1,
          bidderRequestsCount: 1,
          bidderWinsCount: 0
        };

        const reqs = spec.buildRequests([singleVideoBidRequest], defaultBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.imp).to.deep.equal([
          {
            id: 'bidId',
            video: {
              mimes: ['video/mp4', 'video/quicktime', 'video/3gpp', 'video/x-m4v'],
              minduration: 5,
              startdelay: 0,
              linearity: 1,
              h: 1024,
              maxduration: 30,
              skip: 1,
              protocols: [7],
              ext: {
                rewarded: 0
              },
              skipmin: 5,
              api: [7],
              w: 768
            },
            tagid: 'adspaceId'
          }
        ]);
      });

      it('allows combined banner and video imp in single bid request', () => {
        const combinedBannerAndVideoBidRequest = {
          bidder: 'smaato',
          params: {
            publisherId: 'publisherId',
            adspaceId: 'adspaceId'
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 50]]
            },
            video: {
              context: 'outstream',
              playerSize: [[768, 1024]],
              mimes: ['video/mp4', 'video/quicktime', 'video/3gpp', 'video/x-m4v'],
              minduration: 5,
              maxduration: 30,
              startdelay: 0,
              linearity: 1,
              protocols: [7],
              skip: 1,
              skipmin: 5,
              api: [7],
              ext: {rewarded: 0}
            }
          },
          adUnitCode: '/19968336/header-bid-tag-0',
          transactionId: 'transactionId',
          sizes: [[300, 50]],
          bidId: 'bidId',
          bidderRequestId: 'bidderRequestId',
          auctionId: 'auctionId',
          src: 'client',
          bidRequestsCount: 1,
          bidderRequestsCount: 1,
          bidderWinsCount: 0
        };

        const reqs = spec.buildRequests([combinedBannerAndVideoBidRequest], defaultBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.imp).to.deep.equal([
          {
            id: 'bidId',
            banner: {
              w: 300,
              h: 50,
              format: [
                {
                  h: 50,
                  w: 300
                }
              ]
            },
            video: {
              mimes: ['video/mp4', 'video/quicktime', 'video/3gpp', 'video/x-m4v'],
              minduration: 5,
              startdelay: 0,
              linearity: 1,
              h: 1024,
              maxduration: 30,
              skip: 1,
              protocols: [7],
              ext: {
                rewarded: 0
              },
              skipmin: 5,
              api: [7],
              w: 768
            },
            tagid: 'adspaceId'
          }
        ]);
      });
    });

    describe('in-app requests', () => {
      it('add geo and ifa info to device object', () => {
        const reqs = spec.buildRequests([inAppBidRequest], defaultBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.device.geo).to.deep.equal({'lat': 33.3, 'lon': -88.8});
        expect(req.device.ifa).to.equal('aDeviceId');
      });

      it('when geo is missing, then add only ifa to device object', () => {
        const inAppBidRequestWithoutGeo = utils.deepClone(inAppBidRequest);
        delete inAppBidRequestWithoutGeo.params.app.geo

        const reqs = spec.buildRequests([inAppBidRequestWithoutGeo], defaultBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.device.geo).to.not.exist;
        expect(req.device.ifa).to.equal('aDeviceId');
      });

      it('add no specific device info if param does not exist', () => {
        const reqs = spec.buildRequests([singleBannerBidRequest], defaultBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.device.geo).to.not.exist;
        expect(req.device.ifa).to.not.exist;
      });
    });

    describe('user ids in requests', () => {
      it('user ids are added to user.ext.eids', () => {
        const userIdBidRequest = {
          bidder: 'smaato',
          params: {
            publisherId: 'publisherId',
            adspaceId: 'adspaceId'
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 50]]
            }
          },
          adUnitCode: '/19968336/header-bid-tag-0',
          transactionId: 'transactionId',
          sizes: [[300, 50]],
          bidId: 'bidId',
          bidderRequestId: 'bidderRequestId',
          auctionId: 'auctionId',
          src: 'client',
          bidRequestsCount: 1,
          bidderRequestsCount: 1,
          bidderWinsCount: 0,
          userId: {
            criteoId: '123456',
            tdid: '89145'
          },
          userIdAsEids: createEidsArray({
            criteoId: '123456',
            tdid: '89145'
          })
        };

        const reqs = spec.buildRequests([userIdBidRequest], defaultBidderRequest);

        const req = extractPayloadOfFirstAndOnlyRequest(reqs);
        expect(req.user.ext.eids).to.exist;
        expect(req.user.ext.eids).to.have.length(2);
      });
    });
  });

  describe('interpretResponse', () => {
    const buildOpenRtbBidResponse = (adType) => {
      let adm = '';

      switch (adType) {
        case ADTYPE_IMG:
          adm = JSON.stringify({
            image: {
              img: {
                url: 'https://prebid/static/ad.jpg',
                w: 320,
                h: 50,
                ctaurl: 'https://prebid/track/ctaurl'
              },
              impressiontrackers: [
                'https://prebid/track/imp/1',
                'https://prebid/track/imp/2'
              ],
              clicktrackers: [
                'https://prebid/track/click/1'
              ]
            }
          });
          break;
        case ADTYPE_RICHMEDIA:
          adm = JSON.stringify({
            richmedia: {
              mediadata: {
                content: '<div><h3>RICHMEDIA CONTENT</h3></div>',
                w: 800,
                h: 600
              },
              impressiontrackers: [
                'https://prebid/track/imp/1',
                'https://prebid/track/imp/2'
              ],
              clicktrackers: [
                'https://prebid/track/click/1'
              ]
            }
          });
          break;
        case ADTYPE_VIDEO:
          adm = '<VAST version="2.0"></VAST>';
          break;
        default:
          throw Error('Invalid AdType');
      }

      return {
        body: {
          bidid: '04db8629-179d-4bcd-acce-e54722969006',
          cur: 'USD',
          ext: {},
          id: '5ebea288-f13a-4754-be6d-4ade66c68877',
          seatbid: [
            {
              bid: [
                {
                  'adm': adm,
                  'adomain': [
                    'smaato.com'
                  ],
                  'bidderName': 'smaato',
                  'cid': 'CM6523',
                  'crid': 'CR69381',
                  'dealid': '12345',
                  'id': '6906aae8-7f74-4edd-9a4f-f49379a3cadd',
                  'impid': '226416e6e6bf41',
                  'iurl': 'https://prebid/iurl',
                  'nurl': 'https://prebid/nurl',
                  'price': 0.01,
                  'w': 350,
                  'h': 50
                }
              ],
              seat: 'CM6523'
            }
          ],
        },
        headers: {
          get: function (header) {
            if (header === 'X-SMT-ADTYPE') {
              return adType;
            }
          }
        }
      };
    };

    it('returns empty array on no bid responses', () => {
      const response_with_empty_body = {body: {}}

      const bids = spec.interpretResponse(response_with_empty_body, request);

      expect(bids).to.be.empty
    });

    it('single image reponse', () => {
      const bids = spec.interpretResponse(buildOpenRtbBidResponse(ADTYPE_IMG), request);

      expect(bids).to.deep.equal([
        {
          requestId: '226416e6e6bf41',
          cpm: 0.01,
          width: 350,
          height: 50,
          ad: '<div style="cursor:pointer" onclick="fetch(decodeURIComponent(\'https%3A%2F%2Fprebid%2Ftrack%2Fclick%2F1\'), {cache: \'no-cache\'});;window.open(decodeURIComponent(\'https%3A%2F%2Fprebid%2Ftrack%2Fctaurl\'));"><img src="https://prebid/static/ad.jpg" width="320" height="50"/><img src="https://prebid/track/imp/1" alt="" width="0" height="0"/><img src="https://prebid/track/imp/2" alt="" width="0" height="0"/></div>',
          ttl: 300,
          creativeId: 'CR69381',
          dealId: '12345',
          netRevenue: true,
          currency: 'USD',
          meta: {
            advertiserDomains: ['smaato.com'],
            agencyId: 'CM6523',
            networkName: 'smaato',
            mediaType: 'banner'
          }
        }
      ]);
    });

    it('single richmedia reponse', () => {
      const bids = spec.interpretResponse(buildOpenRtbBidResponse(ADTYPE_RICHMEDIA), request);

      expect(bids).to.deep.equal([
        {
          requestId: '226416e6e6bf41',
          cpm: 0.01,
          width: 350,
          height: 50,
          ad: '<div onclick="fetch(decodeURIComponent(\'https%3A%2F%2Fprebid%2Ftrack%2Fclick%2F1\'), {cache: \'no-cache\'});"><div><h3>RICHMEDIA CONTENT</h3></div><img src="https://prebid/track/imp/1" alt="" width="0" height="0"/><img src="https://prebid/track/imp/2" alt="" width="0" height="0"/></div>',
          ttl: 300,
          creativeId: 'CR69381',
          dealId: '12345',
          netRevenue: true,
          currency: 'USD',
          meta: {
            advertiserDomains: ['smaato.com'],
            agencyId: 'CM6523',
            networkName: 'smaato',
            mediaType: 'banner'
          }
        }
      ]);
    });

    it('single video reponse', () => {
      const bids = spec.interpretResponse(buildOpenRtbBidResponse(ADTYPE_VIDEO), request);

      expect(bids).to.deep.equal([
        {
          requestId: '226416e6e6bf41',
          cpm: 0.01,
          width: 350,
          height: 50,
          vastXml: '<VAST version="2.0"></VAST>',
          ttl: 300,
          creativeId: 'CR69381',
          dealId: '12345',
          netRevenue: true,
          currency: 'USD',
          meta: {
            advertiserDomains: ['smaato.com'],
            agencyId: 'CM6523',
            networkName: 'smaato',
            mediaType: 'video'
          }
        }
      ]);
    });

    it('ignores bid response with invalid ad type', () => {
      const resp = buildOpenRtbBidResponse(ADTYPE_IMG);
      resp.headers.get = (header) => {
        if (header === 'X-SMT-ADTYPE') {
          return undefined;
        }
      }

      const bids = spec.interpretResponse(resp, request);

      expect(bids).to.be.empty
    });

    it('uses correct TTL when expire header exists', () => {
      const clock = sinon.useFakeTimers();
      clock.tick(2000);
      const resp = buildOpenRtbBidResponse(ADTYPE_IMG);
      resp.headers.get = (header) => {
        if (header === 'X-SMT-ADTYPE') {
          return ADTYPE_IMG;
        }
        if (header === 'X-SMT-Expires') {
          return 2000 + (400 * 1000);
        }
      }

      const bids = spec.interpretResponse(resp, request);

      expect(bids[0].ttl).to.equal(400);

      clock.restore();
    });

    it('uses net revenue flag send from server', () => {
      const resp = buildOpenRtbBidResponse(ADTYPE_IMG);
      resp.body.seatbid[0].bid[0].ext = {net: false};

      const bids = spec.interpretResponse(resp, request);

      expect(bids[0].netRevenue).to.equal(false);
    })
  });

  describe('getUserSyncs', () => {
    it('returns no pixels', () => {
      expect(spec.getUserSyncs()).to.be.empty
    })
  })
});
