import { expect } from 'chai';
import { spec, storage } from 'modules/eplanningBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

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
  const validBid = {
    'bidder': 'eplanning',
    'bidId': BID_ID,
    'params': {
      'ci': CI,
    },
    'adUnitCode': ADUNIT_CODE,
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
  const validBid2 = {
    'bidder': 'eplanning',
    'bidId': BID_ID2,
    'params': {
      'ci': CI,
    },
    'adUnitCode': ADUNIT_CODE2,
    'sizes': [[300, 250], [300, 600]],
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
      referer: refererUrl
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
      const url = spec.buildRequests(bidRequests, bidderRequest).url;
      expect(url).to.equal('https://ads.us.e-planning.net/hb/1/' + CI + '/1/localhost/ROS');
    });

    it('should return GET method', function () {
      const method = spec.buildRequests(bidRequests, bidderRequest).method;
      expect(method).to.equal('GET');
    });

    it('should return r parameter with value pbjs', function () {
      const r = spec.buildRequests(bidRequests, bidderRequest).data.r;
      expect(r).to.equal('pbjs');
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
      expect(ur).to.equal(bidderRequest.refererInfo.referer);
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
    let focusStub;
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
      getLocalStorageSpy = sandbox.spy(storage, 'getDataFromLocalStorage');
      setDataInLocalStorageSpy = sandbox.spy(storage, 'setDataInLocalStorage');

      hasLocalStorageStub = sandbox.stub(storage, 'hasLocalStorage');
      hasLocalStorageStub.returns(true);

      clock = sandbox.useFakeTimers();

      focusStub = sandbox.stub(window.top.document, 'hasFocus');
      focusStub.returns(true);
    });
    afterEach(function () {
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

      expect(response.url).to.equal('https://ads.us.e-planning.net/hb/1/' + CI + '/1/localhost/ROS');
      expect(response.data.vs).to.equal('F');

      sinon.assert.notCalled(getLocalStorageSpy);
      sinon.assert.notCalled(setDataInLocalStorageSpy);
    });

    it('should create the url correctly with LocalStorage', function() {
      createElementVisible();
      const response = spec.buildRequests(bidRequests, bidderRequest);
      expect(response.url).to.equal('https://ads.us.e-planning.net/hb/1/' + CI + '/1/localhost/ROS');

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
        respuesta = spec.buildRequests(bidRequests, bidderRequest);
        clock.tick(1005);

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('1');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal('1');
      });
      it('you should not register visibility with less than 50%', function() {
        createPartiallyInvisibleElement();
        respuesta = spec.buildRequests(bidRequests, bidderRequest);
        clock.tick(1005);

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('1');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal(null);
      });
    });
    context('when width or height of the element is zero', function() {
      beforeEach(function () {
        createElementVisible();
      });
      it('if the width is zero but the height is within the range', function() {
        element.style.width = '0px';
        spec.buildRequests(bidRequests, bidderRequest)
        clock.tick(1005);

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('1');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal(null);
      });
      it('if the height is zero but the width is within the range', function() {
        element.style.height = '0px';
        spec.buildRequests(bidRequests, bidderRequest)
        clock.tick(1005);

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('1');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal(null);
      });
      it('if both are zero', function() {
        element.style.height = '0px';
        element.style.width = '0px';
        spec.buildRequests(bidRequests, bidderRequest)
        clock.tick(1005);

        expect(storage.getDataFromLocalStorage(storageIdRender)).to.equal('1');
        expect(storage.getDataFromLocalStorage(storageIdView)).to.equal(null);
      });
    });
    context('when tab is inactive', function() {
      it('I should not register if it is not in focus', function() {
        createElementVisible();
        focusStub.returns(false);
        spec.buildRequests(bidRequests, bidderRequest);
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
});
