import { mergeBidderOrtb2 } from '../../../src/fpd/merge.js';
import { config } from '../../../src/config.js';

describe('mergeBidderOrtb2', () => {
  function schain(asi) {
    return {
      ver: '1.0',
      complete: 1,
      nodes: [{ asi, sid: '1', hp: 1 }]
    };
  }

  it('deep merges global and bidder FPD', () => {
    expect(mergeBidderOrtb2(
      { site: { domain: 'example.com', cat: ['IAB1'] } },
      { site: { page: 'https://example.com', cat: ['IAB2'] } }
    )).to.eql({
      site: { domain: 'example.com', page: 'https://example.com', cat: ['IAB1', 'IAB2'] }
    });
  });

  it('by default, appends the bidder schain nodes to the global ones', () => {
    const merged = mergeBidderOrtb2(
      { source: { ext: { schain: schain('global') } } },
      { source: { ext: { schain: schain('bidder') } } }
    );
    expect(merged.source.ext.schain.nodes.map(n => n.asi)).to.eql(['global', 'bidder']);
  });

  describe('with replaceSchain', () => {
    const opts = { replaceSchain: true };

    it('uses the bidder schain instead of merging it with the global one', () => {
      const merged = mergeBidderOrtb2(
        { source: { ext: { schain: schain('global') } } },
        { source: { ext: { schain: schain('bidder') } } },
        opts
      );
      expect(merged.source.ext.schain).to.eql(schain('bidder'));
    });

    it('does not drop global schain fields that are not specific to the bidder', () => {
      expect(mergeBidderOrtb2(
        { source: { tid: 'tid', ext: { schain: schain('global'), other: 'value' } } },
        { source: { ext: { schain: schain('bidder') } } },
        opts
      )).to.eql({
        source: { tid: 'tid', ext: { schain: schain('bidder'), other: 'value' } }
      });
    });

    it('uses the global schain when the bidder does not have one', () => {
      expect(mergeBidderOrtb2(
        { source: { ext: { schain: schain('global') } } },
        { site: { domain: 'example.com' } },
        opts
      )).to.eql({
        source: { ext: { schain: schain('global') } },
        site: { domain: 'example.com' }
      });
    });

    it('uses the bidder schain when there is no global one', () => {
      expect(mergeBidderOrtb2({}, { source: { ext: { schain: schain('bidder') } } }, opts)).to.eql({
        source: { ext: { schain: schain('bidder') } }
      });
    });

    it('works without bidder FPD', () => {
      expect(mergeBidderOrtb2({ source: { ext: { schain: schain('global') } } }, undefined, opts)).to.eql({
        source: { ext: { schain: schain('global') } }
      });
    });

    it('does not modify its arguments or share objects with them', () => {
      const global = { source: { ext: { schain: schain('global') } } };
      const bidder = { source: { ext: { schain: schain('bidder') } } };
      const merged = mergeBidderOrtb2(global, bidder, opts);
      merged.source.ext.schain.nodes.push({ asi: 'other' });
      expect(global).to.eql({ source: { ext: { schain: schain('global') } } });
      expect(bidder).to.eql({ source: { ext: { schain: schain('bidder') } } });
    });
  });

  describe('firstPartyData.replaceGlobalSchain', () => {
    afterEach(() => {
      config.resetConfig();
    });

    it('is used when replaceSchain is not given', () => {
      config.setConfig({ firstPartyData: { replaceGlobalSchain: true } });
      const merged = mergeBidderOrtb2(
        { source: { ext: { schain: schain('global') } } },
        { source: { ext: { schain: schain('bidder') } } }
      );
      expect(merged.source.ext.schain).to.eql(schain('bidder'));
    });

    it('defaults to appending', () => {
      config.setConfig({ firstPartyData: {} });
      const merged = mergeBidderOrtb2(
        { source: { ext: { schain: schain('global') } } },
        { source: { ext: { schain: schain('bidder') } } }
      );
      expect(merged.source.ext.schain.nodes).to.have.length(2);
    });
  });
});
