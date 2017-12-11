import {expect} from 'chai';
import {spec} from 'modules/pubmaticBidAdapter';
const constants = require('src/constants.json');

describe('PubMatic adapter', () => {
  let bidRequests;

  beforeEach(() => {
    bidRequests = [
      {
        bidder: 'pubmatic',
        params: {
          publisherId: '301',
          adSlot: '/15671365/DMDemo@300x250:0',
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
  });

  describe('implementation', () => {

  	describe('Bid validations', () => {

  		it('valid bid case', () => {
		  let validBid = {
	        bidder: 'pubmatic',
	        params: {
	          publisherId: '301',
	          adSlot: '/15671365/DMDemo@300x250:0'
	        }
	      },
	      isValid = spec.isBidRequestValid(validBid);
	      expect(isValid).to.equal(true);
  		});

		it('invalid bid case: publisherId not passed', () => {
		  let validBid = {
	        bidder: 'pubmatic',
	        params: {
	          adSlot: '/15671365/DMDemo@300x250:0'
	        }
	      },
	      isValid = spec.isBidRequestValid(validBid);
	      expect(isValid).to.equal(false);
  		});

		it('invalid bid case: adSlot not passed', () => {
		  let validBid = {
	        bidder: 'pubmatic',
	        params: {
	          publisherId: '301'
	        }
	      },
	      isValid = spec.isBidRequestValid(validBid);
	      expect(isValid).to.equal(false);
  		});
  	});

  	describe('Request formation', () => {
  		it('Endpoint checking', () => {
  		  let request = spec.buildRequests(bidRequests);
          expect(request.url).to.equal('//openbid.pubmatic.com/translator?source=prebid-server');
          expect(request.method).to.equal('POST');
  		});

  		it('Request params check', () => {
  		  let request = spec.buildRequests(bidRequests);
  		  let data = JSON.parse(request.data);
  		  expect(data.at).to.equal(2); //auction type
  		  expect(data.cur[0]).to.equal("USD"); //currency
  		  expect(data.site.domain).to.be.a('string'); // domain should be set
  		  expect(data.site.page).to.equal(bidRequests[0].params.kadpageurl); // forced pageURL
  		  expect(data.site.publisher.id).to.equal(bidRequests[0].params.publisherId); // publisher Id
  		  expect(data.user.yob).to.equal(bidRequests[0].params.yob); // YOB
  		  expect(data.user.gender).to.equal(bidRequests[0].params.gender); // Gender
  		  expect(data.user.lat).to.equal(bidRequests[0].params.lat); // Latitude
  		  expect(data.user.lon).to.equal(bidRequests[0].params.lon); // Lognitude
  		  expect(data.ext.wrapper.wv).to.equal(constants.REPO_AND_VERSION); // Wrapper Version
  		  expect(data.ext.wrapper.transactionId).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
  		  expect(data.ext.wrapper.wiid).to.equal(bidRequests[0].params.wiid); // OpenWrap: Wrapper Impression ID
  		  expect(data.ext.wrapper.profile).to.equal(bidRequests[0].params.profId); // OpenWrap: Wrapper Profile ID
  		  expect(data.ext.wrapper.version).to.equal(bidRequests[0].params.verId); // OpenWrap: Wrapper Profile Version ID

  		  expect(data.imp[0].id).to.equal(bidRequests[0].bidId); // Prebid bid id is passed as id 		  
  		  expect(data.imp[0].bidfloor).to.equal(bidRequests[0].params.kadfloor); // kadfloor
  		  expect(data.imp[0].tagid).to.equal('/15671365/DMDemo'); // tagid
  		  expect(data.imp[0].banner.w).to.equal(300); // width
  		  expect(data.imp[0].banner.h).to.equal(250); // height
  		  expect(data.imp[0].ext.pmZoneId).to.equal(bidRequests[0].params.pmzoneid); // pmzoneid
  		});

  		it('invalid adslot', () => {
  		  bidRequests[0].params.adSlot = '/15671365/DMDemo';
  		  let request = spec.buildRequests(bidRequests);
  		  expect(request).to.equal(undefined);
  		});
  	});

  });



});	