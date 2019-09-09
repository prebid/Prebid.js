(function () {
  'use strict';

  angular
    .module('mock.services')
    .factory('blockCreativeService', ['mocks', function (mocks) {
      return {
        createBlockedCreative: mocks.simplePromise(),
        updateBlockedCreative: mocks.simplePromise(),
        getCreativeBlockList: mocks.simplePromise()

      };
    }]);
})();
