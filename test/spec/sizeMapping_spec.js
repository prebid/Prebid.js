import { expect } from 'chai';
import { resolveSizesFromLabels, setLabels, setSizeConfig } from 'src/sizeMapping';

describe('sizeMapping', () => {
  var testSizes = [[970, 90], [728, 90], [300, 250], [300, 100]];

  var sizeConfig = [{
    'mediaQuery': '(min-width: 1200px)',
    'sizesSupported': [
      [970, 90],
      [728, 90],
      [300, 250]
    ],
    'labels': ['desktop']
  }, {
    'mediaQuery': '(min-width: 768px) and (max-width: 1199px)',
    'sizesSupported': [
      [728, 90],
      [300, 250]
    ],
    'labels': ['tablet', 'phone']
  }, {
    'mediaQuery': '(min-width: 0px)',
    'sizesSupported': [
      [300, 250],
      [300, 100]
    ],
    'labels': ['phone']
  }];

  let matchMediaResult = {};

  beforeEach(() => {
    setLabels([]);
    setSizeConfig(sizeConfig);

    sinon.stub(window, 'matchMedia', () => matchMediaResult);
  });

  afterEach(() => {
    setLabels([]);
    setSizeConfig([]);

    window.matchMedia.restore();
  });

  it('should return back all sizes if there are no labels', () => {
    let sizes = resolveSizesFromLabels(undefined, testSizes);

    expect(sizes).to.deep.equal(testSizes);
  });

  it('should pass all sizes for custom labels that match passed-in labels', () => {
    setLabels(['uk-user']);

    let sizes = resolveSizesFromLabels(['uk-user'], testSizes);

    expect(sizes).to.deep.equal(testSizes);
  });

  it('should return no sizes for custom labels that do not match passed in labels', () => {
    setLabels(['uk-user']);

    let sizes = resolveSizesFromLabels(['us-user'], testSizes);

    expect(sizes).to.deep.equal([]);
  });

  it('should filter sizes to correct sizesSupported if supplied and mediaQuery matches', () => {
    matchMediaResult = {matches: true};

    let sizes;

    sizes = resolveSizesFromLabels(['desktop'], testSizes);

    expect(sizes).to.deep.equal([
      [970, 90],
      [728, 90],
      [300, 250]
    ]);

    sizes = resolveSizesFromLabels(['tablet'], testSizes);

    expect(sizes).to.deep.equal([
      [728, 90],
      [300, 250]
    ]);

    sizes = resolveSizesFromLabels(['phone'], testSizes);

    expect(sizes).to.deep.equal([
      [300, 250]
    ]);
  });

  it('should filter sizes to correctly if mediaQuery does not match', () => {
    matchMediaResult = {matches: false};

    let sizes;

    sizes = resolveSizesFromLabels(['desktop'], testSizes);

    expect(sizes).to.deep.equal([]);
  });
});
