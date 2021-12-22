import {expect} from 'chai';
import {trustpidSubmodule} from 'modules/trustpidSystem.js';

describe('trustpidSubmodule', () => {
  const domain = 'www.example.com'
  const domain2 = 'www.example2.com'
  const cookieName = 'fcIdConnectData';
  const cookieDomainName = 'fcIdConnectDomain';
  const umid = '15d26568'
  const idGraphData = {
    'domain': domain,
    'umid': umid,
  };
  const prefix = '-'
  const acronym = 'telco_acr'

  const getStorageData = (idGraph) => {
    if (!idGraph) {
      idGraph = {id: 501, domain: ''};
    }
    return {
      'connectId': {
        'idGraph': [idGraph],
      }
    }
  };

  function invokeGetIdAPI(configParams, consentData = undefined, cacheIdObj = undefined) {
    configParams.acrFallback = prefix + acronym
    return trustpidSubmodule.getId({
      params: configParams
    }, consentData, cacheIdObj)
  }

  it('should have the correct module name declared', () => {
    expect(trustpidSubmodule.name).to.equal('trustpid');
  });

  describe('getId()', () => {
    afterEach(() => {
      window.localStorage.removeItem(cookieName);
      window.localStorage.removeItem(cookieDomainName);
    });

    it('it should return object with key callback', () => {
      expect(invokeGetIdAPI({})).to.have.property('callback');
    });

    it('should return object with key callback with value type - function', () => {
      window.localStorage.setItem(cookieName, JSON.stringify(getStorageData()));
      expect(invokeGetIdAPI({})).to.have.property('callback');
      expect(typeof invokeGetIdAPI({}).callback).to.be.equal('function');
    });

    it('tests if mock data are in a right shape', () => {
      expect(getStorageData(idGraphData).connectId).to.have.property('idGraph');
      expect(getStorageData(idGraphData).connectId.idGraph[0]).to.have.property('umid');
    });

    it('tests if localstorage & JSON works properly ', () => {
      window.localStorage.setItem(cookieName, JSON.stringify(getStorageData(idGraphData)));
      expect(JSON.parse(window.localStorage.getItem(cookieName))).to.have.property('connectId');
    });

    it('returns {callback: func} if domains don\'t match', () => {
      window.localStorage.setItem(cookieDomainName, JSON.stringify(domain2));
      window.localStorage.setItem(cookieName, JSON.stringify(getStorageData(idGraphData)));
      expect(invokeGetIdAPI({})).to.have.property('callback');
    });

    it('returns {id: {trustpid: data.trustpid}} if we have the right data stored in the localstorage ', () => {
      window.localStorage.setItem(cookieDomainName, JSON.stringify(domain));
      window.localStorage.setItem(cookieName, JSON.stringify(getStorageData(idGraphData)));
      const response = invokeGetIdAPI({});
      expect(response).to.have.property('id');
      expect(response.id).to.have.property('trustpid');
      expect(response.id.trustpid).to.be.equal(`${umid}-${acronym}`);
    });

    it('returns {trustpid: data.trustpid} if we have the right data stored in the localstorage right after the callback is called', (done) => {
      const response = invokeGetIdAPI({});
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        window.localStorage.setItem(cookieDomainName, JSON.stringify(domain));
        window.localStorage.setItem(cookieName, JSON.stringify(getStorageData(idGraphData)));
        response.callback(function (result) {
          expect(result).to.not.be.undefined;
          expect(result).to.have.property('trustpid');
          expect(result.trustpid).to.be.equal(`${umid}-${acronym}`);
          done()
        })
      }
    });

    it('returns "undefined" if domains don\'t match', (done) => {
      window.localStorage.setItem(cookieDomainName, JSON.stringify(domain2));

      const response = invokeGetIdAPI({});
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');
      expect(JSON.parse(window.localStorage.getItem(cookieDomainName))).to.be.equal(domain2);

      if (typeof response.callback === 'function') {
        window.localStorage.setItem(cookieDomainName, JSON.stringify(domain2));
        setTimeout(() => {
          window.localStorage.setItem(cookieDomainName, JSON.stringify(domain2));
          window.localStorage.setItem(cookieName, JSON.stringify(getStorageData(idGraphData)));
          expect(JSON.parse(window.localStorage.getItem(cookieDomainName))).to.be.equal(domain2);
        }, 100)
        response.callback(function (result) {
          expect(result).to.be.undefined;
          done()
        })
      }
    });

    it('returns {trustpid: data.trustpid} if we have the right data stored in the localstorage right after 500ms delay', (done) => {
      const response = invokeGetIdAPI({});
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        setTimeout(() => {
          window.localStorage.setItem(cookieDomainName, JSON.stringify(domain));
          window.localStorage.setItem(cookieName, JSON.stringify(getStorageData(idGraphData)));
        }, 500);
        response.callback(function (result) {
          expect(result).to.not.be.undefined;
          expect(result).to.have.property('trustpid');
          expect(result.trustpid).to.be.equal(`${umid}-${acronym}`);
          done()
        })
      }
    });

    it('returns undefined if we have the data stored in the localstorage after 500ms delay and the max (waiting) delay is only 200ms ', (done) => {
      const response = invokeGetIdAPI({maxDelayTime: 200});
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        setTimeout(() => {
          window.localStorage.setItem(cookieDomainName, JSON.stringify(domain));
          window.localStorage.setItem(cookieName, JSON.stringify(getStorageData(idGraphData)));
        }, 500);
        response.callback(function (result) {
          expect(result).to.be.undefined;
          done()
        })
      }
    });
  });

  describe('decode()', () => {
    const VALID_API_RESPONSES = [
      {
        expected: '32a97f612',
        payload: {
          trustpid: '32a97f612'
        }
      },
      {
        expected: '32a97f61',
        payload: {
          trustpid: '32a97f61',
        }
      },
    ];
    VALID_API_RESPONSES.forEach(responseData => {
      it('should return a newly constructed object with the trustpid for a payload with {trustpid: value}', () => {
        expect(trustpidSubmodule.decode(responseData.payload)).to.deep.equal(
          {trustpid: responseData.expected}
        );
      });
    });

    [{}, '', {foo: 'bar'}].forEach((response) => {
      it(`should return undefined for an invalid response "${JSON.stringify(response)}"`, () => {
        expect(trustpidSubmodule.decode(response)).to.be.undefined;
      });
    });
  });
});
