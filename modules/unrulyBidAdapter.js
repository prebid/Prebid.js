import { ajax } from 'src/ajax'
import bidfactory from 'src/bidfactory'
import bidmanager from 'src/bidmanager'
import * as utils from 'src/utils'
import { STATUS } from 'src/constants'
import { Renderer } from 'src/Renderer'
import adaptermanager from 'src/adaptermanager'

function createRenderHandler({ bidResponseBid, rendererConfig }) {
  function createApi() {
    parent.window.unruly.native.prebid = parent.window.unruly.native.prebid || {}
    parent.window.unruly.native.prebid.uq = parent.window.unruly.native.prebid.uq || []

    return {
      render(bidResponseBid) {
        parent.window.unruly.native.prebid.uq.push(['render', bidResponseBid])
      },
      onLoaded(bidResponseBid) {}
    }
  }

  parent.window.unruly = parent.window.unruly || {}
  parent.window.unruly.native = parent.window.unruly.native || {}
  parent.window.unruly.native.siteId = parent.window.unruly.native.siteId || rendererConfig.siteId

  const api = createApi()
  return {
    render() {
      api.render(bidResponseBid)
    },
    onRendererLoad() {
      api.onLoaded(bidResponseBid)
    }
  }
}

function createBidResponseHandler(bidRequestBids) {
  return {
    onBidResponse(responseBody) {
      try {
        const exchangeResponse = JSON.parse(responseBody)
        exchangeResponse.bids.forEach((exchangeBid) => {
          const bidResponseBid = bidfactory.createBid(exchangeBid.ext.statusCode, exchangeBid)

          Object.assign(
            bidResponseBid,
            exchangeBid
          )

          if (exchangeBid.ext.renderer) {
            const rendererParams = exchangeBid.ext.renderer
            const renderHandler = createRenderHandler({
              bidResponseBid,
              rendererConfig: rendererParams.config
            })

            bidResponseBid.renderer = Renderer.install(
              Object.assign(
                {},
                rendererParams,
                { callback: () => renderHandler.onRendererLoad() }
              )
            )
            bidResponseBid.renderer.setRender(() => renderHandler.render())
          }

          bidmanager.addBidResponse(exchangeBid.ext.placementCode, bidResponseBid)
        })
      } catch (error) {
        utils.logError(error);
        bidRequestBids.forEach(bidRequestBid => {
          const bidResponseBid = bidfactory.createBid(STATUS.NO_BID)
          bidmanager.addBidResponse(bidRequestBid.placementCode, bidResponseBid)
        })
      }
    }
  }
}

function UnrulyAdapter() {
  const adapter = {
    exchangeUrl: 'https://targeting.unrulymedia.com/prebid',
    callBids({ bids: bidRequestBids }) {
      if (!bidRequestBids || bidRequestBids.length === 0) {
        return
      }

      const payload = {
        bidRequests: bidRequestBids
      }

      const bidResponseHandler = createBidResponseHandler(bidRequestBids)

      ajax(
        adapter.exchangeUrl,
        bidResponseHandler.onBidResponse,
        JSON.stringify(payload),
        {
          contentType: 'application/json',
          withCredentials: true
        }
      )
    }
  }

  return adapter
}

adaptermanager.registerBidAdapter(new UnrulyAdapter(), 'unruly')

module.exports = UnrulyAdapter
