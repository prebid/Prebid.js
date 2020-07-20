import { assert, expect } from 'chai';
import { BANNER } from 'src/mediaTypes.js';
import {config} from 'src/config.js';
import { spec } from 'modules/synacormediaBidAdapter.js';

describe('synacormediaBidAdapter ', function () {
  describe('isBidRequestValid', function () {
    let bid;
    beforeEach(function () {
      bid = {
        sizes: [300, 250],
        params: {
          seatId: 'prebid',
          placementId: '1234'
        }
      };
    });

    it('should return true when params placementId and seatId are truthy', function () {
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when sizes are missing', function () {
      delete bid.sizes;
      assert.isFalse(spec.isBidRequestValid(bid));
    });

    it('should return false when the only size is unwanted', function () {
      bid.sizes = [[1, 1]];
      assert.isFalse(spec.isBidRequestValid(bid));
    });

    it('should return false when seatId param is missing', function () {
      delete bid.params.seatId;
      assert.isFalse(spec.isBidRequestValid(bid));
    });

    it('should return false when placementId param is missing', function () {
      delete bid.params.placementId;
      assert.isFalse(spec.isBidRequestValid(bid));
    });

    it('should return false when params is missing or null', function () {
      assert.isFalse(spec.isBidRequestValid({ params: null }));
      assert.isFalse(spec.isBidRequestValid({}));
      assert.isFalse(spec.isBidRequestValid(null));
    });
  });

  describe('impression type', function() {
    let nonVideoReq = {
      bidId: '9876abcd',
      sizes: [[300, 250], [300, 600]],
      params: {
        seatId: 'prebid',
        placementId: '1234',
        bidfloor: '0.50'
      }
    };

    let bannerReq = {
      bidId: '9876abcd',
      sizes: [[300, 250], [300, 600]],
      params: {
        seatId: 'prebid',
        placementId: '1234',
        bidfloor: '0.50'
      },
      mediaTypes: {
        banner: {
          format: [
            {
              w: 300,
              h: 600
            }
          ],
          pos: 0
        }
      },
    };

    let videoReq = {
      bidId: '9876abcd',
      sizes: [[640, 480]],
      params: {
        seatId: 'prebid',
        placementId: '1234',
        bidfloor: '0.50'
      },
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [
            [
              640,
              480
            ]
          ]
        }
      },
    };
    it('should return correct impression type video/banner', function() {
      assert.isFalse(spec.isVideoBid(nonVideoReq));
      assert.isFalse(spec.isVideoBid(bannerReq));
      assert.isTrue(spec.isVideoBid(videoReq));
    });
  });
  describe('buildRequests', function () {
    let validBidRequestVideo = {
      bidder: 'synacormedia',
      params: {
        seatId: 'prebid',
        placementId: '1234',
        video: {
          minduration: 30
        }
      },
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[ 640, 480 ]]
        }
      },
      adUnitCode: 'video1',
      transactionId: '93e5def8-29aa-4fe8-bd3a-0298c39f189a',
      sizes: [[ 640, 480 ]],
      bidId: '2624fabbb078e8',
      bidderRequestId: '117954d20d7c9c',
      auctionId: 'defd525f-4f1e-4416-a4cb-ae53be90e706',
      src: 'client',
      bidRequestsCount: 1
    };

    let bidderRequestVideo = {
      bidderCode: 'synacormedia',
      auctionId: 'VideoAuctionId124',
      bidderRequestId: '117954d20d7c9c',
      auctionStart: 1553624929697,
      timeout: 700,
      refererInfo: {
        referer: 'https://localhost:9999/test/pages/video.html?pbjs_debug=true',
        reachedTop: true,
        numIframes: 0,
        stack: [ 'https://localhost:9999/test/pages/video.html?pbjs_debug=true' ]
      },
      start: 1553624929700
    };

    bidderRequestVideo.bids = validBidRequestVideo;
    let expectedDataVideo1 = {
      id: 'v2624fabbb078e8-640x480',
      tagid: '1234',
      video: {
        w: 640,
        h: 480,
        pos: 0,
        minduration: 30
      }
    };

    let validBidRequest = {
      bidId: '9876abcd',
      sizes: [[300, 250], [300, 600]],
      params: {
        seatId: 'prebid',
        placementId: '1234',
        bidfloor: '0.50'
      }
    };

    let bidderRequest = {
      auctionId: 'xyz123',
      refererInfo: {
        referer: 'https://test.com/foo/bar'
      }
    };

    let expectedDataImp1 = {
      banner: {
        format: [
          {
            h: 250,
            w: 300
          },
          {
            h: 600,
            w: 300
          }
        ],
        pos: 0
      },
      id: 'b9876abcd',
      tagid: '1234',
      bidfloor: 0.5
    };

    it('should return valid request when valid bids are used', function () {
      // banner test
      let req = spec.buildRequests([validBidRequest], bidderRequest);
      expect(req).be.an('object');
      expect(req).to.have.property('method', 'POST');
      expect(req).to.have.property('url');
      expect(req.url).to.contain('https://prebid.technoratimedia.com/openrtb/bids/prebid?');
      expect(req.data).to.exist.and.to.be.an('object');
      expect(req.data.id).to.equal('xyz123');
      expect(req.data.imp).to.eql([expectedDataImp1]);

      // video test
      let reqVideo = spec.buildRequests([validBidRequestVideo], bidderRequestVideo);
      expect(reqVideo).be.an('object');
      expect(reqVideo).to.have.property('method', 'POST');
      expect(reqVideo).to.have.property('url');
      expect(reqVideo.url).to.contain('https://prebid.technoratimedia.com/openrtb/bids/prebid?');
      expect(reqVideo.data).to.exist.and.to.be.an('object');
      expect(reqVideo.data.id).to.equal('VideoAuctionId124');
      expect(reqVideo.data.imp).to.eql([expectedDataVideo1]);
    });

    it('should return multiple bids when multiple valid requests with the same seatId are used', function () {
      let secondBidRequest = {
        bidId: 'foobar',
        sizes: [[300, 600]],
        params: {
          seatId: validBidRequest.params.seatId,
          placementId: '5678',
          bidfloor: '0.50'
        }
      };
      let req = spec.buildRequests([validBidRequest, secondBidRequest], bidderRequest);
      expect(req).to.exist.and.be.an('object');
      expect(req).to.have.property('method', 'POST');
      expect(req).to.have.property('url');
      expect(req.url).to.contain('https://prebid.technoratimedia.com/openrtb/bids/prebid?');
      expect(req.data.id).to.equal('xyz123');
      expect(req.data.imp).to.eql([expectedDataImp1, {
        banner: {
          format: [
            {
              h: 600,
              w: 300
            }
          ],
          pos: 0
        },
        id: 'bfoobar',
        tagid: '5678',
        bidfloor: 0.5
      }]);
    });

    it('should return only first bid when different seatIds are used', function () {
      let mismatchedSeatBidRequest = {
        bidId: 'foobar',
        sizes: [[300, 250]],
        params: {
          seatId: 'somethingelse',
          placementId: '5678',
          bidfloor: '0.50'
        }
      };
      let req = spec.buildRequests([mismatchedSeatBidRequest, validBidRequest], bidderRequest);
      expect(req).to.have.property('method', 'POST');
      expect(req).to.have.property('url');
      expect(req.url).to.contain('https://prebid.technoratimedia.com/openrtb/bids/somethingelse?');
      expect(req.data.id).to.equal('xyz123');
      expect(req.data.imp).to.eql([
        {
          banner: {
            format: [
              {
                h: 250,
                w: 300
              }
            ],
            pos: 0
          },
          id: 'bfoobar',
          tagid: '5678',
          bidfloor: 0.5
        }
      ]);
    });

    it('should not use bidfloor when the value is not a number', function () {
      let badFloorBidRequest = {
        bidId: '9876abcd',
        sizes: [[300, 250]],
        params: {
          seatId: 'prebid',
          placementId: '1234',
          bidfloor: 'abcd'
        }
      };
      let req = spec.buildRequests([badFloorBidRequest], bidderRequest);
      expect(req).to.have.property('method', 'POST');
      expect(req).to.have.property('url');
      expect(req.url).to.contain('https://prebid.technoratimedia.com/openrtb/bids/prebid?src=$$REPO_AND_VERSION$$');
      expect(req.data.id).to.equal('xyz123');
      expect(req.data.imp).to.eql([
        {
          banner: {
            format: [
              {
                h: 250,
                w: 300
              }
            ],
            pos: 0
          },
          id: 'b9876abcd',
          tagid: '1234',
        }
      ]);
    });

    it('should not use bidfloor when there is no value', function () {
      let badFloorBidRequest = {
        bidId: '9876abcd',
        sizes: [[300, 250]],
        params: {
          seatId: 'prebid',
          placementId: '1234'
        }
      };
      let req = spec.buildRequests([badFloorBidRequest], bidderRequest);
      expect(req).to.have.property('method', 'POST');
      expect(req).to.have.property('url');
      expect(req.url).to.contain('https://prebid.technoratimedia.com/openrtb/bids/prebid?src=$$REPO_AND_VERSION$$');
      expect(req.data.id).to.equal('xyz123');
      expect(req.data.imp).to.eql([
        {
          banner: {
            format: [
              {
                h: 250,
                w: 300
              }
            ],
            pos: 0
          },
          id: 'b9876abcd',
          tagid: '1234',
        }
      ]);
    });

    it('should use the pos given by the bid request', function () {
      let newPosBidRequest = {
        bidId: '9876abcd',
        sizes: [[300, 250]],
        params: {
          seatId: 'prebid',
          placementId: '1234',
          pos: 1
        }
      };
      let req = spec.buildRequests([newPosBidRequest], bidderRequest);
      expect(req).to.have.property('method', 'POST');
      expect(req).to.have.property('url');
      expect(req.url).to.contain('https://prebid.technoratimedia.com/openrtb/bids/prebid?src=$$REPO_AND_VERSION$$');
      expect(req.data.id).to.equal('xyz123');
      expect(req.data.imp).to.eql([
        {
          banner: {
            format: [
              {
                h: 250,
                w: 300
              }
            ],
            pos: 1
          },
          id: 'b9876abcd',
          tagid: '1234'
        }
      ]);
    });

    it('should use the default pos if none in bid request', function () {
      let newPosBidRequest = {
        bidId: '9876abcd',
        sizes: [[300, 250]],
        params: {
          seatId: 'prebid',
          placementId: '1234',
        }
      };
      let req = spec.buildRequests([newPosBidRequest], bidderRequest);
      expect(req).to.have.property('method', 'POST');
      expect(req).to.have.property('url');
      expect(req.url).to.contain('https://prebid.technoratimedia.com/openrtb/bids/prebid?src=$$REPO_AND_VERSION$$');
      expect(req.data.id).to.equal('xyz123');
      expect(req.data.imp).to.eql([
        {
          banner: {
            format: [
              {
                h: 250,
                w: 300
              }
            ],
            pos: 0
          },
          id: 'b9876abcd',
          tagid: '1234'
        }
      ]);
    });
    it('should not return a request when no valid bid request used', function () {
      expect(spec.buildRequests([], bidderRequest)).to.be.undefined;
      expect(spec.buildRequests([validBidRequest], null)).to.be.undefined;
    });

    it('should return empty impression when there is no valid sizes in bidrequest', function() {
      let validBidReqWithoutSize = {
        bidId: '9876abcd',
        sizes: [],
        params: {
          seatId: 'prebid',
          placementId: '1234',
          bidfloor: '0.50'
        }
      };

      let validBidReqInvalidSize = {
        bidId: '9876abcd',
        sizes: [[300]],
        params: {
          seatId: 'prebid',
          placementId: '1234',
          bidfloor: '0.50'
        }
      };

      let bidderRequest = {
        auctionId: 'xyz123',
        refererInfo: {
          referer: 'https://test.com/foo/bar'
        }
      };

      let req = spec.buildRequests([validBidReqWithoutSize], bidderRequest);
      assert.isUndefined(req);
      req = spec.buildRequests([validBidReqInvalidSize], bidderRequest);
      assert.isUndefined(req);
    });
    it('should use all the video params in the impression request', function () {
      let validBidRequestVideo = {
        bidder: 'synacormedia',
        params: {
          seatId: 'prebid',
          placementId: '1234',
          video: {
            minduration: 30,
            maxduration: 45,
            startdelay: 1,
            linearity: 1,
            placement: 1,
            mimes: ['video/mp4'],
            protocols: [1],
            api: 1
          }
        },
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [[ 640, 480 ]]
          }
        },
        adUnitCode: 'video1',
        transactionId: '93e5def8-29aa-4fe8-bd3a-0298c39f189a',
        sizes: [[ 640, 480 ]],
        bidId: '2624fabbb078e8',
        bidderRequestId: '117954d20d7c9c',
        auctionId: 'defd525f-4f1e-4416-a4cb-ae53be90e706',
        src: 'client',
        bidRequestsCount: 1
      };

      let req = spec.buildRequests([validBidRequestVideo], bidderRequest);
      expect(req).to.have.property('method', 'POST');
      expect(req).to.have.property('url');
      expect(req.url).to.contain('https://prebid.technoratimedia.com/openrtb/bids/prebid?src=$$REPO_AND_VERSION$$');
      expect(req.data.id).to.equal('xyz123');
      expect(req.data.imp).to.eql([
        {
          video: {
            h: 480,
            pos: 0,
            w: 640,
            minduration: 30,
            maxduration: 45,
            startdelay: 1,
            linearity: 1,
            placement: 1,
            mimes: ['video/mp4'],
            protocols: [1],
            api: 1
          },
          id: 'v2624fabbb078e8-640x480',
          tagid: '1234',
        }
      ]);
    });
    it('should move any video params in the mediaTypes object to params.video object', function () {
      let validBidRequestVideo = {
        bidder: 'synacormedia',
        params: {
          seatId: 'prebid',
          placementId: '1234',
          video: {
            minduration: 30,
            maxduration: 45,
            protocols: [1],
            api: 1
          }
        },
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [[ 640, 480 ]],
            startdelay: 1,
            linearity: 1,
            placement: 1,
            mimes: ['video/mp4']
          }
        },
        adUnitCode: 'video1',
        transactionId: '93e5def8-29aa-4fe8-bd3a-0298c39f189a',
        sizes: [[ 640, 480 ]],
        bidId: '2624fabbb078e8',
        bidderRequestId: '117954d20d7c9c',
        auctionId: 'defd525f-4f1e-4416-a4cb-ae53be90e706',
        src: 'client',
        bidRequestsCount: 1
      };

      let req = spec.buildRequests([validBidRequestVideo], bidderRequest);
      expect(req).to.have.property('method', 'POST');
      expect(req).to.have.property('url');
      expect(req.url).to.contain('https://prebid.technoratimedia.com/openrtb/bids/prebid?src=$$REPO_AND_VERSION$$');
      expect(req.data.id).to.equal('xyz123');
      expect(req.data.imp).to.eql([
        {
          video: {
            h: 480,
            pos: 0,
            w: 640,
            minduration: 30,
            maxduration: 45,
            startdelay: 1,
            linearity: 1,
            placement: 1,
            mimes: ['video/mp4'],
            protocols: [1],
            api: 1
          },
          id: 'v2624fabbb078e8-640x480',
          tagid: '1234',
        }
      ]);
    });
  });

  describe('Bid Requests with schain object ', function() {
    let validBidReq = {
      bidder: 'synacormedia',
      params: {
        seatId: 'prebid',
        placementId: 'demo1',
        pos: 1,
        video: {}
      },
      renderer: {
        url: '../syncOutstreamPlayer.js'
      },
      mediaTypes: {
        video: {
          playerSize: [[300, 250]],
          context: 'outstream'
        }
      },
      adUnitCode: 'div-1',
      transactionId: '0869f34e-090b-4b20-84ee-46ff41405a39',
      sizes: [[300, 250]],
      bidId: '22b3a2268d9f0e',
      bidderRequestId: '1d195910597e13',
      auctionId: '3375d336-2aea-4ee7-804c-6d26b621ad20',
      src: 'client',
      bidRequestsCount: 1,
      bidderRequestsCount: 1,
      bidderWinsCount: 0,
      schain: {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'indirectseller.com',
            sid: '00001',
            hp: 1
          }
        ]
      }
    };
    let bidderRequest = {
      refererInfo: {
        referer: 'http://localhost:9999/'
      },
      bidderCode: 'synacormedia',
      auctionId: 'f8a75621-d672-4cbb-9275-3db7d74fb110',
      bidderRequestId: '16d438671bfbec',
      bids: [
        {
          bidder: 'synacormedia',
          params: {
            seatId: 'prebid',
            placementId: 'demo1',
            pos: 1,
            video: {}
          },
          renderer: {
            url: '../syncOutstreamPlayer.js'
          },
          mediaTypes: {
            video: {
              playerSize: [[300, 250]],
              context: 'outstream'
            }
          },
          adUnitCode: 'div-1',
          sizes: [[300, 250]],
          bidId: '211c0236bb8f4e',
          bidderRequestId: '16d438671bfbec',
          auctionId: 'f8a75621-d672-4cbb-9275-3db7d74fb110',
          src: 'client',
          bidRequestsCount: 1,
          bidderRequestsCount: 1,
          bidderWinsCount: 0,
          schain: {
            ver: '1.0',
            complete: 1,
            nodes: [
              {
                asi: 'indirectseller.com',
                sid: '00001',
                hp: 1
              }
            ]
          }
        }
      ],
      auctionStart: 1580310345205,
      timeout: 1000,
      start: 1580310345211
    };

    it('should return valid bid request with schain object', function () {
      let req = spec.buildRequests([validBidReq], bidderRequest);
      expect(req).to.have.property('method', 'POST');
      expect(req).to.have.property('url');
      expect(req.url).to.contain('//prebid.technoratimedia.com/openrtb/bids/prebid?src=$$REPO_AND_VERSION$$');
      expect(req.data).to.have.property('source');
      expect(req.data.source).to.have.property('ext');
      expect(req.data.source.ext).to.have.property('schain');
    });
  });

  describe('interpretResponse', function () {
    let bidResponse = {
      id: '10865933907263896~9998~0',
      impid: 'b9876abcd-300x250',
      price: 0.13,
      crid: '1022-250',
      adm: '<script src=\"//uat-net.technoratimedia.com/openrtb/tags?ID=k5JkFVQ1RJT05fSU1QX0lEPXYyZjczN&AUCTION_PRICE=${AUCTION_PRICE}\"></script>',
      nurl: 'https://uat-net.technoratimedia.com/openrtb/tags?ID=k5JkFVQ1RJT05fSU1QX0lEPXYyZjczN&AUCTION_PRICE=${AUCTION_PRICE}'
    };
    let bidResponse2 = {
      id: '10865933907263800~9999~0',
      impid: 'b9876abcd-300x600',
      price: 1.99,
      crid: '9993-013',
      adm: '<script src=\"//uat-net.technoratimedia.com/openrtb/tags?ID=OTk5OX4wJkFVQ1RJT05fU0VBVF9JR&AUCTION_PRICE=${AUCTION_PRICE}\"></script>',
      nurl: 'https://uat-net.technoratimedia.com/openrtb/tags?ID=OTk5OX4wJkFVQ1RJT05fU0VBVF9JR&AUCTION_PRICE=${AUCTION_PRICE}'
    };

    let serverResponse;
    beforeEach(function() {
      serverResponse = {
        body: {
          id: 'abc123',
          seatbid: [{
            seat: '9998',
            bid: [],
          }]
        }
      };
    });

    it('should return 1 video bid when 1 bid is in the video response', function () {
      let serverRespVideo = {
        body: {
          id: 'abcd1234',
          seatbid: [
            {
              bid: [
                {
                  id: '11339128001692337~9999~0',
                  impid: 'v2da7322b2df61f-640x480',
                  price: 0.45,
                  nurl: 'https://uat-net.technoratimedia.com/openrtb/tags?ID=QVVDVElPTl9JRD1lOTBhYWU1My1hZDkwLTRkNDEtYTQxMC1lZDY1MjIxMDc0ZGMmQVVDVElPTl9CSURfSUQ9MTEzMzkxMjgwMDE2OTIzMzd-OTk5OX4wJkFVQ1RJT05fU0VBVF9JRD05OTk5JkFVQ1RJT05fSU1QX0lEPXYyZGE3MzIyYjJkZjYxZi02NDB4NDgwJkFDVE9SX1JFRj1ha2thLnRjcDovL2F3cy1lYXN0MUBhZHMxMy5jYXAtdXNlMS5zeW5hY29yLmNvbToyNTUxL3VzZXIvJGNMYmZiIy0xOTk4NTIzNTk3JlNFQVRfSUQ9cHJlYmlk&AUCTION_PRICE=${AUCTION_PRICE}',
                  adm: '<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="3.0">\n<Ad id="11339128001692337~9999~0">\n<Wrapper>\n<AdSystem>Synacor Media Ad Server - 9999</AdSystem>\n<VASTAdTagURI>https://uat-net.technoratimedia.com/openrtb/tags?ID=QVVDVElPTl9JRD1lOTBhYWU1My1hZDkwLTRkNDEtYTQxMC1lZDY1MjIxMDc0ZGMmQVVDVElPTl9CSURfSUQ9MTEzMzkxMjgwMDE2OTIzMzd-OTk5OX4wJkFVQ1RJT05fU0VBVF9JRD05OTk5JkFVQ1RJT05fSU1QX0lEPXYyZGE3MzIyYjJkZjYxZi02NDB4NDgwJkFDVE9SX1JFRj1ha2thLnRjcDovL2F3cy1lYXN0MUBhZHMxMy5jYXAtdXNlMS5zeW5hY29yLmNvbToyNTUxL3VzZXIvJGNMYmZiIy0xOTk4NTIzNTk3JlNFQVRfSUQ9cHJlYmlk&AUCTION_PRICE=${AUCTION_PRICE}</VASTAdTagURI>\n</Wrapper>\n</Ad>\n</VAST>',
                  adomain: [ 'psacentral.org' ],
                  cid: 'bidder-crid',
                  crid: 'bidder-cid',
                  cat: []
                }
              ],
              seat: '9999'
            }
          ]
        }
      };

      // serverResponse.body.seatbid[0].bid.push(bidResponse);
      let resp = spec.interpretResponse(serverRespVideo);
      expect(resp).to.be.an('array').to.have.lengthOf(1);
      expect(resp[0]).to.eql({
        requestId: '2da7322b2df61f',
        adId: '11339128001692337-9999-0',
        cpm: 0.45,
        width: 640,
        height: 480,
        creativeId: '9999_bidder-cid',
        currency: 'USD',
        netRevenue: true,
        mediaType: 'video',
        ad: '<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="3.0">\n<Ad id="11339128001692337~9999~0">\n<Wrapper>\n<AdSystem>Synacor Media Ad Server - 9999</AdSystem>\n<VASTAdTagURI>https://uat-net.technoratimedia.com/openrtb/tags?ID=QVVDVElPTl9JRD1lOTBhYWU1My1hZDkwLTRkNDEtYTQxMC1lZDY1MjIxMDc0ZGMmQVVDVElPTl9CSURfSUQ9MTEzMzkxMjgwMDE2OTIzMzd-OTk5OX4wJkFVQ1RJT05fU0VBVF9JRD05OTk5JkFVQ1RJT05fSU1QX0lEPXYyZGE3MzIyYjJkZjYxZi02NDB4NDgwJkFDVE9SX1JFRj1ha2thLnRjcDovL2F3cy1lYXN0MUBhZHMxMy5jYXAtdXNlMS5zeW5hY29yLmNvbToyNTUxL3VzZXIvJGNMYmZiIy0xOTk4NTIzNTk3JlNFQVRfSUQ9cHJlYmlk&AUCTION_PRICE=0.45</VASTAdTagURI>\n</Wrapper>\n</Ad>\n</VAST>',
        ttl: 60,
        videoCacheKey: 'QVVDVElPTl9JRD1lOTBhYWU1My1hZDkwLTRkNDEtYTQxMC1lZDY1MjIxMDc0ZGMmQVVDVElPTl9CSURfSUQ9MTEzMzkxMjgwMDE2OTIzMzd-OTk5OX4wJkFVQ1RJT05fU0VBVF9JRD05OTk5JkFVQ1RJT05fSU1QX0lEPXYyZGE3MzIyYjJkZjYxZi02NDB4NDgwJkFDVE9SX1JFRj1ha2thLnRjcDovL2F3cy1lYXN0MUBhZHMxMy5jYXAtdXNlMS5zeW5hY29yLmNvbToyNTUxL3VzZXIvJGNMYmZiIy0xOTk4NTIzNTk3JlNFQVRfSUQ9cHJlYmlk',
        vastUrl: 'https://uat-net.technoratimedia.com/openrtb/tags?ID=QVVDVElPTl9JRD1lOTBhYWU1My1hZDkwLTRkNDEtYTQxMC1lZDY1MjIxMDc0ZGMmQVVDVElPTl9CSURfSUQ9MTEzMzkxMjgwMDE2OTIzMzd-OTk5OX4wJkFVQ1RJT05fU0VBVF9JRD05OTk5JkFVQ1RJT05fSU1QX0lEPXYyZGE3MzIyYjJkZjYxZi02NDB4NDgwJkFDVE9SX1JFRj1ha2thLnRjcDovL2F3cy1lYXN0MUBhZHMxMy5jYXAtdXNlMS5zeW5hY29yLmNvbToyNTUxL3VzZXIvJGNMYmZiIy0xOTk4NTIzNTk3JlNFQVRfSUQ9cHJlYmlk&AUCTION_PRICE=0.45'
      });
    });

    it('should return 1 bid when 1 bid is in the response', function () {
      serverResponse.body.seatbid[0].bid.push(bidResponse);
      let resp = spec.interpretResponse(serverResponse);
      expect(resp).to.be.an('array').to.have.lengthOf(1);
      expect(resp[0]).to.eql({
        requestId: '9876abcd',
        adId: '10865933907263896-9998-0',
        cpm: 0.13,
        width: 300,
        height: 250,
        creativeId: '9998_1022-250',
        currency: 'USD',
        netRevenue: true,
        mediaType: BANNER,
        ad: '<script src=\"//uat-net.technoratimedia.com/openrtb/tags?ID=k5JkFVQ1RJT05fSU1QX0lEPXYyZjczN&AUCTION_PRICE=0.13\"></script>',
        ttl: 60
      });
    });

    it('should return 2 bids when 2 bids are in the response', function () {
      serverResponse.body.seatbid[0].bid.push(bidResponse);
      serverResponse.body.seatbid.push({
        seat: '9999',
        bid: [bidResponse2],
      });
      let resp = spec.interpretResponse(serverResponse);
      expect(resp).to.be.an('array').to.have.lengthOf(2);
      expect(resp[0]).to.eql({
        requestId: '9876abcd',
        adId: '10865933907263896-9998-0',
        cpm: 0.13,
        width: 300,
        height: 250,
        creativeId: '9998_1022-250',
        currency: 'USD',
        netRevenue: true,
        mediaType: BANNER,
        ad: '<script src=\"//uat-net.technoratimedia.com/openrtb/tags?ID=k5JkFVQ1RJT05fSU1QX0lEPXYyZjczN&AUCTION_PRICE=0.13\"></script>',
        ttl: 60
      });

      expect(resp[1]).to.eql({
        requestId: '9876abcd',
        adId: '10865933907263800-9999-0',
        cpm: 1.99,
        width: 300,
        height: 600,
        creativeId: '9999_9993-013',
        currency: 'USD',
        netRevenue: true,
        mediaType: BANNER,
        ad: '<script src=\"//uat-net.technoratimedia.com/openrtb/tags?ID=OTk5OX4wJkFVQ1RJT05fU0VBVF9JR&AUCTION_PRICE=1.99\"></script>',
        ttl: 60
      });
    });

    it('should not return a bid when no bid is in the response', function () {
      let resp = spec.interpretResponse(serverResponse);
      expect(resp).to.be.an('array').that.is.empty;
    });

    it('should not return a bid when there is no response body', function () {
      expect(spec.interpretResponse({ body: null })).to.not.exist;
      expect(spec.interpretResponse({ body: 'some error text' })).to.not.exist;
    });

    it('should not include videoCacheKey property on the returned response when cache url is present in the config', function () {
      let sandbox = sinon.sandbox.create();
      let serverRespVideo = {
        body: {
          id: 'abcd1234',
          seatbid: [
            {
              bid: [
                {
                  id: '11339128001692337~9999~0',
                  impid: 'v2da7322b2df61f-640x480',
                  price: 0.45,
                  nurl: 'https://uat-net.technoratimedia.com/openrtb/tags?ID=QVVDVElPTl9JRD1lOTBhYWU1My1hZDkwLTRkNDEtYTQxMC1lZDY1MjIxMDc0ZGMmQVVDVElPTl9CSURfSUQ9MTEzMzkxMjgwMDE2OTIzMzd-OTk5OX4wJkFVQ1RJT05fU0VBVF9JRD05OTk5JkFVQ1RJT05fSU1QX0lEPXYyZGE3MzIyYjJkZjYxZi02NDB4NDgwJkFDVE9SX1JFRj1ha2thLnRjcDovL2F3cy1lYXN0MUBhZHMxMy5jYXAtdXNlMS5zeW5hY29yLmNvbToyNTUxL3VzZXIvJGNMYmZiIy0xOTk4NTIzNTk3JlNFQVRfSUQ9cHJlYmlk&AUCTION_PRICE=${AUCTION_PRICE}',
                  adm: '<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="3.0">\n<Ad id="11339128001692337~9999~0">\n<Wrapper>\n<AdSystem>Synacor Media Ad Server - 9999</AdSystem>\n<VASTAdTagURI>https://uat-net.technoratimedia.com/openrtb/tags?ID=QVVDVElPTl9JRD1lOTBhYWU1My1hZDkwLTRkNDEtYTQxMC1lZDY1MjIxMDc0ZGMmQVVDVElPTl9CSURfSUQ9MTEzMzkxMjgwMDE2OTIzMzd-OTk5OX4wJkFVQ1RJT05fU0VBVF9JRD05OTk5JkFVQ1RJT05fSU1QX0lEPXYyZGE3MzIyYjJkZjYxZi02NDB4NDgwJkFDVE9SX1JFRj1ha2thLnRjcDovL2F3cy1lYXN0MUBhZHMxMy5jYXAtdXNlMS5zeW5hY29yLmNvbToyNTUxL3VzZXIvJGNMYmZiIy0xOTk4NTIzNTk3JlNFQVRfSUQ9cHJlYmlk&AUCTION_PRICE=${AUCTION_PRICE}</VASTAdTagURI>\n</Wrapper>\n</Ad>\n</VAST>',
                  adomain: [ 'psacentral.org' ],
                  cid: 'bidder-crid',
                  crid: 'bidder-cid',
                  cat: []
                }
              ],
              seat: '9999'
            }
          ]
        }
      };

      sandbox.stub(config, 'getConfig').callsFake(key => {
        const config = {
          'cache.url': 'faKeCacheUrl'
        };
        return config[key];
      });

      let resp = spec.interpretResponse(serverRespVideo);
	  sandbox.restore();
	  expect(resp[0].videoCacheKey).to.not.exist;
    });
  });
  describe('getUserSyncs', function () {
    it('should return a usersync when iframes is enabled', function () {
      let usersyncs = spec.getUserSyncs({
        iframeEnabled: true
      }, null);
      expect(usersyncs).to.be.an('array').that.is.not.empty;
      expect(usersyncs[0]).to.have.property('type', 'iframe');
      expect(usersyncs[0]).to.have.property('url');
      expect(usersyncs[0].url).to.contain('https://ad-cdn.technoratimedia.com/html/usersync.html');
    });

    it('should not return a usersync when iframes are not enabled', function () {
      let usersyncs = spec.getUserSyncs({
        pixelEnabled: true
      }, null);
      expect(usersyncs).to.be.an('array').that.is.empty;
    });
  });
});
