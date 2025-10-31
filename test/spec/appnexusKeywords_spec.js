import {transformBidderParamKeywords} from '../../libraries/appnexusUtils/anKeywords.js';
import {expect} from 'chai/index.js';
import * as utils from '../../src/utils.js';

describe('transformBidderParamKeywords', function () {
  it('returns an array of objects when keyvalue is an array', function () {
    const keywords = {
      genre: ['rock', 'pop']
    };
    const result = transformBidderParamKeywords(keywords);
    expect(result).to.deep.equal([{
      key: 'genre',
      value: ['rock', 'pop']
    }]);
  });

  it('returns an array of objects when keyvalue is a string', function () {
    const keywords = {
      genre: 'opera'
    };
    const result = transformBidderParamKeywords(keywords);
    expect(result).to.deep.equal([{
      key: 'genre',
      value: ['opera']
    }]);
  });

  it('returns an array of objects when keyvalue is a number', function () {
    const keywords = {
      age: 15
    };
    const result = transformBidderParamKeywords(keywords);
    expect(result).to.deep.equal([{
      key: 'age',
      value: ['15']
    }]);
  });

  it('returns an array of objects when using multiple keys with values of differing types', function () {
    const keywords = {
      genre: 'classical',
      mix: ['1', 2, '3', 4],
      age: 10
    };
    const result = transformBidderParamKeywords(keywords);
    expect(result).to.deep.equal([{
      key: 'genre',
      value: ['classical']
    }, {
      key: 'mix',
      value: ['1', '2', '3', '4']
    }, {
      key: 'age',
      value: ['10']
    }]);
  });

  it('returns an array of objects when the keyvalue uses an empty string', function () {
    const keywords = {
      test: [''],
      test2: ''
    };
    const result = transformBidderParamKeywords(keywords);
    expect(result).to.deep.equal([{
      key: 'test',
    }, {
      key: 'test2',
    }]);
  });
});
