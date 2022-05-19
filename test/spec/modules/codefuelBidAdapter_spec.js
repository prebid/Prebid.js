import {expect} from 'chai';
import {spec} from 'modules/codefuelBidAdapter.js';
import {config} from 'src/config.js';
import {server} from 'test/mocks/xhr';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/92.0.4515.159 Safari/537.36';
const DEFAULT_USER_AGENT = window.navigator.userAgent;
const setUADefault = () => { window.navigator.__defineGetter__('userAgent', function () { return DEFAULT_USER_AGENT }) };
const setUAMock = () => { window.navigator.__defineGetter__('userAgent', function () { return USER_AGENT }) };

describe('Codefuel Adapter', function () {
  describe('Bid request and response', function () {
    const commonBidRequest = {
      bidder: 'codefuel',
      params: {
        publisher: {
          id: 'publisher-id'
        },
      },
      bidId: '2d6815a92ba1ba',
      auctionId: '12043683-3254-4f74-8934-f941b085579e',
    }
    const nativeBidRequestParams = {
      nativeParams: {
        image: {
          required: true,
          sizes: [
            120,
            100
          ],
          sendId: true
        },
        title: {
          required: true,
          sendId: true
        },
        sponsoredBy: {
          required: false
        }
      },
    }

    const displayBidRequestParams = {
      sizes: [
        [
          300,
          250
        ]
      ]
    }

    describe('isBidRequestValid', function () {
      before(() => {
        config.setConfig({
          codefuel: {
            bidderUrl: 'https://bidder-url.com',
          }
        }
        )
      })
      after(() => {
        config.resetConfig()
      })

      it('should fail when bid is invalid', function () {
        const bid = {
          bidder: 'codefuel',
          params: {
            publisher: {
              id: 'publisher-id',
            }
          },
        }
        expect(spec.isBidRequestValid(bid)).to.equal(false)
      })
      it('should not succeed when bid contains native params', function () {
        const bid = {
          bidder: 'codefuel',
          params: {
            publisher: {
              id: 'publisher-id',
            }
          },
          ...nativeBidRequestParams,
        }
        expect(spec.isBidRequestValid(bid)).to.equal(false)
      })
      it('should not succeed when bid contains only sizes', function () {
        const bid = {
          bidder: 'codefuel',
          params: {
            publisher: {
              id: 'publisher-id',
            }
          },
          ...displayBidRequestParams,
        }
        expect(spec.isBidRequestValid(bid)).to.equal(false)
      })
      it('should fail if publisher id is not set', function () {
        const bid = {
          bidder: 'codefuel',
          ...nativeBidRequestParams,
        }
        expect(spec.isBidRequestValid(bid)).to.equal(false)
      })

      it('should fail if bidder url is not set', function () {
        const bid = {
          bidder: 'codefuel',
          params: {
            publisher: {
              id: 'publisher-id',
            }
          },
          ...nativeBidRequestParams,
        }
        config.resetConfig()
        expect(spec.isBidRequestValid(bid)).to.equal(false)
      })
    })

    describe('buildRequests', function () {
      before(() => {
        setUAMock()
        config.setConfig({
          codefuel: {
            bidderUrl: 'https://bidder-url.com',
          }
        }
        )
      })
      after(() => {
        config.resetConfig()
        setUADefault()
      })

      const commonBidderRequest = {
        timeout: 500,
        auctionId: '12043683-3254-4f74-8934-f941b085579e',
        refererInfo: {
          referer: 'https://example.com/',
        }
      }

      it('should build display request', function () {
        const bidRequest = {
          ...commonBidRequest,
          ...displayBidRequestParams,
        }
        const expectedData = {
          cur: [
            'USD'
          ],
          device: {
            devicetype: 2,
            ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/92.0.4515.159 Safari/537.36'
          },
          id: '12043683-3254-4f74-8934-f941b085579e',
          imp: [
            {
              banner: {
                format: [
                  {
                    h: 250,
                    w: 300
                  }
                ]
              },
              id: '1'
            }
          ],
          site: {
            domain: 'example.com',
            page: 'https://example.com/',
            publisher: {
              id: 'publisher-id'
            }
          },
          source: {
            fd: 1
          },
          tmax: 500
        }
        const res = spec.buildRequests([bidRequest], commonBidderRequest)
        expect(res.url).to.equal('https://ai-p-codefuel-ds-rtb-us-east-1-k8s.seccint.com/prebid')
        expect(res.data).to.deep.equal(expectedData)
      })

      it('should pass bidder timeout', function () {
        const bidRequest = {
          ...commonBidRequest,
        }
        const bidderRequest = {
          ...commonBidderRequest,
          timeout: 500
        }
        const res = spec.buildRequests([bidRequest], bidderRequest)
        const resData = res.data
        expect(resData.tmax).to.equal(500)
      });
    })

    describe('interpretResponse', function () {
      it('should return empty array if no valid bids', function () {
        const res = spec.interpretResponse({}, [])
        expect(res).to.be.an('array').that.is.empty
      });

      it('should interpret display response', function () {
        const serverResponse = {
          body: {
            id: '6b2eedc8-8ff5-46ef-adcf-e701b508943e',
            seatbid: [
              {
                bid: [
                  {
                    id: 'd90fe7fa-28d7-11eb-8ce4-462a842a7cf9',
                    impid: '1',
                    price: 1.1,
                    nurl: 'http://example.com/win/${AUCTION_PRICE}',
                    adm: '<div>ad</div>',
                    adomain: [
                      'example.com'
                    ],
                    cid: '3865084',
                    crid: '29998660',
                    cat: [
                      'IAB10-2'
                    ],
                    w: 300,
                    h: 250
                  }
                ],
                seat: 'acc-6536'
              }
            ],
            bidid: 'd90fe7fa-28d7-11eb-8ce4-13d94bfa26f9',
            cur: 'USD'
          }
        }
        const request = {
          bids: [
            {
              ...commonBidRequest,
              ...displayBidRequestParams
            }
          ]
        }
        const expectedRes = [
          {
            requestId: request.bids[0].bidId,
            cpm: 1.1,
            creativeId: '29998660',
            ttl: 360,
            netRevenue: true,
            currency: 'USD',
            mediaType: 'banner',
            ad: '<div>ad</div>',
            width: 300,
            height: 250,
            meta: {'advertiserDomains': []}
          }
        ]

        const res = spec.interpretResponse(serverResponse, request)
        expect(res).to.deep.equal(expectedRes)
      });
    })
  })

  describe('getUserSyncs', function () {
    const usersyncUrl = 'https://usersync-url.com';
    beforeEach(() => {
      config.setConfig({
        codefuel: {
          usersyncUrl: usersyncUrl,
        }
      }
      )
    })
    after(() => {
      config.resetConfig()
    })

    it('should not return user sync if pixel enabled with codefuel config', function () {
      const ret = spec.getUserSyncs({pixelEnabled: true})
      expect(ret).to.be.an('array').that.is.empty
    })

    it('should not return user sync if pixel disabled', function () {
      const ret = spec.getUserSyncs({pixelEnabled: false})
      expect(ret).to.be.an('array').that.is.empty
    })

    it('should not return user sync if url is not set', function () {
      config.resetConfig()
      const ret = spec.getUserSyncs({pixelEnabled: true})
      expect(ret).to.be.an('array').that.is.empty
    })

    it('should not pass GDPR consent', function() {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {gdprApplies: true, consentString: 'foo'}, undefined)).to.to.be.an('array').that.is.empty
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {gdprApplies: false, consentString: 'foo'}, undefined)).to.be.an('array').that.is.empty
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {gdprApplies: true, consentString: undefined}, undefined)).to.be.an('array').that.is.empty
    });

    it('should not pass US consent', function() {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, undefined, '1NYN')).to.be.an('array').that.is.empty
    });

    it('should pass GDPR and US consent', function() {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {gdprApplies: true, consentString: 'foo'}, '1NYN')).to.be.an('array').that.is.empty
    });
  })
})
