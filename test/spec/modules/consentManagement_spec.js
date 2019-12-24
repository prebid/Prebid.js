import {setConsentConfig, requestBidsHook, resetConsentData, userCMP, consentTimeout, allowAuction, staticConsentData} from 'modules/consentManagement';
import {gdprDataHandler} from 'src/adapterManager';
import * as utils from 'src/utils';
import { config } from 'src/config';

let assert = require('chai').assert;
let expect = require('chai').expect;

describe('consentManagement', function () {
  describe('setConsentConfig tests:', function () {
    describe('empty setConsentConfig value', function () {
      beforeEach(function () {
        sinon.stub(utils, 'logInfo');
        sinon.stub(utils, 'logWarn');
      });

      afterEach(function () {
        utils.logInfo.restore();
        utils.logWarn.restore();
        config.resetConfig();
        resetConsentData();
      });

      it('should use system default values', function () {
        setConsentConfig({});
        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(10000);
        expect(allowAuction).to.be.true;
        sinon.assert.callCount(utils.logInfo, 4);
      });

      it('should exit consent manager if config is not an object', function() {
        setConsentConfig('');
        expect(userCMP).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
      });

      it('should exit consent manager if gdpr not set with new config structure', function() {
        setConsentConfig({ usp: { cmpApi: 'iab', timeout: 50 } });
        expect(userCMP).to.be.undefined;
        sinon.assert.calledOnce(utils.logWarn);
      });
    });

    describe('valid setConsentConfig value', function () {
      afterEach(function () {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeAll();
      });

      it('results in all user settings overriding system defaults', function () {
        let allConfig = {
          cmpApi: 'iab',
          timeout: 7500,
          allowAuctionWithoutConsent: false
        };

        setConsentConfig(allConfig);
        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(7500);
        expect(allowAuction).to.be.false;
      });

      it('should use new consent manager config structure for gdpr', function() {
        setConsentConfig({
          gdpr: { cmpApi: 'daa', timeout: 8700 }
        });

        expect(userCMP).to.be.equal('daa');
        expect(consentTimeout).to.be.equal(8700);
      });

      it('should ignore config.usp and use config.gdpr, with default cmpApi', function() {
        setConsentConfig({
          gdpr: { timeout: 5000 },
          usp: { cmpApi: 'daa', timeout: 50 }
        });

        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(5000);
      });

      it('should ignore config.usp and use config.gdpr, with default cmpAip and timeout', function() {
        setConsentConfig({
          gdpr: {},
          usp: { cmpApi: 'daa', timeout: 50 }
        });

        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(10000);
      });

      it('should recognize config.gdpr, with default cmpAip and timeout', function() {
        setConsentConfig({
          gdpr: {}
        });

        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(10000);
      });

      it('should fallback to old consent manager config object if no config.gdpr', function() {
        setConsentConfig({
          cmpApi: 'iab',
          timeout: 3333,
          allowAuctionWithoutConsent: false,
          gdpr: false
        });

        expect(userCMP).to.be.equal('iab');
        expect(consentTimeout).to.be.equal(3333);
        expect(allowAuction).to.be.equal(false);
      });
    });

    describe('static consent string setConsentConfig value', () => {
      afterEach(() => {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeAll();
      });
      it('results in user settings overriding system defaults', () => {
        let staticConfig = {
          cmpApi: 'static',
          timeout: 7500,
          allowAuctionWithoutConsent: false,
          consentData: {
            getConsentData: {
              'gdprApplies': true,
              'hasGlobalScope': false,
              'consentData': 'BOOgjO9OOgjO9APABAENAi-AAAAWd7_______9____7_9uz_Gv_r_ff_3nW0739P1A_r_Oz_rm_-zzV44_lpQQRCEA'
            },
            getVendorConsents: {
              'metadata': 'BOOgjO9OOgjO9APABAENAi-AAAAWd7_______9____7_9uz_Gv_r_ff_3nW0739P1A_r_Oz_rm_-zzV44_lpQQRCEA',
              'gdprApplies': true,
              'hasGlobalScope': false,
              'isEU': true,
              'cookieVersion': 1,
              'created': '2018-05-29T07:45:48.522Z',
              'lastUpdated': '2018-05-29T07:45:48.522Z',
              'cmpId': 15,
              'cmpVersion': 1,
              'consentLanguage': 'EN',
              'vendorListVersion': 34,
              'maxVendorId': 359,
              'purposeConsents': {
                '1': true,
                '2': true,
                '3': true,
                '4': true,
                '5': true
              },
              'vendorConsents': {
                '1': true,
                '2': true,
                '3': true,
                '4': true,
                '5': false,
                '6': true,
                '7': true,
                '8': true,
                '9': true,
                '10': true,
                '11': true,
                '12': true,
                '13': true,
                '14': true,
                '15': true,
                '16': true,
                '17': true,
                '18': true,
                '19': true,
                '20': true,
                '21': true,
                '22': true,
                '23': true,
                '24': true,
                '25': true,
                '26': true,
                '27': true,
                '28': true,
                '29': true,
                '30': true,
                '31': true,
                '32': true,
                '33': true,
                '34': true,
                '35': true,
                '36': true,
                '37': true,
                '38': true,
                '39': true,
                '40': true,
                '41': true,
                '42': true,
                '43': true,
                '44': true,
                '45': true,
                '46': true,
                '47': true,
                '48': true,
                '49': true,
                '50': true,
                '51': true,
                '52': true,
                '53': true,
                '54': false,
                '55': true,
                '56': true,
                '57': true,
                '58': true,
                '59': true,
                '60': true,
                '61': true,
                '62': true,
                '63': true,
                '64': true,
                '65': true,
                '66': true,
                '67': true,
                '68': true,
                '69': true,
                '70': true,
                '71': true,
                '72': true,
                '73': true,
                '74': true,
                '75': true,
                '76': true,
                '77': true,
                '78': true,
                '79': true,
                '80': true,
                '81': true,
                '82': true,
                '83': false,
                '84': true,
                '85': true,
                '86': true,
                '87': true,
                '88': true,
                '89': true,
                '90': true,
                '91': true,
                '92': true,
                '93': true,
                '94': true,
                '95': true,
                '96': false,
                '97': true,
                '98': true,
                '99': false,
                '100': true,
                '101': true,
                '102': true,
                '103': false,
                '104': true,
                '105': true,
                '106': false,
                '107': false,
                '108': true,
                '109': true,
                '110': true,
                '111': true,
                '112': true,
                '113': true,
                '114': true,
                '115': true,
                '116': false,
                '117': false,
                '118': false,
                '119': true,
                '120': true,
                '121': false,
                '122': true,
                '123': false,
                '124': true,
                '125': true,
                '126': true,
                '127': true,
                '128': true,
                '129': true,
                '130': true,
                '131': true,
                '132': true,
                '133': true,
                '134': true,
                '135': false,
                '136': true,
                '137': false,
                '138': true,
                '139': true,
                '140': true,
                '141': true,
                '142': true,
                '143': true,
                '144': true,
                '145': true,
                '146': false,
                '147': true,
                '148': true,
                '149': true,
                '150': true,
                '151': true,
                '152': false,
                '153': true,
                '154': true,
                '155': true,
                '156': true,
                '157': true,
                '158': true,
                '159': true,
                '160': true,
                '161': true,
                '162': true,
                '163': true,
                '164': true,
                '165': true,
                '166': false,
                '167': true,
                '168': true,
                '169': true,
                '170': true,
                '171': false,
                '172': false,
                '173': true,
                '174': true,
                '175': true,
                '176': false,
                '177': true,
                '178': false,
                '179': true,
                '180': true,
                '181': false,
                '182': true,
                '183': true,
                '184': false,
                '185': true,
                '186': false,
                '187': false,
                '188': true,
                '189': true,
                '190': true,
                '191': false,
                '192': true,
                '193': true,
                '194': true,
                '195': true,
                '196': false,
                '197': true,
                '198': true,
                '199': true,
                '200': true,
                '201': true,
                '202': true,
                '203': true,
                '204': false,
                '205': true,
                '206': false,
                '207': false,
                '208': true,
                '209': true,
                '210': true,
                '211': true,
                '212': true,
                '213': true,
                '214': false,
                '215': true,
                '216': false,
                '217': true,
                '218': false,
                '219': false,
                '220': false,
                '221': false,
                '222': false,
                '223': false,
                '224': true,
                '225': true,
                '226': true,
                '227': true,
                '228': true,
                '229': true,
                '230': true,
                '231': false,
                '232': true,
                '233': false,
                '234': true,
                '235': true,
                '236': true,
                '237': true,
                '238': true,
                '239': true,
                '240': true,
                '241': true,
                '242': false,
                '243': false,
                '244': true,
                '245': true,
                '246': true,
                '247': false,
                '248': true,
                '249': true,
                '250': false,
                '251': false,
                '252': true,
                '253': true,
                '254': true,
                '255': true,
                '256': true,
                '257': true,
                '258': true,
                '259': true,
                '260': true,
                '261': false,
                '262': true,
                '263': false,
                '264': true,
                '265': true,
                '266': true,
                '267': false,
                '268': false,
                '269': true,
                '270': true,
                '271': false,
                '272': true,
                '273': true,
                '274': true,
                '275': true,
                '276': true,
                '277': true,
                '278': true,
                '279': true,
                '280': true,
                '281': true,
                '282': true,
                '283': false,
                '284': true,
                '285': true,
                '286': false,
                '287': false,
                '288': true,
                '289': true,
                '290': true,
                '291': true,
                '292': false,
                '293': false,
                '294': true,
                '295': true,
                '296': false,
                '297': true,
                '298': false,
                '299': true,
                '300': false,
                '301': true,
                '302': true,
                '303': true,
                '304': true,
                '305': false,
                '306': false,
                '307': false,
                '308': true,
                '309': true,
                '310': true,
                '311': false,
                '312': false,
                '313': false,
                '314': true,
                '315': true,
                '316': true,
                '317': true,
                '318': true,
                '319': true,
                '320': true,
                '321': false,
                '322': false,
                '323': true,
                '324': false,
                '325': true,
                '326': true,
                '327': false,
                '328': true,
                '329': false,
                '330': false,
                '331': true,
                '332': false,
                '333': true,
                '334': false,
                '335': false,
                '336': false,
                '337': false,
                '338': false,
                '339': true,
                '340': false,
                '341': false,
                '342': false,
                '343': false,
                '344': false,
                '345': true,
                '346': false,
                '347': false,
                '348': false,
                '349': true,
                '350': false,
                '351': false,
                '352': false,
                '353': false,
                '354': true,
                '355': false,
                '356': false,
                '357': false,
                '358': false,
                '359': true
              }
            }
          }
        };

        setConsentConfig(staticConfig);
        expect(userCMP).to.be.equal('static');
        expect(consentTimeout).to.be.equal(0); // should always return without a timeout when config is used
        expect(allowAuction).to.be.false;
        expect(staticConsentData).to.be.equal(staticConfig.consentData);
      });
    });
  });

  describe('requestBidsHook tests:', function () {
    let goodConfigWithCancelAuction = {
      cmpApi: 'iab',
      timeout: 7500,
      allowAuctionWithoutConsent: false
    };

    let goodConfigWithAllowAuction = {
      cmpApi: 'iab',
      timeout: 7500,
      allowAuctionWithoutConsent: true
    };

    let didHookReturn;

    afterEach(function () {
      gdprDataHandler.consentData = null;
      resetConsentData();
    });

    describe('error checks:', function () {
      beforeEach(function () {
        didHookReturn = false;
        sinon.stub(utils, 'logWarn');
        sinon.stub(utils, 'logError');
      });

      afterEach(function () {
        utils.logWarn.restore();
        utils.logError.restore();
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeAll();
        resetConsentData();
      });

      it('should throw a warning and return to hooked function when an unknown CMP framework ID is used', function () {
        let badCMPConfig = {
          cmpApi: 'bad'
        };
        setConsentConfig(badCMPConfig);
        expect(userCMP).to.be.equal(badCMPConfig.cmpApi);

        requestBidsHook(() => {
          didHookReturn = true;
        }, {});
        let consent = gdprDataHandler.getConsentData();
        sinon.assert.calledOnce(utils.logWarn);
        expect(didHookReturn).to.be.true;
        expect(consent).to.be.null;
      });

      it('should throw proper errors when CMP is not found', function () {
        setConsentConfig(goodConfigWithCancelAuction);

        requestBidsHook(() => {
          didHookReturn = true;
        }, {});
        let consent = gdprDataHandler.getConsentData();
        // throw 2 errors; one for no bidsBackHandler and for CMP not being found (this is an error due to gdpr config)
        sinon.assert.calledTwice(utils.logError);
        expect(didHookReturn).to.be.false;
        expect(consent).to.be.null;
      });
    });

    describe('already known consentData:', function () {
      let cmpStub = sinon.stub();

      beforeEach(function () {
        didHookReturn = false;
        window.__cmp = function() {};
      });

      afterEach(function () {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeAll();
        cmpStub.restore();
        delete window.__cmp;
        resetConsentData();
      });

      it('should bypass CMP and simply use previously stored consentData', function () {
        let testConsentData = {
          gdprApplies: true,
          consentData: 'xyz'
        };

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData);
        });
        setConsentConfig(goodConfigWithAllowAuction);
        requestBidsHook(() => {}, {});
        cmpStub.restore();

        // reset the stub to ensure it wasn't called during the second round of calls
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData);
        });

        requestBidsHook(() => {
          didHookReturn = true;
        }, {});
        let consent = gdprDataHandler.getConsentData();

        expect(didHookReturn).to.be.true;
        expect(consent.consentString).to.equal(testConsentData.consentData);
        expect(consent.gdprApplies).to.be.true;
        sinon.assert.notCalled(cmpStub);
      });
    });

    describe('CMP workflow for safeframe page', function () {
      let registerStub = sinon.stub();

      beforeEach(function () {
        didHookReturn = false;
        window.$sf = {
          ext: {
            register: function() {},
            cmp: function() {}
          }
        };
        sinon.stub(utils, 'logError');
        sinon.stub(utils, 'logWarn');
      });

      afterEach(function () {
        delete window.$sf;
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeAll();
        registerStub.restore();
        utils.logError.restore();
        utils.logWarn.restore();
        resetConsentData();
      });

      it('should return the consent data from a safeframe callback', function () {
        var testConsentData = {
          data: {
            msgName: 'cmpReturn',
            vendorConsents: {
              metadata: 'abc123def',
              gdprApplies: true
            },
            vendorConsentData: {
              consentData: 'abc123def',
              gdprApplies: true
            }
          }
        };
        registerStub = sinon.stub(window.$sf.ext, 'register').callsFake((...args) => {
          args[2](testConsentData.data.msgName, testConsentData.data);
        });

        setConsentConfig(goodConfigWithAllowAuction);
        requestBidsHook(() => {
          didHookReturn = true;
        }, {adUnits: [{ sizes: [[300, 250]] }]});
        let consent = gdprDataHandler.getConsentData();

        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);
        expect(didHookReturn).to.be.true;
        expect(consent.consentString).to.equal('abc123def');
        expect(consent.gdprApplies).to.be.true;
      });
    });

    describe('CMP workflow for iframed page', function () {
      let ifr = null;
      let stringifyResponse = false;

      beforeEach(function () {
        sinon.stub(utils, 'logError');
        sinon.stub(utils, 'logWarn');
        ifr = createIFrameMarker();
        window.addEventListener('message', cmpMessageHandler, false);
      });

      afterEach(function () {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeAll();
        delete window.__cmp;
        utils.logError.restore();
        utils.logWarn.restore();
        resetConsentData();
        document.body.removeChild(ifr);
        window.removeEventListener('message', cmpMessageHandler);
      });

      function createIFrameMarker() {
        var ifr = document.createElement('iframe');
        ifr.width = 0;
        ifr.height = 0;
        ifr.name = '__cmpLocator';
        document.body.appendChild(ifr);
        return ifr;
      }

      function cmpMessageHandler(event) {
        if (event && event.data) {
          var data = event.data;
          if (data.__cmpCall) {
            var callId = data.__cmpCall.callId;
            var returnValue = null;
            var response = {
              __cmpReturn: {
                callId,
                returnValue: {
                  consentData: 'encoded_consent_data_via_post_message',
                  gdprApplies: true,
                },
                success: true
              }
            };
            event.source.postMessage(stringifyResponse ? JSON.stringify(response) : response, '*');
          }
        }
      }

      // Run tests with JSON response and String response
      // from CMP window postMessage listener.
      testIFramedPage('with/JSON response', false);
      testIFramedPage('with/String response', true);

      function testIFramedPage(testName, messageFormatString) {
        it(`should return the consent string from a postmessage + addEventListener response - ${testName}`, (done) => {
          stringifyResponse = messageFormatString;
          setConsentConfig(goodConfigWithAllowAuction);
          requestBidsHook(() => {
            let consent = gdprDataHandler.getConsentData();
            sinon.assert.notCalled(utils.logWarn);
            sinon.assert.notCalled(utils.logError);
            expect(consent.consentString).to.equal('encoded_consent_data_via_post_message');
            expect(consent.gdprApplies).to.be.true;
            done();
          }, {});
        });
      }
    });

    describe('CMP workflow for normal pages:', function () {
      let cmpStub = sinon.stub();

      beforeEach(function () {
        didHookReturn = false;
        sinon.stub(utils, 'logError');
        sinon.stub(utils, 'logWarn');
        window.__cmp = function() {};
      });

      afterEach(function () {
        config.resetConfig();
        $$PREBID_GLOBAL$$.requestBids.removeAll();
        cmpStub.restore();
        utils.logError.restore();
        utils.logWarn.restore();
        delete window.__cmp;
        resetConsentData();
      });

      it('performs lookup check and stores consentData for a valid existing user', function () {
        let testConsentData = {
          gdprApplies: true,
          consentData: 'BOJy+UqOJy+UqABAB+AAAAAZ+A=='
        };
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData);
        });

        setConsentConfig(goodConfigWithAllowAuction);

        requestBidsHook(() => {
          didHookReturn = true;
        }, {});
        let consent = gdprDataHandler.getConsentData();

        sinon.assert.notCalled(utils.logWarn);
        sinon.assert.notCalled(utils.logError);
        expect(didHookReturn).to.be.true;
        expect(consent.consentString).to.equal(testConsentData.consentData);
        expect(consent.gdprApplies).to.be.true;
      });

      it('throws an error when processCmpData check failed while config had allowAuction set to false', function () {
        let testConsentData = {};
        let bidsBackHandlerReturn = false;

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData);
        });

        setConsentConfig(goodConfigWithCancelAuction);

        requestBidsHook(() => {
          didHookReturn = true;
        }, { bidsBackHandler: () => bidsBackHandlerReturn = true });
        let consent = gdprDataHandler.getConsentData();

        sinon.assert.calledOnce(utils.logError);
        expect(didHookReturn).to.be.false;
        expect(bidsBackHandlerReturn).to.be.true;
        expect(consent).to.be.null;
      });

      it('throws a warning + stores consentData + calls callback when processCmpData check failed while config had allowAuction set to true', function () {
        let testConsentData = {};

        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData);
        });

        setConsentConfig(goodConfigWithAllowAuction);

        requestBidsHook(() => {
          didHookReturn = true;
        }, {});
        let consent = gdprDataHandler.getConsentData();

        sinon.assert.calledOnce(utils.logWarn);
        expect(didHookReturn).to.be.true;
        expect(consent.consentString).to.be.undefined;
        expect(consent.gdprApplies).to.be.undefined;
      });
    });
  });
});
