'use strict';

const proxyquire = require('proxyquire');
const allAdapters = require('../../fixtures/allAdapters');
const expect = require('chai').expect;
require('../../../loaders/adapterLoader');

const defaultAdapters = ["aardvark","adblade","adbutler","adequant","adform","admedia","aol","appnexus","appnexusAst","getintent","hiromedia","indexExchange","kruxlink","komoona","openx","piximedia","pubmatic","pulsepoint","rubicon","sonobi","sovrn","springserve","thoughtleadr","triplelift","twenga","yieldbot","nginad","brightcom","wideorbit","jcm","underdogmedia","memeglobal","centro","roxot",{"appnexus":{"alias":"brealtime"}},{"appnexus":{"alias":"pagescience"}},{"appnexus":{"alias":"defymedia"}},{"appnexusAst":{"supportedMediaTypes":["video"]}}];

const input = `/** INSERT ADAPTERS - DO NOT EDIT OR REMOVE */
  /** END INSERT ADAPTERS */`;

describe('adapterLoader.js', () => {
  it('should replace with the default set of adapters', () => {
    const getAdapterStub = () => defaultAdapters;
    const loader = proxyquire('../../../loaders/adapterLoader', {'./getAdapters' : getAdapterStub});
    let output = loader(input);
    expect(output).to.equal(allAdapters.getAllAdaptersString());

  });

  it('should return custom adapter list if file exists', () => {
    const customAdapter = [{customAdapterName :{srcPath: '/somepath/customAdapterName.js'}}];
    const getAdapterStub = () => customAdapter;
    const loader = proxyquire('../../../loaders/adapterLoader', {'fs': {existsSync : ()=> true }, './getAdapters' : getAdapterStub});
    let output = loader(input);
    const expected = 'let customAdapterName = require(\'/somepath/customAdapterName.js\');\n      exports.registerBidAdapter(new customAdapterName, \'customAdapterName\');\nexports.videoAdapters = [];';
    expect(output).to.equal(expected);
  });

  it('should ignore custom adapters that that do not exist', () => {
    const customAdapter = ['appnexus', {customAdapterName :{srcPath: '/somepath/customAdapterName.js'}}];
    const getAdapterStub = () => customAdapter;
    const loader = proxyquire('../../../loaders/adapterLoader', {'fs': {existsSync : ()=> false }, './getAdapters' : getAdapterStub});
    let output = loader(input);
    const expected = 'var AppnexusAdapter = require(\'./adapters/appnexus.js\');\n    exports.registerBidAdapter(new AppnexusAdapter(), \'appnexus\');\nexports.videoAdapters = [];';
    expect(output).to.equal(expected);
  });

});
