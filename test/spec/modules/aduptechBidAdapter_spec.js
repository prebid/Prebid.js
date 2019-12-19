import { expect } from 'chai';
import {
  BIDDER_CODE,
  PUBLISHER_PLACEHOLDER,
  ENDPOINT_URL,
  ENDPOINT_METHOD,
  spec,
  extractGdprFromBidderRequest,
  extractParamsFromBidRequest,
  extractSizesFromBidRequest,
  extractTopWindowReferrerFromBidRequest,
  extractTopWindowUrlFromBidRequest
} from '../../../modules/aduptechBidAdapter';
import { newBidder } from '../../../src/adapters/bidderFactory';

describe('AduptechBidAdapter', () => {
  describe('extractGdprFromBidderRequest', () => {
    it('should handle empty bidder request', () => {
      const bidderRequest = null;
      expect(extractGdprFromBidderRequest(bidderRequest)).to.be.null;
    });

    it('should handle missing gdprConsent in bidder request', () => {
      const bidderRequest = {};
      expect(extractGdprFromBidderRequest(bidderRequest)).to.be.null;
    });

    it('should handle gdprConsent in bidder request', () => {
      const bidderRequest = {
        gdprConsent: {
          consentString: 'consentString',
          gdprApplies: true
        }
      };

      expect(extractGdprFromBidderRequest(bidderRequest)).to.deep.equal({
        consentString: bidderRequest.gdprConsent.consentString,
        consentRequired: true
      });
    });
  });

  describe('extractParamsFromBidRequest', () => {
    it('should handle empty bid request', () => {
      const bidRequest = null;
      expect(extractParamsFromBidRequest(bidRequest)).to.be.null;
    });

    it('should handle missing params in bid request', () => {
      const bidRequest = {};
      expect(extractParamsFromBidRequest(bidRequest)).to.be.null;
    });

    it('should handle params in bid request', () => {
      const bidRequest = {
        params: {
          foo: '123',
          bar: 456
        }
      };
      expect(extractParamsFromBidRequest(bidRequest)).to.deep.equal(bidRequest.params);
    });
  });

  describe('extractSizesFromBidRequest', () => {
    it('should handle empty bid request', () => {
      const bidRequest = null;
      expect(extractSizesFromBidRequest(bidRequest)).to.deep.equal([]);
    });

    it('should handle missing sizes in bid request', () => {
      const bidRequest = {};
      expect(extractSizesFromBidRequest(bidRequest)).to.deep.equal([]);
    });

    it('should handle sizes in bid request', () => {
      const bidRequest = {
        mediaTypes: {
          banner: {
            sizes: [[12, 34], [56, 78]]
          }
        }
      };
      expect(extractSizesFromBidRequest(bidRequest)).to.deep.equal(bidRequest.mediaTypes.banner.sizes);
    });

    it('should handle sizes in bid request (backward compatibility)', () => {
      const bidRequest = {
        sizes: [[12, 34], [56, 78]]
      };
      expect(extractSizesFromBidRequest(bidRequest)).to.deep.equal(bidRequest.sizes);
    });

    it('should prefer sizes in mediaTypes.banner', () => {
      const bidRequest = {
        sizes: [[12, 34]],
        mediaTypes: {
          banner: {
            sizes: [[56, 78]]
          }
        }
      };
      expect(extractSizesFromBidRequest(bidRequest)).to.deep.equal(bidRequest.mediaTypes.banner.sizes);
    });
  });

  describe('extractTopWindowReferrerFromBidRequest', () => {
    it('should use fallback if bid request is empty', () => {
      const bidRequest = null;
      expect(extractTopWindowReferrerFromBidRequest(bidRequest)).to.equal(window.top.document.referrer);
    });

    it('should use fallback if refererInfo in bid request is missing', () => {
      const bidRequest = {};
      expect(extractTopWindowReferrerFromBidRequest(bidRequest)).to.equal(window.top.document.referrer);
    });

    it('should use fallback if refererInfo.referer in bid request is missing', () => {
      const bidRequest = {
        refererInfo: {}
      };
      expect(extractTopWindowReferrerFromBidRequest(bidRequest)).to.equal(window.top.document.referrer);
    });

    it('should use fallback if refererInfo.referer in bid request is empty', () => {
      const bidRequest = {
        refererInfo: {
          referer: ''
        }
      };
      expect(extractTopWindowReferrerFromBidRequest(bidRequest)).to.equal(window.top.document.referrer);
    });

    it('should use refererInfo.referer from bid request ', () => {
      const bidRequest = {
        refererInfo: {
          referer: 'foobar'
        }
      };
      expect(extractTopWindowReferrerFromBidRequest(bidRequest)).to.equal(bidRequest.refererInfo.referer);
    });
  });

  describe('extractTopWindowUrlFromBidRequest', () => {
    it('should use fallback if bid request is empty', () => {
      const bidRequest = null;
      expect(extractTopWindowUrlFromBidRequest(bidRequest)).to.equal(window.top.location.href);
    });

    it('should use fallback if refererInfo in bid request is missing', () => {
      const bidRequest = {};
      expect(extractTopWindowUrlFromBidRequest(bidRequest)).to.equal(window.top.location.href);
    });

    it('should use fallback if refererInfo.canonicalUrl in bid request is missing', () => {
      const bidRequest = {
        refererInfo: {}
      };
      expect(extractTopWindowUrlFromBidRequest(bidRequest)).to.equal(window.top.location.href);
    });

    it('should use fallback if refererInfo.canonicalUrl in bid request is empty', () => {
      const bidRequest = {
        refererInfo: {
          canonicalUrl: ''
        }
      };
      expect(extractTopWindowUrlFromBidRequest(bidRequest)).to.equal(window.top.location.href);
    });

    it('should use refererInfo.canonicalUrl from bid request ', () => {
      const bidRequest = {
        refererInfo: {
          canonicalUrl: 'foobar'
        }
      };
      expect(extractTopWindowUrlFromBidRequest(bidRequest)).to.equal(bidRequest.refererInfo.canonicalUrl);
    });
  });

  describe('spec', () => {
    let adapter;

    beforeEach(() => {
      adapter = newBidder(spec);
    });

    describe('inherited functions', () => {
      it('exists and is a function', () => {
        expect(adapter.callBids).to.exist.and.to.be.a('function');
      });
    });

    describe('isBidRequestValid', () => {
      it('should return true when necessary information is given', () => {
        expect(spec.isBidRequestValid({
          mediaTypes: {
            banner: {
              sizes: [[100, 200]]
            }
          },
          params: {
            publisher: 'test',
            placement: '1234'
          }
        })).to.be.true;
      });

      it('should return true when necessary information is given (backward compatibility)', () => {
        expect(spec.isBidRequestValid({
          sizes: [[100, 200]],
          params: {
            publisher: 'test',
            placement: '1234'
          }
        })).to.be.true;
      });

      it('should return false on empty bid', () => {
        expect(spec.isBidRequestValid({})).to.be.false;
      });

      it('should return false on missing sizes', () => {
        expect(spec.isBidRequestValid({
          params: {
            publisher: 'test',
            placement: '1234'
          }
        })).to.be.false;
      });

      it('should return false on empty sizes', () => {
        expect(spec.isBidRequestValid({
          mediaTypes: {
            banner: {
              sizes: []
            }
          },
          params: {
            publisher: 'test',
            placement: '1234'
          }
        })).to.be.false;
      });

      it('should return false on empty sizes (backward compatibility)', () => {
        expect(spec.isBidRequestValid({
          sizes: [],
          params: {
            publisher: 'test',
            placement: '1234'
          }
        })).to.be.false;
      });

      it('should return false on missing params', () => {
        expect(spec.isBidRequestValid({
          mediaTypes: {
            banner: {
              sizes: [[100, 200]]
            }
          },
        })).to.be.false;
      });

      it('should return false on invalid params', () => {
        expect(spec.isBidRequestValid({
          mediaTypes: {
            banner: {
              sizes: [[100, 200]]
            }
          },
          params: 'bar'
        })).to.be.false;
      });

      it('should return false on empty params', () => {
        expect(spec.isBidRequestValid({
          mediaTypes: {
            banner: {
              sizes: [[100, 200]]
            }
          },
          params: {}
        })).to.be.false;
      });

      it('should return false on missing publisher', () => {
        expect(spec.isBidRequestValid({
          mediaTypes: {
            banner: {
              sizes: [[100, 200]]
            }
          },
          params: {
            placement: '1234'
          }
        })).to.be.false;
      });

      it('should return false on missing placement', () => {
        expect(spec.isBidRequestValid({
          mediaTypes: {
            banner: {
              sizes: [[100, 200]]
            }
          },
          params: {
            publisher: 'test'
          }
        })).to.be.false;
      });
    });

    describe('buildRequests', () => {
      it('should send one bid request per ad unit to the endpoint via POST', () => {
        const bidRequests = [
          {
            bidder: BIDDER_CODE,
            bidId: 'bidId1',
            adUnitCode: 'adUnitCode1',
            transactionId: 'transactionId1',
            auctionId: 'auctionId1',
            mediaTypes: {
              banner: {
                sizes: [[100, 200], [300, 400]]
              }
            },
            params: {
              publisher: 'publisher1',
              placement: 'placement1'
            }
          },
          {
            bidder: BIDDER_CODE,
            bidId: 'bidId2',
            adUnitCode: 'adUnitCode2',
            transactionId: 'transactionId2',
            auctionId: 'auctionId2',
            mediaTypes: {
              banner: {
                sizes: [[500, 600]]
              }
            },
            params: {
              publisher: 'publisher2',
              placement: 'placement2'
            }
          }
        ];

        const result = spec.buildRequests(bidRequests);
        expect(result.length).to.equal(2);

        expect(result[0].url).to.equal(ENDPOINT_URL.replace(PUBLISHER_PLACEHOLDER, bidRequests[0].params.publisher));
        expect(result[0].method).to.equal(ENDPOINT_METHOD);
        expect(result[0].data).to.deep.equal({
          bidId: bidRequests[0].bidId,
          auctionId: bidRequests[0].auctionId,
          transactionId: bidRequests[0].transactionId,
          adUnitCode: bidRequests[0].adUnitCode,
          pageUrl: extractTopWindowUrlFromBidRequest(bidRequests[0]),
          referrer: extractTopWindowReferrerFromBidRequest(bidRequests[0]),
          sizes: extractSizesFromBidRequest(bidRequests[0]),
          params: extractParamsFromBidRequest(bidRequests[0]),
          gdpr: null
        });

        expect(result[1].url).to.equal(ENDPOINT_URL.replace(PUBLISHER_PLACEHOLDER, bidRequests[1].params.publisher));
        expect(result[1].method).to.equal(ENDPOINT_METHOD);
        expect(result[1].data).to.deep.equal({
          bidId: bidRequests[1].bidId,
          auctionId: bidRequests[1].auctionId,
          transactionId: bidRequests[1].transactionId,
          adUnitCode: bidRequests[1].adUnitCode,
          pageUrl: extractTopWindowUrlFromBidRequest(bidRequests[1]),
          referrer: extractTopWindowReferrerFromBidRequest(bidRequests[1]),
          sizes: extractSizesFromBidRequest(bidRequests[1]),
          params: extractParamsFromBidRequest(bidRequests[1]),
          gdpr: null
        });
      });

      it('should pass gdpr informations', () => {
        const bidderRequest = {
          gdprConsent: {
            consentString: 'consentString',
            gdprApplies: true
          }
        };

        const bidRequests = [
          {
            bidder: BIDDER_CODE,
            bidId: 'bidId3',
            adUnitCode: 'adUnitCode3',
            transactionId: 'transactionId3',
            auctionId: 'auctionId3',
            mediaTypes: {
              banner: {
                sizes: [[100, 200], [300, 400]]
              }
            },
            params: {
              publisher: 'publisher3',
              placement: 'placement3'
            }
          }
        ];

        const result = spec.buildRequests(bidRequests, bidderRequest);
        expect(result.length).to.equal(1);
        expect(result[0].data.gdpr).to.deep.equal(extractGdprFromBidderRequest(bidderRequest));
      });

      it('should encode publisher param in endpoint url', () => {
        const bidRequests = [
          {
            bidder: BIDDER_CODE,
            bidId: 'bidId1',
            adUnitCode: 'adUnitCode1',
            transactionId: 'transactionId1',
            auctionId: 'auctionId1',
            mediaTypes: {
              banner: {
                sizes: [[100, 200]]
              }
            },
            params: {
              publisher: 'crazy publisher key äÖÜ',
              placement: 'placement1'
            }
          },
        ];

        const result = spec.buildRequests(bidRequests);
        expect(result[0].url).to.equal(ENDPOINT_URL.replace(PUBLISHER_PLACEHOLDER, encodeURIComponent(bidRequests[0].params.publisher)));
      });

      it('should handle empty bidRequests', () => {
        expect(spec.buildRequests([])).to.deep.equal([]);
      });
    });

    describe('interpretResponse', () => {
      it('should correctly interpret the server response', () => {
        const serverResponse = {
          body: {
            bid: {
              bidId: 'bidId1',
              price: 0.12,
              net: true,
              currency: 'EUR',
              ttl: 123
            },
            creative: {
              id: 'creativeId1',
              width: 100,
              height: 200,
              html: '<div>Hello World</div>'
            }
          }
        };

        const result = spec.interpretResponse(serverResponse);
        expect(result).to.deep.equal([
          {
            requestId: serverResponse.body.bid.bidId,
            cpm: serverResponse.body.bid.price,
            netRevenue: serverResponse.body.bid.net,
            currency: serverResponse.body.bid.currency,
            ttl: serverResponse.body.bid.ttl,
            creativeId: serverResponse.body.creative.id,
            width: serverResponse.body.creative.width,
            height: serverResponse.body.creative.height,
            ad: serverResponse.body.creative.html
          }
        ]);
      });

      it('should handle empty serverResponse', () => {
        expect(spec.interpretResponse({})).to.deep.equal([]);
      });

      it('should handle missing bid', () => {
        expect(spec.interpretResponse({
          body: {
            creative: {}
          }
        })).to.deep.equal([]);
      });

      it('should handle missing creative', () => {
        expect(spec.interpretResponse({
          body: {
            bid: {}
          }
        })).to.deep.equal([]);
      });
    });
  });
});
