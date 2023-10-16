import {assert} from 'chai';
import {spec} from 'modules/mediaforceBidAdapter.js';
import * as utils from '../../../src/utils.js';
import {BANNER, NATIVE} from '../../../src/mediaTypes.js';

describe('mediaforce bid adapter', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  function getLanguage() {
    let language = navigator.language ? 'language' : 'userLanguage';
    return navigator[language].split('-')[0];
  }

  const language = getLanguage();
  const baseUrl = 'https://rtb.mfadsrvr.com';

  describe('isBidRequestValid()', function () {
    const defaultBid = {
      bidder: 'mediaforce',
      params: {
        property: '10433394',
        bidfloor: 0,
      },
    };

    it('should not accept bid without required params', function () {
      assert.equal(spec.isBidRequestValid(defaultBid), false);
    });

    it('should return false when params are not passed', function () {
      let bid = utils.deepClone(defaultBid);
      delete bid.params;
      assert.equal(spec.isBidRequestValid(bid), false);
    });

    it('should return false when valid params are not passed', function () {
      let bid = utils.deepClone(defaultBid);
      bid.params = {placement_id: '', publisher_id: ''};
      assert.equal(spec.isBidRequestValid(bid), false);
    });

    it('should return true when valid params are passed', function () {
      let bid = utils.deepClone(defaultBid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      bid.params = {publisher_id: 2, placement_id: '123'};
      assert.equal(spec.isBidRequestValid(bid), true);
    });
  });

  describe('buildRequests()', function () {
    const defaultBid = {
      bidder: 'mediaforce',
      params: {
        publisher_id: 'pub123',
        placement_id: '202',
      },
      nativeParams: {
        title: {
          required: true,
          len: 800
        },
        image: {
          required: true,
          sizes: [300, 250],
        },
        sponsoredBy: {
          required: true
        }
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        },
        native: {
          title: {
            required: true,
            len: 800
          },
          image: {
            required: true,
            sizes: [300, 250],
          },
          sponsoredBy: {
            required: true
          }
        }
      },
      transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b',
    };

    const multiBid = [
      {
        publisher_id: 'pub123',
        placement_id: '202',
      },
      {
        publisher_id: 'pub123',
        placement_id: '203',
      },
      {
        publisher_id: 'pub124',
        placement_id: '202',
      },
      {
        publisher_id: 'pub123',
        placement_id: '203',
        transactionId: '8df76688-1618-417a-87b1-60ad046841c9'
      }
    ].map(({publisher_id, placement_id, transactionId}) => {
      return {
        bidder: 'mediaforce',
        params: {publisher_id, placement_id},
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [600, 400]]
          }
        },
        transactionId: transactionId || 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b'
      }
    });

    const refererInfo = {
      ref: 'https://www.prebid.org',
      reachedTop: true,
      stack: [
        'https://www.prebid.org/page.html',
        'https://www.prebid.org/iframe1.html',
      ]
    };

    const requestUrl = `${baseUrl}/header_bid`;
    const dnt = utils.getDNT() ? 1 : 0;
    const secure = window.location.protocol === 'https:' ? 1 : 0;
    const pageUrl = window.location.href;
    const timeout = 1500;

    it('should return undefined if no validBidRequests passed', function () {
      assert.equal(spec.buildRequests([]), undefined);
    });

    it('should return proper request url: no refererInfo', function () {
      let [request] = spec.buildRequests([defaultBid]);
      assert.equal(request.url, requestUrl);
    });

    it('should return proper banner imp', function () {
      let bid = utils.deepClone(defaultBid);
      bid.params.bidfloor = 0;

      let bidRequests = [bid];
      let bidderRequest = {
        bids: bidRequests,
        refererInfo: refererInfo,
        timeout: timeout,
        auctionId: '210a474e-88f0-4646-837f-4253b7cf14fb'
      };

      let [request] = spec.buildRequests(bidRequests, bidderRequest);

      let data = JSON.parse(request.data);
      assert.deepEqual(data, {
        id: data.id,
        tmax: timeout,
        ext: {
          mediaforce: {
            hb_key: bidderRequest.auctionId
          }
        },
        site: {
          id: bid.params.publisher_id,
          publisher: {id: bid.params.publisher_id},
          ref: encodeURIComponent(refererInfo.ref),
          page: pageUrl,
        },
        device: {
          ua: navigator.userAgent,
          dnt: dnt,
          js: 1,
          language: language,
        },
        imp: [{
          tagid: bid.params.placement_id,
          secure: secure,
          bidfloor: bid.params.bidfloor,
          ext: {
            mediaforce: {
              transactionId: bid.transactionId
            }
          },
          banner: {w: 300, h: 250},
          native: {
            ver: '1.2',
            request: {
              assets: [
                {id: 1, title: {len: 800}, required: 1},
                {id: 3, img: {w: 300, h: 250, type: 3}, required: 1},
                {id: 5, data: {type: 1}, required: 1}
              ],
              context: 1,
              plcmttype: 1,
              ver: '1.2'
            }
          },
        }],
      });

      assert.deepEqual(request, {
        method: 'POST',
        url: requestUrl,
        data: '{"id":"' + data.id + '","site":{"page":"' + pageUrl + '","ref":"https%3A%2F%2Fwww.prebid.org","id":"pub123","publisher":{"id":"pub123"}},"device":{"ua":"' + navigator.userAgent + '","js":1,"dnt":' + dnt + ',"language":"' + language + '"},"ext":{"mediaforce":{"hb_key":"210a474e-88f0-4646-837f-4253b7cf14fb"}},"tmax":1500,"imp":[{"tagid":"202","secure":' + secure + ',"bidfloor":0,"ext":{"mediaforce":{"transactionId":"d45dd707-a418-42ec-b8a7-b70a6c6fab0b"}},"banner":{"w":300,"h":250},"native":{"ver":"1.2","request":{"assets":[{"required":1,"id":1,"title":{"len":800}},{"required":1,"id":3,"img":{"type":3,"w":300,"h":250}},{"required":1,"id":5,"data":{"type":1}}],"context":1,"plcmttype":1,"ver":"1.2"}}}]}',
      });
    });

    it('multiple sizes', function () {
      let bid = utils.deepClone(defaultBid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 600], [300, 250]],
        }
      };

      let [request] = spec.buildRequests([bid]);
      let data = JSON.parse(request.data);
      assert.deepEqual(data.imp[0].banner, {w: 300, h: 600, format: [{w: 300, h: 250}]});
    });

    it('should return proper requests for multiple imps', function () {
      let bidderRequest = {
        bids: multiBid,
        refererInfo: refererInfo,
        timeout: timeout,
        auctionId: '210a474e-88f0-4646-837f-4253b7cf14fb'
      };

      let requests = spec.buildRequests(multiBid, bidderRequest);
      assert.equal(requests.length, 2);
      requests.forEach((req) => {
        req.data = JSON.parse(req.data);
      });

      assert.deepEqual(requests, [
        {
          method: 'POST',
          url: requestUrl,
          data: {
            id: requests[0].data.id,
            tmax: timeout,
            ext: {
              mediaforce: {
                hb_key: bidderRequest.auctionId
              }
            },
            site: {
              id: 'pub123',
              publisher: {id: 'pub123'},
              ref: encodeURIComponent(refererInfo.ref),
              page: pageUrl,
            },
            device: {
              ua: navigator.userAgent,
              dnt: dnt,
              js: 1,
              language: language,
            },
            imp: [{
              tagid: '202',
              secure: secure,
              bidfloor: 0,
              ext: {
                mediaforce: {
                  transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b'
                }
              },
              banner: {w: 300, h: 250, format: [{w: 600, h: 400}]},
            }, {
              tagid: '203',
              secure: secure,
              bidfloor: 0,
              ext: {
                mediaforce: {
                  transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b'
                }
              },
              banner: {w: 300, h: 250, format: [{w: 600, h: 400}]},
            }, {
              tagid: '203',
              secure: secure,
              bidfloor: 0,
              ext: {
                mediaforce: {
                  transactionId: '8df76688-1618-417a-87b1-60ad046841c9'
                }
              },
              banner: {w: 300, h: 250, format: [{w: 600, h: 400}]},
            }]
          }
        },
        {
          method: 'POST',
          url: requestUrl,
          data: {
            id: requests[1].data.id,
            tmax: timeout,
            ext: {
              mediaforce: {
                hb_key: bidderRequest.auctionId
              }
            },
            site: {
              id: 'pub124',
              publisher: {id: 'pub124'},
              ref: encodeURIComponent(refererInfo.ref),
              page: pageUrl,
            },
            device: {
              ua: navigator.userAgent,
              dnt: dnt,
              js: 1,
              language: language,
            },
            imp: [{
              tagid: '202',
              secure: secure,
              bidfloor: 0,
              ext: {
                mediaforce: {
                  transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b'
                }
              },
              banner: {w: 300, h: 250, format: [{w: 600, h: 400}]},
            }]
          }
        }
      ]);
    });
  });

  describe('interpretResponse() banner', function () {
    it('not successfull response', function () {
      assert.deepEqual(spec.interpretResponse(), []);
    });

    it('successfull response', function () {
      let bid = {
        price: 3,
        w: 100,
        id: '65599d0a-42d2-446a-9d39-6086c1433ffe',
        burl: `${baseUrl}/burl/\${AUCTION_PRICE}`,
        cid: '2_ssl',
        h: 100,
        cat: ['IAB1-1'],
        dealid: '3901521',
        crid: '2_ssl',
        impid: '2b3c9d103723a7',
        adid: '2_ssl',
        adm: `<a href="${baseUrl}/click2/"><img width=100 height=100 src="${baseUrl}/image2"></a>`
      };

      let response = {
        body: {
          seatbid: [{
            bid: [bid]
          }],
          cur: 'USD',
          id: '620190c2-7eef-42fa-91e2-f5c7fbc2bdd3'
        }
      };

      let bids = spec.interpretResponse(response);
      assert.deepEqual(bids, ([{
        ad: bid.adm,
        cpm: bid.price,
        dealId: bid.dealid,
        creativeId: bid.adid,
        currency: response.body.cur,
        height: bid.h,
        netRevenue: true,
        burl: bid.burl,
        mediaType: BANNER,
        requestId: bid.impid,
        ttl: 300,
        meta: { advertiserDomains: [] },
        width: bid.w,
      }]));
    });
  });

  describe('interpretResponse() native as object', function () {
    it('successfull response', function () {
      let titleText = 'Colorado Drivers With No DUI\'s Getting A Pay Day on Friday';
      let imgData = {
        url: `${baseUrl}/image`,
        w: 1200,
        h: 627
      };
      let nativeLink = `${baseUrl}/click/`;
      let nativeTracker = `${baseUrl}/imp-image`;
      let sponsoredByValue = 'Comparisons.org';
      let bodyValue = 'Drivers With No Tickets In 3 Years Should Do This On June';
      let bid = {
        price: 3,
        id: '65599d0a-42d2-446a-9d39-6086c1433ffe',
        burl: `${baseUrl}/burl/\${AUCTION_PRICE}`,
        cid: '2_ssl',
        cat: ['IAB1-1'],
        crid: '2_ssl',
        impid: '2b3c9d103723a7',
        adid: '2_ssl',
        ext: {
          advertiser_name: 'MediaForce',
          native: {
            link: {url: nativeLink},
            assets: [{
              id: 1,
              title: {text: titleText},
              required: 1
            }, {
              id: 3,
              img: imgData
            }, {
              id: 5,
              data: {value: sponsoredByValue}
            }, {
              id: 4,
              data: {value: bodyValue}
            }],
            imptrackers: [nativeTracker],
            ver: '1'
          },
          language: 'en',
          agency_name: 'MediaForce DSP'
        }
      };

      let response = {
        body: {
          seatbid: [{
            bid: [bid]
          }],
          cur: 'USD',
          id: '620190c2-7eef-42fa-91e2-f5c7fbc2bdd3'
        }
      };

      let bids = spec.interpretResponse(response);
      assert.deepEqual(bids, ([{
        native: {
          clickUrl: nativeLink,
          clickTrackers: [],
          impressionTrackers: [nativeTracker],
          javascriptTrackers: [],
          title: titleText,
          image: {
            url: imgData.url,
            width: imgData.w,
            height: imgData.h
          },
          sponsoredBy: sponsoredByValue,
          body: bodyValue
        },
        cpm: bid.price,
        creativeId: bid.adid,
        currency: response.body.cur,
        netRevenue: true,
        burl: bid.burl,
        mediaType: NATIVE,
        requestId: bid.impid,
        ttl: 300,
        meta: { advertiserDomains: [] },
      }]));
    });
  });

  describe('interpretResponse() native as string', function () {
    it('successfull response', function () {
      let titleText = 'Colorado Drivers With No DUI\'s Getting A Pay Day on Friday';
      let imgData = {
        url: `${baseUrl}/image`,
        w: 1200,
        h: 627
      };
      let nativeLink = `${baseUrl}/click/`;
      let nativeTracker = `${baseUrl}/imp-image`;
      let sponsoredByValue = 'Comparisons.org';
      let bodyValue = 'Drivers With No Tickets In 3 Years Should Do This On June';
      let adm = JSON.stringify({
        native: {
          link: {url: nativeLink},
          assets: [{
            id: 1,
            title: {text: titleText},
            required: 1
          }, {
            id: 3,
            img: imgData
          }, {
            id: 5,
            data: {value: sponsoredByValue}
          }, {
            id: 4,
            data: {value: bodyValue}
          }],
          imptrackers: [nativeTracker],
          ver: '1'
        }
      });
      let bid = {
        price: 3,
        id: '65599d0a-42d2-446a-9d39-6086c1433ffe',
        burl: `${baseUrl}/burl/\${AUCTION_PRICE}`,
        cid: '2_ssl',
        cat: ['IAB1-1'],
        crid: '2_ssl',
        impid: '2b3c9d103723a7',
        adid: '2_ssl',
        adm: adm
      };

      let response = {
        body: {
          seatbid: [{
            bid: [bid]
          }],
          cur: 'USD',
          id: '620190c2-7eef-42fa-91e2-f5c7fbc2bdd3'
        }
      };

      let bids = spec.interpretResponse(response);
      assert.deepEqual(bids, ([{
        native: {
          clickUrl: nativeLink,
          clickTrackers: [],
          impressionTrackers: [nativeTracker],
          javascriptTrackers: [],
          title: titleText,
          image: {
            url: imgData.url,
            width: imgData.w,
            height: imgData.h
          },
          sponsoredBy: sponsoredByValue,
          body: bodyValue
        },
        cpm: bid.price,
        creativeId: bid.adid,
        currency: response.body.cur,
        netRevenue: true,
        burl: bid.burl,
        mediaType: NATIVE,
        requestId: bid.impid,
        ttl: 300,
        meta: { advertiserDomains: [] },
      }]));
    });
  });

  describe('onBidWon()', function () {
    beforeEach(function() {
      sinon.stub(utils, 'triggerPixel');
    });
    afterEach(function() {
      utils.triggerPixel.restore();
    });
    it('should expand price macros in burl', function () {
      let burl = 'burl&s=${AUCTION_PRICE}';
      let bid = {
        bidder: 'mediaforce',
        width: 300,
        height: 250,
        adId: '330a22bdea4cac',
        mediaType: 'banner',
        cpm: 0.28,
        ad: '...',
        requestId: '418b37f85e772c',
        adUnitCode: 'div-gpt-ad-1460505748561-0',
        size: '350x250',
        burl: burl,
        adserverTargeting: {
          hb_bidder: 'mediaforce',
          hb_adid: '330a22bdea4cac',
          hb_pb: '0.20',
          hb_size: '350x250'
        }
      }
      spec.onBidWon(bid);
      assert.equal(bid.burl, 'burl&s=0.20');
    });
  });
});
