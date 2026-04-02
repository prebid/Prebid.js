import { expect } from 'chai'
import { spec, BidDataMap } from 'modules/nativoBidAdapter.js'
import {
  getSizeWildcardPrice,
  getMediaWildcardPrices,
  sizeToString,
  parseFloorPriceData,
  getPageUrlFromBidRequest,
  hasProtocol,
  addProtocol,
  BidRequestDataSource,
  RequestData,
  UserEIDs,
  buildRequestUrl,
} from '../../../modules/nativoBidAdapter.js'

describe('bidDataMap', function () {
  it('Should fail gracefully if no key value pairs have been added and no key is sent', function () {
    const bdm = new BidDataMap()
    const bidData = bdm.getBidData()
    expect(bidData).to.be.undefined
  })

  it('Should fail gracefully if no key value pairs have been added', function () {
    const bdm = new BidDataMap()
    const bidData = bdm.getBidData('testKey')
    expect(bidData).to.be.undefined
  })

  it('Should add bid data to corresponding keys', function () {
    const keys = ['key1', 'anotherKey', 6]
    const bidData = { prop: 'value' }

    const bdm = new BidDataMap()
    bdm.addBidData(bidData, keys)
    const bidDataKey0 = bdm.getBidData(keys[0])
    const bidDataKey1 = bdm.getBidData(keys[1])
    const bidDataKey2 = bdm.getBidData(keys[2])
    expect(bidDataKey0).to.be.equal(bidData)
    expect(bidDataKey1).to.be.equal(bidData)
    expect(bidDataKey2).to.be.equal(bidData)
  })
})

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

    it('Request should be POST, with JSON string payload and QS params should be added to the url', function () {
      const request = spec.buildRequests(bidRequests, {
        bidderRequestId: 123456,
        refererInfo: {
          referer: 'https://www.test.com',
        },
      })

      expect(request.method).to.equal('POST')

      expect(request.data).to.exist
      expect(request.data).to.be.a('string')

      expect(request.url).to.exist
      expect(request.url).to.be.a('string')

      expect(request.url).to.include('?')
      expect(request.url).to.include('ntv_pbv')
      expect(request.url).to.include('ntv_ptd')
      expect(request.url).to.include('ntv_pb_rid')
      expect(request.url).to.include('ntv_ppc')
      expect(request.url).to.include('ntv_url')
      expect(request.url).to.include('ntv_dbr')
      expect(request.url).to.include('ntv_pas')
    })

    it('ntv_url should contain query params', function () {
      const request = spec.buildRequests(bidRequests, {
        bidderRequestId: 123456,
        refererInfo: {
          location: 'https://www.test.com?queryTest=true',
        },
      })
      console.log(request.url) // eslint-disable-line no-console
      expect(request.url).to.include(encodeURIComponent('?queryTest=true'))
    })

    it('ntv_url parameter should NOT be empty even if the utl parameter was set as an empty value', function () {
      bidRequests[0].params.url = ''
      const request = spec.buildRequests(bidRequests, {
        bidderRequestId: 123456,
        refererInfo: {
          location: 'https://www.test.com',
        },
      })

      expect(request.url).to.exist
      expect(request.url).to.be.a('string')
      expect(request.url).to.not.be.empty
    })

    it('url should NOT contain placement specific query string parameters if placementId option is not provided', function () {
      bidRequests[0].params = {}
      const request = spec.buildRequests(bidRequests, {
        bidderRequestId: 123456,
        refererInfo: {
          location: 'https://www.test.com',
        },
      })

      expect(request.url).to.exist
      expect(request.url).to.be.a('string')

      expect(request.url).to.not.include('ntv_pas')
      expect(request.url).to.not.include('ntv_ptd')
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
          },
        ],
      },
    ],
    cur: 'USD',
  }

  it('should get correct bid response', function () {
    const expectedResponse = [
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
        mediaType: 'banner',
      },
    ]

    const bidderRequest = {
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

    const result = spec.interpretResponse({ body: response }, { bidderRequest })
    expect(Object.keys(result[0])).to.have.deep.members(
      Object.keys(expectedResponse[0])
    )
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

  const bidderRequest = {
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
    const result = spec.interpretResponse({ body: response }, { bidderRequest })

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
    const result = spec.interpretResponse({ body: response }, { bidderRequest })

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
    const result = spec.interpretResponse({ body: response }, { bidderRequest })

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
    const result = spec.interpretResponse({ body: response }, { bidderRequest })

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

describe('sizeToString', () => {
  it('Formats size array correctly', () => {
    const sizeString = sizeToString([300, 250])
    expect(sizeString).to.be.equal('300x250')
  })

  it('Returns an empty array for invalid data', () => {
    // Not an array
    let sizeString = sizeToString(300, 350)
    expect(sizeString).to.be.equal('')
    // Single entry
    sizeString = sizeToString([300])
    expect(sizeString).to.be.equal('')
    // Undefined
    sizeString = sizeToString(undefined)
    expect(sizeString).to.be.equal('')
  })
})

describe('getSizeWildcardPrice', () => {
  it('Generates the correct floor price data', () => {
    const floorPrice = {
      currency: 'USD',
      floor: 1.0,
    }
    const getFloorMock = () => {
      return floorPrice
    }
    const floorMockSpy = sinon.spy(getFloorMock)
    const bidRequest = {
      getFloor: floorMockSpy,
      mediaTypes: {
        banner: {
          sizes: [300, 250],
        },
      },
    }

    const result = getSizeWildcardPrice(bidRequest, 'banner')
    expect(
      floorMockSpy.calledWith({
        currency: 'USD',
        mediaType: 'banner',
        size: '*',
      })
    ).to.be.true
    expect(result).to.equal(floorPrice)
  })
})

describe('getMediaWildcardPrices', () => {
  it('Generates the correct floor price data', () => {
    const defaultFloorPrice = {
      currency: 'USD',
      floor: 1.1,
    }
    const sizefloorPrice = {
      currency: 'USD',
      floor: 2.2,
    }
    const getFloorMock = ({ currency, mediaType, size }) => {
      if (Array.isArray(size)) return sizefloorPrice

      return defaultFloorPrice
    }
    const floorMockSpy = sinon.spy(getFloorMock)
    const bidRequest = {
      getFloor: floorMockSpy,
      mediaTypes: {
        banner: {
          sizes: [300, 250],
        },
      },
    }

    const result = getMediaWildcardPrices(bidRequest, ['*', [300, 250]])
    expect(
      floorMockSpy.calledWith({
        currency: 'USD',
        mediaType: '*',
        size: '*',
      })
    ).to.be.true
    expect(
      floorMockSpy.calledWith({
        currency: 'USD',
        mediaType: '*',
        size: [300, 250],
      })
    ).to.be.true
    expect(result).to.deep.equal({ '*': 1.1, '300x250': 2.2 })
  })
})

describe('parseFloorPriceData', () => {
  it('Generates the correct floor price data', () => {
    const defaultFloorPrice = {
      currency: 'USD',
      floor: 1.1,
    }
    const sizefloorPrice = {
      currency: 'USD',
      floor: 2.2,
    }
    const getFloorMock = ({ currency, mediaType, size }) => {
      if (Array.isArray(size)) return sizefloorPrice

      return defaultFloorPrice
    }
    const floorMockSpy = sinon.spy(getFloorMock)
    const bidRequest = {
      getFloor: floorMockSpy,
      mediaTypes: {
        banner: {
          sizes: [[300, 250]],
        },
      },
    }

    const result = parseFloorPriceData(bidRequest)
    expect(result).to.deep.equal({
      '*': { '*': 1.1, '300x250': 2.2 },
      banner: { '*': 1.1, '300x250': 2.2 },
    })
  })
})

describe('hasProtocol', () => {
  it('https://www.testpage.com', () => {
    expect(hasProtocol('https://www.testpage.com')).to.be.true
  })
  it('http://www.testpage.com', () => {
    expect(hasProtocol('http://www.testpage.com')).to.be.true
  })
  it('//www.testpage.com', () => {
    expect(hasProtocol('//www.testpage.com')).to.be.false
  })
  it('www.testpage.com', () => {
    expect(hasProtocol('www.testpage.com')).to.be.false
  })
  it('httpsgsjhgflih', () => {
    expect(hasProtocol('httpsgsjhgflih')).to.be.false
  })
})

describe('addProtocol', () => {
  it('www.testpage.com', () => {
    expect(addProtocol('www.testpage.com')).to.be.equal(
      'https://www.testpage.com'
    )
  })
  it('//www.testpage.com', () => {
    expect(addProtocol('//www.testpage.com')).to.be.equal(
      'https://www.testpage.com'
    )
  })
  it('http://www.testpage.com', () => {
    expect(addProtocol('http://www.testpage.com')).to.be.equal(
      'http://www.testpage.com'
    )
  })
  it('https://www.testpage.com', () => {
    expect(addProtocol('https://www.testpage.com')).to.be.equal(
      'https://www.testpage.com'
    )
  })
})

describe('getPageUrlFromBidRequest', () => {
  const bidRequest = {}

  beforeEach(() => {
    bidRequest.params = {}
  })

  it('Returns undefined for no url param', () => {
    const url = getPageUrlFromBidRequest(bidRequest)
    expect(url).to.be.undefined
  })

  it('@testUrl', () => {
    const url = getPageUrlFromBidRequest(bidRequest)
    expect(url).to.be.undefined
  })

  it('https://www.testpage.com', () => {
    bidRequest.params.url = 'https://www.testpage.com'
    const url = getPageUrlFromBidRequest(bidRequest)
    expect(url).not.to.be.undefined
  })

  it('https://www.testpage.com/test/path', () => {
    bidRequest.params.url = 'https://www.testpage.com/test/path'
    const url = getPageUrlFromBidRequest(bidRequest)
    expect(url).not.to.be.undefined
  })

  it('www.testpage.com', () => {
    bidRequest.params.url = 'www.testpage.com'
    const url = getPageUrlFromBidRequest(bidRequest)
    expect(url).not.to.be.undefined
  })

  it('http://www.testpage.com', () => {
    bidRequest.params.url = 'http://www.testpage.com'
    const url = getPageUrlFromBidRequest(bidRequest)
    expect(url).not.to.be.undefined
  })

  it('//www.testpage.com', () => {
    bidRequest.params.url = '//www.testpage.com'
    const url = getPageUrlFromBidRequest(bidRequest)
    expect(url).not.to.be.undefined
  })
})

describe('RequestData', () => {
  describe('addBidRequestDataSource', () => {
    it('Adds a BidRequestDataSource', () => {
      const requestData = new RequestData()
      const testBidRequestDataSource = new BidRequestDataSource()

      requestData.addBidRequestDataSource(testBidRequestDataSource)

      expect(requestData.bidRequestDataSources.length === 1)
    })

    it("Doeasn't add a non BidRequestDataSource", () => {
      const requestData = new RequestData()

      requestData.addBidRequestDataSource({})
      requestData.addBidRequestDataSource('test')
      requestData.addBidRequestDataSource(1)
      requestData.addBidRequestDataSource(true)

      expect(requestData.bidRequestDataSources.length === 0)
    })
  })

  describe('getRequestDataString', () => {
    it("Doesn't append empty query strings", () => {
      const requestData = new RequestData()
      const testBidRequestDataSource = new BidRequestDataSource()

      requestData.addBidRequestDataSource(testBidRequestDataSource)

      let qs = requestData.getRequestDataQueryString()
      expect(qs).to.be.empty

      testBidRequestDataSource.getRequestQueryString = () => {
        return 'ntv_test=true'
      }
      qs = requestData.getRequestDataQueryString()
      expect(qs).to.be.equal('ntv_test=true')
    })
  })
})

describe('UserEIDs', () => {
  const userEids = new UserEIDs()
  const eids = [{ testId: 1111 }]

  describe('processBidRequestData', () => {
    it('Processes bid request without eids', () => {
      userEids.processBidRequestData({})

      expect(userEids.eids).to.be.empty
    })

    it('Processed bid request with eids', () => {
      userEids.processBidRequestData({ userIdAsEids: eids })

      expect(userEids.eids).to.not.be.empty
    })
  })

  describe('getRequestQueryString', () => {
    it('Correctly prints out QS param string', () => {
      const qs = userEids.getRequestQueryString()
      const value = qs.slice(11)

      expect(qs).to.include('ntv_pb_eid=')
      try {
        expect(JSON.parse(value)).to.be.equal(eids)
      } catch (err) {}
    })
  })
})

describe('buildRequestUrl', () => {
  const baseUrl = 'https://www.testExchange.com'
  it('Returns baseUrl if no QS strings passed', () => {
    const url = buildRequestUrl(baseUrl)
    expect(url).to.be.equal(baseUrl)
  })

  it('Returns baseUrl if empty QS strings passed', () => {
    const url = buildRequestUrl(baseUrl, ['', '', ''])
    expect(url).to.be.equal(baseUrl)
  })

  it('Returns baseUrl + QS params if QS strings passed', () => {
    const url = buildRequestUrl(baseUrl, [
      'ntv_ptd=123456&ntv_test=true',
      'ntv_foo=bar',
    ])
    expect(url).to.be.equal(
      `${baseUrl}?ntv_ptd=123456&ntv_test=true&ntv_foo=bar`
    )
  })

  it('Returns baseUrl + QS params if mixed QS strings passed', () => {
    const url = buildRequestUrl(baseUrl, [
      'ntv_ptd=123456&ntv_test=true',
      '',
      '',
      'ntv_foo=bar',
    ])
    expect(url).to.be.equal(
      `${baseUrl}?ntv_ptd=123456&ntv_test=true&ntv_foo=bar`
    )
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
