import {bidderSettings, ScopedSettings} from '../../../../src/bidderSettings.js';
import {expect} from 'chai';
import * as prebidGlobal from '../../../../src/prebidGlobal';
import sinon from 'sinon';

describe('ScopedSettings', () => {
  let data;
  let settings;

  beforeEach(() => {
    settings = new ScopedSettings(() => data, 'fallback');
  });

  describe('get', () => {
    it('should retrieve setting from scope', () => {
      data = {
        scope: {key: 'value'}
      };
      expect(settings.get('scope', 'key')).to.equal('value');
    });

    it('should fallback to fallback scope', () => {
      data = {
        fallback: {
          key: 'value'
        }
      };
      expect(settings.get('scope', 'key')).to.equal('value');
    });

    it('should retrieve from default scope if scope is null', () => {
      data = {
        fallback: {
          key: 'value'
        }
      };

      expect(settings.get(null, 'key')).to.equal('value');
    });

    it('should not fall back if own setting has a falsy value', () => {
      data = {
        scope: {
          key: false,
        },
        fallback: {
          key: true
        }
      }
      expect(settings.get('scope', 'key')).to.equal(false);
    })
  });

  describe('getOwn', () => {
    it('should not fall back to default scope', () => {
      data = {
        fallback: {
          key: 'value'
        }
      };
      expect(settings.getOwn('missing', 'key')).to.be.undefined;
    });

    it('should use default if scope is null', () => {
      data = {
        fallback: {
          key: 'value'
        }
      };
      expect(settings.getOwn(null, 'key')).to.equal('value');
    });
  });

  describe('getScopes', () => {
    it('should return all top-level keys except the default scope', () => {
      data = {
        fallback: {},
        scope1: {},
        scope2: {},
      };
      expect(settings.getScopes()).to.have.members(['scope1', 'scope2']);
    });
  });

  describe('settingsFor', () => {
    it('should merge with default scope', () => {
      data = {
        fallback: {
          dkey: 'value'
        },
        scope: {
          skey: 'value'
        }
      }
      expect(settings.settingsFor('scope')).to.eql({
        dkey: 'value',
        skey: 'value'
      })
    })
  });
});

describe('bidderSettings', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.stub(prebidGlobal, 'getGlobal').returns({
      bidderSettings: {
        scope: {
          key: 'value'
        }
      }
    });
  })

  afterEach(() => {
    sandbox.restore();
  })

  it('should fetch data from getGlobal().bidderSettings', () => {
    expect(bidderSettings.get('scope', 'key')).to.equal('value');
  })
});
