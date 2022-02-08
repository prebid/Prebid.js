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
import {
  config
} from 'src/config.js';
import {
  getGlobal
} from 'src/prebidGlobal.js';
import 'src/prebid.js';

const responseHeader = {
  'Content-Type': 'application/json'
};

describe('weboramaRtdProvider', function () {
  describe('weboramaSubmodule', function () {
    it('successfully instantiates and call contextual api', function () {
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

    it('instantiate without contextual token should fail', function () {
      const moduleConfig = {
        params: {
          weboCtxConf: {}
        }
      };
      expect(weboramaSubmodule.init(moduleConfig)).to.equal(false);
    });

    it('instantiate with empty weboUserData conf should return true', function () {
      const moduleConfig = {
        params: {
          weboUserDataConf: {}
        }
      };
      expect(weboramaSubmodule.init(moduleConfig)).to.equal(true);
    });
  });

  describe('Handle Set Targeting', function () {
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();

      storage.removeDataFromLocalStorage('webo_wam2gam_entry');
    });

    afterEach(function () {
      sandbox.restore();
    });

    describe('Add site-centric data (contextual)', function () {
      it('should set gam targeting and send to bidders by default', function () {
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
              onData: (data, meta) => {
                onDataResponse = {
                  data: data,
                  meta: meta,
                };
              },
            }
          }
        };
        const data = {
          webo_ctx: ['foo', 'bar'],
          webo_ds: ['baz'],
        };
        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          adUnits: [{
            code: adUnitCode,
            bids: [{
              bidder: 'smartadserver'
            }, {
              bidder: 'pubmatic'
            }, {
              bidder: 'appnexus'
            }, {
              bidder: 'rubicon'
            }, {
              bidder: 'other'
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

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
        });

        expect(reqBidsConfigObj.adUnits[0].bids.length).to.equal(5);
        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('webo_ctx=foo;webo_ctx=bar;webo_ds=baz');
        expect(reqBidsConfigObj.adUnits[0].bids[1].params.dctr).to.equal('webo_ctx=foo,bar|webo_ds=baz');
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(data);
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.deep.equal({
          inventory: data
        });
        expect(reqBidsConfigObj.adUnits[0].bids[4].ortb2).to.deep.equal({
          site: {
            ext: {
              data: data
            },
          }
        });
        expect(onDataResponse).to.deep.equal({
          data: data,
          meta: { user: false, source: 'contextual' },
        });
      });

      it('should set gam targeting and send to one specific bidder', function () {
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
              sendToBidders: ['appnexus'],
              onData: (data, meta) => {
                onDataResponse = {
                  data: data,
                  meta: meta,
                };
              },
            }
          }
        };
        const data = {
          webo_ctx: ['foo', 'bar'],
          webo_ds: ['baz'],
        };
        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          adUnits: [{
            code: adUnitCode,
            bids: [{
              bidder: 'smartadserver'
            }, {
              bidder: 'pubmatic'
            }, {
              bidder: 'appnexus'
            }, {
              bidder: 'rubicon'
            }, {
              bidder: 'other'
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

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
        });

        expect(reqBidsConfigObj.adUnits[0].bids.length).to.equal(5);
        expect(reqBidsConfigObj.adUnits[0].bids[0].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[1].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(data);
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[4].ortb2).to.be.undefined;

        expect(onDataResponse).to.deep.equal({
          data: data,
          meta: { user: false, source: 'contextual' },
        });
      });

      it('should set gam targeting but not send to bidders with setPrebidTargeting=true/sendToBidders=false', function () {
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
        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          adUnits: [{
            code: adUnitCode,
            bids: [{
              bidder: 'smartadserver',
              params: {
                target: 'foo=bar'
              }
            }, {
              bidder: 'pubmatic',
              params: {
                dctr: 'foo=bar'
              }
            }, {
              bidder: 'appnexus',
              params: {
                keywords: {
                  foo: ['bar']
                }
              }
            }, {
              bidder: 'rubicon',
              params: {
                inventory: {
                  foo: 'bar',
                },
                visitor: {
                  baz: 'bam',
                }
              }
            }, {
              bidder: 'other',
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

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
        });

        expect(reqBidsConfigObj.adUnits[0].bids.length).to.equal(5);
        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('foo=bar');
        expect(reqBidsConfigObj.adUnits[0].bids[1].params.dctr).to.equal('foo=bar');
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal({
          foo: ['bar']
        });
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.deep.equal({
          inventory: {
            foo: 'bar',
          },
          visitor: {
            baz: 'bam',
          }
        });
        expect(reqBidsConfigObj.adUnits[0].bids[4].ortb2).to.be.undefined;
      });

      it('should set gam targeting but not send to bidders with (submodule override) setPrebidTargeting=true/(global) sendToBidders=false', function () {
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            setPrebidTargeting: false,
            sendToBidders: false,
            onData: (data, meta) => {
              onDataResponse = {
                data: data,
                meta: meta,
              };
            },
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
              setPrebidTargeting: true, // submodule parameter will override module parameter
            }
          }
        };
        const data = {
          webo_ctx: ['foo', 'bar'],
          webo_ds: ['baz'],
        };
        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          adUnits: [{
            code: adUnitCode,
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

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
        });

        expect(reqBidsConfigObj.adUnits[0].bids.length).to.equal(1);

        expect(onDataResponse).to.deep.equal({
          data: data,
          meta: { user: false, source: 'contextual' },
        });
      });

      it('should not set gam targeting with setPrebidTargeting=false but send to bidders', function () {
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
        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          adUnits: [{
            code: adUnitCode,
            bids: [{
              bidder: 'smartadserver',
              params: {
                target: 'foo=bar'
              }
            }, {
              bidder: 'pubmatic',
              params: {
                dctr: 'foo=bar'
              }
            }, {
              bidder: 'appnexus',
              params: {
                keywords: {
                  foo: ['bar']
                }
              }
            }, {
              bidder: 'rubicon',
              params: {
                inventory: {
                  foo: 'bar',
                },
                visitor: {
                  baz: 'bam',
                }
              }
            }, {
              bidder: 'other',
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

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': {},
        });

        expect(reqBidsConfigObj.adUnits[0].bids.length).to.equal(5);
        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('foo=bar;webo_ctx=foo;webo_ctx=bar;webo_ds=baz');
        expect(reqBidsConfigObj.adUnits[0].bids[1].params.dctr).to.equal('foo=bar|webo_ctx=foo,bar|webo_ds=baz');
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal({
          foo: ['bar'],
          webo_ctx: ['foo', 'bar'],
          webo_ds: ['baz'],
        });
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.deep.equal({
          inventory: {
            foo: 'bar',
            webo_ctx: ['foo', 'bar'],
            webo_ds: ['baz'],
          },
          visitor: {
            baz: 'bam',
          }
        });
        expect(reqBidsConfigObj.adUnits[0].bids[4].ortb2).to.deep.equal({
          site: {
            ext: {
              data: data
            },
          }
        });
      });

      it('should use default profile in case of api error', function () {
        const defaultProfile = {
          webo_ctx: ['baz'],
        };
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
              setPrebidTargeting: true,
              defaultProfile: defaultProfile,
              onData: (data, meta) => {
                onDataResponse = {
                  data: data,
                  meta: meta,
                };
              },
            }
          }
        };

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          adUnits: [{
            code: adUnitCode,
            bids: [{
              bidder: 'smartadserver'
            }, {
              bidder: 'pubmatic'
            }, {
              bidder: 'appnexus'
            }, {
              bidder: 'rubicon'
            }, {
              bidder: 'other'
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

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': defaultProfile,
        });

        expect(reqBidsConfigObj.adUnits[0].bids.length).to.equal(5);
        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('webo_ctx=baz');
        expect(reqBidsConfigObj.adUnits[0].bids[1].params.dctr).to.equal('webo_ctx=baz');
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(defaultProfile);
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.deep.equal({
          inventory: defaultProfile
        });
        expect(reqBidsConfigObj.adUnits[0].bids[4].ortb2).to.deep.equal({
          site: {
            ext: {
              data: defaultProfile
            },
          }
        });
        expect(onDataResponse).to.deep.equal({
          data: defaultProfile,
          meta: { user: false, source: 'contextual' },
        });
      });
    });

    describe('Add user-centric data (wam)', function () {
      it('should set gam targeting from local storage and send to bidders by default', function () {
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            weboUserDataConf: {
              accoundId: 12345,
              onData: (data, meta) => {
                onDataResponse = {
                  data: data,
                  meta: meta,
                };
              },
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

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          adUnits: [{
            code: adUnitCode,
            bids: [{
              bidder: 'smartadserver'
            }, {
              bidder: 'pubmatic'
            }, {
              bidder: 'appnexus'
            }, {
              bidder: 'rubicon'
            }, {
              bidder: 'other'
            }]
          }]
        };
        const onDoneSpy = sinon.spy();

        expect(weboramaSubmodule.init(moduleConfig)).to.be.true;
        weboramaSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, moduleConfig);

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
        });

        expect(reqBidsConfigObj.adUnits[0].bids.length).to.equal(5);
        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('webo_cs=foo;webo_cs=bar;webo_audiences=baz');
        expect(reqBidsConfigObj.adUnits[0].bids[1].params.dctr).to.equal('webo_cs=foo,bar|webo_audiences=baz');
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(data);
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.deep.equal({
          visitor: data
        });
        expect(reqBidsConfigObj.adUnits[0].bids[4].ortb2).to.deep.equal({
          user: {
            ext: {
              data: data
            },
          }
        });
        expect(onDataResponse).to.deep.equal({
          data: data,
          meta: { user: true, source: 'wam' },
        });
      });

      it('should set gam targeting from local storage and send to one specific bidder', function () {
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            weboUserDataConf: {
              accountId: 12345,
              sendToBidders: ['appnexus'],
              onData: (data, meta) => {
                onDataResponse = {
                  data: data,
                  meta: meta,
                };
              },
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

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          adUnits: [{
            code: adUnitCode,
            bids: [{
              bidder: 'smartadserver'
            }, {
              bidder: 'pubmatic'
            }, {
              bidder: 'appnexus'
            }, {
              bidder: 'rubicon'
            }, {
              bidder: 'other'
            }]
          }]
        };
        const onDoneSpy = sinon.spy();

        expect(weboramaSubmodule.init(moduleConfig)).to.be.true;
        weboramaSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, moduleConfig);

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
        });

        expect(reqBidsConfigObj.adUnits[0].bids.length).to.equal(5);
        expect(reqBidsConfigObj.adUnits[0].bids[0].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[1].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(data);
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[4].ortb2).to.be.undefined;

        expect(onDataResponse).to.deep.equal({
          data: data,
          meta: { user: true, source: 'wam' },
        });
      });

      it('should set gam targeting but not send to bidders with setPrebidTargeting=true/sendToBidders=false', function () {
        const moduleConfig = {
          params: {
            weboUserDataConf: {
              accoundId: 12345,
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

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          adUnits: [{
            code: adUnitCode,
            bids: [{
              bidder: 'smartadserver',
              params: {
                target: 'foo=bar'
              }
            }, {
              bidder: 'pubmatic',
              params: {
                dctr: 'foo=bar'
              }
            }, {
              bidder: 'appnexus',
              params: {
                keywords: {
                  foo: ['bar']
                }
              }
            }, {
              bidder: 'rubicon',
              params: {
                inventory: {
                  foo: 'bar'
                },
                visitor: {
                  baz: 'bam'
                }
              }
            }, {
              bidder: 'other'
            }]
          }]
        };
        const onDoneSpy = sinon.spy();

        expect(weboramaSubmodule.init(moduleConfig)).to.be.true;
        weboramaSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, moduleConfig);

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
        });

        expect(reqBidsConfigObj.adUnits[0].bids.length).to.equal(5);
        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('foo=bar');
        expect(reqBidsConfigObj.adUnits[0].bids[1].params.dctr).to.equal('foo=bar');
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal({
          foo: ['bar']
        });
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.deep.equal({
          inventory: {
            foo: 'bar'
          },
          visitor: {
            baz: 'bam'
          }
        });
        expect(reqBidsConfigObj.adUnits[0].bids[4].ortb2).to.be.undefined;
      });

      it('should set gam targeting but not send to bidders with (submodule override) setPrebidTargeting=true/(global) sendToBidders=false', function () {
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            setPrebidTargeting: false,
            sendToBidders: false,
            onData: (data, meta) => {
              onDataResponse = {
                data: data,
                meta: meta,
              };
            },
            weboUserDataConf: {
              accoundId: 12345,
              setPrebidTargeting: true, // submodule parameter will override module parameter
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

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          adUnits: [{
            code: adUnitCode,
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

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': data,
        });

        expect(reqBidsConfigObj.adUnits[0].bids.length).to.equal(1);
        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('foo=bar');
        expect(onDataResponse).to.deep.equal({
          data: data,
          meta: { user: true, source: 'wam' },
        });
      });

      it('should not set gam targeting with setPrebidTargeting=false but send to bidders', function () {
        const moduleConfig = {
          params: {
            weboUserDataConf: {
              accoundId: 12345,
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

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          adUnits: [{
            code: adUnitCode,
            bids: [{
              bidder: 'smartadserver',
              params: {
                target: 'foo=bar'
              }
            }, {
              bidder: 'pubmatic',
              params: {
                dctr: 'foo=bar'
              }
            }, {
              bidder: 'appnexus',
              params: {
                keywords: {
                  foo: ['bar']
                }
              }
            }, {
              bidder: 'rubicon',
              params: {
                inventory: {
                  foo: 'bar',
                },
                visitor: {
                  baz: 'bam',
                }
              }
            }, {
              bidder: 'other'
            }]
          }]
        };
        const onDoneSpy = sinon.spy();

        expect(weboramaSubmodule.init(moduleConfig)).to.be.true;
        weboramaSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, moduleConfig);

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': {},
        });

        expect(reqBidsConfigObj.adUnits[0].bids.length).to.equal(5);
        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('foo=bar;webo_cs=foo;webo_cs=bar;webo_audiences=baz');
        expect(reqBidsConfigObj.adUnits[0].bids[1].params.dctr).to.equal('foo=bar|webo_cs=foo,bar|webo_audiences=baz');
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal({
          foo: ['bar'],
          webo_cs: ['foo', 'bar'],
          webo_audiences: ['baz'],
        });
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.deep.equal({
          inventory: {
            foo: 'bar',
          },
          visitor: {
            baz: 'bam',
            webo_cs: ['foo', 'bar'],
            webo_audiences: ['baz'],
          }
        });
        expect(reqBidsConfigObj.adUnits[0].bids[4].ortb2).to.deep.equal({
          user: {
            ext: {
              data: data
            },
          }
        });
      });

      it('should use default profile in case of nothing on local storage', function () {
        const defaultProfile = {
          webo_audiences: ['baz']
        };
        const moduleConfig = {
          params: {
            weboUserDataConf: {
              accoundId: 12345,
              setPrebidTargeting: true,
              defaultProfile: defaultProfile,
            }
          }
        };

        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          adUnits: [{
            code: adUnitCode,
            bids: [{
              bidder: 'smartadserver'
            }, {
              bidder: 'pubmatic'
            }, {
              bidder: 'appnexus'
            }, {
              bidder: 'rubicon'
            }, {
              bidder: 'other'
            }]
          }]
        };
        const onDoneSpy = sinon.spy();

        expect(weboramaSubmodule.init(moduleConfig)).to.be.true;
        weboramaSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, moduleConfig);

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': defaultProfile,
        });

        expect(reqBidsConfigObj.adUnits[0].bids.length).to.equal(5);
        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('webo_audiences=baz');
        expect(reqBidsConfigObj.adUnits[0].bids[1].params.dctr).to.equal('webo_audiences=baz');
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(defaultProfile);
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.deep.equal({
          visitor: defaultProfile
        });
        expect(reqBidsConfigObj.adUnits[0].bids[4].ortb2).to.deep.equal({
          user: {
            ext: {
              data: defaultProfile
            },
          }
        });
      });

      it('should use default profile if cant read from local storage', function () {
        const defaultProfile = {
          webo_audiences: ['baz']
        };
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            weboUserDataConf: {
              accoundId: 12345,
              setPrebidTargeting: true,
              defaultProfile: defaultProfile,
              onData: (data, meta) => {
                onDataResponse = {
                  data: data,
                  meta: meta,
                };
              },
            }
          }
        };

        sandbox.stub(storage, 'localStorageIsEnabled').returns(false);

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          adUnits: [{
            code: adUnitCode,
            bids: [{
              bidder: 'smartadserver'
            }, {
              bidder: 'pubmatic'
            }, {
              bidder: 'appnexus'
            }, {
              bidder: 'rubicon'
            }, {
              bidder: 'other'
            }]
          }]
        };
        const onDoneSpy = sinon.spy();

        expect(weboramaSubmodule.init(moduleConfig)).to.be.true;
        weboramaSubmodule.getBidRequestData(reqBidsConfigObj, onDoneSpy, moduleConfig);

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': defaultProfile,
        });

        expect(reqBidsConfigObj.adUnits[0].bids.length).to.equal(5);
        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('webo_audiences=baz');
        expect(reqBidsConfigObj.adUnits[0].bids[1].params.dctr).to.equal('webo_audiences=baz');
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(defaultProfile);
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.deep.equal({
          visitor: defaultProfile
        });
        expect(reqBidsConfigObj.adUnits[0].bids[4].ortb2).to.deep.equal({
          user: {
            ext: {
              data: defaultProfile
            },
          }
        });
        expect(onDataResponse).to.deep.equal({
          data: defaultProfile,
          meta: { user: true, source: 'wam' },
        });
      });
    });
  });
});
