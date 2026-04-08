import { expect } from 'chai';
import { spec } from 'modules/risemediatechBidAdapter.js';

describe('RiseMediaTech adapter', () => {
  const validBidRequest = {
    bidder: 'risemediatech',
    params: {
      publisherId: '12345',
      adSlot: '/1234567/adunit',
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]],
      },
    },
    bidId: '1abc',
    auctionId: '2def',
  };

  const bidderRequest = {
    refererInfo: {
      page: 'https://example.com',
    },
    timeout: 3000,
    gdprConsent: {
      gdprApplies: true,
      consentString: 'consent123',
    },
    uspConsent: '1YNN',
  };

  const serverResponse = {
    body: {
      id: '2def',
      seatbid: [
        {
          bid: [
            {
              id: '1abc',
              impid: '1abc',
              price: 1.5,
              adm: '<div>Ad</div>',
              w: 300,
              h: 250,
              crid: 'creative123',
              adomain: ['example.com'],
            },
          ],
        },
      ],
    },
  };

  describe('isBidRequestValid', () => {
    it('should return true for valid bid request', () => {
      expect(spec.isBidRequestValid(validBidRequest)).to.equal(true);
    });

    it('should return false for invalid video bid request', () => {
      const invalidVideoRequest = {
        ...validBidRequest,
        mediaTypes: {
          video: {
            mimes: [],
          },
        },
      };
      expect(spec.isBidRequestValid(invalidVideoRequest)).to.equal(false);
    });

    it('should return false for video bid request with missing mimes', () => {
      const invalidVideoRequest = {
        ...validBidRequest,
        mediaTypes: {
          video: {
            w: 640,
            h: 480
            // mimes missing
          }
        }
      };
      expect(spec.isBidRequestValid(invalidVideoRequest)).to.equal(false);
    });

    it('should return false for video request with invalid mimes (not an array)', () => {
      const invalidBid = {
        ...validBidRequest,
        mediaTypes: {
          video: {
            mimes: 'video/mp4', // Not an array
            w: 640,
            h: 480
          }
        }
      };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false for video request with empty mimes array', () => {
      const invalidBid = {
        ...validBidRequest,
        mediaTypes: {
          video: {
            mimes: [],
            w: 640,
            h: 480
          }
        }
      };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false for video request with width <= 0', () => {
      const invalidBid = {
        ...validBidRequest,
        mediaTypes: {
          video: {
            mimes: ['video/mp4'],
            w: 0,
            h: 480
          }
        }
      };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false for video request with height <= 0', () => {
      const invalidBid = {
        ...validBidRequest,
        mediaTypes: {
          video: {
            mimes: ['video/mp4'],
            w: 640,
            h: -10
          }
        }
      };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false for video bid request with invalid width', () => {
      const invalidVideoRequest = {
        ...validBidRequest,
        mediaTypes: {
          video: {
            mimes: ['video/mp4'],
            w: 0,
            h: 480
          }
        }
      };
      expect(spec.isBidRequestValid(invalidVideoRequest)).to.equal(false);
    });

    it('should return false for video bid request with invalid height', () => {
      const invalidVideoRequest = {
        ...validBidRequest,
        mediaTypes: {
          video: {
            mimes: ['video/mp4'],
            w: 640,
            h: 0
          }
        }
      };
      expect(spec.isBidRequestValid(invalidVideoRequest)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    it('should build a valid server request', () => {
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      expect(request).to.be.an('object');
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://dev-ads.risemediatech.com/ads/rtb/prebid/js');
      expect(request.data).to.be.an('object');
    });

    it('should include GDPR and USP consent in the request', () => {
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const { regs, user } = request.data;
      expect(regs.ext).to.have.property('gdpr', 1);
      expect(user.ext).to.have.property('consent', 'consent123');
      expect(regs.ext).to.have.property('us_privacy', '1YNN');
    });

    it('should include banner impressions in the request', () => {
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const { imp } = request.data;
      expect(imp).to.be.an('array');
      expect(imp[0]).to.have.property('banner');
      expect(imp[0].banner).to.have.property('format').with.lengthOf(2);
    });

    it('should set request.test to 0 if bidderRequest.test is not provided', () => {
      const request = spec.buildRequests([validBidRequest], { ...bidderRequest });
      expect(request.data.test).to.equal(0);
    });

    it('should set request.test to bidderRequest.test if provided', () => {
      const testBidderRequest = { ...bidderRequest, test: 1 };
      const request = spec.buildRequests([validBidRequest], testBidderRequest);
      expect(request.data.test).to.equal(1);
    });

    it('should build a video impression if only video mediaType is present', () => {
      const videoBidRequest = {
        ...validBidRequest,
        mediaTypes: {
          video: {
            mimes: ['video/mp4'],
            w: 640,
            h: 480
          }
        },
        params: {
          ...validBidRequest.params,
          mimes: ['video/mp4'],
          minduration: 5,
          maxduration: 30,
          startdelay: 0,
          maxseq: 1,
          poddur: 60,
          protocols: [2, 3]
        }
      };
      const request = spec.buildRequests([videoBidRequest], bidderRequest);
      const { imp } = request.data;
      expect(imp[0]).to.have.property('video');
      expect(imp[0]).to.not.have.property('banner');
      expect(imp[0].video).to.include({ w: 640, h: 480 });
      expect(imp[0].video.mimes).to.include('video/mp4');
    });

    it('should set gdpr to 0 if gdprApplies is false', () => {
      const noGdprBidderRequest = {
        ...bidderRequest,
        gdprConsent: {
          gdprApplies: false,
          consentString: 'consent123'
        }
      };
      const request = spec.buildRequests([validBidRequest], noGdprBidderRequest);
      expect(request.data.regs.ext).to.have.property('gdpr', 0);
      expect(request.data.user.ext).to.have.property('consent', 'consent123');
    });

    it('should set regs and regs.ext to {} if not already set when only USP consent is present', () => {
      const onlyUspBidderRequest = {
        ...bidderRequest,
        gdprConsent: undefined,
        uspConsent: '1YNN'
      };
      const request = spec.buildRequests([validBidRequest], onlyUspBidderRequest);
      expect(request.data.regs).to.be.an('object');
      expect(request.data.regs.ext).to.be.an('object');
      expect(request.data.regs.ext).to.have.property('us_privacy', '1YNN');
    });
  });

  describe('interpretResponse', () => {
    it('should interpret the server response correctly', () => {
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.be.an('array').with.lengthOf(1);
      const bid = bids[0];
      expect(bid).to.have.property('requestId', '1abc');
      expect(bid).to.have.property('cpm', 1.5);
      expect(bid).to.have.property('width', 300);
      expect(bid).to.have.property('height', 250);
      expect(bid).to.have.property('creativeId', 'creative123');
      expect(bid).to.have.property('currency', 'USD');
      expect(bid).to.have.property('netRevenue', true);
      expect(bid).to.have.property('ttl', 60);
    });

    it('should return an empty array if no bids are present', () => {
      const emptyResponse = { body: { seatbid: [] } };
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(emptyResponse, request);
      expect(bids).to.be.an('array').with.lengthOf(0);
    });

    it('should interpret multiple seatbids as multiple bids', () => {
      const multiSeatbidResponse = {
        body: {
          id: '2def',
          seatbid: [
            {
              bid: [
                {
                  id: '1abc',
                  impid: '1abc',
                  price: 1.5,
                  adm: '<div>Ad1</div>',
                  w: 300,
                  h: 250,
                  crid: 'creative123',
                  adomain: ['example.com'],
                  mtype: 1
                },
              ],
            },
            {
              bid: [
                {
                  id: '2bcd',
                  impid: '2bcd',
                  price: 2.0,
                  adm: '<div>Ad2</div>',
                  w: 728,
                  h: 90,
                  crid: 'creative456',
                  adomain: ['another.com'],
                  mtype: 2
                },
              ],
            },
          ],
        },
      };
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(multiSeatbidResponse, request);
      expect(bids).to.be.an('array').with.lengthOf(2);
      expect(bids[0]).to.have.property('requestId', '1abc');
      expect(bids[1]).to.have.property('requestId', '2bcd');
      expect(bids[0].mediaType).to.equal('banner');
      expect(bids[1].mediaType).to.equal('video');
      expect(bids[0]).to.have.property('cpm', 1.5);
      expect(bids[1]).to.have.property('cpm', 2.0);
    });

    it('should set mediaType to banner if mtype is missing', () => {
      const responseNoMtype = {
        body: {
          id: '2def',
          seatbid: [
            {
              bid: [
                {
                  id: '1abc',
                  impid: '1abc',
                  price: 1.5,
                  adm: '<div>Ad</div>',
                  w: 300,
                  h: 250,
                  crid: 'creative123',
                  adomain: ['example.com']
                  // mtype missing
                }
              ]
            }
          ]
        }
      };
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(responseNoMtype, request);
      expect(bids[0].mediaType).to.equal('banner');
    });

    it('should set meta.advertiserDomains to an empty array if adomain is missing', () => {
      const responseWithoutAdomain = {
        body: {
          id: '2def',
          seatbid: [
            {
              bid: [
                {
                  id: '1abc',
                  impid: '1abc',
                  price: 1.5,
                  adm: '<div>Ad</div>',
                  w: 300,
                  h: 250,
                  crid: 'creative123'
                  // adomain is missing
                }
              ]
            }
          ]
        }
      };
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(responseWithoutAdomain, request);
      expect(bids[0].meta.advertiserDomains).to.be.an('array').that.is.empty;
    });

    it('should return an empty array and warn if server response is undefined', () => {
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(undefined, request);
      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should return an empty array and warn if server response body is missing', () => {
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse({}, request);
      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should return bids from converter if present', () => {
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.be.an('array').with.lengthOf(1);
    });

    it('should log a warning and not set mediaType for unknown mtype', () => {
      const responseWithUnknownMtype = {
        body: {
          id: '2def',
          seatbid: [
            {
              bid: [
                {
                  id: '1abc',
                  impid: '1abc',
                  price: 1.5,
                  adm: '<div>Ad</div>',
                  w: 300,
                  h: 250,
                  crid: 'creative123',
                  adomain: ['example.com'],
                  mtype: 999, // Unknown mtype
                },
              ],
            },
          ],
        },
      };
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(responseWithUnknownMtype, request);
      expect(bids).to.be.an('array').with.lengthOf(1);
      expect(bids[0].meta).to.not.have.property('mediaType');
    });

    it('should include dealId if present in the bid response', () => {
      const responseWithDealId = {
        body: {
          id: '2def',
          seatbid: [
            {
              bid: [
                {
                  id: '1abc',
                  impid: '1abc',
                  price: 1.5,
                  adm: '<div>Ad</div>',
                  w: 300,
                  h: 250,
                  crid: 'creative123',
                  adomain: ['example.com'],
                  dealid: 'deal123',
                },
              ],
            },
          ],
        },
      };
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(responseWithDealId, request);
      expect(bids).to.be.an('array').with.lengthOf(1);
      expect(bids[0]).to.have.property('dealId', 'deal123');
    });

    it('should handle bids with missing price gracefully', () => {
      const responseWithoutPrice = {
        body: {
          id: '2def',
          seatbid: [
            {
              bid: [
                {
                  id: '1abc',
                  impid: '1abc',
                  adm: '<div>Ad</div>',
                  w: 300,
                  h: 250,
                  crid: 'creative123',
                  adomain: ['example.com'],
                },
              ],
            },
          ],
        },
      };
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(responseWithoutPrice, request);
      expect(bids).to.be.an('array').that.is.not.empty;
    });
  });

  describe('getUserSyncs', () => {
    it('should return null as user syncs are not implemented', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], bidderRequest.gdprConsent, bidderRequest.uspConsent);
      expect(syncs).to.be.null;
    });
  });
});
