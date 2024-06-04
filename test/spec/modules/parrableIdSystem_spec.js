import { expect } from 'chai';
import {find} from 'src/polyfill.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';
import { newStorageManager } from 'src/storageManager.js';
import { getRefererInfo } from 'src/refererDetection.js';
import { uspDataHandler } from 'src/adapterManager.js';
import {attachIdSystem, init, requestBidsHook, setSubmoduleRegistry} from 'modules/userId/index.js';
import { parrableIdSubmodule } from 'modules/parrableIdSystem.js';
import { server } from 'test/mocks/xhr.js';
import {mockGdprConsent} from '../../helpers/consentData.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import 'src/prebid.js';
import {merkleIdSubmodule} from '../../../modules/merkleIdSystem.js';

const storage = newStorageManager();

const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';
const EXPIRE_COOKIE_TIME = 864000000;
const P_COOKIE_NAME = '_parrable_id';
const P_COOKIE_EID = '01.1563917337.test-eid';
const P_XHR_EID = '01.1588030911.test-new-eid'
const P_CONFIG_MOCK = {
  name: 'parrableId',
  params: {
    partners: 'parrable_test_partner_123,parrable_test_partner_456'
  }
};
const RESPONSE_HEADERS = { 'Content-Type': 'application/json' };

function getConfigMock() {
  return {
    userSync: {
      syncDelay: 0,
      userIds: [P_CONFIG_MOCK]
    }
  }
}

function getAdUnitMock(code = 'adUnit-code') {
  return {
    code,
    mediaTypes: {banner: {}, native: {}},
    sizes: [
      [300, 200],
      [300, 600]
    ],
    bids: [{
      bidder: 'sampleBidder',
      params: { placementId: 'banner-only-bidder' }
    }]
  };
}

function serializeParrableId(parrableId) {
  let str = '';
  if (parrableId.eid) {
    str += 'eid:' + parrableId.eid;
  }
  if (parrableId.ibaOptout) {
    str += ',ibaOptout:1';
  }
  if (parrableId.ccpaOptout) {
    str += ',ccpaOptout:1';
  }
  if (parrableId.tpc !== undefined) {
    const tpcSupportComponent = parrableId.tpc === true ? 'tpc:1' : 'tpc:0';
    str += `,${tpcSupportComponent}`;
    str += `,tpcUntil:${parrableId.tpcUntil}`;
  }
  if (parrableId.filteredUntil) {
    str += `,filteredUntil:${parrableId.filteredUntil}`;
    str += `,filterHits:${parrableId.filterHits}`;
  }
  return str;
}

function writeParrableCookie(parrableId) {
  let cookieValue = encodeURIComponent(serializeParrableId(parrableId));
  storage.setCookie(
    P_COOKIE_NAME,
    cookieValue,
    (new Date(Date.now() + EXPIRE_COOKIE_TIME).toUTCString()),
    'lax'
  );
}

function removeParrableCookie() {
  storage.setCookie(P_COOKIE_NAME, '', EXPIRED_COOKIE_DATE);
}

function decodeBase64UrlSafe(encBase64) {
  const DEC = {
    '-': '+',
    '_': '/',
    '.': '='
  };
  return encBase64.replace(/[-_.]/g, (m) => DEC[m]);
}

describe('Parrable ID System', function() {
  after(() => {
    // reset ID system to avoid delayed callbacks in other tests
    config.resetConfig();
    init(config);
  });

  describe('parrableIdSystem.getId()', function() {
    describe('response callback function', function() {
      let logErrorStub;
      let callbackSpy = sinon.spy();

      beforeEach(function() {
        logErrorStub = sinon.stub(utils, 'logError');
        callbackSpy.resetHistory();
        writeParrableCookie({ eid: P_COOKIE_EID });
      });

      afterEach(function() {
        removeParrableCookie();
        logErrorStub.restore();
      })

      it('creates xhr to Parrable that synchronizes the ID', function() {
        let getIdResult = parrableIdSubmodule.getId(P_CONFIG_MOCK);

        getIdResult.callback(callbackSpy);

        let request = server.requests[0];
        let queryParams = utils.parseQS(request.url.split('?')[1]);
        let data = JSON.parse(atob(decodeBase64UrlSafe(queryParams.data)));

        expect(getIdResult.callback).to.be.a('function');
        expect(request.url).to.contain('h.parrable.com');

        expect(queryParams).to.not.have.property('us_privacy');
        expect(data).to.deep.equal({
          eid: P_COOKIE_EID,
          trackers: P_CONFIG_MOCK.params.partners.split(','),
          url: getRefererInfo().page,
          prebidVersion: '$prebid.version$',
          isIframe: true
        });

        server.requests[0].respond(200,
          { 'Content-Type': 'text/plain' },
          JSON.stringify({ eid: P_XHR_EID })
        );
        expect(callbackSpy.lastCall.lastArg).to.deep.equal({
          eid: P_XHR_EID
        });

        expect(storage.getCookie(P_COOKIE_NAME)).to.equal(
          encodeURIComponent('eid:' + P_XHR_EID)
        );
      });

      it('xhr passes the uspString to Parrable', function() {
        let uspString = '1YNN';
        uspDataHandler.setConsentData(uspString);
        parrableIdSubmodule.getId(
          P_CONFIG_MOCK,
          null,
          null
        ).callback(callbackSpy);
        uspDataHandler.setConsentData(null);
        expect(server.requests[0].url).to.contain('us_privacy=' + uspString);
      });

      it('xhr base64 safely encodes url data object', function() {
        const urlSafeBase64EncodedData = '-_.';
        const btoaStub = sinon.stub(window, 'btoa').returns('+/=');
        let getIdResult = parrableIdSubmodule.getId(P_CONFIG_MOCK);

        getIdResult.callback(callbackSpy);

        let request = server.requests[0];
        let queryParams = utils.parseQS(request.url.split('?')[1]);
        expect(queryParams.data).to.equal(urlSafeBase64EncodedData);
        btoaStub.restore();
      });

      it('should log an error and continue to callback if ajax request errors', function () {
        let callBackSpy = sinon.spy();
        let submoduleCallback = parrableIdSubmodule.getId({ params: {partners: 'prebid'} }).callback;
        submoduleCallback(callBackSpy);
        let request = server.requests[0];
        expect(request.url).to.contain('h.parrable.com');
        request.respond(
          503,
          null,
          'Unavailable'
        );
        expect(logErrorStub.calledOnce).to.be.true;
        expect(callBackSpy.calledOnce).to.be.true;
      });
    });

    describe('response id', function() {
      it('provides the stored Parrable values if a cookie exists', function() {
        writeParrableCookie({ eid: P_COOKIE_EID });
        let getIdResult = parrableIdSubmodule.getId(P_CONFIG_MOCK);
        removeParrableCookie();

        expect(getIdResult.id).to.deep.equal({
          eid: P_COOKIE_EID
        });
      });

      it('provides the stored legacy Parrable ID values if cookies exist', function() {
        let oldEid = '01.111.old-eid';
        let oldEidCookieName = '_parrable_eid';
        let oldOptoutCookieName = '_parrable_optout';

        storage.setCookie(oldEidCookieName, oldEid);
        storage.setCookie(oldOptoutCookieName, 'true');

        let getIdResult = parrableIdSubmodule.getId(P_CONFIG_MOCK);
        expect(getIdResult.id).to.deep.equal({
          eid: oldEid,
          ibaOptout: true
        });

        // The ID system is expected to migrate old cookies to the new format
        expect(storage.getCookie(P_COOKIE_NAME)).to.equal(
          encodeURIComponent('eid:' + oldEid + ',ibaOptout:1')
        );
        expect(storage.getCookie(oldEidCookieName)).to.equal(null);
        expect(storage.getCookie(oldOptoutCookieName)).to.equal(null);
        removeParrableCookie();
      });
    });

    describe('GDPR consent', () => {
      let callbackSpy = sinon.spy();

      const config = {
        params: {
          partner: 'partner'
        }
      };

      const gdprConsentTestCases = [
        { consentData: { gdprApplies: true, consentString: 'expectedConsentString' }, expected: { gdpr: 1, gdpr_consent: 'expectedConsentString' } },
        { consentData: { gdprApplies: false, consentString: 'expectedConsentString' }, expected: { gdpr: 0 } },
        { consentData: { gdprApplies: true, consentString: undefined }, expected: { gdpr: 1, gdpr_consent: '' } },
        { consentData: { gdprApplies: 'yes', consentString: 'expectedConsentString' }, expected: { gdpr: 0 } },
        { consentData: undefined, expected: { gdpr: 0 } }
      ];

      gdprConsentTestCases.forEach((testCase, index) => {
        it(`should call user sync url with the gdprConsent - case ${index}`, () => {
          parrableIdSubmodule.getId(config, testCase.consentData).callback(callbackSpy);

          if (testCase.expected.gdpr === 1) {
            expect(server.requests[0].url).to.contain('gdpr=' + testCase.expected.gdpr);
            expect(server.requests[0].url).to.contain('gdpr_consent=' + testCase.expected.gdpr_consent);
          } else {
            expect(server.requests[0].url).to.contain('gdpr=' + testCase.expected.gdpr);
            expect(server.requests[0].url).to.not.contain('gdpr_consent');
          }
        })
      });
    });

    describe('third party cookie support', function () {
      let logErrorStub;
      let callbackSpy = sinon.spy();

      beforeEach(function() {
        logErrorStub = sinon.stub(utils, 'logError');
      });

      afterEach(function () {
        callbackSpy.resetHistory();
        removeParrableCookie();
      });

      afterEach(function() {
        logErrorStub.restore();
      });

      describe('when getting tpcSupport from XHR response', function () {
        let request;
        let dateNowStub;
        const dateNowMock = Date.now();
        const tpcSupportTtl = 1;

        before(() => {
          dateNowStub = sinon.stub(Date, 'now').returns(dateNowMock);
        });

        after(() => {
          dateNowStub.restore();
        });

        it('should set tpcSupport: true and tpcUntil in the cookie', function () {
          let { callback } = parrableIdSubmodule.getId(P_CONFIG_MOCK);
          callback(callbackSpy);
          request = server.requests[0];

          request.respond(
            200,
            RESPONSE_HEADERS,
            JSON.stringify({ eid: P_XHR_EID, tpcSupport: true, tpcSupportTtl })
          );

          expect(storage.getCookie(P_COOKIE_NAME)).to.equal(
            encodeURIComponent('eid:' + P_XHR_EID + ',tpc:1,tpcUntil:' + Math.floor((dateNowMock / 1000) + tpcSupportTtl))
          );
        });

        it('should set tpcSupport: false and tpcUntil in the cookie', function () {
          let { callback } = parrableIdSubmodule.getId(P_CONFIG_MOCK);
          callback(callbackSpy);
          request = server.requests[0];
          request.respond(
            200,
            RESPONSE_HEADERS,
            JSON.stringify({ eid: P_XHR_EID, tpcSupport: false, tpcSupportTtl })
          );

          expect(storage.getCookie(P_COOKIE_NAME)).to.equal(
            encodeURIComponent('eid:' + P_XHR_EID + ',tpc:0,tpcUntil:' + Math.floor((dateNowMock / 1000) + tpcSupportTtl))
          );
        });

        it('should not set tpcSupport in the cookie', function () {
          let { callback } = parrableIdSubmodule.getId(P_CONFIG_MOCK);
          callback(callbackSpy);
          request = server.requests[0];

          request.respond(
            200,
            RESPONSE_HEADERS,
            JSON.stringify({ eid: P_XHR_EID })
          );

          expect(storage.getCookie(P_COOKIE_NAME)).to.equal(
            encodeURIComponent('eid:' + P_XHR_EID)
          );
        });
      });
    });

    describe('request-filter status', function () {
      let logErrorStub;
      let callbackSpy = sinon.spy();

      beforeEach(function() {
        logErrorStub = sinon.stub(utils, 'logError');
      });

      afterEach(function () {
        callbackSpy.resetHistory();
        removeParrableCookie();
      });

      afterEach(function() {
        logErrorStub.restore();
      });

      describe('when getting filterTtl from XHR response', function () {
        let request;
        let dateNowStub;
        const dateNowMock = Date.now();
        const filterTtl = 1000;

        before(() => {
          dateNowStub = sinon.stub(Date, 'now').returns(dateNowMock);
        });

        after(() => {
          dateNowStub.restore();
        });

        it('should set filteredUntil in the cookie', function () {
          let { callback } = parrableIdSubmodule.getId(P_CONFIG_MOCK);
          callback(callbackSpy);
          request = server.requests[0];

          request.respond(
            200,
            RESPONSE_HEADERS,
            JSON.stringify({ eid: P_XHR_EID, filterTtl })
          );

          expect(storage.getCookie(P_COOKIE_NAME)).to.equal(
            encodeURIComponent(
              'eid:' + P_XHR_EID +
              ',filteredUntil:' + Math.floor((dateNowMock / 1000) + filterTtl) +
              ',filterHits:0')
          );
        });

        it('should increment filterHits in the cookie', function () {
          writeParrableCookie({
            eid: P_XHR_EID,
            filteredUntil: Math.floor((dateNowMock / 1000) + filterTtl),
            filterHits: 0
          });
          let { callback } = parrableIdSubmodule.getId(P_CONFIG_MOCK);
          callback(callbackSpy);

          expect(storage.getCookie(P_COOKIE_NAME)).to.equal(
            encodeURIComponent(
              'eid:' + P_XHR_EID +
              ',filteredUntil:' + Math.floor((dateNowMock / 1000) + filterTtl) +
              ',filterHits:1')
          );
        });

        it('should send filterHits in the XHR', function () {
          const filterHits = 1;
          writeParrableCookie({
            eid: P_XHR_EID,
            filteredUntil: Math.floor(dateNowMock / 1000),
            filterHits
          });
          let { callback } = parrableIdSubmodule.getId(P_CONFIG_MOCK);
          callback(callbackSpy);
          request = server.requests[0];

          let queryParams = utils.parseQS(request.url.split('?')[1]);
          let data = JSON.parse(atob(decodeBase64UrlSafe(queryParams.data)));

          expect(data.filterHits).to.equal(filterHits);
        });
      });
    });
  });

  describe('parrableIdSystem.decode()', function() {
    it('provides the Parrable ID (EID) from a stored object', function() {
      let eid = '01.123.4567890';
      let parrableId = {
        eid,
        ibaOptout: true
      };

      expect(parrableIdSubmodule.decode(parrableId)).to.deep.equal({
        parrableId
      });
    });
  });

  describe('timezone filtering', function() {
    before(function() {
      sinon.stub(Intl, 'DateTimeFormat');
    });

    after(function() {
      Intl.DateTimeFormat.restore();
    });

    it('permits an impression when no timezoneFilter is configured', function() {
      expect(parrableIdSubmodule.getId({ params: {
        partners: 'prebid-test',
      } })).to.have.property('callback');
    });

    it('permits an impression from a blocked timezone when a cookie exists', function() {
      const blockedZone = 'Antarctica/South_Pole';
      const resolvedOptions = sinon.stub().returns({ timeZone: blockedZone });
      Intl.DateTimeFormat.returns({ resolvedOptions });

      writeParrableCookie({ eid: P_COOKIE_EID });

      expect(parrableIdSubmodule.getId({ params: {
        partners: 'prebid-test',
        timezoneFilter: {
          blockedZones: [ blockedZone ]
        }
      } })).to.have.property('callback');
      expect(resolvedOptions.called).to.equal(false);

      removeParrableCookie();
    })

    it('permits an impression from an allowed timezone', function() {
      const allowedZone = 'America/New_York';
      const resolvedOptions = sinon.stub().returns({ timeZone: allowedZone });
      Intl.DateTimeFormat.returns({ resolvedOptions });

      expect(parrableIdSubmodule.getId({ params: {
        partners: 'prebid-test',
        timezoneFilter: {
          allowedZones: [ allowedZone ]
        }
      } })).to.have.property('callback');
      expect(resolvedOptions.called).to.equal(true);
    });

    it('permits an impression from a lower cased allowed timezone', function() {
      const allowedZone = 'America/New_York';
      const resolvedOptions = sinon.stub().returns({ timeZone: allowedZone });
      Intl.DateTimeFormat.returns({ resolvedOptions });

      expect(parrableIdSubmodule.getId({ params: {
        partner: 'prebid-test',
        timezoneFilter: {
          allowedZones: [ allowedZone.toLowerCase() ]
        }
      } })).to.have.property('callback');
      expect(resolvedOptions.called).to.equal(true);
    });

    it('permits an impression from a timezone that is not blocked', function() {
      const blockedZone = 'America/New_York';
      const resolvedOptions = sinon.stub().returns({ timeZone: 'Iceland' });
      Intl.DateTimeFormat.returns({ resolvedOptions });

      expect(parrableIdSubmodule.getId({ params: {
        partners: 'prebid-test',
        timezoneFilter: {
          blockedZones: [ blockedZone ]
        }
      } })).to.have.property('callback');
      expect(resolvedOptions.called).to.equal(true);
    });

    it('does not permit an impression from a blocked timezone', function() {
      const blockedZone = 'America/New_York';
      const resolvedOptions = sinon.stub().returns({ timeZone: blockedZone });
      Intl.DateTimeFormat.returns({ resolvedOptions });

      expect(parrableIdSubmodule.getId({ params: {
        partners: 'prebid-test',
        timezoneFilter: {
          blockedZones: [ blockedZone ]
        }
      } })).to.equal(null);
      expect(resolvedOptions.called).to.equal(true);
    });

    it('does not permit an impression from a lower cased blocked timezone', function() {
      const blockedZone = 'America/New_York';
      const resolvedOptions = sinon.stub().returns({ timeZone: blockedZone });
      Intl.DateTimeFormat.returns({ resolvedOptions });

      expect(parrableIdSubmodule.getId({ params: {
        partner: 'prebid-test',
        timezoneFilter: {
          blockedZones: [ blockedZone.toLowerCase() ]
        }
      } })).to.equal(null);
      expect(resolvedOptions.called).to.equal(true);
    });

    it('does not permit an impression from a blocked timezone even when also allowed', function() {
      const timezone = 'America/New_York';
      const resolvedOptions = sinon.stub().returns({ timeZone: timezone });
      Intl.DateTimeFormat.returns({ resolvedOptions });

      expect(parrableIdSubmodule.getId({ params: {
        partners: 'prebid-test',
        timezoneFilter: {
          allowedZones: [ timezone ],
          blockedZones: [ timezone ]
        }
      } })).to.equal(null);
      expect(resolvedOptions.called).to.equal(true);
    });
  });

  describe('timezone offset filtering', function() {
    before(function() {
      sinon.stub(Date.prototype, 'getTimezoneOffset');
    });

    afterEach(function() {
      Date.prototype.getTimezoneOffset.reset();
    })

    after(function() {
      Date.prototype.getTimezoneOffset.restore();
    });

    it('permits an impression from a blocked offset when a cookie exists', function() {
      const blockedOffset = -4;
      Date.prototype.getTimezoneOffset.returns(blockedOffset * 60);

      writeParrableCookie({ eid: P_COOKIE_EID });

      expect(parrableIdSubmodule.getId({ params: {
        partners: 'prebid-test',
        timezoneFilter: {
          blockedOffsets: [ blockedOffset ]
        }
      } })).to.have.property('callback');

      removeParrableCookie();
    });

    it('permits an impression from an allowed offset', function() {
      const allowedOffset = -5;
      Date.prototype.getTimezoneOffset.returns(allowedOffset * 60);

      expect(parrableIdSubmodule.getId({ params: {
        partners: 'prebid-test',
        timezoneFilter: {
          allowedOffsets: [ allowedOffset ]
        }
      } })).to.have.property('callback');
      expect(Date.prototype.getTimezoneOffset.called).to.equal(true);
    });

    it('permits an impression from an offset that is not blocked', function() {
      const allowedOffset = -5;
      const blockedOffset = 5;
      Date.prototype.getTimezoneOffset.returns(allowedOffset * 60);

      expect(parrableIdSubmodule.getId({ params: {
        partners: 'prebid-test',
        timezoneFilter: {
          blockedOffsets: [ blockedOffset ]
        }
      }})).to.have.property('callback');
      expect(Date.prototype.getTimezoneOffset.called).to.equal(true);
    });

    it('does not permit an impression from a blocked offset', function() {
      const blockedOffset = -5;
      Date.prototype.getTimezoneOffset.returns(blockedOffset * 60);

      expect(parrableIdSubmodule.getId({ params: {
        partners: 'prebid-test',
        timezoneFilter: {
          blockedOffsets: [ blockedOffset ]
        }
      } })).to.equal(null);
      expect(Date.prototype.getTimezoneOffset.called).to.equal(true);
    });

    it('does not permit an impression from a blocked offset even when also allowed', function() {
      const offset = -5;
      Date.prototype.getTimezoneOffset.returns(offset * 60);

      expect(parrableIdSubmodule.getId({ params: {
        partners: 'prebid-test',
        timezoneFilter: {
          allowedOffset: [ offset ],
          blockedOffsets: [ offset ]
        }
      } })).to.equal(null);
      expect(Date.prototype.getTimezoneOffset.called).to.equal(true);
    });
  });

  describe('userId requestBids hook', function() {
    let adUnits;
    let sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      mockGdprConsent(sandbox);
      adUnits = [getAdUnitMock()];
      writeParrableCookie({ eid: P_COOKIE_EID, ibaOptout: true });
      init(config);
      setSubmoduleRegistry([parrableIdSubmodule]);
    });

    afterEach(function() {
      removeParrableCookie();
      storage.setCookie(P_COOKIE_NAME, '', EXPIRED_COOKIE_DATE);
      sandbox.restore();
    });

    it('when a stored Parrable ID exists it is added to bids', function(done) {
      config.setConfig(getConfigMock());
      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.parrableId');
            expect(bid.userId.parrableId.eid).to.equal(P_COOKIE_EID);
            expect(bid.userId.parrableId.ibaOptout).to.equal(true);
            const parrableIdAsEid = find(bid.userIdAsEids, e => e.source == 'parrable.com');
            expect(parrableIdAsEid).to.deep.equal({
              source: 'parrable.com',
              uids: [{
                id: P_COOKIE_EID,
                atype: 1,
                ext: {
                  ibaOptout: true
                }
              }]
            });
          });
        });
        done();
      }, { adUnits });
    });

    it('supplies an optout reason when the EID is missing due to CCPA non-consent', function(done) {
      // the ID system itself will not write a cookie with an EID when CCPA=true
      writeParrableCookie({ ccpaOptout: true });
      config.setConfig(getConfigMock());

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.parrableId');
            expect(bid.userId.parrableId).to.not.have.property('eid');
            expect(bid.userId.parrableId.ccpaOptout).to.equal(true);
            const parrableIdAsEid = find(bid.userIdAsEids, e => e.source == 'parrable.com');
            expect(parrableIdAsEid).to.deep.equal({
              source: 'parrable.com',
              uids: [{
                id: '',
                atype: 1,
                ext: {
                  ccpaOptout: true
                }
              }]
            });
          });
        });
        done();
      }, { adUnits });
    });
  });

  describe('partners parsing', function () {
    let callbackSpy = sinon.spy();

    const partnersTestCase = [
      {
        name: '"partners" as an array',
        config: { params: { partners: ['parrable_test_partner_123', 'parrable_test_partner_456'] } },
        expected: ['parrable_test_partner_123', 'parrable_test_partner_456']
      },
      {
        name: '"partners" as a string list',
        config: { params: { partners: 'parrable_test_partner_123,parrable_test_partner_456' } },
        expected: ['parrable_test_partner_123', 'parrable_test_partner_456']
      },
      {
        name: '"partners" as a string',
        config: { params: { partners: 'parrable_test_partner_123' } },
        expected: ['parrable_test_partner_123']
      },
      {
        name: '"partner" as a string list',
        config: { params: { partner: 'parrable_test_partner_123,parrable_test_partner_456' } },
        expected: ['parrable_test_partner_123', 'parrable_test_partner_456']
      },
      {
        name: '"partner" as string',
        config: { params: { partner: 'parrable_test_partner_123' } },
        expected: ['parrable_test_partner_123']
      },
    ];
    partnersTestCase.forEach(testCase => {
      it(`accepts config property ${testCase.name}`, () => {
        parrableIdSubmodule.getId(testCase.config).callback(callbackSpy);

        let request = server.requests[0];
        let queryParams = utils.parseQS(request.url.split('?')[1]);
        let data = JSON.parse(atob(decodeBase64UrlSafe(queryParams.data)));

        expect(data.trackers).to.deep.equal(testCase.expected);
      });
    });
  });

  describe('eid', () => {
    before(() => {
      attachIdSystem(merkleIdSubmodule);
    })
    it('parrableId', function() {
      const userId = {
        parrableId: {
          eid: 'some-random-id-value'
        }
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'parrable.com',
        uids: [{id: 'some-random-id-value', atype: 1}]
      });
    });
  })
});
