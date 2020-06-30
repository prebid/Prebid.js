// import or require modules necessary for the test, e.g.:

import {expect} from 'chai';
import {spec as adapter} from 'modules/welectBidAdapter.js';
// import * as utils from 'src/utils.js';

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
        placementAlias: 'exampleAlias',
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

    it('should be false because the placementAlias is missing', function () {
      expect(adapter.isBidRequestValid(bid2)).to.be.false;
    });
  });

  describe('Check buildRequests method', function () {
    // Bids to be formatted
    let bid1 = {
      bidder: 'welect',
      params: {
        placementAlias: 'exampleAlias'
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
        placementAlias: 'exampleAlias',
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
      width: '640',
      height: '360'
    }

    let data2 = {
      bid_id: 'abdc',
      width: '640',
      height: '360',
      gdpr_consent: {
        gdpr_applies: 1,
        gdpr_consent: 'some_string'
      }
    }

    // Formatted requets
    let request1 = {
      method: 'POST',
      url: 'https://www.welect.de/api/v2/preflight/by_alias/exampleAlias',
      data: data1
    };

    let request2 = {
      method: 'POST',
      url: 'https://www.welect2.de/api/v2/preflight/by_alias/exampleAlias',
      data: data2
    }

    it('defaults to www.welect.de, without gdpr object', function () {
      expect(adapter.buildRequests([bid1])).to.deep.equal([request1]);
    })

    it('must return the right formatted requests, with gdpr object', function () {
      expect(adapter.buildRequests([bid2])).to.deep.equal([request2]);
    });
  });

//   describe('Check interpretResponse method return', function () {
//     // Server's response
//     let response = {
//       body: {
//         valid: true
//       }
//     };
//     // bid Request
//     let bid = {
//       data: {
//         pub_id: '3',
//         zone_id: '12345',
//         bid_id: 'abdc',
//         floor_price: 5.50, // optional
//         adUnitCode: 'code'
//       },
//       method: 'POST',
//       url: 'https://player.mediabong.net/prebid/request'
//     };
//     // Formatted reponse
//     let result = {
//       requestId: 'abdc',
//       cpm: 5.00,
//       width: '640',
//       height: '360',
//       ttl: 60,
//       creativeId: '2468',
//       dealId: 'MDB-TEST-1357',
//       netRevenue: true,
//       currency: 'USD',
//       vastUrl: 'https//player.mediabong.net/prebid/ad/a1b2c3d4',
//       mediaType: 'video'
//     };

//     it('should equal to the expected formatted result', function () {
//       expect(adapter.interpretResponse(response, bid)).to.deep.equal([result]);
//     });

//     it('should be empty because the status is missing or wrong', function () {
//       let wrongResponse = utils.deepClone(response);
//       wrongResponse.body.status = 'ko';
//       expect(adapter.interpretResponse(wrongResponse, bid)).to.be.empty;

//       wrongResponse = utils.deepClone(response);
//       delete wrongResponse.body.status;
//       expect(adapter.interpretResponse(wrongResponse, bid)).to.be.empty;
//     });

//     it('should be empty because the body is missing or wrong', function () {
//       let wrongResponse = utils.deepClone(response);
//       wrongResponse.body = [1, 2, 3];
//       expect(adapter.interpretResponse(wrongResponse, bid)).to.be.empty;

//       wrongResponse = utils.deepClone(response);
//       delete wrongResponse.body;
//       expect(adapter.interpretResponse(wrongResponse, bid)).to.be.empty;
//     });

//     it('should equal to the expected formatted result', function () {
//       response.body.renderer_url = 'vuble_renderer.js';
//       result.adUnitCode = 'code';
//       let formattedResponses = adapter.interpretResponse(response, bid);
//       expect(formattedResponses[0].adUnitCode).to.equal(result.adUnitCode);
//     });
//   });
});
