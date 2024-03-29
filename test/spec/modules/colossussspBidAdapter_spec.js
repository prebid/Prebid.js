import { expect } from 'chai';
import { spec } from '../../../modules/colossussspBidAdapter.js';

describe('ColossussspAdapter', function () {
  let bid = {
    bidId: '2dd581a2b6281d',
    bidder: 'colossusssp',
    bidderRequestId: '145e1d6a7837c9',
    params: {
      placement_id: 0,
      group_id: 0
    },
    placementCode: 'placementid_0',
    auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    ortb2Imp: {
      ext: {
        tid: '3bb2f6da-87a6-4029-aeb0-bfe951372e62',
        data: {
          pbadslot: '/19968336/prebid_cache_video_adunit'
        }
      }
    },
    schain: {
      ver: '1.0',
      complete: 1,
      nodes: [
        {
          asi: 'example.com',
          sid: '0',
          hp: 1,
          rid: 'bidrequestid',
          // name: 'alladsallthetime',
          domain: 'example.com'
        }
      ]
    }
  };
  let bidderRequest = {
    bidderCode: 'colossus',
    auctionId: 'fffffff-ffff-ffff-ffff-ffffffffffff',
    bidderRequestId: 'ffffffffffffff',
    start: 1472239426002,
    auctionStart: 1472239426000,
    timeout: 5000,
    uspConsent: '1YN-',
    gdprConsent: {
      consentString: 'xxx',
      gdprApplies: 1
    },
    refererInfo: {
      referer: 'http://www.example.com',
      reachedTop: true,
    },
    ortb2: {
      app: {
        name: 'myappname',
        keywords: 'power tools, drills',
        content: {
          data: [
            {
              name: 'www.dataprovider1.com',
              ext: {
                segtax: 6
              },
              segment: [
                {
                  id: '687'
                },
                {
                  id: '123'
                }
              ]
            },
            {
              name: 'www.dataprovider1.com',
              ext: {
                segtax: 7
              },
              segment: [
                {
                  id: '456'
                },
                {
                  id: '789'
                }
              ]
            }
          ]
        }
      },
      site: {
        name: 'example',
        domain: 'page.example.com',
        cat: ['IAB2'],
        sectioncat: ['IAB2-2'],
        pagecat: ['IAB2-2'],
        page: 'https://page.example.com/here.html',
        ref: 'https://ref.example.com',
        keywords: 'power tools, drills',
        search: 'drill',
        content: {
          userrating: '4',
          data: [{
            name: 'www.dataprovider1.com',
            ext: {
              segtax: 7,
              cids: ['iris_c73g5jq96mwso4d8']
            },
            segment: [
              { id: '687' },
              { id: '123' }
            ]
          }]
        },
        ext: {
          data: {
            pageType: 'article',
            category: 'repair'
          }
        }
      },
      user: {
        yob: 1985,
        gender: 'm',
        keywords: 'a,b',
        data: [{
          name: 'dataprovider.com',
          ext: { segtax: 4 },
          segment: [
            { id: '1' }
          ]
        }],
        ext: {
          data: {
            registered: true,
            interests: ['cars']
          }
        }
      }
    },
    bids: [bid]
  }

  describe('isBidRequestValid', function () {
    it('Should return true when placement_id can be cast to a number', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false when placement_id is not a number', function () {
      bid.params.placement_id = 'aaa';
      delete bid.params.group_id;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let serverRequest = spec.buildRequests([bid], bidderRequest);
    it('Creates a ServerRequest object with method, URL and data', function () {
      expect(serverRequest).to.exist;
      expect(serverRequest.method).to.exist;
      expect(serverRequest.url).to.exist;
      expect(serverRequest.data).to.exist;
    });
    it('Returns POST method', function () {
      expect(serverRequest.method).to.equal('POST');
    });
    it('Returns valid URL', function () {
      expect(serverRequest.url).to.equal('https://colossusssp.com/?c=o&m=multi');
    });
    it('Should contain ccpa', function () {
      expect(serverRequest.data.ccpa).to.be.an('string')
    })

    it('Returns valid data if array of bids is valid', function () {
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('deviceWidth', 'deviceHeight', 'language', 'secure', 'host', 'page', 'placements', 'ccpa', 'gdpr_consent', 'gdpr_require', 'userObj', 'siteObj', 'appObj');
      expect(data.deviceWidth).to.be.a('number');
      expect(data.deviceHeight).to.be.a('number');
      expect(data.language).to.be.a('string');
      expect(data.secure).to.be.within(0, 1);
      expect(data.host).to.be.a('string');
      expect(data.page).to.be.a('string');
      let placements = data['placements'];
      for (let i = 0; i < placements.length; i++) {
        let placement = placements[i];
        expect(placement).to.have.all.keys('placementId', 'groupId', 'eids', 'bidId', 'traffic', 'sizes', 'schain', 'floor', 'gpid', 'tid');
        expect(placement.schain).to.be.an('object')
        expect(placement.placementId).to.be.a('number');
        expect(placement.groupId).to.be.a('number');
        expect(placement.bidId).to.be.a('string');
        expect(placement.traffic).to.be.a('string');
        expect(placement.sizes).to.be.an('array');
        expect(placement.floor).to.be.an('object');
        expect(placement.gpid).to.be.an('string');
        expect(placement.tid).to.be.an('string');
      }
    });

    it('Returns valid video data if array of bids is valid', function () {
      const videoBid = {
        ...bid,
        params: {
          placement_id: 0,
        },
        mediaTypes: {
          video: {
            playerSize: [[300, 300]],
            minduration: 5,
            maxduration: 60
          }
        }
      }
      let serverRequest = spec.buildRequests([videoBid], bidderRequest);

      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('deviceWidth', 'deviceHeight', 'language', 'secure', 'host', 'page', 'placements', 'ccpa', 'gdpr_consent', 'gdpr_require', 'userObj', 'siteObj', 'appObj');
      expect(data.deviceWidth).to.be.a('number');
      expect(data.deviceHeight).to.be.a('number');
      expect(data.language).to.be.a('string');
      expect(data.secure).to.be.within(0, 1);
      expect(data.host).to.be.a('string');
      expect(data.page).to.be.a('string');
      let placements = data['placements'];
      for (let i = 0; i < placements.length; i++) {
        let placement = placements[i];
        expect(placement).to.have.all.keys('placementId', 'groupId', 'eids', 'bidId', 'traffic', 'schain', 'floor', 'gpid', 'sizes',
          'playerSize', 'minduration', 'maxduration', 'mimes', 'protocols', 'startdelay', 'placement', 'skip', 'skipafter',
          'minbitrate', 'maxbitrate', 'delivery', 'playbackmethod', 'api', 'linearity', 'tid'
        );
        expect(placement.schain).to.be.an('object')
        expect(placement.placementId).to.be.a('number');
        expect(placement.bidId).to.be.a('string');
        expect(placement.traffic).to.be.a('string');
        expect(placement.floor).to.be.an('object');
        expect(placement.gpid).to.be.an('string');
        expect(placement.sizes).to.be.an('array');
        expect(placement.playerSize).to.be.an('array');
        expect(placement.minduration).to.be.an('number');
        expect(placement.maxduration).to.be.an('number');
        expect(placement.tid).to.be.an('string');
      }
    });

    it('Returns empty data if no valid requests are passed', function () {
      serverRequest = spec.buildRequests([], bidderRequest);
      let data = serverRequest.data;
      expect(data.placements).to.be.an('array').that.is.empty;
    });
  });

  describe('buildRequests with user ids', function () {
    var clonedBid = JSON.parse(JSON.stringify(bid));
    clonedBid.userId = {}
    clonedBid.userId.britepoolid = 'britepoolid123';
    clonedBid.userId.idl_env = 'idl_env123';
    clonedBid.userId.tdid = 'tdid123';
    clonedBid.userId.id5id = { uid: 'id5id123' };
    clonedBid.userId.uid2 = { id: 'uid2id123' };
    clonedBid.userIdAsEids = [
      {
        'source': 'pubcid.org',
        'uids': [
          {
            'id': '4679e98e-1d83-4718-8aba-aa88hhhaaa',
            'atype': 1
          }
        ]
      },
      {
        'source': 'adserver.org',
        'uids': [
          {
            'id': 'e804908e-57b4-4f46-a097-08be44321e79',
            'atype': 1,
            'ext': {
              'rtiPartner': 'TDID'
            }
          }
        ]
      },
      {
        'source': 'neustar.biz',
        'uids': [
          {
            'id': 'E1:Bvss1x8hXM2zHeqiqj2umJUziavSvLT6E_ORri5fDCsZb-5sfD18oNWycTmdx6QBNdbURBVv466hLJiKSwHCaTxvROo8smjqj6GfvlKfzQI',
            'atype': 1
          }
        ]
      }
    ];
    let serverRequest = spec.buildRequests([clonedBid], bidderRequest);
    it('Returns valid data if array of bids is valid', function () {
      let data = serverRequest.data;
      let placements = data['placements'];
      expect(data).to.be.an('object');
      for (let i = 0; i < placements.length; i++) {
        let placement = placements[i];
        expect(placement).to.have.property('eids')
        expect(placement.eids).to.be.an('array')
        expect(placement.eids.length).to.be.equal(8)
        for (let index in placement.eids) {
          let v = placement.eids[index];
          expect(v).to.have.all.keys('source', 'uids')
          expect(v.source).to.be.oneOf(['pubcid.org', 'adserver.org', 'neustar.biz', 'britepool.com', 'identityLink', 'id5-sync.com', 'adserver.org', 'uidapi.com'])
          expect(v.uids).to.be.an('array');
          expect(v.uids.length).to.be.equal(1)
          expect(v.uids[0]).to.have.property('id')
        }
      }
    });
  });

  describe('gpp consent', function () {
    it('bidderRequest.gppConsent', () => {
      bidderRequest.gppConsent = {
        gppString: 'abc123',
        applicableSections: [8]
      };

      let serverRequest = spec.buildRequests([bid], bidderRequest);
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.property('gpp');
      expect(data).to.have.property('gpp_sid');

      delete bidderRequest.gppConsent;
    })

    it('bidderRequest.ortb2.regs.gpp', () => {
      bidderRequest.ortb2.regs = bidderRequest.ortb2.regs || {};
      bidderRequest.ortb2.regs.gpp = 'abc123';
      bidderRequest.ortb2.regs.gpp_sid = [8];

      let serverRequest = spec.buildRequests([bid], bidderRequest);
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data).to.have.property('gpp');
      expect(data).to.have.property('gpp_sid');
    })
  });

  describe('interpretResponse', function () {
    let resObject = {
      body: [{
        requestId: '123',
        mediaType: 'banner',
        cpm: 0.3,
        width: 320,
        height: 50,
        ad: '<h1>Hello ad</h1>',
        ttl: 1000,
        creativeId: '123asd',
        netRevenue: true,
        currency: 'USD',
        meta: {
          advertiserDomains: ['google.com'],
          advertiserId: 1234
        }
      }]
    };
    let serverResponses = spec.interpretResponse(resObject);
    it('Returns an array of valid server responses if response object is valid', function () {
      expect(serverResponses).to.be.an('array').that.is.not.empty;
      for (let i = 0; i < serverResponses.length; i++) {
        let dataItem = serverResponses[i];
        expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId',
          'netRevenue', 'currency', 'mediaType', 'meta');
        expect(dataItem.requestId).to.be.a('string');
        expect(dataItem.cpm).to.be.a('number');
        expect(dataItem.width).to.be.a('number');
        expect(dataItem.height).to.be.a('number');
        expect(dataItem.ad).to.be.a('string');
        expect(dataItem.ttl).to.be.a('number');
        expect(dataItem.creativeId).to.be.a('string');
        expect(dataItem.netRevenue).to.be.a('boolean');
        expect(dataItem.currency).to.be.a('string');
        expect(dataItem.mediaType).to.be.a('string');
        expect(dataItem.meta).to.be.an('object').that.has.any.key('advertiserDomains');
      }
      it('Returns an empty array if invalid response is passed', function () {
        serverResponses = spec.interpretResponse('invalid_response');
        expect(serverResponses).to.be.an('array').that.is.empty;
      });
    });

    let videoResObject = {
      body: [{
        requestId: '123',
        mediaType: 'video',
        cpm: 0.3,
        width: 320,
        height: 50,
        vastUrl: '<XML>',
        ttl: 1000,
        creativeId: '123asd',
        netRevenue: true,
        currency: 'USD',
        meta: {
          advertiserDomains: ['google.com'],
          advertiserId: 1234
        }
      }]
    };
    let videoServerResponses = spec.interpretResponse(videoResObject);
    it('Returns an array of valid server video responses if response object is valid', function () {
      expect(videoServerResponses).to.be.an('array').that.is.not.empty;
      for (let i = 0; i < videoServerResponses.length; i++) {
        let dataItem = videoServerResponses[i];
        expect(dataItem).to.have.all.keys('requestId', 'cpm', 'width', 'height', 'vastUrl', 'ttl', 'creativeId',
          'netRevenue', 'currency', 'mediaType', 'meta');
        expect(dataItem.requestId).to.be.a('string');
        expect(dataItem.cpm).to.be.a('number');
        expect(dataItem.width).to.be.a('number');
        expect(dataItem.height).to.be.a('number');
        expect(dataItem.vastUrl).to.be.a('string');
        expect(dataItem.ttl).to.be.a('number');
        expect(dataItem.creativeId).to.be.a('string');
        expect(dataItem.netRevenue).to.be.a('boolean');
        expect(dataItem.currency).to.be.a('string');
        expect(dataItem.mediaType).to.be.a('string');
        expect(dataItem.meta).to.be.an('object').that.has.any.key('advertiserDomains');
      }
      it('Returns an empty array if invalid response is passed', function () {
        videoServerResponses = spec.interpretResponse('invalid_response');
        expect(videoServerResponses).to.be.an('array').that.is.empty;
      });
    });
  });

  describe('onBidWon', function () {
    it('should make an ajax call', function () {
      const bid = {
        nurl: 'http://example.com/win',
      };
      expect(spec.onBidWon(bid)).to.equals(undefined);
    });
  })

  describe('getUserSyncs', function () {
    let userSync = spec.getUserSyncs({}, {}, { consentString: 'xxx', gdprApplies: 1 }, { consentString: '1YN-' });
    it('Returns valid URL and type', function () {
      expect(userSync).to.be.an('array').with.lengthOf(1);
      expect(userSync[0].type).to.exist;
      expect(userSync[0].url).to.exist;
      expect(userSync[0].type).to.be.equal('image');
      expect(userSync[0].url).to.be.equal('https://sync.colossusssp.com/image?pbjs=1&gdpr=0&gdpr_consent=xxx&ccpa_consent=1YN-&coppa=0');
    });
  });
});
