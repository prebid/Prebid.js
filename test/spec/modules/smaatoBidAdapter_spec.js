import { spec } from 'modules/smaatoBidAdapter.js';
import * as utils from 'src/utils.js';
import {config} from 'src/config.js';

const imageAd = {
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
};

const richmediaAd = {
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
};

const ADTYPE_IMG = 'Img';
const ADTYPE_RICHMEDIA = 'Richmedia';
const ADTYPE_VIDEO = 'Video';

const context = {
  keywords: 'power tools,drills'
};

const user = {
  keywords: 'a,b',
  gender: 'M',
  yob: 1984
};

const openRtbBidResponse = (adType) => {
  let adm = '';

  switch (adType) {
    case ADTYPE_IMG:
      adm = JSON.stringify(imageAd);
      break;
    case ADTYPE_RICHMEDIA:
      adm = JSON.stringify(richmediaAd);
      break;
    case ADTYPE_VIDEO:
      adm = '<VAST version="2.0"></VAST>';
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
  return resp;
};

const request = {
  method: 'POST',
  url: 'https://prebid.ad.smaato.net/oapi/prebid',
  data: ''
};

const interpretedBidsImg = [
  {
    requestId: '226416e6e6bf41',
    cpm: 0.01,
    width: 350,
    height: 50,
    ad: '<div style=\"cursor:pointer\" onclick=\"fetch(decodeURIComponent(\'https%3A%2F%2Fprebid%2Ftrack%2Fclick%2F1\'), {cache: \'no-cache\'});;window.open(decodeURIComponent(\'https%3A%2F%2Fprebid%2Ftrack%2Fctaurl\'));\"><img src=\"https://prebid/static/ad.jpg\" width=\"320\" height=\"50\"/><img src=\"https://prebid/track/imp/1\" alt=\"\" width=\"0\" height=\"0\"/><img src=\"https://prebid/track/imp/2\" alt=\"\" width=\"0\" height=\"0\"/></div>',
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
];

const interpretedBidsRichmedia = [
  {
    requestId: '226416e6e6bf41',
    cpm: 0.01,
    width: 350,
    height: 50,
    ad: '<div onclick=\"fetch(decodeURIComponent(\'https%3A%2F%2Fprebid%2Ftrack%2Fclick%2F1\'), {cache: \'no-cache\'});\"><div><h3>RICHMEDIA CONTENT</h3></div><img src=\"https://prebid/track/imp/1\" alt=\"\" width=\"0\" height=\"0\"/><img src=\"https://prebid/track/imp/2\" alt=\"\" width=\"0\" height=\"0\"/></div>',
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
];

const interpretedBidsVideo = [
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
];

const defaultBidderRequest = {
  gdprConsent: {
    consentString: 'HFIDUYFIUYIUYWIPOI87392DSU',
    gdprApplies: true
  },
  uspConsent: 'uspConsentString',
  refererInfo: {
    referer: 'http://example.com/page.html',
  },
  timeout: 1200
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
      mimes: ['video\/mp4', 'video\/quicktime', 'video\/3gpp', 'video\/x-m4v'],
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
      mimes: ['video\/mp4', 'video\/quicktime', 'video\/3gpp', 'video\/x-m4v'],
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
    beforeEach(() => {
      this.req = JSON.parse(spec.buildRequests([singleBannerBidRequest], defaultBidderRequest).data);
      this.sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
      this.sandbox.restore();
    });

    it('can override endpoint', () => {
      const overridenEndpoint = 'https://prebid/bidder';
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

    it('sends gdpr applies if exists', () => {
      expect(this.req.regs.ext.gdpr).to.equal(1);
      expect(this.req.user.ext.consent).to.equal('HFIDUYFIUYIUYWIPOI87392DSU');
    });

    it('sends no gdpr applies if no gdpr exists', () => {
      let req_without_gdpr = JSON.parse(spec.buildRequests([singleBannerBidRequest], minimalBidderRequest).data);
      expect(req_without_gdpr.regs.ext.gdpr).to.not.exist;
      expect(req_without_gdpr.user.ext.consent).to.not.exist;
    });

    it('sends usp if exists', () => {
      expect(this.req.regs.ext.us_privacy).to.equal('uspConsentString');
    });

    it('sends tmax', () => {
      expect(this.req.tmax).to.equal(1200);
    });

    it('sends no usp if no usp exists', () => {
      let req_without_usp = JSON.parse(spec.buildRequests([singleBannerBidRequest], minimalBidderRequest).data);
      expect(req_without_usp.regs.ext.us_privacy).to.not.exist;
    });

    it('sends fp data', () => {
      this.sandbox.stub(config, 'getConfig').callsFake(key => {
        const config = {
          fpd: {
            context,
            user
          }
        };
        return utils.deepAccess(config, key);
      });
      let bidRequest = utils.deepClone(singleBannerBidRequest);
      let req_fpd = JSON.parse(spec.buildRequests([bidRequest], defaultBidderRequest).data);
      expect(req_fpd.user.gender).to.equal('M');
      expect(req_fpd.user.yob).to.equal(1984);
      expect(req_fpd.user.keywords).to.eql('a,b');
      expect(req_fpd.user.ext.consent).to.equal('HFIDUYFIUYIUYWIPOI87392DSU');
      expect(req_fpd.site.keywords).to.eql('power tools,drills');
      expect(req_fpd.site.publisher.id).to.equal('publisherId');
    })
  });

  describe('buildRequests for video imps', () => {
    it('sends correct video imps', () => {
      let req = JSON.parse(spec.buildRequests([singleVideoBidRequest], defaultBidderRequest).data);
      expect(req.imp).to.deep.equal([
        {
          id: 'bidId',
          video: {
            mimes: ['video\/mp4', 'video\/quicktime', 'video\/3gpp', 'video\/x-m4v'],
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
      ])
    });
    it('allows combines banner and video imp in single bid request', () => {
      let req = JSON.parse(spec.buildRequests([combinedBannerAndVideoBidRequest], defaultBidderRequest).data);
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
            mimes: ['video\/mp4', 'video\/quicktime', 'video\/3gpp', 'video\/x-m4v'],
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
      ])
    });
    it('allows two imps in the same bid request', () => {
      let req = JSON.parse(spec.buildRequests([singleBannerBidRequest, singleBannerBidRequest], defaultBidderRequest).data);
      expect(req.imp).to.have.length(2);
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
    it('single video reponse', () => {
      const bids = spec.interpretResponse(openRtbBidResponse(ADTYPE_VIDEO), request);
      assert.deepStrictEqual(bids, interpretedBidsVideo);
    });
    it('ignores bid response with invalid ad type', () => {
      let resp = openRtbBidResponse(ADTYPE_IMG);
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
      let resp = openRtbBidResponse(ADTYPE_IMG);
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
  });
});
