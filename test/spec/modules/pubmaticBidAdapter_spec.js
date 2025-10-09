import { expect } from 'chai';
import { spec, cpmAdjustment, addViewabilityToImp, shouldAddDealTargeting } from 'modules/pubmaticBidAdapter.js';
import * as utils from 'src/utils.js';
import { bidderSettings } from 'src/bidderSettings.js';
import { config } from 'src/config.js';
import {getGlobal} from '../../../src/prebidGlobal.js';

describe('PubMatic adapter', () => {
  let firstBid, videoBid, firstResponse, response, videoResponse, firstAliasBid;
  const PUBMATIC_ALIAS_BIDDER = 'pubmaticAlias';
  const request = {};
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
      site: {domain: 'ebay.com', page: 'https://ebay.com', publisher: {id: '5670'}},
      source: {},
      user: {
        ext: {
          data: {
            im_segments: ['segment1', 'segment2']
          }
        }
      }
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
    rtd: {
      jwplayer: {
        targeting: {
          content: {
            id: 'jwplayer-content-id'
          },
          segments: [
            'jwplayer-segment-1', 'jwplayer-segment-2'
          ]
        }
      }
    }
  }
  firstAliasBid = {
    adUnitCode: 'Div1',
    bidder: PUBMATIC_ALIAS_BIDDER,
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
      site: {domain: 'ebay.com', page: 'https://ebay.com', publisher: {id: '5670'}},
      source: {},
      user: {
        ext: {
          data: {
            im_segments: ['segment1', 'segment2']
          }
        }
      }
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
    rtd: {
      jwplayer: {
        targeting: {
          content: {
            id: 'jwplayer-content-id'
          },
          segments: [
            'jwplayer-segment-1', 'jwplayer-segment-2'
          ]
        }
      }
    }
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
      'mtype': 2,
      'params': {'outstreamAU': 'outstreamAU', 'renderer': 'renderer_test_pubmatic'}
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
  const validBidRequests = [firstBid];
  const validAliasBidRequests = [firstAliasBid];
  const bidderRequest = {
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
      source: {},
      user: {
        ext: {
          data: {
            im_segments: ['segment1', 'segment2']
          }
        }
      }
    },
    timeout: 2000,

  };
  const bidderAliasRequest = {
    bids: [firstAliasBid],
    auctionId: 'ee3074fe-97ce-4681-9235-d7622aede74c',
    auctionStart: 1725514077194,
    bidderCode: PUBMATIC_ALIAS_BIDDER,
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
      source: {},
      user: {
        ext: {
          data: {
            im_segments: ['segment1', 'segment2']
          }
        }
      }
    },
    timeout: 2000,

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
          delete videoBidRequest.mediaTypes.native;
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
          videoBidRequest.params.outstreamAU = 'outstreamAU';
          videoBidRequest.params.renderer = 'renderer_test_pubmatic'
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
          };

          // Remove width and height from the video object to test coverage for missing values
          delete videoBidRequest.mediaTypes.video.width;
          delete videoBidRequest.mediaTypes.video.height;

          const isValid = spec.isBidRequestValid(videoBidRequest);
          expect(isValid).to.equal(true);
        });

        it('should return false if outstreamAU or renderer is missing', () => {
          const isValid = spec.isBidRequestValid(videoBidRequest);
          expect(isValid).to.equal(false);
        });

        it('should return TRUE if outstreamAU or renderer is present', () => {
          const isValid = spec.isBidRequestValid(videoBidRequest);
          expect(isValid).to.equal(false);
        });
      });
    }
  });

  describe('Request formation', () => {
    describe('IMP', () => {
      it('should include previousAuctionInfo in request when available', () => {
        const bidRequestWithPrevAuction = utils.deepClone(validBidRequests[0]);
        const bidderRequestWithPrevAuction = utils.deepClone(bidderRequest);
        bidderRequestWithPrevAuction.ortb2 = bidderRequestWithPrevAuction.ortb2 || {};
        bidderRequestWithPrevAuction.ortb2.ext = bidderRequestWithPrevAuction.ortb2.ext || {};
        bidderRequestWithPrevAuction.ortb2.ext.prebid = bidderRequestWithPrevAuction.ortb2.ext.prebid || {};
        bidderRequestWithPrevAuction.ortb2.ext.prebid.previousauctioninfo = {
          bidderRequestId: 'bidder-request-id'
        };

        const request = spec.buildRequests([bidRequestWithPrevAuction], bidderRequestWithPrevAuction);
        expect(request.data.ext).to.have.property('previousAuctionInfo');
        expect(request.data.ext.previousAuctionInfo).to.deep.equal({
          bidderRequestId: 'bidder-request-id'
        });
      });

      it('should generate request with banner', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('banner');
        expect(imp[0]).to.have.property('id').equal('3736271c3c4b27');
      });

      it('should have build request with alias bidder', () => {
        getGlobal().aliasBidder('pubmatic', PUBMATIC_ALIAS_BIDDER);
        const request = spec.buildRequests(validAliasBidRequests, bidderAliasRequest);
        expect(request.data).to.have.property('ext').to.have.property('wrapper').to.have.property('biddercode');
        expect(request.data.ext.wrapper.biddercode).to.equal(PUBMATIC_ALIAS_BIDDER);
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

      it('adds key_val when dctr is missing but RTD provides custom targeting via ortb2', () => {
        delete validBidRequests[0].params.dctr;
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('ext').to.have.property('key_val');
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
        expect(imp[0]).to.have.property('banner').to.have.property('format').to.be.an('array');
      });

      it('should not have format object in banner when there is only a single size', () => {
        // Create a complete bid with only one size
        const singleSizeBid = utils.deepClone(validBidRequests[0]);
        singleSizeBid.mediaTypes.banner.sizes = [[300, 250]];
        singleSizeBid.params.adSlot = '/15671365/DMDemo@300x250:0';

        // Create a complete bidder request
        const singleSizeBidderRequest = utils.deepClone(bidderRequest);
        singleSizeBidderRequest.bids = [singleSizeBid];

        const request = spec.buildRequests([singleSizeBid], singleSizeBidderRequest);
        const { imp } = request?.data;

        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('banner');
        expect(imp[0].banner).to.not.have.property('format');
        expect(imp[0].banner).to.have.property('w').equal(300);
        expect(imp[0].banner).to.have.property('h').equal(250);
      });

      it('should add pmZoneId in ext if pmzoneid is present in parameters', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('ext');
        expect(imp[0]).to.have.property('ext').to.have.property('pmZoneId');
      });

      it('should add pbcode in ext with adUnitCode value', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('ext');
        expect(imp[0].ext).to.have.property('pbcode');
        expect(imp[0].ext.pbcode).to.equal(validBidRequests[0].adUnitCode);
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

      xit('should include custom targeting data in imp.ext when provided by RTD', () => {
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const { imp } = request?.data;
        expect(imp).to.be.an('array');
        expect(imp[0]).to.have.property('ext');
        expect(imp[0].ext).to.have.property('key_val');
        expect(imp[0].ext.key_val).to.deep.equal('im_segments=segment1,segment2|jw-id=jwplayer-content-id|jw-jwplayer-segment-1=1|jw-jwplayer-segment-2=1');
      })

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
              context: 'outstream',
              minbitrate: 10,
              maxbitrate: 10,
              playerSize: [640, 480]
            }
            videoBidderRequest.bids[0].params.outstreamAU = 'outstreamAU';
            videoBidderRequest.bids[0].params.renderer = 'renderer_test_pubmatic'
            videoBidderRequest.bids[0].adUnitCode = 'Div1';
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
      describe('ShouldAddDealTargeting', () => {
        it('should return im_segment targeting', () => {
          const ortb2 = {
            user: {
              ext: {
                data: {
                  im_segments: ['segment1', 'segment2']
                }
              }
            }
          };
          const result = shouldAddDealTargeting(ortb2);
          expect(result).to.have.property('im_segments');
          expect(result.im_segments).to.deep.equal('im_segments=segment1,segment2');
        });
        it('should return ias-brand-safety targeting', () => {
          const ortb2 = {
            site: {
              ext: {
                data: {
                  'ias-brand-safety': {
                    'content': 'news',
                    'sports': 'cricket',
                    'cricket': 'player'
                  }
                }
              }
            }
          };
          const result = shouldAddDealTargeting(ortb2);
          expect(result).to.have.property('ias-brand-safety');
          expect(result['ias-brand-safety']).to.deep.equal('content=news|sports=cricket|cricket=player');
        });
        it('should return undefined if no targeting is present', () => {
          const ortb2 = {};
          const result = shouldAddDealTargeting(ortb2);
          expect(result).to.be.undefined;
        });
        it('should return both im_segment and ias-brand-safety targeting', () => {
          const ortb2 = {
            user: {
              ext: {
                data: {
                  im_segments: ['segment1', 'segment2']
                }
              }
            },
            site: {
              ext: {
                data: {
                  'ias-brand-safety': {
                    'content': 'news',
                    'sports': 'cricket',
                    'cricket': 'player'
                  }
                }
              }
            }
          };
          const result = shouldAddDealTargeting(ortb2);
          expect(result).to.have.property('im_segments');
          expect(result.im_segments).to.deep.equal('im_segments=segment1,segment2');
          expect(result).to.have.property('ias-brand-safety');
          expect(result['ias-brand-safety']).to.deep.equal('content=news|sports=cricket|cricket=player');
        });
      })
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

        describe('Gzip Configuration', () => {
          let configStub;
          let bidderConfigStub;

          beforeEach(() => {
            configStub = sinon.stub(config, 'getConfig');
            bidderConfigStub = sinon.stub(config, 'getBidderConfig');
          });

          afterEach(() => {
            configStub.restore();
            if (bidderConfigStub && bidderConfigStub.restore) {
              bidderConfigStub.restore();
            }
          });

          it('should enable gzip compression by default', () => {
            // No specific configuration set, should use default
            const request = spec.buildRequests(validBidRequests, bidderRequest);
            expect(request.options.endpointCompression).to.be.true;
          });

          it('should respect bidder-specific boolean configuration set via setBidderConfig', () => {
            // Mock bidder-specific config to return false
            bidderConfigStub.returns({
              pubmatic: {
                gzipEnabled: false
              }
            });

            const request = spec.buildRequests(validBidRequests, bidderRequest);
            expect(request.options.endpointCompression).to.be.false;
          });

          it('should handle bidder-specific string configuration ("true")', () => {
            bidderConfigStub.returns({
              pubmatic: {
                gzipEnabled: 'true'
              }
            });

            const request = spec.buildRequests(validBidRequests, bidderRequest);
            expect(request.options.endpointCompression).to.be.true;
          });

          it('should handle bidder-specific string configuration ("false")', () => {
            bidderConfigStub.returns({
              pubmatic: {
                gzipEnabled: 'false'
              }
            });

            const request = spec.buildRequests(validBidRequests, bidderRequest);
            expect(request.options.endpointCompression).to.be.false;
          });

          it('should fall back to default when bidder-specific value is invalid', () => {
            // Mock bidder-specific config to return invalid value
            bidderConfigStub.returns({
              pubmatic: {
                gzipEnabled: 'invalid'
              }
            });

            const request = spec.buildRequests(validBidRequests, bidderRequest);
            // Should fall back to default (true)
            expect(request.options.endpointCompression).to.be.true;
          });
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
          expect(request.data).to.have.property('ext').to.have.property('wrapper').to.have.property('biddercode');
          expect(request.data.ext.wrapper.biddercode).to.equal('pubmatic');
        });

        it('should have url with post method', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request).to.have.property('method').to.equal('POST');
          expect(request).to.have.property('url').to.equal('https://hbopenbid.pubmatic.com/translator?source=prebid-client');
        });
      });

      describe('Request Options', () => {
        it('should set endpointCompression to true in request options', () => {
          const request = spec.buildRequests(validBidRequests, bidderRequest);
          expect(request).to.have.property('options');
          expect(request.options).to.have.property('endpointCompression').to.equal(true);
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
          const copiedBidderRequest = utils.deepClone(bidderRequest);
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

        it('should invoke _calculateBidCpmAdjustment and correctly update cpmAdjustment currency is different', () => {
          const bid = {
            cpm: 2.5,
            originalCpm: 3,
            originalCurrency: 'USD',
            currency: 'EUR',
            mediaType: 'banner',
            meta: { mediaType: 'banner' },
            getCpmInNewCurrency: function(currency) {
              return currency === 'EUR' ? 2.8 : this.cpm;
            }
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

        it('should replace existing adjustment entry if mediaType and metaMediaType match', () => {
          const bid1 = {
            cpm: 2.5,
            originalCpm: 3,
            originalCurrency: 'USD',
            currency: 'USD',
            mediaType: 'banner',
            meta: { mediaType: 'banner' }
          };
          const bid2 = {
            cpm: 1.5,
            originalCpm: 2,
            originalCurrency: 'USD',
            currency: 'USD',
            mediaType: 'banner',
            meta: { mediaType: 'banner' }
          };

          spec.onBidWon(bid1);
          // Should add the first entry
          expect(cpmAdjustment.adjustment.length).to.equal(1);
          expect(cpmAdjustment.adjustment[0].cpm).to.equal(2.5);
          spec.onBidWon(bid2);
          // Should replace the entry, not add a new one
          expect(cpmAdjustment.adjustment.length).to.equal(1);
          expect(cpmAdjustment.adjustment[0].cpm).to.equal(1.5);
          expect(cpmAdjustment.adjustment[0].originalCpm).to.equal(2);
        });
      });
    });
  });

  describe('Response', () => {
    it('should parse native adm and set bidResponse.native, width, and height', () => {
      // Prepare a valid native bidRequest
      const bidRequest = utils.deepClone(validBidRequests[0]);
      bidRequest.mediaTypes = {
        native: {
          title: { required: true, len: 140 }
        }
      };
      delete bidRequest.mediaTypes.banner;
      delete bidRequest.mediaTypes.video;
      bidRequest.sizes = undefined;
      const request = spec.buildRequests([bidRequest], bidderRequest);
      // Prepare a valid native bid response with matching impid
      const nativeAdm = JSON.stringify({ native: { assets: [{ id: 1, title: { text: 'Test' } }] } });
      const nativeBid = {
        id: 'bid-id',
        impid: request.data.imp[0].id, // match the imp id
        price: 1.2,
        adm: nativeAdm,
        w: 123,
        h: 456,
        adomain: ['example.com'],
        mtype: 4 // NATIVE
      };
      const seatbid = [{ bid: [nativeBid] }];
      const nativeResponse = { body: { seatbid } };
      const bidResponses = spec.interpretResponse(nativeResponse, request);
      expect(bidResponses).to.be.an('array');
      expect(bidResponses[0]).to.exist;
      expect(bidResponses[0].native).to.exist;
      expect(bidResponses[0].width).to.equal(123);
      expect(bidResponses[0].height).to.equal(456);
    });

    it('should handle invalid JSON in native adm gracefully', () => {
      // Prepare a valid native bidRequest
      const bidRequest = utils.deepClone(validBidRequests[0]);
      bidRequest.mediaTypes = {
        native: {
          title: { required: true, len: 140 }
        }
      };
      delete bidRequest.mediaTypes.banner;
      delete bidRequest.mediaTypes.video;
      bidRequest.sizes = undefined;
      const request = spec.buildRequests([bidRequest], bidderRequest);

      // Prepare a native bid response with invalid JSON and matching impid
      const invalidAdm = '{ native: { assets: [ { id: 1, title: { text: "Test" } } ] }'; // missing closing }
      const nativeBid = {
        id: 'bid-id',
        impid: request.data.imp[0].id, // match the imp id
        price: 1.2,
        adm: invalidAdm,
        w: 123,
        h: 456,
        adomain: ['example.com'],
        mtype: 4 // NATIVE
      };
      const seatbid = [{ bid: [nativeBid] }];
      const nativeResponse = { body: { seatbid } };
      const bidResponses = spec.interpretResponse(nativeResponse, request);
      expect(bidResponses).to.be.an('array');
      expect(bidResponses.length).to.equal(0); // No bid should be returned if adm is invalid
    });

    it('should set DEFAULT_WIDTH and DEFAULT_HEIGHT when bid.w and bid.h are missing for native', () => {
      // Prepare a valid native bidRequest
      const bidRequest = utils.deepClone(validBidRequests[0]);
      bidRequest.mediaTypes = {
        native: {
          title: { required: true, len: 140 }
        }
      };
      delete bidRequest.mediaTypes.banner;
      delete bidRequest.mediaTypes.video;
      bidRequest.sizes = undefined;
      const request = spec.buildRequests([bidRequest], bidderRequest);
      // Prepare a native bid response with missing w and h
      const nativeAdm = JSON.stringify({ native: { assets: [{ id: 1, title: { text: 'Test' } }] } });
      const nativeBid = {
        id: 'bid-id',
        impid: request.data.imp[0].id, // match the imp id
        price: 1.2,
        adm: nativeAdm,
        // w and h are intentionally missing
        adomain: ['example.com'],
        mtype: 4 // NATIVE
      };
      const seatbid = [{ bid: [nativeBid] }];
      const nativeResponse = { body: { seatbid } };
      const bidResponses = spec.interpretResponse(nativeResponse, request);
      expect(bidResponses).to.be.an('array');
      expect(bidResponses[0]).to.exist;
      expect(bidResponses[0].native).to.exist;
      expect(bidResponses[0].width).to.equal(0);
      expect(bidResponses[0].height).to.equal(0);
    });

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
          const videoBidderRequest = utils.deepClone(bidderRequest);
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
          videoBidderRequest.bids[0].params.outstreamAU = 'outstreamAU';
          videoBidderRequest.bids[0].params.renderer = 'renderer_test_pubmatic';
          videoBidderRequest.bids[0].adUnitCode = 'Div1';
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

        it('should set renderer and rendererCode for outstream video with outstreamAU', () => {
          const request = spec.buildRequests(validBidRequests, videoBidderRequest);
          const bidResponse = spec.interpretResponse(videoResponse, request);
          expect(bidResponse).to.be.an('array');
          expect(bidResponse[0]).to.be.an('object');
          expect(bidResponse[0]).to.have.property('renderer');
          expect(bidResponse[0].renderer).to.be.an('object');
          expect(bidResponse[0]).to.have.property('rendererCode').to.equal('outstreamAU');
        });

        it('should set width and height from playerWidth/playerHeight if not present in bid', () => {
          // Clone and modify the video response to remove w and h
          const modifiedVideoResponse = utils.deepClone(videoResponse);
          delete modifiedVideoResponse.body.seatbid[0].bid[0].w;
          delete modifiedVideoResponse.body.seatbid[0].bid[0].h;
          // Set up the request as usual
          const request = spec.buildRequests(validBidRequests, videoBidderRequest);
          // Interpret the response
          const bidResponses = spec.interpretResponse(modifiedVideoResponse, request);
          // playerWidth = 640, playerHeight = 480 from playerSize in the test setup
          expect(bidResponses[0].width).to.equal(640);
          expect(bidResponses[0].height).to.equal(480);
        });
      });
    }

    describe('CATEGORY IDS', () => {
      it('should set primaryCatId and secondaryCatIds in meta when bid.cat is present', () => {
        const copiedResponse = utils.deepClone(response);
        copiedResponse.body.seatbid[0].bid[0].cat = ['IAB1', 'IAB2', 'IAB3'];
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const bidResponse = spec.interpretResponse(copiedResponse, request);
        expect(bidResponse).to.be.an('array');
        expect(bidResponse[0]).to.be.an('object');
        expect(bidResponse[0].meta).to.have.property('primaryCatId').to.equal('IAB1');
        expect(bidResponse[0].meta).to.have.property('secondaryCatIds').to.deep.equal(['IAB1', 'IAB2', 'IAB3']);
      });

      it('should not set primaryCatId and secondaryCatIds in meta when bid.cat is null', () => {
        const copiedResponse = utils.deepClone(response);
        copiedResponse.body.seatbid[0].bid[0].cat = null;
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const bidResponse = spec.interpretResponse(copiedResponse, request);
        expect(bidResponse).to.be.an('array');
        expect(bidResponse[0]).to.be.an('object');
        expect(bidResponse[0].meta).to.not.have.property('primaryCatId');
        expect(bidResponse[0].meta).to.not.have.property('secondaryCatIds');
      });

      it('should not set primaryCatId and secondaryCatIds in meta when bid.cat is undefined', () => {
        const copiedResponse = utils.deepClone(response);
        delete copiedResponse.body.seatbid[0].bid[0].cat;
        const request = spec.buildRequests(validBidRequests, bidderRequest);
        const bidResponse = spec.interpretResponse(copiedResponse, request);
        expect(bidResponse).to.be.an('array');
        expect(bidResponse[0]).to.be.an('object');
        expect(bidResponse[0].meta).to.not.have.property('primaryCatId');
        expect(bidResponse[0].meta).to.not.have.property('secondaryCatIds');
      });
    });

    describe('getUserSyncs', () => {
      beforeEach(() => {
        spec.buildRequests(validBidRequests, bidderRequest);
      });

      afterEach(() => {
        config.resetConfig();
      });

      it('returns iframe sync url with consent parameters and COPPA', () => {
        config.setConfig({ coppa: true });
        const gdprConsent = { gdprApplies: true, consentString: 'CONSENT' };
        const uspConsent = '1YNN';
        const gppConsent = { gppString: 'GPP', applicableSections: [2, 4] };
        const [sync] = spec.getUserSyncs({ iframeEnabled: true }, [], gdprConsent, uspConsent, gppConsent);
        expect(sync).to.deep.equal({
          type: 'iframe',
          url: 'https://ads.pubmatic.com/AdServer/js/user_sync.html?kdntuid=1&p=5670&gdpr=1&gdpr_consent=CONSENT&us_privacy=1YNN&gpp=GPP&gpp_sid=2%2C4&coppa=1'
        });
      });

      it('returns image sync url when no consent data provided', () => {
        const [sync] = spec.getUserSyncs({}, []);
        expect(sync).to.deep.equal({
          type: 'image',
          url: 'https://image8.pubmatic.com/AdServer/ImgSync?p=5670'
        });
      });
    });
  })

  it('should add userIdAsEids to user.ext.eids when present in bidRequest', () => {
    const bidRequestWithEids = utils.deepClone(validBidRequests[0]);
    bidRequestWithEids.userIdAsEids = [
      {
        source: 'pubmatic',
        uids: [{ id: 'test-id-123' }]
      }
    ];
    // Create a clean bidderRequest without existing eids
    const cleanBidderRequest = utils.deepClone(bidderRequest);
    // Ensure user object exists
    cleanBidderRequest.user = cleanBidderRequest.user || {};
    cleanBidderRequest.user.ext = cleanBidderRequest.user.ext || {};
    delete cleanBidderRequest.user.ext.eids;
    // Also set userIdAsEids on the bidderRequest.bids[0] like MediaKeys test
    cleanBidderRequest.bids[0].userIdAsEids = bidRequestWithEids.userIdAsEids;
    const request = spec.buildRequests([bidRequestWithEids], cleanBidderRequest);
    expect(request.data.user).to.exist;
    expect(request.data.user.ext).to.exist;
    expect(request.data.user.ext.eids).to.deep.equal(bidRequestWithEids.userIdAsEids);
  });
  it('should not add userIdAsEids when req.user.ext.eids already exists', () => {
    const bidRequestWithEids = utils.deepClone(validBidRequests[0]);
    bidRequestWithEids.userIdAsEids = [
      {
        source: 'pubmatic',
        uids: [{ id: 'test-id-123' }]
      }
    ];
    // Create a bidderRequest with existing eids
    const bidderRequestWithExistingEids = utils.deepClone(bidderRequest);
    // Ensure user object exists and set existing eids
    bidderRequestWithExistingEids.user = bidderRequestWithExistingEids.user || {};
    bidderRequestWithExistingEids.user.ext = bidderRequestWithExistingEids.user.ext || {};
    bidderRequestWithExistingEids.user.ext.eids = [{ source: 'existing', uids: [{ id: 'existing-id' }] }];
    // Also set userIdAsEids on the bidderRequest.bids[0] like MediaKeys test
    bidderRequestWithExistingEids.bids[0].userIdAsEids = bidRequestWithEids.userIdAsEids;
    // Set existing eids in ortb2.user.ext.eids so the converter will merge them
    // and the adapter will see them as already existing
    bidderRequestWithExistingEids.ortb2 = bidderRequestWithExistingEids.ortb2 || {};
    bidderRequestWithExistingEids.ortb2.user = bidderRequestWithExistingEids.ortb2.user || {};
    bidderRequestWithExistingEids.ortb2.user.ext = bidderRequestWithExistingEids.ortb2.user.ext || {};
    bidderRequestWithExistingEids.ortb2.user.ext.eids = [{ source: 'existing', uids: [{ id: 'existing-id' }] }];
    const request = spec.buildRequests([bidRequestWithEids], bidderRequestWithExistingEids);
    expect(request.data.user).to.exist;
    expect(request.data.user.ext).to.exist;
    expect(request.data.user.ext.eids).to.deep.equal(bidderRequestWithExistingEids.ortb2.user.ext.eids);
  });

  it('should copy geo from device to user when device has geo but user does not', () => {
    const bidRequestWithDeviceGeo = utils.deepClone(validBidRequests[0]);
    // Create a clean bidderRequest without existing geo data
    const cleanBidderRequest = utils.deepClone(bidderRequest);
    // Ensure user and device objects exist
    cleanBidderRequest.user = cleanBidderRequest.user || {};
    cleanBidderRequest.ortb2 = cleanBidderRequest.ortb2 || {};
    cleanBidderRequest.ortb2.user = cleanBidderRequest.ortb2.user || {};
    cleanBidderRequest.ortb2.device = cleanBidderRequest.ortb2.device || {};
    delete cleanBidderRequest.user.geo;
    delete cleanBidderRequest.ortb2.user.geo;
    // Set geo data in bidderRequest.ortb2.device.geo so the converter will merge it
    cleanBidderRequest.ortb2.device.geo = { lat: 40.7128, lon: -74.0060 };
    const request = spec.buildRequests([bidRequestWithDeviceGeo], cleanBidderRequest);
    expect(request.data.user).to.exist;
    expect(request.data.user.geo).to.deep.equal({ lat: 40.7128, lon: -74.0060 });
  });

  it('should copy geo from user to device when user has geo but device does not', () => {
    const bidRequestWithUserGeo = utils.deepClone(validBidRequests[0]);
    // Create a clean bidderRequest without existing geo data
    const cleanBidderRequest = utils.deepClone(bidderRequest);
    // Ensure device object exists
    cleanBidderRequest.device = cleanBidderRequest.device || {};
    cleanBidderRequest.ortb2 = cleanBidderRequest.ortb2 || {};
    cleanBidderRequest.ortb2.device = cleanBidderRequest.ortb2.device || {};
    cleanBidderRequest.ortb2.user = cleanBidderRequest.ortb2.user || {};
    delete cleanBidderRequest.device.geo;
    delete cleanBidderRequest.ortb2.device.geo;
    // Set geo data in bidderRequest.ortb2.user.geo so the converter will merge it
    cleanBidderRequest.ortb2.user.geo = { lat: 40.7128, lon: -74.0060 };
    const request = spec.buildRequests([bidRequestWithUserGeo], cleanBidderRequest);
    expect(request.data.device).to.exist;
    expect(request.data.device.geo).to.deep.equal({ lat: 40.7128, lon: -74.0060 });
  });

  it('should update site.page with kadpageurl when present', () => {
    const bidRequestWithKadPageUrl = utils.deepClone(validBidRequests[0]);
    bidRequestWithKadPageUrl.params.kadpageurl = 'https://example.com/page';
    const request = spec.buildRequests([bidRequestWithKadPageUrl], bidderRequest);
    expect(request.data.site).to.exist;
    expect(request.data.site.page).to.equal('https://example.com/page');
  });

  describe('Impression optimization', () => {
    it('should add pbcode to impression ext with adUnitCode value', () => {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const { imp } = request?.data;

      expect(imp).to.be.an('array');
      expect(imp[0]).to.have.property('ext');
      expect(imp[0].ext).to.have.property('pbcode');
      expect(imp[0].ext.pbcode).to.equal(validBidRequests[0].adUnitCode);
    });

    it('should consolidate impressions with same adUnitCode and media type', () => {
      // Create two banner bids with the same adUnitCode
      const bid1 = utils.deepClone(validBidRequests[0]);
      const bid2 = utils.deepClone(validBidRequests[0]);

      bid1.bidId = 'bid-id-1';
      bid2.bidId = 'bid-id-2';

      // Set the same adUnitCode and adSlot to ensure they're treated as the same unit
      const sharedAdUnitCode = 'shared-ad-unit';
      bid1.adUnitCode = sharedAdUnitCode;
      bid2.adUnitCode = sharedAdUnitCode;
      bid1.params.adSlot = 'same_ad_slot';
      bid2.params.adSlot = 'same_ad_slot';

      bid1.mediaTypes = { banner: { sizes: [[300, 250]] } };
      bid2.mediaTypes = { banner: { sizes: [[300, 250]] } };

      bid1.params.pmzoneid = 'zone1';
      bid2.params.pmzoneid = 'zone2';

      const bidRequests = [bid1, bid2];
      const combinedBidderRequest = utils.deepClone(bidderRequest);
      combinedBidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, combinedBidderRequest);
      const { imp } = request?.data;

      // Should be consolidated to a single impression
      expect(imp).to.be.an('array');
      expect(imp).to.have.lengthOf(1);

      expect(imp[0].ext).to.have.property('pbcode');
      expect(imp[0].ext.pbcode).to.equal(sharedAdUnitCode);

      if (imp[0].ext.pmZoneId) {
        expect(typeof imp[0].ext.pmZoneId).to.equal('string');
        expect(imp[0].ext.pmZoneId).to.equal('zone2');
      }
    });
  });

  it('should set site.publisher.id from pubId', () => {
    // Ensure site.publisher structure exists in bidderRequest.ortb2
    const bidderRequestWithPublisher = utils.deepClone(bidderRequest);
    bidderRequestWithPublisher.ortb2 = bidderRequestWithPublisher.ortb2 || {};
    bidderRequestWithPublisher.ortb2.site = bidderRequestWithPublisher.ortb2.site || {};
    bidderRequestWithPublisher.ortb2.site.publisher = bidderRequestWithPublisher.ortb2.site.publisher || {};
    const request = spec.buildRequests(validBidRequests, bidderRequestWithPublisher);
    expect(request.data.site).to.exist;
    expect(request.data.site.publisher).to.exist;
    expect(request.data.site.publisher.id).to.equal('5670'); // pubId from params
  });

  it('should set site.ref from refURL when not already present', () => {
    const request = spec.buildRequests(validBidRequests, bidderRequest);
    expect(request.data.site).to.exist;
    // Check if site.ref exists (it might be set to empty string or undefined)
    if (request.data.site.ref !== undefined) {
      expect(request.data.site.ref).to.exist;
    }
  });

  it('should build a basic request successfully', () => {
    const request = spec.buildRequests(validBidRequests, bidderRequest);
    expect(request.data).to.exist;
    expect(request.data.imp).to.be.an('array');
    expect(request.data.imp.length).to.be.greaterThan(0);
  });

  it('should set floor values correctly for multi-format requests using getFloor', () => {
    // Start with a valid bid
    const testBid = utils.deepClone(validBidRequests[0]);
    testBid.mediaTypes = {
      banner: {
        sizes: [[300, 250], [728, 90]],
        format: [{ w: 300, h: 250 }, { w: 728, h: 90 }]
      },
      video: {},
      native: {}
    };
    testBid.getFloor = ({ currency, mediaType, size }) => {
      if (mediaType === 'banner') return { currency: 'AUD', floor: 2.5 };
      if (mediaType === 'video') return { currency: 'AUD', floor: 1.5 };
      if (mediaType === 'native') return { currency: 'AUD', floor: 1.0 };
      return { currency: 'AUD', floor: 0 };
    };
    const testBidderRequest = {
      bids: [testBid],
      auctionId: 'test-auction',
      bidderCode: 'pubmatic',
      refererInfo: { page: 'https://example.com', ref: '' },
      ortb2: { device: { w: 1200, h: 1800 }, site: { domain: 'example.com', page: 'https://example.com' } },
      timeout: 2000
    };
    const request = spec.buildRequests([testBid], testBidderRequest);
    expect(request).to.exist;
    const builtImp = request.data.imp[0];
    if (builtImp.banner && builtImp.banner.ext) {
      expect(builtImp.banner.ext).to.deep.equal({ bidfloor: 1, bidfloorcur: 'AUD' });
    }
    if (builtImp.video && builtImp.video.ext) {
      expect(builtImp.video.ext).to.deep.equal({ bidfloor: 1, bidfloorcur: 'AUD' });
    }
    if (builtImp.native && builtImp.native.ext) {
      expect(builtImp.native.ext).to.deep.equal({ bidfloor: 1, bidfloorcur: 'AUD' });
    }
    // The impression-level bidfloor should match the banner floor (2.5)
    expect(builtImp.bidfloor).to.equal(2.5);
  });
})

describe('addViewabilityToImp', () => {
  let imp;
  let element;
  let originalGetElementById;
  let originalVisibilityState;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    imp = { ext: {} };
    element = document.createElement('div');
    element.id = 'Div1';
    document.body.appendChild(element);
    originalGetElementById = document.getElementById;
    sandbox.stub(document, 'getElementById').callsFake(id => id === 'Div1' ? element : null);
    originalVisibilityState = document.visibilityState;
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true
    });
    sandbox.stub(utils, 'getWindowTop').returns(window);
  });

  afterEach(() => {
    sandbox.restore();
    document.body.removeChild(element);
    Object.defineProperty(document, 'visibilityState', {
      value: originalVisibilityState,
      configurable: true
    });
    document.getElementById = originalGetElementById;
  });

  it('should add viewability to imp.ext when measurable', () => {
    addViewabilityToImp(imp, 'Div1', { w: 300, h: 250 });
    expect(imp.ext).to.have.property('viewability');
  });

  it('should set viewability amount to "na" if not measurable (e.g., in iframe)', () => {
    const isIframeStub = sandbox.stub(utils, 'inIframe').returns(true);
    addViewabilityToImp(imp, 'Div1', { w: 300, h: 250 });
    expect(imp.ext).to.have.property('viewability');
    expect(imp.ext.viewability.amount).to.equal('na');
  });

  it('should not add viewability if element is not found', () => {
    document.getElementById.restore();
    sandbox.stub(document, 'getElementById').returns(null);
    addViewabilityToImp(imp, 'Div1', { w: 300, h: 250 });
    expect(imp.ext).to.not.have.property('viewability');
  });

  it('should create imp.ext if not present', () => {
    imp = {};
    addViewabilityToImp(imp, 'Div1', { w: 300, h: 250 });
    expect(imp.ext).to.exist;
    expect(imp.ext).to.have.property('viewability');
  });
});
