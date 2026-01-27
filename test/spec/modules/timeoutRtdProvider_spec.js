import { timeoutRtdFunctions, timeoutSubmodule } from '../../../modules/timeoutRtdProvider.js'
import { expect } from 'chai';
import * as ajax from 'src/ajax.js';
import * as prebidGlobal from 'src/prebidGlobal.js';

describe('Timeout RTD submodule', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should init successfully', () => {
    expect(timeoutSubmodule.init()).to.equal(true);
  });

  it('should make a request to the endpoint url if it is provided, and handle the response', () => {
    const response = '{"deviceType":{ "2": 50, "4": 100, "5": 200 }}'
    const ajaxStub = sandbox.stub().callsFake(function (url, callbackObj) {
      callbackObj.success(response);
    });
    sandbox.stub(ajax, 'ajaxBuilder').callsFake(function () { return ajaxStub });

    const reqBidsConfigObj = {}
    const expectedLink = 'https://somelink.json'
    const config = {
      'name': 'timeout',
      'params': {
        'endpoint': {
          url: expectedLink
        }
      }
    }
    const handleTimeoutIncrementStub = sandbox.stub(timeoutRtdFunctions, 'handleTimeoutIncrement');
    timeoutSubmodule.getBidRequestData(reqBidsConfigObj, function() {}, config)

    expect(ajaxStub.calledWith(expectedLink)).to.be.true;
    expect(handleTimeoutIncrementStub.calledWith(reqBidsConfigObj, JSON.parse(response))).to.be.true;
  });

  it('should make a request to the endpoint url and ignore the rules object if the endpoint is provided', () => {
    const ajaxStub = sandbox.stub().callsFake((url, callbackObj) => {});
    sandbox.stub(ajax, 'ajaxBuilder').callsFake(() => ajaxStub);
    const expectedLink = 'https://somelink.json'
    const config = {
      'name': 'timeout',
      'params': {
        'endpoint': {
          url: expectedLink
        },
        'rules': {
          'includesVideo': {
            'true': 200,
          },
        }
      }
    }
    timeoutSubmodule.getBidRequestData({}, function() {}, config);
    expect(ajaxStub.calledWith(expectedLink)).to.be.true;
  });

  it('should use the rules object if there is no endpoint url', () => {
    const config = {
      'name': 'timeout',
      'params': {
        'rules': {
          'includesVideo': {
            'true': 200,
          },
        }
      }
    }
    const handleTimeoutIncrementStub = sandbox.stub(timeoutRtdFunctions, 'handleTimeoutIncrement');
    const reqBidsConfigObj = {};
    timeoutSubmodule.getBidRequestData(reqBidsConfigObj, function() {}, config);
    expect(handleTimeoutIncrementStub.calledWith(reqBidsConfigObj, config.params.rules)).to.be.true;
  });

  it('should exit quietly if no relevant timeout config is found', () => {
    const callback = sandbox.stub()
    const ajaxStub = sandbox.stub().callsFake((url, callbackObj) => {});
    sandbox.stub(ajax, 'ajaxBuilder').callsFake(function() { return ajaxStub });
    const handleTimeoutIncrementStub = sandbox.stub(timeoutRtdFunctions, 'handleTimeoutIncrement');

    timeoutSubmodule.getBidRequestData({}, callback, {});

    expect(handleTimeoutIncrementStub.called).to.be.false;
    expect(callback.called).to.be.true;
    expect(ajaxStub.called).to.be.false;
  });

  it('should be able to increment the timeout with the calculated timeout modifier', () => {
    const baseTimeout = 100;
    const getConfigStub = sandbox.stub().returns(baseTimeout);
    sandbox.stub(prebidGlobal, 'getGlobal').callsFake(() => {
      return {
        getConfig: getConfigStub
      }
    });

    const reqBidsConfigObj = {adUnits: [1, 2, 3]}
    const addedTimeout = 400;
    const rules = {
      numAdUnits: {
        '3-5': addedTimeout,
      }
    }

    timeoutRtdFunctions.handleTimeoutIncrement(reqBidsConfigObj, rules)
    expect(reqBidsConfigObj.timeout).to.be.equal(baseTimeout + addedTimeout);
  });

  it('should be able to increment the timeout with the calculated timeout modifier when there are multiple matching rules', () => {
    const baseTimeout = 100;
    const getConfigStub = sandbox.stub().returns(baseTimeout);
    sandbox.stub(prebidGlobal, 'getGlobal').callsFake(() => {
      return {
        getConfig: getConfigStub
      }
    });

    const reqBidsConfigObj = {adUnits: [1, 2, 3]}
    const addedTimeout = 400;
    const rules = {
      numAdUnits: {
        '3-5': addedTimeout / 2,
      },
      includesVideo: {
        'false': addedTimeout / 2,
      }
    }
    timeoutRtdFunctions.handleTimeoutIncrement(reqBidsConfigObj, rules)
    expect(reqBidsConfigObj.timeout).to.be.equal(baseTimeout + addedTimeout);
  });
});
