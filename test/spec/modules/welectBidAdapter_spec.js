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
    let bid = {
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
    let bid2 = {
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
    // Bids to be formatted
    let bid1 = {
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
    let bid2 = {
      bidder: 'welect',
      params: {
        placementId: 'exampleAlias',
        domain: 'www.welect2.de'
      },
      sizes: [[640, 360]],
      mediaTypes: {
        video: {
          context: 'instream'
        }
      },
      bidId: 'abdc',
      gdprConsent: {
        gdprApplies: 1,
        gdprConsent: 'some_string'
      }
    };

    let data1 = {
      bid_id: 'abdc',
      width: 640,
      height: 360
    }

    let data2 = {
      bid_id: 'abdc',
      width: 640,
      height: 360,
      gdpr_consent: {
        gdprApplies: 1,
        tcString: 'some_string'
      }
    }

    // Formatted requets
    let request1 = {
      method: 'POST',
      url: 'https://www.welect.de/api/v2/preflight/exampleAlias',
      data: data1,
      options: {
        contentType: 'application/json',
        withCredentials: false,
        crossOrigin: true,
      }
    };

    let request2 = {
      method: 'POST',
      url: 'https://www.welect2.de/api/v2/preflight/exampleAlias',
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

    it('must return the right formatted requests, with gdpr object', function () {
      expect(adapter.buildRequests([bid2])).to.deep.equal([request2]);
    });
  });

  describe('Check interpretResponse method return', function () {
    // invalid server response
    let unavailableResponse = {
      body: {
        available: false
      }
    };

    let availableResponse = {
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
          width: 320
        }
      }
    }
    // bid Request
    let bid = {
      data: {
        bid_id: 'some bid id',
        width: 640,
        height: 320,
        gdpr_consent: {
          gdprApplies: 1,
          tcString: 'some_string'
        }
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
    let result = {
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
      width: 320
    }

    it('if response reflects unavailability, should be empty', function () {
      expect(adapter.interpretResponse(unavailableResponse, bid)).to.deep.equal([]);
    });

    it('if response reflects availability, should equal result', function () {
      expect(adapter.interpretResponse(availableResponse, bid)).to.deep.equal([result])
    })
  });
});
