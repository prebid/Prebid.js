import {expect} from 'chai';
import {spec} from 'modules/pubmaticBidAdapter';
import * as utils from 'src/utils';
const constants = require('src/constants.json');

describe('PubMatic adapter', () => {
  let bidRequests;
  let videoBidRequests;
  let multipleMediaRequests;
  let bidResponses;

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

    videoBidRequests =
    [
      {
        code: 'video1',
        mediaTypes: {
          video: {
            playerSize: [640, 480],
            context: 'instream'
          }
        },
        bidder: 'pubmatic',
        params: {
          publisherId: '5890',
          adSlot: 'Div1@0x0', // ad_id or tagid
          video: {
            mimes: ['video/mp4', 'video/x-flv'],
            skippable: true,
            minduration: 5,
            maxduration: 30,
            startdelay: 5,
            playbackmethod: [1, 3],
            api: [1, 2],
            protocols: [2, 3],
            battr: [13, 14],
            linearity: 1,
            placement: 2,
            minbitrate: 10,
            maxbitrate: 10
          }
        }
      }
    ];

    multipleMediaRequests =
    [
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
        }
      },
      {
        code: 'div-instream',
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [300, 250]
          },
        },
        bidder: 'pubmatic',
        params: {
          publisherId: '5890',
          adSlot: 'Div1@640x480', // ad_id or tagid
          video: {
            mimes: ['video/mp4', 'video/x-flv'],
            skippable: true,
            minduration: 5,
            maxduration: 30,
            startdelay: 15,
            playbackmethod: [1, 3],
            api: [1, 2],
            protocols: [2, 3],
            w: 640,
            h: 480,
            battr: [13, 14],
            linearity: 1,
            placement: 2,
            minbitrate: 100,
            maxbitrate: 4096
          }
        }
      }
    ];

    bidResponses = {
      'body': {
        'id': '93D3BAD6-E2E2-49FB-9D89-920B1761C865',
        'seatbid': [{
          'bid': [{
            'id': '74858439-49D7-4169-BA5D-44A046315B2F',
            'impid': '22bddb28db77d',
            'price': 1.3,
            'adm': 'image3.pubmatic.com Layer based creative',
            'h': 250,
            'w': 300,
            'ext': {
              'deal_channel': 6
            }
          }]
        }, {
          'bid': [{
            'id': '74858439-49D7-4169-BA5D-44A046315BEF',
            'impid': '22bddb28db77e',
            'price': 1.7,
            'adm': 'image3.pubmatic.com Layer based creative',
            'h': 250,
            'w': 300,
            'ext': {
              'deal_channel': 5
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

      it('invalid bid case: publisherId is not string', () => {
        let validBid = {
            bidder: 'pubmatic',
            params: {
              publisherId: 301,
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

      it('invalid bid case: adSlot is not string', () => {
        let validBid = {
            bidder: 'pubmatic',
            params: {
              publisherId: '301',
              adSlot: 15671365
            }
          },
          isValid = spec.isBidRequestValid(validBid);
        expect(isValid).to.equal(false);
      });
    });

  	describe('Request formation', () => {
  		it('Endpoint checking', () => {
  		  let request = spec.buildRequests(bidRequests);
        expect(request.url).to.equal('//hbopenbid.pubmatic.com/translator?source=prebid-client');
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
  		  expect(data.ext.wrapper.transactionId).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
  		  expect(data.ext.wrapper.wiid).to.equal(bidRequests[0].params.wiid); // OpenWrap: Wrapper Impression ID
  		  expect(data.ext.wrapper.profile).to.equal(parseInt(bidRequests[0].params.profId)); // OpenWrap: Wrapper Profile ID
  		  expect(data.ext.wrapper.version).to.equal(parseInt(bidRequests[0].params.verId)); // OpenWrap: Wrapper Profile Version ID

  		  expect(data.imp[0].id).to.equal(bidRequests[0].bidId); // Prebid bid id is passed as id
  		  expect(data.imp[0].bidfloor).to.equal(parseFloat(bidRequests[0].params.kadfloor)); // kadfloor
  		  expect(data.imp[0].tagid).to.equal('/15671365/DMDemo'); // tagid
  		  expect(data.imp[0].banner.w).to.equal(300); // width
  		  expect(data.imp[0].banner.h).to.equal(250); // height
  		  expect(data.imp[0].ext.pmZoneId).to.equal(bidRequests[0].params.pmzoneid.split(',').slice(0, 50).map(id => id.trim()).join()); // pmzoneid
  		});

      it('Request params check with GDPR Consent', () => {
        let bidRequest = {
          gdprConsent: {
            consentString: 'kjfdniwjnifwenrif3',
            gdprApplies: true
          }
        };
  		  let request = spec.buildRequests(bidRequests, bidRequest);
  		  let data = JSON.parse(request.data);
        expect(data.user.ext.consent).to.equal('kjfdniwjnifwenrif3');
        expect(data.regs.ext.gdpr).to.equal(1);
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
  		  expect(data.ext.wrapper.transactionId).to.equal(bidRequests[0].transactionId); // Prebid TransactionId
  		  expect(data.ext.wrapper.wiid).to.equal(bidRequests[0].params.wiid); // OpenWrap: Wrapper Impression ID
        expect(data.ext.wrapper.profile).to.equal(parseInt(bidRequests[0].params.profId)); // OpenWrap: Wrapper Profile ID
  		  expect(data.ext.wrapper.version).to.equal(parseInt(bidRequests[0].params.verId)); // OpenWrap: Wrapper Profile Version ID

  		  expect(data.imp[0].id).to.equal(bidRequests[0].bidId); // Prebid bid id is passed as id
  		  expect(data.imp[0].bidfloor).to.equal(parseFloat(bidRequests[0].params.kadfloor)); // kadfloor
  		  expect(data.imp[0].tagid).to.equal('/15671365/DMDemo'); // tagid
  		  expect(data.imp[0].banner.w).to.equal(300); // width
  		  expect(data.imp[0].banner.h).to.equal(250); // height
  		  expect(data.imp[0].ext.pmZoneId).to.equal(bidRequests[0].params.pmzoneid.split(',').slice(0, 50).map(id => id.trim()).join()); // pmzoneid
  		});

      it('Request params check for video ad', () => {
        let request = spec.buildRequests(videoBidRequests);
        let data = JSON.parse(request.data);
        expect(data.imp[0].video).to.exist;
        expect(data.imp[0].tagid).to.equal('Div1');
        expect(data.imp[0].video.ext['video_skippable']).to.equal(videoBidRequests[0].params.video.skippable ? 1 : 0);
        expect(data.imp[0]['video']['mimes']).to.exist.and.to.be.an('array');
        expect(data.imp[0]['video']['mimes'][0]).to.equal(videoBidRequests[0].params.video['mimes'][0]);
        expect(data.imp[0]['video']['mimes'][1]).to.equal(videoBidRequests[0].params.video['mimes'][1]);
        expect(data.imp[0]['video']['minduration']).to.equal(videoBidRequests[0].params.video['minduration']);
        expect(data.imp[0]['video']['maxduration']).to.equal(videoBidRequests[0].params.video['maxduration']);
        expect(data.imp[0]['video']['startdelay']).to.equal(videoBidRequests[0].params.video['startdelay']);

        expect(data.imp[0]['video']['playbackmethod']).to.exist.and.to.be.an('array');
        expect(data.imp[0]['video']['playbackmethod'][0]).to.equal(videoBidRequests[0].params.video['playbackmethod'][0]);
        expect(data.imp[0]['video']['playbackmethod'][1]).to.equal(videoBidRequests[0].params.video['playbackmethod'][1]);

        expect(data.imp[0]['video']['api']).to.exist.and.to.be.an('array');
        expect(data.imp[0]['video']['api'][0]).to.equal(videoBidRequests[0].params.video['api'][0]);
        expect(data.imp[0]['video']['api'][1]).to.equal(videoBidRequests[0].params.video['api'][1]);

        expect(data.imp[0]['video']['protocols']).to.exist.and.to.be.an('array');
        expect(data.imp[0]['video']['protocols'][0]).to.equal(videoBidRequests[0].params.video['protocols'][0]);
        expect(data.imp[0]['video']['protocols'][1]).to.equal(videoBidRequests[0].params.video['protocols'][1]);

        expect(data.imp[0]['video']['battr']).to.exist.and.to.be.an('array');
        expect(data.imp[0]['video']['battr'][0]).to.equal(videoBidRequests[0].params.video['battr'][0]);
        expect(data.imp[0]['video']['battr'][1]).to.equal(videoBidRequests[0].params.video['battr'][1]);

        expect(data.imp[0]['video']['linearity']).to.equal(videoBidRequests[0].params.video['linearity']);
        expect(data.imp[0]['video']['placement']).to.equal(videoBidRequests[0].params.video['placement']);
        expect(data.imp[0]['video']['minbitrate']).to.equal(videoBidRequests[0].params.video['minbitrate']);
        expect(data.imp[0]['video']['maxbitrate']).to.equal(videoBidRequests[0].params.video['maxbitrate']);

        expect(data.imp[0]['video']['w']).to.equal(videoBidRequests[0].mediaTypes.video.playerSize[0]);
        expect(data.imp[0]['video']['h']).to.equal(videoBidRequests[0].mediaTypes.video.playerSize[1]);
      });

      it('Request params check for 1 banner and 1 video ad', () => {
        let request = spec.buildRequests(multipleMediaRequests);
        let data = JSON.parse(request.data);

        expect(data.imp).to.be.an('array')
        expect(data.imp).with.length.above(1);

        expect(data.at).to.equal(1); // auction type
        expect(data.cur[0]).to.equal('USD'); // currency
        expect(data.site.domain).to.be.a('string'); // domain should be set
        expect(data.site.page).to.equal(multipleMediaRequests[0].params.kadpageurl); // forced pageURL
        expect(data.site.publisher.id).to.equal(multipleMediaRequests[0].params.publisherId); // publisher Id
        expect(data.user.yob).to.equal(parseInt(multipleMediaRequests[0].params.yob)); // YOB
        expect(data.user.gender).to.equal(multipleMediaRequests[0].params.gender); // Gender
        expect(data.device.geo.lat).to.equal(parseFloat(multipleMediaRequests[0].params.lat)); // Latitude
        expect(data.device.geo.lon).to.equal(parseFloat(multipleMediaRequests[0].params.lon)); // Lognitude
        expect(data.user.geo.lat).to.equal(parseFloat(multipleMediaRequests[0].params.lat)); // Latitude
        expect(data.user.geo.lon).to.equal(parseFloat(multipleMediaRequests[0].params.lon)); // Lognitude
        expect(data.ext.wrapper.wv).to.equal(constants.REPO_AND_VERSION); // Wrapper Version
        expect(data.ext.wrapper.transactionId).to.equal(multipleMediaRequests[0].transactionId); // Prebid TransactionId
        expect(data.ext.wrapper.wiid).to.equal(multipleMediaRequests[0].params.wiid); // OpenWrap: Wrapper Impression ID
        expect(data.ext.wrapper.profile).to.equal(parseInt(multipleMediaRequests[0].params.profId)); // OpenWrap: Wrapper Profile ID
        expect(data.ext.wrapper.version).to.equal(parseInt(multipleMediaRequests[0].params.verId)); // OpenWrap: Wrapper Profile Version ID

        // banner imp object check
        expect(data.imp[0].id).to.equal(multipleMediaRequests[0].bidId); // Prebid bid id is passed as id
        expect(data.imp[0].bidfloor).to.equal(parseFloat(multipleMediaRequests[0].params.kadfloor)); // kadfloor
        expect(data.imp[0].tagid).to.equal('/15671365/DMDemo'); // tagid
        expect(data.imp[0].banner.w).to.equal(300); // width
        expect(data.imp[0].banner.h).to.equal(250); // height
        expect(data.imp[0].ext.pmZoneId).to.equal(multipleMediaRequests[0].params.pmzoneid.split(',').slice(0, 50).map(id => id.trim()).join()); // pmzoneid

        // video imp object check
        expect(data.imp[1].video).to.exist;
        expect(data.imp[1].tagid).to.equal('Div1');
        expect(data.imp[1].video.ext['video_skippable']).to.equal(multipleMediaRequests[1].params.video.skippable ? 1 : 0);
        expect(data.imp[1]['video']['mimes']).to.exist.and.to.be.an('array');
        expect(data.imp[1]['video']['mimes'][0]).to.equal(multipleMediaRequests[1].params.video['mimes'][0]);
        expect(data.imp[1]['video']['mimes'][1]).to.equal(multipleMediaRequests[1].params.video['mimes'][1]);
        expect(data.imp[1]['video']['minduration']).to.equal(multipleMediaRequests[1].params.video['minduration']);
        expect(data.imp[1]['video']['maxduration']).to.equal(multipleMediaRequests[1].params.video['maxduration']);
        expect(data.imp[1]['video']['startdelay']).to.equal(multipleMediaRequests[1].params.video['startdelay']);

        expect(data.imp[1]['video']['playbackmethod']).to.exist.and.to.be.an('array');
        expect(data.imp[1]['video']['playbackmethod'][0]).to.equal(multipleMediaRequests[1].params.video['playbackmethod'][0]);
        expect(data.imp[1]['video']['playbackmethod'][1]).to.equal(multipleMediaRequests[1].params.video['playbackmethod'][1]);

        expect(data.imp[1]['video']['api']).to.exist.and.to.be.an('array');
        expect(data.imp[1]['video']['api'][0]).to.equal(multipleMediaRequests[1].params.video['api'][0]);
        expect(data.imp[1]['video']['api'][1]).to.equal(multipleMediaRequests[1].params.video['api'][1]);

        expect(data.imp[1]['video']['protocols']).to.exist.and.to.be.an('array');
        expect(data.imp[1]['video']['protocols'][0]).to.equal(multipleMediaRequests[1].params.video['protocols'][0]);
        expect(data.imp[1]['video']['protocols'][1]).to.equal(multipleMediaRequests[1].params.video['protocols'][1]);

        expect(data.imp[1]['video']['battr']).to.exist.and.to.be.an('array');
        expect(data.imp[1]['video']['battr'][0]).to.equal(multipleMediaRequests[1].params.video['battr'][0]);
        expect(data.imp[1]['video']['battr'][1]).to.equal(multipleMediaRequests[1].params.video['battr'][1]);

        expect(data.imp[1]['video']['linearity']).to.equal(multipleMediaRequests[1].params.video['linearity']);
        expect(data.imp[1]['video']['placement']).to.equal(multipleMediaRequests[1].params.video['placement']);
        expect(data.imp[1]['video']['minbitrate']).to.equal(multipleMediaRequests[1].params.video['minbitrate']);
        expect(data.imp[1]['video']['maxbitrate']).to.equal(multipleMediaRequests[1].params.video['maxbitrate']);

        expect(data.imp[1]['video']['w']).to.equal(multipleMediaRequests[1].mediaTypes.video.playerSize[0]);
        expect(data.imp[1]['video']['h']).to.equal(multipleMediaRequests[1].mediaTypes.video.playerSize[1]);
      });

  		it('invalid adslot', () => {
  		  bidRequests[0].params.adSlot = '/15671365/DMDemo';
  		  let request = spec.buildRequests(bidRequests);
  		  expect(request).to.equal(undefined);
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
        expect(response[0].netRevenue).to.equal(false);
        expect(response[0].ttl).to.equal(300);
        expect(response[0].referrer).to.include(utils.getTopWindowUrl());
        expect(response[0].ad).to.equal(bidResponses.body.seatbid[0].bid[0].adm);

        expect(response[1].requestId).to.equal(bidResponses.body.seatbid[1].bid[0].impid);
        expect(response[1].cpm).to.equal((bidResponses.body.seatbid[1].bid[0].price).toFixed(2));
        expect(response[1].width).to.equal(bidResponses.body.seatbid[1].bid[0].w);
        expect(response[1].height).to.equal(bidResponses.body.seatbid[1].bid[0].h);
        if (bidResponses.body.seatbid[1].bid[0].crid) {
          expect(response[1].creativeId).to.equal(bidResponses.body.seatbid[1].bid[0].crid);
        } else {
          expect(response[1].creativeId).to.equal(bidResponses.body.seatbid[1].bid[0].id);
        }
        expect(response[1].dealId).to.equal(bidResponses.body.seatbid[1].bid[0].dealid);
        expect(response[1].currency).to.equal('USD');
        expect(response[1].netRevenue).to.equal(false);
        expect(response[1].ttl).to.equal(300);
        expect(response[1].referrer).to.include(utils.getTopWindowUrl());
        expect(response[1].ad).to.equal(bidResponses.body.seatbid[1].bid[0].adm);
      });

      it('should check for dealChannel value selection', () => {
        let request = spec.buildRequests(bidRequests);
        let response = spec.interpretResponse(bidResponses, request);
        expect(response).to.be.an('array').with.length.above(0);
        expect(response[0].dealChannel).to.equal('PMPG');
        expect(response[1].dealChannel).to.equal('PREF');
      });

      it('should check for unexpected dealChannel value selection', () => {
        let request = spec.buildRequests(bidRequests);
        let updateBiResponse = bidResponses;
        updateBiResponse.body.seatbid[0].bid[0].ext.deal_channel = 11;

        let response = spec.interpretResponse(updateBiResponse, request);

        expect(response).to.be.an('array').with.length.above(0);
        expect(response[0].dealChannel).to.equal(null);
      });
    });
  });
});
