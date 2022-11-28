import { expect } from 'chai'
import { spec, _getPlatform } from 'modules/sonobiBidAdapter.js'
import { newBidder } from 'src/adapters/bidderFactory.js'
import { userSync } from '../../../src/userSync.js';
import { config } from 'src/config.js';
import * as utils from '../../../src/utils.js';

describe('SonobiBidAdapter', function () {
  const adapter = newBidder(spec)
  describe('.code', function () {
    it('should return a bidder code of sonobi', function () {
      expect(spec.code).to.equal('sonobi')
    })
  })

  describe('inherited functions', function () {
    it('should exist and be a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })

  describe('.isBidRequestValid', function () {
    it('should return false if there are no params', () => {
      const bid = {
        'bidder': 'sonobi',
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if there is no placement_id param and no ad_unit param', () => {
      const bid = {
        'bidder': 'sonobi',
        'adUnitCode': 'adunit-code',
        params: {
          placementId: '1a2b3c4d5e6f1a2b3c4d',
        },
        'mediaTypes': {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if there is no mediaTypes', () => {
      const bid = {
        'bidder': 'sonobi',
        'adUnitCode': 'adunit-code',
        params: {
          placement_id: '1a2b3c4d5e6f1a2b3c4d'
        },
        'mediaTypes': {
        },
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true if the bid is valid', () => {
      const bid = {
        'bidder': 'sonobi',
        'adUnitCode': 'adunit-code',
        params: {
          placement_id: '1a2b3c4d5e6f1a2b3c4d'
        },
        'mediaTypes': {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    describe('banner', () => {
      it('should return false if there are no banner sizes and no param sizes', () => {
        const bid = {
          'bidder': 'sonobi',
          'adUnitCode': 'adunit-code',
          params: {
            placement_id: '1a2b3c4d5e6f1a2b3c4d'
          },
          'mediaTypes': {
            banner: {

            }
          },
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return true if there is banner sizes and no param sizes', () => {
        const bid = {
          'bidder': 'sonobi',
          'adUnitCode': 'adunit-code',
          params: {
            placement_id: '1a2b3c4d5e6f1a2b3c4d'
          },
          'mediaTypes': {
            banner: {
              sizes: [[300, 250], [300, 600]]
            }
          },
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
        };
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return true if there is param sizes and no banner sizes', () => {
        const bid = {
          'bidder': 'sonobi',
          'adUnitCode': 'adunit-code',
          params: {
            placement_id: '1a2b3c4d5e6f1a2b3c4d',
            sizes: [[300, 250], [300, 600]]
          },
          'mediaTypes': {
            banner: {
            }
          },
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
        };
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });
    });

    describe('video', () => {
      describe('instream', () => {
        it('should return false if there is no playerSize defined in the video mediaType', () => {
          const bid = {
            'bidder': 'sonobi',
            'adUnitCode': 'adunit-code',
            params: {
              placement_id: '1a2b3c4d5e6f1a2b3c4d',
              sizes: [[300, 250], [300, 600]]
            },
            'mediaTypes': {
              video: {
                context: 'instream'
              }
            },
            'bidId': '30b31c1838de1e',
            'bidderRequestId': '22edbae2733bf6',
            'auctionId': '1d1a030790a475',
          };
          expect(spec.isBidRequestValid(bid)).to.equal(false);
        });

        it('should return true if there is playerSize defined on the video mediaType', () => {
          const bid = {
            'bidder': 'sonobi',
            'adUnitCode': 'adunit-code',
            params: {
              placement_id: '1a2b3c4d5e6f1a2b3c4d',
            },
            'mediaTypes': {
              video: {
                context: 'instream',
                playerSize: [300, 250]
              }
            },
            'bidId': '30b31c1838de1e',
            'bidderRequestId': '22edbae2733bf6',
            'auctionId': '1d1a030790a475',
          };
          expect(spec.isBidRequestValid(bid)).to.equal(true);
        });
      });

      describe('outstream', () => {
        it('should return false if there is no param sizes', () => {
          const bid = {
            'bidder': 'sonobi',
            'adUnitCode': 'adunit-code',
            params: {
              placement_id: '1a2b3c4d5e6f1a2b3c4d',
            },
            'mediaTypes': {
              video: {
                context: 'outstream',
                playerSize: [300, 250]
              }
            },
            'bidId': '30b31c1838de1e',
            'bidderRequestId': '22edbae2733bf6',
            'auctionId': '1d1a030790a475',
          };
          expect(spec.isBidRequestValid(bid)).to.equal(false);
        });

        it('should return true if there is param sizes', () => {
          const bid = {
            'bidder': 'sonobi',
            'adUnitCode': 'adunit-code',
            params: {
              placement_id: '1a2b3c4d5e6f1a2b3c4d',
              sizes: [300, 250]

            },
            'mediaTypes': {
              video: {
                context: 'outstream'
              }
            },
            'bidId': '30b31c1838de1e',
            'bidderRequestId': '22edbae2733bf6',
            'auctionId': '1d1a030790a475',
          };
          expect(spec.isBidRequestValid(bid)).to.equal(true);
        });
      });
    });
  });

  describe('.buildRequests', function () {
    let sandbox;
    beforeEach(function () {
      sinon.stub(userSync, 'canBidderRegisterSync');
      sinon.stub(utils, 'getGptSlotInfoForAdUnitCode')
        .onFirstCall().returns({ gptSlot: '/123123/gpt_publisher/adunit-code-3', divId: 'adunit-code-3-div-id' });
      sandbox = sinon.createSandbox();
    });
    afterEach(function () {
      userSync.canBidderRegisterSync.restore();
      utils.getGptSlotInfoForAdUnitCode.restore();
      sandbox.restore();
    });
    let bidRequest = [{
      'schain': {
        'ver': '1.0',
        'complete': 1,
        'nodes': [
          {
            'asi': 'indirectseller.com',
            'sid': '00001',
            'hp': 1
          },
          {
            'asi': 'indirectseller-2.com',
            'sid': '00002',
            'hp': 0
          },
        ]
      },
      'bidder': 'sonobi',
      'params': {
        'keywords': 'sports,news,some_other_keyword',
        'placement_id': '1a2b3c4d5e6f1a2b3c4d',
        'sizes': [[300, 250], [300, 600]],
        'floor': '1.25',
        'referrer': 'overrides_top_window_location'
      },
      'adUnitCode': 'adunit-code-1',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1f',
      ortb2Imp: {
        ext: {
          data: {
            pbadslot: '/123123/gpt_publisher/adunit-code-1'
          }
        }
      },
      mediaTypes: {
        video: {
          context: 'outstream'
        }
      }
    },
    {
      'bidder': 'sonobi',
      'params': {
        'placement_id': '1a2b3c4d5e6f1a2b3c4e',
        'sizes': [[300, 250], [300, 600]],
        'referrer': 'overrides_top_window_location'
      },
      'adUnitCode': 'adunit-code-3',
      'sizes': [[120, 600], [300, 600], [160, 600]],
      'bidId': '30b31c1838de1d',
      'getFloor': ({ currency, mediaType, size }) => {
        return {
          currency: 'USD',
          floor: 0.42
        }
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      }
    },
    {
      'bidder': 'sonobi',
      'params': {
        'ad_unit': '/7780971/sparks_prebid_LB',
        'sizes': [[300, 250], [300, 600]],
        'referrer': 'overrides_top_window_location'
      },
      'adUnitCode': 'adunit-code-2',
      'sizes': [[120, 600], [300, 600], [160, 600]],
      'bidId': '30b31c1838de1e',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      }
    }];

    let keyMakerData = {
      '30b31c1838de1f': '1a2b3c4d5e6f1a2b3c4d||f=1.25,gpid=/123123/gpt_publisher/adunit-code-1,c=v,',
      '30b31c1838de1d': '1a2b3c4d5e6f1a2b3c4e|300x250,300x600|f=0.42,gpid=/123123/gpt_publisher/adunit-code-3,c=d,',
      '/7780971/sparks_prebid_LB|30b31c1838de1e': '300x250,300x600|gpid=/7780971/sparks_prebid_LB,c=d,',
    };

    let bidderRequests = {
      'gdprConsent': {
        'consentString': 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        'vendorData': {},
        'gdprApplies': true
      },
      'refererInfo': {
        'numIframes': 0,
        'reachedTop': true,
        'page': 'https://example.com',
        'stack': ['https://example.com']
      },
      uspConsent: 'someCCPAString'
    };

    it('should set fpd if there is any data in ortb2', function () {
      const ortb2 = {
        site: {
          ext: {
            data: {
              pageType: 'article',
              category: 'tools'
            }
          }
        },
        user: {
          ext: {
            data: {
              registered: true,
              interests: ['cars']
            }
          }
        }
      };
      const bidRequests = spec.buildRequests(bidRequest, {...bidderRequests, ortb2});
      expect(bidRequests.data.fpd).to.equal(JSON.stringify(ortb2));
    });

    it('should populate coppa as 1 if set in config', function () {
      config.setConfig({ coppa: true });
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests);

      expect(bidRequests.data.coppa).to.equal(1);
    });

    it('should populate coppa as 0 if set in config', function () {
      config.setConfig({ coppa: false });
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests);

      expect(bidRequests.data.coppa).to.equal(0);
    });

    it('should return a properly formatted request', function () {
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests)
      const bidRequestsPageViewID = spec.buildRequests(bidRequest, bidderRequests)
      expect(bidRequests.url).to.equal('https://apex.go.sonobi.com/trinity.json')
      expect(bidRequests.method).to.equal('GET')
      expect(bidRequests.data.key_maker).to.deep.equal(JSON.stringify(keyMakerData))
      expect(bidRequests.data.ref).not.to.be.empty
      expect(bidRequests.data.s).not.to.be.empty
      expect(bidRequests.data.pv).to.equal(bidRequestsPageViewID.data.pv)
      expect(bidRequests.data.hfa).to.not.exist
      expect(bidRequests.bidderRequests).to.eql(bidRequest);
      expect(bidRequests.data.ref).to.equal('overrides_top_window_location');
      expect(['mobile', 'tablet', 'desktop']).to.contain(bidRequests.data.vp);
    })

    it('should return a properly formatted request with GDPR applies set to true', function () {
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests)
      expect(bidRequests.url).to.equal('https://apex.go.sonobi.com/trinity.json')
      expect(bidRequests.method).to.equal('GET')
      expect(bidRequests.data.gdpr).to.equal('true')
      expect(bidRequests.data.consent_string).to.equal('BOJ/P2HOJ/P2HABABMAAAAAZ+A==')
    })

    it('should return a properly formatted request with referer', function () {
      bidRequest[0].params.referrer = ''
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests)
      expect(bidRequests.data.ref).to.equal('https://example.com')
    })

    it('should return a properly formatted request with GDPR applies set to false', function () {
      bidderRequests.gdprConsent.gdprApplies = false;
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests)
      expect(bidRequests.url).to.equal('https://apex.go.sonobi.com/trinity.json')
      expect(bidRequests.method).to.equal('GET')
      expect(bidRequests.data.gdpr).to.equal('false')
      expect(bidRequests.data.consent_string).to.equal('BOJ/P2HOJ/P2HABABMAAAAAZ+A==')
    })
    it('should return a properly formatted request with GDPR applies set to false with no consent_string param', function () {
      let bidderRequests = {
        'gdprConsent': {
          'consentString': undefined,
          'vendorData': {},
          'gdprApplies': false
        },
        'refererInfo': {
          'numIframes': 0,
          'reachedTop': true,
          'page': 'https://example.com',
          'stack': ['https://example.com']
        }
      };
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests)
      expect(bidRequests.url).to.equal('https://apex.go.sonobi.com/trinity.json')
      expect(bidRequests.method).to.equal('GET')
      expect(bidRequests.data.gdpr).to.equal('false')
      expect(bidRequests.data).to.not.include.keys('consent_string')
    })
    it('should return a properly formatted request with GDPR applies set to true with no consent_string param', function () {
      let bidderRequests = {
        'gdprConsent': {
          'consentString': undefined,
          'vendorData': {},
          'gdprApplies': true
        },
        'refererInfo': {
          'numIframes': 0,
          'reachedTop': true,
          'page': 'https://example.com',
          'stack': ['https://example.com']
        }
      };
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests)
      expect(bidRequests.url).to.equal('https://apex.go.sonobi.com/trinity.json')
      expect(bidRequests.method).to.equal('GET')
      expect(bidRequests.data.gdpr).to.equal('true')
      expect(bidRequests.data).to.not.include.keys('consent_string')
    })
    it('should return a properly formatted request with hfa', function () {
      bidRequest[0].params.hfa = 'hfakey'
      bidRequest[1].params.hfa = 'hfakey'
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests)
      expect(bidRequests.url).to.equal('https://apex.go.sonobi.com/trinity.json')
      expect(bidRequests.method).to.equal('GET')
      expect(bidRequests.data.ref).not.to.be.empty
      expect(bidRequests.data.s).not.to.be.empty
      expect(bidRequests.data.hfa).to.equal('hfakey')
    })

    it('should return null if there is nothing to bid on', function () {
      const bidRequests = spec.buildRequests([{ params: {} }], bidderRequests)
      expect(bidRequests).to.equal(null);
    });

    it('should set ius as 0 if Sonobi cannot drop iframe pixels', function () {
      userSync.canBidderRegisterSync.returns(false);
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests);
      expect(bidRequests.data.ius).to.equal(0);
    });

    it('should set ius as 1 if Sonobi can drop iframe pixels', function () {
      userSync.canBidderRegisterSync.returns(true);
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests);
      expect(bidRequests.data.ius).to.equal(1);
    });

    it('should return a properly formatted request with schain defined', function () {
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests);
      expect(JSON.parse(bidRequests.data.schain)).to.deep.equal(bidRequest[0].schain)
    });

    it('should return a properly formatted request with eids as a JSON-encoded set of eids', function () {
      bidRequest[0].userIdAsEids = [
        {
          'source': 'pubcid.org',
          'uids': [
            {
              'id': '97b1ff9b-6bf1-41fc-95de-acfd33dbb95a',
              'atype': 1
            }
          ]
        }
      ];
      bidRequest[1].userIdAsEids = [
        {
          'source': 'pubcid.org',
          'uids': [
            {
              'id': '97b1ff9b-6bf1-41fc-95de-acfd33dbb95a',
              'atype': 1
            }
          ]
        }
      ];
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests);
      expect(bidRequests.url).to.equal('https://apex.go.sonobi.com/trinity.json');
      expect(bidRequests.method).to.equal('GET');
      expect(bidRequests.data.ref).not.to.be.empty;
      expect(bidRequests.data.s).not.to.be.empty;
      expect(JSON.parse(bidRequests.data.eids)).to.eql([
        {
          'source': 'pubcid.org',
          'uids': [
            {
              'id': '97b1ff9b-6bf1-41fc-95de-acfd33dbb95a',
              'atype': 1
            }
          ]
        }
      ]);
    });

    it('should return a properly formatted request with userid as a JSON-encoded set of User ID results', function () {
      bidRequest[0].userId = { 'pubcid': 'abcd-efg-0101', 'tdid': 'td-abcd-efg-0101', 'id5id': { 'uid': 'ID5-ZHMOrVeUVTUKgrZ-a2YGxeh5eS_pLzHCQGYOEAiTBQ', 'ext': { 'linkType': 2 } } };
      bidRequest[1].userId = { 'pubcid': 'abcd-efg-0101', 'tdid': 'td-abcd-efg-0101', 'id5id': { 'uid': 'ID5-ZHMOrVeUVTUKgrZ-a2YGxeh5eS_pLzHCQGYOEAiTBQ', 'ext': { 'linkType': 2 } } };
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests);
      expect(bidRequests.url).to.equal('https://apex.go.sonobi.com/trinity.json');
      expect(bidRequests.method).to.equal('GET');
      expect(bidRequests.data.ref).not.to.be.empty;
      expect(bidRequests.data.s).not.to.be.empty;
      expect(JSON.parse(bidRequests.data.userid)).to.eql({ 'pubcid': 'abcd-efg-0101', 'tdid': 'td-abcd-efg-0101', 'id5id': 'ID5-ZHMOrVeUVTUKgrZ-a2YGxeh5eS_pLzHCQGYOEAiTBQ' });
    });

    it('should return a properly formatted request with userid omitted if there are no userIds', function () {
      bidRequest[0].userId = {};
      bidRequest[1].userId = {};
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests);
      expect(bidRequests.url).to.equal('https://apex.go.sonobi.com/trinity.json');
      expect(bidRequests.method).to.equal('GET');
      expect(bidRequests.data.ref).not.to.be.empty;
      expect(bidRequests.data.s).not.to.be.empty;
      expect(bidRequests.data.userid).to.equal(undefined);
    });

    it('should return a properly formatted request with userid omitted', function () {
      bidRequest[0].userId = undefined;
      bidRequest[1].userId = undefined;
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests);
      expect(bidRequests.url).to.equal('https://apex.go.sonobi.com/trinity.json');
      expect(bidRequests.method).to.equal('GET');
      expect(bidRequests.data.ref).not.to.be.empty;
      expect(bidRequests.data.s).not.to.be.empty;
      expect(bidRequests.data.userid).to.equal(undefined);
    });

    it('should return a properly formatted request with keywrods included as a csv of strings', function () {
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests);
      expect(bidRequests.data.kw).to.equal('sports,news,some_other_keyword');
    });

    it('should return a properly formatted request with us_privacy included', function () {
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests);
      expect(bidRequests.data.us_privacy).to.equal('someCCPAString');
    });

    it('should make a request to the url defined in the bidder param', function () {
      const bRequest = [
        {
          ...bidRequest[0],
          params: {
            ...bidRequest[0].params,
            bid_request_url: 'https://iad-2-apex.go.sonobi.com/trinity.json'
          }
        }
      ];
      const bidRequests = spec.buildRequests(bRequest, bidderRequests);
      expect(bidRequests.url).to.equal('https://iad-2-apex.go.sonobi.com/trinity.json');
    });
  });

  describe('.interpretResponse', function () {
    const bidRequests = {
      'method': 'GET',
      'url': 'https://apex.go.sonobi.com/trinity.json',
      'withCredentials': true,
      'data': {
        'key_maker': '{"30b31c1838de1f":"1a2b3c4d5e6f1a2b3c4d|300x250,300x600|f=1.25","/7780971/sparks_prebid_LB|30b31c1838de1e":"300x250,300x600"}', 'ref': 'https://localhost/', 's': '2474372d-c0ff-4f46-aef4-a173058403d9', 'pv': 'c9cfc207-cd83-4a01-b591-8bb29389d4b0'
      },
      'bidderRequests': [
        {
          'bidder': 'sonobi',
          'params': {
            'ad_unit': '/7780971/sparks_prebid_LB',
            'sizes': [[300, 250], [300, 600]],
            'floor': '1.25'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '30b31c1838de1f'
        },
        {
          'bidder': 'sonobi',
          'params': {
            'placement_id': '1a2b3c4d5e6f1a2b3c4d',
            'sizes': [[300, 250], [300, 600]]
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[120, 600], [300, 600], [160, 600]],
          'bidId': '30b31c1838de1e'
        },
        {
          'bidder': 'sonobi',
          'params': {
            'ad_unit': '/7780971/sparks_prebid_LB',
            'sizes': [[300, 250], [300, 600]]
          },
          'adUnitCode': 'adunit-code-3',
          'sizes': [[120, 600], [300, 600], [160, 600]],
          'bidId': '30b31c1838de1g'
        },
        {
          'bidId': '30b31c1838de1zzzz',
          'adUnitCode': 'outstream-dom-id',
          bidder: 'sonobi',
          mediaTypes: {
            video: {
              context: 'outstream'
            }
          },
          params: {
            placement_id: '92e95368e86639dbd86d',
            sizes: [[640, 480]]
          }
        }
      ]
    };

    let bidResponse = {
      'body': {
        'slots': {
          '/7780971/sparks_prebid_LB|30b31c1838de1f': {
            'sbi_size': '300x600',
            'sbi_apoc': 'remnant',
            'sbi_crid': '1234abcd',
            'sbi_aid': '30292e432662bd5f86d90774b944b039',
            'sbi_mouse': 1.07,
            'sbi_adomain': 'sonobi.com'
          },
          '30b31c1838de1e': {
            'sbi_size': '300x250',
            'sbi_apoc': 'remnant',
            'sbi_aid': '30292e432662bd5f86d90774b944b038',
            'sbi_mouse': 1.25,
            'sbi_dozer': 'dozerkey',
            'sbi_ct': 'video',
            'sbi_adomain': 'sonobi.com'

          },
          '/7780971/sparks_prebid_LB_OUTSTREAM|30b31c1838de1g': {
            'sbi_size': '300x600',
            'sbi_apoc': 'remnant',
            'sbi_crid': '1234abcd',
            'sbi_aid': '30292e432662bd5f86d90774b944b038',
            'sbi_mouse': 1.07,
            'sbi_adomain': 'sonobi.com'

          },
          '/7780971/sparks_prebid_LB|30b31c1838de1g': {},
          '30b31c1838de1zzzz': {
            sbi_aid: 'force_1550072228_da1c5d030cb49150c5db8a2136175755',
            sbi_apoc: 'premium',
            sbi_ct: 'video',
            sbi_curr: 'USD',
            sbi_mouse: 1.25,
            sbi_size: 'preroll',
            'sbi_crid': 'somecrid',
            'sbi_adomain': 'sonobi.com'

          }

        },
        'sbi_dc': 'mco-1-',
        'sbi_px': [{
          'code': 'so',
          'delay': 0,
          'url': 'https://example.com/pixel.png',
          'type': 'image'
        }],
        'sbi_suid': 'af99f47a-e7b1-4791-ab32-34952d87c5a0',
      }
    };

    let prebidResponse = [
      {
        'requestId': '30b31c1838de1f',
        'cpm': 1.07,
        'width': 300,
        'height': 600,
        'ad': `<script type="text/javascript" src="https://mco-1-apex.go.sonobi.com/sbi.js?aid=30292e432662bd5f86d90774b944b039&as=null&ref=https%3A%2F%2Flocalhost%2F"></script>`,
        'ttl': 500,
        'creativeId': '1234abcd',
        'netRevenue': true,
        'currency': 'USD',
        'aid': '30292e432662bd5f86d90774b944b039',
        meta: {
          advertiserDomains: ['sonobi.com']
        }
      },
      {
        'requestId': '30b31c1838de1e',
        'cpm': 1.25,
        'width': 300,
        'height': 250,
        'vastUrl': 'https://mco-1-apex.go.sonobi.com/vast.xml?vid=30292e432662bd5f86d90774b944b038&ref=https%3A%2F%2Flocalhost%2F',
        'ttl': 500,
        'creativeId': '30292e432662bd5f86d90774b944b038',
        'netRevenue': true,
        'currency': 'USD',
        'dealId': 'dozerkey',
        'aid': '30292e432662bd5f86d90774b944b038',
        'mediaType': 'video',
        meta: {
          advertiserDomains: ['sonobi.com']
        }
      },
      {
        'requestId': '30b31c1838de1g',
        'cpm': 1.07,
        'width': 300,
        'height': 600,
        'ad': `<script type="text/javascript" src="https://mco-1-apex.go.sonobi.com/sbi.js?aid=30292e432662bd5f86d90774b944b038&as=null&ref=https%3A%2F%2Flocalhost%2F"></script>`,
        'ttl': 500,
        'creativeId': '1234abcd',
        'netRevenue': true,
        'currency': 'USD',
        'aid': '30292e432662bd5f86d90774b944b038',
        meta: {
          advertiserDomains: ['sonobi.com']
        }
      },
      {
        'requestId': '30b31c1838de1zzzz',
        'cpm': 1.25,
        'width': 640,
        'height': 480,
        'vastUrl': 'https://mco-1-apex.go.sonobi.com/vast.xml?vid=30292e432662bd5f86d90774b944b038&ref=https%3A%2F%2Flocalhost%2F',
        'ttl': 500,
        'creativeId': 'somecrid',
        'netRevenue': true,
        'currency': 'USD',
        'dealId': 'dozerkey',
        'aid': 'force_1550072228_da1c5d030cb49150c5db8a2136175755',
        'mediaType': 'video',
        renderer: () => { },
        meta: {
          advertiserDomains: ['sonobi.com']
        }
      },
    ];

    it('should map bidResponse to prebidResponse', function () {
      const response = spec.interpretResponse(bidResponse, bidRequests);
      response.forEach((resp, i) => {
        expect(resp.requestId).to.equal(prebidResponse[i].requestId);
        expect(resp.cpm).to.equal(prebidResponse[i].cpm);

        expect(resp.ttl).to.equal(prebidResponse[i].ttl);
        expect(resp.creativeId).to.equal(prebidResponse[i].creativeId);
        expect(resp.netRevenue).to.equal(prebidResponse[i].netRevenue);
        expect(resp.currency).to.equal(prebidResponse[i].currency);
        expect(resp.aid).to.equal(prebidResponse[i].aid);
        if (resp.mediaType === 'video' && resp.renderer) {
          expect(resp.vastUrl.indexOf('vast.xml')).to.be.greaterThan(0);
          expect(resp.width).to.equal(prebidResponse[i].width);
          expect(resp.height).to.equal(prebidResponse[i].height);
          expect(resp.renderer).to.be.ok;
          expect(resp.ad).to.equal(undefined);
        } else if (resp.mediaType === 'video') {
          expect(resp.vastUrl.indexOf('vast.xml')).to.be.greaterThan(0);
          expect(resp.ad).to.be.undefined;
          expect(resp.width).to.be.undefined;
          expect(resp.height).to.be.undefined;
        } else {
          expect(resp.ad.indexOf('localhost')).to.be.greaterThan(0);
          expect(resp.width).to.equal(prebidResponse[i].width);
          expect(resp.height).to.equal(prebidResponse[i].height);
        }
      });
    });
  });

  describe('.getUserSyncs', function () {
    let bidResponse = [{
      'body': {
        'sbi_px': [{
          'code': 'so',
          'delay': 0,
          'url': 'https://pixel-test',
          'type': 'image'
        }]
      }
    }];

    it('should return one sync pixel', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, bidResponse)).to.deep.equal([{
        type: 'image',
        url: 'https://pixel-test'
      }]);
    })
    it('should return an empty array when sync is enabled but there are no bidResponses', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, [])).to.have.length(0);
    })

    it('should return an empty array when sync is enabled but no sync pixel returned', function () {
      const pixel = Object.assign({}, bidResponse);
      delete pixel[0].body.sbi_px;
      expect(spec.getUserSyncs({ pixelEnabled: true }, bidResponse)).to.have.length(0);
    })

    it('should return an empty array', function () {
      expect(spec.getUserSyncs({ pixelEnabled: false }, bidResponse)).to.have.length(0);
      expect(spec.getUserSyncs({ pixelEnabled: true }, [])).to.have.length(0);
    });
  })
  describe('_getPlatform', function () {
    it('should return mobile', function () {
      expect(_getPlatform({ innerWidth: 767 })).to.equal('mobile')
    })
    it('should return tablet', function () {
      expect(_getPlatform({ innerWidth: 800 })).to.equal('tablet')
    })
    it('should return desktop', function () {
      expect(_getPlatform({ innerWidth: 1000 })).to.equal('desktop')
    })
  })
})
