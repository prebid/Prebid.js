import {targetingLock} from '../../../../src/targeting/lock.js';
import {config} from 'src/config.js';

describe('Targeting lock', () => {
  let lock, clock, targeting, sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    lock = targetingLock();
    clock = sandbox.useFakeTimers();
    targeting = {
      k1: 'foo',
      k2: 'bar'
    };
  });
  afterEach(() => {
    config.resetConfig();
    sandbox.restore();
  });

  it('does not lock by default', () => {
    lock.lock(targeting);
    expect(lock.isLocked(targeting)).to.be.false;
  });

  describe('when configured', () => {
    beforeEach(() => {
      config.setConfig({
        targetingControls: {
          lock: 'k1',
          lockTimeout: 500,
        }
      });
    });
    it('can lock', () => {
      lock.lock(targeting);
      expect(lock.isLocked(targeting)).to.be.true;
      expect(lock.isLocked({
        k1: 'foo',
        k3: 'bar'
      })).to.be.true;
    });

    it('unlocks after timeout', async () => {
      lock.lock(targeting);
      await clock.tick(500);
      clock.tick(0);
      expect(lock.isLocked(targeting)).to.be.false;
    });

    it('unlocks when reconfigured', () => {
      lock.lock(targeting);
      config.setConfig({
        targetingControls: {
          lock: ['k1', 'k2']
        }
      });
      expect(lock.isLocked(targeting)).to.be.false;
    });

    Object.entries({
      missing() {
        delete targeting.k1;
      },
      null() {
        targeting.k1 = null;
      }
    }).forEach(([t, setup]) => {
      it(`Does not lock when key is ${t}`, () => {
        setup();
        lock.lock(targeting);
        expect(lock.isLocked(targeting)).to.be.false;
      });
    });
    describe('with gpt', () => {
      let origGpt, eventHandlers, pubads;
      before(() => {
        origGpt = window.googletag;
        window.googletag = {
          pubads: () => pubads
        };
      });
      after(() => {
        window.googletag = origGpt;
      });

      beforeEach(() => {
        eventHandlers = {};
        pubads = {
          getSlots: () => [],
          addEventListener(event, listener) {
            eventHandlers[event] = listener;
          },
          removeEventListener: sinon.stub()
        }
      })

      it('should unlock on slotRenderEnded', () => {
        lock.lock(targeting);
        eventHandlers.slotRenderEnded({
          slot: {
            getTargeting: (key) => [targeting[key]]
          }
        });
        expect(lock.isLocked(targeting)).to.be.false;
      });

      it('should unregister when disabled', () => {
        lock.lock(targeting);
        config.resetConfig();
        sinon.assert.calledWith(pubads.removeEventListener, 'slotRenderEnded')
      })
    });
  });
});
