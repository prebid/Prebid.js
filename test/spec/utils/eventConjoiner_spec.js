import { eventConjoiner } from '../../../src/utils/eventConjoiner.js';

describe('eventConjoiner', () => {
  function collector(joiner, size) {
    return function (event) {
      for (let i = 0; i < size; i++) {
        joiner.collect(i, event);
      }
    };
  }

  [1, 3].forEach(size => {
    describe(`size = ${size}`, () => {
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

        it('does not fire after partial collection was canceled', () => {
          const cb = sinon.stub();
          joiner.on(cb);
          joiner.collect(0, 'event');
          joiner.cancel('event');
          for (let i = 1; i < size; i++) {
            joiner.collect(i, 'event');
          }
          sinon.assert.notCalled(cb);
        });

        describe('collectWithin', () => {
          let clock;
          beforeEach(() => {
            clock = sinon.useFakeTimers();
          });
          afterEach(() => {
            clock.restore();
          });
          it('fires after timeout on partial collection', () => {
            const cb = sinon.stub();
            joiner.on(cb);
            joiner.collectWithin(100, 0, 'event');
            clock.tick(100);
            sinon.assert.calledOnce(cb);
          });

          it('does not fire again if collection completes after timeout', () => {
            const cb = sinon.stub();
            joiner.on(cb);
            joiner.collectWithin(100, 0, 'event');
            clock.tick(100);
            for (let i = 1; i < size; i++) {
              joiner.collect(i, 'event');
            }
            sinon.assert.calledOnce(cb);
          });

          it('fires once when collectWithin is repeated for the same event and collection completes', () => {
            const cb = sinon.stub();
            joiner.on(cb);
            joiner.collectWithin(100, 0, 'event');
            joiner.collectWithin(100, 0, 'event');
            for (let i = 1; i < size; i++) {
              joiner.collect(i, 'event');
            }
            clock.tick(100);
            sinon.assert.calledOnce(cb);
          });

          it('does not fire again if collection completes before timeout', () => {
            const cb = sinon.stub();
            joiner.on(cb);
            joiner.collectWithin(100, 0, 'event');
            collectAll('event');
            clock.tick(100);
            sinon.assert.calledOnce(cb);
          });
        });
      }
    });
  });
});
