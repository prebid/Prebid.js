import {addPaapiConfig, addIGBuyer, isValid, newBidder, registerBidder} from 'src/adapters/bidderFactory.js';
import adapterManager from 'src/adapterManager.js';
import * as ajax from 'src/ajax.js';
import {expect} from 'chai';
import {userSync} from 'src/userSync.js';
import * as utils from 'src/utils.js';
import {config} from 'src/config.js';
import { EVENTS, DEBUG_MODE } from 'src/constants.js';
import * as events from 'src/events.js';
import {hook} from '../../../../src/hook.js';
import {auctionManager} from '../../../../src/auctionManager.js';
import {stubAuctionIndex} from '../../../helpers/indexStub.js';
import {bidderSettings} from '../../../../src/bidderSettings.js';
import {decorateAdUnitsWithNativeParams} from '../../../../src/native.js';
import * as activityRules from 'src/activities/rules.js';
import {MODULE_TYPE_BIDDER} from '../../../../src/activities/modules.js';
import {ACTIVITY_TRANSMIT_TID, ACTIVITY_TRANSMIT_UFPD} from '../../../../src/activities/activities.js';
import {getGlobal} from '../../../../src/prebidGlobal.js';

const CODE = 'sampleBidder';
const MOCK_BIDS_REQUEST = {
  bids: [
    {
      bidId: 1,
      adUnitCode: 'mock/placement',
      params: {
        param: 5
      },
    },
    {
      bidId: 2,
      adUnitCode: 'mock/placement2',
      params: {
        badParam: 6
      },
    }
  ]
}

before(() => {
  hook.ready();
});

const wrappedCallback = config.callbackWithBidder(CODE);

describe('bidderFactory', () => {
  let onTimelyResponseStub;

  beforeEach(() => {
    onTimelyResponseStub = sinon.stub();
  });

  describe('bidders created by newBidder', function () {
    let spec;
    let bidder;
    let addBidResponseStub;
    let doneStub;

    beforeEach(function () {
      spec = {
        code: CODE,
        isBidRequestValid: sinon.stub(),
        buildRequests: sinon.stub(),
        interpretResponse: sinon.stub(),
        getUserSyncs: sinon.stub()
      };

      addBidResponseStub = sinon.stub();
      addBidResponseStub.reject = sinon.stub();
      doneStub = sinon.stub();
    });

    describe('when the ajax response is irrelevant', function () {
      let sandbox;
      let ajaxStub;
      let getConfigSpy;
      let aliasRegistryStub, aliasRegistry;

      beforeEach(function () {
        sandbox = sinon.createSandbox();
        sandbox.stub(activityRules, 'isActivityAllowed').callsFake(() => true);
        ajaxStub = sandbox.stub(ajax, 'ajax');
        addBidResponseStub.resetHistory();
        getConfigSpy = sandbox.spy(config, 'getConfig');
        doneStub.resetHistory();
        aliasRegistry = {};
        aliasRegistryStub = sandbox.stub(adapterManager, 'aliasRegistry');
        aliasRegistryStub.get(() => aliasRegistry);
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('user syncs', () => {
        [
          {
            t: 'invalid alias, aliasSync enabled',
            alias: false,
            aliasSyncEnabled: true,
            shouldRegister: true
          },
          {
            t: 'valid alias, aliasSync enabled',
            alias: true,
            aliasSyncEnabled: true,
            shouldRegister: true
          },
          {
            t: 'invalid alias, aliasSync disabled',
            alias: false,
            aliasSyncEnabled: false,
            shouldRegister: true,
          },
          {
            t: 'valid alias, aliasSync disabled',
            alias: true,
            aliasSyncEnabled: false,
            shouldRegister: false
          }
        ].forEach(({t, alias, aliasSyncEnabled, shouldRegister}) => {
          describe(t, () => {
            it(shouldRegister ? 'should register sync' : 'should NOT register sync', () => {
              config.setConfig({
                userSync: {
                  aliasSyncEnabled
                }
              });
              spec.code = 'someBidder';
              if (alias) {
                aliasRegistry[spec.code] = 'original';
              }
              const bidder = newBidder(spec);
              bidder.callBids({ bids: [] }, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
              if (shouldRegister) {
                sinon.assert.called(spec.getUserSyncs);
              } else {
                sinon.assert.notCalled(spec.getUserSyncs);
              }
            });
          });
        });

        describe('getUserSyncs syncOptions', () => {
          [
            {
              t: 'all image allowed, specific bidder denied iframe',
              userSync: {
                syncEnabled: true,
                pixelEnabled: true,
                iframeEnabled: true,
                filterSettings: {
                  image: {
                    bidders: '*',
                    filter: 'include'
                  },
                  iframe: {
                    bidders: ['bidderB'],
                    filter: 'include'
                  }
                }
              },
              expected: {
                bidderA: {
                  iframeEnabled: false,
                  pixelEnabled: true
                },
                bidderB: {
                  iframeEnabled: true,
                  pixelEnabled: true,
                }
              }
            },
            {
              t: 'specific bidders allowed specific methods',
              userSync: {
                syncEnabled: true,
                pixelEnabled: true,
                iframeEnabled: true,
                filterSettings: {
                  image: {
                    bidders: ['bidderA'],
                    filter: 'include'
                  },
                  iframe: {
                    bidders: ['bidderB'],
                    filter: 'include'
                  }
                },
              },
              expected: {
                bidderA: {
                  iframeEnabled: false,
                  pixelEnabled: true
                },
                bidderB: {
                  iframeEnabled: true,
                  pixelEnabled: false,
                }
              }
            }
          ].forEach(({t, userSync, expected}) => {
            describe(`when ${t}`, () => {
              beforeEach(() => {
                config.setConfig({userSync});
              });

              Object.entries(expected).forEach(([bidderCode, syncOptions]) => {
                it(`should pass ${JSON.stringify(syncOptions)} to ${bidderCode}`, () => {
                  spec.code = bidderCode;
                  const bidder = newBidder(spec);
                  bidder.callBids({ bids: [] }, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
                  sinon.assert.calledWith(spec.getUserSyncs, syncOptions);
                })
              })
            })
          })
        })
      });

      describe('transaction IDs', () => {
        beforeEach(() => {
          activityRules.isActivityAllowed.resetHistory();
          ajaxStub.callsFake((_, callback) => callback.success(null, {getResponseHeader: sinon.stub()}));
          spec.interpretResponse.callsFake(() => [
            {
              requestId: 'bid',
              cpm: 123,
              ttl: 300,
              creativeId: 'crid',
              netRevenue: true,
              currency: 'USD'
            }
          ])
        });

        Object.entries({
          'be hidden': {
            allowed: false,
            checkBidderRequest(br) {
              expect(br.auctionId).to.not.exist;
            },
            checkBidRequest(br) {
              expect(br.auctionId).to.not.exist;
              expect(br.transactionId).to.not.exist;
            },
          },
          'be an alias to the bidder specific tid': {
            allowed: true,
            checkBidderRequest(br) {
              expect(br.auctionId).to.eql('bidder-tid');
            },
            checkBidRequest(br) {
              expect(br.auctionId).to.eql('bidder-tid');
              expect(br.transactionId).to.eql('bidder-ext-tid');
            },
          },
        }).forEach(([t, {allowed, checkBidderRequest, checkBidRequest}]) => {
          it(`should ${t} from the spec logic when the transmitTid activity is${allowed ? '' : ' not'} allowed`, () => {
            spec.isBidRequestValid.callsFake(br => {
              checkBidRequest(br);
              return true;
            });
            spec.buildRequests.callsFake((bidReqs, bidderReq) => {
              checkBidderRequest(bidderReq);
              bidReqs.forEach(checkBidRequest);
              return {method: 'POST'};
            });
            activityRules.isActivityAllowed.callsFake(() => allowed);

            const bidder = newBidder(spec);

            bidder.callBids({
              bidderCode: 'mockBidder',
              auctionId: 'aid',
              ortb2: {
                source: {
                  tid: 'bidder-tid'
                }
              },
              bids: [
                {
                  adUnitCode: 'mockAU',
                  bidId: 'bid',
                  transactionId: 'tid',
                  auctionId: 'aid',
                  ortb2: {
                    source: {
                      tid: 'bidder-tid'
                    },
                  },
                  ortb2Imp: {
                    ext: {
                      tid: 'bidder-ext-tid'
                    }
                  }
                }
              ]
            }, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

            sinon.assert.calledWithMatch(activityRules.isActivityAllowed, ACTIVITY_TRANSMIT_TID, {
              componentType: MODULE_TYPE_BIDDER,
              componentName: 'mockBidder'
            });
            sinon.assert.calledWithMatch(addBidResponseStub, sinon.match.any, {
              transactionId: 'tid',
              auctionId: 'aid'
            })
          });
        });

        it('should not be hidden from request methods', (done) => {
          const bidderRequest = {
            bidderCode: 'mockBidder',
            auctionId: 'aid',
            getAID() { return this.auctionId },
            bids: [
              {
                adUnitCode: 'mockAU',
                bidId: 'bid',
                transactionId: 'tid',
                auctionId: 'aid',
                getTIDs() {
                  return [this.auctionId, this.transactionId]
                }
              }
            ]
          };
          activityRules.isActivityAllowed.callsFake(() => false);
          spec.isBidRequestValid.returns(true);
          spec.buildRequests.callsFake((reqs, bidderReq) => {
            expect(bidderReq.getAID()).to.eql('aid');
            expect(reqs[0].getTIDs()).to.eql(['aid', 'tid']);
            done();
          });
          newBidder(spec).callBids(bidderRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
        })
      });

      it('should handle bad bid requests gracefully', function () {
        const bidder = newBidder(spec);

        spec.getUserSyncs.returns([]);

        bidder.callBids({});
        bidder.callBids({ bids: 'nothing useful' }, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(ajaxStub.called).to.equal(false);
        expect(spec.isBidRequestValid.called).to.equal(false);
        expect(spec.buildRequests.called).to.equal(false);
        expect(spec.interpretResponse.called).to.equal(false);
      });

      it('should call buildRequests(bidRequest) the params are valid', function () {
        const bidder = newBidder(spec);

        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns([]);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(ajaxStub.called).to.equal(false);
        expect(spec.isBidRequestValid.calledTwice).to.equal(true);
        expect(spec.buildRequests.calledOnce).to.equal(true);
        expect(spec.buildRequests.firstCall.args[0]).to.deep.equal(MOCK_BIDS_REQUEST.bids);
      });

      it('should not call buildRequests the params are invalid', function () {
        const bidder = newBidder(spec);

        spec.isBidRequestValid.returns(false);
        spec.buildRequests.returns([]);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(ajaxStub.called).to.equal(false);
        expect(spec.isBidRequestValid.calledTwice).to.equal(true);
        expect(spec.buildRequests.called).to.equal(false);
      });

      it('should filter out invalid bids before calling buildRequests', function () {
        const bidder = newBidder(spec);

        spec.isBidRequestValid.onFirstCall().returns(true);
        spec.isBidRequestValid.onSecondCall().returns(false);
        spec.buildRequests.returns([]);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(ajaxStub.called).to.equal(false);
        expect(spec.isBidRequestValid.calledTwice).to.equal(true);
        expect(spec.buildRequests.calledOnce).to.equal(true);
        expect(spec.buildRequests.firstCall.args[0]).to.deep.equal([MOCK_BIDS_REQUEST.bids[0]]);
      });

      it('should make no server requests if the spec doesn\'t return any', function () {
        const bidder = newBidder(spec);

        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns([]);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(ajaxStub.called).to.equal(false);
      });

      it('should make the appropriate POST request', function () {
        const bidder = newBidder(spec);
        const url = 'test.url.com';
        const data = { arg: 2 };
        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns({
          method: 'POST',
          url: url,
          data: data
        });

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(ajaxStub.calledOnce).to.equal(true);
        expect(ajaxStub.firstCall.args[0]).to.equal(url);
        expect(ajaxStub.firstCall.args[2]).to.equal(JSON.stringify(data));
        sinon.assert.match(ajaxStub.firstCall.args[3], {
          method: 'POST',
          contentType: 'text/plain',
          withCredentials: true
        });
      });

      it('should make the appropriate POST request when options are passed', function () {
        const bidder = newBidder(spec);
        const url = 'test.url.com';
        const data = { arg: 2 };
        const options = { contentType: 'application/json' };
        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns({
          method: 'POST',
          url: url,
          data: data,
          options: options
        });

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(ajaxStub.calledOnce).to.equal(true);
        expect(ajaxStub.firstCall.args[0]).to.equal(url);
        expect(ajaxStub.firstCall.args[2]).to.equal(JSON.stringify(data));
        sinon.assert.match(ajaxStub.firstCall.args[3], {
          method: 'POST',
          contentType: 'application/json',
          withCredentials: true
        })
      });

      it('should make the appropriate GET request', function () {
        const bidder = newBidder(spec);
        const url = 'test.url.com';
        const data = { arg: 2 };
        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns({
          method: 'GET',
          url: url,
          data: data
        });

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(ajaxStub.calledOnce).to.equal(true);
        expect(ajaxStub.firstCall.args[0]).to.equal(`${url}?arg=2`);
        expect(ajaxStub.firstCall.args[2]).to.be.undefined;
        sinon.assert.match(ajaxStub.firstCall.args[3], {
          method: 'GET',
          withCredentials: true
        })
      });

      it('should make the appropriate GET request when options are passed', function () {
        const bidder = newBidder(spec);
        const url = 'test.url.com';
        const data = { arg: 2 };
        const opt = { withCredentials: false }
        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns({
          method: 'GET',
          url: url,
          data: data,
          options: opt
        });

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(ajaxStub.calledOnce).to.equal(true);
        expect(ajaxStub.firstCall.args[0]).to.equal(`${url}?arg=2`);
        expect(ajaxStub.firstCall.args[2]).to.be.undefined;
        sinon.assert.match(ajaxStub.firstCall.args[3], {
          method: 'GET',
          withCredentials: false
        })
      });

      it('should make multiple calls if the spec returns them', function () {
        const bidder = newBidder(spec);
        const url = 'test.url.com';
        const data = { arg: 2 };
        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns([
          {
            method: 'POST',
            url: url,
            data: data
          },
          {
            method: 'GET',
            url: url,
            data: data
          }
        ]);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(ajaxStub.calledTwice).to.equal(true);
      });

      describe('browsingTopics ajax option', () => {
        let transmitUfpdAllowed, bidder, origBS;
        before(() => {
          origBS = getGlobal().bidderSettings;
        })

        after(() => {
          getGlobal().bidderSettings = origBS;
        });

        beforeEach(() => {
          activityRules.isActivityAllowed.resetHistory();
          activityRules.isActivityAllowed.callsFake((activity) => activity === ACTIVITY_TRANSMIT_UFPD ? transmitUfpdAllowed : true);
          bidder = newBidder(spec);
          spec.isBidRequestValid.returns(true);
        });

        it(`should be set to false when adapter sets browsingTopics = false`, () => {
          transmitUfpdAllowed = true;
          spec.buildRequests.returns([
            {
              method: 'GET',
              url: 'url',
              options: {
                browsingTopics: false
              }
            }
          ]);
          bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
          sinon.assert.calledWith(ajaxStub, 'url', sinon.match.any, sinon.match.any, sinon.match({
            browsingTopics: false,
            suppressTopicsEnrollmentWarning: true
          }));
        });

        Object.entries({
          'omitted': [undefined, true],
          'enabled': [true, true],
          'disabled': [false, false]
        }).forEach(([t, [topicsHeader, enabled]]) => {
          describe(`when bidderSettings.topicsHeader is ${t}`, () => {
            beforeEach(() => {
              getGlobal().bidderSettings = {
                [CODE]: {
                  topicsHeader: topicsHeader
                }
              }
            });

            afterEach(() => {
              delete getGlobal().bidderSettings[CODE];
            });

            Object.entries({
              'allowed': true,
              'not allowed': false
            }).forEach(([t, allow]) => {
              const shouldBeSet = allow && enabled;

              it(`should be set to ${shouldBeSet} when transmitUfpd is ${t}`, () => {
                transmitUfpdAllowed = allow;
                spec.buildRequests.returns([
                  {
                    method: 'GET',
                    url: '1',
                  },
                  {
                    method: 'POST',
                    url: '2',
                    data: {}
                  },
                  {
                    method: 'GET',
                    url: '3',
                    options: {
                      browsingTopics: true
                    }
                  },
                  {
                    method: 'POST',
                    url: '4',
                    data: {},
                    options: {
                      browsingTopics: true
                    }
                  }
                ]);
                bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
                ['1', '2', '3', '4'].forEach(url => {
                  sinon.assert.calledWith(
                    ajaxStub,
                    url,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match({browsingTopics: shouldBeSet, suppressTopicsEnrollmentWarning: true})
                  );
                });
              });
            });
          })
        })
      });

      it('should not add bids for each placement code if no requests are given', function () {
        const bidder = newBidder(spec);

        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns([]);
        spec.interpretResponse.returns([]);
        spec.getUserSyncs.returns([]);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(addBidResponseStub.callCount).to.equal(0);
      });

      it('should emit BEFORE_BIDDER_HTTP events before network requests', function () {
        const bidder = newBidder(spec);
        const req = {
          method: 'POST',
          url: 'test.url.com',
          data: { arg: 2 }
        };

        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns([req, req]);

        const eventEmitterSpy = sinon.spy(events, 'emit');
        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(ajaxStub.calledTwice).to.equal(true);
        expect(eventEmitterSpy.getCalls()
          .filter(call => call.args[0] === EVENTS.BEFORE_BIDDER_HTTP)
        ).to.length(2);

        eventEmitterSpy.restore();
      });
    });

    describe('when the ajax call succeeds', function () {
      let ajaxStub;
      let userSyncStub;
      let logErrorSpy;

      beforeEach(function () {
        ajaxStub = sinon.stub(ajax, 'ajax').callsFake(function(url, callbacks) {
          const fakeResponse = sinon.stub();
          fakeResponse.returns('headerContent');
          callbacks.success('response body', { getResponseHeader: fakeResponse });
        });
        addBidResponseStub.resetHistory();
        doneStub.resetBehavior();
        userSyncStub = sinon.stub(userSync, 'registerSync')
        logErrorSpy = sinon.spy(utils, 'logError');
      });

      afterEach(function () {
        ajaxStub.restore();
        userSyncStub.restore();
        utils.logError.restore();
      });

      it('should call onTimelyResponse', () => {
        const bidder = newBidder(spec);
        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns({method: 'POST', url: 'test', data: {}});
        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
        sinon.assert.called(onTimelyResponseStub);
      })

      it('should call spec.interpretResponse() with the response content', function () {
        const bidder = newBidder(spec);

        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns({
          method: 'POST',
          url: 'test.url.com',
          data: {}
        });
        spec.getUserSyncs.returns([]);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(spec.interpretResponse.calledOnce).to.equal(true);
        const response = spec.interpretResponse.firstCall.args[0]
        expect(response.body).to.equal('response body')
        expect(response.headers.get('some-header')).to.equal('headerContent');
        expect(spec.interpretResponse.firstCall.args[1]).to.deep.equal({
          method: 'POST',
          url: 'test.url.com',
          data: {}
        });
        expect(doneStub.calledOnce).to.equal(true);
      });

      it('should call spec.interpretResponse() once for each request made', function () {
        const bidder = newBidder(spec);

        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns([
          {
            method: 'POST',
            url: 'test.url.com',
            data: {}
          },
          {
            method: 'POST',
            url: 'test.url.com',
            data: {}
          },
        ]);
        spec.getUserSyncs.returns([]);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(spec.interpretResponse.calledTwice).to.equal(true);
        expect(doneStub.calledOnce).to.equal(true);
      });

      describe('when interpretResponse returns a bid', () => {
        let bid, bidderRequest;
        beforeEach(() => {
          bid = {
            creativeId: 'creative-id',
            requestId: '1',
            ad: 'ad-url.com',
            cpm: 0.5,
            height: 200,
            width: 300,
            adUnitCode: 'mock/placement',
            currency: 'USD',
            netRevenue: true,
            ttl: 300,
            bidderCode: 'sampleBidder',
            sampleBidder: {advertiserId: '12345', networkId: '111222'}
          }
          bidderRequest = utils.deepClone(MOCK_BIDS_REQUEST);
          bidderRequest.bids[0].bidder = 'sampleBidder';
        })

        function getAuctionBid() {
          const bidder = newBidder(spec);
          spec.isBidRequestValid.returns(true);
          spec.buildRequests.returns({
            method: 'POST',
            url: 'test.url.com',
            data: {}
          });
          spec.getUserSyncs.returns([]);
          spec.interpretResponse.returns(bid);
          bidder.callBids(bidderRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
          return addBidResponseStub.firstCall.args[1];
        }

        function setDeferredBilling(deferredBilling = true) {
          bidderRequest.bids.forEach(bid => { bid.deferBilling = deferredBilling });
        }

        it('should only add bids for valid adUnit code into the auction, even if the bidder doesn\'t bid on all of them', function () {
          const auctionBid = getAuctionBid();
          expect(addBidResponseStub.calledOnce).to.equal(true);
          expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
          // checking the fields added by our code
          expect(auctionBid.originalCpm).to.equal(bid.cpm);
          expect(auctionBid.originalCurrency).to.equal(bid.currency);
          expect(doneStub.calledOnce).to.equal(true);
          expect(logErrorSpy.callCount).to.equal(0);
          expect(auctionBid.meta).to.exist;
          expect(auctionBid.meta).to.deep.equal({advertiserId: '12345', networkId: '111222'});
        });

        describe('if request has deferBilling = true', () => {
          beforeEach(() => setDeferredBilling(true));

          it('should set response.deferBilling = true, regardless of what the adapter says', () => {
            bid.deferBilling = false;
            expect(getAuctionBid().deferBilling).to.be.true;
          });
          [
            {
              shouldDefer: true
            },
            {
              deferRendering: false,
              shouldDefer: false
            },
            {
              onBidBillable: true,
              shouldDefer: false,
            },
            {
              onBidBillable: true,
              deferRendering: true,
              shouldDefer: true
            }
          ].forEach(({onBidBillable, deferRendering, shouldDefer}) => {
            it(`sets response deferRendering = ${shouldDefer} when adapter ${onBidBillable ? 'supports' : 'does not support'} onBidBillable, and sayd deferRender = ${deferRendering}`, () => {
              if (onBidBillable) {
                spec.onBidBillable = sinon.stub();
              }
              bid.deferRendering = deferRendering;
              expect(getAuctionBid().deferRendering).to.equal(shouldDefer);
            });
          })
        });

        describe('if request has deferBilling = false', () => {
          beforeEach(() => setDeferredBilling(false));
          [true, false].forEach(deferredRender => {
            it(`should set deferRendering = false when adapter says deferRendering = ${deferredRender}`, () => {
              bid.deferRendering = deferredRender;
              expect(getAuctionBid().deferRendering).to.be.false;
            });
          });
        });
      })

      it('should call spec.getUserSyncs() with the response', function () {
        const bidder = newBidder(spec);

        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns({
          method: 'POST',
          url: 'test.url.com',
          data: {}
        });
        spec.getUserSyncs.returns([]);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(spec.getUserSyncs.calledOnce).to.equal(true);
        expect(spec.getUserSyncs.firstCall.args[1].length).to.equal(1);
        expect(spec.getUserSyncs.firstCall.args[1][0].body).to.equal('response body');
        expect(spec.getUserSyncs.firstCall.args[1][0].headers).to.have.property('get');
        expect(spec.getUserSyncs.firstCall.args[1][0].headers.get).to.be.a('function');
      });

      it('should register usersync pixels', function () {
        const bidder = newBidder(spec);

        spec.isBidRequestValid.returns(false);
        spec.buildRequests.returns([]);
        spec.getUserSyncs.returns([{
          type: 'iframe',
          url: 'usersync.com'
        }]);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(userSyncStub.called).to.equal(true);
        expect(userSyncStub.firstCall.args[0]).to.equal('iframe');
        expect(userSyncStub.firstCall.args[1]).to.equal(spec.code);
        expect(userSyncStub.firstCall.args[2]).to.equal('usersync.com');
      });

      it('should logError and reject bid when required bid response params are missing', function () {
        const bidder = newBidder(spec);

        const bid = {
          requestId: '1',
          ad: 'ad-url.com',
          cpm: 0.5,
          height: 200,
          width: 300,
          placementCode: 'mock/placement'
        };
        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns({
          method: 'POST',
          url: 'test.url.com',
          data: {}
        });
        spec.getUserSyncs.returns([]);

        spec.interpretResponse.returns(bid);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(logErrorSpy.calledOnce).to.equal(true);
        expect(addBidResponseStub.reject.calledOnce).to.be.true;
      });

      it('should logError and reject bid when required response params are undefined', function () {
        const bidder = newBidder(spec);

        const bid = {
          'ad': 'creative',
          'cpm': '1.99',
          'width': 300,
          'height': 250,
          'requestId': '1',
          'creativeId': 'some-id',
          'currency': undefined,
          'netRevenue': true,
          'ttl': 360
        };

        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns({
          method: 'POST',
          url: 'test.url.com',
          data: {}
        });
        spec.getUserSyncs.returns([]);

        spec.interpretResponse.returns(bid);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(logErrorSpy.calledOnce).to.equal(true);
        expect(addBidResponseStub.reject.calledOnce).to.be.true;
      });

      it('should require requestId from interpretResponse', () => {
        const bidder = newBidder(spec);
        const bid = {
          'ad': 'creative',
          'cpm': '1.99',
          'creativeId': 'some-id',
          'currency': 'USD',
          'netRevenue': true,
          'ttl': 360
        };
        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns({
          method: 'POST',
          url: 'test.url.com',
          data: {}
        });
        spec.getUserSyncs.returns([]);
        spec.interpretResponse.returns(bid);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(addBidResponseStub.called).to.be.false;
        expect(addBidResponseStub.reject.calledOnce).to.be.true;
      });
    });

    describe('when the ajax call fails', function () {
      let ajaxStub;
      let callBidderErrorStub;
      let eventEmitterStub;
      let xhrErrorMock;

      beforeEach(function () {
        xhrErrorMock = {
          status: 500,
          statusText: 'Internal Server Error'
        };
        ajaxStub = sinon.stub(ajax, 'ajax').callsFake(function(url, callbacks) {
          callbacks.error('ajax call failed.', xhrErrorMock);
        });
        callBidderErrorStub = sinon.stub(adapterManager, 'callBidderError');
        eventEmitterStub = sinon.stub(events, 'emit');
        addBidResponseStub.resetHistory();
        doneStub.resetHistory();
      });

      afterEach(function () {
        ajaxStub.restore();
        callBidderErrorStub.restore();
        eventEmitterStub.restore();
      });

      Object.entries({
        'timeouts': true,
        'other errors': false
      }).forEach(([t, timedOut]) => {
        it(`should ${timedOut ? 'NOT ' : ''}call onTimelyResponse on ${t}`, () => {
          Object.assign(xhrErrorMock, {timedOut});
          const bidder = newBidder(spec);
          spec.isBidRequestValid.returns(true);
          spec.buildRequests.returns({method: 'POST', url: 'test', data: {}});
          bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
          sinon.assert[timedOut ? 'notCalled' : 'called'](onTimelyResponseStub);
        })
      })

      it('should not spec.interpretResponse()', function () {
        const bidder = newBidder(spec);

        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns({
          method: 'POST',
          url: 'test.url.com',
          data: {}
        });
        spec.getUserSyncs.returns([]);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(spec.interpretResponse.called).to.equal(false);
        expect(doneStub.calledOnce).to.equal(true);
        expect(callBidderErrorStub.calledOnce).to.equal(true);
        expect(callBidderErrorStub.firstCall.args[0]).to.equal(CODE);
        expect(callBidderErrorStub.firstCall.args[1]).to.equal(xhrErrorMock);
        expect(callBidderErrorStub.firstCall.args[2]).to.equal(MOCK_BIDS_REQUEST);
        sinon.assert.calledWith(eventEmitterStub, EVENTS.BIDDER_ERROR, {
          error: xhrErrorMock,
          bidderRequest: MOCK_BIDS_REQUEST
        });
      });

      it('should not add bids for each adunit code into the auction', function () {
        const bidder = newBidder(spec);

        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns({
          method: 'POST',
          url: 'test.url.com',
          data: {}
        });
        spec.interpretResponse.returns([]);
        spec.getUserSyncs.returns([]);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(addBidResponseStub.callCount).to.equal(0);
        expect(doneStub.calledOnce).to.equal(true);
        expect(callBidderErrorStub.calledOnce).to.equal(true);
        expect(callBidderErrorStub.firstCall.args[0]).to.equal(CODE);
        expect(callBidderErrorStub.firstCall.args[1]).to.equal(xhrErrorMock);
        expect(callBidderErrorStub.firstCall.args[2]).to.equal(MOCK_BIDS_REQUEST);
        sinon.assert.calledWith(eventEmitterStub, EVENTS.BIDDER_ERROR, {
          error: xhrErrorMock,
          bidderRequest: MOCK_BIDS_REQUEST
        });
      });

      it('should call spec.getUserSyncs() with no responses', function () {
        const bidder = newBidder(spec);

        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns({
          method: 'POST',
          url: 'test.url.com',
          data: {}
        });
        spec.getUserSyncs.returns([]);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(spec.getUserSyncs.calledOnce).to.equal(true);
        expect(spec.getUserSyncs.firstCall.args[1]).to.deep.equal([]);
        expect(doneStub.calledOnce).to.equal(true);
        expect(callBidderErrorStub.calledOnce).to.equal(true);
        expect(callBidderErrorStub.firstCall.args[0]).to.equal(CODE);
        expect(callBidderErrorStub.firstCall.args[1]).to.equal(xhrErrorMock);
        expect(callBidderErrorStub.firstCall.args[2]).to.equal(MOCK_BIDS_REQUEST);
        sinon.assert.calledWith(eventEmitterStub, EVENTS.BIDDER_ERROR, {
          error: xhrErrorMock,
          bidderRequest: MOCK_BIDS_REQUEST
        });
      });

      it('should call spec.getUserSyncs() with no responses', function () {
        const bidder = newBidder(spec);

        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns({
          method: 'POST',
          url: 'test.url.com',
          data: {}
        });
        spec.getUserSyncs.returns([]);

        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(spec.getUserSyncs.calledOnce).to.equal(true);
        expect(spec.getUserSyncs.firstCall.args[1]).to.deep.equal([]);
        expect(doneStub.calledOnce).to.equal(true);
        expect(callBidderErrorStub.calledOnce).to.equal(true);
        expect(callBidderErrorStub.firstCall.args[0]).to.equal(CODE);
        expect(callBidderErrorStub.firstCall.args[1]).to.equal(xhrErrorMock);
        expect(callBidderErrorStub.firstCall.args[2]).to.equal(MOCK_BIDS_REQUEST);
        sinon.assert.calledWith(eventEmitterStub, EVENTS.BIDDER_ERROR, {
          error: xhrErrorMock,
          bidderRequest: MOCK_BIDS_REQUEST
        });
      });
    });
  });

  describe('registerBidder', function () {
    let registerBidAdapterStub;
    let aliasBidAdapterStub;

    beforeEach(function () {
      registerBidAdapterStub = sinon.stub(adapterManager, 'registerBidAdapter');
      aliasBidAdapterStub = sinon.stub(adapterManager, 'aliasBidAdapter');
    });

    afterEach(function () {
      registerBidAdapterStub.restore();
      aliasBidAdapterStub.restore();
    });

    function newEmptySpec() {
      return {
        code: CODE,
        isBidRequestValid: function() { },
        buildRequests: function() { },
        interpretResponse: function() { },
      };
    }

    it('should register a bidder with the adapterManager', function () {
      registerBidder(newEmptySpec());
      expect(registerBidAdapterStub.calledOnce).to.equal(true);
      expect(registerBidAdapterStub.firstCall.args[0]).to.have.property('callBids');
      expect(registerBidAdapterStub.firstCall.args[0].callBids).to.be.a('function');

      expect(registerBidAdapterStub.firstCall.args[1]).to.equal(CODE);
      expect(registerBidAdapterStub.firstCall.args[2]).to.be.undefined;
    });

    it('should register a bidder with the appropriate mediaTypes', function () {
      const thisSpec = Object.assign(newEmptySpec(), { supportedMediaTypes: ['video'] });
      registerBidder(thisSpec);
      expect(registerBidAdapterStub.calledOnce).to.equal(true);
      expect(registerBidAdapterStub.firstCall.args[2]).to.deep.equal({supportedMediaTypes: ['video']});
    });

    it('should register bidders with the appropriate aliases', function () {
      const thisSpec = Object.assign(newEmptySpec(), { aliases: ['foo', 'bar'] });
      registerBidder(thisSpec);

      expect(registerBidAdapterStub.calledThrice).to.equal(true);

      // Make sure our later calls don't override the bidder code from previous calls.
      expect(registerBidAdapterStub.firstCall.args[0].getBidderCode()).to.equal(CODE);
      expect(registerBidAdapterStub.secondCall.args[0].getBidderCode()).to.equal('foo')
      expect(registerBidAdapterStub.thirdCall.args[0].getBidderCode()).to.equal('bar')

      expect(registerBidAdapterStub.firstCall.args[1]).to.equal(CODE);
      expect(registerBidAdapterStub.secondCall.args[1]).to.equal('foo')
      expect(registerBidAdapterStub.thirdCall.args[1]).to.equal('bar')
    });

    it('should register alias with their gvlid', function() {
      const aliases = [
        {
          code: 'foo',
          gvlid: 1
        },
        {
          code: 'bar',
          gvlid: 2
        },
        {
          code: 'baz'
        }
      ]
      const thisSpec = Object.assign(newEmptySpec(), { aliases: aliases });
      registerBidder(thisSpec);

      expect(registerBidAdapterStub.getCall(1).args[0].getSpec().gvlid).to.equal(1);
      expect(registerBidAdapterStub.getCall(2).args[0].getSpec().gvlid).to.equal(2);
      expect(registerBidAdapterStub.getCall(3).args[0].getSpec().gvlid).to.equal(undefined);
    })

    it('should register alias with skipPbsAliasing', function() {
      const aliases = [
        {
          code: 'foo',
          skipPbsAliasing: true
        },
        {
          code: 'bar',
          skipPbsAliasing: false
        },
        {
          code: 'baz'
        }
      ]
      const thisSpec = Object.assign(newEmptySpec(), { aliases: aliases });
      registerBidder(thisSpec);

      expect(registerBidAdapterStub.getCall(1).args[0].getSpec().skipPbsAliasing).to.equal(true);
      expect(registerBidAdapterStub.getCall(2).args[0].getSpec().skipPbsAliasing).to.equal(false);
      expect(registerBidAdapterStub.getCall(3).args[0].getSpec().skipPbsAliasing).to.equal(undefined);
    })
  })

  describe('validate bid response: ', function () {
    let spec;
    let indexStub, adUnits, bidderRequests;
    let addBidResponseStub;
    let doneStub;
    let ajaxStub;
    let logErrorSpy;

    const bids = [{
      'ad': 'creative',
      'cpm': '1.99',
      'width': 300,
      'height': 250,
      'requestId': '1',
      'creativeId': 'some-id',
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 360
    }];

    beforeEach(function () {
      spec = {
        code: CODE,
        isBidRequestValid: sinon.stub(),
        buildRequests: sinon.stub(),
        interpretResponse: sinon.stub(),
      };

      spec.isBidRequestValid.returns(true);
      spec.buildRequests.returns({
        method: 'POST',
        url: 'test.url.com',
        data: {}
      });

      addBidResponseStub = sinon.stub();
      addBidResponseStub.reject = sinon.stub();
      doneStub = sinon.stub();
      ajaxStub = sinon.stub(ajax, 'ajax').callsFake(function(url, callbacks) {
        const fakeResponse = sinon.stub();
        fakeResponse.returns('headerContent');
        callbacks.success('response body', { getResponseHeader: fakeResponse });
      });
      logErrorSpy = sinon.spy(utils, 'logError');
      indexStub = sinon.stub(auctionManager, 'index');
      adUnits = [];
      bidderRequests = [];
      indexStub.get(() => stubAuctionIndex({adUnits: adUnits, bidderRequests: bidderRequests}))
    });

    afterEach(function () {
      ajaxStub.restore();
      logErrorSpy.restore();
      indexStub.restore();
    });

    if (FEATURES.NATIVE) {
      it('should add native bids that do have required assets', function () {
        adUnits = [{
          adUnitId: 'au',
          nativeParams: {
            title: {'required': true},
          }
        }]
        decorateAdUnitsWithNativeParams(adUnits);
        const bidRequest = {
          bids: [{
            bidId: '1',
            auctionId: 'first-bid-id',
            adUnitCode: 'mock/placement',
            adUnitId: 'au',
            params: {
              param: 5
            },
            mediaType: 'native',
          }]
        };

        const bids1 = Object.assign({},
          bids[0],
          {
            'mediaType': 'native',
            'native': {
              'title': 'Native Creative',
              'clickUrl': 'https://www.link.example',
            }
          }
        );

        const bidder = newBidder(spec);

        spec.interpretResponse.returns(bids1);
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(addBidResponseStub.calledOnce).to.equal(true);
        expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
        expect(logErrorSpy.callCount).to.equal(0);
      });

      it('should not add native bids that do not have required assets', function () {
        adUnits = [{
          transactionId: 'au',
          nativeParams: {
            title: {'required': true},
          },
        }];
        decorateAdUnitsWithNativeParams(adUnits);
        const bidRequest = {
          bids: [{
            bidId: '1',
            auctionId: 'first-bid-id',
            adUnitCode: 'mock/placement',
            transactionId: 'au',
            params: {
              param: 5
            },
            mediaType: 'native',
          }]
        };
        const bids1 = Object.assign({},
          bids[0],
          {
            bidderCode: CODE,
            mediaType: 'native',
            native: {
              title: undefined,
              clickUrl: 'https://www.link.example',
            }
          }
        );

        const bidder = newBidder(spec);
        spec.interpretResponse.returns(bids1);
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(addBidResponseStub.called).to.equal(false);
        expect(addBidResponseStub.reject.calledOnce).to.be.true;
        expect(logErrorSpy.calledWithMatch('Ignoring bid: Native bid missing some required properties.')).to.equal(true);
      });
    }

    it('should add bid when renderer is present on outstream bids', function () {
      adUnits = [{
        transactionId: 'au',
        mediaTypes: {
          video: {context: 'outstream'}
        }
      }]
      const bidRequest = {
        bids: [{
          bidId: '1',
          auctionId: 'first-bid-id',
          transactionId: 'au',
          adUnitCode: 'mock/placement',
          params: {
            param: 5
          },
        }]
      };

      const bids1 = Object.assign({},
        bids[0],
        {
          bidderCode: CODE,
          mediaType: 'video',
          renderer: {render: () => true, url: 'render.js'},
        }
      );

      const bidder = newBidder(spec);

      spec.interpretResponse.returns(bids1);
      bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.calledOnce).to.equal(true);
      expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
      expect(logErrorSpy.callCount).to.equal(0);
    });

    it('should add banner bids that have no width or height but single adunit size', function () {
      const bidRequest = {
        bids: [{
          bidder: CODE,
          bidId: '1',
          auctionId: 'first-bid-id',
          adUnitCode: 'mock/placement',
          params: {
            param: 5
          },
          sizes: [[300, 250]],
        }]
      };
      bidderRequests = [bidRequest];
      const bids1 = Object.assign({},
        bids[0],
        {
          width: undefined,
          height: undefined
        }
      );

      const bidder = newBidder(spec);

      spec.interpretResponse.returns(bids1);
      bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

      expect(addBidResponseStub.calledOnce).to.equal(true);
      expect(addBidResponseStub.firstCall.args[0]).to.equal('mock/placement');
      expect(logErrorSpy.callCount).to.equal(0);
    });

    it('should disregard auctionId/transactionId set by the adapter', () => {
      const bidderRequest = {
        bids: [{
          bidder: CODE,
          bidId: '1',
          auctionId: 'aid',
          transactionId: 'tid',
          adUnitCode: 'au',
        }]
      };
      const bidder = newBidder(spec);
      spec.interpretResponse.returns(Object.assign({}, bids[0], {transactionId: 'ignored', auctionId: 'ignored'}));
      bidder.callBids(bidderRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
      sinon.assert.calledWith(addBidResponseStub, sinon.match.any, sinon.match({
        transactionId: 'tid',
        auctionId: 'aid'
      }));
    })

    describe(' Check for alternateBiddersList ', function() {
      let bidRequest;
      let bids1;
      let logWarnSpy;
      let bidderSettingStub, aliasRegistryStub;
      let aliasRegistry;

      beforeEach(function () {
        bidRequest = {
          bids: [{
            bidId: '1',
            bidder: CODE,
            auctionId: 'first-bid-id',
            adUnitCode: 'mock/placement',
            transactionId: 'au',
          }]
        };

        bids1 = Object.assign({},
          bids[0],
          {
            bidderCode: 'validalternatebidder',
            adapterCode: 'knownadapter1'
          }
        );
        logWarnSpy = sinon.spy(utils, 'logWarn');
        bidderSettingStub = sinon.stub(bidderSettings, 'get');
        aliasRegistry = {};
        aliasRegistryStub = sinon.stub(adapterManager, 'aliasRegistry');
        aliasRegistryStub.get(() => aliasRegistry);
      });

      afterEach(function () {
        logWarnSpy.restore();
        bidderSettingStub.restore();
        aliasRegistryStub.restore();
      });

      it('should log warning when bidder is unknown and allowAlternateBidderCodes flag is false', function () {
        bidderSettingStub.returns(false);

        const bidder = newBidder(spec);
        spec.interpretResponse.returns(bids1);
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(addBidResponseStub.called).to.equal(false);
        expect(addBidResponseStub.reject.calledOnce).to.be.true;
        expect(logWarnSpy.callCount).to.equal(1);
      });

      it('should reject the bid, when allowAlternateBidderCodes flag is undefined (default should be false)', function () {
        bidderSettingStub.returns(undefined);

        const bidder = newBidder(spec);
        spec.interpretResponse.returns(bids1);
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(addBidResponseStub.called).to.equal(false);
        expect(addBidResponseStub.reject.calledOnce).to.be.true;
      });

      it('should log warning when the particular bidder is not specified in allowedAlternateBidderCodes and allowAlternateBidderCodes flag is true', function () {
        bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(true);
        bidderSettingStub.withArgs(CODE, 'allowedAlternateBidderCodes').returns(['invalidAlternateBidder02']);

        const bidder = newBidder(spec);
        spec.interpretResponse.returns(bids1);
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(addBidResponseStub.called).to.equal(false);
        expect(addBidResponseStub.reject.calledOnce).to.be.true;
        expect(logWarnSpy.callCount).to.equal(1);
      });

      it('should accept the bid, when allowedAlternateBidderCodes is empty and allowAlternateBidderCodes flag is true', function () {
        bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(true);
        bidderSettingStub.withArgs(CODE, 'allowedAlternateBidderCodes').returns();

        const bidder = newBidder(spec);
        spec.interpretResponse.returns(bids1);
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(addBidResponseStub.calledOnce).to.equal(true);
        expect(logWarnSpy.callCount).to.equal(0);
        expect(logErrorSpy.callCount).to.equal(0);
      });

      it('should accept the bid, when allowedAlternateBidderCodes is marked as * and allowAlternateBidderCodes flag is true', function () {
        bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(true);
        bidderSettingStub.withArgs(CODE, 'allowedAlternateBidderCodes').returns(['*']);

        const bidder = newBidder(spec);
        spec.interpretResponse.returns(bids1);
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(addBidResponseStub.calledOnce).to.equal(true);
        expect(logWarnSpy.callCount).to.equal(0);
        expect(logErrorSpy.callCount).to.equal(0);
      });

      it('should accept the bid, when allowedAlternateBidderCodes is marked as * (with space) and allowAlternateBidderCodes flag is true', function () {
        bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(true);
        bidderSettingStub.withArgs(CODE, 'allowedAlternateBidderCodes').returns([' * ']);

        const bidder = newBidder(spec);
        spec.interpretResponse.returns(bids1);
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(addBidResponseStub.calledOnce).to.equal(true);
        expect(logWarnSpy.callCount).to.equal(0);
        expect(logErrorSpy.callCount).to.equal(0);
      });

      it('should not accept the bid, when allowedAlternateBidderCodes is marked as empty array and allowAlternateBidderCodes flag is true', function () {
        bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(true);
        bidderSettingStub.withArgs(CODE, 'allowedAlternateBidderCodes').returns([]);

        const bidder = newBidder(spec);
        spec.interpretResponse.returns(bids1);
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(addBidResponseStub.called).to.equal(false);
        expect(addBidResponseStub.reject.calledOnce).to.be.true;
        expect(logWarnSpy.callCount).to.equal(1);
      });

      it('should accept the bid, when allowedAlternateBidderCodes contains bidder name and allowAlternateBidderCodes flag is true', function () {
        bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(true);
        bidderSettingStub.withArgs(CODE, 'allowedAlternateBidderCodes').returns(['validAlternateBidder']);

        const bidder = newBidder(spec);
        spec.interpretResponse.returns(bids1);
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(addBidResponseStub.called).to.equal(true);
        expect(logWarnSpy.callCount).to.equal(0);
        expect(logErrorSpy.callCount).to.equal(0);
      });

      it('should not accept the bid, when bidder is an alias but bidderSetting is missing for the bidder. It should fallback to standard setting and reject the bid', function () {
        bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(false);
        aliasRegistry = {'validAlternateBidder': CODE};

        const bidder = newBidder(spec);
        spec.interpretResponse.returns(bids1);
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(addBidResponseStub.called).to.equal(false);
        expect(logWarnSpy.callCount).to.equal(1);
        expect(addBidResponseStub.reject.calledOnce).to.be.true;
      });

      it('should not accept the bid, when bidderSetting is missing for the bidder. It should fallback to standard setting and reject the bid', function () {
        bidderSettingStub.withArgs(CODE, 'allowAlternateBidderCodes').returns(false);

        const bidder = newBidder(spec);
        spec.interpretResponse.returns(bids1);
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);

        expect(addBidResponseStub.called).to.equal(false);
        expect(addBidResponseStub.reject.calledOnce).to.be.true;
        expect(logWarnSpy.callCount).to.equal(1);
      });
    });

    describe('when interpretResponse returns BidderAuctionResponse', function() {
      const bidRequest = {
        auctionId: 'aid',
        bids: [{
          bidId: '1',
          bidder: CODE,
          auctionId: 'aid',
          adUnitCode: 'mock/placement',
          transactionId: 'au',
        }]
      };
      const paapiConfig = {
        bidId: '1',
        config: {
          foo: 'bar'
        },
        igb: {
          foo: 'bar'
        }
      }

      it('should unwrap bids', function() {
        const bidder = newBidder(spec);
        spec.interpretResponse.returns({
          bids: bids,
        });
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
        sinon.assert.calledWith(addBidResponseStub, 'mock/placement', sinon.match(bids[0]));
      });

      it('does not unwrap bids from a bid that happens to have a "bids" property', () => {
        const bidder = newBidder(spec);
        const bid = Object.assign({
          bids: ['a', 'b']
        }, bids[0]);
        spec.interpretResponse.returns(bid);
        bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
        sinon.assert.calledWith(addBidResponseStub, 'mock/placement', sinon.match(bid));
      })

      describe('when response has PAAPI config', function() {
        let paapiStub;

        function paapiHook(next, ...args) {
          paapiStub(...args);
        }

        function runBidder(response) {
          const bidder = newBidder(spec);
          spec.interpretResponse.returns(response);
          bidder.callBids(bidRequest, addBidResponseStub, doneStub, ajaxStub, onTimelyResponseStub, wrappedCallback);
        }

        before(() => {
          addPaapiConfig.before(paapiHook);
        });

        after(() => {
          addPaapiConfig.getHooks({hook: paapiHook}).remove();
        })

        beforeEach(function () {
          paapiStub = sinon.stub();
        });

        describe(`when response has paapi`, () => {
          it('should call paapi config hook with auction configs', function () {
            runBidder({
              bids: bids,
              paapi: [paapiConfig]
            });
            expect(paapiStub.calledOnce).to.equal(true);
            sinon.assert.calledWith(paapiStub, bidRequest.bids[0], paapiConfig);
            sinon.assert.calledWith(addBidResponseStub, 'mock/placement', sinon.match(bids[0]));
          });

          Object.entries({
            'missing': undefined,
            'an empty array': []
          }).forEach(([t, bids]) => {
            it(`should call paapi config hook with PAAPI configs even when bids is ${t}`, function () {
              runBidder({
                bids,
                paapi: [paapiConfig]
              });
              expect(paapiStub.calledOnce).to.be.true;
              sinon.assert.calledWith(paapiStub, bidRequest.bids[0], paapiConfig);
              expect(addBidResponseStub.calledOnce).to.equal(false);
            });
          });
        });
      });
    });
  });

  describe('bid response isValid', () => {
    describe('size check', () => {
      let req, index;

      beforeEach(() => {
        req = {
          ...MOCK_BIDS_REQUEST.bids[0],
          mediaTypes: {
            banner: {
              sizes: [[1, 2], [3, 4]]
            }
          }
        }
      });

      function mkResponse(props) {
        return Object.assign({
          requestId: req.bidId,
          cpm: 1,
          ttl: 60,
          creativeId: '123',
          netRevenue: true,
          currency: 'USD',
          mediaType: 'banner',
        }, props)
      }

      function checkValid(bid) {
        return isValid('au', bid, {index: stubAuctionIndex({bidRequests: [req]})});
      }

      it('should succeed when response has a size that was in request', () => {
        expect(checkValid(mkResponse({width: 3, height: 4}))).to.be.true;
      });

      describe('using w/hratio', () => {
        beforeEach(() => {
          req.ortb2Imp = {
            banner: {
              format: [{wratio: 1, hratio: 2}]
            }
          }
        })
        it('should accept wratio/hratio', () => {
          expect(checkValid(mkResponse({wratio: 1, hratio: 2}))).to.be.true;
        });
      });
    })
  });

  describe('gzip compression', () => {
    let sandbox;
    let gzipStub;
    let isGzipSupportedStub;
    let spec;
    let ajaxStub;
    let addBidResponseStub;
    let doneStub;
    let origBS;
    let getParameterByNameStub;
    let debugTurnedOnStub;
    let bidder;
    let url;
    let data;
    let endpointCompression;

    before(() => {
      origBS = getGlobal().bidderSettings;
    });

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      isGzipSupportedStub = sandbox.stub(utils, 'isGzipCompressionSupported');
      gzipStub = sandbox.stub(utils, 'compressDataWithGZip');
      spec = {
        code: CODE,
        isBidRequestValid: sinon.stub(),
        buildRequests: sinon.stub(),
        interpretResponse: sinon.stub(),
        getUserSyncs: sinon.stub()
      };

      ajaxStub = sandbox.stub(ajax, 'ajax').callsFake(function(url, callbacks) {
        const fakeResponse = sinon.stub();
        fakeResponse.returns('headerContent');
        callbacks.success('response body', { getResponseHeader: fakeResponse });
      });

      addBidResponseStub = sandbox.stub();
      addBidResponseStub.reject = sandbox.stub();
      doneStub = sandbox.stub();
      getParameterByNameStub = sandbox.stub(utils, 'getParameterByName');
      debugTurnedOnStub = sandbox.stub(utils, 'debugTurnedOn');
      bidder = newBidder(spec);
      url = 'https://test.url.com';
      data = { arg: 'value' };
      endpointCompression = true;
    });

    afterEach(() => {
      sandbox.restore();
      getGlobal().bidderSettings = origBS;
    });

    function runRequest() {
      return new Promise((resolve, reject) => {
        spec.isBidRequestValid.returns(true);
        spec.buildRequests.returns({
          method: 'POST',
          url: url,
          data: data,
          options: {
            endpointCompression
          }
        });
        bidder.callBids(MOCK_BIDS_REQUEST, addBidResponseStub, () => {
          resolve();
        }, ajaxStub, onTimelyResponseStub, wrappedCallback);
      })
    }

    it('should send a gzip compressed payload when gzip is supported and enabled', async function () {
      const compressedPayload = 'compressedData'; // Simulated compressed payload
      isGzipSupportedStub.returns(true);
      gzipStub.resolves(compressedPayload);
      getParameterByNameStub.withArgs(DEBUG_MODE).returns('false');
      debugTurnedOnStub.returns(false);

      await runRequest();
      expect(gzipStub.calledOnce).to.be.true;
      expect(gzipStub.calledWith(data)).to.be.true;
      expect(ajaxStub.calledOnce).to.be.true;
      expect(ajaxStub.firstCall.args[0]).to.include('gzip=1'); // Ensure the URL has gzip=1
      expect(ajaxStub.firstCall.args[2]).to.equal(compressedPayload); // Ensure compressed data is sent
    });

    it('should send the request normally if gzip is not supported', async () => {
      isGzipSupportedStub.returns(false);
      getParameterByNameStub.withArgs(DEBUG_MODE).returns('false');
      debugTurnedOnStub.returns(false);
      await runRequest();
      expect(gzipStub.called).to.be.false; // Should not call compression
      expect(ajaxStub.calledOnce).to.be.true;
      expect(ajaxStub.firstCall.args[0]).to.not.include('gzip=1'); // Ensure URL does not have gzip=1
      expect(ajaxStub.firstCall.args[2]).to.equal(JSON.stringify(data)); // Ensure original data is sent
    });

    it('should send uncompressed data if gzip is supported but disabled in request options', async function () {
      isGzipSupportedStub.returns(true);
      getParameterByNameStub.withArgs(DEBUG_MODE).returns('false');
      debugTurnedOnStub.returns(false);
      endpointCompression = false;
      await runRequest();
      expect(gzipStub.called).to.be.false;
      expect(ajaxStub.calledOnce).to.be.true;
      expect(ajaxStub.firstCall.args[0]).to.not.include('gzip=1'); // Ensure URL does not have gzip=1
      expect(ajaxStub.firstCall.args[2]).to.equal(JSON.stringify(data));
    });

    it('should NOT gzip when debugMode is enabled', async () => {
      getParameterByNameStub.withArgs(DEBUG_MODE).returns('true');
      debugTurnedOnStub.returns(true);
      isGzipSupportedStub.returns(true);
      await runRequest();

      expect(gzipStub.called).to.be.false;
      expect(ajaxStub.calledOnce).to.be.true;
      expect(ajaxStub.firstCall.args[0]).to.not.include('gzip=1');
      expect(ajaxStub.firstCall.args[2]).to.equal(JSON.stringify(data));
    });
  });
})
