import * as dgRtd from '../../../modules/dgkeywordRtdProvider.js';
import { cloneDeep } from 'lodash';
import { server } from 'test/mocks/xhr.js';
import { getGlobal } from '../../../src/prebidGlobal.js';

const DG_GET_KEYWORDS_TIMEOUT = 1950;
const DG_TEST_URL = 'http://testNotExistsUrl.comm';
const DEF_CONFIG = {
  name: 'dgkeyword',
  waitForIt: true,
  params: {
    timeout: DG_GET_KEYWORDS_TIMEOUT,
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
              dgkeyword: true,
            },
          },
        ],
      },
    ];
    describe('should get profiles error.', function () {
      it('should get profiles error.', function (done) {
        let pdjs = getGlobal();
        pbjs.adUnits = cloneDeep(AD_UNITS);
        let config = cloneDeep(DEF_CONFIG);
        config.params.url = DG_TEST_URL;
        dgRtd.getDgKeywordsAndSet(
          pdjs,
          () => {
            let targets = pbjs.adUnits[0].bids;
            expect(targets[1].bidder).to.be.equal('dg2');
            expect(targets[1].params.placementId).to.be.equal(99999998);
            expect(targets[1].params.dgkeyword).to.be.an('undefined');
            targets = pbjs.adUnits[1].bids;
            expect(targets[0].bidder).to.be.equal('dg');
            expect(targets[0].params.placementId).to.be.equal(99999996);
            expect(targets[0].params.dgkeyword).to.be.an('undefined');
            expect(targets[2].bidder).to.be.equal('dg3');
            expect(targets[2].params.placementId).to.be.equal(99999994);
            expect(targets[2].params.dgkeyword).to.be.an('undefined');
            done();
          },
          config,
          null
        );
      });
    });
    describe('should get profiles timeout.', function () {
      it('should get profiles timeout.', function (done) {
        let pdjs = getGlobal();
        pbjs.adUnits = cloneDeep(AD_UNITS);
        let config = cloneDeep(DEF_CONFIG);
        config.params.timeout = 1;
        config.params.url = DG_TEST_URL;
        dgRtd.getDgKeywordsAndSet(
          pdjs,
          () => {
            let targets = pbjs.adUnits[0].bids;
            expect(targets[1].bidder).to.be.equal('dg2');
            expect(targets[1].params.placementId).to.be.equal(99999998);
            expect(targets[1].params.dgkeyword).to.be.an('undefined');
            targets = pbjs.adUnits[1].bids;
            expect(targets[0].bidder).to.be.equal('dg');
            expect(targets[0].params.placementId).to.be.equal(99999996);
            expect(targets[0].params.dgkeyword).to.be.an('undefined');
            expect(targets[2].bidder).to.be.equal('dg3');
            expect(targets[2].params.placementId).to.be.equal(99999994);
            expect(targets[2].params.dgkeyword).to.be.an('undefined');
            done();
          },
          config,
          null
        );
      });
    });
  });
});
