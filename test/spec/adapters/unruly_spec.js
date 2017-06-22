/* globals describe, it, beforeEach, afterEach, sinon */
import { expect } from 'chai'
import bidfactory from 'src/bidfactory'
import bidmanager from 'src/bidmanager'
import * as utils from 'src/utils'
import { STATUS } from 'src/constants'
import { Renderer } from 'src/Renderer'
import createUnrulyAdapter from 'src/adapters/unruly'

describe('UnrulyAdapter', () => {
  function createBidRequestBid({ placementCode }) {
    return {
      'bidder': 'unruly',
      'params': {
        'uuid': '74544e00-d43b-4f3a-a799-69d22ce979ce',
        'siteId': 794599,
        'placementId': '5768085'
      },
      'placementCode': placementCode,
      'mediaType': 'video',
      'transactionId': '62890707-3770-497c-a3b8-d905a2d0cb98',
      'sizes': [
        640,
        480
      ],
      'bidId': '23b86d8f6335ce',
      'bidderRequestId': '1d5b7474eb5416',
      'requestId': '406fe12b-fa3b-4bd3-b3c8-043951b4dac1'
    }
  }

  function createParams(...bids) {
    return {
      'bidderCode': 'unruly',
      'requestId': '406fe12b-fa3b-4bd3-b3c8-043951b4dac1',
      'bidderRequestId': '1d5b7474eb5416',
      'bids': bids,
      'start': 1495794517251,
      'auctionStart': 1495794517250,
      'timeout': 3000
    }
  }

  function createOutStreamExchangeBid({ placementCode, statusCode = 1 }) {
    return {
      'ext': {
        'statusCode': statusCode,
        'renderer': {
          'id': 'unruly_inarticle',
          'config': {},
          'url': 'https://video.unrulymedia.com/native/prebid-loader.js'
        },
        'placementCode': placementCode
      },
      'cpm': 20,
      'bidderCode': 'unruly',
      'width': 323,
      'vastUrl': 'https://targeting.unrulymedia.com/in_article?uuid=74544e00-d43b-4f3a-a799-69d22ce979ce&supported_mime_type=application/javascript&supported_mime_type=video/mp4&tj=%7B%22site%22%3A%7B%22lang%22%3A%22en-GB%22%2C%22ref%22%3A%22%22%2C%22page%22%3A%22http%3A%2F%2Fdemo.unrulymedia.com%2FinArticle%2Finarticle_nypost_upbeat%2Ftravel_magazines.html%22%2C%22domain%22%3A%22demo.unrulymedia.com%22%7D%2C%22user%22%3A%7B%22profile%22%3A%7B%22quantcast%22%3A%7B%22segments%22%3A%5B%7B%22id%22%3A%22D%22%7D%2C%7B%22id%22%3A%22T%22%7D%5D%7D%7D%7D%7D&video_width=618&video_height=347',
      'bidId': 'foo',
      'height': 323
    }
  }

  function createInStreamExchangeBid({ placementCode, statusCode = 1 }) {
    return {
      'ext': {
        'statusCode': statusCode,
        'placementCode': placementCode
      },
      'cpm': 20,
      'bidderCode': 'unruly',
      'width': 323,
      'vastUrl': 'https://targeting.unrulymedia.com/in_article?uuid=74544e00-d43b-4f3a-a799-69d22ce979ce&supported_mime_type=application/javascript&supported_mime_type=video/mp4&tj=%7B%22site%22%3A%7B%22lang%22%3A%22en-GB%22%2C%22ref%22%3A%22%22%2C%22page%22%3A%22http%3A%2F%2Fdemo.unrulymedia.com%2FinArticle%2Finarticle_nypost_upbeat%2Ftravel_magazines.html%22%2C%22domain%22%3A%22demo.unrulymedia.com%22%7D%2C%22user%22%3A%7B%22profile%22%3A%7B%22quantcast%22%3A%7B%22segments%22%3A%5B%7B%22id%22%3A%22D%22%7D%2C%7B%22id%22%3A%22T%22%7D%5D%7D%7D%7D%7D&video_width=618&video_height=347',
      'bidId': 'foo',
      'height': 323
    }
  }

  function createExchangeResponse(...bids) {
    return {
      'bids': bids
    }
  }

  let adapter
  let server
  let sandbox
  let fakeRenderer

  beforeEach(() => {
    adapter = createUnrulyAdapter()
    adapter.exchangeUrl = 'http://localhost:9000/prebid'

    sandbox = sinon.sandbox.create()
    sandbox.stub(bidmanager, 'addBidResponse')
    sandbox.stub(bidfactory, 'createBid')
    sandbox.stub(utils, 'logError')

    fakeRenderer = {
      setRender: sinon.stub()
    }

    sandbox.stub(Renderer, 'install')
    Renderer.install.returns(fakeRenderer)

    server = sinon.fakeServer.create()
  })

  afterEach(() => {
    sandbox.restore()
    server.restore()
    delete parent.window.unruly
  })

  describe('callBids', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })

    it('requires bids to make request', () => {
      adapter.callBids({})
      expect(server.requests).to.be.empty
    })

    it('requires at least one bid to make request', () => {
      adapter.callBids({ bids: [] })
      expect(server.requests).to.be.empty
    })

    it('passes bids through to exchange', () => {
      const params = createParams(createBidRequestBid({ placementCode: 'placement1' }))

      adapter.callBids(params)

      expect(server.requests).to.have.length(1)
      expect(server.requests[0].url).to.equal('http://localhost:9000/prebid')

      const requestBody = JSON.parse(server.requests[0].requestBody)
      expect(requestBody).to.deep.equal({
        'bidRequests': params.bids
      })
    })

    it('creates a bid response using status code from exchange for each bid and passes in the exchange response', () => {
      const params = createParams(createBidRequestBid({ placementCode: 'placement1' }))

      const exchangeBid1 = createOutStreamExchangeBid({ placementCode: 'placement1' })
      const exchangeBid2 = createOutStreamExchangeBid({ placementCode: 'placement2', statusCode: 2 })
      const exchangeResponse = createExchangeResponse(exchangeBid1, exchangeBid2)

      server.respondWith(JSON.stringify(exchangeResponse))
      bidfactory.createBid.returns({})

      adapter.callBids(params)
      server.respond()

      sinon.assert.calledTwice(bidfactory.createBid)
      sinon.assert.calledWith(bidfactory.createBid, exchangeBid1.ext.statusCode, exchangeResponse.bids[0])
      sinon.assert.calledWith(bidfactory.createBid, exchangeBid2.ext.statusCode, exchangeResponse.bids[1])
    })

    it('adds the bid response to the bid manager', () => {
      const fakeBid = {}

      const params = createParams(createBidRequestBid({ placementCode: 'placement1' }))
      const exchangeBid = createOutStreamExchangeBid({ placementCode: 'placement1' })
      const exchangeResponse = createExchangeResponse(exchangeBid)

      server.respondWith(JSON.stringify(exchangeResponse))
      bidfactory.createBid.withArgs(exchangeBid.ext.statusCode).returns(fakeBid)

      adapter.callBids(params)
      server.respond()

      sinon.assert.calledOnce(bidmanager.addBidResponse)
      sinon.assert.calledWith(bidmanager.addBidResponse, exchangeBid.ext.placementCode, fakeBid)
    })

    describe('on invalid exchange response', () => {
      it('should create NO_BID response for each bid request bid', () => {
        const bidRequestBid1 = createBidRequestBid({ placementCode: 'placement1' })
        const bidRequestBid2 = createBidRequestBid({ placementCode: 'placement2' })
        const params = createParams(bidRequestBid1, bidRequestBid2)
        const expectedBid = { 'some': 'props' }

        server.respondWith('this is not json')
        bidfactory.createBid.withArgs(STATUS.NO_BID).returns(expectedBid)

        adapter.callBids(params)
        server.respond()

        sinon.assert.calledOnce(utils.logError)
        sinon.assert.calledTwice(bidmanager.addBidResponse)
        sinon.assert.calledWith(bidmanager.addBidResponse, bidRequestBid1.placementCode, expectedBid)
        sinon.assert.calledWith(bidmanager.addBidResponse, bidRequestBid2.placementCode, expectedBid)
      })
    })

    describe('InStream', () => {
      it('merges bid response defaults', () => {
        const params = createParams(createBidRequestBid({ placementCode: 'placement1' }))

        const fakeBidDefaults = { some: 'default' }
        const fakeBid = Object.assign({}, fakeBidDefaults)

        const exchangeBid = createInStreamExchangeBid({ placementCode: 'placement1' })
        const exchangeResponse = createExchangeResponse(exchangeBid)
        server.respondWith(JSON.stringify(exchangeResponse))

        bidfactory.createBid.withArgs(exchangeBid.ext.statusCode).returns(fakeBid)

        adapter.callBids(params)
        server.respond()

        sinon.assert.notCalled(Renderer.install)
        expect(fakeBid).to.deep.equal(Object.assign(
          {},
          fakeBidDefaults,
          exchangeBid
        ))
      })
    })

    describe('OutStream', () => {
      it('merges bid response defaults with exchange bid and renderer', () => {
        const params = createParams(createBidRequestBid({ placementCode: 'placement1' }))

        const fakeBidDefaults = { some: 'default' }
        const fakeBid = Object.assign({}, fakeBidDefaults)

        const exchangeBid = createOutStreamExchangeBid({ placementCode: 'placement1' })
        const exchangeResponse = createExchangeResponse(exchangeBid)
        server.respondWith(JSON.stringify(exchangeResponse))

        bidfactory.createBid.withArgs(exchangeBid.ext.statusCode).returns(fakeBid)

        const fakeRenderer = {}
        Renderer.install.withArgs(Object.assign(
          {},
          exchangeBid.ext.renderer,
          { callback: sinon.match.func }
        )).returns(fakeRenderer)

        adapter.callBids(params)
        server.respond()

        expect(fakeBid).to.deep.equal(Object.assign(
          {},
          fakeBidDefaults,
          exchangeBid,
          { renderer: fakeRenderer }
        ))
      })

      it('bid is placed on the bid queue when render is called', () => {
        const params = createParams(createBidRequestBid({ placementCode: 'placement1' }))

        const fakeBidDefaults = { some: 'default' }
        const fakeBid = Object.assign({}, fakeBidDefaults)

        const exchangeBid = createOutStreamExchangeBid({ placementCode: 'placement1' })
        const exchangeResponse = createExchangeResponse(exchangeBid)
        server.respondWith(JSON.stringify(exchangeResponse))

        bidfactory.createBid.withArgs(exchangeBid.ext.statusCode).returns(fakeBid)

        adapter.callBids(params)
        server.respond()

        sinon.assert.calledOnce(fakeRenderer.setRender)
        fakeRenderer.setRender.firstCall.args[0]()

        expect(window.top).to.have.deep.property('unruly.native.prebid.uq');
        expect(window.top.unruly.native.prebid.uq).to.deep.equal([['render', fakeBid]])
      })
    })
  })
})
