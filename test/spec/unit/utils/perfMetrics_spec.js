import {CONFIG_TOGGLE, metricsFactory, newMetrics, useMetrics} from '../../../../src/utils/perfMetrics.js';
import {defer} from '../../../../src/utils/promise.js';
import {hook} from '../../../../src/hook.js';
import {config} from 'src/config.js';

describe('metricsFactory', () => {
  let metrics, now, enabled, newMetrics;

  beforeEach(() => {
    now = 0;
    newMetrics = metricsFactory({now: () => now});
    metrics = newMetrics();
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
    });

    it('timeSince saves a metric if given a name', () => {
      now = 10;
      metrics.checkpoint('A');
      now = 15;
      metrics.timeSince('A', 'test');
      expect(metrics.getMetrics()).to.eql({test: 5});
    });

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
    });

    it('saves a metric with timeBetween if given a name', () => {
      now = 10;
      metrics.checkpoint('A');
      now = 15;
      metrics.checkpoint('B');
      metrics.timeBetween('A', 'B', 'test');
      expect(metrics.getMetrics()).to.eql({test: 5});
    });
  });

  describe('setMetrics', () => {
    it('sets metric', () => {
      metrics.setMetric('test', 1);
      expect(metrics.getMetrics()).to.eql({test: 1});
    });
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
      expect(metrics.getMetrics().test).to.eql([10, 20]);
    });

    it('does not group metrics into ancestors if the name clashes', () => {
      metrics.setMetric('test', {});
      metrics.fork().setMetric('test', 1);
      expect(metrics.getMetrics().test).to.eql({});
    });

    it('does not propagate further if stopPropagation = true', () => {
      const c1 = metrics.fork();
      const c2 = c1.fork({stopPropagation: true});
      c2.setMetric('test', 1);
      expect(c1.getMetrics().test).to.eql([1]);
      expect(metrics.getMetrics().test).to.not.exist;
    });

    it('does not propagate at all if propagate = false', () => {
      metrics.fork({propagate: false}).setMetric('test', 1);
      expect(metrics.getMetrics()).to.eql({});
    });

    it('replicates grouped metrics if includeGroups = true', () => {
      const child = metrics.fork({includeGroups: true});
      metrics.fork().setMetric('test', 1);
      expect(child.getMetrics()).to.eql({
        test: [1]
      });
    })
  });

  describe('join', () => {
    let other;
    beforeEach(() => {
      other = newMetrics();
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
      expect(metrics.getMetrics().test).to.eql([1]);
    });

    it('gives precedence to first join\'s metrics', () => {
      metrics.join(other);
      const metrics2 = newMetrics();
      metrics2.join(other);
      metrics.setMetric('test', 1);
      metrics2.setMetric('test', 2);
      expect(other.getMetrics()).to.eql({
        test: 1
      });
    });

    it('gives precedence to first joins\'s checkpoints', () => {
      metrics.join(other);
      const metrics2 = newMetrics();
      metrics2.join(other);
      now = 10;
      metrics.checkpoint('testcp');
      now = 20;
      metrics2.checkpoint('testcp');
      now = 30;
      expect(other.timeSince('testcp')).to.eql(20);
    });

    it('does not propagate further if stopPropagation = true', () => {
      const m2 = metrics.fork();
      m2.join(other, {stopPropagation: true});
      other.setMetric('test', 1);
      expect(m2.getMetrics().test).to.eql([1]);
      expect(metrics.getMetrics()).to.eql({});
    });

    it('does not propagate at all if propagate = false', () => {
      metrics.join(other, {propagate: false});
      other.setMetric('test', 1);
      expect(metrics.getMetrics()).to.eql({});
    });

    it('replicates grouped metrics if includeGroups = true', () => {
      const m2 = metrics.fork();
      metrics.join(other, {includeGroups: true});
      m2.setMetric('test', 1);
      expect(other.getMetrics()).to.eql({
        test: [1]
      });
    })

    Object.entries({
      'join with a common ancestor': () => [metrics.fork(), metrics.fork()],
      'join with self': () => [metrics, metrics],
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

    it('can join into a cycle', () => {
      const c = metrics.fork();
      c.join(metrics);
      c.setMetric('child', 1);
      metrics.setMetric('parent', 1);
      expect(c.getMetrics()).to.eql({
        child: 1,
        parent: [1]
      })
      expect(metrics.getMetrics()).to.eql({
        parent: 1,
        child: [1]
      })
    });
  });
  describe('newMetrics', () => {
    it('returns related, but independent, metrics', () => {
      const m0 = metrics.newMetrics();
      const m1 = newMetrics();
      m1.join(m0);
      m0.setMetric('m0', 1);
      m1.setMetric('m1', 1);
      expect(metrics.getMetrics()).to.eql({});
      expect(m0.getMetrics()).to.eql({
        m0: 1,
        m1: 1
      })
    })
  })
})

describe('nullMetrics', () => {
  let nullMetrics;
  beforeEach(() => {
    nullMetrics = useMetrics(null);
  });

  Object.entries({
    'stopBefore': (fn) => nullMetrics.startTiming('n').stopBefore(fn),
    'stopAfter': (fn) => nullMetrics.startTiming('n').stopAfter(fn),
    'measureTime': (fn) => (...args) => nullMetrics.measureTime('n', () => fn(...args)),
    'measureHookTime': (fn) => (...args) => nullMetrics.measureHookTime('n', {}, () => fn(...args))
  }).forEach(([t, wrapFn]) => {
    describe(t, () => {
      it('invokes the wrapped fn', () => {
        const fn = sinon.stub();
        wrapFn(fn)('one', 'two');
        sinon.assert.calledWith(fn, 'one', 'two');
      });
      it('does not register timing metrics', () => {
        wrapFn(sinon.stub())();
        expect(nullMetrics.getMetrics()).to.eql({});
      })
    })
  });

  it('does not save checkpoints', () => {
    nullMetrics.checkpoint('A');
    expect(nullMetrics.timeSince('A')).to.equal(null);
  });

  it('does not save metrics', () => {
    nullMetrics.setMetric('test', 1);
    expect(nullMetrics.getMetrics()).to.eql({});
  });
})

describe('configuration toggle', () => {
  afterEach(() => {
    config.resetConfig();
  });

  Object.entries({
    'useMetrics': () => useMetrics(metricsFactory()()),
    'newMetrics': newMetrics
  }).forEach(([t, mkMetrics]) => {
    it(`${t} returns no-op metrics when disabled`, () => {
      config.setConfig({[CONFIG_TOGGLE]: false});
      const metrics = mkMetrics();
      metrics.setMetric('test', 'value');
      expect(metrics.getMetrics()).to.eql({});
    });
    it(`returns actual metrics by default`, () => {
      const metrics = mkMetrics();
      metrics.setMetric('test', 'value');
      expect(metrics.getMetrics()).to.eql({test: 'value'});
    });
  });
});
