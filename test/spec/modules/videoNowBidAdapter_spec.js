import { expect } from 'chai'
import { spec } from 'modules/videoNowBidAdapter'

describe('videonowAdapterTests', function() {
  describe('bidRequestValidity', function() {
    it('bidRequest with pId', function() {
      expect(spec.isBidRequestValid({
        bidder: 'videonow',
        params: {
          pId: '86858',
        }
      })).to.equal(true)
    })

    it('bidRequest without pId', function() {
      expect(spec.isBidRequestValid({
        bidder: 'videonow',
        params: {
          nomater: 86858
        }
      })).to.equal(false)

      it('bidRequest is empty', function() {
        expect(spec.isBidRequestValid({})).to.equal(false)
      })

      it('bidRequest is undefned', function() {
        expect(spec.isBidRequestValid(undefined)).to.equal(false)
      })
    })

    describe('bidRequest', function() {
      const validBidRequests = [
        {
          'bidder': 'videonow',
          'params': {
            'pId': '1',
            'placementId': 'div-gpt-ad-1438287399331-0',
            'url': 'http://localhost:8086/bid?p=exists',
            'bidFloor': 10,
            'cur': 'RUB'
          },
          'crumbs': {
            'pubcid': 'feded041-35dd-4b54-979a-6d7805abfa75'
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[640, 480], [320, 200]]
            }
          },
          'adUnitCode': 'test-ad',
          'transactionId': '676403c7-09c9-4b56-be82-e7cae81f40b9',
          'sizes': [[640, 480], [320, 200]],
          'bidId': '268c309f46390d',
          'bidderRequestId': '1dfdd514c36ef6',
          'auctionId': '4d523546-889a-4029-9a79-13d3c69f9922',
          'src': 'client',
          'bidRequestsCount': 1
        }
      ]

      const bidderRequest = {
        'bidderCode': 'videonow',
        'auctionId': '4d523546-889a-4029-9a79-13d3c69f9922',
        'bidderRequestId': '1dfdd514c36ef6',
        'bids': [
          {
            'bidder': 'videonow',
            'params': {
              'pId': '1',
              'placementId': 'div-gpt-ad-1438287399331-0',
              'url': 'http://localhost:8086/bid',
              'bidFloor': 10,
              'cur': 'RUB'
            },
            'crumbs': {
              'pubcid': 'feded041-35dd-4b54-979a-6d7805abfa75'
            },
            'mediaTypes': {
              'banner': {
                'sizes': [[640, 480], [320, 200]]
              }
            },
            'adUnitCode': 'test-ad',
            'transactionId': '676403c7-09c9-4b56-be82-e7cae81f40b9',
            'sizes': [[640, 480], [320, 200]],
            'bidId': '268c309f46390d',
            'bidderRequestId': '1dfdd514c36ef6',
            'auctionId': '4d523546-889a-4029-9a79-13d3c69f9922',
            'src': 'client',
            'bidRequestsCount': 1
          }
        ],
        'auctionStart': 1565794308584,
        'timeout': 3000,
        'refererInfo': {
          'referer': 'http://localhost:8086/page',
          'reachedTop': true,
          'numIframes': 0,
          'stack': [
            'http://localhost:8086/page'
          ]
        },
        'start': 1565794308589
      }

      const requests = spec.buildRequests(validBidRequests, bidderRequest)
      const request = (requests && requests.length && requests[0]) || {}

      it('bidRequest count', function() {
        expect(requests.length).to.equal(1)
      })

      it('bidRequest method', function() {
        expect(request.method).to.equal('POST')
      })

      it('bidRequest url', function() {
        expect(request.url).to.equal('http://localhost:8086/bid?p=exists&profile_id=1')
      })

      it('bidRequest data', function() {
        const data = request.data
        // const w = validBidRequests[0].sizes[0][0] + ''
        // const h = validBidRequests[0].sizes[0][1] + ''

        // expect(decodeURIComponent(data.referer)).to.be.eql(bidderRequest.refererInfo.referer);
        expect(data.aid).to.be.eql(validBidRequests[0].params.aid)
        expect(data.id).to.be.eql(validBidRequests[0].bidId)
        expect(data.sizes).to.be.eql(validBidRequests[0].sizes)
        // expect(data.height).to.be.eql(h);
      })

      describe('bidRequest advanced', function() {
        const bidderRequestEmptyParamsAndExtParams = {
          'bidder': 'videonow',
          'params': {
            'pId': '1',
          },
          'ext': {
            'p1': 'ext1',
            'p2': 'ext2',
          }
        }

        it('bidRequest count', function() {
          const requests = spec.buildRequests([bidderRequestEmptyParamsAndExtParams], bidderRequest)
          expect(requests.length).to.equal(1)
        })

        it('bidRequest default url', function() {
          const requests = spec.buildRequests([bidderRequestEmptyParamsAndExtParams], bidderRequest)
          const request = (requests && requests.length && requests[0]) || {}
          expect(request.url).to.equal('https://bidder.videonow.ru/prebid?profile_id=1')
        })

        it('bidRequest default currency', function() {
          const requests = spec.buildRequests([bidderRequestEmptyParamsAndExtParams], bidderRequest)
          const request = (requests && requests.length && requests[0]) || {}
          const data = request && request.data || {}
          expect(data.cur).to.equal('RUB')
        })

        it('bidRequest ext parameters ', function() {
          const requests = spec.buildRequests([bidderRequestEmptyParamsAndExtParams], bidderRequest)
          const request = (requests && requests.length && requests[0]) || {}
          const data = request && request.data || {}
          expect(data['ext_p1']).to.equal('ext1')
          expect(data['ext_p2']).to.equal('ext2')
        })

        it('bidRequest without params', function() {
          const bidderReq = {
            'bidder': 'videonow'
          }
          const requests = spec.buildRequests([bidderReq], bidderRequest)
          expect(requests.length).to.equal(1)
        })

      })
    })

    describe('interpretResponse', function() {
      const getValidServerResponse = () => {
        const serverResponse = {
          'body': {
            'id': '111-111',
            'bidid': '2955a162-699e-4811-ce88-5c3ac973e73c',
            'cur': 'RUB',
            'seatbid': [
              {
                'bid': [
                  {
                    'id': 'e3bf2b82e3e9485113fad6c9b27f8768.1',
                    'impid': '1',
                    'price': 10.97,
                    'nurl': 'http://localhost:8086/event/nurl',
                    'netRevenue': false,
                    'ttl': 800,
                    'adm': 'stub',
                    'crid': 'e3bf2b82e3e9485113fad6c9b27f8768.1',
                    'h': 640,
                    'w': 480,
                    'ext': {
                      vnInitModule: 'http://localhost:8086/vn_init.js',
                      vnModule: 'http://localhost:8086/vn_module.js',
                      dataXml: '<VAST></VAST>'
                    }

                  }
                ],
                'group': 0
              }
            ],
            'price': 10,
            'ext': {
              'placementId': 'div-gpt-ad-1438287399331-0',
              'pixels': [
                'http://localhost:8086/event/pxlcookiematching?uiid=1',
                'http://localhost:8086/event/pxlcookiematching?uiid=2'
              ],
              'iframes': [
                'http://localhost:8086/event/ifrcookiematching?uiid=1',
                'http://localhost:8086/event/ifrcookiematching?uiid=2'
              ]
            }
          },
          'headers': {}
        }

        return JSON.parse(JSON.stringify(serverResponse))
      }

      const bidRequest = {
        'method': 'POST',
        'url': 'http://localhost:8086/bid?profile_id=1',
        'data': {
          'id': '217b8ab59a18e8',
          'cpm': 10,
          'sizes': [[640, 480], [320, 200]],
          'cur': 'RUB',
          'placementId': 'div-gpt-ad-1438287399331-0',
          'ref': 'http://localhost:8086/page'
        }
      }


      it('Should have only one bid', function() {
        const serverResponse = getValidServerResponse()
        const result = spec.interpretResponse(serverResponse, bidRequest)
        expect(result.length).to.equal(1)
      })

      it('Should have required keys', function() {
        const serverResponse = getValidServerResponse()
        const result = spec.interpretResponse(serverResponse, bidRequest)
        const bid = serverResponse.body.seatbid[0].bid[0]
        const res = result[0]
        expect(res.requestId).to.be.eql(bidRequest.data.id)
        expect(res.cpm).to.be.eql(bid.price)
        expect(res.creativeId).to.be.eql(bid.crid)
        expect(res.netRevenue).to.be.a('boolean')
        expect(res.ttl).to.be.eql(bid.ttl)
        expect(res.renderer).to.be.a('Object')
        expect(res.renderer.render).to.be.a('function')
      })

      it('Should return an empty array if empty or no bids in response', function() {
        expect(spec.interpretResponse({ body: '' }, {}).length).to.equal(0)
      })

      it('Should return an empty array if bidRequest\'s data is absent', function() {
        const serverResponse = getValidServerResponse()
        expect(spec.interpretResponse(serverResponse, undefined).length).to.equal(0)
      })

      it('Should return an empty array if bidRequest\'s data is not contains bidId ', function() {
        const serverResponse = getValidServerResponse()
        expect(spec.interpretResponse(serverResponse, { data: {} }).length).to.equal(0)
      })

      it('Should return an empty array if bidRequest\'s data bidId is undefined', function() {
        const serverResponse = getValidServerResponse()
        expect(spec.interpretResponse(serverResponse, { data: { id: null } }).length).to.equal(0)
      })

      it('Should return an empty array if serverResponse do not contains seatbid', function() {
        expect(spec.interpretResponse({ body: {} }, bidRequest).length).to.equal(0)
      })

      it('Should return an empty array if serverResponse\'s seatbid is empty', function() {
        expect(spec.interpretResponse({ body: { seatbid: [] } }, bidRequest).length).to.equal(0)
      })

      it('Should return an empty array if serverResponse\'s placementId is undefined', function() {
        expect(spec.interpretResponse({ body: { seatbid: [1,2] } }, bidRequest).length).to.equal(0)
      })

      it('Should return an empty array if serverResponse\'s id in the bid is undefined', function() {
        const serverResp = getValidServerResponse()
        delete serverResp.body.seatbid[0].bid[0].id
        let res = spec.interpretResponse(serverResp, bidRequest)
        expect(res.length).to.equal(0)
      })


      it('Should return an empty array if serverResponse\'s price in the bid is undefined', function() {
        const serverResp = getValidServerResponse()
        delete serverResp.body.seatbid[0].bid[0].price
        const res = spec.interpretResponse(serverResp, bidRequest)
        expect(res.length).to.equal(0)
      })

      it('Should return an empty array if serverResponse\'s price in the bid is 0', function() {
        const serverResp = getValidServerResponse()
        serverResp.body.seatbid[0].bid[0].price = 0
        const res = spec.interpretResponse(serverResp, bidRequest)

        expect(res.length).to.equal(0)
      })


      it('Should return an empty array if serverResponse\'s vnInitModule in the bid\'s ext is undefined', function() {
        const serverResp = getValidServerResponse()
        delete serverResp.body.seatbid[0].bid[0].ext.vnInitModule
        const res = spec.interpretResponse(serverResp, bidRequest)

        expect(res.length).to.equal(0)
      })


      it('Should return an empty array if serverResponse\'s vnModule in the bid\'s ext is undefined', function() {
        const serverResp = getValidServerResponse()
        delete serverResp.body.seatbid[0].bid[0].ext.vnModule
        const res = spec.interpretResponse(serverResp, bidRequest)

        expect(res.length).to.equal(0)
      })

      it('Should return an empty array if serverResponse\'s dataXml in the bid\'s ext is undefined', function() {
        const serverResp = getValidServerResponse()
        delete serverResp.body.seatbid[0].bid[0].ext.dataXml
        const res = spec.interpretResponse(serverResp, bidRequest)

        expect(res.length).to.equal(0)
      })

      it('Should return an empty array if serverResponse\'s the bid\'s ext is undefined', function() {
        const serverResp = getValidServerResponse()
        delete serverResp.body.seatbid[0].bid[0].ext
        const res = spec.interpretResponse(serverResp, bidRequest)

        expect(res.length).to.equal(0)
      })

      it('Default ttl is 300', function() {
        const serverResp = getValidServerResponse()
        delete serverResp.body.seatbid[0].bid[0].ttl
        const res = spec.interpretResponse(serverResp, bidRequest)
        expect(res.length).to.equal(1)
        expect(res[0].ttl).to.equal(300)
      })

      it('Default netRevenue is true', function() {
        const serverResp = getValidServerResponse()
        delete serverResp.body.seatbid[0].bid[0].netRevenue
        const res = spec.interpretResponse(serverResp, bidRequest)
        expect(res.length).to.equal(1)
        expect(res[0].netRevenue).to.equal(true)
      })

      it('Default currency is RUB', function() {
        const serverResp = getValidServerResponse()
        delete serverResp.body.cur
        const res = spec.interpretResponse(serverResp, bidRequest)
        expect(res.length).to.equal(1)
        expect(res[0].currency).to.equal('RUB')
      })
    })
  })
})
