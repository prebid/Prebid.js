import { expect } from 'chai';
import { trustpidSubmodule } from 'modules/trustpidSystem.js';
import { storage } from 'modules/trustpidSystem.js';

describe('trustpid System', () => {
  const connectDataKey = 'fcIdConnectData';
  const connectDomainKey = 'fcIdConnectDomain';

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

  it('should have the correct module name declared', () => {
    expect(trustpidSubmodule.name).to.equal('trustpid');
  });

  describe('trustpid getId()', () => {
    afterEach(() => {
      storage.removeDataFromLocalStorage(connectDataKey);
      storage.removeDataFromLocalStorage(connectDomainKey);
    });

    it('it should return object with key callback', () => {
      expect(trustpidSubmodule.getId()).to.have.property('callback');
    });

    it('should return object with key callback with value type - function', () => {
      storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData()));
      expect(trustpidSubmodule.getId()).to.have.property('callback');
      expect(typeof trustpidSubmodule.getId().callback).to.be.equal('function');
    });

    it('tests if localstorage & JSON works properly ', () => {
      const idGraph = {
        'domain': 'domainValue',
        'umid': 'umidValue',
      };
      storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));
      expect(JSON.parse(storage.getDataFromLocalStorage(connectDataKey))).to.have.property('connectId');
    });

    it('returns {callback: func} if domains don\'t match', () => {
      const idGraph = {
        'domain': 'domainValue',
        'umid': 'umidValue',
      };
      storage.setDataInLocalStorage(connectDomainKey, JSON.stringify('differentDomainValue'));
      storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));
      expect(trustpidSubmodule.getId()).to.have.property('callback');
    });

    it('returns {id: {trustpid: data.trustpid}} if we have the right data stored in the localstorage ', () => {
      const idGraph = {
        'domain': 'uat.mno.link',
        'umid': 'umidValue',
      };
      storage.setDataInLocalStorage(connectDomainKey, JSON.stringify('uat.mno.link'));
      storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));
      const response = trustpidSubmodule.getId();
      expect(response).to.have.property('id');
      expect(response.id).to.have.property('trustpid');
      expect(response.id.trustpid).to.be.equal('umidValue-xxxx');
    });

    it('returns {trustpid: data.trustpid} if we have the right data stored in the localstorage right after the callback is called', (done) => {
      const idGraph = {
        'domain': 'uat.mno.link',
        'umid': 'umidValue',
      };
      const response = trustpidSubmodule.getId();
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        storage.setDataInLocalStorage(connectDomainKey, JSON.stringify('uat.mno.link'));
        storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));
        response.callback(function (result) {
          expect(result).to.not.be.null;
          expect(result).to.have.property('trustpid');
          expect(result.trustpid).to.be.equal('umidValue-xxxx');
          done()
        })
      }
    });

    it('returns null if domains don\'t match', (done) => {
      const idGraph = {
        'domain': 'uat.mno.link',
        'umid': 'umidValue',
      };
      storage.setDataInLocalStorage(connectDomainKey, JSON.stringify('differentDomainValue'));
      storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));

      const response = trustpidSubmodule.getId();
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        setTimeout(() => {
          expect(JSON.parse(storage.getDataFromLocalStorage(connectDomainKey))).to.be.equal('differentDomainValue');
        }, 100)
        response.callback(function (result) {
          expect(result).to.be.null;
          done()
        })
      }
    });

    it('returns {trustpid: data.trustpid} if we have the right data stored in the localstorage right after 500ms delay', (done) => {
      const idGraph = {
        'domain': 'uat.mno.link',
        'umid': 'umidValue',
      };

      const response = trustpidSubmodule.getId();
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        setTimeout(() => {
          storage.setDataInLocalStorage(connectDomainKey, JSON.stringify('uat.mno.link'));
          storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));
        }, 500);
        response.callback(function (result) {
          expect(result).to.not.be.null;
          expect(result).to.have.property('trustpid');
          expect(result.trustpid).to.be.equal('umidValue-xxxx');
          done()
        })
      }
    });

    it('returns null if we have the data stored in the localstorage after 500ms delay and the max (waiting) delay is only 200ms ', (done) => {
      const idGraph = {
        'domain': 'uat.mno.link',
        'umid': 'umidValue',
      };

      const response = trustpidSubmodule.getId({params: {maxDelayTime: 200}});
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        setTimeout(() => {
          storage.setDataInLocalStorage(connectDomainKey, JSON.stringify('uat.mno.link'));
          storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));
        }, 500);
        response.callback(function (result) {
          expect(result).to.be.null;
          done()
        })
      }
    });
  });

  describe('trustpid decode()', () => {
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
      it(`should return null for an invalid response "${JSON.stringify(response)}"`, () => {
        expect(trustpidSubmodule.decode(response)).to.be.null;
      });
    });
  });

  describe('trustpid messageHandler for acronyms', () => {
    afterEach(() => {
      storage.removeDataFromLocalStorage(connectDataKey);
      storage.removeDataFromLocalStorage(connectDomainKey);
    });

    const domains = [
      {domain: 'tmi.mno.link', acronym: 'ndye'},
      {domain: 'tmi.vodafone.de', acronym: 'pqnx'},
      {domain: 'tmi.telekom.de', acronym: 'avgw'},
      {domain: 'tmi.tmid.es', acronym: 'kjws'},
      {domain: 'uat.mno.link', acronym: 'xxxx'},
      {domain: 'es.tmiservice.orange.com', acronym: 'aplw'},
    ];

    domains.forEach(({domain, acronym}) => {
      it(`correctly sets trustpid value and acronym to ${acronym} for ${domain} domain`, (done) => {
        const idGraph = {
          'domain': domain,
          'umid': 'umidValue',
        };

        storage.setDataInLocalStorage(connectDomainKey, JSON.stringify(domain));
        storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));

        const eventData = {
          data: `{\"msgType\":\"MNOSELECTOR\",\"body\":{\"url\":\"https://${domain}/some/path\"}}`
        };

        window.dispatchEvent(new MessageEvent('message', eventData));

        const response = trustpidSubmodule.getId();
        expect(response).to.have.property('id');
        expect(response.id).to.have.property('trustpid');
        expect(response.id.trustpid).to.be.equal(`umidValue-${acronym}`);
        done();
      });
    });
  });
});
