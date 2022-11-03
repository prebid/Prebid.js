import { expect } from 'chai';
import { spec, storage } from 'modules/eplanningBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import {init, getIds} from 'modules/userId/index.js';
import * as utils from 'src/utils.js';
import {hook} from '../../../src/hook.js';
import {getGlobal} from '../../../src/prebidGlobal.js';
import { makeSlot } from '../integration/faker/googletag.js';
import {BANNER, VIDEO} from '../../../src/mediaTypes.js';

describe('E-Planning Adapter', function () {
  const adapter = newBidder('spec');
  const CI = '12345';
  const ADUNIT_CODE = 'adunit-co:de';
  const ADUNIT_CODE2 = 'adunit-code-dos';
  const ADUNIT_CODE_VIEW = 'adunit-code-view';
  const ADUNIT_CODE_VIEW2 = 'adunit-code-view2';
  const ADUNIT_CODE_VIEW3 = 'adunit-code-view3';
  const CLEAN_ADUNIT_CODE2 = '300x250_1';
  const CLEAN_ADUNIT_CODE = '300x250_0';
  const CLEAN_ADUNIT_CODE_ML = 'adunitco_de';
  const CLEAN_ADUNIT_CODE_VAST = 'VIDEO_300x250_0';
  const BID_ID = '123456789';
  const BID_ID2 = '987654321';
  const BID_ID3 = '998877665';
  const CPM = 1.3;
  const W = '300';
  const H = '250';
  const ADM = '<div>This is an ad</div>';
  const I_ID = '7854abc56248f873';
  const CRID = '1234567890';
  const TEST_ISV = 'leles.e-planning.net';
  const ADOMAIN = 'adomain.com';
  const ADM_VAST = '<VAST version=\"2.0\">\n<Ad id=\"602833\">\n<Wrapper>\n<AdSystem>Acudeo Compatible</AdSystem>\n<VASTAdTagURI>\nhttp://demo.tremormedia.com/proddev/vast/vast_inline_linear.xml\n</VASTAdTagURI>\n<Impression><![CDATA[https://cndigrazia34.devel.e-planning.net:444/eli/4/19911d/6584303d5d0da8bc?i=0123456789012345&fi=0123456789abcdef&pb=<% EXCHANGE_EPBID_49 %>&nfc=1&S=<% SERVER_ID %>&rnd=733663791&bk=0123456789abcdef]]></Impression><Impression>http://myTrackingURL/wrapper/impression</Impression>\n<Creatives>\n<Creative AdID=\"602833\">\n<Linear>\n<TrackingEvents></TrackingEvents>\n</Linear>\n</Creative>\n<Creative AdID=\"602833-Companion\">\n<CompanionAds>\n<Companion width=\"300\" height=\"250\">\n<StaticResource creativeType=\"image/jpeg\">\nhttp://demo.tremormedia.com/proddev/vast/300x250_banner1.jpg\n</StaticResource>\n<TrackingEvents>\n<Tracking event=\"creativeView\">\nhttp://myTrackingURL/wrapper/firstCompanionCreativeView\n</Tracking>\n</TrackingEvents>\n<CompanionClickThrough>http://www.tremormedia.com</CompanionClickThrough>\n</Companion>\n<Companion width=\"728\" height=\"90\">\n<StaticResource creativeType=\"image/jpeg\">\nhttp://demo.tremormedia.com/proddev/vast/728x90_banner1.jpg\n</StaticResource>\n<CompanionClickThrough>http://www.tremormedia.com</CompanionClickThrough>\n</Companion>\n</CompanionAds>\n</Creative>\n</Creatives>\n</Wrapper>\n</Ad>\n</VAST>\n';
  const ADM_VAST_VV_1 = '<VideoAdServingTemplate xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:noNamespaceSchemaLocation=\"vast_loose.xsd\">test</VideoAdServingTemplate>';
  const DEFAULT_SIZE_VAST = '640x480';
  const validBid = {
    'bidder': 'eplanning',
    'bidId': BID_ID,
    'params': {
      'ci': CI,
    },
    'adUnitCode': ADUNIT_CODE,
    'sizes': [[300, 250], [300, 600]],
  };
  const validBid2 = {
    'bidder': 'eplanning',
    'bidId': BID_ID2,
    'params': {
      'ci': CI,
    },
    'adUnitCode': ADUNIT_CODE2,
    'sizes': [[300, 250], [300, 600]],
  };
  const ML = '1';
  const validBidMappingLinear = {
    'bidder': 'eplanning',
    'bidId': BID_ID,
    'params': {
      'ci': CI,
      'ml': ML,
    },
    'adUnitCode': ADUNIT_CODE,
    'sizes': [[300, 250], [300, 600]],
  };
  const SN = 'spaceName';
  const validBidSpaceName = {
    'bidder': 'eplanning',
    'bidId': BID_ID,
    'params': {
      'ci': CI,
      'sn': SN,
    },
    'sizes': [[300, 250], [300, 600]],
  };
  const validBidSpaceOutstream = {
    'bidder': 'eplanning',
    'bidId': BID_ID,
    'params': {
      'ci': CI,
      'sn': SN,
    },
    'mediaTypes': {
      'video': {
        'context': 'outstream',
        'playerSize': [300, 600],
        'mimes': ['video/mp4'],
        'protocols': [1, 2, 3, 4, 5, 6],
        'playbackmethod': [2],
        'skip': 1
      }
    },
  };
  const validBidOutstreamNoSize = {
    'bidder': 'eplanning',
    'bidId': BID_ID,
    'params': {
      'ci': CI,
      'sn': SN,
    },
    'mediaTypes': {
      'video': {
        'context': 'outstream',
        'mimes': ['video/mp4'],
        'protocols': [1, 2, 3, 4, 5, 6],
        'playbackmethod': [2],
        'skip': 1
      }
    },
  };
  const validBidOutstreamNSizes = {
    'bidder': 'eplanning',
    'bidId': BID_ID,
    'params': {
      'ci': CI,
      'sn': SN,
    },
    'mediaTypes': {
      'video': {
        'context': 'outstream',
        'playerSize': [[300, 600], [400, 500], [500, 500]],
        'mimes': ['video/mp4'],
        'protocols': [1, 2, 3, 4, 5, 6],
        'playbackmethod': [2],
        'skip': 1
      }
    },
  };
  const bidOutstreamInvalidSizes = {
    'bidder': 'eplanning',
    'bidId': BID_ID,
    'params': {
      'ci': CI,
      'sn': SN,
    },
    'mediaTypes': {
      'video': {
        'context': 'outstream',
        'playerSize': 'invalidSize',
        'mimes': ['video/mp4'],
        'protocols': [1, 2, 3, 4, 5, 6],
        'playbackmethod': [2],
        'skip': 1
      }
    },
  };
  const validBidSpaceInstream = {
    'bidder': 'eplanning',
    'bidId': BID_ID,
    'params': {
      'ci': CI,
      'sn': SN,
    },
    'mediaTypes': {
      'video': {
        'context': 'instream',
        'mimes': ['video/mp4'],
        'protocols': [1, 2, 3, 4, 5, 6],
        'playbackmethod': [2],
        'skip': 1
      }
    },
  };
  const validBidSpaceVastNoContext = {
    'bidder': 'eplanning',
    'bidId': BID_ID,
    'params': {
      'ci': CI,
      'sn': SN,
    },
    'mediaTypes': {
      'video': {
        'mimes': ['video/mp4'],
        'protocols': [1, 2, 3, 4, 5, 6],
        'playbackmethod': [2],
        'skip': 1
      }
    },
  };
  const validBidView = {
    'bidder': 'eplanning',
    'bidId': BID_ID,
    'params': {
      'ci': CI,
    },
    'adUnitCode': ADUNIT_CODE_VIEW,
    'sizes': [[300, 250], [300, 600]],
  };
  const validBidView2 = {
    'bidder': 'eplanning',
    'bidId': BID_ID2,
    'params': {
      'ci': CI,
    },
    'adUnitCode': ADUNIT_CODE_VIEW2,
    'sizes': [[300, 250], [300, 600]],
  };
  const validBidView3 = {
    'bidder': 'eplanning',
    'bidId': BID_ID3,
    'params': {
      'ci': CI,
    },
    'adUnitCode': ADUNIT_CODE_VIEW3,
    'sizes': [[300, 250], [300, 600]],
  };
  const testBid = {
    'bidder': 'eplanning',
    'params': {
      't': 1,
      'isv': TEST_ISV
    },
    'adUnitCode': ADUNIT_CODE,
    'sizes': [[300, 250], [300, 600]],
  };
  const invalidBid = {
    'bidder': 'eplanning',
    'params': {
    },
    'adUnitCode': 'adunit-code',
    'sizes': [[300, 250], [300, 600]],
  };
  const validBidExistingSizesInPriorityListForMobile = {
    'bidder': 'eplanning',
    'bidId': BID_ID,
    'params': {
      'ci': CI,
    },
    'adUnitCode': ADUNIT_CODE,
    'sizes': [[970, 250], [320, 50], [300, 50]],
  };
  const validBidSizesNotExistingInPriorityListForMobile = {
    'bidder': 'eplanning',
    'bidId': BID_ID,
    'params': {
      'ci': CI,
    },
    'adUnitCode': ADUNIT_CODE,
    'sizes': [[970, 250], [300, 70], [160, 600]],
  };
  const validBidExistingSizesInPriorityListForDesktop = {
    'bidder': 'eplanning',
    'bidId': BID_ID,
    'params': {
      'ci': CI,
    },
    'adUnitCode': ADUNIT_CODE,
    'sizes': [[970, 250], [300, 600], [300, 250]],
    'ext': {
      'screen': {
        'w': 1025,
        'h': 1025
      }
    }
  };
  const validBidNoSize = {
    'bidder': 'eplanning',
    'bidId': BID_ID,
    'params': {
      'ci': CI,
      'sn': SN,
    }
  };
  const response = {
    body: {
      'sI': {
        'k': '12345'
      },
      'sec': {
        'k': 'ROS'
      },
      'sp': [{
        'k': CLEAN_ADUNIT_CODE,
        'a': [{
          'adm': ADM,
          'id': '7854abc56248f874',
          'i': I_ID,
          'fi': '7854abc56248f872',
          'ip': '45621afd87462104',
          'w': W,
          'h': H,
          'crid': CRID,
          'pr': CPM
        }],
      }],
      'cs': [
        'http://a-sync-url.com/',
        {
          'u': 'http://another-sync-url.com/test.php?&partner=123456&endpoint=us-east',
          'ifr': true
        }
      ]
    }
  };
  const responseVast = {
    body: {
      'sI': {
        'k': '12345'
      },
      'sec': {
        'k': 'ROS'
      },
      'sp': [{
        'k': CLEAN_ADUNIT_CODE_VAST,
        'a': [{
          'adm': ADM_VAST,
          'id': '7854abc56248f874',
          'i': I_ID,
          'fi': '7854abc56248f872',
          'ip': '45621afd87462104',
          'w': W,
          'h': H,
          'crid': CRID,
          'pr': CPM
        }],
      }],
      'cs': [
        'http://a-sync-url.com/',
        {
          'u': 'http://another-sync-url.com/test.php?&partner=123456&endpoint=us-east',
          'ifr': true
        }
      ]
    }
  };
  const responseVastVV1 = {
    body: {
      'sI': {
        'k': '12345'
      },
      'sec': {
        'k': 'ROS'
      },
      'sp': [{
        'k': CLEAN_ADUNIT_CODE_VAST,
        'a': [{
          'adm': ADM_VAST_VV_1,
          'id': '7854abc56248f874',
          'i': I_ID,
          'fi': '7854abc56248f872',
          'ip': '45621afd87462104',
          'w': W,
          'h': H,
          'crid': CRID,
          'pr': CPM
        }],
      }],
      'cs': [
        'http://a-sync-url.com/',
        {
          'u': 'http://another-sync-url.com/test.php?&partner=123456&endpoint=us-east',
          'ifr': true
        }
      ]
    }
  };
  const responseWithTwoAdunits = {
    body: {
      'sI': {
        'k': '12345'
      },
      'sec': {
        'k': 'ROS'
      },
      'sp': [{
        'k': CLEAN_ADUNIT_CODE,
        'a': [{
          'adm': ADM,
          'id': '7854abc56248f874',
          'i': I_ID,
          'fi': '7854abc56248f872',
          'ip': '45621afd87462104',
          'w': W,
          'h': H,
          'crid': CRID,
          'pr': CPM
        }]
      }, {
        'k': CLEAN_ADUNIT_CODE2,
        'a': [{
          'adm': ADM,
          'id': '7854abc56248f874',
          'i': I_ID,
          'fi': '7854abc56248f872',
          'ip': '45621afd87462104',
          'w': W,
          'h': H,
          'crid': CRID,
          'pr': CPM
        }],
      },
      ],
      'cs': [
        'http://a-sync-url.com/',
        {
          'u': 'http://another-sync-url.com/test.php?&partner=123456&endpoint=us-east',
          'ifr': true
        }
      ]
    }
  };
  const responseWithNoAd = {
    body: {
      'sI': {
        'k': '12345'
      },
      'sec': {
        'k': 'ROS'
      },
      'sp': [{
        'k': 'spname',
      }],
      'cs': [
        'http://a-sync-url.com/',
        {
          'u': 'http://another-sync-url.com/test.php?&partner=123456&endpoint=us-east',
          'ifr': true
        }
      ]
    }
  };
  const responseWithAdomain = {
    body: {
      'sI': {
        'k': '12345'
      },
      'sec': {
        'k': 'ROS'
      },
      'sp': [{
        'k': CLEAN_ADUNIT_CODE,
        'a': [{
          'adm': ADM,
          'id': '7854abc56248f874',
          'i': I_ID,
          'fi': '7854abc56248f872',
          'ip': '45621afd87462104',
          'w': W,
          'h': H,
          'crid': CRID,
          'pr': CPM,
          'adom': ADOMAIN
        }],
      }],
      'cs': [
        'http://a-sync-url.com/',
        {
          'u': 'http://another-sync-url.com/test.php?&partner=123456&endpoint=us-east',
          'ifr': true
        }
      ]
    }
  };

  const responseWithNoSpace = {
    body: {
      'sI': {
        'k': '12345'
      },
      'sec': {
        'k': 'ROS'
      },
      'cs': [
        'http://a-sync-url.com/',
        {
          'u': 'http://another-sync-url.com/test.php?&partner=123456&endpoint=us-east',
          'ifr': true
        }
      ]
    }
  };
  const refererUrl = 'https://localhost';
  const bidderRequest = {
    refererInfo: {
      page: refererUrl,
      domain: 'localhost',
      ref: refererUrl,
    },
    gdprConsent: {
      gdprApplies: 1,
      consentString: 'concentDataString',
      vendorData: {
        vendorConsents: {
          '90': 1
        },
      },
    },
    uspConsent: 'consentCcpa'
  };

  before(() => {
    hook.ready();
  });

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when bid has ci parameter', function () {
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should return false when bid does not have ci parameter and is not a test bid', function () {
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return true when bid does not have ci parameter but is a test bid', function () {
      expect(spec.isBidRequestValid(testBid)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [validBid];
    let sandbox;
    let getWindowSelfStub;
    let innerWidth;
    beforeEach(() => {
      $$PREBID_GLOBAL$$.bidderSettings = {
        eplanning: {
          storageAllowed: true
        }
      };
      sandbox = sinon.sandbox.create();
      getWindowSelfStub = sandbox.stub(utils, 'getWindowSelf');
      getWindowSelfStub.returns(createWindow(800));
    });

    afterEach(() => {
      $$PREBID_GLOBAL$$.bidderSettings = {};
      sandbox.restore();
    });

    const createWindow = (innerWidth) => {
      const win = {};
      win.self = win;
      win.innerWidth = innerWidth;
      return win;
    };

    it('should create the url correctly', function () {
      const url = spec.buildRequests(bidRequests, bidderRequest).url;
      expect(url).to.equal('https://pbjs.e-planning.net/pbjs/1/' + CI + '/1/localhost/ROS');
    });

    it('should return GET method', function () {
      const method = spec.buildRequests(bidRequests, bidderRequest).method;
      expect(method).to.equal('GET');
    });

    it('should return pbv parameter with value prebid version', function () {
      const pbv = spec.buildRequests(bidRequests, bidderRequest).data.pbv;
      expect(pbv).to.equal('$prebid.version$');
    });

    it('should return e parameter with value according to the adunit sizes', function () {
      const e = spec.buildRequests(bidRequests, bidderRequest).data.e;
      expect(e).to.equal('300x250_0:300x250,300x600');
    });

    it('should return e parameter with linear mapping attribute with value according to the adunit sizes', function () {
      let bidRequestsML = [validBidMappingLinear];
      const e = spec.buildRequests(bidRequestsML, bidderRequest).data.e;
      expect(e).to.equal(CLEAN_ADUNIT_CODE_ML + ':300x250,300x600');
    });

    it('should return e parameter with space name attribute with value according to the adunit sizes', function () {
      let bidRequestsSN = [validBidSpaceName];
      const e = spec.buildRequests(bidRequestsSN, bidderRequest).data.e;
      expect(e).to.equal(SN + ':300x250,300x600');
    });

    it('should return correct e parameter with more than one adunit', function () {
      const NEW_CODE = ADUNIT_CODE + '2';
      const CLEAN_NEW_CODE = CLEAN_ADUNIT_CODE + '2';
      const anotherBid = {
        'bidder': 'eplanning',
        'params': {
          'ci': CI,
        },
        'adUnitCode': NEW_CODE,
        'sizes': [[100, 100]],
      };
      bidRequests.push(anotherBid);

      const e = spec.buildRequests(bidRequests, bidderRequest).data.e;
      expect(e).to.equal('300x250_0:300x250,300x600+100x100_0:100x100');
    });

    it('should return correct e parameter with support vast with one space with size outstream', function () {
      let bidRequests = [validBidSpaceOutstream];
      const data = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(data.e).to.equal('video_300x600_0:300x600;1');
      expect(data.vctx).to.equal(2);
      expect(data.vv).to.equal(3);
    });

    it('should correctly return the e parameter with n sizes in playerSize', function () {
      let bidRequests = [validBidOutstreamNSizes];
      const data = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(data.e).to.equal('video_300x600_0:300x600;1');
      expect(data.vctx).to.equal(2);
      expect(data.vv).to.equal(3);
    });

    it('should correctly return the e parameter with invalid sizes in playerSize', function () {
      let bidRequests = [bidOutstreamInvalidSizes];
      const data = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(data.e).to.equal('video_' + DEFAULT_SIZE_VAST + '_0:' + DEFAULT_SIZE_VAST + ';1');
      expect(data.vctx).to.equal(2);
      expect(data.vv).to.equal(3);
    });

    it('should return correct e parameter with support vast with one space with size default outstream', function () {
      let bidRequests = [validBidOutstreamNoSize];
      const data = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(data.e).to.equal('video_640x480_0:640x480;1');
      expect(data.vctx).to.equal(2);
      expect(data.vv).to.equal(3);
    });

    it('should return correct e parameter with support vast with one space with size instream', function () {
      let bidRequests = [validBidSpaceInstream];
      const data = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(data.e).to.equal('video_640x480_0:640x480;1');
      expect(data.vctx).to.equal(1);
      expect(data.vv).to.equal(3);
    });

    it('should return correct e parameter with support vast with one space with size default and vctx default', function () {
      let bidRequests = [validBidSpaceVastNoContext];
      const data = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(data.e).to.equal('video_640x480_0:640x480;1');
      expect(data.vctx).to.equal(1);
      expect(data.vv).to.equal(3);
    });

    it('if 2 bids arrive, one outstream and the other instream, instream has more priority', function () {
      let bidRequests = [validBidSpaceOutstream, validBidSpaceInstream];
      const data = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(data.e).to.equal('video_640x480_0:640x480;1');
      expect(data.vctx).to.equal(1);
      expect(data.vv).to.equal(3);
    });
    it('if 2 bids arrive, one outstream and another banner, outstream has more priority', function () {
      let bidRequests = [validBidSpaceOutstream, validBidSpaceName];
      const data = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(data.e).to.equal('video_300x600_0:300x600;1');
      expect(data.vctx).to.equal(2);
      expect(data.vv).to.equal(3);
    });

    it('should return correct e parameter with support vast with one space outstream', function () {
      let bidRequests = [validBidSpaceOutstream, validBidOutstreamNoSize];
      const data = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(data.e).to.equal('video_300x600_0:300x600;1+video_640x480_1:640x480;1');
      expect(data.vctx).to.equal(2);
      expect(data.vv).to.equal(3);
    });

    it('should return correct e parameter with linear mapping attribute with more than one adunit', function () {
      let bidRequestsML = [validBidMappingLinear];
      const NEW_CODE = ADUNIT_CODE + '2';
      const CLEAN_NEW_CODE = CLEAN_ADUNIT_CODE_ML + '2';
      const anotherBid = {
        'bidder': 'eplanning',
        'params': {
          'ci': CI,
          'ml': ML,
        },
        'adUnitCode': NEW_CODE,
        'sizes': [[100, 100]],
      };
      bidRequestsML.push(anotherBid);

      const e = spec.buildRequests(bidRequestsML, bidderRequest).data.e;
      expect(e).to.equal(CLEAN_ADUNIT_CODE_ML + ':300x250,300x600+' + CLEAN_NEW_CODE + ':100x100');
    });

    it('should return correct e parameter with space name attribute with more than one adunit', function () {
      let bidRequestsSN = [validBidSpaceName];
      const NEW_SN = 'anotherNameSpace';
      const anotherBid = {
        'bidder': 'eplanning',
        'params': {
          'ci': CI,
          'sn': NEW_SN,
        },
        'sizes': [[100, 100]],
      };
      bidRequestsSN.push(anotherBid);

      const e = spec.buildRequests(bidRequestsSN, bidderRequest).data.e;
      expect(e).to.equal(SN + ':300x250,300x600+' + NEW_SN + ':100x100');
    });

    it('should return correct e parameter when the adunit has no size', function () {
      const noSizeBid = {
        'bidder': 'eplanning',
        'params': {
          'ci': CI,
        },
        'adUnitCode': ADUNIT_CODE,
      };

      const e = spec.buildRequests([noSizeBid], bidderRequest).data.e;
      expect(e).to.equal('1x1_0:1x1');
    });

    it('should return correct e parameter with linear mapping attribute when the adunit has no size', function () {
      const noSizeBid = {
        'bidder': 'eplanning',
        'params': {
          'ci': CI,
          'ml': ML,
        },
        'adUnitCode': ADUNIT_CODE,
      };

      const e = spec.buildRequests([noSizeBid], bidderRequest).data.e;
      expect(e).to.equal(CLEAN_ADUNIT_CODE_ML + ':1x1');
    });

    it('should return ur parameter with current window url', function () {
      const ur = spec.buildRequests(bidRequests, bidderRequest).data.ur;
      expect(ur).to.equal(bidderRequest.refererInfo.page);
    });

    it('should return fr parameter when there is a referrer', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const dataRequest = request.data;
      expect(dataRequest.fr).to.equal(refererUrl);
    });

    it('should return crs parameter with document charset', function () {
      let expected;
      try {
        expected = window.top.document.characterSet;
      } catch (e) {
        expected = document.characterSet;
      }

      const chset = spec.buildRequests(bidRequests, bidderRequest).data.crs;

      expect(chset).to.equal(expected);
    });

    it('should return the testing url when the request has the t parameter', function () {
      const url = spec.buildRequests([testBid], bidderRequest).url;
      const expectedUrl = 'https://' + TEST_ISV + '/layers/t_pbjs_2.json';
      expect(url).to.equal(expectedUrl);
    });

    it('should return the parameter ncb with value 1', function () {
      const ncb = spec.buildRequests(bidRequests, bidderRequest).data.ncb;
      expect(ncb).to.equal('1');
    });

    it('should properly build a gdpr request', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const dataRequest = request.data;
      expect(dataRequest.gdpr).to.equal('1');
      expect(dataRequest.gdprcs).to.equal('concentDataString');
    });

    it('should properly build a uspConsent request', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const dataRequest = request.data;
      expect(dataRequest.ccpa).to.equal('consentCcpa');
    });

    it('should return the e parameter with a value according to the sizes in order corresponding to the mobile priority list of the ad units', function () {
      let bidRequestsPrioritySizes = [validBidExistingSizesInPriorityListForMobile];
      const e = spec.buildRequests(bidRequestsPrioritySizes, bidderRequest).data.e;
      expect(e).to.equal('320x50_0:320x50,300x50,970x250');
    });

    it('should return the e parameter with a value according to the sizes in order corresponding to the desktop priority list of the ad units', function () {
      let bidRequestsPrioritySizes = [validBidExistingSizesInPriorityListForDesktop];
      // overwrite default innerWdith for tests with a larger one we consider "Desktop" or NOT Mobile
      getWindowSelfStub.returns(createWindow(1025));
      const e = spec.buildRequests(bidRequestsPrioritySizes, bidderRequest).data.e;
      expect(e).to.equal('300x250_0:300x250,300x600,970x250');
    });

    it('should return the e parameter with a value according to the sizes in order as they are sent from the ad units', function () {
      let bidRequestsPrioritySizes2 = [validBidSizesNotExistingInPriorityListForMobile];
      const e = spec.buildRequests(bidRequestsPrioritySizes2, bidderRequest).data.e;
      expect(e).to.equal('970x250_0:970x250,300x70,160x600');
    });
  });

  describe('interpretResponse', function () {
    it('should return an empty array when there is no ads in the response', function () {
      const bidResponses = spec.interpretResponse(responseWithNoAd);
      expect(bidResponses).to.be.empty;
    });

    it('should return an empty array when there is no spaces in the response', function () {
      const bidResponses = spec.interpretResponse(responseWithNoSpace);
      expect(bidResponses).to.be.empty;
    });

    it('should correctly map the parameters in the response', function () {
      const bidResponse = spec.interpretResponse(response, { adUnitToBidId: { [CLEAN_ADUNIT_CODE]: BID_ID } })[0];
      const expectedResponse = {
        requestId: BID_ID,
        cpm: CPM,
        width: W,
        height: H,
        ad: ADM,
        ttl: 120,
        creativeId: CRID,
        netRevenue: true,
        currency: 'USD',
      };
      expect(bidResponse).to.deep.equal(expectedResponse);
    });

    it('should pass advertiserDomains when present', function () {
      const bidResponse = spec.interpretResponse(responseWithAdomain, { adUnitToBidId: { [CLEAN_ADUNIT_CODE]: BID_ID } })[0];
      const expectedResponse = {
        requestId: BID_ID,
        cpm: CPM,
        width: W,
        height: H,
        ad: ADM,
        ttl: 120,
        creativeId: CRID,
        netRevenue: true,
        currency: 'USD',
        meta: {
          advertiserDomains: ADOMAIN
        }
      };
      expect(bidResponse).to.deep.equal(expectedResponse);
    });

    it('should correctly map the parameters in the response vast', function () {
      const bidResponse = spec.interpretResponse(responseVast, { adUnitToBidId: { [CLEAN_ADUNIT_CODE_VAST]: BID_ID } })[0];
      const expectedResponse = {
        requestId: BID_ID,
        cpm: CPM,
        width: W,
        height: H,
        ttl: 120,
        creativeId: CRID,
        netRevenue: true,
        currency: 'USD',
        vastXml: ADM_VAST,
        mediaTypes: VIDEO
      };
      expect(bidResponse).to.deep.equal(expectedResponse);
    });

    it('should correctly map the parameters in the response vast vv 1', function () {
      const bidResponse = spec.interpretResponse(responseVastVV1, { adUnitToBidId: { [CLEAN_ADUNIT_CODE_VAST]: BID_ID } })[0];
      const expectedResponse = {
        requestId: BID_ID,
        cpm: CPM,
        width: W,
        height: H,
        ttl: 120,
        creativeId: CRID,
        netRevenue: true,
        currency: 'USD',
        vastXml: ADM_VAST_VV_1,
        mediaTypes: VIDEO
      };
      expect(bidResponse).to.deep.equal(expectedResponse);
    });
  });

  describe('getUserSyncs', function () {
    const sOptionsAllEnabled = {
      pixelEnabled: true,
      iframeEnabled: true
    };
    const sOptionsAllDisabled = {
      pixelEnabled: false,
      iframeEnabled: false
    };
    const sOptionsOnlyPixel = {
      pixelEnabled: true,
      iframeEnabled: false
    };
    const sOptionsOnlyIframe = {
      pixelEnabled: false,
      iframeEnabled: true
    };

    it('should return an empty array if the response has no syncs', function () {
      const noSyncsResponse = { cs: [] };
      const syncs = spec.getUserSyncs(sOptionsAllEnabled, [noSyncsResponse]);
      expect(syncs).to.be.empty;
    });

    it('should return an empty array if there is no sync options enabled', function () {
      const syncs = spec.getUserSyncs(sOptionsAllDisabled, [response]);
      expect(syncs).to.be.empty;
    });

    it('should only return pixels if iframe is not enabled', function () {
      const syncs = spec.getUserSyncs(sOptionsOnlyPixel, [response]);
      syncs.forEach(sync => expect(sync.type).to.equal('image'));
    });

    it('should only return iframes if pixel is not enabled', function () {
      const syncs = spec.getUserSyncs(sOptionsOnlyIframe, [response]);
      syncs.forEach(sync => expect(sync.type).to.equal('iframe'));
    });
  });

  describe('adUnits mapping to bidId', function () {
    it('should correctly map the bidId to the adunit', function () {
      const requests = spec.buildRequests([validBid, validBid2], bidderRequest);
      const responses = spec.interpretResponse(responseWithTwoAdunits, requests);
      expect(responses[0].requestId).to.equal(BID_ID);
      expect(responses[1].requestId).to.equal(BID_ID2);
    });
  });
  describe('viewability', function() {
    let storageIdRender = 'pbsr_' + validBidView.adUnitCode;
    let storageIdView = 'pbvi_' + validBidView.adUnitCode;
    let bidRequests = [validBidView];
    let bidRequestMultiple = [validBidView, validBidView2, validBidView3];
    let getLocalStorageSpy;
    let setDataInLocalStorageSpy;
    let hasLocalStorageStub;
    let clock;
    let element;
    let getBoundingClientRectStub;
    let sandbox = sinon.sandbox.create();
    let intersectionObserverStub;
    let intersectionCallback;

    function setIntersectionObserverMock(params) {
      let fakeIntersectionObserver = (stateChange, options) => {
        intersectionCallback = stateChange;
        return {
          unobserve: (element) => {
            return element;
          },
          observe: (element) => {
            intersectionCallback([{'target': {'id': element.id}, 'isIntersecting': params[element.id].isIntersecting, 'intersectionRatio': params[element.id].ratio, 'boundingClientRect': {'width': params[element.id].width, 'height': params[element.id].height}}]);
          },
        };
      };

      intersectionObserverStub = sandbox.stub(window, 'IntersectionObserver').callsFake(fakeIntersectionObserver);
    }
    function createElement(id) {
      element = document.createElement('div');
      element.id = id || ADUNIT_CODE_VIEW;
      element.style.width = '50px';
      element.style.height = '50px';
      if (frameElement) {
        frameElement.style.width = '100px';
        frameElement.style.height = '100px';
      }
      element.style.background = 'black';
      document.body.appendChild(element);
    }
    function createElementVisible(id) {
      createElement(id);
      sandbox.stub(element, 'getBoundingClientRect').returns({
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        top: 0,
        right: 50,
        bottom: 50,
        left: 0,
      });
    }
    function createElementOutOfView(id) {
      createElement(id);
      sandbox.stub(element, 'getBoundingClientRect').returns({
        x: 100,
        y: 100,
        width: 250,
        height: 250,
        top: 100,
        right: 350,
        bottom: 350,
        left: 100,
      });
    }

    function createPartiallyVisibleElement(id) {
      createElement(id);
      sandbox.stub(element, 'getBoundingClientRect').returns({
        x: 0,
        y: 0,
        width: 50,
        height: 150,
        top: 0,
        right: 50,
        bottom: 150,
        left: 0,
      });
    }
    function createPartiallyInvisibleElement(id) {
      createElement(id);
      sandbox.stub(element, 'getBoundingClientRect').returns({
        x: 0,
        y: 0,
        width: 150,
        height: 150,
        top: 0,
        right: 150,
        bottom: 150,
        left: 0,
      });
    }
    function createElementOutOfRange(id) {
      createElement(id);
      sandbox.stub(element, 'getBoundingClientRect').returns({
        x: 200,
        y: 200,
        width: 350,
        height: 350,
        top: 200,
        right: 350,
        bottom: 350,
        left: 200,
      });
    }
    beforeEach(function () {
      $$PREBID_GLOBAL$$.bidderSettings = {
        eplanning: {
          storageAllowed: true
        }
      };
      getLocalStorageSpy = sandbox.spy(storage, 'getDataFromLocalStorage');
      setDataInLocalStorageSpy = sandbox.spy(storage, 'setDataInLocalStorage');

      hasLocalStorageStub = sandbox.stub(storage, 'hasLocalStorage');
      hasLocalStorageStub.returns(true);

      clock = sandbox.useFakeTimers();
    });
    afterEach(function () {
      $$PREBID_GLOBAL$$.bidderSettings = {};
      sandbox.restore();
      if (document.getElementById(ADUNIT_CODE_VIEW)) {
        document.body.removeChild(element);
      }
      window.top.localStorage.removeItem(storageIdRender);
      window.top.localStorage.removeItem(storageIdView);
    });

    it('should create the url correctly without LocalStorage', function() {
      createElementVisible();
      hasLocalStorageStub.returns(false);
      const response = spec.buildRequests(bidRequests, bidderRequest);

      expect(response.url).to.equal('https://pbjs.e-planning.net/pbjs/1/' + CI + '/1/localhost/ROS');
      expect(response.data.vs).to.equal('F');

      sinon.assert.notCalled(getLocalStorageSpy);
      sinon.assert.notCalled(setDataInLocalStorageSpy);
    });

    it('should create the url correctly with LocalStorage', function() {
      createElementVisible();
      const response = spec.buildRequests(bidRequests, bidderRequest);
      expect(response.url).to.equal('https://pbjs.e-planning.net/pbjs/1/' + CI + '/1/localhost/ROS');

      expect(response.data.vs).to.equal('F');

      sinon.assert.called(getLocalStorageSpy);
      sinon.assert.called(setDataInLocalStorageSpy);
      sinon.assert.calledWith(getLocalStorageSpy, storageIdRender);
      sinon.assert.calledWith(setDataInLocalStorageSpy, storageIdRender);

      expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('1');
    });

    context('when element is fully in view', function() {
      let respuesta;
      beforeEach(function () {
        createElementVisible();
        setIntersectionObserverMock({[ADUNIT_CODE_VIEW]: {'ratio': 1, 'isIntersecting': true, 'width': 200, 'height': 200}});
      });
      it('when you have a render', function() {
        respuesta = spec.buildRequests(bidRequests, bidderRequest);
        clock.tick(1005);

        expect(respuesta.data.vs).to.equal('F');

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('1');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal('1');
      });
      it('when you have more than four render', function() {
        storage.setDataInLocalStorage(storageIdRender, 4);
        respuesta = spec.buildRequests(bidRequests, bidderRequest);
        clock.tick(1005);

        expect(respuesta.data.vs).to.equal('0');

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('5');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal('1');
      });
      it('when you have more than four render and already record visibility', function() {
        storage.setDataInLocalStorage(storageIdRender, 4);
        storage.setDataInLocalStorage(storageIdView, 4);
        respuesta = spec.buildRequests(bidRequests, bidderRequest);
        clock.tick(1005);

        expect(respuesta.data.vs).to.equal('a');

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('5');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal('5');
      });
    });

    context('when element is out of view', function() {
      let respuesta;
      beforeEach(function () {
        createElementOutOfView();
        setIntersectionObserverMock({[ADUNIT_CODE_VIEW]: {'ratio': 0, 'isIntersecting': false, 'width': 200, 'height': 200}});
      });

      it('when you have a render', function() {
        respuesta = spec.buildRequests(bidRequests, bidderRequest);
        clock.tick(1005);
        expect(respuesta.data.vs).to.equal('F');

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('1');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal(null);
      });
      it('when you have more than four render', function() {
        storage.setDataInLocalStorage(storageIdRender, 4);
        respuesta = spec.buildRequests(bidRequests, bidderRequest);
        clock.tick(1005);
        expect(respuesta.data.vs).to.equal('0');

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('5');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal(null);
      });
    });

    context('when element is partially in view', function() {
      let respuesta;
      it('should register visibility with more than 50%', function() {
        createPartiallyVisibleElement();
        setIntersectionObserverMock({[ADUNIT_CODE_VIEW]: {'ratio': 0.6, 'isIntersecting': true, 'width': 200, 'height': 200}});
        respuesta = spec.buildRequests(bidRequests, bidderRequest);
        clock.tick(1005);

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('1');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal('1');
      });
      it('you should not register visibility with less than 50%', function() {
        createPartiallyInvisibleElement();
        setIntersectionObserverMock({[ADUNIT_CODE_VIEW]: {'ratio': 0.4, 'isIntersecting': true, 'width': 200, 'height': 200}});
        respuesta = spec.buildRequests(bidRequests, bidderRequest);
        clock.tick(1005);

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('1');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal(null);
      });
    });
    context('when element id is not equal to adunitcode', function() {
      let respuesta;
      it('should register visibility with more than 50%', function() {
        const code = ADUNIT_CODE_VIEW;
        const divId = 'div-gpt-ad-123';
        createPartiallyVisibleElement(divId);
        window.googletag.pubads().setSlots([makeSlot({ code, divId })]);
        setIntersectionObserverMock({[divId]: {'ratio': 0.6, 'isIntersecting': true, 'width': 200, 'height': 200}});

        respuesta = spec.buildRequests(bidRequests, bidderRequest);
        clock.tick(1005);

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('1');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal('1');
      });
    });
    context('when width or height of the element is zero', function() {
      beforeEach(function () {
        createElementVisible();
      });
      it('if the width is zero but the height is within the range', function() {
        element.style.width = '0px';
        setIntersectionObserverMock({[ADUNIT_CODE_VIEW]: {'ratio': 0.4, 'isIntersecting': true, 'width': 200, 'height': 200}});
        spec.buildRequests(bidRequests, bidderRequest)
        clock.tick(1005);

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('1');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal(null);
      });
      it('if the height is zero but the width is within the range', function() {
        element.style.height = '0px';
        setIntersectionObserverMock({[ADUNIT_CODE_VIEW]: {'ratio': 1, 'isIntersecting': true, 'width': 500, 'height': 0}});
        spec.buildRequests(bidRequests, bidderRequest)
        clock.tick(1005);

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('1');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal(null);
      });
      it('if both are zero', function() {
        element.style.height = '0px';
        element.style.width = '0px';
        setIntersectionObserverMock({[ADUNIT_CODE_VIEW]: {'ratio': 1, 'isIntersecting': true, 'width': 0, 'height': 0}});
        spec.buildRequests(bidRequests, bidderRequest)
        clock.tick(1005);

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('1');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal(null);
      });
    });
    context('segmentBeginsBeforeTheVisibleRange', function() {
      it('segmentBeginsBeforeTheVisibleRange', function() {
        createElementOutOfRange();
        spec.buildRequests(bidRequests, bidderRequest);
        clock.tick(1005);
        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('1');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal(null);
      });
    });
    context('when there are multiple adunit', function() {
      let respuesta;
      beforeEach(function () {
        [ADUNIT_CODE_VIEW, ADUNIT_CODE_VIEW2, ADUNIT_CODE_VIEW3].forEach(ac => {
          storage.setDataInLocalStorage('pbsr_' + ac, 5);
          storage.setDataInLocalStorage('pbvi_' + ac, 5);
        });
      });
      afterEach(function () {
        [ADUNIT_CODE_VIEW, ADUNIT_CODE_VIEW2, ADUNIT_CODE_VIEW3].forEach(ac => {
          if (document.getElementById(ac)) {
            document.body.removeChild(document.getElementById(ac));
          }
          window.top.localStorage.removeItem(ac);
          window.top.localStorage.removeItem(ac);
        });
      });
      it('all visibles', function() {
        createElementVisible(ADUNIT_CODE_VIEW);
        createElementVisible(ADUNIT_CODE_VIEW2);
        createElementVisible(ADUNIT_CODE_VIEW3);
        setIntersectionObserverMock({
          [ADUNIT_CODE_VIEW]: {'ratio': 1, 'isIntersecting': true, 'width': 200, 'height': 200},
          [ADUNIT_CODE_VIEW2]: {'ratio': 1, 'isIntersecting': true, 'width': 200, 'height': 200},
          [ADUNIT_CODE_VIEW3]: {'ratio': 1, 'isIntersecting': true, 'width': 200, 'height': 200}
        });
        respuesta = spec.buildRequests(bidRequestMultiple, bidderRequest);
        clock.tick(1005);
        [ADUNIT_CODE_VIEW, ADUNIT_CODE_VIEW2, ADUNIT_CODE_VIEW3].forEach(ac => {
          expect(storage.getDataFromLocalStorage('pbsr_' + ac)).to.equal('6');
          expect(storage.getDataFromLocalStorage('pbvi_' + ac)).to.equal('6');
        });
        expect('aaa').to.equal(respuesta.data.vs);
      });
      it('none visible', function() {
        createElementOutOfView(ADUNIT_CODE_VIEW);
        createElementOutOfView(ADUNIT_CODE_VIEW2);
        createElementOutOfView(ADUNIT_CODE_VIEW3);
        setIntersectionObserverMock({
          [ADUNIT_CODE_VIEW]: {'ratio': 0, 'isIntersecting': false, 'width': 200, 'height': 200},
          [ADUNIT_CODE_VIEW2]: {'ratio': 0, 'isIntersecting': false, 'width': 200, 'height': 200},
          [ADUNIT_CODE_VIEW3]: {'ratio': 0, 'isIntersecting': false, 'width': 200, 'height': 200}
        });
        respuesta = spec.buildRequests(bidRequestMultiple, bidderRequest);
        clock.tick(1005);
        [ADUNIT_CODE_VIEW, ADUNIT_CODE_VIEW2, ADUNIT_CODE_VIEW3].forEach(ac => {
          expect(storage.getDataFromLocalStorage('pbsr_' + ac)).to.equal('6');
          expect(storage.getDataFromLocalStorage('pbvi_' + ac)).to.equal('5');
        });

        expect('aaa').to.equal(respuesta.data.vs);
      });
      it('some visible and others not visible', function() {
        createElementVisible(ADUNIT_CODE_VIEW);
        createElementOutOfView(ADUNIT_CODE_VIEW2);
        createElementOutOfView(ADUNIT_CODE_VIEW3);
        setIntersectionObserverMock({
          [ADUNIT_CODE_VIEW]: {'ratio': 1, 'isIntersecting': true, 'width': 200, 'height': 200},
          [ADUNIT_CODE_VIEW2]: {'ratio': 0.3, 'isIntersecting': true, 'width': 200, 'height': 200},
          [ADUNIT_CODE_VIEW3]: {'ratio': 0, 'isIntersecting': false, 'width': 200, 'height': 200}
        });
        respuesta = spec.buildRequests(bidRequestMultiple, bidderRequest);
        clock.tick(1005);
        expect(storage.getDataFromLocalStorage('pbsr_' + ADUNIT_CODE_VIEW)).to.equal('6');
        expect(storage.getDataFromLocalStorage('pbvi_' + ADUNIT_CODE_VIEW)).to.equal('6');
        [ADUNIT_CODE_VIEW2, ADUNIT_CODE_VIEW3].forEach(ac => {
          expect(storage.getDataFromLocalStorage('pbsr_' + ac)).to.equal('6');
          expect(storage.getDataFromLocalStorage('pbvi_' + ac)).to.equal('5');
        });
        expect('aaa').to.equal(respuesta.data.vs);
      });
    });
  });
  describe('Send eids', function() {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      // TODO: bid adapters should look at request data, not call getGlobal().getUserIds
      sandbox.stub(getGlobal(), 'getUserIds').callsFake(() => ({
        pubcid: 'c29cb2ae-769d-42f6-891a-f53cadee823d',
        tdid: 'D6885E90-2A7A-4E0F-87CB-7734ED1B99A3',
        id5id: { uid: 'ID5-ZHMOL_IfFSt7_lVYX8rBZc6GH3XMWyPQOBUfr4bm0g!', ext: { linkType: 1 } }
      }))
    });

    afterEach(() => {
      sandbox.restore();
    })

    it('should add eids to the request', function() {
      let bidRequests = [validBidView];
      const expected_id5id = encodeURIComponent(JSON.stringify({ uid: 'ID5-ZHMOL_IfFSt7_lVYX8rBZc6GH3XMWyPQOBUfr4bm0g!', ext: { linkType: 1 } }));
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const dataRequest = request.data;

      expect('D6885E90-2A7A-4E0F-87CB-7734ED1B99A3').to.equal(dataRequest.e_tdid);
      expect('c29cb2ae-769d-42f6-891a-f53cadee823d').to.equal(dataRequest.e_pubcid);
      expect(expected_id5id).to.equal(dataRequest.e_id5id);
    });
  });
});
