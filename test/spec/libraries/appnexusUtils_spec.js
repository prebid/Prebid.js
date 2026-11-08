import { expect } from 'chai';
import { convertCamelToUnderscore, fill } from 'libraries/appnexusUtils/anUtils.js';

describe('AppNexus utilities', function () {
  describe('convertCamelToUnderscore', function () {
    it('converts camel-case bidder parameters to underscore-separated names', function () {
      expect(convertCamelToUnderscore('placementId')).to.equal('placement_id');
      expect(convertCamelToUnderscore('allowSmallerSizes')).to.equal('allow_smaller_sizes');
    });

    it('handles an initial capital without adding a leading underscore', function () {
      expect(convertCamelToUnderscore('PlacementId')).to.equal('placement_id');
    });

    it('keeps empty, lowercase, and already underscored names unchanged', function () {
      ['', 'placement', 'placement_id'].forEach(value => {
        expect(convertCamelToUnderscore(value)).to.equal(value);
      });
    });
  });

  describe('fill', function () {
    it('creates the requested number of entries with the supplied primitive value', function () {
      expect(fill('banner', 3)).to.deep.equal(['banner', 'banner', 'banner']);
      expect(fill(0, 2)).to.deep.equal([0, 0]);
      expect(fill(false, 2)).to.deep.equal([false, false]);
    });

    it('preserves null and undefined values in each populated entry', function () {
      expect(fill(null, 2)).to.deep.equal([null, null]);
      expect(fill(undefined, 2)).to.deep.equal([undefined, undefined]);
    });

    it('returns an empty array when no entries are requested', function () {
      expect(fill({ placementId: 123 }, 0)).to.deep.equal([]);
    });

    it('deep-clones object templates so changing one entry leaves the others and template intact', function () {
      const template = {
        bidder: 'appnexus',
        params: { placementId: 123 },
        mediaTypes: { banner: { sizes: [[300, 250]] } }
      };
      const entries = fill(template, 2);

      expect(entries).to.deep.equal([template, template]);
      expect(entries[0]).not.to.equal(template);
      expect(entries[0]).not.to.equal(entries[1]);

      entries[0].params.placementId = 456;
      entries[0].mediaTypes.banner.sizes[0][0] = 728;
      entries[0].mediaTypes.banner.sizes.push([320, 50]);

      expect(entries[1]).to.deep.equal({
        bidder: 'appnexus',
        params: { placementId: 123 },
        mediaTypes: { banner: { sizes: [[300, 250]] } }
      });
      expect(template).to.deep.equal(entries[1]);
    });

    it('creates independent result arrays on separate calls', function () {
      const first = fill('banner', 1);
      const second = fill('banner', 1);
      first.push('video');

      expect(second).to.deep.equal(['banner']);
    });
  });
});
