import { expect } from 'chai'
import { spec } from 'modules/adqueryBidAdapter.js'
import { newBidder } from 'src/adapters/bidderFactory.js'
import * as utils from '../../../src/utils.js';

describe('adqueryBidAdapter', function () {
  const adapter = newBidder(spec)
  const bidRequest = {
    bidder: 'adquery',
    params: {
      placementId: '6d93f2a0e5f0fe2cc3a6e9e3ade964b43b07f897',
      type: 'banner300x250'
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      }
    }
  }

  const expectedResponse = {
    'body': {
      'data':
        {
          'requestId': 1,
          'emission_id': 1,
          'eventTracker': 'https://example.com',
          'externalEmissionCodes': 'https://example.com',
          'impressionTracker': 'https://example.com',
          'viewabilityTracker': 'https://example.com',
          'clickTracker': 'https://example.com',
          'link': 'https://example.com',
          'logo': 'https://example.com',
          'medias': [
            {
              'src': 'banner/2021-04-09/938',
              'ext': 'zip',
              'type': 3,
            }
          ],
          'domain': 'https://example.com',
          'urlAdq': 'https://example.com',
          'creationId': 1,
          'currency': 'PLN',
          'adDomains': ['https://example.com'],
          'tag': '<ad-adquery data-type="banner300x250"  data-placement="6d93f2a0e5f0fe2cc3a6e9e3ade964b43b07f897"> </ad-adquery>',
          'adqLib': 'https://example.com/js/example.js',
          'mediaType': {'width': 300, 'height': 250, 'name': 'banner', 'type': 'banner300x250'},
          'cpm': 2.5,
          'meta': {
            'advertiserDomains': ['example.com'],
            'mediaType': 'banner',
          }
        }
    }
  }
  describe('codes', function () {
    it('should return a bidder code of adquery', function () {
      expect(spec.code).to.equal('adquery')
    })
  })

  describe('isBidRequestValid', function () {
    const inValidBid = Object.assign({}, bidRequest)
    delete inValidBid.params
    it('should return true if all params present', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true)
    })

    it('should return false if any parameter missing', function () {
      expect(spec.isBidRequestValid(inValidBid)).to.be.false
    })

    it('should return false when sizes for banner are not specified', () => {
      const bid = utils.deepClone(bidRequest);
      delete bid.mediaTypes.banner.sizes;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when sizes for video are not specified', () => {
      expect(spec.isBidRequestValid(
        {
          "bidder": "adquery",
          "params": {
            "placementId": "d30f79cf7fef47bd7a5611719f936539bec0d2e9",
            "test": true,
          },
          "ortb2Imp": {
            "video": {
              "mimes": [
                "video/mp4",
                "video/webm"
              ],
              "startdelay": 0,
              "protocols": [
                2,
                3,
                5,
                6,
                7,
                8
              ],
              "w": 640,
              "h": 360,
              "plcmt": 4,
              "skip": 1,
              "api": [
                2
              ]
            },
            "ext": {}
          },
          "renderer": {
            "url": "https://cdn.jsdelivr.net/npm/in-renderer-js@1/dist/in-renderer.umd.min.js"
          },
          "mediaTypes": {
            "video": {
              "context": "outstream",
              "playerSRAYERSize": [
                [
                  640,
                  360
                ]
              ],
              "mimes": [
                "video/mp4",
                "video/webm"
              ],
              "protocols": [
                2,
                3,
                5,
                6,
                7,
                8
              ],
              "api": [
                2
              ],
              "startdelay": 0,
              "skip": 1,
              "plcmt": 4,
              "w": 640,
              "h": 360
            }
          },
          "adUnitCode": "video-placement-1",
          "transactionId": null,
          "adUnitId": "40393f1b-b89a-4539-a44d-f62a854ced7e",
          "sizes": [
            [
              640,
              360
            ]
          ],
          "bidId": "919f45d2-b2cb-4d4d-a851-0f464612d1bf",
          "bidderRequestId": "7d740e98-136d-4eab-92ee-c61934d2f6a3",
          "auctionId": null,
          "src": "client",
          "metrics": {
            "userId.init.consent": [
              0
            ],
            "userId.mod.init": [
              0.699999988079071
            ],
            "userId.mods.qid.init": [
              0.699999988079071
            ],
            "userId.init.modules": [
              2.5
            ],
            "userId.callbacks.pending": [
              0
            ],
            "userId.total": [
              11.699999988079071
            ],
            "requestBids.userId": 0.3999999761581421,
            "requestBids.validate": 0.800000011920929,
            "requestBids.makeRequests": 4.5,
            "adapter.client.validate": 2.600000023841858,
            "adapters.client.adquery.validate": 2.600000023841858
          },
          "auctionsCount": 1,
          "bidRequestsCount": 1,
          "bidderRequestsCount": 1,
          "bidderWinsCount": 0,
          "deferBilling": false,
          "ortb2": {
            "site": {
              "domain": "devad.adquery.io",
              "publisher": {
                "domain": "adquery.io"
              },
              "page": "https://devad.adquery.io/prod_pbjs_10.15/index.html",
              "ext": {
                "data": {
                  "documentLang": "en"
                }
              },
              "content": {
                "language": "en"
              }
            },
            "device": {
              "w": 1920,
              "h": 1080,
              "dnt": 0,
              "ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
              "language": "en",
              "ext": {
                "vpw": 932,
                "vph": 951
              },
              "sua": {
                "source": 1,
                "platform": {
                  "brand": "Linux"
                },
                "browsers": [
                  {
                    "brand": "Chromium",
                    "version": [
                      "142"
                    ]
                  },
                  {
                    "brand": "Google Chrome",
                    "version": [
                      "142"
                    ]
                  },
                  {
                    "brand": "Not_A Brand",
                    "version": [
                      "99"
                    ]
                  }
                ],
                "mobile": 0
              }
            },
            "user": {
              "ext": {
                "eids": [
                  {
                    "source": "adquery.io",
                    "uids": [
                      {
                        "id": "qd_6bflp6cos2ynv7jozdlva9vck3dcy",
                        "atype": 1
                      }
                    ]
                  }
                ]
              }
            },
            "source": {
              "ext": {}
            }
          }
        }
      )).to.equal(false);
    });
    it('should return false when sizes for video are specified', () => {
      expect(spec.isBidRequestValid(
        {
          "bidder": "adquery",
          "params": {
            "placementId": "d30f79cf7fef47bd7a5611719f936539bec0d2e9",
            "test": true,
          },
          "mediaTypes": {
            "video": {
              "context": "outstream",
              "playerSize": [
                [
                  640,
                  360
                ]
              ],
              "mimes": [
                "video/mp4",
                "video/webm"
              ],
              "protocols": [
                2,
                3,
                5,
                6,
                7,
                8
              ],
              "api": [
                2
              ],
              "startdelay": 0,
              "skip": 1,
              "plcmt": 4,
              "w": 640,
              "h": 360
            }
          },
          "adUnitCode": "video-placement-1",
          "transactionId": null,
          "adUnitId": "40393f1b-b89a-4539-a44d-f62a854ced7e",
          "sizes": [
            [
              640,
              360
            ]
          ],
          "bidId": "919f45d2-b2cb-4d4d-a851-0f464612d1bf",
          "bidderRequestId": "7d740e98-136d-4eab-92ee-c61934d2f6a3",
          "auctionId": null,
          "src": "client",
        }
      )).to.equal(true);
    });
    it('should return false when context for video is correct', () => {
      expect(spec.isBidRequestValid(
        {
          "bidder": "adquery",
          "params": {
            "placementId": "d30f79cf7fef47bd7a5611719f936539bec0d2e9",
            "test": true,
          },
          "mediaTypes": {
            "video": {
              "context": "outstream",
              "playerSize": [
                [
                  640,
                  360
                ]
              ],
              "mimes": [
                "video/mp4",
                "video/webm"
              ],
              "protocols": [
                2,
                3,
                5,
                6,
                7,
                8
              ],
              "api": [
                2
              ],
              "startdelay": 0,
              "skip": 1,
              "plcmt": 4,
              "w": 640,
              "h": 360
            }
          },
          "adUnitCode": "video-placement-1",
          "transactionId": null,
          "adUnitId": "40393f1b-b89a-4539-a44d-f62a854ced7e",
          "sizes": [
            [
              640,
              360
            ]
          ],
          "bidId": "919f45d2-b2cb-4d4d-a851-0f464612d1bf",
          "bidderRequestId": "7d740e98-136d-4eab-92ee-c61934d2f6a3",
          "auctionId": null,
          "src": "client",
        }
      )).to.equal(true);
    });
    it('should return false when context for video is NOT correct', () => {
      expect(spec.isBidRequestValid(
        {
          "bidder": "adquery",
          "params": {
            "placementId": "d30f79cf7fef47bd7a5611719f936539bec0d2e9",
            "test": true,
          },
          "mediaTypes": {
            "video": {
              "context": "instream",
              "playerSize": [
                [
                  640,
                  360
                ]
              ],
              "mimes": [
                "video/mp4",
                "video/webm"
              ],
              "protocols": [
                2,
                3,
                5,
                6,
                7,
                8
              ],
              "api": [
                2
              ],
              "startdelay": 0,
              "skip": 1,
              "plcmt": 4,
              "w": 640,
              "h": 360
            }
          },
          "adUnitCode": "video-placement-1",
          "transactionId": null,
          "adUnitId": "40393f1b-b89a-4539-a44d-f62a854ced7e",
          "sizes": [
            [
              640,
              360
            ]
          ],
          "bidId": "919f45d2-b2cb-4d4d-a851-0f464612d1bf",
          "bidderRequestId": "7d740e98-136d-4eab-92ee-c61934d2f6a3",
          "auctionId": null,
          "src": "client",
        }
      )).to.equal(false);
    });
  })

  describe('buildRequests', function () {
    const req = spec.buildRequests([ bidRequest ], { refererInfo: { } })[0]

    it('should return request object', function () {
      expect(req).to.not.be.null
    })

    it('should build request data', function () {
      expect(req.data).to.not.be.null
    })

    it('should include one request', function () {
      expect(req.data.data).to.not.be.null
    })

    it('should include placementCode', function () {
      expect(req.data.placementCode).not.be.null
    })

    it('should include qid', function () {
      expect(req.data.qid).not.be.null
    })

    it('should include type', function () {
      expect(req.data.type !== null).not.be.null
    })

    it('should include all publisher params', function () {
      expect(req.data.type !== null && req.data.placementCode !== null).to.be.true
    })

    it('should include bidder', function () {
      expect(req.data.bidder !== null).to.be.true
    })

    it('should include sizes', function () {
      expect(req.data.sizes).not.be.null
    })

    it('should include version', function () {
      expect(req.data.v).not.be.null
      expect(req.data.v).equal('$prebid.version$')
    })

    it('should include referrer', function () {
      expect(req.data.bidPageUrl).not.be.null
    })

    const req_video = spec.buildRequests([
      {
        "bidder": "adquery",
        "params": {
          "placementId": "d30f79cf7fef47bd7a5611719f936539bec0d2e9",
          "test": true,
        },
        "ortb2Imp": {
          "video": {
            "mimes": [
              "video/mp4",
              "video/webm"
            ],
            "startdelay": 0,
            "protocols": [
              2,
              3,
              5,
              6,
              7,
              8
            ],
            "w": 640,
            "h": 360,
            "plcmt": 4,
            "skip": 1,
            "api": [
              2
            ]
          },
          "ext": {}
        },
        "renderer": {
          "url": "https://cdn.jsdelivr.net/npm/in-renderer-js@1/dist/in-renderer.umd.min.js"
        },
        "mediaTypes": {
          "video": {
            "context": "outstream",
            "playerSize": [
              [
                640,
                360
              ]
            ],
            "mimes": [
              "video/mp4",
              "video/webm"
            ],
            "protocols": [
              2,
              3,
              5,
              6,
              7,
              8
            ],
            "api": [
              2
            ],
            "startdelay": 0,
            "skip": 1,
            "plcmt": 4,
            "w": 640,
            "h": 360
          }
        },
        "adUnitCode": "video-placement-1",
        "transactionId": null,
        "adUnitId": "40393f1b-b89a-4539-a44d-f62a854ced7e",
        "sizes": [
          [
            640,
            360
          ]
        ],
        "bidId": "919f45d2-b2cb-4d4d-a851-0f464612d1bf",
        "bidderRequestId": "7d740e98-136d-4eab-92ee-c61934d2f6a3",
        "auctionId": null,
        "src": "client",
        "metrics": {
          "userId.init.consent": [
            0
          ],
          "userId.mod.init": [
            0.699999988079071
          ],
          "userId.mods.qid.init": [
            0.699999988079071
          ],
          "userId.init.modules": [
            2.5
          ],
          "userId.callbacks.pending": [
            0
          ],
          "userId.total": [
            11.699999988079071
          ],
          "requestBids.userId": 0.3999999761581421,
          "requestBids.validate": 0.800000011920929,
          "requestBids.makeRequests": 4.5,
          "adapter.client.validate": 2.600000023841858,
          "adapters.client.adquery.validate": 2.600000023841858
        },
        "auctionsCount": 1,
        "bidRequestsCount": 1,
        "bidderRequestsCount": 1,
        "bidderWinsCount": 0,
        "deferBilling": false,
        "ortb2": {
          "site": {
            "domain": "devad.adquery.io",
            "publisher": {
              "domain": "adquery.io"
            },
            "page": "https://devad.adquery.io/prod_pbjs_10.15/index.html",
            "ext": {
              "data": {
                "documentLang": "en"
              },
              "bidder": {
                "placementId": "d30f79cf7fef47bd7a5611719f936539bec0d2e9",
                "test": true
              }
            },
            "content": {
              "language": "en"
            }
          },
          "device": {
            "w": 1920,
            "h": 1080,
            "dnt": 0,
            "ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
            "language": "en",
            "ext": {
              "vpw": 932,
              "vph": 951
            },
            "sua": {
              "source": 1,
              "platform": {
                "brand": "Linux"
              },
              "browsers": [
                {
                  "brand": "Chromium",
                  "version": [
                    "142"
                  ]
                },
                {
                  "brand": "Google Chrome",
                  "version": [
                    "142"
                  ]
                },
                {
                  "brand": "Not_A Brand",
                  "version": [
                    "99"
                  ]
                }
              ],
              "mobile": 0
            }
          },
          "user": {
            "ext": {
              "eids": [
                {
                  "source": "adquery.io",
                  "uids": [
                    {
                      "id": "qd_6bflp6cos2ynv7jozdlva9vck3dcy",
                      "atype": 1
                    }
                  ]
                }
              ]
            }
          },
          "source": {
            "ext": {}
          }
        }
      }
    ], {refererInfo: {}})[0]

    it('should include video', function () {
      expect(req_video.data.bidPageUrl).not.be.null
    })

    it('url must be auction2', function () {
      expect(req_video.url).eq('https://bidder.adquery.io/openrtb2/auction2')
    })

    it('data must have id key', function () {
      expect(req_video.data.id).not.be.null;
    })

    it('data must have cur key', function () {
      expect(req_video.data.cur).not.be.null;
    })

    it('data must have video key', function () {
      expect(req_video.data.imp[0].video).not.be.null;
    })

    it('data must have video h property', function () {
      expect(req_video.data.imp[0].video.h).not.be.null;
    })

    it('data must have video w property', function () {
      expect(req_video.data.imp[0].video.w).not.be.null;
    })

    it('data must have video protocols property', function () {
      expect(req_video.data.imp[0].video.protocols).not.be.null;
    })

    it('data must have video mimes property', function () {
      expect(req_video.data.imp[0].video.mimes).not.be.null;
    })

    it('data must have video bidfloor property', function () {
      expect(req_video.data.imp[0].video.bidfloor).not.exist;
    })

    it('data must have video bidfloorcur property', function () {
      expect(req_video.data.imp[0].video.bidfloorcur).not.exist;
    })

    it('data must have bidder placementCode', function () {
      expect(req_video.data.site.ext.bidder.placementId).eq('d30f79cf7fef47bd7a5611719f936539bec0d2e9');
    })

    it('data must have user key', function () {
      expect(req_video.data.user).not.be.null;
    })

    it('data must have device.ua key', function () {
      expect(req_video.data.device.ua).not.be.null;
    })

    it('data must have site.page key', function () {
      expect(req_video.data.site.page).not.be.null;
    })

    it('data must have site.domain key', function () {
      expect(req_video.data.site.domain).not.be.null;
    })

    const req_video_for_floor = spec.buildRequests([
      {
        "getFloor": function () {
          return {currency: "USD", floor: 1.13};
        },
        "bidder": "adquery",
        "params": {
          "placementId": "d30f79cf7fef47bd7a5611719f936539bec0d2e9",
          "test": true,
        },
        "ortb2Imp": {
          "video": {
            "mimes": [
              "video/mp4",
              "video/webm"
            ],
            "startdelay": 0,
            "protocols": [
              2,
              3,
              5,
              6,
              7,
              8
            ],
            "w": 640,
            "h": 360,
            "plcmt": 4,
            "skip": 1,
            "api": [
              2
            ]
          },
          "ext": {}
        },
        "renderer": {
          "url": "https://cdn.jsdelivr.net/npm/in-renderer-js@1/dist/in-renderer.umd.min.js"
        },
        "mediaTypes": {
          "video": {
            "context": "outstream",
            "playerSize": [
              [
                640,
                360
              ]
            ],
            "mimes": [
              "video/mp4",
              "video/webm"
            ],
            "protocols": [
              2,
              3,
              5,
              6,
              7,
              8
            ],
            "api": [
              2
            ],
            "startdelay": 0,
            "skip": 1,
            "plcmt": 4,
            "w": 640,
            "h": 360
          }
        },
        "adUnitCode": "video-placement-1",
        "transactionId": null,
        "adUnitId": "40393f1b-b89a-4539-a44d-f62a854ced7e",
        "sizes": [
          [
            640,
            360
          ]
        ],
        "bidId": "919f45d2-b2cb-4d4d-a851-0f464612d1bf",
        "bidderRequestId": "7d740e98-136d-4eab-92ee-c61934d2f6a3",
        "auctionId": null,
        "src": "client",
        "metrics": {
          "userId.init.consent": [
            0
          ],
          "userId.mod.init": [
            0.699999988079071
          ],
          "userId.mods.qid.init": [
            0.699999988079071
          ],
          "userId.init.modules": [
            2.5
          ],
          "userId.callbacks.pending": [
            0
          ],
          "userId.total": [
            11.699999988079071
          ],
          "requestBids.userId": 0.3999999761581421,
          "requestBids.validate": 0.800000011920929,
          "requestBids.makeRequests": 4.5,
          "adapter.client.validate": 2.600000023841858,
          "adapters.client.adquery.validate": 2.600000023841858
        },
        "auctionsCount": 1,
        "bidRequestsCount": 1,
        "bidderRequestsCount": 1,
        "bidderWinsCount": 0,
        "deferBilling": false,
        "ortb2": {
          "site": {
            "domain": "devad.adquery.io",
            "publisher": {
              "domain": "adquery.io"
            },
            "page": "https://devad.adquery.io/prod_pbjs_10.15/index.html",
            "ext": {
              "data": {
                "documentLang": "en"
              },
              "bidder": {
                "placementId": "d30f79cf7fef47bd7a5611719f936539bec0d2e9",
                "test": true
              }
            },
            "content": {
              "language": "en"
            }
          },
          "device": {
            "w": 1920,
            "h": 1080,
            "dnt": 0,
            "ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
            "language": "en",
            "ext": {
              "vpw": 932,
              "vph": 951
            },
            "sua": {
              "source": 1,
              "platform": {
                "brand": "Linux"
              },
              "browsers": [
                {
                  "brand": "Chromium",
                  "version": [
                    "142"
                  ]
                },
                {
                  "brand": "Google Chrome",
                  "version": [
                    "142"
                  ]
                },
                {
                  "brand": "Not_A Brand",
                  "version": [
                    "99"
                  ]
                }
              ],
              "mobile": 0
            }
          },
          "user": {
            "ext": {
              "eids": [
                {
                  "source": "adquery.io",
                  "uids": [
                    {
                      "id": "qd_6bflp6cos2ynv7jozdlva9vck3dcy",
                      "atype": 1
                    }
                  ]
                }
              ]
            }
          },
          "source": {
            "ext": {}
          }
        }
      }
    ], {refererInfo: {}})[0]

    it('data with floor must have video bidfloor property', function () {
      expect(req_video_for_floor.data.imp[0].video.bidfloor).eq(1.13);
    })

    it('data with floor must have video bidfloorcur property', function () {
      expect(req_video_for_floor.data.imp[0].video.bidfloorcur).eq("USD");
    })
  })

  describe('interpretResponse', function () {
    it('should get the correct bid response', function () {
      const result = spec.interpretResponse(expectedResponse)
      expect(result).to.be.an('array')
    })

    it('validate response params', function() {
      const newResponse = spec.interpretResponse(expectedResponse, bidRequest);
      expect(newResponse[0].requestId).to.be.equal(1)
    });
    it('handles empty bid response', function () {
      const response = {
        body: {}
      };
      const result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    })

    it('validate video response params, seatbid', function () {
      const newResponse = spec.interpretResponse({
        "body": {
          "id": "48169c9f-f033-48fa-878d-a319273e5c16",
          "seatbid": [
            {
              "bid": [
                {
                  "id": "48169c9f-f033-48fa-878d-a319273e5c15",
                  "impid": "48169c9f-f033-48fa-878d-a319273e5c15",
                  "price": 1.71,
                  "nurl": "https://bidder.adquery.io/openrtb2/uuid/nurl/d",
                  "adm": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<VAST version=\"2.0\"><\/VAST>\n",
                  "ext": {
                    "origbidcpm": "6.84",
                    "origbidcur": "PLN"
                  }
                }
              ],
              "seat": "adquery"
            }
          ],
          "cur": "USD",
          "ext": {
            "test": "1"
          }
        }
      }, bidRequest);
      expect(newResponse[0].requestId).to.be.equal("48169c9f-f033-48fa-878d-a319273e5c15")
    });

    it('validate video response params, seatbid: nurl, vastXml', function () {
      const newResponse = spec.interpretResponse({
        "body": {
          "id": "48169c9f-f033-48fa-878d-a319273e5c16",
          "seatbid": [
            {
              "bid": [
                {
                  "id": "48169c9f-f033-48fa-878d-a319273e5c15",
                  "impid": "48169c9f-f033-48fa-878d-a319273e5c15",
                  "price": 1.71,
                  "nurl": "https://bidder.adquery.io/openrtb2/uuid/nurl/d",
                  "adm": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<VAST version=\"2.0\"><\/VAST>\n",
                  "ext": {
                    "origbidcpm": "6.84",
                    "origbidcur": "PLN"
                  }
                }
              ],
              "seat": "adquery"
            }
          ],
          "cur": "USD",
          "ext": {
            "test": "1"
          }
        }
      }, bidRequest);
      expect(newResponse[0].nurl).to.be.equal("https://bidder.adquery.io/openrtb2/uuid/nurl/d")
      expect(newResponse[0].vastXml).to.be.equal("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<VAST version=\"2.0\"><\/VAST>\n")
    });
  })

  describe('getUserSyncs', function () {
    it('should return iframe sync', function () {
      const sync = spec.getUserSyncs(
        {
          iframeEnabled: true,
          pixelEnabled: true,
        },
        {},
        {
          consentString: 'ALL',
          gdprApplies: true,
        },
        {}
      )
      expect(sync.length).to.equal(1)
      expect(sync[0].type === 'iframe')
      expect(typeof sync[0].url === 'string')
    })
    it('should return image sync', function () {
      const sync = spec.getUserSyncs(
        {
          iframeEnabled: false,
          pixelEnabled: true,
        },
        {},
        {
          consentString: 'ALL',
          gdprApplies: true,
        },
        {}
      )
      expect(sync.length).to.equal(1)
      expect(sync[0].type === 'image')
      expect(typeof sync[0].url === 'string')
    })

    it('Should return array of objects with proper sync config , include GDPR', function() {
      const syncData = spec.getUserSyncs({}, {}, {
        consentString: 'ALL',
        gdprApplies: true,
      }, {});
      expect(syncData).to.be.an('array').which.is.not.empty;
      expect(syncData[0]).to.be.an('object')
      expect(syncData[0].type).to.be.a('string')
      expect(syncData[0].type).to.equal('image')
    });
  })

  describe('test onBidWon function', function () {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });
    it('exists and is a function', () => {
      expect(spec.onBidWon).to.exist.and.to.be.a('function');
    });
    it('should return nothing', function () {
      var response = spec.onBidWon({});
      expect(response).to.be.an('undefined')
      expect(utils.triggerPixel.called).to.equal(true);
    });
    it('should use nurl if exists', function () {
      var response = spec.onBidWon({nurl: "https://example.com/test-nurl"});
      expect(response).to.be.an('undefined')
      expect(utils.triggerPixel.calledWith("https://example.com/test-nurl")).to.equal(true);
    });
  })

  describe('onTimeout', function () {
    const timeoutData = [{
      timeout: null
    }];

    it('should exists and be a function', () => {
      expect(spec.onTimeout).to.exist.and.to.be.a('function');
    });
    it('should include timeoutData', function () {
      expect(spec.onTimeout(timeoutData)).to.be.undefined;
    })
  });

  it(`onSetTargeting is present and type function`, function () {
    expect(spec.onSetTargeting).to.exist.and.to.be.a('function')
  });
})
