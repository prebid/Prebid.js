import { expect } from 'chai'
import { spec } from 'modules/videoNowBidAdapter.js'
import { replaceAuctionPrice } from 'src/utils.js'
import * as utils from 'src/utils.js';

// childNode.remove polyfill for ie11
// suggested by: https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/remove

// from:https://github.com/jserz/js_piece/blob/master/DOM/ChildNode/remove()/remove().md
(function (arr) {
  arr.forEach(function (item) {
    if (item.hasOwnProperty('remove')) {
      return;
    }
    Object.defineProperty(item, 'remove', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: function remove() {
        if (this.parentNode === null) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  });
})([Element.prototype, CharacterData.prototype, DocumentType.prototype]);

const placementId = 'div-gpt-ad-1438287399331-1'
const LS_ITEM_NAME = 'videonow-config'

const getValidServerResponse = () => {
  const serverResponse = {
    body: {
      id: '111-111',
      bidid: '2955a162-699e-4811-ce88-5c3ac973e73c',
      cur: 'RUB',
      seatbid: [
        {
          bid: [
            {
              id: 'e3bf2b82e3e9485113fad6c9b27f8768.1',
              impid: '1',
              price: 10.97,
              nurl: 'https://localhost:8086/event/nurl',
              netRevenue: false,
              ttl: 800,
              adm: '<VAST></VAST>',
              crid: 'e3bf2b82e3e9485113fad6c9b27f8768.1',
              h: 640,
              w: 480,
              ext: {
                init: 'https://localhost:8086/vn_init.js',
                module: {
                  min: 'https://localhost:8086/vn_module.js',
                  log: 'https://localhost:8086/vn_module.js?log=1'
                },
                format: {
                  name: 'flyRoll',
                },
              },

            },
          ],
          group: 0,
        },
      ],
      price: 10,
      ext: {
        placementId,
        pixels: [
          'https://localhost:8086/event/pxlcookiematching?uiid=1',
          'https://localhost:8086/event/pxlcookiematching?uiid=2',
        ],
        iframes: [
          'https://localhost:8086/event/ifrcookiematching?uiid=1',
          'https://localhost:8086/event/ifrcookiematching?uiid=2',
        ],
      },
    },
    headers: {},
  }

  return JSON.parse(JSON.stringify(serverResponse))
}

describe('videonowAdapterTests', function() {
  describe('bidRequestValidity', function() {
    it('bidRequest with pId', function() {
      expect(spec.isBidRequestValid({
        bidder: 'videonow',
        params: {
          pId: '86858',
        },
      })).to.equal(true)
    })

    it('bidRequest without pId', function() {
      expect(spec.isBidRequestValid({
        bidder: 'videonow',
        params: {
          nomater: 86858,
        },
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
          bidder: 'videonow',
          params: {
            pId: '1',
            placementId,
            url: 'https://localhost:8086/bid?p=exists',
            bidFloor: 10,
            cur: 'RUB'
          },
          crumbs: {
            pubcid: 'feded041-35dd-4b54-979a-6d7805abfa75',
          },
          mediaTypes: {
            banner: {
              sizes: [[640, 480], [320, 200]]
            },
          },
          adUnitCode: 'test-ad',
          transactionId: '676403c7-09c9-4b56-be82-e7cae81f40b9',
          sizes: [[640, 480], [320, 200]],
          bidId: '268c309f46390d',
          bidderRequestId: '1dfdd514c36ef6',
          auctionId: '4d523546-889a-4029-9a79-13d3c69f9922',
          src: 'client',
          bidRequestsCount: 1,
        },
      ]

      const bidderRequest = {
        bidderCode: 'videonow',
        auctionId: '4d523546-889a-4029-9a79-13d3c69f9922',
        bidderRequestId: '1dfdd514c36ef6',
        bids: [
          {
            bidder: 'videonow',
            params: {
              pId: '1',
              placementId,
              url: 'https://localhost:8086/bid',
              bidFloor: 10,
              cur: 'RUB',
            },
            crumbs: {
              pubcid: 'feded041-35dd-4b54-979a-6d7805abfa75',
            },
            mediaTypes: {
              banner: {
                sizes: [[640, 480], [320, 200]],
              },
            },
            adUnitCode: 'test-ad',
            transactionId: '676403c7-09c9-4b56-be82-e7cae81f40b9',
            sizes: [[640, 480], [320, 200]],
            bidId: '268c309f46390d',
            bidderRequestId: '1dfdd514c36ef6',
            auctionId: '4d523546-889a-4029-9a79-13d3c69f9922',
            src: 'client',
            bidRequestsCount: 1,
          },
        ],
        auctionStart: 1565794308584,
        timeout: 3000,
        refererInfo: {
          referer: 'https://localhost:8086/page',
          reachedTop: true,
          numIframes: 0,
          stack: [
            'https://localhost:8086/page',
          ],
        },
        start: 1565794308589,
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
        expect(request.url).to.equal('https://localhost:8086/bid?p=exists&profile_id=1')
      })

      it('bidRequest data', function() {
        const data = request.data
        expect(data.aid).to.be.eql(validBidRequests[0].params.aid)
        expect(data.id).to.be.eql(validBidRequests[0].bidId)
        expect(data.sizes).to.be.eql(validBidRequests[0].sizes)
      })

      describe('bidRequest advanced', function() {
        const bidderRequestEmptyParamsAndExtParams = {
          bidder: 'videonow',
          params: {
            pId: '1',
          },
          ext: {
            p1: 'ext1',
            p2: 'ext2',
          },
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
          const data = (request && request.data) || {}
          expect(data.cur).to.equal('RUB')
        })

        it('bidRequest ext parameters ', function() {
          const requests = spec.buildRequests([bidderRequestEmptyParamsAndExtParams], bidderRequest)
          const request = (requests && requests.length && requests[0]) || {}
          const data = (request && request.data) || {}
          expect(data['ext_p1']).to.equal('ext1')
          expect(data['ext_p2']).to.equal('ext2')
        })

        it('bidRequest without params', function() {
          const bidderReq = {
            bidder: 'videonow',
          }
          const requests = spec.buildRequests([bidderReq], bidderRequest)
          expect(requests.length).to.equal(1)
        })
      })
    })

    describe('onBidWon', function() {
      const cpm = 10
      const nurl = 'https://fakedomain.nld?price=${AUCTION_PRICE}'
      const imgSrc = replaceAuctionPrice(nurl, cpm)

      beforeEach(function() {
        sinon.stub(utils, 'triggerPixel')
      })

      afterEach(function() {
        utils.triggerPixel.restore()
      })

      it('Should not create nurl pixel if bid is undefined', function() {
        spec.onBidWon()
        expect(utils.triggerPixel.called).to.equal(false);
      })

      it('Should not create nurl pixel if bid does not contains nurl', function() {
        spec.onBidWon({})
        expect(utils.triggerPixel.called).to.equal(false);
      })

      it('Should create nurl pixel if bid nurl', function() {
        spec.onBidWon({ nurl, cpm })
        expect(utils.triggerPixel.calledWith(imgSrc)).to.equal(true);
      })
    })

    describe('getUserSyncs', function() {
      it('Should return an empty array if not get serverResponses', function() {
        expect(spec.getUserSyncs({}).length).to.equal(0)
      })

      it('Should return an empty array if get serverResponses as empty array', function() {
        expect(spec.getUserSyncs({}, []).length).to.equal(0)
      })

      it('Should return an empty array if serverResponses has no body', function() {
        const serverResp = getValidServerResponse()
        delete serverResp.body
        const syncs = spec.getUserSyncs({}, [serverResp])
        expect(syncs.length).to.equal(0)
      })

      it('Should return an empty array if serverResponses has no ext', function() {
        const serverResp = getValidServerResponse()
        delete serverResp.body.ext
        const syncs = spec.getUserSyncs({}, [serverResp])
        expect(syncs.length).to.equal(0)
      })

      it('Should return an array', function() {
        const serverResp = getValidServerResponse()
        const syncs = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true}, [serverResp])
        expect(syncs.length).to.equal(4)
      })

      it('Should return pixels', function() {
        const serverResp = getValidServerResponse()
        const syncs = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, [serverResp])
        expect(syncs.length).to.equal(2)
        expect(syncs[0].type).to.equal('image')
        expect(syncs[1].type).to.equal('image')
      })

      it('Should return iframes', function() {
        const serverResp = getValidServerResponse()
        const syncs = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: false}, [serverResp])
        expect(syncs.length).to.equal(2)
        expect(syncs[0].type).to.equal('iframe')
        expect(syncs[1].type).to.equal('iframe')
      })
    })

    describe('interpretResponse', function() {
      const bidRequest = {
        method: 'POST',
        url: 'https://localhost:8086/bid?profile_id=1',
        data: {
          id: '217b8ab59a18e8',
          cpm: 10,
          sizes: [[640, 480], [320, 200]],
          cur: 'RUB',
          placementId,
          ref: 'https://localhost:8086/page',
        },
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
        expect(spec.interpretResponse({ body: { seatbid: [1, 2] } }, bidRequest).length).to.equal(0)
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

      it('Should return an empty array if serverResponse\'s init in the bid\'s ext is undefined', function() {
        const serverResp = getValidServerResponse()
        delete serverResp.body.seatbid[0].bid[0].ext.init
        const res = spec.interpretResponse(serverResp, bidRequest)

        expect(res.length).to.equal(0)
      })

      it('Should return an empty array if serverResponse\'s module in the bid\'s ext is undefined', function() {
        const serverResp = getValidServerResponse()
        delete serverResp.body.seatbid[0].bid[0].ext.module
        const res = spec.interpretResponse(serverResp, bidRequest)

        expect(res.length).to.equal(0)
      })

      it('Should return an empty array if serverResponse\'s adm in the bid is undefined', function() {
        const serverResp = getValidServerResponse()
        delete serverResp.body.seatbid[0].bid[0].adm
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
        expect(res[0].netRevenue).to.be.true;
      })

      it('Default currency is RUB', function() {
        const serverResp = getValidServerResponse()
        delete serverResp.body.cur
        const res = spec.interpretResponse(serverResp, bidRequest)
        expect(res.length).to.equal(1)
        expect(res[0].currency).to.equal('RUB')
      })

      describe('different module paths', function() {
        beforeEach(function() {
          window.localStorage && localStorage.setItem(LS_ITEM_NAME, '{}')
        })

        afterEach(function() {
          const serverResp = getValidServerResponse()
          const { module: { log, min }, init } = serverResp.body.seatbid[0].bid[0].ext
          remove(init)
          remove(log)
          remove(min)

          function remove(src) {
            if (!src) return
            const d = document.querySelectorAll(`script[src^="${src}"]`)
            // using the Array.prototype.forEach as a workaround for IE11...
            // see https://developer.mozilla.org/en-US/docs/Web/API/NodeList
            d && d.length && Array.prototype.forEach.call(d, el => el && el.remove())
          }
        })

        it('should use prod module by default', function() {
          const serverResp = getValidServerResponse()
          const res = spec.interpretResponse(serverResp, bidRequest)
          expect(res.length).to.equal(1)

          const renderer = res[0].renderer
          expect(renderer).to.be.an('object')
          expect(renderer.url).to.equal(serverResp.body.seatbid[0].bid[0].ext.module.min)
        })

        it('should use "log" module if "prod" is not exists', function() {
          const serverResp = getValidServerResponse()
          delete serverResp.body.seatbid[0].bid[0].ext.module.min
          const res = spec.interpretResponse(serverResp, bidRequest)
          expect(res.length).to.equal(1)

          const renderer = res[0].renderer
          expect(renderer).to.be.an('object')
          expect(renderer.url).to.equal(serverResp.body.seatbid[0].bid[0].ext.module.log)
        })

        it('should correct combine src for init', function() {
          const serverResp = getValidServerResponse()

          const src = `${serverResp.body.seatbid[0].bid[0].ext.init}?profileId=1`
          const placementElement = document.createElement('div')
          placementElement.setAttribute('id', placementId)

          const resp = spec.interpretResponse(serverResp, bidRequest)
          expect(resp.length).to.equal(1)

          const renderer = resp[0].renderer
          expect(renderer).to.be.an('object')

          document.body.appendChild(placementElement)

          renderer.render()

          // const res = document.querySelectorAll(`script[src="${src}"]`)
          // expect(res.length).to.equal(1)
        })

        it('should correct combine src for init if init url contains "?"', function() {
          const serverResp = getValidServerResponse()

          serverResp.body.seatbid[0].bid[0].ext.init += '?div=1'
          const src = `${serverResp.body.seatbid[0].bid[0].ext.init}&profileId=1`

          const placementElement = document.createElement('div')
          placementElement.setAttribute('id', placementId)

          const resp = spec.interpretResponse(serverResp, bidRequest)
          expect(resp.length).to.equal(1)

          const renderer = resp[0].renderer
          expect(renderer).to.be.an('object')

          document.body.appendChild(placementElement)

          renderer.render()

          // const res = document.querySelectorAll(`script[src="${src}"]`)
          // expect(res.length).to.equal(1)
        })
      })

      describe('renderer object', function() {
        it('execute renderer.render() should create window.videonow object', function() {
          const serverResp = getValidServerResponse()
          const res = spec.interpretResponse(serverResp, bidRequest)
          expect(res.length).to.equal(1)

          const renderer = res[0].renderer
          expect(renderer).to.be.an('object')
          expect(renderer.render).to.a('function')

          const doc = window.document
          const placementElement = doc.createElement('div')
          placementElement.setAttribute('id', placementId)
          doc.body.appendChild(placementElement)

          renderer.render()
          expect(window.videonow).to.an('object')
        })
      })

      it('execute renderer.render() should not create window.videonow object if placement element not found', function() {
        const serverResp = getValidServerResponse()
        const res = spec.interpretResponse(serverResp, bidRequest)
        expect(res.length).to.equal(1)

        const renderer = res[0].renderer
        expect(renderer).to.be.an('object')
        expect(renderer.render).to.a('function')

        renderer.render()
        expect(window.videonow).to.be.undefined
      })
    })
  })
})
