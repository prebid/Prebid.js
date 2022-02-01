import {config} from 'src/config.js';
import {HALOID_LOCAL_NAME, RTD_LOCAL_NAME, addRealTimeData, getRealTimeData, hadronSubmodule, storage} from 'modules/hadronRtdProvider.js';
import {server} from 'test/mocks/xhr.js';

const responseHeader = {'Content-Type': 'application/json'};

describe('hadronRtdProvider', function() {
  let getDataFromLocalStorageStub;

  beforeEach(function() {
    config.resetConfig();
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
  });

  afterEach(function () {
    getDataFromLocalStorageStub.restore();
  });

  describe('hadronSubmodule', function() {
    it('successfully instantiates', function () {
		  expect(hadronSubmodule.init()).to.equal(true);
    });
  });

  describe('Add Real-Time Data', function() {
    it('merges ortb2 data', function() {
      let rtdConfig = {};
      let bidConfig = {};

      const setConfigUserObj1 = {
        name: 'www.dataprovider1.com',
        ext: { taxonomyname: 'iab_audience_taxonomy' },
        segment: [{
          id: '1776'
        }]
      };

      const setConfigUserObj2 = {
        name: 'www.dataprovider2.com',
        ext: { taxonomyname: 'iab_audience_taxonomy' },
        segment: [{
          id: '1914'
        }]
      };

      const setConfigSiteObj1 = {
        name: 'www.dataprovider3.com',
        ext: {
          taxonomyname: 'iab_audience_taxonomy'
        },
        segment: [
          {
            id: '1812'
          },
          {
            id: '1955'
          }
        ]
      }

      config.setConfig({
        ortb2: {
          user: {
            data: [setConfigUserObj1, setConfigUserObj2]
          },
          site: {
            content: {
              data: [setConfigSiteObj1]
            }
          }
        }
      });

      const rtdUserObj1 = {
        name: 'www.dataprovider4.com',
        ext: {
          taxonomyname: 'iab_audience_taxonomy'
        },
        segment: [
          {
            id: '1918'
          },
          {
            id: '1939'
          }
        ]
      };

      const rtdSiteObj1 = {
        name: 'www.dataprovider5.com',
        ext: {
          taxonomyname: 'iab_audience_taxonomy'
        },
        segment: [
          {
            id: '1945'
          },
          {
            id: '2003'
          }
        ]
      };

      const rtd = {
        ortb2: {
          user: {
            data: [rtdUserObj1]
          },
          site: {
            content: {
              data: [rtdSiteObj1]
            }
          }
        }
      };

      addRealTimeData(bidConfig, rtd, rtdConfig);

      let ortb2Config = config.getConfig().ortb2;

      expect(ortb2Config.user.data).to.deep.include.members([setConfigUserObj1, setConfigUserObj2, rtdUserObj1]);
      expect(ortb2Config.site.content.data).to.deep.include.members([setConfigSiteObj1, rtdSiteObj1]);
    });

    it('merges ortb2 data without duplication', function() {
      let rtdConfig = {};
      let bidConfig = {};

      const userObj1 = {
        name: 'www.dataprovider1.com',
        ext: { taxonomyname: 'iab_audience_taxonomy' },
        segment: [{
          id: '1776'
        }]
      };

      const userObj2 = {
        name: 'www.dataprovider2.com',
        ext: { taxonomyname: 'iab_audience_taxonomy' },
        segment: [{
          id: '1914'
        }]
      };

      const siteObj1 = {
        name: 'www.dataprovider3.com',
        ext: {
          taxonomyname: 'iab_audience_taxonomy'
        },
        segment: [
          {
            id: '1812'
          },
          {
            id: '1955'
          }
        ]
      }

      config.setConfig({
        ortb2: {
          user: {
            data: [userObj1, userObj2]
          },
          site: {
            content: {
              data: [siteObj1]
            }
          }
        }
      });

      const rtd = {
        ortb2: {
          user: {
            data: [userObj1]
          },
          site: {
            content: {
              data: [siteObj1]
            }
          }
        }
      };

      addRealTimeData(bidConfig, rtd, rtdConfig);

      let ortb2Config = config.getConfig().ortb2;

      expect(ortb2Config.user.data).to.deep.include.members([userObj1, userObj2]);
      expect(ortb2Config.site.content.data).to.deep.include.members([siteObj1]);
      expect(ortb2Config.user.data).to.have.lengthOf(2);
      expect(ortb2Config.site.content.data).to.have.lengthOf(1);
    });

    it('merges bidder-specific ortb2 data', function() {
      let rtdConfig = {};
      let bidConfig = {};

      const configUserObj1 = {
        name: 'www.dataprovider1.com',
        ext: { segtax: 3 },
        segment: [{
          id: '1776'
        }]
      };

      const configUserObj2 = {
        name: 'www.dataprovider2.com',
        ext: { segtax: 3 },
        segment: [{
          id: '1914'
        }]
      };

      const configUserObj3 = {
        name: 'www.dataprovider1.com',
        ext: { segtax: 3 },
        segment: [{
          id: '2003'
        }]
      };

      const configSiteObj1 = {
        name: 'www.dataprovider3.com',
        ext: {
          segtax: 1
        },
        segment: [
          {
            id: '1812'
          },
          {
            id: '1955'
          }
        ]
      };

      const configSiteObj2 = {
        name: 'www.dataprovider3.com',
        ext: {
          segtax: 1
        },
        segment: [
          {
            id: '1812'
          }
        ]
      };

      config.setBidderConfig({
        bidders: ['adbuzz'],
        config: {
          ortb2: {
            user: {
              data: [configUserObj1, configUserObj2]
            },
            site: {
              content: {
                data: [configSiteObj1]
              }
            }
          }
        }
      });

      config.setBidderConfig({
        bidders: ['pubvisage'],
        config: {
          ortb2: {
            user: {
              data: [configUserObj3]
            },
            site: {
              content: {
                data: [configSiteObj2]
              }
            }
          }
        }
      });

      const rtdUserObj1 = {
        name: 'www.dataprovider4.com',
        ext: {
          segtax: 501
        },
        segment: [
          {
            id: '1918'
          },
          {
            id: '1939'
          }
        ]
      };

      const rtdUserObj2 = {
        name: 'www.dataprovider2.com',
        ext: {
          segtax: 502
        },
        segment: [
          {
            id: '1939'
          }
        ]
      };

      const rtdSiteObj1 = {
        name: 'www.dataprovider5.com',
        ext: {
          segtax: 1
        },
        segment: [
          {
            id: '441'
          },
          {
            id: '442'
          }
        ]
      };

      const rtdSiteObj2 = {
        name: 'www.dataprovider6.com',
        ext: {
          segtax: 2
        },
        segment: [
          {
            id: '676'
          }
        ]
      };

      const rtd = {
        ortb2b: {
          adbuzz: {
            ortb2: {
              user: {
                data: [rtdUserObj1]
              },
              site: {
                content: {
                  data: [rtdSiteObj1]
                }
              }
            }
          },
          pubvisage: {
            ortb2: {
              user: {
                data: [rtdUserObj2]
              },
              site: {
                content: {
                  data: [rtdSiteObj2]
                }
              }
            }
          }
        }
      };

      addRealTimeData(bidConfig, rtd, rtdConfig);

      let ortb2Config = config.getBidderConfig().adbuzz.ortb2;

      expect(ortb2Config.user.data).to.deep.include.members([configUserObj1, configUserObj2, rtdUserObj1]);
      expect(ortb2Config.site.content.data).to.deep.include.members([configSiteObj1, rtdSiteObj1]);

      ortb2Config = config.getBidderConfig().pubvisage.ortb2;

      expect(ortb2Config.user.data).to.deep.include.members([configUserObj3, rtdUserObj2]);
      expect(ortb2Config.site.content.data).to.deep.include.members([configSiteObj2, rtdSiteObj2]);
    });

    it('merges bidder-specific ortb2 data without duplication', function() {
      let rtdConfig = {};
      let bidConfig = {};

      const userObj1 = {
        name: 'www.dataprovider1.com',
        ext: { segtax: 3 },
        segment: [{
          id: '1776'
        }]
      };

      const userObj2 = {
        name: 'www.dataprovider2.com',
        ext: { segtax: 3 },
        segment: [{
          id: '1914'
        }]
      };

      const userObj3 = {
        name: 'www.dataprovider1.com',
        ext: { segtax: 3 },
        segment: [{
          id: '2003'
        }]
      };

      const siteObj1 = {
        name: 'www.dataprovider3.com',
        ext: {
          segtax: 1
        },
        segment: [
          {
            id: '1812'
          },
          {
            id: '1955'
          }
        ]
      };

      const siteObj2 = {
        name: 'www.dataprovider3.com',
        ext: {
          segtax: 1
        },
        segment: [
          {
            id: '1812'
          }
        ]
      };

      config.setBidderConfig({
        bidders: ['adbuzz'],
        config: {
          ortb2: {
            user: {
              data: [userObj1, userObj2]
            },
            site: {
              content: {
                data: [siteObj1]
              }
            }
          }
        }
      });

      config.setBidderConfig({
        bidders: ['pubvisage'],
        config: {
          ortb2: {
            user: {
              data: [userObj3]
            },
            site: {
              content: {
                data: [siteObj2]
              }
            }
          }
        }
      });

      const rtd = {
        ortb2b: {
          adbuzz: {
            ortb2: {
              user: {
                data: [userObj1]
              },
              site: {
                content: {
                  data: [siteObj1]
                }
              }
            }
          },
          pubvisage: {
            ortb2: {
              user: {
                data: [userObj2, userObj3]
              },
              site: {
                content: {
                  data: [siteObj1, siteObj2]
                }
              }
            }
          }
        }
      };

      addRealTimeData(bidConfig, rtd, rtdConfig);

      let ortb2Config = config.getBidderConfig().adbuzz.ortb2;

      expect(ortb2Config.user.data).to.deep.include.members([userObj1]);
      expect(ortb2Config.site.content.data).to.deep.include.members([siteObj1]);

      expect(ortb2Config.user.data).to.have.lengthOf(2);
      expect(ortb2Config.site.content.data).to.have.lengthOf(1);

      ortb2Config = config.getBidderConfig().pubvisage.ortb2;

      expect(ortb2Config.user.data).to.deep.include.members([userObj3, userObj3]);
      expect(ortb2Config.site.content.data).to.deep.include.members([siteObj1, siteObj2]);

      expect(ortb2Config.user.data).to.have.lengthOf(2);
      expect(ortb2Config.site.content.data).to.have.lengthOf(2);
    });

    it('allows publisher defined rtd ortb2 logic', function() {
      const rtdConfig = {
        params: {
          handleRtd: function(bidConfig, rtd, rtdConfig, pbConfig) {
            if (rtd.ortb2.user.data[0].segment[0].id == '1776') {
              pbConfig.setConfig({ortb2: rtd.ortb2});
            } else {
              pbConfig.setConfig({ortb2: {}});
            }
          }
        }
      };

      let bidConfig = {};

      const rtdUserObj1 = {
        name: 'www.dataprovider.com',
        ext: { taxonomyname: 'iab_audience_taxonomy' },
        segment: [{
          id: '1776'
        }]
      };

      let rtd = {
        ortb2: {
          user: {
            data: [rtdUserObj1]
          }
        }
      };

      config.resetConfig();

      let pbConfig = config.getConfig();
      addRealTimeData(bidConfig, rtd, rtdConfig);
      expect(config.getConfig().ortb2.user.data).to.deep.include.members([rtdUserObj1]);

      const rtdUserObj2 = {
        name: 'www.audigent.com',
        ext: {
          segtax: '1',
          taxprovider: '1'
        },
        segment: [{
          id: 'pubseg1'
        }]
      };

      rtd = {
        ortb2: {
          user: {
            data: [rtdUserObj2]
          }
        }
      };

      config.resetConfig();

      pbConfig = config.getConfig();
      addRealTimeData(bidConfig, rtd, rtdConfig);
      expect(config.getConfig().ortb2).to.deep.equal({});
    });

    it('allows publisher defined adunit logic', function() {
      const rtdConfig = {
        params: {
          handleRtd: function(bidConfig, rtd, rtdConfig, pbConfig) {
            var adUnits = bidConfig.adUnits;
            for (var i = 0; i < adUnits.length; i++) {
              var adUnit = adUnits[i];
              for (var j = 0; j < adUnit.bids.length; j++) {
                var bid = adUnit.bids[j];
                if (bid.bidder == 'adBuzz') {
                  for (var k = 0; k < rtd.adBuzz.length; k++) {
                    bid.adBuzzData.segments.adBuzz.push(rtd.adBuzz[k]);
                  }
                } else if (bid.bidder == 'trueBid') {
                  for (var k = 0; k < rtd.trueBid.length; k++) {
                    bid.trueBidSegments.push(rtd.trueBid[k]);
                  }
                }
              }
            }
          }
        }
      };

      let bidConfig = {
        adUnits: [
          {
            bids: [
              {
                bidder: 'adBuzz',
                adBuzzData: {
                  segments: {
                    adBuzz: [
                      {
                        id: 'adBuzzSeg1'
                      }
                    ]
                  }
                }
              },
              {
                bidder: 'trueBid',
                trueBidSegments: []
              }
            ]
          }
        ]
      };

      const rtd = {
        adBuzz: [{id: 'adBuzzSeg2'}, {id: 'adBuzzSeg3'}],
        trueBid: [{id: 'truebidSeg1'}, {id: 'truebidSeg2'}, {id: 'truebidSeg3'}]
      };

      addRealTimeData(bidConfig, rtd, rtdConfig);

      expect(bidConfig.adUnits[0].bids[0].adBuzzData.segments.adBuzz[0].id).to.equal('adBuzzSeg1');
      expect(bidConfig.adUnits[0].bids[0].adBuzzData.segments.adBuzz[1].id).to.equal('adBuzzSeg2');
      expect(bidConfig.adUnits[0].bids[0].adBuzzData.segments.adBuzz[2].id).to.equal('adBuzzSeg3');
      expect(bidConfig.adUnits[0].bids[1].trueBidSegments[0].id).to.equal('truebidSeg1');
      expect(bidConfig.adUnits[0].bids[1].trueBidSegments[1].id).to.equal('truebidSeg2');
      expect(bidConfig.adUnits[0].bids[1].trueBidSegments[2].id).to.equal('truebidSeg3');
    });
  });

  describe('Get Real-Time Data', function() {
    it('gets rtd from local storage cache', function() {
      const rtdConfig = {
        params: {
          segmentCache: true
        }
      };

      const bidConfig = {};

      const rtdUserObj1 = {
        name: 'www.dataprovider3.com',
        ext: {
          taxonomyname: 'iab_audience_taxonomy'
        },
        segment: [
          {
            id: '1918'
          },
          {
            id: '1939'
          }
        ]
      };

      const cachedRtd = {
        rtd: {
          ortb2: {
            user: {
              data: [rtdUserObj1]
            }
          }
        }
      };

      getDataFromLocalStorageStub.withArgs(RTD_LOCAL_NAME).returns(JSON.stringify(cachedRtd));

      expect(config.getConfig().ortb2).to.be.undefined;
      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(config.getConfig().ortb2.user.data).to.deep.include.members([rtdUserObj1]);
    });

    it('gets real-time data via async request', function() {
      const setConfigSiteObj1 = {
        name: 'www.audigent.com',
        ext: {
          segtax: '1',
          taxprovider: '1'
        },
        segment: [
          {
            id: 'pubseg1'
          },
          {
            id: 'pubseg2'
          }
        ]
      }

      config.setConfig({
        ortb2: {
          site: {
            content: {
              data: [setConfigSiteObj1]
            }
          }
        }
      });

      const rtdConfig = {
        params: {
          segmentCache: false,
          usePubHadron: true,
          requestParams: {
            publisherId: 'testPub1'
          }
        }
      };

      let bidConfig = {};

      const rtdUserObj1 = {
        name: 'www.audigent.com',
        ext: {
          segtax: '1',
          taxprovider: '1'
        },
        segment: [
          {
            id: 'pubseg1'
          },
          {
            id: 'pubseg2'
          }
        ]
      };

      const data = {
        rtd: {
          ortb2: {
            user: {
              data: [rtdUserObj1]
            }
          }
        }
      };

      getDataFromLocalStorageStub.withArgs(HALOID_LOCAL_NAME).returns('testHadronId1');
      getRealTimeData(bidConfig, () => {}, rtdConfig, {});

      let request = server.requests[0];
      let postData = JSON.parse(request.requestBody);
      expect(postData.config).to.have.deep.property('publisherId', 'testPub1');
      expect(postData.userIds).to.have.deep.property('hadronId', 'testHadronId1');

      request.respond(200, responseHeader, JSON.stringify(data));

      expect(config.getConfig().ortb2.user.data).to.deep.include.members([rtdUserObj1]);
    });
  });
});
