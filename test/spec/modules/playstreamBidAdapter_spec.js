import { expect } from 'chai';
import { spec } from '../../../modules/playstreamBidAdapter.js';
import { BANNER, VIDEO } from '../../../src/mediaTypes.js';

describe('playstreamBidAdapter', function () {
  const BID_PERFECT = {
    bidId: '3ee692b3c7392e',
    bidder: 'playstream',
    bidderRequestId: '256f2e7b8948da',
    params: {
      host: 'exchange.ortb.net',
      adUnitId: '697871ac0ec1c6100e1f9121',
      publisherId: '697871ac0ec1c6100e1f9122',
      type: 'banner',
      ip: '127.0.0.1',
      latitude: 23.21,
      longitude: -23.21,
      maxSlotPerPod: 3,
      maxAdDuration: 120,
      gdpr: 0,
      consent: ''
    },
    placementCode: 'placement_123',
    auctionId: '85a8971a-ba3e-5d02-97a0-2c355cc0c6e3',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    ortb2Imp: {
      ext: {
        gpid: '96b9a82b-cb4f-6e13-a8b1-3d466dd1d7f4',
        tid: '849e6a26-7762-54ca-ac7c-e61628461a28',
        data: {
          pbadslot: '96b9a82b-cb4f-6e13-a8b1-3d466dd1d7f4'
        }
      }
    },
    userIdAsEids: [
      {
        source: 'test.com',
        uids: [
          {
            id: '95af7b37-8873-65db-bd8d-f72739572b39',
          }
        ]
      }
    ],
    ortb2: {
      source: {
        ext: {
          schain: {
            ver: '1.0',
            complete: 1,
            nodes: [
              {
                asi: 'example.com',
                sid: '1',
                hp: 1
              }
            ]
          }
        }
      }
    }
  };
  const BID_WORKS = {
    bidId: '69ff0981d4275b',
    bidder: 'playstream',
    bidderRequestId: '31a0eb02d9275a',
    params: {
      host: 'ads.playstream.media',
      adUnitId: '697871ac0ec1c6100e1f9123',
      publisherId: '697871ac0ec1c6100e1f9124',
      type: 'banner',
    },
    placementCode: 'placement_456',
    auctionId: '593g99ef-3abc-56d9-a92b-e36f4a565b45',
    sizes: [[350, 200]],
    ortb2Imp: {
      ext: {
        gpid: '6a4h00fg-4bcd-67ea-b03c-f47g5b676c56',
        tid: '849e6a26-7762-54ca-ac7c-e61628461a28',
        data: {
          'pbadslot': '6a4h00fg-4bcd-67ea-b03c-f47g5b676c56'
        }
      }
    },
    userIdAsEids: [
      {
        source: 'test.org',
        uids: [
          {
            id: '95af7b37-8873-65db-bd8d-f72739572b39',
          }
        ]
      }
    ],
    ortb2: {
      source: {
        ext: {
          schain: {
            ver: '1.0',
            complete: 1,
            nodes: [
              {
                asi: 'example.co.in',
                sid: '1',
                hp: 1
              },
              {
                asi: 'example.in',
                sid: '2',
                hp: 1
              }
            ]
          }
        }
      }
    }
  };
  const BID_SAME_HOST = {
    bidId: '3ee692b3c7392e',
    bidder: 'playstream',
    bidderRequestId: '256f2e7b8948da',
    params: {
      host: 'exchange.ortb.net',
      adUnitId: '697871ac0ec1c6100e1f9121',
      publisherId: '697871ac0ec1c6100e1f9122',
      type: 'banner',
      ip: '127.0.0.1',
      latitude: 23.21,
      longitude: -23.21,
      maxSlotPerPod: 3,
      maxAdDuration: 120,
      gdpr: 0,
      consent: ''
    },
    placementCode: 'placement_123',
    auctionId: '85a8971a-ba3e-5d02-97a0-2c355cc0c6e3',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    ortb2Imp: {
      ext: {
        gpid: '96b9a82b-cb4f-6e13-a8b1-3d466dd1d7f4',
        tid: '849e6a26-7762-54ca-ac7c-e61628461a28',
        data: {
          'pbadslot': '96b9a82b-cb4f-6e13-a8b1-3d466dd1d7f4'
        }
      }
    },
    userIdAsEids: [
      {
        source: 'test.com',
        uids: [
          {
            id: '95af7b37-8873-65db-bd8d-f72739572b39',
          }
        ]
      }
    ],
    ortb2: {
      source: {
        ext: {
          schain: {
            ver: '1.0',
            complete: 1,
            nodes: [
              {
                asi: 'example.com',
                sid: '1',
                hp: 1
              }
            ]
          }
        }
      }
    }
  };
  const BID_VIDEO_VALID = {
    bidId: 'b98b728e1a3f61',
    bidder: 'playstream',
    bidderRequestId: '256f2e7b8948da',
    params: {
      host: 'exchange.ortb.net',
      adUnitId: '697871ac0ec1c6100e1f9121',
      publisherId: '697871ac0ec1c6100e1f9122',
      type: 'video',
      ip: '127.0.0.1',
      latitude: 23.21,
      longitude: -23.21,
      maxSlotPerPod: 3,
      maxAdDuration: 120,
      gdpr: 0,
      consent: ''
    },
    placementCode: 'placement_123',
    auctionId: '85a8971a-ba3e-5d02-97a0-2c355cc0c6e3',
    mediaTypes: {
      video: {
        playerSize: [[640, 360]],
        context: 'instream'
      }
    },
    ortb2Imp: {
      ext: {
        gpid: '96b9a82b-cb4f-6e13-a8b1-3d466dd1d7f4',
        tid: '849e6a26-7762-54ca-ac7c-e61628461a28',
        data: {
          pbadslot: '96b9a82b-cb4f-6e13-a8b1-3d466dd1d7f4'
        }
      }
    },
    userIdAsEids: [
      {
        source: 'test.com',
        uids: [
          {
            id: '95af7b37-8873-65db-bd8d-f72739572b39',
          }
        ]
      }
    ],
    ortb2: {
      source: {
        ext: {
          schain: {
            ver: '1.0',
            complete: 1,
            nodes: [
              {
                asi: 'example.com',
                sid: '1',
                hp: 1
              }
            ]
          }
        }
      }
    }
  };
  const BID_WITHOUT_HOST = {
    bidId: '120756d8e70571',
    bidder: 'playstream',
    bidderRequestId: 'g3c26g90f88cb7',
    params: {
      adUnitId: '697871ac0ec1c6100e1f9125',
      publisherId: '697871ac0ec1c6100e1f9126',
      type: 'video'
    },
    placementCode: 'placement_789',
    auctionId: 'f5882254-7bb8-52fd-9935-dfe5453d07d9',
    sizes: [[800, 600]],
    ortb2Imp: {
      ext: {
        gpid: 'g6993365-8cc9-63ge-0046-efg6564e18e0',
        tid: '849e6a26-7762-54ca-0c7c-e61628461028',
        data: {
          'pbadslot': 'g6993365-8cc9-63ge-0046-efg6564e18e0'
        }
      }
    },
    userIdAsEids: [
      {
        source: 'test.co.in',
        uids: [
          {
            id: '950f7b37-8873-65db-1d8d-f72739572139',
          },
          {
            id: '061g8c48-9984-76ec-2e9e-g83840683240',
          }
        ]
      }
    ],
    ortb2: {
      source: {
        ext: {
          schain: {
            ver: '1.0',
            complete: 1,
            nodes: [
              {
                asi: 'example.ac.in',
                sid: '1',
                hp: 1
              }
            ]
          }
        }
      }
    }
  };
  const BID_WITHOUT_REQUIRED_FIELDS = {
    bidId: '120756d8e70571',
    bidder: 'playstream',
    bidderRequestId: 'g3c26g90f88cb7',
    params: {
      host: 'exchange.ortb.net',
      type: 'video',
    },
    placementCode: 'placement_789',
    auctionId: 'f5882254-7bb8-52fd-9935-dfe5453d07d9',
    sizes: [[800, 600]],
    ortb2Imp: {
      ext: {
        gpid: 'g6993365-8cc9-63ge-0046-efg6564e18e0',
        tid: '849e6a26-7762-54ca-0c7c-e61628461028',
        data: {
          'pbadslot': 'g6993365-8cc9-63ge-0046-efg6564e18e0'
        }
      }
    },
    userIdAsEids: [
      {
        source: 'test.co.in',
        uids: [
          {
            id: '950f7b37-8873-65db-1d8d-f72739572139',
          },
          {
            id: '061g8c48-9984-76ec-2e9e-g83840683240',
          }
        ]
      }
    ],
    ortb2: {
      source: {
        ext: {
          schain: {
            ver: '1.0',
            complete: 1,
            nodes: [
              {
                asi: 'example.ac.in',
                sid: '1',
                hp: 1
              }
            ]
          }
        }
      }
    }
  };

  describe('buildRequests', function () {
    const bidderRequest = {
      ortb2: {
        device: {
          sua: {
            browsers: [],
            platform: [],
            mobile: 1,
            architecture: 'arm'
          }
        }
      },
      refererInfo: {
        page: 'testPage'
      }
    }
    const serverRequests = spec.buildRequests([BID_PERFECT, BID_WORKS, BID_SAME_HOST], bidderRequest)

    it('Creates two ServerRequests', function () {
      expect(serverRequests).to.exist
      expect(serverRequests).to.have.lengthOf(2)
    })

    serverRequests.forEach(serverRequest => {
      it('Creates a ServerRequest object with method, URL and OpenRTB data', function () {
        expect(serverRequest).to.exist
        expect(serverRequest.method).to.equal('POST');
        expect(serverRequest.url).to.be.a('string');
        expect(serverRequest.data).to.be.an('object');
        expect(serverRequest.options).to.be.an('object');
      })

      it('OpenRTB request has core top-level fields', function () {
        const ortb = serverRequest.data;

        expect(ortb).to.have.property('imp');
        expect(ortb.imp).to.be.an('array').that.is.not.empty;

        expect(ortb).to.have.property('site');
        expect(ortb).to.have.property('device');
        expect(ortb).to.have.property('ext');

        expect(ortb.ext).to.be.an('object');
        expect(ortb.ext).to.have.property('format');

        expect(ortb.device).to.be.an('object');
        expect(ortb.device).to.have.property('sua');
        expect(ortb.device.sua).to.deep.equal(bidderRequest.ortb2.device.sua);
      });
    })

    it('Returns valid URLs', function () {
      const urls = serverRequests.map(r => r.url);
      expect(urls).to.have.members([
        'http://exchange.ortb.net/server/adserver/hb?adUnitId=697871ac0ec1c6100e1f9121&publisherId=697871ac0ec1c6100e1f9122',
        'http://ads.playstream.media/server/adserver/hb?adUnitId=697871ac0ec1c6100e1f9123&publisherId=697871ac0ec1c6100e1f9124'
      ]);
    });

    it('Groups same-host bids into a single OpenRTB request with multiple imps', function () {
      const reqExchange = serverRequests.find(r => r.url.includes('exchange.ortb.net'));
      const reqAds = serverRequests.find(r => r.url.includes('ads.playstream.media'));

      expect(reqExchange).to.exist;
      expect(reqAds).to.exist;

      expect(reqExchange.data.imp).to.have.lengthOf(2);
      expect(reqAds.data.imp).to.have.lengthOf(1);
    });

    it('Each bidRequest becomes one imp and carries ortb2Imp + your custom ext.playstream fields', function () {
      const reqExchange = serverRequests.find(r => r.url.includes('exchange.ortb.net'));
      const reqAds = serverRequests.find(r => r.url.includes('ads.playstream.media'));

      validateImp(reqExchange.data.imp[0], BID_PERFECT);
      validateImp(reqExchange.data.imp[1], BID_SAME_HOST);

      validateImp(reqAds.data.imp[0], BID_WORKS);
    });

    it('site.page prefers bidderRequest.ortb2.site.page when provided (otherwise refererInfo.page)', function () {
      const br = {
        ortb2: {
          site: { page: 'testSitePage' },
          device: { sua: { browsers: [], platform: [], mobile: 1, architecture: 'arm' } }
        },
        refererInfo: { page: 'ignoredPage' }
      };

      const srs = spec.buildRequests([BID_PERFECT], br);
      expect(srs).to.have.lengthOf(1);
      expect(srs[0].data.site.page).to.equal('testSitePage');
    });

    it('Returns empty array if no valid requests are passed', function () {
      const srs = spec.buildRequests([]);
      expect(srs).to.be.an('array').that.is.empty;
    });
  });

  describe('interpretResponse', function () {
    it('Banner: returns valid Prebid bids from an OpenRTB response', function () {
      const bidderRequest = { refererInfo: { page: 'testPage' } };
      const [sr] = spec.buildRequests([BID_PERFECT], bidderRequest);

      const ortbBannerResponse = {
        body: {
          id: 'resp-1',
          cur: 'USD',
          seatbid: [
            {
              seat: 'ps',
              bid: [
                {
                  impid: BID_PERFECT.bidId,
                  price: 15,
                  adm: '<h1>Playstream Ad</h1>',
                  crid: 'fa23f84bba855b',
                  adomain: ['example.com'],
                  w: 300,
                  h: 250,
                  mtype: 1,
                }
              ]
            }
          ]
        }
      };

      const bids = spec.interpretResponse(ortbBannerResponse, sr);
      expect(bids).to.be.an('array').that.is.not.empty;

      const b = bids[0];
      expect(b).to.include.keys('requestId', 'cpm', 'currency', 'ttl', 'creativeId', 'netRevenue', 'meta');
      expect(b.requestId).to.equal(BID_PERFECT.bidId);
      expect(b.cpm).to.equal(15);
      expect(b.currency).to.equal('USD');
      expect(b.meta).to.be.an('object');
      expect(b.meta.advertiserDomains).to.deep.equal(['example.com']);
      expect(b.meta.mediaType).to.equal('banner');
      expect(b).to.have.property('ad');
      expect(b.ad).to.be.a('string');
    });

    it('Video: returns valid Prebid bids from an OpenRTB response (VAST in adm)', function () {
      const bidderRequest = { refererInfo: { page: 'testPage' } };
      const [sr] = spec.buildRequests([BID_VIDEO_VALID], bidderRequest);

      const ortbVideoResponse = {
        body: {
          id: 'resp-2',
          cur: 'USD',
          seatbid: [
            {
              seat: 'ps',
              bid: [
                {
                  impid: BID_VIDEO_VALID.bidId,
                  price: 15,
                  adm: '<VAST></VAST>',
                  crid: 'ce58d726f5d1b9',
                  adomain: ['example.com'],
                  w: 640,
                  h: 360,
                  mtype: 2
                }
              ]
            }
          ]
        }
      };

      const bids = spec.interpretResponse(ortbVideoResponse, sr);
      expect(bids).to.be.an('array').that.is.not.empty;

      const b = bids[0];
      expect(b).to.include.keys('requestId', 'cpm', 'currency', 'ttl', 'creativeId', 'netRevenue', 'meta');
      expect(b.requestId).to.equal(BID_VIDEO_VALID.bidId);
      expect(b.cpm).to.equal(15);
      expect(b.currency).to.equal('USD');
      expect(b.meta.advertiserDomains).to.deep.equal(['example.com']);
      expect(b.meta.mediaType).to.equal('video');
      expect(b).to.have.property('vastXml');
      expect(b.vastXml).to.be.a('string');
    });

    it('Returns empty array if invalid response is passed', function () {
      const bids = spec.interpretResponse('invalid_response', null);
      expect(bids).to.be.an('array').that.is.empty;
    });

    it('Filters out empty banner bids when adm is missing', function () {
      const bidderRequest = { refererInfo: { page: 'testPage' } };
      const [sr] = spec.buildRequests([BID_PERFECT], bidderRequest);

      const resp = {
        body: {
          id: 'resp-3',
          cur: 'USD',
          seatbid: [{ bid: [{ impid: BID_PERFECT.bidId, price: 10, crid: 'x', adomain: ['example.com'], w: 300, h: 250 }] }]
        }
      };

      const bids = spec.interpretResponse(resp, sr);
      expect(bids).to.be.an('array').that.is.empty;
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      [BID_PERFECT, BID_WORKS].forEach(bid => {
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });
    });

    it('should return false when required params are not passed', function () {
      [BID_WITHOUT_HOST, BID_WITHOUT_REQUIRED_FIELDS].forEach(bid => {
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
    });
  });

  describe('getUserSyncs', function () {
    it('should always return empty array (user sync disabled)', function () {
      const serverResponses = [{ body: {} }];
      const syncOptions = { iframeEnabled: true, pixelEnabled: true };

      expect(spec.getUserSyncs(syncOptions, serverResponses)).to.be.an('array').that.is.empty;
    });
  });
});

function validateImp(imp, bid) {
  expect(imp).to.be.an('object');

  expect(imp.id).to.equal(bid.bidId);

  expect(imp.tagid).to.equal(`${bid.params.adUnitId}-${bid.params.publisherId}`);

  expect(imp.ext).to.be.an('object');
  expect(imp.ext.tid).to.equal(bid.ortb2Imp?.ext?.tid);
  expect(imp.ext.gpid).to.equal(bid.ortb2Imp?.ext?.gpid);
  expect(imp.ext.data).to.deep.equal(bid.ortb2Imp?.ext?.data);

  expect(imp.ext.playstream).to.be.an('object');
  expect(imp.ext.playstream.publisherId).to.equal(bid.params.publisherId);
  expect(imp.ext.playstream.adUnitId).to.equal(bid.params.adUnitId);
  expect(imp.ext.playstream.type).to.equal(bid.params.type);

  const sizes = uniqSizes(resolveSizesForTest(bid));
  expect(imp.ext.playstream.sizes).to.deep.equal(
    sizes.map(([w, h]) => ({ w, h }))
  );

  expectOptionalType(imp.ext.playstream, 'maxSlotPerPod', 'number');
  expectOptionalType(imp.ext.playstream, 'maxAdDuration', 'number');

  if (bid.params.type === 'banner') {
    expect(imp).to.have.property('banner');
    expect(imp.banner).to.be.an('object');
    expect(imp.banner).to.have.property('w');
    expect(imp.banner).to.have.property('h');
  } else if (bid.params.type === 'video') {
    expect(imp).to.have.property('video');
    expect(imp.video).to.be.an('object');
    expect(imp.video).to.have.property('w');
    expect(imp.video).to.have.property('h');
  }
}

function expectOptionalType(obj, key, type) {
  if (obj[key] !== undefined && obj[key] !== null) {
    expect(obj[key]).to.be.a(type);
  }
}

function resolveSizesForTest(bid) {
  let sizes = [];

  if (bid.mediaTypes) {
    if (bid.params.type === VIDEO && bid.mediaTypes.video?.playerSize) {
      sizes = toSizeArray(bid.mediaTypes.video.playerSize);
    } else if (bid.params.type === BANNER && bid.mediaTypes.banner?.sizes) {
      sizes = toSizeArray(bid.mediaTypes.banner.sizes);
    } else {
      sizes = toSizeArray(bid.sizes);
    }
  }

  sizes = sizes.concat(toSizeArray(bid.sizes));
  return sizes;
}

function toSizeArray(input) {
  if (!input) return [];

  if (Array.isArray(input) && input.length === 2 && typeof input[0] === 'number' && typeof input[1] === 'number') {
    return [input];
  }

  if (Array.isArray(input) && Array.isArray(input[0])) {
    return input;
  }

  return [];
}

function uniqSizes(sizes) {
  const seen = new Set();
  const out = [];

  for (const s of (sizes || [])) {
    if (!Array.isArray(s) || s.length < 2) continue;
    const w = Number(s[0]);
    const h = Number(s[1]);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) continue;

    const key = `${w}x${h}`;
    if (seen.has(key)) continue;

    seen.add(key);
    out.push([w, h]);
  }

  return out;
}
