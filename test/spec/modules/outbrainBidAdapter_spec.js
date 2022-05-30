import {expect} from 'chai';
import {spec} from 'modules/outbrainBidAdapter.js';
import {config} from 'src/config.js';
import {server} from 'test/mocks/xhr';
import { createEidsArray } from 'modules/userId/eids.js';

describe('Outbrain Adapter', function () {
  describe('Bid request and response', function () {
    const commonBidRequest = {
      bidder: 'outbrain',
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
          outbrain: {
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
          bidder: 'outbrain',
          params: {
            publisher: {
              id: 'publisher-id',
            }
          },
        }
        expect(spec.isBidRequestValid(bid)).to.equal(false)
      })
      it('should succeed when bid contains native params', function () {
        const bid = {
          bidder: 'outbrain',
          params: {
            publisher: {
              id: 'publisher-id',
            }
          },
          ...nativeBidRequestParams,
        }
        expect(spec.isBidRequestValid(bid)).to.equal(true)
      })
      it('should succeed when bid contains sizes', function () {
        const bid = {
          bidder: 'outbrain',
          params: {
            publisher: {
              id: 'publisher-id',
            }
          },
          ...displayBidRequestParams,
        }
        expect(spec.isBidRequestValid(bid)).to.equal(true)
      })
      it('should fail if publisher id is not set', function () {
        const bid = {
          bidder: 'outbrain',
          ...nativeBidRequestParams,
        }
        expect(spec.isBidRequestValid(bid)).to.equal(false)
      })
      it('should fail if tag id is not string', function () {
        const bid = {
          bidder: 'outbrain',
          params: {
            tagid: 123
          },
          ...nativeBidRequestParams,
        }
        expect(spec.isBidRequestValid(bid)).to.equal(false)
      })
      it('should fail if badv does not include strings', function () {
        const bid = {
          bidder: 'outbrain',
          params: {
            tagid: 123,
            badv: ['a', 2, 'c']
          },
          ...nativeBidRequestParams,
        }
        expect(spec.isBidRequestValid(bid)).to.equal(false)
      })
      it('should fail if bcat does not include strings', function () {
        const bid = {
          bidder: 'outbrain',
          params: {
            tagid: 123,
            bcat: ['a', 2, 'c']
          },
          ...nativeBidRequestParams,
        }
        expect(spec.isBidRequestValid(bid)).to.equal(false)
      })
      it('should succeed with outbrain config', function () {
        const bid = {
          bidder: 'outbrain',
          params: {
            publisher: {
              id: 'publisher-id',
            }
          },
          ...nativeBidRequestParams,
        }
        config.resetConfig()
        config.setConfig({
          outbrain: {
            bidderUrl: 'https://bidder-url.com',
          }
        })
        expect(spec.isBidRequestValid(bid)).to.equal(true)
      })
      it('should fail if bidder url is not set', function () {
        const bid = {
          bidder: 'outbrain',
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
        config.setConfig({
          outbrain: {
            bidderUrl: 'https://bidder-url.com',
          }
        }
        )
      })
      after(() => {
        config.resetConfig()
      })

      const commonBidderRequest = {
        refererInfo: {
          referer: 'https://example.com/'
        }
      }

      it('should build native request', function () {
        const bidRequest = {
          ...commonBidRequest,
          ...nativeBidRequestParams,
        }
        const expectedNativeAssets = {
          assets: [
            {
              required: 1,
              id: 3,
              img: {
                type: 3,
                w: 120,
                h: 100
              }
            },
            {
              required: 1,
              id: 0,
              title: {}
            },
            {
              required: 0,
              id: 5,
              data: {
                type: 1
              }
            }
          ]
        }
        const expectedData = {
          site: {
            page: 'https://example.com/',
            publisher: {
              id: 'publisher-id'
            }
          },
          device: {
            ua: navigator.userAgent
          },
          source: {
            fd: 1
          },
          cur: [
            'USD'
          ],
          imp: [
            {
              id: '1',
              native: {
                request: JSON.stringify(expectedNativeAssets)
              }
            }
          ],
          ext: {
            prebid: {
              channel: {
                name: 'pbjs', version: '$prebid.version$'
              }
            }
          }
        }
        const res = spec.buildRequests([bidRequest], commonBidderRequest)
        expect(res.url).to.equal('https://bidder-url.com')
        expect(res.data).to.deep.equal(JSON.stringify(expectedData))
      });

      it('should build display request', function () {
        const bidRequest = {
          ...commonBidRequest,
          ...displayBidRequestParams,
        }
        const expectedData = {
          site: {
            page: 'https://example.com/',
            publisher: {
              id: 'publisher-id'
            }
          },
          device: {
            ua: navigator.userAgent
          },
          source: {
            fd: 1
          },
          cur: [
            'USD'
          ],
          imp: [
            {
              id: '1',
              banner: {
                format: [
                  {
                    w: 300,
                    h: 250
                  }
                ]
              }
            }
          ],
          ext: {
            prebid: {
              channel: {
                name: 'pbjs', version: '$prebid.version$'
              }
            }
          }
        }
        const res = spec.buildRequests([bidRequest], commonBidderRequest)
        expect(res.url).to.equal('https://bidder-url.com')
        expect(res.data).to.deep.equal(JSON.stringify(expectedData))
      })

      it('should pass optional parameters in request', function () {
        const bidRequest = {
          ...commonBidRequest,
          ...nativeBidRequestParams,
        }
        bidRequest.params.tagid = 'test-tag'
        bidRequest.params.publisher.name = 'test-publisher'
        bidRequest.params.publisher.domain = 'test-publisher.com'
        bidRequest.params.bcat = ['bad-category']
        bidRequest.params.badv = ['bad-advertiser']

        const res = spec.buildRequests([bidRequest], commonBidderRequest)
        const resData = JSON.parse(res.data)
        expect(resData.imp[0].tagid).to.equal('test-tag')
        expect(resData.site.publisher.name).to.equal('test-publisher')
        expect(resData.site.publisher.domain).to.equal('test-publisher.com')
        expect(resData.bcat).to.deep.equal(['bad-category'])
        expect(resData.badv).to.deep.equal(['bad-advertiser'])
      });

      it('should pass bidder timeout', function () {
        const bidRequest = {
          ...commonBidRequest,
          ...nativeBidRequestParams,
        }
        const bidderRequest = {
          ...commonBidderRequest,
          timeout: 500
        }
        const res = spec.buildRequests([bidRequest], bidderRequest)
        const resData = JSON.parse(res.data)
        expect(resData.tmax).to.equal(500)
      });

      it('should pass GDPR consent', function () {
        const bidRequest = {
          ...commonBidRequest,
          ...nativeBidRequestParams,
        }
        const bidderRequest = {
          ...commonBidderRequest,
          gdprConsent: {
            gdprApplies: true,
            consentString: 'consentString',
          }
        }
        const res = spec.buildRequests([bidRequest], bidderRequest)
        const resData = JSON.parse(res.data)
        expect(resData.user.ext.consent).to.equal('consentString')
        expect(resData.regs.ext.gdpr).to.equal(1)
      });

      it('should pass us privacy consent', function () {
        const bidRequest = {
          ...commonBidRequest,
          ...nativeBidRequestParams,
        }
        const bidderRequest = {
          ...commonBidderRequest,
          uspConsent: 'consentString'
        }
        const res = spec.buildRequests([bidRequest], bidderRequest)
        const resData = JSON.parse(res.data)
        expect(resData.regs.ext.us_privacy).to.equal('consentString')
      });

      it('should pass coppa consent', function () {
        const bidRequest = {
          ...commonBidRequest,
          ...nativeBidRequestParams,
        }
        config.setConfig({coppa: true})

        const res = spec.buildRequests([bidRequest], commonBidderRequest)
        const resData = JSON.parse(res.data)
        expect(resData.regs.coppa).to.equal(1)

        config.resetConfig()
      });

      it('should pass extended ids', function () {
        let bidRequest = {
          bidId: 'bidId',
          params: {},
          userIdAsEids: createEidsArray({
            idl_env: 'id-value',
          }),
          ...commonBidRequest,
        };

        let res = spec.buildRequests([bidRequest], commonBidderRequest);
        const resData = JSON.parse(res.data)
        expect(resData.user.ext.eids).to.deep.equal([
          {source: 'liveramp.com', uids: [{id: 'id-value', atype: 3}]}
        ]);
      });

      it('should pass bidfloor', function () {
        const bidRequest = {
          ...commonBidRequest,
          ...nativeBidRequestParams,
        }
        bidRequest.getFloor = function() {
          return {
            currency: 'USD',
            floor: 1.23,
          }
        }

        const res = spec.buildRequests([bidRequest], commonBidderRequest)
        const resData = JSON.parse(res.data)
        expect(resData.imp[0].bidfloor).to.equal(1.23)
      });

      it('should transform string sizes to numbers', function () {
        let bidRequest = {
          bidId: 'bidId',
          params: {},
          ...commonBidRequest,
          ...nativeBidRequestParams,
        };
        bidRequest.nativeParams.image.sizes = ['120', '100']

        const expectedNativeAssets = {
          assets: [
            {
              required: 1,
              id: 3,
              img: {
                type: 3,
                w: 120,
                h: 100
              }
            },
            {
              required: 1,
              id: 0,
              title: {}
            },
            {
              required: 0,
              id: 5,
              data: {
                type: 1
              }
            }
          ]
        }

        let res = spec.buildRequests([bidRequest], commonBidderRequest);
        const resData = JSON.parse(res.data)
        expect(resData.imp[0].native.request).to.equal(JSON.stringify(expectedNativeAssets));
      });
    })

    describe('interpretResponse', function () {
      it('should return empty array if no valid bids', function () {
        const res = spec.interpretResponse({}, [])
        expect(res).to.be.an('array').that.is.empty
      });

      it('should interpret native response', function () {
        const serverResponse = {
          body: {
            id: '0a73e68c-9967-4391-b01b-dda2d9fc54e4',
            seatbid: [
              {
                bid: [
                  {
                    id: '82822cf5-259c-11eb-8a52-f29e5275aa57',
                    impid: '1',
                    price: 1.1,
                    nurl: 'http://example.com/win/${AUCTION_PRICE}',
                    adm: '{"ver":"1.2","assets":[{"id":3,"required":1,"img":{"url":"http://example.com/img/url","w":120,"h":100}},{"id":0,"required":1,"title":{"text":"Test title"}},{"id":5,"data":{"value":"Test sponsor"}}],"privacy":"http://example.com/privacy","link":{"url":"http://example.com/click/url"},"eventtrackers":[{"event":1,"method":1,"url":"http://example.com/impression"}]}',
                    adomain: [
                      'example.com'
                    ],
                    cid: '3487171',
                    crid: '28023739',
                    cat: [
                      'IAB10-2'
                    ]
                  }
                ],
                seat: 'acc-5537'
              }
            ],
            bidid: '82822cf5-259c-11eb-8a52-b48e7518c657',
            cur: 'USD'
          },
        }
        const request = {
          bids: [
            {
              ...commonBidRequest,
              ...nativeBidRequestParams,
            }
          ]
        }
        const expectedRes = [
          {
            requestId: request.bids[0].bidId,
            cpm: 1.1,
            creativeId: '28023739',
            ttl: 360,
            netRevenue: false,
            currency: 'USD',
            mediaType: 'native',
            nurl: 'http://example.com/win/${AUCTION_PRICE}',
            meta: {
              'advertiserDomains': [
                'example.com'
              ]
            },
            native: {
              clickTrackers: undefined,
              clickUrl: 'http://example.com/click/url',
              image: {
                url: 'http://example.com/img/url',
                width: 120,
                height: 100
              },
              title: 'Test title',
              sponsoredBy: 'Test sponsor',
              impressionTrackers: [
                'http://example.com/impression',
              ],
              privacyLink: 'http://example.com/privacy'
            }
          }
        ]

        const res = spec.interpretResponse(serverResponse, request)
        expect(res).to.deep.equal(expectedRes)
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
            netRevenue: false,
            currency: 'USD',
            mediaType: 'banner',
            nurl: 'http://example.com/win/${AUCTION_PRICE}',
            ad: '<div>ad</div>',
            width: 300,
            height: 250,
            meta: {
              'advertiserDomains': [
                'example.com'
              ]
            },
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
        outbrain: {
          usersyncUrl: usersyncUrl,
        }
      }
      )
    })
    after(() => {
      config.resetConfig()
    })

    it('should return user sync if pixel enabled with outbrain config', function () {
      const ret = spec.getUserSyncs({pixelEnabled: true})
      expect(ret).to.deep.equal([{type: 'image', url: usersyncUrl}])
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

    it('should pass GDPR consent', function() {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {gdprApplies: true, consentString: 'foo'}, undefined)).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gdpr=1&gdpr_consent=foo`
      }]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {gdprApplies: false, consentString: 'foo'}, undefined)).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gdpr=0&gdpr_consent=foo`
      }]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {gdprApplies: true, consentString: undefined}, undefined)).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gdpr=1&gdpr_consent=`
      }]);
    });

    it('should pass US consent', function() {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, undefined, '1NYN')).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?us_privacy=1NYN`
      }]);
    });

    it('should pass GDPR and US consent', function() {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {gdprApplies: true, consentString: 'foo'}, '1NYN')).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gdpr=1&gdpr_consent=foo&us_privacy=1NYN`
      }]);
    });
  })

  describe('onBidWon', function () {
    it('should make an ajax call with the original cpm', function () {
      const bid = {
        nurl: 'http://example.com/win/${AUCTION_PRICE}',
        cpm: 2.1,
        originalCpm: 1.1,
      }
      spec.onBidWon(bid)
      expect(server.requests[0].url).to.equals('http://example.com/win/1.1')
    });
  })
})
