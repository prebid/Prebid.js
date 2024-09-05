import {config} from 'src/config.js';
import {setOrtbCurrency} from '../../../modules/currency.js';

describe('pbjs -> ortb currency', () => {
  before(() => {
    config.resetConfig();
  });

  afterEach(() => {
    config.resetConfig();
  });

  it('does not set cur by default', () => {
    const req = {};
    setOrtbCurrency(req, {}, {});
    expect(req).to.eql({});
  });

  it('sets currency based on config', () => {
    config.setConfig({
      currency: {
        adServerCurrency: 'EUR'
      }
    });
    const req = {};
    setOrtbCurrency(req, {}, {});
    expect(req.cur).to.eql(['EUR']);
  });

  it('sets currency based on context', () => {
    config.setConfig({
      currency: {
        adServerCurrency: 'EUR'
      }
    });
    const req = {};
    setOrtbCurrency(req, {}, {currency: 'JPY'});
    expect(req.cur).to.eql(['JPY']);
  })
});
