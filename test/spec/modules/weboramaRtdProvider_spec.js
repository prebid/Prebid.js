import {
  weboramaSubmodule
} from 'modules/weboramaRtdProvider.js';
import {
  server
} from 'test/mocks/xhr.js';
import {
  storage,
  DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY
} from '../../../modules/weboramaRtdProvider.js';

const responseHeader = {
  'Content-Type': 'application/json'
};

describe('weboramaRtdProvider', function() {
  describe('weboramaSubmodule', function() {
    it('successfully instantiates and call contextual api', function() {
      const moduleConfig = {
        params: {
          weboCtxConf: {
            token: 'foo',
            targetURL: 'https://prebid.org',
          }
        }
      };

      expect(weboramaSubmodule.init(moduleConfig)).to.equal(true);
    });

    it('instantiate without contextual token should fail', function() {
      const moduleConfig = {
        params: {
          weboCtxConf: {}
        }
      };
      expect(weboramaSubmodule.init(moduleConfig)).to.equal(false);
    });

    it('instantiate with empty weboUserData conf should return true', function() {
      const moduleConfig = {
        params: {
          weboUserDataConf: {}
        }
      };
      expect(weboramaSubmodule.init(moduleConfig)).to.equal(true);
    });
  });

  describe('Handle Set Targeting', function() {
    let sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      storage.removeDataFromLocalStorage('webo_wam2gam_entry');
    });

    afterEach(function() {
      sandbox.restore();
    });

    describe('Add Contextual Data', function() {
      it('should set gam targeting and send to bidders by default', function() {
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
            }
          }
        };
        const data = {
          webo_ctx: ['foo', 'bar'],
          webo_ds: ['baz'],
        };
        const adUnitsCodes = ['adunit1', 'adunit2'];
        const reqBidsConfigObj = {
          adUnits: [{
            bids: [{
              bidder: 'smartadserver'
            }]
          }]
        };
        const onDoneSpy = sinon.spy();

        expect(weboramaSubmodule.init(moduleConfig)).to.be.true;
        weboramaSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, moduleConfig);

        let request = server.requests[0];

        expect(request.method).to.equal('GET');
        expect(request.url).to.equal('https://ctx.weborama.com/api/profile?token=foo&url=https%3A%2F%2Fprebid.org&');
        expect(request.withCredentials).to.be.false;

        request.respond(200, responseHeader, JSON.stringify(data));

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
          'adunit2': data,
        });

        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('webo_ctx=foo;webo_ctx=bar;webo_ds=baz');
      });

      it('should set gam targeting but not send to bidders with setPrebidTargeting=true/sendToBidders=false', function() {
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
              setPrebidTargeting: true,
              sendToBidders: false,
            }
          }
        };
        const data = {
          webo_ctx: ['foo', 'bar'],
          webo_ds: ['baz'],
        };
        const adUnitsCodes = ['adunit1', 'adunit2'];
        const reqBidsConfigObj = {
          adUnits: [{
            bids: [{
              bidder: 'smartadserver',
              params: {
                target: 'foo=bar'
              }
            }]
          }]
        };
        const onDoneSpy = sinon.spy();

        expect(weboramaSubmodule.init(moduleConfig)).to.be.true;
        weboramaSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, moduleConfig);

        let request = server.requests[0];

        expect(request.method).to.equal('GET');
        expect(request.url).to.equal('https://ctx.weborama.com/api/profile?token=foo&url=https%3A%2F%2Fprebid.org&');
        expect(request.withCredentials).to.be.false;

        request.respond(200, responseHeader, JSON.stringify(data));

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
          'adunit2': data,
        });

        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('foo=bar');
      });

      it('should not set gam targeting with setPrebidTargeting=false but send to bidders', function() {
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
              setPrebidTargeting: false,
            }
          }
        };
        const data = {
          webo_ctx: ['foo', 'bar'],
          webo_ds: ['baz'],
        };
        const adUnitsCodes = ['adunit1', 'adunit2'];
        const reqBidsConfigObj = {
          adUnits: [{
            bids: [{
              bidder: 'smartadserver',
              params: {
                target: 'foo=bar'
              }
            }]
          }]
        }
        const onDoneSpy = sinon.spy();

        expect(weboramaSubmodule.init(moduleConfig)).to.be.true;
        weboramaSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, moduleConfig);

        let request = server.requests[0];

        expect(request.method).to.equal('GET');
        expect(request.url).to.equal('https://ctx.weborama.com/api/profile?token=foo&url=https%3A%2F%2Fprebid.org&');
        expect(request.withCredentials).to.be.false;

        request.respond(200, responseHeader, JSON.stringify(data));

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({});

        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('foo=bar;webo_ctx=foo;webo_ctx=bar;webo_ds=baz');
      });

      it('should use default profile in case of api error', function() {
        const defaultProfile = {
          webo_ctx: ['baz'],
        };
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
              setPrebidTargeting: true,
              defaultProfile: defaultProfile,
            }
          }
        };

        const adUnitsCodes = ['adunit1', 'adunit2'];
        const reqBidsConfigObj = {
          adUnits: [{
            bids: [{
              bidder: 'smartadserver'
            }]
          }]
        };
        const onDoneSpy = sinon.spy();

        expect(weboramaSubmodule.init(moduleConfig)).to.be.true;
        weboramaSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, moduleConfig);

        let request = server.requests[0];

        expect(request.method).to.equal('GET');
        expect(request.url).to.equal('https://ctx.weborama.com/api/profile?token=foo&url=https%3A%2F%2Fprebid.org&');
        expect(request.withCredentials).to.be.false;

        request.respond(500, responseHeader);

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': defaultProfile,
          'adunit2': defaultProfile,
        });

        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('webo_ctx=baz');
      });
    });

    describe('Add WAM2GAM Data', function() {
      it('should set gam targeting from local storage and send to bidders by default', function() {
        const moduleConfig = {
          params: {
            weboUserDataConf: {}
          }
        };
        const data = {
          webo_cs: ['foo', 'bar'],
          webo_audiences: ['baz'],
        };

        const entry = {
          targeting: data,
        };

        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'getDataFromLocalStorage')
          .withArgs(DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY)
          .returns(JSON.stringify(entry));

        const adUnitsCodes = ['adunit1', 'adunit2'];
        const reqBidsConfigObj = {
          adUnits: [{
            bids: [{
              bidder: 'smartadserver'
            }]
          }]
        };
        const onDoneSpy = sinon.spy();

        expect(weboramaSubmodule.init(moduleConfig)).to.be.true;
        weboramaSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, moduleConfig);

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
          'adunit2': data,
        });

        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('webo_cs=foo;webo_cs=bar;webo_audiences=baz');
      });

      it('should set gam targeting but not send to bidders with setPrebidTargeting=true/sendToBidders=false', function() {
        const moduleConfig = {
          params: {
            weboUserDataConf: {
              setPrebidTargeting: true,
              sendToBidders: false
            }
          }
        };
        const data = {
          webo_cs: ['foo', 'bar'],
          webo_audiences: ['baz'],
        };

        const entry = {
          targeting: data,
        };

        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'getDataFromLocalStorage')
          .withArgs(DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY)
          .returns(JSON.stringify(entry));

        const adUnitsCodes = ['adunit1', 'adunit2'];
        const reqBidsConfigObj = {
          adUnits: [{
            bids: [{
              bidder: 'smartadserver',
              params: {
                target: 'foo=bar'
              }
            }]
          }]
        };
        const onDoneSpy = sinon.spy();

        expect(weboramaSubmodule.init(moduleConfig)).to.be.true;
        weboramaSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, moduleConfig);

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
          'adunit2': data,
        });

        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('foo=bar');
      });

      it('should not set gam targeting with setPrebidTargeting=false but send to bidders', function() {
        const moduleConfig = {
          params: {
            weboUserDataConf: {
              setPrebidTargeting: false,
            }
          }
        };
        const data = {
          webo_cs: ['foo', 'bar'],
          webo_audiences: ['baz'],
        };

        const entry = {
          targeting: data,
        };

        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'getDataFromLocalStorage')
          .withArgs(DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY)
          .returns(JSON.stringify(entry));

        const adUnitsCodes = ['adunit1', 'adunit2'];
        const reqBidsConfigObj = {
          adUnits: [{
            bids: [{
              bidder: 'smartadserver',
              params: {
                target: 'foo=bar'
              }
            }]
          }]
        };
        const onDoneSpy = sinon.spy();

        expect(weboramaSubmodule.init(moduleConfig)).to.be.true;
        weboramaSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, moduleConfig);

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({});

        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('foo=bar;webo_cs=foo;webo_cs=bar;webo_audiences=baz');
      });

      it('should use default profile in case of nothing on local storage', function() {
        const defaultProfile = {
          webo_audiences: ['baz']
        };
        const moduleConfig = {
          params: {
            weboUserDataConf: {
              setPrebidTargeting: true,
              defaultProfile: defaultProfile,
            }
          }
        };

        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);

        const adUnitsCodes = ['adunit1', 'adunit2'];
        const reqBidsConfigObj = {
          adUnits: [{
            bids: [{
              bidder: 'smartadserver'
            }]
          }]
        };
        const onDoneSpy = sinon.spy();

        expect(weboramaSubmodule.init(moduleConfig)).to.be.true;
        weboramaSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, moduleConfig);

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': defaultProfile,
          'adunit2': defaultProfile,
        });

        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('webo_audiences=baz');
      });

      it('should use default profile if cant read from local storage', function() {
        const defaultProfile = {
          webo_audiences: ['baz']
        };
        const moduleConfig = {
          params: {
            weboUserDataConf: {
              setPrebidTargeting: true,
              defaultProfile: defaultProfile,
            }
          }
        };

        sandbox.stub(storage, 'localStorageIsEnabled').returns(false);

        const adUnitsCodes = ['adunit1', 'adunit2'];
        const reqBidsConfigObj = {
          adUnits: [{
            bids: [{
              bidder: 'smartadserver'
            }]
          }]
        };
        const onDoneSpy = sinon.spy();

        expect(weboramaSubmodule.init(moduleConfig)).to.be.true;
        weboramaSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, moduleConfig);

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData(adUnitsCodes, moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': defaultProfile,
          'adunit2': defaultProfile,
        });

        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('webo_audiences=baz');
      });
    });
  });
});
