import { expect } from 'chai';
import { utiqIdSubmodule } from 'modules/utiqIdSystem.js';
import { storage } from 'modules/utiqIdSystem.js';

describe('utiqIdSystem', () => {
  const utiqPassKey = 'utiqPass';
  const netIdKey = 'netid_utiq_adtechpass';

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
    expect(utiqIdSubmodule.name).to.equal('utiqId');
  });

  describe('utiq getId()', () => {
    afterEach(() => {
      storage.removeDataFromLocalStorage(utiqPassKey);
    });

    it('it should return object with key callback', () => {
      expect(utiqIdSubmodule.getId()).to.have.property('callback');
    });

    it('should return object with key callback with value type - function', () => {
      storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData()));
      expect(utiqIdSubmodule.getId()).to.have.property('callback');
      expect(typeof utiqIdSubmodule.getId().callback).to.be.equal('function');
    });

    it('tests if localstorage & JSON works properly ', () => {
      const idGraph = {
        'domain': 'domainValue',
        'atid': 'atidValue',
      };
      storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData(idGraph)));
      expect(JSON.parse(storage.getDataFromLocalStorage(utiqPassKey))).to.have.property('connectId');
    });

    it('returns {id: {utiq: data.utiq}} if we have the right data stored in the localstorage ', () => {
      const idGraph = {
        'domain': 'test.domain',
        'atid': 'atidValue',
      };
      storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData(idGraph)));
      const response = utiqIdSubmodule.getId();
      expect(response).to.have.property('id');
      expect(response.id).to.have.property('utiq');
      expect(response.id.utiq).to.be.equal('atidValue');
    });

    it('returns {utiq: data.utiq} if we have the right data stored in the localstorage right after the callback is called', (done) => {
      const idGraph = {
        'domain': 'test.domain',
        'atid': 'atidValue',
      };
      const response = utiqIdSubmodule.getId();
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData(idGraph)));
        response.callback(function (result) {
          expect(result).to.not.be.null;
          expect(result).to.have.property('utiq');
          expect(result.utiq).to.be.equal('atidValue');
          done()
        })
      }
    });

    it('returns {utiq: data.utiq} if we have the right data stored in the localstorage right after 500ms delay', (done) => {
      const idGraph = {
        'domain': 'test.domain',
        'atid': 'atidValue',
      };

      const response = utiqIdSubmodule.getId();
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        setTimeout(() => {
          storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData(idGraph)));
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

      const response = utiqIdSubmodule.getId({params: {maxDelayTime: 200}});
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        setTimeout(() => {
          storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData(idGraph)));
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
        expect(utiqIdSubmodule.decode(responseData.payload)).to.deep.equal(
          {utiq: responseData.expected}
        );
      });
    });

    [{}, '', {foo: 'bar'}].forEach((response) => {
      it(`should return null for an invalid response "${JSON.stringify(response)}"`, () => {
        expect(utiqIdSubmodule.decode(response)).to.be.null;
      });
    });
  });

  describe('utiq messageHandler', () => {
    afterEach(() => {
      storage.removeDataFromLocalStorage(utiqPassKey);
    });

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

        storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData(idGraph)));

        const eventData = {
          data: `{\"msgType\":\"MNOSELECTOR\",\"body\":{\"url\":\"https://${domain}/some/path\"}}`
        };

        window.dispatchEvent(new MessageEvent('message', eventData));

        const response = utiqIdSubmodule.getId();
        expect(response).to.have.property('id');
        expect(response.id).to.have.property('utiq');
        expect(response.id.utiq).to.be.equal('atidValue');
        done();
      });
    });
  });

  describe('utiq getUtiqFromStorage', () => {
    afterEach(() => {
      storage.removeDataFromLocalStorage(utiqPassKey);
    });

    it(`correctly set utiqPassKey as adtechpass utiq value for ${netIdKey} empty`, (done) => {
      // given
      storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData({
        'domain': 'TEST DOMAIN',
        'atid': 'TEST ATID',
      }))); // setting idGraph
      storage.setDataInLocalStorage(netIdKey, ''); // setting an empty value

      // when
      const response = utiqIdSubmodule.getId();

      // then
      expect(response.id.utiq).to.be.equal('TEST ATID');
      done();
    });

    it(`correctly set netIdAdtechpass as adtechpass utiq value for ${netIdKey} settled`, (done) => {
      // given
      storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData({
        'domain': 'TEST DOMAIN',
        'atid': 'TEST ATID',
      }))); // setting idGraph
      storage.setDataInLocalStorage(netIdKey, 'testNetIdValue'); // setting a correct value

      // when
      const response = utiqIdSubmodule.getId();

      // then
      expect(response.id.utiq).to.be.equal('testNetIdValue');
      done();
    });
  });
});
