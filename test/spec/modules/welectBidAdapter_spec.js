import { expect } from 'chai';
import { spec as adapter } from 'modules/welectBidAdapter.js';

describe('WelectAdapter', function () {
  describe('Check methods existance', function () {
    it('exists and is a function', function () {
      expect(adapter.isBidRequestValid).to.exist.and.to.be.a('function');
    });
    it('exists and is a function', function () {
      expect(adapter.buildRequests).to.exist.and.to.be.a('function');
    });
    it('exists and is a function', function () {
      expect(adapter.interpretResponse).to.exist.and.to.be.a('function');
    });
  });

  describe('Check method isBidRequestValid return', function () {
    const bid = {
      bidder: 'welect',
      params: {
        placementId: 'exampleAlias',
        domain: 'www.welect.de'
      },
      sizes: [[640, 360]],
      mediaTypes: {
        video: {
          context: 'instream'
        }
      },
    };
    const bid2 = {
      bidder: 'welect',
      params: {
        domain: 'www.welect.de'
      },
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [640, 360]
        }
      },
    };

    it('should be true', function () {
      expect(adapter.isBidRequestValid(bid)).to.be.true;
    });

    it('should be false because the placementId is missing', function () {
      expect(adapter.isBidRequestValid(bid2)).to.be.false;
    });
  });

  describe('Check buildRequests method', function () {
    // BidderRequest, additional context info not given by our custom params
    const bidderRequest = {
      gdprConsent: {
        gdprApplies: 1,
        consentString: 'some_string'
      },
      refererInfo: {
        domain: "welect.de",
        page: "https://www.welect.de/de/blog/index.html"
      },
      ortb2: {
        site: {
          cat: ["IAB2"],
          sectioncat: ["IAB2-2"],
          pagecat: ["IAB2-2"],
        }
      }
    }

    // Bid without playerSize
    const bid1 = {
      bidder: 'welect',
      params: {
        placementId: 'exampleAlias'
      },
      sizes: [[640, 360]],
      mediaTypes: {
        video: {
          context: 'instream'
        }
      },
      bidId: 'abdc'
    };
    // Bid with playerSize
    const bid2 = {
      bidder: 'welect',
      params: {
        placementId: 'exampleAlias'
      },
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 360]]
        }
      },
      bidId: 'abdc'
    };

    const data1 = {
      bid_id: 'abdc',
      width: 640,
      height: 360
    }

    const data2 = {
      bid_id: 'abdc',
      width: 640,
      height: 360,
      domain: 'welect.de',
      pageurl: 'https://www.welect.de/de/blog/index.html',
      sitecat: ["IAB2"],
      sectioncat: ["IAB2-2"],
      pagecat: ["IAB2-2"],
      gdpr_consent: {
        gdprApplies: 1,
        tcString: 'some_string'
      }
    }

    // Formatted requets
    const request1 = {
      method: 'POST',
      url: 'https://www.welect.de/api/v2/preflight/exampleAlias',
      data: data1,
      options: {
        contentType: 'application/json',
        withCredentials: false,
        crossOrigin: true,
      }
    };

    const request2 = {
      method: 'POST',
      url: 'https://www.welect.de/api/v2/preflight/exampleAlias',
      data: data2,
      options: {
        contentType: 'application/json',
        withCredentials: false,
        crossOrigin: true,
      }
    }

    it('defaults to www.welect.de, without gdpr object', function () {
      expect(adapter.buildRequests([bid1])).to.deep.equal([request1]);
    })

    it('must return the right formatted requests, with bidderRequest containing first party data', function () {
      expect(adapter.buildRequests([bid2], bidderRequest)).to.deep.equal([request2]);
    });
  });

  describe('Check interpretResponse method return', function () {
    // invalid server response
    const unavailableResponse = {
      body: {
        available: false
      }
    };

    const availableResponse = {
      body: {
        available: true,
        bidResponse: {
          ad: {
            video: 'some vast url'
          },
          meta: {
            advertiserDomains: [],
          },
          cpm: 17,
          creativeId: 'svmpreview',
          currency: 'EUR',
          netRevenue: true,
          requestId: 'some bid id',
          ttl: 120,
          vastUrl: 'some vast url',
          height: 640,
          width: 320,
          mediaType: 'video'
        }
      }
    }
    // bid Request
    const bid = {
      data: {
        bid_id: 'some bid id',
        width: 640,
        height: 320
      },
      method: 'POST',
      url: 'https://www.welect.de/api/v2/preflight/exampleAlias',
      options: {
        contentType: 'application/json',
        withCredentials: false,
        crossOrigin: true,
      }
    };
    // Formatted reponse
    const result = {
      ad: {
        video: 'some vast url'
      },
      meta: {
        advertiserDomains: []
      },
      cpm: 17,
      creativeId: 'svmpreview',
      currency: 'EUR',
      height: 640,
      netRevenue: true,
      requestId: 'some bid id',
      ttl: 120,
      vastUrl: 'some vast url',
      width: 320,
      mediaType: 'video'
    }

    it('if response reflects unavailability, should be empty', function () {
      expect(adapter.interpretResponse(unavailableResponse, bid)).to.deep.equal([]);
    });

    it('if response reflects availability, should equal result', function () {
      expect(adapter.interpretResponse(availableResponse, bid)).to.deep.equal([result])
    })
  });
});
