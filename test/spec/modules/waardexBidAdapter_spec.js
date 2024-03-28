import {expect} from 'chai';
import {spec} from '../../../modules/waardexBidAdapter.js';
import {auctionManager} from 'src/auctionManager.js';
import {deepClone} from 'src/utils.js';

describe('waardexBidAdapter', () => {
  describe('isBidRequestValid', () => {
    it('should return true. bidId and params such as placementId and zoneId are present', () => {
      const result = spec.isBidRequestValid({
        bidId: '112435ry',
        bidder: 'waardex',
        params: {
          placementId: 1,
          traffic: 'banner',
          zoneId: 1,
        }
      });

      expect(result).to.be.true;
    });

    it('should return false. bidId is not present in bid object', () => {
      const result = spec.isBidRequestValid({
        bidder: 'waardex',
        params: {
          placementId: 1,
          traffic: 'banner',
          zoneId: 1,
        }
      });

      expect(result).to.be.false;
    });

    it('should return false. zoneId is not present in bid.params object', () => {
      const result = spec.isBidRequestValid({
        bidId: '112435ry',
        bidder: 'waardex',
        params: {
          placementId: 1,
          traffic: 'banner',
        }
      });

      expect(result).to.be.false;
    });

    it('should return true when mediaTypes field is empty', () => {
      const result = spec.isBidRequestValid({
        bidId: '112435ry',
        bidder: 'waardex',
        params: {
          placementId: 1,
          traffic: 'banner',
          zoneId: 1,
        }
      });

      expect(result).to.be.true;
    });

    it('should return false when mediaTypes.video.playerSize field is empty', () => {
      const result = spec.isBidRequestValid({
        bidId: '112435ry',
        bidder: 'waardex',
        params: {
          placementId: 1,
          traffic: 'banner',
          zoneId: 1,
        },
        mediaTypes: {
          video: {}
        }
      });

      expect(result).to.be.false;
    });

    it('should return false when mediaTypes.video.playerSize field is not an array', () => {
      const result = spec.isBidRequestValid({
        bidId: '112435ry',
        bidder: 'waardex',
        params: {
          placementId: 1,
          traffic: 'banner',
          zoneId: 1,
        },
        mediaTypes: {
          video: {
            playerSize: 'not-array'
          }
        }
      });

      expect(result).to.be.false;
    });

    it('should return false when mediaTypes.video.playerSize field is an empty array', () => {
      const result = spec.isBidRequestValid({
        bidId: '112435ry',
        bidder: 'waardex',
        params: {
          placementId: 1,
          traffic: 'banner',
          zoneId: 1,
        },
        mediaTypes: {
          video: {
            playerSize: []
          }
        }
      });

      expect(result).to.be.false;
    });

    it('should return false when mediaTypes.video.playerSize field is empty array', () => {
      const result = spec.isBidRequestValid({
        bidId: '112435ry',
        bidder: 'waardex',
        params: {
          placementId: 1,
          traffic: 'banner',
          zoneId: 1,
        },
        mediaTypes: {
          video: {
            playerSize: []
          }
        }
      });

      expect(result).to.be.false;
    });

    it('should return true when mediaTypes.video.playerSize field is non-empty array', () => {
      const result = spec.isBidRequestValid({
        bidId: '112435ry',
        bidder: 'waardex',
        params: {
          placementId: 1,
          traffic: 'banner',
          zoneId: 1,
        },
        mediaTypes: {
          video: {
            playerSize: [[640, 400]]
          }
        }
      });

      expect(result).to.be.true;
    });
  });

  describe('buildRequests', () => {
    let getAdUnitsStub;
    const validBidRequests = [
      {
        bidId: 'fergr675ujgh',
        mediaTypes: {
          banner: {
            sizes: [[300, 600], [300, 250]]
          }
        },
        params: {
          bidfloor: 1.5,
          position: 1,
          instl: 1,
          zoneId: 100
        },
      },
      {
        bidId: 'unique-bid-id-2',
        mediaTypes: {
          video: {
            context: 'outstream',
            playerSize: [[640, 400]]
          }
        },
        params: {
          mimes: ['video/x-ms-wmv', 'video/mp4'],
          minduration: 2,
          maxduration: 10,
          protocols: ['VAST 1.0', 'VAST 2.0'],
          startdelay: -1,
          placement: 1,
          skip: 1,
          skipafter: 2,
          minbitrate: 0,
          maxbitrate: 0,
          delivery: [1, 2, 3],
          playbackmethod: [1, 2],
          api: [1, 2, 3, 4, 5, 6],
          linearity: 1,
        }
      }
    ];

    const bidderRequest = {
      refererInfo: {
        referer: 'https://www.google.com/?some_param=some_value'
      },
    };

    beforeEach(() => getAdUnitsStub = sinon.stub(auctionManager, 'getAdUnits').callsFake(() => []));
    afterEach(() => getAdUnitsStub.restore());

    it('should return valid build request object', () => {
      const {
        data: payload,
        url,
        method
      } = spec.buildRequests(validBidRequests, bidderRequest);

      const ENDPOINT = `https://hb.justbidit.xyz:8843/prebid?pubId=${validBidRequests[0].params.zoneId}`;

      expect(payload.bidRequests[0]).deep.equal({
        bidId: validBidRequests[0].bidId,
        bidfloor: 0,
        position: validBidRequests[0].params.position,
        instl: validBidRequests[0].params.instl,
        banner: {
          sizes: [
            {
              width: validBidRequests[0].mediaTypes.banner.sizes[0][0],
              height: validBidRequests[0].mediaTypes.banner.sizes[0][1]
            },
            {
              width: validBidRequests[0].mediaTypes.banner.sizes[1][0],
              height: validBidRequests[0].mediaTypes.banner.sizes[1][1]
            },
          ],
        }
      });
      expect(url).to.equal(ENDPOINT);
      expect(method).to.equal('POST');
    });
  });

  describe('interpretResponse', () => {
    const serverResponse = {
      body: {
        seatbid: [
          {
            bid: [
              {
                'id': 'ec90d4ee25433c0875c56f59acc12109',
                'adm': 'banner should be here',
                'w': 300,
                'h': 250,
                'price': 0.15827000000000002,
                'nurl': 'http://n63.justbidit.xyz?w=n&p=${AUCTION_PRICE}&t=b&uq=eb31018b3da8965dde414c0006b1fb31',
                'impid': 'unique-bid-id-1',
                'adomain': [
                  'www.kraeuterhaus.de'
                ],
                'cat': [
                  'IAB24'
                ],
                'attr': [
                  4
                ],
                'iurl': 'https://rtb.bsmartdata.com/preview.php?id=13',
                'cid': '286557fda4585dc1c7f98b773de92509',
                'crid': 'dd2b5a1f3f1fc5e63b042ebf4b00ca80'
              },
            ],
          }
        ],
      },
    };

    const request = {
      'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/86.0.4240.198 Safari/537.36',
      'language': 'en',
      'referer': 'https%3A%2F%2Fwww.google.com%2F%3Fsome_param%3Dsome_value',
      'coppa': false,
      'data': {
        'bidRequests': [
          {
            'bidId': 'unique-bid-id-1',
            'position': 1,
            'instl': 1,
            'banner': {
              'sizes': [
                {
                  'width': 300,
                  'height': 600
                },
                {
                  'width': 300,
                  'height': 250
                }
              ]
            }
          },
        ]
      }
    };

    it('bid response is valid', () => {
      const result = spec.interpretResponse(serverResponse, request);

      const expected = [
        {
          requestId: 'unique-bid-id-1',
          cpm: serverResponse.body.seatbid[0].bid[0].price,
          currency: 'USD',
          width: serverResponse.body.seatbid[0].bid[0].w,
          height: serverResponse.body.seatbid[0].bid[0].h,
          mediaType: 'banner',
          creativeId: serverResponse.body.seatbid[0].bid[0].crid,
          netRevenue: true,
          ttl: 3000,
          ad: serverResponse.body.seatbid[0].bid[0].adm,
          dealId: serverResponse.body.seatbid[0].bid[0].dealid,
          meta: {
            cid: serverResponse.body.seatbid[0].bid[0].cid,
            adomain: serverResponse.body.seatbid[0].bid[0].adomain,
            mediaType: (serverResponse.body.seatbid[0].bid[0].ext || {}).mediaType,
          },
        }
      ];
      expect(result).deep.equal(expected);
    });

    it('invalid bid response. requestId is not exists in bid response', () => {
      const invalidServerResponse = deepClone(serverResponse);
      delete invalidServerResponse.body.seatbid[0].bid[0].id;

      const result = spec.interpretResponse(invalidServerResponse);
      expect(result).deep.equal([]);
    });

    it('invalid bid response. cpm is not exists in bid response', () => {
      const invalidServerResponse = deepClone(serverResponse);
      delete invalidServerResponse.body.seatbid[0].bid[0].price;

      const result = spec.interpretResponse(invalidServerResponse);
      expect(result).deep.equal([]);
    });

    it('invalid bid response. creativeId is not exists in bid response', () => {
      const invalidServerResponse = deepClone(serverResponse);
      delete invalidServerResponse.body.seatbid[0].bid[0].crid;

      const result = spec.interpretResponse(invalidServerResponse);
      expect(result).deep.equal([]);
    });

    it('invalid bid response. width is not exists in bid response', () => {
      const invalidServerResponse = deepClone(serverResponse);
      delete invalidServerResponse.body.seatbid[0].bid[0].w;

      const result = spec.interpretResponse(invalidServerResponse);
      expect(result).deep.equal([]);
    });

    it('invalid bid response. height is not exists in bid response', () => {
      const invalidServerResponse = deepClone(serverResponse);
      delete invalidServerResponse.body.seatbid[0].bid[0].h;

      const result = spec.interpretResponse(invalidServerResponse);
      expect(result).deep.equal([]);
    });

    it('invalid bid response. ad is not exists in bid response', () => {
      const invalidServerResponse = deepClone(serverResponse);
      delete invalidServerResponse.body.seatbid[0].bid[0].adm;

      const result = spec.interpretResponse(invalidServerResponse);
      expect(result).deep.equal([]);
    });
  });
});
