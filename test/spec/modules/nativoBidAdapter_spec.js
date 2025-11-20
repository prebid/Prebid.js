import { expect } from 'chai'
import { spec } from 'modules/nativoBidAdapter.js'

describe('nativoBidAdapterTests', function () {
  describe('isBidRequestValid', function () {
    const bid = {
      bidder: 'nativo',
    }

    it('should return true if no params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true)
    })

    it('should return true for valid placementId value', function () {
      bid.params = {
        placementId: '10433394',
      }
      expect(spec.isBidRequestValid(bid)).to.equal(true)
    })

    it('should return true for valid placementId value', function () {
      bid.params = {
        placementId: 10433394,
      }
      expect(spec.isBidRequestValid(bid)).to.equal(true)
    })

    it('should return false for invalid placementId value', function () {
      bid.params = {
        placementId: true,
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })
  })

  describe('buildRequests', function () {
    const bidRequest = {
      bidder: 'nativo',
      params: {
        placementId: '10433394',
      },
      adUnitCode: 'adunit-code',
      sizes: [
        [300, 250],
        [300, 600],
      ],
      bidId: '27b02036ccfa6e',
      bidderRequestId: '1372cd8bd8d6a8',
      auctionId: 'cfc467e4-2707-48da-becb-bcaab0b2c114',
      transactionId: '3b36e7e0-0c3e-4006-a279-a741239154ff',
    }
    const bidRequestString = JSON.stringify(bidRequest)
    let bidRequests

    beforeEach(function () {
      // Clone bidRequest each time
      bidRequests = [JSON.parse(bidRequestString)]
    })

    it('Request should be POST, with OpenRTB payload and no query string params', function () {
      const request = spec.buildRequests(bidRequests, {
        bidderRequestId: 123456,
        refererInfo: {
          referer: 'https://www.test.com',
        },
      })

      expect(request.method).to.equal('POST')

      expect(request.data).to.exist
      expect(request.data).to.be.an('object')

      expect(request.url).to.exist
      expect(request.url).to.be.a('string')
      expect(request.url).to.not.include('?')

      // Check OpenRTB structure
      expect(request.data.imp).to.be.an('array')
      expect(request.data.imp.length).to.equal(1)
      expect(request.data.imp[0].tagid).to.equal('adunit-code')
    })

    it('Request should include Nativo extensions', function () {
      const request = spec.buildRequests(bidRequests, {
        bidderRequestId: 123456,
        refererInfo: {
          location: 'https://www.test.com',
        },
      })

      expect(request.data.ext).to.exist
      expect(request.data.ext.nativo).to.exist
      expect(request.data.ext.nativo.prebid).to.exist
      expect(request.data.ext.nativo.prebid.version).to.be.a('string')
      expect(request.data.ext.nativo.duplicateRequests).to.exist
      expect(request.data.ext.nativo.filtering).to.exist
    })

    it('Request should include placementId in imp extension when provided', function () {
      const request = spec.buildRequests(bidRequests, {
        bidderRequestId: 123456,
        refererInfo: {
          location: 'https://www.test.com',
        },
      })

      expect(request.data.imp[0].ext.placementId).to.equal('10433394')
    })

    it('Request should not error when placementId is not provided', function () {
      bidRequests[0].params = {}
      const request = spec.buildRequests(bidRequests, {
        bidderRequestId: 123456,
        refererInfo: {
          location: 'https://www.test.com',
        },
      })

      expect(request.url).to.exist
      expect(request.data).to.exist
      expect(request.data.imp[0].tagid).to.equal('adunit-code')
    })
  })
})

describe('interpretResponse', function () {
  const response = {
    id: '126456',
    seatbid: [
      {
        seat: 'seat_0',
        bid: [
          {
            id: 'f70362ac-f3cf-4225-82a5-948b690927a6',
            impid: '1',
            price: 3.569,
            adm: '<creative>',
            h: 300,
            w: 250,
            cat: [],
            adomain: ['test.com'],
            crid: '1060_72_6760217',
            mtype: 1, // ORTB 2.6: 1 = banner
          },
        ],
      },
    ],
    cur: 'USD',
  }

  it('should get correct bid response', function () {
    // Create a proper bid request
    const bidRequest = [
      {
        bidId: '1',
        bidder: 'nativo',
        params: {
          placementId: 1,
        },
        adUnitCode: 'test-ad-unit',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        sizes: [[300, 250]]
      },
    ]

    const bidderRequest = {
      bidderRequestId: '126456',
      bids: bidRequest
    }

    // Use buildRequests to get the actual request structure
    const request = spec.buildRequests(bidRequest, bidderRequest)

    const result = spec.interpretResponse({ body: response }, request)
    expect(result).to.be.an('array').with.lengthOf(1)

    const bid = result[0]
    expect(bid).to.exist
    expect(bid.requestId).to.equal('1')
    expect(bid.cpm).to.equal(3.569)
    expect(bid.currency).to.equal('USD')
    expect(bid.width).to.equal(250)
    expect(bid.height).to.equal(300)
    expect(bid.creativeId).to.equal('1060_72_6760217')
    expect(bid.netRevenue).to.equal(true)
    expect(bid.ttl).to.equal(30)
    expect(bid.ad).to.equal('<creative>')
    expect(bid.mediaType).to.equal('banner')
    expect(bid.meta.advertiserDomains).to.deep.equal(['test.com'])
  })

  it('handles nobid responses', function () {
    const response = {}
    let bidderRequest

    const result = spec.interpretResponse({ body: response }, { bidderRequest })
    expect(result.length).to.equal(0)
  })
})

describe('getUserSyncs', function () {
  const response = [
    {
      body: {
        cur: 'USD',
        id: 'a136dbd8-4387-48bf-b8e4-ff9c1d6056ee',
        seatbid: [
          {
            bid: [{}],
            seat: 'seat_0',
            syncUrls: [
              {
                type: 'image',
                url: 'pixel-tracker-test-url/?{GDPR_params}',
              },
              {
                type: 'iframe',
                url: 'iframe-tracker-test-url/?{GDPR_params}',
              },
            ],
          },
        ],
      },
    },
  ]

  const gdprConsent = {
    gdprApplies: true,
    consentString: '111111',
  }

  const uspConsent = {
    uspConsent: '1YYY',
  }

  it('Returns empty array if no supported user syncs', function () {
    const userSync = spec.getUserSyncs(
      {
        iframeEnabled: false,
        pixelEnabled: false,
      },
      response,
      gdprConsent,
      uspConsent
    )
    expect(userSync).to.be.an('array').with.lengthOf(0)
  })

  it('Returns valid iframe user sync', function () {
    const userSync = spec.getUserSyncs(
      {
        iframeEnabled: true,
        pixelEnabled: false,
      },
      response,
      gdprConsent,
      uspConsent
    )
    expect(userSync).to.be.an('array').with.lengthOf(1)
    expect(userSync[0].type).to.exist
    expect(userSync[0].url).to.exist
    expect(userSync[0].type).to.be.equal('iframe')
    expect(userSync[0].url).to.contain(
      'gdpr=1&gdpr_consent=111111&us_privacy=1YYY'
    )
  })

  it('Returns valid URL and type', function () {
    const userSync = spec.getUserSyncs(
      {
        iframeEnabled: false,
        pixelEnabled: true,
      },
      response,
      gdprConsent,
      uspConsent
    )
    expect(userSync).to.be.an('array').with.lengthOf(1)
    expect(userSync[0].type).to.exist
    expect(userSync[0].url).to.exist
    expect(userSync[0].type).to.be.equal('image')
    expect(userSync[0].url).to.contain(
      'gdpr=1&gdpr_consent=111111&us_privacy=1YYY'
    )
  })
})

describe('Response to Request Filter Flow', () => {
  const bidRequests = [
    {
      bidder: 'nativo',
      params: {
        placementId: '10433394',
      },
      adUnitCode: 'adunit-code',
      sizes: [
        [300, 250],
        [300, 600],
      ],
      bidId: '27b02036ccfa6e',
      bidderRequestId: '1372cd8bd8d6a8',
      auctionId: 'cfc467e4-2707-48da-becb-bcaab0b2c114',
      transactionId: '3b36e7e0-0c3e-4006-a279-a741239154ff',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      }
    },
  ]

  let response

  beforeEach(() => {
    response = {
      id: '126456',
      seatbid: [
        {
          seat: 'seat_0',
          bid: [
            {
              id: 'f70362ac-f3cf-4225-82a5-948b690927a6',
              impid: '27b02036ccfa6e',
              price: 3.569,
              adm: '<creative>',
              h: 300,
              w: 250,
              cat: [],
              adomain: ['test.com'],
              crid: '1060_72_6760217',
              mtype: 1, // ORTB 2.6: 1 = banner
            },
          ],
        },
      ],
      cur: 'USD',
    }
  })

  const bidderRequest = {
    bidderRequestId: '1372cd8bd8d6a8',
    bids: bidRequests,
  }

  it('Appends NO filter based on previous response', () => {
    // Build actual request
    const request = spec.buildRequests(bidRequests, bidderRequest)

    // Getting the mock response
    const result = spec.interpretResponse({ body: response }, request)

    // Winning the bid
    spec.onBidWon(result[0])

    // Making another request
    const request2 = spec.buildRequests(bidRequests, {
      bidderRequestId: 123456,
      refererInfo: {
        referer: 'https://www.test.com',
      },
    })
    expect(request2.data.ext.nativo.filtering.adFilterIds).to.be.an('array').that.is.empty
    expect(request2.data.ext.nativo.filtering.advertiserFilterIds).to.be.an('array').that.is.empty
    expect(request2.data.ext.nativo.filtering.campaignFilterIds).to.be.an('array').that.is.empty
  })

  it('Appends Ads filter based on previous response', () => {
    // Clone response to avoid mutation issues
    const testResponse = JSON.parse(JSON.stringify(response))
    testResponse.seatbid[0].bid[0].ext = { adsToFilter: ['12345'] }

    // Build actual request
    const request = spec.buildRequests(bidRequests, bidderRequest)

    // Getting the mock response
    const result = spec.interpretResponse({ body: testResponse }, request)

    // Verify we got a bid back
    expect(result).to.be.an('array').with.lengthOf(1)
    expect(result[0]).to.exist
    expect(result[0].requestId).to.equal('27b02036ccfa6e')

    // Winning the bid
    spec.onBidWon(result[0])

    // Making another request
    const request2 = spec.buildRequests(bidRequests, {
      bidderRequestId: 123456,
      refererInfo: {
        referer: 'https://www.test.com',
      },
    })
    expect(request2.data.ext.nativo.filtering.adFilterIds).to.include('12345')
    expect(request2.data.ext.nativo.filtering.advertiserFilterIds).to.be.an('array').that.is.empty
    expect(request2.data.ext.nativo.filtering.campaignFilterIds).to.be.an('array').that.is.empty
  })

  it('Appends Advertiser filter based on previous response', () => {
    // Clone response to avoid mutation issues
    const testResponse = JSON.parse(JSON.stringify(response))
    testResponse.seatbid[0].bid[0].ext = { advertisersToFilter: ['1'] }

    // Build actual request
    const request = spec.buildRequests(bidRequests, bidderRequest)

    // Getting the mock response
    const result = spec.interpretResponse({ body: testResponse }, request)

    // Winning the bid
    spec.onBidWon(result[0])

    // Making another request
    const request2 = spec.buildRequests(bidRequests, {
      bidderRequestId: 123456,
      refererInfo: {
        referer: 'https://www.test.com',
      },
    })
    expect(request2.data.ext.nativo.filtering.adFilterIds).to.include('12345')
    expect(request2.data.ext.nativo.filtering.advertiserFilterIds).to.include('1')
    expect(request2.data.ext.nativo.filtering.campaignFilterIds).to.be.an('array').that.is.empty
  })

  it('Appends Campaign filter based on previous response', () => {
    // Clone response to avoid mutation issues
    const testResponse = JSON.parse(JSON.stringify(response))
    testResponse.seatbid[0].bid[0].ext = { campaignsToFilter: ['234'] }

    // Build actual request
    const request = spec.buildRequests(bidRequests, bidderRequest)

    // Getting the mock response
    const result = spec.interpretResponse({ body: testResponse }, request)

    // Winning the bid
    spec.onBidWon(result[0])

    // Making another request
    const request2 = spec.buildRequests(bidRequests, {
      bidderRequestId: 123456,
      refererInfo: {
        referer: 'https://www.test.com',
      },
    })
    expect(request2.data.ext.nativo.filtering.adFilterIds).to.include('12345')
    expect(request2.data.ext.nativo.filtering.advertiserFilterIds).to.include('1')
    expect(request2.data.ext.nativo.filtering.campaignFilterIds).to.include('234')
  })
})

describe('Prebid Video', function () {
  it('should handle video bid requests', function () {
    const videoBidRequest = {
      bidder: 'nativo',
      params: {
        video: {
          mimes: ['video/mp4'],
          protocols: [2, 3, 5, 6],
          playbackmethod: [1, 2],
          skip: 1,
          skipafter: 5,
        },
      },
    }

    const isValid = spec.isBidRequestValid(videoBidRequest)
    expect(isValid).to.be.true
  })
})

describe('Prebid Native', function () {
  it('should handle native bid requests', function () {
    const nativeBidRequest = {
      bidder: 'nativo',
      params: {
        native: {
          title: {
            required: true,
            len: 80,
          },
          image: {
            required: true,
            sizes: [150, 50],
          },
          sponsoredBy: {
            required: true,
          },
          clickUrl: {
            required: true,
          },
          privacyLink: {
            required: false,
          },
          body: {
            required: true,
          },
          icon: {
            required: true,
            sizes: [50, 50],
          },
        },
      },
    }

    const isValid = spec.isBidRequestValid(nativeBidRequest)
    expect(isValid).to.be.true
  })
})
