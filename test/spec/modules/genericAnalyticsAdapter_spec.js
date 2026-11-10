import { defaultHandler, GenericAnalytics } from '../../../modules/genericAnalyticsAdapter.js';
import * as events from 'src/events.js';
import { EVENTS } from 'src/constants.js';
import { submodule } from 'src/hook.js';
import { setDebounceDelay } from 'libraries/analyticsAdapter/AnalyticsAdapter.js';

const { AUCTION_INIT, AUCTION_END, BID_RESPONSE } = EVENTS;

submodule('genericAnalytics', 'mockPreset', {
  auctionInit(auction) {
    return { preset: 'auctionInit', i: auction.i };
  },
  bidResponse(bid) {
    return { preset: 'bidResponse', i: bid.i };
  }
});

describe('Generic analytics', () => {
  describe('adapter', () => {
    let adapter, sandbox, clock;
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(events, 'getEvents').returns([]);
      clock = sandbox.useFakeTimers();
      adapter = new GenericAnalytics();
    });

    afterEach(() => {
      adapter.disableAnalytics();
      sandbox.restore();
      clock.runAll();
      clock.restore();
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

      it('should not depend on options.hasOwnProperty', () => {
        const nullPrototypeOptions = Object.assign(Object.create(null), {
          url: 'mock',
          method: 'GET'
        });
        adapter.enableAnalytics({ options: nullPrototypeOptions });
        expect(adapter.enabled).to.be.true;

        adapter.disableAnalytics();
        adapter.enableAnalytics({
          options: {
            url: 'mock',
            method: 'GET',
            hasOwnProperty: null
          }
        });
        expect(adapter.enabled).to.be.true;
      });

      it('should still validate options after being disabled', () => {
        adapter.enableAnalytics({ options: {} });
        expect(adapter.enabled).to.be.false;
        adapter.disableAnalytics();
        adapter.enableAnalytics({ options: {} });
        expect(adapter.enabled).to.be.false;
      });

      [123, [123, 456]].forEach(gvlid => {
        it(`should accept gvlid ${JSON.stringify(gvlid)}`, () => {
          const config = { options: { url: 'mock', gvlid } };
          adapter.enableAnalytics(config);
          expect(adapter.enabled).to.be.true;
          expect(adapter.gvlid(config)).to.eql(gvlid);
        });
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

        Object.entries({
          'a string': '123',
          'an empty array': [],
          'an array with non-numbers': [123, '456'],
        }).forEach(([t, gvlid]) => {
          it(`gvlid is ${t}`, () => {
            adapter.enableAnalytics({
              options: {
                url: 'mock',
                gvlid
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

        it('preset is not a string', () => {
          adapter.enableAnalytics({
            options: {
              url: 'mock',
              preset: 123
            }
          });
        });

        it('preset is not available', () => {
          adapter.enableAnalytics({
            options: {
              url: 'mock',
              preset: 'missing'
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
        events.emit(AUCTION_INIT, { i: 0 });
        sinon.assert.notCalled(handler);
        events.emit(BID_RESPONSE, { i: 0 });
        sinon.assert.calledWith(handler, sinon.match((arg) => {
          return sinon.match({ eventType: AUCTION_INIT, args: { i: 0 } }).test(arg[0]) &&
            sinon.match({ eventType: BID_RESPONSE, args: { i: 0 } }).test(arg[1]);
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
        events.emit(AUCTION_INIT, { i: 0 });
        let recv;
        handler.resetHistory();
        handler.resetBehavior();
        handler.callsFake((arg) => {
          recv = arg;
        });
        events.emit(BID_RESPONSE, { i: 1 });
        sinon.assert.match(recv, [sinon.match({ eventType: BID_RESPONSE, args: { i: 1 } })]);
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
        [0, 1, 2].forEach(i => events.emit(BID_RESPONSE, { i }));
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
        [0, 1, 2].forEach(i => events.emit(BID_RESPONSE, { i }));
        sinon.assert.calledOnce(handler);
        clock.tick(50);
        events.emit(BID_RESPONSE, { i: 3 });
        sinon.assert.calledTwice(handler);
        clock.tick(100);
        sinon.assert.calledTwice(handler);
      });

      it('does not send a pending batch after being disabled', () => {
        adapter.enableAnalytics({
          options: {
            batchDelay: 100,
            batchSize: 10,
            handler
          }
        });
        events.emit(BID_RESPONSE, { i: 0 });
        adapter.disableAnalytics();
        clock.tick(100);
        sinon.assert.notCalled(handler);
      });

      describe('with production event handling (debounce delay and real event history)', () => {
        let previousDelay;
        before(() => {
          previousDelay = setDebounceDelay(100);
        });
        after(() => setDebounceDelay(previousDelay));

        beforeEach(() => {
          events.clearEvents();
          events.getEvents.resetBehavior();
          events.getEvents.callThrough();
        });

        function enable(eventHandler = handler) {
          adapter.enableAnalytics({
            options: {
              batchDelay: 100,
              batchSize: 10,
              handler: eventHandler
            }
          });
        }

        const sentIds = (stub) => stub.getCalls().flatMap(call => call.args[0].map(event => event.args.i));

        it('does not send events still queued by the base adapter after being disabled', () => {
          enable();
          events.emit(BID_RESPONSE, { i: 0 });
          adapter.disableAnalytics();
          clock.tick(500);
          sinon.assert.notCalled(handler);
        });

        it('does not send events queued before being disabled once re-enabled', () => {
          enable();
          events.emit(BID_RESPONSE, { i: 0 });
          expect(events.getEvents().length).to.equal(1); // re-enabling replays from the real history
          adapter.disableAnalytics();
          const newHandler = sinon.stub();
          enable(newHandler);
          events.emit(BID_RESPONSE, { i: 1 });
          clock.tick(500);
          sinon.assert.notCalled(handler);
          expect(sentIds(newHandler)).to.eql([1]);
        });

        it('discards batched and queued events alike when disabled', () => {
          enable();
          events.emit(BID_RESPONSE, { i: 'batched' });
          clock.tick(100); // the base adapter hands it to track(), which adds it to the batch
          events.emit(BID_RESPONSE, { i: 'queued' }); // still waiting in the base adapter's queue
          clock.tick(50);
          adapter.disableAnalytics();
          const newHandler = sinon.stub();
          enable(newHandler);
          events.emit(BID_RESPONSE, { i: 'new' });
          clock.tick(500);
          sinon.assert.notCalled(handler);
          expect(sentIds(newHandler)).to.eql(['new']);
        });

        it('does not send an event whose own dispatch disabled the adapter', () => {
          const disable = () => adapter.disableAnalytics();
          events.on(BID_RESPONSE, disable); // registered first, so it runs before the adapter's listener
          try {
            enable();
            events.emit(BID_RESPONSE, { i: 0 });
          } finally {
            events.off(BID_RESPONSE, disable);
          }
          clock.tick(500);
          sinon.assert.notCalled(handler);
        });
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
                  };
                }
              }
            }
          });
          events.emit(BID_RESPONSE, { prop: 'value', i: 0 });
          sinon.assert.calledWith(handler, sinon.match(data => sinon.match({ extra: 'data', prop: 'value' }).test(data[0])));
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
          events.emit(BID_RESPONSE, { i: 0 });
          sinon.assert.calledOnce(handler);
          sinon.assert.calledWith(handler, sinon.match(data => sinon.match({ i: 0 }).test(data[0])));
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
          events.emit(AUCTION_INIT, { i: 0 });
          events.emit(BID_RESPONSE, { i: 1 });
          sinon.assert.calledOnce(handler);
          sinon.assert.calledWith(handler, sinon.match(data => sinon.match({ i: 0 }).test(data[0])));
        });
      });

      describe('and options.preset is specified', () => {
        it('accepts an available preset', () => {
          adapter.enableAnalytics({
            options: {
              handler,
              preset: 'mockPreset'
            }
          });
          expect(adapter.enabled).to.be.true;
        });

        it('formats event data using the preset', () => {
          adapter.enableAnalytics({
            options: {
              handler,
              batchSize: 2,
              preset: 'mockPreset'
            }
          });
          events.emit(AUCTION_INIT, { i: 0, extra: 'data' });
          events.emit(BID_RESPONSE, { i: 1, extra: 'data' });
          sinon.assert.calledOnce(handler);
          sinon.assert.calledWith(handler, [
            { preset: 'auctionInit', i: 0 },
            { preset: 'bidResponse', i: 1 }
          ]);
        });

        it('filters out events not in the preset', () => {
          adapter.enableAnalytics({
            options: {
              handler,
              preset: 'mockPreset'
            }
          });
          events.emit(AUCTION_END, {});
          clock.runAll();
          sinon.assert.notCalled(handler);
        });

        it('lets options.events override and extend the preset', () => {
          adapter.enableAnalytics({
            options: {
              handler,
              batchSize: 3,
              preset: 'mockPreset',
              events: {
                bidResponse(bid) {
                  return { custom: 'bidResponse', i: bid.i };
                },
                auctionEnd(auction) {
                  return { custom: 'auctionEnd', i: auction.i };
                }
              }
            }
          });
          events.emit(AUCTION_INIT, { i: 0 });
          events.emit(BID_RESPONSE, { i: 1 });
          events.emit(AUCTION_END, { i: 2 });
          sinon.assert.calledWith(handler, [
            { preset: 'auctionInit', i: 0 },
            { custom: 'bidResponse', i: 1 },
            { custom: 'auctionEnd', i: 2 }
          ]);
        });

        it('does not modify the preset when options.events overrides it', () => {
          adapter.enableAnalytics({
            options: {
              handler,
              preset: 'mockPreset',
              events: {
                bidResponse(bid) {}
              }
            }
          });
          adapter.disableAnalytics();
          adapter.enableAnalytics({
            options: {
              handler,
              preset: 'mockPreset'
            }
          });
          events.emit(BID_RESPONSE, { i: 0 });
          sinon.assert.calledWith(handler, [{ preset: 'bidResponse', i: 0 }]);
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
          const handler = defaultHandler({ url, method, batchSize: 1, ajax });
          const payload = { i: 0 };
          handler([payload, {}]);
          sinon.assert.calledWith(ajax, url, sinon.match.any,
            sinon.match(data => sinon.match(payload).test(parse(data))),
            { method, keepalive: true }
          );
        });

        it('should send multiple events when batchSize is greater than 1', () => {
          const handler = defaultHandler({ url, method, batchSize: 10, ajax });
          const payload = [{ i: 0 }, { i: 1 }];
          handler(payload);
          sinon.assert.calledWith(ajax, url, sinon.match.any,
            sinon.match(data => sinon.match(payload).test(parse(data))),
            { method, keepalive: true }
          );
        });
      });
    });
  });
});
