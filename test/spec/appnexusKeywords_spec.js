import {transformBidderParamKeywords} from '../../libraries/appnexusUtils/anKeywords.js';
import {expect} from 'chai/index.js';
import * as utils from '../../src/utils.js';

describe('transformBidderParamKeywords', function () {
  it('returns an array of objects when keyvalue is an array', function () {
    let keywords = {
      genre: ['rock', 'pop']
    };
    let result = transformBidderParamKeywords(keywords);
    expect(result).to.deep.equal([{
      key: 'genre',
      value: ['rock', 'pop']
    }]);
  });

  it('returns an array of objects when keyvalue is a string', function () {
    let keywords = {
      genre: 'opera'
    };
    let result = transformBidderParamKeywords(keywords);
    expect(result).to.deep.equal([{
      key: 'genre',
      value: ['opera']
    }]);
  });

  it('returns an array of objects when keyvalue is a number', function () {
    let keywords = {
      age: 15
    };
    let result = transformBidderParamKeywords(keywords);
    expect(result).to.deep.equal([{
      key: 'age',
      value: ['15']
    }]);
  });

  it('returns an array of objects when using multiple keys with values of differing types', function () {
    let keywords = {
      genre: 'classical',
      mix: ['1', 2, '3', 4],
      age: 10
    };
    let result = transformBidderParamKeywords(keywords);
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
    let keywords = {
      test: [''],
      test2: ''
    };
    let result = transformBidderParamKeywords(keywords);
    expect(result).to.deep.equal([{
      key: 'test',
    }, {
      key: 'test2',
    }]);
  });
});
