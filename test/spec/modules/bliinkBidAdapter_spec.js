import { expect } from 'chai'
import { spec, buildBid, BLIINK_ENDPOINT_ENGINE, parseXML, getMetaList } from 'modules/bliinkBidAdapter.js'

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
const getConfigBid = (placement) => {
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
      placement: placement,
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
 *    id: number,
 *    category: number,
 *    type: number,
 *    content: {
 *      creative: {
 *        adm: string
 *      }
 *    }
 *    }
 *    }
*   }
 */
const getConfigCreative = () => {
  return {
    ad_id: 5648,
    price: 1,
    currency: 'EUR',
    media_type: 'banner',
    category: 1,
    id: 2825,
    creativeId: 2825,
    type: 1,
    viewability_duration: 1,
    viewability_percent_in_view: 30,
    content: {
      creative: {
        adm: '<html lang="en"></html>',
      }
    }
  }
}

const getConfigCreativeVideo = () => {
  return {
    ad_id: 5648,
    price: 1,
    currency: 'EUR',
    media_type: 'video',
    category: 1,
    creativeId: 2825,
    content: '<VAST></VAST>'
  }
}

/**
 * @description Mockup BuildRequest function
 * @return {{bidderRequestId: string, bidderCode: string, bids: {bidderWinsCount: number, adUnitCode: string, bidder: string, src: string, bidRequestsCount: number, params: {tagId: string, placement: string}, bidId: string, transactionId: string, auctionId: string, bidderRequestId: string, bidderRequestsCount: number, mediaTypes: {banner: {sizes: number[][]}}, sizes: number[][], crumbs: {pubcid: string}, ortb2Imp: {ext: {data: {pbadslot: string}}}}[], refererInfo: {referer: string, canonicalUrl: null, isAmp: boolean, reachedTop: boolean, numIframes: number}}}
 */
const getConfigBuildRequest = (placement) => {
  let buildRequest = {
    bidderRequestId: '164ddfd207e94d',
    bidderCode: 'bliink',
    bids: [getConfigBid(placement)],
    refererInfo: {
      canonicalUrl: null,
      isAmp: false,
      numIframes: 0,
      reachedTop: true,
      referer: 'http://localhost:9999/integrationExamples/gpt/bliink-adapter.html?pbjs_debug=true',
    },
  }

  if (!placement) {
    return buildRequest
  }

  return Object.assign(buildRequest, {
    params: {
      bids: [getConfigBid(placement)],
      placement: placement
    },
  })
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
 * @description Mockup response from API for RTB creative
 * @param noAd
 * @return {{body: string} | {mode: string, message: string}}
 */
const getConfigInterpretResponseRTB = (noAd = false) => {
  if (noAd) {
    return {
      message: 'invalid tag',
      mode: 'no-ad'
    }
  }

  return {
    body: `
    <VAST version="3">
      <Ad>
        <Wrapper>
          <AdSystem>BLIINK</AdSystem>
          <VASTAdTagURI>https://vast.bliink.io/p/508379d0-9f65-4198-8ba5-f61f2b51224f.xml</VASTAdTagURI>
          <Error>https://e.api.bliink.io/e?name=vast-error&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MzQwMzA1MjcsImlhdCI6MTYzMzQyNTcyNywiaXNzIjoiYmxpaW5rIiwiZGF0YSI6eyJ0eXBlIjoiYWQtc2VydmVyIiwidHJhbnNhY3Rpb25JZCI6ImE2NjJjZGJmLTkzNDYtNDI0MS1iMTU0LTJhOTc2OTg0NjNmOSIsIm5ldHdvcmtJZCI6MjUsInNpdGVJZCI6MTQzLCJ0YWdJZCI6MTI3MSwiY29va2llSWQiOiIwNWFhN2UwMi05MzgzLTQ1NGYtOTJmZC1jOTE2YWNlMmUyZjYiLCJldmVudElkIjozLCJ0YXJnZXRpbmciOnsicGxhdGZvcm0iOiJXZWJzaXRlIiwicmVmZXJyZXIiOiJodHRwOi8vbG9jYWxob3N0OjgxODEvaW50ZWdyYXRpb25FeGFtcGxlcy9ncHQvYmxpaW5rLWluc3RyZWFtLmh0bWwiLCJwYWdlVXJsIjoiaHR0cDovL2xvY2FsaG9zdDo4MTgxL2ludGVncmF0aW9uRXhhbXBsZXMvZ3B0L2JsaWluay1pbnN0cmVhbS5odG1sIiwiaXAiOiIzMS4zOS4xNDEuMTQwIiwidGltZSI6MTYzMzQyNTcyNywibG9jYXRpb24iOnsibGF0aXR1ZGUiOjQ4Ljk0MjIsImxvbmdpdHVkZSI6Mi41MDM5LCJyZWdpb24iOiJJREYiLCJjb3VudHJ5IjoiRlIiLCJjaXR5IjoiQXVsbmF5LXNvdXMtQm9pcyIsInppcENvZGUiOiI5MzYwMCIsImRlcGFydG1lbnQiOiI5MyJ9LCJjaXR5IjoiQXVsbmF5LXNvdXMtQm9pcyIsImNvdW50cnkiOiJGUiIsImRldmljZU9zIjoibWFjT1MiLCJkZXZpY2VQbGF0Zm9ybSI6IldlYnNpdGUiLCJyYXdVc2VyQWdlbnQiOiJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvOTMuMC40NTc3LjYzIFNhZmFyaS81MzcuMzYiLCJjb250ZW50Q2xhc3NpZmljYXRpb24iOnsiYnJhbmRzYWZlIjpmYWxzZX19LCJnZHByIjp7Imhhc0NvbnNlbnQiOnRydWV9LCJ3aW4iOmZhbHNlLCJhZElkIjo1NzkzLCJhZHZlcnRpc2VySWQiOjEsImNhbXBhaWduSWQiOjEsImNyZWF0aXZlSWQiOjExOTQsImVycm9yIjpmYWxzZX19.nJSJPKovg0_jSHtLdrMPDqesAIlFKCuXPXYxpsyWBDw</Error>
          <Impression>https://e.api.bliink.io/e?name=impression&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MzQwMzA1MjcsImlhdCI6MTYzMzQyNTcyNywiaXNzIjoiYmxpaW5rIiwiZGF0YSI6eyJ0eXBlIjoiYWQtc2VydmVyIiwidHJhbnNhY3Rpb25JZCI6ImE2NjJjZGJmLTkzNDYtNDI0MS1iMTU0LTJhOTc2OTg0NjNmOSIsIm5ldHdvcmtJZCI6MjUsInNpdGVJZCI6MTQzLCJ0YWdJZCI6MTI3MSwiY29va2llSWQiOiIwNWFhN2UwMi05MzgzLTQ1NGYtOTJmZC1jOTE2YWNlMmUyZjYiLCJldmVudElkIjozLCJ0YXJnZXRpbmciOnsicGxhdGZvcm0iOiJXZWJzaXRlIiwicmVmZXJyZXIiOiJodHRwOi8vbG9jYWxob3N0OjgxODEvaW50ZWdyYXRpb25FeGFtcGxlcy9ncHQvYmxpaW5rLWluc3RyZWFtLmh0bWwiLCJwYWdlVXJsIjoiaHR0cDovL2xvY2FsaG9zdDo4MTgxL2ludGVncmF0aW9uRXhhbXBsZXMvZ3B0L2JsaWluay1pbnN0cmVhbS5odG1sIiwiaXAiOiIzMS4zOS4xNDEuMTQwIiwidGltZSI6MTYzMzQyNTcyNywibG9jYXRpb24iOnsibGF0aXR1ZGUiOjQ4Ljk0MjIsImxvbmdpdHVkZSI6Mi41MDM5LCJyZWdpb24iOiJJREYiLCJjb3VudHJ5IjoiRlIiLCJjaXR5IjoiQXVsbmF5LXNvdXMtQm9pcyIsInppcENvZGUiOiI5MzYwMCIsImRlcGFydG1lbnQiOiI5MyJ9LCJjaXR5IjoiQXVsbmF5LXNvdXMtQm9pcyIsImNvdW50cnkiOiJGUiIsImRldmljZU9zIjoibWFjT1MiLCJkZXZpY2VQbGF0Zm9ybSI6IldlYnNpdGUiLCJyYXdVc2VyQWdlbnQiOiJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvOTMuMC40NTc3LjYzIFNhZmFyaS81MzcuMzYiLCJjb250ZW50Q2xhc3NpZmljYXRpb24iOnsiYnJhbmRzYWZlIjpmYWxzZX19LCJnZHByIjp7Imhhc0NvbnNlbnQiOnRydWV9LCJ3aW4iOmZhbHNlLCJhZElkIjo1NzkzLCJhZHZlcnRpc2VySWQiOjEsImNhbXBhaWduSWQiOjEsImNyZWF0aXZlSWQiOjExOTQsImVycm9yIjpmYWxzZX19.nJSJPKovg0_jSHtLdrMPDqesAIlFKCuXPXYxpsyWBDw</Impression>
          <Extensions><Price>1</Price><Currency>EUR</Currency>
        </Wrapper>
      </Ad>
    </VAST>
    `
  }
}

/**
 *
 *
 *
 * @description Below start tests for utils fonctions
 *
 *
 *
 */

const testsGetMetaList = [
  {
    title: 'Should return empty array if there are no parameters',
    args: {
      fn: getMetaList()
    },
    want: []
  },
  {
    title: 'Should return list of metas with name associated',
    args: {
      fn: getMetaList('test'),
    },
    want: [
      {
        key: 'name',
        value: 'test',
      },
      {
        key: 'name*',
        value: 'test',
      },
      {
        key: 'itemprop*',
        value: 'test',
      },
      {
        key: 'property',
        value: `'og:${'test'}'`,
      },
      {
        key: 'property',
        value: `'twitter:${'test'}'`,
      },
      {
        key: 'property',
        value: `'article:${'test'}'`,
      },
    ]
  }
]

describe('BLIINK Adapter getMetaList', function() {
  for (const test of testsGetMetaList) {
    it(test.title, () => {
      const res = test.args.fn
      expect(res).to.eql(test.want)
    })
  }
})

/**
 * @description Array of tests used in describe function below
 * @type {[{args: {fn: (string|Document)}, want: string, title: string}, {args: {fn: (string|Document)}, want: string, title: string}]}
 */
const testsParseXML = [
  {
    title: 'Should return null, if content length equal to 0',
    args: {
      fn: parseXML('')
    },
    want: null,
  },
  {
    title: 'Should return null, if content isnt string',
    args: {
      fn: parseXML({})
    },
    want: null,
  },
]

describe('BLIINK Adapter parseXML', function() {
  for (const test of testsParseXML) {
    it(test.title, () => {
      const res = test.args.fn
      expect(res).to.eql(test.want)
    })
  }
})

/**
 *
 *
 *
 * @description End tests for utils fonctions
 *
 *
 *
 */

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
      fn: spec.isBidRequestValid(getConfigBid('banner'))
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

const testsInterpretResponse = [
  {
    title: 'Should construct bid for video instream',
    args: {
      fn: spec.interpretResponse(getConfigInterpretResponseRTB(false), getConfigBuildRequest('video'))
    },
    want: {
      cpm: 0,
      currency: 'EUR',
      height: 250,
      width: 300,
      creativeId: 0,
      mediaType: 'video',
      netRevenue: false,
      requestId: '2def0c5b2a7f6e',
      ttl: 3600,
      vastXml: getConfigInterpretResponseRTB().body,
    }
  },
  {
    title: 'ServerResponse with message: invalid tag, return empty array',
    args: {
      fn: spec.interpretResponse(getConfigInterpretResponse(true), getConfigBuildRequest('banner'))
    },
    want: []
  },
]

describe('BLIINK Adapter interpretResponse', function() {
  for (const test of testsInterpretResponse) {
    it(test.title, () => {
      const res = test.args.fn

      if (res) {
        expect(res).to.eql(test.want)
      }
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
     *    width: number,
     *    currency: string,
     *    ttl: number,
     *    creativeId: number,
     *    height: number
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
      fn: buildBid({ id: 1, test: '123' }, { id: 2, test: '345' }, false, false)
    },
    want: null
  },
  {
    title: 'input data respect the output model for video',
    args: {
      fn: buildBid(getConfigBid('video'), getConfigCreativeVideo())
    },
    want: {
      requestId: getConfigBid('video').bidId,
      cpm: 1,
      currency: 'EUR',
      mediaType: 'video',
      width: 300,
      height: 250,
      creativeId: getConfigCreativeVideo().creativeId,
      netRevenue: false,
      vastXml: getConfigCreativeVideo().content,
      ttl: 3600,
    }
  },
  {
    title: 'input data respect the output model for banner',
    args: {
      fn: buildBid(getConfigBid('banner'), getConfigCreative())
    },
    want: {
      requestId: getConfigBid('banner').bidId,
      cpm: 1,
      currency: 'EUR',
      mediaType: 'banner',
      width: 300,
      height: 250,
      creativeId: getConfigCreative().id,
      ad: getConfigCreative().content.creative.adm,
      ttl: 3600,
      netRevenue: false,
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
      fn: spec.buildRequests([], getConfigBuildRequest('banner'))
    },
    want: {
      method: 'GET',
      url: `${BLIINK_ENDPOINT_ENGINE}/${getConfigBuildRequest('banner').bids[0].params.tagId}`,
      params: {
        bidderRequestId: getConfigBuildRequest('banner').bidderRequestId,
        bidderCode: getConfigBuildRequest('banner').bidderCode,
        bids: getConfigBuildRequest('banner').bids,
        refererInfo: getConfigBuildRequest('banner').refererInfo
      },
      data: {
        gdpr: false,
        gdpr_consent: '',
        height: 250,
        width: 300,
        keywords: '',
        pageDescription: '',
        pageTitle: '',
        pageUrl: 'http://localhost:9999/integrationExamples/gpt/bliink-adapter.html?pbjs_debug=true',
      }
    }
  },
  {
    title: 'Should build request width GDPR configuration',
    args: {
      fn: spec.buildRequests([], Object.assign(getConfigBuildRequest('banner'), {
        gdprConsent: {
          gdprApplies: true,
          consentString: 'XXXX'
        },
      }))
    },
    want: {
      method: 'GET',
      url: `${BLIINK_ENDPOINT_ENGINE}/${getConfigBuildRequest('banner').bids[0].params.tagId}`,
      params: {
        bidderRequestId: getConfigBuildRequest('banner').bidderRequestId,
        bidderCode: getConfigBuildRequest('banner').bidderCode,
        bids: getConfigBuildRequest('banner').bids,
        refererInfo: getConfigBuildRequest('banner').refererInfo
      },
      data: {
        gdpr: true,
        gdpr_consent: 'XXXX',
        pageDescription: '',
        pageTitle: '',
        keywords: '',
        pageUrl: 'http://localhost:9999/integrationExamples/gpt/bliink-adapter.html?pbjs_debug=true',
        height: 250,
        width: 300,
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

const getSyncOptions = (pixelEnabled = true, iframeEnabled = 'false') => {
  return {
    pixelEnabled,
    iframeEnabled
  }
}

const getServerResponses = () => {
  return [
    {
      body: '<VAST></VAST>',
    }
  ]
}

const getGdprConsent = () => {
  return {
    gdprApplies: 1,
    consentString: 'XXX'
  }
}

const testsGetUserSyncs = [
  {
    title: 'Should not have gdprConsent exist',
    args: {
      fn: spec.getUserSyncs(getSyncOptions(), getServerResponses(), getGdprConsent())
    },
    want: [
      {
        type: 'script',
        url: 'https://prg.smartadserver.com/ac?out=js&nwid=3392&siteid=305791&pgname=rg&fmtid=81127&tgt=[sas_target]&visit=m&tmstp=[timestamp]&clcturl=[countgo]'
      },
      {
        type: 'image',
        url: 'https://sync.smartadserver.com/getuid?nwid=3392&consentString=XXX&url=https%3A%2F%2Fcookiesync.api.bliink.io%2Fcookiesync%3Fpartner%3Dsmart%26uid%3D%5Bsas_uid%5D'
      },
      {
        type: 'image',
        url: 'https://ad.360yield.com/server_match?partner_id=1531&consentString=XXX&r=https%3A%2F%2Fcookiesync.api.bliink.io%2Fcookiesync%3Fpartner%3Dazerion%26uid%3D%7BPUB_USER_ID%7D',
      },
      {
        type: 'image',
        url: 'https://ads.stickyadstv.com/auto-user-sync?consentString=XXX',
      },
      {
        type: 'image',
        url: 'https://cookiesync.api.bliink.io/getuid?url=https%3A%2F%2Fvisitor.omnitagjs.com%2Fvisitor%2Fsync%3Fuid%3D1625272249969090bb9d544bd6d8d645%26name%3DBLIINK%26visitor%3D%24UID%26external%3Dtrue&consentString=XXX',
      },
      {
        type: 'image',
        url: 'https://cookiesync.api.bliink.io/getuid?url=https://pixel.advertising.com/ups/58444/sync?&gdpr=1&gdpr_consent=XXX&redir=true&uid=$UID',
      },
      {
        type: 'image',
        url: 'https://ups.analytics.yahoo.com/ups/58499/occ?gdpr=1&gdpr_consent=XXX',
      },
      {
        type: 'image',
        url: 'https://secure.adnxs.com/getuid?https%3A%2F%2Fcookiesync.api.bliink.io%2Fcookiesync%3Fpartner%3Dazerion%26uid%3D%24UID',
      },
    ]
  },
  {
    title: 'Should not have gdpr consent',
    args: {
      fn: spec.getUserSyncs(getSyncOptions(), getServerResponses())
    },
    want: []
  }
]

describe('BLIINK Adapter getUserSyncs', function() {
  for (const test of testsGetUserSyncs) {
    it(test.title, () => {
      const res = test.args.fn
      expect(res).to.eql(test.want)
    })
  }
})
