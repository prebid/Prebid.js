import {performanceMetrics} from '../../../../src/utils/perfMetrics.js';
import {defer} from '../../../../src/utils/promise.js';
import {hook} from '../../../../src/hook.js';

describe('performanceMetrics', () => {
  let metrics, now;
  beforeEach(() => {
    now = 0;
    metrics = performanceMetrics(() => now);
  });

  it('can measure time with startTiming', () => {
    now = 10;
    const measure = metrics.startTiming('test');
    now = 25.2;
    measure();
    expect(metrics.getMetrics()).to.eql({
      test: 15.2
    });
  });

  describe('measureTime', () => {
    it('can measure time', () => {
      metrics.measureTime('test', () => now += 3);
      expect(metrics.getMetrics()).to.eql({
        test: 3
      })
    });

    it('still measures if fn throws', () => {
      expect(() => {
        metrics.measureTime('test', () => {
          now += 4;
          throw new Error();
        });
      }).to.throw();
      expect(metrics.getMetrics()).to.eql({
        test: 4
      });
    })
  });

  describe('measureHookTime', () => {
    let testHook;
    before(() => {
      testHook = hook('sync', () => null, 0, 'testName');
      hook.ready();
    });
    beforeEach(() => {
      testHook.getHooks().remove();
    });

    ['before', 'after'].forEach(hookType => {
      describe(`on ${hookType} hooks`, () => {
        Object.entries({
          next: (n) => n,
          bail: (n) => n.bail
        }).forEach(([t, fn]) => {
          it(`can time when hooks call ${t}`, () => {
            const q = defer();
            testHook[hookType]((next) => {
              metrics.measureHookTime('test', next, (next) => {
                setTimeout(() => {
                  now += 10;
                  fn(next)();
                  q.resolve();
                })
              })
            });
            testHook();
            return q.promise.then(() => {
              expect(metrics.getMetrics()).to.eql({
                test: 10
              });
            })
          });
        });
      })
    })
  });

  describe('checkpoints', () => {
    it('can measure time from checkpoint with timeSince', () => {
      now = 10;
      metrics.checkpoint('A');
      now = 15;
      expect(metrics.timeSince('A')).to.eql(5);
    });

    it('timeSince is null if checkpoint does not exist', () => {
      expect(metrics.timeSince('missing')).to.equal(null);
    })

    it('can measure time between checkpoints with timeBetween', () => {
      now = 10;
      metrics.checkpoint('A');
      now = 15;
      metrics.checkpoint('B');
      now = 20;
      expect(metrics.timeBetween('A', 'B')).to.eql(5);
    });

    Object.entries({
      'first checkpoint': [false, true],
      'second checkpoint': [true, false],
      'both checkpoints': [false, false]
    }).forEach(([t, [checkFirst, checkSecond]]) => {
      it(`timeBetween measures to null if missing ${t}`, () => {
        if (checkFirst) {
          metrics.checkpoint('A');
        }
        if (checkSecond) {
          metrics.checkpoint('B');
        }
        expect(metrics.timeBetween('A', 'B')).to.equal(null)
      })
    })
  });

  describe('setMetrics', () => {
    it('sets metric', () => {
      metrics.setMetric('test', 1);
      expect(metrics.getMetrics()).to.eql({test: 1});
    });
    it('sets metric, but does not propagate, with propagate = false', () => {
      const m2 = metrics.fork();
      m2.setMetric('test', 1, false);
      expect(m2.getMetrics()).to.eql({test: 1});
      expect(metrics.getMetrics()).to.eql({});
    })
  });

  describe('fork', () => {
    it('keeps metrics from ancestors', () => {
      const m2 = metrics.fork();
      const m3 = m2.fork();
      metrics.setMetric('1', 'one');
      m2.setMetric('2', 'two');
      m3.setMetric('3', 'three');
      sinon.assert.match(metrics.getMetrics(), {
        1: 'one'
      })
      sinon.assert.match(m2.getMetrics(), {
        1: 'one',
        2: 'two'
      });
      sinon.assert.match(m3.getMetrics(), {
        1: 'one',
        2: 'two',
        3: 'three'
      });
    });

    it('keeps checkpoints from ancestors', () => {
      const m2 = metrics.fork();
      const m3 = m2.fork();
      now = 10;
      metrics.checkpoint('1');
      now = 20;
      m2.checkpoint('2');
      now = 30;
      m3.checkpoint('3');
      now = 40;
      expect(m2.timeSince('1')).to.eql(30);
      expect(m3.timeSince('2')).to.eql(20);
    });

    it('groups metrics into ancestors', () => {
      const c1 = metrics.fork().fork();
      const c2 = metrics.fork().fork();
      c1.setMetric('test', 10);
      c2.setMetric('test', 20);
      expect(metrics.getMetrics().test).to.eql({
        min: 10,
        max: 20,
        avg: 15,
        n: 2
      });
    });

    it('groups into only a count when metric is not a number', () => {
      const c1 = metrics.fork();
      const c2 = metrics.fork();
      c1.setMetric('test', 'a');
      c2.setMetric('test', 'b');
      expect(metrics.getMetrics().test).to.eql({n: 2});
    });

    it('does not group metrics into ancestors if the name clashes', () => {
      metrics.setMetric('test', {});
      metrics.fork().setMetric('test', 1);
      expect(metrics.getMetrics().test).to.eql({});
    });

    it('does not propagate further if propagate = false', () => {
      const c1 = metrics.fork();
      const c2 = c1.fork(false);
      c2.setMetric('test', 1);
      sinon.assert.match(c1.getMetrics().test, {
        avg: 1
      });
      expect(metrics.getMetrics().test).to.not.exist;
    })
  });

  describe('join', () => {
    let other;
    beforeEach(() => {
      other = performanceMetrics(() => now);
    });

    it('joins metrics', () => {
      metrics.setMetric('test', 1);
      metrics.join(other);
      expect(other.getMetrics()).to.eql({
        test: 1
      });
    });

    it('joins checkpoints', () => {
      now = 10;
      metrics.checkpoint('test');
      metrics.join(other);
      now = 20;
      expect(other.timeSince('test')).to.eql(10);
    })

    it('groups metrics after joining', () => {
      metrics.join(other);
      other.setMetric('test', 1);
      sinon.assert.match(metrics.getMetrics().test, {
        n: 1,
        avg: 1
      });
    });

    it('gives precedence to first join\'s metrics', () => {
      metrics.join(other);
      const metrics2 = performanceMetrics(() => now);
      metrics2.join(other);
      metrics.setMetric('test', 1);
      metrics2.setMetric('test', 2);
      expect(other.getMetrics()).to.eql({
        test: 1
      });
    });

    it('gives precedence to first joins\'s checkpoints', () => {
      metrics.join(other);
      const metrics2 = performanceMetrics(() => now);
      metrics2.join(other);
      now = 10;
      metrics.checkpoint('testcp');
      now = 20;
      metrics2.checkpoint('testcp');
      now = 30;
      expect(other.timeSince('testcp')).to.eql(20);
    })

    Object.entries({
      'join with a common ancestor': () => [metrics.fork(), metrics.fork()],
      'join with self': () => [metrics, metrics]
    }).forEach(([t, makePair]) => {
      it(`can ${t}`, () => {
        const [m1, m2] = makePair();
        m1.join(m2);
        m1.setMetric('test', 1);
        const expected = {'test': 1};
        expect(m1.getMetrics()).to.eql(expected);
        expect(m2.getMetrics()).to.eql(expected);
      })
    });
  });
})
