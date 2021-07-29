import { expect } from 'chai'
import {spec, buildBid, BLIINK_ENDPOINT_ENGINE} from 'modules/bliinkBidAdapter.js'

/**
 * @description Mockup bidRequest
 * @return {{
 * bidderWinsCount: number,
 * adUnitCode: string,
 * bidder: string,
 * src: string,
 * bidRequestsCount: number,
 * params: {tagId: string, placement: string},
 * bidId: string,
 * transactionId: string,
 * auctionId: string,
 * bidderRequestId: string,
 * bidderRequestsCount: number,
 * mediaTypes: {banner: {sizes: number[][]}},
 * sizes: number[][],
 * crumbs: {pubcid: string},
 * ortb2Imp: {ext: {data: {pbadslot: string}}}}}
 */
const getConfigBid = () => {
  return {
    adUnitCode: '/19968336/test',
    auctionId: '6752b51c-dcd4-4001-85dc-885ab5c504cf',
    bidId: '2def0c5b2a7f6e',
    bidRequestsCount: 1,
    bidder: 'bliink',
    bidderRequestId: '1592eb20088b18',
    bidderRequestsCount: 1,
    bidderWinsCount: 0,
    crumbs: {
      pubcid: '55ffadc5-051f-428d-8ecc-dc585e0bde0d'
    },
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250]
        ]
      }
    },
    ortb2Imp: {
      ext: {
        data: {
          pbadslot: '/19968336/test'
        }
      }
    },
    params: {
      placement: 'banner',
      tagId: '14f30eca-85d2-11e8-9eed-0242ac120007'
    },
    sizes: [
      [300, 250]
    ],
    src: 'client',
    transactionId: 'cc6678c4-9746-4082-b9e2-d8065d078ebf'
  }
}

/**
 * @description Mockup response from engine.bliink.io/xxxx
 * @return {
 *  {
 *    viewability_percent_in_view: number,
 *    viewability_duration: number,
 *    ad_id: number,
 *    adm: string,
 *    id: number,
 *    category: number,
 *    type: number
 *    }
*   }
 */
const getConfigCreative = () => {
  return {
    ad_id: 5648,
    adm: '<div>BLIINK Creative Mock</div>',
    category: 1,
    id: 2825,
    type: 1,
    viewability_duration: 1,
    viewability_percent_in_view: 30,
  }
}

/**
 * @description Mockup BuildRequest function
 * @return {{bidderRequestId: string, bidderCode: string, bids: {bidderWinsCount: number, adUnitCode: string, bidder: string, src: string, bidRequestsCount: number, params: {tagId: string, placement: string}, bidId: string, transactionId: string, auctionId: string, bidderRequestId: string, bidderRequestsCount: number, mediaTypes: {banner: {sizes: number[][]}}, sizes: number[][], crumbs: {pubcid: string}, ortb2Imp: {ext: {data: {pbadslot: string}}}}[], refererInfo: {referer: string, canonicalUrl: null, isAmp: boolean, reachedTop: boolean, numIframes: number}}}
 */
const getConfigBuildRequest = () => {
  return {
    bidderRequestId: '164ddfd207e94d',
    bidderCode: 'bliink',
    bids: [getConfigBid()],
    refererInfo: {
      canonicalUrl: null,
      isAmp: false,
      numIframes: 0,
      reachedTop: true,
      referer: 'http://localhost:9999/integrationExamples/gpt/bliink-adapter.html?pbjs_debug=true',
    },
  }
}

/**
 * @description Mockup response from API
 * @param noAd
 * @return {{mode: string, message: string}|{headers: {}, body: {mode: string, creative: {viewability_percent_in_view: number, viewability_duration: number, ad_id: number, adm: string, id: number, category: number, type: number}, token: string}}}
 */
const getConfigInterpretResponse = (noAd = false) => {
  if (noAd) {
    return {
      message: 'invalid tag',
      mode: 'no-ad'
    }
  }

  return {
    body: {
      creative: getConfigCreative(),
      mode: 'ad',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MjgxNzA4MzEsImlhdCI6MTYyNzU2NjAzMSwiaXNzIjoiYmxpaW5rIiwiZGF0YSI6eyJ0eXBlIjoiYWQtc2VydmVyIiwidHJhbnNhY3Rpb25JZCI6IjM1YmU1NDNjLTNkZTQtNGQ1Yy04N2NjLWIzYzEyOGZiYzU0MCIsIm5ldHdvcmtJZCI6MjEsInNpdGVJZCI6NTksInRhZ0lkIjo1OSwiY29va2llSWQiOiJjNGU4MWVhOS1jMjhmLTQwZDItODY1ZC1hNjQzZjE1OTcyZjUiLCJldmVudElkIjozLCJ0YXJnZXRpbmciOnsicGxhdGZvcm0iOiJXZWJzaXRlIiwiaXAiOiI3OC4xMjIuNzUuNzIiLCJ0aW1lIjoxNjI3NTY2MDMxLCJsb2NhdGlvbiI6eyJsYXRpdHVkZSI6NDguOTczOSwibG9uZ2l0dWRlIjozLjMxMTMsInJlZ2lvbiI6IkhERiIsImNvdW50cnkiOiJGUiIsImNpdHkiOiJTYXVsY2hlcnkiLCJ6aXBDb2RlIjoiMDIzMTAiLCJkZXBhcnRtZW50IjoiMDIifSwiY2l0eSI6IlNhdWxjaGVyeSIsImNvdW50cnkiOiJGUiIsImRldmljZU9zIjoibWFjT1MiLCJkZXZpY2VQbGF0Zm9ybSI6IldlYnNpdGUiLCJyYXdVc2VyQWdlbnQiOiJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvOTEuMC40NDcyLjEyNCBTYWZhcmkvNTM3LjM2In0sImdkcHIiOnsiaGFzQ29uc2VudCI6dHJ1ZX0sIndpbiI6ZmFsc2UsImFkSWQiOjU2NDgsImFkdmVydGlzZXJJZCI6MSwiY2FtcGFpZ25JZCI6MSwiY3JlYXRpdmVJZCI6MjgyNSwiZXJyb3IiOmZhbHNlfX0.-UefQH4G0k-RJGemBYffs-KL7EEwma2Wuwgk2xnpij8'
    },
    headers: {},
  }
}

/**
 * @description Array of tests used in describe function below
 * @type {[{args: {fn}, want: boolean, title: string}, {args: {fn}, want: boolean, title: string}, {args: {fn}, want: boolean, title: string}]}
 */
const testsIsBidRequestValid = [
  {
    title: 'isBidRequestValid format not valid',
    args: {
      fn: spec.isBidRequestValid({})
    },
    want: false,
  },
  {
    title: 'isBidRequestValid does not receive any bid',
    args: {
      fn: spec.isBidRequestValid()
    },
    want: false,
  },
  {
    title: 'isBidRequestValid Receive a valid bid',
    args: {
      fn: spec.isBidRequestValid(getConfigBid())
    },
    want: true,
  }
]

describe('BLIINK Adapter isBidRequestValid', function() {
  for (const test of testsIsBidRequestValid) {
    it(test.title, () => {
      const res = test.args.fn
      expect(res).to.eql(test.want)
    })
  }
})

/**
 * @description Array of tests used in describe function below
 * @type {[
 * {args:
 *  {fn: {
     *    cpm: number,
     *    netRevenue: boolean,
     *    ad, requestId,
     *    meta: {mediaType},
     *    width,
     *    currency: string,
     *    ttl: number,
     *    creativeId, height
 *      }
 *    }, want, title: string}]}
 */
const testsBuildBid = [
  {
    title: 'Should return null if no bid passed in parameters',
    args: {
      fn: buildBid()
    },
    want: null
  },
  {
    title: 'Input data must respect the output model',
    args: {
      fn: buildBid({ id: 1, test: '123' }, { id: 2, test: '345' })
    },
    want: null
  },
  {
    title: 'input data respect the output model',
    args: {
      fn: buildBid(getConfigBid(), getConfigCreative())
    },
    want: {
      requestId: getConfigBid().bidId,
      cpm: 1,
      currency: 'EUR',
      width: 300,
      height: 250,
      creativeId: getConfigCreative().id,
      netRevenue: true,
      ad: getConfigCreative().adm,
      ttl: 360,
      meta: {
        mediaType: getConfigBid().params.placement
      }
    }
  }
]

describe('BLIINK Adapter buildBid', function() {
  for (const test of testsBuildBid) {
    it(test.title, () => {
      const res = test.args.fn
      expect(res).to.eql(test.want)
    })
  }
})

/**
 * @description Array of tests used in describe function below
 * @type {[{args: {fn}, want, title: string}]}
 */
const testsBuildRequests = [
  {
    title: 'Should not build request, no bidder request exist',
    args: {
      fn: spec.buildRequests()
    },
    want: null
  },
  {
    title: 'Should build request if bidderRequest exist',
    args: {
      fn: spec.buildRequests([], getConfigBuildRequest())
    },
    want: {
      method: 'GET',
      url: `${BLIINK_ENDPOINT_ENGINE}/${getConfigBuildRequest().bids[0].params.tagId}`,
      data: {
        bidderRequestId: getConfigBuildRequest().bidderRequestId,
        bidderCode: getConfigBuildRequest().bidderCode,
        bids: getConfigBuildRequest().bids,
        refererInfo: getConfigBuildRequest().refererInfo
      }
    }
  }
]

describe('BLIINK Adapter buildRequests', function() {
  for (const test of testsBuildRequests) {
    it(test.title, () => {
      const res = test.args.fn
      expect(res).to.eql(test.want)
    })
  }
})

const testsInterpretResponse = [
  {
    title: 'ServerResponse with message: invalid tag, return empty array',
    args: {
      fn: spec.interpretResponse(getConfigInterpretResponse(true), getConfigBuildRequest())
    },
    want: []
  },
  {
    title: 'Should server respond without invalid tag and bids array',
    args: {
      fn: spec.interpretResponse(getConfigInterpretResponse(), {
        data: {
          ...getConfigBuildRequest()
        }
      })
    },
    want: [
      {
        requestId: getConfigBid().bidId,
        cpm: 1,
        currency: 'EUR',
        width: 300,
        height: 250,
        creativeId: getConfigCreative().id,
        netRevenue: true,
        ad: getConfigCreative().adm,
        ttl: 360,
        meta: {
          mediaType: getConfigBid().params.placement
        }
      }
    ]
  }
]

describe('BLIINK Adapter interpretResponse', function() {
  for (const test of testsInterpretResponse) {
    it(test.title, () => {
      const res = test.args.fn
      expect(res).to.eql(test.want)
    })
  }
})
