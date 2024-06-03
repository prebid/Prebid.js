import { expect } from 'chai';
import { spec, storage } from 'modules/outbrainBidAdapter.js';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr';

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

    const videoBidRequestParams = {
      mediaTypes: {
        video: {
          playerSize: [[640, 480]],
          mimes: ['video/mp4'],
          protocols: [1, 2, 3, 4, 5, 6, 7, 8],
          playbackmethod: [1],
          skip: 1,
          api: [2],
          minbitrate: 1000,
          maxbitrate: 3000,
          minduration: 3,
          maxduration: 10,
          startdelay: 2,
          plcmt: 4,
          placement: 5,
          linearity: 1
        }
      }
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
      it('should succeed when bid contains video', function () {
        const bid = {
          bidder: 'outbrain',
          params: {
            publisher: {
              id: 'publisher-id',
            }
          },
          ...videoBidRequestParams,
        }
        expect(spec.isBidRequestValid(bid)).to.equal(true)
      })
      it('should fail when bid contains insufficient video information', function () {
        const bid = {
          bidder: 'outbrain',
          params: {
            publisher: {
              id: 'publisher-id',
            }
          },
          mediaTypes: {
            video: {
              context: 'outstream'
            }
          },
        }
        expect(spec.isBidRequestValid(bid)).to.equal(false)
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
      let getDataFromLocalStorageStub;

      before(() => {
        getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage')
        config.setConfig({
          outbrain: {
            bidderUrl: 'https://bidder-url.com',
          }
        })
      })
      after(() => {
        getDataFromLocalStorageStub.restore()
        config.resetConfig()
      })

      const commonBidderRequest = {
        bidderRequestId: 'mock-uuid',
        refererInfo: {
          page: 'https://example.com/'
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
          id: 'mock-uuid',
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
          id: 'mock-uuid',
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

      it('should build video request', function () {
        const bidRequest = {
          ...commonBidRequest,
          ...videoBidRequestParams,
        }
        const expectedData = {
          id: 'mock-uuid',
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
              video: {
                w: 640,
                h: 480,
                protocols: [1, 2, 3, 4, 5, 6, 7, 8],
                playbackmethod: [1],
                mimes: ['video/mp4'],
                skip: 1,
                api: [2],
                minbitrate: 1000,
                maxbitrate: 3000,
                minduration: 3,
                maxduration: 10,
                startdelay: 2,
                placement: 4,
                linearity: 1
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

      it('should pass first party data', function () {
        const bidRequest = {
          ...commonBidRequest,
          ...nativeBidRequestParams,
        }
        const bidderRequest = {
          ortb2: {
            bcat: ['IAB1', 'IAB2-1'],
            badv: ['domain1.com', 'domain2.com'],
            wlang: ['en'],
          },
          ...commonBidderRequest,
        }

        const res = spec.buildRequests([bidRequest], bidderRequest)
        const resData = JSON.parse(res.data)
        expect(resData.bcat).to.deep.equal(bidderRequest.ortb2.bcat)
        expect(resData.badv).to.deep.equal(bidderRequest.ortb2.badv)
        expect(resData.wlang).to.deep.equal(bidderRequest.ortb2.wlang)
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
        config.setConfig({ coppa: true })

        const res = spec.buildRequests([bidRequest], commonBidderRequest)
        const resData = JSON.parse(res.data)
        expect(resData.regs.coppa).to.equal(1)

        config.resetConfig()
      });

      it('should pass gpp information', function () {
        const bidRequest = {
          ...commonBidRequest,
          ...nativeBidRequestParams,
        };
        const bidderRequest = {
          ...commonBidderRequest,
          'gppConsent': {
            'gppString': 'abc12345',
            'applicableSections': [8]
          }
        }

        const res = spec.buildRequests([bidRequest], bidderRequest);
        const resData = JSON.parse(res.data);

        expect(resData.regs.ext.gpp).to.exist;
        expect(resData.regs.ext.gpp_sid).to.exist;
        expect(resData.regs.ext.gpp).to.equal('abc12345');
        expect(resData.regs.ext.gpp_sid).to.deep.equal([8]);
      });

      it('should pass extended ids', function () {
        let bidRequest = {
          bidId: 'bidId',
          params: {},
          userIdAsEids: [
            { source: 'liveramp.com', uids: [{ id: 'id-value', atype: 3 }] }
          ],
          ...commonBidRequest,
        };

        let res = spec.buildRequests([bidRequest], commonBidderRequest);
        const resData = JSON.parse(res.data)
        expect(resData.user.ext.eids).to.deep.equal([
          { source: 'liveramp.com', uids: [{ id: 'id-value', atype: 3 }] }
        ]);
      });

      it('should pass OB user token', function () {
        getDataFromLocalStorageStub.returns('12345');

        let bidRequest = {
          bidId: 'bidId',
          params: {},
          ...commonBidRequest,
        };

        let res = spec.buildRequests([bidRequest], commonBidderRequest);
        const resData = JSON.parse(res.data)
        expect(resData.user.ext.obusertoken).to.equal('12345')
        expect(getDataFromLocalStorageStub.called).to.be.true;
        sinon.assert.calledWith(getDataFromLocalStorageStub, 'OB-USER-TOKEN');
      });

      it('should pass bidfloor', function () {
        const bidRequest = {
          ...commonBidRequest,
          ...nativeBidRequestParams,
        }
        bidRequest.getFloor = function () {
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

      it('should interpret video response', function () {
        const serverResponse = {
          body: {
            id: '123',
            seatbid: [
              {
                bid: [
                  {
                    id: '111',
                    impid: '1',
                    price: 1.1,
                    adm: '\u003cVAST version="3.0"\u003e\u003cAd\u003e\u003cInLine\u003e\u003cAdSystem\u003ezemanta\u003c/AdSystem\u003e\u003cAdTitle\u003e1\u003c/AdTitle\u003e\u003cImpression\u003ehttp://win.com\u003c/Impression\u003e\u003cImpression\u003ehttp://example.com/imptracker\u003c/Impression\u003e\u003cCreatives\u003e\u003cCreative\u003e\u003cLinear\u003e\u003cDuration\u003e00:00:25\u003c/Duration\u003e\u003cTrackingEvents\u003e\u003cTracking event="start"\u003ehttp://example.com/start\u003c/Tracking\u003e\u003cTracking event="progress" offset="00:00:03"\u003ehttp://example.com/p3s\u003c/Tracking\u003e\u003c/TrackingEvents\u003e\u003cVideoClicks\u003e\u003cClickThrough\u003ehttp://link.com\u003c/ClickThrough\u003e\u003c/VideoClicks\u003e\u003cMediaFiles\u003e\u003cMediaFile delivery="progressive" type="video/mp4" bitrate="700" width="640" height="360"\u003ehttps://example.com/123_360p.mp4\u003c/MediaFile\u003e\u003c/MediaFiles\u003e\u003c/Linear\u003e\u003c/Creative\u003e\u003c/Creatives\u003e\u003c/InLine\u003e\u003c/Ad\u003e\u003c/VAST\u003e',
                    adid: '100',
                    cid: '5',
                    crid: '29998660',
                    cat: ['cat-1'],
                    adomain: [
                      'example.com'
                    ],
                    nurl: 'http://example.com/win/${AUCTION_PRICE}'
                  }
                ],
                seat: '100',
                group: 1
              }
            ],
            bidid: '456',
            cur: 'USD'
          }
        }
        const request = {
          bids: [
            {
              ...commonBidRequest,
              ...videoBidRequestParams
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
            mediaType: 'video',
            nurl: 'http://example.com/win/${AUCTION_PRICE}',
            vastXml: '<VAST version=\"3.0\"><Ad><InLine><AdSystem>zemanta</AdSystem><AdTitle>1</AdTitle><Impression>http://win.com</Impression><Impression>http://example.com/imptracker</Impression><Creatives><Creative><Linear><Duration>00:00:25</Duration><TrackingEvents><Tracking event=\"start\">http://example.com/start</Tracking><Tracking event=\"progress\" offset=\"00:00:03\">http://example.com/p3s</Tracking></TrackingEvents><VideoClicks><ClickThrough>http://link.com</ClickThrough></VideoClicks><MediaFiles><MediaFile delivery=\"progressive\" type=\"video/mp4\" bitrate=\"700\" width=\"640\" height=\"360\">https://example.com/123_360p.mp4</MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>',
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
      const ret = spec.getUserSyncs({ pixelEnabled: true })
      expect(ret).to.deep.equal([{ type: 'image', url: usersyncUrl }])
    })

    it('should not return user sync if pixel disabled', function () {
      const ret = spec.getUserSyncs({ pixelEnabled: false })
      expect(ret).to.be.an('array').that.is.empty
    })

    it('should not return user sync if url is not set', function () {
      config.resetConfig()
      const ret = spec.getUserSyncs({ pixelEnabled: true })
      expect(ret).to.be.an('array').that.is.empty
    })

    it('should pass GDPR consent', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, { gdprApplies: true, consentString: 'foo' }, undefined)).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gdpr=1&gdpr_consent=foo`
      }]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, { gdprApplies: false, consentString: 'foo' }, undefined)).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gdpr=0&gdpr_consent=foo`
      }]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, { gdprApplies: true, consentString: undefined }, undefined)).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gdpr=1&gdpr_consent=`
      }]);
    });

    it('should pass US consent', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, undefined, '1NYN')).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?us_privacy=1NYN`
      }]);
    });

    it('should pass GDPR and US consent', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, { gdprApplies: true, consentString: 'foo' }, '1NYN')).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gdpr=1&gdpr_consent=foo&us_privacy=1NYN`
      }]);
    });

    it('should pass gpp consent', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, undefined, '', { gppString: 'abc12345', applicableSections: [1, 2] })).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gpp=abc12345&gpp_sid=1%2C2`
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
