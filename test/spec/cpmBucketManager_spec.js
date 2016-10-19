import { expect } from 'chai';
import {getPriceBucketString, isValidePriceConfig} from 'src/cpmBucketManager';
let cpmFixtures = require('test/fixtures/cpmInputsOutputs.json');

describe('cpmBucketManager', () => {

  it('getPriceBucketString function generates the correct price strings', () => {
    let input = cpmFixtures.cpmInputs;
    for(let i = 0; i < input.length; i++){
      let output = getPriceBucketString(input[i]);
      let jsonOutput = JSON.stringify(output);
      expect(jsonOutput).to.deep.equal(JSON.stringify(cpmFixtures.priceStringOutputs[i]));
    }
  });

  it('gets the correct custom bucket strings', () => {
    let cpm = 16.50908;
    let customConfig = {
      "buckets" : [{
          "precision" : 4,
          "min" : 0,
          "max" : 3,
          "increment" : 0.01,
        },
        {
          "precision" : 4,
          "min" : 3,
          "max" : 18,
          "increment" : 0.05,
          "cap" : true
        }
      ]
    };
    let expected = '{"low":"5.00","med":"16.50","high":"16.50","auto":"16.50","dense":"16.50","custom":"16.5000"}';
    let output = getPriceBucketString(cpm, customConfig);
    expect(JSON.stringify(output)).to.deep.equal(expected);
  });

  it('checks whether custom config is valid', () => {
    let badConfig = {
      "buckets" : [{
          "min" : 0,
          "max" : 3,
          "increment" : 0.01,
        },
        {
          //missing min prop
          "max" : 18,
          "increment" : 0.05,
          "cap" : true
        }
      ]
    };

    expect(isValidePriceConfig(badConfig)).to.be.false;
  });

});
