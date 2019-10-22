import { expect } from 'chai';
import { spec } from 'modules/eplanningBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

describe('E-Planning Adapter', function () {
  const adapter = newBidder('spec');
  const CI = '12345';
  const ADUNIT_CODE = 'adunit-co:de';
  const ADUNIT_CODE2 = 'adunit-code-dos';
  const CLEAN_ADUNIT_CODE2 = 'adunitcodedos';
  const CLEAN_ADUNIT_CODE = 'adunitco_de';
  const BID_ID = '123456789';
  const BID_ID2 = '987654321';
  const CPM = 1.3;
  const W = '300';
  const H = '250';
  const ADM = '<div>This is an ad</div>';
  const I_ID = '7854abc56248f873';
  const CRID = '1234567890';
  const TEST_ISV = 'leles.e-planning.net';
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
        'https://a-sync-url.com/',
        {
          'u': 'https://another-sync-url.com/test.php?&partner=123456&endpoint=us-east',
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
        'https://a-sync-url.com/',
        {
          'u': 'https://another-sync-url.com/test.php?&partner=123456&endpoint=us-east',
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
        'https://a-sync-url.com/',
        {
          'u': 'https://another-sync-url.com/test.php?&partner=123456&endpoint=us-east',
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
        'https://a-sync-url.com/',
        {
          'u': 'https://another-sync-url.com/test.php?&partner=123456&endpoint=us-east',
          'ifr': true
        }
      ]
    }
  };

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

    it('should create the url correctly', function () {
      const url = spec.buildRequests(bidRequests).url;
      expect(url).to.equal('https://ads.us.e-planning.net/hb/1/' + CI + '/1/localhost/ROS');
    });

    it('should return GET method', function () {
      const method = spec.buildRequests(bidRequests).method;
      expect(method).to.equal('GET');
    });

    it('should return r parameter with value pbjs', function () {
      const r = spec.buildRequests(bidRequests).data.r;
      expect(r).to.equal('pbjs');
    });

    it('should return pbv parameter with value prebid version', function () {
      const pbv = spec.buildRequests(bidRequests).data.pbv;
      expect(pbv).to.equal('$prebid.version$');
    });

    it('should return e parameter with value according to the adunit sizes', function () {
      const e = spec.buildRequests(bidRequests).data.e;
      expect(e).to.equal(CLEAN_ADUNIT_CODE + ':300x250,300x600');
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

      const e = spec.buildRequests(bidRequests).data.e;
      expect(e).to.equal(CLEAN_ADUNIT_CODE + ':300x250,300x600+' + CLEAN_NEW_CODE + ':100x100');
    });

    it('should return correct e parameter when the adunit has no size', function () {
      const noSizeBid = {
        'bidder': 'eplanning',
        'params': {
          'ci': CI,
        },
        'adUnitCode': ADUNIT_CODE,
      };

      const e = spec.buildRequests([noSizeBid]).data.e;
      expect(e).to.equal(CLEAN_ADUNIT_CODE + ':1x1');
    });

    it('should return ur parameter with current window url', function () {
      const ur = spec.buildRequests(bidRequests).data.ur;
      expect(ur).to.equal(utils.getTopWindowUrl());
    });

    it('should return fr parameter when there is a referrer', function () {
      const referrer = 'thisisafakereferrer';
      const stubGetReferrer = sinon.stub(utils, 'getTopWindowReferrer');
      stubGetReferrer.returns(referrer);
      const fr = spec.buildRequests(bidRequests).data.fr;
      expect(fr).to.equal(referrer);
      stubGetReferrer.restore()
    });

    it('should return crs parameter with document charset', function () {
      let expected;
      try {
        expected = window.top.document.characterSet;
      } catch (e) {
        expected = document.characterSet;
      }

      const chset = spec.buildRequests(bidRequests).data.crs;

      expect(chset).to.equal(expected);
    });

    it('should return the testing url when the request has the t parameter', function () {
      const url = spec.buildRequests([testBid]).url;
      const expectedUrl = 'https://' + TEST_ISV + '/layers/t_pbjs_2.json';
      expect(url).to.equal(expectedUrl);
    });

    it('should return the parameter ncb with value 1', function () {
      const ncb = spec.buildRequests(bidRequests).data.ncb;
      expect(ncb).to.equal('1');
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
      const requests = spec.buildRequests([validBid, validBid2]);
      const responses = spec.interpretResponse(responseWithTwoAdunits, requests);
      expect(responses[0].requestId).to.equal(BID_ID);
      expect(responses[1].requestId).to.equal(BID_ID2);
    });
  });
});
