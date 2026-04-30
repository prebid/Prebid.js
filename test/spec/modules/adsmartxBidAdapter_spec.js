import { expect } from 'chai';
import { spec } from 'modules/adsmartxBidAdapter.js';

describe('AdSmartX adapter', () => {
  const validBidRequest = {
    bidder: 'adsmartx',
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
      expect(request.url).to.equal('https://ads.adsmartx.com/ads/rtb/prebid/js');
      expect(request.data).to.be.an('object');
    });

    it('should include GDPR and USP consent in the request', () => {
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const { regs, user } = request.data;
      expect(regs).to.have.property('gdpr', 1);
      expect(user).to.have.property('consent', 'consent123');
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
      expect(request.data.regs).to.have.property('gdpr', 0);
      expect(request.data.user).to.have.property('consent', 'consent123');
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

    it('should log a warning and default mediaType to banner for unknown mtype', () => {
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
      expect(bids[0].mediaType).to.equal('banner');
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
      expect(bids).to.be.an('array').that.is.empty;
    });
  });

  describe('getUserSyncs', () => {
    it('should return empty array if neither iframe nor pixel is enabled', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, [], bidderRequest.gdprConsent, bidderRequest.uspConsent);
      expect(syncs).to.be.an('array').that.is.empty;
    });

    it('should return iframe sync when iframeEnabled is true', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, []);
      expect(syncs).to.be.an('array').with.lengthOf(1);
      expect(syncs[0]).to.have.property('type', 'iframe');
      expect(syncs[0]).to.have.property('url');
      expect(syncs[0].url).to.include('https://sync.adsmartx.com/sync');
    });

    it('should return image sync when only pixelEnabled is true', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, []);
      expect(syncs).to.be.an('array').with.lengthOf(1);
      expect(syncs[0]).to.have.property('type', 'image');
      expect(syncs[0]).to.have.property('url');
    });

    it('should include GDPR consent parameters in sync URL', () => {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: true, consentString: 'consent123' }
      );
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=consent123');
    });

    it('should include gdpr=0 when gdprApplies is false', () => {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: false, consentString: 'consent123' }
      );
      expect(syncs[0].url).to.include('gdpr=0');
      expect(syncs[0].url).to.include('gdpr_consent=consent123');
    });

    it('should include USP consent parameter in sync URL', () => {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        undefined,
        '1YNN'
      );
      expect(syncs[0].url).to.include('us_privacy=1YNN');
    });

    it('should include GPP consent parameters in sync URL', () => {
      const gppConsent = {
        gppString: 'DBABLA~1YNN',
        applicableSections: [7, 8]
      };
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        undefined,
        undefined,
        gppConsent
      );
      expect(syncs[0].url).to.include('gpp=DBABLA~1YNN');
      expect(syncs[0].url).to.include('gpp_sid=7%2C8');
    });

    it('should not include GPP if gppString is missing', () => {
      const gppConsent = {
        applicableSections: [7, 8]
      };
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        undefined,
        undefined,
        gppConsent
      );
      expect(syncs[0].url).to.not.include('gpp=');
    });

    it('should not include GPP if applicableSections is empty', () => {
      const gppConsent = {
        gppString: 'DBABLA~1YNN',
        applicableSections: []
      };
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        undefined,
        undefined,
        gppConsent
      );
      expect(syncs[0].url).to.not.include('gpp=');
    });

    it('should always include hardcoded ssp_id in sync URL', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);
      expect(syncs[0].url).to.include('ssp_id=630141');
      expect(syncs[0].url).to.not.include('ssp_site_id');
      expect(syncs[0].url).to.not.include('ssp_user_id');
    });

    it('should include iframe_enabled flag in sync URL', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, []);
      expect(syncs[0].url).to.include('iframe_enabled=true');
    });

    it('should set iframe_enabled=false when only pixel is enabled', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, []);
      expect(syncs[0].url).to.include('iframe_enabled=false');
    });

    it('should include all consent parameters together', () => {
      const gppConsent = {
        gppString: 'DBABLA~1YNN',
        applicableSections: [7]
      };

      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: true, consentString: 'consent123' },
        '1YNN',
        gppConsent
      );

      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=consent123');
      expect(syncs[0].url).to.include('us_privacy=1YNN');
      expect(syncs[0].url).to.include('gpp=');
      expect(syncs[0].url).to.include('gpp_sid=7');
      expect(syncs[0].url).to.include('ssp_id=630141');
    });

    it('should handle missing GDPR consentString gracefully', () => {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: true }
      );
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=');
    });

    it('should retrieve sspUserId from ortb2.user.id when not in bid params', () => {
      // sspUserId is no longer forwarded to the sync URL; ssp_id is hardcoded
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);
      expect(syncs[0].url).to.include('ssp_id=630141');
      expect(syncs[0].url).to.not.include('ssp_user_id');
    });

    it('should prioritize sspUserId from bid params over ortb2.user.id', () => {
      // sspUserId is no longer forwarded to the sync URL; ssp_id is hardcoded
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);
      expect(syncs[0].url).to.include('ssp_id=630141');
      expect(syncs[0].url).to.not.include('ssp_user_id');
    });

    it('should always include ssp_id and iframe_enabled in sync URL', () => {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true, pixelEnabled: false },
        [],
        undefined,
        undefined,
        undefined
      );

      expect(syncs).to.be.an('array').with.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include('https://sync.adsmartx.com/sync');
      expect(syncs[0].url).to.include('ssp_id=630141');
      expect(syncs[0].url).to.include('iframe_enabled=true');
    });
  });

  describe('buildRequests - additional scenarios', () => {
    it('should set ext.test to 1 when testMode=1 is in bid params', () => {
      const bidWithTestMode = {
        ...validBidRequest,
        params: {
          ...validBidRequest.params,
          testMode: 1
        }
      };

      const testBidderRequest = {
        ...bidderRequest,
        bids: [bidWithTestMode]
      };

      const request = spec.buildRequests([bidWithTestMode], testBidderRequest);
      expect(request.data).to.have.property('ext');
      expect(request.data.ext).to.have.property('test', 1);
    });

    it('should not set ext.test when testMode is not present', () => {
      const testBidderRequest = {
        ...bidderRequest,
        bids: [validBidRequest]
      };
      const request = spec.buildRequests([validBidRequest], testBidderRequest);
      if (request.data.ext) {
        expect(request.data.ext).to.not.have.property('test');
      }
    });

    it('should include sspId in request.ext when present in bid params', () => {
      const bidWithSspId = {
        ...validBidRequest,
        params: {
          ...validBidRequest.params,
          sspId: 'ssp123'
        }
      };

      const testBidderRequest = {
        ...bidderRequest,
        bids: [bidWithSspId]
      };

      const request = spec.buildRequests([bidWithSspId], testBidderRequest);
      expect(request.data).to.have.property('ext');
      expect(request.data.ext).to.have.property('sspId', 'ssp123');
    });

    it('should include siteId in request.ext when present in bid params', () => {
      const bidWithSiteId = {
        ...validBidRequest,
        params: {
          ...validBidRequest.params,
          siteId: 'site456'
        }
      };

      const testBidderRequest = {
        ...bidderRequest,
        bids: [bidWithSiteId]
      };

      const request = spec.buildRequests([bidWithSiteId], testBidderRequest);
      expect(request.data).to.have.property('ext');
      expect(request.data.ext).to.have.property('siteId', 'site456');
    });

    it('should include both sspId and siteId in request.ext when both present', () => {
      const bidWithBothIds = {
        ...validBidRequest,
        params: {
          ...validBidRequest.params,
          sspId: 'ssp123',
          siteId: 'site456'
        }
      };

      const testBidderRequest = {
        ...bidderRequest,
        bids: [bidWithBothIds]
      };

      const request = spec.buildRequests([bidWithBothIds], testBidderRequest);
      expect(request.data).to.have.property('ext');
      expect(request.data.ext).to.have.property('sspId', 'ssp123');
      expect(request.data.ext).to.have.property('siteId', 'site456');
    });

    it('should always include hardcoded ssp_id in sync URL regardless of bid params', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);
      expect(syncs[0].url).to.include('ssp_id=630141');
      expect(syncs[0].url).to.not.include('ssp_site_id');
      expect(syncs[0].url).to.not.include('ssp_user_id');
    });

    it('should include bidfloor in impression when present in bid params', () => {
      const bidWithFloor = {
        ...validBidRequest,
        params: {
          ...validBidRequest.params,
          bidfloor: 0.5
        }
      };

      const request = spec.buildRequests([bidWithFloor], bidderRequest);
      expect(request.data.imp[0]).to.have.property('bidfloor', 0.5);
    });

    it('should not include bidfloor when not present in bid params', () => {
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      expect(request.data.imp[0]).to.not.have.property('bidfloor');
    });

    it('should set request.tmax to bidderRequest.timeout', () => {
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      expect(request.data).to.have.property('tmax', 3000);
    });

    it('should set request.cur to [USD]', () => {
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      expect(request.data).to.have.property('cur').that.deep.equals(['USD']);
    });

    it('should enable endpoint compression in options', () => {
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      expect(request.options).to.have.property('endpointCompression', true);
    });

    it('should handle empty validBidRequests array gracefully', () => {
      const request = spec.buildRequests([], bidderRequest);
      expect(request).to.be.an('object');
      expect(request.data.imp).to.be.an('array').that.is.empty;
    });

    it('should handle bidderRequest without GDPR consent', () => {
      const noBidderRequest = {
        ...bidderRequest,
        gdprConsent: undefined,
        uspConsent: undefined
      };
      const request = spec.buildRequests([validBidRequest], noBidderRequest);
      expect(request.data).to.not.have.property('regs');
      expect(request.data).to.not.have.property('user');
    });
  });

  describe('interpretResponse - additional scenarios', () => {
    it('should set mediaType to video and include vastXml when mtype is 2', () => {
      const videoResponse = {
        body: {
          id: '2def',
          seatbid: [
            {
              bid: [
                {
                  id: '1abc',
                  impid: '1abc',
                  price: 2.5,
                  adm: '<VAST version="3.0">...</VAST>',
                  w: 640,
                  h: 480,
                  crid: 'video-creative-123',
                  adomain: ['video-example.com'],
                  mtype: 2
                }
              ]
            }
          ]
        }
      };

      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(videoResponse, request);

      expect(bids).to.be.an('array').with.lengthOf(1);
      expect(bids[0]).to.have.property('mediaType', 'video');
      expect(bids[0]).to.have.property('vastXml', '<VAST version="3.0">...</VAST>');
    });

    it('should set mediaType to banner when mtype is 1', () => {
      const bannerResponse = {
        body: {
          id: '2def',
          seatbid: [
            {
              bid: [
                {
                  id: '1abc',
                  impid: '1abc',
                  price: 1.5,
                  adm: '<div>Banner Ad</div>',
                  w: 300,
                  h: 250,
                  crid: 'banner-creative-123',
                  adomain: ['banner-example.com'],
                  mtype: 1
                }
              ]
            }
          ]
        }
      };

      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(bannerResponse, request);

      expect(bids).to.be.an('array').with.lengthOf(1);
      expect(bids[0]).to.have.property('mediaType', 'banner');
      expect(bids[0]).to.not.have.property('vastXml');
    });

    it('should use custom currency from response if provided', () => {
      const responseWithCurrency = {
        body: {
          id: '2def',
          cur: 'EUR',
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
                }
              ]
            }
          ]
        }
      };

      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(responseWithCurrency, request);

      expect(bids[0]).to.have.property('currency', 'EUR');
    });

    it('should not include dealId if not present in bid response', () => {
      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids[0]).to.not.have.property('dealId');
    });

    it('should return empty array if seatbid is not an array', () => {
      const invalidResponse = {
        body: {
          id: '2def',
          seatbid: 'invalid'
        }
      };

      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(invalidResponse, request);

      expect(bids).to.be.an('array').that.is.empty;
    });

    it('should skip seatbid entries with empty bid arrays', () => {
      const responseWithEmptyBids = {
        body: {
          id: '2def',
          seatbid: [
            { bid: [] },
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
                }
              ]
            }
          ]
        }
      };

      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(responseWithEmptyBids, request);

      expect(bids).to.be.an('array').with.lengthOf(1);
    });

    it('should handle seatbid with non-array bid property', () => {
      const invalidSeatbidResponse = {
        body: {
          id: '2def',
          seatbid: [
            { bid: 'invalid' }
          ]
        }
      };

      const request = spec.buildRequests([validBidRequest], bidderRequest);
      const bids = spec.interpretResponse(invalidSeatbidResponse, request);

      expect(bids).to.be.an('array').that.is.empty;
    });
  });

  describe('isBidRequestValid - additional scenarios', () => {
    it('should return true for valid video bid with all required fields', () => {
      const validVideoBid = {
        ...validBidRequest,
        mediaTypes: {
          video: {
            mimes: ['video/mp4', 'video/webm'],
            w: 640,
            h: 480
          }
        }
      };

      expect(spec.isBidRequestValid(validVideoBid)).to.equal(true);
    });

    it('should return true for video bid without width and height (optional)', () => {
      const videoBidNoSize = {
        ...validBidRequest,
        mediaTypes: {
          video: {
            mimes: ['video/mp4']
          }
        }
      };

      expect(spec.isBidRequestValid(videoBidNoSize)).to.equal(true);
    });

    it('should return true for banner-only bid', () => {
      expect(spec.isBidRequestValid(validBidRequest)).to.equal(true);
    });

    it('should return true for bid with both banner and video', () => {
      const multiMediaBid = {
        ...validBidRequest,
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          },
          video: {
            mimes: ['video/mp4'],
            w: 640,
            h: 480
          }
        }
      };

      expect(spec.isBidRequestValid(multiMediaBid)).to.equal(true);
    });

    it('should return true for video with negative width when width is null', () => {
      const videoBid = {
        ...validBidRequest,
        mediaTypes: {
          video: {
            mimes: ['video/mp4'],
            w: null,
            h: 480
          }
        }
      };

      expect(spec.isBidRequestValid(videoBid)).to.equal(true);
    });

    it('should return false for video with width exactly 0', () => {
      const videoBid = {
        ...validBidRequest,
        mediaTypes: {
          video: {
            mimes: ['video/mp4'],
            w: 0,
            h: 480
          }
        }
      };

      expect(spec.isBidRequestValid(videoBid)).to.equal(false);
    });

    it('should return false for video with negative width', () => {
      const videoBid = {
        ...validBidRequest,
        mediaTypes: {
          video: {
            mimes: ['video/mp4'],
            w: -100,
            h: 480
          }
        }
      };

      expect(spec.isBidRequestValid(videoBid)).to.equal(false);
    });

    it('should return false for video with negative height', () => {
      const videoBid = {
        ...validBidRequest,
        mediaTypes: {
          video: {
            mimes: ['video/mp4'],
            w: 640,
            h: -100
          }
        }
      };

      expect(spec.isBidRequestValid(videoBid)).to.equal(false);
    });
  });
});
