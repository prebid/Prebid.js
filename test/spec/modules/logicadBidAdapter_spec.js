import {expect} from 'chai';
import {spec} from '../../../modules/logicadBidAdapter.js';
import * as utils from 'src/utils.js';

describe('LogicadAdapter', function () {
  const bidRequests = [{
    bidder: 'logicad',
    bidId: '51ef8751f9aead',
    params: {
      tid: 'PJ2P',
      page: 'https://www.logicad.com/'
    },
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    transactionId: 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
    sizes: [[300, 250], [300, 600]],
    bidderRequestId: '418b37f85e772c',
    auctionId: '18fd8b8b0bd757',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]]
      }
    },
    userId: {
      sharedid: {
        id: 'fakesharedid',
        third: 'fakesharedid'
      }
    },
    userIdAsEids: [{
      source: 'sharedid.org',
      uids: [{
        id: 'fakesharedid',
        atype: 1,
        ext: {
          third: 'fakesharedid'
        }
      }]
    }],
    ortb2Imp: {
      ext: {
        ae: 1
      }
    },
    ortb2: {
      device: {
        sua: {
          source: 2,
          platform: {
            brand: 'Windows',
            version: ['10', '0', '0']
          },
          browsers: [
            {
              brand: 'Chromium',
              version: ['112', '0', '5615', '20']
            },
            {
              brand: 'Google Chrome',
              version: ['112', '0', '5615', '20']
            },
            {
              brand: 'Not:A-Brand',
              version: ['99', '0', '0', '0']
            }
          ],
          mobile: 0,
          model: '',
          bitness: '64',
          architecture: 'x86'
        }
      },
      user: {
        data: [
          {
            ext: {
              segtax: 600,
              segclass: '2206021246'
            },
            segment: [
              {
                id: '1'
              }
            ],
            name: 'cd.ladsp.com'
          }
        ]
      }
    }
  }];
  const nativeBidRequests = [{
    bidder: 'logicad',
    bidId: '51ef8751f9aead',
    params: {
      tid: 'bgjD1',
      page: 'https://www.logicad.com/'
    },
    adUnitCode: 'div-gpt-ad-1460505748561-1',
    transactionId: 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
    sizes: [[1, 1]],
    bidderRequestId: '418b37f85e772c',
    auctionId: '18fd8b8b0bd757',
    mediaTypes: {
      native: {
        title: {
          required: true
        },
        image: {
          required: true
        },
        sponsoredBy: {
          required: true
        }
      }
    },
    userId: {
      sharedid: {
        id: 'fakesharedid',
        third: 'fakesharedid'
      }
    },
    userIdAsEids: [{
      source: 'sharedid.org',
      uids: [{
        id: 'fakesharedid',
        atype: 1,
        ext: {
          third: 'fakesharedid'
        }
      }]
    }],
    ortb2: {
      device: {
        sua: {
          source: 2,
          platform: {
            brand: 'Windows',
            version: ['10', '0', '0']
          },
          browsers: [
            {
              brand: 'Chromium',
              version: ['112', '0', '5615', '20']
            },
            {
              brand: 'Google Chrome',
              version: ['112', '0', '5615', '20']
            },
            {
              brand: 'Not:A-Brand',
              version: ['99', '0', '0', '0']
            }
          ],
          mobile: 0,
          model: '',
          bitness: '64',
          architecture: 'x86'
        }
      },
      user: {
        data: [
          {
            ext: {
              segtax: 600,
              segclass: '2206021246'
            },
            segment: [
              {
                id: '1'
              }
            ],
            name: 'cd.ladsp.com'
          }
        ]
      }
    }
  }];
  const bidderRequest = {
    refererInfo: {
      referer: 'fakeReferer',
      reachedTop: true,
      numIframes: 1,
      stack: []
    },
    auctionStart: 1563337198010,
    fledgeEnabled: true
  };
  const serverResponse = {
    body: {
      seatbid:
        [{
          bid: {
            requestId: '51ef8751f9aead',
            cpm: 101.0234,
            width: 300,
            height: 250,
            creativeId: '2019',
            currency: 'JPY',
            netRevenue: true,
            ttl: 60,
            ad: '<div>TEST</div>',
            meta: {
              advertiserDomains: ['logicad.com']
            }
          }
        }],
      userSync: {
        type: 'image',
        url: 'https://cr-p31.ladsp.jp/cookiesender/31'
      }
    }
  };

  const paapiServerResponse = {
    body: {
      seatbid:
        [{
          bid: {
            requestId: '51ef8751f9aead',
            cpm: 101.0234,
            width: 300,
            height: 250,
            creativeId: '2019',
            currency: 'JPY',
            netRevenue: true,
            ttl: 60,
            ad: '<div>TEST</div>',
            meta: {
              advertiserDomains: ['logicad.com']
            }
          }
        }],
      ext: {
        fledgeAuctionConfigs: [{
          bidId: '51ef8751f9aead',
          config: {
            seller: 'https://fledge.ladsp.com',
            decisionLogicUrl: 'https://fledge.ladsp.com/decision_logic.js',
            interestGroupBuyers: ['https://fledge.ladsp.com'],
            requestedSize: {width: '300', height: '250'},
            allSlotsRequestedSizes: [{width: '300', height: '250'}],
            sellerSignals: {signal: 'signal'},
            sellerTimeout: '500',
            perBuyerSignals: {'https://fledge.ladsp.com': {signal: 'signal'}},
            perBuyerCurrencies: {'https://fledge.ladsp.com': 'USD'}
          }
        }]
      },
      userSync: {
        type: 'image',
        url: 'https://cr-p31.ladsp.jp/cookiesender/31'
      }
    }
  };

  const nativeServerResponse = {
    body: {
      seatbid:
        [{
          bid: {
            requestId: '51ef8751f9aead',
            cpm: 101.0234,
            width: 1,
            height: 1,
            creativeId: '2019',
            currency: 'JPY',
            netRevenue: true,
            ttl: 60,
            native: {
              clickUrl: 'https://www.logicad.com',
              image: {
                url: 'https://cd.ladsp.com/img.png',
                width: '1200',
                height: '628'
              },
              impressionTrackers: [
                'https://example.com'
              ],
              sponsoredBy: 'Logicad',
              title: 'Native Creative',
            },
            meta: {
              advertiserDomains: ['logicad.com']
            }
          }
        }],
      userSync: {
        type: 'image',
        url: 'https://cr-p31.ladsp.jp/cookiesender/31'
      }
    }
  };

  describe('isBidRequestValid', function () {
    it('should return true if the tid parameter is present', function () {
      expect(spec.isBidRequestValid(bidRequests[0])).to.be.true;
    });

    it('should return false if the tid parameter is not present', function () {
      let bidRequest = utils.deepClone(bidRequests[0]);
      delete bidRequest.params.tid;
      expect(spec.isBidRequestValid(bidRequest)).to.be.false;
    });

    it('should return false if the params object is not present', function () {
      let bidRequest = utils.deepClone(bidRequests);
      delete bidRequest[0].params;
      expect(spec.isBidRequestValid(bidRequest)).to.be.false;
    });

    it('should return true if the tid parameter is present for native request', function () {
      expect(spec.isBidRequestValid(nativeBidRequests[0])).to.be.true;
    });
  });

  describe('buildRequests', function () {
    it('should generate a valid single POST request for multiple bid requests', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://pb.ladsp.com/adrequest/prebid');
      expect(request.data).to.exist;

      const data = JSON.parse(request.data);
      expect(data.auctionId).to.equal('18fd8b8b0bd757');

      // Protected Audience API flag
      expect(data.bids[0]).to.have.property('ae');
      expect(data.bids[0].ae).to.equal(1);

      expect(data.eids[0].source).to.equal('sharedid.org');
      expect(data.eids[0].uids[0].id).to.equal('fakesharedid');

      expect(data.sua.source).to.equal(2);
      expect(data.sua.platform.brand).to.equal('Windows');
      expect(data.sua.platform.version[0]).to.equal('10');
      expect(data.sua.platform.version[1]).to.equal('0');
      expect(data.sua.platform.version[2]).to.equal('0');
      expect(data.sua.browsers[0].brand).to.equal('Chromium');
      expect(data.sua.browsers[0].version[0]).to.equal('112');
      expect(data.sua.browsers[0].version[1]).to.equal('0');
      expect(data.sua.browsers[0].version[2]).to.equal('5615');
      expect(data.sua.browsers[0].version[3]).to.equal('20');
      expect(data.sua.browsers[1].brand).to.equal('Google Chrome');
      expect(data.sua.browsers[1].version[0]).to.equal('112');
      expect(data.sua.browsers[1].version[1]).to.equal('0');
      expect(data.sua.browsers[1].version[2]).to.equal('5615');
      expect(data.sua.browsers[1].version[3]).to.equal('20');
      expect(data.sua.browsers[2].brand).to.equal('Not:A-Brand');
      expect(data.sua.browsers[2].version[0]).to.equal('99');
      expect(data.sua.browsers[2].version[1]).to.equal('0');
      expect(data.sua.browsers[2].version[2]).to.equal('0');
      expect(data.sua.browsers[2].version[3]).to.equal('0');
      expect(data.sua.mobile).to.equal(0);
      expect(data.sua.model).to.equal('');
      expect(data.sua.bitness).to.equal('64');
      expect(data.sua.architecture).to.equal('x86');

      expect(data.userData[0].name).to.equal('cd.ladsp.com');
      expect(data.userData[0].segment[0].id).to.equal('1');
      expect(data.userData[0].ext.segtax).to.equal(600);
      expect(data.userData[0].ext.segclass).to.equal('2206021246');
    });
  });

  describe('interpretResponse', function () {
    it('should return an empty array if an invalid response is passed', function () {
      const interpretedResponse = spec.interpretResponse({}, {});
      expect(interpretedResponse).to.be.an('array').that.is.empty;
    });

    it('should return valid response when passed valid server response', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      const interpretedResponse = spec.interpretResponse(serverResponse, request);

      expect(interpretedResponse).to.have.lengthOf(1);

      expect(interpretedResponse[0].requestId).to.equal(serverResponse.body.seatbid[0].bid.requestId);
      expect(interpretedResponse[0].cpm).to.equal(serverResponse.body.seatbid[0].bid.cpm);
      expect(interpretedResponse[0].width).to.equal(serverResponse.body.seatbid[0].bid.width);
      expect(interpretedResponse[0].height).to.equal(serverResponse.body.seatbid[0].bid.height);
      expect(interpretedResponse[0].creativeId).to.equal(serverResponse.body.seatbid[0].bid.creativeId);
      expect(interpretedResponse[0].currency).to.equal(serverResponse.body.seatbid[0].bid.currency);
      expect(interpretedResponse[0].netRevenue).to.equal(serverResponse.body.seatbid[0].bid.netRevenue);
      expect(interpretedResponse[0].ad).to.equal(serverResponse.body.seatbid[0].bid.ad);
      expect(interpretedResponse[0].ttl).to.equal(serverResponse.body.seatbid[0].bid.ttl);
      expect(interpretedResponse[0].meta.advertiserDomains).to.equal(serverResponse.body.seatbid[0].bid.meta.advertiserDomains);

      // Protected Audience API
      const paapiRequest = spec.buildRequests(bidRequests, bidderRequest)[0];
      const paapiInterpretedResponse = spec.interpretResponse(paapiServerResponse, paapiRequest);
      expect(paapiInterpretedResponse).to.have.property('bids');
      expect(paapiInterpretedResponse).to.have.property('fledgeAuctionConfigs');
      expect(paapiInterpretedResponse.fledgeAuctionConfigs[0]).to.deep.equal(paapiServerResponse.body.ext.fledgeAuctionConfigs[0]);

      // native
      const nativeRequest = spec.buildRequests(nativeBidRequests, bidderRequest)[0];
      const interpretedResponseForNative = spec.interpretResponse(nativeServerResponse, nativeRequest);

      expect(interpretedResponseForNative).to.have.lengthOf(1);

      expect(interpretedResponseForNative[0].requestId).to.equal(nativeServerResponse.body.seatbid[0].bid.requestId);
      expect(interpretedResponseForNative[0].cpm).to.equal(nativeServerResponse.body.seatbid[0].bid.cpm);
      expect(interpretedResponseForNative[0].width).to.equal(nativeServerResponse.body.seatbid[0].bid.width);
      expect(interpretedResponseForNative[0].height).to.equal(nativeServerResponse.body.seatbid[0].bid.height);
      expect(interpretedResponseForNative[0].creativeId).to.equal(nativeServerResponse.body.seatbid[0].bid.creativeId);
      expect(interpretedResponseForNative[0].currency).to.equal(nativeServerResponse.body.seatbid[0].bid.currency);
      expect(interpretedResponseForNative[0].netRevenue).to.equal(nativeServerResponse.body.seatbid[0].bid.netRevenue);
      expect(interpretedResponseForNative[0].ttl).to.equal(nativeServerResponse.body.seatbid[0].bid.ttl);
      expect(interpretedResponseForNative[0].native.clickUrl).to.equal(nativeServerResponse.body.seatbid[0].bid.native.clickUrl);
      expect(interpretedResponseForNative[0].native.image.url).to.equal(nativeServerResponse.body.seatbid[0].bid.native.image.url);
      expect(interpretedResponseForNative[0].native.image.width).to.equal(nativeServerResponse.body.seatbid[0].bid.native.image.width);
      expect(interpretedResponseForNative[0].native.impressionTrackers).to.equal(nativeServerResponse.body.seatbid[0].bid.native.impressionTrackers);
      expect(interpretedResponseForNative[0].native.sponsoredBy).to.equal(nativeServerResponse.body.seatbid[0].bid.native.sponsoredBy);
      expect(interpretedResponseForNative[0].native.title).to.equal(nativeServerResponse.body.seatbid[0].bid.native.title);
      expect(interpretedResponseForNative[0].meta.advertiserDomains[0]).to.equal(serverResponse.body.seatbid[0].bid.meta.advertiserDomains[0]);
    });
  });

  describe('getUserSyncs', function () {
    it('should perform usersync', function () {
      let syncs = spec.getUserSyncs({pixelEnabled: false}, [serverResponse]);
      expect(syncs).to.have.length(0);

      syncs = spec.getUserSyncs({pixelEnabled: true}, [serverResponse]);
      expect(syncs).to.have.length(1);

      expect(syncs[0]).to.have.property('type', 'image');
      expect(syncs[0]).to.have.property('url', 'https://cr-p31.ladsp.jp/cookiesender/31');
    });
  });
});
