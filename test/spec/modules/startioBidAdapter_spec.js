import { expect } from 'chai';
import { spec } from 'modules/startioBidAdapter.js';
import { BANNER, VIDEO, NATIVE } from 'src/mediaTypes.js';

const DEFAULT_REQUEST_DATA = {
  adUnitCode: 'test-div',
  auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
  bidId: '32d4d86b4f22ed',
  bidder: 'startio',
  bidderRequestId: '1bbb7854dfa0d8',
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250],
        [300, 600]
      ]
    }
  },
  params: {},
  src: 'client',
  transactionId: 'db739693-9b4a-4669-9945-8eab938783cc'
}

const VALID_MEDIA_TYPES_REQUESTS = {
  [BANNER]: [{
    ...DEFAULT_REQUEST_DATA,
    mediaTypes: {
      [BANNER]: {
        sizes: [
          [300, 250],
          [300, 600]
        ]
      }
    },
  }],
  [VIDEO]: [{
    ...DEFAULT_REQUEST_DATA,
    mediaTypes: {
      video: {
        minduration: 3,
        maxduration: 43,
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [2]
      }
    },
  }],
  [NATIVE]: [{
    ...DEFAULT_REQUEST_DATA,
    mediaTypes: {
      [NATIVE]: {
        title: { required: true, len: 200 },
        image: { required: true, sizes: [150, 50] },
      }
    },
    nativeOrtbRequest: {
      assets: [
        { required: 1, title: { len: 200 } },
        { required: 1, img: { type: 3, w: 150, h: 50 } },
      ]
    },
  }]
}

const VALID_BIDDER_REQUEST = {
  auctionId: '19c97f22-5bd1-4b16-a128-80f75fb0a8a0',
  bidderCode: 'startio',
  bidderRequestId: '1bbb7854dfa0d8',
  bids: [
    {
      params: {},
    }
  ],
  refererInfo: {
    page: 'test-page',
    domain: 'test-domain',
    ref: 'test-referer'
  },
}

const DEFAULT_BID_RESPONSE_DATA = {
  'id': '29596384-e502-4d3c-a47d-4f16b16bd554',
  'impid': '32d4d86b4f22ed',
  'price': 0.18417903447819028,
  'adid': '2:64:162:1001',
  'adomain': [
    'start.io'
  ],
  'nurl': 'https://start.io/v1',
  'lurl': 'https://start.io/v1',
  'iurl': 'https://start.io/v1',
  'cid': '1982494692188097775',
  'crid': '5889732975267688811',
  'cat': ['IAB1-1', 'IAB1-6'],
  'w': 300,
  'h': 250,
  'mtype': 1,
};

const SERVER_RESPONSE_BANNER = {
  'id': '5d997535-e900-4a6b-9cb7-737e402d5cfa',
  'seatbid': [
    {
      'bid': [
        {
          ...DEFAULT_BID_RESPONSE_DATA,
          'adm': 'banner.img',
          'ext': {
            'duration': 0,
            'prebid': {
              'type': BANNER
            }
          }
        }
      ],
      'seat': 'start.io',
      'group': 0
    }
  ],
  'cur': 'USD'
}

const SERVER_RESPONSE_VIDEO = {
  'id': '8cd85aed-25a6-4db0-ad98-4a3af1f7601c',
  'seatbid': [
    {
      'bid': [
        {
          ...DEFAULT_BID_RESPONSE_DATA,
          'adm': '<VAST version=4.0></VAST>',
          'ext': {
            'duration': 0,
            'prebid': {
              'type': VIDEO
            }
          }
        }
      ],
      'seat': 'start.io',
      'group': 0
    }
  ],
  'cur': 'USD'
}

const SERVER_RESPONSE_NATIVE = {
  'id': '29667448-5659-42bb-abcf-dc973f98eae1',
  'seatbid': [
    {
      'bid': [
        {
          ...DEFAULT_BID_RESPONSE_DATA,
          'adm': '{"native":{"assets":[{"id":0,"title":{"len":90,"text":"Title"}}, {"id":1,"img":{"w":320,"h":250,"url":"https://img.image.com/product/image.jpg"}}]}}',
          'ext': {
            'duration': 0,
            'prebid': {
              'type': NATIVE
            }
          }
        }
      ],
      'seat': 'start.io',
      'group': 0
    }
  ],
  'cur': 'USD'
}

describe('Prebid Adapter: Startio', function () {
  describe('code', function () {
    it('should return a bidder code of startio', function () {
      expect(spec.code).to.eql('startio');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true for bid request', function () {
      const bidRequest = {
        bidder: 'startio',
      };
      expect(spec.isBidRequestValid(bidRequest)).to.eql(true);
    });
  });

  describe('buildRequests', function () {
    it('should build request for banner media type', function () {
      const bidRequest = VALID_MEDIA_TYPES_REQUESTS[BANNER][0];
      const bidderRequest = {
        refererInfo: { referer: 'https://example.com' },
      };

      const requests = spec.buildRequests([bidRequest], bidderRequest);

      expect(requests).to.have.lengthOf(1);
      const request = requests[0];
      expect(request.method).to.equal('POST');
      expect(request.data).to.have.property('imp');
      expect(request.data.imp[0].banner.w).to.equal(300);
      expect(request.data.imp[0].banner.h).to.equal(250);
    });
    if (FEATURES.VIDEO) {
      it('should build request for video media type', function () {
        const bidRequest = VALID_MEDIA_TYPES_REQUESTS[VIDEO][0];
        const bidderRequest = {
          refererInfo: { referer: 'https://example.com' },
        };

        const requests = spec.buildRequests([bidRequest], bidderRequest);

        expect(requests).to.have.lengthOf(1);
        const request = requests[0];

        expect(request.data.imp[0].video).to.exist;
        expect(request.data.imp[0].video.minduration).to.equal(3);
        expect(request.data.imp[0].video.maxduration).to.equal(43);
      });
    }

    if (FEATURES.NATIVE) {
      it('should build request for native media type', function () {
        const bidRequest = VALID_MEDIA_TYPES_REQUESTS[NATIVE][0];
        const bidderRequest = {
          refererInfo: { referer: 'https://example.com' },
        };

        const requests = spec.buildRequests([bidRequest], bidderRequest);

        expect(requests).to.have.lengthOf(1);
        const request = requests[0];

        expect(request.data.imp[0].native).to.exist;
      });
    }
  });

  describe('interpretResponse', function () {
    it('should return a valid bid array with a banner bid', () => {
      const requests = spec.buildRequests(VALID_MEDIA_TYPES_REQUESTS[BANNER], VALID_BIDDER_REQUEST)
      const { data } = requests[0];
      const bids = spec.interpretResponse({ body: SERVER_RESPONSE_BANNER }, { data }).bids;

      expect(bids).to.be.a('array').that.has.lengthOf(1)
      bids.forEach(value => {
        expect(value).to.be.a('object').that.has.all.keys(
          'ad', 'cpm', 'creativeId', 'currency', 'height', 'mediaType', 'meta', 'netRevenue', 'requestId', 'ttl', 'width', 'seatBidId', 'creative_id'
        )
      })
    });

    it('should set meta.adomain from the bid response adomain field', () => {
      const requests = spec.buildRequests(VALID_MEDIA_TYPES_REQUESTS[BANNER], VALID_BIDDER_REQUEST);
      const { data } = requests[0];
      const bids = spec.interpretResponse({ body: SERVER_RESPONSE_BANNER }, { data }).bids;

      expect(bids).to.have.lengthOf(1);
      const bid = bids[0];

      expect(bid.meta).to.be.an('object');
      expect(bid.meta.advertiserDomains).to.be.an('array').that.includes('start.io');
    });

    if (FEATURES.VIDEO) {
      it('should return a valid bid array with a video bid', () => {
        const requests = spec.buildRequests(VALID_MEDIA_TYPES_REQUESTS[VIDEO], VALID_BIDDER_REQUEST);
        const { data } = requests[0];
        const bids = spec.interpretResponse({ body: SERVER_RESPONSE_VIDEO }, { data }).bids
        expect(bids).to.be.a('array').that.has.lengthOf(1)
        bids.forEach(value => {
          expect(value).to.be.a('object').that.has.all.keys(
            'vastUrl', 'vastXml', 'playerHeight', 'playerWidth', 'cpm', 'creativeId', 'currency', 'height', 'mediaType', 'meta', 'netRevenue', 'requestId', 'ttl', 'width', 'seatBidId', 'creative_id'
          )
        })
      });
    }

    if (FEATURES.NATIVE) {
      it('should return a valid bid array with a native bid', () => {
        const requests = spec.buildRequests(VALID_MEDIA_TYPES_REQUESTS[NATIVE], VALID_BIDDER_REQUEST);
        const { data } = requests[0];
        const bids = spec.interpretResponse({ body: SERVER_RESPONSE_NATIVE }, { data }).bids
        expect(bids).to.be.a('array').that.has.lengthOf(1)
        bids.forEach(value => {
          expect(value).to.be.a('object').that.has.all.keys(
            'native', 'cpm', 'creativeId', 'currency', 'height', 'mediaType', 'meta', 'netRevenue', 'requestId', 'ttl', 'width', 'seatBidId', 'creative_id'
          )
        })
      });
    }
  });
});
