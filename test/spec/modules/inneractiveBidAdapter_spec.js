/* globals context */

import {expect} from 'chai';
import {default as InneractiveAdapter} from 'modules/inneractiveBidAdapter';
import bidmanager from 'src/bidmanager';

// Using plain-old-style functions, why? see: http://mochajs.org/#arrow-functions
describe('InneractiveAdapter', function () {
  let adapter,
    bidRequest;

  beforeEach(function () {
    adapter = InneractiveAdapter.createNew();
    bidRequest = {
      bidderCode: 'inneractive',
      bids: [
        {
          bidder: 'inneractive',
          params: {
            appId: '',
          },
          placementCode: 'div-gpt-ad-1460505748561-0',
          sizes: [[300, 250], [300, 600]],
          bidId: '507e8db167d219',
          bidderRequestId: '49acc957f92917',
          requestId: '51381cd0-c29c-405b-9145-20f60abb1e76'
        },
        {
          bidder: 'inneractive',
          params: {
            noappId: '...',
          },
          placementCode: 'div-gpt-ad-1460505661639-0',
          sizes: [[728, 90], [970, 90]],
          bidId: '507e8db167d220',
          bidderRequestId: '49acc957f92917',
          requestId: '51381cd0-c29c-405b-9145-20f60abb1e76'
        },
        {
          bidder: 'inneractive',
          params: {
            APP_ID: 'Inneractive_AndroidHelloWorld_Android',
            spotType: 'rectangle',
            customParams: {
              Portal: 7002,
            }
          },
          placementCode: 'div-gpt-ad-1460505748561-0',
          sizes: [[320, 50], [300, 600]],
          bidId: '507e8db167d221',
          bidderRequestId: '49acc957f92917',
          requestId: '51381cd0-c29c-405b-9145-20f60abb1e76'
        },
        {
          bidder: 'inneractive',
          params: {
            appId: 'Inneractive_IosHelloWorld_iPhone',
            spotType: 'banner', // Just for coverage considerations, no real impact in production
            customParams: {
              portal: 7001,
              gender: ''
            }
          },
          placementCode: 'div-gpt-ad-1460505661639-0',
          sizes: [[728, 90], [970, 90]],
          bidId: '507e8db167d222',
          bidderRequestId: '49acc957f92917',
          requestId: '51381cd0-c29c-405b-9145-20f60abb1e76'
        }]
    };
  });

  describe('Reporter', function () {
    context('on HBPreBidError event', function () {
      it('should contain "mbwError" the inside event report url', function () {
        const Reporter = InneractiveAdapter._getUtils().Reporter;
        const extraDetailsParam = {
          'appId': 'CrunchMind_DailyDisclosure_other',
          'spotType': 'rectangle',
          'portal': 7002
        };
        let eventReportUrl = Reporter.getEventUrl('HBPreBidError', extraDetailsParam);
        expect(eventReportUrl).to.include('mbwError');
      });
    });
  });

  describe('.createNew()', function () {
    it('should return an instance of this adapter having a "callBids" method', function () {
      expect(adapter)
      .to.be.instanceOf(InneractiveAdapter).and
      .to.have.property('callBids').and
      .to.be.a('function');
    });
  });

  describe('when sending out bid requests to the ad server', function () {
    let bidRequests,
      xhr;

    beforeEach(function () {
      bidRequests = [];
      xhr = sinon.useFakeXMLHttpRequest();
      xhr.onCreate = (request) => {
        bidRequests.push(request);
      };
    });

    afterEach(function () {
      xhr.restore();
    });

    context('when there are no bid requests', function () {
      it('should not issue a request', function () {
        const Reporter = InneractiveAdapter._getUtils().Reporter;
        Reporter.getEventUrl('HBPreBidError', {
          'appId': 'CrunchMind_DailyDisclosure_other',
          'spotType': 'rectangle',
          'portal': 7002
        });

        delete bidRequest.bids;
        adapter.callBids(bidRequest);

        expect(bidRequests).to.be.empty;
      });
    });

    context('when there is at least one bid request', function () {
      it('should filter out invalid bids', function () {
        const INVALID_BIDS_COUNT = 2;
        sinon.spy(adapter, '_isValidRequest');
        adapter.callBids(bidRequest);

        for (let id = 0; id < INVALID_BIDS_COUNT; id++) {
          expect(adapter._isValidRequest.getCall(id).returned(false)).to.be.true;
        }

        adapter._isValidRequest.restore();
      });

      it('should store all valid bids internally', function () {
        adapter.callBids(bidRequest);
        expect(Object.keys(adapter.bidByBidId).length).to.equal(2);
      });

      it('should issue ad requests to the ad server for every valid bid', function () {
        adapter.callBids(bidRequest);
        expect(bidRequests).to.have.lengthOf(2);
      });
    });
  });

  describe('when registering the bids that are returned with Prebid.js', function () {
    const BID_DETAILS_ARG_INDEX = 1;
    let server;

    beforeEach(function () {
      sinon.stub(bidmanager, 'addBidResponse');
      server = sinon.fakeServer.create();
    });

    afterEach(function () {
      server.restore();
      bidmanager.addBidResponse.restore();
    });

    context('when the bid is valid', function () {
      let adServerResponse,
        headers,
        body;

      beforeEach(function () {
        adServerResponse = {
          headers: {
            'X-IA-Ad-Height': 250,
            'X-IA-Ad-Width': 300,
            'X-IA-Error': 'OK',
            'X-IA-Pricing': 'CPM',
            'X-IA-Pricing-Currency': 'USD',
            'X-IA-Pricing-Value': 0.0005
          },
          body: {
            ad: {
              html: '<a href="http://www.inner-active.com"><img src="https://s3-eu-west-1.amazonaws.com/inneractive-assets/CS_Test_Ads/CS_Test_300x250.png"></a>'
            },
            config: {
              tracking: {
                impressions: [
                  'http://event.inner-active.mobi/simpleM2M/reportEvent?eventArchetype=impress…pe=3&network=Inneractive_CS&acp=&pcp=&secure=false&rtb=false&houseAd=false'
                ],
                clicks: [
                  'http://event.inner-active.mobi/simpleM2M/reportEvent?eventArchetype=richMed…pe=3&network=Inneractive_CS&acp=&pcp=&secure=false&rtb=false&houseAd=false',
                  ''
                ],
                passback: 'http://event.inner-active.mobi/simpleM2M/reportEvent?eventArchetype=passbac…pe=3&network=Inneractive_CS&acp=&pcp=&secure=false&rtb=false&houseAd=false'
              },
              moat: {
                countryCode: 'IL'
              }
            }
          }
        };
        headers = adServerResponse.headers;
        body = JSON.stringify(adServerResponse.body);
      });

      it('should register bid responses with a status code of 1', function () {
        server.respondWith([200, headers, body]);
        adapter.callBids(bidRequest);
        server.respond();

        let firstRegisteredBidResponse = bidmanager.addBidResponse.firstCall.args[BID_DETAILS_ARG_INDEX];
        expect(firstRegisteredBidResponse)
        .to.have.property('statusMessage', 'Bid available');
      });

      it('should use the first element inside the bid request size array when no (width,height) is returned within the headers', function () {
        delete headers['X-IA-Ad-Height'];
        delete headers['X-IA-Ad-Width'];
        server.respondWith([200, headers, body]);
        adapter.callBids(bidRequest);
        server.respond();

        let firstRegisteredBidResponse = bidmanager.addBidResponse.firstCall.args[BID_DETAILS_ARG_INDEX];
        expect(firstRegisteredBidResponse).to.have.property('width', 320);
        expect(firstRegisteredBidResponse).to.have.property('height', 50);
      });
    });

    context('when the bid is invalid', function () {
      let passbackAdServerResponse,
        headers,
        body;

      beforeEach(function () {
        passbackAdServerResponse = {
          headers: {
            'X-IA-Error': 'House Ad',
            'X-IA-Content': 600145,
            'X-IA-Cid': 99999,
            'X-IA-Publisher': 206536,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-IA-Session': 6512147119979250840,
            'X-IA-AdNetwork': 'inneractive360'
          },
          body: {
            'ad': {
              'html': '<a href="http://www.inner-active.com"><img src="https://s3-eu-west-1.amazonaws.com/inneractive-assets/CS_Test_Ads/CS_Test_300x250.png"></a>'
            },
            'config': {
              'passback': 'http://event.inner-active.mobi/simpleM2M/reportEvent?eventArchetype=passbac…pe=3&network=Inneractive_CS&acp=&pcp=&secure=false&rtb=false&houseAd=false'
            }
          }
        };
        headers = passbackAdServerResponse.headers;
        body = JSON.stringify(passbackAdServerResponse.body);
      });

      it('should register bid responses with a status code of 2', function () {
        server.respondWith([200, headers, body]);
        adapter.callBids(bidRequest);
        server.respond();

        let firstRegisteredBidResponse = bidmanager.addBidResponse.firstCall.args[BID_DETAILS_ARG_INDEX];
        expect(firstRegisteredBidResponse)
        .to.have.property('statusMessage', 'Bid returned empty or error response');
      });

      it('should handle responses from our server in case we had no ad to offer', function () {
        const n = bidRequest.bids.length;
        bidRequest.bids[n - 1].params.appId = 'Komoona_InquisitrRectangle2_other';
        server.respondWith([200, headers, body]);
        adapter.callBids(bidRequest);
        server.respond();

        let secondRegisteredBidResponse = bidmanager.addBidResponse.secondCall.args[BID_DETAILS_ARG_INDEX];
        expect(secondRegisteredBidResponse)
        .to.have.property('statusMessage', 'Bid returned empty or error response');
      });

      it('should handle JSON.parse errors', function () {
        server.respondWith('');
        adapter.callBids(bidRequest);
        server.respond();

        const firstRegisteredBidResponse = bidmanager.addBidResponse.firstCall.args[BID_DETAILS_ARG_INDEX];
        expect(firstRegisteredBidResponse)
        .to.have.property('statusMessage', 'Bid returned empty or error response');
      });
    });
  });
});
