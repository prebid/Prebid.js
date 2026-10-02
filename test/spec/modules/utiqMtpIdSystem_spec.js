import { expect } from 'chai';
import { utiqMtpIdSubmodule, storage } from 'modules/utiqMtpIdSystem.js';

describe('utiqMtpIdSystem', () => {
  const utiqPassKey = 'utiqPass';

  const getStorageData = (idGraph) => {
    if (!idGraph) {
      idGraph = [{ id: 501, domain: '' }];
    }
    return {
      'connectId': {
        'idGraph': idGraph,
      }
    };
  };

  it('should have the correct module name declared', () => {
    expect(utiqMtpIdSubmodule.name).to.equal('utiqMtpId');
  });

  describe('utiqMtpId getId()', () => {
    afterEach(() => {
      storage.removeDataFromLocalStorage(utiqPassKey);
    });

    it('it should return object with key callback', () => {
      expect(utiqMtpIdSubmodule.getId()).to.have.property('callback');
    });

    it('should return object with key callback with value type - function', () => {
      storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData()));
      expect(utiqMtpIdSubmodule.getId()).to.have.property('callback');
      expect(typeof utiqMtpIdSubmodule.getId().callback).to.be.equal('function');
    });

    it('tests if localstorage & JSON works properly ', () => {
      const idGraph = [{
        'domain': 'domainValue',
        'mtid': 'mtidValue',
      }];
      storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData(idGraph)));
      expect(JSON.parse(storage.getDataFromLocalStorage(utiqPassKey))).to.have.property('connectId');
    });

    it('returns {id: {utiq: data.utiq}} if we have the right data stored in the localstorage ', () => {
      const idGraph = [{
        'domain': 'test.domain',
        'mtid': 'mtidValue',
        'category': 'categoryValue',
      }];
      storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData(idGraph)));
      const response = utiqMtpIdSubmodule.getId();
      expect(response).to.have.property('id');
      expect(response.id).to.have.property('utiqMtp');
      expect(response.id.utiqMtp.mtid).to.be.equal('mtidValue');
      expect(response.id.utiqMtp.category).to.be.equal('categoryValue');
    });

    it('returns {utiqMtp: data.utiqMtp} if we have the right data stored in the localstorage right after the callback is called', (done) => {
      const idGraph = [{
        'domain': 'test.domain',
        'mtid': 'mtidValue',
        'category': 'categoryValue',
      }];
      const response = utiqMtpIdSubmodule.getId();
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData(idGraph)));
        response.callback(function (result) {
          expect(result).to.not.be.null;
          expect(result).to.have.property('utiqMtp');
          expect(result.utiqMtp.mtid).to.be.equal('mtidValue');
          expect(result.utiqMtp.category).to.be.equal('categoryValue');
          done();
        });
      }
    });

    it('returns {utiqMtp: data.utiqMtp} if we have the right data stored in the localstorage right after 500ms delay', (done) => {
      const idGraph = [{
        'domain': 'test.domain',
        'mtid': 'mtidValue',
        'category': 'categoryValue',
      }];

      const response = utiqMtpIdSubmodule.getId();
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        setTimeout(() => {
          storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData(idGraph)));
        }, 500);
        response.callback(function (result) {
          expect(result).to.not.be.null;
          expect(result).to.have.property('utiqMtp');
          expect(result.utiqMtp.mtid).to.be.equal('mtidValue');
          expect(result.utiqMtp.category).to.be.equal('categoryValue');
          done();
        });
      }
    });

    it('returns null if we have the data stored in the localstorage after 500ms delay and the max (waiting) delay is only 200ms ', (done) => {
      const idGraph = [{
        'domain': 'test.domain',
        'mtid': 'mtidValue',
      }];

      const response = utiqMtpIdSubmodule.getId({ params: { maxDelayTime: 200 } });
      expect(response).to.have.property('callback');
      expect(response.callback.toString()).contain('result(callback)');

      if (typeof response.callback === 'function') {
        setTimeout(() => {
          storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData(idGraph)));
        }, 500);
        response.callback(function (result) {
          expect(result).to.be.null;
          done();
        });
      }
    });
  });

  describe('utiq decode()', () => {
    const VALID_API_RESPONSES = [
      {
        expected: '32a97f612',
        payload: {
          utiqMtp: '32a97f612'
        }
      },
      {
        expected: '32a97f61',
        payload: {
          utiqMtp: '32a97f61',
        }
      },
    ];
    VALID_API_RESPONSES.forEach(responseData => {
      it('should return a newly constructed object with the utiqMtp for a payload with {utiqMtp: value}', () => {
        expect(utiqMtpIdSubmodule.decode(responseData.payload)).to.deep.equal(
          { utiqMtp: responseData.expected }
        );
      });
    });

    [{}, '', { foo: 'bar' }].forEach((response) => {
      it(`should return null for an invalid response "${JSON.stringify(response)}"`, () => {
        expect(utiqMtpIdSubmodule.decode(response)).to.be.null;
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
        const idGraph = [{
          'domain': domain,
          'mtid': 'mtidValue',
          'category': 'categoryValue',
        }];

        storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData(idGraph)));

        const eventData = {
          data: `{\"msgType\":\"MNOSELECTOR\",\"body\":{\"url\":\"https://${domain}/some/path\"}}`
        };

        window.dispatchEvent(new MessageEvent('message', eventData));

        const response = utiqMtpIdSubmodule.getId();
        expect(response).to.have.property('id');
        expect(response.id).to.have.property('utiqMtp');
        expect(response.id.utiqMtp.mtid).to.be.equal('mtidValue');
        expect(response.id.utiqMtp.category).to.be.equal('categoryValue');
        done();
      });
    });
  });

  describe('utiq getUtiqFromStorage', () => {
    afterEach(() => {
      storage.removeDataFromLocalStorage(utiqPassKey);
    });

    it(`correctly set mobilePassKey as martechpass utiq value on mobile connection found in the idGraph`, (done) => {
      // given
      storage.setDataInLocalStorage(utiqPassKey, JSON.stringify(getStorageData([{
        'domain': 'TEST DOMAIN',
        'mtid': 'TEST FIXED MTID',
        'category': 'fixed',
      }, {
        'domain': 'TEST DOMAIN',
        'mtid': 'TEST MOBILE MTID',
        'category': 'mobile',
      }]))); // setting idGraph

      // when
      const response = utiqMtpIdSubmodule.getId();

      // then
      expect(response.id.utiqMtp.mtid).to.be.equal('TEST MOBILE MTID');
      expect(response.id.utiqMtp.category).to.be.equal('mobile');
      done();
    });
  });
});
