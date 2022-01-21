import {ftrackSubmodule} from 'modules/ftrackRtdProvider.js';
import { config } from 'src/config.js';
let expect = require('chai').expect;

var getMimes = function () {
  var mimes = [];
  var nivigatorMimes = navigator.mimeTypes;
  try {
    for (var i = 0; i < nivigatorMimes.length; i++) {
      mimes.push(nivigatorMimes[i].type + ': ' + nivigatorMimes[i].description);
    }
  } catch (e) {}
  return mimes.join("|");
}
var getPlugins = function () {
  var plugins = [];
  var navigatorPlugins = navigator.plugins;
  try {
    for (var i = 0; i < navigatorPlugins.length; i++) {
      plugins.push(navigatorPlugins[i].name + ': ' + navigatorPlugins[i].description + ' (' + navigatorPlugins[i].filename + ')');
    }
  } catch (e) {}
  return plugins.join("|");
}

describe('FTrack Real Time Data 🕒 submodule aka "ftrackRtdProvider"', () => {
  afterEach(function() {
    config.resetConfig();
    config.resetBidder();

    window.localStorage.removeItem('ftrack-rtd');
    window.localStorage.removeItem('ftrack-rtd_exp');
  });

  describe(`Global Module Rules`, () => {
    it(`should not use the "PREBID_GLOBAL" variable nor otherwise obtain a pointer to the global PBJS object`, () => {
      expect((/PREBID_GLOBAL/gi).test(JSON.stringify(ftrackSubmodule))).to.not.be.ok;
    });
  });

  describe('ftrackSubmodule:', function() {
    var server;
    beforeEach(() => {
      server = sinon.createFakeServer();
    });

    afterEach(() => {
      server.restore();
    });

    it(`should be using the StorageManager to set cookies or localstorage, as opposed to doing it directly`, () => {
      // This just checks to see if the javascript api is referenced by looking at the module as a string and searching for this strings
      expect((/localStorage/gi).test(JSON.stringify(ftrackSubmodule))).to.not.be.ok;
      expect((/cookie/gi).test(JSON.stringify(ftrackSubmodule))).to.not.be.ok;
    });

    describe(`name property:`, function() {
      it(`should be 'ftrack-rtd'`, function() {
        expect(ftrackSubmodule.name).to.equal('ftrack-rtd');
      });
    });

    describe(`init() method:`, function() {
      var ftCacheRegExp = /https:\/\/e\.flashtalking\.com\/cache/;
      var sandbox = sinon.createSandbox();
      afterEach(function() {
        sandbox.restore();
      });

      describe(`when userConsent is not defined`, function() {
        it('should initalise and return true', function () {
          expect(ftrackSubmodule.init()).to.equal(true);
        });
      });

      describe(`when userConsent has defined properties`, function() {
        it('should return false when userConsent.gdpr is truthy', function () {
          expect(ftrackSubmodule.init(null, {gdpr: 1})).to.equal(false);
        });
        it('should return false when userConsent.usp is truthy', function () {
          expect(ftrackSubmodule.init(null, {usp: 1})).to.equal(false);
        });
        it('should return false when userConsent.coppa is truthy', function () {
          expect(ftrackSubmodule.init(null, {coppa: 1})).to.equal(false);
        });
      });

      it(`should attempt to get the ftrack ID from local storage`, function() {
        window.localStorage.setItem('ftrack-rtd', '{"DeviceID":["mock_id_value"]}');

        sandbox.spy(window.Storage.prototype, 'getItem');

        ftrackSubmodule.init({
          'name': 'ftrack-rtd'
        }, {
          'gdpr': null,
          'usp': null,
          'coppa': false
        });

        expect(window.Storage.prototype.getItem.calledWith('ftrack-rtd')).to.be.ok;
      });

      it(`should reach out to ftrack if ID is not in localstorage`, function() {
        ftrackSubmodule.init();
        expect(server.requests).to.have.length(1);
        expect((ftCacheRegExp).test(server.requests[0].url)).to.be.ok;
        server.resetHistory();
      });

      it(`should add the ID(s) to localstorage when not found in localStorage, and also add it to ort2b`, function() {
        // Confirm that our item is not in localStorage yet
        expect(window.localStorage.getItem('ftrack-rtd')).to.not.be.ok;
        expect(window.localStorage.getItem('ftrack-rtd_exp')).to.not.be.ok;

        sandbox.spy(window.Storage.prototype, 'setItem');

        config.setBidderConfig({
          bidders: ['grid'],
          config: {
            localStorageWriteAllowed: true
          }
        });

        ftrackSubmodule.init({
          'name': 'ftrack-rtd'
        }, {
          'gdpr': null,
          'usp': null,
          'coppa': false
        });

        // Confirm that the initial state of bidder config
        expect(config.getBidderConfig()).to.deep.equal({'grid': {'localStorageWriteAllowed': true}});

        return new Promise(function(resolve, reject) {
          expect((ftCacheRegExp).test(server.requests[0].url)).to.be.ok;
          server.requests[0].respond(200, { 'Content-Type': 'application/json' }, '{"cache_id":"<CACHE ID>"}');
          expect((/lgc/).test(server.requests[1].url)).to.be.ok;
          server.requests[1].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({'DeviceID': ['mock_id_value_from_lgc']}));

          ftrackSubmodule.getBidRequestData(null, function() {
            var expectedBidderConfig = {
              'grid': {
                'localStorageWriteAllowed': true,
                'ortb2': {
                  'user': {
                    'data': [{
                      'name': 'flashtalking',
                      'segment': [{
                        'name': 'ft_id',
                        'value': 'mock_id_value_from_lgc'
                      }]
                    }],
                    "ext": {
                      "device": {
                        "language": navigator.language || navigator.browserLanguage || null,
                        "pxratio": window.devicePixelRatio || null,
                        "ua": navigator.userAgent || null,
                        "h": window.screen ? window.screen.height : null,
                        "w": window.screen ? window.screen.width : null,
                        "mimes": getMimes(),
                        "plugins": getPlugins(),
                        "platform": navigator.platform || null,
                        "ref": document.referrer || null
                      }
                    }
                  }
                }
              }
            };

            expect(window.Storage.prototype.setItem.calledWith('ftrack-rtd')).to.be.ok;
            expect(window.Storage.prototype.setItem.calledWith('ftrack-rtd_exp')).to.be.ok;

            expect(config.getBidderConfig()).to.deep.equal(expectedBidderConfig);
            resolve();
          });
        });
      });

      it(`should add the ID to ort2b after the ID is found via localStorage`, function() {
        window.localStorage.setItem('ftrack-rtd', '{"DeviceID":["mock_id_value"]}');

        config.setBidderConfig({
          bidders: ['grid'],
          config: {
            localStorageWriteAllowed: true
          }
        });

        ftrackSubmodule.init({
          'name': 'ftrack-rtd'
        }, {
          'gdpr': null,
          'usp': null,
          'coppa': false
        });

        // Confirm that the initial state of bidder config
        expect(config.getBidderConfig()).to.deep.equal({'grid': {'localStorageWriteAllowed': true}});

        return new Promise(function(resolve, reject) {
          ftrackSubmodule.getBidRequestData(null, function() {
            var expectedBidderConfig = {
              'grid': {
                'localStorageWriteAllowed': true,
                'ortb2': {
                  'user': {
                    'data': [{
                      'name': 'flashtalking',
                      'segment': [{
                        'name': 'ft_id',
                        'value': 'mock_id_value'
                      }]
                    }],
                    "ext": {
                      "device": {
                        "language": navigator.language || navigator.browserLanguage || null,
                        "pxratio": window.devicePixelRatio || null,
                        "ua": navigator.userAgent || null,
                        "h": window.screen ? window.screen.height : null,
                        "w": window.screen ? window.screen.width : null,
                        "mimes": getMimes(),
                        "plugins": getPlugins(),
                        "platform": navigator.platform || null,
                        "ref": document.referrer || null
                      }
                    }
                  }
                }
              }
            };

            expect(config.getBidderConfig()).to.deep.equal(expectedBidderConfig);
            resolve();
          });
        });
      });
    });

    describe(`getBidRequestData() method:`, function() {
      it(`should trigger the "callback" mathod passed to it`, function() {
        window.localStorage.setItem('ftrack-rtd', '{"DeviceID":["mock_id_value"]}');

        config.setBidderConfig({
          bidders: ['grid'],
          config: {
            localStorageWriteAllowed: true
          }
        });

        ftrackSubmodule.init({
          'name': 'ftrack-rtd'
        }, {
          'gdpr': null,
          'usp': null,
          'coppa': false
        });
        return new Promise(function(resolve, reject) {
          ftrackSubmodule.getBidRequestData(null, function() {
            expect(true).to.be.ok;
            resolve();
          });
        });
      });
    });
  });
});
