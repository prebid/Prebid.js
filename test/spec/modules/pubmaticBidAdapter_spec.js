import { expect } from 'chai';
import { spec, cpmAdjustment } from 'modules/pubmaticBidAdapter.js';
import * as utils from 'src/utils.js';
import { bidderSettings } from 'src/bidderSettings.js';

describe('PubMatic adapter', () => {
  let firstBid, videoBid, firstResponse, response, videoResponse;
  let request = {};
  firstBid = {
    adUnitCode: 'Div1',
    bidder: 'pubmatic',
    mediaTypes: {
      banner: {
        sizes: [[728, 90], [160, 600]],
        pos: 1
      }
    },
    params: {
      publisherId: '5670',
      adSlot: '/15671365/DMDemo@300x250:0',
      kadfloor: '1.2',
      pmzoneid: 'aabc, ddef',
      // kadpageurl: 'www.publisher.com',
      yob: '1986',
      gender: 'M',
      lat: '12.3',
      lon: '23.7',
      wiid: '1234567890',
      profId: '100',
      verId: '200',
      currency: 'AUD',
      dctr: 'key1:val1,val2|key2:val1',
      deals: ['deal-1', 'deal-2']
    },
    placementCode: '/19968336/header-bid-tag-1',
    sizes: [
      [300, 250],
      [300, 600],
      ['fluid']
    ],
    bidId: '3736271c3c4b27',
    requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
    bidderRequestId: '1c56ad30b9b8ca8',
    ortb2: {
      device: {
        w: 1200,
        h: 1800,
        sua: {},
        language: 'en',
        js: 1,
        connectiontype: 6
      },
      site: {domain: 'ebay.com', page: 'https://ebay.com'},
      source: {}
    },
    ortb2Imp: {
      ext: {
        	tid: '92489f71-1bf2-49a0-adf9-000cea934729',
        	gpid: '/1111/homepage-leftnav',
        data: {
          pbadslot: '/1111/homepage-leftnav',
          adserver: {
            name: 'gam',
            adslot: '/1111/homepage-leftnav'
          },
          customData: {
            id: 'id-1'
          }
        }
      }
    },
  }
  videoBid = {
    'seat': 'seat-id',
    'ext': {
		  'buyid': 'BUYER-ID-987'
    },
    'bid': [{
      'id': '74858439-49D7-4169-BA5D-44A046315B2F',
      'impid': '3736271c3c4b27',
      'price': 1.3,
      'adm': '<VAST version="3.0"><Ad id="601364"><InLine><AdSystem>Acudeo Compatible</AdSystem><AdTitle>VAST 2.0 Instream Test 1</AdTitle><Description>VAST 2.0 Instream Test 1</Description><Impression><![CDATA[http://172.16.4.213/AdServer/AdDisplayTrackerServlet?operId=1&pubId=5890&siteId=47163&adId=1405268&adType=13&adServerId=243&kefact=70.000000&kaxefact=70.000000&kadNetFrequecy=0&kadwidth=0&kadheight=0&kadsizeid=97&kltstamp=1529929473&indirectAdId=0&adServerOptimizerId=2&ranreq=0.1&kpbmtpfact=100.000000&dcId=1&tldId=0&passback=0&svr=MADS1107&ekefact=Ad8wW91TCwCmdG0jlfjXn7Tyzh20hnTVx-m5DoNSep-RXGDr&ekaxefact=Ad8wWwRUCwAGir4Zzl1eF0bKiC-qrCV0D0yp_eE7YizB_BQk&ekpbmtpfact=Ad8wWxRUCwD7qgzwwPE2LnS5-Ou19uO5amJl1YT6-XVFvQ41&imprId=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&oid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&crID=creative-1_1_2&ucrid=160175026529250297&campaignId=17050&creativeId=0&pctr=0.000000&wDSPByrId=511&wDspId=6&wbId=0&wrId=0&wAdvID=3170&isRTB=1&rtbId=EBCA079F-8D7C-45B8-B733-92951F670AA1&pmZoneId=zone1&pageURL=www.yahoo.com&lpu=ae.com]]></Impression><Impression>https://dsptracker.com/{PSPM}</Impression><Error><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&er=[ERRORCODE]]]></Error><Error><![CDATA[https://Errortrack.com?p=1234&er=[ERRORCODE]]]></Error><Creatives><Creative AdID="601364"><Linear skipoffset="20%"><TrackingEvents><Tracking event="close"><![CDATA[https://mytracking.com/linear/close]]></Tracking><Tracking event="skip"><![CDATA[https://mytracking.com/linear/skip]]></Tracking><Tracking event="creativeView"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=1]]></Tracking><Tracking event="start"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=2]]></Tracking><Tracking event="midpoint"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=3]]></Tracking><Tracking event="firstQuartile"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=4]]></Tracking><Tracking event="thirdQuartile"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=5]]></Tracking><Tracking event="complete"><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=6]]></Tracking></TrackingEvents><Duration>00:00:04</Duration><VideoClicks><ClickTracking><![CDATA[http://172.16.4.213/track?operId=7&p=5890&s=47163&a=1405268&wa=243&ts=1529929473&wc=17050&crId=creative-1_1_2&ucrid=160175026529250297&impid=48F73E1A-7F23-443D-A53C-30EE6BBF5F7F&advertiser_id=3170&ecpm=70.000000&e=99]]></ClickTracking><ClickThrough>https://www.pubmatic.com</ClickThrough></VideoClicks><MediaFiles><MediaFile delivery="progressive" type="video/mp4" bitrate="500" width="400" height="300" scalable="true" maintainAspectRatio="true"><![CDATA[https://stagingnyc.pubmatic.com:8443/video/Shashank/mediaFileHost/media/mp4-sample-2.mp4]]></MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>',
      'adomain': ['blackrock.com'],
      'h': 250,
      'w': 300,
      'ext': {
        'deal_channel': 6,
        'advid': 976,
        'dspid': 123
      },
      'dealid': 'PUBDEAL1',
      'mtype': 2
    }]
  };
  firstResponse = {
    'seat': 'seat-id',
    'ext': {
		  'buyid': 'BUYER-ID-987'
    },
    'bid': [{
      'id': '74858439-49D7-4169-BA5D-44A046315B2F',
      'impid': '3736271c3c4b27',
      'price': 1.3,
      'adm': 'image3.pubmatic.com Layer based creative',
      'adomain': ['blackrock.com'],
      'h': 250,
      'w': 300,
      'ext': {
        'deal_channel': 6,
        'advid': 976,
        'dspid': 123
      },
      'dealid': 'PUBDEAL1',
      'mtype': 1
    }]
  };
  response = {
    'body': {
		  cur: 'USD',
		  id: '93D3BAD6-E2E2-49FB-9D89-920B1761C865',
		  seatbid: [firstResponse]
    }
  };
  videoResponse = {
    'body': {
		  cur: 'USD',
		  id: '93D3BAD6-E2E2-49FB-9D89-920B1761C865',
		  seatbid: [videoBid]
    }
  }
  let validBidRequests = [firstBid];
  let bidderRequest = {
    bids: [firstBid],
    auctionId: 'ee3074fe-97ce-4681-9235-d7622aede74c',
    auctionStart: 1725514077194,
    bidderCode: 'pubmatic',
    bidderRequestId: '1c56ad30b9b8ca8',
    refererInfo: {
      page: 'https://ebay.com',
      ref: ''
    },
    ortb2: {
      device: {
        w: 1200,
        h: 1800,
        sua: {},
        language: 'en',
        js: 1,
        connectiontype: 6
      },
      site: {domain: 'ebay.com', page: 'https://ebay.com'},
      source: {}
    },
    timeout: 2000
  };
  let videoBidRequest, videoBidderRequest, utilsLogWarnMock, nativeBidderRequest;

  describe('Bid validations', () => {
    it('should return true if publisherId is present in params', () => {
      const isValid = spec.isBidRequestValid(validBidRequests[0]);
      expect(isValid).to.equal(true);
    });

    it('should return false if publisherId is missing', () => {
      const bid = utils.deepClone(validBidRequests[0]);
      delete bid.params.publisherId;
	  	const isValid = spec.isBidRequestValid(bid);
	  	expect(isValid).to.equal(false);
  	});

    it('should return false if publisherId is not of type string', () => {
      const bid = utils.deepClone(validBidRequests[0]);
      bid.params.publisherId = 5890;
	    const isValid = spec.isBidRequestValid(bid);
	    expect(isValid).to.equal(false);
  	});

    if (FEATURES.VIDEO) {
      describe('VIDEO', () => {
        beforeEach(() => {
          videoBidRequest = utils.deepClone(validBidRequests[0]);
          delete videoBidRequest.mediaTypes.banner;
          videoBidRequest.mediaTypes.video = {
            playerSize: [
              [640, 480]
            ],
            protocols: [1, 2, 5],
            context: 'instream',
            skippable: false,
            skip: 1,
            linearity: 2
          }
        });
        it('should return false if mimes are missing in a video impression request', () => {
			  	const isValid = spec.isBidRequestValid(videoBidRequest);
			  	expect(isValid).to.equal(false);
        });

        it('should return false if context is missing in a video impression request', () => {
          delete videoBidRequest.mediaTypes.context;
          const isValid = spec.isBidRequestValid(videoBidRequest);
          expect(isValid).to.equal(false);
        })

        it('should return true if banner/native present, but outstreamAU or renderer is missing', () => {
          videoBidRequest.mediaTypes.video.mimes = ['video/flv'];
          videoBidRequest.mediaTypes.video.context = 'outstream';
          videoBidRequest.mediaTypes.banner = {
            sizes: [[728, 90], [160, 600]]
          }
          const isValid = spec.isBidRequestValid(videoBidRequest);
          expect(isValid).to.equal(true);
        });

        it('should return false if outstreamAU or renderer is missing', () => {
          const isValid = spec.isBidRequestValid(videoBidRequest);
          expect(isValid).to.equal(false);
        });
      });
    }
  });

  describe('Request formation', () => {
    describe('IMP', () => {
      it('should generate request with banner', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('banner');
        expect(imp[0]).to.have.property('id').equal('3736271c3c4b27');
      });

      it('should add pmp if deals are present in parameters', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('pmp');
        expect(imp[0]).to.have.property('pmp').to.have.property('deals').with.lengthOf(2);
      });

      it('should not add pmp if deals are absent in parameters', () => {
        delete validBidRequests[0].params.deals;
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.not.have.property('pmp');
      });

      it('should add key_val property if dctr is present in parameters', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('ext');
        expect(imp[0]).to.have.property('ext').to.have.property('key_val');
      });

      it('should not add key_val if dctr is absent in parameters', () => {
        delete validBidRequests[0].params.dctr;
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('ext').to.not.have.property('key_val');
      });

      it('should set w and h to the primary size for banner', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('banner');
        expect(imp[0]).to.have.property('banner').to.have.property('w').equal(300);
        expect(imp[0]).to.have.property('banner').to.have.property('h').equal(250);
      });

      it('should have 1 size in the banner.format array', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('banner').to.have.property('format');
        expect(imp[0]).to.have.property('banner').to.have.property('format').with.lengthOf(2);
      });

      it('should add pmZoneId in ext if pmzoneid is present in parameters', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('ext');
        expect(imp[0]).to.have.property('ext').to.have.property('pmZoneId');
      });

      it('should add bidfloor if kadfloor is present in parameters', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('bidfloor');
        expect(imp[0]).to.have.property('bidfloor').equal(1.2);
      });

      it('should add bidfloorcur if currency is present in parameters', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('bidfloorcur');
        expect(imp[0]).to.have.property('bidfloorcur').equal('AUD');
      });

      it('should add bidfloorcur with default value if currency is missing in parameters', () => {
        delete validBidRequests[0].params.currency;
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('bidfloorcur');
        expect(imp[0]).to.have.property('bidfloorcur').equal('USD');
      });

      it('should add tagid', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('tagid');
        expect(imp[0]).to.have.property('tagid').equal('/15671365/DMDemo');
      });

      it('should add secure, displaymanager & displaymanagerver', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('secure').equal(1);
        expect(imp[0]).to.have.property('displaymanager').equal('Prebid.js');
        expect(imp[0]).to.have.property('displaymanagerver');
      });

      it('should include the properties topframe and format as an array', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('banner').to.have.property('topframe');
        expect(imp[0]).to.have.property('banner').to.have.property('format').to.be.an('array');
      });

      it('should respect the publisher-provided pos for the banner impression', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('banner').to.have.property('pos');
        expect(imp[0]).to.have.property('banner').to.have.property('pos').equal(1);
      });

      it('should default pos to 0 if not explicitly provided by the publisher', () => {
        delete bidderRequest.bids[0].mediaTypes.banner.pos;
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('banner').to.have.property('pos');
        expect(imp[0]).to.have.property('banner').to.have.property('pos').equal(0);
      });

	  	if (FEATURES.VIDEO) {
        describe('VIDEO', () => {
          beforeEach(() => {
            utilsLogWarnMock = sinon.stub(utils, 'logWarn');
            videoBidderRequest = utils.deepClone(bidderRequest);
            delete videoBidderRequest.bids[0].mediaTypes.banner;
            videoBidderRequest.bids[0].mediaTypes.video = {
              skip: 1,
              mimes: ['video/mp4', 'video/x-flv'],
              minduration: 5,
              maxduration: 30,
              startdelay: 5,
              playbackmethod: [1, 3],
              api: [1, 2],
              protocols: [2, 3],
              battr: [13, 14],
              linearity: 1,
              placement: 2,
              plcmt: 1,
              minbitrate: 10,
              maxbitrate: 10,
              playerSize: [640, 480]
            }
          });

          afterEach(() => {
            utilsLogWarnMock.restore();
          })

          it('should generate request with mediatype video', () => {
            const request = spec.buildRequests(validBidRequests, videoBidderRequest);
            const { imp } = request?.data;
            expect(imp).to.be.an('array');
            expect(imp[0]).to.have.property('video');
          });

          it('should log a warning if playerSize is missing', () => {
            delete videoBidderRequest.bids[0].mediaTypes.video.playerSize;
            const request = spec.buildRequests(validBidRequests, videoBidderRequest);
            sinon.assert.called(utils.logWarn);
          });

          it('should log a warning if plcmt is missing', () => {
            delete videoBidderRequest.bids[0].mediaTypes.video.plcmt;
            const request = spec.buildRequests(validBidRequests, videoBidderRequest);
            const { imp } = request?.data;
            expect(imp).to.be.an('array');
            sinon.assert.called(utils.logWarn);
            expect(imp.video).to.be.undefined;
          });

          it('should have all supporting parameters', () => {
            const request = spec.buildRequests(validBidRequests, videoBidderRequest);
            const { imp } = request?.data;
            expect(imp).to.be.an('array');
            expect(imp[0]).to.have.property('video');
            expect(imp[0]).to.have.property('video').to.have.property('mimes');
            expect(imp[0]).to.have.property('video').to.have.property('minbitrate');
            expect(imp[0]).to.have.property('video').to.have.property('maxbitrate');
            expect(imp[0]).to.have.property('video').to.have.property('minduration');
            expect(imp[0]).to.have.property('video').to.have.property('maxduration');
            expect(imp[0]).to.have.property('video').to.have.property('plcmt');
            expect(imp[0]).to.have.property('video').to.have.property('battr');
            expect(imp[0]).to.have.property('video').to.have.property('startdelay');
            expect(imp[0]).to.have.property('video').to.have.property('playbackmethod');
            expect(imp[0]).to.have.property('video').to.have.property('api');
            expect(imp[0]).to.have.property('video').to.have.property('protocols');
            expect(imp[0]).to.have.property('video').to.have.property('linearity');
            expect(imp[0]).to.have.property('video').to.have.property('placement');
            expect(imp[0]).to.have.property('video').to.have.property('skip');
            expect(imp[0]).to.have.property('video').to.have.property('w');
            expect(imp[0]).to.have.property('video').to.have.property('h');
          });
        });
	  	}
	  	if (FEATURES.NATIVE) {
        describe('NATIVE', () => {
          beforeEach(() => {
            utilsLogWarnMock = sinon.stub(utils, 'logWarn');
            nativeBidderRequest = utils.deepClone(bidderRequest);
            delete nativeBidderRequest.bids[0].mediaTypes.banner;
            nativeBidderRequest.bids[0].nativeOrtbRequest = {
              ver: '1.2',
              assets: [{
                id: 0,
                img: {
                  'type': 3,
                  'w': 300,
                  'h': 250
                },
                required: 1,
              }]
            };
            nativeBidderRequest.bids[0].mediaTypes.native = {
              title: {
                required: true,
                length: 80
              },
              image: {
                required: true,
                sizes: [300, 250]
              },
              sponsoredBy: {
                required: true
              }
            }
          });

          afterEach(() => {
            utilsLogWarnMock.restore();
          })

          it('should generate request with mediatype native', () => {
            const request = spec.buildRequests(validBidRequests, nativeBidderRequest);
            const { imp } = request?.data;
            expect(imp).to.be.an('array');
            expect(imp[0]).to.have.property('native');
          });
        });
	 		}
      //   describe('MULTIFORMAT', () => {
      //     let multiFormatBidderRequest;
      //     it('should have both banner & video impressions', () => {
      //       multiFormatBidderRequest = utils.deepClone(bidderRequest);
      //       multiFormatBidderRequest.bids[0].mediaTypes.video = {
      //         skip: 1,
      //         mimes: ['video/mp4', 'video/x-flv'],
      //         minduration: 5,
      //         maxduration: 30,
      //         startdelay: 5,
      //         playbackmethod: [1, 3],
      //         api: [1, 2],
      //         protocols: [2, 3],
      //         battr: [13, 14],
      //         linearity: 1,
      //         placement: 2,
      //         plcmt: 1,
      //         minbitrate: 10,
      //         maxbitrate: 10,
      //         playerSize: [640, 480]
      //       }
      //       const request = spec.buildRequests(validBidRequests, multiFormatBidderRequest);
      //       const { imp } = request?.data;
      //       expect(imp).to.be.an('array');
      //       expect(imp[0]).to.have.property('banner');
      //       expect(imp[0].banner).to.have.property('topframe');
      //       expect(imp[0].banner).to.have.property('format');
      //       expect(imp[0]).to.have.property('video');
      //     });

    //     it('should have both banner & native impressions', () => {
    //       multiFormatBidderRequest = utils.deepClone(bidderRequest);
    //       multiFormatBidderRequest.bids[0].nativeOrtbRequest = {
    //         ver: '1.2',
    //         assets: [{
    //           id: 0,
    //           img: {
    //             'type': 3,
    //             'w': 300,
    //             'h': 250
    //           },
    //           required: 1,
    //         }]
    //       };
    //       const request = spec.buildRequests(validBidRequests, multiFormatBidderRequest);
    //       const { imp } = request?.data;
    //       expect(imp).to.be.an('array');
    //       expect(imp[0]).to.have.property('banner');
    //       expect(imp[0].banner).to.have.property('topframe');
    //       expect(imp[0].banner).to.have.property('format');
    //       expect(imp[0]).to.have.property('native');
    //     });
    //   });
    });

    describe('rest of ORTB request', () => {
      describe('BCAT', () => {
        it('should contain only string values', () => {
          validBidRequests[0].params.bcat = [1, 2, 3, 'IAB1', 'IAB2'];
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('bcat');
          expect(request.data).to.have.property('bcat').to.deep.equal(['IAB1', 'IAB2']);
        });

        it('should contain string values with length greater than 3', function() {
          validBidRequests[0].params.bcat = ['AB', 'CD', 'IAB1', 'IAB2'];
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('bcat');
          expect(request.data).to.have.property('bcat').to.deep.equal(['IAB1', 'IAB2']);
        });

        it('should trim strings', function() {
          validBidRequests[0].params.bcat = ['   IAB1    ', '   IAB2   '];
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('bcat');
          expect(request.data).to.have.property('bcat').to.deep.equal(['IAB1', 'IAB2']);
        });

        it('should pass unique strings', function() {
          validBidRequests[0].params.bcat = ['IAB1', 'IAB2', 'IAB1', 'IAB2', 'IAB1', 'IAB2'];
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('bcat');
          expect(request.data).to.have.property('bcat').to.deep.equal(['IAB1', 'IAB2']);
        });

        it('should fail if validations are not met', function() {
          validBidRequests[0].params.bcat = ['', 'IA', 'IB'];
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.not.have.property('bcat');
        });
      });

      describe('ACAT', () => {
        it('should contain only string values', () => {
          validBidRequests[0].params.acat = [1, 2, 3, 'IAB1', 'IAB2'];
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('acat');
          expect(request.data).to.have.property('acat').to.deep.equal(['IAB1', 'IAB2']);
        });

        it('should trim strings', () => {
          validBidRequests[0].params.acat = ['   IAB1    ', '   IAB2   '];
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('acat');
          expect(request.data).to.have.property('acat').to.deep.equal(['IAB1', 'IAB2']);
        });

        it('should pass unique strings', () => {
          validBidRequests[0].params.acat = ['IAB1', 'IAB2', 'IAB1', 'IAB2', 'IAB1', 'IAB2'];
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('acat');
          expect(request.data).to.have.property('acat').to.deep.equal(['IAB1', 'IAB2']);
        });

        it('should fail if validations are not met', () => {
          validBidRequests[0].params.acat = ['', 'IA', 'IB'];
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('acat');
        });
      });

      describe('TMAX, ID, AT, CUR, EXT', () => {
        it('should have tmax', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('tmax').to.equal(2000);
        });

        it('should remove test if pubmaticTest is not set', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('test').to.equal(undefined);
        });

        it('should have id', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('id');
        });

        it('should set at to 1', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('at').to.equal(1);
        });

        it('should have cur', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('cur').to.be.an('array').to.have.lengthOf(1);
          expect(request.data).to.have.property('cur').to.include.members(['USD']);
        });

        it('should have ext', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('ext').to.have.property('epoch');
          expect(request.data).to.have.property('ext').to.have.property('wrapper');
          expect(request.data).to.have.property('ext').to.have.property('wrapper').to.have.property('profile');
          expect(request.data).to.have.property('ext').to.have.property('wrapper').to.have.property('wiid');
          expect(request.data).to.have.property('ext').to.have.property('wrapper').to.have.property('wv');
          expect(request.data).to.have.property('ext').to.have.property('wrapper').to.have.property('wp');
        });

        it('should have url with post method', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request).to.have.property('method').to.equal('POST');
          expect(request).to.have.property('url').to.equal('https://hbopenbid.pubmatic.com/translator?source=prebid-client');
        });
      });

      describe('GROUPM', () => {
        let bidderSettingStub;
        beforeEach(() => {
          bidderSettingStub = sinon.stub(bidderSettings, 'get');
        });

        afterEach(() => {
          bidderSettingStub.restore();
        });

        it('should skip setting the marketplace object in extension if allowAlternateBidderCodes is not defined', () => {
          bidderSettingStub.returns(undefined);
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('ext').to.not.have.property('marketplace');
        });

        it('should set the marketplace object in the extension when allowAlternateBidderCodes is set to "groupm"', () => {
          bidderSettingStub.withArgs('pubmatic', 'allowAlternateBidderCodes').returns(true);
          bidderSettingStub.withArgs('pubmatic', 'allowedAlternateBidderCodes').returns(['groupm']);
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('ext').to.have.property('marketplace');
          expect(request.data).to.have.property('ext').to.have.property('marketplace').to.have.property('allowedbidders').to.be.an('array');
          expect(request.data.ext.marketplace.allowedbidders.length).to.equal(2);
          expect(request.data.ext.marketplace.allowedbidders[0]).to.equal('pubmatic');
          expect(request.data.ext.marketplace.allowedbidders[1]).to.equal('groupm');
        });

        it('should be ALL when allowedAlternateBidderCodes is \'*\'', () => {
          bidderSettingStub.withArgs('pubmatic', 'allowAlternateBidderCodes').returns(true);
          bidderSettingStub.withArgs('pubmatic', 'allowedAlternateBidderCodes').returns(['*']);
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data.ext.marketplace.allowedbidders).to.be.an('array');
          expect(request.data.ext.marketplace.allowedbidders[0]).to.equal('all');
        });
      });

      describe('SITE', () => {
        it('should have site object', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('site');
        });

        it('should have site object with page, domain', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('site').to.have.property('page').to.equal('https://ebay.com');
          expect(request.data).to.have.property('site').to.have.property('domain').to.equal('ebay.com');
        });
      });

      describe('DEVICE', () => {
        it('should have device object', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('device');
          expect(request.data.device).to.have.property('w').to.equal(1200);
          expect(request.data.device).to.have.property('h').to.equal(1800);
          expect(request.data.device).to.have.property('js').to.equal(1);
          expect(request.data.device).to.have.property('connectiontype');
          expect(request.data.device).to.have.property('language').to.equal('en');
        });
      });

      describe('CONFIG/BADV', () => {
        let copiedBidderRequest;
        beforeEach(() => {
          copiedBidderRequest = utils.deepClone(bidderRequest);
          copiedBidderRequest.ortb2.app = {
            id: 'app-id',
            name: 'app-name',
          };
          copiedBidderRequest.ortb2.site.ext = {
            id: 'site-id',
            name: 'site-name',
          }
          copiedBidderRequest.ortb2.badv = ['example.com'];
        });

        it('should have app if it is set in ortb2', () => {
          const request = spec.buildRequests(validBidRequests, copiedBidderRequest);
          expect(request.data).to.have.property('app');
        });

        it('should include app if it is defined in ortb2 but not site', () => {
          const request = spec.buildRequests(validBidRequests, copiedBidderRequest);
          expect(request.data).to.have.property('app');
          expect(request.data).to.not.have.property('site');
        });

        it('should have badv if it is set in ortb2', () => {
          const request = spec.buildRequests(validBidRequests, copiedBidderRequest);
          expect(request.data).to.have.property('badv');
          expect(request.data.badv).to.deep.equal(['example.com']);
        });
      });

      describe('AUCTION ID', () => {
        it('should use auctionId as wiid when it is not provided in params', () => {
          const copiedValidBidRequests = utils.deepClone(validBidRequests);
          delete copiedValidBidRequests[0].params.wiid;
          const request = spec.buildRequests(copiedValidBidRequests, bidderRequest);
          expect(request.data).to.have.property('ext');
          expect(request.data.ext).to.have.property('wrapper');
          expect(request.data.ext.wrapper).to.have.property('wiid');
          expect(request.data.ext.wrapper.wiid).to.equal('ee3074fe-97ce-4681-9235-d7622aede74c');
        });

        it('should use auctionId as wiid from params', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('ext');
          expect(request.data.ext).to.have.property('wrapper');
          expect(request.data.ext.wrapper).to.have.property('wiid');
          expect(request.data.ext.wrapper.wiid).to.equal('1234567890');
        });
      });

      describe('GDPR', () => {
        let copiedBidderRequest;
        beforeEach(() => {
          copiedBidderRequest = utils.deepClone(bidderRequest);
          copiedBidderRequest.ortb2.user = {
            ext: {
              consent: 'kjfdniwjnifwenrif3'
            }
          }
        });

        it('should have GDPR string', () => {
          const request = spec.buildRequests(validBidRequests, copiedBidderRequest);
          expect(request.data).to.have.property('user');
          expect(request.data.user).to.have.property('ext');
          expect(request.data.user.ext).to.have.property('consent').to.equal('kjfdniwjnifwenrif3');
        });
      });

      describe('GPP', () => {
        it('should have gpp & gpp_sid in request if set using ortb2 and not present in request', () => {
          let copiedBidderRequest = utils.deepClone(bidderRequest);
          copiedBidderRequest.ortb2.regs = {
            gpp: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN',
            gpp_sid: [5]
          }
          const request = spec.buildRequests(validBidRequests, copiedBidderRequest);
          expect(request.data).to.have.property('regs');
          expect(request.data.regs).to.have.property('gpp').to.equal('DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN');
          expect(request.data.regs).to.have.property('gpp_sid').that.eql([5]);
        });
      });

      describe('DSA', () => {
        const dsa = {
          dsarequired: 3,
          pubrender: 0,
          datatopub: 2,
          transparency: [
    			  {
              domain: 'platform1domain.com',
              dsaparams: [1]
    			  },
    			  {
              domain: 'SSP2domain.com',
              dsaparams: [1, 2]
    			  }
          ]
        };
        beforeEach(() => {
          bidderRequest.ortb2.regs = {ext: { dsa }};
        });

        it('should have DSA in regs.ext', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('regs');
          expect(request.data.regs).to.have.property('ext');
          expect(request.data.regs.ext).to.have.property('dsa').to.deep.equal(dsa);
        });
      });

      describe('ORTB2IMP', () => {
        it('should send gpid if specified', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('imp');
          expect(request.data.imp[0]).to.have.property('ext');
          expect(request.data.imp[0].ext).to.have.property('gpid');
          expect(request.data.imp[0].ext.gpid).to.equal('/1111/homepage-leftnav');
        });

        it('should send pbadslot if specified', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('imp');
          expect(request.data.imp[0]).to.have.property('ext');
          expect(request.data.imp[0].ext).to.have.property('data');
          expect(request.data.imp[0].ext.data).to.have.property('pbadslot');
          expect(request.data.imp[0].ext.data.pbadslot).to.equal('/1111/homepage-leftnav');
        });

        it('should send adserver if specified', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('imp');
          expect(request.data.imp[0]).to.have.property('ext');
          expect(request.data.imp[0].ext).to.have.property('data');
          expect(request.data.imp[0].ext.data).to.have.property('adserver');
          expect(request.data.imp[0].ext.data.adserver).to.have.property('name');
          expect(request.data.imp[0].ext.data.adserver.name).to.equal('gam');
          expect(request.data.imp[0].ext.data.adserver).to.have.property('adslot');
          expect(request.data.imp[0].ext.data.adserver.adslot).to.equal('/1111/homepage-leftnav');
        });

        it('should send custom data if specified', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('imp');
          expect(request.data.imp[0]).to.have.property('ext');
          expect(request.data.imp[0].ext).to.have.property('data');
          expect(request.data.imp[0].ext.data).to.have.property('customData');
          expect(request.data.imp[0].ext.data.customData).to.have.property('id').to.equal('id-1');
        });
      });

      describe('FLEDGE', () => {
        it('should not send imp.ext.ae when FLEDGE is disabled, ', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request.data).to.have.property('imp');
          expect(request.data.imp).to.be.an('array');
          expect(request.data.imp[0]).to.have.property('ext');
          expect(request.data.imp[0].ext).to.not.have.property('ae');
        });
      })

      describe('cpm adjustment', () => {
        beforeEach(() => {
          global.cpmAdjustment = {};
        });

        it('should not perform any action if the bid is undefined', () => {
          spec.onBidWon(undefined);
          expect(global.cpmAdjustment).to.deep.equal({});
        });

        it('should not perform any action if the bid is null', () => {
          spec.onBidWon(null);
          expect(global.cpmAdjustment).to.deep.equal({});
        });
        it('should invoke _calculateBidCpmAdjustment and correctly update cpmAdjustment', () => {
          const bid = {
            cpm: 2.5,
            originalCpm: 3,
            originalCurrency: 'USD',
            currency: 'USD',
            mediaType: 'banner',
            meta: { mediaType: 'banner' }
          };

          spec.onBidWon(bid);

          expect(cpmAdjustment).to.deep.equal({
            currency: 'USD',
            originalCurrency: 'USD',
            adjustment: [
              {
                cpmAdjustment: Number(((3 - 2.5) / 3).toFixed(2)), // Expected: 0.17
                mediaType: 'banner',
                metaMediaType: 'banner',
                cpm: 2.5,
                originalCpm: 3
              }
            ]
          });
        });
      });

      // describe('USER ID/ EIDS', () => {
      // 	let copiedBidderRequest;
      // 	beforeEach(() => {
      // 		copiedBidderRequest = utils.deepClone(bidderRequest);
      // 		copiedBidderRequest.bids[0].userId = {
      // 			id5id : {
      // 				uid: 'id5id-xyz-user-id'
      // 			}
      // 		}
      // 		copiedBidderRequest.bids[0].userIdAsEids = [{
      // 			source: 'id5-sync.com',
      // 			uids: [{
      // 				'id': "ID5*G3_osFE_-UHoUjSuA4T8-f51U-JTNOoGcb2aMpx1APnDy8pDwkKCzXCcoSb1HXIIw9AjWBOWmZ3QbMUDTXKq8MPPW8h0II9mBYkP4F_IXkvD-XG64NuFFDPKvez1YGGx",
      // 				'atype': 1,
      // 				'ext': {
      // 					'linkType': 2,
      // 					'pba': 'q6Vzr0jEebxzmvS8aSrVQJFoJnOxs9gKBKCOLw1y6ew='
      // 				}
      // 			}]
      // 		}]
      // 	});

      // 	it('should send gpid if specified', () => {
      // 		const request = spec.buildRequests(validBidRequests, copiedBidderRequest);
      // 		expect(request.data).to.have.property('user');
      // 		expect(request.data.user).to.have.property('eids');
      // 	});
      // });
    });
  });

  describe('Response', () => {
    it('should return response in prebid format', () => {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const bidResponse = spec.interpretResponse(response, request);
      expect(bidResponse).to.be.an('array');
      expect(bidResponse[0]).to.be.an('object');
      expect(bidResponse[0]).to.have.property('ad');
      expect(bidResponse[0]).to.have.property('dealId');
      expect(bidResponse[0]).to.have.property('dealChannel');
      expect(bidResponse[0]).to.have.property('currency');
      expect(bidResponse[0]).to.have.property('meta');
      expect(bidResponse[0]).to.have.property('mediaType');
      expect(bidResponse[0]).to.have.property('referrer');
      expect(bidResponse[0]).to.have.property('cpm');
      expect(bidResponse[0]).to.have.property('pm_seat');
      expect(bidResponse[0]).to.have.property('pm_dspid');
      expect(bidResponse[0]).to.have.property('sspID');
      expect(bidResponse[0]).to.have.property('partnerImpId');
      expect(bidResponse[0]).to.have.property('requestId');
      expect(bidResponse[0]).to.have.property('width');
      expect(bidResponse[0]).to.have.property('height');
      expect(bidResponse[0]).to.have.property('ttl');
      expect(bidResponse[0]).to.have.property('netRevenue');
      expect(bidResponse[0]).to.have.property('creativeId');
    });

    it('should return response and match with input values', () => {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const bidResponse = spec.interpretResponse(response, request);
      expect(bidResponse).to.be.an('array');
      expect(bidResponse[0]).to.be.an('object');
      expect(bidResponse[0]).to.have.property('currency').to.be.equal('USD');
      expect(bidResponse[0]).to.have.property('dealId').to.equal('PUBDEAL1');
      expect(bidResponse[0]).to.have.property('dealChannel').to.equal('PMPG');
      expect(bidResponse[0]).to.have.property('meta').to.be.an('object');
      expect(bidResponse[0]).to.have.property('mediaType').to.equal('banner');
      expect(bidResponse[0]).to.have.property('cpm').to.equal(1.3);
      expect(bidResponse[0]).to.have.property('pm_seat').to.equal('seat-id');
      expect(bidResponse[0]).to.have.property('pm_dspid').to.equal(123);
      expect(bidResponse[0]).to.have.property('sspID').to.equal('74858439-49D7-4169-BA5D-44A046315B2F');
      expect(bidResponse[0]).to.have.property('requestId').to.equal('3736271c3c4b27');
      expect(bidResponse[0]).to.have.property('width').to.equal(300);
      expect(bidResponse[0]).to.have.property('height').to.equal(250);
      expect(bidResponse[0]).to.have.property('ttl').to.equal(360);
    });

    describe('DEALID', () => {
      it('should set deal_channel to PMP if ext.deal_channel is missing', () => {
        const copiedResponse = utils.deepClone(response);
        delete copiedResponse.body.seatbid[0].bid[0].ext.deal_channel;
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const bidResponse = spec.interpretResponse(copiedResponse, request);
        expect(bidResponse).to.be.an('array');
        expect(bidResponse[0]).to.be.an('object');
        expect(bidResponse[0]).to.have.property('dealChannel').to.equal('PMP');
      });

      it('should exclude deal_id and deal_channel from the response if the deal id is missing', () => {
        const copiedResponse = utils.deepClone(response);
        delete copiedResponse.body.seatbid[0].bid[0].ext.deal_channel;
        delete copiedResponse.body.seatbid[0].bid[0].dealid;
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const bidResponse = spec.interpretResponse(copiedResponse, request);
        expect(bidResponse).to.be.an('array');
        expect(bidResponse[0]).to.be.an('object');
        expect(bidResponse[0]).to.not.have.property('dealId');
        expect(bidResponse[0]).to.not.have.property('dealChannel');
      });
    });
    if (FEATURES.VIDEO) {
      describe('VIDEO', () => {
        beforeEach(() => {
          let videoBidderRequest = utils.deepClone(bidderRequest);
          delete videoBidderRequest.bids[0].mediaTypes.banner;
          videoBidderRequest.bids[0].mediaTypes.video = {
            skip: 1,
            mimes: ['video/mp4', 'video/x-flv'],
            minduration: 5,
            maxduration: 30,
            startdelay: 5,
            playbackmethod: [1, 3],
            api: [1, 2],
            protocols: [2, 3],
            battr: [13, 14],
            linearity: 1,
            placement: 2,
            plcmt: 1,
            context: 'outstream',
            minbitrate: 10,
            maxbitrate: 10,
            playerSize: [640, 480]
          }
        });

        it('should generate video response', () => {
          const request = spec.buildRequests(validBidRequests, videoBidderRequest);
          const { imp } = request?.data;
          expect(imp).to.be.an('array');
          expect(imp[0]).to.have.property('video');
          const bidResponse = spec.interpretResponse(videoResponse, request);
          expect(bidResponse).to.be.an('array');
          expect(bidResponse[0]).to.be.an('object');
          expect(bidResponse[0]).to.have.property('vastXml');
          expect(bidResponse[0]).to.have.property('mediaType');
          expect(bidResponse[0]).to.have.property('playerHeight');
          expect(bidResponse[0]).to.have.property('playerWidth');
        });

        it('should generate video response with input values', () => {
          const request = spec.buildRequests(validBidRequests, videoBidderRequest);
          const { imp } = request?.data;
          expect(imp).to.be.an('array');
          expect(imp[0]).to.have.property('video');
          const bidResponse = spec.interpretResponse(videoResponse, request);
          expect(bidResponse).to.be.an('array');
          expect(bidResponse[0]).to.be.an('object');
          expect(bidResponse[0]).to.have.property('mediaType').to.equal('video');
          expect(bidResponse[0]).to.have.property('playerHeight').to.equal(480);
          expect(bidResponse[0]).to.have.property('playerWidth').to.equal(640);
        });
      });
    }
  })
})
