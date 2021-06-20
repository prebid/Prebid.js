import * as dgRtd from 'modules/dgkeywordRtdProvider.js';
import { cloneDeep } from 'lodash';
import { server } from 'test/mocks/xhr.js';
import { config } from 'src/config.js';

const DG_GET_KEYWORDS_TIMEOUT = 1950;
const IGNORE_SET_ORTB2 = true;
const DEF_CONFIG = {
  name: 'dgkeyword',
  waitForIt: true,
  params: {
    timeout: DG_GET_KEYWORDS_TIMEOUT,
  },
};
const DUMMY_RESPONSE_HEADER = { 'Content-Type': 'application/json' };
const DUMMY_RESPONSE = { s: ['s1', 's2'], t: ['t1', 't2'] };
const SUCCESS_RESULT = { opeaud: ['s1', 's2'], opectx: ['t1', 't2'] };
const SUCCESS_ORTB2 = {
  ortb2: {
    site: { keywords: SUCCESS_RESULT },
    user: { keywords: SUCCESS_RESULT },
  },
};

describe('Digital Garage Keyword Module', function () {
  it('should init and return always true', function () {
    expect(dgRtd.dgkeywordSubmodule.init()).to.equal(true);
  });

  describe('dgkeyword target test', function () {
    it('should have no target', function () {
      const adUnits_no_target = [
        {
          code: 'code1',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]],
            },
          },
          bids: [
            {
              bidder: 'dg',
              params: {
                placementId: 99999999,
              },
            },
            {
              bidder: 'dg2',
              params: {
                placementId: 99999998,
                dgkeyword: false,
              },
            },
            {
              bidder: 'dg3',
              params: {
                placementId: 99999997,
              },
            },
          ],
        },
        {
          code: 'code2',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]],
            },
          },
          bids: [
            {
              bidder: 'dg',
              params: {
                placementId: 99999996,
              },
            },
            {
              bidder: 'dg2',
              params: {
                placementId: 99999995,
              },
            },
            {
              bidder: 'dg3',
              params: {
                placementId: 99999994,
              },
            },
          ],
        },
      ];
      expect(dgRtd.getTargetBidderOfDgKeywords(adUnits_no_target)).an('array')
        .that.is.empty;
    });
    it('should have targets', function () {
      const adUnits_targets = [
        {
          code: 'code1',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]],
            },
          },
          bids: [
            {
              bidder: 'dg',
              params: {
                placementId: 99999999,
              },
            },
            {
              bidder: 'dg2',
              params: {
                placementId: 99999998,
                dgkeyword: true,
              },
            },
            {
              bidder: 'dg3',
              params: {
                placementId: 99999997,
                dgkeyword: false,
              },
            },
          ],
        },
        {
          code: 'code2',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]],
            },
          },
          bids: [
            {
              bidder: 'dg',
              params: {
                placementId: 99999996,
                dgkeyword: true,
              },
            },
            {
              bidder: 'dg2',
              params: {
                placementId: 99999995,
                dgkeyword: 'aa',
              },
            },
            {
              bidder: 'dg3',
              params: {
                placementId: 99999994,
                dgkeyword: true,
              },
            },
          ],
        },
      ];
      const targets = dgRtd.getTargetBidderOfDgKeywords(adUnits_targets);
      expect(targets[0].bidder).to.be.equal('dg2');
      expect(targets[0].params.placementId).to.be.equal(99999998);
      expect(targets[0].params.dgkeyword).to.be.an('undefined');
      expect(targets[1].bidder).to.be.equal('dg');
      expect(targets[1].params.placementId).to.be.equal(99999996);
      expect(targets[1].params.dgkeyword).to.be.an('undefined');
      expect(targets[2].bidder).to.be.equal('dg3');
      expect(targets[2].params.placementId).to.be.equal(99999994);
      expect(targets[2].params.dgkeyword).to.be.an('undefined');
    });
  });

  describe('get profile.', function () {
    const AD_UNITS = [
      {
        code: 'code1',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
          },
        },
        bids: [
          {
            bidder: 'dg',
            params: {
              placementId: 99999999,
            },
          },
          {
            bidder: 'dg2',
            params: {
              placementId: 99999998,
              dgkeyword: true,
            },
          },
          {
            bidder: 'dg3',
            params: {
              placementId: 99999997,
              dgkeyword: false,
            },
          },
        ],
      },
      {
        code: 'code2',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
          },
        },
        bids: [
          {
            bidder: 'dg',
            params: {
              placementId: 99999996,
              dgkeyword: true,
            },
          },
          {
            bidder: 'dg2',
            params: {
              placementId: 99999995,
              dgkeyword: 'aa',
            },
          },
          {
            bidder: 'dg3',
            params: {
              placementId: 99999994,
            },
          },
        ],
      },
    ];
    it('should get profiles error(404).', function (done) {
      let pbjs = cloneDeep(config);
      pbjs.adUnits = cloneDeep(AD_UNITS);
      let moduleConfig = cloneDeep(DEF_CONFIG);
      dgRtd.getDgKeywordsAndSet(
        pbjs,
        () => {
          let targets = pbjs.adUnits[0].bids;
          expect(targets[1].bidder).to.be.equal('dg2');
          expect(targets[1].params.placementId).to.be.equal(99999998);
          expect(targets[1].params.dgkeyword).to.be.an('undefined');
          expect(targets[1].params.keywords).to.be.an('undefined');
          targets = pbjs.adUnits[1].bids;
          expect(targets[0].bidder).to.be.equal('dg');
          expect(targets[0].params.placementId).to.be.equal(99999996);
          expect(targets[0].params.dgkeyword).to.be.an('undefined');
          expect(targets[0].params.keywords).to.be.an('undefined');
          expect(targets[2].bidder).to.be.equal('dg3');
          expect(targets[2].params.placementId).to.be.equal(99999994);
          expect(targets[2].params.dgkeyword).to.be.an('undefined');
          expect(targets[2].params.keywords).to.be.an('undefined');

          expect(pbjs.getBidderConfig()).to.be.deep.equal({});

          done();
        },
        moduleConfig,
        null
      );
      const request = server.requests[0];
      request.respond(404);
    });
    it('should get profiles timeout.', function (done) {
      let pbjs = cloneDeep(config);
      pbjs.adUnits = cloneDeep(AD_UNITS);
      let moduleConfig = cloneDeep(DEF_CONFIG);
      moduleConfig.params.timeout = 10;
      dgRtd.getDgKeywordsAndSet(
        pbjs,
        () => {
          let targets = pbjs.adUnits[0].bids;
          expect(targets[1].bidder).to.be.equal('dg2');
          expect(targets[1].params.placementId).to.be.equal(99999998);
          expect(targets[1].params.dgkeyword).to.be.an('undefined');
          expect(targets[1].params.keywords).to.be.an('undefined');
          targets = pbjs.adUnits[1].bids;
          expect(targets[0].bidder).to.be.equal('dg');
          expect(targets[0].params.placementId).to.be.equal(99999996);
          expect(targets[0].params.dgkeyword).to.be.an('undefined');
          expect(targets[0].params.keywords).to.be.an('undefined');
          expect(targets[2].bidder).to.be.equal('dg3');
          expect(targets[2].params.placementId).to.be.equal(99999994);
          expect(targets[2].params.dgkeyword).to.be.an('undefined');
          expect(targets[2].params.keywords).to.be.an('undefined');

          expect(pbjs.getBidderConfig()).to.be.deep.equal({});

          done();
        },
        moduleConfig,
        null
      );
      setTimeout(() => {
        const request = server.requests[0];
        if (request) {
          request.respond(
            200,
            DUMMY_RESPONSE_HEADER,
            JSON.stringify(DUMMY_RESPONSE)
          );
        }
      }, 1000);
    });
    it('should get profiles ok(200).', function (done) {
      let pbjs = cloneDeep(config);
      pbjs.adUnits = cloneDeep(AD_UNITS);
      if (IGNORE_SET_ORTB2) {
        pbjs._ignoreSetOrtb2 = true;
      }
      let moduleConfig = cloneDeep(DEF_CONFIG);
      dgRtd.getDgKeywordsAndSet(
        pbjs,
        () => {
          let targets = pbjs.adUnits[0].bids;
          expect(targets[1].bidder).to.be.equal('dg2');
          expect(targets[1].params.placementId).to.be.equal(99999998);
          expect(targets[1].params.dgkeyword).to.be.an('undefined');
          expect(targets[1].params.keywords).to.be.deep.equal(SUCCESS_RESULT);
          targets = pbjs.adUnits[1].bids;
          expect(targets[0].bidder).to.be.equal('dg');
          expect(targets[0].params.placementId).to.be.equal(99999996);
          expect(targets[0].params.dgkeyword).to.be.an('undefined');
          expect(targets[0].params.keywords).to.be.deep.equal(SUCCESS_RESULT);
          expect(targets[2].bidder).to.be.equal('dg3');
          expect(targets[2].params.placementId).to.be.equal(99999994);
          expect(targets[2].params.dgkeyword).to.be.an('undefined');
          expect(targets[2].params.keywords).to.be.an('undefined');

          if (!IGNORE_SET_ORTB2) {
            expect(pbjs.getBidderConfig()).to.be.deep.equal({
              dg2: SUCCESS_ORTB2,
              dg: SUCCESS_ORTB2,
            });
          }
          done();
        },
        moduleConfig,
        null
      );
      const request = server.requests[0];
      request.respond(
        200,
        DUMMY_RESPONSE_HEADER,
        JSON.stringify(DUMMY_RESPONSE)
      );
    });
  });
});
