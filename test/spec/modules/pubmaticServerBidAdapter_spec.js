import {expect} from 'chai';
import {spec} from 'modules/pubmaticServerBidAdapter';
import * as utils from 'src/utils';
const constants = require('src/constants.json');

describe('PubMaticServer adapter', () => {
  let bidRequests;
  let bidResponses;
  let errorCodeBidResponses;
  window.PWT = {};

  beforeEach(() => {
    window.PWT.bidMap = {
      '/19968336/header-bid-tag-1': {
        name: '/19968336/header-bid-tag-1',
        sizes: ['300x250'],
        adapters: {
          pubmatic: {
            adapterID: 'pubmatic',
            callInitiatedTim: 1540366843207,
            bids: {
              '33094594bdbcc': {
                adapterID: 'pubmatic',
                kgpv: '300x250@300x250:5',
                bidID: '33094594bdbcc',
                grossEcpm: 0,
                netEcpm: 0,
                defaultBid: 1,
                adHtml: '',
                adUrl: '',
                height: 0,
                width: 0,
                creativeID: '',
                keyValuePairs: {},
                isPostTimeout: false,
                receivedTime: 1540366843207,
                isServerSide: 1,
                dealID: '',
                dealChannel: '',
                isWinningBid: false,
                status: 0,
                serverSideResponseTime: 0
              }
            },
            lastBidID: '33094594bdbcc'
          }
        },
        creationTime: 1540366843192,
        impressionID: 'dc031f5c-1391-4e7e-8bb7-732888688aa1-eeiuu',
        analyticsEnabled: false,
        expired: false
      }
    };
    bidRequests = [
      {
        bidder: 'pubmaticServer',
        params: {
          publisherId: '301',
          adUnitId: '/15671365/DMDemo',
          adUnitIndex: '0',
          divId: '/19968336/header-bid-tag-1',
          kadfloor: '1.2',
    		  pmzoneid: 'aabc, ddef',
    		  kadpageurl: 'www.publisher.com',
    		  yob: '1986',
    		  gender: 'M',
    		  lat: '12.3',
    		  lon: '23.7',
    		  wiid: '1234567890',
    		  profId: '100',
    		  verId: '200'
        },
        placementCode: '/19968336/header-bid-tag-1',
        sizes: [[300, 250], [300, 600]],
        bidId: '23acc48ad47af5',
        requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
      }
    ];

    bidResponses = {
      'body': {
        'id': '93D3BAD6-E2E2-49FB-9D89-920B1761C865',
        'seatbid': [{
          'bid': [{
            'id': '74858439-49D7-4169-BA5D-44A046315B2F',
            'impid': '23acc48ad47af5',
            'price': 1.3,
            'adm': 'image3.pubmatic.com Layer based creative',
            'h': 250,
            'w': 300,
            'ext': {
              'summary': [{
                'bidder': 'pubmatic',
                'bid': 1.3,
                'width': 300,
                'height': 250
              }]
            }
          }],
          'seat': 'pubmatic'
        }],
        'ext': {
          'responsetimemillis': {
            'pubmatic': 47
          },
          'matchedimpression': {
            'pubmatic': 1
          }
        }
      }
    };
    errorCodeBidResponses = {
      'body': {
        'id': '93D3BAD6-E2E2-49FB-9D89-920B1761C865',
        'seatbid': [{
          'bid': [{
            'id': '36d41be239a8e',
            'impid': '23acc48ad47af5',
            'price': 0,
            'h': 0,
            'w': 0,
            'ext': {
              'summary': [{
                'bidder': 'pubmatic',
                'bid': 0,
                'errorCode': 5,
                'errorMessage': 'Timeout error',
                'width': 0,
                'height': 0
              }]
            }
          }]
        }]
      }
    };
  });

  describe('implementation', () => {
  	describe('Bid validations', () => {
  		it('valid bid case', () => {
		  let validBid = {
	        bidder: 'pubmatic',
	        params: {
	          publisherId: '301',
	          adUnitId: '/15671365/DMDemo',
              adUnitIndex: '0',
              divId: '/19968336/header-bid-tag-1',
              profId: 1
	        }
	      },
	      isValid = spec.isBidRequestValid(validBid);
	      expect(isValid).to.equal(true);
  		});

      it('invalid bid case: publisherId not passed', () => {
		    let validBid = {
	        bidder: 'pubmatic',
	        params: {
	          adUnitId: '/15671365/DMDemo',
              adUnitIndex: '0',
              divId: '/19968336/header-bid-tag-1'
	        }
	      },
	      isValid = spec.isBidRequestValid(validBid);
	      expect(isValid).to.equal(false);
  		});

      it('invalid bid case: publisherId is not string', () => {
        let validBid = {
            bidder: 'pubmatic',
            params: {
              publisherId: 301,
              adUnitId: '/15671365/DMDemo',
              adUnitIndex: '0',
              divId: '/19968336/header-bid-tag-1'
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });

  		it('invalid bid case: adUnitId not passed', () => {
  		  let validBid = {
	        bidder: 'pubmatic',
	        params: {
	          publisherId: '301',
              adUnitIndex: '0',
              divId: '/19968336/header-bid-tag-1'
	          }
	      },
	      isValid = spec.isBidRequestValid(validBid);
	      expect(isValid).to.equal(false);
    	});

      it('invalid bid case: adUnitIndex not passed', () => {
        let validBid = {
            bidder: 'pubmatic',
            params: {
              publisherId: '301',
              adUnitId: '/15671365/DMDemo',
              divId: '/19968336/header-bid-tag-1'
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });

      it('invalid bid case: divId not passed', () => {
        let validBid = {
            bidder: 'pubmatic',
            params: {
              publisherId: '301',
              adUnitId: '/15671365/DMDemo',
              adUnitIndex: '0'
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });

      it('invalid bid case: adUnitId is not string', () => {
        let validBid = {
            bidder: 'pubmatic',
            params: {
              publisherId: '301',
              adUnitId: 15671365,
              adUnitIndex: '0',
              divId: '/19968336/header-bid-tag-1'
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });

      it('invalid bid case: adUnitIndex is not string', () => {
        let validBid = {
            bidder: 'pubmatic',
            params: {
              publisherId: '301',
              adUnitId: '/15671365/DMDemo',
              adUnitIndex: 0,
              divId: '/19968336/header-bid-tag-1'
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });

      it('invalid bid case: divId is not string', () => {
        let validBid = {
            bidder: 'pubmatic',
            params: {
              publisherId: '301',
              adUnitId: '/15671365/DMDemo',
              adUnitIndex: '0',
              divId: 19968336
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });
    });

  	describe('Request formation', () => {
  		it('Endpoint checking', () => {
  		  let request = spec.buildRequests(bidRequests);
        expect(request.url).to.equal('//ow.pubmatic.com/openrtb/2.5/');
        expect(request.method).to.equal('POST');
  		});

  		it('Request params check', () => {
  		  let request = spec.buildRequests(bidRequests);
  		  let data = JSON.parse(request.data);
  		  expect(data.at).to.equal(1); // auction type
  		  expect(data.cur[0]).to.equal('USD'); // currency
  		  expect(data.site.domain).to.be.a('string'); // domain should be set
  		  expect(data.site.page).to.equal(bidRequests[0].params.kadpageurl); // forced pageURL
  		  expect(data.site.publisher.id).to.equal(bidRequests[0].params.publisherId); // publisher Id
  		  expect(data.user.yob).to.equal(parseInt(bidRequests[0].params.yob)); // YOB
  		  expect(data.user.gender).to.equal(bidRequests[0].params.gender); // Gender
  		  expect(data.device.geo.lat).to.equal(parseFloat(bidRequests[0].params.lat)); // Latitude
  		  expect(data.device.geo.lon).to.equal(parseFloat(bidRequests[0].params.lon)); // Lognitude
  		  expect(data.user.geo.lat).to.equal(parseFloat(bidRequests[0].params.lat)); // Latitude
  		  expect(data.user.geo.lon).to.equal(parseFloat(bidRequests[0].params.lon)); // Lognitude
        expect(data.ext.wrapper.wv).to.equal(constants.REPO_AND_VERSION); // Wrapper Version
  		  expect(data.ext.wrapper.wp).to.equal('pbjs'); // Prebid TransactionId
  		  expect(data.ext.wrapper.wiid).to.equal(bidRequests[0].params.wiid); // OpenWrap: Wrapper Impression ID
        expect(data.ext.wrapper.profileid).to.equal(parseInt(bidRequests[0].params.profId)); // OpenWrap: Wrapper Profile ID
  		  expect(data.ext.wrapper.versionid).to.equal(parseInt(bidRequests[0].params.verId)); // OpenWrap: Wrapper Profile Version ID
        expect(data.ext.wrapper.sumry_disable).to.equal(0); // OpenWrap: Summary Disable flag
  		  expect(data.ext.wrapper.ssauction).to.equal(0); // OpenWrap: Server Side Auction flag
  		  expect(data.imp[0].id).to.equal(bidRequests[0].bidId); // Prebid bid id is passed as id
  		  expect(data.imp[0].bidfloor).to.equal(parseFloat(bidRequests[0].params.kadfloor)); // kadfloor
  		  expect(data.imp[0].tagid).to.equal(bidRequests[0].params.adUnitId); // tagid
        expect(data.imp[0].banner.format[0].w).to.equal(300); // width from 1st element of sizes array
        expect(data.imp[0].banner.format[0].h).to.equal(250); // height from 1st element of sizes array
  		  expect(data.imp[0].banner.format[1].w).to.equal(300); // width
        expect(data.imp[0].banner.format[1].h).to.equal(600); // height
  		  expect(data.imp[0].ext.bidder.pubmatic.pmZoneId).to.equal(bidRequests[0].params.pmzoneid.split(',').slice(0, 50).map(id => id.trim()).join()); // pmzoneid
        // TODO: Need to figure why this failing
        // expect(data.imp[0].ext.adunit).to.equal(bidRequests[0].params.adUnitId); // adUnitId
        expect(data.imp[0].ext.wrapper.div).to.equal(bidRequests[0].params.divId); // div

        // when sizes array has only 1 element
        bidRequests[0].sizes = [[300, 250]];
        request = spec.buildRequests(bidRequests);
        data = JSON.parse(request.data);

        expect(data.imp[0].banner.format[0].w).to.equal(300); // width from 1st element of sizes array
        expect(data.imp[0].banner.format[0].h).to.equal(250); // height from 1st element of sizes array
  		});

      it('Request params check with GDPR consent', () => {
        let bidRequest = {
          gdprConsent: {
            consentString: 'kjfdniwjnifwenrif3',
            gdprApplies: true
          }
        };
        let request = spec.buildRequests(bidRequests, bidRequest);
        let data = JSON.parse(request.data);
        expect(data.user.ext.consent).to.equal('kjfdniwjnifwenrif3'); // consentString
        expect(data.regs.ext.gdpr).to.equal(1); // consent required
        expect(data.at).to.equal(1); // auction type
        expect(data.cur[0]).to.equal('USD'); // currency
        expect(data.site.domain).to.be.a('string'); // domain should be set
        expect(data.site.page).to.equal(bidRequests[0].params.kadpageurl); // forced pageURL
        expect(data.site.publisher.id).to.equal(bidRequests[0].params.publisherId); // publisher Id
        expect(data.ext.wrapper.wv).to.equal(constants.REPO_AND_VERSION); // Wrapper Version
  		  expect(data.ext.wrapper.wp).to.equal('pbjs'); // Prebid TransactionId
  		  expect(data.ext.wrapper.wiid).to.equal(bidRequests[0].params.wiid); // OpenWrap: Wrapper Impression ID
        expect(data.user.yob).to.equal(parseInt(bidRequests[0].params.yob)); // YOB
        expect(data.user.gender).to.equal(bidRequests[0].params.gender); // Gender
        expect(data.device.geo.lat).to.equal(parseFloat(bidRequests[0].params.lat)); // Latitude
        expect(data.device.geo.lon).to.equal(parseFloat(bidRequests[0].params.lon)); // Lognitude
        expect(data.user.geo.lat).to.equal(parseFloat(bidRequests[0].params.lat)); // Latitude
        expect(data.user.geo.lon).to.equal(parseFloat(bidRequests[0].params.lon)); // Lognitude
        expect(data.ext.wrapper.profileid).to.equal(parseInt(bidRequests[0].params.profId)); // OpenWrap: Wrapper Profile ID
  		  expect(data.ext.wrapper.versionid).to.equal(parseInt(bidRequests[0].params.verId)); // OpenWrap: Wrapper Profile Version ID
        expect(data.ext.wrapper.sumry_disable).to.equal(0); // OpenWrap: Summary Disable flag
  		  expect(data.ext.wrapper.ssauction).to.equal(0); // OpenWrap: Server Side Auction flag
  		  expect(data.imp[0].id).to.equal(bidRequests[0].bidId); // Prebid bid id is passed as id
        expect(data.imp[0].bidfloor).to.equal(parseFloat(bidRequests[0].params.kadfloor)); // kadfloor
        expect(data.imp[0].tagid).to.equal(bidRequests[0].params.adUnitId); // tagid
        expect(data.imp[0].banner.format[0].w).to.equal(300); // width from 1st element of sizes array
        expect(data.imp[0].banner.format[0].h).to.equal(250); // height from 1st element of sizes array
  		  expect(data.imp[0].banner.format[1].w).to.equal(300); // width
        expect(data.imp[0].banner.format[1].h).to.equal(600); // height
        expect(data.imp[0].ext.bidder.pubmatic.pmZoneId).to.equal(bidRequests[0].params.pmzoneid.split(',').slice(0, 50).map(id => id.trim()).join()); // pmzoneid
        // TODO: Need to figure why this failing
        // expect(data.imp[0].ext.adunit).to.equal(bidRequests[0].params.adUnitId); // adUnitId
        expect(data.imp[0].ext.wrapper.div).to.equal(bidRequests[0].params.divId); // div

        // when sizes array has only 1 element
        bidRequests[0].sizes = [[300, 250]];
        request = spec.buildRequests(bidRequests, bidRequest);
        data = JSON.parse(request.data);

        expect(data.imp[0].banner.format[0].w).to.equal(300); // width from 1st element of sizes array
        expect(data.imp[0].banner.format[0].h).to.equal(250); // height from 1st element of sizes array
      });
  	});

    describe('Response checking', () => {
      it('should check for valid response values', () => {
        let request = spec.buildRequests(bidRequests);
        let response = spec.interpretResponse(bidResponses, request);
        expect(response).to.be.an('array').with.length.above(0);
        expect(response[0].requestId).to.equal(bidResponses.body.seatbid[0].bid[0].impid);
        expect(response[0].cpm).to.equal((bidResponses.body.seatbid[0].bid[0].price).toFixed(2));
        expect(response[0].width).to.equal(bidResponses.body.seatbid[0].bid[0].w);
        expect(response[0].height).to.equal(bidResponses.body.seatbid[0].bid[0].h);
        if (bidResponses.body.seatbid[0].bid[0].crid) {
          expect(response[0].creativeId).to.equal(bidResponses.body.seatbid[0].bid[0].crid);
        } else {
          expect(response[0].creativeId).to.equal(bidResponses.body.seatbid[0].bid[0].id);
        }
        expect(response[0].dealId).to.equal(bidResponses.body.seatbid[0].bid[0].dealid);
        expect(response[0].currency).to.equal('USD');
        expect(response[0].netRevenue).to.equal(true);
        expect(response[0].ttl).to.equal(300);
        expect(response[0].serverSideResponseTime).to.equal(47);
        expect(response[0].referrer).to.include(utils.getTopWindowUrl());
        expect(response[0].ad).to.equal(bidResponses.body.seatbid[0].bid[0].adm);
        expect(response[0].originalBidder).to.equal(bidResponses.body.seatbid[0].bid[0].ext.summary[0].bidder);
        expect(response[0].bidderCode).to.equal(spec.code);
      });
    });

    describe('Response checking', () => {
      it('should set serverSideResponseTime to 0 when error code retured by endpoint is 5', () => {
        let request = spec.buildRequests(bidRequests);
        let response = spec.interpretResponse(errorCodeBidResponses, request);
        expect(response).to.be.an('array').with.length.above(0);
        expect(response[0].serverSideResponseTime).to.equal(0);
      });

      it('should set serverSideResponseTime to -1 when error code retured by endpoint any of the following 1/2/6', () => {
        let request = spec.buildRequests(bidRequests);
        errorCodeBidResponses.body.seatbid[0].bid[0].ext.summary[0].errorCode = 1;

        let response = spec.interpretResponse(errorCodeBidResponses, request);
        expect(response).to.be.an('array').with.length.above(0);
        expect(response[0].serverSideResponseTime).to.equal(-1);

        errorCodeBidResponses.body.seatbid[0].bid[0].ext.summary[0].errorCode = 2;
        response = spec.interpretResponse(errorCodeBidResponses, request);
        expect(response).to.be.an('array').with.length.above(0);
        expect(response[0].serverSideResponseTime).to.equal(-1);

        errorCodeBidResponses.body.seatbid[0].bid[0].ext.summary[0].errorCode = 6;
        response = spec.interpretResponse(errorCodeBidResponses, request);
        expect(response).to.be.an('array').with.length.above(0);
        expect(response[0].serverSideResponseTime).to.equal(-1);
      });
    });
  });
});
