import { expect } from 'chai'
import { spec } from 'modules/nativoBidAdapter.js'
// import { newBidder } from 'src/adapters/bidderFactory.js'
// import * as bidderFactory from 'src/adapters/bidderFactory.js'
// import { deepClone } from 'src/utils.js'
// import { config } from 'src/config.js'

describe('nativoBidAdapterTests', function () {
  describe('isBidRequestValid', function () {
    let bid = {
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
    }

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true)
    })

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid)
      delete bid.adUnitCode
      bid.adUnitCode = 0
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

    it('should contain a valid selector', function () {
      const request = spec.buildRequests(bidRequests)
      const payload = JSON.parse(request.data)

      expect(payload.selector).to.exist
      expect(payload.selector).to.be.a('string')
      expect(payload.selector).to.not.have.lengthOf(0)
    })
  })
})

describe('interpretResponse', function () {
  let response = {
    id: '1F254428-AB11-4D5E-9887-567B3F952CA5',
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
      bids: [
        {
          adUnitCode: 'code',
        },
      ],
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
  const USER_SYNC_URL_IFRAME = 'http://www.testlocalbidrequest.com:3000/'
  const USER_SYNC_URL_IMAGE = 'http://www.testlocalbidrequest.com:3000/'

  it('Returns empty array if no supported user syncs', function () {
    let userSync = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false });
    expect(userSync).to.be.an('array').with.lengthOf(0);
  });

  it('Returns valid iframe user sync', function () {
    let userSync = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false });
    expect(userSync).to.be.an('array').with.lengthOf(1);
    expect(userSync[0].type).to.exist;
    expect(userSync[0].url).to.exist;
    expect(userSync[0].type).to.be.equal('iframe');
    expect(userSync[0].url).to.be.equal(USER_SYNC_URL_IFRAME);
  });

  it('Returns valid URL and type', function () {
    let userSync = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true });
    expect(userSync).to.be.an('array').with.lengthOf(1);
    expect(userSync[0].type).to.exist;
    expect(userSync[0].url).to.exist;
    expect(userSync[0].type).to.be.equal('image');
    expect(userSync[0].url).to.be.equal(USER_SYNC_URL_IMAGE);
  });
});
