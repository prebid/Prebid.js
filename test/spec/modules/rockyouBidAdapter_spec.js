import { expect } from 'chai';
import { spec, internals } from 'modules/rockyouBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('RockYouAdapter', function () {
  const adapter = newBidder(spec);

  describe('bid validator', function () {
    it('rejects a bid that is missing the placementId', function () {
      let testBid = {};
      expect(spec.isBidRequestValid(testBid)).to.be.false;
    });

    it('accepts a bid with all the expected parameters', function () {
      let testBid = {
        params: {
          placementId: 'f39ba81609'
        }
      };

      expect(spec.isBidRequestValid(testBid)).to.be.true;
    });
  });

  describe('request builder', function () {
    // Taken from the docs, so used as much as is valid
    const sampleBidRequest = {
      'bidder': 'tests',
      'bidId': '51ef8751f9aead',
      'params': {
        'cId': '59ac1da80784890004047d89',
        'placementId': 'ZZZPLACEMENTZZZ'
      },
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      'sizes': [[999, 888]],
      'bidderRequestId': '418b37f85e772c',
      'auctionId': '18fd8b8b0bd757',
      'mediaTypes': {
        banner: {
          'sizes': [[320, 50], [300, 250], [300, 600]]
        }
      }
    };

    it('successfully generates a URL', function () {
      const placementId = 'ZZZPLACEMENTZZZ';

      let bidRequests = [
        {
          'params': {
            'placementId': placementId
          }
        }
      ];

      let results = spec.buildRequests(bidRequests, {
        bidderRequestId: 'sample'
      });
      let result = results.pop();

      expect(result.url).to.not.be.undefined;
      expect(result.url).to.not.be.null;

      expect(result.url).to.include('/servlet/rotator/' + placementId + '/0/vo?z=')
    });

    it('uses the bidId id as the openRtb request ID', function () {
      const bidId = '51ef8751f9aead';

      let bidRequests = [
        sampleBidRequest
      ];

      let results = spec.buildRequests(bidRequests, {
        bidderRequestId: 'sample'
      });
      let result = results.pop();

      // Double encoded JSON
      let payload = JSON.parse(result.data);

      expect(payload).to.not.be.null;
      expect(payload.id).to.equal(bidId);
    });

    it('generates the device payload as expected', function () {
      let bidRequests = [
        sampleBidRequest
      ];

      let results = spec.buildRequests(bidRequests, {
        bidderRequestId: 'sample'
      });
      let result = results.pop();

      // Double encoded JSON
      let payload = JSON.parse(result.data);

      expect(payload).to.not.be.null;
      let userData = payload.user;

      expect(userData).to.not.be.null;
    });

    it('generates multiple requests with single imp bodies', function () {
      const SECOND_PLACEMENT_ID = 'YYYPLACEMENTIDYYY';
      let firstBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));
      let secondBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));
      secondBidRequest.params.placementId = SECOND_PLACEMENT_ID;

      let bidRequests = [
        firstBidRequest,
        secondBidRequest
      ];

      let results = spec.buildRequests(bidRequests, {
        bidderRequestId: 'sample'
      });

      expect(results instanceof Array).to.be.true;
      expect(results.length).to.equal(2);

      let firstRequest = results[0];

      // Double encoded JSON
      let firstPayload = JSON.parse(firstRequest.data);

      expect(firstPayload).to.not.be.null;
      expect(firstPayload.imp).to.not.be.null;
      expect(firstPayload.imp.length).to.equal(1);

      expect(firstRequest.url).to.not.be.null;
      expect(firstRequest.url.indexOf('ZZZPLACEMENTZZZ')).to.be.gt(0);

      let secondRequest = results[1];

      // Double encoded JSON
      let secondPayload = JSON.parse(secondRequest.data);

      expect(secondPayload).to.not.be.null;
      expect(secondPayload.imp).to.not.be.null;
      expect(secondPayload.imp.length).to.equal(1);

      expect(secondRequest.url).to.not.be.null;
      expect(secondRequest.url.indexOf(SECOND_PLACEMENT_ID)).to.be.gt(0);
    });

    it('generates a banner request as expected', function () {
      // clone the sample for stability
      let localBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));

      let results = spec.buildRequests([localBidRequest], {
        bidderRequestId: 'sample'
      });
      let result = results.pop();

      // Double encoded JSON
      let payload = JSON.parse(result.data);

      expect(payload).to.not.be.null;

      let imps = payload.imp;

      let firstImp = imps[0];

      expect(firstImp.banner).to.not.be.null;

      let bannerData = firstImp.banner;

      expect(bannerData.w).to.equal(320);
      expect(bannerData.h).to.equal(50);
    });

    it('generates a banner request using a singular adSize instead of an array', function () {
      // clone the sample for stability
      let localBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));
      localBidRequest.sizes = [320, 50];
      localBidRequest.mediaTypes = { banner: {} };

      let results = spec.buildRequests([localBidRequest], {
        bidderRequestId: 'sample'
      });
      let result = results.pop();

      // Double encoded JSON
      let payload = JSON.parse(result.data);

      expect(payload).to.not.be.null;

      let imps = payload.imp;

      let firstImp = imps[0];

      expect(firstImp.banner).to.not.be.null;

      let bannerData = firstImp.banner;

      expect(bannerData.w).to.equal(320);
      expect(bannerData.h).to.equal(50);
    });

    it('fails gracefully on an invalid size', function () {
      // clone the sample for stability
      let localBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));
      localBidRequest.sizes = ['x', 'w'];

      localBidRequest.mediaTypes = { banner: { sizes: ['y', 'z'] } };

      let results = spec.buildRequests([localBidRequest], {
        bidderRequestId: 'sample'
      });
      let result = results.pop();

      // Double encoded JSON
      let payload = JSON.parse(result.data);

      expect(payload).to.not.be.null;

      let imps = payload.imp;

      let firstImp = imps[0];

      expect(firstImp.banner).to.not.be.null;

      let bannerData = firstImp.banner;

      expect(bannerData.w).to.equal(null);
      expect(bannerData.h).to.equal(null);
    });

    it('generates a video request as expected', function () {
      // clone the sample for stability
      let localBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));

      localBidRequest.mediaTypes = { video: {
        playerSize: [326, 56]
      } };

      let results = spec.buildRequests([localBidRequest], {
        bidderRequestId: 'sample'
      });
      let result = results.pop();

      // Double encoded JSON
      let payload = JSON.parse(result.data);

      expect(payload).to.not.be.null;

      let imps = payload.imp;

      let firstImp = imps[0];

      expect(firstImp.video).to.not.be.null;

      let videoData = firstImp.video;

      expect(videoData.w).to.equal(326);
      expect(videoData.h).to.equal(56);
    });

    it('propagates the mediaTypes object in the built request', function () {
      let localBidRequest = JSON.parse(JSON.stringify(sampleBidRequest));

      localBidRequest.mediaTypes = { video: {} };

      let results = spec.buildRequests([localBidRequest], {
        bidderRequestId: 'sample'
      });
      let result = results.pop();

      let mediaTypes = result.mediaTypes;

      expect(mediaTypes).to.not.be.null;
      expect(mediaTypes).to.not.be.undefined;
      expect(mediaTypes.video).to.not.be.null;
      expect(mediaTypes.video).to.not.be.undefined;
    });
  });

  describe('response interpreter', function () {
    it('returns an empty array when no bids present', function () {
      // an empty JSON body indicates no ad was found

      let result = spec.interpretResponse({ body: '' }, {})

      expect(result).to.eql([]);
    });

    it('gracefully fails when a non-JSON body is present', function () {
      let result = spec.interpretResponse({ body: 'THIS IS NOT <JSON/>' }, {})

      expect(result).to.eql([]);
    });

    it('returns a valid bid response on sucessful banner request', function () {
      let incomingRequestId = 'XXtestingXX';
      let responsePrice = 3.14

      let responseCreative = '<style>\n    body {\n        margin:0px;\n        padding:0px\n    }\n    #RyImgContainer {\n        width:100%;\n        height:100%;\n        position:absolute;\n        background-image: url(\"https://robertwlaschintest.rockyou.com/images/banners/adhawk3_test_728x90.png\");\n        background-size: contain;\n        background-repeat: no-repeat;\n        background-position: center;\n    }\n</style>\n<a href=\"https://tas-qa.rockyou.com/servlet/rotator/273/0/ch?ajkey=V1290DDF4BAJ-573J8400I2011AC181011I276I274QI219QQP0G00G0I2741274D66E000001010000G0PH101H36W8c21bab0e2DW476682DW44d8f2DW4908a2DX1263e094c09197H24X24AC181011AC18101134440BC2H44W7XU01v042DW8659e0a222DW4d04a2DW446612DW4bca22DX12cca633a0680e00G0G01FFG0H84W4httpsA2F2FW5https25334125324625W52Fwww2EW9w3schools2EW3com25W62Fhtml25W72Ftryit2EW3asp25X103Ffilename25X153Dtryhtml_basic05\" target=\"_blank\">\n    <div id=\"RyImgContainer\"></div>\n</a><script src=\"https://tas-qa.rockyou.com/servlet/rotator/273/0/impr?ajkey=V1290DDF4BAJ-573J8400I2011AC181011I276I274QI219QQP0G00G0I2741274D66E000001010000G0PH101H36W8c21bab0e2DW476682DW44d8f2DW4908a2DX1263e094c09197H24X24AC181011AC18101134440BC2H44W7XU01v042DW8659e0a222DW4d04a2DW446612DW4bca22DX12cca633a0680e00G0G01FFG0H84W4httpsA2F2FW5https25334125324625W52Fwww2EW9w3schools2EW3com25W62Fhtml25W72Ftryit2EW3asp25X103Ffilename25X153Dtryhtml_basic05&obid=${AUCTION_PRICE}\" type=\"text/javascript\"></script>';

      let responseCreativeId = '274';
      let responseCurrency = 'USD';

      let responseWidth = 300;
      let responseHeight = 250;
      let responseTtl = 213;

      let sampleResponse = {
        id: '66043f5ca44ecd8f8769093b1615b2d9',
        seatbid: [
          {
            bid: [
              {
                id: 'c21bab0e-7668-4d8f-908a-63e094c09197',
                impid: '1',
                price: responsePrice,
                adid: responseCreativeId,
                adm: responseCreative,
                adomain: [
                  'www.rockyouteststudios.com'
                ],
                cid: '274',
                attr: [],
                w: responseWidth,
                h: responseHeight,
                ext: {
                  ttl: responseTtl
                }
              }
            ],
            seat: '201',
            group: 0
          }
        ],
        bidid: 'c21bab0e-7668-4d8f-908a-63e094c09197',
        cur: responseCurrency
      };

      let sampleRequest = {
        bidId: incomingRequestId,
        mediaTypes: { banner: {} },
        requestId: incomingRequestId
      };

      let result = spec.interpretResponse(
        {
          body: sampleResponse
        },
        sampleRequest
      );

      expect(result.length).to.equal(1);

      let processedBid = result[0];

      // expect(processedBid.requestId).to.equal(incomingRequestId);
      expect(processedBid.cpm).to.equal(responsePrice);
      expect(processedBid.width).to.equal(responseWidth);
      expect(processedBid.height).to.equal(responseHeight);
      expect(processedBid.ad).to.equal(responseCreative);
      expect(processedBid.ttl).to.equal(responseTtl);
      expect(processedBid.creativeId).to.equal(responseCreativeId);
      expect(processedBid.netRevenue).to.equal(true);
      expect(processedBid.currency).to.equal(responseCurrency);
    });

    it('returns an valid bid response on sucessful video request', function () {
      let incomingRequestId = 'XXtesting-275XX';
      let responsePrice = 6

      let responseCreative = '<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<VAST version=\"2.0\" xmlns:xsi=\"https://www.w3.org/2001/XMLSchema-instance\" xsi:noNamespaceSchemaLocation=\"vast.xsd\">\n    <Ad id=\"01-1101011\">\n        <InLine>\n            <AdSystem version=\"2.0\">Mediatastic</AdSystem>\n            <Impression><![CDATA[https://tas-qa.rockyou.com/servlet/rotator/278/0/impr?ajkey=V1213221C05J-573J8400I2011329C6717J1556I270QI238QQP0G00G0I270127CF0B71G5302EW30061G3302E300001011000G0PH101H36W8a8ae0b482DW4a8db2DW442202DW4ba0c2DX127458f452b1f5H24X24329C6717329C6717448F69C5G0101109G9W9unwrapperG01FFG0G05C]]></Impression><Creatives>\n                <Creative>\n                    <Linear>\n                        <MediaFiles>\n                            <MediaFile delivery=\"progressive\" height=\"3\" type=\"video/mp4\" width=\"4\"><![CDATA[https://cdnrockyou-a.akamaihd.net/apps/socialvideoads/ads/mobiletest/kitchenscramble_15s.mp4]]></MediaFile>\n                        </MediaFiles>\n                        <Duration><![CDATA[00:00:15]]></Duration>\n                        <TrackingEvents/>\n                        <VideoClicks>\n                            <ClickThrough><![CDATA[https://www.facebook.com/KitchenScramble]]></ClickThrough>\n                        <ClickTracking><![CDATA[https://tas-qa.rockyou.com/servlet/rotator/278/0/ch?ajkey=V1213221C05J-573J8400I2011329C6717J1556I270QI238QQP0G00G0I270127CF0B71G5302EW30061G3302E300001011000G0PH101H36W8a8ae0b482DW4a8db2DW442202DW4ba0c2DX127458f452b1f5H24X24329C6717329C6717448F69C5G0101109G9W9unwrapperG01FFG0G05C]]></ClickTracking></VideoClicks>\n                    </Linear>\n                </Creative>\n            </Creatives>\n        </InLine>\n    </Ad>\n</VAST>';

      let responseCreativeId = '1556';
      let responseCurrency = 'USD';

      let responseWidth = 284;
      let responseHeight = 285;
      let responseTtl = 286;

      let sampleResponse = {
        id: '1234567890',
        seatbid: [
          {
            bid: [
              {
                id: 'a8ae0b48-a8db-4220-ba0c-7458f452b1f5',
                impid: '1',
                price: responsePrice,
                adid: responseCreativeId,
                adm: responseCreative,
                cid: '270',
                attr: [],
                w: responseWidth,
                h: responseHeight,
                ext: {
                  ttl: responseTtl
                }
              }
            ],
            seat: '201',
            group: 0
          }
        ],
        bidid: 'a8ae0b48-a8db-4220-ba0c-7458f452b1f5',
        cur: 'USD'
      };

      let sampleRequest = {
        bidId: incomingRequestId,
        mediaTypes: {
          video: {
          }
        },
        requestId: incomingRequestId
      };

      let result = spec.interpretResponse(
        {
          body: sampleResponse
        },
        sampleRequest
      );

      expect(result.length).to.equal(1);

      let processedBid = result[0];

      // expect(processedBid.requestId).to.equal(incomingRequestId);
      expect(processedBid.cpm).to.equal(responsePrice);
      expect(processedBid.width).to.equal(responseWidth);
      expect(processedBid.height).to.equal(responseHeight);
      expect(processedBid.ad).to.equal(null);
      expect(processedBid.ttl).to.equal(responseTtl);
      expect(processedBid.creativeId).to.equal(responseCreativeId);
      expect(processedBid.netRevenue).to.equal(true);
      expect(processedBid.currency).to.equal(responseCurrency);
      expect(processedBid.vastXml).to.equal(responseCreative);
    });

    it('generates event callbacks as expected', function () {
      let tally = {};
      let renderer = {
        handleVideoEvent: (eventObject) => {
          let eventName = eventObject.eventName;
          if (tally[eventName]) {
            tally[eventName] = tally[eventName] + 1;
          } else {
            tally[eventName] = 1;
          }
        }
      };

      let callbacks = internals.playerCallbacks(renderer);

      let validCallbacks = ['LOAD', 'IMPRESSION', 'COMPLETE', 'ERROR'];

      validCallbacks.forEach(event => {
        callbacks('n/a', event);
      });

      let callbackKeys = Object.keys(tally);
      expect(callbackKeys.length).to.equal(3);
      expect(tally['loaded']).to.equal(1);
      expect(tally['impression']).to.equal(1);
      expect(tally['ended']).to.equal(2);
    });

    it('generates a renderer that will hide on complete', function () {
      let elementName = 'test_element_id';
      let selector = `#${elementName}`;

      let mockElement = {
        style: {
          display: 'some'
        }
      };

      document.querySelector = (name) => {
        if (name === selector) {
          return mockElement;
        } else {
          return null;
        }
      };

      let renderer = internals.generateRenderer({}, elementName);

      renderer.handlers['ended']();

      expect(mockElement.style.display).to.equal('none');
    })
  });
});
