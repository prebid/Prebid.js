import { bidderTimeoutFunctions } from '../../../../libraries/bidderTimeoutUtils/bidderTimeoutUtils.js'
import { expect } from 'chai';

const DEFAULT_USER_AGENT = window.navigator.userAgent;
const DEFAULT_CONNECTION = window.navigator.connection;

const PC_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246';
const MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1';
const TABLET_USER_AGENT = 'Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

function resetUserAgent() {
  window.navigator.__defineGetter__('userAgent', () => DEFAULT_USER_AGENT);
};

function setUserAgent(userAgent) {
  window.navigator.__defineGetter__('userAgent', () => userAgent);
}

function resetConnection() {
  window.navigator.__defineGetter__('connection', () => DEFAULT_CONNECTION);
}
function setConnectionType(connectionType) {
  window.navigator.__defineGetter__('connection', () => { return { 'type': connectionType } });
}

describe('Timeout RTD submodule', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getDeviceType', () => {
    afterEach(() => {
      resetUserAgent();
    });

    [
      // deviceType, userAgent, deviceTypeNum
      ['pc', PC_USER_AGENT, 2],
      ['mobile', MOBILE_USER_AGENT, 4],
      ['tablet', TABLET_USER_AGENT, 5],
    ].forEach(function (args) {
      const [deviceType, userAgent, deviceTypeNum] = args;
      it(`should be able to recognize ${deviceType} devices`, () => {
        setUserAgent(userAgent);
        const res = bidderTimeoutFunctions.getDeviceType();
        expect(res).to.equal(deviceTypeNum)
      })
    })
  });

  describe('getConnectionSpeed', () => {
    afterEach(() => {
      resetConnection();
    });
    [
      // connectionType, connectionSpeed
      ['slow-2g', 'slow'],
      ['2g', 'slow'],
      ['3g', 'medium'],
      ['bluetooth', 'fast'],
      ['cellular', 'fast'],
      ['ethernet', 'fast'],
      ['wifi', 'fast'],
      ['wimax', 'fast'],
      ['4g', 'fast'],
      ['not known', 'unknown'],
      [undefined, 'unknown'],
    ].forEach(function (args) {
      const [connectionType, connectionSpeed] = args;
      it(`should be able to categorize connection speed when the connection type is ${connectionType}`, () => {
        setConnectionType(connectionType);
        const res = bidderTimeoutFunctions.getConnectionSpeed();
        expect(res).to.equal(connectionSpeed)
      })
    })
  });

  describe('Timeout modifier calculations', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should be able to detect video ad units', () => {
      let adUnits = []
      let res = bidderTimeoutFunctions.checkVideo(adUnits);
      expect(res).to.be.false;

      adUnits = [{
        mediaTypes: {
          video: []
        }
      }];
      res = bidderTimeoutFunctions.checkVideo(adUnits);
      expect(res).to.be.true;

      adUnits = [{
        mediaTypes: {
          banner: []
        }
      }];
      res = bidderTimeoutFunctions.checkVideo(adUnits);
      expect(res).to.be.false;
    });

    it('should calculate the timeout modifier for video', () => {
      sandbox.stub(bidderTimeoutFunctions, 'checkVideo').returns(true);
      const rules = {
        includesVideo: {
          'true': 200,
          'false': 50
        }
      }
      const res = bidderTimeoutFunctions.calculateTimeoutModifier([], rules);
      expect(res).to.equal(200)
    });

    it('should calculate the timeout modifier for connectionSpeed', () => {
      sandbox.stub(bidderTimeoutFunctions, 'getConnectionSpeed').returns('slow');
      const rules = {
        connectionSpeed: {
          'slow': 200,
          'medium': 100,
          'fast': 50
        }
      }
      const res = bidderTimeoutFunctions.calculateTimeoutModifier([], rules);
      expect(res).to.equal(200);
    });

    it('should calculate the timeout modifier for deviceType', () => {
      sandbox.stub(bidderTimeoutFunctions, 'getDeviceType').returns(4);
      const rules = {
        deviceType: {
          '2': 50,
          '4': 100,
          '5': 200
        },
      }
      const res = bidderTimeoutFunctions.calculateTimeoutModifier([], rules);
      expect(res).to.equal(100)
    });

    it('should calculate the timeout modifier for ranged numAdunits', () => {
      const rules = {
        numAdUnits: {
          '1-5': 100,
          '6-10': 200,
          '11-15': 300,
        }
      }
      const adUnits = [1, 2, 3, 4, 5, 6];
      const res = bidderTimeoutFunctions.calculateTimeoutModifier(adUnits, rules);
      expect(res).to.equal(200)
    });

    it('should calculate the timeout modifier for exact numAdunits', () => {
      const rules = {
        numAdUnits: {
          '1': 100,
          '2': 200,
          '3': 300,
          '4-5': 400,
        }
      }
      const adUnits = [1, 2];
      const res = bidderTimeoutFunctions.calculateTimeoutModifier(adUnits, rules);
      expect(res).to.equal(200);
    });

    it('should add up all the modifiers when all the rules are present', () => {
      sandbox.stub(bidderTimeoutFunctions, 'getConnectionSpeed').returns('slow');
      sandbox.stub(bidderTimeoutFunctions, 'getDeviceType').returns(4);
      const rules = {
        connectionSpeed: {
          'slow': 200,
          'medium': 100,
          'fast': 50
        },
        deviceType: {
          '2': 50,
          '4': 100,
          '5': 200
        },
        includesVideo: {
          'true': 200,
          'false': 50
        },
        numAdUnits: {
          '1': 100,
          '2': 200,
          '3': 300,
          '4-5': 400,
        }
      }
      const res = bidderTimeoutFunctions.calculateTimeoutModifier([{
        mediaTypes: {
          video: []
        }
      }], rules);
      expect(res).to.equal(600);
    });
  });
});
