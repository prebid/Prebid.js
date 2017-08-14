import { expect } from 'chai'
import Adapter from 'modules/essensBidAdapter'
import bidmanager from 'src/bidmanager'
import adLoader from 'src/adloader'
describe('Essens adapter tests', function () {
  describe('Test callbid method ', function () {
    let stubLoadScript
    beforeEach(() => {
      stubLoadScript = sinon.stub(adLoader, 'loadScript')
    })

    afterEach(() =>
      stubLoadScript.restore()
    )

    it('bid request without bid', () => {
      const essensAdapter = new Adapter()
      essensAdapter.callBids()
      sinon.assert.notCalled(stubLoadScript)
    })

    it('bid request with missing parameter', () => {
      const bidderRequest = {
        bidderCode: 'essens',
        requestId: 'impression-1',
        bidderRequestId: 'impression-for-essens-1'
      }
      const essensAdapter = new Adapter()
      essensAdapter.callBids(bidderRequest)
      sinon.assert.notCalled(stubLoadScript)
    })

    it('Bid request with wrong parameter', () => {
      const bidderRequest = {
        bidderCode: 'essens',
        requestId: 'impression-1',
        bidderRequestId: 'impression-for-essens-1',
        bids: [
          {
            bidId: 'placement1-for_essensT1',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              randomParam: 'placement1'
            },
            sizes: [
              [100, 110],
              [200, 210]
            ],
            placementCode: 'div-media1-top_banner-1',
            bidderRequestId: 'impression-for-essens-1',
          }
        ]
      }
      const essensAdapter = new Adapter()
      essensAdapter.callBids(bidderRequest)
      sinon.assert.notCalled(stubLoadScript)
    })

    it('add one valid requests', function () {
      const bidderRequest = {
        bidderCode: 'essens',
        requestId: 'impression-1',
        bidderRequestId: 'impression-for-essens-1',
        bids: [
          {
            bidId: 'placement1-for_essensT1',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement1'
            },
            sizes: [
              [100, 110],
              [200, 210]
            ],
            placementCode: 'div-media1-top_banner-1',
            bidderRequestId: 'impression-for-essens-1',
          }
        ]
      }

      const essensAdapter = new Adapter()
      essensAdapter.callBids(bidderRequest)

      const url = stubLoadScript.getCall(0).args[0]
      const payload = decodeURIComponent(url.split('&bid=')[1])
      const payloadJson = JSON.parse(payload)

      expect(payloadJson.ua).to.exist.and.to.be.a('string')
      expect(payloadJson.url).to.exist.and.to.be.a('string')
      expect(Object.keys(payloadJson.imp).length).to.equal(1)
      expect(payloadJson.imp[0].impressionId).to.equal('placement1-for_essensT1')
      expect(payloadJson.imp[0].placementId).to.equal('placement1')
      expect(Object.keys(payloadJson.imp[0].sizes).length).to.equal(2)
      expect(payloadJson.imp[0].sizes[0]).to.equal('100x110')
      expect(payloadJson.imp[0].sizes[1]).to.equal('200x210')
      sinon.assert.calledOnce(stubLoadScript)
    })
    it('add more than one valid requests', function () {
      const bidderRequest = {
        bidderCode: 'essens',
        requestId: 'impression-1',
        bidderRequestId: 'impression-for-essens-1',
        bids: [
          {
            bidId: 'placement1-for_essensT2',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement1'
            },
            sizes: [
              [100, 110],
              [200, 210]
            ],
            placementCode: 'div-media1-top_banner-1',
            bidderRequestId: 'impression-for-essens-1',
          },
          {
            bidId: 'placement2-for_essensT2',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement2'
            },
            sizes: [
              [300, 310],
              [400, 410]
            ],
            placementCode: 'div-media1-side_banner-1',
            bidderRequestId: 'impression-for-essens-1',
          },
          {
            bidId: 'placement3-for_essensT2',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement3'
            },
            sizes: [
              [500, 510],
              [600, 610]
            ],
            placementCode: 'div-media1-side_banner-2',
            bidderRequestId: 'impression-for-essens-1',
          },
        ]
      }

      const essensAdapter = new Adapter()
      essensAdapter.callBids(bidderRequest)

      const url = stubLoadScript.getCall(0).args[0]
      const payload = decodeURIComponent(url.split('&bid=')[1])
      const payloadJson = JSON.parse(payload)

      expect(payloadJson.ua).to.exist.and.to.be.a('string')
      expect(payloadJson.url).to.exist.and.to.be.a('string')
      expect(Object.keys(payloadJson.imp).length).to.equal(3)
      expect(payloadJson.imp[0].impressionId).to.equal('placement1-for_essensT2')
      expect(payloadJson.imp[0].placementId).to.equal('placement1')
      expect(Object.keys(payloadJson.imp[0].sizes).length).to.equal(2)
      expect(payloadJson.imp[0].sizes[0]).to.equal('100x110')
      expect(payloadJson.imp[0].sizes[1]).to.equal('200x210')

      expect(payloadJson.imp[1].impressionId).to.equal('placement2-for_essensT2')
      expect(payloadJson.imp[1].placementId).to.equal('placement2')
      expect(Object.keys(payloadJson.imp[1].sizes).length).to.equal(2)
      expect(payloadJson.imp[1].sizes[0]).to.equal('300x310')
      expect(payloadJson.imp[1].sizes[1]).to.equal('400x410')

      expect(payloadJson.imp[2].impressionId).to.equal('placement3-for_essensT2')
      expect(payloadJson.imp[2].placementId).to.equal('placement3')
      expect(Object.keys(payloadJson.imp[2].sizes).length).to.equal(2)
      expect(payloadJson.imp[2].sizes[0]).to.equal('500x510')
      expect(payloadJson.imp[2].sizes[1]).to.equal('600x610')
      sinon.assert.calledOnce(stubLoadScript)
    })
    it('should fill all parameters', function () {
      const bidderRequest = {
        bidderCode: 'essens',
        requestId: 'impression-1',
        bidderRequestId: 'impression-for-essens-1',
        bids: [
          {
            bidId: 'placement1-for_essensT3',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement1',
              dealId: '1234',
              floorPrice: '23.478'
            },
            sizes: [
              [100, 110],
              [200, 210]
            ],
            placementCode: 'div-media1-top_banner-1',
            bidderRequestId: 'impression-for-essens-1',
          }
        ]
      }

      const essensAdapter = new Adapter()
      essensAdapter.callBids(bidderRequest)

      const url = stubLoadScript.getCall(0).args[0]
      const payload = decodeURIComponent(url.split('&bid=')[1])
      const payloadJson = JSON.parse(payload)

      expect(payloadJson.ua).to.exist.and.to.be.a('string')
      expect(payloadJson.url).to.exist.and.to.be.a('string')
      expect(Object.keys(payloadJson.imp).length).to.equal(1)
      expect(payloadJson.imp[0].impressionId).to.equal('placement1-for_essensT3')
      expect(payloadJson.imp[0].placementId).to.equal('placement1')
      expect(Object.keys(payloadJson.imp[0].sizes).length).to.equal(2)
      expect(payloadJson.imp[0].sizes[0]).to.equal('100x110')
      expect(payloadJson.imp[0].sizes[1]).to.equal('200x210')
      expect(payloadJson.imp[0].deal).to.equal('1234')
      expect(payloadJson.imp[0].floorPrice).to.equal('23.478')
    })
    it('invalid request: missing mandatory parameters', function () {
      const bidderRequest = {
        bidderCode: 'essens',
        requestId: 'impression-1',
        bidderRequestId: 'impression-for-essens-1',
        bids: [
          {
            bidId: 'placement1-for_essensT4',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {},
            sizes: [
              [100, 110],
              [200, 210]
            ],
            placementCode: 'div-media1-top_banner-1',
            bidderRequestId: 'impression-for-essens-1',
          }
        ]
      }

      const essensAdapter = new Adapter()
      essensAdapter.callBids(bidderRequest)

      sinon.assert.notCalled(stubLoadScript)
    })
  })

  describe('Test essensResponseHandler method', function () {
    let stubAddBidResponse
    beforeEach(() => {
      stubAddBidResponse = sinon.stub(bidmanager, 'addBidResponse')
    })

    afterEach(() => {
      stubAddBidResponse.restore()
    })

    it('Check method exist', function () {
      expect(pbjs.essensResponseHandler).to.exist.and.to.be.a('function')
    })

    it('Check invalid response', function () {
      const bidderRequest = {
        bidderCode: 'essens',
        requestId: 'impression-1',
        bidderRequestId: 'impression-for-essens-1',
        bids: [
          {
            bidId: 'placement1-for_essens',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement1'
            },
            sizes: [
              [100, 110],
              [200, 210]
            ],
            placementCode: 'div-media1-top_banner-1T1',
            bidderRequestId: 'impression-for-essens-1',
          }
        ]
      }

      const response = {
        'id': '1234'
      }

      const essensAdapter = new Adapter()
      essensAdapter.callBids(bidderRequest)

      $$PREBID_GLOBAL$$.essensResponseHandler(response)

      const bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0]
      const bidObject1 = stubAddBidResponse.getCall(0).args[1]

      expect(bidPlacementCode1).to.equal('div-media1-top_banner-1T1')
      expect(bidObject1.getStatusCode()).to.equal(2)
      expect(bidObject1.bidderCode).to.equal('essens')

      sinon.assert.calledOnce(stubAddBidResponse)
    })

    it('Check empty response', function () {
      const bidderRequest = {
        bidderCode: 'essens',
        requestId: 'impression-1',
        bidderRequestId: 'impression-for-essens-1',
        bids: [
          {
            bidId: 'placement1-for_essens',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement1'
            },
            sizes: [
              [100, 110],
              [200, 210]
            ],
            placementCode: 'div-media1-top_banner-1T2',
            bidderRequestId: 'impression-for-essens-1',
          },
          {
            bidId: 'placement2-for_essens',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement2'
            },
            sizes: [
              [100, 110],
              [200, 210]
            ],
            placementCode: 'div-media1-side_banner-1T2',
            bidderRequestId: 'impression-for-essens-1',
          },
          {
            bidId: 'placement3-for_essens',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement3'
            },
            sizes: [
              [100, 110],
              [200, 210]
            ],
            placementCode: 'div-media1-side_banner-2T2',
            bidderRequestId: 'impression-for-essens-1',
          },
        ]
      }

      const response = {
        'id': '1234',
        'seatbid': []
      }

      const essensAdapter = new Adapter()
      essensAdapter.callBids(bidderRequest)

      $$PREBID_GLOBAL$$.essensResponseHandler(response)

      const bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0]
      const bidObject1 = stubAddBidResponse.getCall(0).args[1]
      const bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0]
      const bidObject2 = stubAddBidResponse.getCall(1).args[1]
      const bidPlacementCode3 = stubAddBidResponse.getCall(2).args[0]
      const bidObject3 = stubAddBidResponse.getCall(2).args[1]

      expect(bidPlacementCode1).to.equal('div-media1-top_banner-1T2')
      expect(bidObject1.getStatusCode()).to.equal(2)
      expect(bidObject1.bidderCode).to.equal('essens')

      expect(bidPlacementCode2).to.equal('div-media1-side_banner-1T2')
      expect(bidObject2.getStatusCode()).to.equal(2)
      expect(bidObject2.bidderCode).to.equal('essens')

      expect(bidPlacementCode3).to.equal('div-media1-side_banner-2T2')
      expect(bidObject3.getStatusCode()).to.equal(2)
      expect(bidObject3.bidderCode).to.equal('essens')

      sinon.assert.calledThrice(stubAddBidResponse)
    })

    it('Check valid response but invalid bid ', function () {
      const bidderRequest = {
        bidderCode: 'essens',
        requestId: 'impression-1',
        bidderRequestId: 'impression-for-essens-1',
        bids: [
          {
            bidId: 'bid-on-placement1-for_essens',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement1'
            },
            sizes: [
              [100, 110],
              [200, 210]
            ],
            placementCode: 'div-media1-top_banner-1T3',
            bidderRequestId: 'impression-for-essens-1',
          },
          {
            bidId: 'bid-on-placement2-for_essens',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement2'
            },
            sizes: [
              [300, 310],
              [400, 410]
            ],
            placementCode: 'div-media1-side_banner-1T3',
            bidderRequestId: 'impression-for-essens-1',
          }
        ]
      }

      const response = {
        'id': 'impression-for-essens-1',
        'cur': 'USD',
        'seatbid': [{
          'bid': [{
            'id': 'responseOnBid1',
            'impid': 'bid-on-placement1-for_essens',
            'price': 9.01,
            'crid': 'creativeId1',
            'dealid': 'dealId1',
            'h': 100,
            'w': 110
            // ,'ext': {
            //   'adUrl': 'creative-link2'
            // }
          },
          {
            'id': 'responseOnBid1',
            // 'impid': 'bid-on-placement2-for_essens',
            'price': 9.01,
            'crid': 'creativeId1',
            'dealid': 'dealId1',
            'h': 300,
            'w': 310,
            'ext': {
              'adUrl': 'creative-link2'
            }
          }]
        }]
      }

      const essensAdapter = new Adapter()
      essensAdapter.callBids(bidderRequest)

      $$PREBID_GLOBAL$$.essensResponseHandler(response)

      let bidPlacementCode1
      let bidPlacementCode2
      let bidObject1
      let bidObject2

      if (stubAddBidResponse.getCall(0).args[0] === 'div-media1-top_banner-1T3') {
        bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0]
        bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0]
        bidObject1 = stubAddBidResponse.getCall(0).args[1]
        bidObject2 = stubAddBidResponse.getCall(0).args[1]
      } else {
        bidPlacementCode1 = stubAddBidResponse.getCall(1).args[0]
        bidPlacementCode2 = stubAddBidResponse.getCall(0).args[0]
        bidObject1 = stubAddBidResponse.getCall(1).args[1]
        bidObject2 = stubAddBidResponse.getCall(0).args[1]
      }

      expect(bidPlacementCode1).to.equal('div-media1-top_banner-1T3')
      expect(bidObject1.getStatusCode()).to.equal(2)
      expect(bidObject1.bidderCode).to.equal('essens')

      expect(bidPlacementCode2).to.equal('div-media1-side_banner-1T3')
      expect(bidObject2.getStatusCode()).to.equal(2)
      expect(bidObject2.bidderCode).to.equal('essens')

      sinon.assert.calledTwice(stubAddBidResponse)
    })

    it('Check single non empty minimal valid response', function () {
      const bidderRequest = {
        bidderCode: 'essens',
        requestId: 'impression-1',
        bidderRequestId: 'impression-for-essens-1',
        bids: [
          {
            bidId: 'bid-on-placement1-for_essens',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement1'
            },
            sizes: [
              [100, 110],
              [200, 210]
            ],
            placementCode: 'div-media1-top_banner-1T3',
            bidderRequestId: 'impression-for-essens-1',
          }
        ]
      }

      const response = {
        'id': 'impression-for-essens-1',
        'cur': 'USD',
        'seatbid': [{
          'bid': [{
            'id': 'responseOnBid1',
            'impid': 'bid-on-placement1-for_essens',
            'price': 9.01,
            'crid': 'creativeId1',
            'h': 300,
            'w': 310,
            'ext': {
              'adUrl': 'creative-link'
            }
          }]
        }]
      }

      const essensAdapter = new Adapter()
      essensAdapter.callBids(bidderRequest)

      $$PREBID_GLOBAL$$.essensResponseHandler(response)

      const bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0]
      const bidObject1 = stubAddBidResponse.getCall(0).args[1]

      expect(bidPlacementCode1).to.equal('div-media1-top_banner-1T3')
      expect(bidObject1.getStatusCode()).to.equal(1)
      expect(bidObject1.bidderCode).to.equal('essens')
      expect(bidObject1.creative_id).to.equal('creativeId1')
      expect(bidObject1.cpm).to.equal(9.01)
      expect(bidObject1.height).to.equal(300)
      expect(bidObject1.width).to.equal(310)
      expect(bidObject1.adUrl).to.equal('creative-link')
      expect(bidObject1.adId).to.equal('bid-on-placement1-for_essens')

      sinon.assert.calledOnce(stubAddBidResponse)
    })

    it('Check single non empty response', function () {
      const bidderRequest = {
        bidderCode: 'essens',
        requestId: 'impression-1',
        bidderRequestId: 'impression-for-essens-1',
        bids: [
          {
            bidId: 'bid-on-placement1-for_essens',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement1'
            },
            sizes: [
              [100, 110],
              [200, 210]
            ],
            placementCode: 'div-media1-top_banner-1T3',
            bidderRequestId: 'impression-for-essens-1',
          }
        ]
      }

      const response = {
        'id': 'impression-for-essens-1',
        'cur': 'USD',
        'seatbid': [{
          'bid': [{
            'id': 'responseOnBid1',
            'impid': 'bid-on-placement1-for_essens',
            'price': 9.01,
            'crid': 'creativeId1',
            'dealid': 'dealId1',
            'h': 300,
            'w': 310,
            'ext': {
              'adUrl': 'creative-link'
            }
          }]
        }]
      }

      const essensAdapter = new Adapter()
      essensAdapter.callBids(bidderRequest)

      $$PREBID_GLOBAL$$.essensResponseHandler(response)

      const bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0]
      const bidObject1 = stubAddBidResponse.getCall(0).args[1]

      expect(bidPlacementCode1).to.equal('div-media1-top_banner-1T3')
      expect(bidObject1.getStatusCode()).to.equal(1)
      expect(bidObject1.bidderCode).to.equal('essens')
      expect(bidObject1.creative_id).to.equal('creativeId1')
      expect(bidObject1.cpm).to.equal(9.01)
      expect(bidObject1.height).to.equal(300)
      expect(bidObject1.width).to.equal(310)
      expect(bidObject1.adUrl).to.equal('creative-link')
      expect(bidObject1.adId).to.equal('bid-on-placement1-for_essens')
      expect(bidObject1.dealId).to.equal('dealId1')

      sinon.assert.calledOnce(stubAddBidResponse)
    })

    it('Check multiple non empty response', function () {
      const bidderRequest = {
        bidderCode: 'essens',
        requestId: 'impression-1',
        bidderRequestId: 'impression-for-essens-1',
        bids: [
          {
            bidId: 'bid-on-placement1-for_essens',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement1'
            },
            sizes: [
              [100, 110],
              [200, 210]
            ],
            placementCode: 'div-media1-top_banner-1T4',
            bidderRequestId: 'impression-for-essens-1',
          },
          {
            bidId: 'bid-on-placement2-for_essens',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement2'
            },
            sizes: [
              [300, 310],
              [400, 410]
            ],
            placementCode: 'div-media1-side_banner-1T4',
            bidderRequestId: 'impression-for-essens-1',
          }
        ]
      }

      const response = {
        'id': 'impression-for-essens-1',
        'cur': 'USD',
        'seatbid': [{
          'bid': [{
            'id': 'responseOnBid1',
            'impid': 'bid-on-placement1-for_essens',
            'price': 9.01,
            'crid': 'creativeId1',
            'dealid': 'dealId1',
            'h': 100,
            'w': 110,
            'ext': {
              'adUrl': 'creative-link1'
            }
          },
          {
            'id': 'responseOnBid2',
            'impid': 'bid-on-placement2-for_essens',
            'price': 9.02,
            'crid': 'creativeId2',
            'dealid': 'dealId2',
            'h': 400,
            'w': 410,
            'ext': {
              'adUrl': 'creative-link2'
            }
          }]
        }]
      }

      const essensAdapter = new Adapter()
      essensAdapter.callBids(bidderRequest)

      $$PREBID_GLOBAL$$.essensResponseHandler(response)

      let bidPlacementCode1
      let bidPlacementCode2
      let bidObject1
      let bidObject2

      if (stubAddBidResponse.getCall(0).args[0] === 'div-media1-top_banner-1T4') {
        bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0]
        bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0]
        bidObject1 = stubAddBidResponse.getCall(0).args[1]
        bidObject2 = stubAddBidResponse.getCall(1).args[1]
      } else {
        bidPlacementCode1 = stubAddBidResponse.getCall(1).args[0]
        bidPlacementCode2 = stubAddBidResponse.getCall(0).args[0]
        bidObject1 = stubAddBidResponse.getCall(1).args[1]
        bidObject2 = stubAddBidResponse.getCall(0).args[1]
      }

      expect(bidPlacementCode1).to.equal('div-media1-top_banner-1T4')
      expect(bidObject1.getStatusCode()).to.equal(1)
      expect(bidObject1.bidderCode).to.equal('essens')
      expect(bidObject1.creative_id).to.equal('creativeId1')
      expect(bidObject1.cpm).to.equal(9.01)
      expect(bidObject1.height).to.equal(100)
      expect(bidObject1.width).to.equal(110)
      expect(bidObject1.adUrl).to.equal('creative-link1')
      expect(bidObject1.adId).to.equal('bid-on-placement1-for_essens')
      expect(bidObject1.dealId).to.equal('dealId1')

      expect(bidPlacementCode2).to.equal('div-media1-side_banner-1T4')
      expect(bidObject2.getStatusCode()).to.equal(1)
      expect(bidObject2.bidderCode).to.equal('essens')
      expect(bidObject2.creative_id).to.equal('creativeId2')
      expect(bidObject2.cpm).to.equal(9.02)
      expect(bidObject2.height).to.equal(400)
      expect(bidObject2.width).to.equal(410)
      expect(bidObject2.adUrl).to.equal('creative-link2')
      expect(bidObject2.adId).to.equal('bid-on-placement2-for_essens')
      expect(bidObject2.dealId).to.equal('dealId2')

      sinon.assert.calledTwice(stubAddBidResponse)
    })

    it('Check empty and non empty mixed response', function () {
      const bidderRequest = {
        bidderCode: 'essens',
        requestId: 'impression-1',
        bidderRequestId: 'impression-for-essens-1',
        bids: [
          {
            bidId: 'bid-on-placement1-for_essens',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement1'
            },
            sizes: [
              [100, 110],
              [200, 210]
            ],
            placementCode: 'div-media1-top_banner-1T5',
            bidderRequestId: 'impression-for-essens-1',
          },
          {
            bidId: 'bid-on-placement2-for_essens',
            bidder: 'essens',
            requestId: 'essens-impression-1',
            params: {
              placementId: 'placement2'
            },
            sizes: [
              [300, 310],
              [400, 410]
            ],
            placementCode: 'div-media1-side_banner-1T5',
            bidderRequestId: 'impression-for-essens-1',
          }
        ]
      }

      const response = {
        'id': 'impression-for-essens-1',
        'cur': 'USD',
        'seatbid': [{
          'bid': [{
            'id': 'responseOnBid1',
            'impid': 'bid-on-placement2-for_essens',
            'price': 9.01,
            'crid': 'creativeId1',
            'dealid': 'dealId1',
            'h': 500,
            'w': 510,
            'ext': {
              'adUrl': 'creative-link'
            }
          }]
        }]
      }

      const essensAdapter = new Adapter()
      essensAdapter.callBids(bidderRequest)

      $$PREBID_GLOBAL$$.essensResponseHandler(response)

      let bidPlacementCode1
      let bidPlacementCode2
      let bidObject1
      let bidObject2

      if (stubAddBidResponse.getCall(0).args[0] === 'div-media1-side_banner-1T5') {
        bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0]
        bidPlacementCode2 = stubAddBidResponse.getCall(1).args[0]
        bidObject1 = stubAddBidResponse.getCall(0).args[1]
        bidObject2 = stubAddBidResponse.getCall(1).args[1]
      } else {
        bidPlacementCode1 = stubAddBidResponse.getCall(1).args[0]
        bidPlacementCode2 = stubAddBidResponse.getCall(0).args[0]
        bidObject1 = stubAddBidResponse.getCall(1).args[1]
        bidObject2 = stubAddBidResponse.getCall(0).args[1]
      }

      expect(bidPlacementCode1).to.equal('div-media1-side_banner-1T5')
      expect(bidObject1.getStatusCode()).to.equal(1)
      expect(bidObject1.bidderCode).to.equal('essens')
      expect(bidObject1.creative_id).to.equal('creativeId1')
      expect(bidObject1.cpm).to.equal(9.01)
      expect(bidObject1.height).to.equal(500)
      expect(bidObject1.width).to.equal(510)
      expect(bidObject1.adUrl).to.equal('creative-link')
      expect(bidObject1.adId).to.equal('bid-on-placement2-for_essens')
      expect(bidObject1.dealId).to.equal('dealId1')

      expect(bidPlacementCode2).to.equal('div-media1-top_banner-1T5')
      expect(bidObject2.getStatusCode()).to.equal(2)
      expect(bidObject2.bidderCode).to.equal('essens')

      sinon.assert.calledTwice(stubAddBidResponse)
    })
  })
})
