import { expect } from 'chai';
import { spec } from 'modules/yieldoneBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { getBrowser, getOS } from '../../../libraries/userAgentUtils/index.js';
import { browserTypes, osTypes } from '../../../libraries/userAgentUtils/userAgentTypes.enums.js';

const ENDPOINT = 'https://y.one.impact-ad.jp/h_bid';
const USER_SYNC_URL = 'https://y.one.impact-ad.jp/push_sync';
const VIDEO_PLAYER_URL = 'https://img.ak.impact-ad.jp/ic/pone/ivt/firstview/js/dac-video-prebid.min.js';

const DEFAULT_VIDEO_SIZE = {w: 640, h: 360};

describe('yieldoneBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    const bid = {
      'bidder': 'yieldone',
      'params': {
        placementId: '36891'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [336, 280]],
      'bidId': '23beaa6af6cdde',
      'bidderRequestId': '19c0c1efdf37e7',
      'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when placementId not passed correctly', function () {
      bid.params.placementId = '';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when require params are not passed', function () {
      const invalidBid = Object.assign({}, bid);
      invalidBid.params = {};
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidderRequest = {
      refererInfo: {
        numIframes: 0,
        reachedTop: true,
        referer: 'http://example.com',
        stack: ['http://example.com']
      }
    };

    describe('Basic', function () {
      const bidRequests = [
        {
          'bidder': 'yieldone',
          'params': {placementId: '36891'},
          'adUnitCode': 'adunit-code1',
          'bidId': '23beaa6af6cdde',
          'bidderRequestId': '19c0c1efdf37e7',
          'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
        },
        {
          'bidder': 'yieldone',
          'params': {placementId: '47919'},
          'adUnitCode': 'adunit-code2',
          'bidId': '382091349b149f"',
          'bidderRequestId': '"1f9c98192de251"',
          'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
        }
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);

      it('sends bid request to our endpoint via GET', function () {
        expect(request[0].method).to.equal('GET');
        expect(request[1].method).to.equal('GET');
      });
      it('attaches source and version to endpoint URL as query params', function () {
        expect(request[0].url).to.equal(ENDPOINT);
        expect(request[1].url).to.equal(ENDPOINT);
      });
      it('adUnitCode should be sent as uc parameters on any requests', function () {
        expect(request[0].data.uc).to.equal('adunit-code1');
        expect(request[1].data.uc).to.equal('adunit-code2');
      });
    });

    describe('Old Format', function () {
      const bidRequests = [
        {
          params: {placementId: '0'},
          mediaType: 'banner',
          sizes: [[300, 250], [336, 280]],
        },
        {
          params: {placementId: '1'},
          mediaType: 'banner',
          sizes: [[336, 280]],
        },
        {
          // It doesn't actually exist.
          params: {placementId: '2'},
        },
        {
          params: {placementId: '3'},
          mediaType: 'video',
          sizes: [[1280, 720], [1920, 1080]],
        },
        {
          params: {placementId: '4'},
          mediaType: 'video',
          sizes: [[1920, 1080]],
        },
        {
          params: {placementId: '5'},
          mediaType: 'video',
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);

      it('parameter sz has more than one size on banner requests', function () {
        expect(request[0].data.sz).to.equal('300x250,336x280');
        expect(request[1].data.sz).to.equal('336x280');
        expect(request[2].data.sz).to.equal('');
        expect(request[3].data).to.not.have.property('sz');
        expect(request[4].data).to.not.have.property('sz');
        expect(request[5].data).to.not.have.property('sz');
      });

      it('width and height should be set as separate parameters on outstream requests', function () {
        expect(request[0].data).to.not.have.property('w');
        expect(request[1].data).to.not.have.property('w');
        expect(request[2].data).to.not.have.property('w');
        expect(request[3].data.w).to.equal(1280);
        expect(request[3].data.h).to.equal(720);
        expect(request[4].data.w).to.equal(1920);
        expect(request[4].data.h).to.equal(1080);
        expect(request[5].data.w).to.equal(DEFAULT_VIDEO_SIZE.w);
        expect(request[5].data.h).to.equal(DEFAULT_VIDEO_SIZE.h);
      });
    });

    describe('Single Format', function () {
      const bidRequests = [
        {
          params: {placementId: '0'},
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [336, 280]],
            },
          },
        },
        {
          params: {placementId: '1'},
          mediaTypes: {
            banner: {
              sizes: [[336, 280]],
            },
          },
        },
        {
          // It doesn't actually exist.
          params: {placementId: '2'},
          mediaTypes: {
            banner: {
            },
          },
        },
        {
          params: {placementId: '3'},
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [[1280, 720], [1920, 1080]],
            },
          },
        },
        {
          params: {placementId: '4'},
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [1920, 1080],
            },
          },
        },
        {
          params: {placementId: '5'},
          mediaTypes: {
            video: {
              context: 'outstream',
            },
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);

      it('parameter sz has more than one size on banner requests', function () {
        expect(request[0].data.sz).to.equal('300x250,336x280');
        expect(request[1].data.sz).to.equal('336x280');
        expect(request[2].data.sz).to.equal('');
        expect(request[3].data).to.not.have.property('sz');
        expect(request[4].data).to.not.have.property('sz');
        expect(request[5].data).to.not.have.property('sz');
      });

      it('width and height should be set as separate parameters on outstream requests', function () {
        expect(request[0].data).to.not.have.property('w');
        expect(request[0].data).to.not.have.property('h');
        expect(request[1].data).to.not.have.property('w');
        expect(request[1].data).to.not.have.property('h');
        expect(request[2].data).to.not.have.property('w');
        expect(request[2].data).to.not.have.property('h');
        expect(request[3].data.w).to.equal(1280);
        expect(request[3].data.h).to.equal(720);
        expect(request[4].data.w).to.equal(1920);
        expect(request[4].data.h).to.equal(1080);
        expect(request[5].data.w).to.equal(DEFAULT_VIDEO_SIZE.w);
        expect(request[5].data.h).to.equal(DEFAULT_VIDEO_SIZE.h);
      });
    });

    describe('Multiple Format', function () {
      const bidRequests = [
        {
          // It will be treated as a banner.
          params: {
            placementId: '0',
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [336, 280]],
            },
            video: {
              context: 'outstream',
              playerSize: [1920, 1080],
            },
          },
        },
        {
          // It will be treated as a video.
          params: {
            placementId: '1',
            playerParams: {},
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [336, 280]],
            },
            video: {
              context: 'outstream',
              playerSize: [1920, 1080],
            },
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);

      it('parameter sz has more than one size on banner requests', function () {
        expect(request[0].data.sz).to.equal('300x250,336x280');
        expect(request[1].data).to.not.have.property('sz');
      });

      it('width and height should be set as separate parameters on outstream requests', function () {
        expect(request[0].data).to.not.have.property('w');
        expect(request[0].data).to.not.have.property('h');
        expect(request[1].data.w).to.equal(1920);
        expect(request[1].data.h).to.equal(1080);
      });
    });

    describe('1x1 Format', function () {
      const bidRequests = [
        {
          // It will be treated as a banner.
          params: {
            placementId: '0',
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [336, 280]],
            },
            video: {
              context: 'outstream',
              playerSize: [[1, 1]],
            },
          },
        },
        {
          // It will be treated as a video.
          params: {
            placementId: '1',
            playerParams: {},
            playerSize: [1920, 1080],
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [336, 280]],
            },
            video: {
              context: 'outstream',
              playerSize: [[1, 1]],
            },
          },
        },
        {
          // It will be treated as a video.
          params: {
            placementId: '2',
            playerParams: {},
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [336, 280]],
            },
            video: {
              context: 'outstream',
              playerSize: [[1, 1]],
            },
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);

      it('parameter sz has more than one size on banner requests', function () {
        expect(request[0].data.sz).to.equal('300x250,336x280');
        expect(request[1].data).to.not.have.property('sz');
        expect(request[2].data).to.not.have.property('sz');
      });

      it('width and height should be set as separate parameters on outstream requests', function () {
        expect(request[0].data).to.not.have.property('w');
        expect(request[0].data).to.not.have.property('h');
        expect(request[1].data.w).to.equal(1920);
        expect(request[1].data.h).to.equal(1080);
        expect(request[2].data.w).to.equal(DEFAULT_VIDEO_SIZE.w);
        expect(request[2].data.h).to.equal(DEFAULT_VIDEO_SIZE.h);
      });
    });

    describe('LiveRampID', function () {
      it('dont send LiveRampID if undefined', function () {
        const bidRequests = [
          {
            params: {placementId: '0'},
          },
          {
            params: {placementId: '1'},
            userId: {},
          },
          {
            params: {placementId: '2'},
            userId: undefined,
          },
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request[0].data).to.not.have.property('lr_env');
        expect(request[1].data).to.not.have.property('lr_env');
        expect(request[2].data).to.not.have.property('lr_env');
      });

      it('should send LiveRampID if available', function () {
        const bidRequests = [
          {
            params: {placementId: '0'},
            userId: {idl_env: 'idl_env_sample'},
          },
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request[0].data.lr_env).to.equal('idl_env_sample');
      });
    });

    describe('IMID', function () {
      it('dont send IMID if undefined', function () {
        const bidRequests = [
          {
            params: {placementId: '0'},
          },
          {
            params: {placementId: '1'},
            userId: {},
          },
          {
            params: {placementId: '2'},
            userId: undefined,
          },
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request[0].data).to.not.have.property('imuid');
        expect(request[1].data).to.not.have.property('imuid');
        expect(request[2].data).to.not.have.property('imuid');
      });

      it('should send IMID if available', function () {
        const bidRequests = [
          {
            params: {placementId: '0'},
            userId: {imuid: 'imuid_sample'},
          },
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request[0].data.imuid).to.equal('imuid_sample');
      });
    });

    describe('DAC ID', function () {
      it('dont send DAC ID if undefined', function () {
        const bidRequests = [
          {
            params: {placementId: '0'},
          },
          {
            params: {placementId: '1'},
            userId: {},
          },
          {
            params: {placementId: '2'},
            userId: undefined,
          },
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request[0].data).to.not.have.property('dac_id');
        expect(request[1].data).to.not.have.property('dac_id');
        expect(request[2].data).to.not.have.property('dac_id');
        expect(request[0].data).to.not.have.property('fuuid');
        expect(request[1].data).to.not.have.property('fuuid');
        expect(request[2].data).to.not.have.property('fuuid');
      });

      it('should send DAC ID if available', function () {
        const bidRequests = [
          {
            params: {placementId: '0'},
            userId: {dacId: {fuuid: 'fuuid_sample', id: 'dacId_sample'}},
          },
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request[0].data.fuuid).to.equal('fuuid_sample');
        expect(request[0].data.dac_id).to.equal('dacId_sample');
      });
    });

    describe('ID5', function () {
      it('dont send ID5 if undefined', function () {
        const bidRequests = [
          {
            params: {placementId: '0'},
          },
          {
            params: {placementId: '1'},
            userId: {},
          },
          {
            params: {placementId: '2'},
            userId: undefined,
          },
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request[0].data).to.not.have.property('id5Id');
        expect(request[1].data).to.not.have.property('id5Id');
        expect(request[2].data).to.not.have.property('id5Id');
      });

      it('should send ID5 if available', function () {
        const bidRequests = [
          {
            params: {placementId: '0'},
            userId: {id5id: {uid: 'id5id_sample'}},
          },
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request[0].data.id5Id).to.equal('id5id_sample');
      });
    });

    describe('UID2.0', function () {
      it('dont send UID2.0 if undefined', function () {
        const bidRequests = [
          {
            params: {placementId: '0'},
          },
          {
            params: {placementId: '1'},
            userId: {},
          },
          {
            params: {placementId: '2'},
            userId: undefined,
          },
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request[0].data).to.not.have.property('uid2id');
        expect(request[1].data).to.not.have.property('uid2id');
        expect(request[2].data).to.not.have.property('uid2id');
      });

      it('should send UID2.0 if available', function () {
        const bidRequests = [
          {
            params: {placementId: '0'},
            userId: {uid2: {id: 'uid2_sample'}},
          },
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request[0].data.uid2id).to.equal('uid2_sample');
      });
    });

    describe('GPID', function () {
      it('dont send GPID if undefined', function () {
        const bidRequests = [
          {
            params: {placementId: '0'},
          },
          {
            params: {placementId: '1'},
            ortb2Imp: {},
          },
          {
            params: {placementId: '2'},
            ortb2Imp: undefined,
          },
          {
            params: {placementId: '3'},
            ortb2Imp: {ext: {gpid: undefined, data: {pubadslot: 'aaa'}}},
          },
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request[0].data).to.not.have.property('gpid');
        expect(request[1].data).to.not.have.property('gpid');
        expect(request[2].data).to.not.have.property('gpid');
        expect(request[3].data).to.not.have.property('gpid');
      });

      it('should send GPID if available', function () {
        const bidRequests = [
          {
            params: {placementId: '0'},
            ortb2Imp: {ext: {gpid: 'gpid_sample'}},
          },
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request[0].data.ext).to.be.not.null;
        expect(request[0].data).to.have.property('gpid');
        expect(request[0].data.gpid).to.equal('gpid_sample');
      });
    });

    describe('instl', function () {
      it('dont send instl if undefined', function () {
        const bidRequests = [
          {
            params: {placementId: '0'},
          },
          {
            params: {placementId: '1'},
            ortb2Imp: {},
          },
          {
            params: {placementId: '2'},
            ortb2Imp: undefined,
          },
          {
            params: {placementId: '3'},
            ortb2Imp: {instl: undefined},
          },
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);

        bidRequests.forEach((bidRequest, ind) => {
          expect(request[ind].data).to.not.have.property('instl');
        })
      });

      it('should send instl if available', function () {
        const bidRequests = [
          {
            params: {placementId: '0'},
            ortb2Imp: {instl: '1'},
          },
          {
            params: {placementId: '1'},
            ortb2Imp: {instl: 1},
          },
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);

        bidRequests.forEach((bidRequest, ind) => {
          expect(request[ind].data).to.have.property('instl');
          expect(request[ind].data.instl).to.equal(1);
        })
      });
    });
  });

  describe('interpretResponse', function () {
    const bidRequestBanner = [
      {
        'method': 'GET',
        'url': 'https://y.one.impact-ad.jp/h_bid',
        'data': {
          'v': 'hb1',
          'p': '36891',
          'sz': '300x250,336x280',
          'cb': 12892917383,
          'r': 'http%3A%2F%2Flocalhost%3A9876%2F%3Fid%3D74552836',
          'uid': '23beaa6af6cdde',
          't': 'i',
          'language': 'ja',
          'screen_size': '1440x900'
        }
      }
    ];

    const serverResponseBanner = {
      body: {
        'adTag': '<!-- adtag -->',
        'uid': '23beaa6af6cdde',
        'height': 250,
        'width': 300,
        'cpm': 0.0536616,
        'crid': '2494768',
        'currency': 'JPY',
        'statusMessage': 'Bid available',
        'dealId': 'P1-FIX-7800-DSP-MON',
        'adomain': [
          'www.example.com'
        ],
      }
    };

    it('should get the correct bid response for banner', function () {
      const expectedResponse = [{
        'requestId': '23beaa6af6cdde',
        'cpm': 53.6616,
        'width': 300,
        'height': 250,
        'creativeId': '2494768',
        'dealId': 'P1-FIX-7800-DSP-MON',
        'currency': 'JPY',
        'netRevenue': true,
        'ttl': 3000,
        'referrer': '',
        'meta': {
          'advertiserDomains': [
            'www.example.com'
          ]
        },
        'mediaType': 'banner',
        'ad': '<!-- adtag -->'
      }];
      const result = spec.interpretResponse(serverResponseBanner, bidRequestBanner[0]);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
      expect(result[0].requestId).to.equal(expectedResponse[0].requestId);
      expect(result[0].cpm).to.equal(expectedResponse[0].cpm);
      expect(result[0].width).to.equal(expectedResponse[0].width);
      expect(result[0].height).to.equal(expectedResponse[0].height);
      expect(result[0].creativeId).to.equal(expectedResponse[0].creativeId);
      expect(result[0].dealId).to.equal(expectedResponse[0].dealId);
      expect(result[0].currency).to.equal(expectedResponse[0].currency);
      expect(result[0].mediaType).to.equal(expectedResponse[0].mediaType);
      expect(result[0].ad).to.equal(expectedResponse[0].ad);
      expect(result[0].meta.advertiserDomains[0]).to.equal(expectedResponse[0].meta.advertiserDomains[0]);
    });

    const serverResponseVideo = {
      body: {
        'uid': '23beaa6af6cdde',
        'height': 360,
        'width': 640,
        'cpm': 0.0536616,
        'dealId': 'P1-FIX-7800-DSP-MON',
        'crid': '2494768',
        'currency': 'JPY',
        'statusMessage': 'Bid available',
        'adm': '<!-- vast -->'
      }
    };

    const bidRequestVideo = [
      {
        'method': 'GET',
        'url': 'https://y.one.impact-ad.jp/h_bid',
        'data': {
          'v': 'hb1',
          'p': '41993',
          'w': '640',
          'h': '360',
          'cb': 12892917383,
          'r': 'http%3A%2F%2Flocalhost%3A9876%2F%3Fid%3D74552836',
          'uid': '23beaa6af6cdde',
          't': 'i',
          'language': 'ja',
          'screen_size': '1440x900'
        }
      }
    ];

    it('should get the correct bid response for video', function () {
      const expectedResponse = [{
        'requestId': '23beaa6af6cdde',
        'cpm': 53.6616,
        'width': 640,
        'height': 360,
        'creativeId': '2494768',
        'dealId': 'P1-FIX-7800-DSP-MON',
        'currency': 'JPY',
        'netRevenue': true,
        'ttl': 3000,
        'referrer': 'http%3A%2F%2Flocalhost%3A9876%2F%3Fid%3D74552836',
        'meta': {
          'advertiserDomains': []
        },
        'mediaType': 'video',
        'vastXml': '<!-- vast -->',
        'renderer': {
          id: '23beaa6af6cdde',
          url: VIDEO_PLAYER_URL
        }
      }];
      const result = spec.interpretResponse(serverResponseVideo, bidRequestVideo[0]);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
      expect(result[0].requestId).to.equal(expectedResponse[0].requestId);
      expect(result[0].cpm).to.equal(expectedResponse[0].cpm);
      expect(result[0].width).to.equal(expectedResponse[0].width);
      expect(result[0].height).to.equal(expectedResponse[0].height);
      expect(result[0].creativeId).to.equal(expectedResponse[0].creativeId);
      expect(result[0].dealId).to.equal(expectedResponse[0].dealId);
      expect(result[0].currency).to.equal(expectedResponse[0].currency);
      expect(result[0].vastXml).to.equal(expectedResponse[0].vastXml);
      expect(result[0].mediaType).to.equal(expectedResponse[0].mediaType);
      expect(result[0].referrer).to.equal(expectedResponse[0].referrer);
      expect(result[0].renderer.id).to.equal(expectedResponse[0].renderer.id);
      expect(result[0].renderer.url).to.equal(expectedResponse[0].renderer.url);
      expect(result[0].meta.advertiserDomains[0]).to.equal(expectedResponse[0].meta.advertiserDomains[0]);
    });

    it('handles empty bid response', function () {
      const response = {
        body: {
          'uid': '2c0b634db95a01',
          'height': 0,
          'crid': '',
          'statusMessage': 'Bid returned empty or error response',
          'width': 0,
          'cpm': 0
        }
      };
      const result = spec.interpretResponse(response, bidRequestBanner[0]);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    it('handles empty sync options', function () {
      expect(spec.getUserSyncs({})).to.be.undefined;
    });

    it('should return a sync url if iframe syncs are enabled and UserAgent is not Safari or iOS', function () {
      const result = spec.getUserSyncs({
        'iframeEnabled': true
      });

      if (getBrowser() === browserTypes.SAFARI || getOS() === osTypes.IOS) {
        expect(result).to.be.undefined;
      } else {
        expect(result).to.deep.equal([{
          type: 'iframe', url: USER_SYNC_URL
        }]);
      }
    });

    it('should skip sync request in case GDPR applies', function () {
      expect(spec.getUserSyncs({'iframeEnabled': true}, [], {
        consentString: 'GDPR_CONSENT_STRING',
        gdprApplies: true,
      })).to.be.undefined;
    });

    it('should skip sync request for bot-like user agents', function () {
      const originalUA = navigator.userAgent;
      try {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
          configurable: true
        });

        expect(spec.getUserSyncs({'iframeEnabled': true})).to.be.undefined;
      } finally {
        Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true });
      }
    });
  });
});
