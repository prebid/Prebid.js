import {expect} from 'chai';
import {ADPLUS_ENDPOINT, BIDDER_CODE, spec,} from 'modules/adplusBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';

const TEST_UID = 'test-uid-value';

describe('AplusBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.be.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      const validRequest = {
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        params: {
          inventoryId: '30',
          adUnitId: '1',
        }
      };
      expect(spec.isBidRequestValid(validRequest)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      const validRequest = {
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        params: {
          inventoryId: '30',
        }
      };
      expect(spec.isBidRequestValid(validRequest)).to.equal(false);
    });

    it('should return false when required param types are wrong', function () {
      const validRequest = {
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        params: {
          inventoryId: 30,
          adUnitId: '1',
        }
      };
      expect(spec.isBidRequestValid(validRequest)).to.equal(false);
    });

    it('should return false when size is not exists', function () {
      const validRequest = {
        params: {
          inventoryId: 30,
          adUnitId: '1',
        }
      };
      expect(spec.isBidRequestValid(validRequest)).to.equal(false);
    });

    it('should return false when size is wrong', function () {
      const validRequest = {
        mediaTypes: {
          banner: {
            sizes: [[300]]
          }
        },
        params: {
          inventoryId: 30,
          adUnitId: '1',
        }
      };
      expect(spec.isBidRequestValid(validRequest)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const validRequest = [
      {
        bidder: BIDDER_CODE,
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        params: {
          inventoryId: '-1',
          adUnitId: '-3',
        },
        bidId: '2bdcb0b203c17d',
        userId: {
          adplusId: TEST_UID
        },
        userIdAsEids: [{
          source: 'ad-plus.com.tr',
          uids: [
            {
              atype: 1,
              id: TEST_UID
            }
          ]
        }]
      },
    ];

    const bidderRequest = {
      refererInfo: {
        referer: 'https://test.domain'
      }
    };

    it('bidRequest HTTP method', function () {
      const request = spec.buildRequests(validRequest, bidderRequest);
      expect(request[0].method).to.equal('POST');
    });

    it('bidRequest url', function () {
      const request = spec.buildRequests(validRequest, bidderRequest);
      expect(request[0].url).to.equal(ADPLUS_ENDPOINT);
    });

    it('tests bidRequest data is clean and has the right values', function () {
      const request = spec.buildRequests(validRequest, bidderRequest);

      expect(request[0].data.bidId).to.equal('2bdcb0b203c17d');
      expect(request[0].data.inventoryId).to.equal(-1);
      expect(request[0].data.adUnitId).to.equal(-3);
      expect(request[0].data.adUnitWidth).to.equal(300);
      expect(request[0].data.adUnitHeight).to.equal(250);
      expect(request[0].data.sdkVersion).to.equal('1');
      expect(request[0].data.adplusUid).to.equal(TEST_UID);
      expect(request[0].data.eids).to.deep.equal([{
        source: 'ad-plus.com.tr',
        uids: [
          {
            atype: 1,
            id: TEST_UID
          }
        ]
      }]);
      expect(typeof request[0].data.session).to.equal('string');
      expect(request[0].data.session).length(36);
      expect(request[0].data.interstitial).to.equal(0);
      expect(request[0].data).to.not.have.deep.property('extraData');
      expect(request[0].data).to.not.have.deep.property('yearOfBirth');
      expect(request[0].data).to.not.have.deep.property('gender');
      expect(request[0].data).to.not.have.deep.property('categories');
      expect(request[0].data).to.not.have.deep.property('latitude');
      expect(request[0].data).to.not.have.deep.property('longitude');
    });
  });

  describe('interpretResponse', function () {
    const requestData = {
      language: window.navigator.language,
      screenWidth: 1440,
      screenHeight: 900,
      sdkVersion: '1',
      inventoryId: '-1',
      adUnitId: '-3',
      adUnitWidth: 300,
      adUnitHeight: 250,
      domain: 'tassandigi.com',
      pageUrl: 'https%3A%2F%2Ftassandigi.com%2Fserafettin%2Fads.html',
      interstitial: 0,
      session: '1c02db03-5289-932a-93af-7b4022611fec',
      token: '1c02db03-5289-937a-93df-7b4022611fec',
      secure: 1,
      bidId: '2bdcb0b203c17d',
    };
    const bidRequest = {
      'method': 'POST',
      'url': ADPLUS_ENDPOINT,
      'data': requestData,
    };

    const bidResponse = {
      body: [
        {
          'ad': '<div>ad</div>',
          'advertiserDomains': [
            'advertiser.com'
          ],
          'categoryIDs': [
            'IAB-111'
          ],
          'cpm': 3.57,
          'creativeID': '1',
          'currency': 'TRY',
          'dealID': '1',
          'height': 300,
          'mediaType': 'banner',
          'netRevenue': true,
          'requestID': '2bdcb0b203c17d',
          'ttl': 300,
          'width': 250
        }
      ],
      headers: {}
    };

    const emptyBidResponse = {
      body: null,
    };

    it('returns an empty array when the result body is not valid', function () {
      const result = spec.interpretResponse(emptyBidResponse, bidRequest);
      expect(result).to.deep.equal([]);
    });

    it('result is correct', function () {
      const result = spec.interpretResponse(bidResponse, bidRequest);
      expect(result[0].requestId).to.equal('2bdcb0b203c17d');
      expect(result[0].cpm).to.equal(3.57);
      expect(result[0].width).to.equal(250);
      expect(result[0].height).to.equal(300);
      expect(result[0].creativeId).to.equal('1');
      expect(result[0].currency).to.equal('TRY');
      expect(result[0].dealId).to.equal('1');
      expect(result[0].mediaType).to.equal('banner');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].ttl).to.equal(300);
      expect(result[0].meta.advertiserDomains).to.deep.equal(['advertiser.com']);
      expect(result[0].meta.secondaryCatIds).to.deep.equal(['IAB-111']);
    });
  });
});
