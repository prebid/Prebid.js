import { expect } from 'chai';
import { utiqSubmodule } from 'modules/utiqSystem.js';
import { storage } from 'modules/utiqSystem.js';

describe('utiqSystem', () => {
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
    expect(utiqSubmodule.name).to.equal('utiq');
  });

  describe('utiq getId()', () => {
    afterEach(() => {
      storage.removeDataFromLocalStorage(connectDataKey);
      storage.removeDataFromLocalStorage(connectDomainKey);
    });

    after(() => {
      window.FC_CONF = {};
    })

    it('it should return object with key callback', () => {
      expect(utiqSubmodule.getId()).to.have.property('callback');
    });

    it('should return object with key callback with value type - function', () => {
      storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData()));
      expect(utiqSubmodule.getId()).to.have.property('callback');
      expect(typeof utiqSubmodule.getId().callback).to.be.equal('function');
    });

    it('tests if localstorage & JSON works properly ', () => {
      const idGraph = {
        'domain': 'domainValue',
        'atid': 'atidValue',
      };
      storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));
      expect(JSON.parse(storage.getDataFromLocalStorage(connectDataKey))).to.have.property('connectId');
    });

    it('returns {callback: func} if domains don\'t match', () => {
      const idGraph = {
        'domain': 'domainValue',
        'atid': 'atidValue',
      };
      storage.setDataInLocalStorage(connectDomainKey, JSON.stringify('differentDomainValue'));
      storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));
      expect(utiqSubmodule.getId()).to.have.property('callback');
    });

    it('returns {id: {utiq: data.utiq}} if we have the right data stored in the localstorage ', () => {
      const idGraph = {
        'domain': 'test.domain',
        'atid': 'atidValue',
      };
      storage.setDataInLocalStorage(connectDomainKey, JSON.stringify('test.domain'));
      storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));
      const response = utiqSubmodule.getId();
      expect(response).to.have.property('id');
      expect(response.id).to.have.property('utiq');
      expect(response.id.utiq).to.be.equal('atidValue');
    });

    it('returns {utiq: data.utiq} if we have the right data stored in the localstorage right after the callback is called', (done) => {
      const idGraph = {
        'domain': 'test.domain',
        'atid': 'atidValue',
      };
      const response = utiqSubmodule.getId();
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        storage.setDataInLocalStorage(connectDomainKey, JSON.stringify('test.domain'));
        storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));
        response.callback(function (result) {
          expect(result).to.not.be.null;
          expect(result).to.have.property('utiq');
          expect(result.utiq).to.be.equal('atidValue');
          done()
        })
      }
    });

    it('returns null if domains don\'t match', (done) => {
      const idGraph = {
        'domain': 'test.domain',
        'atid': 'atidValue',
      };
      storage.setDataInLocalStorage(connectDomainKey, JSON.stringify('differentDomainValue'));
      storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));

      const response = utiqSubmodule.getId();
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

    it('returns {utiq: data.utiq} if we have the right data stored in the localstorage right after 500ms delay', (done) => {
      const idGraph = {
        'domain': 'test.domain',
        'atid': 'atidValue',
      };

      const response = utiqSubmodule.getId();
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        setTimeout(() => {
          storage.setDataInLocalStorage(connectDomainKey, JSON.stringify('test.domain'));
          storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));
        }, 500);
        response.callback(function (result) {
          expect(result).to.not.be.null;
          expect(result).to.have.property('utiq');
          expect(result.utiq).to.be.equal('atidValue');
          done()
        })
      }
    });

    it('returns null if we have the data stored in the localstorage after 500ms delay and the max (waiting) delay is only 200ms ', (done) => {
      const idGraph = {
        'domain': 'test.domain',
        'atid': 'atidValue',
      };

      const response = utiqSubmodule.getId({params: {maxDelayTime: 200}});
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        setTimeout(() => {
          storage.setDataInLocalStorage(connectDomainKey, JSON.stringify('test.domain'));
          storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));
        }, 500);
        response.callback(function (result) {
          expect(result).to.be.null;
          done()
        })
      }
    });
  });

  describe('utiq decode()', () => {
    const VALID_API_RESPONSES = [
      {
        expected: '32a97f612',
        payload: {
          utiq: '32a97f612'
        }
      },
      {
        expected: '32a97f61',
        payload: {
          utiq: '32a97f61',
        }
      },
    ];
    VALID_API_RESPONSES.forEach(responseData => {
      it('should return a newly constructed object with the utiq for a payload with {utiq: value}', () => {
        expect(utiqSubmodule.decode(responseData.payload)).to.deep.equal(
          {utiq: responseData.expected}
        );
      });
    });

    [{}, '', {foo: 'bar'}].forEach((response) => {
      it(`should return null for an invalid response "${JSON.stringify(response)}"`, () => {
        expect(utiqSubmodule.decode(response)).to.be.null;
      });
    });
  });

  describe('utiq messageHandler', () => {
    afterEach(() => {
      storage.removeDataFromLocalStorage(connectDataKey);
      storage.removeDataFromLocalStorage(connectDomainKey);
    });

    after(() => {
      window.FC_CONF = {};
    })

    const domains = [
      'domain1',
      'domain2',
      'domain3',
    ];

    domains.forEach(domain => {
      it(`correctly sets utiq value for domain name ${domain}`, (done) => {
        const idGraph = {
          'domain': domain,
          'atid': 'atidValue',
        };

        storage.setDataInLocalStorage(connectDomainKey, JSON.stringify(domain));
        storage.setDataInLocalStorage(connectDataKey, JSON.stringify(getStorageData(idGraph)));

        const eventData = {
          data: `{\"msgType\":\"MNOSELECTOR\",\"body\":{\"url\":\"https://${domain}/some/path\"}}`
        };

        window.dispatchEvent(new MessageEvent('message', eventData));

        const response = utiqSubmodule.getId();
        expect(response).to.have.property('id');
        expect(response.id).to.have.property('utiq');
        expect(response.id.utiq).to.be.equal('atidValue');
        done();
      });
    });
  });
});
