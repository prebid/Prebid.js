import { expect } from 'chai';
import {getPriceBucketString, isValidPriceConfig} from 'src/cpmBucketManager';
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
        'min': 0,
        'max': 3,
        'increment': 0.01,
      },
      {
        'precision': 4,
        'min': 3,
        'max': 18,
        'increment': 0.05,
        'cap': true
      }
      ]
    };
    let expected = '{"low":"5.00","med":"16.50","high":"16.50","auto":"16.50","dense":"16.50","custom":"16.5000"}';
    let output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);
  });

  it('gets the correct custom bucket strings with irregular increment', function () {
    let cpm = 14.50908;
    let customConfig = {
      'buckets': [{
        'precision': 4,
        'min': 0,
        'max': 4,
        'increment': 0.01,
      },
      {
        'precision': 4,
        'min': 4,
        'max': 18,
        'increment': 0.3,
        'cap': true
      }
      ]
    };
    let expected = '{"low":"5.00","med":"14.50","high":"14.50","auto":"14.50","dense":"14.50","custom":"14.5000"}';
    let output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);
  });

  it('gets the correct custom bucket strings in non-USD currency', function () {
    let cpm = 16.50908 * 110.49;
    let customConfig = {
      'buckets': [{
        'precision': 4,
        'min': 0,
        'max': 3,
        'increment': 0.01,
      },
      {
        'precision': 4,
        'min': 3,
        'max': 18,
        'increment': 0.05,
        'cap': true
      }
      ]
    };
    let expected = '{"low":"552.45","med":"1823.09","high":"1823.09","auto":"1823.09","dense":"1823.09","custom":"1823.0850"}';
    let output = getPriceBucketString(cpm, customConfig, 110.49);
    expect(JSON.stringify(output)).to.deep.equal(expected);
  });

  it('gets the correct custom bucket strings with specific cpms that round oddly with certain increments', function () {
    let customConfig = {
      'buckets': [{
        'precision': 4,
        'min': 0,
        'max': 4,
        'increment': 0.10,
      }]
    };
    let cpm = 2.21;
    let expected = '{"low":"2.00","med":"2.20","high":"2.21","auto":"2.20","dense":"2.21","custom":"2.2000"}';
    let output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);

    cpm = 3.15;
    expected = '{"low":"3.00","med":"3.10","high":"3.15","auto":"3.15","dense":"3.15","custom":"3.1000"}';
    output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);

    customConfig = {
      'buckets': [{
        'precision': 3,
        'min': 0,
        'max': 6,
        'increment': 0.08,
      }]
    };
    cpm = 4.89;
    expected = '{"low":"4.50","med":"4.80","high":"4.89","auto":"4.85","dense":"4.85","custom":"4.880"}';
    output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);

    customConfig = {
      'buckets': [{
        'precision': 3,
        'min': 0,
        'max': 6,
        'increment': 0.05,
      }]
    };
    cpm = 2.98;
    expected = '{"low":"2.50","med":"2.90","high":"2.98","auto":"2.95","dense":"2.98","custom":"2.950"}';
    output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);

    cpm = 2.99;
    expected = '{"low":"2.50","med":"2.90","high":"2.99","auto":"2.95","dense":"2.99","custom":"2.950"}';
    output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);

    customConfig = {
      'buckets': [{
        'precision': 2,
        'min': 0,
        'max': 6,
        'increment': 0.01,
      }]
    };
    cpm = 4.01;
    expected = '{"low":"4.00","med":"4.00","high":"4.01","auto":"4.00","dense":"4.00","custom":"4.01"}';
    output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);

    cpm = 4.68;
    expected = '{"low":"4.50","med":"4.60","high":"4.68","auto":"4.65","dense":"4.65","custom":"4.68"}';
    output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);

    cpm = 4.69;
    expected = '{"low":"4.50","med":"4.60","high":"4.69","auto":"4.65","dense":"4.65","custom":"4.69"}';
    output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);
  });

  it('gets custom bucket strings and it should honor 0', function () {
    let cpm = 16.50908;
    let customConfig = {
      'buckets': [
        {
          'precision': 0,
          'min': 3,
          'max': 18,
          'increment': 0.05,
        }
      ]
    };
    let expected = '{"low":"5.00","med":"16.50","high":"16.50","auto":"16.50","dense":"16.50","custom":"17"}';
    let output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);
  });

  it('gets the custom bucket strings without passing precision and it should honor the default precision', function () {
    let cpm = 16.50908;
    let customConfig = {
      'buckets': [
        {
          'min': 3,
          'max': 18,
          'increment': 0.05,
        }
      ]
    };
    let expected = '{"low":"5.00","med":"16.50","high":"16.50","auto":"16.50","dense":"16.50","custom":"16.50"}';
    let output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);
  });

  it('checks whether custom config is valid', function () {
    let badConfig = {
      'buckets': [{
        'min': 0,
        'max': 3,
        'increment': 0.01,
      },
      {
        // missing min prop
        'max': 18,
        'increment': 0.05,
        'cap': true
      }
      ]
    };

    expect(isValidPriceConfig(badConfig)).to.be.false;
  });
});
