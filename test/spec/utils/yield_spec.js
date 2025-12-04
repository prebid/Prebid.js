import {pbYield, serialize} from '../../../src/utils/yield.js';
import {getGlobal} from '../../../src/prebidGlobal.js';

describe('main thread yielding', () => {
  let shouldYield, ran;
  beforeEach(() => {
    ran = false;
    shouldYield = null;
  });

  function runYield() {
    return new Promise((resolve) => {
      pbYield(() => shouldYield, () => {
        ran = true;
        resolve();
      });
    });
  }

  describe('pbYield', () => {
    [true, false].forEach(expectYield => {
      it(`should ${!expectYield ? 'not ' : ''}yield when shouldYield returns ${expectYield}`, () => {
        shouldYield = expectYield;
        const pm = runYield();
        expect(ran).to.eql(!expectYield);
        return pm;
      });
    });

    describe('when shouldYield = true', () => {
      let scheduler;
      beforeEach(() => {
        shouldYield = true;
        scheduler = {
          yield: sinon.stub().callsFake(() => Promise.resolve())
        };
      });
      it('should use window.scheduler, when available', async () => {
        window.scheduler = scheduler;
        try {
          await runYield();
          sinon.assert.called(scheduler.yield);
        } finally {
          delete window.scheduler;
        }
      });
    });
  });
  describe('serialize', () => {
    it('runs each function in succession, when delayed', async () => {
      let cbs = [];
      const fn = (cb) => {
        cbs.push(cb);
      }
      let done = false;
      serialize([fn, fn], () => {
        done = true;
      });
      expect(cbs.length).to.equal(1);
      expect(done).to.be.false;
      await Promise.resolve();
      cbs[0]();
      expect(cbs.length).to.equal(2);
      expect(done).to.be.false;
      cbs[1]();
      expect(cbs.length).to.equal(2);
      expect(done).to.be.true;
    });
    it('runs each function in succession, when immediate', () => {
      let results = [];
      let i = 0;
      const fn = (cb) => {
        i++;
        results.push(i);
        cb();
      };
      let done = false;
      serialize([fn, fn], () => {
        done = true;
      });
      expect(results).to.eql([1, 2]);
      expect(done).to.be.true;
    });
  });
});
