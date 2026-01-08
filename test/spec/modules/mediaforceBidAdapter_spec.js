import {assert} from 'chai';
import {spec, resolveFloor} from 'modules/mediaforceBidAdapter.js';
import * as utils from '../../../src/utils.js';
import { getDNT } from 'libraries/dnt/index.js';
import {BANNER, NATIVE, VIDEO} from '../../../src/mediaTypes.js';

describe('mediaforce bid adapter', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  function getLanguage() {
    const language = navigator.language ? 'language' : 'userLanguage';
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
      const bid = utils.deepClone(defaultBid);
      delete bid.params;
      assert.equal(spec.isBidRequestValid(bid), false);
    });

    it('should return false when valid params are not passed', function () {
      const bid = utils.deepClone(defaultBid);
      bid.params = {placement_id: '', publisher_id: ''};
      assert.equal(spec.isBidRequestValid(bid), false);
    });

    it('should return true when valid params are passed', function () {
      const bid = utils.deepClone(defaultBid);
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
          required: false
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
            required: false
          }
        },
        video: {
          playerSize: [[640, 480]],
          mimes: ['video/mp4'],
          minduration: 5,
          maxduration: 30,
          protocols: [2, 3],
          linearity: 1,
          skip: 1,
          skipmin: 5,
          skipafter: 10,
          api: [1, 2]
        }
      },
      ortb2Imp: {
        ext: {
          tid: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b',
        }
      }
    };

    const refererInfo = {
      ref: 'https://www.prebid.org',
      reachedTop: true,
      stack: [
        'https://www.prebid.org/page.html',
        'https://www.prebid.org/iframe1.html',
      ]
    };

    const dnt = getDNT() ? 1 : 0;
    const secure = window.location.protocol === 'https:' ? 1 : 0;
    const pageUrl = window.location.href;
    const timeout = 1500;
    const auctionId = '210a474e-88f0-4646-837f-4253b7cf14fb';

    function createExpectedData() {
      return {
        // id property removed as it is specific for each request generated
        tmax: timeout,
        ext: {
          mediaforce: {
            hb_key: auctionId
          }
        },
        site: {
          id: defaultBid.params.publisher_id,
          publisher: {id: defaultBid.params.publisher_id},
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
          tagid: defaultBid.params.placement_id,
          secure: secure,
          bidfloor: 0,
          ext: {
            mediaforce: {
              transactionId: defaultBid.ortb2Imp.ext.tid,
            }
          },
          banner: {w: 300, h: 250},
          native: {
            ver: '1.2',
            request: {
              assets: [
                {id: 1, title: {len: 800}, required: 1},
                {id: 3, img: {w: 300, h: 250, type: 3}, required: 1},
                {id: 5, data: {type: 1}, required: 0}
              ],
              context: 1,
              plcmttype: 1,
              ver: '1.2'
            }
          },
          video: {
            mimes: ['video/mp4'],
            minduration: 5,
            maxduration: 30,
            protocols: [2, 3],
            w: 640,
            h: 480,
            startdelay: 0,
            linearity: 1,
            skip: 1,
            skipmin: 5,
            skipafter: 10,
            playbackmethod: [1],
            api: [1, 2]
          }
        }],
      };
    }

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
        ortb2Imp: {
          ext: {
            tid: transactionId || 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b'
          }
        },
      }
    });

    const requestUrl = `${baseUrl}/header_bid`;

    it('should return undefined if no validBidRequests passed', function () {
      assert.equal(spec.buildRequests([]), undefined);
    });

    it('should not stop on unsupported mediaType', function () {
      const bid = utils.deepClone(defaultBid);
      bid.mediaTypes.audio = { size: [300, 250] };

      const bidRequests = [bid];
      const bidderRequest = {
        bids: bidRequests,
        refererInfo: refererInfo,
        timeout: timeout,
        auctionId: auctionId,
      };

      const [request] = spec.buildRequests(bidRequests, bidderRequest);
      const data = JSON.parse(request.data);

      const expectedDataCopy = utils.deepClone(createExpectedData());
      assert.exists(data.id);

      expectedDataCopy.id = data.id
      assert.deepEqual(data, expectedDataCopy);
    });

    it('should return proper request url: no refererInfo', function () {
      const [request] = spec.buildRequests([defaultBid]);
      assert.equal(request.url, requestUrl);
    });

    it('should use test endpoint when is_test is true', function () {
      const bid = utils.deepClone(defaultBid);
      bid.params.is_test = true;

      const [request] = spec.buildRequests([bid]);
      assert.equal(request.url, `${baseUrl}/header_bid?debug_key=abcdefghijklmnop`);
    });

    it('should include aspect_ratios in native asset', function () {
      const bid = utils.deepClone(defaultBid);
      const aspect_ratios = [{
        min_width: 100,
        ratio_width: 4,
        ratio_height: 3
      }]
      bid.mediaTypes.native.image.aspect_ratios = aspect_ratios;
      bid.nativeParams.image.aspect_ratios = aspect_ratios;

      const [request] = spec.buildRequests([bid]);
      const nativeAsset = JSON.parse(request.data).imp[0].native.request.assets.find(a => a.id === 3);
      assert.equal(nativeAsset.img.wmin, 100);
      assert.equal(nativeAsset.img.hmin, 75);
    });

    it('should include placement in video object if provided', function () {
      const bid = utils.deepClone(defaultBid);
      bid.mediaTypes.video.placement = 2;

      const [request] = spec.buildRequests([bid]);
      const video = JSON.parse(request.data).imp[0].video;
      assert.equal(video.placement, 2, 'placement should be passed into video object');
    });

    it('should return proper banner imp', function () {
      const bid = utils.deepClone(defaultBid);
      bid.params.bidfloor = 0;

      const bidRequests = [bid];
      const bidderRequest = {
        bids: bidRequests,
        refererInfo: refererInfo,
        timeout: timeout,
        auctionId: auctionId,
      };

      const [request] = spec.buildRequests(bidRequests, bidderRequest);

      const data = JSON.parse(request.data);

      const expectedDataCopy = utils.deepClone(createExpectedData());
      assert.exists(data.id);

      expectedDataCopy.id = data.id
      expectedDataCopy.imp[0].bidfloor = bid.params.bidfloor
      assert.deepEqual(data, expectedDataCopy);
    });

    it('multiple sizes', function () {
      const bid = utils.deepClone(defaultBid);
      bid.mediaTypes = {
        banner: {
          sizes: [[300, 600], [300, 250]],
        }
      };

      const [request] = spec.buildRequests([bid]);
      const data = JSON.parse(request.data);
      assert.deepEqual(data.imp[0].banner, {w: 300, h: 600, format: [{w: 300, h: 250}]});
    });

    it('should skip banner with empty sizes', function () {
      const bid = utils.deepClone(defaultBid);
      bid.mediaTypes.banner = { sizes: [] };

      const [request] = spec.buildRequests([bid]);
      const data = JSON.parse(request.data);
      assert.notExists(data.imp[0].banner, 'Banner object should be omitted');
    });

    it('should return proper requests for multiple imps', function () {
      const bidderRequest = {
        bids: multiBid,
        refererInfo: refererInfo,
        timeout: timeout,
        auctionId: auctionId,
      };

      const requests = spec.buildRequests(multiBid, bidderRequest);
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
                hb_key: auctionId
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
                hb_key: auctionId
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
      const bid = {
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

      const response = {
        body: {
          seatbid: [{
            bid: [bid]
          }],
          cur: 'USD',
          id: '620190c2-7eef-42fa-91e2-f5c7fbc2bdd3'
        }
      };

      const bids = spec.interpretResponse(response);
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
      const titleText = 'Colorado Drivers With No DUI\'s Getting A Pay Day on Friday';
      const imgData = {
        url: `${baseUrl}/image`,
        w: 1200,
        h: 627
      };
      const nativeLink = `${baseUrl}/click/`;
      const nativeTracker = `${baseUrl}/imp-image`;
      const sponsoredByValue = 'Comparisons.org';
      const bodyValue = 'Drivers With No Tickets In 3 Years Should Do This On June';
      const bid = {
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

      const response = {
        body: {
          seatbid: [{
            bid: [bid]
          }],
          cur: 'USD',
          id: '620190c2-7eef-42fa-91e2-f5c7fbc2bdd3'
        }
      };

      const bids = spec.interpretResponse(response);
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
      const titleText = 'Colorado Drivers With No DUI\'s Getting A Pay Day on Friday';
      const imgData = {
        url: `${baseUrl}/image`,
        w: 1200,
        h: 627
      };
      const nativeLink = `${baseUrl}/click/`;
      const nativeTracker = `${baseUrl}/imp-image`;
      const sponsoredByValue = 'Comparisons.org';
      const bodyValue = 'Drivers With No Tickets In 3 Years Should Do This On June';
      const adm = JSON.stringify({
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
      const bid = {
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

      const response = {
        body: {
          seatbid: [{
            bid: [bid]
          }],
          cur: 'USD',
          id: '620190c2-7eef-42fa-91e2-f5c7fbc2bdd3'
        }
      };

      const bids = spec.interpretResponse(response);
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

  describe('interpretResponse() video', function () {
    it('should interpret video response correctly', function () {
      const vast = '<?xml version=\"1.0\" encoding=\"UTF-8\"?><VAST version=\"3.0\">...</VAST>';

      const bid = {
        adid: '2_ssl',
        adm: vast,
        adomain: ["www3.thehealthyfat.com"],
        burl: `${baseUrl}/burl/\${AUCTION_PRICE}`,
        cat: ['IAB1-1'],
        cid: '2_ssl',
        crid: '2_ssl',
        dealid: '3901521',
        id: '65599d0a-42d2-446a-9d39-6086c1433ffe',
        impid: '2b3c9d103723a7',
        price: 5.5,
      };

      const response = {
        body: {
          seatbid: [{ bid: [bid] }],
          cur: 'USD',
          id: '620190c2-7eef-42fa-91e2-f5c7fbc2bdd3',
        }
      };

      const [result] = spec.interpretResponse(response);

      assert.deepEqual(result, {
        burl: bid.burl,
        cpm: bid.price,
        creativeId: bid.adid,
        currency: response.body.cur,
        dealId: bid.dealid,
        mediaType: VIDEO,
        meta: { advertiserDomains: bid.adomain },
        netRevenue: true,
        requestId: bid.impid,
        ttl: 300,
        vastXml: vast,
      });
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
      const burl = 'burl&s=${AUCTION_PRICE}';
      const bid = {
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

  describe('resolveFloor()', function () {
    it('should return 0 if no bidfloor and no resolveFloor API', function () {
      const bid = {};
      assert.equal(resolveFloor(bid), 0);
    });

    it('should return static bidfloor if no resolveFloor API', function () {
      const bid = { params: { bidfloor: 2.5 } };
      assert.equal(resolveFloor(bid), 2.5);
    });

    it('should return the highest floor among all sources', function () {
      const makeBid = (mediaType, floor) => ({
        getFloor: ({ mediaType: mt }) => ({ floor: mt === mediaType ? floor : 0.5 }),
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          video: { playerSize: [640, 480] },
          native: {}
        },
        params: { bidfloor: mediaType === 'static' ? floor : 0.5 }
      });

      assert.equal(resolveFloor(makeBid(BANNER, 3.5)), 3.5, 'banner floor should be selected');
      assert.equal(resolveFloor(makeBid(VIDEO, 4.0)), 4.0, 'video floor should be selected');
      assert.equal(resolveFloor(makeBid(NATIVE, 5.0)), 5.0, 'native floor should be selected');
      assert.equal(resolveFloor(makeBid('static', 6.0)), 6.0, 'params.bidfloor should be selected');
    });

    it('should handle invalid floor values from resolveFloor API gracefully', function () {
      const bid = {
        getFloor: () => ({}),
        mediaTypes: { banner: { sizes: [[300, 250]] } }
      };
      assert.equal(resolveFloor(bid), 0);
    });

    it('should extract sizes and apply correct floor per media type', function () {
      const makeBid = (mediaType, expectedSize) => ({
        getFloor: ({ mediaType: mt, size }) => {
          if (mt === mediaType && (Array.isArray(size) ? size[0] : size) === expectedSize) {
            return { floor: 1 };
          }
          return { floor: 0 };
        },
        mediaTypes: {
          banner: { sizes: [[300, 250], [728, 90]] },
          video: { playerSize: [640, 480] },
          native: {}
        },
        params: {}
      });

      assert.equal(resolveFloor(makeBid(BANNER, 300)), 1, 'banner size [300, 250]');
      assert.equal(resolveFloor(makeBid(BANNER, 728)), 1, 'banner size [728, 90]');
      assert.equal(resolveFloor(makeBid(VIDEO, 640)), 1, 'video playerSize [640, 480]');
      assert.equal(resolveFloor(makeBid(NATIVE, '*')), 1, 'native default size "*"');
    });
  });
});
