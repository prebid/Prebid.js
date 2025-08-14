import {getAdUnitSizes} from '../../../libraries/sizeUtils/sizeUtils.js';
import {expect} from 'chai/index.js';

describe('getAdUnitSizes', function () {
  it('returns an empty response when adUnits is undefined', function () {
    let sizes = getAdUnitSizes();
    expect(sizes).to.be.undefined;
  });

  it('returns an empty array when invalid data is present in adUnit object', function () {
    let sizes = getAdUnitSizes({sizes: 300});
    expect(sizes).to.deep.equal([]);
  });

  it('retuns an array of arrays when reading from adUnit.sizes', function () {
    let sizes = getAdUnitSizes({sizes: [300, 250]});
    expect(sizes).to.deep.equal([[300, 250]]);

    sizes = getAdUnitSizes({sizes: [[300, 250], [300, 600]]});
    expect(sizes).to.deep.equal([[300, 250], [300, 600]]);
  });

  it('returns an array of arrays when reading from adUnit.mediaTypes.banner.sizes', function () {
    let sizes = getAdUnitSizes({mediaTypes: {banner: {sizes: [300, 250]}}});
    expect(sizes).to.deep.equal([[300, 250]]);

    sizes = getAdUnitSizes({mediaTypes: {banner: {sizes: [[300, 250], [300, 600]]}}});
    expect(sizes).to.deep.equal([[300, 250], [300, 600]]);
  });
});
