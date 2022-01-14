import {
  VideojsProvider,
  adStateFactory,
  timeStateFactory,
  callbackStorageFactory
} from 'modules/videojsVideoProvider';

function videojsMock(overrides) {
    const players = {}
    const vjs =  function(id){
        if(!players[id])
            players[id] = {
                controls: function() {},
                getViewable: function () {},
                getPercentViewable: function () {},
                getMute: function () {},
                volume: function () {},
                getConfig: function () {},
                videoHeight: function () {},
                videoWidth: function () {},
                getFullscreen: function () {},
                getPlaylistItem: function () {},
                playAd: function () {},
                on: function () {},
                off: function () {},
                remove: function () {},
                ...overrides
            }
        return players[id]
    };
    vjs.players = players
    vjs.version = '7.17.0';
    return vjs;
}

describe('videojsProvider', function () {
  describe('init', function () {
    let config;
    let adState;
    let timeState;
    let callbackStorage;
    let utilsMock;

    beforeEach(() => {
      config = {};
    //   adState = adStateFactory();
    //   timeState = timeStateFactory();
    //   callbackStorage = callbackStorageFactory();
      utilsMock = null;
    });

    // it('should trigger failure when jwplayer is missing', function () {
    //   const provider = VideojsProvider(config, null, adState, timeState, callbackStorage, utilsMock);
    //   const setupFailed = sinon.spy();
    //   provider.onEvents([SETUP_FAILED], setupFailed);
    //   provider.init();
    //   expect(setupFailed.calledOnce).to.be.true;
    //   const payload = setupFailed.args[0][1];
    //   expect(payload.errorCode).to.be.equal(-1);
    // });

  //   it('should trigger failure when jwplayer version is under min supported version', function () {
  //     let jwplayerMock = () => {};
  //     jwplayerMock.version = '8.20.0';
  //     const provider = VideojsProvider(config, jwplayerMock, adState, timeState, callbackStorage, utilsMock);
  //     const setupFailed = sinon.spy();
  //     provider.onEvents([SETUP_FAILED], setupFailed);
  //     provider.init();
  //     expect(setupFailed.calledOnce).to.be.true;
  //     const payload = setupFailed.args[0][1];
  //     expect(payload.errorCode).to.be.equal(-2);
  //   });

    it('should instantiate the player when uninstantied', function () {
      config.playerConfig = {};
      config.divId = 'test-div'
      const videojs = videojsMock();
      const provider = VideojsProvider(config, videojs, adState, timeState, callbackStorage, utilsMock);
      provider.init();
      expect(videojs.players['test-div']).to.be.an('object')
    });

  //   it('should trigger setup complete when player is already instantied', function () {
  //     const player = getPlayerMock();
  //     player.getState = () => 'idle';
  //     const provider = VideojsProvider(config, makePlayerFactoryMock(player), adState, timeState, callbackStorage, utilsMock);
  //     const setupComplete = sinon.spy();
  //     provider.onEvents([SETUP_COMPLETE], setupComplete);
  //     provider.init();
  //     expect(setupComplete.calledOnce).to.be.true;
  //   });

    it('should not reinstantiate player', function () {
        config.playerConfig = {};
        config.divId = 'test-div'
        const videojs = videojsMock();
        const player = videojs('test-div')
        const provider = VideojsProvider(config, videojs, adState, timeState, callbackStorage, utilsMock);
        provider.init();
        expect(videojs.players['test-div']).to.be.equal(player)
    });

});

  describe('getId', function () {
    it('should return configured div id', function () {
      const provider = VideojsProvider({ divId: 'test_id' });
      expect(provider.getId()).to.be.equal('test_id');
    });
  });
});
