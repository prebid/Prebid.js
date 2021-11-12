import { expect } from 'chai';
import {
  init,
  MODULE_NAME,
  validateConfig
} from 'modules/yieldmoSyntheticInventoryModule';

const mockedYmConfig = {
  placementId: '123456',
  adUnitPath: '/6355419/ad_unit_name_used_in_gam'
};

const setGoogletag = () => {
  window.top.googletag = {
    cmd: [],
    defineSlot: sinon.stub(),
    addService: sinon.stub(),
    pubads: sinon.stub(),
    setTargeting: sinon.stub(),
    enableServices: sinon.stub(),
    display: sinon.stub(),
  };
  window.top.googletag.defineSlot.returns(window.top.googletag);
  window.top.googletag.addService.returns(window.top.googletag);
  window.top.googletag.pubads.returns({getSlots: sinon.stub()});
  return window.top.googletag;
}

const getQuearyParamsFromUrl = (url) =>
  [...new URL(url).searchParams]
    .reduce(
      (agg, param) => {
        const [key, value] = param;

        agg[key] = value;

        return agg;
      },
      {}
    );

describe('Yieldmo Synthetic Inventory Module', function() {
  let config = Object.assign({}, mockedYmConfig);
  let googletagBkp;

  beforeEach(function () {
    googletagBkp = window.googletag;
    delete window.googletag;
  });

  afterEach(function () {
    window.googletag = googletagBkp;
  });

  it('should throw an error if placementId is missed', function() {
    const {placementId, ...config} = mockedYmConfig;

    expect(function () {
      validateConfig(config);
    }).throw(`${MODULE_NAME}: placementId required`);
  });

  it('should throw an error if adUnitPath is missed', function() {
    const {adUnitPath, ...config} = mockedYmConfig;

    expect(function () {
      validateConfig(config);
    }).throw(`${MODULE_NAME}: adUnitPath required`);
  });

  describe('getAd', () => {
    let requestMock = {
      open: sinon.stub(),
      send: sinon.stub(),
    };
    const originalXMLHttpRequest = window.XMLHttpRequest;
    const originalConnection = window.navigator.connection;
    let clock;
    let adServerRequest;
    let response;
    const responseData = {
      data: [{
        ads: [{
          foo: 'bar',
        }]
      }]
    };

    beforeEach(() => {
      window.XMLHttpRequest = function FakeXMLHttpRequest() {
        this.open = requestMock.open;
        this.send = requestMock.send;

        adServerRequest = this;
      };

      response = {
        target: {
          responseText: JSON.stringify(responseData),
          status: 200,
        }
      };

      clock = sinon.useFakeTimers();
      Object.defineProperty(window.navigator, 'connection', { value: {}, writable: true });
    });

    afterEach(() => {
      window.XMLHttpRequest = originalXMLHttpRequest;

      requestMock.open.resetBehavior();
      requestMock.open.resetHistory();
      requestMock.send.resetBehavior();
      requestMock.send.resetHistory();

      adServerRequest = undefined;

      clock.restore();
    });

    after(() => {
      window.navigator.connection = originalConnection;
    });

    it('should open ad request to ad server', () => {
      init(mockedYmConfig);

      const adServerHost = (new URL(requestMock.open.getCall(0).args[1])).host;
      expect(adServerHost).to.be.equal('ads.yieldmo.com');
    });

    it('should properly combine ad request query', () => {
      const pageDimensions = {
        density: window.top.devicePixelRatio || 0,
        height: window.top.screen.height || window.screen.top.availHeight || window.top.outerHeight || window.top.innerHeight || 481,
        width: window.top.screen.width || window.screen.top.availWidth || window.top.outerWidth || window.top.innerWidth || 321,
      };

      init(mockedYmConfig);

      const queryParams = getQuearyParamsFromUrl(requestMock.open.getCall(0).args[1]);

      const timeStamp = queryParams.bust;

      expect(queryParams).to.deep.equal({
        _s: '1',
        dnt: 'false',
        e: '4',
        h: `${pageDimensions.height}`,
        p: mockedYmConfig.placementId,
        page_url: window.top.location.href,
        pr: window.top.location.href,
        scrd: `${pageDimensions.density}`,
        w: `${pageDimensions.width}`,
        title: document.title,
      });
    });

    it('should send ad request to ad server', () => {
      init(mockedYmConfig);

      expect(requestMock.send.calledOnceWith(null)).to.be.true;
    });

    it('should throw an error if can not parse response', () => {
      response.target.responseText = undefined;

      init(mockedYmConfig);

      expect(() => adServerRequest.onload(response)).to.throw();
    });

    it('should throw an error if status is not 200', () => {
      response.target.status = 500;

      init(mockedYmConfig);

      expect(() => adServerRequest.onload(response)).to.throw();
    });

    it('should throw an error if there is no data in response', () => {
      response.target.responseText = '{}';

      init(mockedYmConfig);

      expect(() => adServerRequest.onload(response)).to.throw();
    });

    it('should throw an error if there is no ads in response data', () => {
      response.target.responseText = '{ data: [{}] }';

      init(mockedYmConfig);

      expect(() => adServerRequest.onload(response)).to.throw();
    });

    it('should store ad response in window object', () => {
      init(mockedYmConfig);

      adServerRequest.onload(response);

      expect(window.top.__ymAds).to.deep.equal(responseData);
    });

    it('should add correct googletag.cmd', function() {
      const containerName = 'ym_sim_container_' + mockedYmConfig.placementId;
      const gtag = setGoogletag();

      init(mockedYmConfig);

      adServerRequest.onload(response);

      expect(gtag.cmd.length).to.equal(1);

      gtag.cmd[0]();

      expect(gtag.addService.getCall(0)).to.not.be.null;
      expect(gtag.setTargeting.getCall(0)).to.not.be.null;
      expect(gtag.setTargeting.getCall(0).args[0]).to.exist.and.to.equal('ym_sim_p_id');
      expect(gtag.setTargeting.getCall(0).args[1]).to.exist.and.to.equal(mockedYmConfig.placementId);
      expect(gtag.defineSlot.getCall(0)).to.not.be.null;
      expect(gtag.enableServices.getCall(0)).to.not.be.null;
      expect(gtag.display.getCall(0)).to.not.be.null;
      expect(gtag.display.getCall(0).args[0]).to.exist.and.to.equal(containerName);
      expect(gtag.pubads.getCall(0)).to.not.be.null;

      const gamContainerEl = window.top.document.getElementById(containerName);
      expect(gamContainerEl).to.not.be.null;

      gamContainerEl.parentNode.removeChild(gamContainerEl);
    });
  });

  describe('lookupIabConsent', () => {
    const callId = Math.random();
    const cmpFunction = sinon.stub();
    const originalXMLHttpRequest = window.XMLHttpRequest;
    let requestMock = {
      open: sinon.stub(),
      send: sinon.stub(),
    };
    let clock;
    let postMessageStub;
    let mathRandomStub;
    let addEventListenerStub;

    beforeEach(() => {
      postMessageStub = sinon.stub(window, 'postMessage');
      mathRandomStub = sinon.stub(Math, 'random');
      addEventListenerStub = sinon.stub(window, 'addEventListener');

      window.XMLHttpRequest = function FakeXMLHttpRequest() {
        this.open = requestMock.open;
        this.send = requestMock.send;
      };

      clock = sinon.useFakeTimers();
    });

    afterEach(() => {
      window.XMLHttpRequest = originalXMLHttpRequest;

      postMessageStub.restore();
      mathRandomStub.restore();
      addEventListenerStub.restore();

      cmpFunction.resetBehavior();
      cmpFunction.resetHistory();

      requestMock.open.resetBehavior();
      requestMock.open.resetHistory();
      requestMock.send.resetBehavior();
      requestMock.send.resetHistory();

      clock.restore();
    });

    it('should get cmp function', () => {
      window.__tcfapi = cmpFunction;

      init(mockedYmConfig);

      window.__tcfapi = undefined;

      expect(cmpFunction.calledOnceWith('addEventListener', 2)).to.be.true;
    });

    it('should call api without cmp consent if can not get it', () => {
      cmpFunction.callsFake((e, version, callback) => {
        callback(undefined, false);
      });

      window.__tcfapi = cmpFunction;

      init(mockedYmConfig);

      window.__tcfapi = undefined;

      expect(requestMock.open.calledOnce).to.be.true;
    });

    it('should add cmp consent string to ad server request params if gdprApplies is false', () => {
      const tcfData = { gdprApplies: false, tcString: 'testTcString' };

      cmpFunction.callsFake((e, version, callback) => {
        callback(tcfData, true);
      });

      window.__tcfapi = cmpFunction;

      init(mockedYmConfig);

      window.__tcfapi = undefined;

      const queryParams = getQuearyParamsFromUrl(requestMock.open.getCall(0).args[1]);

      expect(queryParams.cmp).to.be.equal(tcfData.tcString);
    });

    it('should add cmp consent string to ad server request params if eventStatus is tcloaded', () => {
      const tcfData = { eventStatus: 'tcloaded', tcString: 'testTcString' };

      cmpFunction.callsFake((e, version, callback) => {
        callback(tcfData, true);
      });

      window.__tcfapi = cmpFunction;

      init(mockedYmConfig);

      window.__tcfapi = undefined;

      const queryParams = getQuearyParamsFromUrl(requestMock.open.getCall(0).args[1]);

      expect(queryParams.cmp).to.be.equal(tcfData.tcString);
    });

    it('should add cmp consent string to ad server request params if eventStatus is useractioncomplete', () => {
      const tcfData = { eventStatus: 'useractioncomplete', tcString: 'testTcString' };

      cmpFunction.callsFake((e, version, callback) => {
        callback(tcfData, true);
      });

      window.__tcfapi = cmpFunction;

      init(mockedYmConfig);

      window.__tcfapi = undefined;

      const queryParams = getQuearyParamsFromUrl(requestMock.open.getCall(0).args[1]);

      expect(queryParams.cmp).to.be.equal(tcfData.tcString);
    });

    it('should post message if cmp consent is loaded from another iframe', () => {
      window.frames['__tcfapiLocator'] = 'cmpframe';

      init(mockedYmConfig);

      window.frames['__tcfapiLocator'] = undefined;

      expect(window.postMessage.callCount).to.be.equal(1);
    });

    it('should add event listener for message event if usp consent is loaded from another iframe', () => {
      window.frames['__tcfapiLocator'] = 'cmpframe';

      init(mockedYmConfig);

      window.frames['__tcfapiLocator'] = undefined;

      expect(window.addEventListener.calledOnceWith('message')).to.be.true;
    });

    it('should add cmp consent string to ad server request params when called from iframe', () => {
      const callId = Math.random();
      const tcfData = { gdprApplies: false, tcString: 'testTcString' };
      const cmpEvent = {
        data: {
          __tcfapiReturn: {
            callId: `${callId}`,
            returnValue: tcfData,
            success: true,
          }
        },
      };

      mathRandomStub.returns(callId);
      addEventListenerStub.callsFake(
        (e, callback) => {
          callback(cmpEvent)
        }
      );

      window.frames['__tcfapiLocator'] = 'cmpframe';

      init(mockedYmConfig);

      window.frames['__tcfapiLocator'] = undefined;

      const queryParams = getQuearyParamsFromUrl(requestMock.open.getCall(0).args[1]);

      expect(queryParams.cmp).to.be.equal(tcfData.tcString);
    });
  });

  describe('lookupUspConsent', () => {
    const callId = Math.random();
    const uspFunction = sinon.stub();
    const originalXMLHttpRequest = window.XMLHttpRequest;
    let requestMock = {
      open: sinon.stub(),
      send: sinon.stub(),
    };
    let clock;
    let postMessageStub;
    let mathRandomStub;
    let addEventListenerStub;

    beforeEach(() => {
      postMessageStub = sinon.stub(window, 'postMessage');
      mathRandomStub = sinon.stub(Math, 'random');
      addEventListenerStub = sinon.stub(window, 'addEventListener');

      window.XMLHttpRequest = function FakeXMLHttpRequest() {
        this.open = requestMock.open;
        this.send = requestMock.send;
      };

      clock = sinon.useFakeTimers();
    });

    afterEach(() => {
      window.XMLHttpRequest = originalXMLHttpRequest;

      postMessageStub.restore();
      mathRandomStub.restore();
      addEventListenerStub.restore();

      uspFunction.resetBehavior();
      uspFunction.resetHistory();

      requestMock.open.resetBehavior();
      requestMock.open.resetHistory();
      requestMock.send.resetBehavior();
      requestMock.send.resetHistory();

      clock.restore();
    });

    it('should get cmp function', () => {
      window.__uspapi = uspFunction;

      init(mockedYmConfig);

      window.__uspapi = undefined;

      expect(uspFunction.calledOnceWith('getUSPData', 1)).to.be.true;
    });

    it('should call api without usp consent if can not get it', () => {
      uspFunction.callsFake((e, version, callback) => {
        callback(undefined, false);
      });

      window.__uspapi = uspFunction;

      init(mockedYmConfig);

      window.__uspapi = undefined;

      expect(requestMock.open.calledOnce).to.be.true;
    });

    it('should add usp consent string to ad server request params', () => {
      const uspData = { uspString: 'testUspString' };

      uspFunction.callsFake((e, version, callback) => {
        callback(uspData, true);
      });

      window.__uspapi = uspFunction;

      init(mockedYmConfig);

      window.__uspapi = undefined;

      const queryParams = getQuearyParamsFromUrl(requestMock.open.getCall(0).args[1]);

      expect(queryParams.us_privacy).to.be.equal(uspData.uspString);
    });

    it('should post message if usp consent is loaded from another iframe', () => {
      window.frames['__uspapiLocator'] = 'uspframe';

      init(mockedYmConfig);

      window.frames['__uspapiLocator'] = undefined;

      expect(window.postMessage.callCount).to.be.equal(1);
    });

    it('should add event listener for message event if usp consent is loaded from another iframe', () => {
      window.frames['__uspapiLocator'] = 'uspframe';

      init(mockedYmConfig);

      window.frames['__uspapiLocator'] = undefined;

      expect(window.addEventListener.calledOnceWith('message')).to.be.true;
    });

    it('should add usp consent string to ad server request params when called from iframe', () => {
      const uspData = { uspString: 'testUspString' };
      const uspEvent = {
        data: {
          __uspapiReturn: {
            callId: `${callId}`,
            returnValue: uspData,
            success: true,
          }
        },
      };

      mathRandomStub.returns(callId);
      addEventListenerStub.callsFake(
        (e, callback) => {
          callback(uspEvent)
        }
      );

      window.frames['__uspapiLocator'] = 'cmpframe';

      init(mockedYmConfig);

      window.frames['__uspapiLocator'] = undefined;

      const queryParams = getQuearyParamsFromUrl(requestMock.open.getCall(0).args[1]);

      expect(queryParams.us_privacy).to.be.equal(uspData.uspString);
    });
  });
});
