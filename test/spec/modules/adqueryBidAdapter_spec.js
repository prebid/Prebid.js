import { expect } from 'chai';
import { spec } from 'modules/adqueryBidAdapter.js';

import * as utils from '../../../src/utils.js';

describe('adqueryBidAdapter', function () {
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
  };

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
          'mediaType': { 'width': 300, 'height': 250, 'name': 'banner', 'type': 'banner300x250' },
          'cpm': 2.5,
          'meta': {
            'advertiserDomains': ['example.com'],
            'mediaType': 'banner',
          }
        }
    }
  };
  describe('codes', function () {
    it('should return a bidder code of adquery', function () {
      expect(spec.code).to.equal('adquery');
    });
  });

  describe('isBidRequestValid', function () {
    const inValidBid = Object.assign({}, bidRequest);
    delete inValidBid.params;
    it('should return true if all params present', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false if any parameter missing', function () {
      expect(spec.isBidRequestValid(inValidBid)).to.be.false;
    });

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
    it('should return true when sizes for video are specified', () => {
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
    it('should return true when context for video is correct', () => {
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
    it('should return true when context for video is instream', () => {
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
                [640, 360]
              ],
              "mimes": [
                "video/mp4",
                "video/webm"
              ],
              "protocols": [2, 3, 5, 6, 7, 8],
              "api": [2],
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
          "sizes": [[640, 360]],
          "bidId": "919f45d2-b2cb-4d4d-a851-0f464612d1bf",
          "bidderRequestId": "7d740e98-136d-4eab-92ee-c61934d2f6a3",
          "auctionId": null,
          "src": "client",
        }
      )).to.equal(true);
    });
    it('should return true when context for video is outstream', () => {
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
                [640, 360]
              ],
              "mimes": [
                "video/mp4",
                "video/webm"
              ],
              "protocols": [2, 3, 5, 6, 7, 8],
              "api": [2],
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
          "sizes": [[640, 360]],
          "bidId": "919f45d2-b2cb-4d4d-a851-0f464612d1bf",
          "bidderRequestId": "7d740e98-136d-4eab-92ee-c61934d2f6a3",
          "auctionId": null,
          "src": "client",
        }
      )).to.equal(true);
    });

    it('should return true for a banner bid when video mediaType has no instream/outstream context', () => {
      const bid = utils.deepClone(bidRequest);
      bid.mediaTypes.video = {
        playerSize: [[640, 360]],
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false (not throw) for a video-only bid with no instream/outstream context and no banner', () => {
      const bid = {
        bidder: 'adquery',
        params: {
          placementId: '6d93f2a0e5f0fe2cc3a6e9e3ade964b43b07f897',
        },
        mediaTypes: {
          video: {
            playerSize: [[640, 360]],
          },
        },
      };
      expect(() => spec.isBidRequestValid(bid)).to.not.throw();
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const req = spec.buildRequests([bidRequest], { refererInfo: { } })[0];

    it('should return request object', function () {
      expect(req).to.not.be.null;
    });

    it('should build request data', function () {
      expect(req.data).to.not.be.null;
    });

    it('should include one request', function () {
      expect(req.data.data).to.not.be.null;
    });

    it('should include placementCode', function () {
      expect(req.data.placementCode).not.be.null;
    });

    it('should include qid', function () {
      expect(req.data.qid).not.be.null;
    });

    it('should include type', function () {
      expect(req.data.type !== null).not.be.null;
    });

    it('should include all publisher params', function () {
      expect(req.data.type !== null && req.data.placementCode !== null).to.be.true;
    });

    it('should include bidder', function () {
      expect(req.data.bidder !== null).to.be.true;
    });

    it('should include sizes', function () {
      expect(req.data.sizes).not.be.null;
    });

    it('should include version', function () {
      expect(req.data.v).not.be.null;
      expect(req.data.v).equal('$prebid.version$');
    });

    it('should include referrer', function () {
      expect(req.data.bidPageUrl).not.be.null;
    });

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
    ], { refererInfo: {} })[0];

    it('should include video', function () {
      expect(req_video.data.bidPageUrl).not.be.null;
    });

    it('url must be auction2', function () {
      expect(req_video.url).eq('https://bidder.adquery.io/openrtb2/auction2');
    });

    it('url must be auction2 for instream', function () {
      const req_video_instream = spec.buildRequests([
        {
          ...req_video.data,
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [[640, 360]]
            }
          },
          params: {
            placementId: 'd30f79cf7fef47bd7a5611719f936539bec0d2e9'
          }
        }
      ], { refererInfo: {} })[0];
      expect(req_video_instream.url).eq('https://bidder.adquery.io/openrtb2/auction2');
    });

    it('data must have id key', function () {
      expect(req_video.data.id).not.be.null;
    });

    it('data must have cur key', function () {
      expect(req_video.data.cur).not.be.null;
    });

    it('data must have video key', function () {
      expect(req_video.data.imp[0].video).not.be.null;
    });

    it('data must have video h property', function () {
      expect(req_video.data.imp[0].video.h).not.be.null;
    });

    it('data must have video w property', function () {
      expect(req_video.data.imp[0].video.w).not.be.null;
    });

    it('data must have video protocols property', function () {
      expect(req_video.data.imp[0].video.protocols).not.be.null;
    });

    it('data must have video mimes property', function () {
      expect(req_video.data.imp[0].video.mimes).not.be.null;
    });

    it('data must have video bidfloor property', function () {
      expect(req_video.data.imp[0].video.bidfloor).not.exist;
    });

    it('data must have video bidfloorcur property', function () {
      expect(req_video.data.imp[0].video.bidfloorcur).not.exist;
    });

    it('data must have bidder placementCode', function () {
      expect(req_video.data.site.ext.bidder.placementId).eq('d30f79cf7fef47bd7a5611719f936539bec0d2e9');
    });

    it('data must have user key', function () {
      expect(req_video.data.user).not.be.null;
    });

    it('data must have device.ua key', function () {
      expect(req_video.data.device.ua).not.be.null;
    });

    it('data must have site.page key', function () {
      expect(req_video.data.site.page).not.be.null;
    });

    it('data must have site.domain key', function () {
      expect(req_video.data.site.domain).not.be.null;
    });

    const req_video_for_floor = spec.buildRequests([
      {
        "getFloor": function () {
          return { currency: "USD", floor: 1.13 };
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
    ], { refererInfo: {} })[0];

    it('data with floor must have video bidfloor property', function () {
      expect(req_video_for_floor.data.imp[0].video.bidfloor).eq(1.13);
    });

    it('data with floor must have video bidfloorcur property', function () {
      expect(req_video_for_floor.data.imp[0].video.bidfloorcur).eq("USD");
    });

    describe('GDPR and USP consent in banner requests', function () {
      it('should set gdpr=1 and gdpr_consent when gdprApplies is true', function () {
        const req = spec.buildRequests([bidRequest], {
          refererInfo: {},
          gdprConsent: { gdprApplies: true, consentString: 'test-consent-string' }
        })[0];
        expect(req.data.gdpr).to.equal(1);
        expect(req.data.gdpr_consent).to.equal('test-consent-string');
      });

      it('should set gdpr=0 when gdprApplies is false', function () {
        const req = spec.buildRequests([bidRequest], {
          refererInfo: {},
          gdprConsent: { gdprApplies: false, consentString: 'test-consent-string' }
        })[0];
        expect(req.data.gdpr).to.equal(0);
      });

      it('should default gdpr=0 and empty strings when no consent provided', function () {
        const req = spec.buildRequests([bidRequest], { refererInfo: {} })[0];
        expect(req.data.gdpr).to.equal(0);
        expect(req.data.gdpr_consent).to.equal('');
        expect(req.data.us_privacy).to.equal('');
      });

      it('should set us_privacy when uspConsent provided', function () {
        const req = spec.buildRequests([bidRequest], {
          refererInfo: {},
          uspConsent: '1YNN'
        })[0];
        expect(req.data.us_privacy).to.equal('1YNN');
      });
    });

    describe('GDPR and USP consent in video requests', function () {
      const minimalVideoBid = {
        bidder: 'adquery',
        params: { placementId: 'test-placement-id' },
        mediaTypes: {
          video: { context: 'outstream', playerSize: [[640, 360]] }
        },
        ortb2Imp: { video: { w: 640, h: 360 } },
        ortb2: {},
        bidId: 'test-bid-id-video'
      };

      it('should set regs.ext.gdpr and user.consent in video request when gdprConsent provided', function () {
        const req = spec.buildRequests([minimalVideoBid], {
          refererInfo: {},
          gdprConsent: { gdprApplies: true, consentString: 'video-consent-string' }
        })[0];
        expect(req.data.regs.ext.gdpr).to.equal(1);
        expect(req.data.user.consent).to.equal('video-consent-string');
      });

      it('should set regs.ext.gdpr=0 when gdprApplies is false for video', function () {
        const req = spec.buildRequests([minimalVideoBid], {
          refererInfo: {},
          gdprConsent: { gdprApplies: false, consentString: 'video-consent-string' }
        })[0];
        expect(req.data.regs.ext.gdpr).to.equal(0);
      });

      it('should not set regs when no gdprConsent or uspConsent for video', function () {
        const req = spec.buildRequests([minimalVideoBid], { refererInfo: {} })[0];
        expect(req.data.regs).to.be.undefined;
      });

      it('should set regs.ext.us_privacy in video request when uspConsent provided', function () {
        const req = spec.buildRequests([minimalVideoBid], {
          refererInfo: {},
          uspConsent: '1YNN'
        })[0];
        expect(req.data.regs.ext.us_privacy).to.equal('1YNN');
      });
    });

    describe('userId resolution via userIdAsEids', function () {
      function buildWithEids(eids) {
        return spec.buildRequests([Object.assign({}, bidRequest, { userIdAsEids: eids })], { refererInfo: {} })[0];
      }

      it('should use adquery.io EID as userId when available', function () {
        const req = buildWithEids([
          { source: 'other.com', uids: [{ id: 'other-id' }] },
          { source: 'adquery.io', uids: [{ id: 'qd_adquery-id' }] }
        ]);
        expect(req.data.bidQid).to.equal('qd_adquery-id');
      });

      it('should not use a foreign EID as bidQid when adquery.io EID is missing', function () {
        const req = buildWithEids([
          { source: 'id5-sync.com', uids: [{ id: 'id5-id' }] },
          { source: 'pubcid.org', uids: [{ id: 'pubcid-id' }] },
          { source: 'uidapi.com', uids: [{ id: 'uid2-id' }] }
        ]);
        expect(req.data.bidQid).to.equal('');
      });

      it('should not use a foreign EID as bidQid when adquery.io EID has no usable uid', function () {
        const req = buildWithEids([
          { source: 'adquery.io', uids: [{ id: '' }] },
          { source: 'id5-sync.com', uids: [{ id: 'id5-id' }] }
        ]);
        expect(req.data.bidQid).to.equal('');
      });

      it('should not treat a source that only contains adquery.io as the adquery.io EID', function () {
        const req = buildWithEids([
          { source: 'notadquery.io', uids: [{ id: 'spoofed-id' }] },
          { source: 'adquery.io.example.com', uids: [{ id: 'spoofed-id-2' }] }
        ]);
        expect(req.data.bidQid).to.equal('');
      });

      it('should pick the same adquery.io uid regardless of uid order within the EID', function () {
        const uids = [{ id: 'qd_b' }, { id: 'qd_a' }, { id: 'qd_c' }];
        const forward = buildWithEids([{ source: 'adquery.io', uids }]);
        const reversed = buildWithEids([{ source: 'adquery.io', uids: [...uids].reverse() }]);
        expect(forward.data.bidQid).to.equal('qd_a');
        expect(reversed.data.bidQid).to.equal('qd_a');
      });

      it('should pick the same adquery.io uid regardless of duplicate adquery.io EID order', function () {
        const eids = [
          { source: 'aaa.com', uids: [{ id: 'aaa-id' }] },
          { source: 'adquery.io', uids: [{ id: 'qd_b' }] },
          { source: 'adquery.io', uids: [{ id: 'qd_a' }] }
        ];
        expect(buildWithEids(eids).data.bidQid).to.equal('qd_a');
        expect(buildWithEids([...eids].reverse()).data.bidQid).to.equal('qd_a');
      });

      it('should skip empty adquery.io uids', function () {
        const req = buildWithEids([
          { source: 'adquery.io', uids: [{ id: '' }, null, {}, { id: 'second-uid' }] }
        ]);
        expect(req.data.bidQid).to.equal('second-uid');
      });

      it('should skip a malformed adquery.io EID', function () {
        const req = buildWithEids([
          null,
          { source: 'adquery.io', uids: { id: 'not-an-array' } },
          { source: 'adquery.io', uids: [{ id: 'qd_valid' }] }
        ]);
        expect(req.data.bidQid).to.equal('qd_valid');
      });

      it('should not modify userIdAsEids', function () {
        const eids = [
          { source: 'zzz.com', uids: [{ id: 'zzz-id' }] },
          { source: 'adquery.io', uids: [{ id: 'qd_b' }, { id: 'qd_a' }] }
        ];
        const snapshot = JSON.parse(JSON.stringify(eids));
        buildWithEids(eids);
        expect(eids).to.deep.equal(snapshot);
      });

      it('should send empty bidQid when no userIdAsEids present', function () {
        const req = spec.buildRequests([bidRequest], { refererInfo: {} })[0];
        expect(req.data.bidQid).to.equal('');
      });

      it('should not generate a random userId per request', function () {
        const first = spec.buildRequests([bidRequest], { refererInfo: {} })[0];
        const second = spec.buildRequests([bidRequest], { refererInfo: {} })[0];
        expect(first.data.bidQid).to.equal(second.data.bidQid);
      });
    });

    describe('eids forwarding', function () {
      function buildWithEids(eids) {
        return spec.buildRequests([Object.assign({}, bidRequest, { userIdAsEids: eids })], { refererInfo: {} })[0];
      }

      it('should omit eids when no userIdAsEids present', function () {
        const req = spec.buildRequests([bidRequest], { refererInfo: {} })[0];
        expect(req.data).to.not.have.property('eids');
      });

      it('should omit eids when no EID is usable', function () {
        const req = buildWithEids([{ source: 'aaa.com', uids: [{ id: '' }] }]);
        expect(req.data).to.not.have.property('eids');
      });

      it('should remove identical duplicate EIDs and uids', function () {
        const req = buildWithEids([
          { source: 'pubcid.org', uids: [{ id: 'x', atype: 1 }, { id: 'x', atype: 1 }, { id: 'y' }] },
          { source: 'pubcid.org', uids: [{ id: 'x', atype: 1 }, { id: 'y' }] },
          { source: 'pubcid.org', uids: [{ id: 'x', atype: 3 }] }
        ]);
        expect(req.data.eids).to.deep.equal([
          { source: 'pubcid.org', uids: [{ id: 'x', atype: 1 }, { id: 'y' }] },
          { source: 'pubcid.org', uids: [{ id: 'x', atype: 3 }] }
        ]);
      });

      it('should compare atype as a number, like the Prebid Server adapter', function () {
        const req = buildWithEids([{ source: 'id5-sync.com', uids: [{ id: 'same', atype: 10 }, { id: 'same', atype: 3 }] }]);
        expect(req.data.eids).to.deep.equal([{ source: 'id5-sync.com', uids: [{ id: 'same', atype: 3 }, { id: 'same', atype: 10 }] }]);
      });

      it('should break ties by inserter, matcher, mm and ext', function () {
        const eids = [
          { source: 'x.com', uids: [{ id: 'same' }], ext: { b: 1 } },
          { source: 'x.com', uids: [{ id: 'same' }], ext: { a: 1 } },
          { source: 'x.com', uids: [{ id: 'same' }], mm: 2 },
          { source: 'x.com', uids: [{ id: 'same' }], mm: 1 },
          { source: 'x.com', uids: [{ id: 'same' }], matcher: 'm.com' },
          { source: 'x.com', uids: [{ id: 'same' }], inserter: 'i.com' },
          { source: 'x.com', uids: [{ id: 'same' }, { id: 'zzz' }] }
        ];
        const expected = [
          { source: 'x.com', uids: [{ id: 'same' }], ext: { a: 1 } },
          { source: 'x.com', uids: [{ id: 'same' }], ext: { b: 1 } },
          { source: 'x.com', uids: [{ id: 'same' }], mm: 1 },
          { source: 'x.com', uids: [{ id: 'same' }], mm: 2 },
          { source: 'x.com', uids: [{ id: 'same' }], matcher: 'm.com' },
          { source: 'x.com', uids: [{ id: 'same' }], inserter: 'i.com' },
          { source: 'x.com', uids: [{ id: 'same' }, { id: 'zzz' }] }
        ];
        expect(buildWithEids(eids).data.eids).to.deep.equal(expected);
        expect(buildWithEids([...eids].reverse()).data.eids).to.deep.equal(expected);
      });

      it('should forward all EIDs with their source, including adquery.io', function () {
        const eids = [
          { source: 'adquery.io', uids: [{ id: 'qd_adquery-id', atype: 1 }] },
          { source: 'id5-sync.com', uids: [{ id: 'id5-id', atype: 1, ext: { linkType: 2 } }] },
          { source: 'pubcid.org', uids: [{ id: 'pubcid-id', atype: 1 }] }
        ];
        const req = buildWithEids(eids);
        expect(req.data.eids).to.deep.equal(eids);
      });

      it('should keep optional ORTB EID fields', function () {
        const eids = [{
          source: 'adserver.org',
          inserter: 'inserter.com',
          matcher: 'matcher.com',
          mm: 3,
          ext: { foo: 'bar' },
          uids: [{ id: 'tdid', atype: 1, ext: { rtiPartner: 'TDID' } }]
        }];
        expect(buildWithEids(eids).data.eids).to.deep.equal(eids);
      });

      it('should not use forwarded foreign EIDs as bidQid', function () {
        const req = buildWithEids([{ source: 'id5-sync.com', uids: [{ id: 'id5-id' }] }]);
        expect(req.data.bidQid).to.equal('');
        expect(req.data.eids).to.deep.equal([{ source: 'id5-sync.com', uids: [{ id: 'id5-id' }] }]);
      });

      it('should drop malformed EIDs and uids without an id', function () {
        const req = buildWithEids([
          null,
          { uids: [{ id: 'no-source' }] },
          { source: '', uids: [{ id: 'empty-source' }] },
          { source: 'aaa.com', uids: { id: 'not-an-array' } },
          { source: 'bbb.com', uids: [] },
          { source: 'ccc.com', uids: [{ id: '' }, null, {}] },
          { source: 'ddd.com', uids: [{ id: '' }, { id: 'ddd-id' }] }
        ]);
        expect(req.data.eids).to.deep.equal([{ source: 'ddd.com', uids: [{ id: 'ddd-id' }] }]);
      });

      it('should keep uids that share an id but differ in atype or ext, in an order independent of input', function () {
        const eids = [
          { source: 'id5-sync.com', uids: [{ id: 'same', atype: 1, ext: { linkType: 1 } }] },
          { source: 'id5-sync.com', uids: [{ id: 'same', atype: 3, ext: { linkType: 2 } }] }
        ];
        expect(buildWithEids(eids).data.eids).to.deep.equal(eids);
        expect(buildWithEids([...eids].reverse()).data.eids).to.deep.equal(eids);
      });

      it('should order EIDs with the same source and first uid independently of input', function () {
        const eids = [
          { source: 'id5-sync.com', uids: [{ id: 'same' }], ext: { b: 1 } },
          { source: 'id5-sync.com', uids: [{ id: 'same' }], ext: { a: 1 } }
        ];
        const forward = buildWithEids(eids).data.eids;
        expect(buildWithEids([...eids].reverse()).data.eids).to.deep.equal(forward);
        expect(forward.map(eid => eid.ext)).to.deep.equal([{ a: 1 }, { b: 1 }]);
      });

      it('should order uids with the same id inside one EID independently of input', function () {
        const uids = [{ id: 'same', atype: 3 }, { id: 'same', atype: 1 }];
        const expected = [{ source: 'id5-sync.com', uids: [{ id: 'same', atype: 1 }, { id: 'same', atype: 3 }] }];
        expect(buildWithEids([{ source: 'id5-sync.com', uids }]).data.eids).to.deep.equal(expected);
        expect(buildWithEids([{ source: 'id5-sync.com', uids: [...uids].reverse() }]).data.eids).to.deep.equal(expected);
      });

      it('should drop non-string ids, like the Prebid Server adapter', function () {
        const req = buildWithEids([
          { source: 'num.com', uids: [{ id: 0 }, { id: 123 }, { id: 'kept' }] },
          { source: 'obj.com', uids: [{ id: { nested: 'x' } }, { id: true }] }
        ]);
        expect(req.data.eids).to.deep.equal([{ source: 'num.com', uids: [{ id: 'kept' }] }]);
      });

      it('should keep only ORTB fields and leave out zero atype and mm', function () {
        const req = buildWithEids([{
          source: 'x.com',
          foo: 1,
          inserter: '',
          mm: 0,
          uids: [{ id: 'a', atype: 0, bar: 2 }, { id: 'b', atype: 1, ext: { k: 1 } }]
        }]);
        expect(req.data.eids).to.deep.equal([{ source: 'x.com', uids: [{ id: 'a' }, { id: 'b', atype: 1, ext: { k: 1 } }] }]);
      });

      it('should not send an EID that the cap turned into a copy of a non-adjacent one', function () {
        const eids = [];
        for (let i = 0; i < 47; i++) {
          eids.push({ source: `a${String(i).padStart(2, '0')}.com`, uids: [{ id: `id-${i}` }] });
        }
        const x = [
          { source: 'x.com', uids: [{ id: 'a' }] },
          { source: 'x.com', inserter: 'i.com', uids: [{ id: 'a' }] },
          { source: 'x.com', uids: [{ id: 'a' }, { id: 'c' }] }
        ];
        const req = buildWithEids([...eids, ...x].reverse());
        expect(req.data.eids).to.deep.equal([...eids, x[0], x[1]]);
      });

      it('should not send an EID that the cap turned into a copy of the previous one', function () {
        const eids = [];
        for (let i = 0; i < 48; i++) {
          eids.push({ source: `a${String(i).padStart(2, '0')}.com`, uids: [{ id: `id-${i}` }] });
        }
        // 48 + 1 uids leave a budget of 1, which cuts { a, b } down to a copy of { a }.
        eids.push({ source: 'x.com', uids: [{ id: 'a' }, { id: 'b' }] });
        eids.push({ source: 'x.com', uids: [{ id: 'a' }] });
        const req = buildWithEids(eids);
        expect(req.data.eids).to.have.length(49);
        expect(req.data.eids[48]).to.deep.equal({ source: 'x.com', uids: [{ id: 'a' }] });
      });

      it('should cap the total number of forwarded uids at 50, keeping the first sources in order', function () {
        const eids = [];
        for (let i = 0; i < 60; i++) {
          eids.push({ source: `source${String(i).padStart(2, '0')}.com`, uids: [{ id: `id-${i}` }] });
        }
        const req = buildWithEids([...eids].reverse());
        expect(req.data.eids).to.have.length(50);
        expect(req.data.eids[0].source).to.equal('source00.com');
        expect(req.data.eids[49].source).to.equal('source49.com');
      });

      it('should cap uids inside a single EID too, keeping the lowest ids', function () {
        const uids = [];
        for (let i = 0; i < 1000; i++) {
          uids.push({ id: `id-${String(i).padStart(4, '0')}` });
        }
        const req = buildWithEids([
          { source: 'big.com', uids: [...uids].reverse() },
          { source: 'zzz.com', uids: [{ id: 'after-id' }] }
        ]);
        expect(req.data.eids).to.have.length(1);
        expect(req.data.eids[0].uids).to.have.length(50);
        expect(req.data.eids[0].uids[0].id).to.equal('id-0000');
        expect(req.data.eids[0].uids[49].id).to.equal('id-0049');
      });

      it('should send EIDs in the same order regardless of user ID module order', function () {
        const eids = [
          { source: 'uidapi.com', uids: [{ id: 'uid2-id' }] },
          { source: 'id5-sync.com', uids: [{ id: 'id5-b' }, { id: 'id5-a' }] },
          { source: 'adquery.io', uids: [{ id: 'qd_adquery-id' }] },
          { source: 'criteo.com', uids: [{ id: 'criteo-id' }] }
        ];
        const expected = [
          { source: 'adquery.io', uids: [{ id: 'qd_adquery-id' }] },
          { source: 'criteo.com', uids: [{ id: 'criteo-id' }] },
          { source: 'id5-sync.com', uids: [{ id: 'id5-a' }, { id: 'id5-b' }] },
          { source: 'uidapi.com', uids: [{ id: 'uid2-id' }] }
        ];
        expect(buildWithEids(eids).data.eids).to.deep.equal(expected);
        expect(buildWithEids([...eids].reverse()).data.eids).to.deep.equal(expected);
      });

      it('should put adquery.io EIDs first so the cap never drops them', function () {
        const eids = [];
        for (let i = 0; i < 60; i++) {
          eids.push({ source: `source${String(i).padStart(2, '0')}.com`, uids: [{ id: `id-${i}` }] });
        }
        eids.push({ source: 'adquery.io', uids: [{ id: 'qd_adquery-id-1234567' }] });
        const req = buildWithEids(eids);
        expect(req.data.eids[0]).to.deep.equal({ source: 'adquery.io', uids: [{ id: 'qd_adquery-id-1234567' }] });
        expect(req.data.eids).to.have.length(50);
        expect(req.data.eids[49].source).to.equal('source48.com');
      });

      it('should put the adquery.io uid sent as bidQid first', function () {
        const req = buildWithEids([
          { source: 'id5-sync.com', uids: [{ id: 'id5-id' }] },
          { source: 'adquery.io', uids: [{ id: 'qd_c' }, { id: 'qd_b' }] },
          { source: 'adquery.io', uids: [{ id: 'qd_a' }] }
        ]);
        expect(req.data.bidQid).to.equal('qd_a');
        expect(req.data.eids).to.deep.equal([
          { source: 'adquery.io', uids: [{ id: 'qd_a' }] },
          { source: 'adquery.io', uids: [{ id: 'qd_b' }, { id: 'qd_c' }] },
          { source: 'id5-sync.com', uids: [{ id: 'id5-id' }] }
        ]);
      });

      it('should keep the bidQid uid when adquery.io alone exceeds the cap', function () {
        const many = [];
        for (let i = 0; i < 60; i++) {
          many.push({ id: `qd_${i + 10}` });
        }
        const req = buildWithEids([
          { source: 'adquery.io', uids: many },
          { source: 'adquery.io', uids: [{ id: 'qd_00' }] },
          { source: 'id5-sync.com', uids: [{ id: 'id5-id' }] }
        ]);
        expect(req.data.bidQid).to.equal('qd_00');
        expect(req.data.eids[0].uids[0].id).to.equal('qd_00');
        const total = req.data.eids.reduce((sum, eid) => sum + eid.uids.length, 0);
        expect(total).to.equal(50);
        expect(req.data.eids.map(eid => eid.source)).to.not.include('id5-sync.com');
      });

      it('should give every banner request the same bidQid and eids', function () {
        const userIdAsEids = [
          { source: 'adquery.io', uids: [{ id: 'qd_1' }] },
          { source: 'id5-sync.com', uids: [{ id: 'id5-id' }] }
        ];
        const bids = [
          Object.assign({}, bidRequest, { bidId: 'b1', userIdAsEids }),
          Object.assign({}, bidRequest, { bidId: 'b2', userIdAsEids })
        ];
        const [first, second] = spec.buildRequests(bids, { refererInfo: {} });
        expect(first.data.bidQid).to.equal('qd_1');
        expect(second.data.bidQid).to.equal('qd_1');
        expect(first.data.eids).to.deep.equal(userIdAsEids);
        expect(second.data.eids).to.deep.equal(userIdAsEids);
        expect(first.data.eids).to.not.equal(second.data.eids);
        expect(first.data.eids[0].uids[0]).to.not.equal(second.data.eids[0].uids[0]);
      });

      it('should not mutate or share userIdAsEids objects', function () {
        const eids = [{ source: 'id5-sync.com', uids: [{ id: 'id5-id', ext: { linkType: 2 } }] }];
        const snapshot = JSON.parse(JSON.stringify(eids));
        const req = buildWithEids(eids);
        expect(eids).to.deep.equal(snapshot);
        expect(req.data.eids[0]).to.not.equal(eids[0]);
        expect(req.data.eids[0].uids[0]).to.not.equal(eids[0].uids[0]);
        expect(req.data.eids[0].uids[0].ext).to.not.equal(eids[0].uids[0].ext);
      });

      function videoBidWith(overrides) {
        return Object.assign({
          bidder: 'adquery',
          params: { placementId: 'test-placement-id' },
          mediaTypes: { video: { context: 'outstream', playerSize: [[640, 360]] } },
          ortb2Imp: { video: { w: 640, h: 360 } },
          ortb2: {},
          bidId: 'test-bid-id-video'
        }, overrides);
      }

      it('should send the cleaned EIDs in user.ext.eids of video requests', function () {
        const eids = [
          { source: 'id5-sync.com', uids: [{ id: 'id5-id' }] },
          { source: 'broken.com', uids: [{ id: '' }] }
        ];
        const req = spec.buildRequests([videoBidWith({
          userIdAsEids: eids,
          ortb2: { user: { ext: { eids } } }
        })], { refererInfo: {} })[0];
        expect(req.data.user.ext.eids).to.deep.equal([{ source: 'id5-sync.com', uids: [{ id: 'id5-id' }] }]);
      });

      it('should keep the adquery.io EID first in video user.ext.eids despite the cap', function () {
        const eids = [];
        for (let i = 0; i < 60; i++) {
          eids.push({ source: `source${i}.com`, uids: [{ id: `id-${i}` }] });
        }
        eids.push({ source: 'adquery.io', uids: [{ id: 'qd_adquery-id-1234567' }] });
        const req = spec.buildRequests([videoBidWith({
          userIdAsEids: eids,
          ortb2: { user: { ext: { eids } } }
        })], { refererInfo: {} })[0];
        expect(req.data.user.ext.eids[0]).to.deep.equal({ source: 'adquery.io', uids: [{ id: 'qd_adquery-id-1234567' }] });
        expect(req.data.user.ext.eids).to.have.length(50);
      });

      it('should not send empty user or user.ext objects in video requests', function () {
        const eids = [{ source: 'broken.com', uids: [{ id: '' }] }];
        const onlyEids = spec.buildRequests([videoBidWith({
          userIdAsEids: eids,
          ortb2: { user: { ext: { eids } } }
        })], { refererInfo: {} })[0];
        expect(onlyEids.data).to.not.have.property('user');
        const withOther = spec.buildRequests([videoBidWith({
          userIdAsEids: eids,
          ortb2: { user: { id: 'u', ext: { eids } } }
        })], { refererInfo: {} })[0];
        expect(withOther.data.user).to.deep.equal({ id: 'u' });
      });

      it('should use ortb2.user.ext.eids when userIdAsEids is not set (no userId module)', function () {
        const eids = [
          { source: 'pubcid.org', uids: [{ id: 'pubcid-id' }] },
          { source: 'adquery.io', uids: [{ id: 'qd_adquery-id-1234567' }] }
        ];
        const sorted = [eids[1], eids[0]];
        const banner = spec.buildRequests([Object.assign({}, bidRequest, { ortb2: { user: { ext: { eids } } } })], { refererInfo: {} })[0];
        expect(banner.data.eids).to.deep.equal(sorted);
        expect(banner.data.bidQid).to.equal('qd_adquery-id-1234567');
        const videoBid = videoBidWith({ ortb2: { user: { ext: { eids } } } });
        delete videoBid.userIdAsEids;
        const video = spec.buildRequests([videoBid], { refererInfo: {} })[0];
        expect(video.data.user.ext.eids).to.deep.equal(sorted);
      });

      it('should ignore a non-array ortb2.user.ext.eids', function () {
        const req = spec.buildRequests([Object.assign({}, bidRequest, { ortb2: { user: { ext: { eids: 'x' } } } })], { refererInfo: {} })[0];
        expect(req.data).to.not.have.property('eids');
      });

      it('should not copy uncleaned user.eids into video requests', function () {
        const eids = [{ source: 'id5-sync.com', uids: [{ id: 'id5-id' }] }];
        const req = spec.buildRequests([videoBidWith({
          userIdAsEids: eids,
          ortb2: { user: { eids: [{ source: 'raw.com', uids: [{ id: '' }] }], ext: { eids } } }
        })], { refererInfo: {} })[0];
        expect(req.data.user).to.not.have.property('eids');
        expect(req.data.user.ext.eids).to.deep.equal(eids);
      });

      it('should drop user.ext.eids from video requests when no usable EID is left', function () {
        const eids = [{ source: 'broken.com', uids: [{ id: '' }] }];
        const req = spec.buildRequests([videoBidWith({
          userIdAsEids: eids,
          ortb2: { user: { ext: { eids, other: 1 } } }
        })], { refererInfo: {} })[0];
        expect(req.data.user.ext).to.deep.equal({ other: 1 });
      });

      it('should not let video requests share or mutate bid.ortb2 and bid.ortb2Imp', function () {
        const ortb2 = { site: { page: 'https://example.com' }, user: { ext: {} } };
        const bids = [
          videoBidWith({ bidId: 'v1', params: { placementId: 'A' }, ortb2, ortb2Imp: { video: { w: 640, h: 360 } } }),
          videoBidWith({ bidId: 'v2', params: { placementId: 'B' }, ortb2, ortb2Imp: { video: { w: 640, h: 360 } } })
        ];
        bids.forEach(bid => {
          bid.getFloor = () => ({ floor: 1.5, currency: 'PLN' });
        });
        const ortb2Snapshot = JSON.parse(JSON.stringify(ortb2));
        const [first, second] = spec.buildRequests(bids, {
          refererInfo: {},
          gdprConsent: { gdprApplies: true, consentString: 'consent' }
        });
        expect(first.data.site.ext.bidder).to.deep.equal({ placementId: 'A' });
        expect(second.data.site.ext.bidder).to.deep.equal({ placementId: 'B' });
        expect(first.data.user.consent).to.equal('consent');
        expect(first.data.user).to.not.equal(second.data.user);
        expect(first.data.imp[0].video.bidfloor).to.equal(1.5);
        expect(ortb2).to.deep.equal(ortb2Snapshot);
        expect(bids[0].ortb2Imp.video).to.deep.equal({ w: 640, h: 360 });
      });
    });
  });

  describe('interpretResponse', function () {
    it('should get the correct bid response', function () {
      const result = spec.interpretResponse(expectedResponse);
      expect(result).to.be.an('array');
    });

    it('validate response params', function() {
      const newResponse = spec.interpretResponse(expectedResponse, bidRequest);
      expect(newResponse[0].requestId).to.be.equal(1);
    });
    it('handles empty bid response', function () {
      const response = {
        body: {}
      };
      const result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });

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
      expect(newResponse[0].requestId).to.be.equal("48169c9f-f033-48fa-878d-a319273e5c15");
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
      expect(newResponse[0].nurl).to.be.equal("https://bidder.adquery.io/openrtb2/uuid/nurl/d");
      expect(newResponse[0].vastXml).to.be.equal("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<VAST version=\"2.0\"><\/VAST>\n");
    });

    it('should not include referrer field in banner bid response', function () {
      const result = spec.interpretResponse(expectedResponse);
      const bannerBid = result[result.length - 1];
      expect(bannerBid.referrer).to.be.undefined;
    });
  });

  describe('getUserSyncs', function () {
    const gdprConsentWithPurpose1 = {
      consentString: 'ALL',
      gdprApplies: true,
      vendorData: { purpose: { consents: { 1: true } } }
    };
    const serverResponsesWithQid = [{ body: { data: { qid: 'test-qid-value' } } }];

    it('should return iframe sync', function () {
      const sync = spec.getUserSyncs(
        {
          iframeEnabled: true,
          pixelEnabled: true,
        },
        serverResponsesWithQid,
        gdprConsentWithPurpose1,
        {}
      );
      expect(sync.length).to.equal(1);
      expect(sync[0].type).to.equal('iframe');
      expect(sync[0].url).to.be.a('string');
    });
    it('should return image sync', function () {
      const sync = spec.getUserSyncs(
        {
          iframeEnabled: false,
          pixelEnabled: true,
        },
        serverResponsesWithQid,
        gdprConsentWithPurpose1,
        {}
      );
      expect(sync.length).to.equal(1);
      expect(sync[0].type).to.equal('image');
      expect(sync[0].url).to.be.a('string');
    });

    it('Should return array of objects with proper sync config , include GDPR', function() {
      const syncData = spec.getUserSyncs({}, serverResponsesWithQid, gdprConsentWithPurpose1, {});
      expect(syncData).to.be.an('array').which.is.not.empty;
      expect(syncData[0]).to.be.an('object');
      expect(syncData[0].type).to.be.a('string');
      expect(syncData[0].type).to.equal('image');
    });

    it('should return empty array when Purpose 1 consent is missing', function () {
      const gdprConsent = { gdprApplies: true, vendorData: { purpose: { consents: { 1: false } } } };
      const sync = spec.getUserSyncs({ pixelEnabled: true }, serverResponsesWithQid, gdprConsent, {});
      expect(sync).to.be.an('array').that.is.empty;
    });

    it('should return empty array when GDPR does not apply', function () {
      const sync = spec.getUserSyncs({ pixelEnabled: true }, serverResponsesWithQid, { gdprApplies: false }, {});
      expect(sync).to.be.an('array').that.is.empty;
    });

    it('should return empty array when qid is not present in serverResponses', function () {
      const sync = spec.getUserSyncs({ pixelEnabled: true }, [{ body: { data: {} } }], gdprConsentWithPurpose1, {});
      expect(sync).to.be.an('array').that.is.empty;
    });

    it('should include ccpa_consent in sync URL when uspConsent provided', function () {
      const sync = spec.getUserSyncs({ pixelEnabled: true }, serverResponsesWithQid, gdprConsentWithPurpose1, '1YNN');
      expect(sync[0].url).to.include('ccpa_consent=1YNN');
    });

    it('should include qid in sync URL when present in serverResponses', function () {
      const serverResponses = [{ body: { data: { qid: 'test-qid-value' } } }];
      const sync = spec.getUserSyncs({ pixelEnabled: true }, serverResponses, gdprConsentWithPurpose1, {});
      expect(sync[0].url).to.include('qid=test-qid-value');
    });

    it('should find qid from any response, not just the first', function () {
      const serverResponses = [{ body: '' }, { body: '' }, { body: { data: { qid: 'test-qid-value' } } }];
      const sync = spec.getUserSyncs({ pixelEnabled: true }, serverResponses, gdprConsentWithPurpose1, {});
      expect(sync[0].url).to.include('qid=test-qid-value');
    });
  });

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
      expect(response).to.be.an('undefined');
      expect(utils.triggerPixel.called).to.equal(true);
    });
    it('should use nurl if exists', function () {
      var response = spec.onBidWon({ nurl: "https://example.com/test-nurl" });
      expect(response).to.be.an('undefined');
      expect(utils.triggerPixel.calledWith("https://example.com/test-nurl")).to.equal(true);
    });
    it('should extract uuid from ad string and remove ad from payload', function () {
      spec.onBidWon({
        ad: '<script src="https://example.com/js/example.js"></script><example-ad data-uuid="test-uuid-example"></example-ad>',
      });
      const calledUrl = utils.triggerPixel.getCall(0).args[0];
      const qMatch = calledUrl.match(/[?&]q=([^&]*)/);
      const decodedBid = JSON.parse(atob(decodeURIComponent(qMatch[1])));
      expect(decodedBid.uuid).to.equal('test-uuid-example');
      expect(decodedBid.ad).to.be.undefined;
    });
    it('should set uuid to null when ad has no data-uuid attribute', function () {
      spec.onBidWon({
        ad: '<script src="https://example.com/js/example.js"></script><example-ad></example-ad>',
      });
      const calledUrl = utils.triggerPixel.getCall(0).args[0];
      const qMatch = calledUrl.match(/[?&]q=([^&]*)/);
      const decodedBid = JSON.parse(atob(decodeURIComponent(qMatch[1])));
      expect(decodedBid.uuid).to.be.null;
      expect(decodedBid.ad).to.be.undefined;
    });
    it('should set uuid to null when bid has no ad field (e.g. video bid with vastXml)', function () {
      spec.onBidWon({
        mediaType: 'video',
        vastXml: '<?xml version="1.0"?><VAST version="2.0"></VAST>',
        cpm: 1.5,
      });
      const calledUrl = utils.triggerPixel.getCall(0).args[0];
      const qMatch = calledUrl.match(/[?&]q=([^&]*)/);
      const decodedBid = JSON.parse(atob(decodeURIComponent(qMatch[1])));
      expect(decodedBid.uuid).to.be.null;
      expect(decodedBid.ad).to.be.undefined;
    });
  });

  describe('onTimeout', function () {
    const timeoutData = [{
      timeout: null
    }];

    it('should exists and be a function', () => {
      expect(spec.onTimeout).to.exist.and.to.be.a('function');
    });
    it('should include timeoutData', function () {
      expect(spec.onTimeout(timeoutData)).to.be.undefined;
    });
  });

  it(`onSetTargeting is present and type function`, function () {
    expect(spec.onSetTargeting).to.exist.and.to.be.a('function');
  });
});
