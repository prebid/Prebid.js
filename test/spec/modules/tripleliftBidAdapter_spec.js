import { expect } from 'chai';
import { tripleliftAdapterSpec, storage } from 'modules/tripleliftBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { deepClone } from 'src/utils.js';
import { config } from 'src/config.js';
import prebid from '../../../package.json';
import * as utils from 'src/utils.js';

const ENDPOINT = 'https://tlx.3lift.com/header/auction?';
const GDPR_CONSENT_STR = 'BOONm0NOONm0NABABAENAa-AAAARh7______b9_3__7_9uz_Kv_K7Vf7nnG072lPVA9LTOQ6gEaY';
const GPP_CONSENT_STR = 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN'

describe('triplelift adapter', function () {
  const adapter = newBidder(tripleliftAdapterSpec);
  let bid, instreamBid, sandbox, logErrorSpy;

  this.beforeEach(() => {
    bid = {
      bidder: 'triplelift',
      params: {
        inventoryCode: '12345',
        floor: 1.0,
      },
      mediaTypes: {
        banner: {
          sizes: [
            [970, 250],
            [1, 1]
          ]
        }
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    instreamBid = {
      bidder: 'triplelift',
      params: {
        inventoryCode: 'insteam_test',
        floor: 1.0,
        video: {
          mimes: ['video/mp4'],
          maxduration: 30,
          minduration: 6,
          w: 640,
          h: 480
        }
      },
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [640, 480]
        }
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };
  })

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true for valid bid request', function () {
      expect(tripleliftAdapterSpec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found', function () {
      bid.params.inventoryCode = 'another_inv_code';
      expect(tripleliftAdapterSpec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found - instream', function () {
      expect(tripleliftAdapterSpec.isBidRequestValid(instreamBid)).to.equal(true);
    });

    it('should return true when required params found - instream - 2', function () {
      delete instreamBid.mediaTypes.playerSize;
      delete instreamBid.params.video.w;
      delete instreamBid.params.video.h;
      // the only required param is inventoryCode
      expect(tripleliftAdapterSpec.isBidRequestValid(instreamBid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      delete bid.params.inventoryCode;
      expect(tripleliftAdapterSpec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params are not passed - instream', function () {
      delete instreamBid.params.inventoryCode;
      expect(tripleliftAdapterSpec.isBidRequestValid(instreamBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests;
    let bidderRequest;
    const schain = {
      validation: 'strict',
      config: {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'indirectseller.com',
            sid: '00001',
            hp: 1,
          }
        ]
      }
    };

    this.beforeEach(() => {
      bidRequests = [
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: '12345',
            floor: 1.0,
          },
          mediaTypes: {
            banner: {
              sizes: [
                [970, 250],
                [1, 1]
              ]
            }
          },
          adUnitCode: 'adunit-code',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          transactionId: '173f49a8-7549-4218-a23c-e7ba59b47229',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
          ortb2Imp: {
            ext: {
              tid: '173f49a8-7549-4218-a23c-e7ba59b47229'
            }
          }
        },
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'insteam_test',
            floor: 1.0,
            video: {
              mimes: ['video/mp4'],
              maxduration: 30,
              minduration: 6,
              w: 640,
              h: 480
            }
          },
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [640, 480],
              playbackmethod: 5,
              plcmt: 1
            }
          },
          adUnitCode: 'adunit-code-instream',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
          ortb2Imp: {
            ext: {
              data: {
                pbAdSlot: 'homepage-top-rect',
                adUnitSpecificAttribute: 123
              },
              tid: '173f49a8-7549-4218-a23c-e7ba59b47229'
            }
          }
        },
        // banner and outstream video
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'outstream_test',
            floor: 1.0,
            video: {
              mimes: ['video/mp4'],
              maxduration: 30,
              minduration: 6,
              w: 640,
              h: 480
            }
          },
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [640, 480]
            },
            banner: {
              sizes: [
                [970, 250],
                [1, 1]
              ]
            }
          },
          adUnitCode: 'adunit-code-instream',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
        },
        // banner and incomplete video
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'outstream_test',
            floor: 1.0,
            video: {
              mimes: ['video/mp4'],
              maxduration: 30,
              minduration: 6,
              w: 640,
              h: 480
            }
          },
          mediaTypes: {
            video: {

            },
            banner: {
              sizes: [
                [970, 250],
                [1, 1]
              ]
            }
          },
          adUnitCode: 'adunit-code-instream',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
          ortb2Imp: {
            misc: {
              test: 1
            }
          }
        },
        // incomplete banner and incomplete video
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'outstream_test',
            floor: 1.0,
            video: {
              mimes: ['video/mp4'],
              maxduration: 30,
              minduration: 6,
              w: 640,
              h: 480
            }
          },
          mediaTypes: {
            video: {

            },
            banner: {

            }
          },
          adUnitCode: 'adunit-code-instream',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
        },
        // banner and instream video
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'outstream_test',
            floor: 1.0,
            video: {
              mimes: ['video/mp4'],
              maxduration: 30,
              minduration: 6,
              w: 640,
              h: 480
            }
          },
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [640, 480],
              playbackmethod: [1, 2, 3],
              plcmt: 1
            },
            banner: {
              sizes: [
                [970, 250],
                [1, 1]
              ]
            }
          },
          adUnitCode: 'adunit-code-instream',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
        },
        // banner and outream video and native
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'outstream_test',
            floor: 1.0,
            video: {
              mimes: ['video/mp4'],
              maxduration: 30,
              minduration: 6,
              w: 640,
              h: 480
            }
          },
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [640, 480]
            },
            banner: {
              sizes: [
                [970, 250],
                [1, 1]
              ]
            },
            native: {

            }
          },
          adUnitCode: 'adunit-code-instream',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
        },
        // outstream video only
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'outstream_test',
            floor: 1.0,
            video: {
              mimes: ['video/mp4'],
              maxduration: 30,
              minduration: 6,
              w: 640,
              h: 480
            }
          },
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [640, 480]
            }
          },
          adUnitCode: 'adunit-code-outstream',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
        },
        // banner and incomplete outstream (missing size)
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'outstream_test',
            floor: 1.0,
            video: {
              mimes: ['video/mp4'],
              maxduration: 30,
              minduration: 6
            }
          },
          mediaTypes: {
            video: {
              context: 'outstream'
            },
            banner: {
              sizes: [
                [970, 250],
                [1, 1]
              ]
            }
          },
          adUnitCode: 'adunit-code-instream',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
        },
        // outstream video; valid placement
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'outstream_test',
            floor: 1.0,
            video: {
              mimes: ['video/mp4'],
              maxduration: 30,
              minduration: 6,
              w: 640,
              h: 480
            }
          },
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [640, 480],
              placement: 3
            }
          },
          adUnitCode: 'adunit-code-instream',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
        },
        // outstream video; valid placement
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'outstream_test',
            floor: 1.0,
            video: {
              mimes: ['video/mp4'],
              maxduration: 30,
              minduration: 6,
              w: 640,
              h: 480
            }
          },
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [640, 480],
              placement: 4
            }
          },
          adUnitCode: 'adunit-code-instream',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
        },
        // outstream video; valid placement
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'outstream_test',
            floor: 1.0,
            video: {
              mimes: ['video/mp4'],
              maxduration: 30,
              minduration: 6,
              w: 640,
              h: 480
            }
          },
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [640, 480],
              placement: 5
            }
          },
          adUnitCode: 'adunit-code-instream',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
        },
        // outstream video; undefined placement
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'outstream_test',
            floor: 1.0,
            video: {
              mimes: ['video/mp4'],
              maxduration: 30,
              minduration: 6,
              w: 640,
              h: 480
            }
          },
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [640, 480],
              plcmt: 4
            }
          },
          adUnitCode: 'adunit-code-instream',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
        },
        // outstream video; invalid placement
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'outstream_test',
            floor: 1.0,
            video: {
              mimes: ['video/mp4'],
              maxduration: 30,
              minduration: 6,
              w: 640,
              h: 480
            }
          },
          mediaTypes: {
            video: {
              context: 'outstream',
              playerSize: [640, 480],
              plcmt: 3
            }
          },
          adUnitCode: 'adunit-code-instream',
          sizes: [[300, 250], [300, 600], [1, 1, 1], ['flex']],
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
        }
      ];

      bidderRequest = {
        bidderCode: 'triplelift',
        auctionId: 'a7ebcd1d-66ff-4b5c-a82c-6a21a6ee5a18',
        bidderRequestId: '5c55612f99bc11',
        bids: [
          {
            imp_id: 0,
            cpm: 1.062,
            width: 300,
            height: 250,
            ad: 'ad-markup',
            iurl: 'https://s.adroll.com/a/IYR/N36/IYRN366MFVDITBAGNNT5U6.jpg'
          },
          {
            imp_id: 1,
            crid: '10092_76480_i2j6qm8u',
            cpm: 0.01,
            ad: '<VAST version=\"2.0\"><Ad id=\"gsen95th\"><Wrapper><Error><![CDATA[https://eb2.3lift.net/ive?aid=156025986241697082890&bmid=10092&bsid=76480&crid=10092_76480_i2j6qm8u&e=[ERRORCODE]]]></Error><Impression><![CDATA[https://eb2.3lift.net/r?rr=creative&bc=0.011&uid=8217096503606905723&pr=%24%7BAUCTION_PRICE%7D&brid=554350&bmid=10092&biid=10066&aid=156025986241697082890&bcud=11&sid=76480&ts=1593552049&fid=11]]></Impression><Impression><![CDATA[https://tlx.3lift.net/header/notify?px=1&pr=${AUCTION_PRICE}&ts=1593552049&aid=156025986241697082890&ec=10092_76480_i2j6qm8u&n=GgDyAqABCAASFTE1NjAyNTk4NjI0MTY5NzA4Mjg5MBgAIAEo7E4wwNUEQAFIAFAAYAtogIAEcO7qIZABAJgBAKgBALABC7gBAMABCsgBC%2BABCvABAPgBlo0GgAL%2FlwWIAgqRAgAAAAAAAPA%2FmQIzMzMzMzPDP6ECAAAAAAAAAACoAgCwAgDIAgTYAgDxAmZmZmZmZuY%2F%2BALSTpADAJgDAKADAKgDA%2FgCDIgDAJIDBDEyMzQ%3D]]></Impression><AdSystem version=\"1.0\">The Trade Desk</AdSystem><VASTAdTagURI><![CDATA[https://insight.adsrvr.org/enduser/vast/?iid=590299b9-1817-4859-a2af-ef007bb4c78e&crid=gsen95th&wp=0.011&aid=1&wpc=USD&sfe=10fba14e&puid=&tdid=&pid=13hzg59&ag=l2w0772&adv=ct0nqrx&sig=1BGM_YxB0HAcl-s55S_NKIu-oLW94YpTn_DjMRmdWHzs.&bp=0.3&cf=1448159&fq=0&td_s=388389451&rcats=&mcat=&mste=&mfld=2&mssi=None&mfsi=ve35dsnkwp&uhow=75&agsa=&rgco=South%20Korea&rgre=Gyeonggi-do&rgme=&rgci=Ansan-si&rgz=15345&svbttd=1&dt=Mobile&osf=iOS&os=iOS134&br=WebView&rlangs=01&mlang=&svpid=7453-EB&did=&rcxt=InApp&lat=37.324400&lon=126.823700&tmpc=9.66&daid=d7804da7-147b-421d-bb44-60ad3ac32681&vp=0&osi=&osv=&svscid=388389451&bffi=41&mk=Apple&mdl=iPhone&vpb=PreRoll&dc=14&vcc=EDwYPDICCAI6BAgBCAJAAUgBUASIAQKgAZ4DqAGwBsgBAdABA-gBAoACA4oCCAgCCAMIBQgGmgIICAMIBQgGCAegAgKoAgGwAgC4AgDAAgE.&sv=triplelift&pidi=3584&advi=270782&cmpi=1319400&agi=6167705&cridi=13268739&svi=70&cmp=a9nj9ex&tsig=tlN4j1OujX9nrFakJmfpTuNNfg-D0qArlSjjNAb8tLg.&c=MAQ4AEgAUAc.&dur=&crrelr=&adpt=tl_ltriplelift&ipl=39250&fpa=826&pcm=3&said=40286845772363793660&ict=Unknown&auct=1&im=1]]></VASTAdTagURI><Creatives><Creative><Linear><VideoClicks><ClickTracking><![CDATA[https://eb2.3lift.net/ec?aid=156025986241697082890]]></ClickTracking></VideoClicks><TrackingEvents><Tracking event=\"mute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=5]]></Tracking><Tracking event=\"unmute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=6]]></Tracking><Tracking event=\"expand\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=7]]></Tracking><Tracking event=\"collapse\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=8]]></Tracking><Tracking event=\"pause\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=14]]></Tracking><Tracking event=\"resume\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=15]]></Tracking><Tracking event=\"fullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=16]]></Tracking><Tracking event=\"exitFullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=17]]></Tracking><Tracking event=\"skip\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=18]]></Tracking><Tracking event=\"start\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=7]]></Tracking><Tracking event=\"firstQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=1]]></Tracking><Tracking event=\"midpoint\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=2]]></Tracking><Tracking event=\"thirdQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=3]]></Tracking><Tracking event=\"complete\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:02\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=1]]></Tracking><Tracking event=\"progress\" offset=\"00:00:03\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=2]]></Tracking><Tracking event=\"progress\" offset=\"00:00:05\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=3]]></Tracking><Tracking event=\"progress\" offset=\"00:00:10\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:15\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=5]]></Tracking><Tracking event=\"progress\" offset=\"00:00:30\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=6]]></Tracking></TrackingEvents></Linear></Creative></Creatives></Wrapper></Ad></VAST>',
            tlx_source: 'hdx'
          }
        ],
        refererInfo: {
          page: 'https://examplereferer.com'
        },
        gdprConsent: {
          consentString: GDPR_CONSENT_STR,
          gdprApplies: true
        },
      };
      sandbox = sinon.sandbox.create();
      logErrorSpy = sinon.spy(utils, 'logError');

      $$PREBID_GLOBAL$$.bidderSettings = {
        triplelift: {
          storageAllowed: true
        }
      };
    });
    afterEach(() => {
      sandbox.restore();
      utils.logError.restore();
      $$PREBID_GLOBAL$$.bidderSettings = {};
    });

    it('exists and is an object', function () {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request).to.exist.and.to.be.a('object');
    });

    it('should be able find video object from the instream request', function () {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[1].video).to.exist.and.to.be.a('object');
    });

    it('should only parse sizes that are of the proper length and format', function () {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[0].banner.format).to.have.length(2);
      expect(request.data.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
    });

    it('should be a post request and populate the payload', function () {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.exist;
      expect(payload.imp[0].tagid).to.equal('12345');
      expect(payload.imp[0].floor).to.equal(1.0);
      expect(payload.imp[0].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
      // instream
      expect(payload.imp[1].tagid).to.equal('insteam_test');
      expect(payload.imp[1].floor).to.equal(1.0);
      expect(payload.imp[1].video).to.exist.and.to.be.a('object');
      expect(payload.imp[1].video.plcmt).to.equal(1);
      // banner and outstream video
      expect(payload.imp[2]).to.have.property('video');
      expect(payload.imp[2]).to.have.property('banner');
      expect(payload.imp[2].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
      expect(payload.imp[2].video).to.deep.equal({'mimes': ['video/mp4'], 'maxduration': 30, 'minduration': 6, 'w': 640, 'h': 480, 'context': 'outstream'});
      // banner and incomplete video
      expect(payload.imp[3]).to.not.have.property('video');
      expect(payload.imp[3]).to.have.property('banner');
      expect(payload.imp[3].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
      // incomplete mediatypes.banner and incomplete video
      expect(payload.imp[4]).to.not.have.property('video');
      expect(payload.imp[4]).to.have.property('banner');
      expect(payload.imp[4].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
      // banner and instream video
      expect(payload.imp[5]).to.not.have.property('banner');
      expect(payload.imp[5]).to.have.property('video');
      expect(payload.imp[5].video).to.exist.and.to.be.a('object');
      expect(payload.imp[5].video.plcmt).to.equal(1);
      // banner and outream video and native
      expect(payload.imp[6]).to.have.property('video');
      expect(payload.imp[6]).to.have.property('banner');
      expect(payload.imp[6].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
      expect(payload.imp[6].video).to.deep.equal({'mimes': ['video/mp4'], 'maxduration': 30, 'minduration': 6, 'w': 640, 'h': 480, 'context': 'outstream'});
      // outstream video only
      expect(payload.imp[7]).to.have.property('video');
      expect(payload.imp[7]).to.not.have.property('banner');
      expect(payload.imp[7].video).to.deep.equal({'mimes': ['video/mp4'], 'maxduration': 30, 'minduration': 6, 'w': 640, 'h': 480, 'context': 'outstream'});
      // banner and incomplete outstream (missing size); video request is permitted so banner can still monetize
      expect(payload.imp[8]).to.have.property('video');
      expect(payload.imp[8]).to.have.property('banner');
      expect(payload.imp[8].banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
      expect(payload.imp[8].video).to.deep.equal({'mimes': ['video/mp4'], 'maxduration': 30, 'minduration': 6, 'context': 'outstream'});
      // outstream new plcmt value
      expect(payload.imp[13]).to.have.property('video');
      expect(payload.imp[13].video).to.deep.equal({'mimes': ['video/mp4'], 'maxduration': 30, 'minduration': 6, 'w': 640, 'h': 480, 'context': 'outstream', 'plcmt': 3});
    });

    it('should check for valid outstream placement values', function () {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      // outstream video; valid placement
      expect(payload.imp[9]).to.not.have.property('banner');
      expect(payload.imp[9]).to.have.property('video');
      expect(payload.imp[9].video).to.exist.and.to.be.a('object');
      expect(payload.imp[9].video.placement).to.equal(3);
      // outstream video; valid placement
      expect(payload.imp[10]).to.not.have.property('banner');
      expect(payload.imp[10]).to.have.property('video');
      expect(payload.imp[10].video).to.exist.and.to.be.a('object');
      expect(payload.imp[10].video.placement).to.equal(4);
      // outstream video; valid placement
      expect(payload.imp[11]).to.not.have.property('banner');
      expect(payload.imp[11]).to.have.property('video');
      expect(payload.imp[11].video).to.exist.and.to.be.a('object');
      expect(payload.imp[11].video.placement).to.equal(5);
      // outstream video; undefined placement
      expect(payload.imp[12]).to.not.have.property('banner');
      expect(payload.imp[12]).to.have.property('video');
      expect(payload.imp[12].video).to.exist.and.to.be.a('object');
      expect(payload.imp[12].video.plcmt).to.equal(4);
      // outstream video; invalid placement
      expect(payload.imp[13]).to.not.have.property('banner');
      expect(payload.imp[13]).to.have.property('video');
      expect(payload.imp[13].video).to.exist.and.to.be.a('object');
      expect(payload.imp[13].video.plcmt).to.equal(3);
    });

    it('should add tid to imp.ext if transactionId exists', function() {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[0].ext.tid).to.exist.and.be.a('string');
      expect(request.data.imp[0].ext.tid).to.equal('173f49a8-7549-4218-a23c-e7ba59b47229');
    });

    it('should not add impression ext object if ortb2Imp does not exist', function() {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[2].ext).to.not.exist;
    });

    it('should not add impression ext object if ortb2Imp.ext does not exist', function() {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[3].ext).to.not.exist;
    });

    it('should copy entire impression ext object', function() {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[1].ext).to.haveOwnProperty('tid');
      expect(request.data.imp[1].ext).to.haveOwnProperty('data');
      expect(request.data.imp[1].ext.data).to.haveOwnProperty('adUnitSpecificAttribute');
      expect(request.data.imp[1].ext.data).to.haveOwnProperty('pbAdSlot');
      expect(request.data.imp[1].ext).to.deep.equal(
        {
          data: {
            pbAdSlot: 'homepage-top-rect',
            adUnitSpecificAttribute: 123
          },
          tid: '173f49a8-7549-4218-a23c-e7ba59b47229'
        }
      );
    });

    it('should add tdid to the payload if included', function () {
      const tdid = '6bca7f6b-a98a-46c0-be05-6020f7604598';
      bidRequests[0].userIdAsEids = [
        {
          source: 'adserver.org',
          uids: [
            {
              atype: 1,
              ext: {
                rtiPartner: 'TDID'
              },
              id: tdid
            }
          ]
        },
      ];
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.exist;
      expect(payload.user).to.deep.equal({ext: {eids: [{source: 'adserver.org', uids: [{id: tdid, atype: 1, ext: {rtiPartner: 'TDID'}}]}]}});
    });

    it('should add criteoId to the payload if included', function () {
      const id = '53e30ea700424f7bbdd793b02abc5d7';
      bidRequests[0].userIdAsEids = [
        {
          source: 'criteo.com',
          uids: [
            {
              atype: 1,
              ext: {
                rtiPartner: 'criteoId'
              },
              id: id
            }
          ]
        },
      ];
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;
      expect(payload).to.exist;
      expect(payload.user).to.deep.equal({ext: {eids: [{source: 'criteo.com', uids: [{id: id, atype: 1, ext: {rtiPartner: 'criteoId'}}]}]}});
    });

    it('should add tdid and criteoId to the payload if both are included', function () {
      const tdid = '6bca7f6b-a98a-46c0-be05-6020f7604598';
      const criteoId = '53e30ea700424f7bbdd793b02abc5d7';
      bidRequests[0].userIdAsEids = [
        {
          source: 'adserver.org',
          uids: [
            {
              atype: 1,
              ext: {
                rtiPartner: 'TDID'
              },
              id: tdid
            }
          ]
        },
        {
          source: 'criteo.com',
          uids: [
            {
              atype: 1,
              ext: {
                rtiPartner: 'criteoId'
              },
              id: criteoId
            }
          ]
        },
      ];

      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;

      expect(payload).to.exist;
      expect(payload.user).to.deep.equal({
        ext: {
          eids: [
            {
              source: 'adserver.org',
              uids: [
                {
                  id: tdid,
                  atype: 1,
                  ext: { rtiPartner: 'TDID' }
                }
              ],
            },
            {
              source: 'criteo.com',
              uids: [
                {
                  id: criteoId,
                  atype: 1,
                  ext: { rtiPartner: 'criteoId' }
                }
              ]
            }
          ]
        }
      });

      expect(payload.user.ext.eids).to.be.an('array');
      expect(payload.user.ext.eids).to.have.lengthOf(2);
    });

    it('should return a query string for TL call', function () {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const url = request.url;
      expect(url).to.exist;
      expect(url).to.be.a('string');
      expect(url).to.match(/(?:tlx.3lift.com\/header\/auction)/)
      expect(url).to.match(/(?:lib=prebid)/)
      expect(url).to.match(new RegExp('(?:' + prebid.version + ')'))
      expect(url).to.match(/(?:referrer)/);
    });
    it('should use refererInfo.page for referrer', function () {
      bidderRequest.refererInfo.page = 'https://topmostlocation.com?foo=bar'
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const url = request.url;
      expect(url).to.match(/(\?|&)referrer=https%3A%2F%2Ftopmostlocation.com%3Ffoo%3Dbar/);
      delete bidderRequest.refererInfo.page
    });
    it('should return us_privacy param when CCPA info is available', function() {
      bidderRequest.uspConsent = '1YYY';
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const url = request.url;
      expect(url).to.match(/(\?|&)us_privacy=1YYY/);
    });
    it('should pass fledge signal when Triplelift is eligible for fledge', function() {
      bidderRequest.fledgeEnabled = true;
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const url = request.url;
      expect(url).to.match(/(\?|&)fledge=true/);
    });
    it('should return coppa param when COPPA config is set to true', function() {
      sinon.stub(config, 'getConfig').withArgs('coppa').returns(true);
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      config.getConfig.restore();
      const url = request.url;
      expect(url).to.match(/(\?|&)coppa=true/);
    });
    it('should not return coppa param when COPPA config is set to false', function() {
      sinon.stub(config, 'getConfig').withArgs('coppa').returns(false);
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      config.getConfig.restore();
      const url = request.url;
      expect(url).not.to.match(/(\?|&)coppa=/);
    });
    it('should return schain when present', function() {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const { data: payload } = request;
      expect(payload.ext.schain).to.deep.equal(schain);
    });
    it('should not create root level ext when schain is not present', function() {
      bidRequests[0].schain = undefined;
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      const { data: payload } = request;
      expect(payload.ext).to.deep.equal(undefined);
    });
    it('should get floor from floors module if available', function() {
      let floorInfo;
      bidRequests[0].getFloor = () => floorInfo;

      // standard float response; expected functionality of floors module
      floorInfo = { currency: 'USD', floor: 1.99 };
      let request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[0].floor).to.equal(1.99);

      // if string response, convert to float
      floorInfo = { currency: 'USD', floor: '1.99' };
      request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[0].floor).to.equal(1.99);
    });
    it('should call getFloor with the correct parameters based on mediaType', function() {
      bidRequests.forEach(request => {
        request.getFloor = () => {};
        sinon.spy(request, 'getFloor')
      });

      tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);

      // banner
      expect(bidRequests[0].getFloor.calledWith({
        currency: 'USD',
        mediaType: 'banner',
        size: '*'
      })).to.be.true;

      // instream
      expect(bidRequests[1].getFloor.calledWith({
        currency: 'USD',
        mediaType: 'video',
        size: '*'
      })).to.be.true;

      // banner and incomplete video (POST will only include banner)
      expect(bidRequests[3].getFloor.calledWith({
        currency: 'USD',
        mediaType: 'banner',
        size: '*'
      })).to.be.true;

      // banner and instream (POST will only include video)
      expect(bidRequests[5].getFloor.calledWith({
        currency: 'USD',
        mediaType: 'video',
        size: '*'
      })).to.be.true;
    });
    it('should catch error if getFloor throws error', function() {
      bidRequests[0].getFloor = () => {
        throw new Error('An exception!');
      };

      tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);

      expect(logErrorSpy.calledOnce).to.equal(true);
    });
    it('should add ortb2 ext object if global fpd is available', function() {
      const ortb2 = {
        site: {
          domain: 'page.example.com',
          cat: ['IAB2'],
          sectioncat: ['IAB2-2'],
          pagecat: ['IAB2-2'],
          page: 'https://page.example.com/here.html',
        },
        user: {
          yob: 1985,
          gender: 'm',
          keywords: 'a,b',
          data: [
            {
              name: 'dataprovider.com',
              ext: { segtax: 4 },
              segment: [{ id: '1' }]
            }
          ],
          ext: {
            data: {
              registered: true,
              interests: ['cars']
            }
          }
        }
      };

      const request = tripleliftAdapterSpec.buildRequests(bidRequests, {...bidderRequest, ortb2});
      const { data: payload } = request;
      expect(payload.ext.ortb2).to.exist;
      expect(payload.ext.ortb2.site).to.deep.equal({
        domain: 'page.example.com',
        cat: ['IAB2'],
        sectioncat: ['IAB2-2'],
        pagecat: ['IAB2-2'],
        page: 'https://page.example.com/here.html',
      });
    });
    it('should send global config fpd if kvps are available', function() {
      const sens = null;
      const category = ['news', 'weather', 'hurricane'];
      const pmp_elig = 'true';
      const ortb2 = {
        site: {
          pmp_elig: pmp_elig,
          ext: {
            data: {
              category: category
            }
          }
        },
        user: {
          sens: sens,
        }
      }
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, {...bidderRequest, ortb2});
      const { data: payload } = request;
      expect(payload.ext.fpd.user).to.not.exist;
      expect(payload.ext.fpd.context.ext.data).to.haveOwnProperty('category');
      expect(payload.ext.fpd.context).to.haveOwnProperty('pmp_elig');
    });
    it('should send ad unit fpd if kvps are available', function() {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[1].fpd.context).to.haveOwnProperty('data');
      expect(request.data.imp[1].fpd.context.data).to.haveOwnProperty('pbAdSlot');
      expect(request.data.imp[1].fpd.context.data).to.haveOwnProperty('adUnitSpecificAttribute');
      expect(request.data.imp[2].fpd).to.not.exist;
    });
    it('should send 1PlusX data as fpd if localStorage is available and no other fpd is defined', function() {
      sandbox.stub(storage, 'getDataFromLocalStorage').callsFake(() => '{"kid":1,"s":"ySRdArquXuBolr/cVv0UNqrJhTO4QZsbNH/t+2kR3gXjbA==","t":"/yVtBrquXuBolr/cVv0UNtx1mssdLYeKFhWFI3Dq1dJnug=="}');
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.ext.fpd).to.deep.equal({
        'user': {
          'data': [
            {
              'name': 'www.1plusx.com',
              'ext': {
                'kid': 1,
                's': 'ySRdArquXuBolr/cVv0UNqrJhTO4QZsbNH/t+2kR3gXjbA==',
                't': '/yVtBrquXuBolr/cVv0UNtx1mssdLYeKFhWFI3Dq1dJnug=='
              }
            }
          ]
        }
      })
    });
    it('should append 1PlusX data to existing user.data entries if localStorage is available', function() {
      bidderRequest.ortb2 = {
        user: {
          data: [
            { name: 'dataprovider.com', ext: { segtax: 4 }, segment: [{ id: '1' }] }
          ]
        }
      }
      sandbox.stub(storage, 'getDataFromLocalStorage').callsFake(() => '{"kid":1,"s":"ySRdArquXuBolr/cVv0UNqrJhTO4QZsbNH/t+2kR3gXjbA==","t":"/yVtBrquXuBolr/cVv0UNtx1mssdLYeKFhWFI3Dq1dJnug=="}');
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.ext.fpd).to.deep.equal({
        'user': {
          'data': [
            { 'name': 'dataprovider.com', 'ext': { 'segtax': 4 }, 'segment': [{ 'id': '1' }] },
            {
              'name': 'www.1plusx.com',
              'ext': {
                'kid': 1,
                's': 'ySRdArquXuBolr/cVv0UNqrJhTO4QZsbNH/t+2kR3gXjbA==',
                't': '/yVtBrquXuBolr/cVv0UNtx1mssdLYeKFhWFI3Dq1dJnug=='
              }
            }
          ]
        }
      })
    });
    it('should not append anything if getDataFromLocalStorage returns null', function() {
      bidderRequest.ortb2 = {
        user: {
          data: [
            { name: 'dataprovider.com', ext: { segtax: 4 }, segment: [{ id: '1' }] }
          ]
        }
      }
      sandbox.stub(storage, 'getDataFromLocalStorage').callsFake(() => null);
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.ext.fpd).to.deep.equal({
        'user': {
          'data': [
            { 'name': 'dataprovider.com', 'ext': { 'segtax': 4 }, 'segment': [{ 'id': '1' }] },
          ]
        }
      })
    });
    it('should add gpp consent data to bid request object if gpp data exists', function() {
      bidderRequest.ortb2 = {
        regs: {
          'gpp': 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
          'gpp_sid': [7]
        }
      }
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.regs).to.deep.equal({
        'gpp': 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        'gpp_sid': [7]
      })
    });
    it('should cast playbackmethod as an array if it is an integer and it exists', function() {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[1].video.playbackmethod).to.be.a('array');
      expect(request.data.imp[1].video.playbackmethod).to.deep.equal([5]);
    });
    it('should set playbackmethod as an array if it exists as an array', function() {
      const request = tripleliftAdapterSpec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.imp[5].video.playbackmethod).to.be.a('array');
      expect(request.data.imp[5].video.playbackmethod).to.deep.equal([1, 2, 3]);
    });
  });

  describe('interpretResponse', function () {
    let response, bidderRequest;
    this.beforeEach(() => {
      response = {
        body: {
          bids: [
            {
              imp_id: 0,
              cpm: 1.062,
              width: 300,
              height: 250,
              ad: 'ad-markup',
              iurl: 'https://s.adroll.com/a/IYR/N36/IYRN366MFVDITBAGNNT5U6.jpg',
              tl_source: 'tlx',
              advertiser_name: 'fake advertiser name',
              adomain: ['basspro.com', 'internetalerts.org'],
              media_type: 'banner'
            },
            {
              imp_id: 1,
              crid: '10092_76480_i2j6qm8u',
              cpm: 9.99,
              ad: '<VAST version="2.0"><Ad id="gsen95th"><Wrapper><Error><![CDATA[https://eb2.3lift.net/ive?aid=156025986241697082890&bmid=10092&bsid=76480&crid=10092_76480_i2j6qm8u&e=[ERRORCODE]]]></Error><Impression><![CDATA[https://eb2.3lift.net/r?rr=creative&bc=0.011&uid=8217096503606905723&pr=%24%7BAUCTION_PRICE%7D&brid=554350&bmid=10092&biid=10066&aid=156025986241697082890&bcud=11&sid=76480&ts=1593552049&fid=11]]></Impression><Impression><![CDATA[https://tlx.3lift.net/header/notify?px=1&pr=${AUCTION_PRICE}&ts=1593552049&aid=156025986241697082890&ec=10092_76480_i2j6qm8u&n=GgDyAqABCAASFTE1NjAyNTk4NjI0MTY5NzA4Mjg5MBgAIAEo7E4wwNUEQAFIAFAAYAtogIAEcO7qIZABAJgBAKgBALABC7gBAMABCsgBC%2BABCvABAPgBlo0GgAL%2FlwWIAgqRAgAAAAAAAPA%2FmQIzMzMzMzPDP6ECAAAAAAAAAACoAgCwAgDIAgTYAgDxAmZmZmZmZuY%2F%2BALSTpADAJgDAKADAKgDA%2FgCDIgDAJIDBDEyMzQ%3D]]></Impression><AdSystem version="1.0">The Trade Desk</AdSystem><VASTAdTagURI><![CDATA[https://insight.adsrvr.org/enduser/vast/?iid=590299b9-1817-4859-a2af-ef007bb4c78e&crid=gsen95th&wp=0.011&aid=1&wpc=USD&sfe=10fba14e&puid=&tdid=&pid=13hzg59&ag=l2w0772&adv=ct0nqrx&sig=1BGM_YxB0HAcl-s55S_NKIu-oLW94YpTn_DjMRmdWHzs.&bp=0.3&cf=1448159&fq=0&td_s=388389451&rcats=&mcat=&mste=&mfld=2&mssi=None&mfsi=ve35dsnkwp&uhow=75&agsa=&rgco=South%20Korea&rgre=Gyeonggi-do&rgme=&rgci=Ansan-si&rgz=15345&svbttd=1&dt=Mobile&osf=iOS&os=iOS134&br=WebView&rlangs=01&mlang=&svpid=7453-EB&did=&rcxt=InApp&lat=37.324400&lon=126.823700&tmpc=9.66&daid=d7804da7-147b-421d-bb44-60ad3ac32681&vp=0&osi=&osv=&svscid=388389451&bffi=41&mk=Apple&mdl=iPhone&vpb=PreRoll&dc=14&vcc=EDwYPDICCAI6BAgBCAJAAUgBUASIAQKgAZ4DqAGwBsgBAdABA-gBAoACA4oCCAgCCAMIBQgGmgIICAMIBQgGCAegAgKoAgGwAgC4AgDAAgE.&sv=triplelift&pidi=3584&advi=270782&cmpi=1319400&agi=6167705&cridi=13268739&svi=70&cmp=a9nj9ex&tsig=tlN4j1OujX9nrFakJmfpTuNNfg-D0qArlSjjNAb8tLg.&c=MAQ4AEgAUAc.&dur=&crrelr=&adpt=tl_ltriplelift&ipl=39250&fpa=826&pcm=3&said=40286845772363793660&ict=Unknown&auct=1&im=1]]></VASTAdTagURI><Creatives><Creative><Linear><VideoClicks><ClickTracking><![CDATA[https://eb2.3lift.net/ec?aid=156025986241697082890]]></ClickTracking></VideoClicks><TrackingEvents><Tracking event="mute"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=5]]></Tracking><Tracking event="unmute"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=6]]></Tracking><Tracking event="expand"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=7]]></Tracking><Tracking event="collapse"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=8]]></Tracking><Tracking event="pause"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=14]]></Tracking><Tracking event="resume"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=15]]></Tracking><Tracking event="fullscreen"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=16]]></Tracking><Tracking event="exitFullscreen"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=17]]></Tracking><Tracking event="skip"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=18]]></Tracking><Tracking event="start"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=7]]></Tracking><Tracking event="firstQuartile"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=1]]></Tracking><Tracking event="midpoint"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=2]]></Tracking><Tracking event="thirdQuartile"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=3]]></Tracking><Tracking event="complete"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=4]]></Tracking><Tracking event="progress" offset="00:00:02"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=1]]></Tracking><Tracking event="progress" offset="00:00:03"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=2]]></Tracking><Tracking event="progress" offset="00:00:05"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=3]]></Tracking><Tracking event="progress" offset="00:00:10"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=4]]></Tracking><Tracking event="progress" offset="00:00:15"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=5]]></Tracking><Tracking event="progress" offset="00:00:30"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=6]]></Tracking></TrackingEvents></Linear></Creative></Creatives></Wrapper></Ad></VAST>',
              tl_source: 'hdx',
              media_type: 'video'
            },
            // video bid on banner+outstream request
            {
              imp_id: 2,
              crid: '5989_33264_352817187',
              cpm: 20,
              ad: '<VAST xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.0" xsi:noNamespaceSchemaLocation="vast.xsd">\n  <Ad id="21641499">\n  \t<Wrapper><Error><![CDATA[https://eb2.3lift.com/sce?aid=148508128401385324170&inv_code=testing_mobile_outstream&e=[ERRORCODE]&block=video]]>',
              tl_source: 'hdx',
              advertiser_name: 'zennioptical.com',
              adomain: ['zennioptical.com'],
              media_type: 'video'
            },
            // banner bid on banner+outstream request
            {
              imp_id: 3,
              crid: '5989_33264_352817187',
              cpm: 20,
              width: 970,
              height: 250,
              ad: 'ad-markup',
              tl_source: 'hdx',
              advertiser_name: 'zennioptical.com',
              adomain: ['zennioptical.com'],
              media_type: 'banner'
            }
          ]
        }
      };
      bidderRequest = {
        bidderCode: 'triplelift',
        auctionId: 'a7ebcd1d-66ff-4b5c-a82c-6a21a6ee5a18',
        bidderRequestId: '5c55612f99bc11',
        bids: [
          {
            imp_id: 0,
            cpm: 1.062,
            width: 300,
            height: 250,
            ad: 'ad-markup',
            iurl: 'https://s.adroll.com/a/IYR/N36/IYRN366MFVDITBAGNNT5U6.jpg',
            tl_source: 'tlx',
            mediaTypes: {
              banner: {
                sizes: [
                  [970, 250],
                  [1, 1]
                ]
              }
            },
            bidId: '30b31c1838de1e'
          },
          {
            imp_id: 1,
            crid: '10092_76480_i2j6qm8u',
            cpm: 9.99,
            ad: '<VAST version="2.0"><Ad id="gsen95th"><Wrapper><Error><![CDATA[https://eb2.3lift.net/ive?aid=156025986241697082890&bmid=10092&bsid=76480&crid=10092_76480_i2j6qm8u&e=[ERRORCODE]]]></Error><Impression><![CDATA[https://eb2.3lift.net/r?rr=creative&bc=0.011&uid=8217096503606905723&pr=%24%7BAUCTION_PRICE%7D&brid=554350&bmid=10092&biid=10066&aid=156025986241697082890&bcud=11&sid=76480&ts=1593552049&fid=11]]></Impression><Impression><![CDATA[https://tlx.3lift.net/header/notify?px=1&pr=${AUCTION_PRICE}&ts=1593552049&aid=156025986241697082890&ec=10092_76480_i2j6qm8u&n=GgDyAqABCAASFTE1NjAyNTk4NjI0MTY5NzA4Mjg5MBgAIAEo7E4wwNUEQAFIAFAAYAtogIAEcO7qIZABAJgBAKgBALABC7gBAMABCsgBC%2BABCvABAPgBlo0GgAL%2FlwWIAgqRAgAAAAAAAPA%2FmQIzMzMzMzPDP6ECAAAAAAAAAACoAgCwAgDIAgTYAgDxAmZmZmZmZuY%2F%2BALSTpADAJgDAKADAKgDA%2FgCDIgDAJIDBDEyMzQ%3D]]></Impression><AdSystem version="1.0">The Trade Desk</AdSystem><VASTAdTagURI><![CDATA[https://insight.adsrvr.org/enduser/vast/?iid=590299b9-1817-4859-a2af-ef007bb4c78e&crid=gsen95th&wp=0.011&aid=1&wpc=USD&sfe=10fba14e&puid=&tdid=&pid=13hzg59&ag=l2w0772&adv=ct0nqrx&sig=1BGM_YxB0HAcl-s55S_NKIu-oLW94YpTn_DjMRmdWHzs.&bp=0.3&cf=1448159&fq=0&td_s=388389451&rcats=&mcat=&mste=&mfld=2&mssi=None&mfsi=ve35dsnkwp&uhow=75&agsa=&rgco=South%20Korea&rgre=Gyeonggi-do&rgme=&rgci=Ansan-si&rgz=15345&svbttd=1&dt=Mobile&osf=iOS&os=iOS134&br=WebView&rlangs=01&mlang=&svpid=7453-EB&did=&rcxt=InApp&lat=37.324400&lon=126.823700&tmpc=9.66&daid=d7804da7-147b-421d-bb44-60ad3ac32681&vp=0&osi=&osv=&svscid=388389451&bffi=41&mk=Apple&mdl=iPhone&vpb=PreRoll&dc=14&vcc=EDwYPDICCAI6BAgBCAJAAUgBUASIAQKgAZ4DqAGwBsgBAdABA-gBAoACA4oCCAgCCAMIBQgGmgIICAMIBQgGCAegAgKoAgGwAgC4AgDAAgE.&sv=triplelift&pidi=3584&advi=270782&cmpi=1319400&agi=6167705&cridi=13268739&svi=70&cmp=a9nj9ex&tsig=tlN4j1OujX9nrFakJmfpTuNNfg-D0qArlSjjNAb8tLg.&c=MAQ4AEgAUAc.&dur=&crrelr=&adpt=tl_ltriplelift&ipl=39250&fpa=826&pcm=3&said=40286845772363793660&ict=Unknown&auct=1&im=1]]></VASTAdTagURI><Creatives><Creative><Linear><VideoClicks><ClickTracking><![CDATA[https://eb2.3lift.net/ec?aid=156025986241697082890]]></ClickTracking></VideoClicks><TrackingEvents><Tracking event="mute"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=5]]></Tracking><Tracking event="unmute"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=6]]></Tracking><Tracking event="expand"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=7]]></Tracking><Tracking event="collapse"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=8]]></Tracking><Tracking event="pause"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=14]]></Tracking><Tracking event="resume"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=15]]></Tracking><Tracking event="fullscreen"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=16]]></Tracking><Tracking event="exitFullscreen"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=17]]></Tracking><Tracking event="skip"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=18]]></Tracking><Tracking event="start"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=7]]></Tracking><Tracking event="firstQuartile"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=1]]></Tracking><Tracking event="midpoint"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=2]]></Tracking><Tracking event="thirdQuartile"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=3]]></Tracking><Tracking event="complete"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=4]]></Tracking><Tracking event="progress" offset="00:00:02"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=1]]></Tracking><Tracking event="progress" offset="00:00:03"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=2]]></Tracking><Tracking event="progress" offset="00:00:05"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=3]]></Tracking><Tracking event="progress" offset="00:00:10"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=4]]></Tracking><Tracking event="progress" offset="00:00:15"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=5]]></Tracking><Tracking event="progress" offset="00:00:30"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=6]]></Tracking></TrackingEvents></Linear></Creative></Creatives></Wrapper></Ad></VAST>',
            tlx_source: 'hdx',
            mediaTypes: {
              video: {
                context: 'instream',
                playerSize: [640, 480]
              }
            },
            bidId: '30b31c1838de1e'
          },
          // banner and outstream
          {
            bidder: 'triplelift',
            params: {
              inventoryCode: 'testing_desktop_outstream',
              floor: 1
            },
            nativeParams: {},
            mediaTypes: {
              video: {
                context: 'outstream',
                playerSize: [[640, 480]],
                mimes: ['video/mp4'],
                protocols: [1, 2, 3, 4, 5, 6, 7, 8],
                playbackmethod: [2],
                skip: 1
              },
              banner: {
                sizes: [
                  [728, 90],
                  [970, 250],
                  [970, 90]
                ]
              },
              native: {}
            },
            adUnitCode: 'video-outstream',
            transactionId: '135061c3-f546-4e28-8a07-44c2fb58a958',
            sizes: [
              [728, 90],
              [970, 250],
              [970, 90]
            ],
            bidId: '73edc0ba8de203',
            bidderRequestId: '3d81143328560b',
            auctionId: 'f6427dc0-b954-4010-a76c-d498380796a2',
            src: 'client',
            bidRequestsCount: 2,
            bidderRequestsCount: 2,
            bidderWinsCount: 0
          },
          // banner and outstream
          {
            bidder: 'triplelift',
            params: {
              inventoryCode: 'testing_desktop_outstream',
              floor: 1
            },
            nativeParams: {},
            mediaTypes: {
              video: {
                context: 'outstream',
                playerSize: [[640, 480]],
                mimes: ['video/mp4'],
                protocols: [1, 2, 3, 4, 5, 6, 7, 8],
                playbackmethod: [2],
                skip: 1
              },
              banner: {
                sizes: [
                  [728, 90],
                  [970, 250],
                  [970, 90]
                ]
              },
              native: {}
            },
            adUnitCode: 'video-outstream',
            transactionId: '135061c3-f546-4e28-8a07-44c2fb58a958',
            sizes: [
              [728, 90],
              [970, 250],
              [970, 90]
            ],
            bidId: '73edc0ba8de203',
            bidderRequestId: '3d81143328560b',
            auctionId: 'f6427dc0-b954-4010-a76c-d498380796a2',
            src: 'client',
            bidRequestsCount: 2,
            bidderRequestsCount: 2,
            bidderWinsCount: 0
          }
        ],
        refererInfo: {
          referer: 'https://examplereferer.com'
        },
        gdprConsent: {
          consentString: GDPR_CONSENT_STR,
          gdprApplies: true
        }
      };
    })

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          requestId: '30b31c1838de1e',
          cpm: 1.062,
          width: 300,
          height: 250,
          netRevenue: true,
          ad: 'ad-markup',
          creativeId: 29681110,
          dealId: '',
          currency: 'USD',
          ttl: 33,
          tl_source: 'tlx',
          meta: {}
        },
        {
          requestId: '30b31c1838de1e',
          cpm: 1.062,
          width: 300,
          height: 250,
          netRevenue: true,
          ad: '<VAST version=\"2.0\"><Ad id=\"gsen95th\"><Wrapper><Error><![CDATA[https://eb2.3lift.net/ive?aid=156025986241697082890&bmid=10092&bsid=76480&crid=10092_76480_i2j6qm8u&e=[ERRORCODE]]]></Error><Impression><![CDATA[https://eb2.3lift.net/r?rr=creative&bc=0.011&uid=8217096503606905723&pr=%24%7BAUCTION_PRICE%7D&brid=554350&bmid=10092&biid=10066&aid=156025986241697082890&bcud=11&sid=76480&ts=1593552049&fid=11]]></Impression><Impression><![CDATA[https://tlx.3lift.net/header/notify?px=1&pr=${AUCTION_PRICE}&ts=1593552049&aid=156025986241697082890&ec=10092_76480_i2j6qm8u&n=GgDyAqABCAASFTE1NjAyNTk4NjI0MTY5NzA4Mjg5MBgAIAEo7E4wwNUEQAFIAFAAYAtogIAEcO7qIZABAJgBAKgBALABC7gBAMABCsgBC%2BABCvABAPgBlo0GgAL%2FlwWIAgqRAgAAAAAAAPA%2FmQIzMzMzMzPDP6ECAAAAAAAAAACoAgCwAgDIAgTYAgDxAmZmZmZmZuY%2F%2BALSTpADAJgDAKADAKgDA%2FgCDIgDAJIDBDEyMzQ%3D]]></Impression><AdSystem version=\"1.0\">The Trade Desk</AdSystem><VASTAdTagURI><![CDATA[https://insight.adsrvr.org/enduser/vast/?iid=590299b9-1817-4859-a2af-ef007bb4c78e&crid=gsen95th&wp=0.011&aid=1&wpc=USD&sfe=10fba14e&puid=&tdid=&pid=13hzg59&ag=l2w0772&adv=ct0nqrx&sig=1BGM_YxB0HAcl-s55S_NKIu-oLW94YpTn_DjMRmdWHzs.&bp=0.3&cf=1448159&fq=0&td_s=388389451&rcats=&mcat=&mste=&mfld=2&mssi=None&mfsi=ve35dsnkwp&uhow=75&agsa=&rgco=South%20Korea&rgre=Gyeonggi-do&rgme=&rgci=Ansan-si&rgz=15345&svbttd=1&dt=Mobile&osf=iOS&os=iOS134&br=WebView&rlangs=01&mlang=&svpid=7453-EB&did=&rcxt=InApp&lat=37.324400&lon=126.823700&tmpc=9.66&daid=d7804da7-147b-421d-bb44-60ad3ac32681&vp=0&osi=&osv=&svscid=388389451&bffi=41&mk=Apple&mdl=iPhone&vpb=PreRoll&dc=14&vcc=EDwYPDICCAI6BAgBCAJAAUgBUASIAQKgAZ4DqAGwBsgBAdABA-gBAoACA4oCCAgCCAMIBQgGmgIICAMIBQgGCAegAgKoAgGwAgC4AgDAAgE.&sv=triplelift&pidi=3584&advi=270782&cmpi=1319400&agi=6167705&cridi=13268739&svi=70&cmp=a9nj9ex&tsig=tlN4j1OujX9nrFakJmfpTuNNfg-D0qArlSjjNAb8tLg.&c=MAQ4AEgAUAc.&dur=&crrelr=&adpt=tl_ltriplelift&ipl=39250&fpa=826&pcm=3&said=40286845772363793660&ict=Unknown&auct=1&im=1]]></VASTAdTagURI><Creatives><Creative><Linear><VideoClicks><ClickTracking><![CDATA[https://eb2.3lift.net/ec?aid=156025986241697082890]]></ClickTracking></VideoClicks><TrackingEvents><Tracking event=\"mute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=5]]></Tracking><Tracking event=\"unmute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=6]]></Tracking><Tracking event=\"expand\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=7]]></Tracking><Tracking event=\"collapse\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=8]]></Tracking><Tracking event=\"pause\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=14]]></Tracking><Tracking event=\"resume\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=15]]></Tracking><Tracking event=\"fullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=16]]></Tracking><Tracking event=\"exitFullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=17]]></Tracking><Tracking event=\"skip\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=18]]></Tracking><Tracking event=\"start\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=7]]></Tracking><Tracking event=\"firstQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=1]]></Tracking><Tracking event=\"midpoint\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=2]]></Tracking><Tracking event=\"thirdQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=3]]></Tracking><Tracking event=\"complete\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:02\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=1]]></Tracking><Tracking event=\"progress\" offset=\"00:00:03\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=2]]></Tracking><Tracking event=\"progress\" offset=\"00:00:05\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=3]]></Tracking><Tracking event=\"progress\" offset=\"00:00:10\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:15\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=5]]></Tracking><Tracking event=\"progress\" offset=\"00:00:30\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=6]]></Tracking></TrackingEvents></Linear></Creative></Creatives></Wrapper></Ad></VAST>',
          creativeId: 29681110,
          dealId: '',
          currency: 'USD',
          ttl: 33,
          tl_source: 'hdx',
          mediaType: 'video',
          vastXml: '<VAST version=\"2.0\"><Ad id=\"gsen95th\"><Wrapper><Error><![CDATA[https://eb2.3lift.net/ive?aid=156025986241697082890&bmid=10092&bsid=76480&crid=10092_76480_i2j6qm8u&e=[ERRORCODE]]]></Error><Impression><![CDATA[https://eb2.3lift.net/r?rr=creative&bc=0.011&uid=8217096503606905723&pr=%24%7BAUCTION_PRICE%7D&brid=554350&bmid=10092&biid=10066&aid=156025986241697082890&bcud=11&sid=76480&ts=1593552049&fid=11]]></Impression><Impression><![CDATA[https://tlx.3lift.net/header/notify?px=1&pr=${AUCTION_PRICE}&ts=1593552049&aid=156025986241697082890&ec=10092_76480_i2j6qm8u&n=GgDyAqABCAASFTE1NjAyNTk4NjI0MTY5NzA4Mjg5MBgAIAEo7E4wwNUEQAFIAFAAYAtogIAEcO7qIZABAJgBAKgBALABC7gBAMABCsgBC%2BABCvABAPgBlo0GgAL%2FlwWIAgqRAgAAAAAAAPA%2FmQIzMzMzMzPDP6ECAAAAAAAAAACoAgCwAgDIAgTYAgDxAmZmZmZmZuY%2F%2BALSTpADAJgDAKADAKgDA%2FgCDIgDAJIDBDEyMzQ%3D]]></Impression><AdSystem version=\"1.0\">The Trade Desk</AdSystem><VASTAdTagURI><![CDATA[https://insight.adsrvr.org/enduser/vast/?iid=590299b9-1817-4859-a2af-ef007bb4c78e&crid=gsen95th&wp=0.011&aid=1&wpc=USD&sfe=10fba14e&puid=&tdid=&pid=13hzg59&ag=l2w0772&adv=ct0nqrx&sig=1BGM_YxB0HAcl-s55S_NKIu-oLW94YpTn_DjMRmdWHzs.&bp=0.3&cf=1448159&fq=0&td_s=388389451&rcats=&mcat=&mste=&mfld=2&mssi=None&mfsi=ve35dsnkwp&uhow=75&agsa=&rgco=South%20Korea&rgre=Gyeonggi-do&rgme=&rgci=Ansan-si&rgz=15345&svbttd=1&dt=Mobile&osf=iOS&os=iOS134&br=WebView&rlangs=01&mlang=&svpid=7453-EB&did=&rcxt=InApp&lat=37.324400&lon=126.823700&tmpc=9.66&daid=d7804da7-147b-421d-bb44-60ad3ac32681&vp=0&osi=&osv=&svscid=388389451&bffi=41&mk=Apple&mdl=iPhone&vpb=PreRoll&dc=14&vcc=EDwYPDICCAI6BAgBCAJAAUgBUASIAQKgAZ4DqAGwBsgBAdABA-gBAoACA4oCCAgCCAMIBQgGmgIICAMIBQgGCAegAgKoAgGwAgC4AgDAAgE.&sv=triplelift&pidi=3584&advi=270782&cmpi=1319400&agi=6167705&cridi=13268739&svi=70&cmp=a9nj9ex&tsig=tlN4j1OujX9nrFakJmfpTuNNfg-D0qArlSjjNAb8tLg.&c=MAQ4AEgAUAc.&dur=&crrelr=&adpt=tl_ltriplelift&ipl=39250&fpa=826&pcm=3&said=40286845772363793660&ict=Unknown&auct=1&im=1]]></VASTAdTagURI><Creatives><Creative><Linear><VideoClicks><ClickTracking><![CDATA[https://eb2.3lift.net/ec?aid=156025986241697082890]]></ClickTracking></VideoClicks><TrackingEvents><Tracking event=\"mute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=5]]></Tracking><Tracking event=\"unmute\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=6]]></Tracking><Tracking event=\"expand\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=7]]></Tracking><Tracking event=\"collapse\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=8]]></Tracking><Tracking event=\"pause\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=14]]></Tracking><Tracking event=\"resume\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=15]]></Tracking><Tracking event=\"fullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=16]]></Tracking><Tracking event=\"exitFullscreen\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=17]]></Tracking><Tracking event=\"skip\"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=18]]></Tracking><Tracking event=\"start\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=7]]></Tracking><Tracking event=\"firstQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=1]]></Tracking><Tracking event=\"midpoint\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=2]]></Tracking><Tracking event=\"thirdQuartile\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=3]]></Tracking><Tracking event=\"complete\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:02\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=1]]></Tracking><Tracking event=\"progress\" offset=\"00:00:03\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=2]]></Tracking><Tracking event=\"progress\" offset=\"00:00:05\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=3]]></Tracking><Tracking event=\"progress\" offset=\"00:00:10\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=4]]></Tracking><Tracking event=\"progress\" offset=\"00:00:15\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=5]]></Tracking><Tracking event=\"progress\" offset=\"00:00:30\"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=6]]></Tracking></TrackingEvents></Linear></Creative></Creatives></Wrapper></Ad></VAST>',
          meta: {}
        }
      ];
      let result = tripleliftAdapterSpec.interpretResponse(response, {bidderRequest});
      expect(result).to.have.length(4);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      expect(Object.keys(result[1])).to.have.members(Object.keys(expectedResponse[1]));
      expect(result[0].ttl).to.equal(300);
      expect(result[1].ttl).to.equal(3600);
    });

    it('should identify format of bid and respond accordingly', function() {
      let result = tripleliftAdapterSpec.interpretResponse(response, {bidderRequest});
      expect(result[0].meta.mediaType).to.equal('native');
      expect(result[1].mediaType).to.equal('video');
      expect(result[1].meta.mediaType).to.equal('video');
      // video bid on banner+outstream request
      expect(result[2].mediaType).to.equal('video');
      expect(result[2].meta.mediaType).to.equal('video');
      expect(result[2].vastXml).to.include('aid=148508128401385324170&inv_code=testing_mobile_outstream');
      // banner bid on banner+outstream request
      expect(result[3].meta.mediaType).to.equal('banner');
    })

    it('should return multiple responses to support SRA', function () {
      let result = tripleliftAdapterSpec.interpretResponse(response, {bidderRequest});
      expect(result).to.have.length(4);
    });

    it('should include the advertiser name in the meta field if available', function () {
      let result = tripleliftAdapterSpec.interpretResponse(response, {bidderRequest});
      expect(result[0].meta.advertiserName).to.equal('fake advertiser name');
      expect(result[1].meta).to.not.have.key('advertiserName');
    });

    it('should include the advertiser domain array in the meta field if available', function () {
      let result = tripleliftAdapterSpec.interpretResponse(response, {bidderRequest});
      expect(result[0].meta.advertiserDomains[0]).to.equal('basspro.com');
      expect(result[0].meta.advertiserDomains[1]).to.equal('internetalerts.org');
      expect(result[1].meta).to.not.have.key('advertiserDomains');
    });

    it('should include networkId in the meta field if available', function () {
      let result = tripleliftAdapterSpec.interpretResponse(response, {bidderRequest});
      expect(result[1].meta.networkId).to.equal('10092');
      expect(result[2].meta.networkId).to.equal('5989');
      expect(result[3].meta.networkId).to.equal('5989');
    });

    it('should return fledgeAuctionConfigs if PAAPI response is received', function() {
      response.body.paapi = [
        {
          imp_id: '0',
          auctionConfig: {
            seller: 'https://3lift.com',
            decisionLogicUrl: 'https://3lift.com/decision_logic.js',
            interestGroupBuyers: ['https://some_buyer.com'],
            perBuyerSignals: {
              'https://some_buyer.com': { a: 1 }
            }
          }
        },
        {
          imp_id: '2',
          auctionConfig: {
            seller: 'https://3lift.com',
            decisionLogicUrl: 'https://3lift.com/decision_logic.js',
            interestGroupBuyers: ['https://some_other_buyer.com'],
            perBuyerSignals: {
              'https://some_other_buyer.com': { b: 2 }
            }
          }
        }
      ];

      let result = tripleliftAdapterSpec.interpretResponse(response, {bidderRequest});

      expect(result).to.have.property('bids');
      expect(result).to.have.property('fledgeAuctionConfigs');
      expect(result.fledgeAuctionConfigs.length).to.equal(2);
      expect(result.fledgeAuctionConfigs[0].bidId).to.equal('30b31c1838de1e');
      expect(result.fledgeAuctionConfigs[1].bidId).to.equal('73edc0ba8de203');
      expect(result.fledgeAuctionConfigs[0].config).to.deep.equal(
        {
          'seller': 'https://3lift.com',
          'decisionLogicUrl': 'https://3lift.com/decision_logic.js',
          'interestGroupBuyers': ['https://some_buyer.com'],
          'perBuyerSignals': { 'https://some_buyer.com': { 'a': 1 } }
        }
      );
      expect(result.fledgeAuctionConfigs[1].config).to.deep.equal(
        {
          'seller': 'https://3lift.com',
          'decisionLogicUrl': 'https://3lift.com/decision_logic.js',
          'interestGroupBuyers': ['https://some_other_buyer.com'],
          'perBuyerSignals': { 'https://some_other_buyer.com': { 'b': 2 } }
        }
      );
    });
  });

  describe('getUserSyncs', function() {
    let expectedIframeSyncUrl = 'https://eb2.3lift.com/sync?gdpr=true&cmp_cs=' + GDPR_CONSENT_STR + '&';
    let expectedImageSyncUrl = 'https://eb2.3lift.com/sync?px=1&src=prebid&gdpr=true&cmp_cs=' + GDPR_CONSENT_STR + '&';
    let expectedGppSyncUrl = 'https://eb2.3lift.com/sync?gdpr=true&cmp_cs=' + GDPR_CONSENT_STR + '&gpp=' + GPP_CONSENT_STR + '&gpp_sid=2%2C8' + '&';

    it('returns undefined when syncing is not enabled', function() {
      expect(tripleliftAdapterSpec.getUserSyncs({})).to.equal(undefined);
      expect(tripleliftAdapterSpec.getUserSyncs()).to.equal(undefined);
    });

    it('returns iframe user sync pixel when iframe syncing is enabled', function() {
      let syncOptions = {
        iframeEnabled: true
      };
      let result = tripleliftAdapterSpec.getUserSyncs(syncOptions);
      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.equal(expectedIframeSyncUrl);
    });

    it('returns image user sync pixel when iframe syncing is disabled', function() {
      let syncOptions = {
        pixelEnabled: true
      };
      let result = tripleliftAdapterSpec.getUserSyncs(syncOptions);
      expect(result[0].type).to.equal('image')
      expect(result[0].url).to.equal(expectedImageSyncUrl);
    });

    it('returns iframe user sync pixel when both options are enabled', function() {
      let syncOptions = {
        pixelEnabled: true,
        iframeEnabled: true
      };
      let result = tripleliftAdapterSpec.getUserSyncs(syncOptions);
      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.equal(expectedIframeSyncUrl);
    });
    it('sends us_privacy param when info is available', function() {
      let syncOptions = {
        iframeEnabled: true
      };
      let result = tripleliftAdapterSpec.getUserSyncs(syncOptions, null, null, '1YYY', null);
      expect(result[0].url).to.match(/(\?|&)us_privacy=1YYY/);
    });
    it('returns a user sync pixel with GPP signals when available', function() {
      let syncOptions = {
        iframeEnabled: true
      };
      let gppConsent = {
        'applicableSections': [2, 8],
        'gppString': 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN'
      }
      let result = tripleliftAdapterSpec.getUserSyncs(syncOptions, null, null, null, gppConsent);
      expect(result[0].url).to.equal(expectedGppSyncUrl);
    });
  });
});
