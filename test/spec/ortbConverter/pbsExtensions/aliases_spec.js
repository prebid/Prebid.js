import {setRequestExtPrebidAliases} from '../../../../libraries/pbsExtensions/processors/aliases.js';
import {config} from 'src/config.js';

describe('PBS - ortb ext.prebid.aliases', () => {
  let aliasRegistry, bidderRegistry;

  function setAliases(bidderRequest) {
    const req = {}
    setRequestExtPrebidAliases(req, bidderRequest, {}, {
      am: {
        bidderRegistry,
        aliasRegistry
      }
    });
    return req;
  }

  beforeEach(() => {
    aliasRegistry = {};
    bidderRegistry = {};
    config.resetConfig();
  });
  afterEach(() => {
    config.resetConfig();
  });

  describe('has no effect if', () => {
    it('bidder is not an alias', () => {
      expect(setAliases({bidderCode: 'not-an-alias'})).to.eql({});
    });

    it('bidder sets skipPbsAliasing', () => {
      aliasRegistry['alias'] = 'bidder';
      bidderRegistry['alias'] = {
        getSpec() {
          return {
            skipPbsAliasing: true
          }
        }
      };
      expect(setAliases({bidderCode: 'alias'})).to.eql({});
    });
  });

  function initAlias(spec = {}) {
    aliasRegistry['alias'] = 'bidder';
    bidderRegistry['alias'] = {
      getSpec() {
        return spec
      }
    };
  }
  it('sets ext.prebid.aliases.BIDDER', () => {
    initAlias();
    expect(setAliases({bidderCode: 'alias'})).to.eql({
      ext: {
        prebid: {
          aliases: {
            alias: 'bidder'
          }
        }
      }
    })
  });

  it('sets ext.prebid.aliasgvlids.BIDDER if set on spec', () => {
    initAlias({ gvlid: 24 });
    expect(setAliases({ bidderCode: 'alias' })).to.eql({
      ext: {
        prebid: {
          aliases: {
            alias: 'bidder'
          },
          aliasgvlids: {
            alias: 24
          }
        }
      }
    })
  });

  it('sets ext.prebid.aliasgvlids.BIDDER if set on config', () => {
    config.setConfig({
      gvlMapping: {
        alias: 24
      }
    });
    initAlias();
    expect(setAliases({ bidderCode: 'alias' })).to.eql({
      ext: {
        prebid: {
          aliases: {
            alias: 'bidder'
          },
          aliasgvlids: {
            alias: 24
          }
        }
      }
    })
  });

  it('prefers ext.prebid.aliasgvlids.BIDDER set on config over spec', () => {
    config.setConfig({
      gvlMapping: {
        alias: 888
      }
    });
    initAlias({ gvlid: 24 });
    expect(setAliases({ bidderCode: 'alias' })).to.eql({
      ext: {
        prebid: {
          aliases: {
            alias: 'bidder'
          },
          aliasgvlids: {
            alias: 888
          }
        }
      }
    })
  });
})
