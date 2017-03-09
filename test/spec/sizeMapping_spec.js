import { expect } from 'chai';
import * as sizeMapping from 'src/sizeMapping';

describe('sizeMapping', function () {
  var pbjsTestOnly = require('../helpers/pbjs-test-only').pbjsTestOnly;
  var validAdUnits = []
  var invalidAdUnit = []
  var invalidAdUnit2 = []
  var mockWindow = {};

  function resetMockWindow() {
      mockWindow = {
          document: {
              body: {
                  clientWidth: 1024
              },
              documentElement: {
                  clientWidth: 1024
              }
          },
          innerWidth: 1024
      };
  }

  function resetAdUnits() {
    validAdUnits = [{
      code: '/1996833/slot-1',
      sizes: [[300, 250], [728, 90]],
      bids: [{
              bidder: 'appnexus',
              params: {
                placementId: '987654'
              }
            }],
      sizeMapping: [
        {
          minWidth: 1200,
          sizes: [728, 90],
          bids: [
                {
                  bidder: 'openx',
                  params: {
                    pgid: '2342353',
                    unit: '234234',
                    jstag_url: 'http://'
                  }
                }, {
                  bidder: 'appnexus',
                  params: {
                    placementId: '234235'
                  }
                }
            ]
        },
        {
          minWidth: 768,
          sizes: [[728,90], [300, 100], [300, 50]],
          bids: [
                {
                  bidder: 'openx',
                  params: {
                    pgid: '123456',
                    unit: '123456',
                    jstag_url: 'http://'
                  }
                }, {
                  bidder: 'appnexus',
                  params: {
                    placementId: '123456'
                  }
                }
            ]
        },
        {
          minWidth: 580,
          bids: [
                {
                  bidder: 'openx',
                  params: {
                    pgid: '543211',
                    unit: '543211',
                    jstag_url: 'http://'
                  }
                }, {
                  bidder: 'appnexus',
                  params: {
                    placementId: '543211'
                  }
                }
            ]
        },
        {
          minWidth: 480,
          sizes: [[300, 100], [300, 50]]
        },
        {
          minWidth: 0,
          sizes: [[300, 250], [300, 100], [300, 50]],
          bids: []
        }
      ]
    }, {
      code: '/1996833/slot-2',
      sizes: [[468, 60]],
      bids: [
            {
              bidder: 'rubicon',
              params: {
                rp_account: '4934',
                rp_site: '13945',
                rp_zonesize: '23948-15'
              }
            }, {
              bidder: 'appnexus',
              params: {
                placementId: '827326'
              }
            }
            ]
    }];

    invalidAdUnit = {
      'sizes': [300,250],
      'bids': [
            {
              bidder: 'rubicon',
              params: {
                rp_account: '4934',
                rp_site: '13945',
                rp_zonesize: '23948-15'
              }
            }, {
              bidder: 'appnexus',
              params: {
                placementId: '827326'
              }
            }
            ],
      'sizeMapping': {} // wrong type
    };

    invalidAdUnit2 = {
      'sizes': [300,250],
      'sizeMapping': [{
        foo : 'bar'  //bad
      }]
    };
  }

  before(function() {
    resetAdUnits();
  })


  describe('getResponsiveAdUnits', function() {

    beforeEach(function() {
      resetMockWindow();
      resetAdUnits();
    });

    it('getResponsiveAdUnits 1980 width', function() {
      mockWindow.innerWidth = 1980;
      sizeMapping.setWindow(mockWindow);
      let adUnits = sizeMapping.getResponsiveAdUnits(validAdUnits);
      let responsiveAdUnit = adUnits[0];
      let normalAdUnit = adUnits[1];
      expect(responsiveAdUnit.sizes).to.deep.equal([728, 90]);
      expect(normalAdUnit.sizes).to.deep.equal([[468, 60]]);
      expect(responsiveAdUnit.bids).to.deep.equal(
          [
              {
                bidder: 'openx',
                params: {
                  pgid: '2342353',
                  unit: '234234',
                  jstag_url: 'http://'
                }
              }, {
                bidder: 'appnexus',
                params: {
                  placementId: '234235'
                }
              }
          ]);
    });

    it('getResponsiveAdUnits 1024 width', function() {
      mockWindow.innerWidth = 1024;
      sizeMapping.setWindow(mockWindow);
      let adUnits = sizeMapping.getResponsiveAdUnits(validAdUnits);
      let responsiveAdUnit = adUnits[0];
      let normalAdUnit = adUnits[1];
      expect(responsiveAdUnit.sizes).to.deep.equal([[728,90], [300, 100], [300, 50]]);
      expect(normalAdUnit.sizes).to.deep.equal([[468, 60]]);
      expect(responsiveAdUnit.bids).to.deep.equal(
          [
              {
                bidder: 'openx',
                params: {
                  pgid: '123456',
                  unit: '123456',
                  jstag_url: 'http://'
                }
              }, {
                bidder: 'appnexus',
                params: {
                  placementId: '123456'
                }
              }
          ]);
    });

    it('getResponsiveAdUnits - invalid adUnit - should return default sizes', function() {
      mockWindow.innerWidth = 1980;
      sizeMapping.setWindow(mockWindow);
      let adUnits = sizeMapping.getResponsiveAdUnits([invalidAdUnit]);
      let responsiveAdUnit = adUnits[0];
      expect(responsiveAdUnit.sizes).to.deep.equal([300,250]);
      expect(invalidAdUnit.sizes).to.deep.equal([300,250]);

      mockWindow.innerWidth = 1024;
      sizeMapping.setWindow(mockWindow);
      let adUnits2 = sizeMapping.getResponsiveAdUnits([invalidAdUnit]);
      let responsiveAdUnit2 = adUnits2[0];
      expect(responsiveAdUnit2.sizes).to.deep.equal([300,250]);
      expect(invalidAdUnit.sizes).to.deep.equal([300,250]);
    });

    it('getResponsiveAdUnits - invalid adUnit - should return default bids', function() {
      mockWindow.innerWidth = 1980;
      sizeMapping.setWindow(mockWindow);
      let adUnits = sizeMapping.getResponsiveAdUnits([invalidAdUnit]);
      let responsiveAdUnit = adUnits[0];
      expect(responsiveAdUnit.bids).to.deep.equal([
          {
            bidder: 'rubicon',
            params: {
              rp_account: '4934',
              rp_site: '13945',
              rp_zonesize: '23948-15'
            }
          }, {
            bidder: 'appnexus',
            params: {
              placementId: '827326'
            }
          }
          ]);
      expect(invalidAdUnit.bids).to.deep.equal([
          {
            bidder: 'rubicon',
            params: {
              rp_account: '4934',
              rp_site: '13945',
              rp_zonesize: '23948-15'
            }
          }, {
            bidder: 'appnexus',
            params: {
              placementId: '827326'
            }
          }
          ]);

      mockWindow.innerWidth = 1024;
      sizeMapping.setWindow(mockWindow);
      let adUnits2 = sizeMapping.getResponsiveAdUnits([invalidAdUnit]);
      let responsiveAdUnit2 = adUnits2[0];
      expect(responsiveAdUnit2.bids).to.deep.equal([
          {
            bidder: 'rubicon',
            params: {
              rp_account: '4934',
              rp_site: '13945',
              rp_zonesize: '23948-15'
            }
          }, {
            bidder: 'appnexus',
            params: {
              placementId: '827326'
            }
          }
          ]);
      expect(invalidAdUnit.bids).to.deep.equal([
          {
            bidder: 'rubicon',
            params: {
              rp_account: '4934',
              rp_site: '13945',
              rp_zonesize: '23948-15'
            }
          }, {
            bidder: 'appnexus',
            params: {
              placementId: '827326'
            }
          }
          ]);
    });

    it('getResponsiveAdUnits - should return empty bid array if empty bid array in sizemapping', function() {
      mockWindow.innerWidth = 320;
      sizeMapping.setWindow(mockWindow);
      let adUnits = sizeMapping.getResponsiveAdUnits(validAdUnits);
      let responsiveAdUnit = adUnits[0];
      expect(responsiveAdUnit.bids).to.deep.equal([]);
    });

    it('getResponsiveAdUnits - should return default bids if sizeMapping.bids not defined ', function() {
      mockWindow.innerWidth = 520;
      sizeMapping.setWindow(mockWindow);
      let adUnits = sizeMapping.getResponsiveAdUnits(validAdUnits);
      let responsiveAdUnit = adUnits[0];
      expect(responsiveAdUnit.bids).to.deep.equal(
        [{
          bidder: 'appnexus',
          params: {
            placementId: '987654'
          }
        }]
      );
    });

    it('getResponsiveAdUnits - should return desktop (largest) sizes if screen width not detected', function() {
      mockWindow.innerWidth = 0;
      mockWindow.document.body.clientWidth = 0;
      mockWindow.document.documentElement.clientWidth = 0;
      sizeMapping.setWindow(mockWindow);
      let adUnits = sizeMapping.getResponsiveAdUnits(validAdUnits);
      let responsiveAdUnit = adUnits[0];
      let normalAdUnit = adUnits[1];
      expect(responsiveAdUnit.sizes).to.deep.equal([728, 90]);
      expect(normalAdUnit.sizes).to.deep.equal([[468, 60]]);
    });

    it('getResponsiveAdUnits - should return default sizes if sizemapping.sizes not defined ', function() {
      mockWindow.innerWidth = 600;
      sizeMapping.setWindow(mockWindow);
      let adUnits = sizeMapping.getResponsiveAdUnits(validAdUnits);
      let responsiveAdUnit = adUnits[0];
      expect(responsiveAdUnit.sizes).to.deep.equal([[300, 250], [728, 90]]);
    });

    it('getResponsiveAdUnits - should return default sizes if sizemapping improperly defined ', function() {
      mockWindow.innerWidth = 0;
      mockWindow.document.body.clientWidth = 0;
      mockWindow.document.documentElement.clientWidth = 0;
      sizeMapping.setWindow(mockWindow);
      let adUnits = sizeMapping.getResponsiveAdUnits([invalidAdUnit2]);
      let invalidAdUnit = adUnits[0]
      expect(invalidAdUnit.sizes).to.deep.equal([300,250]);
    });
  });


  describe('getActiveSizeMap', function() {
    
    beforeEach(function() {
      resetMockWindow();
      resetAdUnits();
    });

    it('getActiveSizeMap - should return the sizeMap depending upon the screen size', function() {
      mockWindow.innerWidth = 769;
      sizeMapping.setWindow(mockWindow);
      let AdUnit = validAdUnits[0];
      let sizeMap = sizeMapping.getActiveSizeMap(AdUnit);
      expect(sizeMap.minWidth).to.equal(768);
      expect(sizeMap.sizes).to.deep.equal([[728,90], [300, 100], [300, 50]]);
      expect(sizeMap.bids).to.deep.equal([
              {
                bidder: 'openx',
                params: {
                  pgid: '123456',
                  unit: '123456',
                  jstag_url: 'http://'
                }
              }, {
                bidder: 'appnexus',
                params: {
                  placementId: '123456'
                }
              }
          ]);
    });

    it('getActiveSizeMap - should return exact minWidth if screen equals the minWidth', function() {
      mockWindow.innerWidth = 768;
      sizeMapping.setWindow(mockWindow);
      let AdUnit = validAdUnits[0];
      let sizeMap = sizeMapping.getActiveSizeMap(AdUnit);
      expect(sizeMap.minWidth).to.equal(768);
    });
  });

  describe('getScreenWidth', function() {

    beforeEach(function() {
      resetMockWindow();
      resetAdUnits();
    });

    it('getScreenWidth', function() {
      mockWindow.innerWidth = 900;
      mockWindow.document.body.clientWidth = 900;
      mockWindow.document.documentElement.clientWidth = 900;
      expect(sizeMapping.getScreenWidth(mockWindow)).to.equal(900);
    });

    it('getScreenWidth - should return 0 if it cannot deteremine size', function() {
      mockWindow.innerWidth = null;
      mockWindow.document.body.clientWidth = null;
      mockWindow.document.documentElement.clientWidth = null;
      expect(sizeMapping.getScreenWidth(mockWindow)).to.equal(0);
    });

  });
});
