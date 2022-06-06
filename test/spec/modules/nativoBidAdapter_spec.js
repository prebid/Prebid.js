import { expect } from 'chai'
import { spec } from 'modules/nativoBidAdapter.js'

describe('nativoBidAdapterTests', function () {
  describe('isBidRequestValid', function () {
    let bid = {
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

    it('should return true for valid placementId value', function () {
      bid.params = {
        url: 'www.test.com',
      }
      expect(spec.isBidRequestValid(bid)).to.equal(true)
    })

    it('should return false for invalid placementId value', function () {
      bid.params = {
        url: 4567890,
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })
  })

  describe('buildRequests', function () {
    let bidRequests = [
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
      },
    ]

    it('url should contain query string parameters', function () {
      const request = spec.buildRequests(bidRequests, {
        bidderRequestId: 123456,
        refererInfo: {
          referer: 'https://www.test.com',
        },
      })

      expect(request.url).to.exist
      expect(request.url).to.be.a('string')

      expect(request.url).to.include('?')
      expect(request.url).to.include('ntv_ptd')
      expect(request.url).to.include('ntv_pb_rid')
      expect(request.url).to.include('ntv_ppc')
      expect(request.url).to.include('ntv_url')
      expect(request.url).to.include('ntv_dbr')
    })
  })
})

describe('interpretResponse', function () {
  let response = {
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
          },
        ],
      },
    ],
    cur: 'USD',
  }

  it('should get correct bid response', function () {
    let expectedResponse = [
      {
        requestId: '1F254428-AB11-4D5E-9887-567B3F952CA5',
        cpm: 3.569,
        currency: 'USD',
        width: 300,
        height: 250,
        creativeId: '1060_72_6760217',
        dealId: 'f70362ac-f3cf-4225-82a5-948b690927a6',
        netRevenue: true,
        ttl: 360,
        ad: '<creative>',
        meta: {
          advertiserDomains: ['test.com'],
        },
      },
    ]

    let bidderRequest = {
      id: 123456,
      bids: [
        {
          params: {
            placementId: 1,
          },
        },
      ],
    }

    // mock
    spec.getAdUnitData = () => {
      return {
        bidId: 123456,
        sizes: [300, 250],
      }
    }

    let result = spec.interpretResponse({ body: response }, { bidderRequest })
    expect(Object.keys(result[0])).to.have.deep.members(
      Object.keys(expectedResponse[0])
    )
  })

  it('handles nobid responses', function () {
    let response = {}
    let bidderRequest

    let result = spec.interpretResponse({ body: response }, { bidderRequest })
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
    let userSync = spec.getUserSyncs(
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
    let userSync = spec.getUserSyncs(
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
    let userSync = spec.getUserSyncs(
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

describe('getAdUnitData', () => {
  afterEach(() => {
    if (window.bidRequestMap) delete window.bidRequestMap
  })

  it('Matches placementId value', () => {
    const adUnitData = {
      bidId: 123456,
      sizes: [300, 250],
    }

    window.bidRequestMap = {
      9876543: {
        12345: adUnitData,
      },
    }

    const data = spec.getAdUnitData(9876543, { impid: 12345 })
    expect(Object.keys(data)).to.have.deep.members(Object.keys(adUnitData))
  })

  it('Falls back to ad unit code value', () => {
    const adUnitData = {
      bidId: 123456,
      sizes: [300, 250],
    }

    window.bidRequestMap = {
      9876543: {
        '#test-code': adUnitData,
      },
    }

    const data = spec.getAdUnitData(9876543, {
      impid: 12345,
      ext: { ad_unit_code: '#test-code' },
    })
    expect(Object.keys(data)).to.have.deep.members(Object.keys(adUnitData))
  })
})

describe('Response to Request Filter Flow', () => {
  let bidRequests = [
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
              impid: '1',
              price: 3.569,
              adm: '<creative>',
              h: 300,
              w: 250,
              cat: [],
              adomain: ['test.com'],
              crid: '1060_72_6760217',
            },
          ],
        },
      ],
      cur: 'USD',
    }
  })

  let bidderRequest = {
    id: 123456,
    bids: [
      {
        params: {
          placementId: 1,
        },
      },
    ],
  }

  // mock
  spec.getAdUnitData = () => {
    return {
      bidId: 123456,
      size: [300, 250],
    }
  }

  it('Appends NO filter based on previous response', () => {
    // Getting the mock response
    let result = spec.interpretResponse({ body: response }, { bidderRequest })

    // Winning the bid
    spec.onBidWon(result[0])

    // Making another request
    const request = spec.buildRequests(bidRequests, {
      bidderRequestId: 123456,
      refererInfo: {
        referer: 'https://www.test.com',
      },
    })
    expect(request.url).to.not.include('ntv_aft')
    expect(request.url).to.not.include('ntv_avtf')
    expect(request.url).to.not.include('ntv_ctf')
  })

  it('Appends Ads filter based on previous response', () => {
    response.seatbid[0].bid[0].ext = { adsToFilter: ['12345'] }

    // Getting the mock response
    let result = spec.interpretResponse({ body: response }, { bidderRequest })

    // Winning the bid
    spec.onBidWon(result[0])

    // Making another request
    const request = spec.buildRequests(bidRequests, {
      bidderRequestId: 123456,
      refererInfo: {
        referer: 'https://www.test.com',
      },
    })
    expect(request.url).to.include(`ntv_atf=12345`)
    expect(request.url).to.not.include('ntv_avtf')
    expect(request.url).to.not.include('ntv_ctf')
  })

  it('Appends Advertiser filter based on previous response', () => {
    response.seatbid[0].bid[0].ext = { advertisersToFilter: ['1'] }

    // Getting the mock response
    let result = spec.interpretResponse({ body: response }, { bidderRequest })

    // Winning the bid
    spec.onBidWon(result[0])

    // Making another request
    const request = spec.buildRequests(bidRequests, {
      bidderRequestId: 123456,
      refererInfo: {
        referer: 'https://www.test.com',
      },
    })
    expect(request.url).to.include(`ntv_atf=12345`)
    expect(request.url).to.include('ntv_avtf=1')
    expect(request.url).to.not.include('ntv_ctf')
  })

  it('Appends Campaign filter based on previous response', () => {
    response.seatbid[0].bid[0].ext = { campaignsToFilter: ['234'] }

    // Getting the mock response
    let result = spec.interpretResponse({ body: response }, { bidderRequest })

    // Winning the bid
    spec.onBidWon(result[0])

    // Making another request
    const request = spec.buildRequests(bidRequests, {
      bidderRequestId: 123456,
      refererInfo: {
        referer: 'https://www.test.com',
      },
    })
    expect(request.url).to.include(`ntv_atf=12345`)
    expect(request.url).to.include('ntv_avtf=1')
    expect(request.url).to.include('ntv_ctf=234')
  })
})
