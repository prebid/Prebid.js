// import { assert, expect } from 'chai';
import { spec } from 'modules/smaatoBidAdapter.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';

const imageAd = {
  image: {
    img: {
      url: 'http://localhost:3000/static/ad.jpg',
      w: 320,
      h: 50,
      ctaurl: 'http://localhost:3000/track/ctaurl'
    },
    impressiontrackers: [
      'http://localhost:3000/track/imp/1',
      'http://localhost:3000/track/imp/2'
    ],
    clicktrackers: [
      'http://localhost:3000/track/click/1'
    ]
  }
}

const richmediaAd = {
  richmedia: {
    mediadata: {
      content: '<div><h3>RICHMEDIA CONTENT</h3></div>',
      w: 800,
      h: 600
    },
    impressiontrackers: [
      'http://www.mytracker.com/impressiontracker01',
      'http://www.mytracker.com/impressiontracker02'
    ],
    clicktrackers: [
      'http://www.mytracker.com/clicktracker01',
      'http://www.mytracker.com/clicktracker02'
    ]
  }
}

const ADTYPE_IMG = 'Img';
const ADTYPE_RICHMEDIA = 'Richmedia';

const openRtbBidResponse = (adType) => {
  let adm = '';

  switch (adType) {
    case ADTYPE_IMG:
      adm = JSON.stringify(imageAd);
      break;
    case ADTYPE_RICHMEDIA:
      adm = JSON.stringify(richmediaAd);
      break;
    default:
      throw Error('Invalid AdType');
  }

  let resp = {
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
              'id': '6906aae8-7f74-4edd-9a4f-f49379a3cadd',
              'impid': '226416e6e6bf41',
              'iurl': 'https://bidstalkcreatives.s3.amazonaws.com/1x1.png',
              'nurl': 'https://ets-eu-west-1.track.smaato.net/v1/view?sessionId=e4e17adb-9599-42b1-bb5f-a1f1b3bee572&adSourceId=6906aae8-7f74-4edd-9a4f-f49379a3cadd&originalRequestTime=1552310449698&expires=1552311350698&winurl=ama8JbpJVpFWxvEja5viE3cLXFu58qRI8dGUh23xtsOn3N2-5UU0IwkgNEmR82pI37fcMXejL5IWTNAoW6Cnsjf-Dxl_vx2dUqMrVEevX-Vdx2VVnf-D5f73gZhvi4t36iPL8Dsw4aACekoLvVOV7-eXDjz7GHy60QFqcwKf5g2AlKPOInyZ6vJg_fn4qA9argvCRgwVybXE9Ndm2W0v8La4uFYWpJBOUveDDUrSQfzal7RsYvLb_OyaMlPHdrd_bwA9qqZWuyJXd-L9lxr7RQ%3D%3D%7CMw3kt91KJR0Uy5L-oNztAg%3D%3D&dpid=4XVofb_lH-__hr2JNGhKfg%3D%3D%7Cr9ciCU1cx3zmHXihItKO0g%3D%3D',
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
  return resp;
};

const request = {
  method: 'POST',
  url: 'https://unifiedbidding.ad.smaato.net/oapi/unifiedbidding',
  data: ''
};

const interpretedBidsImg = [
  {
    requestId: '226416e6e6bf41',
    cpm: 0.01,
    width: 350,
    height: 50,
    ad: '<div><a href=\"http://localhost:3000/track/ctaurl\"><img src=\"http://localhost:3000/static/ad.jpg\" width=\"320\" height=\"50\"/></a></div><img src=\"http://localhost:3000/track/imp/1\" alt=\"\" width=\"1\" height=\"1\"/><img src=\"http://localhost:3000/track/imp/2\" alt=\"\" width=\"1\" height=\"1\"/>',
    ttl: 1000,
    creativeId: 'CR69381',
    netRevenue: false,
    currency: 'USD'
  }
];

const interpretedBidsRichmedia = [
  {
    requestId: '226416e6e6bf41',
    cpm: 0.01,
    width: 350,
    height: 50,
    ad: '<div><h3>RICHMEDIA CONTENT</h3></div>',
    ttl: 1000,
    creativeId: 'CR69381',
    netRevenue: false,
    currency: 'USD'
  }
];

const defaultBidderRequest = {
  gdprConsent: {
    consentString: 'gdprConsentStr',
    gdprApplies: true
  },
  uspConsent: 'uspConsentString',
  refererInfo: {
    referer: 'http://example.com/page.html',
  }
};

const minimalBidderRequest = {
  refererInfo: {
    referer: 'http://example.com/page.html',
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

describe('smaatoBidAdapterTestOld', () => {
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
    beforeEach(() => {
      this.req = JSON.parse(spec.buildRequests([singleBannerBidRequest], defaultBidderRequest).data);
    });

    it('can override endpoint', () => {
      const overridenEndpoint = 'http://localhost:3000/bidder';
      let bidRequest = utils.deepClone(singleBannerBidRequest);
      utils.deepSetValue(bidRequest, 'params.endpoint', overridenEndpoint);
      const actualEndpoint = spec.buildRequests([bidRequest], defaultBidderRequest).url;
      expect(actualEndpoint).to.equal(overridenEndpoint);
    });

    it('sends correct imps', () => {
      expect(this.req.imp).to.deep.equal([
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
      ])
    });

    it('sends correct site', () => {
      expect(this.req.site.id).to.exist.and.to.be.a('string');
      expect(this.req.site.domain).to.exist.and.to.be.a('string');
      expect(this.req.site.page).to.exist.and.to.be.a('string');
      expect(this.req.site.ref).to.equal('http://example.com/page.html');
      expect(this.req.site.publisher.id).to.equal('publisherId');
    })

    it('sends gdpr if exists', () => {
      expect(this.req.regs.ext.gdpr).to.equal(1);
    });

    it('sends no gdpr if no gdpr exists', () => {
      let req = JSON.parse(spec.buildRequests([singleBannerBidRequest], minimalBidderRequest).data);
      expect(req.regs.ext.gdpr).to.equal(0);
    });

    it('sends usp if exists', () => {
      expect(this.req.regs.ext.us_privacy).to.equal('uspConsentString');
    });

    it('sends no usp if no usp exists', () => {
      let req = JSON.parse(spec.buildRequests([singleBannerBidRequest], minimalBidderRequest).data);
      expect(req.regs.ext.us_privacy).to.not.exist;
    });
  });

  describe('interpretResponse', () => {
    it('single image reponse', () => {
      const bids = spec.interpretResponse(openRtbBidResponse(ADTYPE_IMG), request);
      assert.deepStrictEqual(bids, interpretedBidsImg);
    });
    it('single richmedia reponse', () => {
      const bids = spec.interpretResponse(openRtbBidResponse(ADTYPE_RICHMEDIA), request);
      assert.deepStrictEqual(bids, interpretedBidsRichmedia);
    });
  });
});
