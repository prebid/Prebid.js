import {
  weboramaSubmodule
} from 'modules/weboramaRtdProvider.js';
import {
  server
} from 'test/mocks/xhr.js';
import {
  storage,
  DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY,
  DEFAULT_LOCAL_STORAGE_LITE_PROFILE_KEY
} from '../../../modules/weboramaRtdProvider.js';

import 'src/prebid.js';

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

    it('instantiate with empty sfbxLiteData should return true', function() {
      const moduleConfig = {
        params: {
          sfbxLiteDataConf: {},
        }
      };
      expect(weboramaSubmodule.init(moduleConfig)).to.equal(true);
    });

    describe('webo user data should check gdpr consent', function() {
      it('should initialize if gdpr does not applies', function() {
        const moduleConfig = {
          params: {
            weboUserDataConf: {}
          }
        };
        const userConsent = {
          gdpr: {
            gdprApplies: false,
          },
        }
        expect(weboramaSubmodule.init(moduleConfig, userConsent)).to.equal(true);
      });
      it('should initialize if gdpr applies and consent is ok', function() {
        const moduleConfig = {
          params: {
            weboUserDataConf: {}
          }
        };
        const userConsent = {
          gdpr: {
            gdprApplies: true,
            vendorData: {
              purpose: {
                consents: {
                  1: true,
                  3: true,
                  4: true,
                  5: true,
                  6: true,
                  9: true,
                },
              },
              specialFeatureOptins: {
                1: true,
              },
              vendor: {
                consents: {
                  284: true,
                },
              }
            },
          },
        }
        expect(weboramaSubmodule.init(moduleConfig, userConsent)).to.equal(true);
      });
      it('should NOT initialize if gdpr applies and consent is nok: miss consent vendor id', function() {
        const moduleConfig = {
          params: {
            weboUserDataConf: {}
          }
        };
        const userConsent = {
          gdpr: {
            gdprApplies: true,
            vendorData: {
              purpose: {
                consents: {
                  1: true,
                  3: true,
                  4: true,
                },
              },
              specialFeatureOptins: {},
              vendor: {
                consents: {
                  284: false,
                },
              }
            },
          },
        }
        expect(weboramaSubmodule.init(moduleConfig, userConsent)).to.equal(false);
      });
      it('should NOT initialize if gdpr applies and consent is nok: miss one purpose id', function() {
        const moduleConfig = {
          params: {
            weboUserDataConf: {}
          }
        };
        const userConsent = {
          gdpr: {
            gdprApplies: true,
            vendorData: {
              purpose: {
                consents: {
                  1: false,
                  3: true,
                  4: true,
                },
              },
              specialFeatureOptins: {},
              vendor: {
                consents: {
                  284: true,
                },
              }
            },
          },
        }
        expect(weboramaSubmodule.init(moduleConfig, userConsent)).to.equal(false);
      });
    });
  });

  describe('Handle Set Targeting and Bid Request', function() {
    let sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      storage.removeDataFromLocalStorage(DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY);

      storage.removeDataFromLocalStorage(DEFAULT_LOCAL_STORAGE_LITE_PROFILE_KEY);
    });

    afterEach(function() {
      sandbox.restore();
    });

    describe('Add site-centric data (contextual)', function() {
      it('should set gam targeting and send to bidders by default', function() {
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
          ortb2Fragments: {
            global: {},
            bidder: {}
          },
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
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            site: {
              ext: {
                data: data
              },
            }
          });
        })
        expect(onDataResponse).to.deep.equal({
          data: data,
          meta: {
            user: false,
            source: 'contextual',
            isDefault: false,
          },
        });
      });

      it('should use asset id when available and set gam targeting and send to bidders by default', function() {
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              assetID: 'datasource:docId',
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
          webo_vctx: ['foo', 'bar'],
        };
        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {}
          },
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
        expect(request.url).to.equal('https://ctx.weborama.com/api/document-profile?token=foo&assetId=datasource%3AdocId&url=https%3A%2F%2Fprebid.org&');
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
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            site: {
              ext: {
                data: data
              },
            }
          });
        })
        expect(onDataResponse).to.deep.equal({
          data: data,
          meta: {
            user: false,
            source: 'contextual',
            isDefault: false,
          },
        });
      });

      it('should use asset id as callback when available and set gam targeting and send to bidders by default', function() {
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              assetID: () => 'datasource:docId',
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
          webo_vctx: ['foo', 'bar'],
        };
        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {}
          },
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
        expect(request.url).to.equal('https://ctx.weborama.com/api/document-profile?token=foo&assetId=datasource%3AdocId&url=https%3A%2F%2Fprebid.org&');
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
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            site: {
              ext: {
                data: data
              },
            }
          });
        })
        expect(onDataResponse).to.deep.equal({
          data: data,
          meta: {
            user: false,
            source: 'contextual',
            isDefault: false,
          },
        });
      });

      it('should handle exception from asset id callback', function() {
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              assetID: () => {
                throw new Error('ops');
              },
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
        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {}
          },
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

        expect(server.requests.length).to.equal(0);

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode], moduleConfig);

        expect(targeting).to.deep.equal({});
      });

      it('should handle case when callback return falsy value', function() {
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              assetID: () => '',
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

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {}
          },
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

        expect(server.requests.length).to.equal(0);

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode], moduleConfig);

        expect(targeting).to.deep.equal({});
      });

      describe('should set gam targeting and send to one specific bidder and multiple adunits', function() {
        const testcases = {
          'single string': 'appnexus',
          'array with one entry': ['appnexus'],
          'map with one entry': {
            'appnexus': true
          },
          'map complete': {
            'smartadserver': false,
            'pubmatic': false,
            'appnexus': true,
            'rubicon': false,
            'other': false,
          },
          'callback': (bid) => {
            return bid.bidder == 'appnexus'
          },
        };

        Object.keys(testcases).forEach(label => {
          const sendToBidders = testcases[label];
          it(`check sendToBidders as ${label}`, function() {
            let onDataResponse = {};
            const moduleConfig = {
              params: {
                weboCtxConf: {
                  token: 'foo',
                  targetURL: 'https://prebid.org',
                  sendToBidders: sendToBidders,
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
            const adUnitCode1 = 'adunit1';
            const adUnitCode2 = 'adunit2';

            const reqBidsConfigObj = {
              ortb2Fragments: {
                global: {},
                bidder: {},
              },
              adUnits: [{
                code: adUnitCode1,
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
              }, {
                code: adUnitCode2,
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

            const targeting = weboramaSubmodule.getTargetingData([adUnitCode1, adUnitCode2], moduleConfig);

            expect(targeting).to.deep.equal({
              'adunit1': data,
              'adunit2': data,
            });

            reqBidsConfigObj.adUnits.forEach(adUnit => {
              expect(adUnit.bids.length).to.equal(5);
              expect(adUnit.bids[0].params).to.be.undefined;
              expect(adUnit.bids[1].params).to.be.undefined;
              expect(adUnit.bids[2].params.keywords).to.deep.equal(data);
              expect(adUnit.bids[3].params).to.be.undefined;
            });
            ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
              if (v == 'appnexus') {
                expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
                  site: {
                    ext: {
                      data: data
                    },
                  }
                });

                return;
              }

              expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.be.undefined;
            })
            expect(onDataResponse).to.deep.equal({
              data: data,
              meta: {
                user: false,
                source: 'contextual',
                isDefault: false,
              },
            });
          });
        });
      });

      describe('should set gam targeting and send to one specific bidder and one adunit', function() {
        const testcases = {
          'map with one entry': {
            'appnexus': ['adunit1']
          },
          'callback': (bid, adUnitCode) => {
            return bid.bidder == 'appnexus' && adUnitCode == 'adunit1';
          },
        };

        Object.keys(testcases).forEach(label => {
          const sendToBidders = testcases[label];
          it(`check sendToBidders as ${label}`, function() {
            let onDataResponse = {};
            const moduleConfig = {
              params: {
                weboCtxConf: {
                  token: 'foo',
                  targetURL: 'https://prebid.org',
                  sendToBidders: sendToBidders,
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
            const adUnitCode1 = 'adunit1';
            const adUnitCode2 = 'adunit2';

            const reqBidsConfigObj = {
              ortb2Fragments: {
                global: {},
                bidder: {},
              },
              adUnits: [{
                code: adUnitCode1,
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
              }, {
                code: adUnitCode2,
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

            const targeting = weboramaSubmodule.getTargetingData([adUnitCode1, adUnitCode2], moduleConfig);

            expect(targeting).to.deep.equal({
              'adunit1': data,
              'adunit2': data,
            });

            reqBidsConfigObj.adUnits.forEach(adUnit => {
              expect(adUnit.bids.length).to.equal(5);
              expect(adUnit.bids[0].params).to.be.undefined;
              expect(adUnit.bids[1].params).to.be.undefined;
              expect(adUnit.bids[3].params).to.be.undefined;
              expect(adUnit.bids[4].ortb2).to.be.undefined;
            });

            expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(data);
            expect(reqBidsConfigObj.adUnits[1].bids[2].params).to.be.undefined;

            expect(onDataResponse).to.deep.equal({
              data: data,
              meta: {
                user: false,
                source: 'contextual',
                isDefault: false,
              },
            });
          });
        });
      });

      describe('should set gam targeting for multiple adunits but not send to bidders with setPrebidTargeting=<true>/sendToBidders=false', function() {
        const testcases = {
          'boolean': true,
          'array with both units': ['adunit1', 'adunit2'],
          'callback': () => {
            return true;
          },
        };

        Object.keys(testcases).forEach(label => {
          const setPrebidTargeting = testcases[label];
          it(`check setPrebidTargeting as ${label}`, function() {
            const moduleConfig = {
              params: {
                weboCtxConf: {
                  token: 'foo',
                  targetURL: 'https://prebid.org',
                  setPrebidTargeting: setPrebidTargeting,
                  sendToBidders: false,
                }
              }
            };
            const data = {
              webo_ctx: ['foo', 'bar'],
              webo_ds: ['baz'],
            };
            const adUnitCode1 = 'adunit1';
            const adUnitCode2 = 'adunit2';
            const reqBidsConfigObj = {
              ortb2Fragments: {
                global: {},
                bidder: {},
              },
              adUnits: [{
                code: adUnitCode1,
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
              }, {
                code: adUnitCode2,
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

            const targeting = weboramaSubmodule.getTargetingData([adUnitCode1, adUnitCode2], moduleConfig);

            expect(targeting).to.deep.equal({
              'adunit1': data,
              'adunit2': data,
            });

            reqBidsConfigObj.adUnits.forEach(adUnit => {
              expect(adUnit.bids.length).to.equal(5);
              expect(adUnit.bids[0].params.target).to.equal('foo=bar');
              expect(adUnit.bids[1].params.dctr).to.equal('foo=bar');
              expect(adUnit.bids[2].params.keywords).to.deep.equal({
                foo: ['bar']
              });
              expect(adUnit.bids[3].params).to.deep.equal({
                inventory: {
                  foo: 'bar',
                },
                visitor: {
                  baz: 'bam',
                }
              });
            });
            ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
              expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.be.undefined;
            })
          });
        });
      });

      describe('should set gam targeting for one adunit but not send to bidders with setPrebidTargeting=<true>/sendToBidders=false', function() {
        const testcases = {
          'array with one unit': ['adunit1'],
          'callback': (adUnitCode) => {
            return adUnitCode == 'adunit1';
          },
        };

        Object.keys(testcases).forEach(label => {
          const setPrebidTargeting = testcases[label];
          it(`check setPrebidTargeting as ${label}`, function() {
            const moduleConfig = {
              params: {
                weboCtxConf: {
                  token: 'foo',
                  targetURL: 'https://prebid.org',
                  setPrebidTargeting: setPrebidTargeting,
                  sendToBidders: false,
                }
              }
            };
            const data = {
              webo_ctx: ['foo', 'bar'],
              webo_ds: ['baz'],
            };
            const adUnitCode1 = 'adunit1';
            const adUnitCode2 = 'adunit2';
            const reqBidsConfigObj = {
              ortb2Fragments: {
                global: {},
                bidder: {},
              },
              adUnits: [{
                code: adUnitCode1,
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
              }, {
                code: adUnitCode2,
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

            const targeting = weboramaSubmodule.getTargetingData([adUnitCode1, adUnitCode2], moduleConfig);

            expect(targeting).to.deep.equal({
              'adunit1': data,
              'adunit2': {},
            });

            reqBidsConfigObj.adUnits.forEach(adUnit => {
              expect(adUnit.bids.length).to.equal(5);
              expect(adUnit.bids[0].params.target).to.equal('foo=bar');
              expect(adUnit.bids[1].params.dctr).to.equal('foo=bar');
              expect(adUnit.bids[2].params.keywords).to.deep.equal({
                foo: ['bar']
              });
              expect(adUnit.bids[3].params).to.deep.equal({
                inventory: {
                  foo: 'bar',
                },
                visitor: {
                  baz: 'bam',
                }
              });
            });
            ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
              expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.be.undefined;
            })
          });
        });
      });

      it('should set gam targeting but not send to bidders with (submodule override) setPrebidTargeting=true/(global) sendToBidders=false', function() {
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
          ortb2Fragments: {
            global: {}
          },
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
          meta: {
            user: false,
            source: 'contextual',
            isDefault: false,
          },
        });
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
        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {}
          },
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
        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('foo=bar');
        expect(reqBidsConfigObj.adUnits[0].bids[1].params.dctr).to.equal('foo=bar');
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal({
          foo: ['bar'],
          webo_ctx: ['foo', 'bar'],
          webo_ds: ['baz'],
        });
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.deep.equal({
          inventory: {
            foo: 'bar',
          },
          visitor: {
            baz: 'bam',
          }
        });
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            site: {
              ext: {
                data: data
              },
            }
          });
        })
      });

      it('should use default profile in case of api error', function() {
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
          ortb2Fragments: {
            global: {},
            bidder: {}
          },
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
        expect(reqBidsConfigObj.adUnits[0].bids[0].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[1].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(defaultProfile);
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.be.undefined;
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            site: {
              ext: {
                data: defaultProfile
              },
            }
          });
        })
        expect(onDataResponse).to.deep.equal({
          data: defaultProfile,
          meta: {
            user: false,
            source: 'contextual',
            isDefault: true,
          },
        });
      });

      it('should be possible update profile from callbacks for a given bidder/adUnitCode', function() {
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            weboCtxConf: {
              token: 'foo',
              targetURL: 'https://prebid.org',
              setPrebidTargeting: (adUnitCode, data, meta) => {
                if (adUnitCode == 'adunit1') {
                  data['webo_foo'] = ['bar'];
                }
                return true;
              },
              sendToBidders: (bid, adUnitCode, data, meta) => {
                if (bid.bidder == 'appnexus' && adUnitCode == 'adunit1') {
                  data['webo_bar'] = ['baz'];
                }
                return true;
              },
              baseURLProfileAPI: 'ctx.test.weborama.com',
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
        const adUnitCode1 = 'adunit1';
        const adUnitCode2 = 'adunit2';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {},
          },
          adUnits: [{
            code: adUnitCode1,
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
          }, {
            code: adUnitCode2,
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
        expect(request.url).to.equal('https://ctx.test.weborama.com/api/profile?token=foo&url=https%3A%2F%2Fprebid.org&');
        expect(request.withCredentials).to.be.false;

        request.respond(200, responseHeader, JSON.stringify(data));

        expect(onDoneSpy.calledOnce).to.be.true;

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode1, adUnitCode2], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': {
            webo_ctx: ['foo', 'bar'],
            webo_ds: ['baz'],
            webo_foo: ['bar'],
          },
          'adunit2': data,
        });

        reqBidsConfigObj.adUnits.forEach(adUnit => {
          expect(adUnit.bids.length).to.equal(5);
          expect(adUnit.bids[0].params).to.be.undefined;
          expect(adUnit.bids[1].params).to.be.undefined;
          expect(adUnit.bids[3].params).to.be.undefined;
        });
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          if (v == 'appnexus') {
            expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
              site: {
                ext: {
                  data: {
                    webo_ctx: ['foo', 'bar'],
                    webo_ds: ['baz'],
                    webo_bar: ['baz'],
                  }
                },
              }
            });

            return
          }

          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            site: {
              ext: {
                data: data
              },
            }
          });
        })
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal({
          webo_ctx: ['foo', 'bar'],
          webo_ds: ['baz'],
          webo_bar: ['baz'],
        });
        expect(reqBidsConfigObj.adUnits[1].bids[2].params.keywords).to.deep.equal(data);

        expect(onDataResponse).to.deep.equal({
          data: data,
          meta: {
            user: false,
            source: 'contextual',
            isDefault: false,
          },
        });
      });
    });

    describe('Add user-centric data (wam)', function() {
      it('should set gam targeting from local storage and send to bidders by default', function() {
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

        sandbox.stub(storage, 'hasLocalStorage').returns(true);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'getDataFromLocalStorage')
          .withArgs(DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY)
          .returns(JSON.stringify(entry));

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {},
          },
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
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            user: {
              ext: {
                data: data
              },
            }
          });
        })
        expect(onDataResponse).to.deep.equal({
          data: data,
          meta: {
            user: true,
            source: 'wam',
            isDefault: false,
          },
        });
      });

      describe('should set gam targeting from local storage and send to one specific bidder and multiple adunits', function() {
        const testcases = {
          'single string': 'appnexus',
          'array with one entry': ['appnexus'],
          'map with one entry': {
            'appnexus': true
          },
          'map complete': {
            'smartadserver': false,
            'pubmatic': false,
            'appnexus': true,
            'rubicon': false,
            'other': false,
          },
          'callback': (bid) => {
            return bid.bidder == 'appnexus'
          },
        };

        Object.keys(testcases).forEach(label => {
          const sendToBidders = testcases[label];
          it(`check sendToBidders as ${label}`, function() {
            let onDataResponse = {};
            const moduleConfig = {
              params: {
                weboUserDataConf: {
                  accountId: 12345,
                  sendToBidders: sendToBidders,
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

            sandbox.stub(storage, 'hasLocalStorage').returns(true);
            sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
            sandbox.stub(storage, 'getDataFromLocalStorage')
              .withArgs(DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY)
              .returns(JSON.stringify(entry));

            const adUnitCode1 = 'adunit1';
            const adUnitCode2 = 'adunit2';
            const reqBidsConfigObj = {
              ortb2Fragments: {
                global: {},
                bidder: {},
              },
              adUnits: [{
                code: adUnitCode1,
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
              }, {
                code: adUnitCode2,
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

            const targeting = weboramaSubmodule.getTargetingData([adUnitCode1, adUnitCode2], moduleConfig);

            expect(targeting).to.deep.equal({
              'adunit1': data,
              'adunit2': data,
            });

            reqBidsConfigObj.adUnits.forEach(adUnit => {
              expect(adUnit.bids.length).to.equal(5);
              expect(adUnit.bids[0].params).to.be.undefined;
              expect(adUnit.bids[1].params).to.be.undefined;
              expect(adUnit.bids[2].params.keywords).to.deep.equal(data);
              expect(adUnit.bids[3].params).to.be.undefined;
            });
            ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
              if (v == 'appnexus') {
                expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
                  user: {
                    ext: {
                      data: data
                    },
                  }
                });

                return
              }

              expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.be.undefined;
            })
            expect(onDataResponse).to.deep.equal({
              data: data,
              meta: {
                user: true,
                source: 'wam',
                isDefault: false,
              },
            });
          });
        });
      });

      describe('should set gam targeting from local storage and send to one specific bidder and one adunit', function() {
        const testcases = {
          'map with one entry': {
            'appnexus': ['adunit1']
          },
          'callback': (bid, adUnitCode) => {
            return bid.bidder == 'appnexus' && adUnitCode == 'adunit1';
          },
        };

        Object.keys(testcases).forEach(label => {
          const sendToBidders = testcases[label];
          it(`check sendToBidders as ${label}`, function() {
            let onDataResponse = {};
            const moduleConfig = {
              params: {
                weboUserDataConf: {
                  accountId: 12345,
                  sendToBidders: sendToBidders,
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

            sandbox.stub(storage, 'hasLocalStorage').returns(true);
            sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
            sandbox.stub(storage, 'getDataFromLocalStorage')
              .withArgs(DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY)
              .returns(JSON.stringify(entry));

            const adUnitCode1 = 'adunit1';
            const adUnitCode2 = 'adunit2';
            const reqBidsConfigObj = {
              ortb2Fragments: {
                global: {},
                bidder: {},
              },
              adUnits: [{
                code: adUnitCode1,
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
              }, {
                code: adUnitCode2,
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

            const targeting = weboramaSubmodule.getTargetingData([adUnitCode1, adUnitCode2], moduleConfig);

            expect(targeting).to.deep.equal({
              'adunit1': data,
              'adunit2': data,
            });

            reqBidsConfigObj.adUnits.forEach(adUnit => {
              expect(adUnit.bids.length).to.equal(5);
              expect(adUnit.bids[0].params).to.be.undefined;
              expect(adUnit.bids[1].params).to.be.undefined;
              expect(adUnit.bids[3].params).to.be.undefined;
            });
            ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
              if (v == 'appnexus') {
                expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
                  user: {
                    ext: {
                      data: data
                    },
                  }
                });

                return
              }

              expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.be.undefined;
            })

            expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(data);
            expect(reqBidsConfigObj.adUnits[1].bids[2].params).to.be.undefined;

            expect(onDataResponse).to.deep.equal({
              data: data,
              meta: {
                user: true,
                source: 'wam',
                isDefault: false,
              },
            });
          });
        });
      });

      describe('should set gam targeting for multiple adunits but not send to bidders with setPrebidTargeting=<true>/sendToBidders=false', function() {
        const testcases = {
          'boolean': true,
          'array with both units': ['adunit1', 'adunit2'],
          'callback': () => {
            return true;
          },
        };

        Object.keys(testcases).forEach(label => {
          const setPrebidTargeting = testcases[label];
          it(`check setPrebidTargeting as ${label}`, function() {
            const moduleConfig = {
              params: {
                weboUserDataConf: {
                  accoundId: 12345,
                  setPrebidTargeting: setPrebidTargeting,
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

            sandbox.stub(storage, 'hasLocalStorage').returns(true);
            sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
            sandbox.stub(storage, 'getDataFromLocalStorage')
              .withArgs(DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY)
              .returns(JSON.stringify(entry));

            const adUnitCode1 = 'adunit1';
            const adUnitCode2 = 'adunit2';
            const reqBidsConfigObj = {
              ortb2Fragments: {
                global: {},
                bidder: {},
              },
              adUnits: [{
                code: adUnitCode1,
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
              }, {
                code: adUnitCode2,
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

            const targeting = weboramaSubmodule.getTargetingData([adUnitCode1, adUnitCode2], moduleConfig);

            expect(targeting).to.deep.equal({
              'adunit1': data,
              'adunit2': data,
            });

            reqBidsConfigObj.adUnits.forEach(adUnit => {
              expect(adUnit.bids.length).to.equal(5);
              expect(adUnit.bids[0].params.target).to.equal('foo=bar');
              expect(adUnit.bids[1].params.dctr).to.equal('foo=bar');
              expect(adUnit.bids[2].params.keywords).to.deep.equal({
                foo: ['bar']
              });
              expect(adUnit.bids[3].params).to.deep.equal({
                inventory: {
                  foo: 'bar'
                },
                visitor: {
                  baz: 'bam'
                }
              });
            });
            ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
              expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.be.undefined;
            })
          });
        });
      });

      describe('should set gam targeting for one adunit but not send to bidders with setPrebidTargeting=<true>/sendToBidders=false', function() {
        const testcases = {
          'array with one unit': ['adunit1'],
          'callback': (adUnitCode) => {
            return adUnitCode == 'adunit1';
          },
        };

        Object.keys(testcases).forEach(label => {
          const setPrebidTargeting = testcases[label];
          it(`check setPrebidTargeting as ${label}`, function() {
            const moduleConfig = {
              params: {
                weboUserDataConf: {
                  accoundId: 12345,
                  setPrebidTargeting: setPrebidTargeting,
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

            sandbox.stub(storage, 'hasLocalStorage').returns(true);
            sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
            sandbox.stub(storage, 'getDataFromLocalStorage')
              .withArgs(DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY)
              .returns(JSON.stringify(entry));

            const adUnitCode1 = 'adunit1';
            const adUnitCode2 = 'adunit2';
            const reqBidsConfigObj = {
              ortb2Fragments: {
                global: {},
                bidder: {},
              },
              adUnits: [{
                code: adUnitCode1,
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
              }, {
                code: adUnitCode2,
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

            const targeting = weboramaSubmodule.getTargetingData([adUnitCode1, adUnitCode2], moduleConfig);

            expect(targeting).to.deep.equal({
              'adunit1': data,
              'adunit2': {},
            });

            reqBidsConfigObj.adUnits.forEach(adUnit => {
              expect(adUnit.bids.length).to.equal(5);
              expect(adUnit.bids[0].params.target).to.equal('foo=bar');
              expect(adUnit.bids[1].params.dctr).to.equal('foo=bar');
              expect(adUnit.bids[2].params.keywords).to.deep.equal({
                foo: ['bar']
              });
              expect(adUnit.bids[3].params).to.deep.equal({
                inventory: {
                  foo: 'bar'
                },
                visitor: {
                  baz: 'bam'
                }
              });
            });
            ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
              expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.be.undefined;
            })
          });
        });
      });

      it('should set gam targeting but not send to bidders with (submodule override) setPrebidTargeting=true/(global) sendToBidders=false', function() {
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

        sandbox.stub(storage, 'hasLocalStorage').returns(true);
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
          meta: {
            user: true,
            source: 'wam',
            isDefault: false,
          },
        });
      });

      it('should not set gam targeting with setPrebidTargeting=false but send to bidders', function() {
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

        sandbox.stub(storage, 'hasLocalStorage').returns(true);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'getDataFromLocalStorage')
          .withArgs(DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY)
          .returns(JSON.stringify(entry));

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {}
          },
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
        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('foo=bar');
        expect(reqBidsConfigObj.adUnits[0].bids[1].params.dctr).to.equal('foo=bar');
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
          }
        });
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            user: {
              ext: {
                data: data
              },
            }
          });
        })
      });

      it('should use default profile in case of nothing on local storage', function() {
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

        sandbox.stub(storage, 'hasLocalStorage').returns(true);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {}
          },
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
        expect(reqBidsConfigObj.adUnits[0].bids[0].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[1].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(defaultProfile);
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.be.undefined;
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            user: {
              ext: {
                data: defaultProfile
              },
            }
          });
        })
      });

      it('should use default profile if cant read from local storage', function() {
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

        sandbox.stub(storage, 'hasLocalStorage').returns(true);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(false);

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {}
          },
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
        expect(reqBidsConfigObj.adUnits[0].bids[0].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[1].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(defaultProfile);
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.be.undefined;
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            user: {
              ext: {
                data: defaultProfile
              },
            }
          });
        })
        expect(onDataResponse).to.deep.equal({
          data: defaultProfile,
          meta: {
            user: true,
            source: 'wam',
            isDefault: true,
          },
        });
      });

      it('should be possible update profile from callbacks for a given bidder/adUnitCode', function() {
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            weboUserDataConf: {
              accoundId: 12345,
              targetURL: 'https://prebid.org',
              setPrebidTargeting: (adUnitCode, data, meta) => {
                if (adUnitCode == 'adunit1') {
                  data['webo_foo'] = ['bar'];
                }
                return true;
              },
              sendToBidders: (bid, adUnitCode, data, meta) => {
                if (bid.bidder == 'appnexus' && adUnitCode == 'adunit1') {
                  data['webo_bar'] = ['baz'];
                }
                return true;
              },
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

        sandbox.stub(storage, 'hasLocalStorage').returns(true);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'getDataFromLocalStorage')
          .withArgs(DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY)
          .returns(JSON.stringify(entry));

        const adUnitCode1 = 'adunit1';
        const adUnitCode2 = 'adunit2';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {},
          },
          adUnits: [{
            code: adUnitCode1,
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
          }, {
            code: adUnitCode2,
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

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode1, adUnitCode2], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': {
            webo_cs: ['foo', 'bar'],
            webo_audiences: ['baz'],
            webo_foo: ['bar'],
          },
          'adunit2': data,
        });

        reqBidsConfigObj.adUnits.forEach(adUnit => {
          expect(adUnit.bids.length).to.equal(5);
          expect(adUnit.bids[0].params).to.be.undefined;
          expect(adUnit.bids[1].params).to.be.undefined;
          expect(adUnit.bids[3].params).to.be.undefined;
        });
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          if (v == 'appnexus') {
            expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
              user: {
                ext: {
                  data: {
                    webo_cs: ['foo', 'bar'],
                    webo_audiences: ['baz'],
                    webo_bar: ['baz'],
                  }
                },
              }
            });

            return
          }

          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            user: {
              ext: {
                data: data
              },
            }
          });
        })

        expect(onDataResponse).to.deep.equal({
          data: data,
          meta: {
            user: true,
            source: 'wam',
            isDefault: false,
          },
        });
      });
    });

    describe('Add support to sfbx lite', function() {
      it('should set gam targeting from local storage and send to bidders by default', function() {
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            sfbxLiteDataConf: {
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
          lite_occupation: ['gérant', 'bénévole'],
          lite_hobbies: ['sport', 'cinéma'],
        };

        const entry = {
          webo: data,
        };

        sandbox.stub(storage, 'hasLocalStorage').returns(true);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'getDataFromLocalStorage')
          .withArgs(DEFAULT_LOCAL_STORAGE_LITE_PROFILE_KEY)
          .returns(JSON.stringify(entry));

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {},
          },
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
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            site: {
              ext: {
                data: data
              },
            }
          });
        })
        expect(onDataResponse).to.deep.equal({
          data: data,
          meta: {
            user: false,
            source: 'lite',
            isDefault: false,
          },
        });
      });

      describe('should set gam targeting from local storage and send to one specific bidder and multiple adunits', function() {
        const testcases = {
          'single string': 'appnexus',
          'array with one entry': ['appnexus'],
          'map with one entry': {
            'appnexus': true
          },
          'map complete': {
            'smartadserver': false,
            'pubmatic': false,
            'appnexus': true,
            'rubicon': false,
            'other': false,
          },
          'callback': (bid) => {
            return bid.bidder == 'appnexus'
          },
        };

        Object.keys(testcases).forEach(label => {
          const sendToBidders = testcases[label];
          it(`check sendToBidders as ${label}`, function() {
            let onDataResponse = {};
            const moduleConfig = {
              params: {
                sfbxLiteDataConf: {
                  sendToBidders: sendToBidders,
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
              lite_occupation: ['gérant', 'bénévole'],
              lite_hobbies: ['sport', 'cinéma'],
            };

            const entry = {
              webo: data,
            };

            sandbox.stub(storage, 'hasLocalStorage').returns(true);
            sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
            sandbox.stub(storage, 'getDataFromLocalStorage')
              .withArgs(DEFAULT_LOCAL_STORAGE_LITE_PROFILE_KEY)
              .returns(JSON.stringify(entry));

            const adUnitCode1 = 'adunit1';
            const adUnitCode2 = 'adunit2';
            const reqBidsConfigObj = {
              ortb2Fragments: {
                global: {},
                bidder: {},
              },
              adUnits: [{
                code: adUnitCode1,
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
              }, {
                code: adUnitCode2,
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

            const targeting = weboramaSubmodule.getTargetingData([adUnitCode1, adUnitCode2], moduleConfig);

            expect(targeting).to.deep.equal({
              'adunit1': data,
              'adunit2': data,
            });

            reqBidsConfigObj.adUnits.forEach(adUnit => {
              expect(adUnit.bids.length).to.equal(5);
              expect(adUnit.bids[0].params).to.be.undefined;
              expect(adUnit.bids[1].params).to.be.undefined;
              expect(adUnit.bids[2].params.keywords).to.deep.equal(data);
              expect(adUnit.bids[3].params).to.be.undefined;
            });
            ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
              if (v == 'appnexus') {
                expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
                  site: {
                    ext: {
                      data: data
                    },
                  }
                });

                return
              }

              expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.be.undefined;
            })

            expect(onDataResponse).to.deep.equal({
              data: data,
              meta: {
                user: false,
                source: 'lite',
                isDefault: false,
              },
            });
          });
        });
      });

      describe('should set gam targeting from local storage and send to one specific bidder and one adunit', function() {
        const testcases = {
          'map with one entry': {
            'appnexus': ['adunit1']
          },
          'callback': (bid, adUnitCode) => {
            return bid.bidder == 'appnexus' && adUnitCode == 'adunit1';
          },
        };

        Object.keys(testcases).forEach(label => {
          const sendToBidders = testcases[label];
          it(`check sendToBidders as ${label}`, function() {
            let onDataResponse = {};
            const moduleConfig = {
              params: {
                sfbxLiteDataConf: {
                  sendToBidders: sendToBidders,
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
              lite_occupation: ['gérant', 'bénévole'],
              lite_hobbies: ['sport', 'cinéma'],
            };

            const entry = {
              webo: data,
            };

            sandbox.stub(storage, 'hasLocalStorage').returns(true);
            sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
            sandbox.stub(storage, 'getDataFromLocalStorage')
              .withArgs(DEFAULT_LOCAL_STORAGE_LITE_PROFILE_KEY)
              .returns(JSON.stringify(entry));

            const adUnitCode1 = 'adunit1';
            const adUnitCode2 = 'adunit2';
            const reqBidsConfigObj = {
              ortb2Fragments: {
                global: {},
                bidder: {},
              },
              adUnits: [{
                code: adUnitCode1,
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
              }, {
                code: adUnitCode2,
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

            const targeting = weboramaSubmodule.getTargetingData([adUnitCode1, adUnitCode2], moduleConfig);

            expect(targeting).to.deep.equal({
              'adunit1': data,
              'adunit2': data,
            });

            reqBidsConfigObj.adUnits.forEach(adUnit => {
              expect(adUnit.bids.length).to.equal(5);
              expect(adUnit.bids[0].params).to.be.undefined;
              expect(adUnit.bids[1].params).to.be.undefined;
              expect(adUnit.bids[3].params).to.be.undefined;
            });

            expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(data);
            expect(reqBidsConfigObj.adUnits[1].bids[2].params).to.be.undefined;

            ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
              if (v == 'appnexus') {
                expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
                  site: {
                    ext: {
                      data: data
                    },
                  }
                });

                return
              }

              expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.be.undefined;
            })

            expect(onDataResponse).to.deep.equal({
              data: data,
              meta: {
                user: false,
                source: 'lite',
                isDefault: false,
              },
            });
          });
        });
      });

      describe('should set gam targeting for multiple adunits but not send to bidders with setPrebidTargeting=<true>/sendToBidders=false', function() {
        const testcases = {
          'boolean': true,
          'array with both units': ['adunit1', 'adunit2'],
          'callback': () => {
            return true;
          },
        };

        Object.keys(testcases).forEach(label => {
          const setPrebidTargeting = testcases[label];
          it(`check setPrebidTargeting as ${label}`, function() {
            const moduleConfig = {
              params: {
                sfbxLiteDataConf: {
                  setPrebidTargeting: setPrebidTargeting,
                  sendToBidders: false
                }
              }
            };
            const data = {
              lite_occupation: ['gérant', 'bénévole'],
              lite_hobbies: ['sport', 'cinéma'],
            };

            const entry = {
              webo: data,
            };

            sandbox.stub(storage, 'hasLocalStorage').returns(true);
            sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
            sandbox.stub(storage, 'getDataFromLocalStorage')
              .withArgs(DEFAULT_LOCAL_STORAGE_LITE_PROFILE_KEY)
              .returns(JSON.stringify(entry));

            const adUnitCode1 = 'adunit1';
            const adUnitCode2 = 'adunit2';
            const reqBidsConfigObj = {
              ortb2Fragments: {
                global: {},
                bidder: {},
              },
              adUnits: [{
                code: adUnitCode1,
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
              }, {
                code: adUnitCode2,
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

            const targeting = weboramaSubmodule.getTargetingData([adUnitCode1, adUnitCode2], moduleConfig);

            expect(targeting).to.deep.equal({
              'adunit1': data,
              'adunit2': data,
            });

            reqBidsConfigObj.adUnits.forEach(adUnit => {
              expect(adUnit.bids.length).to.equal(5);
              expect(adUnit.bids[0].params.target).to.equal('foo=bar');
              expect(adUnit.bids[1].params.dctr).to.equal('foo=bar');
              expect(adUnit.bids[2].params.keywords).to.deep.equal({
                foo: ['bar']
              });
              expect(adUnit.bids[3].params).to.deep.equal({
                inventory: {
                  foo: 'bar'
                },
                visitor: {
                  baz: 'bam'
                }
              });
            });
            ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
              expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.be.undefined;
            })
          });
        });
      });

      describe('should set gam targeting for one adunit but not send to bidders with setPrebidTargeting=<true>/sendToBidders=false', function() {
        const testcases = {
          'array with one unit': ['adunit1'],
          'callback': (adUnitCode) => {
            return adUnitCode == 'adunit1';
          },
        };

        Object.keys(testcases).forEach(label => {
          const setPrebidTargeting = testcases[label];
          it(`check setPrebidTargeting as ${label}`, function() {
            const moduleConfig = {
              params: {
                sfbxLiteDataConf: {
                  setPrebidTargeting: setPrebidTargeting,
                  sendToBidders: false
                }
              }
            };
            const data = {
              lite_occupation: ['gérant', 'bénévole'],
              lite_hobbies: ['sport', 'cinéma'],
            };

            const entry = {
              webo: data,
            };

            sandbox.stub(storage, 'hasLocalStorage').returns(true);
            sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
            sandbox.stub(storage, 'getDataFromLocalStorage')
              .withArgs(DEFAULT_LOCAL_STORAGE_LITE_PROFILE_KEY)
              .returns(JSON.stringify(entry));

            const adUnitCode1 = 'adunit1';
            const adUnitCode2 = 'adunit2';
            const reqBidsConfigObj = {
              ortb2Fragments: {
                global: {},
                bidder: {},
              },
              adUnits: [{
                code: adUnitCode1,
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
              }, {
                code: adUnitCode2,
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

            const targeting = weboramaSubmodule.getTargetingData([adUnitCode1, adUnitCode2], moduleConfig);

            expect(targeting).to.deep.equal({
              'adunit1': data,
              'adunit2': {},
            });

            reqBidsConfigObj.adUnits.forEach(adUnit => {
              expect(adUnit.bids.length).to.equal(5);
              expect(adUnit.bids[0].params.target).to.equal('foo=bar');
              expect(adUnit.bids[1].params.dctr).to.equal('foo=bar');
              expect(adUnit.bids[2].params.keywords).to.deep.equal({
                foo: ['bar']
              });
              expect(adUnit.bids[3].params).to.deep.equal({
                inventory: {
                  foo: 'bar'
                },
                visitor: {
                  baz: 'bam'
                }
              });
            });
            ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
              expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.be.undefined;
            })
          });
        });
      });

      it('should set gam targeting but not send to bidders with (submodule override) setPrebidTargeting=true/(global) sendToBidders=false', function() {
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
            sfbxLiteDataConf: {
              setPrebidTargeting: true, // submodule parameter will override module parameter
            }
          }
        };
        const data = {
          lite_occupation: ['gérant', 'bénévole'],
          lite_hobbies: ['sport', 'cinéma'],
        };

        const entry = {
          webo: data,
        };

        sandbox.stub(storage, 'hasLocalStorage').returns(true);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'getDataFromLocalStorage')
          .withArgs(DEFAULT_LOCAL_STORAGE_LITE_PROFILE_KEY)
          .returns(JSON.stringify(entry));

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {},
          },
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
          meta: {
            user: false,
            source: 'lite',
            isDefault: false,
          },
        });
      });

      it('should not set gam targeting with setPrebidTargeting=false but send to bidders', function() {
        const moduleConfig = {
          params: {
            sfbxLiteDataConf: {
              setPrebidTargeting: false,
            }
          }
        };
        const data = {
          lite_occupation: ['gérant', 'bénévole'],
          lite_hobbies: ['sport', 'cinéma'],
        };

        const entry = {
          webo: data,
        };

        sandbox.stub(storage, 'hasLocalStorage').returns(true);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'getDataFromLocalStorage')
          .withArgs(DEFAULT_LOCAL_STORAGE_LITE_PROFILE_KEY)
          .returns(JSON.stringify(entry));

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {},
          },
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
        expect(reqBidsConfigObj.adUnits[0].bids[0].params.target).to.equal('foo=bar');
        expect(reqBidsConfigObj.adUnits[0].bids[1].params.dctr).to.equal('foo=bar');
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal({
          foo: ['bar'],
          lite_occupation: ['gérant', 'bénévole'],
          lite_hobbies: ['sport', 'cinéma'],
        });
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.deep.equal({
          inventory: {
            foo: 'bar',
          },
          visitor: {
            baz: 'bam',
          }
        });
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            site: {
              ext: {
                data: data
              },
            }
          });
        })
      });

      it('should use default profile in case of nothing on local storage', function() {
        const defaultProfile = {
          lite_hobbies: ['sport', 'cinéma'],
        };
        const moduleConfig = {
          params: {
            sfbxLiteDataConf: {
              setPrebidTargeting: true,
              defaultProfile: defaultProfile,
            }
          }
        };

        sandbox.stub(storage, 'hasLocalStorage').returns(true);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {},
          },
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
        expect(reqBidsConfigObj.adUnits[0].bids[0].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[1].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(defaultProfile);
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.be.undefined;
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            site: {
              ext: {
                data: defaultProfile
              },
            }
          });
        })
      });

      it('should use default profile if cant read from local storage', function() {
        const defaultProfile = {
          lite_hobbies: ['sport', 'cinéma'],
        };
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            sfbxLiteDataConf: {
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

        sandbox.stub(storage, 'hasLocalStorage').returns(true);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(false);

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {},
          },
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
        expect(reqBidsConfigObj.adUnits[0].bids[0].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[1].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(defaultProfile);
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.be.undefined;
        expect(reqBidsConfigObj.ortb2Fragments.bidder.other).to.deep.equal({
          site: {
            ext: {
              data: defaultProfile,
            },
          },
        });
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            site: {
              ext: {
                data: defaultProfile,
              },
            }
          });
        })
        expect(onDataResponse).to.deep.equal({
          data: defaultProfile,
          meta: {
            user: false,
            source: 'lite',
            isDefault: true,
          },
        });
      });

      it('should use default profile if has no local storage', function() {
        const defaultProfile = {
          lite_hobbies: ['sport', 'cinéma'],
        };
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            sfbxLiteDataConf: {
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

        sandbox.stub(storage, 'hasLocalStorage').returns(false);

        const adUnitCode = 'adunit1';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {},
          },
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
        expect(reqBidsConfigObj.adUnits[0].bids[0].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[1].params).to.be.undefined;
        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal(defaultProfile);
        expect(reqBidsConfigObj.adUnits[0].bids[3].params).to.be.undefined;
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            site: {
              ext: {
                data: defaultProfile
              },
            }
          });
        })
        expect(onDataResponse).to.deep.equal({
          data: defaultProfile,
          meta: {
            user: false,
            source: 'lite',
            isDefault: true,
          },
        });
      });
      it('should be possible update profile from callbacks for a given bidder/adUnitCode', function() {
        let onDataResponse = {};
        const moduleConfig = {
          params: {
            sfbxLiteDataConf: {
              targetURL: 'https://prebid.org',
              setPrebidTargeting: (adUnitCode, data, meta) => {
                if (adUnitCode == 'adunit1') {
                  data['lito_foo'] = ['bar'];
                }
                return true;
              },
              sendToBidders: (bid, adUnitCode, data, meta) => {
                if (bid.bidder == 'appnexus' && adUnitCode == 'adunit1') {
                  data['lito_bar'] = ['baz'];
                }
                return true;
              },
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
          lite_occupation: ['gérant', 'bénévole'],
          lite_hobbies: ['sport', 'cinéma'],
        };

        const entry = {
          webo: data,
        };

        sandbox.stub(storage, 'hasLocalStorage').returns(true);
        sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
        sandbox.stub(storage, 'getDataFromLocalStorage')
          .withArgs(DEFAULT_LOCAL_STORAGE_LITE_PROFILE_KEY)
          .returns(JSON.stringify(entry));

        const adUnitCode1 = 'adunit1';
        const adUnitCode2 = 'adunit2';
        const reqBidsConfigObj = {
          ortb2Fragments: {
            global: {},
            bidder: {},
          },
          adUnits: [{
            code: adUnitCode1,
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
          }, {
            code: adUnitCode2,
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

        const targeting = weboramaSubmodule.getTargetingData([adUnitCode1, adUnitCode2], moduleConfig);

        expect(targeting).to.deep.equal({
          'adunit1': {
            lite_occupation: ['gérant', 'bénévole'],
            lite_hobbies: ['sport', 'cinéma'],
            lito_foo: ['bar'],
          },
          'adunit2': data,
        });

        reqBidsConfigObj.adUnits.forEach(adUnit => {
          expect(adUnit.bids.length).to.equal(5);
          expect(adUnit.bids[0].params).to.be.undefined;
          expect(adUnit.bids[1].params).to.be.undefined;
          expect(adUnit.bids[3].params).to.be.undefined;
        });
        ['smartadserver', 'pubmatic', 'appnexus', 'rubicon', 'other'].forEach((v) => {
          if (v == 'appnexus') {
            expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
              site: {
                ext: {
                  data: {
                    lite_occupation: ['gérant', 'bénévole'],
                    lite_hobbies: ['sport', 'cinéma'],
                    lito_bar: ['baz'],
                  },
                },
              }
            });

            return
          }

          expect(reqBidsConfigObj.ortb2Fragments.bidder[v]).to.deep.equal({
            site: {
              ext: {
                data: data,
              },
            }
          });
        })

        expect(reqBidsConfigObj.adUnits[0].bids[2].params.keywords).to.deep.equal({
          lite_occupation: ['gérant', 'bénévole'],
          lite_hobbies: ['sport', 'cinéma'],
          lito_bar: ['baz'],
        });
        expect(reqBidsConfigObj.adUnits[1].bids[2].params.keywords).to.deep.equal(data);

        expect(onDataResponse).to.deep.equal({
          data: data,
          meta: {
            user: false,
            source: 'lite',
            isDefault: false,
          },
        });
      });
    });
  });
});
