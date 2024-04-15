import {defaultHandler, GenericAnalytics} from '../../../modules/genericAnalyticsAdapter.js';
import * as events from 'src/events.js';
import {EVENTS} from 'src/constants.js';

const {AUCTION_INIT, BID_RESPONSE} = EVENTS;

describe('Generic analytics', () => {
  describe('adapter', () => {
    let adapter, sandbox, clock;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      sandbox.stub(events, 'getEvents').returns([]);
      clock = sandbox.useFakeTimers();
      adapter = new GenericAnalytics();
    });

    afterEach(() => {
      adapter.disableAnalytics();
      sandbox.restore();
    });

    describe('configuration', () => {
      it('should be accepted if valid', () => {
        adapter.enableAnalytics({
          options: {
            url: 'mock',
            method: 'GET',
            batchSize: 123,
            batchDelay: 321
          }
        });
        expect(adapter.enabled).to.be.true;
      });

      describe('should not work if', () => {
        afterEach(function() {
          expect(adapter.enabled).to.equal(false, this.currentTest.title);
        });

        it('neither handler nor url are specified', () => {
          adapter.enableAnalytics({});
        });

        ['batchSize', 'batchDelay', 'handler'].forEach(option => {
          it(`${option} is not valid`, () => {
            adapter.enableAnalytics({
              options: {
                url: 'mock',
                [option]: false
              }
            });
          });
        });

        it('method is not GET or POST', () => {
          adapter.enableAnalytics({
            options: {
              url: 'mock',
              method: 'PATCH'
            }
          });
        });

        it('events is not an object', () => {
          adapter.enableAnalytics({
            options: {
              url: 'mock',
              events: null
            }
          });
        });

        it('events\' properties are not functions', () => {
          adapter.enableAnalytics({
            options: {
              url: 'mock',
              events: {
                mockEvent: null
              }
            }
          });
        });
      });
    });

    describe('when handler is specified', () => {
      let handler;
      beforeEach(() => {
        handler = sinon.stub();
      });

      it('should collect events in batches, and call handler', () => {
        adapter.enableAnalytics({
          options: {
            handler,
            batchSize: 2
          }
        });
        events.emit(AUCTION_INIT, {i: 0});
        sinon.assert.notCalled(handler);
        events.emit(BID_RESPONSE, {i: 0});
        sinon.assert.calledWith(handler, sinon.match((arg) => {
          return sinon.match({eventType: AUCTION_INIT, args: {i: 0}}).test(arg[0]) &&
            sinon.match({eventType: BID_RESPONSE, args: {i: 0}}).test(arg[1]);
        }));
      });

      it('should not choke if handler throws', () => {
        adapter.enableAnalytics({
          options: {
            handler,
            batchSize: 1
          }
        });
        handler.throws(new Error());
        events.emit(AUCTION_INIT, {i: 0});
        let recv;
        handler.reset();
        handler.callsFake((arg) => {
          recv = arg;
        });
        events.emit(BID_RESPONSE, {i: 1});
        expect(recv).to.eql([{eventType: BID_RESPONSE, args: {i: 1}}]);
      });

      it('should not cause infinite recursion, if handler triggers more events', () => {
        let i = 0;
        handler.callsFake(() => {
          if (i <= 100) {
            i++;
            events.emit(BID_RESPONSE, {});
          }
        });
        adapter.enableAnalytics({
          options: {
            handler,
          }
        });
        events.emit(AUCTION_INIT, {});
        expect(i >= 100).to.be.false;
      });

      it('should send incomplete batch after batchDelay', () => {
        adapter.enableAnalytics({
          options: {
            batchDelay: 100,
            batchSize: 2,
            handler
          }
        });
        [0, 1, 2].forEach(i => events.emit(BID_RESPONSE, {i}));
        sinon.assert.calledOnce(handler);
        clock.tick(100);
        sinon.assert.calledTwice(handler);
      });

      it('does not send empty batches', () => {
        adapter.enableAnalytics({
          options: {
            batchDelay: 100,
            batchSize: 2,
            handler
          }
        });
        [0, 1, 2].forEach(i => events.emit(BID_RESPONSE, {i}));
        sinon.assert.calledOnce(handler);
        clock.tick(50);
        events.emit(BID_RESPONSE, {i: 3});
        sinon.assert.calledTwice(handler);
        clock.tick(100);
        sinon.assert.calledTwice(handler);
      });

      describe('and options.events is specified', () => {
        it('filters out other events', () => {
          adapter.enableAnalytics({
            options: {
              handler,
              events: {
                bidResponse(bid) {
                  return bid;
                }
              }
            }
          });
          events.emit(AUCTION_INIT, {});
          sinon.assert.notCalled(handler);
        });

        it('transforms event data', () => {
          adapter.enableAnalytics({
            options: {
              handler,
              events: {
                bidResponse(bid) {
                  return {
                    extra: 'data',
                    prop: bid.prop
                  }
                }
              }
            }
          });
          events.emit(BID_RESPONSE, {prop: 'value', i: 0});
          sinon.assert.calledWith(handler, sinon.match(data => sinon.match({extra: 'data', prop: 'value'}).test(data[0])));
        });

        it('does not choke if an event handler throws', () => {
          adapter.enableAnalytics({
            options: {
              handler,
              events: {
                bidResponse(bid) {
                  return bid;
                },
                auctionInit(auction) {
                  throw new Error();
                }
              }
            }
          });
          events.emit(AUCTION_INIT, {});
          events.emit(BID_RESPONSE, {i: 0});
          sinon.assert.calledOnce(handler);
          sinon.assert.calledWith(handler, sinon.match(data => sinon.match({i: 0}).test(data[0])));
        });

        it('filters out events when their handler returns undefined', () => {
          adapter.enableAnalytics({
            options: {
              handler,
              events: {
                auctionInit(auction) {
                  return auction;
                },
                bidResponse(bid) {}
              }
            }
          });
          events.emit(AUCTION_INIT, {i: 0});
          events.emit(BID_RESPONSE, {i: 1});
          sinon.assert.calledOnce(handler);
          sinon.assert.calledWith(handler, sinon.match(data => sinon.match({i: 0}).test(data[0])));
        });
      });
    });
  });

  describe('default handler', () => {
    const url = 'mock-url';

    let ajax;
    beforeEach(() => {
      ajax = sinon.stub();
    });

    Object.entries({
      'GET': (data) => JSON.parse(data.data),
      'POST': (data) => JSON.parse(data)
    }).forEach(([method, parse]) => {
      describe(`when HTTP method is ${method}`, () => {
        it('should send single event when batchSize is 1', () => {
          const handler = defaultHandler({url, method, batchSize: 1, ajax});
          const payload = {i: 0};
          handler([payload, {}]);
          sinon.assert.calledWith(ajax, url, sinon.match.any,
            sinon.match(data => sinon.match(payload).test(parse(data))),
            {method}
          );
        });

        it('should send multiple events when batchSize is greater than 1', () => {
          const handler = defaultHandler({url, method, batchSize: 10, ajax});
          const payload = [{i: 0}, {i: 1}];
          handler(payload);
          sinon.assert.calledWith(ajax, url, sinon.match.any,
            sinon.match(data => sinon.match(payload).test(parse(data))),
            {method}
          );
        });
      });
    });
  });
});
