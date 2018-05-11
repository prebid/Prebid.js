import { expect } from 'chai'
import { spec, _getPlatform } from 'modules/sonobiBidAdapter'
import { newBidder } from 'src/adapters/bidderFactory'

describe('SonobiBidAdapter', () => {
  const adapter = newBidder(spec)

  describe('.code', () => {
    it('should return a bidder code of sonobi', () => {
      expect(spec.code).to.equal('sonobi')
    })
  })

  describe('inherited functions', () => {
    it('should exist and be a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })

  describe('.isBidRequestValid', () => {
    let bid = {
      'bidder': 'sonobi',
      'params': {
        'ad_unit': '/7780971/sparks_prebid_MR',
        'sizes': [[300, 250], [300, 600]],
        'floor': '1'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    }

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true)
    })

    it('should return true when bid.params.placement_id and bid.params.sizes are found', () => {
      let bid = Object.assign({}, bid)
      delete bid.params
      delete bid.sizes
      bid.params = {
        'placement_id': '1a2b3c4d5e6f1a2b3c4d',
        'sizes': [[300, 250], [300, 600]],
      }

      expect(spec.isBidRequestValid(bid)).to.equal(true)
    })

    it('should return true when bid.params.placement_id and bid.sizes are found', () => {
      let bid = Object.assign({}, bid)
      delete bid.params
      bid.sizes = [[300, 250], [300, 600]]
      bid.params = {
        'placement_id': '1a2b3c4d5e6f1a2b3c4d',
      }

      expect(spec.isBidRequestValid(bid)).to.equal(true)
    })

    it('should return true when bid.params.ad_unit and bid.params.sizes are found', () => {
      let bid = Object.assign({}, bid)
      delete bid.params
      delete bid.sizes
      bid.params = {
        'ad_unit': '/7780971/sparks_prebid_MR',
        'sizes': [[300, 250], [300, 600]],
      }

      expect(spec.isBidRequestValid(bid)).to.equal(true)
    })

    it('should return true when bid.params.ad_unit and bid.sizes are found', () => {
      let bid = Object.assign({}, bid)
      delete bid.params
      bid.sizes = [[300, 250], [300, 600]]
      bid.params = {
        'ad_unit': '/7780971/sparks_prebid_MR',
      }

      expect(spec.isBidRequestValid(bid)).to.equal(true)
    })

    it('should return false when no params are found', () => {
      let bid = Object.assign({}, bid)
      delete bid.params
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })

    it('should return false when bid.params.placement_id and bid.params.ad_unit are not found', () => {
      let bid = Object.assign({}, bid)
      delete bid.params
      bid.params = {
        'placement_id': 0,
        'ad_unit': 0,
        'sizes': [[300, 250], [300, 600]],
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })
  })

  describe('.buildRequests', () => {
    let bidRequest = [{
      'bidder': 'sonobi',
      'params': {
        'placement_id': '1a2b3c4d5e6f1a2b3c4d',
        'sizes': [[300, 250], [300, 600]],
        'floor': '1.25',
        'referrer': 'overrides_top_window_location'
      },
      'adUnitCode': 'adunit-code-1',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1f',
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
    }];

    let keyMakerData = {
      '30b31c1838de1f': '1a2b3c4d5e6f1a2b3c4d|300x250,300x600|f=1.25',
      '/7780971/sparks_prebid_LB|30b31c1838de1e': '300x250,300x600',
    };

    it('should return a properly formatted request', () => {
      const bidRequests = spec.buildRequests(bidRequest)
      const bidRequestsPageViewID = spec.buildRequests(bidRequest)
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

    it('should return a properly formatted request with hfa', () => {
      bidRequest[0].params.hfa = 'hfakey'
      bidRequest[1].params.hfa = 'hfakey'
      const bidRequests = spec.buildRequests(bidRequest)
      expect(bidRequests.url).to.equal('https://apex.go.sonobi.com/trinity.json')
      expect(bidRequests.method).to.equal('GET')
      expect(bidRequests.data.ref).not.to.be.empty
      expect(bidRequests.data.s).not.to.be.empty
      expect(bidRequests.data.hfa).to.equal('hfakey')
    })
    it('should return null if there is nothing to bid on', () => {
      const bidRequests = spec.buildRequests([{params: {}}])
      expect(bidRequests).to.equal(null);
    })
  })

  describe('.interpretResponse', () => {
    const bidRequests = {
      'method': 'GET',
      'url': 'https://apex.go.sonobi.com/trinity.json',
      'withCredentials': true,
      'data': {
        'key_maker': '{"30b31c1838de1f":"1a2b3c4d5e6f1a2b3c4d|300x250,300x600|f=1.25","/7780971/sparks_prebid_LB|30b31c1838de1e":"300x250,300x600"}', 'ref': 'localhost:9876', 's': '2474372d-c0ff-4f46-aef4-a173058403d9', 'pv': 'c9cfc207-cd83-4a01-b591-8bb29389d4b0'
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
          'bidId': '30b31c1838de1e',
          'mediaType': 'video'
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
        }
      ]
    };

    let bidResponse = {
      'body': {
        'slots': {
          '/7780971/sparks_prebid_LB|30b31c1838de1f': {
            'sbi_size': '300x600',
            'sbi_apoc': 'remnant',
            'sbi_aid': '30292e432662bd5f86d90774b944b039',
            'sbi_mouse': 1.07,
          },
          '30b31c1838de1e': {
            'sbi_size': '300x250',
            'sbi_apoc': 'remnant',
            'sbi_aid': '30292e432662bd5f86d90774b944b038',
            'sbi_mouse': 1.25,
            'sbi_dozer': 'dozerkey',
          },
          '/7780971/sparks_prebid_LB|30b31c1838de1g': {},
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
        'ad': '<script type="text/javascript" src="https://mco-1-apex.go.sonobi.com/sbi.js?aid=30292e432662bd5f86d90774b944b039&as=null&ref=localhost:9876"></script>',
        'ttl': 500,
        'creativeId': '30292e432662bd5f86d90774b944b039',
        'netRevenue': true,
        'currency': 'USD'
      },
      {
        'requestId': '30b31c1838de1e',
        'cpm': 1.25,
        'width': 300,
        'height': 250,
        'ad': 'https://mco-1-apex.go.sonobi.com/vast.xml?vid=30292e432662bd5f86d90774b944b038&ref=localhost:9876',
        'ttl': 500,
        'creativeId': '30292e432662bd5f86d90774b944b038',
        'netRevenue': true,
        'currency': 'USD',
        'dealId': 'dozerkey'
      }
    ];

    it('should map bidResponse to prebidResponse', () => {
      const response = spec.interpretResponse(bidResponse, bidRequests);
      expect(response).to.deep.equal(prebidResponse);
    })
  })

  describe('.getUserSyncs', () => {
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

    it('should return one sync pixel', () => {
      expect(spec.getUserSyncs({ pixelEnabled: true }, bidResponse)).to.deep.equal([{
        type: 'image',
        url: 'https://pixel-test'
      }]);
    })
    it('should return an empty array when sync is enabled but there are no bidResponses', () => {
      expect(spec.getUserSyncs({ pixelEnabled: true }, [])).to.have.length(0);
    })

    it('should return an empty array when sync is enabled but no sync pixel returned', () => {
      const pixel = Object.assign({}, bidResponse);
      delete pixel[0].body.sbi_px;
      expect(spec.getUserSyncs({ pixelEnabled: true }, bidResponse)).to.have.length(0);
    })

    it('should return an empty array', () => {
      expect(spec.getUserSyncs({ pixelEnabled: false }, bidResponse)).to.have.length(0);
    })
  })
  describe('_getPlatform', () => {
    it('should return mobile', () => {
      expect(_getPlatform({innerWidth: 767})).to.equal('mobile')
    })
    it('should return tablet', () => {
      expect(_getPlatform({innerWidth: 800})).to.equal('tablet')
    })
    it('should return desktop', () => {
      expect(_getPlatform({innerWidth: 1000})).to.equal('desktop')
    })
  })
})
