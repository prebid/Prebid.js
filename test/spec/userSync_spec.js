import { expect } from 'chai';
import { config } from 'src/config.js';
// Use require since we need to be able to write to these vars
const utils = require('../../src/utils');
let { newUserSync, USERSYNC_DEFAULT_CONFIG } = require('../../src/userSync');

describe('user sync', function () {
  let triggerPixelStub;
  let logWarnStub;
  let timeoutStub;
  let shuffleStub;
  let getUniqueIdentifierStrStub;
  let insertUserSyncIframeStub;
  let idPrefix = 'test-generated-id-';
  let lastId = 0;
  let defaultUserSyncConfig = config.getConfig('userSync');
  function getUserSyncConfig(userSyncConfig) {
    return Object.assign({}, defaultUserSyncConfig, userSyncConfig);
  }
  function newTestUserSync(configOverrides, disableBrowserCookies) {
    const thisConfig = Object.assign({}, defaultUserSyncConfig, configOverrides);
    return newUserSync({
      config: thisConfig,
      browserSupportsCookies: !disableBrowserCookies,
    })
  }
  let clock;
  before(function () {
    clock = sinon.useFakeTimers();
  });

  after(function () {
    clock.restore();
  });

  beforeEach(function () {
    config.setConfig({ userSync: USERSYNC_DEFAULT_CONFIG });
    triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    logWarnStub = sinon.stub(utils, 'logWarn');
    shuffleStub = sinon.stub(utils, 'shuffle').callsFake((array) => array.reverse());
    getUniqueIdentifierStrStub = sinon.stub(utils, 'getUniqueIdentifierStr').callsFake(() => idPrefix + (lastId += 1));
    insertUserSyncIframeStub = sinon.stub(utils, 'insertUserSyncIframe');
  });

  afterEach(function () {
    triggerPixelStub.restore();
    logWarnStub.restore();
    shuffleStub.restore();
    getUniqueIdentifierStrStub.restore();
    insertUserSyncIframeStub.restore();
    config.resetConfig();
  });

  it('should register and fire a pixel URL', function () {
    const userSync = newTestUserSync();
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com');
  });

  it('should clear queue after sync', function () {
    const userSync = newTestUserSync();
    userSync.syncUsers();
    expect(triggerPixelStub.callCount).to.equal(0);
  });

  it('should delay firing a pixel by the expected amount', function () {
    const userSync = newTestUserSync();
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    // This implicitly tests cookie and browser support
    userSync.syncUsers(999);
    clock.tick(1000);
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
  });

  it('should register and fires multiple pixel URLs', function () {
    const userSync = newTestUserSync();
    userSync.registerSync('image', 'testBidder', 'http://example.com/1');
    userSync.registerSync('image', 'testBidder', 'http://example.com/2');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('http://example.com/');
    expect(triggerPixelStub.getCall(1)).to.not.be.null;
    expect(triggerPixelStub.getCall(1).args[0]).to.exist.and.to.include('http://example.com/');
    expect(triggerPixelStub.getCall(2)).to.be.null;
  });

  it('should not register pixel URL since it is not supported', function () {
    const userSync = newTestUserSync({filterSettings: {
      image: {
        bidders: '*',
        filter: 'exclude'
      }
    }});
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.be.null;
  });

  it('should register and load an iframe', function () {
    const userSync = newTestUserSync({filterSettings: {
      iframe: {
        bidders: '*',
        filter: 'include'
      }
    }});
    userSync.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync.syncUsers();
    expect(insertUserSyncIframeStub.getCall(0).args[0]).to.equal('http://example.com/iframe');
  });

  it('should only trigger syncs once per page per bidder', function () {
    const userSync = newTestUserSync({ pixelEnabled: true });
    userSync.registerSync('image', 'testBidder', 'http://example.com/1');
    userSync.syncUsers();
    userSync.registerSync('image', 'testBidder', 'http://example.com/2');
    userSync.registerSync('image', 'testBidder2', 'http://example.com/3');
    userSync.syncUsers();
    expect(triggerPixelStub.callCount).to.equal(2);
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(triggerPixelStub.getCall(1)).to.not.be.null;
    expect(triggerPixelStub.getCall(1).args[0]).to.exist.and.to.equal('http://example.com/3');
  });

  it('should not fire syncs if cookies are not supported', function () {
    const userSync = newTestUserSync({ pixelEnabled: true }, true);
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.be.null;
  });

  it('should prevent registering invalid type', function () {
    const userSync = newTestUserSync();
    userSync.registerSync('invalid', 'testBidder', 'http://example.com');
    expect(logWarnStub.getCall(0).args[0]).to.exist;
  });

  it('should expose the syncUsers method for the publisher to manually trigger syncs', function () {
    // triggerUserSyncs should do nothing by default
    let userSync = newTestUserSync();
    let syncUsersSpy = sinon.spy(userSync, 'syncUsers');
    userSync.triggerUserSyncs();
    expect(syncUsersSpy.notCalled).to.be.true;
    // triggerUserSyncs should trigger syncUsers if enableOverride is on
    userSync = newTestUserSync({ enableOverride: true });
    syncUsersSpy = sinon.spy(userSync, 'syncUsers');
    userSync.triggerUserSyncs();
    expect(syncUsersSpy.called).to.be.true;
  });

  it('should limit the number of syncs per bidder', function () {
    const userSync = newTestUserSync({ syncsPerBidder: 2 });
    userSync.registerSync('image', 'testBidder', 'http://example.com/1');
    userSync.registerSync('image', 'testBidder', 'http://example.com/2');
    userSync.registerSync('image', 'testBidder', 'http://example.com/3');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.match(/^http:\/\/example\.com\/[1|2]/);
    expect(triggerPixelStub.getCall(1)).to.not.be.null;
    expect(triggerPixelStub.getCall(1).args[0]).to.exist.and.to.match(/^http:\/\/example\.com\/[1|2]/);
    expect(triggerPixelStub.getCall(2)).to.be.null;
  });

  it('should not limit the number of syncs per bidder when set to 0', function () {
    const userSync = newTestUserSync({ syncsPerBidder: 0 });
    userSync.registerSync('image', 'testBidder', 'http://example.com/1');
    userSync.registerSync('image', 'testBidder', 'http://example.com/2');
    userSync.registerSync('image', 'testBidder', 'http://example.com/3');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.match(/^http:\/\/example\.com\/[1|2|3]/);
    expect(triggerPixelStub.getCall(1)).to.not.be.null;
    expect(triggerPixelStub.getCall(1).args[0]).to.exist.and.to.match(/^http:\/\/example\.com\/[1|2|3]/);
    expect(triggerPixelStub.getCall(2)).to.not.be.null;
    expect(triggerPixelStub.getCall(2).args[0]).to.exist.and.to.match(/^http:\/\/example\.com\/[1|2|3]/);
  });

  it('should balance out bidder requests', function () {
    const userSync = newTestUserSync();
    userSync.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync.registerSync('image', 'atestBidder', 'http://example.com/3');
    userSync.registerSync('image', 'btestBidder', 'http://example.com/2');
    userSync.syncUsers();
    // The stubbed shuffle function should just reverse the order
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/2');
    expect(triggerPixelStub.getCall(1)).to.not.be.null;
    expect(triggerPixelStub.getCall(1).args[0]).to.exist.and.to.equal('http://example.com/3');
    expect(triggerPixelStub.getCall(2)).to.not.be.null;
    expect(triggerPixelStub.getCall(2).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(triggerPixelStub.getCall(3)).to.be.null;
  });

  it('should disable user sync', function () {
    const userSync = newTestUserSync({ syncEnabled: false });
    userSync.registerSync('pixel', 'testBidder', 'http://example.com');
    expect(logWarnStub.getCall(0).args[0]).to.exist;
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.be.null;
  });

  it('should only sync enabled bidders', function () {
    const userSync = newTestUserSync({filterSettings: {
      image: {
        bidders: ['testBidderA'],
        filter: 'include'
      }
    }});
    userSync.registerSync('image', 'testBidderA', 'http://example.com/1');
    userSync.registerSync('image', 'testBidderB', 'http://example.com/2');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.include('http://example.com/');
    expect(triggerPixelStub.getCall(1)).to.be.null;
  });

  it('should register config set after instantiation', function () {
    // start with userSync off
    const userSync = newTestUserSync({ syncEnabled: false });
    // turn it on with setConfig()
    config.setConfig({ userSync: { syncEnabled: true } });
    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com');
  });

  it('should register both image and iframe pixels with filterSettings.all config', function () {
    const userSync = newTestUserSync({
      filterSettings: {
        all: {
          bidders: ['atestBidder', 'testBidder'],
          filter: 'include'
        },
      }
    });
    userSync.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(insertUserSyncIframeStub.getCall(0)).to.not.be.null;
    expect(insertUserSyncIframeStub.getCall(0).args[0]).to.equal('http://example.com/iframe');
  });

  it('should register iframe and not register image pixels based on filterSettings config', function () {
    const userSync = newTestUserSync({
      filterSettings: {
        image: {
          bidders: '*',
          filter: 'exclude'
        },
        iframe: {
          bidders: ['testBidder']
        }
      }
    });
    userSync.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.be.null;
    expect(insertUserSyncIframeStub.getCall(0)).to.not.be.null;
    expect(insertUserSyncIframeStub.getCall(0).args[0]).to.equal('http://example.com/iframe');
  });

  it('should throw a warning and default to basic resgistration rules when filterSettings config is invalid', function () {
    // invalid config - passed invalid filter option
    const userSync1 = newTestUserSync({
      filterSettings: {
        iframe: {
          bidders: ['testBidder'],
          filter: 'includes'
        }
      }
    });
    userSync1.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync1.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync1.syncUsers();
    expect(logWarnStub.getCall(0).args[0]).to.exist;
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(insertUserSyncIframeStub.getCall(0)).to.be.null;

    // invalid config - bidders is not an array of strings
    const userSync2 = newTestUserSync({
      filterSettings: {
        iframe: {
          bidders: ['testBidder', 0],
          filter: 'include'
        }
      }
    });
    userSync2.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync2.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync2.syncUsers();
    expect(logWarnStub.getCall(1).args[0]).to.exist;
    expect(triggerPixelStub.getCall(1)).to.not.be.null;
    expect(triggerPixelStub.getCall(1).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(insertUserSyncIframeStub.getCall(0)).to.be.null;

    // invalid config - bidders list includes wildcard
    const userSync3 = newTestUserSync({
      filterSettings: {
        iframe: {
          bidders: ['testBidder', '*'],
          filter: 'include'
        }
      }
    });
    userSync3.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync3.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync3.syncUsers();
    expect(logWarnStub.getCall(2).args[0]).to.exist;
    expect(triggerPixelStub.getCall(2)).to.not.be.null;
    expect(triggerPixelStub.getCall(2).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(insertUserSyncIframeStub.getCall(0)).to.be.null;

    // invalid config - incorrect wildcard
    const userSync4 = newTestUserSync({
      filterSettings: {
        iframe: {
          bidders: '***',
          filter: 'include'
        }
      }
    });
    userSync4.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync4.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync4.syncUsers();
    expect(logWarnStub.getCall(3).args[0]).to.exist;
    expect(triggerPixelStub.getCall(3)).to.not.be.null;
    expect(triggerPixelStub.getCall(3).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(insertUserSyncIframeStub.getCall(0)).to.be.null;

    // invalid config - missing bidders field
    const userSync5 = newTestUserSync({
      filterSettings: {
        iframe: {
          filter: 'include'
        }
      }
    });
    userSync5.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync5.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync5.syncUsers();
    expect(logWarnStub.getCall(4).args[0]).to.exist;
    expect(triggerPixelStub.getCall(4)).to.not.be.null;
    expect(triggerPixelStub.getCall(4).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(insertUserSyncIframeStub.getCall(0)).to.be.null;
  });

  it('should overwrite logic of deprecated fields when filterSettings is defined', function () {
    const userSync = newTestUserSync({
      pixelsEnabled: false,
      iframeEnabled: true,
      enabledBidders: ['ctestBidder'],
      filterSettings: {
        image: {
          bidders: '*',
          filter: 'include'
        },
        iframe: {
          bidders: ['testBidder'],
          filter: 'exclude'
        }
      }
    });
    userSync.registerSync('image', 'atestBidder', 'http://example.com/1');
    userSync.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync.syncUsers();
    expect(logWarnStub.getCall(0).args[0]).to.exist;
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com/1');
    expect(insertUserSyncIframeStub.getCall(0)).to.be.null;
  });

  it('should still allow default image syncs if setConfig only defined iframe', function () {
    const userSync = newUserSync({
      config: config.getConfig('userSync'),
      browserSupportsCookies: true
    });

    config.setConfig({
      userSync: {
        filterSettings: {
          iframe: {
            bidders: ['bidderXYZ'],
            filter: 'include'
          }
        }
      }
    });

    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.registerSync('iframe', 'bidderXYZ', 'http://example.com/iframe');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com');
    expect(insertUserSyncIframeStub.getCall(0).args[0]).to.equal('http://example.com/iframe');
  });

  it('should not fire image pixel for a bidder if iframe pixel is fired for same bidder', function() {
    const userSync = newUserSync({
      config: config.getConfig('userSync'),
      browserSupportsCookies: true
    });

    config.setConfig({
      userSync: {
        filterSettings: {
          iframe: {
            bidders: ['bidderXYZ'],
            filter: 'include'
          }
        }
      }
    });
    // we are registering iframe and image sync for bidderXYZ and we expect image sync not to execute.
    userSync.registerSync('image', 'testBidder', 'http://testBidder.example.com/image');
    userSync.registerSync('iframe', 'bidderXYZ', 'http://bidderXYZ.example.com/iframe');
    userSync.registerSync('image', 'bidderXYZ', 'http://bidderXYZ.example.com/image');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://testBidder.example.com/image');
    expect(triggerPixelStub.callCount).to.equal(1); // should not be 2 for 2 registered image syncs
    expect(insertUserSyncIframeStub.getCall(0).args[0]).to.equal('http://bidderXYZ.example.com/iframe');
  });

  it('should override default image syncs if setConfig used image filter', function () {
    const userSync = newUserSync({
      config: config.getConfig('userSync'),
      browserSupportsCookies: true
    });

    config.setConfig({
      userSync: {
        filterSettings: {
          image: {
            bidders: ['bidderXYZ'],
            filter: 'exclude'
          }
        }
      }
    });

    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.registerSync('image', 'bidderXYZ', 'http://example.com/image-blocked');
    userSync.syncUsers();
    expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com');
    expect(triggerPixelStub.getCall(1)).to.be.null;
  });

  it('should override default image syncs if setConfig used all filter', function() {
    const userSync = newUserSync({
      config: config.getConfig('userSync'),
      browserSupportsCookies: true
    });

    config.setConfig({
      userSync: {
        filterSettings: {
          all: {
            bidders: ['bidderXYZ'],
            filter: 'exclude'
          }
        }
      }
    });

    userSync.registerSync('image', 'testBidder', 'http://example.com');
    userSync.registerSync('image', 'bidderXYZ', 'http://example.com/image-blocked');
    userSync.registerSync('iframe', 'testBidder', 'http://example.com/iframe');
    userSync.registerSync('iframe', 'bidderXYZ', 'http://example.com/iframe-blocked');
    userSync.syncUsers();
    // expect(triggerPixelStub.getCall(0)).to.not.be.null;
    expect(triggerPixelStub.getCall(0)).to.be.null;// image sync will not execute as iframe sync has executed for same bidder
    // expect(triggerPixelStub.getCall(0).args[0]).to.exist.and.to.equal('http://example.com');
    expect(triggerPixelStub.getCall(1)).to.be.null;
    expect(insertUserSyncIframeStub.getCall(0).args[0]).to.equal('http://example.com/iframe');
    expect(insertUserSyncIframeStub.getCall(1)).to.be.null;
  });

  describe('publicAPI', function () {
    describe('canBidderRegisterSync', function () {
      describe('with filterSettings', function () {
        it('should return false if filter settings does not allow it', function () {
          const userSync = newUserSync({
            config: {
              filterSettings: {
                image: {
                  bidders: '*',
                  filter: 'include'
                },
                iframe: {
                  bidders: ['testBidder'],
                  filter: 'include'
                }
              }
            }
          });
          expect(userSync.canBidderRegisterSync('iframe', 'otherTestBidder')).to.equal(false);
        });
        it('should return false for iframe if there is no iframe filterSettings', function () {
          const userSync = newUserSync({
            config: {
              syncEnabled: true,
              filterSettings: {
                image: {
                  bidders: '*',
                  filter: 'include'
                }
              },
              syncsPerBidder: 5,
              syncDelay: 3000,
              auctionDelay: 0
            }
          });

          expect(userSync.canBidderRegisterSync('iframe', 'otherTestBidder')).to.equal(false);
        });
        it('should return true if filter settings does allow it', function () {
          const userSync = newUserSync({
            config: {
              filterSettings: {
                image: {
                  bidders: '*',
                  filter: 'include'
                },
                iframe: {
                  bidders: ['testBidder'],
                  filter: 'include'
                }
              }
            }
          });
          expect(userSync.canBidderRegisterSync('iframe', 'testBidder')).to.equal(true);
        });
      });
      describe('almost deprecated - without filterSettings', function () {
        describe('enabledBidders contains testBidder', function () {
          it('should return false if type is iframe and iframeEnabled is false', function () {
            const userSync = newUserSync({
              config: {
                filterSettings: {
                  iframe: {
                    bidders: ['testBidder'],
                    filter: 'exclude'
                  }
                }
              }
            });
            expect(userSync.canBidderRegisterSync('iframe', 'testBidder')).to.equal(false);
          });

          it('should return true if type is iframe and iframeEnabled is true', function () {
            const userSync = newUserSync({
              config: {
                pixelEnabled: true,
                iframeEnabled: true,
                enabledBidders: ['testBidder'],
              }
            });
            expect(userSync.canBidderRegisterSync('iframe', 'testBidder')).to.equal(true);
          });

          it('should return false if type is image and pixelEnabled is false', function () {
            const userSync = newUserSync({
              config: {
                filterSettings: {
                  image: {
                    bidders: ['testBidder'],
                    filter: 'exclude'
                  }
                }
              }
            });
            expect(userSync.canBidderRegisterSync('image', 'testBidder')).to.equal(false);
          });

          it('should return true if type is image and pixelEnabled is true', function () {
            const userSync = newUserSync({
              config: {
                pixelEnabled: true,
                iframeEnabled: true,
                enabledBidders: ['testBidder'],
              }
            });
            expect(userSync.canBidderRegisterSync('image', 'testBidder')).to.equal(true);
          });
        });

        describe('enabledBidders does not container testBidder', function () {
          it('should return false since testBidder is not in enabledBidders', function () {
            const userSync = newUserSync({
              config: {
                filterSettings: {
                  image: {
                    bidders: ['otherTestBidder'],
                    filter: 'include'
                  },
                  iframe: {
                    bidders: ['otherTestBidder'],
                    filter: 'include'
                  }
                }
              }
            });
            expect(userSync.canBidderRegisterSync('iframe', 'testBidder')).to.equal(false);
          });
        });
      });
    });
  });
});
