import {expect} from 'chai';
import {config} from 'src/config.js';
import {getRefererInfo} from 'src/refererDetection.js';
import {processFpd, registerSubmodules, startAuctionHook, reset} from 'modules/fpdModule/index.js';
import * as enrichmentModule from 'modules/enrichmentFpdModule.js';
import * as validationModule from 'modules/validationFpdModule/index.js';
import {resetEnrichments} from 'modules/enrichmentFpdModule.js';
import {GreedyPromise} from '../../../src/utils/promise.js';

describe('the first party data module', function () {
  afterEach(function () {
    config.resetConfig();
  });

  describe('startAuctionHook', () => {
    const mockFpd = {
      global: {key: 'value'},
      bidder: {A: {bkey: 'bvalue'}}
    }
    beforeEach(() => {
      reset();
    });

    it('should run ortb2Fragments through fpd submodules', () => {
      registerSubmodules({
        name: 'test',
        processFpd: function () {
          return mockFpd;
        }
      });
      const req = {ortb2Fragments: {}};
      return new Promise((resolve) => startAuctionHook(resolve, req))
        .then(() => {
          expect(req.ortb2Fragments).to.eql(mockFpd);
        })
    });

    it('should work with fpd submodules that return promises', () => {
      registerSubmodules({
        name: 'test',
        processFpd: function () {
          return Promise.resolve(mockFpd);
        }
      });
      const req = {ortb2Fragments: {}};
      return new Promise((resolve) => {
        startAuctionHook(resolve, req);
      }).then(() => {
        expect(req.ortb2Fragments).to.eql(mockFpd);
      });
    });
  });

  describe('first party data intitializing', function () {
    let width;
    let widthStub;
    let height;
    let heightStub;
    let querySelectorStub;
    let canonical;
    let keywords;
    let lowEntropySuaStub;
    let highEntropySuaStub;

    before(function() {
      reset();
      registerSubmodules(enrichmentModule);
      registerSubmodules(validationModule);

      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      keywords = document.createElement('meta');
      keywords.name = 'keywords';
    });

    beforeEach(function() {
      resetEnrichments();
      querySelectorStub = sinon.stub(window.top.document, 'querySelector');
      querySelectorStub.withArgs("link[rel='canonical']").returns(canonical);
      querySelectorStub.withArgs("meta[name='keywords']").returns(keywords);
      widthStub = sinon.stub(window.top, 'innerWidth').get(function () {
        return width;
      });
      heightStub = sinon.stub(window.top, 'innerHeight').get(function () {
        return height;
      });
      lowEntropySuaStub = sinon.stub(enrichmentModule.sua, 'le').callsFake(() => null);
      highEntropySuaStub = sinon.stub(enrichmentModule.sua, 'he').callsFake(() => GreedyPromise.resolve());
    });

    afterEach(function() {
      widthStub.restore();
      heightStub.restore();
      querySelectorStub.restore();
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      keywords = document.createElement('meta');
      keywords.name = 'keywords';
      lowEntropySuaStub.restore();
      highEntropySuaStub.restore();
    });

    it('filters ortb2 data that is set', function () {
      const global = {
        user: {
          data: {},
          gender: 'f',
          age: 45
        },
        site: {
          content: {
            data: [{
              segment: {
                test: 1
              },
              name: 'foo'
            }, {
              segment: [{
                id: 'test'
              }, {
                id: 3
              }],
              name: 'bar'
            }]
          }
        },
        device: {
          w: 1,
          h: 1
        }
      };

      canonical.href = 'https://www.domain.com/path?query=12345';
      width = 1120;
      height = 750;

      return processFpd({global}).then(({global: validated}) => {
        expect(validated.site.ref).to.equal(getRefererInfo().ref || undefined);
        expect(validated.site.page).to.equal('https://www.domain.com/path?query=12345');
        expect(validated.site.domain).to.equal('domain.com');
        expect(validated.site.content.data).to.deep.equal([{segment: [{id: 'test'}], name: 'bar'}]);
        expect(validated.user.data).to.be.undefined;
        expect(validated.device).to.deep.to.equal({w: 1, h: 1});
        expect(validated.site.keywords).to.be.undefined;
      });
    });

    it('should not overwrite existing data with default settings', function () {
      const global = {
        site: {
          ref: 'https://referer.com'
        }
      };

      return processFpd({global}).then(({global: validated}) => {
        expect(validated.site.ref).to.equal('https://referer.com');
      });
    });

    it('should allow overwrite default data with setConfig', function () {
      const global = {
        site: {
          ref: 'https://referer.com'
        }
      };

      return processFpd({global}).then(({global: validated}) => {
        expect(validated.site.ref).to.equal('https://referer.com');
      });
    });

    it('should filter all data', function () {
      let global = {
        imp: [],
        site: {
          name: 123,
          domain: 456,
          page: 789,
          ref: 987,
          keywords: ['keywords'],
          search: 654,
          cat: 'cat',
          sectioncat: 'sectioncat',
          pagecat: 'pagecat',
          content: {
            data: [{
              name: 1,
              segment: []
            }]
          }
        },
        user: {
          yob: 'twenty',
          gender: 0,
          keywords: ['foobar'],
          data: ['test']
        },
        device: [800, 450],
        cur: {
          adServerCurrency: 'USD'
        }
      };
      config.setConfig({'firstPartyData': {skipEnrichments: true}});
      return processFpd({global}).then(({global: validated}) => {
        expect(validated).to.deep.equal({});
      });
    });

    it('should add enrichments but not alter any arbitrary ortb2 data', function () {
      let global = {
        site: {
          ext: {
            data: {
              inventory: ['value1']
            }
          }
        },
        user: {
          ext: {
            data: {
              visitor: ['value2']
            }
          }
        },
        cur: ['USD']
      };
      return processFpd({global}).then(({global: validated}) => {
        expect(validated.site.ref).to.equal(getRefererInfo().referer);
        expect(validated.site.ext.data).to.deep.equal({inventory: ['value1']});
        expect(validated.user.ext.data).to.deep.equal({visitor: ['value2']});
        expect(validated.cur).to.deep.equal(['USD']);
      })
    });

    it('should filter bidderConfig data', function () {
      let bidder = {
        bidderA: {
          site: {
            keywords: 'other',
            ref: 'https://domain.com'
          },
          user: {
            keywords: 'test',
            data: [{
              segment: [{id: 4}],
              name: 't'
            }]
          }
        }
      };

      return processFpd({bidder}).then(({bidder: validated}) => {
        expect(validated.bidderA).to.not.be.undefined;
        expect(validated.bidderA.user.data).to.be.undefined;
        expect(validated.bidderA.user.keywords).to.equal('test');
        expect(validated.bidderA.site.keywords).to.equal('other');
        expect(validated.bidderA.site.ref).to.equal('https://domain.com');
      })
    });

    it('should not filter bidderConfig data as it is valid', function () {
      let bidder = {
        bidderA: {
          site: {
            keywords: 'other',
            ref: 'https://domain.com'
          },
          user: {
            keywords: 'test',
            data: [{
              segment: [{id: 'data1_id'}],
              name: 'data1'
            }]
          }
        }
      };

      return processFpd({bidder}).then(({bidder: validated}) => {
        expect(validated.bidderA).to.not.be.undefined;
        expect(validated.bidderA.user.data).to.deep.equal([{segment: [{id: 'data1_id'}], name: 'data1'}]);
        expect(validated.bidderA.user.keywords).to.equal('test');
        expect(validated.bidderA.site.keywords).to.equal('other');
        expect(validated.bidderA.site.ref).to.equal('https://domain.com');
      });
    });

    it('should not set default values if skipEnrichments is turned on', function () {
      config.setConfig({'firstPartyData': {skipEnrichments: true}});

      let global = {
        site: {
          keywords: 'other'
        },
        user: {
          keywords: 'test',
          data: [{
            segment: [{id: 'data1_id'}],
            name: 'data1'
          }]
        }
      };

      return processFpd({global}).then(({global: validated}) => {
        expect(validated.device).to.be.undefined;
        expect(validated.site.ref).to.be.undefined;
        expect(validated.site.page).to.be.undefined;
        expect(validated.site.domain).to.be.undefined;
      });
    });

    it('should not validate ortb2 data if skipValidations is turned on', function () {
      config.setConfig({'firstPartyData': {skipValidations: true}});

      let global = {
        site: {
          keywords: 'other'
        },
        user: {
          keywords: 'test',
          data: [{
            segment: [{id: 'nonfiltered'}]
          }]
        }
      };

      return processFpd({global}).then(({global: validated}) => {
        expect(validated.user.data).to.deep.equal([{segment: [{id: 'nonfiltered'}]}]);
      });
    });
  });
});
