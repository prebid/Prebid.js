import {setRequestExtPrebidAliases} from '../../../../libraries/pbsExtensions/processors/aliases.js';

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
  })

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

  it('sets ext.prebid.aliases.BIDDER', () => {
    aliasRegistry['alias'] = 'bidder';
    bidderRegistry['alias'] = {
      getSpec() {
        return {}
      }
    };
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
})
