import { expect } from 'chai';
import { spec } from 'modules/stackadaptBidAdapter';
import { deepClone, mergeDeep, deepSetValue } from 'src/utils.js';
import { config } from 'src/config';

describe('stackadaptBidAdapter', function () {
  describe('intepretResponse() mediatypes - complete', () => {
    const defaultBidRequest = {
      'bidderRequestId': '2856b3d7c2c8e93e',
      'bidder': 'stackadapt',
      'params': {
        'publisherId': 473298,
      },
      'mediaTypes': {
        'banner': {
          'sizes': [
            [336, 280],
            [320, 100]
          ]
        }
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'aa837ec1-ba90-3821-jduq-1cc083921a9a',
      'sizes': [
        [336, 280],
        [320, 100]
      ],
      'bidId': '001',
      'auctionId': '8d6e5b89-9c9f-4f25-9d4f-e4c08b0b9d7f',
      'ortb2': {}
    };

    const ortbResponse = {
      'body': {
        'id': '2856b3d7c2c8e93e',
        'seatbid': [
          {
            'bid': [
              {
                'id': '1',
                'impid': '001',
                'price': 6.97,
                'adid': '5739901',
                'adm': '<!-- creative wp=${AUCTION_PRICE} -->',
                'adomain': ['mobility.com'],
                'crid': '5739901',
                'w': 336,
                'h': 280,
              }
            ],
            'seat': 'StackAdapt'
          }
        ],
        'cur': 'USD'
      },
      'headers': {}
    }

    it('should return empty', () => {
      const req = spec.buildRequests([defaultBidRequest], {
        bids: [defaultBidRequest]
      })
      const result = spec.interpretResponse(null, {
        data: req.data
      })

      expect(result.length).to.eq(0);
    });

    it('should set mediaType from bid request mediaTypes', () => {
      const req = spec.buildRequests([defaultBidRequest], {
        id: '832j6c82-893j-21j9-8392-4wd9d82pl739',
        bidderRequestId: '2856b3d7c2c8e93e',
        bids: [defaultBidRequest]
      })
      const result = spec.interpretResponse(ortbResponse, {
        data: req.data
      })

      expect(result.length).to.eq(1);
      expect(result[0].mediaType).to.eq('banner')
    });

    it('should set mediaType from present video adm', () => {
      const bidRequest = mergeDeep(defaultBidRequest, {
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250]
            ]
          },
          video: {
            playerSize: [640, 480]
          }
        }
      })
      const bannerResponse = deepClone(ortbResponse);
      const ortbReq = spec.buildRequests([bidRequest], {
        bids: [bidRequest]
      })
      deepSetValue(bannerResponse, 'body.seatbid.0.bid.0.adm', '<vast></vast>');
      const result = spec.interpretResponse(bannerResponse, {
        data: ortbReq.data
      })

      expect(result.length).to.eq(1);
      expect(result[0].mediaType).to.eq('video')
    });

    it('should set mediaType from missing adm', () => {
      const bidRequest = mergeDeep(defaultBidRequest, {
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250]
            ]
          },
          video: {
            playerSize: [640, 480]
          }
        }
      })
      const ortbReq = spec.buildRequests([bidRequest], {
        bids: [bidRequest]
      })
      const result = spec.interpretResponse(ortbResponse, {
        data: ortbReq.data
      })

      expect(result.length).to.eq(1);
      expect(result[0].mediaType).to.eq('banner')
    });
  })

  describe('interpretResponse() empty', function () {
    it('should handle empty response', function () {
      let result = spec.interpretResponse({});
      expect(result.length).to.equal(0);
    });

    it('should handle empty seatbid response', function () {
      let response = {
        body: {
          'id': '9p1a65c0oc85a62',
          'seatbid': []
        }
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });

  describe('interpretResponse() single-display - complete', function () {
    const ortbResponse = {
      body: {
        'id': '5ce18294-9682-4ad0-1c92-0ab12bg8dc5e',
        'bidid': '173283728930905039521896',
        'seatbid': [
          {
            'bid': [
              {
                'id': '1',
                'impid': '5',
                'crid': '1609382',
                'price': 6.97,
                'adm': '<!-- creative wp=${AUCTION_PRICE} -->',
                'cat': [
                  'IAB1',
                  'IAB2'
                ],
                'h': 50,
                'w': 320,
                'dealid': '189321890321',
                'adomain': ['mobility.com'],
                'ext': {
                  'creative_id': '8493266',
                  'bid_type': 'cpm',
                  'crtype': 'display'
                }
              }
            ],
            'seat': 'StackAdapt'
          }
        ],
        'cur': 'USD',
      }
    };

    const bidderRequest = {
      'id': '832j6c82-893j-21j9-8392-4wd9d82pl739',
      'bidder': 'stackadapt',
      'params': {
        'publisherId': 473298,
      },
      'mediaTypes': {
        'banner': {
          'sizes': [
            [
              320,
              50
            ]
          ]
        }
      },
      'sizes': [
        [
          320,
          50
        ]
      ],
      'bidId': '5',
      'bidderRequestId': '5ce18294-9682-4ad0-1c92-0ab12bg8dc5e',
      'auctionId': '8d6e5b89-9c9f-4f25-9d4f-e4c08b0b9d7f',
      'ortb2': {}
    };

    const expectedBid = {
      'requestId': '5',
      'seatBidId': '1',
      'cpm': 6.97,
      'width': 320,
      'height': 50,
      'creativeId': '1609382',
      'creative_id': '1609382',
      'dealId': '189321890321',
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 300,
      'ad': '<!-- creative wp=6.97 -->',
      'mediaType': 'banner',
      'meta': {
        'advertiserDomains': ['mobility.com'],
        'primaryCatId': 'IAB1',
        'secondaryCatIds': [
          'IAB2'
        ]
      }
    };

    it('should match bid response', function () {
      const ortbRequest = spec.buildRequests([bidderRequest], {
        bids: [bidderRequest]
      })

      let result = spec.interpretResponse(ortbResponse, {data: ortbRequest.data});
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(expectedBid);
    });
  });

  describe('interpretResponse() multi-display - complete', function () {
    const ortbResponse = {
      'body': {
        'id': 'r4r90kj7-2816-392j-1d41-31y998t21d2d',
        'seatbid': [
          {
            'bid': [
              {
                'id': '1',
                'impid': '001',
                'price': 3.50,
                'adm': '<!-- creative wp=${AUCTION_PRICE} -->',
                'cid': '4521903',
                'crid': '6254972',
                'adomain': [
                  'test.com'
                ],
                'dealid': '122781928112',
                'w': 320,
                'h': 50,
                'cat': [],
              },
              {
                'id': '2',
                'impid': '002',
                'price': 4.75,
                'adm': '<!-- creative wp=${AUCTION_PRICE} -->',
                'cid': '8472189',
                'crid': '8593271',
                'adomain': [
                  'test.com'
                ],
                'dealid': '849328172299',
                'w': 300,
                'h': 250,
                'cat': [],
              }
            ],
            'seat': 'StackAdapt'
          }
        ],
        'cur': 'USD'
      }
    };

    const bidderRequest1 = {
      'id': '11dd91ds-197k-23e1-9950-q79s37aq0a42',
      'bidder': 'stackadapt',
      'params': {
        'publisherId': 473298,
        'placementId': 'placement1'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [
            [
              320,
              50
            ]
          ]
        }
      },
      'sizes': [
        [
          320,
          50
        ]
      ],
      'bidId': '001',
      'bidderRequestId': 'r4r90kj7-2816-392j-1d41-31y998t21d2d',
      'auctionId': '7483329d-22il-2hyu-1d78-1098qw89457l',
      'ortb2': {}
    };

    const bidderRequest2 = {
      'id': '11dd91ds-197k-23e1-9950-q79s37aq0a43',
      'bidder': 'stackadapt',
      'params': {
        'publisherId': 473298,
        'placementId': 'placement2'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [
            [
              728,
              90
            ]
          ]
        }
      },
      'sizes': [
        [
          728,
          90
        ]
      ],
      'bidId': '002',
      'bidderRequestId': 'r4r90kj7-2816-392j-1d41-31y998t21d2d',
      'auctionId': '7483329d-22il-2hyu-1d78-1098qw89457l',
      'ortb2': {}
    };

    const expectedBids = [
      {
        'requestId': '001',
        'seatBidId': '1',
        'cpm': 3.5,
        'width': 320,
        'height': 50,
        'creativeId': '6254972',
        'creative_id': '6254972',
        'currency': 'USD',
        'dealId': '122781928112',
        'netRevenue': true,
        'ttl': 300,
        'ad': '<!-- creative wp=3.5 -->',
        'mediaType': 'banner',
        'meta': {
          'advertiserDomains': ['test.com'],
          'primaryCatId': undefined,
          'secondaryCatIds': []
        }
      },
      {
        'requestId': '002',
        'seatBidId': '2',
        'cpm': 4.75,
        'width': 300,
        'height': 250,
        'creativeId': '8593271',
        'creative_id': '8593271',
        'currency': 'USD',
        'dealId': '849328172299',
        'netRevenue': true,
        'ttl': 300,
        'ad': '<!-- creative wp=4.75 -->',
        'mediaType': 'banner',
        'meta': {
          'advertiserDomains': ['test.com'],
          'primaryCatId': undefined,
          'secondaryCatIds': []
        }
      }
    ];

    it('should match bid response', function () {
      const ortbRequest = spec.buildRequests([bidderRequest1, bidderRequest2], {
        bids: [bidderRequest1, bidderRequest2]
      })
      let result = spec.interpretResponse(ortbResponse, {data: ortbRequest.data});
      expect(result.length).to.equal(2);
      expect(result).to.deep.equal(expectedBids);
    });
  });

  if (FEATURES.VIDEO) {
    describe('interpretResponse() single-video - complete', function () {
      const ortbResponse = {
        'body': {
          'id': '5ce18294-9682-4ad0-1c92-0ab12bg8dc5e',
          'bidid': '173283728930905039521879',
          'cur': 'USD',
          'seatbid': [
            {
              'bid': [
                {
                  'crid': '6254972',
                  'ext': {
                    'creative_id': '1762289',
                    'bid_type': 'cpm',
                    'duration': 30,
                  },
                  'adm': '<VAST version=\"4.0\"><Ad id=\"12345\"><Wrapper><Impression><![CDATA[https://example.com/impression?wp=${AUCTION_PRICE}]]></Impression></Wrapper></Ad></VAST>',
                  'h': 480,
                  'impid': '001',
                  'id': '1',
                  'price': 11.5,
                  'w': 600
                }
              ],
              'seat': 'StackAdapt'
            }
          ]
        },
        'headers': {}
      };

      const bidderRequest = {
        'id': '748a3c21-908a-25j9-4301-2ca9d11al199',
        'bidder': 'stackadapt',
        'params': {
          'publisherId': 473298,
        },
        'mediaTypes': {
          'video': {}
        },
        'bidId': '001',
        'bidderRequestId': '5ce18294-9682-4ad0-1c92-0ab12bg8dc5e',
        'auctionId': '8d6e5b89-9c9f-4f25-9d4f-e4c08b0b9d7f',
        'ortb2': {}
      };

      const expectedBid = {
        'requestId': '001',
        'seatBidId': '1',
        'cpm': 11.5,
        'creativeId': '6254972',
        'creative_id': '6254972',
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'width': 600,
        'height': 480,
        'mediaType': 'video',
        'vastXml': '<VAST version=\"4.0\"><Ad id=\"12345\"><Wrapper><Impression><![CDATA[https://example.com/impression?wp=11.5]]></Impression></Wrapper></Ad></VAST>',
        'meta': {}
      };

      it('should match bid response with adm', function () {
        const ortbRequest = spec.buildRequests([bidderRequest], {
          bids: [bidderRequest]
        })

        let result = spec.interpretResponse(ortbResponse, {data: ortbRequest.data});
        expect(result.length).to.equal(1);
        expect(result[0]).to.deep.equal(expectedBid);
      });
    });
  }

  describe('isBidRequestValid()', function() {
    const bannerBidderRequest = {
      'bidder': 'stackadapt',
      'params': {
        'publisherId': '11111',
        'placementId': '1'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [
            [200, 50]
          ]
        }
      },
      'bidId': '001',
      'bidderRequestId': '5ce18294-9682-4ad0-1c92-0ab12bg8dc5e',
      'auctionId': '8d6e5b89-9c9f-4f25-9d4f-e4c08b0b9d7f',
    };

    describe('basic tests', function () {
      it('should be valid with required bid.params', function () {
        expect(spec.isBidRequestValid(bannerBidderRequest)).to.equal(true);
      });

      it('should be invalid when missing publisherId param', function () {
        const bidderRequest = deepClone(bannerBidderRequest);
        delete bidderRequest.params.publisherId;
        expect(spec.isBidRequestValid(bidderRequest)).to.equal(false);
      });

      it('should be invalid if bid request is not mediaTypes.banner or mediaTypes.video', function () {
        const bidderRequest = deepClone(bannerBidderRequest);
        delete bidderRequest.mediaTypes
        expect(spec.isBidRequestValid(bidderRequest)).to.equal(false);
      });

      it('should be invalid if bidfloor is incorrect type', function () {
        const bidderRequest = deepClone(bannerBidderRequest);
        bidderRequest.params.bidfloor = 'invalid bidfloor';
        expect(spec.isBidRequestValid(bidderRequest)).to.equal(false);
      });

      it('should be valid if bidfloor param is a float', function () {
        const bidderRequest = deepClone(bannerBidderRequest);
        bidderRequest.params.bidfloor = 3.01;
        expect(spec.isBidRequestValid(bidderRequest)).to.equal(true);
      });
    });

    describe('banner tests', function () {
      it('should be invalid if banner sizes is wrong format', function () {
        const bidderRequest = deepClone(bannerBidderRequest);
        bidderRequest.mediaTypes.banner.sizes = 'invalid';
        expect(spec.isBidRequestValid(bidderRequest)).to.equal(false);
      });

      it('should be invalid if missing banner sizes', function () {
        const bidderRequest = deepClone(bannerBidderRequest);
        delete bidderRequest.mediaTypes.banner.sizes;
        expect(spec.isBidRequestValid(bidderRequest)).to.equal(false);
      });

      it('should be invalid when passed valid banner.pos', function () {
        const bidderRequest = deepClone(bannerBidderRequest);
        bidderRequest.mediaTypes.banner.pos = 1;
        expect(spec.isBidRequestValid(bidderRequest)).to.equal(true);
      });
    });

    if (FEATURES.VIDEO) {
      describe('video tests', function () {
        const videoBidderRequest = {
          'bidder': 'stackadapt',
          'params': {
            'publisherId': '11111',
            'placementId': '1'
          },
          'mediaTypes': {
            'video': {
              'maxduration': 120,
              'api': [2, 7],
              'mimes': [
                'video/mp4',
                'application/javascript',
                'video/webm'
              ],
              'protocols': [2, 3, 5, 6, 7, 8],
              'plcmt': 1,
            }
          },
          'sizes': [
            [200, 50]
          ],
          'bidId': '001',
          'bidderRequestId': '5ce18294-9682-4ad0-1c92-0ab12bg8dc5e',
          'auctionId': '8d6e5b89-9c9f-4f25-9d4f-e4c08b0b9d7f',
        };

        it('should be valid with required bid.params', function () {
          const bidderRequest = deepClone(videoBidderRequest);
          expect(spec.isBidRequestValid(bidderRequest)).to.equal(true);
        });

        it('should be invalid if missing bid.mediaTypes.video.maxduration', function () {
          const bidderRequest = deepClone(videoBidderRequest);
          delete bidderRequest.mediaTypes.video.maxduration;
          expect(spec.isBidRequestValid(bidderRequest)).to.equal(false);
        });

        it('should be invalid if missing bid.mediaTypes.video.api', function () {
          const bidderRequest = deepClone(videoBidderRequest);
          delete bidderRequest.mediaTypes.video.api;
          expect(spec.isBidRequestValid(bidderRequest)).to.equal(false);
        });

        it('should be invalid if missing bid.mediaTypes.video.mimes', function () {
          const bidderRequest = deepClone(videoBidderRequest);
          delete bidderRequest.mediaTypes.video.mimes;
          expect(spec.isBidRequestValid(bidderRequest)).to.equal(false);
        });

        it('should be invalid if missing bid.mediaTypes.video.protocols', function () {
          const bidderRequest = deepClone(videoBidderRequest);
          delete bidderRequest.mediaTypes.video.protocols;
          expect(spec.isBidRequestValid(bidderRequest)).to.equal(false);
        });
      });
    }
  });

  describe('buildRequests() banner', function () {
    const bidRequests = [{
      'bidder': 'stackadapt',
      'params': {
        'publisherId': '11111',
        'placementId': '1',
        'bidfloor': 1.01
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[336, 280], [320, 100]]
        }
      },
      'ortb2Imp': {
        'ext': {
          'tid': '2121283921',
        }
      },
      'sizes': [[336, 280], [320, 100]],
      'bidId': '001',
      'bidderRequestId': '5ce18294-9682-4ad0-1c92-0ab12bg8dc5e',
      'auctionId': '8d6e5b89-9c9f-4f25-9d4f-e4c08b0b9d7f',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'aa837ec1-ba90-3821-jduq-1cc083921a9a',
      'src': 'client',
      'bidRequestsCount': 10
    }];

    const bidderRequest = {
      'bidderCode': 'stackadapt',
      'auctionId': '8d6e5b89-9c9f-4f25-9d4f-e4c08b0b9d7f',
      ortb2: {
        source: {
          tid: '8d6e5b89-9c9f-4f25-9d4f-e4c08b0b9d7f',
        },
        site: {
          domain: 'tech.stacktest.com',
          publisher: {
            domain: 'stacktest.com'
          },
          page: 'https://tech.stacktest.com/',
          ref: 'https://www.google.com/'
        }
      },
      'bidderRequestId': '5ce18294-9682-4ad0-1c92-0ab12bg8dc5e',
      'auctionStart': 1731042158610,
      'timeout': 1750,
      'refererInfo': {
        'reachedTop': true,
        'numIframes': 0,
        'isAmp': false,
        'page': 'https://www.mobile.com/test',
        'domain': 'www.mobile.com',
        'ref': 'https://testsite.com/',
      },
      'start': 1731042158587
    };

    bidderRequest.bids = bidRequests;

    it('should have correct request components', function () {
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequest);
      expect(ortbRequest.method).to.equal('POST');
      expect(ortbRequest.url).to.be.not.empty;
      expect(ortbRequest.data).to.be.not.null;
    });

    it('should set ortb request.id to bidderRequestId', function () {
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(ortbRequest.id).to.equal('5ce18294-9682-4ad0-1c92-0ab12bg8dc5e');
    });

    it('should set impression id from bidId', function () {
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(ortbRequest.imp[0].id).to.equal('001');
    });

    it('should set correct endpoint', function () {
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequest);
      expect(ortbRequest.url).to.equal('https://pjs.srv.stackadapt.com/br');
    });

    it('should set correct publisherId', function () {
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(ortbRequest.site?.publisher?.id).to.equal(bidRequests[0].params.publisherId);
    });

    it('should set placementId in tagid', function () {
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(ortbRequest.imp[0].tagid).to.equal(bidRequests[0].params.placementId);
    });

    it('should set bidfloor if param set', function () {
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(ortbRequest.imp[0].bidfloor).to.equal(bidRequests[0].params.bidfloor);
    });

    it('should set gpid in ortb ext.gpid if present', function () {
      const clonedBidderRequest = deepClone(bidderRequest);
      const clonedBidRequests = deepClone(bidRequests);
      const gpid = 'site-desktop-homepage-banner-top';
      clonedBidRequests[0].ortb2Imp = {
        ext: {
          gpid: gpid
        }
      };
      clonedBidderRequest.bids = clonedBidRequests;
      const ortbRequest = spec.buildRequests(clonedBidRequests, clonedBidderRequest).data;

      expect(ortbRequest.imp[0].ext).to.be.not.null;
      expect(ortbRequest.imp[0].ext.gpid).to.equal(gpid);
    });

    it('should set rwdd in imp.rwdd if present', function () {
      const clonedBidderRequest = deepClone(bidderRequest);
      const clonedBidRequests = deepClone(bidRequests);
      const rwdd = 1;
      clonedBidRequests[0].ortb2Imp = {
        rwdd: rwdd,
      };
      clonedBidderRequest.bids = clonedBidRequests;
      const ortbRequest = spec.buildRequests(clonedBidRequests, clonedBidderRequest).data;

      expect(ortbRequest.imp[0].rwdd).to.be.not.null;
      expect(ortbRequest.imp[0].rwdd).to.equal(1);
    });

    it('should set source.tid', function () {
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(ortbRequest.source?.tid).to.equal(bidderRequest.ortb2.source.tid);
    });

    it('should set ad sizes in the ortb request', function () {
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(ortbRequest.imp[0].banner.format[0].w).to.equal(336);
      expect(ortbRequest.imp[0].banner.format[0].h).to.equal(280);
      expect(ortbRequest.imp[0].banner.format[1].w).to.equal(320);
      expect(ortbRequest.imp[0].banner.format[1].h).to.equal(100);
    });

    it('should set referer in the bid request. ortb object takes precedence', function () {
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(ortbRequest.site.page).to.equal('https://tech.stacktest.com/');
    });

    it('should set the banner pos if sent', function () {
      const clonedBidderRequest = deepClone(bidderRequest);
      const clonedBidRequests = deepClone(bidRequests);
      clonedBidRequests[0].mediaTypes.banner.pos = 1;
      clonedBidderRequest.bids = clonedBidRequests;
      const ortbRequest = spec.buildRequests(clonedBidRequests, clonedBidderRequest).data;

      expect(ortbRequest.imp[0].banner.pos).to.equal(1);
    });

    it('should set the banner expansion direction if param set', function () {
      const clonedBidderRequest = deepClone(bidderRequest);
      const clonedBidRequests = deepClone(bidRequests);
      const expdir = [1, 3]
      clonedBidRequests[0].params.banner = {
        expdir: expdir
      };

      clonedBidderRequest.bids = clonedBidRequests;
      const ortbRequest = spec.buildRequests(clonedBidRequests, clonedBidderRequest).data;

      expect(ortbRequest.imp[0].banner.expdir).to.equal(expdir);
    });

    it('should set first party site data after merge', function () {
      const ortb2 = {
        site: {
          publisher: {
            domain: 'https://publisher.com',
          }
        }
      };
      const bidderRequestWithoutRefererDomain = {
        ...bidderRequest,
        refererInfo: {
          ...bidRequests.referer,
          domain: null
        }
      }

      const ortbRequest = spec.buildRequests(bidRequests, {...bidderRequestWithoutRefererDomain, ortb2}).data;
      expect(ortbRequest.site.publisher).to.deep.equal({domain: 'https://publisher.com', id: '11111'});
    });

    it('should set first party side data publisher domain taking precedence over referer domain', function () {
      const ortb2 = {
        site: {
          domain: 'https://publisher.com',
        }
      };
      const ortbRequest = spec.buildRequests(bidRequests, {...bidderRequest, ortb2}).data;
      expect(ortbRequest.site.domain).to.equal('https://publisher.com');
    });

    it('should set bcat if present', function () {
      const ortb2 = {
        bcat: ['IAB1', 'IAB2']
      };
      const ortbRequest = spec.buildRequests(bidRequests, {...bidderRequest, ortb2}).data;
      expect(ortbRequest.bcat).to.deep.equal(['IAB1', 'IAB2']);
    });

    it('should set badv if present', function () {
      const ortb2 = {
        badv: ['chargers.com', 'house.com']
      };
      const ortbRequest = spec.buildRequests(bidRequests, {...bidderRequest, ortb2}).data;
      expect(ortbRequest.badv).to.deep.equal(['chargers.com', 'house.com']);
    });

    it('should set battr if present', function () {
      const clonedBidderRequest = deepClone(bidderRequest);
      const clonedBidRequests = deepClone(bidRequests);
      const battr = [1, 2, 3];
      clonedBidRequests[0].ortb2Imp = {
        banner: {
          battr: battr
        }
      };
      clonedBidderRequest.bids = clonedBidRequests;
      const ortbRequest = spec.buildRequests(clonedBidRequests, clonedBidderRequest).data;

      expect(ortbRequest.imp[0].banner.battr).to.deep.equal(battr);
    });

    it('should set ortb2 gdpr consent info', function () {
      const consentString = 'CQGRvoAQGRvoAAHABAENBKFsAP_gAEPgAAAAKhNV';
      const ortb2 = {
        user: {
          ext: {
            consent: consentString
          }
        },
        regs: {
          ext: {
            gdpr: 1
          }
        }
      };
      let clonedBidderRequest = {...deepClone(bidderRequest), ortb2};
      const ortbRequest = spec.buildRequests(bidRequests, clonedBidderRequest).data;
      expect(ortbRequest.user.ext.consent).to.equal(consentString);
      expect(ortbRequest.regs.ext.gdpr).to.equal(1);
    });

    it('should set ortb2 usp consent info', function () {
      const consentString = 'CQGRvoAQGRvoAAHABAENBKFsAP_gAEPgAAAAKhNV';
      const ortb2 = {
        regs: {
          ext: {
            us_privacy: consentString
          }
        }
      };
      let clonedBidderRequest = {...deepClone(bidderRequest), ortb2};
      const ortbRequest = spec.buildRequests(bidRequests, clonedBidderRequest).data;
      expect(ortbRequest.regs.ext.us_privacy).to.equal(consentString);
    });

    it('should set ortb2 coppa consent info', function () {
      const ortb2 = {
        regs: {
          coppa: 1
        }
      };
      let clonedBidderRequest = {...deepClone(bidderRequest), ortb2};
      const ortbRequest = spec.buildRequests(bidRequests, clonedBidderRequest).data;
      expect(ortbRequest.regs.coppa).to.equal(1);
    });

    it('should set ortb2 gpp consent info', function () {
      const ortb2 = {
        regs: {
          gpp: 'DCACTA~1YAA',
          gpp_sid: [9]
        }
      };
      let clonedBidderRequest = {...deepClone(bidderRequest), ortb2};
      const ortbRequest = spec.buildRequests(bidRequests, clonedBidderRequest).data;
      expect(ortbRequest.regs.gpp).to.equal('DCACTA~1YAA');
      expect(ortbRequest.regs.gpp_sid).to.eql([9]);
    });

    it('should set schain info', function () {
      const clonedBidderRequest = deepClone(bidderRequest);
      const clonedBidRequests = deepClone(bidRequests);
      const schain = {
        'nodes': [{
          'asi': 'adtech.com',
          'sid': '1078492',
          'hp': 1
        }, {
          'asi': 'google.com',
          'sid': 'pub-315292981',
          'hp': 1
        }],
        'complete': 1,
        'ver': '1.0'
      };

      clonedBidRequests[0].ortb2 = {
        source: {
          ext: {schain: schain}
        }
      };
      clonedBidderRequest.bids = clonedBidRequests;

      // Add schain to bidderRequest as well
      clonedBidderRequest.ortb2 = {
        source: {
          ext: {schain: schain}
        }
      };

      const ortbRequest = spec.buildRequests(clonedBidRequests, clonedBidderRequest).data;
      expect(ortbRequest.source.ext.schain).to.deep.equal(schain);
    });

    it('should set first party site data', function () {
      const ortb2 = {
        site: {
          id: '144da00b-8309-4b2e-9482-4b3829c0b54a',
          name: 'game',
          domain: 'game.wiki.com',
          cat: ['IAB1'],
          sectioncat: ['IAB1-1'],
          pagecat: ['IAB1-1'],
          page: 'https://game.wiki.com/craft',
          ref: 'https://www.google.com/',
          keywords: 'device={}'
        }
      };
      const mergedBidderRequest = {...bidderRequest, ortb2};
      const ortbRequest = spec.buildRequests(bidRequests, mergedBidderRequest).data;
      expect(ortbRequest.site.id).to.equal('144da00b-8309-4b2e-9482-4b3829c0b54a');
      expect(ortbRequest.site.name).to.equal('game');
      expect(ortbRequest.site.domain).to.equal('game.wiki.com');
      expect(ortbRequest.site.cat[0]).to.equal('IAB1');
      expect(ortbRequest.site.sectioncat[0]).to.equal('IAB1-1');
      expect(ortbRequest.site.pagecat[0]).to.equal('IAB1-1');
      expect(ortbRequest.site.page).to.equal('https://game.wiki.com/craft');
      expect(ortbRequest.site.ref).to.equal('https://www.google.com/');
      expect(ortbRequest.site.keywords).to.equal('device={}');
    });

    it('should set from floor module if no bidfloor is sent', function () {
      const clonedBidderRequests = deepClone(bidderRequest);
      const clonedBidRequests = deepClone(bidRequests);
      delete clonedBidRequests[0].params.bidfloor;
      const bidfloor = 1.00
      clonedBidRequests[0].getFloor = () => {
        return { currency: 'USD', floor: 1.00 };
      };
      clonedBidderRequests.bids = clonedBidRequests;
      const ortbRequest = spec.buildRequests(clonedBidRequests, clonedBidderRequests).data;
      expect(ortbRequest.imp[0].bidfloor).to.equal(bidfloor);
    });

    it('should set default secure value if not present', function () {
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(ortbRequest.imp[0].secure).to.equal(1);
    });

    it('should set secure to request when present', function () {
      const clonedBidderReqest = deepClone(bidderRequest);
      const clonedBidRequests = deepClone(bidRequests);
      clonedBidRequests[0].ortb2Imp.secure = 0;
      clonedBidderReqest.bids = clonedBidRequests;

      let ortbRequest = spec.buildRequests(clonedBidRequests, clonedBidderReqest).data;
      expect(0).to.equal(ortbRequest.imp[0].secure);

      clonedBidRequests[0].ortb2Imp.secure = 1;
      ortbRequest = spec.buildRequests(clonedBidRequests, clonedBidderReqest).data;
      expect(1).to.equal(ortbRequest.imp[0].secure);
    });

    const extFirstPartyData = {
      data: {
        firstPartyKey: 'firstPartyValue',
        firstPartyKey2: ['value', 'value2']
      },
      custom: 'custom_data',
      custom_kvp: {
        customKey: 'customValue'
      }
    }

    function validateExtFirstPartyData(ext) {
      expect(ext.data.firstPartyKey).to.equal('firstPartyValue');
      expect(ext.data.firstPartyKey2).to.eql(['value', 'value2']);
      expect(ext.custom).to.equal('custom_data');
      expect(ext.custom_kvp.customKey).to.equal('customValue');
    }

    it('should set site first party data', function() {
      const ortb2 = {
        site: {
          ext: extFirstPartyData,
          search: 'test search'
        }
      };

      const bidderRequestMerged = {...bidderRequest, ortb2};
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequestMerged).data;

      validateExtFirstPartyData(ortbRequest.site.ext)
      expect(ortbRequest.site.search).to.equal('test search')
    });

    it('should set user first party data', function() {
      const ortb2 = {
        user: {
          ext: extFirstPartyData,
          yob: 1998
        }
      };

      const bidderRequestMerged = {...bidderRequest, ortb2};
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequestMerged).data;

      validateExtFirstPartyData(ortbRequest.user.ext)
      expect(ortbRequest.user.yob).to.equal(1998)
    });

    it('should set imp first party data', function() {
      const clonedBidderRequest = deepClone(bidderRequest);
      const clonedBidRequests = deepClone(bidRequests);
      const metric = { type: 'viewability', value: 0.8 };
      clonedBidRequests[0].ortb2Imp = {
        ext: extFirstPartyData,
        metric: [metric],
        clickbrowser: 1
      };
      clonedBidderRequest.bids = clonedBidRequests;

      const ortbRequest = spec.buildRequests(clonedBidRequests, clonedBidderRequest).data;

      validateExtFirstPartyData(ortbRequest.imp[0].ext)
      expect(ortbRequest.imp[0].tagid).to.equal('1');
      expect(ortbRequest.imp[0].metric[0]).to.deep.equal(metric);
      expect(ortbRequest.imp[0].clickbrowser).to.equal(1)
    });

    it('should set app first party data', function() {
      const ortb2 = {
        app: {
          ext: extFirstPartyData,
          ver: 'v1.0'
        }
      };

      const bidderRequestMerged = {...bidderRequest, ortb2};
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequestMerged).data;

      validateExtFirstPartyData(ortbRequest.app.ext)
      expect(ortbRequest.app.ver).to.equal('v1.0')
    });

    it('should set device first party data', function() {
      const ortb2 = {
        device: {
          ext: extFirstPartyData,
          os: 'ios'
        }
      };

      const bidderRequestMerged = {...bidderRequest, ortb2};
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequestMerged).data;

      validateExtFirstPartyData(ortbRequest.device.ext)
      expect(ortbRequest.device.os).to.equal('ios')
    });

    it('should set pmp first party data', function() {
      const ortb2 = {
        pmp: {
          ext: extFirstPartyData,
          private_auction: 1
        }
      };

      let bidderRequestMerged = {...bidderRequest, ortb2};
      const ortbRequest = spec.buildRequests(bidRequests, bidderRequestMerged).data;

      validateExtFirstPartyData(ortbRequest.pmp.ext)
      expect(ortbRequest.pmp.private_auction).to.equal(1)
    });
  });

  describe('buildRequests() banner-multiple', function () {
    const multiBidRequests = [{
      'bidder': 'stackadapt',
      'params': {
        'publisherId': '11111',
        'placementId': '1'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250]]
        }
      },
      'ortb2Imp': {
        'ext': {
          'tid': '2121283921',
        }
      },
      'sizes': [[300, 250]],
      'bidId': '001',
      'bidderRequestId': '5ce18294-9682-4ad0-1c92-0ab12bg8dc5e',
      'auctionId': '8d6e5b89-9c9f-4f25-9d4f-e4c08b0b9d7f',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'aa837ec1-ba90-3821-jduq-1cc083921a9a',
      'src': 'client',
      'bidRequestsCount': 5
    }, {
      'bidder': 'stackadapt',
      'params': {
        'publisherId': '11111',
        'placementId': '2'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[336, 280], [320, 100]]
        }
      },
      'ortb2Imp': {
        'ext': {
          'tid': '3728192832',
        }
      },
      'sizes': [[336, 280], [320, 100]],
      'bidId': '002',
      'bidderRequestId': '5ce18294-9682-4ad0-1c92-0ab12bg8dc5e',
      'auctionId': '8d6e5b89-9c9f-4f25-9d4f-e4c08b0b9d7f',
      'adUnitCode': 'div-gpt-ad-1460505748561-123',
      'transactionId': 'au289bg3-bc89-3894-dfak-3dp281927l1b',
      'src': 'client',
      'bidRequestsCount': 10
    }];

    const bidderRequest = {
      'bidderCode': 'stackadapt',
      'auctionId': '8d6e5b89-9c9f-4f25-9d4f-e4c08b0b9d7f',
      ortb2: {
        source: {
          tid: '8d6e5b89-9c9f-4f25-9d4f-e4c08b0b9d7f',
        }
      },
      'bidderRequestId': '5ce18294-9682-4ad0-1c92-0ab12bg8dc5e',
      'auctionStart': 1731042158610,
      'timeout': 1750,
      'refererInfo': {
        'reachedTop': true,
        'numIframes': 0,
        'isAmp': false,
        'page': 'https://www.mobile.com/test',
        'domain': 'www.mobile.com',
        'ref': 'https://testsite.com/',
      },
      'start': 1731042158587
    };

    it('should correctly set multiple impressions', function () {
      const ortbRequest = spec.buildRequests(multiBidRequests, bidderRequest).data;
      expect(ortbRequest.imp.length).to.equal(2);
      expect(ortbRequest.source?.tid).to.equal(bidderRequest.ortb2.source.tid);
      expect(ortbRequest.imp[0].ext?.tid).to.equal('2121283921');
      expect(ortbRequest.imp[1].ext?.tid).to.equal('3728192832');
    });

    it('should correctly set the tagids for each impression', function () {
      const ortbRequest = spec.buildRequests(multiBidRequests, bidderRequest).data;

      expect(ortbRequest.imp[0].id).to.equal('001');
      expect(ortbRequest.imp[0].tagid).to.equal('1');

      expect(ortbRequest.imp[1].id).to.equal('002');
      expect(ortbRequest.imp[1].tagid).to.equal('2');
    });

    it('should set the sizes for each impression', function () {
      const ortbRequest = spec.buildRequests(multiBidRequests, bidderRequest).data;

      expect(ortbRequest.imp[0].banner.format[0].w).to.equal(300);
      expect(ortbRequest.imp[0].banner.format[0].h).to.equal(250);

      expect(ortbRequest.imp[1].banner.format[0].w).to.equal(336);
      expect(ortbRequest.imp[1].banner.format[0].h).to.equal(280);
      expect(ortbRequest.imp[1].banner.format[1].w).to.equal(320);
      expect(ortbRequest.imp[1].banner.format[1].h).to.equal(100);
    });
  });

  if (FEATURES.VIDEO) {
    describe('buildRequests() video', function () {
      const videoBidRequests = [{
        'bidder': 'stackadapt',
        'params': {
          'publisherId': '11111',
          'placementId': '1'
        },
        'mediaTypes': {
          'video': {
            'playerSize': [187, 105],
            'api': [1, 2],
            'mimes': [
              'video/mp4',
              'video/x-ms-wmv',
              'application/javascript'
            ],
            'protocols': [2, 3, 4, 5, 6],
            'minduration': 1,
            'maxduration': 60
          }
        },
        'ortb2Imp': {
          'ext': {
            'tid': '2121283921',
          }
        },
        'transactionId': 'aa837ec1-ba90-3821-jduq-1cc083921a9a',
        'adUnitCode': 'div-gpt-ad-1460505748561-0',
        'bidId': '001',
        'bidderRequestId': '5ce18294-9682-4ad0-1c92-0ab12bg8dc5e',
        'auctionId': '8d6e5b89-9c9f-4f25-9d4f-e4c08b0b9d7f',
        'src': 'client',
        'bidRequestsCount': 10
      }];

      const bidderRequest = {
        'bidderCode': 'stackadapt',
        'auctionId': '8d6e5b89-9c9f-4f25-9d4f-e4c08b0b9d7f',
        'bidderRequestId': '5ce18294-9682-4ad0-1c92-0ab12bg8dc5e',
        'auctionStart': 1731042158610,
        'timeout': 1750,
        'refererInfo': {
          'reachedTop': true,
          'numIframes': 0,
          'isAmp': false,
          'page': 'https://www.mobile.com/test',
          'domain': 'www.mobile.com',
          'ref': 'https://testsite.com/',
        },
        'start': 1731042158587,
      };

      it('should set the ad size', function () {
        const ortbRequest = spec.buildRequests(videoBidRequests, bidderRequest).data;
        expect(ortbRequest.imp[0].video.w).to.equal(187);
        expect(ortbRequest.imp[0].video.h).to.equal(105);
      });

      it('should set mimes', function () {
        const ortbRequest = spec.buildRequests(videoBidRequests, bidderRequest).data;
        expect(ortbRequest.imp[0].video.mimes[0]).to.equal('video/mp4');
        expect(ortbRequest.imp[0].video.mimes[1]).to.equal('video/x-ms-wmv');
        expect(ortbRequest.imp[0].video.mimes[2]).to.equal('application/javascript');
      });

      it('should set min and max duration', function () {
        const ortbRequest = spec.buildRequests(videoBidRequests, bidderRequest).data;
        expect(ortbRequest.imp[0].video.minduration).to.equal(1);
        expect(ortbRequest.imp[0].video.maxduration).to.equal(60);
      });

      it('should set api frameworks array', function () {
        const ortbRequest = spec.buildRequests(videoBidRequests, bidderRequest).data;
        expect(ortbRequest.imp[0].video.api[0]).to.equal(1);
        expect(ortbRequest.imp[0].video.api[1]).to.equal(2);
      });

      it('should set the protocols array', function () {
        const ortbRequest = spec.buildRequests(videoBidRequests, bidderRequest).data;
        expect(ortbRequest.imp[0].video.protocols[0]).to.equal(2);
        expect(ortbRequest.imp[0].video.protocols[1]).to.equal(3);
        expect(ortbRequest.imp[0].video.protocols[2]).to.equal(4);
        expect(ortbRequest.imp[0].video.protocols[3]).to.equal(5);
        expect(ortbRequest.imp[0].video.protocols[4]).to.equal(6);
      });

      it('should set skip if present', function () {
        const clonnedVideoBidRequests = deepClone(videoBidRequests);
        clonnedVideoBidRequests[0].mediaTypes.video.skip = 1;
        clonnedVideoBidRequests[0].mediaTypes.video.skipmin = 5;
        clonnedVideoBidRequests[0].mediaTypes.video.skipafter = 10;

        const ortbRequest = spec.buildRequests(clonnedVideoBidRequests, bidderRequest).data;
        expect(ortbRequest.imp[0].video.skip).to.equal(1);
        expect(ortbRequest.imp[0].video.skipmin).to.equal(5);
        expect(ortbRequest.imp[0].video.skipafter).to.equal(10);
      });

      it('should set bitrate if present', function () {
        const clonnedVideoBidRequests = deepClone(videoBidRequests);
        clonnedVideoBidRequests[0].mediaTypes.video.minbitrate = 100;
        clonnedVideoBidRequests[0].mediaTypes.video.maxbitrate = 500;

        const ortbRequest = spec.buildRequests(clonnedVideoBidRequests, bidderRequest).data;
        expect(ortbRequest.imp[0].video.minbitrate).to.equal(100);
        expect(ortbRequest.imp[0].video.maxbitrate).to.equal(500);
      });

      it('should set pos if present', function () {
        const clonnedVideoBidRequests = deepClone(videoBidRequests);
        clonnedVideoBidRequests[0].mediaTypes.video.pos = 1;

        const ortbRequest = spec.buildRequests(clonnedVideoBidRequests, bidderRequest).data;
        expect(ortbRequest.imp[0].video.pos).to.equal(1);
      });

      it('should set playbackmethod if present', function () {
        const clonnedVideoBidRequests = deepClone(videoBidRequests);
        clonnedVideoBidRequests[0].mediaTypes.video.playbackmethod = [1];

        const ortbRequest = spec.buildRequests(clonnedVideoBidRequests, bidderRequest).data;
        expect(ortbRequest.imp[0].video.playbackmethod[0]).to.equal(1);
      });

      it('should set startdelay if present', function () {
        const clonnedVideoBidRequests = deepClone(videoBidRequests);
        clonnedVideoBidRequests[0].mediaTypes.video.startdelay = -1;

        const ortbRequest = spec.buildRequests(clonnedVideoBidRequests, bidderRequest).data;
        expect(ortbRequest.imp[0].video.startdelay).to.equal(-1);
      });

      it('should set placement if present', function () {
        const clonnedVideoBidRequests = deepClone(videoBidRequests);
        clonnedVideoBidRequests[0].mediaTypes.video.plcmt = 3;

        const ortbRequest = spec.buildRequests(clonnedVideoBidRequests, bidderRequest).data;
        expect(ortbRequest.imp[0].video.plcmt).to.equal(3);
      });

      it('should set plcmt if present', function () {
        const clonnedVideoBidRequests = deepClone(videoBidRequests);
        clonnedVideoBidRequests[0].mediaTypes.video.plcmt = 3;

        const ortbRequest = spec.buildRequests(clonnedVideoBidRequests, bidderRequest).data;
        expect(ortbRequest.imp[0].video.plcmt).to.equal(3);
      });
    });
  }

  describe('getUserSyncs', function () {
    it('should get usersync', function () {
      const syncOptions = {
        pixelEnabled: true
      };
      const gdprConsentString = 'CQGRvoAQGRvoAAHABAENBKFsAP_gAEPgAAAAKhNV';
      const gdprConsent = {
        consentString: gdprConsentString,
        gdprApplies: true
      };
      const uspConsent = '1YNY';
      const gppConsent = {
        gppString: 'DCACTA~1YAB',
        applicableSections: [7, 8]
      };

      let syncs = spec.getUserSyncs(syncOptions, [], gdprConsent, uspConsent, gppConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.equal('https://sync.srv.stackadapt.com/sync?nid=pjs&gdpr=1&gdpr_consent=CQGRvoAQGRvoAAHABAENBKFsAP_gAEPgAAAAKhNV&us_privacy=1YNY&gpp=DCACTA~1YAB&gpp_sid=7,8');

      let params = new URLSearchParams(new URL(syncs[0].url).search);
      expect(params.get('us_privacy')).to.equal(uspConsent);
      expect(params.get('gdpr')).to.equal('1');
      expect(params.get('gdpr_consent')).to.equal(gdprConsentString);
      expect(params.get('gpp')).to.equal(gppConsent.gppString);
      expect(params.get('gpp_sid')).to.equal(gppConsent.applicableSections.toString());
    });
  });
});
