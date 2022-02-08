import { expect } from 'chai';
import find from 'core-js-pure/features/array/find.js';
import { storage, pubmaticIdSubmodule } from 'modules/pubmaticIdSystem.js';
import { init, requestBidsHook, setSubmoduleRegistry } from 'modules/userId/index.js';
import { config } from 'src/config.js';
import {parseQS, mergeDeep} from 'src/utils.js';

const COOKIE_NAME = 'pubmaticId';
const COOKIE_STORED = '{"pubmaticId":"ABCDEF-1234567890"}';
const COOKIE_OBJECT = {pubmaticId: 'ABCDEF-1234567890'};

const validCookieConfig = {
  params: {
    publisherId: 12345
  },
  storage: {
    type: 'cookie',
    name: 'pubmaticId',
    expires: 30,
    refreshInSeconds: 24 * 3600 // 24 Hours
  }
};

describe('PubMatic ID System', () => {
  let ajaxStub, getAjaxFnStub, consentData;

  describe('PubMatic UID Sytsem: test "getId" method', () => {
  	beforeEach(() => {
      ajaxStub = sinon.stub();
      getAjaxFnStub = sinon.stub(pubmaticIdSubmodule, 'getAjaxFn');
      getAjaxFnStub.returns(ajaxStub);
    });

    afterEach(() => {
      getAjaxFnStub.restore();
    });

    it('Wrong config should fail the tests', () => {
      let config;

      // no config
      expect(pubmaticIdSubmodule.getId()).to.be.eq(undefined);

      // no keys present in config
      expect(pubmaticIdSubmodule.getId({ })).to.be.eq(undefined);

      // no params and no storage details
      expect(pubmaticIdSubmodule.getId({params: {}, storage: {}})).to.be.eq(undefined);

      // storage.name should be pubmaticId
      config = mergeDeep({}, validCookieConfig);
      config.storage.name = 'pubmaticId_2';
      expect(pubmaticIdSubmodule.getId(config)).to.be.eq(undefined);

      // storage.expires should be 30
      config = mergeDeep({}, validCookieConfig);
      config.storage.expires = 28;
      expect(pubmaticIdSubmodule.getId(config)).to.be.eq(undefined);

      // refreshInSeconds should be passed
      config = mergeDeep({}, validCookieConfig);
      delete config.storage.refreshInSeconds;
      expect(pubmaticIdSubmodule.getId(config)).to.be.eq(undefined);

      // params.publisherId is not passed
      config = mergeDeep({}, validCookieConfig);
      delete config.params.publisherId;
      expect(pubmaticIdSubmodule.getId(config)).to.be.eq(undefined);

      // params.publisherId is passed as string
      config = mergeDeep({}, validCookieConfig);
      config.params.publisherId = '12345';
      expect(pubmaticIdSubmodule.getId(config)).to.be.eq(undefined);
    });

    it('Validate params in Ajax call', () => {
    	consentData = {
	      gdpr: {
	        gdprApplies: 1,
	        consentString: 'GDPR_CONSENT_STRING'
	      },
	      uspConsent: 'USP_CONSENT_STRING'
	    };
    	let result = pubmaticIdSubmodule.getId(validCookieConfig, consentData);
    	expect(typeof result).to.equal('object');
      result.callback(sinon.stub());
      	expect(ajaxStub.firstCall.args[0].indexOf(`https://image6.pubmatic.com/AdServer/UCookieSetPug?`)).to.equal(0);
  		expect(ajaxStub.firstCall.args[3]).to.deep.equal({method: 'POST', withCredentials: true});
  		let expectedParams = {
  			oid: '5',
  			p: '12345',
  			gdpr: '1',
  			gdpr_consent: 'GDPR_CONSENT_STRING',
  			us_privacy: 'USP_CONSENT_STRING'
  		}
  		const requestQueryParams = parseQS(ajaxStub.firstCall.args[0].split('?')[1]);
      	expect(requestQueryParams).to.deep.equal(expectedParams);
    });
  });
});
