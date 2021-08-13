/* globals describe, it, beforeEach, afterEach, sinon */
import {expect} from 'chai'
import * as utils from 'src/utils.js'
import {VIDEO, BANNER} from 'src/mediaTypes.js'
import {Renderer} from 'src/Renderer.js'
import {adapter} from 'modules/unrulyBidAdapter.js'

describe('UnrulyAdapter', function () {
  function createOutStreamExchangeBid({
    adUnitCode = 'placement2',
    statusCode = 1,
    requestId = 'foo',
    vastUrl = 'https://targeting.unrulymedia.com/in_article?uuid=74544e00-d43b-4f3a-a799-69d22ce979ce&supported_mime_type=application/javascript&supported_mime_type=video/mp4&tj=%7B%22site%22%3A%7B%22lang%22%3A%22en-GB%22%2C%22ref%22%3A%22%22%2C%22page%22%3A%22https%3A%2F%2Fdemo.unrulymedia.com%2FinArticle%2Finarticle_nypost_upbeat%2Ftravel_magazines.html%22%2C%22domain%22%3A%22demo.unrulymedia.com%22%7D%2C%22user%22%3A%7B%22profile%22%3A%7B%22quantcast%22%3A%7B%22segments%22%3A%5B%7B%22id%22%3A%22D%22%7D%2C%7B%22id%22%3A%22T%22%7D%5D%7D%7D%7D%7D&video_width=618&video_height=347'
  }) {
    return {
      'ext': {
        'statusCode': statusCode,
        'renderer': {
          'id': 'unruly_inarticle',
          'config': {
            'siteId': 123456,
            'targetingUUID': 'xxx-yyy-zzz'
          },
          'url': 'https://video.unrulymedia.com/native/prebid-loader.js'
        },
        'adUnitCode': adUnitCode
      },
      'cpm': 20,
      'bidderCode': 'unruly',
      'width': 323,
      'vastUrl': vastUrl,
      'requestId': requestId,
      'creativeId': requestId,
      'height': 323,
      'netRevenue': true,
      'ttl': 360,
      'currency': 'USD',
      'meta': {
        'mediaType': 'video',
        'videoContext': 'outstream'
      }
    }
  }

  const createExchangeResponse = (...bids) => ({
    body: {bids}
  });

  const inStreamServerResponse = {
    'requestId': '262594d5d1f8104',
    'cpm': 0.3825,
    'currency': 'USD',
    'width': 640,
    'height': 480,
    'creativeId': 'cr-test-video-3',
    'netRevenue': true,
    'ttl': 350,
    'vastUrl': 'https://adserve.rhythmxchange.dvl/rtbtest/nurlvast?event=impnurl&doc_type=testad&doc_version=2&crid=cr-test-video-3&ssp=2057&pubid=545454&placementid=1052819&oppid=b516bc57-0475-4377-bdc6-369c44b31d46&mediatype=site&attempt_ts=1622740567081&extra=1',
    'meta': {
      'mediaType': 'video',
      'videoContext': 'instream'
    }
  };

  const inStreamServerResponseWithVastXml = {
    'requestId': '262594d5d1f8104',
    'cpm': 0.3825,
    'currency': 'USD',
    'width': 640,
    'height': 480,
    'creativeId': 'cr-test-video-3',
    'netRevenue': true,
    'ttl': 350,
    'vastXml': 'https://adserve.rhythmxchange.dvl/rtbtest/nurlvast?event=impnurl&doc_type=testad&doc_version=2&crid=cr-test-video-3&ssp=2057&pubid=545454&placementid=1052819&oppid=b516bc57-0475-4377-bdc6-369c44b31d46&mediatype=site&attempt_ts=1622740567081&extra=1',
    'meta': {
      'mediaType': 'video',
      'videoContext': 'instream'
    }
  };

  const bannerServerResponse = {
    'requestId': '2de3a9047fa9c6',
    'cpm': 5.34,
    'currency': 'USD',
    'width': 300,
    'height': 250,
    'creativeId': 'cr-test-banner-1',
    'netRevenue': true,
    'ttl': 350,
    'ad': "<script src='http://a-ap.1rx.io/rtbtest/js?event=impservedoc_type=testad&doc_version=2&crid=cr-test-banner-1&ssp=2129&pubid=100144&placementid=215243&oppid=b82f5c10-213e-49f6-96f7-910d7e331055&mediatype=site&attempt_ts=1623162232956&extra=1'></script>",
    'meta': {
      'mediaType': 'banner'
    }
  };

  let sandbox;
  let fakeRenderer;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(utils, 'logError');
    sandbox.stub(Renderer, 'install');

    fakeRenderer = {
      setRender: sinon.stub()
    };
    Renderer.install.returns(fakeRenderer)
  });

  afterEach(function () {
    sandbox.restore();
    delete parent.window.unruly
  });

  it('should expose Unruly Bidder code', function () {
    expect(adapter.code).to.equal('unruly')
  });

  it('should contain the VIDEO mediaType', function () {
    expect(adapter.supportedMediaTypes).to.deep.equal([VIDEO, BANNER])
  });

  describe('isBidRequestValid', function () {
    it('should be a function', function () {
      expect(typeof adapter.isBidRequestValid).to.equal('function')
    });
    it('should return false if bid is false', function () {
      expect(adapter.isBidRequestValid()).to.be.false;
    });
    it('should return true if bid.mediaType is "banner"', function () {
      const mockBid = {
        mediaTypes: {
          banner: {
            sizes: [
              [600, 500],
              [300, 250]
            ]
          }
        },
        params: {
          siteId: 233261
        }
      };
      expect(adapter.isBidRequestValid(mockBid)).to.be.true;
    });
    it('should return true if bid.mediaTypes.video.context is "outstream"', function () {
      const mockBid = {
        mediaTypes: {
          video: {
            context: 'outstream',
            mimes: ['video/mp4'],
            playerSize: [[640, 480]]
          }
        },
        params: {
          siteId: 233261
        }
      };
      expect(adapter.isBidRequestValid(mockBid)).to.be.true;
    });
    it('should return true if bid.mediaTypes.video.context is "instream"', function () {
      const mockBid = {
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mp4'],
            playerSize: [[640, 480]]
          }
        },
        params: {
          siteId: 233261
        }
      };
      expect(adapter.isBidRequestValid(mockBid)).to.be.true;
    });
    it('should return false if bid.mediaTypes.video.context is not "instream" or "outstream"', function () {
      const mockBid = {
        mediaTypes: {
          video: {
            context: 'context',
            mimes: ['video/mp4'],
            playerSize: [[640, 480]]
          }
        },
        params: {
          siteId: 233261
        }
      };
      expect(adapter.isBidRequestValid(mockBid)).to.be.false;
    });
    it('should return false if bid.mediaTypes.video.context not exist', function () {
      const mockBid = {
        mediaTypes: {
          video: {
            mimes: ['video/mp4'],
            playerSize: [[640, 480]]
          }
        },
        params: {
          siteId: 233261
        }
      };
      expect(adapter.isBidRequestValid(mockBid)).to.be.false;
    });
    it('should return false if bid.mediaType is not "video" or "banner"', function () {
      const mockBid = {
        mediaTypes: {
          native: {
            image: {
              sizes: [300, 250]
            }
          }
        },
        params: {
          siteId: 233261
        }
      };
      expect(adapter.isBidRequestValid(mockBid)).to.be.false;
    });
    it('should return false if bid.mediaTypes is empty', function () {
      const mockBid = {
        mediaTypes: {},
        params: {
          siteId: 233261
        }
      };
      expect(adapter.isBidRequestValid(mockBid)).to.be.false;
    });
    it('should return false if bid.params.siteId not exist', function () {
      const mockBid = {
        mediaTypes: {
          video: {
            context: 'outstream',
            mimes: ['video/mp4'],
            playerSize: [[640, 480]]
          }
        },
        params: {
          targetingUUID: 233261
        }
      };
      expect(adapter.isBidRequestValid(mockBid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let mockBidRequests;
    beforeEach(function () {
      mockBidRequests = {
        'bidderCode': 'unruly',
        'bids': [
          {
            'bidder': 'unruly',
            'params': {
              'siteId': 233261,
            },
            'mediaTypes': {
              'video': {
                'context': 'outstream',
                'mimes': [
                  'video/mp4'
                ],
                'playerSize': [
                  [
                    640,
                    480
                  ]
                ]
              }
            },
            'adUnitCode': 'video2',
            'transactionId': 'a89619e3-137d-4cc5-9ed4-58a0b2a0bbc2',
            'sizes': [
              [
                640,
                480
              ]
            ],
            'bidId': '27a3ee1626a5c7',
            'bidderRequestId': '12e00d17dff07b',
          }
        ]
      };
    });

    it('should be a function', function () {
      expect(typeof adapter.buildRequests).to.equal('function');
    });
    it('should return an object', function () {
      // const mockBidRequests = ['mockBid'];
      expect(typeof adapter.buildRequests(mockBidRequests.bids, mockBidRequests)).to.equal('object')
    });
    it('should return an array with 2 items when the bids has different siteId\'s', function () {
      mockBidRequests = {
        'bidderCode': 'unruly',
        'bids': [
          {
            'bidder': 'unruly',
            'params': {
              'siteId': 233261,
            },
            'mediaTypes': {
              'video': {
                'context': 'outstream',
                'mimes': [
                  'video/mp4'
                ],
                'playerSize': [
                  [
                    640,
                    480
                  ]
                ]
              }
            },
            'adUnitCode': 'video2',
            'transactionId': 'a89619e3-137d-4cc5-9ed4-58a0b2a0bbc2',
            'sizes': [
              [
                640,
                480
              ]
            ],
            'bidId': '27a3ee1626a5c7',
            'bidderRequestId': '12e00d17dff07b',
          },
          {
            'bidder': 'unruly',
            'params': {
              'siteId': 2234554,
            },
            'mediaTypes': {
              'video': {
                'context': 'outstream',
                'mimes': [
                  'video/mp4'
                ],
                'playerSize': [
                  [
                    640,
                    480
                  ]
                ]
              }
            },
            'adUnitCode': 'video2',
            'transactionId': 'a89619e3-137d-4cc5-9ed4-58a0b2a0bbc2',
            'sizes': [
              [
                640,
                480
              ]
            ],
            'bidId': '27a3ee1626a5c7',
            'bidderRequestId': '12e00d17dff07b',
          }
        ]
      };

      let result = adapter.buildRequests(mockBidRequests.bids, mockBidRequests);
      expect(typeof result).to.equal('object');
      expect(result.length).to.equal(2);
      expect(result[0].data.bidderRequest.bids.length).to.equal(1);
      expect(result[1].data.bidderRequest.bids.length).to.equal(1);
    });
    it('should return an array with 1 items when the bids has same siteId', function () {
      mockBidRequests = {
        'bidderCode': 'unruly',
        'bids': [
          {
            'bidder': 'unruly',
            'params': {
              'siteId': 233261,
            },
            'mediaTypes': {
              'video': {
                'context': 'outstream',
                'mimes': [
                  'video/mp4'
                ],
                'playerSize': [
                  [
                    640,
                    480
                  ]
                ]
              }
            },
            'adUnitCode': 'video2',
            'transactionId': 'a89619e3-137d-4cc5-9ed4-58a0b2a0bbc2',
            'sizes': [
              [
                640,
                480
              ]
            ],
            'bidId': '27a3ee1626a5c7',
            'bidderRequestId': '12e00d17dff07b',
          },
          {
            'bidder': 'unruly',
            'params': {
              'siteId': 233261,
            },
            'mediaTypes': {
              'video': {
                'context': 'outstream',
                'mimes': [
                  'video/mp4'
                ],
                'playerSize': [
                  [
                    640,
                    480
                  ]
                ]
              }
            },
            'adUnitCode': 'video2',
            'transactionId': 'a89619e3-137d-4cc5-9ed4-58a0b2a0bbc2',
            'sizes': [
              [
                640,
                480
              ]
            ],
            'bidId': '27a3ee1626a5c7',
            'bidderRequestId': '12e00d17dff07b',
          }
        ]
      };

      let result = adapter.buildRequests(mockBidRequests.bids, mockBidRequests);
      expect(typeof result).to.equal('object');
      expect(result.length).to.equal(1);
      expect(result[0].data.bidderRequest.bids.length).to.equal(2);
    });
    it('should return a server request with a valid exchange url', function () {
      expect(adapter.buildRequests(mockBidRequests.bids, mockBidRequests)[0].url).to.equal('https://targeting.unrulymedia.com/unruly_prebid')
    });
    it('should return a server request with a the end point url instead of the exchange url', function () {
      mockBidRequests.bids[0].params.endpoint = '//testendpoint.com';
      expect(adapter.buildRequests(mockBidRequests.bids, mockBidRequests)[0].url).to.equal('//testendpoint.com');
    });
    it('should return a server request with method === POST', function () {
      expect(adapter.buildRequests(mockBidRequests.bids, mockBidRequests)[0].method).to.equal('POST');
    });
    it('should ensure contentType is `application/json`', function () {
      expect(adapter.buildRequests(mockBidRequests.bids, mockBidRequests)[0].options).to.deep.equal({
        contentType: 'application/json'
      });
    });
    it('should return a server request with valid payload', function () {
      const expectedResult = {
        bidderRequest: {
          'bids': [
            {
              'bidder': 'unruly',
              'params': {
                'siteId': 233261
              },
              'mediaTypes': {
                'video': {
                  'context': 'outstream',
                  'mimes': [
                    'video/mp4'
                  ],
                  'playerSize': [
                    [
                      640,
                      480
                    ]
                  ],
                  'floor': 0
                }
              },
              'adUnitCode': 'video2',
              'transactionId': 'a89619e3-137d-4cc5-9ed4-58a0b2a0bbc2',
              'sizes': [
                [
                  640,
                  480
                ]
              ],
              'bidId': '27a3ee1626a5c7',
              'bidderRequestId': '12e00d17dff07b'
            }
          ],
          'invalidBidsCount': 0
        }
      };

      expect(adapter.buildRequests(mockBidRequests.bids, mockBidRequests)[0].data).to.deep.equal(expectedResult)
    });
    it('should return request and remove the duplicate sizes', function () {
      mockBidRequests = {
        'bidderCode': 'unruly',
        'bids': [
          {
            'bidder': 'unruly',
            'params': {
              'siteId': 233261,
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    640,
                    480
                  ],
                  [
                    640,
                    480
                  ],
                  [
                    300,
                    250
                  ],
                  [
                    300,
                    250
                  ]
                ]
              }
            },
            'adUnitCode': 'video2',
            'transactionId': 'a89619e3-137d-4cc5-9ed4-58a0b2a0bbc2',
            'bidId': '27a3ee1626a5c7',
            'bidderRequestId': '12e00d17dff07b',
          }
        ]
      };

      const expectedResult = {
        bidderRequest: {
          'bids': [
            {
              'bidder': 'unruly',
              'params': {
                'siteId': 233261
              },
              'mediaTypes': {
                'banner': {
                  'sizes': [
                    [
                      640,
                      480
                    ],
                    [
                      300,
                      250
                    ]
                  ],
                  'floor': 0
                }
              },
              'adUnitCode': 'video2',
              'transactionId': 'a89619e3-137d-4cc5-9ed4-58a0b2a0bbc2',
              'bidId': '27a3ee1626a5c7',
              'bidderRequestId': '12e00d17dff07b',
            }
          ],
          'invalidBidsCount': 0
        }
      };

      let result = adapter.buildRequests(mockBidRequests.bids, mockBidRequests);
      expect(result[0].data).to.deep.equal(expectedResult);
    });

    it('should return have the floor value from the bid', function () {
      mockBidRequests = {
        'bidderCode': 'unruly',
        'bids': [
          {
            'bidder': 'unruly',
            'params': {
              'siteId': 233261,
            },
            'mediaTypes': {
              'banner': {
                'sizes': [
                  [
                    640,
                    480
                  ]
                ]
              }
            },
            'floors': {
              'enforceFloors': true,
              'currency': 'USD',
              'schema': {
                'fields': [
                  'mediaType'
                ]
              },
              'values': {
                'banner': 3
              },
            },
            'adUnitCode': 'video2',
            'transactionId': 'a89619e3-137d-4cc5-9ed4-58a0b2a0bbc2',
            'bidId': '27a3ee1626a5c7',
            'bidderRequestId': '12e00d17dff07b',
          }
        ]
      };

      const getFloor = (data) => {
        return {floor: 3}
      };

      mockBidRequests.bids[0].getFloor = getFloor;

      const expectedResult = {
        bidderRequest: {
          'bids': [
            {
              'bidder': 'unruly',
              'params': {
                'siteId': 233261
              },
              'mediaTypes': {
                'banner': {
                  'sizes': [
                    [
                      640,
                      480
                    ]
                  ],
                  'floor': 3
                }
              },
              'floors': {
                'enforceFloors': true,
                'currency': 'USD',
                'schema': {
                  'fields': [
                    'mediaType'
                  ]
                },
                'values': {
                  'banner': 3
                },
              },
              getFloor: getFloor,
              'adUnitCode': 'video2',
              'transactionId': 'a89619e3-137d-4cc5-9ed4-58a0b2a0bbc2',
              'bidId': '27a3ee1626a5c7',
              'bidderRequestId': '12e00d17dff07b',
            }
          ],
          'invalidBidsCount': 0
        }
      };

      let result = adapter.buildRequests(mockBidRequests.bids, mockBidRequests);
      expect(result[0].data).to.deep.equal(expectedResult);
    });
  });

  describe('interpretResponse', function () {
    it('should be a function', function () {
      expect(typeof adapter.interpretResponse).to.equal('function');
    });
    it('should return [] when serverResponse is undefined', function () {
      expect(adapter.interpretResponse()).to.deep.equal([]);
    });
    it('should return [] when  serverResponse has no bids', function () {
      const mockServerResponse = {body: {bids: []}};
      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([])
    });
    it('should return array of bids when receive a successful response from server', function () {
      const mockExchangeBid = createOutStreamExchangeBid({adUnitCode: 'video1', requestId: 'mockBidId'});
      const mockServerResponse = createExchangeResponse(mockExchangeBid);
      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([
        {
          'ext': {
            'statusCode': 1,
            'renderer': {
              'id': 'unruly_inarticle',
              'config': {
                'siteId': 123456,
                'targetingUUID': 'xxx-yyy-zzz'
              },
              'url': 'https://video.unrulymedia.com/native/prebid-loader.js'
            },
            'adUnitCode': 'video1'
          },
          requestId: 'mockBidId',
          bidderCode: 'unruly',
          cpm: 20,
          width: 323,
          height: 323,
          vastUrl: 'https://targeting.unrulymedia.com/in_article?uuid=74544e00-d43b-4f3a-a799-69d22ce979ce&supported_mime_type=application/javascript&supported_mime_type=video/mp4&tj=%7B%22site%22%3A%7B%22lang%22%3A%22en-GB%22%2C%22ref%22%3A%22%22%2C%22page%22%3A%22https%3A%2F%2Fdemo.unrulymedia.com%2FinArticle%2Finarticle_nypost_upbeat%2Ftravel_magazines.html%22%2C%22domain%22%3A%22demo.unrulymedia.com%22%7D%2C%22user%22%3A%7B%22profile%22%3A%7B%22quantcast%22%3A%7B%22segments%22%3A%5B%7B%22id%22%3A%22D%22%7D%2C%7B%22id%22%3A%22T%22%7D%5D%7D%7D%7D%7D&video_width=618&video_height=347',
          netRevenue: true,
          creativeId: 'mockBidId',
          ttl: 360,
          'meta': {
            'mediaType': 'video',
            'videoContext': 'outstream'
          },
          currency: 'USD',
          renderer: fakeRenderer,
          mediaType: 'video'
        }
      ])
    });

    it('should initialize and set the renderer', function () {
      expect(Renderer.install.called).to.be.false;
      expect(fakeRenderer.setRender.called).to.be.false;

      const mockReturnedBid = createOutStreamExchangeBid({adUnitCode: 'video1', requestId: 'mockBidId'});
      const mockRenderer = {
        url: 'value: mockRendererURL',
        config: {
          siteId: 123456,
          targetingUUID: 'xxx-yyy-zzz'
        }
      };
      mockReturnedBid.ext.renderer = mockRenderer;
      const mockServerResponse = createExchangeResponse(mockReturnedBid);

      adapter.interpretResponse(mockServerResponse);

      expect(Renderer.install.calledOnce).to.be.true;
      sinon.assert.calledWithExactly(
        Renderer.install,
        Object.assign({}, mockRenderer)
      );

      sinon.assert.calledOnce(fakeRenderer.setRender);
      sinon.assert.calledWithExactly(fakeRenderer.setRender, sinon.match.func)
    });

    it('should return [] and log if bidResponse renderer config is not available', function () {
      sinon.assert.notCalled(utils.logError);

      expect(Renderer.install.called).to.be.false;
      expect(fakeRenderer.setRender.called).to.be.false;

      const mockReturnedBid = createOutStreamExchangeBid({adUnitCode: 'video1', requestId: 'mockBidId'});
      const mockRenderer = {
        url: 'value: mockRendererURL'
      };
      mockReturnedBid.ext.renderer = mockRenderer;
      const mockServerResponse = createExchangeResponse(mockReturnedBid);

      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([]);

      const logErrorCalls = utils.logError.getCalls();
      expect(logErrorCalls.length).to.equal(1);

      const [configErrorCall] = logErrorCalls;

      expect(configErrorCall.args.length).to.equal(1);
      expect(configErrorCall.args[0].message).to.equal('UnrulyBidAdapter: Missing renderer config.');
    });

    it('should return [] and log if siteId is not available', function () {
      sinon.assert.notCalled(utils.logError);

      expect(Renderer.install.called).to.be.false;
      expect(fakeRenderer.setRender.called).to.be.false;

      const mockReturnedBid = createOutStreamExchangeBid({adUnitCode: 'video1', requestId: 'mockBidId'});
      const mockRenderer = {
        url: 'value: mockRendererURL',
        config: {}
      };
      mockReturnedBid.ext.renderer = mockRenderer;
      const mockServerResponse = createExchangeResponse(mockReturnedBid);

      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([]);

      const logErrorCalls = utils.logError.getCalls();
      expect(logErrorCalls.length).to.equal(1);

      const [siteIdErrorCall] = logErrorCalls;

      expect(siteIdErrorCall.args.length).to.equal(1);
      expect(siteIdErrorCall.args[0].message).to.equal('UnrulyBidAdapter: Missing renderer siteId.');
    });

    it('bid is placed on the bid queue when render is called', function () {
      const exchangeBid = createOutStreamExchangeBid({adUnitCode: 'video', vastUrl: 'value: vastUrl'});
      const exchangeResponse = createExchangeResponse(exchangeBid);

      adapter.interpretResponse(exchangeResponse);

      sinon.assert.calledOnce(fakeRenderer.setRender);
      fakeRenderer.setRender.firstCall.args[0]();

      expect(window.top).to.have.deep.nested.property('unruly.native.prebid.uq');

      const uq = window.top.unruly.native.prebid.uq;
      const sentRendererConfig = uq[0][1];

      expect(uq[0][0]).to.equal('render');
      expect(sentRendererConfig.vastUrl).to.equal('value: vastUrl');
      expect(sentRendererConfig.renderer).to.equal(fakeRenderer);
      expect(sentRendererConfig.adUnitCode).to.equal('video')
    });

    it('should ensure that renderer is placed in Prebid supply mode', function () {
      const mockExchangeBid = createOutStreamExchangeBid({adUnitCode: 'video1', requestId: 'mockBidId'});
      const mockServerResponse = createExchangeResponse(mockExchangeBid);

      expect('unruly' in window.parent).to.equal(false);

      adapter.interpretResponse(mockServerResponse);

      const supplyMode = window.parent.unruly.native.supplyMode;

      expect(supplyMode).to.equal('prebid');
    });

    it('should return correct response when ad type is instream with vastUrl', function () {
      const mockServerResponse = createExchangeResponse(inStreamServerResponse);
      const expectedResponse = inStreamServerResponse;
      expectedResponse.mediaType = 'video';

      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([expectedResponse]);
    });

    it('should return correct response when ad type is instream with vastXml', function () {
      const mockServerResponse = {...createExchangeResponse(inStreamServerResponseWithVastXml)};
      const expectedResponse = inStreamServerResponseWithVastXml;
      expectedResponse.mediaType = 'video';

      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([expectedResponse]);
    });

    it('should return [] and log if no vastUrl in instream response', function () {
      const {vastUrl, ...inStreamServerResponseNoVast} = inStreamServerResponse;
      const mockServerResponse = createExchangeResponse(inStreamServerResponseNoVast);

      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([]);

      const logErrorCalls = utils.logError.getCalls();

      expect(logErrorCalls.length).to.equal(1);

      const [siteIdErrorCall] = logErrorCalls;

      expect(siteIdErrorCall.args.length).to.equal(1);
      expect(siteIdErrorCall.args[0].message).to.equal('UnrulyBidAdapter: Missing vastUrl or vastXml config.');
    });

    it('should return correct response when ad type is banner', function () {
      const mockServerResponse = createExchangeResponse(bannerServerResponse);
      const expectedResponse = bannerServerResponse;
      expectedResponse.mediaType = 'banner';

      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([expectedResponse]);
    });

    it('should return [] and log if no ad in banner response', function () {
      const {ad, ...bannerServerResponseNoAd} = bannerServerResponse;
      const mockServerResponse = createExchangeResponse(bannerServerResponseNoAd);

      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([]);

      const logErrorCalls = utils.logError.getCalls();

      expect(logErrorCalls.length).to.equal(1);

      const [siteIdErrorCall] = logErrorCalls;

      expect(siteIdErrorCall.args.length).to.equal(1);
      expect(siteIdErrorCall.args[0].message).to.equal('UnrulyBidAdapter: Missing ad config.');
    });

    it('should return correct response for multiple bids', function () {
      const outStreamServerResponse = createOutStreamExchangeBid({adUnitCode: 'video1', requestId: 'mockBidId'});
      const mockServerResponse = createExchangeResponse(outStreamServerResponse, inStreamServerResponse, bannerServerResponse);
      const expectedOutStreamResponse = outStreamServerResponse;
      expectedOutStreamResponse.mediaType = 'video';

      const expectedInStreamResponse = inStreamServerResponse;
      expectedInStreamResponse.mediaType = 'video';

      const expectedBannerResponse = bannerServerResponse;
      expectedBannerResponse.mediaType = 'banner';

      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([expectedOutStreamResponse, expectedInStreamResponse, expectedBannerResponse]);
    });

    it('should return only valid bids', function () {
      const {ad, ...bannerServerResponseNoAd} = bannerServerResponse;
      const mockServerResponse = createExchangeResponse(bannerServerResponseNoAd, inStreamServerResponse);
      const expectedInStreamResponse = inStreamServerResponse;
      expectedInStreamResponse.mediaType = 'video';

      expect(adapter.interpretResponse(mockServerResponse)).to.deep.equal([expectedInStreamResponse]);

      const logErrorCalls = utils.logError.getCalls();

      expect(logErrorCalls.length).to.equal(1);

      const [siteIdErrorCall] = logErrorCalls;

      expect(siteIdErrorCall.args.length).to.equal(1);
      expect(siteIdErrorCall.args[0].message).to.equal('UnrulyBidAdapter: Missing ad config.');
    });
  });
});
