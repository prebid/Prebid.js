import { expect } from 'chai';
import { getPriceBucketString, isValidPriceConfig } from 'src/cpmBucketManager.js';
let cpmFixtures = require('test/fixtures/cpmInputsOutputs.json');

describe('cpmBucketManager', function () {
  it('getPriceBucketString function generates the correct price strings', function () {
    let input = cpmFixtures.cpmInputs;
    for (let i = 0; i < input.length; i++) {
      let output = getPriceBucketString(input[i]);
      let jsonOutput = JSON.stringify(output);
      expect(jsonOutput).to.deep.equal(JSON.stringify(cpmFixtures.priceStringOutputs[i]));
    }
  });

  it('gets the correct custom bucket strings', function () {
    let cpm = 16.50908;
    let customConfig = {
      'buckets': [{
        'precision': 4,
        'max': 3,
        'increment': 0.01,
      },
      {
        'precision': 4,
        'max': 18,
        'increment': 0.05,
        'cap': true
      }
      ]
    };
    let expected = '{"low":"5.00","med":"16.60","high":"16.51","auto":"17.00","dense":"17.00","custom":"16.5500"}';
    let output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);
  });

  it('gets the correct custom bucket strings with irregular increment', function () {
    let cpm = 14.50908;
    let customConfig = {
      'buckets': [{
        'precision': 4,
        'max': 4,
        'increment': 0.01,
      },
      {
        'precision': 4,
        'max': 18,
        'increment': 0.3,
        'cap': true
      }
      ]
    };
    let expected = '{"low":"5.00","med":"14.60","high":"14.51","auto":"15.00","dense":"15.00","custom":"14.8000"}';
    let output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);
  });

  it('gets the correct custom bucket strings in non-USD currency', function () {
    let cpm = 16.50908 * 110.49;
    let customConfig = {
      'buckets': [{
        'precision': 4,
        'max': 3,
        'increment': 0.01,
      },
      {
        'precision': 4,
        'max': 18,
        'increment': 0.05,
        'cap': true
      }
      ]
    };
    let expected = '{"low":"552.45","med":"1834.13","high":"1824.19","auto":"1878.33","dense":"1878.33","custom":"1828.6095"}';
    let output = getPriceBucketString(cpm, customConfig, 110.49);
    expect(JSON.stringify(output)).to.deep.equal(expected);
  });

  it('gets the correct custom bucket strings with specific cpms that round oddly with certain increments', function () {
    let customConfig = {
      'buckets': [{
        'precision': 4,
        'max': 4,
        'increment': 0.10,
      }]
    };
    let cpm = 2.21;
    let expected = '{"low":"2.50","med":"2.30","high":"2.21","auto":"2.25","dense":"2.21","custom":"2.3000"}';
    let output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);

    cpm = 3.15;
    expected = '{"low":"3.50","med":"3.20","high":"3.15","auto":"3.15","dense":"3.15","custom":"3.2000"}';
    output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);

    customConfig = {
      'buckets': [{
        'precision': 3,
        'max': 6,
        'increment': 0.08,
      }]
    };
    cpm = 4.89;
    expected = '{"low":"5.00","med":"4.90","high":"4.89","auto":"4.90","dense":"4.90","custom":"4.960"}';
    output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);

    customConfig = {
      'buckets': [{
        'precision': 3,
        'max': 6,
        'increment': 0.05,
      }]
    };
    cpm = 2.98;
    expected = '{"low":"3.00","med":"3.00","high":"2.98","auto":"3.00","dense":"2.98","custom":"3.000"}';
    output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);

    cpm = 2.99;
    expected = '{"low":"3.00","med":"3.00","high":"3.00","auto":"3.00","dense":"3.00","custom":"3.000"}';
    output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);

    customConfig = {
      'buckets': [{
        'precision': 2,
        'max': 6,
        'increment': 0.01,
      }]
    };
    cpm = 4.01;
    expected = '{"low":"4.50","med":"4.10","high":"4.01","auto":"4.05","dense":"4.05","custom":"4.01"}';
    output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);

    cpm = 4.68;
    expected = '{"low":"5.00","med":"4.70","high":"4.68","auto":"4.70","dense":"4.70","custom":"4.68"}';
    output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);

    cpm = 4.69;
    expected = '{"low":"5.00","med":"4.70","high":"4.70","auto":"4.70","dense":"4.70","custom":"4.70"}';
    output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);
  });

  it('gets custom bucket strings and it should honor 0', function () {
    let cpm = 16.50908;
    let customConfig = {
      'buckets': [
        {
          'precision': 0,
          'max': 18,
          'increment': 0.05,
        }
      ]
    };
    let expected = '{"low":"5.00","med":"16.60","high":"16.51","auto":"17.00","dense":"17.00","custom":"17"}';
    let output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);
  });

  it('gets the custom bucket strings without passing precision and it should honor the default precision', function () {
    let cpm = 16.50908;
    let customConfig = {
      'buckets': [
        {
          'max': 18,
          'increment': 0.05,
        }
      ]
    };
    let expected = '{"low":"5.00","med":"16.60","high":"16.51","auto":"17.00","dense":"17.00","custom":"16.55"}';
    let output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);
  });

  it('checks whether custom config is valid', function () {
    let badConfig = {
      'buckets': [{
        'max': 3,
        'increment': 0.01,
      },
      {
        'max': 18,
        // missing increment prop
        'cap': true
      }
      ]
    };

    expect(isValidPriceConfig(badConfig)).to.be.false;
  });
});
