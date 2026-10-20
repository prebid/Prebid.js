import { conjoinWithTimeout, eventConjoiner } from '../../../src/utils/eventConjoiner.js';

describe('eventConjoiner', () => {

  function collector(joiner, size) {
    return function (event) {
      for (let i = 0; i < size; i++) {
        joiner.collect(i, event);
      }
    }
  }

  [1, 3].forEach(size => {
    describe(`size = ${size}`, () => {
      describe('eventConjoiner', () => {
        let joiner, collectAll;
        beforeEach(() => {
          joiner = eventConjoiner(size);
          collectAll = collector(joiner, size);
        });

        it('fires when all channels fire', () => {
          const cb = sinon.stub();
          joiner.on(cb);
          collectAll('event');
          sinon.assert.calledOnce(cb);
          sinon.assert.calledWith(cb, 'event');
        });

        it('can unregister handlers', () => {
          const cb1 = sinon.stub();
          const cb2 = sinon.stub();
          [cb1, cb2].forEach(cb => joiner.on(cb));
          joiner.off(cb2);
          collectAll('event');
          sinon.assert.notCalled(cb2);
        });

        it('throws on wrong channel', () => {
          expect(() => joiner.collect(size + 1, 'event')).to.throw();
        });

        if (size > 1) {
          it('ignores multiple triggers on the same channel', () => {
            const cb = sinon.stub();
            joiner.on(cb);
            joiner.collect(0, 'event');
            joiner.collect(0, 'event');
            sinon.assert.notCalled(cb);
          });

          it('does not keep state after firing', () => {
            const cb = sinon.stub();
            joiner.on(cb);
            collectAll('event');
            joiner.collect(0, 'event');
            sinon.assert.calledOnce(cb);
          });
        }
      });
      describe('conjoinWithTimeout', () => {
        let clock, joiner, collectAll;
        beforeEach(() => {
          clock = sinon.useFakeTimers();
          joiner = conjoinWithTimeout(size, 100);
          collectAll = collector(joiner, size);
        });
        afterEach(() => {
          clock.restore();
        });

        if (size > 1) {
          it('fires after only one collect, if timeout expires', () => {
            const cb = sinon.stub();
            joiner.on(cb);
            joiner.collect(0, 'event');
            clock.tick(100);
            sinon.assert.calledOnce(cb);
          });

          it('does not fire again if collection completes after timeout', () => {
            const cb = sinon.stub();
            joiner.on(cb);
            joiner.collect(0, 'event');
            clock.tick(100);
            for (let i = 0; i < size; i++) {
              joiner.collect(0, 'event');
            }
            sinon.assert.calledOnce(cb);
          });

          it('does not fire again if collection completes before timeout', () => {
            const cb = sinon.stub();
            joiner.on(cb);
            collectAll('event');
            clock.tick(100);
            sinon.assert.calledOnce(cb);
          });
        }
      });
    });
  });
});
