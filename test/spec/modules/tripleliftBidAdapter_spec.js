import { expect } from 'chai';

import { getGlobal } from "../../../src/prebidGlobal";
import { spec, storage } from 'modules/tripleliftBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';

// load modules that register oRTB processors
import 'src/prebid.js';
import 'modules/currency.js';
import 'modules/userId/index.js';
import 'modules/multibid/index.js';
import 'modules/priceFloors.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';
import prebid from 'package.json';

const GDPR_CONSENT_STR = 'BOONm0NOONm0NABABAENAa-AAAARh7______b9_3__7_9uz_Kv_K7Vf7nnG072lPVA9LTOQ6gEaY';
const GPP_CONSENT_STR = 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN';

describe('triplelift oRTB bid adapter', function () {
  const adapter = newBidder(spec);
  let bid, instreamBid, nativeBid;

  this.beforeEach(() => {
    bid = {
      bidder: 'triplelift',
      params: {
        inventoryCode: 'banner_test',
        parentId: 'parent_test',
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
        inventoryCode: 'instream_test',
        parentId: 'parent_test',
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

    nativeBid = {
      bidder: 'triplelift',
      params: {
        inventoryCode: 'native_test',
        parentId: 'parent_test',
        floor: 2.0,
      },
      mediaTypes: {
        native: {
          ortb: {
            assets: [{
              id: 1,
              required: 1,
              img: {
                type: 3,
                w: 150,
                h: 50,
              }
            },
            {
              id: 2,
              required: 1,
              title: {
                len: 80
              }
            },
            {
              id: 3,
              required: 1,
              data: {
                type: 1
              }
            },
            {
              id: 4,
              required: 1,
              data: {
                type: 2
              }
            },
            {
              id: 6,
              required: 1,
              img: {
                type: 1,
                w: 50,
                h: 50,
              }
            }]
          }
        }
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };
  });

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('registers the expected bidder code and gvlid', function () {
      expect(spec.code).to.equal('triplelift');
      expect(spec.gvlid).to.equal(28);
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true for valid bid request', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found', function () {
      bid.params.inventoryCode = 'another_inv_code';
      bid.params.parentId = 'another_parent_id';
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found - native', function () {
      expect(spec.isBidRequestValid(nativeBid)).to.equal(true);
    });

    it('should return true when required params found - instream', function () {
      expect(spec.isBidRequestValid(instreamBid)).to.equal(true);
    });

    it('should return true when required params found - instream - 2', function () {
      delete instreamBid.mediaTypes.playerSize;
      delete instreamBid.params.video.w;
      delete instreamBid.params.video.h;
      expect(spec.isBidRequestValid(instreamBid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      delete bid.params.inventoryCode;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params are not passed - instream', function () {
      delete instreamBid.params.inventoryCode;
      expect(spec.isBidRequestValid(instreamBid)).to.equal(false);
    });

    it('should return false when required params are not passed - native', function () {
      delete nativeBid.params.inventoryCode;
      expect(spec.isBidRequestValid(nativeBid)).to.equal(false);
    });

    it('should return false when parentId is missing', function () {
      delete bid.params.parentId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when parentId is missing - instream', function () {
      delete instreamBid.params.parentId;
      expect(spec.isBidRequestValid(instreamBid)).to.equal(false);
    });

    it('should return false when parentId is missing - native', function () {
      delete nativeBid.params.parentId;
      expect(spec.isBidRequestValid(nativeBid)).to.equal(false);
    });

    it('should return false when params object is missing', function () {
      expect(spec.isBidRequestValid({ bidder: 'triplelift' })).to.equal(false);
    });

    it('should return false when bid is null or undefined', function () {
      expect(spec.isBidRequestValid(null)).to.equal(false);
      expect(spec.isBidRequestValid(undefined)).to.equal(false);
    });

    it('should return false when required params are present but empty', function () {
      // these are defined, so a `!== undefined` check would wrongly accept them
      bid.params.inventoryCode = '';
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.inventoryCode = 'inv_code_here';
      bid.params.parentId = '';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params are null', function () {
      bid.params.inventoryCode = null;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.inventoryCode = 'inv_code_here';
      bid.params.parentId = null;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should log an error identifying the ad unit when params are missing', function () {
      const logErrorSpy = sinon.spy(utils, 'logError');
      delete bid.params.inventoryCode;

      try {
        expect(spec.isBidRequestValid(bid)).to.equal(false);
        expect(logErrorSpy.calledWithMatch(/inventoryCode/)).to.equal(true);
        expect(logErrorSpy.calledWithMatch(new RegExp(bid.adUnitCode))).to.equal(true);
      } finally {
        logErrorSpy.restore();
      }
    });
  });

  describe('buildRequests', function () {
    let bidRequests;
    let bidderRequest;
    let sandbox, logErrorSpy, bidderConfigStub;

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

    beforeEach(() => {
      bidRequests = [
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: '12345',
            parentId: 'parent_test',
            publisherId: 'publisher_test',
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
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          transactionId: '173f49a8-7549-4218-a23c-e7ba59b47229',
          auctionId: '1d1a030790a475',
          userId: {},
          ortb2: {
            source: {
              ext: {
                schain
              }
            }
          },
          ortb2Imp: {
            ext: {
              tid: '173f49a8-7549-4218-a23c-e7ba59b47229',
              gpid: 'homepage-top-rect#div'
            }
          }
        },
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'instream_test',
            parentId: 'parent_test',
            publisherId: 'publisher_test',
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
          ortb2: {
            source: {
              ext: {
                schain
              }
            }
          },
          ortb2Imp: {
            ext: {
              data: {
                pbadslot: 'homepage-top-rect',
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
            parentId: 'parent_test',
            publisherId: 'publisher_test',
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
            parentId: 'parent_test',
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
          ortb2: {
            source: {
              ext: {
                schain
              }
            }
          },
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
            parentId: 'parent_test',
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
            inventoryCode: 'instream_test',
            parentId: 'parent_test',
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
        // banner and outstream video
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'outstream_test',
            parentId: 'parent_test',
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
        // outstream video only
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'outstream_test',
            parentId: 'parent_test',
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
            parentId: 'parent_test',
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
            parentId: 'parent_test',
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
            parentId: 'parent_test',
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
            parentId: 'parent_test',
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
            parentId: 'parent_test',
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
            parentId: 'parent_test',
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
        },
        // native only
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'native_test',
            parentId: 'parent_test',
            publisherId: 'publisher_test',
            floor: 1.0
          },
          mediaTypes: {
            native: {
              ortb: {
                assets: [{
                  id: 1,
                  required: 1,
                  img: {
                    type: 3,
                    w: 150,
                    h: 50,
                  }
                },
                {
                  id: 2,
                  required: 1,
                  title: {
                    len: 80
                  }
                },
                {
                  id: 3,
                  required: 1,
                  data: {
                    type: 1
                  }
                }]
              }
            }
          },
          adUnitCode: 'adunit-code-native',
          bidId: '30b31c1838de1e',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475',
          userId: {},
          schain,
        },
        // native and banner
        {
          bidder: 'triplelift',
          params: {
            inventoryCode: 'native_banner_test',
            parentId: 'parent_test',
            publisherId: 'publisher_test',
            floor: 1.0
          },
          mediaTypes: {
            native: {
              ortb: {
                assets: [{
                  id: 1,
                  required: 1,
                  img: {
                    type: 3,
                    w: 150,
                    h: 50,
                  }
                },
                {
                  id: 2,
                  required: 1,
                  title: {
                    len: 80
                  }
                },
                {
                  id: 3,
                  required: 1,
                  data: {
                    type: 1
                  }
                }]
              }
            },
            banner: {
              sizes: [
                [728, 90],
                [970, 250]
              ]
            }
          },
          adUnitCode: 'adunit-code-native',
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
            ad: '<VAST version=\"2.0\"><Ad id=\"gsen95th\"><Wrapper><Error><![CDATA[https://eb2.3lift.net/ive?aid=156025986241697082890&bmid=10092&bsid=76480&crid=10092_76480_i2j6qm8u&e=[ERRORCODE]]]></Error><Impression><![CDATA[https://eb2.3lift.net/r?rr=creative&bc=0.011&uid=8217096503606905723&pr=%24%7BAUCTION_PRICE%7D&brid=554350&bmid=10092&biid=10066&aid=156025986241697082890&bcud=11&sid=76480&ts=1593552049&fid=11]]></Impression><Impression><![CDATA[https://tlx.3lift.net/header/notify?px=1&pr=${AUCTION_PRICE}&ts=1593552049&aid=156025986241697082890&ec=10092_76480_i2j6qm8u&n=GgDyAqABCAASFTE1NjAyNTk4NjI0MTY5NzA4Mjg5MBgAIAEo7E4wwNUEQAFIAFAAYAtogIAEcO7qIZABAJgBAKgBALABC7gBAMABCsgBC%2BABCvABAPgBlo0GgAL%2FlwWIAgqRAgAAAAAAAPA%2FmQIzMzMzMzPDP6ECAAAAAAAAAACoAgCwAgDIAgTYAgDxAmZmZmZmZuY%2F%2BALSTpADAJgDAKADAKgDA%2FgCDIgDAJIDBDEyMzQ%3D]]></Impression><AdSystem version=\"1.0\">The Trade Desk</AdSystem><VASTAdTagURI><![CDATA[https://insight.adsrvr.org/enduser/vast/?iid=590299b9-1817-4859-a2af-ef007bb4c78e&crid=gsen95th&wp=0.011&aid=1&wpc=USD&sfe=10fba14e&puid=&tdid=&pid=13hzg59&ag=l2w0772&adv=ct0nqrx&sig=1BGM_YxB0HAcl-s55S_NKIu-oLW94YpTn_DjMRmdWHzs.&bp=0.3&cf=1448159&fq=0&td_s=388389451&rcats=&mcat=&mste=&mfld=2&mssi=None&mfsi=ve35dsnkwp&uhow=75&agsa=&rgco=South%20Korea&rgre=Gyeonggi-do&rgme=&rgci=Ansan-si&rgz=15345&svbttd=1&dt=Mobile&osf=iOS&os=iOS134&br=WebView&rlangs=01&mlang=&svpid=7453-EB&did=&rcxt=InApp&lat=37.324400&lon=126.823700&tmpc=9.66&daid=d7804da7-147b-421d-bb44-60ad3ac32681&vp=0&osi=&osv=&svscid=388389451&bffi=41&mk=Apple&mdl=iPhone&vpb=PreRoll&dc=14&vcc=EDwYPDICCAI6BAgBCAJAAUgBUASIAQKgAZ4DqAGwBsgBAdABA-gBAoACA4oCCAgCCAMIBQgGmgIICAMIBQgGCAegAgKoAgGwAgC4AgDAAgE.&sv=triplelift&pidi=3584&advi=270782&cmpi=1319400&agi=6167705&cridi=13268739&svi=70&cmp=a9nj9ex&tsig=tlN4j1OujX9nrFakJmfpTuNNfg-D0qArlSjjNAb8tLg.&c=MAQ4AEgAUAc.&dur=&crrelr=&adpt=tl_ltriplelift&ipl=39250&fpa=826&pcm=3&said=40286845772363793660&ict=Unknown&auct=1&im=1]]></VASTAdTagURI><Creatives><Creative><Linear><VideoClicks><ClickTracking><![CDATA[https://eb2.3lift.net/ec?aid=156025986241697082890]]></ClickTracking></VideoClicks><TrackingEvents><Tracking event="mute"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=5]]></Tracking><Tracking event="unmute"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=6]]></Tracking><Tracking event="expand"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=7]]></Tracking><Tracking event="collapse"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=8]]></Tracking><Tracking event="pause"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=14]]></Tracking><Tracking event="resume"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=15]]></Tracking><Tracking event="fullscreen"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=16]]></Tracking><Tracking event="exitFullscreen"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=17]]></Tracking><Tracking event="skip"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=18]]></Tracking><Tracking event="start"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=7]]></Tracking><Tracking event="firstQuartile"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=1]]></Tracking><Tracking event="midpoint"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=2]]></Tracking><Tracking event="thirdQuartile"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=3]]></Tracking><Tracking event="complete"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=4]]></Tracking><Tracking event="progress" offset="00:00:02"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=1]]></Tracking><Tracking event="progress" offset="00:00:03"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=2]]></Tracking><Tracking event="progress" offset="00:00:05"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=3]]></Tracking><Tracking event="progress" offset="00:00:10"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=4]]></Tracking><Tracking event="progress" offset="00:00:15"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=5]]></Tracking><Tracking event="progress" offset="00:00:30"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=6]]></Tracking></TrackingEvents></Linear></Creative></Creatives></Wrapper></Ad></VAST>',
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
        ortb2: {
          source: {
            ext: {
              schain
            }
          }
        }
      };
      sandbox = sinon.createSandbox();
      logErrorSpy = sinon.spy(utils, 'logError');
      bidderConfigStub = sinon.stub(config, 'getBidderConfig');

      getGlobal().bidderSettings = {
        triplelift: {
          storageAllowed: true
        }
      };
    });

    afterEach(() => {
      sandbox.restore();
      utils.logError.restore();
      getGlobal().bidderSettings = {};
      if (bidderConfigStub && bidderConfigStub.restore) {
        bidderConfigStub.restore();
      }
    });

    it('exists and is an object', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.be.an('array');
      expect(requests[0]).to.exist.and.to.be.a('object');
    });

    it('should enable gzip compression by default', () => {
      // Use default
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].options.endpointCompression).to.be.true;
    });

    it('should respect bidder boolean configuration set via setBidderConfig', () => {
      // Mock bidder-specific config to return false
      bidderConfigStub.returns({
        triplelift: {
          gzipEnabled: false
        }
      });

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].options.endpointCompression).to.be.false;
    });

    it('should respect bidder-specific boolean configuration set via setBidderConfig', () => {
      // Mock bidder-specific config to return true
      bidderConfigStub.returns({
        triplelift: {
          gzipEnabled: true
        }
      });

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].options.endpointCompression).to.be.true;
    });

    it('should be a post request and populate the payload', function() {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      const request = requests[0];
      const payload = request.data;

      const pbVersion = getGlobal().version.replace(/^v/, '');

      expect(request).to.exist;
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(`https://tlx.3lift.com/header/auction?lib=prebid&v=${pbVersion}&referrer=https%3A%2F%2Fexamplereferer.com&gdpr=true&cmp_cs=BOONm0NOONm0NABABAENAa-AAAARh7______b9_3__7_9uz_Kv_K7Vf7nnG072lPVA9LTOQ6gEaY`);
      expect(request.data).to.exist.and.to.be.an('object');
      // banner
      expect(payload.imp[0].tagid).to.equal('12345');
      expect(payload.imp[0].ext.parentId).to.equal('parent_test');
      expect(payload.imp[0].ext.publisherId).to.equal('publisher_test');
      expect(payload.imp[0].floor).to.equal(1.0);
      expect(payload.imp[0].banner.format).to.deep.equal([{ w: 970, h: 250 }, { w: 1, h: 1 }]);
      // instream
      expect(payload.imp[1].tagid).to.equal('instream_test');
      expect(payload.imp[1].ext.parentId).to.equal('parent_test');
      expect(payload.imp[1].ext.publisherId).to.equal('publisher_test');
      expect(payload.imp[1].video).to.exist.and.to.be.a('object');
      expect(payload.imp[1].video.plcmt).to.equal(1);
      // banner and outstream video
      expect(payload.imp[2]).to.have.property('video');
      expect(payload.imp[2]).to.have.property('banner');
      // only mediaTypes.banner.sizes, not the legacy top level `sizes`
      expect(payload.imp[2].banner.format).to.deep.equal([{ w: 970, h: 250 }, { w: 1, h: 1 }]);
      expect(payload.imp[2].video).to.deep.equal({ 'mimes': ['video/mp4'], 'maxduration': 30, 'minduration': 6, 'w': 640, 'h': 480, 'context': 'outstream' });
      // banner and incomplete video
      expect(payload.imp[3]).to.not.have.property('video');
      expect(payload.imp[3]).to.have.property('banner');
      expect(payload.imp[3].banner.format).to.deep.equal([{ w: 970, h: 250 }, { w: 1, h: 1 }]);
      // incomplete mediatypes.banner and incomplete video: no mediaTypes.banner.sizes,
      // so the legacy top level `sizes` is used as a fallback
      expect(payload.imp[4]).to.not.have.property('video');
      expect(payload.imp[4]).to.have.property('banner');
      expect(payload.imp[4].banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 300, h: 600 }]);
      // banner and instream video
      expect(payload.imp[5]).to.not.have.property('banner');
      expect(payload.imp[5]).to.have.property('video');
      expect(payload.imp[5].video).to.exist.and.to.be.a('object');
      expect(payload.imp[5].video.plcmt).to.equal(1);
      // banner and outstream video and native
      expect(payload.imp[6]).to.have.property('video');
      expect(payload.imp[6]).to.have.property('banner');
      expect(payload.imp[6].banner.format).to.deep.equal([{ w: 970, h: 250 }, { w: 1, h: 1 }]);
      expect(payload.imp[6].video).to.deep.equal({ 'mimes': ['video/mp4'], 'maxduration': 30, 'minduration': 6, 'w': 640, 'h': 480, 'context': 'outstream' });
      // outstream video only
      expect(payload.imp[7]).to.have.property('video');
      expect(payload.imp[7]).to.not.have.property('banner');
      expect(payload.imp[7].video).to.deep.equal({ 'mimes': ['video/mp4'], 'maxduration': 30, 'minduration': 6, 'w': 640, 'h': 480, 'context': 'outstream' });
      // banner and incomplete outstream (missing size); video request is permitted so banner can still monetize
      expect(payload.imp[8]).to.have.property('video');
      expect(payload.imp[8]).to.have.property('banner');
      // banner.format must come from mediaTypes.banner.sizes only. This ad unit also
      // carries a legacy top level `sizes: [[300, 250], [300, 600], ...]`, which the
      // publisher never declared for banner - those must not leak into the format list.
      expect(payload.imp[8].banner.format).to.deep.equal([{ w: 970, h: 250 }, { w: 1, h: 1 }]);
      expect(payload.imp[8].video).to.deep.equal({ 'mimes': ['video/mp4'], 'maxduration': 30, 'minduration': 6, 'context': 'outstream' });
      // outstream new plcmt value
      expect(payload.imp[13]).to.have.property('video');
      expect(payload.imp[13].video).to.deep.equal({ 'mimes': ['video/mp4'], 'maxduration': 30, 'minduration': 6, 'w': 640, 'h': 480, 'context': 'outstream', 'plcmt': 3 });
      // native only
      expect(payload.imp[14].ext.parentId).to.equal('parent_test');
      expect(payload.imp[14].ext.publisherId).to.equal('publisher_test');
      expect(payload.imp[14]).to.have.property('native');
      // ORTB carries the native request as a JSON string on imp.native.request; the raw
      // ORTB object must not be duplicated as siblings of it
      expect(payload.imp[14].native).to.have.property('request');
      expect(payload.imp[14].native).to.not.have.property('assets');
      expect(Object.keys(payload.imp[14].native)).to.have.members(['request', 'ver']);
      expect(JSON.parse(payload.imp[14].native.request).assets).to.have.length(3);
      // native and banner
      expect(payload.imp[15]).to.have.property('native');
      expect(payload.imp[15]).to.have.property('banner');
      expect(payload.imp[15].native).to.have.property('request');
      expect(JSON.parse(payload.imp[15].native.request).assets).to.be.an('array');
      expect(payload.imp[15].banner.format).to.deep.equal([{ w: 728, h: 90 }, { w: 970, h: 250 }]);
    });

    it('should be able find video object from the instream request', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      const request = requests[0];
      expect(request.data.imp[1].video).to.exist.and.to.be.a('object');
    });

    it('should only parse sizes that are of the proper length and format', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[0].banner.format).to.have.length(2);
      expect(request.data.imp[0].banner.format).to.deep.equal([{ w: 970, h: 250 }, { w: 1, h: 1 }]);
    });

    it('should check for valid outstream placement values', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
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

    it('should call getFloor with the correct parameters based on mediaType', function() {
      bidRequests.forEach(request => {
        request.getFloor = () => {};
        sinon.spy(request, 'getFloor');
      });

      spec.buildRequests(bidRequests, bidderRequest);

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

      spec.buildRequests(bidRequests, bidderRequest);

      expect(logErrorSpy.calledOnce).to.equal(true);
    });

    it('should add tid to imp.ext if transactionId exists', function() {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[0].ext.tid).to.exist.and.be.a('string');
      expect(request.data.imp[0].ext.tid).to.equal('173f49a8-7549-4218-a23c-e7ba59b47229');
    });

    it('should not add ortb2Imp.ext fields to imp.ext when ortb2Imp does not exist', function() {
      // bidRequests[2] has no ortb2Imp at all, but its params carry parentId+publisherId,
      // which the adapter is expected to surface under imp.ext.
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[2].ext).to.deep.equal({
        parentId: 'parent_test',
        publisherId: 'publisher_test'
      });
    });

    it('should not add ortb2Imp.ext fields to imp.ext when ortb2Imp.ext does not exist', function() {
      // bidRequests[3] has ortb2Imp without an .ext, and its params carry only parentId.
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[3].ext).to.deep.equal({
        parentId: 'parent_test'
      });
    });

    it('should send if imp[].ext.data.pbadslot exists', function() {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      const data = request.data;
      expect(data.imp[1].ext.data).to.have.property('pbadslot');
      expect(data.imp[1].ext.data.pbadslot).to.equal('homepage-top-rect');
    });

    it('should send if imp[].ext.data.gpid exists', function() {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      const data = request.data;
      expect(data.imp[0].ext).to.have.property('gpid');
      expect(data.imp[0].ext.gpid).to.equal('homepage-top-rect#div');
    });

    it('should copy entire impression ext object and merge in params.parentId/publisherId', function() {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[1].ext).to.haveOwnProperty('tid');
      expect(request.data.imp[1].ext).to.haveOwnProperty('data');
      expect(request.data.imp[1].ext.data).to.haveOwnProperty('adUnitSpecificAttribute');
      expect(request.data.imp[1].ext.data).to.haveOwnProperty('pbadslot');
      expect(request.data.imp[1].ext).to.deep.equal(
        {
          data: {
            pbadslot: 'homepage-top-rect',
            adUnitSpecificAttribute: 123
          },
          tid: '173f49a8-7549-4218-a23c-e7ba59b47229',
          parentId: 'parent_test',
          publisherId: 'publisher_test'
        }
      );
    });

    it('should surface params.parentId and params.publisherId under imp.ext', function() {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      // bidRequests[0] carries both params
      expect(request.data.imp[0].ext.parentId).to.equal('parent_test');
      expect(request.data.imp[0].ext.publisherId).to.equal('publisher_test');
    });

    it('should omit imp.ext entirely when neither ortb2Imp.ext nor parentId/publisherId are present', function() {
      const minimalBidRequests = [{
        bidder: 'triplelift',
        params: { inventoryCode: '12345' },
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        adUnitCode: 'adunit-code',
        bidId: 'abc',
        bidderRequestId: 'def',
        auctionId: 'ghi'
      }];
      const request = spec.buildRequests(minimalBidRequests, bidderRequest)[0];
      expect(request.data.imp[0].ext).to.not.exist;
    });

    it('should add tdid to the payload if ortb2 included', function () {
      const existingOrtb2 = bidRequests[0].ortb2 || {};
      bidderRequest.ortb2 = Object.assign({}, existingOrtb2, {
        user: {
          ext: {
            eids: [{
              source: 'adserver.org',
              uids: [{
                id: '6bca7f6b-a98a-46c0-be05-6020f7604598',
                atype: 1,
                ext: {
                  rtiPartner: 'TDID'
                }
              }]
            }]
          }
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      const payload = request.data;
      expect(payload).to.exist;
      expect(payload.user.ext).to.deep.equal({
        eids: [{
          source: 'adserver.org',
          uids: [{
            id: '6bca7f6b-a98a-46c0-be05-6020f7604598',
            atype: 1,
            ext: {
              rtiPartner: 'TDID'
            }
          }]
        }]
      });
    });

    it('should add tdid to the payload if userIdAsEids included', function () {
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
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      const payload = request.data;
      expect(payload).to.exist;
      expect(payload.user).to.deep.equal({ ext: { eids: [{ source: 'adserver.org', uids: [{ id: tdid, atype: 1, ext: { rtiPartner: 'TDID' } }] }] } });
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
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      const payload = request.data;
      expect(payload).to.exist;
      expect(payload.user).to.deep.equal({ ext: { eids: [{ source: 'criteo.com', uids: [{ id: id, atype: 1, ext: { rtiPartner: 'criteoId' } }] }] } });
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

      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
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
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      const url = request.url;
      expect(url).to.exist;
      expect(url).to.be.a('string');
      expect(url).to.match(/(?:tlx.3lift.com\/header\/auction)/);
      expect(url).to.match(/(?:lib=prebid)/);
      expect(url).to.match(new RegExp('(?:' + prebid.version + ')'));
      expect(url).to.match(/(?:referrer)/);
    });

    it('should use refererInfo.page for referrer', function () {
      bidderRequest.refererInfo.page = 'https://topmostlocation.com?foo=bar';
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      const url = request.url;
      expect(url).to.match(/(\?|&)referrer=https%3A%2F%2Ftopmostlocation.com%3Ffoo%3Dbar/);
      delete bidderRequest.refererInfo.page;
    });

    it('should return us_privacy param when CCPA info is available', function() {
      bidderRequest.uspConsent = '1YYY';
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      const url = request.url;
      expect(url).to.match(/(\?|&)us_privacy=1YYY/);
    });

    it('should return coppa param when COPPA config is set to true', function() {
      sinon.stub(config, 'getConfig').withArgs('coppa').returns(true);
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      config.getConfig.restore();
      const url = request.url;
      expect(url).to.match(/(\?|&)coppa=true/);
    });

    it('should not return coppa param when COPPA config is set to false', function() {
      sinon.stub(config, 'getConfig').withArgs('coppa').returns(false);
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      config.getConfig.restore();
      const url = request.url;
      expect(url).not.to.match(/(\?|&)coppa=/);
    });

    it('should return schain when present', function() {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      const payload = request.data;
      expect(payload.source.ext.schain).to.deep.equal(schain);
    });

    it('should not create root level ext when schain is not present', function() {
      delete bidderRequest.ortb2;
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      const payload = request.data;
      expect(payload.source).to.deep.equal(undefined);
    });

    it('should get floor from floors module if available', function() {
      let floorInfo;
      bidRequests[0].getFloor = () => floorInfo;

      // standard float response; expected functionality of floors module
      floorInfo = { currency: 'USD', floor: 1.99 };
      let request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[0].floor).to.equal(1.99);
    });

    it('should get floor from params if floor module is not available', function() {
      let request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[0].floor).to.equal(1.00);
    });

    it('should not get floor from floors module if currency is not USD', function() {
      let floorInfo;
      bidRequests[0].getFloor = () => floorInfo;

      floorInfo = { currency: 'BTC', floor: 10.99 };
      let request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[1].floor).to.deep.equal(undefined);
    });

    it('should delete bidfloor and bidfloorcur', function() {
      let floorInfo;
      bidRequests[0].getFloor = () => floorInfo;

      floorInfo = { currency: 'USD', floor: 1.99 };
      let request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[1].bidfloor).to.deep.equal(undefined);
      expect(request.data.imp[1].bidfloorcur).to.deep.equal(undefined);
    });

    it('should always request floors in USD regardless of adServerCurrency', function() {
      config.setConfig({ currency: { adServerCurrency: 'EUR' } });
      bidRequests[0].getFloor = () => {};
      sinon.spy(bidRequests[0], 'getFloor');

      try {
        spec.buildRequests(bidRequests, bidderRequest);
        expect(bidRequests[0].getFloor.calledWith(sinon.match({ currency: 'USD' }))).to.equal(true);
      } finally {
        bidRequests[0].getFloor.restore();
        config.resetConfig();
      }
    });

    it('should always send cur as USD regardless of adServerCurrency', function() {
      config.setConfig({ currency: { adServerCurrency: 'EUR' } });
      try {
        const request = spec.buildRequests(bidRequests, bidderRequest)[0];
        expect(request.data.cur).to.deep.equal(['USD']);
      } finally {
        config.resetConfig();
      }
    });

    it('should warn and ignore a floor that cannot be expressed in USD', function() {
      const logWarnSpy = sinon.spy(utils, 'logWarn');
      bidRequests[0].getFloor = () => ({ currency: 'BTC', floor: 10.99 });

      const request = spec.buildRequests(bidRequests, bidderRequest)[0];

      expect(request.data.imp[0].floor).to.equal(1.00); // falls back to params.floor
      expect(logWarnSpy.calledWithMatch(/only USD is supported/)).to.equal(true);
      logWarnSpy.restore();
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

      const request = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2 })[0];
      const { data: payload } = request;
      expect(payload.site).to.exist;
      expect(payload.user).to.exist;
      expect(payload.site).to.deep.equal({
        domain: 'page.example.com',
        cat: ['IAB2'],
        sectioncat: ['IAB2-2'],
        pagecat: ['IAB2-2'],
        page: 'https://page.example.com/here.html',
      });
      expect(payload.user).to.deep.equal({
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
      });
    });

    it('should send global config first party data if kvps are available', function() {
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
        }
      };
      const request = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2 })[0];
      const { data: payload } = request;
      expect(payload.user).to.not.exist;
      expect(payload.site.ext.data).to.haveOwnProperty('category');
      expect(payload.site).to.haveOwnProperty('pmp_elig');
    });

    it('should send ad unit first party data if kvps are available', function() {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[1].ext).to.haveOwnProperty('data');
      expect(request.data.imp[1].ext.data).to.haveOwnProperty('pbadslot');
      expect(request.data.imp[1].ext.data).to.haveOwnProperty('adUnitSpecificAttribute');
      // Check that legacy structures are deprecated
      expect(request.data.imp[2].fpd).to.not.exist;
      expect(request.data.imp[1].fpd).to.not.exist;
    });

    it('should send 1plusX data as fpd if localStorage is available and no other fpd is defined', function() {
      sandbox.stub(storage, 'getDataFromLocalStorage').callsFake(() => '{"kid":1,"s":"ySRdArquXuBolr/cVv0UNqrJhTO4QZsbNH/t+2kR3gXjbA==","t":"/yVtBrquXuBolr/cVv0UNtx1mssdLYeKFhWFI3Dq1dJnug=="}');
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.user.data).to.deep.equal([
        {
          'name': 'www.1plusx.com',
          'ext': {
            'kid': 1,
            's': 'ySRdArquXuBolr/cVv0UNqrJhTO4QZsbNH/t+2kR3gXjbA==',
            't': '/yVtBrquXuBolr/cVv0UNtx1mssdLYeKFhWFI3Dq1dJnug=='
          }
        }
      ]
      );
    });

    it('should append 1PlusX data to existing user.data entries if localStorage is available', function() {
      const ortb2 = {
        user: {
          data: [
            { name: 'dataprovider.com', ext: { segtax: 4 }, segment: [{ id: '1' }] }
          ]
        }
      };
      sandbox.stub(storage, 'getDataFromLocalStorage').callsFake(() => '{"kid":1,"s":"ySRdArquXuBolr/cVv0UNqrJhTO4QZsbNH/t+2kR3gXjbA==","t":"/yVtBrquXuBolr/cVv0UNtx1mssdLYeKFhWFI3Dq1dJnug=="}');
      const request = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2 })[0];
      const { data: payload } = request;
      expect(payload.user).to.deep.equal({
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
      });
    });

    it('should not append anything if getDataFromLocalStorage returns null', function() {
      const ortb2 = {
        user: {
          data: [
            { name: 'dataprovider.com', ext: { segtax: 4 }, segment: [{ id: '1' }] }
          ]
        }
      };
      sandbox.stub(storage, 'getDataFromLocalStorage').callsFake(() => null);
      const request = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2 })[0];
      const { data: payload } = request;
      expect(payload.user).to.deep.equal({
        'data': [
          { 'name': 'dataprovider.com', 'ext': { 'segtax': 4 }, 'segment': [{ 'id': '1' }] },
        ]
      });
    });

    it('should add gpp consent data to bid request object if gpp data exists', function() {
      bidderRequest.ortb2 = {
        regs: {
          'gpp': 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
          'gpp_sid': [7]
        }
      };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.regs).to.deep.equal({
        'gpp': 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        'gpp_sid': [7]
      });
    });

    it('should cast playbackmethod as an array if it is an integer and it exists', function() {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[1].video.playbackmethod).to.deep.equal([5]);
    });

    it('should set playbackmethod as an array if it exists as an array', function() {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[5].video.playbackmethod).to.be.a('array');
      expect(request.data.imp[5].video.playbackmethod).to.deep.equal([1, 2, 3]);
    });

    it('should be able find native object from the native request', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      const request = requests[0];
      expect(request.data.imp[14].native).to.exist.and.to.be.a('object');
    });

    it('should build imp.native for a legacy (non-ortb) native ad unit', function () {
      const legacyNativeBid = {
        bidder: 'triplelift',
        params: { inventoryCode: 'native_test', parentId: 'parent_test' },
        mediaTypes: {
          native: {
            title: { required: true, len: 80 },
            image: { required: true, sizes: [300, 250] }
          }
        },
        // core converts the legacy syntax and hangs it here, not on mediaTypes.native.ortb
        nativeOrtbRequest: {
          ver: '1.2',
          assets: [{ id: 1, required: 1, title: { len: 80 } }]
        },
        adUnitCode: 'adunit-code-native-legacy',
        bidId: 'legacy-native-bid-id'
      };

      const request = spec.buildRequests([legacyNativeBid], bidderRequest)[0];
      expect(request.data.imp[0]).to.have.property('native');
      expect(request.data.imp[0].native).to.have.property('request');
      expect(JSON.parse(request.data.imp[0].native.request).assets).to.have.length(1);
    });

    it('should preserve every publisher-specified video field on imp.video', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];

      request.data.imp.forEach((imp, i) => {
        if (!imp.video) return;

        const mediaTypesVideo = { ...(bidRequests[i].mediaTypes && bidRequests[i].mediaTypes.video) };
        delete mediaTypesVideo.playerSize; // intentionally translated to w/h
        const paramsVideo = (bidRequests[i].params && bidRequests[i].params.video) || {};

        Object.keys(mediaTypesVideo).forEach(key => {
          expect(imp.video, `imp[${i}].video is missing mediaTypes.video.${key}`).to.have.property(key);
        });
        Object.keys(paramsVideo).forEach(key => {
          expect(imp.video, `imp[${i}].video is missing params.video.${key}`).to.have.property(key);
        });

        // playerSize must still have been translated
        if (bidRequests[i].mediaTypes.video.playerSize) {
          expect(imp.video, `imp[${i}].video is missing w`).to.have.property('w');
          expect(imp.video, `imp[${i}].video is missing h`).to.have.property('h');
        }
      });
    });

    it('should apply params.video on top of mediaTypes.video', function () {
      const videoOverrideBid = {
        bidder: 'triplelift',
        params: {
          inventoryCode: 'video_override_test',
          parentId: 'parent_test',
          video: {
            mimes: ['video/webm'],
            maxduration: 15
          }
        },
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [640, 480],
            mimes: ['video/mp4'],
            maxduration: 30
          }
        },
        adUnitCode: 'adunit-code-video-override',
        bidId: 'video-override-bid-id'
      };

      const request = spec.buildRequests([videoOverrideBid], bidderRequest)[0];
      const impVideo = request.data.imp[0].video;

      expect(impVideo.maxduration).to.equal(15);
      expect(impVideo.mimes).to.include('video/webm');
      expect(impVideo.w).to.equal(640);
      expect(impVideo.h).to.equal(480);
    });

    it('should skip malformed entries in sizes rather than throw', function () {
      const badSizesBid = {
        bidder: 'triplelift',
        params: { inventoryCode: 'size_test', parentId: 'parent_test' },
        mediaTypes: { banner: { sizes: [[300, 250], null, undefined, [1, 1, 1], ['flex']] } },
        adUnitCode: 'adunit-code-bad-sizes',
        bidId: 'bad-sizes-bid-id'
      };

      let request;
      expect(() => {
        request = spec.buildRequests([badSizesBid], bidderRequest)[0];
      }).to.not.throw();
      expect(request.data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);
    });

    it('should not throw when a bid request carries no params', function () {
      // converter.toORTB is reachable without isBidRequestValid having run
      const noParamsBid = {
        bidder: 'triplelift',
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        adUnitCode: 'adunit-code-no-params',
        bidId: 'no-params-bid-id'
      };

      let request;
      expect(() => {
        request = spec.buildRequests([noParamsBid], bidderRequest)[0];
      }).to.not.throw();
      expect(request.data.imp[0]).to.not.have.property('tagid');
      expect(request.data.imp[0].ext || {}).to.not.have.property('parentId');
    });

    it('should build banner.format from mediaTypes.banner.sizes and ignore legacy sizes', function () {
      const bidRequest = {
        bidder: 'triplelift',
        params: { inventoryCode: 'size_test', parentId: 'parent_test' },
        mediaTypes: {
          banner: { sizes: [[300, 250]] }
        },
        // legacy flattened list containing a size never declared for banner
        sizes: [[300, 250], [728, 90]],
        adUnitCode: 'adunit-code-sizes',
        bidId: 'size-test-bid-id'
      };

      const request = spec.buildRequests([bidRequest], bidderRequest)[0];
      expect(request.data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);
    });

    it('should fall back to legacy sizes when mediaTypes.banner.sizes is absent', function () {
      const bidRequest = {
        bidder: 'triplelift',
        params: { inventoryCode: 'size_test', parentId: 'parent_test' },
        mediaTypes: { banner: {} },
        sizes: [[300, 250], [728, 90]],
        adUnitCode: 'adunit-code-sizes-legacy',
        bidId: 'size-test-legacy-bid-id'
      };

      const request = spec.buildRequests([bidRequest], bidderRequest)[0];
      expect(request.data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
    });
  });

  describe('interpretResponse', function () {
    let response, bidderRequest, nativeResponse;
    this.beforeEach(() => {
      response = {
        body: {
          bids: [
            {
              imp_id: '30b31c1838de1e',
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
              imp_id: '30b31c1838de1f',
              crid: '10092_76480_i2j6qm8u',
              cpm: 9.99,
              ad: '<VAST version="2.0"><Ad id="gsen95th"><Wrapper><Error><![CDATA[https://eb2.3lift.net/ive?aid=156025986241697082890&bmid=10092&bsid=76480&crid=10092_76480_i2j6qm8u&e=[ERRORCODE]]]></Error><Impression><![CDATA[https://eb2.3lift.net/r?rr=creative&bc=0.011&uid=8217096503606905723&pr=%24%7BAUCTION_PRICE%7D&brid=554350&bmid=10092&biid=10066&aid=156025986241697082890&bcud=11&sid=76480&ts=1593552049&fid=11]]></Impression><Impression><![CDATA[https://tlx.3lift.net/header/notify?px=1&pr=${AUCTION_PRICE}&ts=1593552049&aid=156025986241697082890&ec=10092_76480_i2j6qm8u&n=GgDyAqABCAASFTE1NjAyNTk4NjI0MTY5NzA4Mjg5MBgAIAEo7E4wwNUEQAFIAFAAYAtogIAEcO7qIZABAJgBAKgBALABC7gBAMABCsgBC%2BABCvABAPgBlo0GgAL%2FlwWIAgqRAgAAAAAAAPA%2FmQIzMzMzMzPDP6ECAAAAAAAAAACoAgCwAgDIAgTYAgDxAmZmZmZmZuY%2F%2BALSTpADAJgDAKADAKgDA%2FgCDIgDAJIDBDEyMzQ%3D]]></Impression><AdSystem version="1.0">The Trade Desk</AdSystem><VASTAdTagURI><![CDATA[https://insight.adsrvr.org/enduser/vast/?iid=590299b9-1817-4859-a2af-ef007bb4c78e&crid=gsen95th&wp=0.011&aid=1&wpc=USD&sfe=10fba14e&puid=&tdid=&pid=13hzg59&ag=l2w0772&adv=ct0nqrx&sig=1BGM_YxB0HAcl-s55S_NKIu-oLW94YpTn_DjMRmdWHzs.&bp=0.3&cf=1448159&fq=0&td_s=388389451&rcats=&mcat=&mste=&mfld=2&mssi=None&mfsi=ve35dsnkwp&uhow=75&agsa=&rgco=South%20Korea&rgre=Gyeonggi-do&rgme=&rgci=Ansan-si&rgz=15345&svbttd=1&dt=Mobile&osf=iOS&os=iOS134&br=WebView&rlangs=01&mlang=&svpid=7453-EB&did=&rcxt=InApp&lat=37.324400&lon=126.823700&tmpc=9.66&daid=d7804da7-147b-421d-bb44-60ad3ac32681&vp=0&osi=&osv=&svscid=388389451&bffi=41&mk=Apple&mdl=iPhone&vpb=PreRoll&dc=14&vcc=EDwYPDICCAI6BAgBCAJAAUgBUASIAQKgAZ4DqAGwBsgBAdABA-gBAoACA4oCCAgCCAMIBQgGmgIICAMIBQgGCAegAgKoAgGwAgC4AgDAAgE.&sv=triplelift&pidi=3584&advi=270782&cmpi=1319400&agi=6167705&cridi=13268739&svi=70&cmp=a9nj9ex&tsig=tlN4j1OujX9nrFakJmfpTuNNfg-D0qArlSjjNAb8tLg.&c=MAQ4AEgAUAc.&dur=&crrelr=&adpt=tl_ltriplelift&ipl=39250&fpa=826&pcm=3&said=40286845772363793660&ict=Unknown&auct=1&im=1]]></VASTAdTagURI><Creatives><Creative><Linear><VideoClicks><ClickTracking><![CDATA[https://eb2.3lift.net/ec?aid=156025986241697082890]]></ClickTracking></VideoClicks><TrackingEvents><Tracking event="mute"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=5]]></Tracking><Tracking event="unmute"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=6]]></Tracking><Tracking event="expand"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=7]]></Tracking><Tracking event="collapse"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=8]]></Tracking><Tracking event="pause"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=14]]></Tracking><Tracking event="resume"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=15]]></Tracking><Tracking event="fullscreen"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=16]]></Tracking><Tracking event="exitFullscreen"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=17]]></Tracking><Tracking event="skip"><![CDATA[https://eb2.3lift.net/eee?aid=156025986241697082890&inv_code=niice_main_instream&ev=1&eid=18]]></Tracking><Tracking event="start"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=7]]></Tracking><Tracking event="firstQuartile"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=1]]></Tracking><Tracking event="midpoint"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=2]]></Tracking><Tracking event="thirdQuartile"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=3]]></Tracking><Tracking event="complete"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&quartile=4]]></Tracking><Tracking event="progress" offset="00:00:02"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=1]]></Tracking><Tracking event="progress" offset="00:00:03"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=2]]></Tracking><Tracking event="progress" offset="00:00:05"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=3]]></Tracking><Tracking event="progress" offset="00:00:10"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=4]]></Tracking><Tracking event="progress" offset="00:00:15"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=5]]></Tracking><Tracking event="progress" offset="00:00:30"><![CDATA[https://eb2.3lift.net/evd?aid=156025986241697082890&inv_code=niice_main_instream&bmid=10092&vlt=2&bypassDuration=true&progress=6]]></Tracking></TrackingEvents></Linear></Creative></Creatives></Wrapper></Ad></VAST>',
              tl_source: 'hdx',
              media_type: 'video'
            },
            // video bid on banner+outstream request
            {
              imp_id: '73edc0ba8de203',
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
              imp_id: '73edc0ba8de204',
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

      nativeResponse = {
        body: {
          bids: [
            {
              imp_id: 'test-native-bid-id',
              cpm: 5,
              ad: '{"ver": "1.2", "assets": [{"id": 1, "required": 1,"title": {"text": "Triplelift Native"}}], "link": {"url": "https://www.triplelift.com/"}, "eventtrackers":[{"event":1,"method":1,"url":"http://example.com/impression"}]}',
              crid: 'test-native-crid',
              tl_source: 'tlx'
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
            bidId: '30b31c1838de1f'
          },
          // banner and outstream
          {
            bidder: 'triplelift',
            params: {
              inventoryCode: 'testing_desktop_outstream',
              parentId: 'parent_test',
              floor: 1
            },
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
              }
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
              parentId: 'parent_test',
              floor: 1
            },
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
            bidId: '73edc0ba8de204',
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
    });

    it('should get correct bid response', function () {
      const expectedResponse = [
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
          requestId: '30b31c1838de1f',
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
      const result = spec.interpretResponse(response, { bidderRequest });
      expect(result).to.have.length(4);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      expect(Object.keys(result[1])).to.have.members(Object.keys(expectedResponse[1]));
      expect(result[0].ttl).to.equal(300);
      expect(result[1].ttl).to.equal(3600);
    });

    it('should identify format of bid and respond accordingly', function() {
      const result = spec.interpretResponse(response, { bidderRequest });
      // tl_source 'tlx' is native demand; when it is delivered as rendered-native
      // through the banner pipe the ad markup is a script tag, so meta.mediaType is
      // reported as native while the bid itself stays a banner bid
      expect(result[0].meta.mediaType).to.equal('native');
      expect(result[0].mediaType).to.not.exist;
      expect(result[0].native).to.not.exist;
      expect(result[0].ad).to.equal('ad-markup');
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[1].mediaType).to.equal('video');
      expect(result[1].meta.mediaType).to.equal('video');
      // video bid on banner+outstream request
      expect(result[2].mediaType).to.equal('video');
      expect(result[2].meta.mediaType).to.equal('video');
      expect(result[2].vastXml).to.include('aid=148508128401385324170&inv_code=testing_mobile_outstream');
      // banner bid on banner+outstream request
      expect(result[3].meta.mediaType).to.equal('banner');
    });

    it('should return multiple responses to support SRA', function () {
      const result = spec.interpretResponse(response, { bidderRequest });
      expect(result).to.have.length(4);
    });

    it('should match TLX bids to bid requests by Prebid bidId (not by array index)', function () {
      // Request + response impression mapping via Prebid bidId
      const resImpIds = response.body.bids.map(b => b.imp_id);
      const reqBidIds = bidderRequest.bids.map(b => b.bidId);
      expect(resImpIds).to.deep.equal(reqBidIds);

      const result = spec.interpretResponse(response, { bidderRequest });
      expect(result.map(r => r.requestId)).to.deep.equal(reqBidIds);
    });

    it('should match TLX bids to bid requests regardless of response order', function () {
      const reversed = { body: { bids: [...response.body.bids].reverse() } };
      const result = spec.interpretResponse(reversed, { bidderRequest });
      expect(result.map(r => r.requestId))
        .to.deep.equal(reversed.body.bids.map(b => b.imp_id));
    });

    it('should drop bids whose imp_id does not match any bid request', function () {
      const orphan = { body: { bids: [{ ...response.body.bids[0], imp_id: 'no-such-bid-id' }] } };
      const result = spec.interpretResponse(orphan, { bidderRequest });
      expect(result).to.have.length(0);
    });

    it('should drop bids with no price or no creative', function () {
      const noBids = {
        body: {
          bids: [
            { ...response.body.bids[0], cpm: 0 },
            { ...response.body.bids[0], cpm: undefined },
            { ...response.body.bids[0], ad: undefined }
          ]
        }
      };
      const result = spec.interpretResponse(noBids, { bidderRequest });
      expect(result).to.have.length(0);
    });

    it('should not log an error when a native-eligible imp is answered with banner markup', function () {
      // On a multi-format (banner + native) imp, a banner response is an expected outcome
      const logErrorSpy = sinon.spy(utils, 'logError');
      const bannerResponse = {
        body: {
          bids: [{
            imp_id: 'probe-bid-id',
            cpm: 3.5,
            width: 300,
            height: 250,
            ad: '<div>Banner Ad Markup</div>',
            crid: 'probe-crid',
            tl_source: 'hdx'
          }]
        }
      };
      const req = {
        bidderCode: 'triplelift',
        bids: [{
          bidder: 'triplelift',
          params: { inventoryCode: 'mf', parentId: 'p' },
          mediaTypes: {
            banner: { sizes: [[300, 250]] },
            native: { ortb: { assets: [{ id: 1, required: 1, title: { len: 80 } }] } }
          },
          bidId: 'probe-bid-id'
        }]
      };

      try {
        const result = spec.interpretResponse(bannerResponse, { bidderRequest: req });
        expect(result).to.have.length(1);
        expect(logErrorSpy.called, 'logError args: ' + JSON.stringify(logErrorSpy.args)).to.equal(false);
      } finally {
        logErrorSpy.restore();
      }
    });

    it('should not throw when crid is returned as a number', function () {
      const numericCrid = { body: { bids: [{ ...response.body.bids[0], crid: 29681110 }] } };
      let result;
      expect(() => {
        result = spec.interpretResponse(numericCrid, { bidderRequest });
      }).to.not.throw();
      expect(result).to.have.length(1);
      expect(result[0].creativeId).to.equal('29681110');
      // no underscore in the crid, so no networkId can be derived
      expect(result[0].meta).to.not.have.property('networkId');
    });

    it('should include the advertiser name in the meta field if available', function () {
      const result = spec.interpretResponse(response, { bidderRequest });
      expect(result[0].meta.advertiserName).to.equal('fake advertiser name');
      expect(result[1].meta).to.not.have.key('advertiserName');
    });

    it('should include the advertiser domain array in the meta field if available', function () {
      const result = spec.interpretResponse(response, { bidderRequest });
      expect(result[0].meta.advertiserDomains[0]).to.equal('basspro.com');
      expect(result[0].meta.advertiserDomains[1]).to.equal('internetalerts.org');
      expect(result[1].meta).to.not.have.key('advertiserDomains');
    });

    it('should include networkId in the meta field if available', function () {
      const result = spec.interpretResponse(response, { bidderRequest });
      expect(result[1].meta.networkId).to.equal('10092');
      expect(result[2].meta.networkId).to.equal('5989');
      expect(result[3].meta.networkId).to.equal('5989');
    });

    it('should populate valid native ad response', function () {
      const nativeBidderRequest = {
        bidderCode: 'triplelift',
        auctionId: 'test-native-auction-id',
        bidderRequestId: 'test-native-bidder-request-id',
        bids: [
          {
            bidder: 'triplelift',
            params: {
              inventoryCode: 'native_test',
              parentId: 'parent_test',
              floor: 1.0
            },
            mediaTypes: {
              native: {
                ortb: {
                  assets: [{
                    id: 1,
                    required: 1,
                    title: {
                      len: 80
                    }
                  }]
                }
              }
            },
            adUnitCode: 'adunit-code-native',
            bidId: 'test-native-bid-id',
            bidderRequestId: 'test-native-bidder-request-id',
            auctionId: 'test-native-auction-id',
          }
        ],
        refererInfo: {
          referer: 'https://examplereferer.com'
        }
      };

      const result = spec.interpretResponse(nativeResponse, { bidderRequest: nativeBidderRequest });

      expect(result).to.have.length(1);
      expect(result[0].requestId).to.equal('test-native-bid-id');
      expect(result[0].cpm).to.equal(5);
      expect(result[0].creativeId).to.equal('test-native-crid');
      expect(result[0].currency).to.equal('USD');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].meta.mediaType).to.equal('native');
      // true ORTB native payload => top level mediaType must also be native so core
      // routes the bid through the native renderer
      expect(result[0].mediaType).to.equal('native');
      expect(result[0].ad).to.not.exist;
      expect(result[0].native).to.exist;
      expect(result[0].native.ortb).to.deep.equal({
        ver: '1.2',
        assets: [{
          id: 1,
          required: 1,
          title: { text: 'Triplelift Native' }
        }],
        link: { url: 'https://www.triplelift.com/' },
        eventtrackers: [{
          event: 1,
          method: 1,
          url: 'http://example.com/impression'
        }]
      });
    });

    it('should return native response for multi-format (banner + native) request when response is native', function () {
      const multiFormatBidderRequest = {
        bidderCode: 'triplelift',
        auctionId: 'test-multi-format-auction-id',
        bidderRequestId: 'test-multi-format-bidder-request-id',
        bids: [
          {
            bidder: 'triplelift',
            params: {
              inventoryCode: 'multi_format_test',
              parentId: 'parent_test',
              floor: 1.0
            },
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [728, 90]]
              },
              native: {
                ortb: {
                  assets: [{
                    id: 1,
                    required: 1,
                    title: {
                      len: 80
                    }
                  }]
                }
              }
            },
            adUnitCode: 'adunit-code-multi-format',
            bidId: 'test-multi-format-bid-id',
            bidderRequestId: 'test-multi-format-bidder-request-id',
            auctionId: 'test-multi-format-auction-id',
          }
        ],
        refererInfo: {
          referer: 'https://examplereferer.com'
        }
      };

      const result = spec.interpretResponse(
        { body: { bids: [{ ...nativeResponse.body.bids[0], imp_id: 'test-multi-format-bid-id' }] } },
        { bidderRequest: multiFormatBidderRequest }
      );

      expect(result).to.have.length(1);
      expect(result[0].requestId).to.equal('test-multi-format-bid-id');
      expect(result[0].cpm).to.equal(5);
      expect(result[0].meta.mediaType).to.equal('native');
      expect(result[0].mediaType).to.equal('native');
      expect(result[0].native).to.exist;
      expect(result[0].native.ortb.assets[0].title.text).to.equal('Triplelift Native');
    });

    it('should return banner response for multi-format (banner + native) request when response is banner', function () {
      const bannerResponse = {
        body: {
          bids: [
            {
              imp_id: 'test-multi-format-bid-id',
              cpm: 3.5,
              width: 300,
              height: 250,
              ad: '<div>Banner Ad Markup</div>',
              crid: 'test-banner-crid',
              tl_source: 'hdx'
            }
          ]
        }
      };

      const multiFormatBidderRequest = {
        bidderCode: 'triplelift',
        auctionId: 'test-multi-format-auction-id',
        bidderRequestId: 'test-multi-format-bidder-request-id',
        bids: [
          {
            bidder: 'triplelift',
            params: {
              inventoryCode: 'multi_format_test',
              parentId: 'parent_test',
              floor: 1.0
            },
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [728, 90]]
              },
              native: {
                ortb: {
                  assets: [{
                    id: 1,
                    required: 1,
                    title: {
                      len: 80
                    }
                  }]
                }
              }
            },
            adUnitCode: 'adunit-code-multi-format',
            bidId: 'test-multi-format-bid-id',
            bidderRequestId: 'test-multi-format-bidder-request-id',
            auctionId: 'test-multi-format-auction-id',
          }
        ],
        refererInfo: {
          referer: 'https://examplereferer.com'
        }
      };

      const result = spec.interpretResponse(bannerResponse, { bidderRequest: multiFormatBidderRequest });

      expect(result).to.have.length(1);
      expect(result[0].requestId).to.equal('test-multi-format-bid-id');
      expect(result[0].cpm).to.equal(3.5);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].ad).to.equal('<div>Banner Ad Markup</div>');
      expect(result[0].meta.mediaType).to.equal('banner');
      expect(result[0].mediaType).to.not.exist;
      expect(result[0].native).to.not.exist;
    });

    it('should not set top level mediaType to native when a tlx bid returns rendered-native banner markup', function () {
      // Triplelift delivers rendered-native through the banner pipe: tl_source is
      // 'tlx' and the request is native eligible, but bid.ad is a script tag rather
      // than an ORTB native object. The bid must stay renderable as banner markup.
      const renderedNativeResponse = {
        body: {
          bids: [
            {
              imp_id: 'test-native-bid-id',
              cpm: 5,
              width: 300,
              height: 250,
              crid: 'test-native-crid',
              ad: '<script>document.createElement("IMG").src="https://tlx.3lift.com/header/notify?px=1";</script>',
              tl_source: 'tlx'
            }
          ]
        }
      };

      const nativeBidderRequest = {
        bidderCode: 'triplelift',
        auctionId: 'test-native-auction-id',
        bidderRequestId: 'test-native-bidder-request-id',
        bids: [
          {
            bidder: 'triplelift',
            params: {
              inventoryCode: 'native_test',
              parentId: 'parent_test'
            },
            mediaTypes: {
              native: {
                ortb: {
                  assets: [{ id: 1, required: 1, title: { len: 80 } }]
                }
              }
            },
            adUnitCode: 'adunit-code-native',
            bidId: 'test-native-bid-id'
          }
        ]
      };

      const result = spec.interpretResponse(renderedNativeResponse, { bidderRequest: nativeBidderRequest });

      expect(result).to.have.length(1);
      expect(result[0].native).to.not.exist;
      expect(result[0].ad).to.equal(renderedNativeResponse.body.bids[0].ad);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].mediaType).to.not.exist;
      expect(result[0].meta.mediaType).to.equal('native');
    });
  });

  describe('getUserSyncs', function () {
    const expectedIframeSyncUrl = 'https://eb2.3lift.com/sync?gdpr=true&cmp_cs=' + GDPR_CONSENT_STR + '&';
    const expectedImageSyncUrl = 'https://eb2.3lift.com/sync?px=1&src=prebid&gdpr=true&cmp_cs=' + GDPR_CONSENT_STR + '&';
    const expectedGppSyncUrl = 'https://eb2.3lift.com/sync?gdpr=true&cmp_cs=' + GDPR_CONSENT_STR + '&gpp=' + GPP_CONSENT_STR + '&gpp_sid=2%2C8' + '&';

    it('returns an empty array when syncing is not enabled', function() {
      // getUserSyncs is declared to return an array of sync objects
      expect(spec.getUserSyncs({})).to.deep.equal([]);
      expect(spec.getUserSyncs()).to.deep.equal([]);
    });

    it('returns iframe user sync pixel when iframe syncing is enabled', function() {
      const syncOptions = {
        iframeEnabled: true
      };
      const gdprConsent = {
        gdprApplies: true,
        consentString: GDPR_CONSENT_STR
      };
      const result = spec.getUserSyncs(syncOptions, null, gdprConsent);
      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.equal(expectedIframeSyncUrl);
    });

    it('returns image user sync pixel when iframe syncing is disabled', function() {
      const syncOptions = {
        pixelEnabled: true
      };
      const gdprConsent = {
        gdprApplies: true,
        consentString: GDPR_CONSENT_STR
      };
      const result = spec.getUserSyncs(syncOptions, null, gdprConsent);
      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.equal(expectedImageSyncUrl);
    });

    it('returns iframe user sync pixel when both options are enabled', function() {
      const syncOptions = {
        pixelEnabled: true,
        iframeEnabled: true
      };
      const gdprConsent = {
        gdprApplies: true,
        consentString: GDPR_CONSENT_STR
      };
      const result = spec.getUserSyncs(syncOptions, null, gdprConsent);
      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).to.equal(expectedIframeSyncUrl);
    });
    it('sends us_privacy param when info is available', function() {
      const syncOptions = {
        iframeEnabled: true
      };
      const gdprConsent = {
        gdprApplies: true,
        consentString: GDPR_CONSENT_STR
      };
      const result = spec.getUserSyncs(syncOptions, null, gdprConsent, '1YYY', null);
      expect(result[0].url).to.match(/(\?|&)us_privacy=1YYY/);
    });

    it('returns a user sync pixel with GPP signals when available', function() {
      const syncOptions = {
        iframeEnabled: true
      };
      const gdprConsent = {
        gdprApplies: true,
        consentString: GDPR_CONSENT_STR
      };
      const gppConsent = {
        'applicableSections': [2, 8],
        'gppString': 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA~1YNN'
      };
      const result = spec.getUserSyncs(syncOptions, null, gdprConsent, null, gppConsent);
      expect(result[0].url).to.equal(expectedGppSyncUrl);
    });
  });
});
