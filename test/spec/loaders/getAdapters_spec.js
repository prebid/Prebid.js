'use strict';

const mockfs = require('mock-fs');
const proxyquire = require('proxyquire');
const expect = require('chai').expect;

require('../../../loaders/getAdapters');

describe('loaders/getAdapters', () => {

  let defaultAdapters;
  let customAdapters;
  const defaultAdaptersFile = 'adapters.json';
  const adaptersArg = 'adapters';

  beforeEach(() => {
    defaultAdapters = [ 'adapter 1', 'adapter 2', 'adapter 3' ];
    customAdapters = [ 'adapter 1' ];
  });

  afterEach(() => {
    mockfs.restore();
  });

  describe('when custom adapter list is defined', () => {

    describe('and exists', () => {

      it('should return custom adapter list', () => {
        mockfs({
          'adapters.json': JSON.stringify(defaultAdapters),
          'custom-adapters.json': JSON.stringify(customAdapters)
        });
        const getAdapters = proxyquire('../../../loaders/getAdapters', {
          yargs: { argv: { adapters: 'custom-adapters.json' } }
        });
        expect(getAdapters(defaultAdaptersFile, adaptersArg)).to.deep.equal(customAdapters);
      });

    });

    describe('and does not exist', () => {

      it('should return default adapter list and show warning', () => {
        let log;
        const consoleLog = console.log.bind(console);
        console.log = (message) => {
          log = message;
        };
        mockfs({
          'adapters.json': JSON.stringify(defaultAdapters)
        });
        const getAdapters = proxyquire('../../../loaders/getAdapters', {
          yargs: { argv: { adapters: 'non-existent-adapters.json' } }
        });
        expect(getAdapters(defaultAdaptersFile, adaptersArg)).to.deep.equal(defaultAdapters);
        expect(log).to.match(/non-existent-adapters.json/);
        console.log = consoleLog;
      });

    });

  });

  describe('when custom adapter list is not defined', () => {

    it('should return default adapter list', () => {
      mockfs({
        'adapters.json': JSON.stringify(defaultAdapters)
      });
      const getAdapters = proxyquire('../../../loaders/getAdapters', {
        yargs: { argv: {} }
      });
      expect(getAdapters(defaultAdaptersFile, adaptersArg)).to.deep.equal(defaultAdapters);
    });

  });

  describe('when default adapter list cannot be found', () => {

    it('should return empty array', () => {
      mockfs({
        'adapters.json': mockfs.file({ mode: 0x000 })
      });
      const getAdapters = proxyquire('../../../loaders/getAdapters', {
        yargs: { argv: {} }
      });
      expect(getAdapters(defaultAdaptersFile, adaptersArg)).to.deep.equal([]);
    });

  });

});
